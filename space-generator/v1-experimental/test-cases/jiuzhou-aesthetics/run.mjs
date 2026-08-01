#!/usr/bin/env node
// Phase 4 vertical test infrastructure: 8 scenes x 3 versions x 2 slots = 48 trace cases.
// 不真跑 Provider, 只生成 trace 骨架 + 验证 + 输出 trace-index.json.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { compileTrace } = await import(
  '../../prompt-compiler/trace/compile-trace.mjs',
);

const scenesPath = join(__dirname, 'scenes.json');
const versionsPath = join(__dirname, 'versions.json');
const baseDnaPath = join(
  __dirname, '..', '..', 'field-schema', 'examples', 'jiuzhou-aesthetics.dna.json',
);
const baseSourcesPath = join(
  __dirname, '..', '..', 'prompt-compiler', 'trace', 'examples', 'jiuzhou-aesthetics.sources.json',
);
const resultsDir = join(__dirname, 'results');

mkdirSync(resultsDir, { recursive: true });

const scenes = JSON.parse(readFileSync(scenesPath, 'utf8'));
const versions = JSON.parse(readFileSync(versionsPath, 'utf8'));
const baseDna = JSON.parse(readFileSync(baseDnaPath, 'utf8'));
const baseSources = JSON.parse(readFileSync(baseSourcesPath, 'utf8'));

// --- helpers ---

/**
 * 按 scene 派生 DNA: 替换 sceneDefinition / functionalDna / compositionDna 部分字段
 * 保留 project / brandSpaceDna / materialDna / lightingDna / negativeConstraints 等共享字段
 */
function deriveDna(baseDna, scene) {
  return {
    ...baseDna,
    dnaVersion: 'v0.1',
    sceneDefinition: {
      ...baseDna.sceneDefinition,
      sceneType: scene.sceneType,
      sceneSubtype: scene.sceneSubtype,
      commercialContext: scene.commercialContext,
      scale: scene.scale,
      areaSqm: scene.areaSqm || baseDna.sceneDefinition.areaSqm,
      requiredZones: scene.requiredZones,
      optionalZones: scene.optionalZones || [],
    },
    functionalDna: {
      ...baseDna.functionalDna,
      privacy: (scene.sceneType === 'treatment' || scene.sceneType === 'consultation')
        ? { ...baseDna.functionalDna.privacy, treatmentZone: 'enclosed' }
        : baseDna.functionalDna.privacy,
    },
    compositionDna: {
      ...baseDna.compositionDna,
      camera: {
        ...baseDna.compositionDna.camera,
        lens: scene.sceneType === 'corridor' ? 'normal' : baseDna.compositionDna.camera.lens,
        height: scene.sceneType === 'corridor' ? 'human_eye_level' : baseDna.compositionDna.camera.height,
      },
    },
    metadata: {
      ...baseDna.metadata,
      sourceBenchmarkIds: baseDna.metadata?.sourceBenchmarkIds || [
        'JZMX-SGR-01-Exterior',
        'JZMX-SGR-02-Reception',
      ],
      sceneId: scene.id,
    },
  };
}

/**
 * 按 scene 派生 sources: 替换 scene_requirement, 保持其他类别
 */
function deriveSources(baseSources, scene) {
  return {
    ...baseSources,
    sceneRequirement: [
      {
        id: `scene.${scene.id.toLowerCase().replace(/-/g, '_')}`,
        type: 'scene_requirement',
        content: {
          field: 'sceneDefinition',
          sceneType: scene.sceneType,
          sceneSubtype: scene.sceneSubtype,
          commercialContext: scene.commercialContext,
          scale: scene.scale,
          areaSqm: scene.areaSqm,
          requiredZones: scene.requiredZones,
        },
        evidenceRefs: [
          `space-generator/v1-experimental/test-cases/jiuzhou-aesthetics/scenes.json#${scene.id}`,
          `v1.0 §8.1 第一轮核心品牌空间 ${scene.name}`,
        ],
        confidence: 0.9,
        reason: `v1.0 §8.1 第一轮 8 空间之 ${scene.id}, scene_subtype / requiredZones 显式指定`,
      },
    ],
  };
}

function withVersionTag(trace, version, slotIndex) {
  return {
    ...trace,
    sources: {
      ...trace.sources,
      modelAdapter: trace.sources.modelAdapter.concat([
        {
          id: `version.${version.id}.${String(slotIndex).padStart(2, '0')}`,
          type: 'model_adapter',
          content: {
            field: '_version_tag',
            value: { versionId: version.id, slotIndex },
          },
          evidenceRefs: [
            `space-generator/v1-experimental/test-cases/jiuzhou-aesthetics/versions.json#${version.id}`,
          ],
          confidence: 1.0,
          reason: `v1.0 §30 Phase 4: test case 标记. version=${version.id}, slot=${slotIndex}`,
        },
      ]),
    },
  };
}

// --- main loop ---
const SLOTS_PER_VERSION = 2;
const indexEntries = [];
let compiled = 0;
let failed = 0;

for (const scene of scenes.scenes) {
  for (const version of versions.promptVersions) {
    for (let slotIndex = 1; slotIndex <= SLOTS_PER_VERSION; slotIndex++) {
      const testId = `${scene.id}-${version.id}-${String(slotIndex).padStart(2, '0')}`;
      const sceneDna = deriveDna(baseDna, scene);
      const sceneSources = deriveSources(baseSources, scene);

      let trace;
      try {
        trace = compileTrace({ dna: sceneDna, sources: sceneSources });
        trace = withVersionTag(trace, version, slotIndex);
      } catch (err) {
        failed += 1;
        indexEntries.push({
          testId,
          sceneId: scene.id,
          versionId: version.id,
          slotIndex,
          status: 'failed',
          error: err.message,
        });
        continue;
      }

      const tracePath = join(resultsDir, `${testId}.trace.json`);
      writeFileSync(tracePath, JSON.stringify(trace, null, 2));
      compiled += 1;
      indexEntries.push({
        testId,
        sceneId: scene.id,
        sceneName: scene.name,
        versionId: version.id,
        slotIndex,
        dnaVersion: trace.dnaVersion,
        dnaFingerprint: trace.dnaFingerprint,
        tracePath: `results/${testId}.trace.json`,
        fieldProvenanceCount: Object.keys(trace.fieldProvenance).length,
        sourcesCount: Object.fromEntries(
          Object.entries(trace.sources).map(([k, v]) => [k, v.length]),
        ),
        status: 'trace_compiled',
      });
    }
  }
}

const indexPath = join(resultsDir, 'trace-index.json');
writeFileSync(indexPath, JSON.stringify({
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  totalExpected: scenes.scenes.length * versions.promptVersions.length * SLOTS_PER_VERSION,
  compiled,
  failed,
  entries: indexEntries,
}, null, 2));

console.log(`Phase 4 vertical test infrastructure:`);
console.log(`  scenes:    ${scenes.scenes.length}`);
console.log(`  versions:  ${versions.promptVersions.length}`);
console.log(`  per-ver:   ${SLOTS_PER_VERSION} slots`);
console.log(`  expected:  ${scenes.scenes.length * versions.promptVersions.length * SLOTS_PER_VERSION}`);
console.log(`  compiled:  ${compiled}`);
console.log(`  failed:    ${failed}`);
console.log(`  index:     results/trace-index.json`);
