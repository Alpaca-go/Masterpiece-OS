#!/usr/bin/env node
// verify-space-compiler-baseline.mjs
// Phase 9B Space Quality Baseline file gate (Recovery R1).
//
// Enforces that the frozen Phase 9B real-provider baseline modules under
// space-generator/v1-experimental/ are present on disk. These files are the
// Golden Source for the production space-quality compiler (R3) and the
// real-provider A/B parity runner (R6). They must not be silently deleted
// or renamed.
//
// Baseline commit (documented in Phase 9B Recovery doc):
//   de2e2ca5d4c21ae6914f9f0a4a7c9860ae971e9e
//
// Offline / idempotent. Does not call a provider or execute a build.
//
// NOTE: The recovery doc §1.2 lists `compile-spatial-intelligence-pipeline.mjs`,
// which does not exist at baseline. The real file at de2e2ca is
// `compile-spatial-intelligence-prompt.mjs` (the doc's own §15 verify list
// also uses the `-prompt` name). We verify the real filename.

import { existsSync, statSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const BASELINE_COMMIT = 'de2e2ca5d4c21ae6914f9f0a4a7c9860ae971e9e';

// Required individual files.
const REQUIRED_FILES = [
  // Prompt compiler
  'space-generator/v1-experimental/prompt-compiler/field-enriched/compile-prompt.mjs',
  'space-generator/v1-experimental/prompt-compiler/anchor-aware/compile-with-anchor.mjs',
  'space-generator/v1-experimental/prompt-compiler/runtime/compile-runtime.mjs',
  // Spatial intent + intelligence
  'space-generator/v1-experimental/spatial-intent-compiler/compile-spatial-intent.mjs',
  'space-generator/v1-experimental/spatial-intelligence-pipeline/compile-spatial-intelligence-prompt.mjs',
  'space-generator/v1-experimental/spatial-intelligence-pipeline/compile-spatial-intent-block.mjs',
  'space-generator/v1-experimental/spatial-intelligence-pipeline/compile-architecture-language-block.mjs',
  // Architecture bridge
  'space-generator/v1-experimental/architecture-bridge/compile-architecture-bridge.mjs',
  // Architecture anchors
  'space-generator/v1-experimental/architecture-anchors/registry.json',
  'space-generator/v1-experimental/architecture-anchors/loader/load-anchors.mjs',
];

// Directories that must exist with at least one file inside (non-empty).
const REQUIRED_DIRS = [
  'space-generator/v1-experimental/architecture-bridge/bridge-rules',
  'space-generator/v1-experimental/architecture-bridge/schemas',
];

// Per-brand anchor requirements. Each brand must contain the listed files.
const BRAND_ANCHORS = [
  {
    brand: 'jiuzhou-aesthetics',
    files: [
      'JZMX-ARCH-01.png',
      'JZMX-ARCH-02.png',
      'JZMX-ARCH-03.png',
      'metadata.yaml',
      'architecture-dna-analysis.yaml',
    ],
  },
  {
    brand: 'feng-tang-tang',
    files: [
      'metadata.yaml',
      'architecture-dna-analysis.yaml',
    ],
  },
  {
    brand: 'yi-ji-liang-fang',
    files: [
      'metadata.yaml',
      'architecture-dna-analysis.yaml',
    ],
  },
];

const failures = [];

function checkFile(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    failures.push(`PHASE9B_BASELINE_FILE_MISSING: ${rel}`);
    console.log(`  [FAIL] ${rel}`);
    return;
  }
  const st = statSync(full);
  if (!st.isFile() || st.size === 0) {
    failures.push(`PHASE9B_BASELINE_FILE_EMPTY: ${rel}`);
    console.log(`  [FAIL] ${rel} (empty or not a file)`);
    return;
  }
  console.log(`  [ok]   ${rel}`);
}

function checkDirNonEmpty(rel) {
  const full = path.join(root, rel);
  if (!existsSync(full)) {
    failures.push(`PHASE9B_BASELINE_DIR_MISSING: ${rel}`);
    console.log(`  [FAIL] ${rel}/ (missing)`);
    return;
  }
  let entries;
  try {
    entries = readdirSync(full);
  } catch (err) {
    failures.push(`PHASE9B_BASELINE_DIR_UNREADABLE: ${rel} (${err.message})`);
    console.log(`  [FAIL] ${rel}/ (unreadable)`);
    return;
  }
  if (entries.length === 0) {
    failures.push(`PHASE9B_BASELINE_DIR_EMPTY: ${rel}`);
    console.log(`  [FAIL] ${rel}/ (empty)`);
    return;
  }
  console.log(`  [ok]   ${rel}/ (${entries.length} entries)`);
}

console.log(`\nPhase 9B Space Baseline File Verifier`);
console.log(`Baseline commit: ${BASELINE_COMMIT}\n`);

console.log('[1] Required compiler modules...');
for (const f of REQUIRED_FILES) checkFile(f);

console.log('\n[2] Required non-empty directories (bridge rules / schemas)...');
for (const d of REQUIRED_DIRS) checkDirNonEmpty(d);

console.log('\n[3] Architecture Anchor brand assets...');
for (const { brand, files } of BRAND_ANCHORS) {
  for (const f of files) {
    checkFile(`space-generator/v1-experimental/architecture-anchors/${brand}/${f}`);
  }
}

console.log(`\nSummary: ${failures.length} failure(s)`);
if (failures.length > 0) {
  console.log('\nFAIL — Phase 9B baseline is incomplete. Restore missing files from');
  console.log(`      ${BASELINE_COMMIT} before running R3/R6.`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nPASS — Phase 9B space baseline files present.');
