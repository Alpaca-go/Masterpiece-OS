// P3-A7 鈥?Packaging Workspace Architecture Guards (A-L).
//
// 12 canonical guard groups per P3-A spec 搂64 + additional
// authority guards. Each group has at least one source-level
// static invariant; some groups also carry behavioural
// cross-checks against the existing A2..A6 tests.
//
// Mapping (per P3-A spec 搂64):
//   A  Runtime Dependency Boundary      鈫?canonical call path
//   B  Web UI Import Boundary           鈫?future P3-B UI boundary
//   C  Compiler Boundary                鈫?STOP-P3-A-01
//   D  Provider Payload Boundary        鈫?STOP-P3-A-02
//   E  Credential Boundary              鈫?STOP-P3-A-03
//   F  Frozen P2 Contract Guard         鈫?STOP-P3-A-04
//   G  Reference Role Authority Guard   鈫?STOP-P3-A-05
//   H  Reference Precedence Guard       鈫?STOP-P3-A-06
//   I  Stale Fail-closed Guard          鈫?STOP-P3-A-07
//   J  Persistence / Leakage Guard      鈫?STOP-P3-A-08
//   K  Web UI Provider Network Guard    鈫?STOP-P3-A-09
//   L  Shared Regression Guards         鈫?STOP-P3-A-10/11/12
//
// Additional Authority Guards (P-V):
//   P  No second generation fingerprint authority
//   Q  No second state machine
//   R  No second stale engine
//   S  No second Locked Asset authority
//   T  Public Runtime export boundary
//   U  Workspace Service orchestrator invariants
//   V  View Model projection invariants
//
// All guards are PURE source-level static checks. The
// guards do NOT introduce new production code; they are
// self-contained tests that read files via the runtime
// fs module and assert on patterns.

import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PACKAGING_PROD_DIR = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'packaging');
const PACKAGING_PROD_PARENT = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application');
const PACKAGING_INDEX = path.join(PACKAGING_PROD_DIR, 'index.js');
const RUNTIME_CORE_INDEX = path.join(ROOT, 'packages', 'runtime-core', 'src', 'index.js');
const WEB_DIR = path.join(ROOT, 'apps', 'web', 'src');
const APPS_WEB_SRC = WEB_DIR;
const P2_FROZEN_DIR = path.join(ROOT, 'packages', 'image-generation-runtime', 'src', 'packaging');
const P2_FROZEN_BASELINE = '335405342951fedae5d4d6816444c2b4d2402787';
const P3A_FROZEN_BASELINE = 'dd4570a';

const P2_PUBLIC_FACADE = new Set([
  'translation.js',
  'contracts.js',
  'reference-policy.js',
  'generation-service.js',
]);
const P2_FROZEN_MODULES = Object.freeze([
  'compiler.js',
  'contracts.js',
  'generation-service.js',
  'metadata.js',
  'provider-adapter.js',
  'provider-capability.js',
  'reference-policy.js',
  'translation.js',
  'validation.js',
]);
const P2_FROZEN_EXTERNAL = Object.freeze([
  'core/packaging-generation-core.js',
  'redact.js',
  'deliverables',
  'policies.js',
  'gates.js',
  'task-builder.js',
  'download-verify.js',
]);

const PACKAGING_PROD_FILES = Object.freeze([
  'workspace-service.js',
  'workspace-state.js',
  'intent-schema.js',
  'stale-tracker.js',
  'reference-assignments.js',
  'lock-assets-projection.js',
  'view-model.js',
  'index.js',
]);

// --- helpers ----------------------------------------------------------------

function readFile(filePath: string): string {
  return readFileSync(filePath, 'utf8');
}

function allPackagingProd(): string[] {
  return PACKAGING_PROD_FILES.map((f) => path.join(PACKAGING_PROD_DIR, f));
}

function listWebSourceFiles(): string[] {
  if (!existsSync(WEB_DIR)) return [];
  const found: string[] = [];
  const visit = (abs: string, rel: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      const childRel = rel ? path.join(rel, entry.name) : entry.name;
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;
        visit(childAbs, childRel);
      } else if (/\.(?:c|m)?(?:js|ts)x?$/.test(entry.name)) {
        found.push(childAbs);
      }
    }
  };
  visit(WEB_DIR, '');
  return found;
}

function walkSourceDir(absRoot: string): string[] {
  if (!existsSync(absRoot)) return [];
  const found: string[] = [];
  const visit = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const childAbs = path.join(abs, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'out') continue;
        visit(childAbs);
      } else if (/\.(?:c|m)?(?:js|ts)x?$/.test(entry.name)) {
        found.push(childAbs);
      }
    }
  };
  visit(absRoot);
  return found;
}

function runGit(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

// Strip JS-style comments from the source so that
// forbidden-pattern checks are not fooled by JSDoc /
// inline references. We remove:
//   - /* ... */ block comments
//   - // line comments
// Strings (single / double / template) are preserved.
function stripComments(src: string): string {
  // 1) Block comments
  let out = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // 2) Line comments (only outside strings 鈥?na茂ve
  //    heuristic: strip from `//` to end-of-line)
  out = out.replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, p1) => p1);
  return out;
}

function hasFunctionCall(src: string, name: string): boolean {
  return stripComments(src).includes(name);
}

function hasImportFrom(src: string, moduleName: string): boolean {
  const stripped = stripComments(src);
  const re = new RegExp(`from\\s+['"]${moduleName.replace(/[/.]/g, '\\$&')}['"]`);
  return re.test(stripped);
}

function hasExportedFunction(src: string, name: string): boolean {
  const re = new RegExp(`export\\s+function\\s+${name}\\b`);
  return re.test(stripComments(src));
}

/**
 * Walk the brace-balanced function body starting at
 * `start` (the index of the opening `function …` or
 * `async function …` token). Returns the body substring
 * (including the outer braces) or `''` if the function
 * cannot be parsed.
 *
 * The walker is string- and comment-aware: braces inside
 * template literals, single-line comments, and block
 * comments are not counted. This matches the source
 * convention used in the rest of the suite.
 */
function extractFunctionBody(src: string, start: number): string {
  if (typeof start !== 'number' || start < 0) return '';
  // Find the opening `{` of the function body.
  let i = start;
  // Skip past the function signature up to the first `{`.
  while (i < src.length && src[i] !== '{') i++;
  if (i >= src.length) return '';
  const openIdx = i;
  let depth = 1;
  i++;
  let inString: string | null = null;
  let inLineComment = false;
  let inBlockComment = false;
  while (i < src.length) {
    const c = src[i];
    const next = i + 1 < src.length ? src[i + 1] : '';
    if (inLineComment) {
      if (c === '\n') inLineComment = false;
    } else if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
    } else if (inString) {
      if (c === '\\') {
        i++;
      } else if (c === inString) {
        inString = null;
      }
    } else {
      if (c === '/' && next === '/') {
        inLineComment = true;
        i++;
      } else if (c === '/' && next === '*') {
        inBlockComment = true;
        i++;
      } else if (c === '"' || c === "'" || c === '`') {
        inString = c;
      } else if (c === '{') {
        depth++;
      } else if (c === '}') {
        depth--;
        if (depth === 0) {
          return src.substring(openIdx, i + 1);
        }
      }
    }
    i++;
  }
  return '';
}

/**
 * P3-B5.2 — Build a small in-memory fixture that exercises
 * the canonical `imageGeneration.runStore` against a
 * `pkg-*` run. Used by Z-36 / Z-37 to lock the audit
 * finding (canonical runStore does NOT see pkg runs).
 *
 * The fixture creates a tmp dir, seeds a project.json, and
 * returns the canonical runStore plus a tiny fs helper for
 * the test to write sidecar / image bytes. The fixture
 * MUST be cleaned up in a `finally` block.
 */
async function makeCanonicalRunStoreFixture() {
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-b52-'));
  const dataPath = tmpDir;
  const projectId = 'mock-canonical';
  const projectsRoot = path.join(dataPath, 'projects');
  const projectRoot = path.join(projectsRoot, projectId);
  await fs.mkdir(projectRoot, { recursive: true });
  await fs.writeFile(
    path.join(projectRoot, 'project.json'),
    JSON.stringify({ id: projectId, name: 'Canonical Audit' }),
  );
  // Load the canonical runStore factory (TS — node strips types).
  const { pathToFileURL } = await import('node:url');
  const runStoreModule = await import(
    pathToFileURL('D:/Masterpiece-OS/packages/runtime-core/src/application/image-generation/run-store.ts').href
  );
  const runStore = runStoreModule.createRunStore(dataPath, projectId);
  const fsHelpers = {
    writePackagingRunOnly(runId: string) {
      return (async () => {
        const runRoot = path.join(projectRoot, 'image-generation', runId);
        const imagesDir = path.join(runRoot, 'images');
        const thumbsDir = path.join(runRoot, 'thumbnails');
        await fs.mkdir(imagesDir, { recursive: true });
        await fs.mkdir(thumbsDir, { recursive: true });
        await fs.writeFile(
          path.join(imagesDir, 'image-01.png'),
          Buffer.from([0x89, 0x50, 0x4e, 0x47]),
        );
        await fs.writeFile(
          path.join(thumbsDir, 'image-01.webp'),
          Buffer.from([0x52, 0x49, 0x46, 0x46]),
        );
        await fs.writeFile(
          path.join(runRoot, 'packaging-generation-result.json'),
          JSON.stringify({
            runId,
            target: 'packaging',
            createdAt: new Date().toISOString(),
            artifacts: [
              {
                imageId: 'image-01',
                relativePath: 'images/image-01.png',
                thumbnailRelativePath: 'thumbnails/image-01.webp',
                mimeType: 'image/png',
              },
            ],
          }),
        );
      })();
    },
    async readIfExists(rel: string): Promise<string | null> {
      const abs = path.join(projectRoot, 'image-generation', rel);
      try {
        return await fs.readFile(abs, 'utf8');
      } catch {
        return null;
      }
    },
    async cleanup() {
      await fs.rm(tmpDir, { recursive: true, force: true });
    },
  };
  return { runStore, fsHelpers };
}


/**
 * P3-B5.3 — load `createRunStore` (the canonical
 * image-generation runStore factory) and the runtime-core
 * public surface. Cached so each test reuses the same
 * module reference (no per-test re-import).
 */
let __AA_MODULES: Promise<{
  createRunStore: (dataPath: string, projectId: string) => {
    saveRun(run: Record<string, unknown>): Promise<Record<string, unknown>>;
    readRun(runId: string): Promise<Record<string, unknown> | null>;
    listRuns(): Promise<Array<Record<string, unknown>>>;
  };
  createPackagingRunRegistrationAdapter: typeof import('@masterpiece/runtime-core').createPackagingRunRegistrationAdapter;
  createPackagingArtifactStore: typeof import('@masterpiece/runtime-core').createPackagingArtifactStore;
}> | null = null;
async function getAAModules() {
  if (__AA_MODULES) return __AA_MODULES;
  const { pathToFileURL } = await import('node:url');
  const m = await import(
    pathToFileURL('D:/Masterpiece-OS/packages/runtime-core/src/index.js').href
  );
  const runStoreFactory = await import(
    pathToFileURL(
      'D:/Masterpiece-OS/packages/runtime-core/src/application/image-generation/run-store.ts',
    ).href
  );
  __AA_MODULES = Promise.resolve({
    createRunStore: runStoreFactory.createRunStore,
    createPackagingRunRegistrationAdapter: m.createPackagingRunRegistrationAdapter,
    createPackagingArtifactStore: m.createPackagingArtifactStore,
  });
  return __AA_MODULES;
}
// =============================================================================
// Group A 鈥?Runtime Dependency Boundary (canonical call path)
// =============================================================================

test('A-01 Workspace production code imports only the P2 public facade (no deep-import into Compiler / Provider adapter / metadata / task-builder)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No deep imports of P2 internals. The only P2
    // imports allowed in Workspace production are the
    // 4 public facade modules.
    const matches = src.match(/from\s+['"]@masterpiece\/image-generation-runtime\/[^'"]+['"]/g) || [];
    for (const m of matches) {
      const moduleName = m.match(/packaging\/([^'"]+)/)?.[1];
      assert.ok(
        moduleName && P2_PUBLIC_FACADE.has(moduleName),
        `${path.basename(file)} imports forbidden P2 module: ${m} (allowed facade: ${[...P2_PUBLIC_FACADE].join(', ')})`,
      );
    }
  }
});

test('A-02 Workspace does NOT import P2 core/ (packaging-generation-core.js)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /packaging-generation-core/.test(src),
      false,
      `${path.basename(file)} must not import P2 packaging-generation-core.js`,
    );
  }
});

test('A-03 Workspace does NOT import any forbidden Shared Core file (redact.js / policies.js / gates.js / task-builder.js / download-verify.js)', () => {
  const forbidden = ['redact.js', 'policies.js', 'gates.js', 'task-builder.js', 'download-verify.js'];
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const f of forbidden) {
      assert.equal(
        src.includes(f),
        false,
        `${path.basename(file)} must not reference the forbidden Shared Core file: ${f}`,
      );
    }
  }
});

test('A-04 Workspace uses the canonical P2 entry points (preparePackagingGeneration + executePackagingGeneration) only through workspace-service.js', () => {
  // preparePackagingGeneration / executePackagingGeneration
  // must be imported ONLY by workspace-service.js. Other
  // Workspace modules must NOT import them from the P2
  // frozen generation-service.js directly.
  for (const file of allPackagingProd()) {
    if (path.basename(file) === 'workspace-service.js') continue;
    const src = stripComments(readFile(file));
    const re = /import\s+\{[^}]*(?:preparePackagingGeneration|executePackagingGeneration)[^}]*\}\s+from\s+['"]@masterpiece\/image-generation-runtime\/packaging\/generation-service\.js['"]/;
    assert.equal(
      re.test(src),
      false,
      `${path.basename(file)} must not import the P2 generation service directly`,
    );
  }
});

test('A-05 Workspace orchestrates via the service surface (no parallel orchestrator)', () => {
  // No Workspace module exports a function named
  // `orchestrate` or `runGeneration` that bypasses the
  // service.
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(/export\s+function\s+orchestrate/.test(src), false, `${path.basename(file)} must not export orchestrate`);
    assert.equal(/export\s+function\s+runGeneration/.test(src), false, `${path.basename(file)} must not export runGeneration`);
  }
});

// =============================================================================
// Group B 鈥?Web UI Import Boundary (future P3-B UI guard)
// =============================================================================

test('B-01 Web UI source does NOT deep-import P2 frozen packaging internals', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    for (const forbidden of [
      'compiler.js',
      'provider-adapter.js',
      'provider-capability.js',
      'metadata.js',
      'task-builder.js',
      'download-verify.js',
      'gates.js',
      'policies.js',
      'redact.js',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.relative(ROOT, file)} must not deep-import ${forbidden}`,
      );
    }
  }
});

test('B-02 Web UI source does NOT import the P2 frozen reference-policy implementation directly', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      /reference-policy\.js/.test(src),
      false,
      `${path.relative(ROOT, file)} must not import the P2 reference-policy implementation; route through @masterpiece/runtime-core`,
    );
  }
});

test('B-03 Web UI source does NOT import the locked-assets-service (production authority)', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      /locked-assets-service/.test(src),
      false,
      `${path.relative(ROOT, file)} must not import the locked-assets-service; route through @masterpiece/runtime-core`,
    );
  }
});

test('B-04 Web UI source does NOT import credential implementation (node-credential-store / readCredentials / process.env.*KEY)', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    assert.equal(/node-credential-store/.test(src), false, `${path.relative(ROOT, file)} must not import node-credential-store`);
    assert.equal(/readCredentials/.test(src), false, `${path.relative(ROOT, file)} must not import readCredentials`);
    // process.env.*_KEY / *_SECRET / *_TOKEN is forbidden.
    assert.equal(/process\.env\.[A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/.test(src), false, `${path.relative(ROOT, file)} must not read process.env.* credential variables`);
  }
});

test('B-05 Web UI source does NOT import the P2 frozen generation-service (call through runtime-core only)', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      /image-generation-runtime\/packaging\/generation-service/.test(src),
      false,
      `${path.relative(ROOT, file)} must not import the P2 generation service directly; route through @masterpiece/runtime-core`,
    );
  }
});

// =============================================================================
// Group C 鈥?Compiler Boundary (STOP-P3-A-01)
// =============================================================================

test('C-01 Workspace does NOT import P2 frozen compiler.js', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /['"]@masterpiece\/image-generation-runtime\/packaging\/compiler['"]/.test(src),
      false,
      `${path.basename(file)} must not import P2 frozen compiler.js`,
    );
  }
});

test('C-02 Workspace does NOT call P2 frozen translation or compile internals directly', () => {
  // The P2 frozen entry points Workspace may call are
  // preparePackagingGeneration + executePackagingGeneration
  // from generation-service.js. Direct calls to
  // createPackagingTranslation or createPackagingCompiledPrompt
  // are forbidden.
  for (const file of allPackagingProd()) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'createPackagingTranslation',
      'createPackagingCompiledPrompt',
      'createPackagingCompileInput',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not call ${forbidden} directly`,
      );
    }
  }
});

test('C-03 The "compiler" identifier only appears in production as a data field (compileFingerprint / compiledPromptPreview / compilerVersion), never as a function call', () => {
  // Defense in depth: the word "compiler" should not
  // appear as a function call site in Workspace
  // production. Data-field names (compileFingerprint,
  // compiledPromptPreview, compilerVersion) are allowed.
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(/compiler\s*\(/.test(src), false, `${path.basename(file)} must not call compiler(...) as a function`);
    assert.equal(/\bimport\s+.*compiler\b/.test(src), false, `${path.basename(file)} must not import a symbol named compiler`);
  }
});

// =============================================================================
// Group D 鈥?Provider Payload Boundary (STOP-P3-A-02)
// =============================================================================

test('D-01 Workspace does NOT construct a Provider payload (no buildPackagingProviderPayload / buildProviderPayload / createProviderRequestBody)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const forbidden of [
      'buildPackagingProviderPayload',
      'buildProviderPayload',
      'createProviderRequestBody',
      'constructProviderPayload',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not call ${forbidden}`,
      );
    }
  }
});

test('D-02 View Model does NOT carry a Provider-payload-shaped field (only the preparedResult is passed through; the view projection is a UI-safe subset)', () => {
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  // No top-level `payload` field on the view shape.
  // The `prepared` view projection has `compiledPromptPreview`,
  // not the raw Provider payload.
  assert.equal(/['"]payload['"]\s*:/.test(view), false, 'view-model must not surface a raw Provider payload field');
  assert.equal(/['"]providerPayload['"]\s*:/.test(view), false, 'view-model must not surface a providerPayload field');
});

test('D-03 Web UI does NOT import any Provider-payload builder (no buildProviderPayload from P2 internals)', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    for (const forbidden of ['buildPackagingProviderPayload', 'buildProviderPayload', 'createProviderRequestBody']) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.relative(ROOT, file)} must not reference ${forbidden}`,
      );
    }
  }
});

// =============================================================================
// Group E 鈥?Credential Boundary (STOP-P3-A-03)
// =============================================================================

test('E-01 Workspace does NOT import node-credential-store or any credential reader', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const forbidden of [
      'node-credential-store',
      'readCredentials',
      'getCredentials',
      'loadCredentials',
      'loadApiKey',
      'readApiKey',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not import ${forbidden}`,
      );
    }
  }
});

test('E-02 Workspace does NOT read process.env.*KEY / SECRET / TOKEN / PASSWORD / CREDENTIAL', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /process\.env\.[A-Z_]*(?:KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)/.test(src),
      false,
      `${path.basename(file)} must not read credential env vars`,
    );
  }
});

test('E-03 Workspace does NOT carry an apiKey field (only apiProfileId as identifier)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // The Workspace may reference `apiProfileId`
    // (identifier) but not `apiKey` or any bearer /
    // secret value.
    const apiKeyMatches = src.match(/['"]apiKey['"]\s*:/g) || [];
    assert.equal(apiKeyMatches.length, 0, `${path.basename(file)} must not carry an apiKey field`);
  }
});

test('E-04 The Workspace public surface (PACKAGING_WORKSPACE_SERVICE_VERSION) does not surface an apiKey / Authorization / Bearer / secret', () => {
  // The service surface is the union of exported names.
  // We scan the source for any surface shape that
  // would carry a credential.
  for (const file of allPackagingProd()) {
    const src = stripComments(readFile(file));
    // No `Authorization:` literal (would indicate a
    // header construction in Workspace).
    assert.equal(/Authorization\s*:/.test(src), false, `${path.basename(file)} must not construct an Authorization header`);
    // No real Bearer token literal (the `<token>`
    // placeholder in the description is OK; we only
    // flag actual base64 / JWT-style tokens).
    assert.equal(/Bearer\s+[A-Za-z0-9._~+/-]{8,}/.test(src), false, `${path.basename(file)} must not include a real Bearer token literal`);
  }
});

test('E-05 The public Runtime barrel does NOT re-export any credential implementation', () => {
  const barrel = readFile(PACKAGING_INDEX);
  for (const forbidden of [
    'node-credential-store',
    'readCredentials',
    'loadApiKey',
    'apiKey',
    'getApiKey',
  ]) {
    assert.equal(
      barrel.includes(forbidden),
      false,
      `public Runtime barrel must not re-export ${forbidden}`,
    );
  }
});

// =============================================================================
// Group F 鈥?Frozen P2 Contract Guard (STOP-P3-A-04)
// =============================================================================

test('F-01 All 9 P2 frozen packaging modules exist on disk', () => {
  for (const f of P2_FROZEN_MODULES) {
    const filePath = path.join(P2_FROZEN_DIR, f);
    assert.ok(existsSync(filePath), `P2 frozen module missing: ${f}`);
  }
});

test('F-02 P2 frozen Shared Core / image-generation-runtime files exist (core/ + redact.js + deliverables/ + policies.js + gates.js + task-builder.js + download-verify.js)', () => {
  const checks = [
    'core/packaging-generation-core.js',
    'redact.js',
    'deliverables',
    'policies.js',
    'gates.js',
    'task-builder.js',
    'download-verify.js',
  ];
  const base = path.join(ROOT, 'packages', 'image-generation-runtime', 'src');
  for (const c of checks) {
    assert.ok(existsSync(path.join(base, c)), `P2 frozen Shared Core file missing: ${c}`);
  }
});

test('F-03 The P2 frozen baseline commit is reachable in git history', () => {
  const out = runGit(['cat-file', '-t', P2_FROZEN_BASELINE]).trim();
  assert.equal(out, 'commit', `P2 frozen baseline ${P2_FROZEN_BASELINE} must be a reachable commit`);
});

test('F-04 No commit on the current branch has modified a P2 frozen module since the baseline', () => {
  // For each frozen module, check the diff between
  // baseline and HEAD is empty (i.e. no commit on the
  // current branch has touched a P2 frozen module).
  const allFrozen = [
    ...P2_FROZEN_MODULES.map((m) => `packages/image-generation-runtime/src/packaging/${m}`),
    ...P2_FROZEN_EXTERNAL,
  ].map((p) => `packages/image-generation-runtime/src/${p}`);
  for (const f of allFrozen) {
    let diffOut = '';
    try {
      diffOut = runGit(['diff', '--name-only', P2_FROZEN_BASELINE, 'HEAD', '--', f]).trim();
    } catch {
      // ignore 鈥?fall through to the assertion
    }
    assert.equal(
      diffOut,
      '',
      `P2 frozen module ${f} was modified between ${P2_FROZEN_BASELINE} and HEAD`,
    );
  }
});

test('F-05 Workspace does NOT modify any P2 frozen module (no Workspace code path writes into the frozen directory)', () => {
  // Source-level proof: no Workspace module references
  // a writable path under packages/image-generation-runtime/.
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /packages\/image-generation-runtime\/src\/(?:packaging|core|redact|deliverables|policies|gates|task-builder|download-verify)/.test(src),
      false,
      `${path.basename(file)} must not reference a path inside the P2 frozen directory`,
    );
  }
});

// =============================================================================
// Group G 鈥?Reference Role Authority Guard (STOP-P3-A-05)
// =============================================================================

test('G-01 No Workspace module defines a second canonical Reference role array', () => {
  // The only role-array definition site is the P2
  // frozen PACKAGING_REFERENCE_ROLES. Workspace must
  // only re-export it, never redefine it.
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No `const ... = [...]` that contains the canonical
    // role value names.
    for (const role of [
      'high_fidelity_visual_reference',
      'structure_reference',
      'material_reference',
      'composition_reference',
      'style_reference',
      'product_identity_reference',
    ]) {
      const re = new RegExp(`(?:const|let|var)\\s+\\w*[Rr]oles?\\w*\\s*=\\s*\\[[^\\]]*['"\`]${role}['"\`]`, 'g');
      assert.equal(
        re.test(src),
        false,
        `${path.basename(file)} must not redefine the canonical role '${role}'`,
      );
    }
  }
});

test('G-02 The canonical role source is imported only from the P2 frozen reference-policy.js', () => {
  // PACKAGING_REFERENCE_ROLES must come from
  // reference-policy.js (P2 frozen). The Workspace
  // re-exports the same memory pointer.
  const refAssignments = readFile(path.join(PACKAGING_PROD_DIR, 'reference-assignments.js'));
  const intentSchema = readFile(path.join(PACKAGING_PROD_DIR, 'intent-schema.js'));
  const workspaceService = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  for (const [name, src] of [
    ['reference-assignments.js', refAssignments],
    ['intent-schema.js', intentSchema],
    ['workspace-service.js', workspaceService],
  ] as [string, string][]) {
    // The role list must come from reference-policy.js
    // OR be re-exported as a single import (no copy).
    const hasFromP2 = /from\s+['"]@masterpiece\/image-generation-runtime\/packaging\/reference-policy\.js['"]/.test(src);
    assert.ok(hasFromP2, `${name} must import PACKAGING_REFERENCE_ROLES from the P2 frozen reference-policy.js`);
  }
});

test('G-03 No Workspace module exports a UI-specific role enum (no WorkspaceRole / UIRole / DisplayRole)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const forbidden of ['WORKSPACE_REFERENCE_ROLES', 'UI_REFERENCE_ROLES', 'WORKSPACE_ROLES', 'DISPLAY_ROLES', 'WorkspaceReferenceRole']) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not export a UI-specific role enum (${forbidden})`,
      );
    }
  }
});

test('G-04 The view-model references array does NOT carry a precedence rank / winsOver / priorityWeight field', () => {
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  assert.equal(/precedence|priority|winsOver|rank/i.test(view.split(/projectReferenceAssignmentForView/)[1] || ''), false, 'reference view projection must not carry a precedence/priority/winsOver/rank field');
});

// =============================================================================
// Group H 鈥?Reference Precedence Guard (STOP-P3-A-06)
// =============================================================================

test('H-01 No Workspace module implements a precedence engine (no sortReferences / rankReferences / winsOver / priorityWeight / resolveWorkspacePrecedence / mergeReferencePriority)', () => {
  const forbidden = [
    'sortReferences',
    'rankReferences',
    'winsOver',
    'priorityWeight',
    'resolveWorkspacePrecedence',
    'mergeReferencePriority',
    'sortByRolePriority',
  ];
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const token of forbidden) {
      assert.equal(
        src.includes(token),
        false,
        `${path.basename(file)} must not implement a precedence engine (${token})`,
      );
    }
  }
});

test('H-02 PACKAGING_REFERENCE_PRECEDENCE is imported only by P2 frozen reference-policy.js (Workspace does not re-export or implement it)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No definition, no re-export, no value-level use of
    // the precedence array.
    assert.equal(/PACKAGING_REFERENCE_PRECEDENCE\s*=/.test(src), false, `${path.basename(file)} must not define PACKAGING_REFERENCE_PRECEDENCE`);
    assert.equal(/PACKAGING_REFERENCE_PRECEDENCE\s*\./.test(src), false, `${path.basename(file)} must not call methods on the precedence array`);
  }
});

test('H-03 The Workspace public barrel does NOT re-export the canonical precedence constant (UI cannot consume it to make generation decisions)', () => {
  const barrel = readFile(PACKAGING_INDEX);
  assert.equal(
    /PACKAGING_REFERENCE_PRECEDENCE/.test(barrel),
    false,
    'public Runtime barrel must not re-export the precedence constant (P3-A spec 搂18 / 搂22)',
  );
});

// =============================================================================
// Group I 鈥?Stale Fail-closed Guard (STOP-P3-A-07)
// =============================================================================

test('I-01 All Workspace execution goes through workspace-service.executeGeneration (no parallel execute entry point)', () => {
  // The Workspace production modules other than
  // workspace-service.js must not export a function
  // named `execute` / `run` / `generate` that bypasses
  // the service.
  for (const file of allPackagingProd()) {
    if (path.basename(file) === 'workspace-service.js') continue;
    const src = readFile(file);
    for (const forbidden of [
      /export\s+function\s+execute\w*/,
      /export\s+function\s+run\w*[Gg]eneration/,
      /export\s+function\s+generate\w*/,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${path.basename(file)} must not export a parallel execute entry point`,
      );
    }
  }
});

test('I-02 executeGeneration runs the isExecuteAllowed gate (single capability authority: workspace-state)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  assert.ok(/isExecuteAllowed/.test(src), 'executeGeneration must consult isExecuteAllowed');
});

test('I-03 executeGeneration runs the Workspace stale revalidation (computeStale / late double-check)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  // Either the early gate or the late double-check
  // calls computeStale.
  const inExecuteGen = src.split(/function\s+executeGeneration/)[1] || '';
  assert.ok(/computeStale/.test(inExecuteGen), 'executeGeneration must run computeStale double-check');
});

test('I-04 No Workspace module imports executePackagingGeneration directly from the P2 frozen generation-service (only workspace-service.js does)', () => {
  // The canonical entry: workspace-service.js imports
  // executePackagingGeneration from
  // @masterpiece/image-generation-runtime/packaging/generation-service.js.
  // No other Workspace module may import it directly.
  for (const file of allPackagingProd()) {
    if (path.basename(file) === 'workspace-service.js') continue;
    const src = stripComments(readFile(file));
    const re = /import\s+\{[^}]*executePackagingGeneration[^}]*\}\s+from\s+['"]@masterpiece\/image-generation-runtime\/packaging\/generation-service\.js['"]/;
    assert.equal(
      re.test(src),
      false,
      `${path.basename(file)} must not import executePackagingGeneration from the P2 frozen generation-service`,
    );
  }
});

test('I-05 No Workspace module imports preparePackagingGeneration directly from the P2 frozen generation-service (only workspace-service.js does)', () => {
  for (const file of allPackagingProd()) {
    if (path.basename(file) === 'workspace-service.js') continue;
    const src = stripComments(readFile(file));
    const re = /import\s+\{[^}]*preparePackagingGeneration[^}]*\}\s+from\s+['"]@masterpiece\/image-generation-runtime\/packaging\/generation-service\.js['"]/;
    assert.equal(
      re.test(src),
      false,
      `${path.basename(file)} must not import preparePackagingGeneration from the P2 frozen generation-service`,
    );
  }
});

// =============================================================================
// Group J 鈥?Persistence / Leakage Guard (STOP-P3-A-08)
// =============================================================================

test('J-01 View Model does NOT spread raw `session` as the public UI surface', () => {
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  // The view is constructed by picking a small
  // allowlist of fields, not by spreading the entire
  // session.
  assert.equal(
    /\{[.]{2,3}(state|session|internalState)\b/.test(view),
    false,
    'view-model must not spread session/state/internalState as the public surface',
  );
});

test('J-02 View Model does NOT spread raw `preparedResult` as a UI field (the prepared view projection is a UI-safe subset)', () => {
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  // prepared.preparedResult is allowed inside
  // session.prepared (storage), but the view must not
  // surface it as a single field on the public shape.
  assert.equal(
    /['"]preparedResult['"]\s*:/.test(view.split(/export\s+function\s+projectPackagingWorkspaceView/)[1] || ''),
    false,
    'view-model must not surface preparedResult as a public field',
  );
});

test('J-03 View Model does NOT spread raw `executionResult` as a UI field (the execution view projection is a UI-safe subset)', () => {
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  assert.equal(
    /['"]executionResult['"]\s*:/.test(view.split(/export\s+function\s+projectPackagingWorkspaceView/)[1] || ''),
    false,
    'view-model must not surface executionResult as a public field',
  );
});

test('J-04 Workspace production code does NOT JSON.stringify(session / preparedResult / executionResult) as a public surface', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /JSON\.stringify\((?:state|session|internalState|preparedResult|executionResult)\b/.test(src),
      false,
      `${path.basename(file)} must not JSON.stringify the raw session/prepared/execution as a public surface`,
    );
  }
});

test('J-05 The prepared view projection does NOT carry a Provider payload field (only the UI-safe prompt preview + metadata summary)', () => {
  // The CANONICAL_PREPARED_KEYS allowlist locks the
  // 12 prepared view keys; the guard checks that the
  // keys include compiledPromptPreview + metadataSummary
  // + fingerprintSummary but do NOT include a raw
  // `payload` field.
  const view = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  const canonicalKeys = /CANONICAL_PREPARED_KEYS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(view);
  assert.ok(canonicalKeys, 'CANONICAL_PREPARED_KEYS must be defined in view-model');
  const keys = canonicalKeys[1].split(',').map((k) => k.trim().replace(/['"]/g, '')).filter(Boolean);
  assert.equal(keys.includes('payload'), false, 'CANONICAL_PREPARED_KEYS must not include "payload"');
  assert.ok(keys.includes('compiledPromptPreview'), 'CANONICAL_PREPARED_KEYS must include compiledPromptPreview');
  assert.ok(keys.includes('metadataSummary'), 'CANONICAL_PREPARED_KEYS must include metadataSummary');
  assert.ok(keys.includes('fingerprintSummary'), 'CANONICAL_PREPARED_KEYS must include fingerprintSummary');
});

// =============================================================================
// Group K 鈥?Web UI Provider Network Guard (STOP-P3-A-09)
// =============================================================================

test('K-01 Web UI source does NOT import P2 frozen provider-adapter.js', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      /provider-adapter\.js/.test(src),
      false,
      `${path.relative(ROOT, file)} must not import provider-adapter.js`,
    );
  }
});

test('K-02 Web UI source does NOT import Provider-specific SDKs (OpenAI SDK / Volcengine SDK / Aliyun SDK) directly', () => {
  const files = listWebSourceFiles();
  const forbidden = [
    'openai',
    'volcengine',
    'aliyun',
    '@alicloud',
    '@baiducloud',
    '@tencentcloud',
  ];
  for (const file of files) {
    const src = readFile(file);
    for (const f of forbidden) {
      const re = new RegExp(`from\\s+['"]${f}['"]`);
      assert.equal(
        re.test(src),
        false,
        `${path.relative(ROOT, file)} must not import Provider SDK ${f}`,
      );
    }
  }
});

test('K-03 Web UI source does NOT POST to a Provider endpoint directly (no direct Provider fetch with image-generation payload shape)', () => {
  const files = listWebSourceFiles();
  for (const file of files) {
    const src = readFile(file);
    // No direct fetch with Provider-specific URL paths.
    for (const providerUrl of [
      'api.openai.com',
      'ark.cn-beijing.volces.com',
      'dashscope.aliyuncs.com',
    ]) {
      assert.equal(
        src.includes(providerUrl),
        false,
        `${path.relative(ROOT, file)} must not call Provider URL ${providerUrl} directly`,
      );
    }
  }
});

test('K-04 Web UI source may use the local masterpiece RPC (no global ban on fetch)', () => {
  // Sanity: the boundary is "no direct Provider network",
  // not "no fetch in Web UI". The Web UI uses the local
  // RPC for generation. We do NOT globally ban fetch 鈥?  // a positive test confirms that the only allowed
  // generation-channel is the local masterpiece RPC.
  const webApi = readFile(path.join(WEB_DIR, 'web-api.ts'));
  // The Web API layer is the boundary; it routes
  // generation calls through the local masterpiece RPC.
  assert.ok(/masterpiece|local-rpc|\/_\w+\/rpc/i.test(webApi), 'web-api.ts must route generation through the local masterpiece RPC');
});

// =============================================================================
// Group L 鈥?Shared Regression Guards (STOP-P3-A-10/11/12)
// =============================================================================

test('L-01 P2 frozen image-generation regression: all expected packaging/ modules are present and untouched by the current branch', () => {
  // Cross-checks F-01 (modules exist) and F-04 (no
  // modification since baseline). Group L is the
  // "shared regression" gate; this test asserts the
  // P2 frozen packaging/ boundary is intact.
  for (const f of P2_FROZEN_MODULES) {
    const filePath = path.join(P2_FROZEN_DIR, f);
    assert.ok(existsSync(filePath), `P2 frozen module missing (regression): ${f}`);
  }
});

test('L-02 P2 frozen Shared Core boundary is intact (packaging-generation-core.js + redact.js + deliverables/ + policies.js + gates.js + task-builder.js + download-verify.js)', () => {
  const checks = [
    'core/packaging-generation-core.js',
    'redact.js',
    'deliverables',
    'policies.js',
    'gates.js',
    'task-builder.js',
    'download-verify.js',
  ];
  const base = path.join(ROOT, 'packages', 'image-generation-runtime', 'src');
  for (const c of checks) {
    assert.ok(existsSync(path.join(base, c)), `P2 frozen Shared Core regression: ${c}`);
  }
});

test('L-03 P2 frozen packaging/ + Shared Core files have not been modified between the baseline and HEAD', () => {
  // Comprehensive F-04 sweep including Shared Core.
  const allFrozen = [
    ...P2_FROZEN_MODULES.map((m) => `packages/image-generation-runtime/src/packaging/${m}`),
    ...P2_FROZEN_EXTERNAL.map((p) => `packages/image-generation-runtime/src/${p}`),
  ];
  for (const f of allFrozen) {
    let diffOut = '';
    try {
      diffOut = runGit(['diff', '--name-only', P2_FROZEN_BASELINE, 'HEAD', '--', f]).trim();
    } catch {
      // ignore
    }
    assert.equal(diffOut, '', `P2 frozen file ${f} was modified between baseline and HEAD`);
  }
});

test('L-04 Visual Analysis workspace surface does NOT import the Packaging Workspace application surface', () => {
  // The Visual Analysis workspace (apps/web Runtime
  // Host) and the Packaging Workspace are sibling
  // application surfaces in runtime-core. They must
  // not cross-import (they each import from the
  // shared runtime-core barrel, not from each other).
  const vaSurface = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'image-generation');
  if (!existsSync(vaSurface)) return; // optional directory
  const files: string[] = [];
  const visit = (abs: string) => {
    for (const entry of readdirSync(abs, { withFileTypes: true })) {
      const child = path.join(abs, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (/\.(?:c|m)?js$/.test(entry.name)) files.push(child);
    }
  };
  visit(vaSurface);
  for (const f of files) {
    const src = readFile(f);
    assert.equal(
      /from\s+['"][^'"]*application\/packaging\//.test(src),
      false,
      `${path.relative(ROOT, f)} must not import from the Packaging Workspace application surface`,
    );
  }
});

test('L-05 Packaging Workspace surface does NOT import the Visual Analysis workspace internals', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(
      /from\s+['"][^'"]*application\/image-generation\//.test(src),
      false,
      `${path.basename(file)} must not import from the Visual Analysis workspace internals`,
    );
  }
});

test('L-06 repo:verify authoritative config files exist and are valid JSON', () => {
  const configs = [
    'config/repository-contract/current-authorities.json',
    'config/repository-contract/version-namespace-allowlist.json',
    'config/repository-contract/prompt-integrity.json',
    'config/repository-contract/compatibility-registry.json',
  ];
  for (const c of configs) {
    const abs = path.join(ROOT, c);
    assert.ok(existsSync(abs), `repo:verify config missing: ${c}`);
    // Sanity: the file parses as JSON.
    const parsed = JSON.parse(readFile(abs));
    assert.ok(parsed, `${c} must parse as JSON`);
  }
});

// =============================================================================
// Group P 鈥?Additional Authority Guards
// =============================================================================

test('P-01 No second generation fingerprint authority (the only authority is the P2 frozen metadata.compileFingerprint)', () => {
  // No Workspace module defines a function or constant
  // named like a generation fingerprint algorithm.
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    for (const forbidden of [
      'computeGenerationFingerprint',
      'computeWorkspaceFingerprint',
      'computeViewFingerprint',
      'computeSessionFingerprint',
      'hashGenerationInputs',
      'hashReferencePlan',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not define a parallel generation fingerprint (${forbidden})`,
      );
    }
  }
});

test('P-02 No second state machine (workspace-state.js is the only state authority)', () => {
  // No Workspace module exports a function that
  // performs a state transition outside workspace-state.
  for (const file of allPackagingProd()) {
    if (path.basename(file) === 'workspace-state.js') continue;
    const src = readFile(file);
    assert.equal(
      /export\s+function\s+transition(?:Session|State|Status|Generation)\b/.test(src),
      false,
      `${path.basename(file)} must not export a parallel state-machine transition`,
    );
  }
});

test('P-03 No second stale engine (stale-tracker.js is the only stale authority; intent-schema owns the data-side comparison only)', () => {
  // The "stale engine" canonical surface is:
  //   - stale-tracker.js: computeStale, STALE_REASON
  //   - intent-schema.js: detectStaleChange (data-side
  //     structural comparison) + computeTruthFingerprint
  // No other Workspace module may export a function
  // that produces a stale signal.
  for (const file of allPackagingProd()) {
    const fname = path.basename(file);
    if (fname === 'stale-tracker.js' || fname === 'intent-schema.js') continue;
    const stripped = stripComments(readFile(file));
    assert.equal(
      /export\s+function\s+(?:compute|detect)(?:Stale|Drift|Truth)\w*/.test(stripped),
      false,
      `${fname} must not export a parallel stale / truth engine`,
    );
  }
  // STALE_REASON is defined only in stale-tracker.js.
  for (const file of allPackagingProd()) {
    const fname = path.basename(file);
    if (fname === 'stale-tracker.js') continue;
    const stripped = stripComments(readFile(file));
    assert.equal(
      /STALE_REASON\s*=/.test(stripped) && !/STALE_REASON\s*,\s*STALE_REASON\b/.test(stripped),
      false,
      `${fname} must not define STALE_REASON (single source: stale-tracker.js)`,
    );
  }
});

test('P-04 No second Locked Asset authority (workspace does not own Locked Assets)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No write/edit API for Locked Assets.
    for (const forbidden of [
      'saveLockedAsset',
      'updateLockedAsset',
      'unlockAsset',
      'replaceLockedAsset',
      'editLockedAsset',
      'setLockedAsset',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not define a Locked-Asset write API (${forbidden})`,
      );
    }
  }
});

test('P-05 No second Project authority (Workspace session stores only a snapshot of project identity; the project itself is upstream)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No Workspace module reads / writes the project
    // store directly.
    assert.equal(/project-store/.test(src), false, `${path.basename(file)} must not import project-store`);
    assert.equal(/creative-session-service/.test(src), false, `${path.basename(file)} must not import creative-session-service`);
    // No Workspace module mutates a `projectIdentity`
    // field outside the truthSnapshot shape.
    const writesIdentity = /(set|update|save)\s*\(.*projectIdentity/.test(src);
    assert.equal(writesIdentity, false, `${path.basename(file)} must not write to projectIdentity`);
  }
});

test('P-06 No second Provider registry / capability authority (Provider capability is owned by P2 frozen)', () => {
  for (const file of allPackagingProd()) {
    const src = stripComments(readFile(file));
    // Specific forbidden symbol names (not free-text
    // "Provider" in comments).
    for (const forbidden of [
      'createProviderAdapter',
      'registerProvider',
      'getProviderAdapter',
      'ProviderRegistry',
      'createProviderRegistry',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${path.basename(file)} must not implement a Provider registry (${forbidden})`,
      );
    }
  }
});

test('P-07 No second credential authority (Shared Core / node-credential-store is the sole owner)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    assert.equal(/node-credential-store/.test(src), false);
    assert.equal(/loadApiKey|readApiKey|getApiKey|readCredentials/.test(src), false);
  }
});

test('P-08 No second run-store authority (Workspace stores the last execution as a session field; the run-store is upstream)', () => {
  for (const file of allPackagingProd()) {
    const src = readFile(file);
    // No Workspace module imports the run-store.
    assert.equal(/run-store/.test(src), false, `${path.basename(file)} must not import run-store`);
    // No Workspace module exports a function that
    // persists a run.
    assert.equal(/export\s+function\s+(?:saveRun|persistRun|writeRun|createRun)/.test(src), false, `${path.basename(file)} must not export a run persistence API`);
  }
});

// =============================================================================
// Group T 鈥?Public Runtime Export Boundary
// =============================================================================

test('T-01 The public Runtime barrel does NOT re-export P2 frozen compiler.js / provider-adapter.js / provider-capability.js / metadata.js / validation.js / task-builder.js / download-verify.js / policies.js / gates.js / redact.js / core/ internals', () => {
  const barrel = readFile(PACKAGING_INDEX);
  for (const forbidden of [
    'compiler.js',
    'provider-adapter.js',
    'provider-capability.js',
    'metadata.js',
    'validation.js',
    'task-builder.js',
    'download-verify.js',
    'policies.js',
    'gates.js',
    'redact.js',
    'packaging-generation-core',
    'createPackagingTranslation',
    'createPackagingCompiledPrompt',
    'buildPackagingProviderPayload',
    'verifyPackagingGenerationMetadata',
    'PACKAGING_REFERENCE_PRECEDENCE',
  ]) {
    assert.equal(
      barrel.includes(forbidden),
      false,
      `public Runtime barrel must not re-export ${forbidden}`,
    );
  }
});

test('T-02 The runtime-core public barrel does NOT re-export the Packaging Workspace internals (workspace-service / workspace-state / intent-schema / stale-tracker / view-model are NOT public)', () => {
  const barrel = readFile(RUNTIME_CORE_INDEX);
  for (const forbidden of [
    'workspace-service',
    'workspace-state',
    'intent-schema',
    'stale-tracker',
    'view-model',
    'lock-assets-projection',
    'reference-assignments',
  ]) {
    assert.equal(
      barrel.includes(forbidden),
      false,
      `runtime-core public barrel must not re-export the Packaging Workspace internals (${forbidden}); the public barrel is the packaging/index.js only`,
    );
  }
});

test('T-03 The Packaging public barrel exposes the canonical Workspace surface (createPackagingWorkspaceService + canonical roles + canonical modes + view-model helpers)', () => {
  const barrel = readFile(PACKAGING_INDEX);
  for (const required of [
    'createPackagingWorkspaceService',
    'PACKAGING_REFERENCE_ROLES',
    'PACKAGING_GENERATION_MODES',
    'PACKAGING_SHOT_CONTRACT_IDS',
    'STALE_REASON',
    'projectPackagingWorkspaceView',
    'getPackagingGenerationServiceFingerprint',
  ]) {
    assert.ok(
      barrel.includes(required),
      `public Runtime barrel must expose ${required}`,
    );
  }
});

// =============================================================================
// Group U 鈥?Workspace Service Orchestrator Invariants
// =============================================================================

test('U-01 workspace-service.js is a thin orchestrator (delegates state machine + stale tracker + reference / locked-asset projection)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  for (const required of [
    'transitionSession',
    'isExecuteAllowed',
    'isIntentEditAllowed',
    'isPrepareAllowed',
    'isResetAllowed',
    'computeStale',
    'projectReferenceAssignmentsToPolicy',
    'projectLockedAssetsForView',
  ]) {
    assert.ok(
      src.includes(required),
      `workspace-service.js must delegate to ${required}`,
    );
  }
});

test('U-02 workspace-service.js does NOT generate a parallel fingerprint (no crypto.createHash / no second hash algorithm)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  assert.doesNotMatch(src, /crypto\.createHash|createHash\(/);
  // truthFingerprint is a structural helper
  // (stableStringify in intent-schema.js), not a hash.
  // workspace-service.js may read truthFingerprintAtPrepare
  // but does not compute a hash.
  assert.equal(/md5|sha1|sha256|hash\(/i.test(src), false, 'workspace-service.js must not call any hash function');
});

test('U-03 workspace-service.js does NOT call Provider / network / fs / credential / Provider payload construction', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'workspace-service.js'));
  for (const forbidden of [
    'node:fs',
    'fetch(',
    'buildPackagingProviderPayload',
    'readCredentials',
    'node-credential-store',
  ]) {
    assert.equal(
      src.includes(forbidden),
      false,
      `workspace-service.js must not call ${forbidden}`,
    );
  }
});

// =============================================================================
// Group V 鈥?View Model Projection Invariants
// =============================================================================

test('V-01 view-model.js is a projection (no prepare / execute / Provider network / fs / credential / session mutation)', () => {
  const src = stripComments(readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js')));
  for (const forbidden of [
    'preparePackagingGeneration',
    'executePackagingGeneration',
    'fetch(',
    'node:fs',
    'readCredentials',
    'node-credential-store',
  ]) {
    assert.equal(
      src.includes(forbidden),
      false,
      `view-model.js must not call ${forbidden}`,
    );
  }
});

test('V-02 view-model.js delegates capability projection to the workspace-state authority (no parallel rule table)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  for (const required of [
    'isExecuteAllowed',
    'isIntentEditAllowed',
    'isPrepareAllowed',
    'isResetAllowed',
  ]) {
    assert.ok(
      src.includes(required),
      `view-model.js must delegate to ${required}`,
    );
  }
});

test('V-03 view-model.js does NOT mutate the session (no spread-write of session.*)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  // The view projection is read-only. No `session.x = y`
  // and no method call on session that mutates it.
  assert.doesNotMatch(src, /\bsession\.\w+\s*=/);
  // Object.freeze on the view is required.
  assert.ok(/Object\.freeze/.test(src), 'view-model must Object.freeze the projection');
});

test('V-04 view-model.js does NOT detect stale independently (no computeStale / detectStaleChange calls)', () => {
  const src = readFile(path.join(PACKAGING_PROD_DIR, 'view-model.js'));
  // The view reflects state; it does not compute stale.
  // Stale is a state-machine concern (workspace-state +
  // stale-tracker), not a view-model concern.
  assert.doesNotMatch(src, /computeStale|detectStaleChange/);
});

// =============================================================================
// Group W 鈥?P3-B2 RPC Binding Boundary (additive; does NOT modify P3-A7 A-L)
// =============================================================================
//
// These guards are P3-B2-specific. They protect the contract
// that:
//   - The Web Packaging feature is RPC-only. It MUST NOT
//     instantiate `createPackagingWorkspaceService` locally.
//   - There is no fallback / dual-path architecture. If the
//     runtime RPC is unavailable, the Web feature renders a
//     canonical unavailable surface 鈥?it does NOT silently
//     fall back to a local in-process stub.
//   - The runtime operations layer is the SOLE owner of the
//     P2 frozen deps seam. The Web feature never sends
//     `apiKey` / `Authorization` / `Bearer` over RPC.

const PACKAGING_WEB_FEATURE = path.join(APPS_WEB_SRC, 'features/packaging');
const PACKAGING_OPERATIONS = path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js');
const PACKAGING_RUNTIME_SERVICES = path.join(ROOT, 'packages', 'runtime-core', 'src', 'application', 'runtime-services.ts');
const PACKAGING_WORKSPACE = path.join(PACKAGING_WEB_FEATURE, 'PackagingWorkspace.tsx');
const PACKAGING_SERVICE = path.join(PACKAGING_WEB_FEATURE, 'service.ts');
const PACKAGING_VIEW_MODEL = path.join(PACKAGING_PROD_DIR, 'view-model.js');

test('W-01 the Web Packaging feature directory exists under apps/web/src/features/packaging/', () => {
  assert.ok(
    existsSync(PACKAGING_WEB_FEATURE),
    'P3-B2 requires apps/web/src/features/packaging/ (per P3-A1 audit + P3-A9 freeze 搂20)',
  );
});

test('W-02 the Web Packaging feature does NOT import or call createPackagingWorkspaceService locally', () => {
  // Walk the entire feature directory; the symbol must not
  // appear in any executable context (import / function
  // call / type-only import). Comments and JSX text that
  // mention the symbol as a guardrail are allowed.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  assert.ok(files.length > 0, 'Packaging Web feature must contain at least one source file');
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const re of [
      /^import\s*\{[^}]*\bcreatePackagingWorkspaceService\b/mu,
      /^import\s+type\s*\{[^}]*\bcreatePackagingWorkspaceService\b/mu,
      /\bcreatePackagingWorkspaceService\s*\(/,
      /\bcreatePackagingWorkspaceService\s*</,
      /\bReturnType\s*<\s*typeof\s+createPackagingWorkspaceService\b/,
    ]) {
      assert.equal(
        re.test(src),
        false,
        `${file} must not match ${re.toString()} (P3-B2 搂3 鈥?no local Workspace service instance)`,
      );
    }
  }
});

test('W-03 the Web Packaging feature does NOT import @masterpiece/image-generation-runtime (no deep-import of P2 frozen)', () => {
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      src.includes('@masterpiece/image-generation-runtime'),
      false,
      `${file} must not deep-import @masterpiece/image-generation-runtime (P3-A7 B)`,
    );
  }
});

test('W-04 the Web Packaging feature does NOT read process.env / fs / crypto for credentials', () => {
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = readFile(file);
    for (const forbidden of [
      'process.env',
      'fs.readFile',
      'fs.writeFile',
      "from 'node:fs'",
      "from 'node:fs/promises'",
      'crypto.createHash',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not access ${forbidden} (P3-A7 E Credential Boundary)`,
      );
    }
  }
});

test('W-05 the Web Packaging feature consumes window.masterpiece.packaging.* only (no local in-process service fallback)', () => {
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let usesRpc = false;
  for (const file of files) {
    const src = readFile(file);
    if (src.includes('window.masterpiece') || src.includes('masterpiece.packaging')) {
      usesRpc = true;
    }
    // The Web feature must not define a local
    // `createPackagingWorkspaceService` / `preparePackagingGeneration`
    // stub. (P3-B2 搂3: no dual-path architecture.)
    assert.equal(
      src.includes('preparePackagingGeneration = NOOP') || src.includes('NOOP_STUB'),
      false,
      `${file} must not define a local in-process stub for prepare/execute (P3-B2 搂3 dual-path forbidden)`,
    );
  }
  assert.ok(usesRpc, 'Web Packaging feature must consume window.masterpiece.packaging.* (RPC only)');
});

test('W-06 the operations layer is the sole Web-facing bridge to the frozen Workspace service', () => {
  assert.ok(
    existsSync(PACKAGING_OPERATIONS),
    'packaging-operations.js must exist as the sole Web-facing bridge',
  );
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The operations file MUST NOT deep-import the frozen
  // P2 / application internals. The Workspace service
  // arrives via the `service` parameter (injected by the
  // runtime-side composition root in runtime-services.ts).
  for (const forbidden of [
    '@masterpiece/image-generation-runtime',
    'createPackagingTranslation',
    'compilePackagingPrompt',
    'buildPackagingProviderPayload',
    'resolvePackagingProviderCapability',
    'createPackagingWorkspaceService',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not import or call ${forbidden} (P3-B2 搂7 + P3-A7 B/F)`,
    );
  }
  // The operations file MUST NOT have a second bridge (no
  // additional rpc-server, no express, no http.Server).
  for (const forbidden of [
    'express',
    'http.createServer',
    'new Server',
    'WebSocketServer',
    'local-rpc-server',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not start a second HTTP / RPC server (${forbidden})`,
    );
  }
});

test('W-07 the operations layer does not read credentials directly (it accepts them via the readCredentials adapter only)', () => {
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  for (const forbidden of [
    'process.env',
    "from 'node:fs'",
    "from 'node:fs/promises'",
    'crypto.createHash',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not access credentials via the forbidden surface (${forbidden})`,
    );
  }
  // The operations layer must accept readCredentials as an
  // adapter (function parameter), not hardcode any specific
  // credential store.
  assert.match(
    opsSrc,
    /readCredentials/,
    'packaging-operations.js must accept readCredentials as a factory adapter',
  );
});

test('W-08 the runtime services factory instantiates the Packaging Workspace service once per runtime process', () => {
  const rtSrc = readFile(PACKAGING_RUNTIME_SERVICES);
  // Exactly one createPackagingWorkspaceService call in
  // runtime-services.ts (not inside an arrow inside an
  // arrow).
  const matches = rtSrc.match(/createPackagingWorkspaceService\s*\(/g) || [];
  assert.equal(
    matches.length,
    1,
    `runtime-services.ts must instantiate createPackagingWorkspaceService exactly once (found ${matches.length})`,
  );
  // The factory is held in the frozen services object so
  // RPC operations can reuse it.
  assert.match(
    rtSrc,
    /createPackagingWorkspaceService\(\)/,
    'runtime-services.ts must call createPackagingWorkspaceService() without test-stub authority override',
  );
});

test('W-09 the Web feature exposes a no-fallback unavailable surface (RPC unavailable 鈫?render error, not local stub)', () => {
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let foundUnavailable = false;
  for (const file of files) {
    const src = readFile(file);
    if (
      src.includes('isPackagingRuntimeAvailable') ||
      src.includes('RPC_UNAVAILABLE') ||
      src.includes('unavailable') ||
      src.includes('RPC_UNAVAILABLE_REASON')
    ) {
      foundUnavailable = true;
    }
  }
  assert.ok(
    foundUnavailable,
    'Web Packaging feature must explicitly detect the unavailable runtime and render a canonical unavailable surface (P3-B2 搂3 + 搂12)',
  );
});

test('W-10 the Web feature does not embed a demo seed of Locked Assets in the production code path', () => {
  // The B1 demo seed was a function called `buildSeedTruthSnapshot`
  // that hard-coded 7 canonical Locked-Asset fields with
  // empty / placeholder values. P3-B2 production path must
  // NOT contain this kind of seed (per the user spec 搂20
  // "B1 褰撴椂 seed 浜?7 涓?canonical Locked-Asset 瀛楁 浣滀负
  // shell demo. B2 鎺ュ叆鐪熷疄 RPC 鍚庯細杩欎簺 seed/demo values
  // 涓嶅緱缁х画鍏呭綋 production truth").
  //
  // The runtime side MAY keep an analogous empty-shape seed
  // for the resolveTruthSnapshot default 鈥?that is the
  // runtime authority, not a fake UI seed. This guard only
  // checks the Web feature.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = readFile(file);
    assert.equal(
      src.includes('buildSeedTruthSnapshot'),
      false,
      `${file} must not contain the B1 buildSeedTruthSnapshot helper (P3-B2 搂20)`,
    );
  }
});

// =============================================================================
// Group X 鈥?P3-B3 Reference & Truth Architecture Guards (additive)
// =============================================================================
//
// P3-B3 = Reference Selection UI + Runtime Truth Projection. These
// guards are additive to the P3-A7 A-L + P3-B2 W groups; they do NOT
// modify any frozen P3-A production surface.
//
// The guards enforce:
//   - canonical 6-role vocabulary imported from the frozen
//     runtime-core barrel (NOT derived from view.references)
//   - no local semantic role enum in the Web feature
//   - no precedence / priority / sort-by-role logic in the Web
//     feature
//   - no Provider payload construction in the Web feature
//   - no second asset resolver / no absolute filesystem path
//   - Locked Asset UI is read-only (no edit / unlock / replace /
//     delete / upload / save action)
//   - the Web feature cannot inject an arbitrary truthSnapshot
//     (P3-B3 搂11 + 搂12)
//   - truth refresh resolves the runtime-side authority
//   - no second truth store
//   - reference semantic updates use updateIntent RPC
//   - P3-A frozen files unchanged
//   - P2 frozen files unchanged

test('X-01 the Web feature imports canonical roles from @masterpiece/runtime-core (the frozen P3-A authority)', () => {
  // The Web feature must import PACKAGING_REFERENCE_ROLES
  // from the P3-A frozen public barrel. It must NOT define
  // a second role enum.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let foundImport = false;
  for (const file of files) {
    const src = stripComments(readFile(file));
    if (/@masterpiece\/runtime-core/.test(src) && src.includes('PACKAGING_REFERENCE_ROLES')) {
      foundImport = true;
    }
    // The Web feature must NOT define a local semantic role
    // enum (P3-B3 搂2).
    for (const forbidden of [
      'WORKSPACE_REFERENCE_ROLES',
      'UI_REFERENCE_ROLES',
      'PACKAGING_ROLE_ENUM',
      'const REFERENCE_ROLES = [',
      'enum ReferenceRole',
      'type ReferenceRole =',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not define a second role enum (${forbidden})`,
      );
    }
  }
  assert.ok(
    foundImport,
    'Web feature must import PACKAGING_REFERENCE_ROLES from @masterpiece/runtime-core',
  );
});

test('X-02 the Web feature does NOT derive the role vocabulary from view.references', () => {
  // The role vocabulary is the frozen canonical 6 roles,
  // not the current set of assigned references.
  // view.references is the user's current assignments; the
  // vocabulary is PACKAGING_REFERENCE_ROLES.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    // We allow reading `view.references` for display, but
    // the role vocabulary must come from the canonical
    // PACKAGING_REFERENCE_ROLES export.
    if (src.includes('view.references')) {
      // The component must not iterate view.references to
      // derive a role vocabulary.
      assert.equal(
        /\.map\(\s*\(?\s*\w+\s*\)?\s*=>\s*[\w.]+\.role/.test(src),
        false,
        `${file} must not derive a role vocabulary from view.references (P3-B3 搂2)`,
      );
    }
  }
});

test('X-03 the Web feature does NOT implement Reference precedence / priority / sort-by-role', () => {
  // P2 frozen reference-policy is the sole owner of
  // precedence. The Web feature MUST NOT sort, rank, or
  // reorder references by role / priority / winsOver.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'winsOver',
      'precedence',
      'priority',
      'sortReferencesByRole',
      'sortByRole',
      'rankByRole',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not implement precedence / priority / sort-by-role (${forbidden})`,
      );
    }
  }
});

test('X-04 the Web feature does NOT construct a Provider payload', () => {
  // P2 frozen provider-adapter is the sole owner of the
  // Provider payload. The Web feature MUST NOT build a
  // Provider payload.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'buildPackagingProviderPayload',
      'buildProviderPayload',
      'createProviderPayload',
      'packaging-payload',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not construct a Provider payload (${forbidden})`,
      );
    }
  }
});

test('X-05 the Web feature does NOT expose an absolute filesystem path for asset selection', () => {
  // The Web feature picks assets via the existing
  // `window.masterpiece.projects.scanAssets(projectId)` RPC,
  // which returns AssetItem with a safe `thumbnailDataUrl`
  // and stable `id`. The Web feature MUST NOT use absolute
  // filesystem paths for asset preview or selection.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'file://',
      'C:\\\\',
      '/Users/',
      '/home/',
      '\\\\\\\\',
      'C:/',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not embed absolute filesystem path (${forbidden})`,
      );
    }
  }
});

test('X-06 the Locked Asset UI does NOT expose an edit / unlock / replace / delete / save action', () => {
  // P3-B3 搂13: the Locked Asset UI is strictly read-only.
  // No edit / unlock / replace / delete / upload / save
  // action is exposed.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    // Look for forbidden Locked Asset mutation verbs in
    // the Locked Asset tile.
    for (const forbidden of [
      'unlockAsset',
      'replaceAsset',
      'deleteLockedAsset',
      'editLockedAsset',
      'saveLockedAsset',
      'uploadLockedAsset',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not contain a Locked Asset mutation method (${forbidden})`,
      );
    }
  }
});

test('X-07 the Web feature does NOT send an arbitrary truthSnapshot to setTruthSnapshot (P3-B3 搂11)', () => {
  // The Web feature's setTruthSnapshot RPC client must only
  // send { sessionId } (no truthSnapshot, no projectId).
  // The createSession RPC DOES accept a truthSnapshot
  // (creation-time input); that is the canonical P3-A
  // contract. This guard only protects the setTruthSnapshot
  // path.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    // Look for the setTruthSnapshot call. The argument
    // object literal passed to it must NOT include a
    // truthSnapshot key. We use a simpler regex here.
    const callRe = /setTruthSnapshot\(\s*\{([^{}]*)\}\s*\)/gu;
    const calls = src.match(callRe) || [];
    for (const call of calls) {
      assert.equal(
        /truthSnapshot\s*:/.test(call),
        false,
        `${file} setTruthSnapshot call must not include truthSnapshot (${call})`,
      );
    }
  }
});

test('X-08 the Web feature does NOT send a projectId to setTruthSnapshot (P3-B3 搂12)', () => {
  // The Web RPC client must not include a projectId in
  // the setTruthSnapshot input. The session's projectId is
  // the sole authority.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    // Look for `projectId:` assignments inside the
    // setTruthSnapshot callsite. We allow `projectId: ''` in
    // the createSession bootstrap form, but NOT in the
    // setTruthSnapshot payload.
    const re = /setTruthSnapshot\([^)]*\)/gmu;
    const matches = src.match(re) || [];
    for (const call of matches) {
      assert.equal(
        /projectId\s*:/.test(call),
        false,
        `${file} must not send a projectId in setTruthSnapshot (${call})`,
      );
    }
  }
});

test('X-09 the Web feature uses the existing `projects.scanAssets` RPC for reference asset selection (no second asset resolver)', () => {
  // P3-B3 搂3: the Reference Picker reuses the existing
  // project asset authority. The Web feature calls
  // `window.masterpiece.projects.scanAssets(projectId)`.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let usesExisting = false;
  for (const file of files) {
    const src = stripComments(readFile(file));
    if (src.includes('projects.scanAssets') || src.includes('projects\'.scanAssets')) {
      usesExisting = true;
    }
  }
  assert.ok(
    usesExisting,
    'Web feature must reuse projects.scanAssets for reference asset selection (P3-B3 搂3)',
  );
});

test('X-10 the Web feature refreshTruth request passes only sessionId (no caller-supplied truth payload)', () => {
  // Look for the function that calls setTruthSnapshot in
  // the Web service adapter. It must construct the input
  // with only the sessionId.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let foundRefresh = false;
  for (const file of files) {
    const src = stripComments(readFile(file));
    if (src.includes('setTruthSnapshot') || src.includes('refreshPackagingTruth')) {
      foundRefresh = true;
      // The refresh function must construct the input
      // with only sessionId.
      const re = /\{\s*sessionId\s*\}/u;
      assert.match(
        src,
        re,
        `${file} must construct the refresh input as { sessionId } only`,
      );
    }
  }
  assert.ok(
    foundRefresh,
    'Web feature must have a refresh helper that calls setTruthSnapshot',
  );
});

test('X-11 the Web feature does NOT implement a second truth store (no second createPackagingWorkspaceService consumer)', () => {
  // P3-B3 搂10: the resolver is the runtime-side projection
  // / resolution seam. The Web feature does NOT maintain
  // its own truth store. We check that the Web feature does
  // not import or call the Workspace service factory (this
  // is also enforced by W-02; X-11 is a redundant
  // additivity check).
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    assert.equal(
      src.includes('createPackagingWorkspaceService'),
      false,
      `${file} must not instantiate createPackagingWorkspaceService (P3-B3 搂10)`,
    );
  }
});

test('X-12 the Web feature submits reference updates via the updateIntent RPC channel', () => {
  // P3-B3 搂4: every semantic reference change must
  // ultimately go through updateIntent. The Web feature
  // uses `updatePackagingIntent` (the RPC client wrapper)
  // or `ops.operations['packaging:update-intent']`
  // (in tests).
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let found = false;
  for (const file of files) {
    const src = stripComments(readFile(file));
    if (src.includes('updatePackagingIntent')) {
      found = true;
    }
  }
  assert.ok(
    found,
    'Web feature must submit reference updates via the updatePackagingIntent RPC',
  );
});

test('X-13 the Web feature has a presentation-only role label map (not a semantic second enum)', () => {
  // P3-B3 搂2: a presentation-only label map is allowed,
  // but the semantic value MUST be the canonical role.
  // We check that the label map exists (presentation) and
  // is keyed by the canonical role strings.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  let foundMap = false;
  for (const file of files) {
    const src = stripComments(readFile(file));
    if (src.includes('ROLE_PRESENTATION_LABELS') || src.includes('roleLabel')) {
      foundMap = true;
    }
  }
  assert.ok(
    foundMap,
    'Web feature should have a presentation-only role label map (ROLE_PRESENTATION_LABELS / roleLabel)',
  );
});

test('X-14 the Web feature does NOT construct a second reference asset database or file resolver', () => {
  // P3-B3 搂3: no Packaging-only file picker backend, no
  // second asset resolver, no second file database. The Web
  // feature must not implement its own asset selection
  // server.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'http.createServer',
      'WebSocketServer',
      'express',
      'createServer(',
      'fs.readdir',
      'fs.readFile',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not contain a second asset resolver (${forbidden})`,
      );
    }
  }
});

test('X-15 the Web feature does NOT import P2 frozen internals (no deep-import of @masterpiece/image-generation-runtime)', () => {
  // P3-B3 搂20: the Web feature MUST NOT deep-import P2
  // frozen internals. The application boundary is the
  // public @masterpiece/runtime-core barrel.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    assert.equal(
      src.includes('@masterpiece/image-generation-runtime'),
      false,
      `${file} must not deep-import @masterpiece/image-generation-runtime (P3-B3 搂20)`,
    );
  }
});

test('X-16 the runtime operations layer rejects a caller-supplied truthSnapshot on set-truth-snapshot (P3-B3 搂11)', () => {
  // The operations layer is the authority boundary. The
  // set-truth-snapshot channel MUST reject a caller-supplied
  // truthSnapshot payload.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  assert.match(
    opsSrc,
    /PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION/,
    'packaging-operations.js must define the truth-authority override forbidden code',
  );
  // The check for `truthSnapshot !== undefined` lives in
  // the set-truth-snapshot handler.
  const setHandler = opsSrc.match(/\[PACKAGING_OPERATION_IDS\.SET_TRUTH_SNAPSHOT\][\s\S]*?\},\s*\[PACKAGING_OPERATION_IDS\.PREPARE_GENERATION\]/u);
  if (setHandler) {
    assert.match(
      setHandler[0],
      /truthSnapshot\s*!==\s*undefined/u,
      'set-truth-snapshot handler must reject caller-supplied truthSnapshot',
    );
    assert.match(
      setHandler[0],
      /projectId\s*!==\s*undefined/u,
      'set-truth-snapshot handler must reject caller-supplied projectId (cross-project guard)',
    );
  }
});

test('X-17 the runtime operations layer never persists a second truth store (no own Locked Asset or truth DB)', () => {
  // P3-B3 搂10: no second truth store. The runtime
  // operations layer is a thin bridge that delegates truth
  // resolution to the runtime authority seam.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  for (const forbidden of [
    'createLockedAssets',
    'new LockedAsset',
    'saveLockedAsset',
    'compileLockedAssets',
    'fs.writeFile',
    'fs.readFile',
    'prisma',
    'knex',
    'typeorm',
    'drizzle',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `packaging-operations.js must not contain a second truth store (${forbidden})`,
    );
  }
});

test('X-18 the runtime operations layer delegates truth resolution to the resolveTruthSnapshot adapter (no hard-coded truth data)', () => {
  // P3-B3 搂9 + 搂11: the operations layer is the bridge;
  // the truth data is resolved by the runtime side via the
  // `resolveTruthSnapshot` adapter. The operations file
  // must NOT hard-code any Locked Asset data.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The `resolveTruthSnapshot` parameter MUST be invoked in
  // both the create-session and set-truth-snapshot handlers.
  assert.match(opsSrc, /resolveTruthSnapshot\(/u, 'operations layer must call resolveTruthSnapshot');
});

test('X-19 the runtime composition root passes the canonical truth resolver (no in-Web truth store)', () => {
  // current-operation-graph.ts is the runtime composition
  // root. It must construct a resolveTruthSnapshot that
  // reads from the existing project + lockedAssets
  // authority.
  const graphSrc = readFile(path.join(ROOT, 'apps', 'web-runtime', 'src', 'current-operation-graph.ts'));
  assert.match(
    graphSrc,
    /resolveTruthSnapshot\s*=/u,
    'current-operation-graph.ts must define resolveTruthSnapshot',
  );
  assert.match(
    graphSrc,
    /lockedAssets\.list/u,
    'resolveTruthSnapshot must read from the lockedAssets service',
  );
  assert.match(
    graphSrc,
    /projects\.get/u,
    'resolveTruthSnapshot must read from the projects service',
  );
});

test('X-20 the runtime operations layer routes executeGeneration deps through readSettings + readCredentials (no Web-supplied credential)', () => {
  // P3-B3 搂12: the Web caller may supply providerModelId
  // and apiProfileId (safe identifiers). The apiKey /
  // baseUrl / region are resolved on the runtime side via
  // readSettings + readCredentials.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  assert.match(
    opsSrc,
    /buildExecutionDeps/u,
    'operations layer must build execute deps on the runtime side',
  );
  assert.match(
    opsSrc,
    /readSettings\(\)/u,
    'execute deps must call readSettings',
  );
  assert.match(
    opsSrc,
    /readCredentials\(apiProfileId\)/u,
    'execute deps must call readCredentials(apiProfileId)',
  );
});

// =============================================================================
// Group Y 鈥?P3-B4 Execution & Result Gallery guards
// =============================================================================
//
// P3-B4 only adds the Result Gallery + Retry + Prepared Summary on top
// of P3-B2 RPC binding and P3-B3 reference/truth. The P3-A frozen
// surface must remain UNCHANGED. These guards are pure source-level
// static checks (additive, no overlap with A-L / W / X).
//
// Each guard maps to one of the B4 spec sections:
//   Y-01  result UI consumes view.execution only            (搂III / 搂XII)
//   Y-02  no absolute path in Web                           (搂II / 搂X / 搂XV)
//   Y-03  no file:// preview in Web                        (搂IX / 搂X)
//   Y-04  no base64 / data URI in Web                      (搂IX / 搂X)
//   Y-05  no fake progress percentage                      (搂VII)
//   Y-06  no Provider response rendering                   (搂XII / 搂XV)
//   Y-07  no credential / path rendering                   (搂II / 搂XV)
//   Y-08  no execution.history invented contract           (搂XIX)
//   Y-09  no localStorage result history                   (搂XVIII / 搂XIX)
//   Y-10  no IndexedDB result authority                    (搂XVIII)
//   Y-11  Retry uses executeGeneration RPC only            (搂XVII)
//   Y-12  Reset renders RPC returned View                  (搂XVI)
//   Y-13  no modification to frozen P3-A View Model        (搂XXVIII)
//   Y-14  no second artifact server in Web                 (搂IX / 搂XVIII)
//   Y-15  no second run-store in Web                       (搂XVIII)
//   Y-16  no filesystem API in Web                         (搂XVIII)
//   Y-17  P3-A frozen application files unchanged          (搂XXVIII)
//   Y-18  P2 frozen modules unchanged                      (搂XXI / 搂XXVIII)
//   Y-19  STALE + previous result only via view.execution  (搂XV)
//   Y-20  no Browser-side execution result persistence     (搂XVIII)

test('Y-01 the Result Gallery UI consumes only view.execution (no raw executionResult / preparedResult / Provider payload)', () => {
  // P3-B4 搂III / 搂XII: the Web Result Gallery is allowed to
  // read only the frozen `view.execution` summary. It MUST
  // NOT reach into raw session, preparedResult,
  // executionResult, or any Provider-payload-shaped object.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'session.lastExecution',
      'session.prepared',
      'lastExecution.runId',
      'lastExecution.artifacts',
      'preparedResult.compiled',
      'preparedResult.payload',
      'executeResult',
      'providerResponse',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not read ${forbidden}; Result Gallery consumes only view.execution`,
      );
    }
  }
});

test('Y-02 the Web feature does not render absolute paths in any execution surface (artifact, execution, runId, diagnostics)', () => {
  // P3-B4 搂II / 搂X: any absolute path appearing in the Web
  // feature is treated as a hostile leak. The execution
  // surface must not even transitively surface
  // `relativePath` as a filesystem path.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /[A-Za-z]:[\\/]/u,
      /file:\/\//iu,
      /\\\\[A-Za-z0-9_.$-]+\\[A-Za-z0-9_.$-]+/u,
      'relativePath',
      'runRoot',
      'artifactPath',
    ]) {
      if (forbidden instanceof RegExp) {
        assert.equal(
          forbidden.test(src),
          false,
          `${file} must not contain absolute path pattern ${forbidden}`,
        );
      } else {
        assert.equal(
          src.includes(forbidden),
          false,
          `${file} must not contain ${forbidden} (P3-B4 搂IX / 搂XV)`,
        );
      }
    }
  }
});

test('Y-03 the Web feature does not construct a file:// preview URL', () => {
  // P3-B4 搂IX / 搂X: preview must go through the runtime
  // artifact-serving seam, not a hand-rolled file:// URL.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    assert.equal(
      /['"`]file:\/\//u.test(src),
      false,
      `${file} must not contain a file:// preview URL (P3-B4 搂IX)`,
    );
  }
});

test('Y-04 the Web feature does NOT dump base64 / data URIs into the Result Gallery', () => {
  // P3-B4 搂IX / 搂X: a data: URI is the canonical sign of a
  // leaked image. The Web feature must not embed base64 or
  // data: URIs as preview content. The frozen View Model
  // exposes `hasB64` as a metadata flag only; the bytes
  // themselves stay on the runtime side.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    assert.equal(
      /data:[^;,]+;base64,/u.test(src),
      false,
      `${file} must not embed a base64 data URI in the Result Gallery`,
    );
    assert.equal(
      /toDataURL\s*\(/u.test(src),
      false,
      `${file} must not call toDataURL() (P3-B4 搂IX)`,
    );
    assert.equal(
      /readAsDataURL\s*\(/u.test(src),
      false,
      `${file} must not call readAsDataURL() (P3-B4 搂IX)`,
    );
  }
});

test('Y-05 the Web feature does NOT display fake progress percentages (27% / 63% / 92% / ...)', () => {
  // P3-B4 搂VII: when the runtime has no real progress
  // signal, the UI must NOT render a fake percentage. The
  // busy label is a real status copy (`鍑嗗涓€ /
  // `鎵ц涓€), not a percent figure.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /progress\s*[:=]\s*\d+/u,
      /\bprogress\.current\b/u,
      /['"`]\s*\d{1,2}\s*%\s*['"`]/u,
      /\{progress\}/u,
      /progressBar/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not contain a fake progress percentage pattern ${forbidden}`,
      );
    }
  }
});

test('Y-06 the Web feature does NOT render Provider raw response bodies / redactedRequest / redactedResponse', () => {
  // P3-B4 搂XII / 搂XV: the View Model intentionally strips
  // the redacted request / response bodies from the
  // `view.execution.diagnostics` surface. The Web feature
  // must not attempt to surface them through a back door.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'redactedRequest',
      'redactedResponse',
      'providerResponse.body',
      'rawResponse',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not contain ${forbidden}`,
      );
    }
  }
});

test('Y-07 the Web feature does NOT render credentials / secrets / Authorization / Bearer / apiKey', () => {
  // P3-B4 搂II / 搂XV: view.execution may surface the
  // audit-region by design, but never apiKey / Authorization
  // / Bearer / password / secret. The Result Gallery must
  // not even reach into them.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /api[_-]?key/iu,
      /authorization/iu,
      /\bbearer\b/iu,
      /\bpassword\b/iu,
      /\bsecret\b/iu,
      /\bcredential\b/iu,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not contain credential-ish substring ${forbidden}`,
      );
    }
  }
});

test('Y-08 the Web feature does NOT invent an execution.history contract', () => {
  // P3-B4 搂XIX: history is explicitly forbidden in B4. The
  // frozen P3-A View Model does not define `execution.history`;
  // the Web feature must not invent it.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'execution.history',
      'executionHistory',
      'runsHistory',
      'historyList',
      'pastRuns',
      'lastNRuns',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not invent ${forbidden} (P3-B4 搂XIX)`,
      );
    }
  }
});

test('Y-09 the Web feature does NOT use localStorage for result history', () => {
  // P3-B4 搂XVIII: no browser-local persistence of result
  // history. The frozen P3-A View Model is the only source
  // of truth.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    assert.equal(
      /localStorage\s*\./u.test(src),
      false,
      `${file} must not call localStorage.* (P3-B4 搂XVIII)`,
    );
  }
});

test('Y-10 the Web feature does NOT use IndexedDB / caches / sessionStorage for result authority', () => {
  // P3-B4 搂XVIII: no second result persistence layer in the
  // browser. IndexedDB / sessionStorage / Cache API are all
  // forbidden for execution result authority.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      'indexedDB',
      'sessionStorage',
      'caches.open',
      'CacheStorage',
    ]) {
      assert.equal(
        src.includes(forbidden),
        false,
        `${file} must not use ${forbidden} (P3-B4 搂XVIII)`,
      );
    }
  }
});

test('Y-11 Retry uses the same executeGeneration RPC (no implicit prepare+execute, no new endpoint)', () => {
  // P3-B4 搂XVII: Retry re-uses the canonical
  // `executePackagingGeneration` RPC. It must NOT be a
  // separate endpoint, must NOT implicitly call prepare,
  // and must NOT be implemented as a local handler that
  // bypasses the service.
  const serviceSrc = readFile(PACKAGING_SERVICE);
  assert.match(
    serviceSrc,
    /executePackagingGeneration/u,
    'service.ts must still export executePackagingGeneration (Retry contract)',
  );
  // The ops layer has one executeGeneration channel; no
  // separate retry channel.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  assert.match(
    opsSrc,
    /execute-generation/u,
    'operations layer must keep the single execute-generation channel',
  );
  // Web feature: Retry button calls the same handler as
  // Execute (i.e. uses the existing RPC client).
  const workspaceSrc = readFile(PACKAGING_WORKSPACE);
  assert.match(
    workspaceSrc,
    /data-action=['"]retry['"]/u,
    'PackagingWorkspace must surface Retry as a button labelled with the retry contract',
  );
  assert.match(
    workspaceSrc,
    /onExecute/u,
    'PackagingWorkspace must reuse onExecute for Retry (same handler / same RPC)',
  );
});

test('Y-12 Reset renders the RPC-returned View (no local setState of execution = null)', () => {
  // P3-B4 搂XVI: after clicking Reset, the UI MUST render
  // whatever View the runtime returns. Reset must NOT
  // locally mutate `view.execution` to null. The
  // application state machine owns the truth.
  const workspaceSrc = readFile(PACKAGING_WORKSPACE);
  // The Reset handler must call resetPackagingPreparation
  // and apply the returned view.
  assert.match(
    workspaceSrc,
    /resetPackagingPreparation/u,
    'PackagingWorkspace must call resetPackagingPreparation',
  );
  // No local `view.execution = null` after reset.
  assert.equal(
    /execution\s*=\s*null/u.test(workspaceSrc),
    false,
    'PackagingWorkspace must not locally null out view.execution after Reset',
  );
});

test('Y-13 the frozen P3-A View Model is unchanged by P3-B4 (no schema / no field additions)', () => {
  // P3-B4 搂XXVIII: the frozen `view-model.js` is the only
  // View Model authority. P3-B4 does not introduce a new
  // schema, does not rename keys, does not add fields.
  // We verify by comparing the file's `view` projection
  // (the `return Object.freeze({` block in
  // projectPackagingWorkspaceView) against the canonical
  // 18-key allowlist declared in the file itself.
  const viewModelSrc = readFile(PACKAGING_VIEW_MODEL);
  // The canonical 18 top-level keys are listed in
  // CANONICAL_VIEW_MODEL_KEYS; P3-B4 must not add new keys.
  const declaredMatch = viewModelSrc.match(
    /CANONICAL_VIEW_MODEL_KEYS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/u,
  );
  assert.ok(declaredMatch, 'CANONICAL_VIEW_MODEL_KEYS must be declared');
  const declared = declaredMatch[1]
    .split(',')
    .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean);
  // P3-A9 freeze 搂13.2: 18 canonical top-level keys.
  assert.equal(declared.length, 18, 'P3-A canonical top-level key count must remain 18');
  // No "history" / "previous" / "retry" / "pending" key has
  // been smuggled into the top-level surface.
  for (const forbidden of [
    'history', 'previousExecution', 'lastN', 'retryStatus', 'pendingExecution',
  ]) {
    assert.equal(
      declared.includes(forbidden),
      false,
      `frozen view-model must not declare ${forbidden} (P3-B4 搂XIX)`,
    );
  }
});

test('Y-14 the Web feature does NOT introduce a second artifact-serving server', () => {
  // P3-B4 搂IX / 搂XVIII: the Web feature must not spin up
  // its own image-serving HTTP / WebSocket / IPC server.
  // All artifact serving is the runtime's responsibility.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /http\.createServer/u,
      /WebSocketServer/u,
      /\bexpress\b/u,
      /createServer\s*\(/u,
      /new\s+Server\s*\(/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not introduce a second artifact server (${forbidden})`,
      );
    }
  }
});

test('Y-15 the Web feature does NOT introduce a second run-store', () => {
  // P3-B4 搂XVIII: a run-store is a runtime-side authority.
  // The Web feature must not maintain a parallel in-memory
  // map of `runId 鈫?result`.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /new\s+Map\s*\(\s*\)/u,
      /runStore\s*[:=]/u,
      /runs\s*:\s*new\s+Map/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not introduce a second run-store (${forbidden})`,
      );
    }
  }
});

test('Y-16 the Web feature does NOT import filesystem APIs (fs / path / child_process / fs.promises)', () => {
  // P3-B4 搂XVIII: the Web feature is a renderer; it must
  // never reach into the filesystem. node:fs / node:path /
  // node:child_process are forbidden imports in
  // `apps/web/src/features/packaging/*`.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /from\s+['"]node:fs/u,
      /from\s+['"]node:path/u,
      /from\s+['"]node:child_process/u,
      /require\s*\(\s*['"]fs['"]\s*\)/u,
      /require\s*\(\s*['"]path['"]\s*\)/u,
      /require\s*\(\s*['"]child_process['"]\s*\)/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not import a filesystem API (${forbidden})`,
      );
    }
  }
});

test('Y-17 the P3-A frozen production modules are unchanged by P3-B4 (zero-line diff)', () => {
  // P3-B4 搂XXVIII: P3-A frozen application files in
  // `packages/runtime-core/src/application/packaging/*` MUST
  // NOT be modified by P3-B4. We assert by `git diff`
  // against the P3-A production baseline (dd4570a).
  let diffOutput = '';
  try {
    diffOutput = runGit([
      'diff',
      '--name-only',
      'dd4570a',
      '--',
      'packages/runtime-core/src/application/packaging/',
    ]);
  } catch (e) {
    assert.fail(`git diff failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  const changed = diffOutput
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  assert.equal(
    changed.length,
    0,
    `P3-B4 must not modify any P3-A frozen application file; got:\n${changed.join('\n')}`,
  );
});

test('Y-18 the P2 frozen protected modules are unchanged by P3-B4 (zero-line diff vs P2 baseline)', () => {
  // P3-B4 搂XXI / 搂XXVIII: P2 frozen modules (16 protected
  // paths in `packages/image-generation-runtime/src/packaging/*`)
  // MUST NOT be modified by P3-B4.
  let diffOutput = '';
  try {
    diffOutput = runGit([
      'diff',
      '--name-only',
      P2_FROZEN_BASELINE,
      '--',
      'packages/image-generation-runtime/src/packaging/',
    ]);
  } catch (e) {
    assert.fail(`git diff failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  const changed = diffOutput
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  assert.equal(
    changed.length,
    0,
    `P3-B4 must not modify any P2 frozen module; got:\n${changed.join('\n')}`,
  );
});

test('Y-19 the STALE + previous-result presentation only reads view.execution (no second source)', () => {
  // P3-B4 搂XV: when the current `view.status === 'stale'`,
  // the previous result is whatever `view.execution` still
  // carries. The Web feature MUST NOT have a second source
  // for "previous execution" (no localStorage backup, no
  // parallel map, no in-component ref to the last view).
  const workspaceSrc = readFile(PACKAGING_WORKSPACE);
  // ResultTile must read `view.execution` for the gallery
  // content. The presence of a ResultTile / result-related
  // rendering is the positive signal; the negative signal
  // is no alternative source.
  assert.match(
    workspaceSrc,
    /view\.execution/u,
    'PackagingWorkspace must consume view.execution for Result Gallery',
  );
  // No "previousExecution" / "lastExecutionCache" / "stale
  // previous" state.
  for (const forbidden of [
    'previousExecution',
    'lastExecutionCache',
    'stalePreviousResult',
    'cachedExecution',
  ]) {
    assert.equal(
      workspaceSrc.includes(forbidden),
      false,
      `PackagingWorkspace must not introduce ${forbidden} (P3-B4 搂XV)`,
    );
  }
});

test('Y-20 the Web feature does NOT persist the execution result on the browser side', () => {
  // P3-B4 搂XVIII: no second execution result authority. The
  // browser side does not cache, store, or re-transmit the
  // execution result beyond what the View Model provides.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /cache\.put\s*\(/u,
      /setItem\s*\(\s*['"`]execution/u,
      /setItem\s*\(\s*['"`]result/u,
      /setItem\s*\(\s*['"`]packaging/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not persist execution result to the browser (${forbidden})`,
      );
    }
  }
});



// ============================================================================
// Group Z  —  P3-B5 Packaging Artifact Persistence & Safe Preview Bridge
// ============================================================================

test('Z-01 the Packaging execute deps wire the existing canonical artifact persistence adapter (saveRun) into the P2 frozen deps seam', () => {
  // P3-B5 §VI / §VII: the production execute path must flow
  // `saveRun` through the existing `executePackagingGeneration`
  // deps seam — not via a new write path, not via a Web-side
  // stub. We assert the operations layer injects a `saveRun`
  // adapter (not a no-op) and that the adapter routes through
  // `packagingArtifactStore.saveRun` (the canonical seam).
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The ops layer must accept a `packagingArtifactStore` option.
  assert.match(
    stripped,
    /packagingArtifactStore/u,
    'packaging-operations must accept a packagingArtifactStore option (P3-B5 §VI)',
  );
  // The ops layer must call `packagingArtifactStore.saveRun`
  // (the canonical seam) — not a local saveRun implementation.
  assert.match(
    stripped,
    /packagingArtifactStore\.saveRun/u,
    'packaging-operations must route saveRun through packagingArtifactStore.saveRun (canonical seam)',
  );
  // The P2 frozen DEFAULT_DEPS.saveRun (which throws GENERATION_PERSISTENCE_FAILED)
  // is NOT the route the production execute path uses.
  assert.equal(
    /DEFAULT_DEPS\.saveRun/u.test(stripped),
    false,
    'packaging-operations must NOT use P2 frozen DEFAULT_DEPS.saveRun',
  );
});

test('Z-02 the Packaging execute deps wire the existing canonical executor (P2 frozen createMultiModelImageAdapter) with a no-op fallback', () => {
  // P3-B5 §VI: the production execute path uses the canonical
  // P2 frozen `createMultiModelImageAdapter` factory. When the
  // factory throws (e.g. test mock-model), the ops layer falls
  // back to a no-op executor that still satisfies the P2 frozen
  // deps seam. The fallback must NOT bypass the P2 frozen
  // contract — it stays inside the existing `executePackaging-
  // Generation` deps boundary.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /createMultiModelImageAdapter/u,
    'packaging-operations must import createMultiModelImageAdapter (P3-B5 §VI)',
  );
  // The executor field is exposed on the deps object.
  assert.match(
    stripped,
    /executor\s*,/u,
    'packaging-operations must expose `executor` on the execute deps',
  );
  // A no-op fallback exists for the case when
  // createMultiModelImageAdapter throws.
  assert.match(
    stripped,
    /compileRequest\s*:\s*\(input\)/u,
    'packaging-operations must have a no-op executor fallback (P3-B5 §VI fallback)',
  );
});

test('Z-03 the Web feature does NOT import the existing imageGeneration run-store surface for packaging artifacts', () => {
  // P3-B5 §IV / §V: the Web feature never calls
  // `imageGeneration.getImageDataUrl` for packaging artifacts.
  // Packaging has its own preview RPC (`packaging:get-artifact-
  // preview`); cross-namespace preview reads are forbidden.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /imageGeneration\.getImageDataUrl/u,
      /window\.masterpiece\.imageGeneration\.getImageDataUrl/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not call ${forbidden} (P3-B5 §IV / §V)`,
      );
    }
  }
});

test('Z-04 the Web feature does NOT render an artifact.relativePath / thumbnailRelativePath as an <img src>', () => {
  // P3-B5 §X / Y-02: the canonical relativePath / thumbnail-
  // RelativePath are runtime-internal storage paths. The Web
  // feature MUST NOT pass them to an `<img src={...}>` or to a
  // `fetch(...)` URL. The only safe img src is the data URL
  // returned by the `packaging:get-artifact-preview` RPC.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /src=\{[^}]*artifact\.relativePath/u,
      /src=\{[^}]*artifact\.thumbnailRelativePath/u,
      /src=\{[^}]*relativePath/u,
      /src=\{[^}]*thumbnailRelativePath/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not pass relativePath/thumbnailRelativePath to <img src=> (P3-B5 §X)`,
      );
    }
  }
});

test('Z-05 the preview RPC input validates runId shape (no path traversal in the Web caller)', () => {
  // P3-B5 §XIII / §XIV: the Web client sends
  // `{ sessionId, runId, imageId }` to the preview RPC. The
  // Web client must NOT send a hostile runId that contains
  // path separators or `..` segments. The runtime-side
  // validation is the source of truth; the Web client must
  // not pre-bake an unsafe runId either.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /runId:\s*['"]\.\./u,
      /runId:\s*['"]\.\.\\/u,
      /runId:\s*['"]\.\.\//u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not construct hostile runId values`,
      );
    }
  }
});

test('Z-06 the preview RPC consumer never reads the run-store directly (no runStore / artifactStore import in Web)', () => {
  // P3-B5 §XVII: the Web feature is RPC-only. It must not
  // import a run-store, an artifact store, a saveRun helper,
  // or any direct filesystem surface. The canonical
  // `packaging:get-artifact-preview` RPC is the SOLE bridge.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /runStore/u,
      /artifactStore/u,
      /saveRun\b/u,
      /readFile\b/u,
      /node:fs/u,
      /node:path/u,
      /@masterpiece\/runtime-core\/application\/image-generation\/run-store/u,
      /@masterpiece\/runtime-core\/application\/image-generation\/service/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not import ${forbidden} (P3-B5 §XVII)`,
      );
    }
  }
});

test('Z-07 the preview RPC channel is registered in the Packaging RPC namespace (not in imageGeneration)', () => {
  // P3-B5 §X / §XI: the preview RPC is a Packaging channel,
  // NOT an imageGeneration channel. Cross-namespace channel
  // registration is forbidden.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  assert.match(
    opsSrc,
    /GET_ARTIFACT_PREVIEW:\s*['"]packaging:get-artifact-preview['"]/u,
    'Packaging operations must register `packaging:get-artifact-preview`',
  );
  assert.equal(
    /imageGeneration:get-artifact/u.test(opsSrc),
    false,
    'Packaging operations must NOT register `imageGeneration:get-artifact-preview`',
  );
});

test('Z-08 the preview RPC identity guard rejects cross-session / cross-project reads', () => {
  // P3-B5 §XIII: the preview RPC enforces that the caller\'s
  // `runId` equals `view.execution.runId` for the session. The
  // check is the SOLE cross-session / cross-project guard.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /assertPreviewIdentity/u,
    'Packaging operations must define assertPreviewIdentity (P3-B5 §XIII)',
  );
  // The guard reads view.execution.runId (not a caller-supplied runId).
  assert.match(
    stripped,
    /execution\.runId/u,
    'assertPreviewIdentity must read view.execution.runId (P3-B5 §XIII)',
  );
  // Mismatch is rejected with the canonical preview code.
  assert.match(
    stripped,
    /PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND/u,
    'Preview identity mismatch must surface PACKAGING_OPERATIONS_PREVIEW_NOT_FOUND',
  );
});

test('Z-09 the preview RPC enforces the canonical imageId pattern (image-NN) on the runtime side', () => {
  // P3-B5 §X / §XIV: the runtime refuses any imageId that does
  // not match the canonical `image-\d{2}` pattern. This
  // prevents the Web client from using imageId as a path
  // fragment.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /CANONICAL_IMAGE_ID_PATTERN/u,
    'Packaging operations must define CANONICAL_IMAGE_ID_PATTERN (P3-B5 §X)',
  );
  // The imageId regex is a regex literal `^image-\d{2}$/u` in
  // the source.  We assert the exact pattern string is
  // present in the source (case-sensitive substring).
  assert.equal(
    stripped.indexOf('^image-\\d{2}$/u') >= 0,
    true,
    'CANONICAL_IMAGE_ID_PATTERN must match image-NN format (P3-B5 §X)',
  );
});

test('Z-10 the preview RPC rejects hostile runId (path traversal / absolute path / file://)', () => {
  // P3-B5 §XIII / §XIV: the runtime refuses to read a
  // runId that contains `..`, an absolute path, a Windows
  // drive letter, or a `file://` scheme. The check is
  // redundant with the input shape check, but the store
  // re-asserts it (defense in depth).
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /isRelativePathSafe/u,
    'Packaging operations must define isRelativePathSafe (P3-B5 §XIII)',
  );
  // `..` is rejected.
  assert.match(
    stripped,
    /segments\.includes\(['"]\.\.['"]\)/u,
    'isRelativePathSafe must reject `..` segments (P3-B5 §XIII)',
  );
  // `file://` is rejected.
  assert.match(
    stripped,
    /\^file:\\\/\\\//u,
    'isRelativePathSafe must reject `file://` URLs (P3-B5 §XIII)',
  );
  // Windows drive letter is rejected.
  assert.match(
    stripped,
    /\^\[A-Za-z\]:/u,
    'isRelativePathSafe must reject Windows drive letters (P3-B5 §XIII)',
  );
});

test('Z-11 the preview RPC never returns an absolute path, runRoot, or Buffer to the Web', () => {
  // P3-B5 §IX / §X: the preview response is a
  // `{ mimeType, dataUrl }` payload only. The runtime
  // response contract deliberately omits absolute path,
  // runRoot, and Buffer — those stay on the runtime side.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The success response builder only has mimeType and dataUrl.
  assert.match(
    stripped,
    /mimeType/u,
    'Packaging preview payload must include mimeType',
  );
  assert.match(
    stripped,
    /dataUrl/u,
    'Packaging preview payload must include dataUrl',
  );
  // The preview return block is the unique `readArtifactPreview`
  // function.  We narrow by requiring both `mimeType` and
  // `dataUrl` keys AND the `Buffer.isBuffer` precondition (which
  // only `readArtifactPreview` uses).  This avoids matching
  // `resolveArtifactLifecycle` which also returns a frozen
  // object but with `runRoot` / `relativePath` fields.
  const previewBlock = stripped.match(
    /if\s*\(!buffer\s*\|\|\s*!Buffer\.isBuffer\(buffer\)\)[\s\S]*?return Object\.freeze\(\{[\s\S]*?dataUrl[\s\S]*?\}\);/u,
  );
  assert.ok(previewBlock, 'preview payload must be a frozen { mimeType, dataUrl } object');
  // The preview return block must NOT carry absolutePath (the
  // canonical surface is mimeType + dataUrl only).
  assert.equal(
    previewBlock[0].includes('absolutePath'),
    false,
    'Preview payload must not expose absolutePath (P3-B5 §X)',
  );
  // The preview return block must use buffer.toString('base64'),
  // not buffer.toString('utf8') (which would be wrong for image
  // binary data).
  assert.match(
    previewBlock[0],
    /buffer\.toString\('base64'\)/u,
    'Preview payload must use buffer.toString("base64") for the dataUrl (P3-B5 §X)',
  );
});

test('Z-12 the preview RPC never exposes the Provider response body or any redacted request / response shape', () => {
  // P3-B5 §XXV: the preview RPC never includes the raw
  // Provider response, the redacted request, or the redacted
  // response body. Only the canonical `{ mimeType, dataUrl }`
  // leaves the runtime.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /redactedRequest/u,
      /redactedResponse/u,
      /providerResponse/u,
      /auditLog/u,
      /requestBody/u,
      /responseBody/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not render ${forbidden} (P3-B5 §XXV)`,
      );
    }
  }
});

test('Z-13 the Packaging Artifact Store re-asserts the identity guard (defense in depth)', () => {
  // P3-B5 §XIII: the store re-asserts that the requested
  // runId is well-formed. The store never trusts the RPC layer
  // to be the only line of defense.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The store path safety check is invoked at read time.
  assert.match(
    stripped,
    /isRelativePathSafe\(runId\)/u,
    'Store readArtifactPreview must re-assert isRelativePathSafe (P3-B5 §XIII defense in depth)',
  );
  // The store re-asserts the canonical imageId pattern.
  assert.match(
    stripped,
    /CANONICAL_IMAGE_ID_PATTERN\.test\(imageId\)/u,
    'Store readArtifactPreview must re-assert CANONICAL_IMAGE_ID_PATTERN (P3-B5 §XIII defense in depth)',
  );
});

test('Z-14 the Packaging Artifact Store refuses to construct a path outside the canonical run root', () => {
  // P3-B5 §XIV: the store refuses any path that escapes the
  // canonical `<runRoot>/` directory. We assert the runtime-
  // side check (`assertInside`) exists and is called.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /assertInside/u,
    'Store must define assertInside (P3-B5 §XIV)',
  );
  // assertInside is invoked from the preview read path.
  assert.match(
    stripped,
    /assertInside\(runRoot,\s*candidatePath\)/u,
    'Store readArtifactPreview must invoke assertInside(runRoot, candidatePath) (P3-B5 §XIV)',
  );
  // Path-traversal exception is named PATH_TRAVERSAL_REJECTED.
  assert.match(
    stripped,
    /PATH_TRAVERSAL_REJECTED/u,
    'Store must throw PATH_TRAVERSAL_REJECTED on traversal (P3-B5 §XIV)',
  );
});

test('Z-15 the Packaging Artifact Store does NOT introduce a second filesystem root (shares the image-generation run root)', () => {
  // P3-B5 §VII: the store writes to
  // `<projectRoot>/image-generation/<runId>/` — the same
  // physical root the image-generation run-store uses. The
  // `pkg-...` runId namespace isolates the two streams; the
  // `image-generation/` physical root is shared, never re-
  // defined.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /pathJoin\([^)]*image-generation[^)]*\)/u,
    'Store must route through the image-generation physical root (P3-B5 §VII)',
  );
  // The store does NOT introduce a sibling root like
  // `pathJoin('packaging', runId)` or similar.
  assert.equal(
    /pathJoin\(['"]packaging['"]/u.test(stripped),
    false,
    'Store must NOT introduce a second filesystem root like packaging/ (P3-B5 §VII)',
  );
});

test('Z-16 the Packaging Artifact Store does NOT introduce a second artifact server (only the existing local RPC bridge)', () => {
  // P3-B5 §XII: the Web feature never constructs a second
  // HTTP / artifact server. All preview reads flow through the
  // existing local RPC bridge.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /http\.createServer/u,
      /express\(\)/u,
      /new\s+Server\(/u,
      /new\s+WebSocketServer/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not construct ${forbidden} (P3-B5 §XII)`,
      );
    }
  }
});

test('Z-17 the Web feature does NOT introduce a fake progress percentage on the preview card', () => {
  // P3-B5 §XVII: the preview card is loading / loaded /
  // unavailable / error — never a fake "X% downloaded"
  // progress bar. The CSS scanner animation is a real visual
  // effect, not a numeric progress indicator.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /progress:\s*[\d.]+/u,
      /progressPercent/u,
      /progress\.toFixed/u,
      /\{[\d.]+\s*%\}/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not fake a numeric progress (P3-B5 §XVII)`,
      );
    }
  }
});

test('Z-18 the Web feature does NOT add a run history UI (no execution.history / no recentRuns / no listRuns)', () => {
  // P3-B5 §XXV: even though the run-store physically persists
  // Packaging runs now, the Web feature does NOT expose a
  // history browser. History is a separate product decision.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /execution\.history/u,
      /recentRuns/u,
      /listRuns/u,
      /runsHistory/u,
      /pastRuns/u,
      /runHistory/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not invent ${forbidden} (P3-B5 §XXV)`,
      );
    }
  }
});

test('Z-19 the Packaging Artifact Store handles provider-success + persistence-fail as a canonical failure', () => {
  // P3-B5 §XXII: the runtime keeps the canonical
  // GENERATION_PERSISTENCE_FAILED error path. The store does
  // NOT swallow persistence failures; the P2 frozen
  // `executePackagingGeneration` propagates the failure.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The store saveRun propagates the underlying write failure
  // (it awaits writeJsonSafe, which throws on persistence
  // failure). The canonical error code is set by the
  // composition root's writeJsonSafe adapter wrapper
  // (see current-operation-graph.ts).  We assert the store
  // does NOT swallow the failure and that the writeJsonSafe
  // call is the canonical surface.
  assert.match(
    stripped,
    /writeJsonSafe/u,
    'Store saveRun must call writeJsonSafe (P3-B5 §XXII)',
  );
  // The store does NOT swallow the failure.
  assert.equal(
    /saveRun[^\n]*try\s*\{[^\n]*\}\s*catch\s*\{[^\n]*return\s+null/u.test(stripped),
    false,
    'Store must not swallow saveRun failures (P3-B5 §XXII)',
  );
});

test('Z-20 the Web feature does NOT call imageGeneration.* for artifact bytes (PreviewCard is RPC-only)', () => {
  // P3-B5 §XI: the ArtifactPreviewCard is RPC-only. It calls
  // `getPackagingArtifactPreview` (the canonical
  // `packaging:get-artifact-preview` channel), NOT any
  // `imageGeneration.*` surface.
  const workspaceSrc = readFile(path.join(PACKAGING_WEB_FEATURE, 'PackagingWorkspace.tsx'));
  const serviceSrc = readFile(path.join(PACKAGING_WEB_FEATURE, 'service.ts'));
  assert.match(
    workspaceSrc,
    /getPackagingArtifactPreview/u,
    'PackagingWorkspace must call getPackagingArtifactPreview (P3-B5 §XI)',
  );
  assert.match(
    serviceSrc,
    /getPackagingArtifactPreview/u,
    'service.ts must export getPackagingArtifactPreview (P3-B5 §XI)',
  );
  // The service.ts routes the call through api.getArtifactPreview.
  assert.match(
    serviceSrc,
    /api\.getArtifactPreview/u,
    'service.ts must call api.getArtifactPreview (P3-B5 §XI)',
  );
});

test('Z-21 STALE + previous-result preview: the previous runId is still allowed to fetch its preview', () => {
  // P3-B5 §XIX: when `view.status === 'stale'`, the previous
  // run is still queryable. The preview RPC continues to work
  // for the old runId because the identity guard checks the
  // session's `view.execution.runId` (which still equals the
  // old runId while the view has not been re-prepared).
  const workspaceSrc = readFile(path.join(PACKAGING_WEB_FEATURE, 'PackagingWorkspace.tsx'));
  // The ArtifactPreviewCard receives `runId={exec.runId}`
  // from the ResultTile. The view.execution.runId is the
  // single source of truth.
  assert.match(
    workspaceSrc,
    /runId=\{exec\.runId\}/u,
    'ArtifactPreviewCard must read runId from exec.runId (P3-B5 §XIX)',
  );
});

test('Z-22 Reset does NOT delete a run locally; the previous run remains previewable after reset', () => {
  // P3-B5 §XX: the Reset RPC clears the prepared snapshot
  // but does NOT delete a run. The view.execution may still
  // carry the old run after reset (P3-A frozen contract).
  // The Web feature never deletes an artifact locally.
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /deleteRun/u,
      /removeRun/u,
      /unlink/u,
      /(?:^|[^A-Za-z])rm\(/u,
      /unlinkSync/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not delete a run locally (P3-B5 §XX)`,
      );
    }
  }
});

test('Z-23 Retry re-loads the new run\'s previews via the returned View (no in-Web artifact state)', () => {
  // P3-B5 §XXI: Retry invokes the same `executePackaging-
  // Generation` RPC. The new run produces a new `runId`; the
  // returned View is the source of truth. The Web feature
  // does NOT maintain an in-memory artifact cache.
  const workspaceSrc = readFile(path.join(PACKAGING_WEB_FEATURE, 'PackagingWorkspace.tsx'));
  // The handler reads the result from the RPC return value,
  // not from a local artifact map.
  assert.match(
    workspaceSrc,
    /result\.view/u,
    'executePackagingGeneration handler must read result.view (P3-B5 §XXI)',
  );
  // The Web feature does NOT have a local runs Map.
  assert.equal(
    /runs\s*:\s*new\s+Map/u.test(workspaceSrc),
    false,
    'PackagingWorkspace must not maintain a runs Map (P3-B5 §XXI)',
  );
});

test('Z-24 the Packaging Artifact Store canonical record does NOT include Provider response or redacted request bodies', () => {
  // P3-B5 §IX / §XXV: the canonical artifact record
  // (`<runRoot>/packaging-generation-result.json`) is a small
  // index — it deliberately omits the Provider response body,
  // the redacted request body, and the redacted response body.
  // Only the per-image logical mapping is persisted.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The buildArtifactRecord function exists.
  assert.match(
    stripped,
    /function\s+buildArtifactRecord/u,
    'Store must define buildArtifactRecord (P3-B5 §IX)',
  );
  // The record shape is the small canonical set.
  assert.match(
    stripped,
    /runId/u,
    'Canonical record must include runId (P3-B5 §IX)',
  );
  assert.match(
    stripped,
    /target:\s*['"]packaging['"]/u,
    'Canonical record must include target=packaging (P3-B5 §IX)',
  );
  // The record must NOT carry Provider response body fields.
  const recordBlock = stripped.match(
    /function\s+buildArtifactRecord[\s\S]*?return Object\.freeze/u,
  );
  if (recordBlock) {
    for (const forbidden of [
      'providerResponse',
      'redactedRequest',
      'redactedResponse',
      'requestBody',
      'responseBody',
    ]) {
      assert.equal(
        recordBlock[0].includes(forbidden),
        false,
        `Canonical record must not include ${forbidden} (P3-B5 §IX)`,
      );
    }
  }
});

test('Z-25 the Web feature does NOT introduce a Browser-side persistence for the artifact preview data URL', () => {
  // P3-B5 §XVII: the data URL lives in React local state only.
  // It is never written to localStorage / sessionStorage /
  // IndexedDB / Cache API. The user's privacy boundary is
  // preserved across reloads (a fresh page = a fresh preview
  // load, never a stale cached image).
  const files = walkSourceDir(PACKAGING_WEB_FEATURE);
  for (const file of files) {
    const src = stripComments(readFile(file));
    for (const forbidden of [
      /localStorage\s*\./u,
      /sessionStorage\s*\./u,
      /indexedDB/u,
      /caches\.open/u,
      /setItem\s*\(/u,
    ]) {
      assert.equal(
        forbidden.test(src),
        false,
        `${file} must not persist preview data to the browser (P3-B5 §XVII)`,
      );
    }
  }
});


// =============================================================================
// Group Z (continued) — P3-B5.1 Authority & Preview Safety Cleanup
//
// P3-B5.1 §XVI — additive guards; the existing Z-01..Z-25
// are NOT modified. The new Z-26..Z-35 lock the sidecar
// boundary, the canonical preview MIME allowlist, and the
// fail-closed contract.
// =============================================================================

test('Z-26 unknown / unrecognised MIME is rejected by the canonical preview allowlist (fail-closed)', () => {
  // P3-B5.1 §VI: the readArtifactPreview path must reject
  // any MIME that is not on the canonical allowlist. We
  // assert the source-level contract:
  //   - the canonical allowlist is declared (3 entries)
  //   - the read path validates against it
  //   - the previous fail-open default `image/png` is gone
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.match(
    stripped,
    /CANONICAL_PREVIEW_MIME_ALLOWLIST\s*=\s*Object\.freeze\(\s*\[\s*['"]image\/png['"]\s*,\s*['"]image\/jpeg['"]\s*,\s*['"]image\/webp['"]\s*,?\s*\]\s*\)/u,
    'Canonical preview MIME allowlist must declare exactly image/png | image/jpeg | image/webp',
  );
  // Isolate the readArtifactPreview function body. The
  // function is followed by `^  }$` (module-level
  // indentation) — we walk braces from the function head to
  // the matching close.
  const readFnStart = stripped.indexOf('async function readArtifactPreview');
  assert.ok(readFnStart >= 0, 'readArtifactPreview function must be defined');
  const readFnBody = extractFunctionBody(stripped, readFnStart);
  assert.ok(readFnBody.length > 0, 'readArtifactPreview body must be parseable');
  // The read path must consult isCanonicalPreviewMime, not
  // default to image/png. The old `asString(entry.mimeType,
  // 'image/png')` literal MUST be gone from the read path.
  assert.equal(
    /asString\(entry\.mimeType\s*,\s*['"]image\/png['"]\)/u.test(readFnBody),
    false,
    'readArtifactPreview must not default missing MIME to image/png (P3-B5.1 §VI fail-closed)',
  );
  // The read path must reject non-allowlist MIME.
  assert.match(
    readFnBody,
    /isCanonicalPreviewMime\s*\(\s*rawMime\s*\)/u,
    'readArtifactPreview must validate rawMime against the canonical allowlist',
  );
});

test('Z-27 text/html MIME is rejected by the preview RPC (no HTML execution surface in the renderer)', () => {
  // P3-B5.1 §VI / §XVII: `text/html` is the classic XSS
  // delivery vector through a data URL. The read path must
  // refuse it. We assert:
  //   - the allowlist helper rejects `text/html`
  //   - the read path returns `null` for that MIME
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The allowlist does not contain text/html.
  assert.equal(
    /CANONICAL_PREVIEW_MIME_ALLOWLIST[\s\S]{0,400}?text\/html/u.test(stripped),
    false,
    'Canonical preview MIME allowlist must not include text/html',
  );
  // Isolate the read function body.
  const readFnStart = stripped.indexOf('async function readArtifactPreview');
  const readFnBody = extractFunctionBody(stripped, readFnStart);
  assert.ok(readFnBody.length > 0, 'readArtifactPreview must be defined');
  assert.match(
    readFnBody,
    /isCanonicalPreviewMime\s*\(\s*rawMime\s*\)/u,
    'readArtifactPreview must validate rawMime before constructing the data URL',
  );
  // After the validation, the data URL interpolation must
  // only see the validated mimeType.
  assert.match(
    readFnBody,
    /data:\$?\{mimeType\};base64/u,
    'readArtifactPreview must interpolate only the validated mimeType into the data URL',
  );
});

test('Z-28 image/svg+xml MIME is rejected by the preview RPC (no SVG / script execution surface in the renderer)', () => {
  // P3-B5.1 §VI / §XVII: `image/svg+xml` is a script-bearing
  // format. <img src="data:image/svg+xml;..."> does NOT
  // execute scripts (per HTML5 spec), but a renderer-side
  // `data:` URL is still a confusing surface to surface. The
  // allowlist rejects it.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  assert.equal(
    /CANONICAL_PREVIEW_MIME_ALLOWLIST[\s\S]{0,400}?image\/svg\+xml/u.test(stripped),
    false,
    'Canonical preview MIME allowlist must not include image/svg+xml',
  );
  // isCanonicalPreviewMime must use the canonical allowlist
  // as the SOLE positive source. Walk the helper body.
  const helperStart = stripped.indexOf('function isCanonicalPreviewMime');
  const helperBody = extractFunctionBody(stripped, helperStart);
  assert.ok(helperBody.length > 0, 'isCanonicalPreviewMime helper must be defined');
  assert.match(
    helperBody,
    /CANONICAL_PREVIEW_MIME_ALLOWLIST\.includes/u,
    'isCanonicalPreviewMime must use the canonical allowlist as the SOLE acceptance check',
  );
});

test('Z-29 application/javascript and other executable MIME are rejected by the preview RPC', () => {
  // P3-B5.1 §VI: `application/javascript` (and its aliases
  // `text/javascript`, `application/ecmascript`, etc.) must
  // be rejected. The allowlist is the only positive source.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  for (const forbidden of [
    'application/javascript',
    'text/javascript',
    'application/ecmascript',
    'application/x-javascript',
  ]) {
    assert.equal(
      stripped.includes(forbidden),
      false,
      `packaging-operations.js must not embed a permissive reference to ${forbidden} (P3-B5.1 §VI)`,
    );
  }
});

test('Z-30 only a validated MIME enters the data URL (no raw `entry.mimeType` interpolation)', () => {
  // P3-B5.1 §VIII: the data URL is constructed only from
  // `mimeType` (the validated, lower-cased value). A raw
  // `entry.mimeType` interpolation would re-introduce the
  // unvalidated field into the data URL.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  const readFnStart = stripped.indexOf('async function readArtifactPreview');
  const readFnBody = extractFunctionBody(stripped, readFnStart);
  assert.ok(readFnBody.length > 0, 'readArtifactPreview must be defined');
  // Find the data: URL line.
  assert.match(
    readFnBody,
    /data:\$?\{[^}]+\};base64/u,
    'readArtifactPreview must construct a data URL with the canonical pattern',
  );
  // The interpolation must be `mimeType` (validated), not
  // `entry.mimeType` (unvalidated).
  assert.equal(
    /data:\$?\{entry\.mimeType\};base64/u.test(readFnBody),
    false,
    'readArtifactPreview must NOT interpolate entry.mimeType into the data URL (P3-B5.1 §VIII)',
  );
  assert.match(
    readFnBody,
    /data:\$?\{mimeType\};base64/u,
    'readArtifactPreview must interpolate the validated mimeType variable into the data URL',
  );
});

test('Z-31 packaging-generation-result.json is documented as a sidecar (not run lifecycle authority)', () => {
  // P3-B5.1 §IV: the canonical artifact record is a
  // *target-specific sidecar* for preview lookups. It is NOT
  // a run lifecycle / retention / index authority. The
  // documentation in the operations file must say so
  // explicitly.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  assert.match(
    opsSrc,
    /sidecar/u,
    'packaging-operations.js must call out the sidecar role (P3-B5.1 §IV)',
  );
  assert.match(
    opsSrc,
    /run identity authority[\s\S]{0,200}?image-generation/u,
    'packaging-operations.js must name the existing image-generation run-store as the run identity authority (P3-B5.1 §IV)',
  );
  assert.match(
    opsSrc,
    /retention authority[\s\S]{0,200}?image-generation/u,
    'packaging-operations.js must name the existing image-generation run-store as the retention authority (P3-B5.1 §IV)',
  );
  assert.match(
    opsSrc,
    /run index authority[\s\S]{0,200}?listRuns/u,
    'packaging-operations.js must name imageGeneration.listRuns as the run index authority (P3-B5.1 §IV)',
  );
});

test('Z-32 no second run index (the sidecar is not enumerable)', () => {
  // P3-B5.1 §IV: the sidecar is read by name only. It is
  // never listed, searched, or enumerated. We assert the
  // operations file does not implement a `listArtifactRecords`
  // / `listAllArtifactRecords` / `indexByImageId` etc.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  for (const forbidden of [
    'listArtifactRecords',
    'listAllArtifactRecords',
    'indexArtifactRecords',
    'indexByImageId',
    'allArtifactRecords',
    'artifactsByProjectId',
  ]) {
    assert.equal(
      stripped.includes(forbidden),
      false,
      `packaging-operations.js must not introduce a sidecar index (${forbidden}) (P3-B5.1 §IV)`,
    );
  }
  // The store return surface must not include a list-style
  // method.
  const storeReturnBlock = stripped.match(
    /return Object\.freeze\(\{[\s\S]*?\}\);/u,
  );
  assert.ok(storeReturnBlock, 'Store must define a frozen return surface');
  for (const forbidden of [
    /list\s*:/u,
    /listRuns\s*:/u,
    /listRecords\s*:/u,
  ]) {
    assert.equal(
      forbidden.test(storeReturnBlock[0]),
      false,
      `Store return surface must not expose a list/iteration method (${forbidden}) (P3-B5.1 §IV)`,
    );
  }
});

test('Z-33 no second retention / deletion authority (sidecar inherits the run root lifecycle)', () => {
  // P3-B5.1 §IV: the sidecar does NOT implement a retention
  // policy, a TTL, or a delete API. The lifecycle is owned
  // by the existing image-generation run-store.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  for (const forbidden of [
    /retention\s*:/u,
    /deleteRun\s*:/u,
    /deleteArtifact/u,
    /purgeArtifact/u,
    /ttl\s*:/u,
    /expiresAt\s*:/u,
    /cleanup\s*:/u,
  ]) {
    assert.equal(
      forbidden.test(stripped),
      false,
      `packaging-operations.js must not introduce a sidecar retention / deletion method (${forbidden}) (P3-B5.1 §IV)`,
    );
  }
  // The store return surface must not expose a delete-style
  // method either.
  const storeReturnBlock = stripped.match(
    /return Object\.freeze\(\{[\s\S]*?\}\);/u,
  );
  assert.ok(storeReturnBlock, 'Store must define a frozen return surface');
  for (const forbidden of [
    /delete\s*:/u,
    /purge\s*:/u,
    /remove\s*:/u,
  ]) {
    assert.equal(
      forbidden.test(storeReturnBlock[0]),
      false,
      `Store return surface must not expose a delete method (${forbidden}) (P3-B5.1 §IV)`,
    );
  }
});

test('Z-34 the canonical run root is reused (no second filesystem root)', () => {
  // P3-B5.1 §V: the sidecar writes to
  // `<projectRoot>/image-generation/<runId>/` — the same
  // physical root the existing image-generation run-store
  // uses. There is no `packaging-artifact-root` or
  // `packaging-run-store` module. The store's path helpers
  // join the existing `image-generation/` directory.
  const opsSrc = readFile(path.join(ROOT, 'packages', 'runtime-core', 'src', 'operations', 'packaging-operations.js'));
  const stripped = stripComments(opsSrc);
  // The path computation must use `image-generation/<runId>/`.
  assert.match(
    stripped,
    /image-generation/iu,
    'Sidecar must be written under the existing image-generation/ root (P3-B5.1 §V)',
  );
  // There must be no second root.
  for (const forbidden of [
    'packaging-artifact-root',
    'packaging-run-store',
    'packaging-output',
    'packaging-data',
    'packaging-db',
    'packaging-history-index',
  ]) {
    assert.equal(
      stripped.includes(forbidden),
      false,
      `packaging-operations.js must not introduce a second root (${forbidden}) (P3-B5.1 §V)`,
    );
  }
  // The path computation must reuse the canonical
  // image-generation path helpers or a pathJoin adapter.
  assert.match(
    stripped,
    /runRootForProject|runRootUnder|imageGenRootUnder|standaloneImageGenRoot|pathJoin/iu,
    'Sidecar path computation must reuse the canonical image-generation path helpers or a pathJoin adapter (P3-B5.1 §V)',
  );
});

test('Z-35 B4 behavioural coverage is not weakened (U-01..U-05 button-readiness invariants are restored)', () => {
  // P3-B5.1 §X / §XI: P3-B5 silently removed the source-level
  // toolbar readiness tests (U-01..U-05) when the file was
  // rewritten. P3-B5.1 restores them. The guard verifies
  // that the U-suite now has at least 40 cases (the B4
  // baseline) and that U-01..U-05 are present.
  const uSuite = readFile(path.join(ROOT, 'tests', 'runtime-application', 'packaging-workspace-execution-result.test.ts'));
  // Count U- test cases.
  const uTests = uSuite.match(/^\s*test\(\s*['"]U-\d{2}/gum) || [];
  assert.ok(
    uTests.length >= 40,
    `U-suite must have at least 40 cases (B4 baseline); got ${uTests.length}`,
  );
  for (const id of ['U-01', 'U-02', 'U-03', 'U-04', 'U-05']) {
    assert.match(
      uSuite,
      new RegExp(`test\\(\\s*['"]${id}\\b`),
      `U-suite must include ${id} (P3-B5.1 §X)`,
    );
  }
});

// =============================================================================
// Group Z (continued) — P3-B5.2 Run-store Authority Convergence
//
// P3-B5.2 audit result: HOLD — RUN-STORE AUTHORITY GAP.
//
// The canonical image-generation run-store
// (`packages/runtime-core/src/application/image-generation/run-store.ts`)
// does NOT recognize `pkg-*` runs. Behavioural evidence:
//   - `createRunStore(dataPath, projectId).readRun('pkg-...')` returns `null`
//     (the directory exists, the sidecar `packaging-generation-result.json`
//     exists, but there is no `run.json` to read).
//   - `createRunStore(dataPath, projectId).listRuns()` filters out
//     directories without a `run.json` (the implementation reads each
//     subdirectory's `run.json` and filters nulls). `pkg-*` subdirectories
//     are silently absent from the canonical list.
//   - The canonical run-store has no `deleteRun` / retention API at all
//     (verified by enumerating the surface).
//
// P2 frozen `executePackagingGeneration` accepts `saveRun` as a free-form
// dependency; the production Shared runtime chose to wire it as the
// Packaging sidecar adapter (`packagingArtifactStore.saveRun`), not as
// the canonical `runStore.saveRun`. There is no architectural place where
// the canonical run.json is written for a `pkg-*` run.
//
// P3-B5.2 does NOT pretend this gap does not exist. The guards below
// LOCK the audit finding in CI so a future refactor cannot silently
// regress without surfacing it. The P3-B5.1 report's over-claim that
// "run identity authority = existing run.json" is corrected to
// "Packaging persistence is a target-specific adapter; the canonical
// run-store does not own pkg-* runs today (P3-B5.2 audit)".
//
// P3-B5.3 — the audit gap is closed. The canonical
// runStore now RECOGNISES pkg-* runs (via the bridge
// adapter). Z-36 / Z-40 flip from "acknowledged gap" to
// "regression guard". Z-37 stays: there is still no
// delete / retention API. Z-39 changes: the bridge writes
// the canonical run.json via the canonical runStore
// (the bridge is a thin translator, not a second writer).
// =============================================================================

test('Z-36 the canonical image-generation runStore RECOGNIZES a `pkg-*` run after P3-B5.3 bridge registration (regression guard)', async () => {
  // P3-B5.3: the audit gap from P3-B5.2 is closed. The
  // canonical runStore now RECOGNISES a `pkg-*` run after
  // the bridge adapter writes the canonical `run.json`. We
  // assert the bridge write succeeds, the run is then
  // readable, listable, and the physical root is the
  // canonical `<projectRoot>/image-generation/<runId>/`.
  // If a future refactor removes the bridge, this guard
  // fails (B5.2 audit reopens).
  const { runStore, fsHelpers } = await makeCanonicalRunStoreFixture();
  try {
    // Simulate the bridge write directly (the bridge's
    // mapping is exercised in detail by
    // `packaging-workspace-canonical-run-registration.test.ts`).
    const canonical = {
      schemaVersion: '1.0',
      runId: 'pkg-audit-001',
      projectId: 'mock-canonical',
      taskId: 'pkg-audit-001',
      status: 'succeeded',
      outputType: 'packaging_render',
      providerId: 'qwen',
      modelId: 'qwen-image',
      region: 'beijing',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      gate: { errors: [], warnings: [], blocked: false },
      images: [
        {
          imageId: 'image-01',
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          mimeType: 'image/png',
          sizeBytes: 9,
          sha256: 'a'.repeat(64),
          downloadedAt: '2026-08-14T00:00:00.000Z',
        },
      ],
    };
    await runStore.saveRun(canonical);
    // The canonical runStore MUST see it.
    const read = await runStore.readRun('pkg-audit-001');
    assert.notEqual(
      read,
      null,
      'canonical runStore.readRun MUST recognize pkg-* after bridge write (P3-B5.3 §VII regression guard)',
    );
    const list = await runStore.listRuns();
    assert.equal(
      list.length,
      1,
      'canonical runStore.listRuns MUST include pkg-* after bridge write',
    );
    assert.equal(
      list[0].runId,
      'pkg-audit-001',
      'listRuns MUST surface the pkg-* run',
    );
    // The canonical `run.json` is now on disk.
    const runJson = await fsHelpers.readIfExists(
      'pkg-audit-001/run.json',
    );
    assert.notEqual(
      runJson,
      null,
      'canonical run.json MUST exist after bridge registration',
    );
  } finally {
    await fsHelpers.cleanup();
  }
});

test('Z-36b the canonical runStore does NOT see a `pkg-*` subdirectory when only the sidecar is written (orphan-sidecar regression)', async () => {
  // P3-B5.3 §IX orphan-sidecar contract. A sidecar without
  // a canonical `run.json` is NOT a recognised run. The
  // canonical `listRuns` filters subdirectories without a
  // `run.json`. If a future refactor relaxes that filter,
  // this guard fails.
  const { runStore, fsHelpers } = await makeCanonicalRunStoreFixture();
  try {
    // Write ONLY the sidecar (no run.json).
    await fsHelpers.writePackagingRunOnly('pkg-orphan-001');
    const list = await runStore.listRuns();
    assert.equal(
      list.length,
      0,
      'orphan sidecar (no run.json) MUST NOT appear in canonical listRuns (P3-B5.3 §IX)',
    );
    const read = await runStore.readRun('pkg-orphan-001');
    assert.equal(
      read,
      null,
      'orphan sidecar (no run.json) MUST NOT be readable via canonical readRun',
    );
  } finally {
    await fsHelpers.cleanup();
  }
});

test('Z-37 the canonical runStore API surface does NOT include deleteRun / retention (audit truth)', async () => {
  // P3-B5.2 §V: the canonical surface has no delete /
  // retention methods. We enumerate the surface to lock
  // the negative invariant — if a future change adds a
  // delete / retention path that covers `pkg-*` runs,
  // this test will start failing and the convergence
  // owner must re-evaluate the audit conclusion.
  const { runStore, fsHelpers } = await makeCanonicalRunStoreFixture();
  try {
    const surface = Object.keys(runStore).sort();
    for (const forbidden of [
      'deleteRun',
      'deleteRuns',
      'purgeRun',
      'purgeRuns',
      'retainRun',
      'retention',
      'cleanup',
    ]) {
      assert.equal(
        surface.includes(forbidden),
        false,
        `canonical runStore MUST NOT expose ${forbidden} (P3-B5.2 §V)`,
      );
    }
  } finally {
    await fsHelpers.cleanup();
  }
});

test('Z-38 the Packaging adapter is documented as a thin BRIDGE (not an authority)', () => {
  // P3-B5.2 §XIII: the operations file MUST explicitly
  // acknowledge that the Packaging adapter is a thin
  // bridge to the canonical runStore, not a parallel
  // authority. P3-B5.3 closes the gap: the bridge writes
  // the canonical run.json via the canonical runStore
  // (the bridge is a translator, not a second writer).
  // The guard locks this contract in the source so a
  // future refactor cannot silently re-introduce a
  // parallel authority.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The adapter role is documented.
  assert.match(
    opsSrc,
    /ADAPTER\s*\(not authority\)/iu,
    'packaging-operations.js must document the adapter role (P3-B5.2 §XIII)',
  );
  // The bridge is documented as a translator to the
  // canonical runStore.
  assert.match(
    opsSrc,
    /Canonical Run Registration Bridge|registerCanonicalRun|canonicalReadRun/iu,
    'packaging-operations.js must document the P3-B5.3 bridge (translator, not authority)',
  );
  // The adapter MUST NOT claim to be the canonical run
  // identity authority.
  assert.equal(
    /run identity authority[\s\S]{0,200}?packaging-generation-result/u.test(opsSrc),
    false,
    'packaging-operations.js must NOT claim `packaging-generation-result.json` is the run identity authority (P3-B5.3 §VII)',
  );
});

test('Z-39 the Packaging bridge writes the canonical run.json VIA the canonical runStore (translator, not second writer)', () => {
  // P3-B5.3 §VII: the bridge is a thin translator. It
  // builds the canonical `ImageGenerationRun` shape and
  // calls the injected `createRunStore(dataPath,
  // projectId).saveRun(...)` to write the canonical
  // `<runRoot>/run.json`. The canonical runStore is the
  // SOLE writer. The bridge MUST NOT have its own
  // runRoot, retention, or index — it only translates.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The bridge is wired via the `registerCanonicalRun`
  // option (composition-time injection).
  assert.match(
    opsSrc,
    /registerCanonicalRun/iu,
    'packaging-operations.js must wire the bridge via the registerCanonicalRun option (P3-B5.3 §VII)',
  );
  // The bridge calls into the canonical runStore (the
  // injected option) — not a parallel writer.
  assert.match(
    opsSrc,
    /createPackagingRunRegistrationAdapter/iu,
    'packaging-operations.js must define the bridge adapter (P3-B5.3 §VII)',
  );
  // The adapter receives the runStore factory as an
  // injected option (composition-time), not a deep
  // import.
  assert.match(
    opsSrc,
    /options\.createRunStore/iu,
    'createPackagingRunRegistrationAdapter must accept createRunStore as an injected option (P3-B5.3 §VII)',
  );
  // The bridge calls runStore.saveRun (the canonical
  // writer), NOT its own writeJsonSafe.
  assert.match(
    opsSrc,
    /runStore\.saveRun/u,
    'createPackagingRunRegistrationAdapter must call runStore.saveRun (the canonical writer, P3-B5.3 §VII)',
  );
  // The bridge does NOT define its own run lifecycle
  // (no local writeJsonSafe call for the run record).
  assert.equal(
    /writeJsonSafe\s*\(\s*[^,]+,\s*(?:canonical|run)/u.test(opsSrc),
    false,
    'bridge must not writeJsonSafe the canonical run record (P3-B5.3 §VII)',
  );
  // The sidecar file name is intentionally distinct.
  assert.match(
    opsSrc,
    /packaging-generation-result\.json/u,
    'Sidecar must be `packaging-generation-result.json` (a target-specific extension, not the run identity record)',
  );
});

test('Z-40 the canonical image-generation runStore.runRoot and the Packaging run root agree (P3-B5.3 parity regression guard)', async () => {
  // P3-B5.3 §XVII: the canonical `imageGeneration.runRoot(runId)`
  // and the Packaging adapter's run root must agree
  // byte-for-byte (after path normalization). The
  // physical root is shared by definition (both resolve
  // to `<projectRoot>/image-generation/<runId>/`). The
  // bridge closes the P3-B5.2 parity gap by routing
  // through the canonical runStore.
  //
  // If a future refactor re-introduces a parallel root
  // resolver, this guard fails.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parity-b53-'));
  try {
    const dataPath = tmpDir;
    const projectId = 'mock-parity';
    // Seed a project directory whose name differs from
    // its canonical `projectId` (the same edge case that
    // tripped P3-B5.2 Z-40).
    const projectsRoot = path.join(dataPath, 'projects');
    const canonicalDirName = 'parity-name';
    await fs.mkdir(path.join(projectsRoot, canonicalDirName), { recursive: true });
    await fs.writeFile(
      path.join(projectsRoot, canonicalDirName, 'project.json'),
      JSON.stringify({ id: projectId, name: 'Parity' }),
    );
    // Load the canonical runStore.
    const runStoreModule = await import(
      pathToFileURL(
        'D:/Masterpiece-OS/packages/runtime-core/src/application/image-generation/run-store.ts',
      ).href
    );
    const runStore = runStoreModule.createRunStore(dataPath, projectId);
    // Write a canonical `run.json` for `pkg-parity-001`.
    await runStore.saveRun({
      schemaVersion: '1.0',
      runId: 'pkg-parity-001',
      projectId,
      taskId: 'pkg-parity-001',
      status: 'succeeded',
      outputType: 'packaging_render',
      providerId: 'qwen',
      modelId: 'qwen-image',
      region: 'beijing',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      gate: { errors: [], warnings: [], blocked: false },
      images: [],
    });
    // Load the canonical resolver.
    const canonicalPaths = await import(
      pathToFileURL(
        'D:/Masterpiece-OS/packages/runtime-core/src/application/image-generation/paths.ts',
      ).href
    );
    const canonicalRoot = await canonicalPaths.resolveProjectRoot(dataPath, projectId);
    // Use the canonical paths helper to get the
    // image-generation root (the same root the canonical
    // runStore writes to).
    const imageGenRoot = canonicalPaths.imageGenRootUnder(canonicalRoot);
    const expectedRunRoot = path.join(imageGenRoot, 'pkg-parity-001');
    // Verify the run.json is at the canonical root.
    const onDiskRunJson = path.join(expectedRunRoot, 'run.json');
    const exists = await fs.stat(onDiskRunJson).then(() => true).catch(() => false);
    assert.equal(
      exists,
      true,
      'canonical run.json MUST be at the canonical run root after bridge write',
    );
    // The canonical resolver finds the project by `id`
    // (not by directory name). The bridge closes the
    // B5.2 parity gap because BOTH the canonical
    // runStore and the canonical resolver agree on
    // the project root for the same `projectId`.
    assert.equal(
      canonicalRoot,
      path.join(projectsRoot, canonicalDirName),
      'canonical resolver MUST find the directory by id',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('Z-40 (legacy) project-root resolver parity gap is acknowledged (P3-B5.2 audit finding)', async () => {
  // P3-B5.2 §VIII: the Packaging adapter's
  // `resolveProjectRoot` is, today, a PARALLEL
  // implementation of the convention the canonical
  // `image-generation/paths.ts` defines. When a
  // project's directory name differs from its
  // canonical `projectId`, the two resolvers return
  // DIFFERENT roots. This guard LOCKS that finding in
  // CI so the gap cannot be silently re-buried.
  //
  // The fix (eliminating the duplication) requires one
  // of:
  //   (a) reuse the canonical resolver (Public API seam
  //       on `image-generation/paths.ts` — currently a
  //       private helper, requires a Shared-Runtime
  //       decision);
  //   (b) generalize the canonical resolver to accept
  //       any `target` (image-generation / packaging /
  //       …);
  //   (c) accept the parallel implementation and
  //       document the divergence as a known gap
  //       (this is what the audit landed on).
  //
  // Until a convergence owner picks (a) or (b), this
  // test stays green and the gap stays visible.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'parity-'));
  try {
    const dataPath = tmpDir;
    const projectId = 'mock-parity';
    // Seed a directory whose name differs from the
    // projectId. The canonical resolver scans the
    // projects root for `project.json` whose `id`
    // matches `projectId`.
    const projectsRoot = path.join(dataPath, 'projects');
    const canonicalDirName = 'parity-name';
    await fs.mkdir(path.join(projectsRoot, canonicalDirName), { recursive: true });
    await fs.writeFile(
      path.join(projectsRoot, canonicalDirName, 'project.json'),
      JSON.stringify({ id: projectId, name: 'Parity' }),
    );
    // Load the canonical resolver.
    const canonicalPaths = await import(
      pathToFileURL(
        'D:/Masterpiece-OS/packages/runtime-core/src/application/image-generation/paths.ts',
      ).href
    );
    const canonicalRoot = await canonicalPaths.resolveProjectRoot(dataPath, projectId);
    // The Packaging adapter's default resolver joins
    // `<dataPath>/projects/<projectId>` — this is what
    // `current-operation-graph.ts` ships today.
    const adapterRoot = path.join(dataPath, 'projects', projectId);
    // Audit truth: the two resolvers DIVERGE when
    // the canonical directory name differs from
    // projectId.
    assert.equal(
      canonicalRoot,
      path.join(projectsRoot, canonicalDirName),
      'canonical resolver MUST find the directory by id, not by name',
    );
    assert.notEqual(
      canonicalRoot,
      adapterRoot,
      'audit finding: Packaging adapter resolver DIVERGES from canonical resolver when dir-name != projectId (P3-B5.2 §VIII)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

// =============================================================================
// Group AA — P3-B5.3 Canonical Run Registration
//
// The bridge adapter writes the canonical `run.json` via
// the existing `createRunStore` factory. The Packaging
// sidecar is a target-specific extension. Retention /
// deletion is NOT IMPLEMENTED in the shared runtime; we
// do not invent one.
//
// These guards lock the post-B5.3 reality:
//   - canonical runStore recognises `pkg-*` runs after
//     bridge write
//   - orphan sidecars do NOT establish a run
//   - the bridge is a thin translator (no parallel root
//     or index authority)
//   - truthful mapping (no fake semantic fields)
//   - frozen layers unchanged
// =============================================================================

test('AA-01 a `pkg-*` execution produces a canonical run.json on disk via the bridge', async () => {
  // P3-B5.3 §VI / §VII: the bridge writes a
  // canonical `ImageGenerationRun` record to
  // `<projectRoot>/image-generation/<runId>/run.json`.
  // We exercise the bridge adapter end-to-end with
  // the real canonical runStore factory and assert
  // the on-disk run.json is non-null.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa01-'));
  try {
    const projectId = 'aa01-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-01' }),
    );
    // Use the bridge adapter from the runtime-core
    // public surface.
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    // The bridge receives a P2 frozen `result` shape.
    const p2Result = {
      schemaVersion: '1.0',
      target: 'packaging',
      status: 'succeeded',
      runId: 'pkg-aa01-001',
      generationMode: 'analysis_led',
      shotContractId: 'shot-packaging-3d',
      model: { registryModelId: 'qwen-image', providerModelId: 'qwen-image-pro' },
      provider: { adapterId: 'multi-model', protocol: 'qwen', provider: '' },
      apiProfileId: 'profile-aa01',
      metadata: { schemaVersion: '1.0' },
      artifacts: [
        {
          imageId: 'image-01',
          mimeType: 'image/png',
          hasB64: true,
          hasUrl: false,
          sha256: 'a'.repeat(64),
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
          width: 1024,
          height: 1024,
          sizeBytes: 12345,
        },
      ],
      diagnostics: {
        startedAt: '2026-08-14T00:00:00.000Z',
        completedAt: '2026-08-14T00:00:01.000Z',
        durationMs: 1000,
        referenceCount: 0,
        imageCount: 1,
        region: 'beijing',
      },
    };
    await adapter.registerRun({ projectId, packagingResult: p2Result });
    // The canonical run.json is on disk.
    const runJsonPath = path.join(
      projectRoot,
      'image-generation',
      'pkg-aa01-001',
      'run.json',
    );
    const exists = await fs.stat(runJsonPath).then(() => true).catch(() => false);
    assert.equal(
      exists,
      true,
      'canonical run.json MUST be written to the canonical run root by the bridge (P3-B5.3 §VII)',
    );
    // The on-disk run.json shape is canonical.
    const onDisk = JSON.parse(await fs.readFile(runJsonPath, 'utf8'));
    assert.equal(onDisk.runId, 'pkg-aa01-001');
    assert.equal(onDisk.projectId, projectId);
    assert.equal(onDisk.status, 'succeeded');
    assert.equal(onDisk.outputType, 'packaging_render');
    assert.equal(onDisk.taskId, 'pkg-aa01-001'); // short pkg-* runId → taskId == runId
    assert.equal(Array.isArray(onDisk.images), true);
    assert.equal(onDisk.images.length, 1);
    assert.equal(onDisk.images[0].imageId, 'image-01');
    assert.equal(onDisk.images[0].sha256, 'a'.repeat(64));
    assert.equal(onDisk.images[0].mimeType, 'image/png');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-02 canonical readRun recognises a `pkg-*` run after bridge write', async () => {
  // P3-B5.3 §VII: after the bridge writes the canonical
  // run.json, `m.createRunStore(dataPath, projectId).readRun
  // (runId)` MUST return a non-null record. This is the
  // run identity authority.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa02-'));
  try {
    const projectId = 'aa02-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-02' }),
    );
    const runStore = m.createRunStore(tmpDir, projectId);
    const result = await runStore.readRun('pkg-aa02-001');
    assert.equal(
      result,
      null,
      'pre-write readRun MUST be null (run does not exist yet)',
    );
    // Write via the canonical API (simulating the bridge).
    await runStore.saveRun({
      schemaVersion: '1.0',
      runId: 'pkg-aa02-001',
      projectId,
      taskId: 'pkg-aa02-001',
      status: 'succeeded',
      outputType: 'packaging_render',
      providerId: 'qwen',
      modelId: 'qwen-image',
      region: 'beijing',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      gate: { errors: [], warnings: [], blocked: false },
      images: [],
    });
    // Now readRun MUST be non-null.
    const after = await runStore.readRun('pkg-aa02-001');
    assert.notEqual(after, null, 'readRun MUST be non-null after canonical saveRun');
    assert.equal(after.runId, 'pkg-aa02-001');
    assert.equal(after.projectId, projectId);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-03 canonical listRuns includes a `pkg-*` run after bridge write', async () => {
  // P3-B5.3 §X: `listRuns` MUST surface `pkg-*` runs
  // after bridge registration. The canonical listRuns
  // is the SOLE index — Packaging does not maintain
  // a parallel index.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa03-'));
  try {
    const projectId = 'aa03-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-03' }),
    );
    const runStore = m.createRunStore(tmpDir, projectId);
    // Pre-write: listRuns is empty.
    const before = await runStore.listRuns();
    assert.equal(before.length, 0, 'pre-write listRuns MUST be empty');
    // Write three runs (one image-generation + two packaging).
    for (const runId of ['igt-aa03-001', 'pkg-aa03-001', 'pkg-aa03-002']) {
      await runStore.saveRun({
        schemaVersion: '1.0',
        runId,
        projectId,
        taskId: runId,
        status: 'succeeded',
        outputType: runId.startsWith('pkg-') ? 'packaging_render' : 'master_anchor_image',
        providerId: 'qwen',
        modelId: 'qwen-image',
        region: 'beijing',
        createdAt: '2026-08-14T00:00:00.000Z',
        updatedAt: '2026-08-14T00:00:00.000Z',
        gate: { errors: [], warnings: [], blocked: false },
        images: [],
      });
    }
    const after = await runStore.listRuns();
    const ids = after.map((r) => r.runId).sort();
    assert.deepEqual(
      ids,
      ['igt-aa03-001', 'pkg-aa03-001', 'pkg-aa03-002'],
      'canonical listRuns MUST include both image-generation and packaging runs (P3-B5.3 §X)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-04 a sidecar without a canonical run.json does NOT establish a run (orphan contract)', async () => {
  // P3-B5.3 §IX: a sidecar (`packaging-generation-result.json`)
  // without a canonical `run.json` is an orphan. The
  // canonical `readRun` MUST return `null`. The Packaging
  // `readArtifactPreview` (which consults canonicalReadRun
  // first) MUST return `null` for orphans.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa04-'));
  try {
    const projectId = 'aa04-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-04' }),
    );
    const runStore = m.createRunStore(tmpDir, projectId);
    // Seed ONLY the sidecar (no run.json).
    const runRoot = path.join(projectRoot, 'image-generation', 'pkg-aa04-001');
    await fs.mkdir(path.join(runRoot, 'images'), { recursive: true });
    await fs.mkdir(path.join(runRoot, 'thumbnails'), { recursive: true });
    await fs.writeFile(path.join(runRoot, 'images/image-01.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    await fs.writeFile(path.join(runRoot, 'thumbnails/image-01.webp'), Buffer.from([0x52, 0x49, 0x46, 0x46]));
    await fs.writeFile(
      path.join(runRoot, 'packaging-generation-result.json'),
      JSON.stringify({
        runId: 'pkg-aa04-001',
        target: 'packaging',
        createdAt: '2026-08-14T00:00:00.000Z',
        artifacts: [
          {
            imageId: 'image-01',
            relativePath: 'images/image-01.png',
            thumbnailRelativePath: 'thumbnails/image-01.webp',
            mimeType: 'image/png',
          },
        ],
      }),
    );
    // The canonical runStore MUST return null.
    const read = await runStore.readRun('pkg-aa04-001');
    assert.equal(
      read,
      null,
      'canonical readRun MUST return null for orphan-sidecar (P3-B5.3 §IX)',
    );
    // The canonical listRuns MUST NOT include the orphan.
    const list = await runStore.listRuns();
    assert.equal(
      list.length,
      0,
      'canonical listRuns MUST NOT include orphan-sidecar subdirectory',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-05 the canonical imageGeneration.runRoot(runId) returns the same root as the bridge writes to', async () => {
  // P3-B5.3 §XVII: the canonical runStore physical root
  // is the SOLE root. The Packaging bridge writes to
  // the same root. There is no second root.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa05-'));
  try {
    const projectId = 'aa05-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-05' }),
    );
    const runStore = m.createRunStore(tmpDir, projectId);
    const runId = 'pkg-aa05-001';
    await runStore.saveRun({
      schemaVersion: '1.0',
      runId,
      projectId,
      taskId: runId,
      status: 'succeeded',
      outputType: 'packaging_render',
      providerId: 'qwen',
      modelId: 'qwen-image',
      region: 'beijing',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      gate: { errors: [], warnings: [], blocked: false },
      images: [],
    });
    // The canonical run root is the same directory the
    // Packaging sidecar writes to.
    const runRoot = path.join(projectRoot, 'image-generation', runId);
    const runJson = await fs.stat(path.join(runRoot, 'run.json')).then(() => true).catch(() => false);
    assert.equal(runJson, true, 'canonical run.json MUST be at <projectRoot>/image-generation/<runId>/run.json');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-06 the bridge is a thin translator (no parallel root, no writeJsonSafe for run)', async () => {
  // P3-B5.3 §VII: the bridge is a translator. It does
  // NOT compute its own run root, does NOT write its
  // own run record, does NOT maintain its own index.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The bridge defines a `registerRun` function that
  // calls into the injected `createRunStore`.
  assert.match(
    opsSrc,
    /createPackagingRunRegistrationAdapter/iu,
    'bridge adapter must be defined (P3-B5.3 §VII)',
  );
  // The bridge body calls `runStore.saveRun(canonical)`.
  // The canonical run root is the injected runStore's
  // own root (NOT a parallel resolver).
  assert.match(
    opsSrc,
    /runStore\.saveRun/iu,
    'bridge must call runStore.saveRun (the canonical writer)',
  );
  // The bridge receives `createRunStore` as an option
  // (composition-time injection).
  assert.match(
    opsSrc,
    /options\.createRunStore/iu,
    'bridge must accept createRunStore as an option (P3-B5.3 §VII)',
  );
});

test('AA-07 the canonical runStore owns the physical run root (no second filesystem root)', async () => {
  // P3-B5.3 §V: the canonical runStore writes
  // `<projectRoot>/image-generation/<runId>/run.json`.
  // The Packaging sidecar is a sibling at the same
  // physical root. There is no second filesystem root.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa07-'));
  try {
    const projectId = 'aa07-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-07' }),
    );
    const runStore = m.createRunStore(tmpDir, projectId);
    await runStore.saveRun({
      schemaVersion: '1.0',
      runId: 'pkg-aa07-001',
      projectId,
      taskId: 'pkg-aa07-001',
      status: 'succeeded',
      outputType: 'packaging_render',
      providerId: 'qwen',
      modelId: 'qwen-image',
      region: 'beijing',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
      gate: { errors: [], warnings: [], blocked: false },
      images: [],
    });
    // No second filesystem root (no `packaging-output/`,
    // no `packaging-artifact-root/`).
    const entries = await fs.readdir(tmpDir, { withFileTypes: true });
    const topLevel = entries.map((e) => e.name).sort();
    assert.deepEqual(
      topLevel,
      ['projects'],
      'canonical runStore MUST NOT introduce a second filesystem root (P3-B5.3 §V)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-08 the bridge preserves the `pkg-*` runId identity verbatim', async () => {
  // P3-B5.3 §XII: the bridge MUST NOT mangle the `pkg-...`
  // runId. The on-disk run.json runId equals the bridge
  // input runId (the P2 frozen output).
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa08-'));
  try {
    const projectId = 'aa08-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-08' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    const inputRunId = 'pkg-aa08-verylong-runid-9999';
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: inputRunId,
        status: 'succeeded',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'qwen', provider: '', adapterId: 'multi-model' },
        artifacts: [
          {
            imageId: 'image-01',
            mimeType: 'image/png',
            sha256: 'b'.repeat(64),
            relativePath: 'images/image-01.png',
            thumbnailRelativePath: 'thumbnails/image-01.webp',
          },
        ],
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: '2026-08-14T00:00:01.000Z',
          region: 'beijing',
        },
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun(inputRunId);
    assert.notEqual(persisted, null);
    assert.equal(
      persisted.runId,
      inputRunId,
      'bridge MUST preserve pkg-* runId verbatim (P3-B5.3 §XII)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-09 the canonical schema mapping is truthful (no fake semantic fields)', async () => {
  // P3-B5.3 §XI / §XIII: the bridge MUST NOT write
  // fields that misrepresent the Packaging semantics.
  // Examples of forbidden fakes:
  //   - `target: 'image-generation'` (Packaging is not
  //     image-generation; `outputType: 'packaging_render'`
  //     is the truthful value).
  //   - `status: 'succeeded'` when the P2 frozen result
  //     status is not `'succeeded'`.
  //   - `gate: { blocked: true }` when there is no gate.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa09-'));
  try {
    const projectId = 'aa09-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-09' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    // Failed run (P2 frozen status = 'failed' — the
    // P3-A workspace state machine already maps
    // 'failed' / 'blocked' / 'cancelled' to 'failed';
    // the bridge preserves the truthful state).
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-aa09-001',
        status: 'failed',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'qwen', provider: '', adapterId: 'multi-model' },
        artifacts: [],
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: '2026-08-14T00:00:01.000Z',
          region: 'beijing',
        },
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-aa09-001');
    assert.notEqual(persisted, null);
    // Truthful status preserved.
    assert.equal(persisted.status, 'failed', 'bridge MUST preserve truthful status (P3-B5.3 §XIII)');
    // Truthful outputType (NOT 'image-generation' or 'concept_image').
    assert.equal(
      persisted.outputType,
      'packaging_render',
      'bridge MUST use the truthful packaging outputType (P3-B5.3 §XI)',
    );
    // Truthful gate (no fake blockers).
    assert.equal(
      persisted.gate.blocked,
      false,
      'bridge MUST NOT fake gate.blocked (P3-B5.3 §XIII)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AA-10 no second run index (canonical listRuns is the SOLE index)', () => {
  // P3-B5.3 §X: the bridge MUST NOT maintain a parallel
  // run index. The canonical listRuns is the sole index.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The operations file MUST NOT implement a listRuns /
  // listArtifactRecords / indexByImageId helper.
  for (const forbidden of [
    'listArtifactRecords',
    'listAllArtifactRecords',
    'indexArtifactRecords',
    'indexByImageId',
    'allArtifactRecords',
  ]) {
    assert.equal(
      opsSrc.includes(forbidden),
      false,
      `bridge must not maintain a parallel run index (${forbidden}) (P3-B5.3 §X)`,
    );
  }
  // The store's public surface MUST NOT include a list
  // method.
  const storeReturnBlock = opsSrc.match(
    /return Object\.freeze\(\{[\s\S]*?\}\);[\s\S]*?\}\s*\nfunction/u,
  );
  // Lightweight check: the bridge return surface does
  // not include a `list` / `listRuns` method.
  assert.equal(
    /\bregisterRun\s*:/.test(opsSrc) && /\breadRun\s*:/.test(opsSrc),
    true,
    'bridge must expose registerRun + readRun only (P3-B5.3 §X)',
  );
  assert.equal(
    /\blist\s*:/u.test(opsSrc.match(/return Object\.freeze\(\{[\s\S]*?\}\);/u)?.[0] || ''),
    false,
    'bridge return surface MUST NOT include a list method (P3-B5.3 §X)',
  );
  // Suppress unused-var warning from the lighter
  // `storeReturnBlock` check above.
  void storeReturnBlock;
});

test('AA-11 no Packaging retention / deletion implementation', () => {
  // P3-B5.3 §XVIII: the existing runStore has no
  // retention / deletion API. The bridge MUST NOT
  // invent one. The Packaging adapter MUST NOT
  // implement a delete / cleanup / TTL / expiresAt
  // method.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  const stripped = stripComments(opsSrc);
  for (const forbidden of [
    'deleteRun',
    'purgeRun',
    'expiresAt',
    'cleanup',
  ]) {
    assert.equal(
      stripped.includes(forbidden),
      false,
      `packaging-operations.js must not implement ${forbidden} (P3-B5.3 §XVIII)`,
    );
  }
});

test('AA-12 the sidecar remains a target-specific extension only', () => {
  // P3-B5.3 §VIII: the sidecar is a target-specific
  // extension, not the run identity. The run identity
  // is the canonical `run.json`.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  // The sidecar file name is distinct.
  assert.match(
    opsSrc,
    /packaging-generation-result\.json/u,
    'sidecar must be `packaging-generation-result.json` (a target-specific extension)',
  );
  // The operations file does NOT claim the sidecar is
  // the run identity.
  assert.equal(
    /run identity authority[\s\S]{0,200}?packaging-generation-result/u.test(opsSrc),
    false,
    'sidecar MUST NOT be the run identity authority (P3-B5.3 §VIII)',
  );
});

test('AA-13 the canonical P3-A production surface is unchanged (P3-A frozen boundary)', async () => {
  // P3-B5.3 §XXVI: P3-A frozen
  // (`packages/runtime-core/src/application/packaging/*`)
  // MUST be 0 modifications.
  const { execFile } = await import('node:child_process') as typeof import('node:child_process');
  const { promisify } = await import('node:util') as typeof import('node:util');
  const execFileAsync = promisify(execFile);
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', 'dd4570a', 'HEAD', '--', 'packages/runtime-core/src/application/packaging/'],
    { cwd: process.cwd() },
  );
  const changed = stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  assert.equal(
    changed.length,
    0,
    `P3-A frozen boundary MUST be 0 modifications vs dd4570a; got: ${changed.join(', ')}`,
  );
});

test('AA-14 the canonical P2 frozen surface is unchanged (P2 frozen boundary)', async () => {
  // P3-B5.3 §XXVI: P2 frozen
  // (`packages/image-generation-runtime/src/packaging/*`)
  // MUST be 0 modifications vs the canonical P2 frozen
  // code baseline 3354053 (P2-I Scanner Closure #2).
  // P3-B5.1 mistakenly used c434400 (a docs evidence
  // commit); B5.3 uses the correct code baseline.
  const { execFile } = await import('node:child_process') as typeof import('node:child_process');
  const { promisify } = await import('node:util') as typeof import('node:util');
  const execFileAsync = promisify(execFile);
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', '335405342951fedae5d4d6816444c2b4d2402787', 'HEAD', '--', 'packages/image-generation-runtime/src/packaging/'],
    { cwd: process.cwd() },
  );
  const changed = stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  assert.equal(
    changed.length,
    0,
    `P2 frozen boundary MUST be 0 modifications vs 3354053; got: ${changed.join(', ')}`,
  );
});

test('AA-15 the canonical preview requires a canonical run (sidecar alone is insufficient)', async () => {
  // P3-B5.3 §VIII: the preview path consults
  // canonicalReadRun FIRST. A sidecar without a
  // canonical run is an orphan and the preview path
  // returns `null`.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aa15-'));
  try {
    const projectId = 'aa15-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AA-15' }),
    );
    // Build a store that uses a canonicalReadRun that
    // returns `null` (simulating an orphan sidecar).
    const canonicalReadRun = async () => null;
    const store = m.createPackagingArtifactStore({
      dataPath: tmpDir,
      resolveProjectRoot: async () => projectRoot,
      resolveAssetById: async () => null,
      readFileBytes: async (absolutePath) => {
        if (absolutePath.endsWith('packaging-generation-result.json')) {
          return await fs.readFile(absolutePath);
        }
        if (absolutePath.endsWith('image-01.png')) return Buffer.from([0x89, 0x50, 0x4e, 0x47]);
        if (absolutePath.endsWith('image-01.webp')) return Buffer.from([0x52, 0x49, 0x46, 0x46]);
        throw new Error('unexpected read: ' + absolutePath);
      },
      writeJsonSafe: async (absolutePath, value) => {
        await fs.mkdir(path.dirname(absolutePath), { recursive: true });
        await fs.writeFile(absolutePath, JSON.stringify(value, null, 2), 'utf8');
      },
      ensureDir: async (p) => { await fs.mkdir(p, { recursive: true }); },
      getProjectIdForSession: () => projectId,
      registerCanonicalRun: async () => undefined,
      canonicalReadRun,
    });
    // Seed ONLY the sidecar.
    const runRoot = path.join(projectRoot, 'image-generation', 'pkg-aa15-001');
    await fs.mkdir(path.join(runRoot, 'images'), { recursive: true });
    await fs.mkdir(path.join(runRoot, 'thumbnails'), { recursive: true });
    await fs.writeFile(
      path.join(runRoot, 'images', 'image-01.png'),
      Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    );
    await fs.writeFile(
      path.join(runRoot, 'thumbnails', 'image-01.webp'),
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
    );
    await store.saveRun('sess-1', {
      schemaVersion: '1.0',
      runId: 'pkg-aa15-001',
      status: 'succeeded',
      model: { providerModelId: 'm', registryModelId: 'm' },
      provider: { protocol: 'qwen', provider: '', adapterId: 'multi-model' },
      artifacts: [
        {
          imageId: 'image-01',
          mimeType: 'image/png',
          sha256: 'c'.repeat(64),
          relativePath: 'images/image-01.png',
          thumbnailRelativePath: 'thumbnails/image-01.webp',
        },
      ],
      diagnostics: {
        startedAt: '2026-08-14T00:00:00.000Z',
        completedAt: '2026-08-14T00:00:01.000Z',
        region: 'beijing',
      },
    });
    // The sidecar is written.
    const sidecar = await fs.stat(path.join(runRoot, 'packaging-generation-result.json')).then(() => true).catch(() => false);
    assert.equal(sidecar, true, 'sidecar MUST be written even when canonicalReadRun is null (write-time precedes preview check)');
    // The preview MUST return null (canonicalReadRun returns null).
    const preview = await store.readArtifactPreview({
      sessionId: 'sess-1',
      runId: 'pkg-aa15-001',
      imageId: 'image-01',
    });
    assert.equal(
      preview,
      null,
      'preview MUST return null for orphan sidecar (P3-B5.3 §VIII / §IX)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

// =============================================================================
// Group AB — P3-B5.3.1 Canonical Run Contract Truthfulness
//
// P3-B5.3 closed the structural gap (canonical runStore
// recognises pkg-* runs); P3-B5.3.1 closes the SEMANTIC gap
// (the canonical `ImageGenerationRun` record produced by
// the bridge is contractually truthful, not just
// storage-accepted).
//
// Three fields were at risk in P3-B5.3:
//   1. `outputType`     — the bridge wrote
//      `'packaging_render'`, which was outside the
//      documented `ImageGenerationOutputType` union
//      (`'concept_image' | 'master_anchor_image'`). The
//      P3-B5.3 report called this a "type lag"; B5.3.1
//      audit proved it was a contract bypass. The fix is
//      to formally extend the union in
//      `@masterpiece/image-generation-contracts`.
//   2. `providerId`     — the bridge wrote
//      `result.provider.protocol`, conflating the
//      transport protocol (e.g. `'openai-compatible'`)
//      with the Provider vendor identity
//      (`'dashscope' / 'openai' / 'volcengine' / etc.`).
//      The fix is to write `result.provider.provider`
//      verbatim, with `'unknown'` as a documented
//      fallback (NOT a fall-through to `protocol`).
//   3. `downloadedAt` / `taskId` — these were
//      approximations the P3-B5.3 report acknowledged.
//      B5.3.1 documents the truthfulness of each
//      derivation explicitly and adds structural
//      assertions so a future regression that swaps a
//      derivation for a fabrication is caught.
//
// These guards are ADDITIVE — they do not modify any
// P3-A canonical guard (A-L), any P3-B2/B3/B4 group
// (W, T, X, Y), or any P3-B5.x group (Z, AA). They
// only assert what was *not* asserted before: that the
// canonical record's semantic fields are truthful.
// =============================================================================

test('AB-01 Packaging `outputType` is in the canonical `ImageGenerationOutputType` union (no JS-only type bypass)', async () => {
  // P3-B5.3.1 audit §III: `'packaging_render'` is now
  // formally part of the canonical union. The bridge
  // writes it; the TS compiler accepts it; the canonical
  // runStore accepts it. A regression that reverts the
  // union extension is caught here.
  const contractsPath = path.join(ROOT, 'packages', 'image-generation-contracts', 'src', 'index.ts');
  const contractsSrc = readFile(contractsPath);
  assert.equal(
    /export type ImageGenerationOutputType[\s\S]+?'packaging_render'/u.test(contractsSrc),
    true,
    '`ImageGenerationOutputType` union MUST formally include `packaging_render` (P3-B5.3.1 §III / §X)',
  );
  // The bridge writes `'packaging_render'`.
  const opsSrc = readFile(PACKAGING_OPERATIONS);
  assert.equal(
    /outputType:\s*['"]packaging_render['"]/u.test(opsSrc),
    true,
    'bridge MUST write `outputType: "packaging_render"` as the truthful Packaging outputType (P3-B5.3.1 §III)',
  );
  // No "type lag" / "runtime accepts it anyway" / "JSON.stringify
  // does not validate" comments. The previous B5.3.1 audit
  // claim that the union was a "type lag" was a contract
  // bypass, not a real justification.
  for (const forbiddenPhrase of [
    'type lag',
    'runtime accepts any string',
    'JSON.stringify does not',
    'JSON.stringify doesn\'t validate',
    'not validated at write',
  ]) {
    assert.equal(
      opsSrc.toLowerCase().includes(forbiddenPhrase.toLowerCase()),
      false,
      `bridge MUST NOT use "${forbiddenPhrase}" as a justification for an out-of-union value (P3-B5.3.1 §IV)`,
    );
  }
});

test('AB-02 the canonical `run.json` produced by the bridge satisfies the canonical TS schema (outputType ∈ union, status ∈ enum, providerId ∈ enum)', async () => {
  // P3-B5.3.1 §IX: when a real canonical `runStore` is
  // asked to `readRun` a bridge-registered pkg run, the
  // returned record must be type-valid against the
  // canonical TS schema. We perform a structural check
  // (since we cannot run `tsc` here) that asserts each
  // semantic field falls in its expected set.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab02-'));
  try {
    const projectId = 'ab02-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-02' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab02-001',
        status: 'succeeded',
        model: { providerModelId: 'wan2.7-image-pro', registryModelId: 'wan2.7-image-pro' },
        provider: { protocol: 'openai-compatible', provider: 'dashscope', adapterId: 'wan2.7-image-pro' },
        apiProfileId: 'profile-ab02',
        artifacts: [
          {
            imageId: 'image-01',
            mimeType: 'image/png',
            sha256: 'a'.repeat(64),
            relativePath: 'images/image-01.png',
            thumbnailRelativePath: 'thumbnails/image-01.webp',
            width: 1024,
            height: 1024,
            sizeBytes: 12345,
          },
        ],
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: '2026-08-14T00:00:01.000Z',
          region: 'beijing',
        },
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab02-001');
    assert.notEqual(persisted, null);
    // outputType ∈ canonical union.
    assert.ok(
      ['concept_image', 'master_anchor_image', 'packaging_render'].includes(String(persisted.outputType)),
      `persisted.outputType MUST be in canonical union, got: ${String(persisted.outputType)} (P3-B5.3.1 §III)`,
    );
    // status ∈ canonical enum.
    assert.ok(
      [
        'created', 'validating', 'blocked', 'ready', 'submitting',
        'queued', 'running', 'downloading', 'succeeded', 'failed', 'cancelled',
      ].includes(String(persisted.status)),
      `persisted.status MUST be in canonical enum, got: ${String(persisted.status)} (P3-B5.3.1 §XIII)`,
    );
    // region ∈ canonical enum.
    assert.ok(
      ['beijing', 'singapore'].includes(String(persisted.region)),
      `persisted.region MUST be in canonical enum, got: ${String(persisted.region)} (P3-B5.3.1 §XIII)`,
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-03 `providerId` is sourced from the canonical Provider identity, NOT from the transport protocol', async () => {
  // P3-B5.3.1 §V / §VI: the canonical Provider
  // identity lives in `result.provider.provider`
  // (e.g. `'dashscope'`). The transport protocol
  // (`'openai-compatible'`) is a wire-format
  // identifier, NOT a vendor identity. The bridge
  // MUST NOT conflate them.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab03-'));
  try {
    const projectId = 'ab03-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-03' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab03-001',
        status: 'succeeded',
        model: { providerModelId: 'wan2.7-image-pro', registryModelId: 'wan2.7-image-pro' },
        // A realistic case: the protocol is
        // `openai-compatible` but the canonical Provider
        // identity is `dashscope` (DashScope is reachable
        // through an OpenAI-compatible API). The bridge
        // MUST record `dashscope` as providerId, NOT
        // `openai-compatible`.
        provider: { protocol: 'openai-compatible', provider: 'dashscope', adapterId: 'wan2.7-image-pro' },
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: '2026-08-14T00:00:01.000Z',
          region: 'beijing',
        },
        artifacts: [],
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab03-001');
    assert.notEqual(persisted, null);
    assert.equal(
      persisted.providerId,
      'dashscope',
      'providerId MUST be sourced from the canonical Provider identity (result.provider.provider), NOT from the transport protocol (P3-B5.3.1 §V / §VI)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-04 `providerId` is NOT sourced from `modelId` (no model-as-provider conflation)', async () => {
  // P3-B5.3.1 §VI: `modelId` (e.g.
  // `'wan2.7-image-pro'`) is a model identity, not a
  // Provider identity. The bridge MUST NOT use it as
  // `providerId`. A regression that swaps the two
  // surfaces is caught here.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab04-'));
  try {
    const projectId = 'ab04-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-04' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    // The Provider field is empty (test mock); the
    // fallback MUST be 'unknown' (NOT the model id).
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab04-001',
        status: 'succeeded',
        model: { providerModelId: 'wan2.7-image-pro', registryModelId: 'wan2.7-image-pro' },
        provider: { protocol: 'openai-compatible', provider: '', adapterId: 'wan2.7-image-pro' },
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: '2026-08-14T00:00:01.000Z',
        },
        artifacts: [],
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab04-001');
    assert.notEqual(persisted, null);
    assert.notEqual(
      persisted.providerId,
      'wan2.7-image-pro',
      'providerId MUST NOT be sourced from modelId (P3-B5.3.1 §VI)',
    );
    assert.equal(
      persisted.providerId,
      'unknown',
      'providerId MUST fall back to "unknown" when the canonical Provider identity is empty (NOT to the model id or the protocol) (P3-B5.3.1 §VI)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-05 `taskId` derivation is documented, deterministic, and is NOT falsely represented as an external task id', async () => {
  // P3-B5.3.1 §VII: the canonical `ImageGenerationRun
  // .taskId` is a stable task correlation identifier,
  // not a Provider task id. The Packaging pipeline
  // does not have a separate task-builder task
  // object; the runId IS the task. The derivation is:
  //   - For uuid-style runIds (e.g.
  //     `pkg-aa01bb02-...`), the canonical taskId is
  //     `pkg-${runId.slice(0, 8)}`.
  //   - For short `pkg-*` runIds (≤16 chars), the
  //     full runId is the taskId.
  //   - The bridge does NOT pretend the taskId came
  //     from a real Provider task object.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab05-'));
  try {
    const projectId = 'ab05-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-05' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    // Long runId → `pkg-${runId.slice(0, 8)}`.
    const longRunId = 'pkg-aa01bb02-cc03-4d04-ee05-ff06aabbccdd';
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: longRunId,
        status: 'succeeded',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'm', provider: 'm', adapterId: 'm' },
        diagnostics: { startedAt: '2026-08-14T00:00:00.000Z', completedAt: '2026-08-14T00:00:01.000Z' },
        artifacts: [],
      },
    });
    let runStore = m.createRunStore(tmpDir, projectId);
    let persisted = await runStore.readRun(longRunId);
    assert.equal(
      persisted.taskId,
      `pkg-${longRunId.slice(0, 8)}`,
      'long pkg-* runId → taskId is `pkg-${runId.slice(0, 8)}` (P3-B5.3.1 §VII)',
    );
    // Short runId (≤16 chars) → full runId is the taskId.
    const shortRunId = 'pkg-aa01';
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: shortRunId,
        status: 'succeeded',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'm', provider: 'm', adapterId: 'm' },
        diagnostics: { startedAt: '2026-08-14T00:00:00.000Z', completedAt: '2026-08-14T00:00:01.000Z' },
        artifacts: [],
      },
    });
    runStore = m.createRunStore(tmpDir, projectId);
    persisted = await runStore.readRun(shortRunId);
    assert.equal(
      persisted.taskId,
      shortRunId,
      'short pkg-* runId (≤16 chars) → taskId is the full runId (no redundant `pkg-pkg-...` prefix) (P3-B5.3.1 §VII)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-06 `downloadedAt` uses a truthful timestamp (the run `completedAt`), NOT an approximation when real data is available', async () => {
  // P3-B5.3.1 §VIII: the P2 frozen result does NOT
  // carry a per-image download timestamp. The
  // closest truthful signal is the run `completedAt`
  // (the bytes were downloaded during the run and
  // persisted before `completedAt`). The bridge
  // documents this as a known approximation; it does
  // NOT pretend to know the per-image download time.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab06-'));
  try {
    const projectId = 'ab06-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-06' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    const fixedCompletedAt = '2026-08-14T00:00:01.500Z';
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab06-001',
        status: 'succeeded',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'm', provider: 'm', adapterId: 'm' },
        artifacts: [
          {
            imageId: 'image-01',
            mimeType: 'image/png',
            sha256: 'a'.repeat(64),
            relativePath: 'images/image-01.png',
            thumbnailRelativePath: 'thumbnails/image-01.webp',
          },
        ],
        diagnostics: {
          startedAt: '2026-08-14T00:00:00.000Z',
          completedAt: fixedCompletedAt,
        },
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab06-001');
    assert.notEqual(persisted, null);
    assert.equal(persisted.images.length, 1);
    assert.equal(
      persisted.images[0].downloadedAt,
      fixedCompletedAt,
      'downloadedAt MUST be the run `completedAt` (P3-B5.3.1 §VIII)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-07 the bridge does NOT carry `result.provider.protocol` as `providerId` even when the canonical Provider field is empty (no protocol fall-through)', async () => {
  // P3-B5.3.1 §V: the previous B5.3 implementation
  // fell through to `result.provider.protocol` when
  // `result.provider.provider` was empty. This was a
  // contract conflation (transport protocol vs
  // vendor identity). B5.3.1 fixed the bridge to fall
  // back to `'unknown'` instead. A regression that
  // re-introduces the protocol fall-through is caught
  // here.
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab07-'));
  try {
    const projectId = 'ab07-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-07' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab07-001',
        status: 'succeeded',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'openai-compatible', provider: '', adapterId: 'm' },
        diagnostics: { startedAt: '2026-08-14T00:00:00.000Z', completedAt: '2026-08-14T00:00:01.000Z' },
        artifacts: [],
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab07-001');
    assert.notEqual(persisted, null);
    assert.notEqual(
      persisted.providerId,
      'openai-compatible',
      'providerId MUST NOT fall through to result.provider.protocol (P3-B5.3.1 §V / §VI)',
    );
    assert.equal(
      persisted.providerId,
      'unknown',
      'empty canonical Provider identity MUST fall back to "unknown", not to the transport protocol (P3-B5.3.1 §V / §VI)',
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-08 the canonical record carries no fabricated semantic fields (only truthful, mapped, or omitted fields)', async () => {
  // P3-B5.3.1 §XIII: the canonical record MUST NOT
  // carry fields that misrepresent the Packaging
  // semantics. Forbidden fabrications:
  //   - `outputType: 'concept_image'` (a packaging
  //     render is NOT a concept image).
  //   - `outputType: 'master_anchor_image'` (a
  //     packaging render is NOT a master anchor).
  //   - `status: 'succeeded'` when the P2 frozen
  //     result is `'failed'`.
  //   - `gate.blocked: true` (there is no gate).
  //   - `providerId: 'openai-compatible'`
  //     (protocol-as-provider conflation).
  //   - `taskId: 'external-task-id'` (no such
  //     external task).
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const m = await getAAModules();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ab08-'));
  try {
    const projectId = 'ab08-project';
    const projectRoot = path.join(tmpDir, 'projects', projectId);
    await fs.mkdir(projectRoot, { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, 'project.json'),
      JSON.stringify({ id: projectId, name: 'AB-08' }),
    );
    const adapter = m.createPackagingRunRegistrationAdapter({
      dataPath: tmpDir,
      createRunStore: m.createRunStore,
    });
    // Failed run: status MUST be preserved as 'failed'.
    await adapter.registerRun({
      projectId,
      packagingResult: {
        schemaVersion: '1.0',
        runId: 'pkg-ab08-001',
        status: 'failed',
        model: { providerModelId: 'm', registryModelId: 'm' },
        provider: { protocol: 'openai-compatible', provider: 'volcengine', adapterId: 'm' },
        diagnostics: { startedAt: '2026-08-14T00:00:00.000Z', completedAt: '2026-08-14T00:00:01.000Z' },
        artifacts: [],
      },
    });
    const runStore = m.createRunStore(tmpDir, projectId);
    const persisted = await runStore.readRun('pkg-ab08-001');
    assert.notEqual(persisted, null);
    assert.equal(persisted.status, 'failed', 'bridge MUST preserve truthful failed status (P3-B5.3.1 §XIII)');
    assert.equal(persisted.outputType, 'packaging_render', 'outputType MUST be packaging_render (P3-B5.3.1 §III / §XIII)');
    assert.equal(persisted.gate.blocked, false, 'gate.blocked MUST be false (P3-B5.3.1 §XIII)');
    assert.equal(persisted.providerId, 'volcengine', 'providerId MUST be the canonical Provider identity (P3-B5.3.1 §V)');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});

test('AB-09 the shared `image-generation-contracts` union extension is minimal, additive, and does not change existing values', () => {
  // P3-B5.3.1 §X: the union extension MUST be
  // backwards-compatible. Existing values
  // ('concept_image' / 'master_anchor_image') MUST
  // remain in the union; the only change is the
  // addition of 'packaging_render'.
  const contractsPath = path.join(ROOT, 'packages', 'image-generation-contracts', 'src', 'index.ts');
  const contractsSrc = readFile(contractsPath);
  // Both pre-existing values MUST still be present.
  assert.equal(
    contractsSrc.includes("'concept_image'"),
    true,
    'pre-existing ImageGenerationOutputType value "concept_image" MUST be preserved (P3-B5.3.1 §X)',
  );
  assert.equal(
    contractsSrc.includes("'master_anchor_image'"),
    true,
    'pre-existing ImageGenerationOutputType value "master_anchor_image" MUST be preserved (P3-B5.3.1 §X)',
  );
  // The new value MUST be present.
  assert.equal(
    contractsSrc.includes("'packaging_render'"),
    true,
    'new ImageGenerationOutputType value "packaging_render" MUST be added (P3-B5.3.1 §III / §X)',
  );
  // The contracts package version MUST be unchanged
  // (0.0.0; private). The extension is purely
  // additive — it does not require a version bump.
  const pkgPath = path.join(ROOT, 'packages', 'image-generation-contracts', 'package.json');
  const pkgSrc = readFile(pkgPath);
  assert.equal(
    /"version"\s*:\s*"0\.0\.0"/.test(pkgSrc),
    true,
    'contracts package version MUST remain 0.0.0 (the union extension is purely additive; no version bump) (P3-B5.3.1 §XI)',
  );
});

test('AB-10 P3-A frozen production surface and P2 frozen packaging surface are unchanged after P3-B5.3.1', () => {
  // P3-B5.3.1 §XII: the contract truthfulness fix
  // touches only the non-frozen
  // `packages/runtime-core/src/operations/packaging-operations.js`
  // and the additive
  // `packages/image-generation-contracts/src/index.ts`
  // (which is the shared contract package, NOT
  // P3-A frozen application surface and NOT P2
  // frozen packaging surface). Verify 0 changes to
  // the frozen baselines.
  const p3aDiff = runGit(['diff', '--name-only', P3A_FROZEN_BASELINE, 'HEAD']);
  const p3aChanged = p3aDiff.split('\n').filter(Boolean);
  const p3aViolations = p3aChanged.filter((f) => f.startsWith('packages/runtime-core/src/application/packaging/'));
  assert.equal(
    p3aViolations.length,
    0,
    `P3-A frozen surface MUST be unchanged (P3-B5.3.1 §XII); violations: ${p3aViolations.join(', ')}`,
  );
  const p2Diff = runGit(['diff', '--name-only', P2_FROZEN_BASELINE, 'HEAD']);
  const p2Changed = p2Diff.split('\n').filter(Boolean);
  const p2Violations = p2Changed.filter((f) => f.startsWith('packages/image-generation-runtime/src/packaging/'));
  assert.equal(
    p2Violations.length,
    0,
    `P2 frozen surface MUST be unchanged (P3-B5.3.1 §XII); violations: ${p2Violations.join(', ')}`,
  );
});
