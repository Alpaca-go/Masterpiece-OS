#!/usr/bin/env node
// run-parity.mjs — R9 text-level parity runner (Mode A = R8.6 frozen vs
// Mode B = production src/space compiler).
//
// Offline (no provider): for every frozen R8.6 final-smoke scene, compile the
// packet through the production Space Generator module (src/space) and assert
// the emitted prompt hash, block order, budget and trace match the frozen
// R8.6 baseline records. Because the production compiler is the frozen core
// migrated equivalently, a hash match is the strong text-level parity signal.
//
// Mode A (baseline) = the recorded R8.6 golden manifests + run.json.
// Mode B (production) = live compile via packages/image-generation-runtime/
//   src/space/phase9b-space-compiler.js.
//
// Usage:
//   node apps/desktop/scripts/space-r9-parity/run-parity.mjs
//   node apps/desktop/scripts/space-r9-parity/run-parity.mjs --json
//   node apps/desktop/scripts/space-r9-parity/run-parity.mjs --brand jiuzhou-aesthetics
//
// Real-provider image parity is a separate, user-authorized step (R9.9);
// this runner is strictly offline and must never call a provider.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BASELINE_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'r8.6');

const SCENES = [
  { brand: 'jiuzhou-aesthetics', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view' },
  { brand: 'jiuzhou-aesthetics', scene: 'final-entrance-1', subtype: 'storefront', shot: 'entrance_view' },
  { brand: 'feng-tang-tang', scene: 'final-dining-1', subtype: 'lobby', shot: 'entrance_view' },
  { brand: 'yi-ji-liang-fang', scene: 'final-reception-1', subtype: 'reception', shot: 'entrance_view' },
];

function parseArgs(argv) {
  const out = { json: false, brand: null };
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'json') out.json = true;
    else if (key === 'brand') out.brand = value;
  }
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function loadProductionCompiler() {
  const mod = await import(pathToFileURL(path.join(
    REPO_ROOT,
    'packages/image-generation-runtime/src/space/phase9b-space-compiler.js',
  )).href);
  return { compilePhase9bSpacePrompt: mod.compilePhase9bSpacePrompt };
}

function buildTaskContract(manifest, subtype, shot) {
  return {
    schemaVersion: '1.0',
    taskId: `r9-parity-${manifest.brandKey}-${manifest.scene}`,
    projectId: manifest.project?.projectId || `${manifest.brandKey}-parity`,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: manifest.provider?.aspectRatio || '16:9',
    currentInstruction: 'R8.6 final smoke run 1/1 (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: new Date('2026-08-08T00:00:00.000Z').toISOString(),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const { compilePhase9bSpacePrompt } = await loadProductionCompiler();

  const results = [];
  let failures = 0;

  for (const { brand, scene, subtype, shot } of SCENES) {
    if (args.brand && brand !== args.brand) continue;
    const sceneDir = path.join(BASELINE_ROOT, brand, scene);
    const manifestPath = path.join(sceneDir, 'manifest.json');
    const runPath = path.join(sceneDir, 'run.json');
    if (!fs.existsSync(manifestPath) || !fs.existsSync(runPath)) {
      failures += 1;
      results.push({ brand, scene, status: 'FAIL', detail: 'missing frozen manifest/run' });
      continue;
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));

    // Frozen R8.6 packet for this brand (same input the smoke used).
    const packetPath = path.join(
      REPO_ROOT,
      'space-generator', 'quality-baselines', 'phase9b-recovered', '_packets', brand, 'visual-decision-packet.json',
    );
    if (!fs.existsSync(packetPath)) {
      failures += 1;
      results.push({ brand, scene, status: 'FAIL', detail: 'missing frozen packet' });
      continue;
    }
    const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
    const taskContract = buildTaskContract(manifest, subtype, shot);
    const out = compilePhase9bSpacePrompt({
      packet,
      taskContract,
      projectContext: { projectId: taskContract.projectId },
      brandKey: brand,
      anchorMaxCount: 3,
    });

    const promptHash = sha256(out.finalPrompt);
    const checks = {
      promptHashMatches: promptHash === run.promptHash,
      blockOrderMatches: JSON.stringify(out.blockIds) === JSON.stringify(manifest.blockIds),
      budgetOk: out.budget.chars <= 7500,
      refsZero: taskContract.referenceAssetIds.length === 0,
    };
    const ok = Object.values(checks).every(Boolean);
    if (!ok) failures += 1;
    results.push({
      brand,
      scene,
      status: ok ? 'PASS' : 'FAIL',
      productionPromptHash: promptHash.slice(0, 12),
      frozenPromptHash: run.promptHash.slice(0, 12),
      promptChars: out.budget.chars,
      frozenPromptChars: run.promptChars,
      ...checks,
    });
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ status: failures ? 'fail' : 'pass', failures, results }, null, 2)}\n`);
  } else {
    for (const r of results) {
      const line = `[${r.status}] ${r.brand}/${r.scene} hash=${r.productionPromptHash} (frozen ${r.frozenPromptHash}) chars=${r.promptChars}/${r.frozenPromptChars} blocks=${r.blockOrderMatches ? 'ok' : 'MISMATCH'} budget=${r.budgetOk ? 'ok' : 'OVER'}`;
      process.stdout.write(`${line}\n`);
    }
    process.stdout.write(`\nR9 text-level parity: ${results.length - failures}/${results.length} PASS\n`);
    if (failures) {
      process.stdout.write(`R9 PARITY FAIL (${failures})\n`);
      process.exit(1);
    }
    process.stdout.write('R9 text-level parity PASS — production compiler is equivalent to the frozen R8.6 core.\n');
  }
}

main().catch((err) => {
  process.stderr.write(`run-parity failed: ${err?.stack || err}\n`);
  process.exit(1);
});
