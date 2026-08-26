// Tracked Runtime Assets Guard \u2014 guard self-tests
//
// Per Tracked Runtime Assets Guard spec \u00a722, 10 required cases:
//
//   1.  current repository passes
//   2.  missing tracked asset fails
//   3.  existing-but-untracked asset fails
//   4.  duplicate manifest entry fails
//   5.  absolute path fails
//   6.  ../ traversal fails
//   7.  ignored local-only dependency fails
//   8.  broken registry imagePath fails
//   9.  user-data classification does not require Git tracking
//   10. secret/cache classifications are not promoted to tracked assets
//
// Cases 1 + 9 + 10 run against the current repository and the
// real manifest. Cases 2-8 build a synthetic manifest in a
// temp directory and a clone of the current `git ls-files`
// state, exercising the guard's failure paths.
//
// The guard script itself is at
// scripts/verify-tracked-runtime-assets.mjs. We invoke it via
// child_process.execFileSync to keep the test honest (the test
// is testing the same script that ships, not an alternate
// implementation).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import * as nodeCrypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'verify-tracked-runtime-assets.mjs');
const REAL_MANIFEST = path.join(
  REPO_ROOT,
  'config',
  'repository-contract',
  'runtime-static-assets.json',
);

function runGuardOnDir(repoRootDir, manifestPath, options = {}) {
  // Run the guard against a fake REPO_ROOT. The guard resolves
  // REPO_ROOT from cwd; we point cwd at the temp repo so all
  // path resolves are relative to that temp. The synthetic
  // manifest path is passed via RUNTIME_ASSET_MANIFEST. For
  // tests that write a production-style loader into the temp
  // repo, pass `options.extraScanRoot: true` to add the temp
  // dir to the scan roots via RUNTIME_ASSET_EXTRA_SCAN_ROOTS.
  const env = {
    ...process.env,
    RUNTIME_ASSET_MANIFEST: manifestPath,
    RUNTIME_ASSET_REPO_ROOT: repoRootDir,
  };
  if (options.extraScanRoot) {
    env.RUNTIME_ASSET_EXTRA_SCAN_ROOTS = repoRootDir;
  } else {
    // Explicitly clear to avoid pollution from earlier calls.
    delete env.RUNTIME_ASSET_EXTRA_SCAN_ROOTS;
  }
  try {
    const out = execFileSync('node', [SCRIPT], {
      cwd: repoRootDir,
      env,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout: out, stderr: '' };
  } catch (e) {
    return {
      code: e.status ?? 1,
      stdout: (e.stdout ?? '').toString(),
      stderr: (e.stderr ?? '').toString(),
    };
  }
}

function readRealManifest() {
  return JSON.parse(fs.readFileSync(REAL_MANIFEST, 'utf8'));
}

// ----------------------------------------------------------------------------
// Case 1: current repository passes
// ----------------------------------------------------------------------------

test('Case 1: current repository passes', () => {
  const r = runGuardOnDir(REPO_ROOT, REAL_MANIFEST);
  assert.equal(r.code, 0, `guard should pass on the current repo; stderr=${r.stderr}; stdout=${r.stdout}`);
  assert.ok(/PASS/.test(r.stdout), `expected PASS line; got: ${r.stdout}`);
});

// ----------------------------------------------------------------------------
// Case 2-8: build a synthetic manifest in a temp dir
// ----------------------------------------------------------------------------

function makeTmpRepo() {
  // Create a temp dir that LOOKS like a git repo so git ls-files
  // / check-ignore behave sanely. We symlink .git from the real
  // repo so paths resolve consistently; the synthetic manifest
  // we write will reference files that DO exist + ARE tracked in
  // the real repo, then we mutate the manifest to exercise
  // each failure path.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tracked-runtime-guard-test-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    return dir;
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

function cleanTmpRepo(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best effort
  }
}

function writeSyntheticManifest(repoDir, assets, registryClosure) {
  const manifestPath = path.join(
    repoDir,
    'config',
    'repository-contract',
    'runtime-static-assets.json',
  );
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const m = {
    schemaVersion: '1.0',
    manifestVersion: '1.0.0',
    assets,
    registryClosure: registryClosure ?? { checkedRegistries: [] },
  };
  fs.writeFileSync(manifestPath, JSON.stringify(m, null, 2), 'utf8');
  return manifestPath;
}

test('Case 2: missing tracked asset fails (RUNTIME_ASSET_MISSING)', () => {
  const dir = makeTmpRepo();
  try {
    writeSyntheticManifest(dir, [
      {
        path: 'packages/this/path/does/not/exist.md',
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; missing on purpose',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0, 'guard must fail when the declared path is missing on disk');
    assert.ok(
      /RUNTIME_ASSET_MISSING/.test(r.stderr + r.stdout),
      `error must mention RUNTIME_ASSET_MISSING; got: stderr=${r.stderr}; stdout=${r.stdout}`,
    );
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 3: existing-but-untracked asset fails (RUNTIME_ASSET_UNTRACKED)', () => {
  const dir = makeTmpRepo();
  try {
    // Create a file inside the temp repo, do not `git add` it
    const untrackedDir = path.join(dir, 'synthetic');
    fs.mkdirSync(untrackedDir, { recursive: true });
    const untrackedFile = path.join(untrackedDir, 'untracked.md');
    fs.writeFileSync(untrackedFile, '# synthetic', 'utf8');
    writeSyntheticManifest(dir, [
      {
        path: 'synthetic/untracked.md',
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; untracked on purpose',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0, 'guard must fail when the declared path is untracked');
    assert.ok(
      /RUNTIME_ASSET_UNTRACKED/.test(r.stderr + r.stdout),
      `error must mention RUNTIME_ASSET_UNTRACKED; got: stderr=${r.stderr}; stdout=${r.stdout}`,
    );
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 4: duplicate manifest entry fails (RUNTIME_ASSET_DUPLICATE)', () => {
  // We need a real-tracked path to be duplicated in the manifest
  // for the duplicate check to surface. Pick the first real asset
  // and duplicate it in a synthetic manifest in a temp repo.
  const dir = makeTmpRepo();
  try {
    const real = readRealManifest();
    const firstPath = real.assets[0].path;
    writeSyntheticManifest(dir, [
      {
        path: firstPath,
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; first copy of the duplicate',
      },
      {
        path: firstPath,
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; second copy of the duplicate',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0, 'guard must fail on duplicate manifest entries');
    assert.ok(
      /RUNTIME_ASSET_DUPLICATE/.test(r.stderr + r.stdout),
      `error must mention RUNTIME_ASSET_DUPLICATE; got: stderr=${r.stderr}; stdout=${r.stdout}`,
    );
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 5: absolute path fails (RUNTIME_ASSET_PATH_INVALID)', () => {
  const dir = makeTmpRepo();
  try {
    writeSyntheticManifest(dir, [
      {
        path: '/etc/absolute/path.md',
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; absolute on purpose',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0);
    assert.ok(/RUNTIME_ASSET_PATH_INVALID/.test(r.stderr + r.stdout), `expected RUNTIME_ASSET_PATH_INVALID; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 6: ../ traversal fails (RUNTIME_ASSET_PATH_INVALID)', () => {
  const dir = makeTmpRepo();
  try {
    writeSyntheticManifest(dir, [
      {
        path: 'foo/../../etc/passwd',
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; traversal on purpose',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0);
    assert.ok(/RUNTIME_ASSET_PATH_INVALID/.test(r.stderr + r.stdout), `expected RUNTIME_ASSET_PATH_INVALID; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 7: ignored local-only dependency fails (RUNTIME_ASSET_IGNORED)', () => {
  // Create a temp repo with a .gitignore that excludes
  // synthetic/local-only.md; create the file; declare it in the
  // manifest; the guard should fail with RUNTIME_ASSET_IGNORED.
  const dir = makeTmpRepo();
  try {
    const localDir = path.join(dir, 'synthetic');
    fs.mkdirSync(localDir, { recursive: true });
    const localFile = path.join(localDir, 'local-only.md');
    fs.writeFileSync(localFile, '# local', 'utf8');
    fs.writeFileSync(path.join(dir, '.gitignore'), 'synthetic/\n', 'utf8');
    writeSyntheticManifest(dir, [
      {
        path: 'synthetic/local-only.md',
        owner: 'visual-analysis',
        classification: 'TRACKED_RUNTIME_ASSET',
        required: true,
        releaseRequired: true,
        reason: 'synthetic; in .gitignore',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0);
    assert.ok(/RUNTIME_ASSET_IGNORED/.test(r.stderr + r.stdout), `expected RUNTIME_ASSET_IGNORED; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case 8: broken registry imagePath fails (RUNTIME_ASSET_REFERENCE_BROKEN)', () => {
  // Synthetic registry with a brand entry whose anchor's imagePath
  // points to a non-existent file. The guard should fail with
  // RUNTIME_ASSET_REFERENCE_BROKEN.
  const dir = makeTmpRepo();
  try {
    const regPath = path.join(dir, 'synthetic', 'registry.json');
    fs.mkdirSync(path.dirname(regPath), { recursive: true });
    fs.writeFileSync(
      regPath,
      JSON.stringify({
        brands: {
          'test-brand': {
            anchors: [
              { id: 'TEST-01', imagePath: 'synthetic/missing.png' },
            ],
          },
        },
      }),
      'utf8',
    );
    writeSyntheticManifest(
      dir,
      [
        // we don't need any assets \u2014 just the registryClosure.
        // But the manifest schema requires assets array; pass an empty one.
      ],
      {
        checkedRegistries: [
          { registryPath: 'synthetic/registry.json' },
        ],
      },
    );
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.notEqual(r.code, 0);
    assert.ok(/RUNTIME_ASSET_REFERENCE_BROKEN/.test(r.stderr + r.stdout), `expected RUNTIME_ASSET_REFERENCE_BROKEN; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

// ----------------------------------------------------------------------------
// Case 9: user-data classification does NOT require Git tracking
// ----------------------------------------------------------------------------

test('Case 9: USER_DATA classification does not require Git tracking', () => {
  const dir = makeTmpRepo();
  try {
    // Create an untracked file; declare it USER_DATA (not
    // TRACKED). The guard should accept it (USER_DATA may live
    // outside the repo; spec \u00a78).
    const userDir = path.join(dir, 'userData');
    fs.mkdirSync(userDir, { recursive: true });
    fs.writeFileSync(path.join(userDir, 'settings.json'), '{}', 'utf8');
    writeSyntheticManifest(dir, [
      {
        path: 'userData/settings.json',
        owner: 'user-runtime',
        classification: 'USER_DATA',
        required: false,
        releaseRequired: false,
        reason: 'synthetic; USER_DATA on purpose',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.equal(r.code, 0, `guard must accept USER_DATA without tracking; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

// ----------------------------------------------------------------------------
// Case 10: secret/cache classifications are not promoted to tracked assets
// ----------------------------------------------------------------------------

test('Case 10: SECRET / CACHE classifications are not treated as tracked assets', () => {
  const dir = makeTmpRepo();
  try {
    // Declare a SECRET (must never be committed) and a CACHE
    // (must never be source-of-truth). The guard should accept
    // both without requiring them to be on disk or tracked.
    writeSyntheticManifest(dir, [
      {
        path: '.env',
        owner: 'secrets',
        classification: 'SECRET',
        required: false,
        releaseRequired: false,
        reason: 'synthetic; SECRET on purpose (NEVER committed)',
      },
      {
        path: 'node_modules/.cache/something',
        owner: 'cache',
        classification: 'CACHE',
        required: false,
        releaseRequired: false,
        reason: 'synthetic; CACHE on purpose (never source-of-truth)',
      },
    ]);
    const r = runGuardOnDir(dir, path.join(dir, 'config/repository-contract/runtime-static-assets.json'));
    assert.equal(r.code, 0, `guard must accept SECRET + CACHE without requiring them; got: ${r.stderr} ${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

// ----------------------------------------------------------------------------
// Check H (declaredDependencyCoverage) 鈥?3 new self-tests
// per the 2026-08-12 directive
// ----------------------------------------------------------------------------

// Helper: write a production-style loader file that uses
// `fs.readFile(path.join(REPO_ROOT, '<literal>'), 'utf8')`
// pointed at a given repo-relative path. Returns the absolute
// path of the written file.
function writeProductionLoader(absRepoRoot, relStaticPath) {
  const prodDir = path.join(absRepoRoot, 'synthetic', 'prod');
  fs.mkdirSync(prodDir, { recursive: true });
  const loaderPath = path.join(prodDir, 'loader.mjs');
  const content = `// synthetic production loader used by Check H tests
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO_ROOT = ${JSON.stringify(absRepoRoot.replaceAll('\\', '/'))};

export function loadStatic() {
  // The literal below is the path Check H should detect.
  return readFileSync(join(REPO_ROOT, ${JSON.stringify(relStaticPath)}), 'utf8');
}
`;
  fs.writeFileSync(loaderPath, content, 'utf8');
  // Initialize git so the guard can run
  return loaderPath;
}

test('Case A: local-only untracked asset referenced from production fails (RUNTIME_ASSET_UNDECLARED)', () => {
  // Create a temp git repo; create a production loader that
  // references an UNTRACKED local-only prompt file; declare
  // only the existing real manifest assets. The guard should
  // fail with RUNTIME_ASSET_UNDECLARED because the local-only
  // prompt is referenced from production code but not declared
  // in the manifest.
  const dir = makeTmpRepo();
  try {
    // Create the untracked file in a sibling "tracked" path
    // so the file exists locally; do NOT add it to the manifest
    // and do NOT git-add it.
    const untrackedDir = path.join(dir, 'untracked-fixtures');
    fs.mkdirSync(untrackedDir, { recursive: true });
    const untrackedFile = path.join(untrackedDir, 'local-only-prompt.md');
    fs.writeFileSync(untrackedFile, '# local only', 'utf8');

    // Write a production-style loader that reads it.
    writeProductionLoader(dir, 'untracked-fixtures/local-only-prompt.md');

    // Declare a manifest that does NOT mention the untracked file.
    // Use the real manifest's allowlist (so that other genuine
    // allowlist matches pass); we override just the assets
    // section to be empty.
    const real = readRealManifest();
    writeSyntheticManifest(dir, [], {
      // Re-use the real manifest's coverage allowlist so we
      // don't drown in false positives from other production
      // code in the same temp repo.
      // Synthetic manifest's loaderClassifications are not
      // needed; declaredDependencyCoverage is intentionally
      // null here so the guard uses the file as a TRACKED-only
      // validator (only the assets[] path is checked).
    });
    // Patch the synthetic manifest to include the real
    // declaredDependencyCoverage (so generatedFileBasenames
    // and allowlists remain in effect for unrelated files).
    const syntheticPath = path.join(dir, 'config/repository-contract/runtime-static-assets.json');
    const synthetic = JSON.parse(fs.readFileSync(syntheticPath, 'utf8'));
    synthetic.declaredDependencyCoverage = real.declaredDependencyCoverage;
    fs.writeFileSync(syntheticPath, JSON.stringify(synthetic, null, 2), 'utf8');
    void real;

    const r = runGuardOnDir(dir, syntheticPath, { extraScanRoot: true });
    assert.notEqual(r.code, 0, 'guard must fail when production references a local-only untracked asset');
    assert.ok(
      /RUNTIME_ASSET_UNDECLARED/.test(r.stderr + r.stdout),
      `expected RUNTIME_ASSET_UNDECLARED; got: stderr=${r.stderr}; stdout=${r.stdout}`,
    );
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case B: tracked but undeclared asset referenced from production fails (RUNTIME_ASSET_UNDECLARED)', () => {
  // Create a temp git repo; create + git-add a static file;
  // create a production loader that references it; declare
  // a manifest that does NOT mention the file. The guard
  // should fail with RUNTIME_ASSET_UNDECLARED (Git tracked
  // alone does not equal "declared as runtime dependency").
  const dir = makeTmpRepo();
  try {
    const fixturesDir = path.join(dir, 'brand-fixtures');
    fs.mkdirSync(fixturesDir, { recursive: true });
    const trackedFile = path.join(fixturesDir, 'brand-moodboard.md');
    fs.writeFileSync(trackedFile, '# brand moodboard', 'utf8');
    execFileSync('git', ['add', '--', 'brand-fixtures/brand-moodboard.md'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'add brand-moodboard'], { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test' } });

    // Production loader references the tracked but undeclared file.
    writeProductionLoader(dir, 'brand-fixtures/brand-moodboard.md');

    // Manifest declares nothing.
    const real = readRealManifest();
    writeSyntheticManifest(dir, []);
    const syntheticPath = path.join(dir, 'config/repository-contract/runtime-static-assets.json');
    const synthetic = JSON.parse(fs.readFileSync(syntheticPath, 'utf8'));
    synthetic.declaredDependencyCoverage = real.declaredDependencyCoverage;
    fs.writeFileSync(syntheticPath, JSON.stringify(synthetic, null, 2), 'utf8');

    const r = runGuardOnDir(dir, syntheticPath, { extraScanRoot: true });
    assert.notEqual(r.code, 0, 'guard must fail when tracked but undeclared asset is referenced from production');
    assert.ok(
      /RUNTIME_ASSET_UNDECLARED/.test(r.stderr + r.stdout),
      `expected RUNTIME_ASSET_UNDECLARED; got: stderr=${r.stderr}; stdout=${r.stdout}`,
    );
  } finally {
    cleanTmpRepo(dir);
  }
});

test('Case C: after declaring the asset in the manifest, declaration coverage passes; existence + tracking still gate it', () => {
  // Same setup as Case B (file is Git tracked; production
  // references it) but the manifest NOW declares the file
  // as a TRACKED_RUNTIME_ASSET. The guard should pass Check H
  // (declaration coverage). Existence + tracking then take
  // over (the file is on disk + is Git tracked, so those
  // pass too).
  const dir = makeTmpRepo();
  try {
    const fixturesDir = path.join(dir, 'brand-fixtures');
    fs.mkdirSync(fixturesDir, { recursive: true });
    const trackedFile = path.join(fixturesDir, 'brand-moodboard.md');
    fs.writeFileSync(trackedFile, '# brand moodboard', 'utf8');
    execFileSync('git', ['add', '--', 'brand-fixtures/brand-moodboard.md'], { cwd: dir });
    execFileSync('git', ['commit', '-q', '-m', 'add brand-moodboard'], { cwd: dir, env: { ...process.env, GIT_AUTHOR_NAME: 'test', GIT_AUTHOR_EMAIL: 'test@test', GIT_COMMITTER_NAME: 'test', GIT_COMMITTER_EMAIL: 'test@test' } });

    writeProductionLoader(dir, 'brand-fixtures/brand-moodboard.md');

    // Declare the file in the manifest, with SHA-256.
    const real = readRealManifest();
    const crypto = nodeCrypto;
    const sha = crypto.createHash('sha256').update(fs.readFileSync(trackedFile)).digest('hex');
    const synthetic = {
      schemaVersion: '1.0',
      manifestVersion: '1.0.0',
      assets: [
        {
          path: 'brand-fixtures/brand-moodboard.md',
          owner: 'synthetic',
          classification: 'TRACKED_RUNTIME_ASSET',
          required: true,
          releaseRequired: true,
          reason: 'synthetic; declared to verify Check H passes when coverage matches',
          sha256: sha,
          frozenBy: 'P1-D1',
        },
      ],
      declaredDependencyCoverage: real.declaredDependencyCoverage,
      registryClosure: { checkedRegistries: [] },
    };
    const syntheticPath = path.join(dir, 'config/repository-contract/runtime-static-assets.json');
    fs.mkdirSync(path.dirname(syntheticPath), { recursive: true });
    fs.writeFileSync(syntheticPath, JSON.stringify(synthetic, null, 2), 'utf8');

    const r = runGuardOnDir(dir, syntheticPath, { extraScanRoot: true });
    assert.equal(r.code, 0, `guard must pass when the asset is declared; stderr=${r.stderr}; stdout=${r.stdout}`);
  } finally {
    cleanTmpRepo(dir);
  }
});

// ----------------------------------------------------------------------------
// Bonus: real manifest is valid JSON + has all required fields
// ----------------------------------------------------------------------------

test('Bonus: real manifest has 8 declared assets, all required fields present', () => {
  const m = readRealManifest();
  assert.equal(m.schemaVersion, '1.0');
  assert.equal(m.assets.length, 8);
  for (const a of m.assets) {
    assert.equal(a.classification, 'TRACKED_RUNTIME_ASSET', `${a.path} must be TRACKED_RUNTIME_ASSET in the initial inventory`);
    assert.ok(typeof a.path === 'string' && a.path.length > 0);
    assert.ok(typeof a.sha256 === 'string' && a.sha256.length === 64, `${a.path} must have a 64-char SHA-256`);
    assert.equal(a.required, true);
    assert.equal(a.releaseRequired, true);
  }
});

test('Bonus: real manifest registryClosure pins all 3 JZMX imagePath references', () => {
  const m = readRealManifest();
  assert.ok(Array.isArray(m.registryClosure?.checkedRegistries));
  const reg = m.registryClosure.checkedRegistries[0];
  assert.equal(reg.registryPath, 'packages/image-generation-runtime/assets/architecture-anchors/registry.json');
  assert.equal(reg.referencedImagePaths.length, 3);
  for (const img of reg.referencedImagePaths) {
    assert.ok(img.startsWith('packages/image-generation-runtime/assets/architecture-anchors/jiuzhou-aesthetics/'));
    assert.ok(img.endsWith('.png'));
  }
});

test('Bonus: real manifest SHA-256 of the 4 VA prompts matches disk', () => {
  const m = readRealManifest();
  for (const a of m.assets) {
    if (!a.path.startsWith('apps/cli/prompts/analysis/')) continue;
    const onDisk = sha256OfFile(path.join(REPO_ROOT, a.path));
    assert.equal(onDisk, a.sha256, `SHA-256 drift: ${a.path}`);
  }
});

function sha256OfFile(absPath) {
  const crypto = nodeCrypto;
  return crypto.createHash('sha256').update(fs.readFileSync(absPath)).digest('hex');
}
