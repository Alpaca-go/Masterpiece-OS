// Packaging V1 / P1 / D1 — Golden Prompts offline test
//
// V1 frozen at 3 Golden Benchmark Prompts (one per Shot
// Contract), all Reference-First mode, all under the Jiuzhou
// Golden Project. This test pins:
//   - the existence of prompts/{hero,series,open}.md
//   - the YAML front-matter on each (goldenPromptId, version,
//     shotContract, generationMode, goldenProject, language)
//   - the prompt body is non-empty and contains the
//     required Jiuzhou visual rules (color ratio + 5
//     abstract peacock components + 3 forbidden outcomes)
//   - the production code does NOT import any of the
//     prompt files (the boundary rule; the offline half
//     of G-PKG-GOLDEN-BOUNDARY-01)

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PROMPTS_DIR = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'packaging',
  'jiuzhou',
  'prompts',
);

// Production roots that MUST NOT import any Golden Prompt file
// (per docs/packaging/golden-vs-production-boundary.md). The
// full G-PKG-GOLDEN-BOUNDARY-01 guard is in
// scripts/verify-packaging-golden-boundary.mjs (P3); this is
// the offline half.
const PRODUCTION_ROOTS = [
  'apps/cli',
  'apps/web',
  'apps/web-runtime',
  'packages/runtime-core',
  'packages/image-generation-contracts',
  'packages/image-generation-runtime',
  'packages/model-runtime',
];

const REQUIRED_FRONTMATTER = [
  'goldenPromptId',
  'version',
  'shotContract',
  'generationMode',
  'goldenProject',
  'language',
];

const REQUIRED_VISUAL_RULES = [
  // color baseline (V1 spec §11.3)
  '65', '70', '20', '25', '5', '10', 'iridescent',
  // 5 abstract peacock components
  'eye ellipse', 'nine-petal', 'feather streamline', 'iridescent structure', 'biological rhythm',
  // 3 forbidden outcomes (auto-fail F01/F04/F06/F11)
  'large-area saturated purple',
  'realistic peacock feather',
  'nightclub-iridescent',
];

const SHOT_CONTRACT_MAP = {
  hero: 'PKG-HERO-SINGLE',
  series: 'PKG-SERIES-GROUP',
  open: 'PKG-GIFT-OPEN',
};

function readPrompt(shot) {
  const file = path.join(PROMPTS_DIR, `${shot}.md`);
  if (!fs.existsSync(file)) {
    return { file, raw: null, meta: null, body: null };
  }
  const raw = fs.readFileSync(file, 'utf8');
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fm) return { file, raw, meta: null, body: null };
  const meta = {};
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[m[1]] = v;
  }
  return { file, raw, meta, body: fm[2] };
}

function extractPromptBody(raw) {
  if (!raw) return null;
  const m = raw.match(/```text\n([\s\S]*?)\n```/);
  return m ? m[1].trim() : null;
}

test('P1 / D1 all 3 Golden Prompt files exist', () => {
  for (const shot of Object.keys(SHOT_CONTRACT_MAP)) {
    const file = path.join(PROMPTS_DIR, `${shot}.md`);
    assert.ok(fs.existsSync(file), `expected Golden Prompt file: ${file}`);
  }
});

test('P1 / D1 _PROVENANCE.md exists', () => {
  const file = path.join(PROMPTS_DIR, '_PROVENANCE.md');
  assert.ok(fs.existsSync(file), `expected _PROVENANCE.md: ${file}`);
});

for (const [shot, contract] of Object.entries(SHOT_CONTRACT_MAP)) {
  test(`P1 / D1 ${shot}.md has complete YAML front-matter`, () => {
    const { meta } = readPrompt(shot);
    assert.ok(meta, `${shot}.md must have YAML front-matter`);
    for (const k of REQUIRED_FRONTMATTER) {
      assert.ok(meta[k] !== undefined && meta[k] !== '', `${shot}.md front-matter missing field "${k}"`);
    }
    assert.equal(meta.shotContract, contract, `${shot}.md shotContract must be ${contract}`);
    assert.equal(meta.goldenProject, 'jiuzhou', `${shot}.md goldenProject must be 'jiuzhou'`);
    assert.equal(meta.generationMode, 'reference-first', `${shot}.md must be Reference-First in P1 / D1`);
  });

  test(`P1 / D1 ${shot}.md prompt body is fenced, non-empty, and self-identifies`, () => {
    const { raw, meta } = readPrompt(shot);
    const body = extractPromptBody(raw);
    assert.ok(body, `${shot}.md must have a \`\`\`text fenced prompt body`);
    assert.ok(body.length > 200, `${shot}.md prompt body must be substantive (got ${body.length} bytes)`);
    assert.ok(body.includes('[PACKAGE SUBJECT]') || body.includes('package subject'), `${shot}.md prompt body should self-identify the package subject`);
    assert.ok(body.includes('[FORBIDDEN OUTCOMES]') || body.includes('forbidden outcomes') || body.includes('NO '), `${shot}.md prompt body should enumerate forbidden outcomes`);
    void meta;
  });

  test(`P1 / D1 ${shot}.md references all required Jiuzhou visual rules`, () => {
    const { raw } = readPrompt(shot);
    const lower = raw.toLowerCase();
    for (const rule of REQUIRED_VISUAL_RULES) {
      assert.ok(
        lower.includes(rule.toLowerCase()),
        `${shot}.md must reference the Jiuzhou visual rule "${rule}"`,
      );
    }
  });

  test(`P1 / D1 ${shot}.md goldenPromptId matches shot and is v1`, () => {
    const { meta } = readPrompt(shot);
    assert.ok(meta.goldenPromptId.startsWith(`jiuzhou.${shot}.`), `${shot}.md goldenPromptId must start with jiuzhou.${shot}.`);
    assert.ok(meta.goldenPromptId.endsWith('.v1'), `${shot}.md goldenPromptId must be v1 in P1 / D1`);
    assert.equal(meta.version, '1.0.0', `${shot}.md version must be 1.0.0`);
  });
}

test('P1 / D1 Golden Prompt IDs are unique across the 3 shots', () => {
  const ids = [];
  for (const shot of Object.keys(SHOT_CONTRACT_MAP)) {
    const { meta } = readPrompt(shot);
    if (meta?.goldenPromptId) ids.push(meta.goldenPromptId);
  }
  assert.equal(new Set(ids).size, ids.length, 'goldenPromptId must be unique per shot');
});

test('P1 / D1 production code does NOT import any Golden Prompt file (boundary)', () => {
  // Walk the production roots. The check is a substring
  // match on the relative path "tests/fixtures/packaging/
  // jiuzhou/prompts/" appearing in any source file under
  // these roots. This is the offline half of the boundary
  // rule (the full G-PKG-GOLDEN-BOUNDARY-01 covers the
  // full Golden root and is in P3).
  function walk(dir, acc) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build' || ent.name === '.runtime') continue;
        walk(p, acc);
      } else if (ent.isFile()) {
        if (/\.(ts|tsx|js|mjs|cjs|json)$/.test(ent.name)) {
          acc.push(p);
        }
      }
    }
    return acc;
  }
  const offenders = [];
  for (const root of PRODUCTION_ROOTS) {
    const abs = path.join(REPO_ROOT, root);
    for (const file of walk(abs, [])) {
      const text = fs.readFileSync(file, 'utf8');
      if (text.includes('tests/fixtures/packaging/jiuzhou/prompts/')) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }
  }
  assert.deepEqual(offenders, [], `production code must NOT import Golden Prompts; offenders: ${offenders.join(', ')}`);
});

test('P1 / D1 Golden Prompts use the shared visual baseline (no duplicate rules)', () => {
  // The prompts should REFERENCE the shared visual baseline
  // files (visual-direction / color-baseline / motif-language /
  // forbidden-motifs); they should NOT duplicate the rules
  // verbatim. We check that each prompt at least references
  // each of the 4 shared files by name.
  const sharedRefs = [
    'visual-direction.md',
    'color-baseline.md',
    'motif-language.md',
    'forbidden-motifs.md',
  ];
  for (const shot of Object.keys(SHOT_CONTRACT_MAP)) {
    const { raw } = readPrompt(shot);
    for (const ref of sharedRefs) {
      assert.ok(
        raw.includes(ref),
        `${shot}.md must reference shared baseline file "${ref}"`,
      );
    }
  }
});
