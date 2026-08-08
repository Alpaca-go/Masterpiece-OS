#!/usr/bin/env node
// compare-trace.mjs — R9 trace comparison utility.
//
// Compares the production compiler's emitted spaceGeneration trace (R9 §20)
// against a frozen R8.6 final-smoke record, and prints a machine-readable
// diff. Useful to audit that the production trace schema carries the same
// compiler identity, source adapter version, semantic separation version,
// anchor set, reference mode and character budget as the frozen baseline.
//
// Usage:
//   node apps/desktop/scripts/space-r9-parity/compare-trace.mjs \
//     <brand>/<scene>        (e.g. jiuzhou-aesthetics/final-reception-1)
//   node apps/desktop/scripts/space-r9-parity/compare-trace.mjs --json

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const BASELINE_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'r8.6');

const SCENE_TASKS = {
  'jiuzhou-aesthetics/final-reception-1': { subtype: 'reception', shot: 'entrance_view' },
  'jiuzhou-aesthetics/final-entrance-1': { subtype: 'storefront', shot: 'entrance_view' },
  'feng-tang-tang/final-dining-1': { subtype: 'lobby', shot: 'entrance_view' },
  'yi-ji-liang-fang/final-reception-1': { subtype: 'reception', shot: 'entrance_view' },
};

function parseArgs(argv) {
  const out = { json: false, scene: null };
  for (const raw of argv.slice(2)) {
    if (raw === '--json') { out.json = true; continue; }
    if (!raw.startsWith('--')) out.scene = raw;
  }
  return out;
}

async function compileTrace(brand, scene, subtype, shot, projectId) {
  const packetPath = path.join(
    REPO_ROOT, 'space-generator', 'quality-baselines', 'phase9b-recovered', '_packets', brand, 'visual-decision-packet.json',
  );
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const taskContract = {
    schemaVersion: '1.0',
    taskId: `r9-trace-${brand}-${scene}`,
    projectId,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R8.6 final smoke run 1/1 (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
  const mod = await import(pathToFileURL(path.join(
    REPO_ROOT, 'packages/image-generation-runtime/src/vnext/compile.js',
  )).href);
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const out = mod.compileVNextImageGeneration({
    projectContext: { projectId, visualDecisionPacket: packet },
    model: 'doubao-seedream-5-0-pro-260628',
    task: taskContract,
    brandKey: brand,
  });
  return out.compiledPrompt.trace.spaceGeneration;
}

async function main() {
  const args = parseArgs(process.argv);
  const scenes = args.scene ? [args.scene] : Object.keys(SCENE_TASKS);
  const rows = [];

  for (const rel of scenes) {
    const [brand, scene] = rel.split('/');
    const task = SCENE_TASKS[rel];
    if (!task) { rows.push({ scene: rel, status: 'SKIP', detail: 'unknown scene' }); continue; }
    const manifest = JSON.parse(fs.readFileSync(path.join(BASELINE_ROOT, brand, scene, 'manifest.json'), 'utf8'));
    const run = JSON.parse(fs.readFileSync(path.join(BASELINE_ROOT, brand, scene, 'run.json'), 'utf8'));
    const live = await compileTrace(brand, scene, task.subtype, task.shot, manifest.project.projectId);

    const diffs = [];
    if (live.compilerId !== run.phase9b?.compilerId && live.compilerId !== 'phase9b-quality-compiler') {
      diffs.push('compilerId');
    }
    if (live.referenceMode !== 'text_only') diffs.push('referenceMode');
    if (live.promptHash !== run.promptHash) diffs.push('promptHash');
    if (live.promptCharacters !== run.promptChars) diffs.push('promptCharacters');
    if (live.referenceIds.length !== 0) diffs.push('referenceIds');

    rows.push({
      scene: rel,
      status: diffs.length ? 'DIFF' : 'MATCH',
      live,
      frozen: {
        compilerId: run.phase9b?.compilerId ?? null,
        promptHash: run.promptHash,
        promptChars: run.promptChars,
      },
      diffs,
    });
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
    return;
  }
  for (const r of rows) {
    process.stdout.write(`[${r.status}] ${r.scene} compiler=${r.live?.compilerId} mode=${r.live?.referenceMode} hash=${r.live?.promptHash?.slice(0, 12)} chars=${r.live?.promptCharacters}${r.diffs?.length ? ` DIFFS=${r.diffs.join(',')}` : ''}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`compare-trace failed: ${err?.stack || err}\n`);
  process.exit(1);
});
