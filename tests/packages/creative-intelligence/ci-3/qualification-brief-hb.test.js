/**
 * CI-W1C.4 Resume.1 — Project-Specific Brief HB01-HB06 Tests (v2)
 *
 * Spec: PART E / spec §15 + Resume.1 PART A/B (evidence-strict)
 *   HB01 G01 brief != G02 brief (string-level difference)
 *   HB02 every project-specific statement has source trace
 *   HB03 unsupported facts = 0
 *   HB04 no generic description-only fallback
 *   HB05 v2 evidence-strict: projectName/assetCount only → max CREATIVE_HYPOTHESIS;
 *         NO USER_REQUIREMENT upgrade without real user/document evidence
 *   HB06 visualContext summary is traceable and non-locked
 *
 * v1 → v2 transition (Resume.1 PART A):
 *   v1 (`g01-jiuzhou-brief.md`, `g02-yiji-brief.md`) had P0 evidence-quality
 *   issue: projectName="九州美学" was used to support "希望传统与现代并存"
 *   etc. v2 briefs (g0X-...-brief-v2.md) replace those fabrications with
 *   real, project-specific supported facts from visualDecisionPacket +
 *   project.json meta, and leave USER REQUIREMENTS empty (no real user
 *   input exists in the project sources).
 *
 * Strategy: parse the G01 / G02 v2 brief files, verify their structure
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
const g01Path = path.join(smokeRoot, 'g01-jiuzhou-brief-v2.md');
const g02Path = path.join(smokeRoot, 'g02-yiji-brief-v2.md');

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
  // The project name MUST appear in each brief (projectName is project_record fact;
  // v2 brief carries it as projectName heuristic in CREATIVE INTENT — not in CONFIRMED
  // CONTEXT, which is intentionally empty in pure-content v2).
  assert.ok(g01.includes('九州美学'), 'G01 brief must reference its project name');
  assert.ok(!g01.includes('一剂良方'), 'G01 brief must NOT mention 一剂良方');
  assert.ok(g02.includes('一剂良方'), 'G02 brief must reference its project name');
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
    // v2 evidence-strict: each brief must contain real project-specific statements
    // drawn from visualDecisionPacket asset inventory (NOT just a project.json
    // description copy). The verbatim project description may appear as ONE
    // statement (a real, traceable fact), but the brief must also carry visual
    // inventory items (colorAssets / logoAssets / graphicMotifs / materialCues).
    const sections = parseStatements(text);
    const visualCtx = sections['VISUAL CONTEXT']?.statements || [];
    const hasVisualInventory = visualCtx.length >= 5;
    assert.ok(hasVisualInventory,
      `${label} brief VISUAL CONTEXT must have ≥5 real visual-inventory statements (not a description-only fallback). Got ${visualCtx.length}.`);
  }
});

test('HB05: creative-intent semantics preserved (v2 evidence-strict; CREATIVE_HYPOTHESIS only from projectName heuristic)', () => {
  // CI-W1C.4 Resume.1 PART A/B rule (spec §15 + PART A audit):
  //   - USER_REQUIREMENT requires "明确用户/文档要求"
  //   - projectName / assetCount / observation alone → max CREATIVE_HYPOTHESIS (low authority)
  //   - 禁止为了 PASS 人工制造 USER_REQUIREMENT
  // If a project has NO real user input (no briefFiles/changelog, no chat log, no PDF),
  // USER REQUIREMENTS section is INTENTIONALLY EMPTY, and all "希望/想要/鼓励" type
  // soft-framing MUST be re-classified as CREATIVE_HYPOTHESIS.
  for (const [label, filePath] of [['G01', g01Path], ['G02', g02Path]]) {
    const sections = parseStatements(readBrief(filePath));
    const userReq = sections['USER REQUIREMENTS']?.statements || [];
    const creativeIntent = sections['CREATIVE INTENT']?.statements || [];
    // 1. NO statement may be classified USER_REQUIREMENT (or LOCKED_RULE) when its
    //    sourceRef is only `projectName` / `assetCount` / 28 张视觉方案 / 35 张 VI 手册 /
    //    28 张素材 / 35 张素材 (a "fabrication" pattern from v1).
    for (const s of [...userReq, ...creativeIntent]) {
      const ref = s.trace.sourceRef || '';
      const cls = s.trace.epistemicClass || '';
      const isProjectNameOrAssetCountOnly =
        ref.includes('projectName') ||
        ref.includes('assetCount') ||
        ref.includes('28 张视觉方案') ||
        ref.includes('35 张 VI 手册') ||
        ref.includes('28 张素材') ||
        ref.includes('35 张素材');
      if (isProjectNameOrAssetCountOnly) {
        assert.ok(!cls.includes('USER_REQUIREMENT'),
          `${label} statement "${s.text.slice(0, 30)}..." has sourceRef based on projectName/assetCount only but is classified USER_REQUIREMENT — must be CREATIVE_HYPOTHESIS at most. (P0 evidence-quality regression)`);
      }
    }
    // 2. CREATIVE INTENT must contain ≥1 statement classified as CREATIVE_HYPOTHESIS
    //    (any signal: 可以探索 / 或许 / 字面提示 / 推出 / 推测 / 可能 / etc.)
    const hypoStmts = creativeIntent.filter((s) =>
      (s.trace.epistemicClass || '').includes('CREATIVE_HYPOTHESIS'));
    assert.ok(hypoStmts.length >= 1,
      `${label} must have ≥1 CREATIVE_HYPOTHESIS statement in CREATIVE INTENT`);
    // 3. CREATIVE_HYPOTHESIS statements must be low authority (not LOCKED, not FACT, not USER_REQUIREMENT)
    for (const h of hypoStmts) {
      const auth = h.trace.authority || '';
      assert.ok(!auth.includes('LOCKED') && !auth.includes('AUTHORITATIVE_DOCUMENT_FACT'),
        `${label} CREATIVE_HYPOTHESIS must NOT have LOCKED or AUTHORITATIVE_DOCUMENT_FACT authority, got ${auth}`);
    }
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
