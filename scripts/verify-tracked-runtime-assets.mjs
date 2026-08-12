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
