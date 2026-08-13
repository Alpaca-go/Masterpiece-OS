// P2-I Finalization Delta — Cross-Target Isolation & Golden Boundary.
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
// repository verifiers (verify-golden-production-boundary,
// verify-no-project-specific-production-rules,
// verify-production-boundaries, verify:workspace-boundaries)
// and adds two small P2-I-specific test-side helpers:
//
//   1. extractModuleSpecifiers(source) — covers all 7
//      import forms called out by P2-I §7: import x from,
//      export x from, import '...' (side-effect), await
//      import(...), const x = await import(...), require(...),
//      const x = require(...).
//   2. extractFsPathSpecifiers(source) — covers the
//      filesystem-based dependency surface: readFile /
//      readFileSync / createReadStream / readdir /
//      readdirSync / existsSync / path.join / path.resolve /
//      new URL. Captures all string-literal segments inside
//      the relevant call expression (not only the first),
//      so segmented paths like
//        path.join(root, 'evaluation', 'golden-cases', 'a.json')
//      are surfaced as the logical candidate
//        'evaluation/golden-cases/a.json'.
//
// P2-I does NOT introduce a second competing repository
// dependency scanner. It is a boundary witness: it
// composes existing patterns with the small helper pair
// above and asserts the existing repository verifiers
// (Group H) remain PASS at test time.

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
// Resolve repository root from `import.meta.url` via
// `node:path` — platform-aware. P2-I Finalization Delta
// §1 replaces the previous hand-rolled dirname() helper
// with the platform-aware authority.
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
// versa) plus a *subpath* boundary (no
// `@masterpiece/image-generation-runtime/...packaging...`
// or `...space...` subpath import from a sibling target
// production file).
//
// The `core/` directory is a Shared Core facade surface
// (P2-I §8). Some `core/` files are target-specific
// facades (e.g. `core/space-generation-core.js`,
// `core/packaging-generation-core.js`) that re-export
// target-specific code; others are target-neutral Shared
// primitives (e.g. `deliverables/compile-fingerprint.js`,
// `redact.js`, `download-verify.js`). The P2-I matrix
// distinguishes between the two — see Group I.
//
// P2-I Finalization Delta §2: production roots must
// EXIST and CONTAIN source files. A missing root is a
// hard precondition failure, not a zero-violation PASS.
// -----------------------------------------------------------------------
const SPACE_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/space';
const PACKAGING_PRODUCTION_ROOT = 'packages/image-generation-runtime/src/packaging';
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
// `scripts/verify-production-boundaries.mjs`. This is a
// small inline helper; we do NOT introduce a second
// competing walker.
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

function collectFiles(directory) {
  const root = join(repoRoot, directory);
  if (!statSync(root, { throwIfNoEntry: false })) return [];
  return [...walk(root)];
}

// -----------------------------------------------------------------------
// Module-specifier extraction (P2-I §7).
//
// We extract the string-literal module specifier from
// each import / require / dynamic import form:
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
// `import 'spec'` (side-effect) has no `from`. We use
// four patterns and dedup the specifier set, so a single
// import edge is not double-counted.
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
// Delta §5).
//
// The previous extractor captured only the first
// string-literal in a call expression. A segmented
// path like
//
//   path.join(root, 'evaluation', 'golden-cases', 'a.json')
//
// was therefore under-detected. The hardened extractor
// captures the call's full text (up to a balanced closing
// parenthesis) and extracts every string literal inside,
// then normalizes the concatenation of those literals
// into a logical candidate.
//
// `new URL('...', import.meta.url)` is the resource-load
// channel; we capture the URL specifier literally.
//
// The result is a list of *logical candidate strings*.
// Each candidate is the concatenated-and-slash-joined
// version of the string literals inside one call
// expression. Segmented paths land as a single
// normalized candidate.
// -----------------------------------------------------------------------

/**
 * Extract the full text of a single call expression
 * starting at a given index. The caller is expected to
 * have located the callee (e.g. `path.join(`); this
 * function then walks forward, tracking string-literal
 * boundaries and parenthesis depth, and returns the
 * substring up to and including the matching `)`.
 */
function extractCallText(source, startIndex) {
  // Find the opening `(` of the call expression.
  const openParen = source.indexOf('(', startIndex);
  if (openParen === -1) return null;
  let depth = 1;
  let i = openParen + 1;
  let inString = null; // quote char or null
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

/**
 * Extract every single-quoted / double-quoted /
 * backtick-templated string literal from a text region.
 * Template literals are reduced to a single string
 * containing their static text portion; we deliberately
 * do NOT execute or interpret template expressions.
 */
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
      // Template literal: take the static portions
      // (skip ${...} expressions).
      let j = i + 1;
      let buf = '';
      let depth = 0;
      while (j < text.length) {
        const cj = text[j];
        if (depth === 0 && cj === '`') {
          break;
        } else if (depth === 0 && cj === '$' && text[j + 1] === '{') {
          // skip the ${...} expression
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

/**
 * The set of callee identifiers the P2-I matrix treats
 * as filesystem-dependency surface. We match by bare
 * identifier or by `path.<method>` member expression;
 * the call's first occurrence as a callee is enough.
 */
const FS_CALLEES = [
  'readFile',
  'readFileSync',
  'createReadStream',
  'readdir',
  'readdirSync',
  'existsSync',
  'path.join',
  'path.resolve',
];

function extractFsPathSpecifiers(source) {
  const out = new Set();
  for (const callee of FS_CALLEES) {
    // Match the callee as a free identifier, allowing
    // optional member access (`path.join`) or a leading
    // member access (`fs.readFile`). We do not restrict
    // to the start of a line — the previous P2-H
    // `^/m` limitation caused under-detection of
    // expressions mid-line.
    const re = new RegExp(
      `(?:^|[^A-Za-z0-9_$])(?:(?:[A-Za-z_$][\\w$]*\\.)?(${callee.replace(/\./g, '\\.')}))(?=\\s*\\()`,
      'gu',
    );
    for (const match of source.matchAll(re)) {
      const startIndex = match.index + match[0].length - callee.length;
      const callText = extractCallText(source, startIndex);
      if (!callText) continue;
      const literals = extractStringLiterals(callText);
      if (literals.length === 0) continue;
      // The logical candidate is the slash-joined
      // concatenation of all string literals inside
      // the call expression. Segmented paths land as
      // one candidate.
      const candidate = literals
        .map((s) => s.replaceAll('\\', '/'))
        .join('/');
      out.add(candidate);
      // Also surface each individual literal so the
      // forbidden-path predicate can match a single
      // fragment in isolation (e.g. `'golden-cases'`
      // inside a `path.join(...)` call).
      for (const literal of literals) {
        out.add(literal);
      }
    }
  }
  // `new URL('...', import.meta.url)` — single-literal
  // resource-load channel.
  const urlRe = /\bnew\s+URL\s*\(\s*['"]([^'"]+)['"]/gu;
  for (const match of source.matchAll(urlRe)) {
    out.add(match[1]);
  }
  return [...out];
}

// -----------------------------------------------------------------------
// Forbidden-path patterns (P2-I §8).
//
//   - `evaluation/golden-cases` / `evaluation/anti-cases` /
//     `evaluation/hidden-cases` — Golden / benchmark
//     fixtures.
//   - `tests/fixtures` / `tests/evaluation` — test-side
//     evaluation assets.
//   - `docs/golden` — Golden documentation / anchor
//     assets.
//   - `golden-cases` / `golden-anchors` / `goldenPrompt` /
//     `golden_prompt` — keyword-form references.
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
// Cross-target classification (P2-I §4 / §5).
//
// A specifier is "Packaging" if it reaches into the
// Packaging subtree of `image-generation-runtime/src/`
// (relative path) or carries the Packaging target in a
// subpath import (`@masterpiece/.../packaging...`).
// A specifier is "Space" by the symmetric definition.
// -----------------------------------------------------------------------
function isPackagingSpecifier(specifier) {
  if (typeof specifier !== 'string') return false;
  const normalized = specifier.replaceAll('\\', '/');
  if (/(?:^|\/)\.\.\/packaging\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/packaging\//u.test(normalized)) return true;
  if (/(?:^|\/)\.\.\/\.\.\/\.\.\/packaging\//u.test(normalized)) return true;
  if (/@masterpiece\/[^/]*packaging/u.test(normalized)) return true;
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
// Project-specific Golden rule literals (P2-I §10).
//
// P2-I Finalization Delta §10 refines the boundary:
// strong unique Golden literals are direct production
// guards; ambiguous generic design vocabulary (feather /
// peacock / beauty salon / tea space / sales office)
// requires contextual evidence of hardcoded
// rule / default / branch behavior before being
// flagged.
//
// Architectural rule (P2-I §17):
//
//   - FORBIDDEN: hardcoded Golden decision knowledge
//     in production code (`if industry == 'xxx'` /
//     `dominantColor = 'pearl white'` /
//     `if no reference: loadGoldenAnchor()`).
//   - ALLOWED: generic capability vocabulary
//     (a real user's Analysis may legitimately
//     mention similar language).
//
// The matrix below keeps strong unique Golden literals
// (e.g. 九州美学, 矿物紫, 珍珠白, 70/20/10) as direct
// guards, and treats `peacock` / `feather` /
// `beauty salon` / `tea space` / `sales office` as
// context-required literals — they only count as a
// violation when the surrounding code is a
// rule / default / branch (an `if`, ternary, `case`,
// `===`, or `= ... =` assignment, or a `loadDefault*`
// call).
//
// Comments and docstrings are NOT part of the scan
// surface (P2-I §10); we strip them before scanning.
// -----------------------------------------------------------------------

// Strong unique Golden literals — direct production
// guards (no contextual evidence required).
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

// Ambiguous generic design vocabulary — only flagged
// when the surrounding code is a hardcoded production
// rule / default / branch.
const CONTEXTUAL_GOLDEN_LITERALS = [
  'peacock',
  'feather',
  'beauty salon',
  'treatment bed',
  'tea space',
  'sales office',
];

// Strip line + block comments to avoid false positives
// in doc comments.
function stripComments(source) {
  let out = source.replace(/\/\*[\s\S]*?\*\//gu, '');
  out = out.replace(/\/\/[^\n]*/gu, '');
  return out;
}

/**
 * Identify a 60-character context window of executable
 * code around a literal's match. We then check whether
 * the window contains a hardcoded production
 * rule / default / branch shape:
 *
 *   - `if (...)` / `else` / `case` / `? :` / `===` / `==`
 *   - `=` followed by the literal as the right-hand
 *     side of an assignment
 *   - a `loadDefault*` / `default<Role>Anchor` / etc.
 *     function-call name
 */
function isInsideHardcodedRuleContext(source, matchIndex) {
  const windowStart = Math.max(0, matchIndex - 60);
  const windowEnd = Math.min(source.length, matchIndex + 60);
  const window = source.slice(windowStart, windowEnd);
  // Rule shapes:
  const rulePatterns = [
    /\bif\s*\(/u,
    /\belse\b/u,
    /\bswitch\s*\(/u,
    /\bcase\s+/u,
    /\?[^:]+:/u, // ternary
    /==/u,
    /!==?/u,
    /=[^=]/u, // assignment (catches `= 'peacock'`)
    /\bloadDefault/u,
    /\bdefaultAnchor/u,
    /\bdefaultReference/u,
    /\bdefaultRole/u,
  ];
  return rulePatterns.some((p) => p.test(window));
}

// -----------------------------------------------------------------------
// Reference-First implicit Golden Anchor patterns
// (P2-I §11). Reference-First must use the user's
// explicit Reference identity; it must NEVER silently
// select a Golden Anchor.
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
// File-level scan helper.
// -----------------------------------------------------------------------
function scanDirectory(rootRel, specifierPredicate, fsPathPredicate) {
  const root = join(repoRoot, rootRel);
  if (!statSync(root, { throwIfNoEntry: false })) return [];
  const edges = [];
  for (const file of walk(root)) {
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
// P2-I Finalization Delta §2 — fail-closed preconditions.
// -----------------------------------------------------------------------
function assertRepoRoot() {
  assert.ok(statSync(repoRoot, { throwIfNoEntry: false }), `repository root does not exist: ${repoRoot}`);
  assert.ok(statSync(join(repoRoot, 'package.json'), { throwIfNoEntry: false }), `repository root must contain package.json: ${join(repoRoot, 'package.json')}`);
  assert.ok(statSync(join(repoRoot, SPACE_PRODUCTION_ROOT), { throwIfNoEntry: false }), `Space production root missing: ${SPACE_PRODUCTION_ROOT}`);
  assert.ok(statSync(join(repoRoot, PACKAGING_PRODUCTION_ROOT), { throwIfNoEntry: false }), `Packaging production root missing: ${PACKAGING_PRODUCTION_ROOT}`);
}

// =======================================================================
// Preconditions (P2-I Finalization Delta §2 + §3)
// =======================================================================

test('P2-I preconditions — repository root and production roots exist; scanner enumerates source files', () => {
  assertRepoRoot();
  // Scanner self-sanity (§3). A zero-file scan would be
  // an enumeration failure, NOT a zero-violation PASS.
  const spaceFiles = collectFiles(SPACE_PRODUCTION_ROOT);
  const packagingFiles = collectFiles(PACKAGING_PRODUCTION_ROOT);
  assert.ok(spaceFiles.length > 0, `Space production root must contain source files; found 0 in ${SPACE_PRODUCTION_ROOT}`);
  assert.ok(packagingFiles.length > 0, `Packaging production root must contain source files; found 0 in ${PACKAGING_PRODUCTION_ROOT}`);
  // Optional canonical-file witnesses — pinning known
  // files without hardcoding total counts.
  const spaceRel = spaceFiles.map((f) => relative(repoRoot, f).replaceAll(sep, '/'));
  const packagingRel = packagingFiles.map((f) => relative(repoRoot, f).replaceAll(sep, '/'));
  for (const canonical of ['packages/image-generation-runtime/src/packaging/compiler.js', 'packages/image-generation-runtime/src/packaging/translation.js']) {
    assert.ok(packagingRel.includes(canonical), `Packaging scan must observe canonical file ${canonical}`);
  }
  // At least one Space canonical file is observed.
  assert.ok(
    spaceRel.some((p) => p.startsWith(`${SPACE_PRODUCTION_ROOT}/`)),
    'Space scan must observe at least one Space production file',
  );
});

// =======================================================================
// P2-I Finalization Delta §6 — scanner regression fixtures.
//
// Synthetic source strings that exercise the scanner's
// edge cases. No production code is touched; these are
// pure test-side fixtures.
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
  // The logical candidate (concatenation) is the
  // slash-joined literal list inside the call.
  const expectedLogical = 'evaluation/golden-cases/a.json';
  assert.ok(
    candidates.includes(expectedLogical),
    `segmented path.join must surface the logical candidate ${expectedLogical}; got ${JSON.stringify(candidates)}`,
  );
  // Each individual literal is also surfaced so the
  // forbidden-path predicate can match a single
  // fragment in isolation.
  for (const lit of ['evaluation', 'golden-cases', 'a.json']) {
    assert.ok(candidates.includes(lit), `individual literal ${lit} must be surfaced; got ${JSON.stringify(candidates)}`);
  }
});

test('P2-I scanner regression D — segmented path.resolve captures the full logical candidate', () => {
  const source = `path.resolve(root, 'packages', 'image-generation-runtime', 'src', 'packaging', 'compiler.js');`;
  const candidates = extractFsPathSpecifiers(source);
  // The logical candidate is the slash-joined literal
  // list. The P2-I matrix treats this as a Packaging
  // edge because the literal sequence contains
  // 'packaging' + 'compiler.js'.
  const expectedLogical = 'packages/image-generation-runtime/src/packaging/compiler.js';
  assert.ok(
    candidates.includes(expectedLogical),
    `segmented path.resolve must surface the logical candidate ${expectedLogical}; got ${JSON.stringify(candidates)}`,
  );
  // Individual literals are also surfaced.
  assert.ok(candidates.includes('packaging'), 'individual literal "packaging" must be surfaced');
});

test('P2-I scanner regression E — new URL("...", import.meta.url) is captured', () => {
  const source = `new URL('../../docs/golden/a.json', import.meta.url)`;
  const candidates = extractFsPathSpecifiers(source);
  assert.ok(candidates.includes('../../docs/golden/a.json'), `new URL("...", import.meta.url) must surface the specifier; got ${JSON.stringify(candidates)}`);
});

// =======================================================================
// Group A — Space production source has zero Packaging
// semantic edges (module specifiers + filesystem
// dependency candidates).
// =======================================================================

test('P2-I Group A — Space production has zero Packaging semantic edges (module + filesystem)', () => {
  const moduleEdges = scanDirectory(
    SPACE_PRODUCTION_ROOT,
    (specifier) => isPackagingSpecifier(specifier),
  );
  const fsEdges = scanDirectory(
    SPACE_PRODUCTION_ROOT,
    null,
    (fsPath) => isPackagingSpecifier(fsPath),
  );
  const edges = [...moduleEdges, ...fsEdges];
  assert.deepEqual(
    edges,
    [],
    `Space production must not have Packaging semantic edges. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group B — Packaging production source has zero Space
// semantic edges (module specifiers + filesystem
// dependency candidates).
// =======================================================================

test('P2-I Group B — Packaging production has zero Space semantic edges (module + filesystem)', () => {
  const moduleEdges = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    (specifier) => isSpaceSpecifier(specifier),
  );
  const fsEdges = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    null,
    (fsPath) => isSpaceSpecifier(fsPath),
  );
  const edges = [...moduleEdges, ...fsEdges];
  assert.deepEqual(
    edges,
    [],
    `Packaging production must not have Space semantic edges. Found ${edges.length} edge(s):\n${edges.map((e) => `  - ${e.file} -> ${e.edge} (${e.kind})`).join('\n')}`,
  );
});

// =======================================================================
// Group C — Cross-target isolation. Combines Group A
// and Group B into a single bidirectional invariant.
// =======================================================================

test('P2-I Group C — cross-target isolation is bidirectional (Space ↔ Packaging)', () => {
  const spaceToPackaging = scanDirectory(
    SPACE_PRODUCTION_ROOT,
    (specifier) => isPackagingSpecifier(specifier),
    (fsPath) => isPackagingSpecifier(fsPath),
  );
  const packagingToSpace = scanDirectory(
    PACKAGING_PRODUCTION_ROOT,
    (specifier) => isSpaceSpecifier(specifier),
    (fsPath) => isSpaceSpecifier(fsPath),
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

// =======================================================================
// Group E — Packaging production has zero Golden runtime
// reads. The hardened extractor (§5) covers both
// single-literal and segmented-path forms.
// =======================================================================

test('P2-I Group E — Packaging production has zero Golden runtime reads (hardened fs extractor)', () => {
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

// =======================================================================
// Group F — Packaging production has zero hardcoded
// Golden project-specific rule literals. Comments and
// docstrings are stripped. Strong unique Golden literals
// are direct guards; ambiguous generic vocabulary
// requires contextual evidence (hardcoded production
// rule / default / branch shape).
// =======================================================================

test('P2-I Group F — Packaging production has zero hardcoded Golden project-specific rule literals', () => {
  const root = join(repoRoot, PACKAGING_PRODUCTION_ROOT);
  const violations = [];
  for (const file of walk(root)) {
    const source = readFileSync(file, 'utf8');
    const fileRel = relative(repoRoot, file).replaceAll(sep, '/');
    const executable = stripComments(source);
    // Strong unique Golden literals — direct guards.
    for (const literal of STRONG_GOLDEN_LITERALS) {
      const escaped = literal.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      const pattern = new RegExp(escaped, 'iu');
      const match = pattern.exec(executable);
      if (match) violations.push({ file: fileRel, literal, kind: 'strong' });
    }
    // Ambiguous generic design vocabulary — context-
    // required (only flagged when inside a hardcoded
    // production rule / default / branch shape).
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
// Group G — Reference-First production route has no
// implicit Golden reference fallback.
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
// verifiers remain PASS. P2-I does not replace those
// verifiers; the existing authorities are the single
// source of truth.
// =======================================================================

function readJsonScriptResult(scriptRelativePath) {
  const { spawnSync } = require('node:child_process');
  // Re-derive the script path from `process.cwd()` (the
  // repository root that `npm test` launches the test
  // runner from) so Windows path normalization does
  // not collapse the leading segment.
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
// Group I — Shared Core directionality
// (P2-I Finalization Delta §7 / §8).
//
// Distinguish two Shared Core surfaces:
//
//   - Target-neutral Shared primitive (e.g. compile-
//     fingerprint, redact, download-verify, policies,
//     gates): used by both Space and Packaging Core
//     facades; target-neutral.
//
//   - Target-specific Core facade (e.g.
//     `core/space-generation-core.js` re-exports
//     `../space/index.js`; `core/packaging-generation-core.js`
//     re-exports the same Shared primitives for a
//     Packaging facade): ALLOWED — the facade handshake
//     is the architectural surface.
//
// What is FORBIDDEN is: a target-neutral Shared
// primitive reverse-depending on the Space or Packaging
// subtree. P2-I Finalization Delta §7 audits the
// canonical Shared primitive surfaces listed in
// `SHARED_CORE_PRIMITIVE_ROOTS` and asserts zero reverse
// dependencies on `space/` or `packaging/`.
//
// P2-I does NOT create an impossible rule that every
// `core/` file must be target-neutral — only that the
// listed Shared primitives are target-neutral. The
// facades (`core/space-generation-core.js`,
// `core/packaging-generation-core.js`) are documented
// and not subject to the same constraint.
// =======================================================================

test('P2-I Group I — target-neutral Shared primitives do not reverse-depend on Space or Packaging subtrees', () => {
  const violations = [];
  for (const primitiveRoot of SHARED_CORE_PRIMITIVE_ROOTS) {
    const moduleEdges = scanDirectory(
      primitiveRoot,
      (specifier) => isSpaceSpecifier(specifier) || isPackagingSpecifier(specifier),
    );
    const fsEdges = scanDirectory(
      primitiveRoot,
      null,
      (fsPath) => isSpaceSpecifier(fsPath) || isPackagingSpecifier(fsPath),
    );
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
  // The two target-specific facades are the architectural
  // handshake surface. The P2-I matrix documents that
  // they are ALLOWED and asserts they exist (i.e. the
  // facade handshake is not accidentally dropped).
  // This is a witness, not a constraint — the P2-I
  // matrix does not say every `core/` file must be
  // target-neutral; some are facades by design.
  for (const facade of SHARED_CORE_FACADE_ROOTS) {
    const files = collectFiles(facade);
    assert.ok(files.length > 0, `Core facade root must contain source files; found 0 in ${facade}`);
  }
});
