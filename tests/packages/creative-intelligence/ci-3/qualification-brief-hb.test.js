/**
 * CI-W1C.4 Resume — Project-Specific Brief HB01-HB06 Tests
 *
 * Spec: PART E / spec §15
 *   HB01 G01 brief != G02 brief (string-level difference)
 *   HB02 every project-specific statement has source trace
 *   HB03 unsupported facts = 0
 *   HB04 no generic description-only fallback
 *   HB05 creative-intent semantics preserved (soft framing USER_REQUIREMENT,
 *         creative hypothesis / CREATIVE_HYPOTHESIS, hedging / MODEL_INFERENCE)
 *   HB06 visualContext summary is traceable and non-locked
 *
 * Strategy: parse the G01 / G02 brief files, verify their structure
 * and content. No model call; this is a deterministic contract test.
 *
 * Frozen surfaces: unchanged. The brief files are HARNESS artifacts
 * (.codex-smoke/ci-w1c.4-resume/) and the tests in
 * tests/packages/creative-intelligence/ci-3/.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smokeRoot = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '.codex-smoke',
  'ci-w1c.4-resume',
);
const g01Path = path.join(smokeRoot, 'g01-jiuzhou-brief.md');
const g02Path = path.join(smokeRoot, 'g02-yiji-brief.md');

function readBrief(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseStatements(briefText) {
  // Each section starts with ## [SECTION_NAME] and contains lines like:
  //   N. <statement>
  //     - sourceRef: <ref>
  //     - sourceType: <type>
  //     - authority: <auth>
  //     - epistemicClass: <class>
  //     - confidence: <num>
  const lines = briefText.split(/\r?\n/);
  const sections = {};
  let currentSection = null;
  let currentStmt = null;
  for (const line of lines) {
    const sectionMatch = line.match(/^##\s*\[([A-Z\s_]+)\]/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      sections[currentSection] = { statements: [] };
      currentStmt = null;
      continue;
    }
    if (!currentSection) continue;
    const stmtMatch = line.match(/^\d+\.\s+(.+)/);
    if (stmtMatch) {
      currentStmt = { text: stmtMatch[1], trace: {} };
      sections[currentSection].statements.push(currentStmt);
      continue;
    }
    const fieldMatch = line.match(/^\s+-\s+(\w+):\s*(.+)$/);
    if (fieldMatch && currentStmt) {
      currentStmt.trace[fieldMatch[1]] = fieldMatch[2].trim();
    }
  }
  return sections;
}

test('HB01: G01 brief != G02 brief (string-level and structural difference)', () => {
  const g01 = readBrief(g01Path);
  const g02 = readBrief(g02Path);
  assert.notEqual(g01, g02, 'G01 brief must not equal G02 brief');
  // The brand name MUST appear in each brief
  assert.ok(g01.includes('品牌名称是九州美学'), 'G01 brief must declare its brand name');
  assert.ok(!g01.includes('一剂良方'), 'G01 brief must NOT mention 一剂良方');
  assert.ok(g02.includes('品牌名称是一剂良方'), 'G02 brief must declare its brand name');
  assert.ok(!g02.includes('九州美学'), 'G02 brief must NOT mention 九州美学');
});

test('HB02: every project-specific statement has source trace', () => {
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const sections = parseStatements(readBrief(filePath));
    const allStatements = Object.values(sections).flatMap((s) => s.statements);
    assert.ok(allStatements.length > 0, `${label} must have statements`);
    for (const stmt of allStatements) {
      assert.ok(stmt.text, `${label} statement must have text`);
      assert.ok(stmt.trace.sourceRef, `${label} statement "${stmt.text.slice(0, 30)}..." must have sourceRef`);
      assert.ok(stmt.trace.sourceType, `${label} statement must have sourceType`);
      assert.ok(stmt.trace.authority, `${label} statement must have authority`);
      assert.ok(stmt.trace.epistemicClass, `${label} statement must have epistemicClass`);
    }
  }
});

test('HB03: unsupported facts = 0 (every statement has a real source)', () => {
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const sections = parseStatements(readBrief(filePath));
    const allStatements = Object.values(sections).flatMap((s) => s.statements);
    for (const stmt of allStatements) {
      const ref = stmt.trace.sourceRef || '';
      // sourceRef must reference a real path or a real spec section
      const isRealSource =
        ref.includes('project.json') ||
        ref.includes('project-visual-context.vnext.json') ||
        ref.includes('CI-W1C') ||
        ref.includes('VI 手册') ||
        ref.includes('视觉方案') ||
        ref.includes('spec §') ||
        ref.includes('no-project-specific-rule guard') ||
        ref.includes('validation_constraint') ||
        ref.includes('ASSETS') ||
        ref === 'self-referential (constraint)';
      assert.ok(isRealSource,
        `${label} statement "${stmt.text.slice(0, 50)}..." has unsupported sourceRef: ${ref}`);
    }
  }
});

test('HB04: no generic description-only fallback (each brief has the 5 sections + project-specific content)', () => {
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const text = readBrief(filePath);
    const requiredSections = [
      'CONFIRMED CONTEXT',
      'USER REQUIREMENTS',
      'CREATIVE INTENT',
      'VISUAL CONTEXT',
      'CONSTRAINTS',
    ];
    for (const section of requiredSections) {
      assert.ok(text.includes(`[${section}]`), `${label} brief must have section [${section}]`);
    }
    // Each brief must NOT just copy the project.json description verbatim
    const projectJsonDesc = '基于已上传的视觉方案完成融合增强分析';
    assert.ok(!text.includes(projectJsonDesc),
      `${label} brief must NOT be a generic description-only fallback (no verbatim copy of project.json description)`);
  }
});

test('HB05: creative-intent semantics preserved (soft framing → USER_REQUIREMENT, 可以探索 → CREATIVE_HYPOTHESIS)', () => {
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const sections = parseStatements(readBrief(filePath));
    const userReq = sections['USER REQUIREMENTS']?.statements || [];
    const creativeIntent = sections['CREATIVE INTENT']?.statements || [];
    // USER REQUIREMENTS section must contain at least one soft-framing statement
    // (希望 / 想要 / 鼓励 / 应该) classified as USER_REQUIREMENT
    const softFramed = [...userReq, ...creativeIntent].filter((s) => {
      const cls = s.trace.epistemicClass || '';
      return cls.includes('USER_REQUIREMENT') && s.text.match(/希望|想要|鼓励|应该|期待/);
    });
    assert.ok(softFramed.length > 0,
      `${label} must have soft-framed USER_REQUIREMENT statements`);
    // CREATIVE INTENT must contain at least one 可以探索 statement classified as
    // CREATIVE_HYPOTHESIS (or contain "可以探索" lexeme)
    const exploreStmt = creativeIntent.find((s) => s.text.match(/可以探索/));
    assert.ok(exploreStmt, `${label} must have a "可以探索" creative-hypothesis statement`);
    assert.ok(exploreStmt.trace.epistemicClass.includes('CREATIVE_HYPOTHESIS'),
      `${label} "可以探索" must be classified as CREATIVE_HYPOTHESIS, got ${exploreStmt.trace.epistemicClass}`);
  }
});

test('HB06: visualContext summary is traceable and non-locked', () => {
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const sections = parseStatements(readBrief(filePath));
    const visualCtx = sections['VISUAL CONTEXT']?.statements || [];
    assert.ok(visualCtx.length > 0, `${label} must have VISUAL CONTEXT statements`);
    for (const stmt of visualCtx) {
      // Visual context statements must NOT have authority=LOCKED
      assert.notEqual(stmt.trace.authority, 'LOCKED',
        `${label} VISUAL CONTEXT "${stmt.text.slice(0, 30)}..." must not have authority=LOCKED`);
      // Must have a traceable source
      assert.ok(stmt.trace.sourceRef, `${label} VISUAL CONTEXT must have sourceRef`);
      // Must be classified as FACT or VISUAL_SOURCE_FACT (not USER_REQUIREMENT / CREATIVE_HYPOTHESIS)
      const cls = stmt.trace.epistemicClass || '';
      assert.ok(cls.includes('FACT') || cls.includes('VISUAL'),
        `${label} VISUAL CONTEXT must be FACT or visual-source, got ${cls}`);
    }
  }
});
