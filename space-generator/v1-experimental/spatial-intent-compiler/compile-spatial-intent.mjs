// Spatial Intent Compiler v1 (Phase 9A.2)
// 用途: 输入 spatialIntentDna (5 字段, Phase 9A.1), 编译为 compiledSpatialIntent (5 字段).
//       规则只提供方向, 不直接生成视觉 (Phase 9A.2 §8). 不调真实 Provider.
//       不修改 Prompt Runtime (Phase 9A.2 §11 验收 关键约束).
//
// Position in runtime pipeline (§2):
//   Brand DNA -> Brand Translation -> Spatial Intent -> Spatial Intent Compiler
//     -> Architecture Language -> Architecture Anchor -> Function Bridge -> Prompt Compiler
//
// §11 验收:
//   - compiler module 完成 (本文件)
//   - schema validation 完成 (schemas/compiled-spatial-intent.schema.json)
//   - 3 品牌测试通过 (tests/compile-spatial-intent.test.mjs)
//   - 无 Provider 调用 (本文件不引入网络依赖)
//   - 不修改 Prompt Runtime (本文件不导出 prompt 编译相关函数)
//   - 不污染 v1-baseline (本文件在 v1-experimental/spatial-intent-compiler/)
//
// 设计:
//   - 确定性输出 (同输入 -> 同输出), 用于 Phase 9A.2 §10 stability 验证
//   - 不调真实 Provider, 不调 LLM
//   - 与 Phase 9A.1 spatialIntentDna 字段对接
//   - 规则匹配: emotion-rules + journey-rules + space-role-rules, 输出 5 字段
//   - 规则按优先级排序, 第一个匹配的规则胜出, 默认规则最后 (matchAny=true)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const compiledSchemaPath = join(__dirname, 'schemas', 'compiled-spatial-intent.schema.json');
const spatialIntentSchemaPath = join(repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'spatial-intent.schema.json');
const emotionRulesPath = join(__dirname, 'intent-rules', 'emotion-rules.json');
const journeyRulesPath = join(__dirname, 'intent-rules', 'journey-rules.json');
const spaceRoleRulesPath = join(__dirname, 'intent-rules', 'space-role-rules.json');

// ajv 验证 schema
const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let _compiledSchema = null;
let _validateCompiled = null;
let _validateInput = null;

function getCompiledSchema() {
  if (!_compiledSchema) {
    _compiledSchema = JSON.parse(readFileSync(compiledSchemaPath, 'utf8'));
    _validateCompiled = ajv.compile(_compiledSchema);
  }
  return _compiledSchema;
}

function getValidateCompiled() {
  if (!_validateCompiled) getCompiledSchema();
  return _validateCompiled;
}

function getValidateInput() {
  if (!_validateInput) {
    const inputSchema = JSON.parse(readFileSync(spatialIntentSchemaPath, 'utf8'));
    _validateInput = ajv.compile(inputSchema);
  }
  return _validateInput;
}

function loadJsonIfExists(p) {
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadRules() {
  return {
    emotion: loadJsonIfExists(emotionRulesPath),
    journey: loadJsonIfExists(journeyRulesPath),
    spaceRole: loadJsonIfExists(spaceRoleRulesPath),
  };
}

/**
 * Match a rule against input text.
 * @param rule  rule entry { id, matchKeywords, matchAny, ... }
 * @param text  input text (e.g. primaryEmotion, spaceRole)
 * @returns true if rule matches
 */
function matchRule(rule, text) {
  if (rule.matchAny === true) return true; // fallback rule
  if (!Array.isArray(rule.matchKeywords) || rule.matchKeywords.length === 0) return false;
  const lowered = text.toLowerCase();
  return rule.matchKeywords.some((kw) => lowered.includes(kw.toLowerCase()));
}

/**
 * Find the first matching rule for input text, walking rules in order.
 * @param rules    rules array
 * @param text     input text
 * @returns matched rule or null
 */
function findFirstMatch(rules, text) {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  for (const r of rules) {
    if (matchRule(r, text)) return r;
  }
  // 兜底: 找 matchAny=true 的规则
  return rules.find((r) => r.matchAny === true) || rules[0];
}

/**
 * Merge arrays, deduplicating, preserving first-seen order.
 */
function mergeArrays(...arrays) {
  const seen = new Set();
  const out = [];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      if (!seen.has(item)) {
        seen.add(item);
        out.push(item);
      }
    }
  }
  return out;
}

/**
 * Compile spatialIntentDna -> compiledSpatialIntent.
 * 确定性输出: 同输入 -> 同输出.
 *
 * @param spatialIntentDna  Phase 9A.1 spatialIntentDna instance (5 fields)
 * @param options           { weight: number (optional, default 0.25) }
 * @returns compiledSpatialIntent
 */
export function compileSpatialIntent(spatialIntentDna, options = {}) {
  if (!spatialIntentDna || typeof spatialIntentDna !== 'object') {
    throw new TypeError('compileSpatialIntent: spatialIntentDna must be a non-null object');
  }
  // 验证输入是 spatialIntentDna (Phase 9A.1 schema)
  const validateInput = getValidateInput();
  // Note: spatialIntentDna 包含 5 fields, 但 schema 验证是 spatialIntentDna 字段在 DNA 实例中.
  // 这里只验证 5 字段都存在, 严格 schema 验证由 Phase 9A.1 测试负责.
  for (const k of ['primaryEmotion', 'userJourney', 'spaceRole', 'designLogic', 'architecturalReason']) {
    if (typeof spatialIntentDna[k] !== 'string' || spatialIntentDna[k].length === 0) {
      throw new TypeError(`compileSpatialIntent: spatialIntentDna.${k} must be non-empty string`);
    }
  }

  const rules = loadRules();

  // 1. emotion-rule 匹配 primaryEmotion
  const emotionRule = findFirstMatch(rules.emotion?.rules ?? [], spatialIntentDna.primaryEmotion);
  // 2. space-role-rule 匹配 spaceRole -> experienceGoal
  const spaceRoleRule = findFirstMatch(rules.spaceRole?.rules ?? [], spatialIntentDna.spaceRole);
  // 3. journey-rule 匹配 userJourney -> functionRelationship
  const journeyRule = findFirstMatch(rules.journey?.rules ?? [], spatialIntentDna.userJourney);

  // 合并 spatialStrategy (来自 emotion-rule + designLogic 推断)
  const emotionStrategy = emotionRule?.spatialStrategy ?? [];
  // 4. designLogic 推断: 通过关键词匹配 emotion-rule 的设计逻辑
  //    只在匹配到 non-fallback rule 时合并, 避免 fallback 的内容污染 output.
  const designLogicRule = findFirstMatch(rules.emotion?.rules ?? [], spatialIntentDna.designLogic);
  const isDesignLogicFallback = !designLogicRule || designLogicRule.matchAny === true;
  const designLogicStrategy = (!isDesignLogicFallback && designLogicRule.id !== emotionRule?.id)
    ? (designLogicRule.spatialStrategy ?? [])
    : [];

  const spatialStrategy = mergeArrays(emotionStrategy, designLogicStrategy);

  // 合并 architecturalImplications (来自 emotion-rule + architecturalReason)
  const emotionImplications = emotionRule?.architecturalImplications ?? [];
  const archReasonRule = findFirstMatch(rules.emotion?.rules ?? [], spatialIntentDna.architecturalReason);
  const isArchReasonFallback = !archReasonRule || archReasonRule.matchAny === true;
  const archReasonImplications = (!isArchReasonFallback && archReasonRule.id !== emotionRule?.id)
    ? (archReasonRule.architecturalImplications ?? [])
    : [];
  const architecturalImplications = mergeArrays(emotionImplications, archReasonImplications);

  // 合并 constraints (来自 emotion-rule + journey-rule + space-role-rule)
  const emotionConstraints = emotionRule?.constraints ?? [];
  const journeyConstraints = journeyRule?.constraints ?? [];
  const spaceRoleConstraints = spaceRoleRule?.constraints ?? [];
  const constraints = mergeArrays(emotionConstraints, journeyConstraints, spaceRoleConstraints);

  // 合并 functionRelationship (来自 space-role-rule + journey-rule)
  const spaceRoleFR = spaceRoleRule?.functionRelationship ?? [];
  const journeyFR = journeyRule?.functionRelationship ?? [];
  const functionRelationship = mergeArrays(spaceRoleFR, journeyFR);

  // experienceGoal: 优先 space-role-rule.experienceGoal, fallback 到拼接
  let experienceGoal = spaceRoleRule?.experienceGoal;
  if (!experienceGoal) {
    experienceGoal = `基于品牌空间角色 (${spatialIntentDna.spaceRole}) 与情绪 (${spatialIntentDna.primaryEmotion}) 的复合体验目标`;
  }

  // weight: optional, default 0.25
  const weight = options.weight ?? spatialIntentDna.weight ?? 0.25;

  const compiled = {
    experienceGoal,
    spatialStrategy,
    architecturalImplications,
    functionRelationship,
    constraints,
    weight,
  };

  // 验证输出 schema
  const validateCompiled = getValidateCompiled();
  if (!validateCompiled(compiled)) {
    const errs = (validateCompiled.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`compiled spatial intent failed schema validation: ${errs}`);
  }

  return compiled;
}

/**
 * Load compiled spatial intent for a given brand (uses Phase 9A.1 example files).
 * 用于 Phase 9A.2 测试 + 未来 Phase 9A.3 集成.
 *
 * @param brandKey  'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
 * @returns compiledSpatialIntent
 */
export function compileSpatialIntentForBrand(brandKey, options = {}) {
  const examplePath = join(
    repoRoot, 'space-generator', 'v1-experimental', 'field-schema', 'examples',
    `${brandKey}.spatial-intent.json`,
  );
  if (!existsSync(examplePath)) {
    throw new Error(`Spatial intent example not found: ${examplePath}`);
  }
  const example = JSON.parse(readFileSync(examplePath, 'utf8'));
  return compileSpatialIntent(example.spatialIntentDna, options);
}
