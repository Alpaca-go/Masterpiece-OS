/**
 * CI-W1B Web Import Guard — static analysis.
 *
 * Verifies the Web side never:
 *   - imports @masterpiece/creative-intelligence
 *   - reads run files from disk
 *   - calls into Space / Packaging production chains
 *   - auto-selects the recommendation
 *   - uses window.masterpiece.creativeIntelligence.* in a way that
 *     bypasses the selection dialog
 *
 * These are scanned via regex over the CI workspace files only. The
 * pre-existing apps/web files (SettingsPanel etc.) are out of scope.
 */

import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..', '..');
const webRoot = path.join(repoRoot, 'apps', 'web', 'src');

// CI-W1B guards are scoped to the CI workspace files (the workspace
// component + the controller / types / format). Pre-existing apps/web
// files like SettingsPanel.tsx are out of scope.
const CI_WS_DIR = path.join(webRoot, 'components', 'CreativeIntelligenceWorkspace.tsx');
const CI_HELPER_DIR = path.join(webRoot, 'ciworkspace');
const CI_WS_FILES = [
  CI_WS_DIR,
  path.join(CI_HELPER_DIR, 'controller.ts'),
  path.join(CI_HELPER_DIR, 'types.ts'),
  path.join(CI_HELPER_DIR, 'format.ts')
];

const CI_PACKAGE_IMPORT = /from\s+['"]@masterpiece\/creative-intelligence(?:\/[^'"]+)?['"]/;
const FS_READ = /\bfs\.(read|readFile|readdir|readFileSync|readdirSync|statSync|stat|realpath|exists)/;
const DISK_PATH_HINT = /creative-intelligence-runs|application-runtime/;
const SEND_TO_PRODUCTION = /send.*to.*production|sendToProduction/;
const GENERATE_SPACE = /generateSpace|generate_space|Generate.*Space/i;
const GENERATE_PACKAGING = /generatePackaging|generate_packaging|Generate.*Packaging/i;
const PRODUCTION_PROMPT = /buildPrompt|build_prompt|productionPrompt/i;

function readSafe(file) {
  try { return readFileSync(file, 'utf8'); } catch { return ''; }
}

test('CI-W1B GUARD: CI workspace NEVER imports @masterpiece/creative-intelligence', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      CI_PACKAGE_IMPORT.test(text),
      false,
      `Forbidden CI package import in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: CI workspace NEVER reads run files from disk', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      FS_READ.test(text),
      false,
      `Forbidden fs.read usage in ${path.relative(repoRoot, file)}`
    );
    assert.equal(
      DISK_PATH_HINT.test(text),
      false,
      `Forbidden disk path hint in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: CI workspace NEVER references "Send to Production"', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      SEND_TO_PRODUCTION.test(text),
      false,
      `Forbidden "send to production" reference in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: CI workspace NEVER references Space / Packaging generation', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      GENERATE_SPACE.test(text),
      false,
      `Forbidden "Generate Space" reference in ${path.relative(repoRoot, file)}`
    );
    assert.equal(
      GENERATE_PACKAGING.test(text),
      false,
      `Forbidden "Generate Packaging" reference in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: CI workspace NEVER references production prompt generation', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      PRODUCTION_PROMPT.test(text),
      false,
      `Forbidden production prompt reference in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: selectDirection is ONLY called from a single explicit handler', () => {
  // The component must call ci.selectDirection() exactly once, in the
  // post-confirm handler. This guards against any background polling or
  // pre-render side effect that would auto-select a direction.
  const text = readSafe(CI_WS_DIR);
  const matches = text.match(/ci\.selectDirection\(/g) ?? [];
  assert.equal(matches.length, 1, 'ci.selectDirection must be called exactly once (in the post-confirm handler)');
});

test('CI-W1B GUARD: recommendation primaryDirectionId is NEVER directly applied as selectedDirectionId', () => {
  for (const file of CI_WS_FILES) {
    const text = readSafe(file);
    assert.equal(
      /primaryDirectionId[^\n]*selectedDirectionId|selectedDirectionId[^\n]*primaryDirectionId/.test(text),
      false,
      `Forbidden recommendation→selection assignment in ${path.relative(repoRoot, file)}`
    );
  }
});

test('CI-W1B GUARD: legacy DocumentContextWorkspace import is preserved (legacy compatibility)', () => {
  const app = path.join(webRoot, 'App.tsx');
  const text = readSafe(app);
  assert.equal(/DocumentContextWorkspace/.test(text), true, 'App.tsx must still import DocumentContextWorkspace for legacy deep links');
});

test('CI-W1B GUARD: AnalysisModeTabs surfaces creative-intelligence as primary + keeps document-context key', () => {
  const tabs = path.join(webRoot, 'components', 'AnalysisModeTabs.tsx');
  const text = readSafe(tabs);
  assert.equal(/creative-intelligence/.test(text), true, 'AnalysisModeTabs must surface creative-intelligence');
  assert.equal(/document-context/.test(text), true, 'AnalysisModeTabs must keep document-context as a mode key for back-compat');
  assert.equal(/VISIBLE_MODES/.test(text), true, 'AnalysisModeTabs must use a visible list (not just include document-context)');
});

test('CI-W1B GUARD: ciworkspace controller + types + format are pure (no React, no DOM, no fs)', () => {
  for (const sub of ['controller.ts', 'types.ts', 'format.ts']) {
    const text = readSafe(path.join(CI_HELPER_DIR, sub));
    assert.equal(/from\s+['"]react['"]/.test(text), false, `${sub} must not import React`);
    assert.equal(/document\.|window\./.test(text), false, `${sub} must not access DOM/window`);
    assert.equal(/\bfs\./.test(text), false, `${sub} must not use fs`);
  }
});
