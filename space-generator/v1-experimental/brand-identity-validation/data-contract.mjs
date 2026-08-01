// Brand Identity Validation Gate Data Contract v2 (Phase 9C.0.5 Updated)
// 用途: Phase 9C.0.5 §6/§7 data contract (跟 Updated doc 对齐).
//       Validation gate 输入字段 (brandDNA + analysisReport + referenceEvidence)
//       和输出字段 (status / riskLevel / recommendation / industry / category /
//       spaceType / audience / materialDirection / functionalRelationship / issues).
//
// Phase 9C.0.5 Updated §2 跟 Structured Analysis Self-Healing 的关系:
//   - Self-healing 修 schema / 字段缺失 / 默认值 / 缓存 / contract drift
//   - 9C.0.5 修 cross-industry contamination (品牌语义是否正确)
//   - 二者不合并.
//
// Phase 9C.0.5 Updated §7 输出 schema (Pass/Block 二态):
//   Pass:  { status: "pass", riskLevel: "low", recommendation: "continue" }
//   Block: { status: "blocked", riskLevel: "critical"|"high"|"medium",
//            recommendation: "review_brand_DNA" | "ask_user" }
//
// Phase 9C.0.5 Updated §8 Blocking Rules:
//   - Critical: 行业完全冲突 (e.g. restaurant DNA claims sports retail)
//   - High Risk: 空间功能冲突 (e.g. restaurant + fitting room)
//   - Medium: 进入人工确认
//
// Phase 9C.0.5 Updated §6 Validation Fields (6 个):
//   - Industry
//   - Category
//   - Space Type
//   - Audience
//   - Material Direction
//   - Functional Relationship
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = join(__dirname, '..', '..', '..');

export const PHASE = '9C.0.5';
export const VERSION = '2.0.0'; // Bumped: schema 跟 Updated doc 对齐
export const GATE_NAME = 'brand-identity-validation-gate';

/**
 * Phase 9C.0.5 Updated §7 Validation Output Schema.
 *
 * @typedef {Object} ValidationOutput
 * @property {'pass' | 'blocked'} status
 * @property {'low' | 'medium' | 'high' | 'critical'} riskLevel
 * @property {'continue' | 'review_brand_DNA' | 'ask_user'} recommendation
 * @property {FieldCheck} industry
 * @property {FieldCheck} category
 * @property {FieldCheck} spaceType
 * @property {FieldCheck} audience
 * @property {FieldCheck} materialDirection
 * @property {FieldCheck} functionalRelationship
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
    analysisReport: 'Synthesized from DNA: industry / category / audience / brandPositioning / sceneType / requiredZones / materials — derived by validateBrandIdentity() if not provided',
    referenceEvidence: 'Optional: { referencePath, fileCount, notes } for cross-validation',
  },
  output: {
    status: '"pass" (0 issues + confidence >= pass threshold) | "blocked" (任何 issue)',
    riskLevel: '"low" (无 issues) | "medium" (有 medium issues) | "high" (有 high issues) | "critical" (有 critical issues)',
    recommendation: '"continue" (status=pass) | "review_brand_DNA" (critical/high risk) | "ask_user" (medium risk)',
    industry: '{ value, matchedIndustry, confidence, evidence }',
    category: '{ value, matchedIndustry, confidence, evidence }',
    spaceType: '{ value, matchedIndustry, confidence, evidence }',
    audience: '{ value, matchedIndustry, confidence, evidence }',
    materialDirection: '{ value, matchedIndustry, confidence, evidence }',
    functionalRelationship: '{ value, matchedIndustry, confidence, evidence }',
    overallConfidence: 'number 0-1',
    issues: 'array of { field, severity, message, evidence }',
    metadata: '{ phase, version, gate, generatedAt }',
  },
  blockingRules: {
    critical: '行业完全冲突 (industry key 不在 known industries / industry 完全 unmatched / content 完全是另一个行业的 concerns)',
    high: '空间功能冲突 (sceneType 在 industry.forbiddenSpaceTypes / material / motif / negativeConstraint 严重 cross-industry contamination)',
    medium: '需要人工确认 (content 跨行业但不完全冲突 / audience 关键词未匹配 / brandSpirit 部分偏离 / field 缺失)',
  },
  thresholds: {
    pass: 0.85, // status=pass 需要的 overallConfidence 最低
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
 * Phase 9C.0.5 Updated §6: 6 fields extracted for validation.
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
    optionalZones: dna.sceneDefinition?.optionalZones ?? [],
    customerFlow: dna.functionalDna?.customerFlow ?? {},
    brandSpirit: dna.brandSpaceDna?.brandSpirit ?? {},
    motifFamily: dna.brandSpaceDna?.motifFamily ?? [],
    literalAssetUsage: dna.brandSpaceDna?.literalAssetUsage ?? {},
    primaryMaterials: dna.materialDna?.primaryMaterials ?? [],
    accentMaterials: dna.materialDna?.accentMaterials ?? [],
    secondaryMaterials: dna.materialDna?.secondaryMaterials ?? [],
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
