#!/usr/bin/env node
// archive-r10-final.mjs — R10.4 final acceptance archive builder.
//
// Builds the r10-final/ baseline from the existing real-provider smoke runs
// (which were human-accepted) without re-running the provider. For each scene
// it copies the real output.png / run.json / reference-trace.json /
// provider-payload.redacted.json and re-compiles the same frozen packet + task
// through the production compiler to emit the deterministic artifacts:
// task-contract.json, compiled-prompt.json (blocks + trace), compiled-prompt.md.
//
// evaluation.json is written from the human acceptance scores embedded below
// (from the R10.4 final acceptance doc §3-§6).
//
// Usage: node apps/desktop/scripts/space-r10-archive/archive-r10-final.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const OUT_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'r10-final');

const SCENES = [
  {
    id: 'JZMX-STD-01',
    brandKey: 'jiuzhou-aesthetics',
    outRel: 'jiuzhou-aesthetics/standard',
    source: 'space-generator/quality-baselines/r9-parity/jiuzhou-aesthetics/production-reception-1',
    subtype: 'reception',
    shot: 'entrance_view',
    referenceAssetIds: [],
    evaluation: {
      result: 'pass',
      architectureExpressiveness: 4.2,
      functionalRealism: 4.4,
      brandSpecificity: 3.7,
      literalMotifRisk: 0.5,
      crossBrandIsolation: 5,
      notes: ['略偏 generic upscale clinic —— 品牌表达上限，不构成 R10.4 regression fail'],
    },
  },
  {
    id: 'JZMX-HF-01',
    brandKey: 'jiuzhou-aesthetics',
    outRel: 'jiuzhou-aesthetics/reference-first',
    source: 'space-generator/quality-baselines/r10-reference-first/jiuzhou-aesthetics/ref-reception-1',
    subtype: 'reception',
    shot: 'entrance_view',
    referenceAssetIds: ['r10-hf-reference'],
    evaluation: {
      result: 'pass',
      architectureExpressiveness: 4.5,
      functionalRealism: 4.3,
      brandSpecificity: 4.4,
      literalMotifRisk: 1,
      crossBrandIsolation: 5,
      notes: ['Reference-First：半透明边界层次更丰富，品牌识别高于 Standard'],
    },
  },
  {
    id: 'FTT-STD-01',
    brandKey: 'feng-tang-tang',
    outRel: 'feng-tang-tang/standard',
    source: 'space-generator/quality-baselines/r9-parity/feng-tang-tang/production-dining-1',
    subtype: 'lobby',
    shot: 'entrance_view',
    referenceAssetIds: [],
    evaluation: {
      result: 'pass',
      functionalRealism: 4.6,
      brandSpecificity: 3.9,
      literalMotifRisk: 1,
      crossBrandIsolation: 5,
      notes: ['open kitchen / operation / customer flow 成立；木作/红砖/暖光稳定'],
    },
  },
  {
    id: 'YJLF-STD-01',
    brandKey: 'yi-ji-liang-fang',
    outRel: 'yi-ji-liang-fang/standard',
    source: 'space-generator/quality-baselines/r9-parity/yi-ji-liang-fang/production-reception-1',
    subtype: 'reception',
    shot: 'entrance_view',
    referenceAssetIds: [],
    evaluation: {
      result: 'pass',
      atmosphere: 4.6,
      functionalRealism: 4.1,
      brandSpecificity: 4.3,
      literalMotifRisk: 1,
      crossBrandIsolation: 5,
      notes: ['温润/克制/东方；无餐饮污染、无医美膜结构污染'],
    },
  },
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function loadJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
}

async function compileProduction(brandKey, subtype, shot, projectId, referenceAssetIds, currentInstruction) {
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'r8_6_golden';
  const packet = loadJson(`space-generator/quality-baselines/phase9b-recovered/_packets/${brandKey}/visual-decision-packet.json`);
  const ctx = { projectId };
  ctx.visualDecisionPacket = packet;
  const task = {
    schemaVersion: '1.0',
    taskId: `r10-final-${brandKey}-${Date.now()}`,
    projectId,
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction,
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds,
    logoUsageMode: 'post_composite',
    createdAt: new Date('2026-08-08T00:00:00.000Z').toISOString(),
  };
  const mod = await import(pathToFileURL(path.join(
    REPO_ROOT, 'packages/image-generation-runtime/src/vnext/compile.js',
  )).href);
  const out = mod.compileVNextImageGeneration({
    projectContext: ctx,
    model: 'doubao-seedream-5-0-pro-260628',
    task,
    brandKey,
  });
  return out;
}

async function main() {
  for (const scene of SCENES) {
    const outDir = path.join(OUT_ROOT, scene.outRel);
    fs.mkdirSync(outDir, { recursive: true });
    const sourceDir = path.join(REPO_ROOT, scene.source);

    // 1. Real provider artifacts (copied as-is).
    fs.copyFileSync(path.join(sourceDir, 'output.png'), path.join(outDir, 'output.png'));
    const run = loadJson(`${scene.source}/run.json`);
    fs.copyFileSync(path.join(sourceDir, 'run.json'), path.join(outDir, 'run.json'));
    fs.copyFileSync(path.join(sourceDir, 'reference-trace.json'), path.join(outDir, 'reference-trace.json'));
    fs.copyFileSync(path.join(sourceDir, 'provider-payload.redacted.json'), path.join(outDir, 'provider-payload.redacted.json'));

    // 2. Deterministic compile artifacts (same frozen packet + task).
    const instruction = run.promptHash
      ? 'R10.4 final acceptance smoke (r8_6_golden).'
      : 'R10.4 final acceptance smoke (r8_6_golden).';
    const compiled = await compileProduction(
      scene.brandKey,
      scene.subtype,
      scene.shot,
      run.projectId ?? `${scene.brandKey}-r10-final`,
      scene.referenceAssetIds,
      instruction,
    );
    const { taskContract, compiledPrompt } = compiled;

    fs.writeFileSync(
      path.join(outDir, 'task-contract.json'),
      `${JSON.stringify(taskContract, null, 2)}\n`,
      'utf8',
    );
    fs.writeFileSync(
      path.join(outDir, 'compiled-prompt.json'),
      `${JSON.stringify({
        schemaVersion: '1.0',
        finalPrompt: compiledPrompt.finalPrompt,
        editablePrompt: compiledPrompt.editablePrompt,
        blocks: compiledPrompt.blocks,
        sourceMap: compiledPrompt.sourceMap,
        trace: compiledPrompt.trace,
        referenceAssetIds: compiledPrompt.referenceAssetIds,
        logoUsageMode: compiledPrompt.logoUsageMode,
      }, null, 2)}\n`,
      'utf8',
    );
    fs.writeFileSync(path.join(outDir, 'compiled-prompt.md'), `${compiledPrompt.finalPrompt}\n`, 'utf8');
    fs.writeFileSync(
      path.join(outDir, 'trace.json'),
      `${JSON.stringify({
        compilerId: compiledPrompt.trace.spaceGeneration?.compilerId ?? compiledPrompt.trace.compilerId,
        compilerVersion: compiledPrompt.trace.spaceGeneration?.compilerVersion ?? compiledPrompt.trace.compilerVersion,
        sourceAdapterVersion: compiledPrompt.trace.spaceGeneration?.sourceAdapterVersion ?? null,
        generationBasis: compiledPrompt.trace.spaceGeneration?.generationBasis ?? null,
        referenceMode: compiledPrompt.trace.spaceGeneration?.referenceMode ?? null,
        referenceAssetIds: compiledPrompt.trace.spaceGeneration?.referenceIds ?? [],
        referenceCount: scene.referenceAssetIds.length,
        referenceSources: [],
        compilerIdFull: compiledPrompt.trace.spaceGeneration?.compilerId ?? null,
        promptCharacters: compiledPrompt.trace.spaceGeneration?.promptCharacters ?? null,
        promptHash: compiledPrompt.trace.spaceGeneration?.promptHash ?? null,
        provider: compiledPrompt.trace.spaceGeneration?.provider ?? null,
        model: compiledPrompt.trace.spaceGeneration?.model ?? null,
      }, null, 2)}\n`,
      'utf8',
    );

    // 3. Human evaluation.
    const evaluation = {
      schemaVersion: '1.0',
      baseline: 'r10-final',
      sampleId: scene.id,
      brandKey: scene.brandKey,
      role: scene.outRel.split('/')[1],
      ...scene.evaluation,
      scoredBy: 'human-r10.4-acceptance',
      scoredAt: '2026-08-09T00:00:00.000Z',
    };
    fs.writeFileSync(path.join(outDir, 'evaluation.json'), `${JSON.stringify(evaluation, null, 2)}\n`, 'utf8');

    console.log(`archived ${scene.id} -> ${scene.outRel} (refs=${scene.referenceAssetIds.length})`);
  }
  console.log('\nR10 final archive complete.');
}

main().catch((err) => {
  process.stderr.write(`archive failed: ${err?.stack || err}\n`);
  process.exit(1);
});
