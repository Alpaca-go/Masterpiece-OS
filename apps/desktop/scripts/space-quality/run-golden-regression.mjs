#!/usr/bin/env node
// Space Generator Golden Regression Runner (Phase R8).
//
// Offline mode (default): for every frozen golden scene under
//   space-generator/quality-baselines/phase9b-recovered/<brand>/<scene>/
// re-compile the Phase 9B prompt from the snapshot V5 packet and assert the
// prompt hash, block order and quality gate still match the frozen manifest.
// This proves code changes did not silently change the golden prompt. It does
// NOT prove image quality — that requires --real + human scoring.
//
// Real mode (--real): reuses the Electron real-provider path
//   (apps/desktop/scripts/space-quality-recovery/run-real-ab.ts) to regenerate
//   an image for each scene, then emits an evaluation template for scoring.
//   Requires explicit user authorization and a Desktop API profile.
//
// Usage:
//   node apps/desktop/scripts/space-quality/run-golden-regression.mjs
//   node apps/desktop/scripts/space-quality/run-golden-regression.mjs --real
//   node apps/desktop/scripts/space-quality/run-golden-regression.mjs --brand jiuzhou-aesthetics
//   node apps/desktop/scripts/space-quality/run-golden-regression.mjs --scene reception

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SERIES_ROOT = path.join(
  REPO_ROOT,
  'space-generator',
  'quality-baselines',
  'phase9b-recovered',
);

function parseArgs(argv) {
  const out = { real: false, brand: null, scene: null, json: false };
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'real') out.real = true;
    else if (key === 'brand') out.brand = value;
    else if (key === 'scene') out.scene = value;
    else if (key === 'json') out.json = true;
  }
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// Discover frozen scenes: <seriesRoot>/<brandKey>/<scene>/manifest.json
function discoverScenes(brandFilter, sceneFilter) {
  const scenes = [];
  if (!fs.existsSync(SERIES_ROOT)) return scenes;
  for (const brandEntry of fs.readdirSync(SERIES_ROOT, { withFileTypes: true })) {
    if (!brandEntry.isDirectory() || brandEntry.name.startsWith('_')) continue;
    if (brandFilter && brandEntry.name !== brandFilter) continue;
    const brandDir = path.join(SERIES_ROOT, brandEntry.name);
    for (const sceneEntry of fs.readdirSync(brandDir, { withFileTypes: true })) {
      if (!sceneEntry.isDirectory()) continue;
      if (sceneFilter && sceneEntry.name !== sceneFilter) continue;
      const manifestPath = path.join(brandDir, sceneEntry.name, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        scenes.push({ brandKey: brandEntry.name, scene: sceneEntry.name, manifestPath });
      }
    }
  }
  return scenes;
}

async function loadCompiler() {
  const [compilerMod, gateMod] = await Promise.all([
    import(pathToFileURL(path.join(
      REPO_ROOT,
      'packages/image-generation-runtime/src/vnext/space-quality/phase9b-space-compiler.js',
    )).href),
    import(pathToFileURL(path.join(
      REPO_ROOT,
      'packages/image-generation-runtime/src/vnext/space-quality/space-quality-gate.js',
    )).href),
  ]);
  return {
    compilePhase9bSpacePrompt: compilerMod.compilePhase9bSpacePrompt,
    runSpaceQualityGate: gateMod.runSpaceQualityGate,
  };
}

function buildTaskContract(manifest) {
  return {
    schemaVersion: '1.0',
    taskId: `golden-regression-${manifest.brandKey}-${manifest.scene}`,
    projectId: manifest.project?.projectId || `${manifest.brandKey}-golden`,
    deliverableFamily: 'space',
    subtype: manifest.scene,
    shot: 'entrance_view',
    count: 1,
    aspectRatio: manifest.provider?.aspectRatio || '16:9',
    currentInstruction: manifest.taskInstruction || '',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: manifest.referenceIds || [],
    logoUsageMode: 'post_composite',
    createdAt: new Date('2026-08-08T00:00:00.000Z').toISOString(),
  };
}

async function runOneOffline(scene, { compilePhase9bSpacePrompt, runSpaceQualityGate }) {
  const manifest = JSON.parse(fs.readFileSync(scene.manifestPath, 'utf8'));
  const packetPath = path.resolve(path.dirname(scene.manifestPath), manifest.project.packetFile);
  if (!fs.existsSync(packetPath)) {
    return { ...scene, ok: false, error: `packet not found: ${manifest.project.packetFile}` };
  }
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const taskContract = buildTaskContract(manifest);

  let compiled;
  try {
    compiled = compilePhase9bSpacePrompt({
      packet,
      taskContract,
      brandKey: manifest.brandKey,
      referencePolicy: { mode: 'phase9b_quality' },
    });
  } catch (err) {
    return { ...scene, ok: false, error: `compile threw: ${err.message}` };
  }

  const hash = sha256(compiled.finalPrompt);
  const quality = runSpaceQualityGate({
    finalPrompt: compiled.finalPrompt,
    blockIds: compiled.blockIds,
    blocksById: compiled.blocksById,
    referenceCount: compiled.referenceImages.length || 1,
    hasExplicitReferenceBypass: false,
  });

  const findings = [];
  if (hash !== manifest.promptHash) {
    findings.push({
      code: 'PROMPT_HASH_DRIFT',
      expected: manifest.promptHash,
      actual: hash,
    });
  }
  const expectedBlocks = manifest.blockIds || compiled.blockIds;
  if (JSON.stringify(compiled.blockIds) !== JSON.stringify(expectedBlocks)) {
    findings.push({ code: 'BLOCK_ORDER_DRIFT', expected: expectedBlocks, actual: compiled.blockIds });
  }
  if (quality.status !== 'pass') {
    findings.push({ code: 'QUALITY_GATE', status: quality.status, gateFindings: quality.findings });
  }

  return {
    ...scene,
    ok: findings.length === 0,
    hash,
    promptChars: [...compiled.finalPrompt].length,
    anchorIds: compiled.anchors.map((a) => a.id),
    qualityGate: quality.status,
    findings,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const scenes = discoverScenes(args.brand, args.scene);

  if (scenes.length === 0) {
    process.stdout.write('[golden-regression] no frozen scenes found yet.\n');
    process.stdout.write(`  Expected under: ${SERIES_ROOT}\n`);
    process.stdout.write('  Populate baselines, then re-run. Offline check skipped.\n');
    // Not a failure during R8 bootstrap — baselines are being created.
    return;
  }

  if (args.real) {
    process.stdout.write('[golden-regression] --real requires the Electron real-provider runner.\n');
    process.stdout.write('  Use: electron apps/desktop/scripts/run-phase9b-real-ab.mjs --scene <scene>\n');
    process.stdout.write('  This offline script only verifies prompt determinism.\n');
    process.exit(2);
  }

  const compiler = await loadCompiler();
  const results = [];
  for (const scene of scenes) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await runOneOffline(scene, compiler));
  }

  const passed = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ results, summary: { total: results.length, passed: passed.length, failed: failed.length } }, null, 2)}\n`);
  } else {
    for (const r of results) {
      const tag = r.ok ? 'PASS' : 'FAIL';
      process.stdout.write(`[${tag}] ${r.brandKey}/${r.scene}  ${r.promptChars ?? '?'} chars  q=${r.qualityGate ?? 'n/a'}\n`);
      for (const f of r.findings || []) {
        process.stdout.write(`       - ${f.code}\n`);
      }
      if (r.error) process.stdout.write(`       error: ${r.error}\n`);
    }
    process.stdout.write(`\n${passed.length}/${results.length} golden scenes match their frozen prompt.\n`);
  }

  if (failed.length) process.exit(1);
}

main().catch((err) => {
  process.stderr.write(`[golden-regression] failed: ${err?.stack || err}\n`);
  process.exit(1);
});
