// Architecture Bridge v1 (Phase 9A.3)
// 用途: 输入 compiledSpatialIntent (Phase 9A.2) 编译为 architectureLanguage.
//       桥接 Spatial Intent -> Architecture Language, 不调真实 Provider.
//       不修改 Prompt Runtime (Phase 9A.3 §11.4 验收).
//
// Position in runtime pipeline (§3):
//   Spatial Intent -> Spatial Intent Compiler -> Architecture Bridge
//     -> Architecture Language -> Architecture Anchor -> Function Bridge -> Prompt Compiler
//
// 与 Phase 8D architecture-language/ 4 类 (organic-flow / translucent-boundary /
//   soft-light-system / material-continuity) 不同层级: 4 类是 industryIndependent 分类,
//   本模块输出 architectureLanguage 是 per-DNA 编译结果.
//
// §11 验收:
//   - Intent preservation (Phase 9A.3 §11.1)
//   - Brand independence (Phase 9A.3 §11.2, 3 brand 各自 distinct)
//   - No anchor leakage (Phase 9A.3 §11.3, FORBIDDEN_LEAKAGE 列表)
//   - No provider dependency (Phase 9A.3 §11.4, 无网络/Provider 调用)
//
// 设计:
//   - deterministic 输出 (同输入 -> 同输出)
//   - 不调真实 Provider, 不调 LLM
//   - 不修改 Prompt Runtime, 独立 module
//   - 与 Phase 9A.2 编译输出对接 (compiledSpatialIntent 5 字段)

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { compileSpatialIntentForBrand } from '../spatial-intent-compiler/compile-spatial-intent.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

const archLangSchemaPath = join(__dirname, 'schemas', 'architecture-language.schema.json');
const emotionToSpacePath = join(__dirname, 'bridge-rules', 'emotion-to-space.json');
const strategyToArchPath = join(__dirname, 'bridge-rules', 'strategy-to-architecture.json');
const archPrinciplesPath = join(__dirname, 'bridge-rules', 'architecture-principles.json');
const compiledSpatialIntentSchemaPath = join(repoRoot, 'space-generator', 'v1-experimental', 'spatial-intent-compiler', 'schemas', 'compiled-spatial-intent.schema.json');

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

let _archLangSchema = null;
let _validateArchLang = null;
let _validateCompiled = null;

function getArchLangSchema() {
  if (!_archLangSchema) {
    _archLangSchema = JSON.parse(readFileSync(archLangSchemaPath, 'utf8'));
    _validateArchLang = ajv.compile(_archLangSchema);
  }
  return _archLangSchema;
}

function getValidateArchLang() {
  if (!_validateArchLang) getArchLangSchema();
  return _validateArchLang;
}

function getValidateCompiled() {
  if (!_validateCompiled) {
    const schema = JSON.parse(readFileSync(compiledSpatialIntentSchemaPath, 'utf8'));
    _validateCompiled = ajv.compile(schema);
  }
  return _validateCompiled;
}

function loadJsonIfExists(p) {
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

function loadRules() {
  return {
    emotion: loadJsonIfExists(emotionToSpacePath),
    strategy: loadJsonIfExists(strategyToArchPath),
    principles: loadJsonIfExists(archPrinciplesPath),
  };
}

/**
 * Match a rule against input text.
 * @param rule  rule entry { id, matchKeywords, matchAny, ... }
 * @param text  input text
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
 * @param rules  rules array
 * @param text   input text (string or array of strings)
 * @returns matched rule or null
 */
function findFirstMatch(rules, text) {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  // text 可以是 string 或 array (Phase 9A.2 spatialStrategy 是 array)
  // 我们用 array of strings 处理, 每个 string 单独匹配
  const texts = Array.isArray(text) ? text : [text];
  // 先找第一个匹配 text 的 non-fallback rule
  for (const t of texts) {
    for (const r of rules) {
      if (r.matchAny !== true && matchRule(r, t)) return r;
    }
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
 * Compile compiledSpatialIntent -> architectureLanguage.
 * 确定性输出: 同输入 -> 同输出.
 *
 * @param compiledSpatialIntent  Phase 9A.2 编译输出 (5 字段)
 * @param options                { weight: number (optional, default 0.25) }
 * @returns architectureLanguage
 */
export function compileArchitectureBridge(compiledSpatialIntent, options = {}) {
  if (!compiledSpatialIntent || typeof compiledSpatialIntent !== 'object') {
    throw new TypeError('compileArchitectureBridge: compiledSpatialIntent must be a non-null object');
  }
  // 验证输入是 compiledSpatialIntent
  for (const k of ['experienceGoal', 'spatialStrategy', 'architecturalImplications', 'functionRelationship', 'constraints']) {
    if (!Array.isArray(compiledSpatialIntent[k]) && typeof compiledSpatialIntent[k] !== 'string') {
      throw new TypeError(`compileArchitectureBridge: compiledSpatialIntent.${k} must be array or string`);
    }
  }

  const rules = loadRules();

  // 1. spatialPrinciples: 来自 emotion-to-space (匹配 experienceGoal + spatialStrategy)
  //    优先 match experienceGoal, 然后 match spatialStrategy, 避免 fallback
  const experienceGoalRule = findFirstMatch(rules.emotion?.rules ?? [], compiledSpatialIntent.experienceGoal);
  const spatialStrategyRule = findFirstMatch(rules.emotion?.rules ?? [], compiledSpatialIntent.spatialStrategy);
  // 优先 experienceGoal rule, 然后 spatialStrategy rule, 跳过 fallback
  const emotionPrincipleRules = [];
  if (experienceGoalRule && experienceGoalRule.matchAny !== true) {
    emotionPrincipleRules.push(experienceGoalRule);
  }
  if (spatialStrategyRule && spatialStrategyRule.matchAny !== true && spatialStrategyRule.id !== experienceGoalRule?.id) {
    emotionPrincipleRules.push(spatialStrategyRule);
  }
  let spatialPrinciples = emotionPrincipleRules.flatMap((r) => r.spatialPrinciples ?? []);

  // architecture-principles 规则额外补充 (3 brand 期望的 continuous space / human scale / layered privacy 等)
  const principlesRule = findFirstMatch(rules.principles?.rules ?? [], compiledSpatialIntent.experienceGoal);
  if (principlesRule && principlesRule.matchAny !== true) {
    spatialPrinciples = mergeArrays(spatialPrinciples, principlesRule.spatialPrinciples ?? []);
  }

  // 2. architecturalCharacteristics / materialDirection / lightDirection / spatialOrganization
  //    来自 strategy-to-architecture (匹配 spatialStrategy)
  const strategyRule = findFirstMatch(rules.strategy?.rules ?? [], compiledSpatialIntent.spatialStrategy);
  let architecturalCharacteristics = [];
  let materialDirection = [];
  let lightDirection = [];
  let spatialOrganization = [];
  if (strategyRule && strategyRule.matchAny !== true) {
    architecturalCharacteristics = strategyRule.architecturalCharacteristics ?? [];
    materialDirection = strategyRule.materialDirection ?? [];
    lightDirection = strategyRule.lightDirection ?? [];
    spatialOrganization = strategyRule.spatialOrganization ?? [];
  }
  // 兜底: 从 strategyRule 的 matchAny fallback rule
  if (strategyIsFallback(strategyRule)) {
    const fallbackRule = rules.strategy?.rules?.find((r) => r.matchAny === true);
    if (fallbackRule) {
      architecturalCharacteristics = mergeArrays(architecturalCharacteristics, fallbackRule.architecturalCharacteristics ?? []);
      materialDirection = mergeArrays(materialDirection, fallbackRule.materialDirection ?? []);
      lightDirection = mergeArrays(lightDirection, fallbackRule.lightDirection ?? []);
      spatialOrganization = mergeArrays(spatialOrganization, fallbackRule.spatialOrganization ?? []);
    }
  }

  // 3. weight: optional, default 0.25
  const weight = options.weight ?? compiledSpatialIntent.weight ?? 0.25;

  const archLang = {
    spatialPrinciples,
    architecturalCharacteristics,
    materialDirection,
    lightDirection,
    spatialOrganization,
    weight,
  };

  // 验证输出 schema
  const validateArchLang = getValidateArchLang();
  if (!validateArchLang(archLang)) {
    const errs = (validateArchLang.errors || []).slice(0, 3).map((e) => `${e.instancePath} ${e.message}`).join('; ');
    throw new Error(`compiled architecture language failed schema validation: ${errs}`);
  }

  return archLang;
}

function strategyIsFallback(rule) {
  return !rule || rule.matchAny === true;
}

/**
 * Compile for a given brand (chain: brandKey -> spatialIntentDna -> compiledSpatialIntent -> architectureLanguage).
 * 用于 Phase 9A.3 测试 + 未来 Phase 9B 集成.
 *
 * @param brandKey  'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
 * @param options   { weight: number (optional) }
 * @returns architectureLanguage
 */
export function compileArchitectureBridgeForBrand(brandKey, options = {}) {
  // Phase 9A.2 compileSpatialIntentForBrand (top-level static import)
  const compiled = compileSpatialIntentForBrand(brandKey, options);
  return compileArchitectureBridge(compiled, options);
}
