// Brand Identity Validation Gate v2 (Phase 9C.0.5 Updated)
// 用途: 在 brand analysis 跟 spatial runtime 之间插入一个 gate, 验证 brand DNA
//       的内部一致性与外部可识别性. 错位 DNA (如 wa-ye v0.1 把炭烧牛蛙餐饮
//       标成体育用品零售 + medical/tcm concerns) 会被识别并 blocked, 阻断
//       错误 brand identity 进入 spatial generation.
//
// Phase 9C.0.5 Updated §2 跟 Structured Analysis Self-Healing 的关系:
//   - Self-healing 修 schema / 字段缺失 / 默认值 / 缓存 / contract drift
//   - 9C.0.5 修 cross-industry contamination (品牌语义是否正确)
//   - 二者不合并.
//
// Phase 9C.0.5 Updated §3 核心设计原则:
//   - Principle 01: 必须发生在 spatial generation 之前
//   - Principle 02: 只阻断, 不重新设计 (no auto-correction)
//   - Principle 03: 低成本 (text-only, no image gen)
//   - Principle 04: 不替代 Creative Decision (Updated §10)
//
// Phase 9C.0.5 Updated §6 Validation Fields (6 个):
//   - Industry / Category / Space Type / Audience / Material Direction / Functional Relationship
//
// Phase 9C.0.5 Updated §7 Output schema (Pass/Block 二态):
//   Pass:  { status: "pass", riskLevel: "low", recommendation: "continue" }
//   Block: { status: "blocked", riskLevel: "critical"|"high"|"medium",
//            recommendation: "review_brand_DNA" | "ask_user" }
//
// Phase 9C.0.5 Updated §8 Blocking Rules:
//   - critical: 行业完全冲突 (industry unmatched / 完全不属于 known industries)
//   - high:     空间功能冲突 (sceneType forbidden / material / motif / zone 严重
//               cross-industry contamination)
//   - medium:   需要人工确认 (部分 cross-industry / brandSpirit 偏离 / field 缺失)
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
 * Phase 9C.0.5 Updated Main Gate Entry: validate a brand DNA against industry rules.
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

  // === Field 5: Material Direction (Phase 9C.0.5 Updated §6) ===
  const materialDirectionCheck = checkMaterialDirection(
    [...(report.primaryMaterials ?? []), ...(report.secondaryMaterials ?? []), ...(report.accentMaterials ?? [])],
    industryCheck.matchedIndustry,
    rules,
    issues,
  );

  // === Field 6: Functional Relationship (Phase 9C.0.5 Updated §6) ===
  const functionalRelationshipCheck = checkFunctionalRelationship(
    [...(report.requiredZones ?? []), ...(report.optionalZones ?? [])],
    industryCheck.matchedIndustry,
    rules,
    issues,
  );

  // === Internal DNA consistency check (cross-field contradictions) ===
  checkInternalConsistency(report, industryCheck.matchedIndustry, rules, issues);

  // === Compute overall confidence ===
  // 6 fields weighted: industry 0.25 / spaceType 0.20 / audience 0.15 /
  //                    category 0.10 / materialDirection 0.15 / functionalRelationship 0.15
  const overallConfidence = (
    industryCheck.confidence * 0.25
    + spaceTypeCheck.confidence * 0.20
    + audienceCheck.confidence * 0.15
    + categoryCheck.confidence * 0.10
    + materialDirectionCheck.confidence * 0.15
    + functionalRelationshipCheck.confidence * 0.15
  );

  // === Compute riskLevel (Updated §7) ===
  // riskLevel = highest severity present, or 'low' if 0 issues
  const riskLevel = issues.length === 0
    ? 'low'
    : (issues.some((i) => i.severity === 'critical') ? 'critical'
      : (issues.some((i) => i.severity === 'high') ? 'high'
        : (issues.some((i) => i.severity === 'medium') ? 'medium' : 'low')));

  // === Compute status + recommendation (Updated §7) ===
  // Pass: 0 issues AND overallConfidence >= pass threshold
  // Block: any issue (recommendation depends on riskLevel)
  const thresholds = rules.confidenceThresholds ?? DATA_CONTRACT.thresholds;
  let status;
  let recommendation;
  if (issues.length === 0 && overallConfidence >= (thresholds.pass ?? 0.85)) {
    status = 'pass';
    recommendation = 'continue';
  } else {
    status = 'blocked';
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendation = 'review_brand_DNA';
    } else {
      // medium (or low with 0 issues but low confidence, treated as ask_user)
      recommendation = 'ask_user';
    }
  }

  return {
    status,
    riskLevel,
    recommendation,
    industry: industryCheck,
    category: categoryCheck,
    spaceType: spaceTypeCheck,
    audience: audienceCheck,
    materialDirection: materialDirectionCheck,
    functionalRelationship: functionalRelationshipCheck,
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

// === Field 1: Industry ===

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

// === Field 2: Category ===

function checkCategory(categoryStr, industryKey, rules, issues) {
  if (!categoryStr) {
    issues.push({
      field: 'category',
      severity: 'medium',
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

// === Field 3: SpaceType ===

function checkSpaceType(sceneType, industryKey, rules, issues, report) {
  if (!sceneType) {
    issues.push({
      field: 'spaceType',
      severity: 'medium',
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
  const universalTypes = ['corridor', 'waiting_area', 'restroom_access', 'circulation_path', 'storage', 'back_of_house'];
  if (universalTypes.includes(sceneType)) {
    return { value: sceneType, matchedIndustry: industryKey, confidence: 0.85, evidence: ['universal type, allowed in all industries'] };
  }
  const match = allowed.some((c) => c.toLowerCase() === sceneType.toLowerCase());
  if (!match) {
    // Phase 9C.0.5 §8: spaceType 在 industry.forbiddenSpaceTypes → critical
    const forbidden = industryDef.spaceTypesForbidden ?? [];
    const isForbidden = forbidden.some((c) => c.toLowerCase() === sceneType.toLowerCase());
    const severity = isForbidden ? 'critical' : 'high';
    issues.push({
      field: 'spaceType',
      severity,
      message: `sceneType "${sceneType}" is ${isForbidden ? 'explicitly forbidden' : 'not in the allowed list'} for industry "${industryKey}". ${isForbidden ? 'Phase 9C.0.5 §8 Critical: space type fundamentally conflicts with industry (e.g. restaurant + fitting_room).' : 'Phase 9C.0.5 §8 High Risk: space type not in industry.allowed.'} Allowed: ${allowed.join(', ')}.`,
      evidence: [JSON.stringify(sceneType), `industry=${industryKey}`, isForbidden ? 'forbidden' : 'not in allowed'],
    });
    return { value: sceneType, matchedIndustry: industryKey, confidence: isForbidden ? 0.1 : 0.4, evidence: [isForbidden ? 'forbidden for this industry' : 'spaceType not in industry.allowed'] };
  }
  return { value: sceneType, matchedIndustry: industryKey, confidence: 0.9, evidence: [`sceneType in industry.allowedSpaceTypes: ${allowed.join(', ')}`] };
}

// === Field 4: Audience ===

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

// === Field 5: Material Direction (Phase 9C.0.5 Updated §6) ===

function checkMaterialDirection(materials, industryKey, rules, issues) {
  if (!materials || materials.length === 0) {
    issues.push({
      field: 'materialDirection',
      severity: 'medium',
      message: 'No materials declared in DNA (primaryMaterials + secondaryMaterials + accentMaterials). Phase 9C.0.5 §6.5: material direction is required.',
      evidence: [],
    });
    return { value: [], matchedIndustry: industryKey, confidence: 0, evidence: [] };
  }
  if (!industryKey) {
    return { value: materials, matchedIndustry: null, confidence: 0.2, evidence: ['industry unmatched, materials cannot be cross-validated'] };
  }
  const industryDef = rules.industries[industryKey];
  const matDir = industryDef.materialDirection ?? {};
  const expectedList = (matDir.expectedMaterials ?? []).map((m) => m.toLowerCase());
  const forbiddenList = (matDir.forbiddenMaterials ?? industryDef.materialsForbidden ?? []).map((m) => m.toLowerCase());
  const forbidden = new Set(forbiddenList);

  // Material match: support substring + token intersection (e.g. "warm_wood_booth" matches "warm_wood")
  function materialMatches(dnaMat, expectedMat) {
    const d = dnaMat.toLowerCase();
    const e = expectedMat.toLowerCase();
    if (d === e) return true;
    if (d.includes(e) || e.includes(d)) return true;
    const dTokens = d.split(/[_\-\s\/]+/).filter(Boolean);
    const eTokens = e.split(/[_\-\s\/]+/).filter(Boolean);
    return dTokens.some((t) => eTokens.includes(t));
  }

  const normMaterials = materials.map((m) => String(m).toLowerCase());
  const matchedExpected = [];
  const matchedForbidden = [];

  for (const m of normMaterials) {
    if (forbidden.has(m)) matchedForbidden.push(m);
    for (const e of expectedList) {
      if (materialMatches(m, e)) {
        matchedExpected.push(m);
        break;
      }
    }
  }

  if (matchedForbidden.length > 0) {
    // Phase 9C.0.5 §8 High: material 严重 cross-industry (用 industry.forbidden materials)
    issues.push({
      field: 'materialDirection',
      severity: 'high',
      message: `materialDirection uses materials forbidden for industry "${industryKey}": ${matchedForbidden.join(', ')}. Phase 9C.0.5 §8 High Risk: material direction conflicts with industry (e.g. sports_retail DNA with exposed_concrete pattern).`,
      evidence: [JSON.stringify(materials), `industry=${industryKey}`, `forbidden=${matchedForbidden.join(', ')}`],
    });
  }

  if (matchedExpected.length === 0) {
    issues.push({
      field: 'materialDirection',
      severity: 'medium',
      message: `materialDirection does not use any expected material for industry "${industryKey}". Expected: ${expectedList.slice(0, 5).join(', ')}.`,
      evidence: [JSON.stringify(materials), `expected=${expectedList.slice(0, 5).join(', ')}`],
    });
    return {
      value: materials,
      matchedIndustry: industryKey,
      confidence: matchedForbidden.length > 0 ? 0.2 : 0.4,
      evidence: matchedForbidden.length > 0
        ? [`forbidden matches: ${matchedForbidden.join(', ')}`, 'no expected match']
        : ['no expected match'],
    };
  }
  return {
    value: materials,
    matchedIndustry: industryKey,
    confidence: matchedForbidden.length > 0 ? 0.5 : Math.min(0.95, 0.7 + matchedExpected.length * 0.1),
    evidence: [`expected matches: ${matchedExpected.join(', ')}` + (matchedForbidden.length > 0 ? `; forbidden matches: ${matchedForbidden.join(', ')}` : '')],
  };
}

// === Field 6: Functional Relationship (Phase 9C.0.5 Updated §6) ===

function checkFunctionalRelationship(zones, industryKey, rules, issues) {
  if (!zones || zones.length === 0) {
    issues.push({
      field: 'functionalRelationship',
      severity: 'medium',
      message: 'No zones declared in DNA (requiredZones + optionalZones). Phase 9C.0.5 §6.6: functional relationship is required.',
      evidence: [],
    });
    return { value: [], matchedIndustry: industryKey, confidence: 0, evidence: [] };
  }
  if (!industryKey) {
    return { value: zones, matchedIndustry: null, confidence: 0.2, evidence: ['industry unmatched, zones cannot be cross-validated'] };
  }
  const industryDef = rules.industries[industryKey];
  const funcRel = industryDef.functionalRelationship ?? {};
  const expected = new Set((funcRel.expectedZones ?? []).map((z) => z.toLowerCase()));
  const forbidden = new Set((funcRel.forbiddenZones ?? []).map((z) => z.toLowerCase()));

  const normZones = zones.map((z) => String(z).toLowerCase());
  const matchedExpected = [];
  const matchedForbidden = [];

  // Zone match: support Chinese/English mixed names like "点单_counter"
  // Tokenize zone by splitting on underscores/hyphens, then check if any token
  // matches expected zone (case-insensitive substring).
  function zoneTokens(z) {
    return z.toLowerCase().split(/[_\-\s\/]+/).filter(Boolean);
  }
  function zoneMatches(dnaZone, expectedZone) {
    const d = dnaZone.toLowerCase();
    const e = expectedZone.toLowerCase();
    if (d === e) return true;
    if (d.includes(e) || e.includes(d)) return true;
    // Token-level match: any token of dna zone matches expected zone
    const dTokens = zoneTokens(dnaZone);
    return dTokens.includes(e);
  }

  // First check cross-industry zone contamination (e.g. "fitting_room" in restaurant)
  for (const z of normZones) {
    for (const contamination of (rules.crossIndustryZoneContamination ?? [])) {
      if (zoneMatches(z, contamination.zone)) {
        const expected_inds = contamination.expectedIndustries ?? [];
        if (!expected_inds.includes(industryKey)) {
          matchedForbidden.push({ zone: z, contamination });
          break;
        }
      }
    }
    if (!matchedForbidden.some((m) => m.zone === z)) {
      // Check expected zones via token/substring match
      for (const e of expected) {
        if (zoneMatches(z, e)) {
          matchedExpected.push(z);
          break;
        }
      }
    }
  }

  if (matchedForbidden.length > 0) {
    // Phase 9C.0.5 §8: zone cross-industry contamination is high/critical
    const hasCritical = matchedForbidden.some((m) => m.contamination.severity === 'critical' || m.contamination.severity === 'high');
    const severity = hasCritical ? 'high' : 'medium';
    const zoneList = matchedForbidden.map((m) => m.zone).join(', ');
    const ruleList = matchedForbidden.map((m) => m.contamination.rule).join(' | ');
    issues.push({
      field: 'functionalRelationship',
      severity,
      message: `functionalRelationship uses zones that cross-industry contamination: ${zoneList}. ${ruleList} Phase 9C.0.5 §8 High Risk: zone direction conflicts with industry.`,
      evidence: [JSON.stringify(zones), `industry=${industryKey}`, `forbidden zones: ${zoneList}`],
    });
  }

  if (matchedExpected.length === 0) {
    if (matchedForbidden.length === 0) {
      issues.push({
        field: 'functionalRelationship',
        severity: 'medium',
        message: `functionalRelationship does not use any expected zone for industry "${industryKey}". Expected: ${Array.from(expected).slice(0, 5).join(', ')}.`,
        evidence: [JSON.stringify(zones), `expected=${Array.from(expected).slice(0, 5).join(', ')}`],
      });
    }
    return {
      value: zones,
      matchedIndustry: industryKey,
      confidence: matchedForbidden.length > 0 ? 0.2 : 0.4,
      evidence: matchedForbidden.length > 0
        ? [`forbidden matches: ${matchedForbidden.map((m) => m.zone).join(', ')}`, 'no expected match']
        : ['no expected match'],
    };
  }
  return {
    value: zones,
    matchedIndustry: industryKey,
    confidence: matchedForbidden.length > 0 ? 0.5 : Math.min(0.95, 0.7 + matchedExpected.length * 0.1),
    evidence: [`expected matches: ${matchedExpected.join(', ')}` + (matchedForbidden.length > 0 ? `; forbidden matches: ${matchedForbidden.map((m) => m.zone).join(', ')}` : '')],
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

  // brandSpirit range check (low severity, doesn't block)
  const brandSpirit = report.brandSpirit ?? {};
  const expected = industryDef.brandSpiritExpected ?? {};
  for (const [key, val] of Object.entries(brandSpirit)) {
    if (typeof val !== 'number') continue;
    const range = expected[key];
    if (range && Array.isArray(range) && range.length === 2) {
      const [lo, hi] = range;
      if (val < lo || val > hi) {
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
