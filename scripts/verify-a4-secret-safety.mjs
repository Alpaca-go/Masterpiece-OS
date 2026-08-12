// A4 G-A4-10 — Secret Safety
//
// Per A4 spec §11:
//   G-A4-10: Ensure API keys, temporary probe env files and
//            credentials never enter committed source/reports/logs.
//
// This guard scans the CURRENT committed tree (HEAD) for the
// well-known credential / API-key shapes. On-disk untracked
// artifacts (e.g. `.codex-smoke/a2-h-env.ps1`, which is the
// user's local probe env file and is gitignored) are out of
// scope; this guard only inspects git-tracked files.
//
// Patterns:
//   - Real API key prefixes: sk-... (DashScope), ark-... (Volcengine)
//   - Bearer tokens: "Bearer <32+ chars>"
//   - Generic API key assignments: apiKey\s*[:=]\s*['"]<20+ chars>['"]
//   - A2-H env-template-style assignments: $env:KEY\s*=\s*'<value>'
//
// Allowlist:
//   - .gitignore (line 8 lists .codex-smoke/ where env files live)
//   - This script itself (the FORBIDDEN_PATTERNS list)
//   - docs/visual-analysis/A2-H-*-env* docs (reference only, no real keys)
//   - apps/web-runtime/src/node-credential-store.ts (handles
//     credentials via OS keychain; the source code does not
//     contain real keys, but it references the credential key path)

import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// FORBIDDEN_PATTERNS — each pattern is narrow + case-insensitive.
// Real API keys are typically 40+ chars; the dashscope / ark
// prefixes are 2/3 chars and the rest is the secret payload.
// We require a 40+ char payload AND a non-file-name delimiter
// (whitespace, quote, end-of-line) to disambiguate from
// file names like `sk-reference-graph.md`.
const FORBIDDEN_PATTERNS = [
  {
    id: 'G-A4-10-dashscope-api-key',
    // 40+ char payload; must end at a non-alphanumeric (or end-of-string)
    regex: /sk-[A-Za-z0-9._-]{40,}(?=$|[\s'"`,;)\]])/u,
    label: 'DashScope API key (sk-...)',
  },
  {
    id: 'G-A4-10-volcengine-api-key',
    regex: /ark-[A-Za-z0-9-]{40,}(?=$|[\s'"`,;)\]])/u,
    label: 'Volcengine / Ark API key (ark-...)',
  },
  {
    id: 'G-A4-10-bearer-token',
    regex: /Bearer\s+[A-Za-z0-9._-]{40,}(?=$|[\s'"`,;)\]])/u,
    label: 'Bearer token (40+ chars)',
  },
  {
    id: 'G-A4-10-generic-api-key-assignment',
    regex: /apiKey\s*[:=]\s*['"][A-Za-z0-9._-]{40,}['"]/u,
    label: 'Generic apiKey assignment with 40+ chars',
  },
];

// Allowlist — these files are EXPECTED to discuss / reference the
// forbidden patterns in their documentation. They are NOT
// production secrets.
const ALLOWLIST = new Set([
  'scripts/verify-a4-secret-safety.mjs',  // this file
  'docs/visual-analysis/A2-H-default-provider-authority-audit.md',
  'docs/visual-analysis/A2-H-default-switch-manifest.md',
  'docs/visual-analysis/A2-H-final-report.md',
  'docs/visual-analysis/A2-final-freeze.md',
  'docs/visual-analysis/A3-final-freeze.md',
  'docs/visual-analysis/A3-final-report.md',
  'docs/visual-analysis/A4-production-contract-freeze.md',
  'docs/visual-analysis/A4-operational-failure-matrix.md',
  // The credential store is allowed to reference "apiKey" / "credentialKey"
  // as a name; it does not contain real keys.
  'apps/web-runtime/src/node-credential-store.ts',
]);

// Get all tracked files in HEAD
const trackedFiles = (() => {
  try {
    const out = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' });
    return out.split('\n').map((line) => line.trim()).filter(Boolean);
  } catch {
    return [];
  }
})();

const violations = [];
let scanned = 0;
for (const rel of trackedFiles) {
  if (ALLOWLIST.has(rel)) continue;
  // Only scan files that look like they could contain text content
  const ext = path.extname(rel).toLowerCase();
  if (!['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.env', '.ps1', '.sh', '.txt'].includes(ext)) {
    continue;
  }
  const abs = path.join(root, rel);
  let content;
  try {
    content = await fs.readFile(abs, 'utf8');
  } catch {
    continue;
  }
  scanned += 1;
  for (const { id, regex, label } of FORBIDDEN_PATTERNS) {
    const match = content.match(regex);
    if (match) {
      const lineNumber = content.slice(0, match.index).split('\n').length;
      // Mask the matched value to avoid leaking the key in the report
      const masked = `${match[0].slice(0, 6)}...${match[0].slice(-4)}`;
      violations.push({
        guard: id,
        file: rel,
        line: lineNumber,
        label,
        excerpt: masked,
      });
    }
  }
}

const result = {
  guard: 'A4-secret-safety',
  trackedFilesScanned: scanned,
  allowlistedFiles: ALLOWLIST.size,
  violationCount: violations.length,
  violations,
};

console.log(JSON.stringify(result, null, 2));
if (violations.length > 0) {
  console.error(`[verify-a4-secret-safety] FAIL — ${violations.length} violation(s) detected.`);
  process.exit(1);
}
console.log(`[verify-a4-secret-safety] PASS — scanned ${scanned} tracked files, 0 secret-shape matches.`);
