// Brand Identity Validation Gate v1 (Phase 9C.0.5)
// 用途: 在 brand analysis 跟 spatial runtime 之间插入一个 gate, 验证 brand DNA
//       的内部一致性与外部可识别性. 错位 DNA (如 wa-ye 把炭烧牛蛙餐饮标成体育用品
//       零售) 会被识别并 fail, 阻断错误 brand identity 进入 spatial generation.
//
// Phase 9C.0.5 §4 Module Architecture:
//   Brand Analysis -> Brand Identity Validation Gate -> [Pass -> Spatial Runtime | Fail -> Require DNA Review]
//
// Phase 9C.0.5 §3 核心设计原则:
//   - Principle 01: 必须发生在 spatial generation 之前
//   - Principle 02: 只阻断, 不重新设计 (no auto-correction)
//   - Principle 03: 低成本 (text-only, no image gen)
//
// Phase 9C.0.5 §5/§7 input/output schema (see data-contract.mjs).
// Phase 9C.0.5 §8 risk criteria.
// Phase 9C.0.5 §9 confidence thresholds: pass >= 0.85 / review 0.65-0.85 / fail < 0.65.
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import {
  PHASE,
  VERSION,
  GATE_NAME,
  DATA_CONTRACT,
  loadRules,
  synthesizeAnalysisReport,
  detectIndustryKey,
} from './data-contract.mjs';

/**
 * Phase 9C.0.5 Main Gate Entry: validate a brand DNA against industry rules.
 *
 * @param {Object} input - Validation input (see DATA_CONTRACT.input).
 *   @param {Object} input.brandDNA - The brand DNA instance.
 *   @param {Object} [input.analysisReport] - Optional pre-synthesized report.
 *   @param {Object} [input.referenceEvidence] - Optional reference evidence.
 * @returns {Object} ValidationOutput (see DATA_CONTRACT.output).
 */
export function validateBrandIdentity(input) {
  if (!input || !input.brandDNA) {
    throw new TypeError('validateBrandIdentity: brandDNA is required');
  }

  const rules = loadRules();
  const report = input.analysisReport ?? synthesizeAnalysisReport(input.brandDNA);
  const issues = [];

  // === Field 1: Industry ===
  const industryCheck = checkIndustry(report.industry, rules, issues);

  // === Field 2: Category ===
  const categoryCheck = checkCategory(report.category, industryCheck.matchedIndustry, rules, issues);

  // === Field 3: SpaceType ===
  const spaceTypeCheck = checkSpaceType(report.sceneType, industryCheck.matchedIndustry, rules, issues, report);

  // === Field 4: Audience ===
  const audienceCheck = checkAudience(report.audience, industryCheck.matchedIndustry, rules, issues);

  // === Internal DNA consistency check (cross-field contradictions) ===
  checkInternalConsistency(report, industryCheck.matchedIndustry, rules, issues);

  // === Compute overall confidence + riskLevel + status ===
  const overallConfidence = (
    industryCheck.confidence * 0.35
    + categoryCheck.confidence * 0.15
    + spaceTypeCheck.confidence * 0.30
    + audienceCheck.confidence * 0.20
  );

  const riskLevel = issues.length === 0
    ? 'low'
    : (issues.some((i) => i.severity === 'critical') ? 'critical'
      : (issues.some((i) => i.severity === 'high') ? 'high'
        : (issues.some((i) => i.severity === 'medium') ? 'medium' : 'low')));

  // Status: combined rule (Phase 9C.0.5 §8 + §9 + §11)
  //   - critical issues OR >= 3 high issues => fail (block spatial generation)
  //   - 1-2 high issues OR any medium issues => review (request user confirmation)
  //   - 0 issues => pass (per confidence threshold)
  const thresholds = rules.confidenceThresholds ?? DATA_CONTRACT.thresholds;
  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const highCount = issues.filter((i) => i.severity === 'high').length;
  const mediumCount = issues.filter((i) => i.severity === 'medium').length;
  let status;
  if (criticalCount >= 1 || highCount >= 3) {
    status = 'fail';
  } else if (highCount >= 1 || mediumCount >= 3) {
    status = 'review';
  } else {
    status = overallConfidence >= thresholds.pass
      ? 'pass'
      : overallConfidence >= thresholds.review
        ? 'review'
        : 'fail';
  }

  return {
    status,
    industry: industryCheck,
    category: categoryCheck,
    spaceType: spaceTypeCheck,
    audience: audienceCheck,
    riskLevel,
    overallConfidence: Number(overallConfidence.toFixed(3)),
    issues,
    metadata: {
      phase: PHASE,
      version: VERSION,
      gate: GATE_NAME,
      brandKey: report.brandName,
      projectIdLocal: report.projectIdLocal,
      generatedAt: new Date().toISOString(),
    },
  };
}

// === Field checks ===

function checkIndustry(industryStr, rules, issues) {
  const match = detectIndustryKey(industryStr, rules);
  if (!match) {
    issues.push({
      field: 'industry',
      severity: 'critical',
      message: `Industry "${industryStr}" does not match any known industry key. Phase 9C.0.5 §8 Critical: industry completely unrecognized, or label/synonym mismatch.`,
      evidence: [JSON.stringify(industryStr)],
    });
    return {
      value: industryStr,
      matchedIndustry: null,
      confidence: 0,
      evidence: ['industry string did not match any key in rules'],
    };
  }
  return {
    value: industryStr,
    matchedIndustry: match.key,
    confidence: 0.95,
    evidence: [`matched to ${match.key} (${match.label})`],
  };
}

function checkCategory(categoryStr, industryKey, rules, issues) {
  if (!categoryStr) {
    issues.push({
      field: 'category',
      severity: 'high',
      message: 'Category is missing. Phase 9C.0.5 §6.2: every brand should declare a specific commercial category.',
      evidence: [],
    });
    return { value: null, matchedIndustry: industryKey, confidence: 0, evidence: [] };
  }
  if (!industryKey) {
    return { value: categoryStr, matchedIndustry: null, confidence: 0.2, evidence: ['industry unmatched, category cannot be cross-validated'] };
  }
  const industryDef = rules.industries[industryKey];
  const allowed = industryDef.categories ?? [];
  // Special case: category name == industry key (case-insensitive, normalize)
  // e.g. industry="medical_aesthetics" + category="medical_aesthetics" is OK
  const normCat = categoryStr.toLowerCase().replace(/[\s_-]+/g, '');
  const normKey = industryKey.toLowerCase().replace(/[\s_-]+/g, '');
  if (normCat === normKey) {
    return { value: categoryStr, matchedIndustry: industryKey, confidence: 0.9, evidence: [`category matches industry key (${industryKey})`] };
  }
  const match = allowed.some((c) => c.toLowerCase().replace(/[\s_-]+/g, '') === normCat);
  if (!match) {
    issues.push({
      field: 'category',
      severity: 'high',
      message: `Category "${categoryStr}" is not in the allowed list for industry "${industryKey}". Allowed: ${allowed.join(', ')}.`,
      evidence: [JSON.stringify(categoryStr), `industry=${industryKey}`],
    });
    return { value: categoryStr, matchedIndustry: industryKey, confidence: 0.4, evidence: ['category not in industry.allowedCategories'] };
  }
  return { value: categoryStr, matchedIndustry: industryKey, confidence: 0.9, evidence: [`category in industry.allowedCategories: ${allowed.join(', ')}`] };
}

function checkSpaceType(sceneType, industryKey, rules, issues, report) {
  if (!sceneType) {
    issues.push({
      field: 'spaceType',
      severity: 'high',
      message: 'sceneType is missing in sceneDefinition.',
      evidence: [],
    });
    return { value: null, matchedIndustry: industryKey, confidence: 0, evidence: [] };
  }
  if (!industryKey) {
    return { value: sceneType, matchedIndustry: null, confidence: 0.2, evidence: ['industry unmatched, spaceType cannot be cross-validated'] };
  }
  const industryDef = rules.industries[industryKey];
  const allowed = industryDef.spaceTypes ?? [];
  // Common space types that are always allowed regardless of industry (transitional / utility)
  const universalTypes = ['corridor', 'waiting_area', 'restroom_access', 'circulation_path', 'storage', 'back_of_house'];
  if (universalTypes.includes(sceneType)) {
    return { value: sceneType, matchedIndustry: industryKey, confidence: 0.85, evidence: ['universal type, allowed in all industries'] };
  }
  const match = allowed.some((c) => c.toLowerCase() === sceneType.toLowerCase());
  if (!match) {
    // Check forbidden: this is the Phase 9C.0.5 §8 High Risk pattern (restaurant + fitting_room)
    const forbidden = industryDef.spaceTypesForbidden ?? industryDef.negativeConstraintsForbidden ?? [];
    const isForbidden = forbidden.some((c) => c.toLowerCase() === sceneType.toLowerCase());
    const severity = isForbidden ? 'critical' : 'high';
    issues.push({
      field: 'spaceType',
      severity,
      message: `sceneType "${sceneType}" is not in the allowed list for industry "${industryKey}". ${isForbidden ? 'It is explicitly forbidden for this industry (Phase 9C.0.5 §8 High Risk: space type conflicts with industry).' : ''} Allowed: ${allowed.join(', ')}.`,
      evidence: [JSON.stringify(sceneType), `industry=${industryKey}`, isForbidden ? 'forbidden' : 'not in allowed'],
    });
    return { value: sceneType, matchedIndustry: industryKey, confidence: isForbidden ? 0.1 : 0.4, evidence: [isForbidden ? 'forbidden for this industry' : 'spaceType not in industry.allowed'] };
  }
  return { value: sceneType, matchedIndustry: industryKey, confidence: 0.9, evidence: [`sceneType in industry.allowedSpaceTypes: ${allowed.join(', ')}`] };
}

function checkAudience(audienceArr, industryKey, rules, issues) {
  if (!audienceArr || audienceArr.length === 0) {
    issues.push({
      field: 'audience',
      severity: 'medium',
      message: 'audience is missing or empty. Phase 9C.0.5 §6.4: target consumer declaration is required.',
      evidence: [],
    });
    return { value: [], matchedIndustry: industryKey, confidence: 0, evidence: [] };
  }
  if (!industryKey) {
    return { value: audienceArr, matchedIndustry: null, confidence: 0.3, evidence: ['industry unmatched, audience cannot be cross-validated'] };
  }
  const industryDef = rules.industries[industryKey];
  const keywords = (industryDef.audienceKeywords ?? []).map((k) => k.toLowerCase());
  const antiKeywords = (industryDef.audienceAntiKeywords ?? []).map((k) => k.toLowerCase());

  const audienceStr = audienceArr.join(' ').toLowerCase();
  let matchCount = 0;
  let antiCount = 0;
  const matches = [];
  const antiMatches = [];
  for (const k of keywords) {
    if (audienceStr.includes(k)) { matchCount++; matches.push(k); }
  }
  for (const k of antiKeywords) {
    if (audienceStr.includes(k)) { antiCount++; antiMatches.push(k); }
  }

  if (antiCount > 0) {
    issues.push({
      field: 'audience',
      severity: 'high',
      message: `audience contains terms that are anti-patterns for industry "${industryKey}": ${antiMatches.join(', ')}. This is a strong signal the brand identity is wrong.`,
      evidence: [JSON.stringify(audienceArr), `anti-keywords: ${antiMatches.join(', ')}`],
    });
    return {
      value: audienceArr,
      matchedIndustry: industryKey,
      confidence: Math.max(0.1, 0.3 - antiCount * 0.1),
      evidence: [`anti-keyword matches: ${antiMatches.join(', ')}`],
    };
  }

  if (matchCount === 0) {
    issues.push({
      field: 'audience',
      severity: 'medium',
      message: `audience does not contain any expected keyword for industry "${industryKey}". Expected keywords include: ${keywords.slice(0, 5).join(', ')}.`,
      evidence: [JSON.stringify(audienceArr)],
    });
    return {
      value: audienceArr,
      matchedIndustry: industryKey,
      confidence: 0.5,
      evidence: ['no keyword match'],
    };
  }
  return {
    value: audienceArr,
    matchedIndustry: industryKey,
    confidence: Math.min(0.95, 0.6 + matchCount * 0.1),
    evidence: [`keyword matches: ${matches.join(', ')}`],
  };
}

// === Internal DNA consistency check (cross-field contradictions) ===

function checkInternalConsistency(report, industryKey, rules, issues) {
  if (!industryKey) return;
  const industryDef = rules.industries[industryKey];
  if (!industryDef) return;

  // motifFamily cross-industry contamination
  const motifFamily = (report.motifFamily ?? []).map((m) => m.toLowerCase());
  for (const m of motifFamily) {
    const contamination = (rules.crossIndustryMotifContamination ?? []).find((c) => c.motif.toLowerCase() === m);
    if (contamination) {
      const expected = contamination.expectedIndustries ?? (contamination.expectedIndustry ? [contamination.expectedIndustry] : []);
      if (expected.length > 0 && !expected.includes(industryKey)) {
        issues.push({
          field: 'motifFamily',
          severity: contamination.severity,
          message: `motifFamily "${m}" is expected in ${expected.join(' / ')} DNA, but DNA is industry "${industryKey}". ${contamination.rule}`,
          evidence: [JSON.stringify(report.motifFamily), `industry=${industryKey}`, `expected=${expected.join(', ')}`],
        });
      }
    }
  }

  // material cross-industry contamination
  const materials = [...(report.primaryMaterials ?? []), ...(report.accentMaterials ?? [])].map((m) => m.toLowerCase());
  for (const mat of materials) {
    const contamination = (rules.crossIndustryMaterialContamination ?? []).find((c) => c.material.toLowerCase() === mat);
    if (contamination) {
      const expected = contamination.expectedIndustries ?? (contamination.expectedIndustry ? [contamination.expectedIndustry] : []);
      if (expected.length > 0 && !expected.includes(industryKey)) {
        issues.push({
          field: 'materialDna',
          severity: contamination.severity,
          message: `material "${mat}" is expected in ${expected.join(' / ')} DNA, but DNA is industry "${industryKey}". ${contamination.rule}`,
          evidence: [JSON.stringify(materials), `industry=${industryKey}`, `expected=${expected.join(', ')}`],
        });
      }
    }
  }

  // negativeConstraints cross-industry contamination
  const negativeConstraints = (report.negativeConstraints ?? []).map((m) => m.toLowerCase());
  for (const nc of negativeConstraints) {
    const contamination = (rules.crossIndustryNegativeConstraintContamination ?? []).find((c) => c.constraint.toLowerCase() === nc);
    if (contamination) {
      const expected = contamination.expectedIndustries ?? (contamination.expectedIndustry ? [contamination.expectedIndustry] : []);
      if (expected.length > 0 && !expected.includes(industryKey)) {
        issues.push({
          field: 'negativeConstraints',
          severity: contamination.severity,
          message: `negativeConstraints "${nc}" is a concern of ${expected.join(' / ')} DNA, but DNA is industry "${industryKey}". ${contamination.rule}`,
          evidence: [JSON.stringify(report.negativeConstraints), `industry=${industryKey}`, `expected=${expected.join(', ')}`],
        });
      }
    }
  }

  // brandSpirit range check (low severity)
  const brandSpirit = report.brandSpirit ?? {};
  const expected = industryDef.brandSpiritExpected ?? {};
  for (const [key, val] of Object.entries(brandSpirit)) {
    if (typeof val !== 'number') continue;
    const range = expected[key];
    if (range && Array.isArray(range) && range.length === 2) {
      const [lo, hi] = range;
      if (val < lo || val > hi) {
        // Only flag if significantly outside (>0.15 deviation)
        if (val < lo - 0.15 || val > hi + 0.15) {
          issues.push({
            field: 'brandSpirit',
            severity: 'low',
            message: `brandSpirit.${key}=${val} is outside expected range [${lo}, ${hi}] for industry "${industryKey}".`,
            evidence: [JSON.stringify(brandSpirit), `industry=${industryKey}`],
          });
        }
      }
    }
  }
}

// Re-exports
export {
  PHASE,
  VERSION,
  GATE_NAME,
  DATA_CONTRACT,
  loadRules,
  synthesizeAnalysisReport,
  detectIndustryKey,
};
