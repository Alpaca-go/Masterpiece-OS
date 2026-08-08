#!/usr/bin/env node
// One-off helper (R8 bootstrap): compile a scene from a snapshot packet and
// write the frozen prompt + a manifest skeleton + provider-payload +
// reference-trace into the baseline scene dir. The manifest still needs the
// real provider/run fields filled after a real image is generated.
//
// Usage:
//   node apps/desktop/scripts/space-quality/freeze-scene.mjs \
//     --brand jiuzhou-aesthetics --scene reception \
//     --project-id 13c636af-... \
//     --instruction "..."

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SERIES_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'phase9b-recovered');

const ARG_MAP = {
  brand: 'brand',
  scene: 'scene',
  'project-id': 'projectId',
  instruction: 'instruction',
  aspect: 'aspect',
};

function parseArgs(argv) {
  const out = { brand: null, scene: null, projectId: null, instruction: '', aspect: '16:9' };
  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const key = ARG_MAP[m[1]];
    if (!key) continue;
    const value = m[2] !== undefined ? m[2] : argv[++i];
    out[key] = value;
  }
  return out;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.brand || !args.scene || !args.projectId) {
    process.stderr.write('Usage: freeze-scene.mjs --brand <key> --scene <id> --project-id <id> [--instruction ...]\n');
    process.exit(2);
  }

  const packetPath = path.join(SERIES_ROOT, '_packets', args.brand, 'visual-decision-packet.json');
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));

  const { compilePhase9bSpacePrompt } = await import(pathToFileURL(path.join(
    REPO_ROOT, 'packages/image-generation-runtime/src/vnext/space-quality/phase9b-space-compiler.js',
  )).href);

  const taskContract = {
    schemaVersion: '1.0',
    taskId: `golden-${args.brand}-${args.scene}`,
    projectId: args.projectId,
    deliverableFamily: 'space',
    subtype: args.scene,
    shot: 'entrance_view',
    count: 1,
    aspectRatio: args.aspect,
    currentInstruction: args.instruction,
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };

  const compiled = compilePhase9bSpacePrompt({
    packet,
    taskContract,
    brandKey: args.brand,
    referencePolicy: { mode: 'phase9b_quality' },
  });

  const sceneDir = path.join(SERIES_ROOT, args.brand, args.scene);
  fs.mkdirSync(sceneDir, { recursive: true });

  const promptFile = path.join(sceneDir, 'prompt.md');
  fs.writeFileSync(promptFile, compiled.finalPrompt, 'utf8');

  const referenceTrace = {
    brandKey: args.brand,
    anchorIds: compiled.anchors.map((a) => a.id),
    references: compiled.referenceImages.map((r) => ({
      anchorId: r.anchorId,
      imagePath: path.relative(REPO_ROOT, path.join(REPO_ROOT, r.imagePath)).replace(/\\/g, '/'),
      role: 'architecture_reference',
    })),
    referencePolicy: { mode: 'phase9b_quality' },
  };
  fs.writeFileSync(path.join(sceneDir, 'reference-trace.json'), `${JSON.stringify(referenceTrace, null, 2)}\n`, 'utf8');

  const providerPayload = {
    model: 'doubao-seedream-5-0-pro-260628',
    prompt: compiled.finalPrompt,
    image: referenceTrace.references.map((r) => ({ path: r.imagePath, role: r.role })),
    size: '2K',
    response_format: 'b64_json',
    watermark: false,
    _note: 'Redacted payload shape. Credentials never stored. Size/model fixed for this baseline.',
  };
  fs.writeFileSync(path.join(sceneDir, 'provider-payload.redacted.json'), `${JSON.stringify(providerPayload, null, 2)}\n`, 'utf8');

  const manifest = {
    schemaVersion: '1.0',
    baseline: 'phase9b-recovered',
    brandKey: args.brand,
    brandDisplayName: packet.projectFacts?.brandName?.value || args.brand,
    scene: args.scene,
    project: {
      projectId: args.projectId,
      packetFile: `../../_packets/${args.brand}/visual-decision-packet.json`,
    },
    compiler: {
      id: compiled.compilerId,
      mode: 'phase9b_quality',
      version: compiled.compilerVersion,
    },
    provider: {
      provider: 'volcengine',
      model: 'doubao-seedream-5-0-pro-260628',
      profileId: null,
      size: '2K',
      aspectRatio: args.aspect,
    },
    referenceIds: referenceTrace.references.map((r) => r.anchorId),
    architectureAnchorIds: referenceTrace.anchorIds,
    taskInstruction: args.instruction,
    blockIds: compiled.blockIds,
    promptHash: sha256(compiled.finalPrompt),
    output: {
      runId: null,
      imageFile: null,
      imageSha256: null,
      promptFile: 'prompt.md',
      providerPayloadFile: 'provider-payload.redacted.json',
      referenceTraceFile: 'reference-trace.json',
      runFile: 'run.json',
    },
    evaluation: {
      file: 'evaluation.json',
      status: 'pending',
    },
    createdAt: new Date().toISOString(),
    notes: 'Skeleton generated by freeze-scene.mjs. Fill output.runId/imageFile and evaluation after real-provider generation + scoring.',
  };
  fs.writeFileSync(path.join(sceneDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  process.stdout.write(`Froze ${args.brand}/${args.scene}: ${[...compiled.finalPrompt].length} chars, ${compiled.anchors.length} anchors, hash ${manifest.promptHash.slice(0, 12)}\n`);
  process.stdout.write(`  ${path.relative(REPO_ROOT, sceneDir)}\n`);
}

main().catch((err) => {
  process.stderr.write(`[freeze-scene] failed: ${err?.stack || err}\n`);
  process.exit(1);
});
