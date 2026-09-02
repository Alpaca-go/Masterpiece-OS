import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CURRENT_ROOTS = [
  'apps/cli/src',
  'apps/web/src',
  'apps/web-runtime/src',
  'packages'
];
const VERSION_SEGMENT = /^(?:v\d+(?:[._-]\d+)*|vnext\d*|v-next\d*|phase\d+(?:[._-]\d+)*|r\d+(?:[._-]\d+)*)$/i;
const TEMPORAL_SEGMENT = /^(?:latest|new\d*|next\d*|final\d*|backup\d*|copy\d*|temp(?:orary)?\d*)(?:[-_.].*)?$/i;
const VERSIONED_CONTRACT_PARENTS = new Set(['api', 'apis', 'contract', 'contracts', 'migration', 'migrations', 'schema', 'schemas']);
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', 'coverage', 'dist', 'out']);
const GOLDEN_ROOTS = [
  'evaluation/golden-cases',
  'evaluation/contracts',
  'evaluation/reports',
  'tests/fixtures',
  'tests/image-generation/fixtures',
  'space-generator/quality-baselines'
];
const LOCAL_ARTIFACT_PATTERN = /(?:\.codex-smoke|\.codex-runtime|Masterpiece-OS-Projects[\\/])/i;
const LOCAL_ARTIFACT_READ_PATTERN = /(?:\bimport\b|\bfrom\b|\brequire\s*\(|readFile|readJson|loadFixture)/i;

function normalize(relativePath) {
  return relativePath.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');
}

function isInside(relativePath, parent) {
  return relativePath === parent || relativePath.startsWith(`${parent}/`);
}

export function classifyCurrentPath(relativePath, allowlistedPaths = []) {
  const normalized = normalize(relativePath);
  if (!CURRENT_ROOTS.some((currentRoot) => isInside(normalized, currentRoot))) return null;
  if (allowlistedPaths.some((entry) => isInside(normalized, normalize(entry)))) return null;
  const segments = normalized.split('/');
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (index === segments.length - 1 && path.extname(segment)) continue;
    const parent = segments[index - 1]?.toLowerCase();
    if (VERSION_SEGMENT.test(segment) && !VERSIONED_CONTRACT_PARENTS.has(parent)) {
      return { code: 'RC001', path: normalized, detail: `version identity directory: ${segment}` };
    }
    if (TEMPORAL_SEGMENT.test(segment)) {
      return { code: 'RC001', path: normalized, detail: `temporal directory: ${segment}` };
    }
  }
  return null;
}

export function checkPromptDigest(content, expectedDigest, relativePath = 'prompt') {
  const actual = createHash('sha256').update(content).digest('hex').toUpperCase();
  if (actual !== expectedDigest.toUpperCase()) {
    return { code: 'RC004', path: normalize(relativePath), detail: 'frozen prompt digest changed' };
  }
  return null;
}

export function validatePromptIntegrity(root, prompts) {
  const failures = [];
  if (prompts.algorithm !== 'sha256' || !Array.isArray(prompts.entries)) {
    return [{ code: 'RC009', path: 'prompt-integrity.json', detail: 'prompt integrity metadata is malformed' }];
  }
  const seenPaths = new Set();
  for (const entry of prompts.entries) {
    const promptPath = path.join(root, entry.path ?? '');
    if (!entry.path || !/^[A-F0-9]{64}$/i.test(entry.sha256 ?? '') || !existsSync(promptPath)) {
      failures.push({ code: 'RC004', path: entry.path ?? 'prompt-integrity.json', detail: 'frozen prompt entry is incomplete or missing' });
      continue;
    }
    if (seenPaths.has(entry.path)) {
      failures.push({ code: 'RC009', path: entry.path, detail: 'frozen prompt entry is duplicated' });
      continue;
    }
    seenPaths.add(entry.path);
    const failure = checkPromptDigest(readFileSync(promptPath), entry.sha256, entry.path);
    if (failure) failures.push(failure);
  }
  return failures;
}

export function classifyGoldenChanges(paths) {
  return paths.map((changedPath) => ({
    code: 'RC005',
    path: normalize(changedPath),
    detail: 'Golden baseline changed after the contract freeze'
  }));
}

export function checkProductionReference(file, sourceLine) {
  if (LOCAL_ARTIFACT_PATTERN.test(sourceLine) && LOCAL_ARTIFACT_READ_PATTERN.test(sourceLine)) {
    return { code: 'RC007', path: normalize(file), detail: 'local generated artifact is used as an input' };
  }
  return null;
}

export function validateCompatibilityRegistry(registry, allowlist = { entries: [] }) {
  const failures = [];
  const required = ['identifier', 'type', 'locations', 'consumer', 'reason', 'owner', 'removalCondition', 'introducedPhase'];
  for (const [index, entry] of (registry.entries ?? []).entries()) {
    for (const field of required) {
      if (!entry[field] || (Array.isArray(entry[field]) && entry[field].length === 0)) {
        failures.push({ code: 'RC009', path: `compatibility-registry.entries[${index}]`, detail: `missing ${field}` });
      }
    }
  }
  for (const exception of allowlist.entries ?? []) {
    const exceptionPath = normalize(exception.path);
    const covered = (registry.entries ?? []).some((entry) => (entry.locations ?? []).some((location) => {
      const normalizedLocation = normalize(location);
      return isInside(normalizedLocation, exceptionPath)
        || (normalizedLocation.endsWith('/package.json') && exceptionPath.startsWith(normalizedLocation.slice(0, -'/package.json'.length)));
    }));
    if (!covered) failures.push({ code: 'RC006', path: exceptionPath, detail: 'compatibility path is not registered' });
  }
  return failures;
}

function readJson(root, relativePath, failures) {
  try {
    return JSON.parse(readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    failures.push({ code: 'RC009', path: relativePath, detail: error.message });
    return {};
  }
}

function walkDirectories(root, relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];
  const found = [];
  const visit = (absoluteDirectory, relativeDirectory) => {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      if (!entry.isDirectory() || SKIP_DIRECTORIES.has(entry.name)) continue;
      const childRelative = normalize(path.join(relativeDirectory, entry.name));
      found.push(childRelative);
      visit(path.join(absoluteDirectory, entry.name), childRelative);
    }
  };
  visit(absoluteRoot, normalize(relativeRoot));
  return found;
}

function walkSourceFiles(root, relativeRoot) {
  const absoluteRoot = path.join(root, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];
  const found = [];
  const visit = (absoluteDirectory, relativeDirectory) => {
    for (const entry of readdirSync(absoluteDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRECTORIES.has(entry.name)) visit(path.join(absoluteDirectory, entry.name), normalize(path.join(relativeDirectory, entry.name)));
      } else if (/\.(?:c|m)?(?:js|ts)x?$/.test(entry.name)) {
        found.push(normalize(path.join(relativeDirectory, entry.name)));
      }
    }
  };
  visit(absoluteRoot, normalize(relativeRoot));
  return found;
}

function changedGoldenPaths(root, freezeCommit) {
  if (!freezeCommit) return [];
  const runGit = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
    .split(/\r?\n/).map(normalize).filter(Boolean);
  try {
    const changed = runGit(['diff', '--name-only', freezeCommit, '--', ...GOLDEN_ROOTS]);
    const untracked = runGit(['ls-files', '--others', '--exclude-standard', '--', ...GOLDEN_ROOTS]);
    return [...new Set([...changed, ...untracked])];
  } catch (error) {
    return [`unable to compare Golden paths: ${error.message}`];
  }
}

export function verifyRepositoryContract(root = process.cwd(), options = {}) {
  const failures = [];
  const authorities = readJson(root, 'config/repository-contract/current-authorities.json', failures);
  const allowlist = readJson(root, 'config/repository-contract/version-namespace-allowlist.json', failures);
  const prompts = readJson(root, 'config/repository-contract/prompt-integrity.json', failures);
  const compatibility = readJson(root, 'config/repository-contract/compatibility-registry.json', failures);
  const allowedPaths = (allowlist.entries ?? []).map((entry) => entry.path);

  for (const currentRoot of CURRENT_ROOTS) {
    for (const file of walkSourceFiles(root, currentRoot)) {
      const failure = classifyCurrentPath(file, allowedPaths);
      if (failure) failures.push(failure);
    }
  }

  const capabilities = new Set();
  for (const entry of authorities.authorities ?? []) {
    if (!entry.capability || !entry.authority || !entry.ownerLayer) {
      failures.push({ code: 'RC009', path: 'current-authorities.json', detail: 'authority entry is incomplete' });
      continue;
    }
    if (capabilities.has(entry.capability)) failures.push({ code: 'RC003', path: entry.capability, detail: 'multiple CURRENT authorities' });
    capabilities.add(entry.capability);
    const authorityPath = normalize(entry.authority);
    if (!existsSync(path.join(root, authorityPath)) || /^(?:archive|evaluation|historical|labs|apps\/desktop)(?:\/|$)/.test(authorityPath)) {
      failures.push({ code: 'RC003', path: authorityPath, detail: 'authority is missing or outside the current production graph' });
    }
  }

  failures.push(...validatePromptIntegrity(root, prompts));

  failures.push(...validateCompatibilityRegistry(compatibility, allowlist));
  for (const entry of compatibility.entries ?? []) {
    for (const location of entry.locations ?? []) {
      if (!existsSync(path.join(root, location))) failures.push({ code: 'RC006', path: location, detail: `registered compatibility location is missing (${entry.identifier})` });
    }
  }

  const sourceRoots = [...CURRENT_ROOTS, 'tests'];
  for (const sourceRoot of sourceRoots) {
    for (const file of walkSourceFiles(root, sourceRoot)) {
      const lines = readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
      lines.forEach((line, index) => {
        const failure = checkProductionReference(file, line);
        if (failure) failures.push({ ...failure, detail: `${failure.detail} at line ${index + 1}` });
      });
    }
  }

  const goldenChanges = options.changedGoldenPaths ?? changedGoldenPaths(root, authorities.freezeCommit);
  failures.push(...classifyGoldenChanges(goldenChanges));
  return failures;
}

function run() {
  const root = process.cwd();
  const failures = verifyRepositoryContract(root);
  if (failures.length > 0) {
    console.error('Repository Contract Guard: FAIL');
    for (const failure of failures) console.error(`${failure.code} ${failure.path}: ${failure.detail}`);
    process.exitCode = 1;
    return;
  }
  const authorities = JSON.parse(readFileSync(path.join(root, 'config/repository-contract/current-authorities.json'), 'utf8'));
  const allowlist = JSON.parse(readFileSync(path.join(root, 'config/repository-contract/version-namespace-allowlist.json'), 'utf8'));
  const prompts = JSON.parse(readFileSync(path.join(root, 'config/repository-contract/prompt-integrity.json'), 'utf8'));
  const compatibility = JSON.parse(readFileSync(path.join(root, 'config/repository-contract/compatibility-registry.json'), 'utf8'));
  const compatibilityDelta = compatibility.entries.length - (compatibility.baselineEntryCount ?? compatibility.entries.length);
  console.log('Repository Contract Guard: PASS');
  console.log(`namespace exceptions: ${allowlist.entries.length} | CURRENT authorities: ${authorities.authorities.length} | frozen prompts: ${prompts.entries.length} | compatibility entries: ${compatibility.entries.length}`);
  console.log(`Golden files changed: NO | compatibility delta: ${compatibilityDelta}`);
  if (compatibilityDelta > 0) console.log(`REVIEW RC010 NEW_COMPATIBILITY_CONTRACT: +${compatibilityDelta}`);
  console.log('provider calls: 0 | business writes: 0 | digest auto-update: NO');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) run();
