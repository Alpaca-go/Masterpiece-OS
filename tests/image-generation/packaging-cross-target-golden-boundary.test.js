// P2-I — Cross-Target Isolation & Golden Boundary.
//
// P2-I is a TEST-ONLY phase. It proves two architectural
// boundaries on the production codebase:
//
//   A. Space (target) and Packaging (target) remain
//      isolated. They share only target-neutral Shared
//      Core. Neither side imports, requires, dynamically
//      imports, or filesystem-loads the other side's
//      target-specific semantics.
//
//   B. Golden benchmark knowledge (Golden Prompt, Golden
//      Output, evaluation/*, docs/golden/*, named-project
//      benchmark criteria) remains evaluation-only and
//      does NOT become a Packaging production rule /
//      runtime dependency / hardcoded production branch.
//
// The P2-I matrix reuses and extends the existing
// repository verifiers:
//
//   - verify-golden-production-boundary.mjs provides the
//     `walk()` recursive directory walker and the
//     `runtimeImport` regex (which we extend below).
//   - verify-no-project-specific-production-rules.mjs
//     provides the file-level substring scan for known
//     Golden project literal leakage (九州美学 / 孔雀 /
//     羽毛 / peacock / feather / 矿物紫 / 珍珠白 / 70/20/10
//     etc.) on `prompt-like` files.
//   - verify-production-boundaries.mjs provides the
//     `productionRoots` list and the `importPattern`
//     baseline (from / import( / require()).
//   - verify:workspace-boundaries already PASSes — it
//     catches deep relative imports of `packages/*/src/*`
//     from `apps/**` or `tests/**`.
//
// P2-I does NOT introduce a second competing repository
// dependency scanner. It composes the existing patterns
// with two small P2-I-specific test-side helpers:
//
//   1. `extractModuleSpecifiers(source)` — covers all 7
//      import forms called out by P2-I §7: import x from,
//      export x from, import '...' (side-effect),
//      await import(...), const x = await import(...),
//      require(...), const x = require(...).
//   2. `extractFsReadSpecifiers(source)` — covers
//      filesystem-based dependency surfaces called out by
//      P2-I §7: readFile / readFileSync /
//      createReadStream / readdir / readdirSync /
//      existsSync / path.join / path.resolve /
//      import.meta.url based resource loads. Golden
//      leakage can occur through a file read without an
//      ES import; the verifier must catch that channel.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

function dirname(path) {
  const idx = path.lastIndexOf('/');
  return idx === -1 ? '.' : path.slice(0, idx);
}

// -----------------------------------------------------------------------
// Production source roots.
// -----------------------------------------------------------------------
//
// The Space target production code lives in
// `packages/image-generation-runtime/src/space/**` (Space
// compiler, prompt, references, gates, semantic / mode
// boundary, continuation, etc.).
//
// The Packaging target production code lives in
// `packages/image-generation-runtime/src/packaging/**`
// (translation, validation, compiler, reference policy,
// provider capability, provider adapter, metadata,
// contracts, generation service).
//
// Both targets live in the same package but in distinct
// subtrees; the cross-target invariant is a *subtree*
// boundary (Space does not reach into Packaging and vice
// versa) plus a *subpath* boundary (no
// `@masterpiece/image-generation-runtime/...packaging...`
// or `...space...` subpath import from a sibling target
// production file).
//
// The Shared Core re-export surface (`core/...`) is
// target-specific *facade*; it sits below the
// cross-target boundary and is consumed by `runtime-core`
// (NOT by Space / Packaging production). The P2-I matrix
// does NOT flag the core/ facade re-exports themselves
// (they are the architectural handshake), only the
// direct Space ↔ Packaging cross-references.
const SPACE_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/space';
const PACKAGING_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/packaging';

// `core/` is a Shared Core facade; P2-I does not test
// cross-target edges through it (it is the Shared Core
// handshake surface by design). The P2-I matrix asserts
// Space and Packaging production files do not bypass
// Shared Core and reach into each other.
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts']);

// -----------------------------------------------------------------------
// File walker — pattern reused from
// `scripts/verify-production-boundaries.mjs` (the existing
// production-boundary verifier). We do NOT introduce a
// second walker; this is a small inline helper built from
// the same recursive shape.
// -----------------------------------------------------------------------
function* walk(directory) {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (['node_modules', 'out', 'dist', 'build', '.git'].includes(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(absolute);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      yield absolute;
    }
  }
}

function extname(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx);
}

// -----------------------------------------------------------------------
// Module-specifier extraction (P2-I §7).
//
// We extract the string-literal module specifier from each
// import / require / dynamic import form, in the order
// the spec calls them out:
//
//   - import x from '...'
//   - export x from '...'
//   - import '...'
//   - await import('...')
//   - const x = await import('...')
//   - require('...')
//   - const x = require('...')
//
// The first three (static) share the `from '...'` shape;
// the `import 'spec'` (side-effect) form has no `from`.
// We use four separate patterns and dedup the
// specifier set, so a single import edge is not double-
// counted and a single file's full import surface is
// covered.
// -----------------------------------------------------------------------
const SPECIFIER_PATTERNS = [
  // `import x from 'spec'` and `export x from 'spec'`
  /\bfrom\s+['"]([^'"]+)['"]/gu,
  // `import 'spec'` (side-effect)
  /\bimport\s+['"]([^'"]+)['"]\s*;?/gu,
  // `import('spec')` (dynamic) — covers `await import('spec')` too,
  // because `await import(` is matched by `import(`.
  /\bimport\s*\(\s*['"]([^'"]+)['"]/gu,
  // `require('spec')`
  /\brequire\s*\(\s*['"]([^'"]+)['"]/gu,
];

function extractModuleSpecifiers(source) {
  const set = new Set();
  for (const pattern of SPECIFIER_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      set.add(match[1]);
    }
  }
  return [...set];
}

// -----------------------------------------------------------------------
// Filesystem dependency surface (P2-I §7).
//
// Golden leakage can occur through a file read without an
// ES import. We surface any string-literal that appears
// inside a 240-character window after a `readFile`,
// `readFileSync`, `createReadStream`, `readdir`,
// `readdirSync`, `existsSync`, or `path.join` /
// `path.resolve` call. We deliberately do NOT flag bare
// `path.join(...)` or `path.resolve(...)` calls without a
// forbidden path inside the window — those are legitimate
// runtime filesystem operations.
// -----------------------------------------------------------------------
const FS_READ_PATTERNS = [
  // readFile / readFileSync / createReadStream / readdir / readdirSync / existsSync
  // followed by any string literal in the next 240 chars.
  /\b(?:readFile|readFileSync|createReadStream|readdir|readdirSync|existsSync)\s*\([^)]*['"]([^'"]+)['"]/gu,
  // path.join / path.resolve / import.meta.url based resource loads
  // that mention a Golden / evaluation path.
  /\b(?:path\.join|path\.resolve)\s*\(\s*[^)]*['"]([^'"]+)['"]/gu,
  // import.meta.url based reads (e.g.
  // `new URL('...', import.meta.url)`).
  /\bnew\s+URL\s*\(\s*['"]([^'"]+)['"]/gu,
];

function extractFsPathSpecifiers(source) {
  const set = new Set();
  for (const pattern of FS_READ_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      set.add(match[1]);
    }
  }
  return [...set];
}

// -----------------------------------------------------------------------
// Forbidden-path patterns.
//
//   - `evaluation/golden-cases` / `evaluation/anti-cases` /
//     `evaluation/hidden-cases` — Golden / benchmark
//     fixtures (P2 spec §28 §29 §58).
//   - `tests/fixtures` / `tests/evaluation` — test-side
//     evaluation assets (P2 spec §58).
//   - `docs/golden` — Golden documentation / anchor
//     assets.
//   - `golden-cases` / `golden-anchors` / `goldenPrompt` /
//     `golden_prompt` — keyword-form references that must
//     not appear as a runtime dependency.
// -----------------------------------------------------------------------
const FORBIDDEN_PATH_FRAGMENTS = [
  'evaluation/golden-cases',
  'evaluation/anti-cases',
  'evaluation/hidden-cases',
  'tests/fixtures',
  'tests/evaluation',
  'docs/golden',
  'golden-cases',
  'golden-anchors',
  'goldenPrompt',
  'golden_prompt',
];

function isForbiddenPath(specifier) {
  const normalized = String(specifier).replaceAll('\\', '/');
  return FORBIDDEN_PATH_FRAGMENTS.some((frag) => normalized.includes(frag));
}

// -----------------------------------------------------------------------
// Cross-target classification.
//
//   - Cross-target specifiers: any import from
//     `../packaging/...` or `@masterpiece/...packaging...`
//     in a Space production file, or vice versa.
//   - Forbidden-by-Golden: any specifier that matches a
//     forbidden path fragment in either a Space or a
//     Packaging production file.
// -----------------------------------------------------------------------
function isPackagingSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const normalized = specifier.replaceAll('\\', '/');
  // Relative cross-target reach from a Space production
  // file (which sits in `src/space/...`). The relative
  // path must reach up to `../packaging/...` to cross
  // targets. We also catch absolute / alias subpath
  // imports.
  if (/(?:^|\/)\.\.\/packaging\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/packaging\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/\.\.\/packaging\//u.test(normalized)) return true;
  // Subpath form: `@masterpiece/image-generation-runtime/...packaging...`.
  if (/@masterpiece\/[^/]*packaging/u.test(normalized)) return true;
  // Bare bare word (used in the rare case a production
  // file references the packaging target by name only —
  // e.g. `import x from 'packaging/...'`).
  if (/(?:^|\/)packaging\//u.test(normalized)) return true;
  return false;
}

function isSpaceSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const normalized = specifier.replaceAll('\\', '/');
  if (/(?:^|\/)\.\.\/space\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/space\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/\.\.\/space\//u.test(normalized)) return true;
  if (/@masterpiece\/[^/]*space/u.test(normalized)) return true;
  if (/(?:^|\/)space\//u.test(normalized)) return true;
  return false;
}

// -----------------------------------------------------------------------
// Project-specific Golden rule literals (P2-I §9 / §10 / §17).
//
// These are *named Golden criteria* / *forbidden outcomes*
// from the 九州美学 benchmark baseline. They are NOT
// forbidden in user input or compiled output (a real
// Analysis may legitimately contain similar language);
// they are forbidden only as **hardcoded production
// rules** in production source.
//
// The boundary is:
//   - forbidden: hardcoded `if industry == 'xxx'` /
//     `dominantColor = 'pearl white'` in production code
//   - allowed: passing the user-provided value through
//     to the prompt
//
// The P2-I matrix scans only **production source** for
// these literals. Comments and docstrings are NOT part
// of the scan surface (a comment that says "do not
// hardcode these" must not produce a false positive).
// We split source on `//` and `/* */` block comments
// and only scan the executable region.
// -----------------------------------------------------------------------
const FORBIDDEN_PRODUCTION_LITERALS = [
  '九州美学',
  '孔雀',
  '羽毛',
  'peacock',
  'feather',
  '矿物紫',
  '珍珠白',
  '冷银',
  '半透明生物结构',
  '70/20/10',
  '70-20-10',
  'beauty salon',
  'treatment bed',
  'tea space',
  'sales office',
  '东方秩序',
  '生物光泽',
  '羽眼椭圆',
  '九瓣放射',
  '羽毛流线',
  '大面积浓紫',
  '大面积写实羽毛',
  '夜店式虹彩',
];

// Strip line + block comments to avoid false positives
// in doc comments.
function stripComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//gu, '');
  out = out.replace(/\/\/[^\n]*/gu, '');
  return out;
}

// -----------------------------------------------------------------------
// Reference-First implicit Golden Anchor patterns (P2-I §11).
//
// The production Reference-First route must use the
// user's explicit Reference identity. It must NEVER
// silently select a Golden Anchor. We scan production
// source for hardcoded Golden Anchor lookups.
// -----------------------------------------------------------------------
const GOLDEN_ANCHOR_FALLBACK_PATTERNS = [
  /\bgolden[-_]?anchor\b/iu,
  /\bdefault[-_]?anchor\b/iu,
  /\bloadGoldenAnchor\b/u,
  /\bdefaultReferenceImage\b/u,
  /\bjiuzhouAnchor\b/iu,
  /\b九[州]锚点\b/u,
];

// -----------------------------------------------------------------------
// File-level scan helper: returns the list of `{file,
// specifier, kind, line}` edges for a given directory
// root and predicate.
// -----------------------------------------------------------------------
function scanDirectory(rootRel, specifierPredicate, fsPathPredicate) {
  const root = join(repoRoot, rootRel);
  if (!statSync(root, { throwIfNoEntry: false })) return [];
  const edges = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    for (const specifier of extractModuleSpecifiers(source)) {
      if (specifierPredicate(specifier)) {
        edges.push({ file: fileRel, edge: specifier, kind: 'import' });
      }
    }
    if (fsPathPredicate) {
      for (const fsPath of extractFsPathSpecifiers(source)) {
        if (fsPathPredicate(fsPath)) {
          edges.push({ file: fileRel, edge: fsPath, kind: 'fs-read' });
        }
      }
    }
  }
  return edges;
}

// =======================================================================
// P2-I Test groups
// =======================================================================

// -----------------------------------------------------------------------
// Group A — Space production source has zero Packaging
// semantic imports.
// -----------------------------------------------------------------------
test('P2-I Group A — Space production has zero Packaging semantic imports (cross-target boundary)', () => {
  const edges = scanDirectory(
    SPACE_PRODUCTION_ROOT,
    (specifier) => isPackagingSpecifier(specifier),
  );
  assert.deepEqual(
    edges,
    [],
    `Space production must not import Packaging semantics. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group B — Packaging production source has zero Space
// semantic imports.
// -----------------------------------------------------------------------
test('P2-I Group B — Packaging production has zero Space semantic imports (cross-target boundary)', () => {
  const edges = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    (specifier) => isSpaceSpecifier(specifier),
  );
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not import Space semantics. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group C — Cross-target isolation. Combines Group A and
// Group B; asserts the bidirectional boundary in a single
// invariant.
// -----------------------------------------------------------------------
test('P2-I Group C — cross-target isolation is bidirectional (Space ↔ Packaging)', () => {
  const spaceToPackaging = scanDirectory(
    SPACE_PRODUCTION_ROOT,
    (specifier) => isPackagingSpecifier(specifier),
  );
  const packagingToSpace = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    (specifier) => isSpaceSpecifier(specifier),
  );
  const all = [...spaceToPackaging, ...packagingToSpace];
  assert.deepEqual(
    all,
    [],
    `Cross-target edges must be zero. Found ${all.length} edge(s):\n${all.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group D — Packaging production source has zero Golden /
// evaluation / docs-golden imports. The P2 spec §28 §29
// §58 invariant: production Packaging must not depend
// on Golden assets at the import-graph level.
// -----------------------------------------------------------------------
test('P2-I Group D — Packaging production has zero Golden / evaluation / docs-golden imports', () => {
  const edges = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    (specifier) => isForbiddenPath(specifier),
  );
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not import Golden / evaluation / docs-golden. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group E — Packaging production source has zero Golden
// runtime reads. The P2 spec §58 invariant extends
// through the runtime: a Golden dependency can come from
// a file read, not just an ES import. The P2-I matrix
// covers the filesystem-based dependency surface.
// -----------------------------------------------------------------------
test('P2-I Group E — Packaging production has zero Golden runtime reads (file-system dependency surface)', () => {
  const edges = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    null,
    (fsPath) => isForbiddenPath(fsPath),
  );
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not read Golden / evaluation / docs-golden at runtime. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group F — Packaging production source has zero
// project-specific Golden rule branches. The P2-I matrix
// scans the executable region (comments stripped) of
// every Packaging production file for the named Golden
// criteria / forbidden outcomes from the 九州美学
// benchmark baseline.
//
// The boundary is: a real user's Analysis may legitimately
// contain similar language (e.g. "珍珠白" in a brand
// brief); what is forbidden is HARD-CODED production
// rules that bake these into the runtime.
// -----------------------------------------------------------------------
test('P2-I Group F — Packaging production has zero hardcoded Golden project-specific rule literals', () => {
  const root = join(repoRoot, PACKAGING_PRODUCTION_ROOT);
  const violations = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    const executable = stripComments(source);
    for (const literal of FORBIDDEN_PRODUCTION_LITERALS) {
      // Whole-string, case-insensitive match on the
      // executable (comment-stripped) region. A user
      // can pass a similar token via the Analysis; the
      // boundary is hardcoded production code.
      const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const pattern = new RegExp(escaped, 'iu');
      const match = pattern.exec(executable);
      if (match) violations.push({ file: fileRel, literal });
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Packaging production must not hardcode Golden project-specific rule literals. Found ${violations.length} violation(s):\n${violations.map((v) => `  - ${v.file} contains "${v.literal}"`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group G — Reference-First production route has no
// implicit Golden reference fallback. The matrix scans
// Packaging production source for hardcoded Golden
// Anchor lookups (loadGoldenAnchor / defaultReferenceImage
// / jiuzhouAnchor / 九州锚点).
// -----------------------------------------------------------------------
test('P2-I Group G — Packaging Reference-First has no implicit Golden reference fallback', () => {
  const root = join(repoRoot, PACKAGING_PRODUCTION_ROOT);
  const violations = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    const executable = stripComments(source);
    for (const pattern of GOLDEN_ANCHOR_FALLBACK_PATTERNS) {
      const match = pattern.exec(executable);
      if (match) violations.push({ file: fileRel, snippet: match[0] });
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Reference-First must use the user's explicit Reference identity; hardcoded Golden Anchor fallback is forbidden. Found ${violations.length} violation(s):\n${violations.map((v) => `  - ${v.file} contains "${v.snippet}"`).join('\n')}`,
  );
});

// -----------------------------------------------------------------------
// Group H — Existing repository Golden boundary verifiers
// remain PASS. P2-I does not replace any verifier; the
// existing authorities are the single source of truth
// for those invariants. The matrix invokes the
// `verify:golden-boundary` and
// `verify:no-project-specific-production-rules` scripts
// directly so the P2-I Exit conditions are checked
// against the live repository state, not just the
// test-side helpers.
// -----------------------------------------------------------------------

function readJsonScriptResult(scriptRelativePath) {
  // Spawn the script in offline mode (no real Provider
  // call) and capture its stdout. The script's output is
  // a JSON object with `{status, violations}`. We do not
  // mock or stub the verifier — we run the real one and
  // assert its status.
  //
  // Use `process.execPath` so the spawned interpreter is
  // the same Node binary that runs the test (Windows
  // PATH can resolve to a different `node` in a child
  // process when the parent is launched with a
  // space-containing path).
  const { spawnSync } = require('node:child_process');
  // Re-derive `repoRoot` from `process.cwd()` rather than
  // the test file's `import.meta.url` because Windows
  // path normalization in some test-runner contexts
  // collapses the `..\..` chain at the module top, while
  // `process.cwd()` is always the repository root that
  // `npm test` launches the test runner from.
  const cwdRepoRoot = process.cwd();
  const scriptPath = join(cwdRepoRoot, scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: cwdRepoRoot,
    encoding: 'utf8',
    timeout: 120_000,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  // Debug aid: if status is unexpected, surface the
  // raw output so the test failure message is
  // informative on Windows where stdio piping can
  // behave differently in nested child processes.
  if (result.stdout == null || result.stdout === '') {
    throw new Error(
      `Verifier ${scriptRelativePath} emitted empty stdout. status=${result.status}; signal=${result.signal}; stderr=${JSON.stringify(result.stderr || '(empty)')}; pid=${result.pid}`,
    );
  }
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Verifier ${scriptRelativePath} exited with unexpected status ${result.status}; stderr:\n${result.stderr || '(empty)'}\nstdout:\n${result.stdout || '(empty)'}`,
    );
  }
  // The verifier emits JSON as its last (or only)
  // stdout chunk. We extract the JSON object greedily.
  const text = result.stdout || '';
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error(`Verifier ${scriptRelativePath} did not emit a JSON object on stdout: ${text}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

test('P2-I Group H — existing Golden boundary verifiers remain PASS', () => {
  const golden = readJsonScriptResult('scripts/verify-golden-production-boundary.mjs');
  assert.equal(golden.status, 'pass', `verify-golden-production-boundary must remain PASS; got: ${JSON.stringify(golden)}`);
  assert.deepEqual(golden.violations, [], 'verify-golden-production-boundary must report zero violations');

  const project = readJsonScriptResult('scripts/verify-no-project-specific-production-rules.mjs');
  assert.equal(project.status, 'pass', `verify-no-project-specific-production-rules must remain PASS; got: ${JSON.stringify(project)}`);
  assert.deepEqual(project.violations, [], 'verify-no-project-specific-production-rules must report zero violations');
});
