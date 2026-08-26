// A4 G-A4-07 — Golden Mutation Discipline
//
// Per A4 spec §11:
//   G-A4-07: Preserve deliberate Golden change control.
//
// The Golden baseline (provider-contract fixtures) is frozen at
// the A2-F / A2-I commits. Their SHA-256 digests are recorded in
// A2-final-freeze §7. This guard recomputes the digest on every
// run and fails if any of the recorded digests have drifted.
//
// If the digests HAVE legitimately changed (e.g. a future A2.x
// re-evaluation cycle), update A2-final-freeze §7 and re-freeze.
//
// This guard is INTENTIONALLY REDUNDANT with the existing
// `verify-golden-boundary` (which checks that production code
// does not silently reference Golden content for non-test
// purposes) and `tests/golden-boundary.test.js` (which checks
// the test fixtures' integrity). It is a NARROW, dedicated
// mutation guard that the A4 audit can reference.

import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Frozen SHA-256 digests recorded at A2-final-freeze §7 (commit
// 295f83f) and re-confirmed at A3-final-freeze (commit 2514784).
const FROZEN_DIGESTS = Object.freeze({
  'tests/provider-contract-fixtures/qwen-baseline.json':
    '244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0',
  'tests/provider-contract-fixtures/volcengine-baseline.json':
    '4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B',
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
      guard: 'G-A4-07-golden-fixture-missing',
      file: relPath,
      message: `Golden fixture is missing: ${relPath}`,
    });
    continue;
  }
  const actual = sha256(Buffer.from(content, 'utf8'));
  observed[relPath] = actual;
  if (actual !== expected) {
    violations.push({
      guard: 'G-A4-07-golden-fixture-drift',
      file: relPath,
      message: 'Golden fixture SHA-256 has drifted.',
      expected,
      actual,
    });
  }
}

const result = {
  guard: 'A4-golden-mutation',
  observedDigests: observed,
  expectedDigests: FROZEN_DIGESTS,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-analysis-golden-integrity] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-analysis-golden-integrity] PASS — ${Object.keys(FROZEN_DIGESTS).length} Golden fixtures verified, 0 drift.`);
