// Space Runtime Data Contract v1 (Phase 9C)
// 用途: Phase 9C §8 Runtime 输入/输出 data contract. 定义 Space Runtime 输入字段
//       (brandDNA / spatialIntentDna / architectureLanguage / spatialRealityDna) 和
//       输出字段 (compiledSpaceStrategy / compiledPrompt / validationContext).
//
// Phase 9C §4 Final Runtime Architecture:
//   Project Input -> Brand Analysis -> Space DNA
//   -> Spatial Intent Layer -> Architecture Intelligence Layer
//   -> Reality Constraint Layer -> Prompt Compiler -> Provider -> Evaluation
//
// Phase 9C §9 Baseline Protection:
//   - 不修改 frozen DNA / baseline compiler / existing evaluation
//   - 新能力先进入 experimental runtime (v1-experimental/space-runtime/)
//   - 验证完成后再合并
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

/**
 * Phase 9C §8 Runtime Data Contract.
 *
 * INPUT (Runtime 输入):
 *   brandDNA:           { ... Space DNA instance (v0.1 / v0.1.1 / v0.3) }
 *   spatialIntentDna:   { primaryEmotion, userJourney, spaceRole, designLogic, architecturalReason } (Phase 9A.1)
 *   architectureLanguage: 5-field compiled output from Architecture Bridge (Phase 9A.3)
 *   spatialRealityDna:  8-field { spaceType, commercialScale, requiredZones, ... } (Phase 9B.1)
 *   architecturePreservation (optional): 3-field { enabled, weight, protectedElements } (Phase 9B.2)
 *
 * OUTPUT (Runtime 输出):
 *   compiledSpaceStrategy:  { spatialStrategy, architecturalCharacteristics, materialDirection, lightDirection, spatialOrganization, weight }
 *   compiledPrompt:         (markdown string, 11-16 blocks depending on layer config)
 *   validationContext:     { brandKey, dnaVersion, intentVersion, architectureVersion, realityVersion, preservationVersion, promptVersion }
 */

export const SPATIAL_INTENT_DNA_PHASE = '9A.1';
export const SPATIAL_INTENT_COMPILER_PHASE = '9A.2';
export const ARCHITECTURE_BRIDGE_PHASE = '9A.3';
export const SPATIAL_REALITY_PHASE = '9B.1';
export const ARCHITECTURE_PRESERVATION_PHASE = '9B.2';
export const SPACE_ROLE_INTELLIGENCE_PHASE = '9C.1';
export const SPACE_RUNTIME_PHASE = '9C';
export const SPACE_RUNTIME_VERSION = '1.0.0';

/**
 * Get the standard paths to the 4 DNA examples for a given brand.
 *
 * @param brandKey  'jiuzhou-aesthetics' | 'feng-tang-tang' | 'yi-ji-liang-fang'
 * @returns { dnaPath, spatialIntentPath, spatialRealityPath, architecturePreservationPath }
 */
export function getBrandDnaPaths(brandKey) {
  const dnaMap = {
    'jiuzhou-aesthetics': 'field-schema/examples/jiuzhou-aesthetics.dna.json',
    'feng-tang-tang': 'test-cases/regression/projects/feng-tang-tang.dna.json',
    'yi-ji-liang-fang': 'test-cases/regression/projects/yi-jui-liang-fang.dna.json',
  };
  const spatialIntentMap = {
    'jiuzhou-aesthetics': 'field-schema/examples/jiuzhou-aesthetics.spatial-intent.json',
    'feng-tang-tang': 'field-schema/examples/feng-tang-tang.spatial-intent.json',
    'yi-ji-liang-fang': 'field-schema/examples/yi-ji-liang-fang.spatial-intent.json',
  };
  const spatialRealityMap = {
    'jiuzhou-aesthetics': 'spatial-reality/examples/jiuzhou-aesthetics.spatial-reality.json',
    'feng-tang-tang': 'spatial-reality/examples/feng-tang-tang.spatial-reality.json',
    'yi-ji-liang-fang': 'spatial-reality/examples/yi-ji-liang-fang.spatial-reality.json',
  };
  const architecturePreservationMap = {
    'jiuzhou-aesthetics': 'architecture-preservation/examples/jiuzhou-aesthetics.architecture-preservation.json',
    'feng-tang-tang': 'architecture-preservation/examples/feng-tang-tang.architecture-preservation.json',
    'yi-ji-liang-fang': 'architecture-preservation/examples/yi-ji-liang-fang.architecture-preservation.json',
  };

  return {
    dnaPath: join(repoRoot, 'space-generator', 'v1-experimental', dnaMap[brandKey]),
    spatialIntentPath: join(repoRoot, 'space-generator', 'v1-experimental', spatialIntentMap[brandKey]),
    spatialRealityPath: join(repoRoot, 'space-generator', 'v1-experimental', spatialRealityMap[brandKey]),
    architecturePreservationPath: join(repoRoot, 'space-generator', 'v1-experimental', architecturePreservationMap[brandKey]),
  };
}

/**
 * Load all 4 (or 5 with architecture-preservation) DNA inputs for a brand.
 *
 * @param brandKey
 * @param options  { includeArchitecturePreservation: bool, default true }
 * @returns { dna, spatialIntentDna, spatialRealityDna, architecturePreservation (optional) }
 */
export function loadBrandDna(brandKey, options = {}) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('loadBrandDna: brandKey must be a non-empty string');
  }
  const includeAP = options.includeArchitecturePreservation !== false; // default true
  const paths = getBrandDnaPaths(brandKey);

  if (!existsSync(paths.dnaPath)) {
    throw new Error(`loadBrandDna: DNA not found for ${brandKey}: ${paths.dnaPath}`);
  }
  if (!existsSync(paths.spatialIntentPath)) {
    throw new Error(`loadBrandDna: spatialIntent not found for ${brandKey}: ${paths.spatialIntentPath}`);
  }
  if (!existsSync(paths.spatialRealityPath)) {
    throw new Error(`loadBrandDna: spatialReality not found for ${brandKey}: ${paths.spatialRealityPath}`);
  }

  const dna = JSON.parse(readFileSync(paths.dnaPath, 'utf8'));
  const siFile = JSON.parse(readFileSync(paths.spatialIntentPath, 'utf8'));
  const srFile = JSON.parse(readFileSync(paths.spatialRealityPath, 'utf8'));

  const result = {
    dna,
    spatialIntentDna: siFile.spatialIntentDna,
    spatialRealityDna: srFile.spatialRealityDna,
  };

  if (includeAP) {
    if (!existsSync(paths.architecturePreservationPath)) {
      throw new Error(`loadBrandDna: architecturePreservation not found for ${brandKey}: ${paths.architecturePreservationPath}`);
    }
    const apFile = JSON.parse(readFileSync(paths.architecturePreservationPath, 'utf8'));
    result.architecturePreservation = apFile.architecturePreservation;
  }

  return result;
}

/**
 * §8 Data Contract: input / output schema
 * 不是 JSON Schema, 是概念字段定义
 */
export const DATA_CONTRACT = {
  phase: SPACE_RUNTIME_PHASE,
  version: SPACE_RUNTIME_VERSION,
  input: {
    brandDNA: 'Space DNA instance (v0.1 / v0.1.1 / v0.3) — required',
    spatialIntentDna: 'Phase 9A.1 5 string 字段 (primaryEmotion / userJourney / spaceRole / designLogic / architecturalReason) — required',
    architectureLanguage: 'Phase 9A.3 architecture bridge 输出 (5 字段 high-level direction) — derived inside runtime',
    spatialRealityDna: 'Phase 9B.1 8 字段 (spaceType / commercialScale / requiredZones / operationLogic / userFlow / privacyRequirement / materialReality / forbiddenSpatialTypes) — required',
    architecturePreservation: 'Phase 9B.2 3 字段 (enabled / weight / protectedElements enum) — optional, default enabled=true',
  },
  output: {
    compiledSpaceStrategy: {
      spatialStrategy: 'array of strings (Phase 9A.2 compiled spatial strategy)',
      architecturalCharacteristics: 'array of strings (Phase 9A.3 architecture bridge output)',
      materialDirection: 'array of strings',
      lightDirection: 'array of strings',
      spatialOrganization: 'array of strings',
      weight: 'number 0-1',
    },
    compiledPrompt: 'markdown string, 11-16 blocks depending on layer config',
    validationContext: {
      brandKey: 'string',
      dnaVersion: 'string (DNA version, e.g. v0.1.1 / v0.3)',
      intentVersion: SPATIAL_INTENT_COMPILER_PHASE,
      architectureVersion: ARCHITECTURE_BRIDGE_PHASE,
      realityVersion: SPATIAL_REALITY_PHASE,
      preservationVersion: ARCHITECTURE_PRESERVATION_PHASE,
      promptVersion: 'string',
    },
  },
};
