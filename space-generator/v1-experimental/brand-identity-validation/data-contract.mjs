// Brand Identity Validation Gate Data Contract v1 (Phase 9C.0.5)
// 用途: Phase 9C.0.5 §5/§7 data contract. Validation gate 输入字段 (brandDNA +
//       analysisReport + referenceEvidence) 和输出字段 (status / industry / category /
//       spaceType / audience / riskLevel / issues).
//
// Phase 9C.0.5 §3 核心设计原则:
//   - Principle 01: 验证 brand identity before spatial generation
//   - Principle 02: 只阻断, 不重新设计 (no auto-correction)
//   - Principle 03: 低成本验证 (text-only, no image gen)
//
// Phase 9C.0.5 §9 confidence thresholds:
//   - pass:    overallConfidence >= 0.85
//   - review:  0.65 <= overallConfidence < 0.85
//   - fail:    overallConfidence < 0.65
//
// Phase 9C.0.5 §8 risk levels:
//   - critical: 行业完全错 (e.g. restaurant DNA claims sports_retail)
//   - high:     空间类型与行业冲突 (e.g. restaurant + fitting_room)
//   - medium:   品牌气质偏差
//   - low:      全部一致
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

export const PHASE = '9C.0.5';
export const VERSION = '1.0.0';
export const GATE_NAME = 'brand-identity-validation-gate';

/**
 * Phase 9C.0.5 §5 Validation Input Schema.
 *
 * @typedef {Object} ValidationInput
 * @property {Object} brandDNA - The brand DNA instance (v0.1 / v0.1.1 / v0.3)
 * @property {Object} analysisReport - Synthesized from DNA: { industry, category, audience, brandPositioning, sceneType, ... }
 * @property {Object} referenceEvidence - { referencePath, fileCount, notes }
 *
 * @typedef {Object} ValidationOutput
 * @property {'pass' | 'review' | 'fail'} status
 * @property {FieldCheck} industry
 * @property {FieldCheck} category
 * @property {FieldCheck} spaceType
 * @property {FieldCheck} audience
 * @property {'low' | 'medium' | 'high' | 'critical'} riskLevel
 * @property {number} overallConfidence
 * @property {Issue[]} issues
 * @property {Object} metadata
 *
 * @typedef {Object} FieldCheck
 * @property {string} value
 * @property {string} matchedIndustry
 * @property {number} confidence
 * @property {string[]} evidence
 *
 * @typedef {Object} Issue
 * @property {string} field
 * @property {'critical' | 'high' | 'medium' | 'low'} severity
 * @property {string} message
 * @property {string[]} evidence
 */

export const DATA_CONTRACT = {
  phase: PHASE,
  version: VERSION,
  gate: GATE_NAME,
  input: {
    brandDNA: 'Space DNA instance (v0.1 / v0.1.1 / v0.3) — required',
    analysisReport: 'Synthesized from DNA: industry / category / audience / brandPositioning / sceneType — derived by validateBrandIdentity() if not provided',
    referenceEvidence: 'Optional: { referencePath, fileCount, notes } for cross-validation',
  },
  output: {
    status: '"pass" (>= 0.85) | "review" (0.65-0.85) | "fail" (< 0.65)',
    industry: '{ value, matchedIndustry, confidence, evidence }',
    category: '{ value, matchedIndustry, confidence, evidence }',
    spaceType: '{ value, matchedIndustry, confidence, evidence }',
    audience: '{ value, matchedIndustry, confidence, evidence }',
    riskLevel: '"low" | "medium" | "high" | "critical"',
    overallConfidence: 'number 0-1',
    issues: 'array of { field, severity, message, evidence }',
    metadata: '{ phase, version, gate, generatedAt }',
  },
  thresholds: {
    pass: 0.85,
    review: 0.65,
    fail: 0.0,
  },
};

/**
 * Load the industry-categories rules file.
 * @returns {Object} The full rules object.
 */
export function loadRules() {
  const rulesPath = join(__dirname, 'rules', 'industry-categories.json');
  if (!existsSync(rulesPath)) {
    throw new Error(`loadRules: rules file not found at ${rulesPath}`);
  }
  return JSON.parse(readFileSync(rulesPath, 'utf8'));
}

/**
 * Synthesize analysisReport from a brand DNA instance.
 * Extracts industry, category, audience, sceneType, brandSpirit, motifFamily,
 * materialDna, lightingDna, negativeConstraints for cross-validation.
 *
 * @param {Object} dna - The brand DNA instance.
 * @returns {Object} analysisReport.
 */
export function synthesizeAnalysisReport(dna) {
  return {
    industry: dna.project?.industry ?? null,
    category: dna.project?.category ?? null,
    audience: dna.project?.audience ?? [],
    brandPositioning: dna.project?.brandPositioning ?? [],
    brandName: dna.project?.brandName ?? null,
    projectIdLocal: dna.project?.projectIdLocal ?? null,
    sceneType: dna.sceneDefinition?.sceneType ?? null,
    sceneSubtype: dna.sceneDefinition?.sceneSubtype ?? null,
    commercialContext: dna.sceneDefinition?.commercialContext ?? null,
    scale: dna.sceneDefinition?.scale ?? null,
    areaSqm: dna.sceneDefinition?.areaSqm ?? null,
    requiredZones: dna.sceneDefinition?.requiredZones ?? [],
    brandSpirit: dna.brandSpaceDna?.brandSpirit ?? {},
    motifFamily: dna.brandSpaceDna?.motifFamily ?? [],
    literalAssetUsage: dna.brandSpaceDna?.literalAssetUsage ?? {},
    primaryMaterials: dna.materialDna?.primaryMaterials ?? [],
    accentMaterials: dna.materialDna?.accentMaterials ?? [],
    lightingStrategy: dna.lightingDna?.primaryStrategy ?? null,
    brandLightHueFamily: dna.lightingDna?.brandLight?.hueFamily ?? [],
    negativeConstraints: dna.negativeConstraints?.prohibit ?? [],
    metadata: dna.metadata ?? {},
  };
}

/**
 * Detect the most likely industry from a free-form industry string.
 * Uses longest-match scoring: among all candidates that match by label/synonym/keyword,
 * returns the one whose matched string is longest (most specific).
 *
 * @param {string} industryStr - The free-form industry string from DNA.
 * @param {Object} rules - The rules object.
 * @returns {{ key: string, label: string, score: number } | null} Matched industry, or null.
 */
export function detectIndustryKey(industryStr, rules) {
  if (!industryStr || typeof industryStr !== 'string') return null;
  const norm = industryStr.toLowerCase().replace(/[\s\/]+/g, ' ').trim();
  const candidates = [];
  for (const [key, def] of Object.entries(rules.industries)) {
    if (norm === key) {
      return { key, label: def.label, score: 999 };
    }
    let bestScore = 0;
    // exact key substring
    if (norm.includes(key.replace(/_/g, ' '))) {
      bestScore = Math.max(bestScore, key.replace(/_/g, ' ').length);
    }
    // label substring (each label chunk)
    if (def.label) {
      const labelLower = def.label.toLowerCase();
      // split on '/' or ' / ' to get individual label phrases
      const labelParts = labelLower.split(/\s*\/\s*/);
      for (const part of labelParts) {
        if (part && norm.includes(part)) {
          bestScore = Math.max(bestScore, part.length);
        }
      }
    }
    // synonyms
    if (def.synonyms) {
      for (const s of def.synonyms) {
        const sLower = s.toLowerCase();
        if (norm.includes(sLower)) {
          bestScore = Math.max(bestScore, sLower.length);
        }
      }
    }
    if (bestScore > 0) {
      candidates.push({ key, label: def.label, score: bestScore });
    }
  }
  if (candidates.length === 0) return null;
  // pick highest score; tie-break by key alphabetical for determinism
  candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
  return candidates[0];
}
