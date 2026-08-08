#!/usr/bin/env node
// Build a blank 100-point evaluation.json for a golden scene.
//
// Usage:
//   node apps/desktop/scripts/space-quality/build-evaluation-template.mjs \
//     --brand <brandKey> --scene <scene> --run-id <runId> [--out path]
//
// Weights are fixed by Phase R8 §4:
//   Architecture 25 / Brand 20 / Functional 20 / Material&Light 15 /
//   Composition 10 / Rendering 10 = 100.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SERIES_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'phase9b-recovered');

const WEIGHTS = {
  architectureQuality: 0.25,
  brandTranslation: 0.20,
  functionalRealism: 0.20,
  materialAndLighting: 0.15,
  composition: 0.10,
  rendering: 0.10,
};

function parseArgs(argv) {
  const out = { brand: null, scene: null, runId: null, out: null };
  const map = { brand: 'brand', scene: 'scene', 'run-id': 'runId', out: 'out' };
  for (let i = 0; i < argv.length; i += 1) {
    const m = argv[i].match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const key = map[m[1]];
    if (!key) continue;
    out[key] = m[2] !== undefined ? m[2] : argv[++i];
  }
  return out;
}

function blankDimension(weight) {
  return { rawScore: null, weight, weightedScore: null, note: '' };
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.brand || !args.scene || !args.runId) {
    process.stderr.write('Usage: build-evaluation-template.mjs --brand <key> --scene <scene> --run-id <id>\n');
    process.exit(2);
  }

  const dimensions = {};
  for (const [name, weight] of Object.entries(WEIGHTS)) {
    dimensions[name] = blankDimension(weight);
  }

  const tpl = {
    schemaVersion: '1.0',
    brandKey: args.brand,
    scene: args.scene,
    runId: args.runId,
    dimensions,
    diagnostics: {
      genericAiSpaceRisk: null,
      referenceAlignment: null,
    },
    brandSpecificChecks: [],
    total: null,
    verdict: null,
    scoredBy: null,
    scoredAt: null,
    notes: 'Fill rawScore 0-100 per dimension. weightedScore = rawScore * weight. total = sum of weightedScores. Set genericAiSpaceRisk 1-5 (<=2) and referenceAlignment 1-5 (>=4). verdict: golden/pass/fail.',
  };

  const outPath = args.out
    || path.join(SERIES_ROOT, args.brand, args.scene, 'evaluation.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(tpl, null, 2)}\n`, 'utf8');
  process.stdout.write(`Wrote evaluation template: ${outPath}\n`);
}

main();
