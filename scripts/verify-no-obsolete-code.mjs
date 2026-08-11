// verify:no-obsolete-code — repository-slimming-v2 Phase 6 gate.
// Scans production code for forbidden legacy names. Labs are exempt
// (allowed lab roots per the slimming spec); two protocol filenames are
// exempt inside the active Shared Runtime reference-first protocol because
// production still imports them.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const FORBIDDEN = [
  'src/v4',
  'v4-bootstrap',
  'runV4Pipeline',
  'analyze:v4',
  'visual-translation/v1',
  'visual-translation/v2',
  'createVisualTranslationService',
  'VisualTranslationWorkspace',
  'visual-translation:',
  'src/reference-translation',
  'createReferenceTranslationService',
  'ReferenceTranslationWorkspace',
  'reference-translation:',
  'generation-readiness-resolver',
  'validator-registry',
  'style-carrier-ranking',
  'task-reference-selection',
  'blocked-generation-report-compiler'
];

// Keywords still legitimately used by retained production protocol files.
const PROTOCOL_EXEMPT_KEYWORDS = new Set(['style-carrier-ranking', 'task-reference-selection']);
const PROTOCOL_EXEMPT_PREFIXES = [
  path.join('packages', 'runtime-core', 'src', 'application', 'reference-first'),
];

// Files allowed to mention legacy names (negative assertions / this gate itself).
const FILE_WHITELIST = new Set([
  path.join('tests', 'runtime-application', 'architecture-boundary.test.ts'),
  path.join('scripts', 'verify-no-obsolete-code.mjs'),
  path.join('scripts', 'verify-production-boundaries.mjs')
]);

const SCAN_ROOTS = ['src', 'apps/cli/src', 'apps/web/src', 'apps/web-runtime/src', 'packages', 'scripts', 'tests', 'bin'];
const SCAN_FILES = ['package.json', 'AGENTS.md', 'README.md'];
const TEXT_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.md', '.yml', '.yaml', '.html', '.css']);

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (TEXT_EXTENSIONS.has(path.extname(entry.name))) yield absolute;
  }
}

const targets = [];
for (const scanRoot of SCAN_ROOTS) {
  const absolute = path.join(root, scanRoot);
  if (fs.existsSync(absolute)) targets.push(...walk(absolute));
}
for (const file of SCAN_FILES) {
  const absolute = path.join(root, file);
  if (fs.existsSync(absolute)) targets.push(absolute);
}

const violations = [];
for (const file of targets) {
  const relative = path.relative(root, file);
  if (FILE_WHITELIST.has(relative)) continue;
  const content = fs.readFileSync(file, 'utf8');
  for (const keyword of FORBIDDEN) {
    if (!content.includes(keyword)) continue;
    if (
      PROTOCOL_EXEMPT_KEYWORDS.has(keyword)
      && PROTOCOL_EXEMPT_PREFIXES.some((prefix) => relative.startsWith(prefix))
    ) continue;
    violations.push(`${relative} -> "${keyword}"`);
  }
}

if (violations.length > 0) {
  console.error('[no-obsolete-code] FAIL — forbidden legacy references found:');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}
console.log(`[no-obsolete-code] PASS — scanned ${targets.length} files, no forbidden legacy references.`);
