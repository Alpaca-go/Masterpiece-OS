#!/usr/bin/env node
// Prompt Trace 编译工具 v0.1
// 用法: node space-generator/v1-experimental/prompt-compiler/trace/compile-trace.mjs
// 验收 (v1.0 §30 Phase 3): 字段溯源, 不影响最终 prompt (Phase 5 才接)

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import crypto from 'node:crypto';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMA_PATH = join(__dirname, 'prompt-trace.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateTrace = ajv.compile(JSON.parse(readFileSync(SCHEMA_PATH, 'utf8')));

// ---------- helpers ----------

/**
 * 稳定 fingerprint: 排除 dnaVersion 和 metadata.frozenAt / generatedAt.
 * 同 DNA 实例不同时间产生 fingerprint 一致.
 */
export function dnaFingerprint(dna) {
  const { dnaVersion, metadata, ...rest } = dna;
  const stable = { ...rest, dnaVersion: rest.dnaVersion };
  const json = stableStringify(stable);
  return crypto.createHash('sha256').update(json).digest('hex').slice(0, 32);
}

/**
 * 稳定 JSON 序列化: 递归按 key 排序, 但不做 JSON.stringify replacer array 的过滤
 * (后者会递归过滤嵌套 keys, 导致 dnaFingerprint 永远一样).
 */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

/**
 * 字段路径列表: DNA 必填 + 顶层 project.
 * Phase 3 v0.1 覆盖 13 个核心字段.
 */
export const TRACED_FIELDS = [
  'project.brandName',
  'project.industry',
  'sceneDefinition.sceneType',
  'sceneDefinition.commercialContext',
  'architectureDna.spatialConcept.primary',
  'architectureDna.boundaryHardness',
  'architectureDna.statementStrength',
  'functionalDna.operationalRealism',
  'brandSpaceDna.injectionStrength',
  'materialDna.materialCountLimit',
  'lightingDna.primaryStrategy',
  'lightingDna.architecturalGlow',
  'compositionDna.camera.lens',
  'compositionDna.camera.height',
  'renderingDna.realism',
  'renderingDna.visualFinish',
  'variationControl.motifRepetitionLimit.sameMotifAcrossBatchRatio',
  'negativeConstraints.prohibit',
];

/**
 * v0.1 字段 → 默认 source 类别映射.
 * Phase 5 会让这个映射可配置, 但 v0.1 起步要稳定.
 */
export const DEFAULT_FIELD_ORIGIN = {
  'project.brandName': 'brand_analysis',
  'project.industry': 'brand_analysis',
  'sceneDefinition.sceneType': 'scene_requirement',
  'sceneDefinition.commercialContext': 'scene_requirement',
  'architectureDna.spatialConcept.primary': 'golden_reference',
  'architectureDna.boundaryHardness': 'golden_reference',
  'architectureDna.statementStrength': 'generic_architecture',
  'functionalDna.operationalRealism': 'generic_architecture',
  'brandSpaceDna.injectionStrength': 'brand_analysis',
  'materialDna.materialCountLimit': 'generic_architecture',
  'lightingDna.primaryStrategy': 'golden_reference',
  'lightingDna.architecturalGlow': 'golden_reference',
  'compositionDna.camera.lens': 'generic_architecture',
  'compositionDna.camera.height': 'generic_architecture',
  'renderingDna.realism': 'model_adapter',
  'renderingDna.visualFinish': 'model_adapter',
  'variationControl.motifRepetitionLimit.sameMotifAcrossBatchRatio': 'generic_architecture',
  'negativeConstraints.prohibit': 'negative_constraint',
};

const DEFAULT_RULE_TEMPLATES = {
  brand_analysis: (field) => `field ${field} 来自 brand packet 现有项目数据, 不推断`,
  scene_requirement: (field) => `field ${field} 来自项目交付要求 (scene_definition), 用户显式指定`,
  golden_reference: (field) => `field ${field} 来自 JZMX-SGR-01/02 benchmark 反推, 跨两张图稳定特征`,
  generic_architecture: (field) => `field ${field} 来自通用建筑/视觉质量规范, 与具体品牌无关`,
  model_adapter: (field) => `field ${field} 来自 volcengine Seedream 5.0 Pro 模型适配, 与 prompt 编译兼容性相关`,
  negative_constraint: (field) => `field ${field} 来自 negative constraints, 强制 fail-closed`,
};

/**
 * 编译 trace.
 *
 * @param input.dna           Space DNA 实例 (v0.1 schema 验证)
 * @param input.sources       6 个 source 类别的实际内容, 形如 { brandAnalysis: [...], ... }
 * @param input.fieldProvenance 可选, 字段 → provenance 覆盖 (高级用法)
 * @param input.now           可选, () => ISO string, 默认 new Date().toISOString()
 * @returns                  trace 实例
 */
export function compileTrace(input) {
  const { dna, sources, fieldProvenance: override, now } = input;
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileTrace: dna must be a non-null object');
  }
  if (!sources || typeof sources !== 'object') {
    throw new TypeError('compileTrace: sources must be a non-null object');
  }
  const requiredCategories = [
    'brandAnalysis', 'sceneRequirement', 'goldenReference',
    'genericArchitecture', 'modelAdapter', 'negativeConstraints',
  ];
  for (const cat of requiredCategories) {
    if (!Array.isArray(sources[cat])) {
      throw new TypeError(`compileTrace: sources.${cat} must be an array (got ${typeof sources[cat]})`);
    }
  }

  const generatedAt = (now ? now() : new Date().toISOString());
  const fingerprint = dnaFingerprint(dna);
  const fieldProvenance = {};

  for (const field of TRACED_FIELDS) {
    if (override && override[field]) {
      fieldProvenance[field] = override[field];
      continue;
    }
    const origin = DEFAULT_FIELD_ORIGIN[field];
    if (!origin) {
      throw new Error(`compileTrace: no default origin for field ${field}`);
    }
    const categoryKey = {
      brand_analysis: 'brandAnalysis',
      scene_requirement: 'sceneRequirement',
      golden_reference: 'goldenReference',
      generic_architecture: 'genericArchitecture',
      model_adapter: 'modelAdapter',
      negative_constraint: 'negativeConstraints',
    }[origin];
    const matching = sources[categoryKey].filter(
      (s) => Array.isArray(s.evidenceRefs) && s.evidenceRefs.length > 0,
    );
    if (matching.length === 0) {
      throw new Error(
        `compileTrace: no source in ${categoryKey} covers field ${field} (origin=${origin}). ` +
        `Add at least one source entry with evidenceRefs.`
      );
    }
    // 取 confidence 最高的 source
    const best = matching.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
    fieldProvenance[field] = {
      origin,
      evidenceRefs: [...best.evidenceRefs],
      confidence: typeof best.confidence === 'number' ? best.confidence : 0.5,
      rule: DEFAULT_RULE_TEMPLATES[origin](field),
    };
  }

  const trace = {
    schemaVersion: '1.0',
    traceVersion: 'v0.1',
    dnaVersion: dna.dnaVersion,
    dnaFingerprint: fingerprint,
    generatedAt,
    sources: {
      brandAnalysis: sources.brandAnalysis,
      sceneRequirement: sources.sceneRequirement,
      goldenReference: sources.goldenReference,
      genericArchitecture: sources.genericArchitecture,
      modelAdapter: sources.modelAdapter,
      negativeConstraints: sources.negativeConstraints,
    },
    fieldProvenance,
  };

  if (!validateTrace(trace)) {
    const errs = (validateTrace.errors || []).slice(0, 5).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`compileTrace: produced invalid trace: ${errs}`);
  }

  return trace;
}

// ---------- CLI ----------
// 直接运行: node compile-trace.mjs <dna.json> <sources.json> <output.json>

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.error('Usage: node compile-trace.mjs <dna.json> <sources.json> <output.json>');
    process.exit(1);
  }
  const [dnaPath, sourcesPath, outPath] = args;
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
  const trace = compileTrace({ dna, sources });
  writeFileSync(outPath, JSON.stringify(trace, null, 2));
  console.log(`trace written to ${outPath}`);
  console.log(`fingerprint: ${trace.dnaFingerprint}`);
  console.log(`field provenance: ${Object.keys(trace.fieldProvenance).length} fields`);
}
