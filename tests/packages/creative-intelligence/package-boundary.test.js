import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');

function getCiSourceFiles() {
  // Walk the creative-intelligence src directory and collect all .ts files.
  const ciSrc = path.join(repoRoot, 'packages', 'creative-intelligence', 'src');
  const files = [];
  function walk(dir) {
    const entries = readDirSafe(dir);
    for (const entry of entries) {
      const full = path.join(dir, entry);
      const stat = statSafe(full);
      if (!stat) continue;
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.ts')) files.push(full);
    }
  }
  walk(ciSrc);
  return files;
}

import { readdirSync, statSync, existsSync } from 'node:fs';
function readDirSafe(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir);
}
function statSafe(p) {
  try { return statSync(p); } catch { return null; }
}

const FORBIDDEN_PATTERNS = [
  // runtime-core application services
  { pattern: /from ['"](@masterpiece\/runtime-core)\/src\/application\//, label: 'runtime-core application services' },
  { pattern: /from ['"](@masterpiece\/runtime-core)['"\/]/, label: 'runtime-core (direct)' },
  // apps
  { pattern: /from ['"]@masterpiece-os\/(web|web-runtime|cli)/, label: 'apps/* packages' },
  { pattern: /from ['"]\.\.\/\.\.\/\.\.\/apps\//, label: 'apps/* relative' },
  // labs
  { pattern: /from ['"]@masterpiece-labs\//, label: 'labs/* packages' },
  { pattern: /from ['"].*labs\//, label: 'labs/ relative' },
  // evaluation — only labs/ evaluation, not the CI evaluation namespace
  { pattern: /from ['"]@masterpiece-labs\/.*evaluation/, label: 'labs evaluation' },
  { pattern: /from ['"].*labs\/.*evaluation/, label: 'labs/ evaluation' },
  // image generation internals
  { pattern: /from ['"]@masterpiece\/image-generation-runtime\/src\/(space|packaging|creative-director|generation)\//, label: 'image-generation compiler internals' },
  // React / UI
  { pattern: /from ['"]react['"\/]/, label: 'React (UI layer)' },
  // RPC / IPC
  { pattern: /from ['"].*ipc.*['" ]/, label: 'RPC / IPC implementation' },
];

test('CI package boundary — no forbidden imports in creative-intelligence source', () => {
  const files = getCiSourceFiles();
  assert.ok(files.length > 0, 'expected CI source files to exist');

  const violations = [];
  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    const content = readFileSync(file, 'utf8');
    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        violations.push(`${rel}: ${label} — "${match[0].trim()}"`);
      }
    }
  }

  if (violations.length > 0) {
    assert.fail(
      `CI-1 architecture guard: ${violations.length} forbidden import(s):\n  ${violations.join('\n  ')}`,
    );
  }
});

test('CI package boundary — decisions do not import evidence or truth', () => {
  const decisionsDir = path.join(repoRoot, 'packages', 'creative-intelligence', 'src', 'decisions');
  const files = getFilesInDir(decisionsDir);
  const violations = [];
  for (const file of files) {
    const rel = path.relative(repoRoot, file);
    const content = readFileSync(file, 'utf8');
    if (/from ['"]\.\.\/(evidence|truth)\//.test(content)) {
      violations.push(`${rel}: imports sibling namespace (evidence/truth) — decisions must be standalone`);
    }
    if (/from ['"]\.\.\/\.\.\/(evidence|truth)\//.test(content)) {
      violations.push(`${rel}: imports sibling namespace (evidence/truth) — decisions must be standalone`);
    }
  }
  if (violations.length > 0) {
    assert.fail(`decisions namespace must not import evidence/truth in CI-1:\n  ${violations.join('\n  ')}`);
  }
});

test('CI package boundary — evidence does not import decisions', () => {
  const evidenceDir = path.join(repoRoot, 'packages', 'creative-intelligence', 'src', 'evidence');
  const files = getFilesInDir(evidenceDir);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !/from ['"]\.\.\/decisions\//.test(content) &&
      !/from ['"]\.\.\/\.\.\/decisions\//.test(content),
      `${path.relative(repoRoot, file)}: evidence must not import decisions`,
    );
  }
});

test('CI package boundary — truth does not import decisions', () => {
  const truthDir = path.join(repoRoot, 'packages', 'creative-intelligence', 'src', 'truth');
  const files = getFilesInDir(truthDir);
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    assert.ok(
      !/from ['"]\.\.\/decisions\//.test(content) &&
      !/from ['"]\.\.\/\.\.\/decisions\//.test(content),
      `${path.relative(repoRoot, file)}: truth must not import decisions`,
    );
  }
});

// helper
function getFilesInDir(dir) {
  const result = [];
  function walk(d) {
    const entries = readDirSafe(d);
    for (const entry of entries) {
      const full = path.join(d, entry);
      const stat = statSafe(full);
      if (!stat) continue;
      if (stat.isDirectory()) walk(full);
      else if (entry.endsWith('.ts')) result.push(full);
    }
  }
  walk(dir);
  return result;
}
