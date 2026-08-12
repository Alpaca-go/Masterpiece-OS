// A4 G-A4-03 — Frozen Prompt Integrity
//
// Per A4 spec §4 / §11:
//   G-A4-03: Detect unexpected mutation of the frozen prompt authority.
//
// Frozen Prompt = the analysis prompt builder and the canonical A2
// evaluation corpus / rubric. Their SHA-256 digests are recorded in
// A2-final-freeze §6. This guard recomputes the digest on every run
// and fails if any of the recorded digests have drifted.
//
// If the digests HAVE legitimately changed (e.g. a future A2.x
// re-evaluation cycle), update A2-final-freeze §6 and re-freeze.

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Frozen SHA-256 digests recorded at A2-final-freeze §6 (commit
// 295f83f) and re-confirmed at A3-final-freeze (commit 2514784).
// These digests are part of the Visual Analysis contract; mutation
// of this constant is an A2.x re-evaluation event, not a silent
// edit.
const FROZEN_DIGESTS = Object.freeze({
  'docs/visual-analysis/A2-evaluation-rubric.md':
    '7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35',
  'docs/visual-analysis/A2-evaluation-corpus.md':
    '12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637',
});

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex').toUpperCase();
}

const violations = [];
const observed = {};

for (const [relPath, expected] of Object.entries(FROZEN_DIGESTS)) {
  const absPath = path.join(root, relPath);
  let content;
  try {
    content = await fs.readFile(absPath, 'utf8');
  } catch (error) {
    violations.push({
      guard: 'G-A4-03-frozen-prompt-missing',
      file: relPath,
      message: `Frozen prompt file is missing: ${relPath}`,
    });
    continue;
  }
  const actual = sha256(Buffer.from(content, 'utf8'));
  observed[relPath] = actual;
  if (actual !== expected) {
    violations.push({
      guard: 'G-A4-03-frozen-prompt-drift',
      file: relPath,
      message: 'Frozen prompt SHA-256 has drifted.',
      expected,
      actual,
    });
  }
}

// Additionally, scan the analysis-engine prompt builder to ensure
// the canonical prompt file paths are still wired. The prompt
// builder reads the system + user prompt content from these
// frozen files; the wiring must not silently change.
const promptBuilderPath = path.join(root, 'apps/cli/src/analysis-engine/creative-director/prompt-builder.js');
let promptBuilderContent;
try {
  promptBuilderContent = await fs.readFile(promptBuilderPath, 'utf8');
} catch (error) {
  violations.push({
    guard: 'G-A4-03-prompt-builder-missing',
    file: 'apps/cli/src/analysis-engine/creative-director/prompt-builder.js',
    message: 'Prompt builder is missing.',
  });
  promptBuilderContent = '';
}

const REQUIRED_PROMPT_REFS = [
  'deep-creative-director',  // the canonical system template
  'execution-core-template', // the canonical execution core template
  'report-schema',           // the canonical report schema template
  'userTask',                // the canonical user-prompt userTask default
];

const missingPromptRefs = REQUIRED_PROMPT_REFS.filter((token) => !promptBuilderContent.includes(token));
if (missingPromptRefs.length > 0) {
  violations.push({
    guard: 'G-A4-03-prompt-builder-wiring-drift',
    file: 'apps/cli/src/analysis-engine/creative-director/prompt-builder.js',
    message: `Prompt builder is missing canonical references: ${missingPromptRefs.join(', ')}`,
  });
}

const result = {
  guard: 'A4-frozen-prompt',
  observedDigests: observed,
  expectedDigests: FROZEN_DIGESTS,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-a4-frozen-prompt] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-a4-frozen-prompt] PASS — ${Object.keys(FROZEN_DIGESTS).length} frozen digests verified, 0 drift.`);
