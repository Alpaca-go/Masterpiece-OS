// A4 G-A4-05 — Version Namespace Discipline
//
// Per A4 spec §11:
//   G-A4-05: Prevent new production namespaces such as:
//     visual-analysis-v6
//     visual-analysis-vnext
//     analysis-r12
//     provider-final
//     provider-new
//
// This guard scans CURRENT production code (apps/, packages/) for
// forbidden namespace patterns. The existing verify-version-naming
// guard handles V5 / V6 / V18 / vnext identifiers in
// pipeline-level constants; this guard handles the
// Visual-Analysis-specific namespaces that the A4 spec names
// explicitly.

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
  'packages/model-runtime/src',
];

const EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);

// Forbidden Visual Analysis namespace tokens (per A4 spec §11 G-A4-05).
// Each pattern is narrow + case-insensitive + whole-word (via \b).
// NOTE: VNEXT_* identifiers that exist in non-Visual-Analysis
// modules (e.g. image-generation VNEXT_VALIDATOR / VNEXT_IMAGE in
// `packages/runtime-core/src/application/image-generation/`)
// are OUT OF SCOPE for this guard; they are covered by the
// existing `verify-version-naming` guard (V5 / V6 / V18 / vnext
// pipeline-level constants). This guard is specifically for
// the Visual-Analysis namespace discipline required by A4.
const FORBIDDEN = Object.freeze([
  /\bvisual-analysis-v6\b/iu,
  /\bvisual-analysis-vnext\b/iu,
  /\bvisual-analysis-r12\b/iu,
  /\bvisual-analysis-r\d+\b/iu,
  /\bvisual-analysis-v18\b/iu,
  /\banalysis-r12\b/iu,
  /\bprovider-final\b/iu,
  /\bprovider-new\b/iu,
  // The legacy Visual-Analysis stage names (post A2-final-freeze
  // §11 they must not be reintroduced in CURRENT production code).
  /\bV18_VISUAL_ANALYSIS/u,
  /\bV6_VISUAL_ANALYSIS/u,
  /\bVNEXT_VISUAL_ANALYSIS/iu,
]);

const ALLOWLIST = new Set([
  // Test fixtures + design docs that discuss the historical names
  // (necessary for documentation, not new namespaces).
  'docs/visual-analysis/A2-final-freeze.md',
  'docs/visual-analysis/A3-manifests.md',
  'docs/visual-analysis/A3-rollback-plan.md',
  'docs/visual-analysis/A3-web-ux.md',
  'docs/visual-analysis/A4-production-contract-freeze.md',
  'docs/visual-analysis/A4-operational-failure-matrix.md',
  'docs/visual-analysis/A3-final-freeze.md',
  'docs/visual-analysis/A3-final-report.md',
  'docs/visual-analysis/A3-provider-policy.md',
  'docs/visual-analysis/A3-fallback-policy.md',
  'docs/visual-analysis/A3-cli-provider-registry-closure.md',
  'docs/visual-analysis/A3-observability-report.md',
  'docs/visual-analysis/A3-production-smoke-report.md',
  'docs/visual-analysis/A3-regression-report.md',
]);

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
    for (const pattern of FORBIDDEN) {
      const match = content.match(pattern);
      if (match) {
        const lineNumber = content.slice(0, match.index).split('\n').length;
        violations.push({
          guard: 'G-A4-05-version-namespace',
          file: rel,
          line: lineNumber,
          pattern: pattern.source,
          excerpt: match[0],
        });
      }
    }
  }
}

const result = {
  guard: 'A4-version-namespace',
  scannedFiles: scanned,
  allowlistedFiles: ALLOWLIST.size,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-analysis-namespace] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-analysis-namespace] PASS — scanned ${scanned} files, 0 violations.`);
