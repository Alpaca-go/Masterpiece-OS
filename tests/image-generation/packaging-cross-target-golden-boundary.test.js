// P2-I Scanner Closure #2 — Cross-Target Isolation & Golden Boundary.
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
//     benchmark criteria) remains evaluation-only and
//      does NOT become a Packaging production rule /
//      runtime dependency / hardcoded production branch.
//
// P2-I Scanner Closure #2 closes the two false-green
// paths the previous P2-I Finalization review surfaced:
//
//   §1  collectSourceFiles(root) now supports both
//       FILE roots and DIRECTORY roots uniformly
//       (previously, a single-file root fell through
//       readdirSync and produced zero files — a false
//       PASS).
//
//   §4  The filesystem-call extractor also recognizes
//       the destructured `join(...)` / `resolve(...)`
//       forms (not just `path.join(...)` /
//       `path.resolve(...)`).
//
//   §6  The cross-target classifier generalizes from
//       fixed-depth `../packaging/` / `../../packaging/`
//       / `../../../packaging/` to arbitrary
//       `(?:\.\./)+packaging/` (and the symmetric Space
//       form).
//
//   §2  Group I self-sanity now asserts that every
//       declared Shared primitive root actually scanned
//       at least one file (no silent zero-file PASS).
//
//   §3 / §5 / §7  Add scanner regression fixtures
//       covering the file-root helper, the destructured
//       `join(...)` / `resolve(...)` form, and the
//       arbitrary-depth relative traversal form.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dirname,
  extname,
  join,
  relative,
  sep,
} from 'node:path';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
const require = createRequire(import.meta.url);

// -----------------------------------------------------------------------
// Production source roots.
//
//   Space: packages/image-generation-runtime/src/space/**
//     (Space compiler, prompt, references, gates, semantic,
//      mode boundary, continuation, etc.)
//
//   Packaging: packages/image-generation-runtime/src/packaging/**
//     (translation, validation, compiler, reference policy,
//      provider capability, provider adapter, metadata,
//      contracts, generation service)
//
// Both targets live in the same package but in distinct
// subtrees; the cross-target invariant is a *subtree*
// boundary (Space does not reach into Packaging and vice
// versa) plus a *subpath* boundary.
//
// Shared Core surfaces are split into two categories
// (P2-I §7 / §8):
//
//   - Target-neutral Shared primitive
//     (task-builder / deliverables / download-verify /
//     redact / policies / gates): a target-neutral
//     primitive that BOTH Space and Packaging use. The
//     P2-I matrix asserts these primitives do not
//     reverse-depend on the Space or Packaging subtrees.
//
//   - Target-specific Core facade
//     (packages/image-generation-runtime/src/core):
//     target-specific facade handshakes that re-export
//     target implementation. The P2-I matrix does NOT
//     classify every `core/` file as target-neutral —
//     some are facades by design.
// -----------------------------------------------------------------------
const SPACE_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/space';
const PACKAGING_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/packaging';

// SHARED_CORE_PRIMITIVE_ROOTS contains BOTH single-file
// and directory roots. P2-I Scanner Closure #2 §1 fixes
// the false-green path where a single-file root fell
// through readdirSync and silently produced zero files;
// `collectSourceFiles()` now handles both uniformly.
const SHARED_CORE_PRIMITIVE_ROOTS = [
  'packages/image-generation-runtime/src/task-builder.js',
  'packages/image-generation-runtime/src/deliverables',
  'packages/image-generation-runtime/src/download-verify.js',
  'packages/image-generation-runtime/src/redact.js',
  'packages/image-generation-runtime/src/policies.js',
  'packages/image-generation-runtime/src/gates.js',
  'packages/image-generation-runtime/src/gates',
];
const SHARED_CORE_FACADE_ROOTS = [
  'packages/image-generation-runtime/src/core',
];
const SOURCE_EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.ts']);

// -----------------------------------------------------------------------
// File walker — pattern reused from
// `scripts/verify-production-boundaries.mjs`. We do NOT
// introduce a second walker.
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

// -----------------------------------------------------------------------
// P2-I Scanner Closure #2 §1 — collectSourceFiles.
//
// `rootRel` may be a directory (recursive walk) OR a
// single source file (return that file). The previous
// `collectFiles` implementation treated every root as a
// directory and silently produced zero files for a
// single-file root, which is a false-green path the
// review caught.
//
// Behaviour:
//   - root does not exist  -> returns [] (caller decides
//     whether empty is fail-closed via assertSourceRoot)
//   - root is a file        -> returns [absoluteFile]
//   - root is a directory   -> returns [...walk(root)]
// -----------------------------------------------------------------------
function collectSourceFiles(rootRel) {
  const root = join(repoRoot, rootRel);
  const stat = statSync(root, { throwIfNoEntry: false });
  if (!stat) return [];
  if (stat.isFile()) {
    return SOURCE_EXTENSIONS.has(extname(root)) ? [root] : [];
  }
  if (stat.isDirectory()) {
    return [...walk(root)];
  }
  return [];
}

// -----------------------------------------------------------------------
// Module-specifier extraction (P2-I §7).
// -----------------------------------------------------------------------
const SPECIFIER_PATTERNS = [
  // `import x from 'spec'` and `export x from 'spec'`
  /\bfrom\s+['"]([^'"]+)['"]/gu,
  // `import 'spec'` (side-effect)
  /\bimport\s+['"]([^'"]+)['"]\s*;?/gu,
  // `import('spec')` (dynamic) — covers `await import('spec')`.
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
// Filesystem-call expression extraction (P2-I Finalization
// §5 + Scanner Closure #2 §4).
//
// P2-I Scanner Closure #2 §4 added destructured
// `join(...)` / `resolve(...)` (production may use
// `import { join, resolve } from 'node:path'`). The
// callee set therefore covers:
//   - readFile / readFileSync / createReadStream /
//     readdir / readdirSync / existsSync
//   - path.join / path.resolve
//   - join / resolve  (destructured form)
//
// The extractor walks the call's full text (up to a
// balanced closing parenthesis) and captures every
// string-literal inside. The slash-joined concatenation
// of the literals is the logical candidate; each
// individual literal is also surfaced so the
// forbidden-path predicate can match a fragment in
// isolation.
// -----------------------------------------------------------------------
const FS_CALLEES = [
  'readFile',
  'readFileSync',
  'createReadStream',
  'readdir',
  'readdirSync',
  'existsSync',
  'path.join',
  'path.resolve',
  // P2-I Scanner Closure #2 §4: destructured
  // `import { join, resolve } from 'node:path'`. We
  // match the bare identifier; the preceding
  // non-identifier char in the regex keeps us from
  // matching `path.join` (already covered above).
  'join',
  'resolve',
];

function extractCallText(source, startIndex) {
  const openParen = source.indexOf('(', startIndex);
  if (openParen === -1) return null;
  let depth = 1;
  let i = openParen + 1;
  let inString = null;
  let escaped = false;
  while (i < source.length) {
    const ch = source[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inString = ch;
      } else if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          return source.slice(startIndex, i + 1);
        }
      }
    }
    i += 1;
  }
  return null;
}

function extractStringLiterals(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let buf = '';
      let escaped = false;
      while (j < text.length) {
        const cj = text[j];
        if (escaped) {
          buf += cj;
          escaped = false;
        } else if (cj === '\\') {
          escaped = true;
        } else if (cj === quote) {
          break;
        } else {
          buf += cj;
        }
        j += 1;
      }
      out.push(buf);
      i = j + 1;
    } else if (ch === '`') {
      let j = i + 1;
      let buf = '';
      let depth = 0;
      while (j < text.length) {
        const cj = text[j];
        if (depth === 0 && cj === '`') {
          break;
        } else if (depth === 0 && cj === '$' && text[j + 1] === '{') {
          depth = 1;
          j += 2;
          continue;
        } else if (depth > 0 && cj === '{') {
          depth += 1;
        } else if (depth > 0 && cj === '}') {
          depth -= 1;
          j += 1;
          continue;
        } else if (depth === 0) {
          buf += cj;
        }
        j += 1;
      }
      out.push(buf);
      i = j + 1;
    } else {
      i += 1;
    }
  }
  return out;
}

function extractFsPathSpecifiers(source) {
  const out = new Set();
  for (const callee of FS_CALLEES) {
    const re = new RegExp(
      `(?:^|[^A-Za-z0-9_$\\.])(?:(?:[A-Za-z_$][\\w$]*\\.)?(${callee.replace(/\./g, '\\.')}))(?=\\s*\\()`,
      'gu',
    );
    for (const match of source.matchAll(re)) {
      const startIndex = match.index + match[0].length - callee.length;
      const callText = extractCallText(source, startIndex);
      if (!callText) continue;
      const literals = extractStringLiterals(callText);
      if (literals.length === 0) continue;
      const candidate = literals
        .map((s) => s.replaceAll('\\', '/'))
        .join('/');
      out.add(candidate);
      for (const literal of literals) {
        out.add(literal);
      }
    }
  }
  const urlRe = /\bnew\s+URL\s*\(\s*['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(urlRe)) {
    out.add(match[1]);
  }
  return [...out];
}

// -----------------------------------------------------------------------
// Forbidden-path patterns (P2-I §8).
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
// Cross-target classification (P2-I Scanner Closure #2 §6).
//
// The classifier generalizes from fixed-depth
// `../packaging/` / `../../packaging/` /
// `../../../packaging/` to arbitrary
// `(?:\.\./)+packaging/` (and the symmetric Space form).
// The bare-bare-word and `@masterpiece/...` subpath
// forms are preserved.
// -----------------------------------------------------------------------
function isPackagingSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const normalized = specifier.replaceAll('\\', '/');
  if (/(?:\.\.\/)+packaging\//u.test(normalized)) return true;
  if (/@masterpiece\/[^/]*packaging/u.test(normalized)) return true;
  if (/(?:^|\/)packaging\//u.test(normalized)) return true;
  return false;
}

function isSpaceSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const normalized = specifier.replaceAll('\\', '/');
  if (/(?:\.\.\/)+space\//u.test(normalized)) return true;
  if (/@masterpiece\/[^/]*space/u.test(normalized)) return true;
  if (/(?:^|\/)space\//u.test(normalized)) return true;
  return false;
}

// -----------------------------------------------------------------------
// Project-specific Golden rule literals (P2-I §10).
// -----------------------------------------------------------------------
const STRONG_GOLDEN_LITERALS = [
  '九州美学',
  '孔雀',
  '矿物紫',
  '珍珠白',
  '冷银',
  '半透明生物结构',
  '70/20/10',
  '70-20-10',
  '东方秩序',
  '生物光泽',
  '羽眼椭圆',
  '九瓣放射',
  '羽毛流线',
  '大面积浓紫',
  '大面积写实羽毛',
  '夜店式虹彩',
];

const CONTEXTUAL_GOLDEN_LITERALS = [
  'peacock',
  'feather',
  'beauty salon',
  'treatment bed',
  'tea space',
  'sales office',
];

function stripComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//gu, '');
  out = out.replace(/\/\/[^\n]*/gu, '');
  return out;
}

function isInsideHardcodedRuleContext(source, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 60);
  const windowEnd = Math.min(source.length, matchIndex + 60);
  const window = source.slice(windowStart, windowEnd);
  const rulePatterns = [
    /\bif\s*\(/u,
    /\belse\b/u,
    /\bswitch\s*\(/u,
    /\bcase\s+/u,
    /\?[^:]+:/u,
    /==/u,
    /!==?/u,
    /=[^=]/u,
    /\bloadDefault/u,
    /\bdefaultAnchor/u,
    /\bdefaultReference/u,
    /\bdefaultRole/u,
  ];
  return rulePatterns.some((p) => p.test(window));
}

// -----------------------------------------------------------------------
// Reference-First implicit Golden Anchor patterns
// (P2-I §11).
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
// scanRoot — unified scan over a single root (file or
// directory). Replaces the previous `scanDirectory`
// which assumed every root was a directory.
// -----------------------------------------------------------------------
function scanRoot(rootRel, specifierPredicate, fsPathPredicate) {
  const files = collectSourceFiles(rootRel);
  const edges = [];
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    if (specifierPredicate) {
      for (const specifier of extractModuleSpecifiers(source)) {
        if (specifierPredicate(specifier)) {
          edges.push({ file: fileRel, edge: specifier, kind: 'import' });
        }
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

// -----------------------------------------------------------------------
// P2-I Scanner Closure #2 §2 — preconditions + self-sanity.
// -----------------------------------------------------------------------
function assertRepoRoot() {
  assert.ok(statSync(repoRoot, { throwIfNoEntry: false }), `repository root does not exist: ${repoRoot}`);
  assert.ok(statSync(join(repoRoot, 'package.json'), { throwIfNoEntry: false }), `repository root must contain package.json: ${join(repoRoot, 'package.json')}`);
  assert.ok(statSync(join(repoRoot, SPACE_PRODUCTION_ROOT), { throwIfNoEntry: false }), `Space production root missing: ${SPACE_PRODUCTION_ROOT}`);
  assert.ok(statSync(join(repoRoot, PACKAGING_PRODUCTION_ROOT), { throwIfNoEntry: false }), `Packaging production root missing: ${PACKAGING_PRODUCTION_ROOT}`);
}

// =======================================================================
// Preconditions (P2-I §2 / §3)
// =======================================================================

test('P2-I preconditions — repository root and production roots exist; scanner enumerates source files', () => {
  assertRepoRoot();
  const spaceFiles = collectSourceFiles(SPACE_PRODUCTION_ROOT);
  const packagingFiles = collectSourceFiles(PACKAGING_PRODUCTION_ROOT);
  assert.ok(spaceFiles.length > 0, `Space production root must contain source files; found 0 in ${SPACE_PRODUCTION_ROOT}`);
  assert.ok(packagingFiles.length > 0, `Packaging production root must contain source files; found 0 in ${PACKAGING_PRODUCTION_ROOT}`);
  const spaceRel = spaceFiles.map((f) => relative(repoRoot, f).replaceAll(sep, '/'));
  const packagingRel = packagingFiles.map((f) => relative(repoRoot, f).replaceAll(sep, '/'));
  for (const canonical of ['packages/image-generation-runtime/src/packaging/compiler.js', 'packages/image-generation-runtime/src/packaging/translation.js']) {
    assert.ok(packagingRel.includes(canonical), `Packaging scan must observe canonical file ${canonical}`);
  }
  assert.ok(
    spaceRel.some((p) => p.startsWith(`${SPACE_PRODUCTION_ROOT}/`)),
    'Space scan must observe at least one Space production file',
  );
});

// =======================================================================
// P2-I Scanner Closure #2 §3 — file-root helper regression
// =======================================================================

test('P2-I scanner regression — collectSourceFiles handles file roots and directory roots uniformly', () => {
  // File root: returns exactly that source file, not [].
  const fileRoot = 'packages/image-generation-runtime/src/redact.js';
  const fileFiles = collectSourceFiles(fileRoot);
  assert.equal(fileFiles.length, 1, `collectSourceFiles('${fileRoot}') must return exactly that source file`);
  assert.ok(fileFiles[0].endsWith(`redact${sep}.js`) || fileFiles[0].endsWith('redact.js'), `file-root scan must observe redact.js; got ${fileFiles[0]}`);

  // Directory root: returns > 0 files.
  const dirFiles = collectSourceFiles('packages/image-generation-runtime/src/gates');
  assert.ok(dirFiles.length > 0, 'collectSourceFiles on a directory root must return > 0 files');
  for (const f of dirFiles) {
    assert.ok(SOURCE_EXTENSIONS.has(extname(f)), `directory-root scan must return only source files; got ${f}`);
  }

  // Non-existent root: returns [] (caller decides whether
  // empty is fail-closed).
  const missingFiles = collectSourceFiles('packages/this/does/not/exist.js');
  assert.deepEqual(missingFiles, [], 'non-existent root must return [] (caller decides fail-closed)');
});

// =======================================================================
// P2-I §6 — scanner regression fixtures (A-E) + Scanner
// Closure #2 §5 (F, G) + §7 (deep traversal)
// =======================================================================

test('P2-I scanner regression A — static relative import is captured', () => {
  const source = `import x from '../packaging/compiler.js';`;
  const specifiers = extractModuleSpecifiers(source);
  assert.ok(specifiers.includes('../packaging/compiler.js'), 'static import x from "../packaging/compiler.js" must be captured');
});

test('P2-I scanner regression B — await import("...") is captured', () => {
  const source = `const x = await import('../space/index.js');`;
  const specifiers = extractModuleSpecifiers(source);
  assert.ok(specifiers.includes('../space/index.js'), 'const x = await import("../space/index.js") must be captured');
});

test('P2-I scanner regression C — segmented path.join captures the full logical candidate', () => {
  const source = `fs.readFileSync(path.join(root, 'evaluation', 'golden-cases', 'a.json'));`;
  const candidates = extractFsPathSpecifiers(source);
  const expectedLogical = 'evaluation/golden-cases/a.json';
  assert.ok(candidates.includes(expectedLogical), `segmented path.join must surface ${expectedLogical}; got ${JSON.stringify(candidates)}`);
  for (const lit of ['evaluation', 'golden-cases', 'a.json']) {
    assert.ok(candidates.includes(lit), `individual literal ${lit} must be surfaced`);
  }
});

test('P2-I scanner regression D — segmented path.resolve captures the full logical candidate', () => {
  const source = `path.resolve(root, 'packages', 'image-generation-runtime', 'src', 'packaging', 'compiler.js');`;
  const candidates = extractFsPathSpecifiers(source);
  const expectedLogical = 'packages/image-generation-runtime/src/packaging/compiler.js';
  assert.ok(candidates.includes(expectedLogical), `segmented path.resolve must surface ${expectedLogical}; got ${JSON.stringify(candidates)}`);
  assert.ok(candidates.includes('packaging'), 'individual literal "packaging" must be surfaced');
});

test('P2-I scanner regression E — new URL("...", import.meta.url) is captured', () => {
  const source = `new URL('../../docs/golden/a.json', import.meta.url)`;
  const candidates = extractFsPathSpecifiers(source);
  assert.ok(candidates.includes('../../docs/golden/a.json'), `new URL must surface the specifier; got ${JSON.stringify(candidates)}`);
});

test('P2-I scanner regression F (Scanner Closure §5) — destructured join(...) is captured', () => {
  // Production code may use
  //   import { join } from 'node:path';
  // and call `join(root, 'evaluation', 'golden-cases', 'a.json')`
  // — without the `path.` member access. The bare-identifier
  // FS_CALLEES entry covers this form.
  const source = `join(root, 'evaluation', 'golden-cases', 'a.json');`;
  const candidates = extractFsPathSpecifiers(source);
  const expectedLogical = 'evaluation/golden-cases/a.json';
  assert.ok(candidates.includes(expectedLogical), `destructured join must surface ${expectedLogical}; got ${JSON.stringify(candidates)}`);
});

test('P2-I scanner regression G (Scanner Closure §5) — destructured resolve(...) surfaces a Packaging candidate', () => {
  const source = `resolve(root, 'packages', 'image-generation-runtime', 'src', 'packaging', 'compiler.js');`;
  const candidates = extractFsPathSpecifiers(source);
  const expectedLogical = 'packages/image-generation-runtime/src/packaging/compiler.js';
  assert.ok(candidates.includes(expectedLogical), `destructured resolve must surface ${expectedLogical}; got ${JSON.stringify(candidates)}`);
});

test('P2-I scanner regression H (Scanner Closure §7) — arbitrary-depth relative traversal is captured by cross-target classifier', () => {
  // The classifier generalizes from fixed-depth
  // `../packaging/` / `../../packaging/` / to
  // `(?:\.\./)+packaging/`. These synthetic specifiers
  // exercise 4- and 5-level deep traversal.
  assert.equal(isPackagingSpecifier('../../../../packaging/compiler.js'), true, '4-level-deep Packaging specifier must be classified as Packaging');
  assert.equal(isSpaceSpecifier('../../../../../space/index.js'), true, '5-level-deep Space specifier must be classified as Space');
  // 1-level and 2-level forms remain classified.
  assert.equal(isPackagingSpecifier('../packaging/compiler.js'), true, '1-level Packaging specifier must be classified as Packaging');
  assert.equal(isPackagingSpecifier('../../packaging/compiler.js'), true, '2-level Packaging specifier must be classified as Packaging');
  // Negative cases: deep traversal to a non-target
  // subtree must NOT classify as cross-target.
  assert.equal(isPackagingSpecifier('../../../../image-generation-runtime/src/deliverables/compile-fingerprint.js'), false, 'deep traversal to deliverables/ must NOT classify as Packaging');
  assert.equal(isSpaceSpecifier('../../../../image-generation-runtime/src/redact.js'), false, 'deep traversal to redact/ must NOT classify as Space');
});

// =======================================================================
// Group A — Space production has zero Packaging semantic
// edges (module + filesystem).
// =======================================================================

test('P2-I Group A — Space production has zero Packaging semantic edges (module + filesystem)', () => {
  const moduleEdges = scanRoot(SPACE_PRODUCTION_ROOT, (s) => isPackagingSpecifier(s));
  const fsEdges = scanRoot(SPACE_PRODUCTION_ROOT, null, (p) => isPackagingSpecifier(p));
  const edges = [...moduleEdges, ...fsEdges];
  assert.deepEqual(
    edges,
    [],
    `Space production must not have Packaging semantic edges. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group B — Packaging production has zero Space semantic
// edges (module + filesystem).
// =======================================================================

test('P2-I Group B — Packaging production has zero Space semantic edges (module + filesystem)', () => {
  const moduleEdges = scanRoot(PACKAGING_PRODUCTION_ROOT, (s) => isSpaceSpecifier(s));
  const fsEdges = scanRoot(PACKAGING_PRODUCTION_ROOT, null, (p) => isSpaceSpecifier(p));
  const edges = [...moduleEdges, ...fsEdges];
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not have Space semantic edges. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group C — Cross-target isolation. Combines A and B
// into a single bidirectional invariant.
// =======================================================================

test('P2-I Group C — cross-target isolation is bidirectional (Space ↔ Packaging)', () => {
  const spaceToPackaging = scanRoot(
    SPACE_PRODUCTION_ROOT,
    (s) => isPackagingSpecifier(s),
    (p) => isPackagingSpecifier(p),
  );
  const packagingToSpace = scanRoot(
    PACKAGING_PRODUCTION_ROOT,
    (s) => isSpaceSpecifier(s),
    (p) => isSpaceSpecifier(p),
  );
  const all = [...spaceToPackaging, ...packagingToSpace];
  assert.deepEqual(
    all,
    [],
    `Cross-target edges must be zero. Found ${all.length} edge(s):\n${all.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group D — Packaging production has zero Golden /
// evaluation / docs-golden imports.
// =======================================================================

test('P2-I Group D — Packaging production has zero Golden / evaluation / docs-golden imports', () => {
  const edges = scanRoot(PACKAGING_PRODUCTION_ROOT, (s) => isForbiddenPath(s));
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not import Golden / evaluation / docs-golden. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// =======================================================================
// Group E — Packaging production has zero Golden runtime
// reads.
// =======================================================================

test('P2-I Group E — Packaging production has zero Golden runtime reads (hardened fs extractor)', () => {
  const edges = scanRoot(PACKAGING_PRODUCTION_ROOT, null, (p) => isForbiddenPath(p));
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not read Golden / evaluation / docs-golden at runtime. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge}`).join('\n')}`,
  );
});

// =======================================================================
// Group F — Packaging production has zero hardcoded
// Golden project-specific rule literals.
// =======================================================================

test('P2-I Group F — Packaging production has zero hardcoded Golden project-specific rule literals', () => {
  const root = join(repoRoot, PACKAGING_PRODUCTION_ROOT);
  const violations = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    const executable = stripComments(source);
    for (const literal of STRONG_GOLDEN_LITERALS) {
      const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const pattern = new RegExp(escaped, 'iu');
      const match = pattern.exec(executable);
      if (match) violations.push({ file: fileRel, literal, kind: 'strong' });
    }
    for (const literal of CONTEXTUAL_GOLDEN_LITERALS) {
      const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const pattern = new RegExp(escaped, 'iu');
      const match = pattern.exec(executable);
      if (match && isInsideHardcodedRuleContext(executable, match.index)) {
        violations.push({ file: fileRel, literal, kind: 'contextual' });
      }
    }
  }
  assert.deepEqual(
    violations,
    [],
    `Packaging production must not hardcode Golden project-specific rule literals. Found ${violations.length} violation(s):\n${violations.map((v) => `  - ${v.file} contains "${v.literal}" (${v.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group G — Reference-First has no implicit Golden
// reference fallback.
// =======================================================================

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

// =======================================================================
// Group H — Existing repository Golden boundary
// verifiers remain PASS.
// =======================================================================

function readJsonScriptResult(scriptRelativePath) {
  const { spawnSync } = require('node:child_process');
  const scriptPath = join(process.cwd(), scriptRelativePath);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 120_000,
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `Verifier ${scriptRelativePath} exited with unexpected status ${result.status}; stderr:\n${result.stderr || '(empty)'}\nstdout:\n${result.stdout || '(empty)'}`,
    );
  }
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

// =======================================================================
// Group I — Shared Core directionality (P2-I §7 / §8 /
// Scanner Closure #2 §2 / §8).
//
// The P2-I matrix:
//   1. Asserts every declared Shared primitive root
//      was actually scanned (each >= 1 file).
//   2. Asserts zero reverse-dependency on Space /
//      Packaging subtrees (module + filesystem).
//
// The two assertions share the same scan but record
// different facts. The previous P2-I Finalization
// combined them; Scanner Closure #2 §2 / §8 splits
// them so a primitive that scans zero files is
// reported with a distinct failure mode (no scan
// provenance) instead of a misleading "zero edges"
// PASS.
// =======================================================================

test('P2-I Group I (Scanner Closure §2) — every declared Shared primitive root was actually scanned (>= 1 file)', () => {
  const provenance = [];
  for (const primitiveRoot of SHARED_CORE_PRIMITIVE_ROOTS) {
    const files = collectSourceFiles(primitiveRoot);
    assert.ok(
      files.length > 0,
      `Shared primitive root must contain >= 1 source file; ${primitiveRoot} returned ${files.length} file(s). This is the false-green path Scanner Closure #2 §1 closed: a single-file root must not silently produce zero files.`,
    );
    provenance.push({ root: primitiveRoot, fileCount: files.length });
  }
  // Specific witness: the canonical single-file
  // primitives listed in the spec must all be scanned.
  for (const expectedFileRoot of [
    'packages/image-generation-runtime/src/task-builder.js',
    'packages/image-generation-runtime/src/download-verify.js',
    'packages/image-generation-runtime/src/redact.js',
    'packages/image-generation-runtime/src/policies.js',
    'packages/image-generation-runtime/src/gates.js',
  ]) {
    const files = collectSourceFiles(expectedFileRoot);
    assert.ok(files.length === 1, `${expectedFileRoot} must be scanned as a single file; got ${files.length}`);
  }
  // Specific witness: the canonical directory primitives
  // must all be scanned.
  for (const expectedDirRoot of [
    'packages/image-generation-runtime/src/deliverables',
    'packages/image-generation-runtime/src/gates',
  ]) {
    const files = collectSourceFiles(expectedDirRoot);
    assert.ok(files.length >= 1, `${expectedDirRoot} directory root must be scanned and contain >= 1 source file; got ${files.length}`);
  }
  // Test-side provenance is logged only via the
  // assertion failures above; we do NOT persist this
  // provenance to production or to disk.
  assert.ok(provenance.length === SHARED_CORE_PRIMITIVE_ROOTS.length, 'provenance must cover every declared primitive root');
});

test('P2-I Group I — target-neutral Shared primitives do not reverse-depend on Space or Packaging subtrees', () => {
  const violations = [];
  for (const primitiveRoot of SHARED_CORE_PRIMITIVE_ROOTS) {
    const moduleEdges = scanRoot(primitiveRoot, (s) => isSpaceSpecifier(s) || isPackagingSpecifier(s));
    const fsEdges = scanRoot(primitiveRoot, null, (p) => isSpaceSpecifier(p) || isPackagingSpecifier(p));
    for (const e of [...moduleEdges, ...fsEdges]) {
      violations.push({ primitive: primitiveRoot, ...e });
    }
  }
  assert.deepEqual(
    violations,
    [],
    `target-neutral Shared primitives must not reverse-depend on Space or Packaging. Found ${violations.length} violation(s):\n${violations.map((v) => `  - primitive ${v.primitive}; edge ${v.file} -> ${v.edge} (${v.kind})`).join('\n')}`,
  );
});

test('P2-I Group I-facade — target-specific Core facades exist as documented (sanity witness)', () => {
  for (const facade of SHARED_CORE_FACADE_ROOTS) {
    const files = collectSourceFiles(facade);
    assert.ok(files.length > 0, `Core facade root must contain source files; found 0 in ${facade}`);
  }
});
