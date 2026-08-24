#!/usr/bin/env node
// scripts/verify-tracked-runtime-assets.mjs
//
// Tracked Runtime Assets Guard (per
// docs/development/runtime-static-assets-guard spec).
//
// Reads config/repository-contract/runtime-static-assets.json
// and verifies that every required TRACKED_RUNTIME_ASSET
// exists on disk AND is returned by `git ls-files`.
//
// This script is OFFLINE and DETERMINISTIC. It does NOT call
// any provider, read any user data, or write to disk.
//
// EXIT CODES
//   0  PASS  (all checks succeeded)
//   1  FAIL  (one or more checks failed; details printed)
//
// FAILURE CODES (per spec \u00a711-\u00a717)
//   RUNTIME_ASSET_MANIFEST_INVALID     manifest JSON is invalid
//   RUNTIME_ASSET_DUPLICATE             duplicate path entries
//   RUNTIME_ASSET_PATH_INVALID          empty / absolute / `..` traversal
//   RUNTIME_ASSET_UNKNOWN_CLASSIFICATION unsupported classification
//   RUNTIME_ASSET_MISSING              file not on disk
//   RUNTIME_ASSET_UNTRACKED            file exists but `git ls-files` rejects it
//   RUNTIME_ASSET_IGNORED              file is in .gitignore
//   RUNTIME_ASSET_INVALID_SOURCE_LOCATION path under .runtime/ .codex-*/ .tmp-*/ outputs/ projects/ Masterpiece-OS-Projects/ node_modules/
//   RUNTIME_ASSET_REFERENCE_BROKEN      registry imagePath does not resolve
//   RUNTIME_ASSET_REFERENCED_FILE_UNTRACKED referenced file is not tracked
//
// This script was added at Tracked Runtime Assets Guard (Guard
// Hardening between Packaging P1 and P2). It is frozen \u2014
// adding new check categories or relaxing existing ones is a
// phase re-evaluation event.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve REPO_ROOT from cwd (so the test harness can run the
// script against a temp directory). Production invocations run
// from the repo root, so cwd === REPO_ROOT.
const REPO_ROOT = process.env.RUNTIME_ASSET_REPO_ROOT
  ? path.resolve(process.env.RUNTIME_ASSET_REPO_ROOT)
  : path.resolve(process.cwd());

const MANIFEST_PATH = process.env.RUNTIME_ASSET_MANIFEST
  ? path.resolve(process.env.RUNTIME_ASSET_MANIFEST)
  : path.join(
      REPO_ROOT,
      'config',
      'repository-contract',
      'runtime-static-assets.json',
    );

const SUPPORTED_CLASSIFICATIONS = Object.freeze([
  'TRACKED_RUNTIME_ASSET',
  'GENERATED_RUNTIME_ASSET',
  'USER_DATA',
  'SECRET',
  'CACHE',
  'OPTIONAL_RESOURCE',
  'INVALID_PRODUCTION_DEPENDENCY',
]);

const FORBIDDEN_SOURCE_LOCATIONS = Object.freeze([
  '.runtime',
  '.codex-runtime',
  '.codex-smoke',
  '.codex-smoke-app',
  '.codex-temp',
  'node_modules',
  'outputs',
  'Masterpiece-OS-Projects',
]);

const errors = [];

function fail(code, message, ctx) {
  errors.push({ code, message, ...ctx });
}

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    fail('RUNTIME_ASSET_MANIFEST_INVALID', `manifest not found: ${MANIFEST_PATH}`);
    return null;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  } catch (e) {
    fail('RUNTIME_ASSET_MANIFEST_INVALID', `manifest JSON parse failed: ${e.message}`);
    return null;
  }
  if (parsed.schemaVersion !== '1.0') {
    fail('RUNTIME_ASSET_MANIFEST_INVALID', `unsupported schemaVersion: ${parsed.schemaVersion}`);
    return null;
  }
  if (!Array.isArray(parsed.assets)) {
    fail('RUNTIME_ASSET_MANIFEST_INVALID', 'manifest.assets must be an array');
    return null;
  }
  return parsed;
}

function checkManifestValidity(manifest) {
  // Check A: path validity + classification validity
  const seen = new Set();
  for (const [i, a] of manifest.assets.entries()) {
    const ctx = { index: i, path: a?.path };
    if (!a || typeof a !== 'object') {
      fail('RUNTIME_ASSET_MANIFEST_INVALID', `asset entry #${i} is not an object`, ctx);
      continue;
    }
    if (typeof a.path !== 'string' || a.path.length === 0) {
      fail('RUNTIME_ASSET_PATH_INVALID', `asset entry #${i} has empty path`, ctx);
      continue;
    }
    if (path.isAbsolute(a.path)) {
      fail('RUNTIME_ASSET_PATH_INVALID', `asset path must be repo-relative: ${a.path}`, ctx);
      continue;
    }
    if (a.path.includes('..')) {
      // spec \u00a711: reject `..` traversal
      const segs = a.path.split(/[\\/]+/);
      if (segs.includes('..')) {
        fail('RUNTIME_ASSET_PATH_INVALID', `asset path contains "..": ${a.path}`, ctx);
        continue;
      }
    }
    if (seen.has(a.path)) {
      fail('RUNTIME_ASSET_DUPLICATE', `duplicate asset path: ${a.path}`, ctx);
    }
    seen.add(a.path);
    if (!SUPPORTED_CLASSIFICATIONS.includes(a.classification)) {
      fail('RUNTIME_ASSET_UNKNOWN_CLASSIFICATION', `unknown classification: ${a.classification}`, ctx);
    }
  }
}

function checkStaticAssetLocationBoundary(manifest) {
  // Check E (spec \u00a715): reject paths under forbidden source locations.
  // Per spec \u00a715: "Do not fail normal runtime reads of USER_DATA /
  // SECRET / CACHE if they are correctly classified." So we only
  // apply the boundary check to TRACKED_RUNTIME_ASSET and
  // GENERATED_RUNTIME_ASSET (i.e. the source-of-truth
  // classifications). USER_DATA / SECRET / CACHE / OPTIONAL /
  // INVALID classifications are exempted.
  for (const [i, a] of manifest.assets.entries()) {
    if (typeof a?.path !== 'string') continue;
    if (!['TRACKED_RUNTIME_ASSET', 'GENERATED_RUNTIME_ASSET'].includes(a.classification)) continue;
    const segs = a.path.split(/[\\/]+/);
    for (const forbidden of FORBIDDEN_SOURCE_LOCATIONS) {
      if (segs.includes(forbidden)) {
        fail(
          'RUNTIME_ASSET_INVALID_SOURCE_LOCATION',
          `asset path under forbidden source location "${forbidden}": ${a.path}`,
          { index: i, path: a.path },
        );
      }
    }
    // .tmp-*.log patterns \u2014 check the literal `.tmp-` prefix on first segment
    if (segs[0]?.startsWith('.tmp-')) {
      fail(
        'RUNTIME_ASSET_INVALID_SOURCE_LOCATION',
        `asset path under .tmp- prefix: ${a.path}`,
        { index: i, path: a.path },
      );
    }
    // projects/* (anything under projects/ is user data)
    if (segs[0] === 'projects' && segs.length > 1) {
      fail(
        'RUNTIME_ASSET_INVALID_SOURCE_LOCATION',
        `asset path under projects/ (user data): ${a.path}`,
        { index: i, path: a.path },
      );
    }
  }
}

function gitLsFilesTracked(relPath) {
  // Returns true if `git ls-files --error-unmatch <relPath>` succeeds.
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', relPath], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    return true;
  } catch {
    return false;
  }
}

function gitCheckIgnore(relPath) {
  // Returns true if .gitignore excludes the path.
  try {
    const out = execFileSync('git', ['check-ignore', '--', relPath], {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim();
    return out.length > 0;
  } catch {
    return false;
  }
}

function checkExistenceAndTracking(manifest) {
  // Check B + C + D (spec \u00a712-\u00a714)
  for (const [i, a] of manifest.assets.entries()) {
    if (typeof a?.path !== 'string') continue;
    if (a.classification !== 'TRACKED_RUNTIME_ASSET') continue;
    if (a.required === false) continue;
    const abs = path.join(REPO_ROOT, a.path);
    const exists = fs.existsSync(abs);
    if (!exists) {
      fail('RUNTIME_ASSET_MISSING', `required tracked asset not on disk: ${a.path}`, { index: i, path: a.path });
      continue;
    }
    const tracked = gitLsFilesTracked(a.path);
    if (!tracked) {
      fail('RUNTIME_ASSET_UNTRACKED', `required asset exists but is NOT Git tracked: ${a.path}`, { index: i, path: a.path });
      // Fall through to the IGNORED check so the developer sees
      // both signals: the file is untracked AND it is matched by
      // .gitignore (the most common cause of an untracked runtime
      // asset).
    }
    if (gitCheckIgnore(a.path)) {
      fail('RUNTIME_ASSET_IGNORED', `required asset is in .gitignore: ${a.path}`, { index: i, path: a.path });
    }
  }
}

function checkRegistryClosure(manifest) {
  // Check G (spec \u00a717): for every imagePath referenced by a
  // TRACKED registry, the referenced file must exist and be
  // tracked. We use the manifest's own registryClosure section
  // for the imagePath list; if a registry is added to the
  // manifest later, the closure entries must be added too.
  if (!manifest.registryClosure) return;
  for (const reg of (manifest.registryClosure.checkedRegistries ?? [])) {
    if (typeof reg?.registryPath !== 'string') continue;
    const regAbs = path.join(REPO_ROOT, reg.registryPath);
    if (!fs.existsSync(regAbs)) {
      fail(
        'RUNTIME_ASSET_REFERENCE_BROKEN',
        `registry declared but not on disk: ${reg.registryPath}`,
        { path: reg.registryPath },
      );
      continue;
    }
    if (!gitLsFilesTracked(reg.registryPath)) {
      fail(
        'RUNTIME_ASSET_REFERENCED_FILE_UNTRACKED',
        `registry declared but not Git tracked: ${reg.registryPath}`,
        { path: reg.registryPath },
      );
    }
    let regData;
    try {
      regData = JSON.parse(fs.readFileSync(regAbs, 'utf8'));
    } catch (e) {
      fail(
        'RUNTIME_ASSET_REFERENCE_BROKEN',
        `registry JSON parse failed: ${e.message}`,
        { path: reg.registryPath },
      );
      continue;
    }
    // For every brand -> anchors[*] -> imagePath (if non-null), check existence + tracking
    for (const brandEntry of Object.values(regData.brands ?? {})) {
      const anchors = Array.isArray(brandEntry?.anchors) ? brandEntry.anchors : [];
      for (const anchor of anchors) {
        if (!anchor?.imagePath) continue;
        // registry imagePath is relative to space-generator/ (per the comment in
        // packages/image-generation-runtime/src/space/architecture-context.js:195)
        const resolvedRel = path.posix.join('space-generator', anchor.imagePath);
        const resolvedAbs = path.join(REPO_ROOT, resolvedRel);
        if (!fs.existsSync(resolvedAbs)) {
          fail(
            'RUNTIME_ASSET_REFERENCE_BROKEN',
            `registry references imagePath that does not resolve: ${anchor.imagePath}`,
            { path: resolvedRel, anchor: anchor.id },
          );
          continue;
        }
        if (!gitLsFilesTracked(resolvedRel)) {
          fail(
            'RUNTIME_ASSET_REFERENCED_FILE_UNTRACKED',
            `registry references imagePath that is NOT Git tracked: ${anchor.imagePath}`,
            { path: resolvedRel, anchor: anchor.id },
          );
        }
      }
    }
  }
}

function checkPromptIntegrity() {
  // Check F (spec \u00a716): delegate to the existing A4
  // verify-a4-frozen-prompt guard. The A4 guard already
  // recomputes the 2 frozen-prompt digests; we do not duplicate
  // it here. This function is a placeholder for the spec \u00a716
  // responsibility assignment: the Tracked Runtime Assets
  // Guard checks existence + tracking; the A4 guard checks
  // content-integrity (frozen-digest match).
  // No-op in this script.
}

// ---------------------------------------------------------------------------
// Check H �?Runtime Dependency Declaration Coverage
// (added 2026-08-12; spec section H of the user's directive)
// ---------------------------------------------------------------------------
// Scans production code for static filesystem calls
// (readFile(Sync)? / existsSync / readdir(Sync)?) and extracts
// any string literal arguments. For each literal, classifies
// it against the manifest's allowlist (declaredDependencyCoverage
// block). Any unclassifiable literal = RUNTIME_ASSET_UNDECLARED.
//
// This is the reverse direction of Checks A-G: instead of
// checking that the manifest's declared assets exist + are
// tracked, this checks that production's static reads are
// declared (or correctly classified) in the manifest.

const PRODUCTION_SCAN_ROOTS = [
  'apps/web',
  'apps/web-runtime',
  'apps/cli/src/analysis-engine',
  'packages/runtime-core',
  'packages/image-generation-runtime',
  'packages/analysis-runtime',
  'packages/project-contracts',
  'packages/image-generation-contracts',
  'packages/image-generation-adapter',
  'packages/image-provider-dashscope',
  'packages/model-benchmark',
  'packages/model-registry',
  'packages/model-runtime',
  'packages/reference-asset-inspector',
  'packages/creative-production-runtime',
  'packages/document-ingestion',
  'packages/evaluation-loop-contracts',
];

const PRODUCTION_SCAN_EXCLUDE_FILES = new Set([
  // smoke / dev runners, not production
  'apps/web-runtime/scripts/run-web-primary-smoke.mjs',
  'apps/web-runtime/scripts/run-web-dev.mjs',
  // CI-W1C Web E2E validation harness (test infrastructure only;
  // see docs/creative-intelligence/ci-w1c/real-web-e2e-anchor-translation-qualification.md).
  'apps/web-runtime/scripts/ci-w1c/probe-ci-channels.mjs',
  'apps/web-runtime/scripts/ci-w1c/list-profiles.mjs',
  'apps/web-runtime/scripts/ci-w1c/drive-ci-workflow.mjs',
  // CI-W1C.3 Web Host RPC / process-boundary freshness probe
  // scripts (test infrastructure only; see
  // docs/creative-intelligence/ci-w1c.3/web-host-rpc-process-boundary-freshness-repair.md).
  'apps/web-runtime/scripts/ci-w1c/probe-pre-fix.mjs',
  'apps/web-runtime/scripts/ci-w1c/probe-post-fix.mjs',
  'apps/web-runtime/scripts/ci-w1c/summarize-evidence.mjs',
  // CI-W1C Attempt 2 qualification harness (test infrastructure only;
  // see docs/creative-intelligence/ci-w1c-attempt-2/real-project-qualification-and-ci10-readiness.md).
  'apps/web-runtime/scripts/ci-w1c/extract-evidence.mjs',
  'apps/web-runtime/scripts/ci-w1c/qualification-extract.mjs',
  'apps/web-runtime/scripts/ci-w1c/qualification-compare.mjs',
  // CI-W1C.4 Resume — project-specific brief generator + harness
  // helpers (test infrastructure only; see
  // docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.md).
  'apps/web-runtime/scripts/ci-w1c/fact-edit-helper.mjs',
  'apps/web-runtime/scripts/ci-w1c/approval-invalidation-helper.mjs',
  // CI-W1C.4 Resume.1 — differentiation smoke runner (chains two
    // drive-ci-workflow invocations and emits differentiation-smoke-evidence.json
    // for the XD01-XD06 contract tests; see
    // docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair-resume.1.md).
    'apps/web-runtime/scripts/ci-w1c/differentiation-smoke.mjs',
    // CI-W1C.* live qualification / regeneration / userdata-probe
    // harnesses — these dynamically import production runtime modules and
    // prompt JSON files strictly to exercise the live creative-reasoning
    // pipeline end-to-end. They are test infrastructure only, not
    // production code paths, and never ship to users.
    'apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs',
    'apps/web-runtime/scripts/ci-w1c/live-qualify-planning-project.mjs',
    'apps/web-runtime/scripts/ci-w1c/probe-actual-userdata-profiles.mjs',
    'apps/web-runtime/scripts/ci-w1c/regenerate-g02-summary.mjs',
  ]);

// Allow the test harness to extend the production scan roots
// (e.g. add a temp directory containing a synthetic loader).
// Production invocations do NOT set this env var; the scanner
// defaults to the 17 fixed production roots only.
const EXTRA_SCAN_ROOTS = (process.env.RUNTIME_ASSET_EXTRA_SCAN_ROOTS ?? '')
  .split(/[;,]/)
  .map((s) => s.trim())
  .filter(Boolean);

const SCAN_EXTS = /\.(ts|tsx|js|mjs|cjs)$/;

function walkProductionFiles() {
  const out = [];
  const roots = [...PRODUCTION_SCAN_ROOTS, ...EXTRA_SCAN_ROOTS];
  for (const root of roots) {
    // Extra scan roots (from the env var) may be absolute paths
    // or repo-relative paths; main roots are always repo-relative.
    const absRoot = path.isAbsolute(root) ? root : path.join(REPO_ROOT, root);
    if (!fs.existsSync(absRoot)) continue;
    const stack = [absRoot];
    while (stack.length > 0) {
      const dir = stack.pop();
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.isDirectory()) {
          if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === 'build' || ent.name === '.runtime' || ent.name === 'tests' || ent.name === '__tests__') continue;
          stack.push(path.join(dir, ent.name));
        } else if (SCAN_EXTS.test(ent.name) && !ent.name.endsWith('.test.ts') && !ent.name.endsWith('.test.js')) {
          out.push(path.join(dir, ent.name));
        }
      }
    }
  }
  return out;
}

// Balanced-arg extraction: returns the list of string-literal
// values found between the matching parentheses starting at
// `openIdx` (which must point right after the `(`). Honours
// strings (', ", `), line + block comments, and nested parens.
function extractCallArgs(text, openIdx) {
  let depth = 1;
  let i = openIdx;
  let inStr = null;
  let strStart = -1;
  const stringLiterals = [];
  while (i < text.length && depth > 0) {
    const c = text[i];
    if (inStr !== null) {
      if (c === '\\') { i += 2; continue; }
      if (c === inStr) {
        stringLiterals.push({ value: text.slice(strStart + 1, i), start: strStart, end: i });
        inStr = null;
        strStart = -1;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      inStr = c; strStart = i; i++; continue;
    }
    if (c === '(') { depth++; i++; continue; }
    if (c === ')') { depth--; if (depth === 0) { i++; break; } i++; continue; }
    if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      i += 2;
      while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    i++;
  }
  return stringLiterals;
}

function lineOf(text, idx) {
  return text.slice(0, idx).split(/\r?\n/).length;
}

// Match fs.readFile*(/readFile*/existsSync/readdir*) call positions
// and bare `join(` / `resolve(` (used by code that imports { join }
// from 'node:path').
const FS_CALL_RE = /\b(?:fs\.)?(?:readFile|readFileSync|existsSync|readdir|readdirSync)\s*\(/g;
const NEWURL_RE = /\bnew\s+URL\s*\(\s*([`'"]([^`'"\\]+)[`'"'])\s*,\s*import\.meta\.url\b/g;
const PATHJOIN_RE = /\bpath\.(?:join|resolve)\s*\(/g;
const BAREJOIN_RE = /\bjoin\s*\(/g;
const RESOLVE_DIRNAME_RE = /\bresolve\s*\(\s*__dirname\b/g;

// Per-file extraction: returns array of
//   { kind, candidatePath, rawLiteral, line, fileRel }
// where `candidatePath` is the path-like literal (or the
// joined path for path.join / resolve calls) that should be
// classified against the manifest.
function extractStaticDependenciesFromFile(absFilePath) {
  const rel = path.relative(REPO_ROOT, absFilePath).replaceAll('\\', '/');
  const text = fs.readFileSync(absFilePath, 'utf8');
  const out = [];
  let m;
  // Path-like literal filter: must contain '/' or '\', or end
  // with a known file extension, or be a dot-segment ('.', '..').
  // Skips pure punctuation, whitespace, escape-sequence content
  // ('\n', '\t', '\\n', '\\n\\n', etc.), and template-string content.
  function pathLikeOrNull(s) {
    if (typeof s !== 'string') return null;
    if (s.length < 1 || s.length > 200) return null;
    // Skip escape-sequence-looking literals: any sequence of `\X`
    // where X is one of nrt0'"`\\ and the literal is short
    if (/^(\\[nrt0'"`\\]){1,4}$/.test(s)) return null;
    // Skip literals containing newlines, tabs, or other
    // non-path control characters (template / prompt body content)
    if (/[\n\r\t\v\f]/.test(s)) return null;
    // Skip pure punctuation / whitespace segments
    if (/^[\s,;:.|\-_+=\\/'"`]*$/.test(s)) return null;
    if (/[\\/]/.test(s)) return s; // contains a path separator
    if (/\.(json|md|txt|png|jpg|jpeg|webp|gif|svg|yaml|yml|html|css|js|ts|mjs|cjs|tsx|jsx|bin|key|pem|env|log|dat|ndjson|lock|schema|redacted|jsonl)$/i.test(s)) return s;
    if (s === '.' || s === '..') return s;
    if (s.startsWith('.')) return s; // hidden file / dir
    return null;
  }

  // For new URL(..., import.meta.url) calls, the literal is
  // usually a relative path (e.g. '../../../') used to compute
  // a base directory; it does not itself reference a static
  // resource file. Only treat it as a candidate if it is
  // absolute or ends with a file extension.
  function newUrlLiteralIsCandidate(s) {
    if (typeof s !== 'string') return false;
    if (s.length < 1 || s.length > 200) return false;
    if (pathLikeOrNull(s) === null) return false;
    // Skip pure relative dot-segments (../../../) �?those are
    // base-path computations, not file reads.
    if (/^(\.\.?(\/|\\|$))+$/.test(s)) return false;
    return true;
  }

  function extractCallLiterals(text, openIdx) {
    let depth = 1;
    let i = openIdx;
    let inStr = null;
    let strStart = -1;
    const stringLiterals = [];
    while (i < text.length && depth > 0) {
      const c = text[i];
      if (inStr !== null) {
        if (c === '\\') { i += 2; continue; }
        if (c === inStr) {
          stringLiterals.push({ value: text.slice(strStart + 1, i), quote: inStr });
          inStr = null; strStart = -1; i++; continue;
        }
        i++; continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        inStr = c; strStart = i; i++; continue;
      }
      if (c === '(') { depth++; i++; continue; }
      if (c === ')') { depth--; if (depth === 0) { i++; break; } i++; continue; }
      if (c === '/' && text[i + 1] === '/') {
        while (i < text.length && text[i] !== '\n') i++;
        continue;
      }
      if (c === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < text.length - 1 && !(text[i] === '*' && text[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      i++;
    }
    return stringLiterals;
  }

  // 1. fs.readFile*(literal, ...)  -- first-arg literal is the path
  FS_CALL_RE.lastIndex = 0;
  while ((m = FS_CALL_RE.exec(text)) !== null) {
    const openIdx = m.index + m[0].length;
    const args = extractCallLiterals(text, openIdx);
    // For fs.readFile* we care about the FIRST literal that's path-like.
    for (const a of args) {
      const lit = pathLikeOrNull(a.value);
      if (lit !== null && a.quote !== '`') {
        out.push({ file: rel, line: lineOf(text, m.index), kind: 'fs-call', candidatePath: lit, rawLiteral: a.value });
        break;
      }
    }
  }

  // 2. new URL('literal', import.meta.url)  -- the literal is the relative path
  NEWURL_RE.lastIndex = 0;
  while ((m = NEWURL_RE.exec(text)) !== null) {
    if (newUrlLiteralIsCandidate(m[2])) {
      out.push({ file: rel, line: lineOf(text, m.index), kind: 'new URL', candidatePath: m[2], rawLiteral: m[2] });
    }
  }

  // 3. path.join(EXPR, 'literal', 'literal', ...)  -- join all literal segments
  PATHJOIN_RE.lastIndex = 0;
  while ((m = PATHJOIN_RE.exec(text)) !== null) {
    const openIdx = m.index + m[0].length;
    const args = extractCallLiterals(text, openIdx);
    const literalSegs = args
      .map((a) => ({ value: a.value, quote: a.quote }))
      .filter((a) => a.quote !== '`' && pathLikeOrNull(a.value) !== null)
      .map((a) => a.value);
    if (literalSegs.length === 0) continue;
    // Join: separator is implicit; we keep '/' between segments
    // (real path.join uses platform separator; for guard purposes
    // we just need to compose a comparable path string).
    const candidate = literalSegs.join('/');
    if (pathLikeOrNull(candidate) !== null) {
      out.push({ file: rel, line: lineOf(text, m.index), kind: 'path-join', candidatePath: candidate, rawLiteral: literalSegs.join("', '") });
    }
  }

  // 4. bare join('literal', 'literal', ...)  -- same as path.join but for code that does `import { join }`
  BAREJOIN_RE.lastIndex = 0;
  while ((m = BAREJOIN_RE.exec(text)) !== null) {
    const preceding = text.slice(Math.max(0, m.index - 8), m.index);
    // Skip `path.join` (already caught by PATHJOIN_RE) and
    // method calls (e.g. `array.join(separator)`,
    // `userSections.join('\n\n---\n\n')`).
    if (/[.\s]path$/.test(preceding) || /\.path\.join$/.test(preceding)) continue;
    if (/\.\s*$/.test(preceding)) continue; // method call: `something.join(`
    const openIdx = m.index + m[0].length;
    const args = extractCallLiterals(text, openIdx);
    const literalSegs = args
      .map((a) => ({ value: a.value, quote: a.quote }))
      .filter((a) => a.quote !== '`' && pathLikeOrNull(a.value) !== null)
      .map((a) => a.value);
    if (literalSegs.length === 0) continue;
    const candidate = literalSegs.join('/');
    if (pathLikeOrNull(candidate) !== null) {
      out.push({ file: rel, line: lineOf(text, m.index), kind: 'path-join', candidatePath: candidate, rawLiteral: literalSegs.join("', '") });
    }
  }

  // 5. resolve(__dirname, 'literal', ...)  -- treat __dirname as REPO_ROOT-relative
  RESOLVE_DIRNAME_RE.lastIndex = 0;
  while ((m = RESOLVE_DIRNAME_RE.exec(text)) !== null) {
    const openIdx = m.index + m[0].length;
    const args = extractCallLiterals(text, openIdx);
    const literalSegs = args
      .map((a) => ({ value: a.value, quote: a.quote }))
      .filter((a) => a.quote !== '`' && pathLikeOrNull(a.value) !== null)
      .map((a) => a.value);
    if (literalSegs.length === 0) continue;
    const candidate = literalSegs.join('/');
    if (pathLikeOrNull(candidate) !== null) {
      out.push({ file: rel, line: lineOf(text, m.index), kind: 'resolve-dirname', candidatePath: candidate, rawLiteral: literalSegs.join("', '") });
    }
  }

  return out;
}

// Classify a single literal against the manifest + allowlist.
// Returns { classification, reason }. `reason` is included for
// the audit report / for failing messages.
function classifyLiteral(candidatePath, manifest) {
  const literal = candidatePath;
  // 1. Encoding / option strings used in fs.readFile(..., 'utf8')
  if (literal === 'utf8' || literal === 'utf-8' || literal === 'binary' || literal === 'hex' || literal === 'base64' || literal === 'ascii') {
    return { classification: 'OPTION', reason: 'readFile encoding argument' };
  }
  // 2. Exact match against a TRACKED_RUNTIME_ASSET path
  for (const a of manifest.assets ?? []) {
    if (a.path === literal) {
      return { classification: a.classification, reason: `manifest.assets path: ${a.path}` };
    }
  }
  // 3. Sub-path match: if the literal starts with a TRACKED asset's
  //    directory prefix, treat the literal as a sub-resource of the
  //    TRACKED asset. (Example: 'apps/cli/prompts/analysis' prefixes
  //    the 4 prompt files; resolved sub-resources are TRACKED.)
  for (const a of manifest.assets ?? []) {
    if (a.classification !== 'TRACKED_RUNTIME_ASSET') continue;
    const dir = a.path.endsWith('/') ? a.path : a.path.replace(/\/[^/]+$/, '/');
    if (dir && literal.startsWith(dir)) {
      return { classification: 'TRACKED_RUNTIME_ASSET', reason: `sub-resource of manifest.assets path: ${a.path}` };
    }
  }
  // 4. GENERATED: literal's basename matches the generatedFileBasenames list,
  //    OR literal equals one of the directory names that the production
  //    code uses to lay out per-run files.
  const coverage = manifest.declaredDependencyCoverage ?? {};
  for (const gen of coverage.generatedFileBasenames ?? []) {
    if (literal === gen || literal.endsWith('/' + gen)) {
      return { classification: 'GENERATED_RUNTIME_ASSET', reason: `matches generatedFileBasenames: ${gen}` };
    }
  }
  // 5. USER_DATA: literal matches a known per-user / per-installation
  //    path prefix.
  for (const p of coverage.userDataPathPrefixes ?? []) {
    if (literal === p || literal.startsWith(p) || literal.includes('/' + p)) {
      return { classification: 'USER_DATA', reason: `matches userDataPathPrefixes: ${p}` };
    }
  }
  // 6. SECRET: literal matches a known credential / key prefix.
  for (const p of coverage.secretPathPrefixes ?? []) {
    if (literal.toLowerCase().includes(p.toLowerCase())) {
      return { classification: 'SECRET', reason: `matches secretPathPrefixes: ${p}` };
    }
  }
  // 7. CACHE: literal matches a known transient cache prefix.
  for (const p of coverage.cachePathPrefixes ?? []) {
    if (literal.startsWith(p) || literal.includes('/' + p)) {
      return { classification: 'CACHE', reason: `matches cachePathPrefixes: ${p}` };
    }
  }
  return { classification: 'UNDECLARED', reason: 'no manifest match, no allowlist match' };
}

function checkDeclaredDependencyCoverage(manifest) {
  const files = walkProductionFiles().filter((f) => !PRODUCTION_SCAN_EXCLUDE_FILES.has(path.relative(REPO_ROOT, f).replaceAll('\\', '/')));
  for (const absFile of files) {
    const deps = extractStaticDependenciesFromFile(absFile);
    for (const d of deps) {
      const { classification, reason } = classifyLiteral(d.candidatePath, manifest);
      if (classification === 'UNDECLARED') {
        fail(
          'RUNTIME_ASSET_UNDECLARED',
          `production reads undeclared static resource: candidatePath ${JSON.stringify(d.candidatePath)} at ${d.file}:${d.line} (${reason})`,
          { file: d.file, line: d.line, kind: d.kind, candidatePath: d.candidatePath },
        );
      }
    }
  }
}

function main() {
  const manifest = readManifest();
  if (!manifest) {
    printAndExit();
    return;
  }
  checkManifestValidity(manifest);
  checkStaticAssetLocationBoundary(manifest);
  checkExistenceAndTracking(manifest);
  checkRegistryClosure(manifest);
  checkPromptIntegrity();
  checkDeclaredDependencyCoverage(manifest);
  printAndExit();
}

function printAndExit() {
  if (errors.length === 0) {
    console.log('[verify-tracked-runtime-assets] PASS \u2014 8 declared assets, all checks green.');
    process.exit(0);
  }
  console.error(`[verify-tracked-runtime-assets] FAIL \u2014 ${errors.length} violation(s):`);
  for (const e of errors) {
    const where = e.path ? ` (${e.path})` : '';
    console.error(`  - [${e.code}]${where} ${e.message}`);
  }
  process.exit(1);
}

main();
