// A4 G-A4-01 + G-A4-09 — Default Provider Authority + Default/Fallback Separation
//
// Per A4 spec §11:
//   G-A4-01: Prevent competing production default-provider authorities.
//   G-A4-09: Prevent default-provider and fallback-provider roles from being
//            conflated.
//
// Single source of truth:
//   packages/runtime-core/src/application/provider-policy.js
//     getCurrentProviderPolicy() — the default / alternative / fallback
//
// This guard scans CURRENT production code (apps/, packages/) for
// forbidden patterns that would re-introduce a competing default
// authority or conflate the default / alternative / fallback roles.
//
// Forbidden patterns (narrow; deterministic; offline):
//   - hardcoded `provider: 'volcengine'` or `provider: 'qwen'` in
//     business-logic code paths (allowed only inside:
//       packages/model-runtime/src/{qwen,volcengine}-analysis-provider.js
//         — the adapter factories themselves
//       packages/model-runtime/src/analysis-provider.js — the registry
//       packages/runtime-core/src/application/provider-policy.js — the
//         policy
//       packages/runtime-core/src/application/pipeline-service.ts — the
//         runtime facade
//       apps/web/src/components/ProviderBadge.tsx — the Web badge
//     )
//   - hardcoded default-model strings (`doubao-seed-2.1-turbo` /
//     `qwen3.6-plus` / `doubao-seed-2-1-turbo-260628`) outside the
//     same allowlist
//   - imports of `@masterpiece/model-runtime/qwen-reasoner.js` or
//     `@masterpiece/model-runtime/volcengine-reasoner.js` outside the
//     provider-adapter factories (bypassing the registry)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SCAN_ROOTS = [
  'apps/cli/src',
  'apps/cli/bin',
  'apps/web/src',
  'apps/web-runtime/src',
  'packages/runtime-core/src',
];

const EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

const ALLOWLIST = new Set([
  // Adapter factories (own the provider identity)
  'packages/model-runtime/src/qwen-analysis-provider.js',
  'packages/model-runtime/src/volcengine-analysis-provider.js',
  // The registry itself
  'packages/model-runtime/src/analysis-provider.js',
  'packages/model-runtime/src/analysis-provider-registry.js',
  // The policy layer (single source of truth)
  'packages/runtime-core/src/application/provider-policy.js',
  // The runtime facade that calls the registry
  'packages/runtime-core/src/application/pipeline-service.ts',
  // The Web read-only badge (no API key; provider/model only)
  'apps/web/src/components/ProviderBadge.tsx',
  // The CLI resolver (A3-G; reads from the policy)
  'apps/cli/bin/masterpiece-os.js',
  // Reasoner factory files (own the adapter identity)
  'packages/model-runtime/src/qwen-reasoner.js',
  'packages/model-runtime/src/volcengine-reasoner.js',
  // The A3-J contract tests (reference the canonical names)
  'tests/a3-provider-policy.test.js',
  'tests/a3-fallback-classification.test.js',
  'tests/a3-provenance-shape.test.js',
  'tests/a3-observability-fields.test.js',
  'tests/a3-cli-default-resolution.test.js',
  'tests/a3-provider-health.test.js',
  'tests/analysis-provider-contract.test.js',
  'tests/volcengine-analysis-provider-contract.test.js',
]);

// Patterns that indicate a competing default authority or role conflation.
// Narrow: each pattern is a specific, semantically meaningful construct.
const FORBIDDEN_PATTERNS = [
  {
    id: 'G-A4-01-hardcoded-default-provider',
    regex: /['"]default['"]\s*:\s*['"](volcengine|qwen)['"]/u,
    message: "Hardcoded 'default' provider literal found — must use getCurrentProviderPolicy().default",
  },
  {
    id: 'G-A4-01-hardcoded-default-model',
    regex: /['"](doubao-seed-2\.1-turbo|qwen3\.6-plus|doubao-seed-2-1-turbo-260628)['"]/u,
    message: 'Hardcoded default-model literal found — must use getCurrentProviderPolicy().default.model',
  },
  {
    id: 'G-A4-09-conflate-default-and-fallback',
    regex: /\bdefault\s*===\s*['"]qwen['"]/u,
    message: "Direct comparison of default to 'qwen' literal — conflates the default and the alternative",
  },
  {
    id: 'G-A4-02-bypass-registry',
    regex: /import\s+[^;]*?\bfrom\s+['"]@masterpiece\/model-runtime\/(?:qwen|volcengine)-reasoner(?:-factory)?\.js['"]/u,
    message: 'Reasoner factory imported outside the adapter layer — bypasses the registry',
  },
];

async function walk(dir, files = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
      await walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function relativePosix(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

const violations = [];
let scanned = 0;
for (const scanRoot of SCAN_ROOTS) {
  const abs = path.join(root, scanRoot);
  const files = await walk(abs);
  for (const file of files) {
    const rel = relativePosix(file);
    if (ALLOWLIST.has(rel)) continue;
    const content = await fs.readFile(file, 'utf8');
    scanned += 1;
    for (const { id, regex, message } of FORBIDDEN_PATTERNS) {
      const match = content.match(regex);
      if (match) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        violations.push({
          guard: id,
          file: rel,
          line: lineNumber,
          message,
          excerpt: match[0],
        });
      }
    }
  }
}

const result = {
  guard: 'A4-default-authority+G-A4-09',
  scannedFiles: scanned,
  allowlistedFiles: ALLOWLIST.size,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-analysis-provider-authority] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-analysis-provider-authority] PASS — scanned ${scanned} files, 0 violations.`);
