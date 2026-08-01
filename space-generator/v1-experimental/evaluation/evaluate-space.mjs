// Space Evaluation Layer v1.1
// 按 v1.0 §25 6 维评分体系: 建筑设计质量(25) + 品牌转译质量(20) + 功能真实性(20) +
//   材质与照明(15) + 构图与交付质量(10) + 多样性与一致性(10) = 100 分
// 验收等级: v1.0 §26 -> S 级 >= 85, A 级 70-84, B 级 55-69, C 级 < 55
//
// v1.1 §8 验收标准:
//   优秀: "建筑事务所设计的九州美学旗舰空间" -> S 级
//   失败: "普通医美空间 + 九州美学 Logo" -> C 级
//
// 不调 Provider, 不污染生产代码, 不动 v1-baseline.
// 基于 DNA 结构做确定性评分, 任何 v0.1 / v0.2 DNA 都能跑出总分.

const SPIRIT_DIMS = ['scientific', 'elegant', 'healing', 'futuristic', 'premium'];
const GRAMMAR_DIMS = ['organicGrowth', 'visualLightness', 'controlledGlow', 'refinedOrder', 'decorativeDensity'];

/**
 * Dimension 1: Architecture Quality (25 pts)
 * v1.0 §25.1
 */
function scoreArchitecture(dna) {
  const ad = dna.architectureDna || {};
  let score = 0;
  const breakdown = [];
  // v1.1 §1: Architecture Anchor 抽出的 4 个 mechanism 字段
  if (ad.ceilingMechanism && ad.ceilingMechanism.length >= 50) {
    score += 6;
    breakdown.push(`ceilingMechanism present (${ad.ceilingMechanism.length} chars): +6`);
  } else if (ad.ceilingMechanism) {
    score += 3;
    breakdown.push(`ceilingMechanism present but short (${ad.ceilingMechanism.length} chars): +3`);
  } else {
    breakdown.push('ceilingMechanism missing: +0');
  }
  if (ad.facadeMechanism && ad.facadeMechanism.length >= 50) {
    score += 6;
    breakdown.push(`facadeMechanism present: +6`);
  } else if (ad.facadeMechanism) {
    score += 3;
    breakdown.push(`facadeMechanism present but short: +3`);
  } else {
    breakdown.push('facadeMechanism missing: +0');
  }
  if (ad.partitionMechanism) {
    score += 4;
    breakdown.push('partitionMechanism present: +4');
  } else {
    breakdown.push('partitionMechanism missing: +0');
  }
  if (ad.furnitureFormGrammar) {
    score += 3;
    breakdown.push('furnitureFormGrammar present: +3');
  } else {
    breakdown.push('furnitureFormGrammar missing: +0');
  }
  if (ad.spatialConcept?.primary) {
    score += 3;
    breakdown.push(`spatialConcept.primary: ${ad.spatialConcept.primary}: +3`);
  } else {
    breakdown.push('spatialConcept.primary missing: +0');
  }
  if (ad.statementStrength === 'high') {
    score += 3;
    breakdown.push('statementStrength=high: +3');
  } else {
    breakdown.push(`statementStrength=${ad.statementStrength ?? 'n/a'}: +0`);
  }
  return { score, max: 25, breakdown };
}

/**
 * Dimension 2: Brand Translation Quality (20 pts)
 * v1.0 §25.2
 * 优先 v1.1 brandTranslationRules, fallback v0.1 brandSpaceDna.
 */
function scoreBrandTranslation(dna) {
  let score = 0;
  const breakdown = [];
  const btr = dna.brandTranslationRules;
  const bsd = dna.brandSpaceDna;
  if (btr) {
    // v1.1 path
    breakdown.push('v1.1 brandTranslationRules present: +5 base');
    score += 5;
    const spirit = btr.spiritToSpaceMechanism ?? {};
    const spiritCount = SPIRIT_DIMS.filter((d) => spirit[d]).length;
    if (spiritCount === 5) {
      score += 5;
      breakdown.push(`5/5 spiritToSpaceMechanism rules: +5`);
    } else {
      score += spiritCount;
      breakdown.push(`${spiritCount}/5 spirit rules: +${spiritCount}`);
    }
    const grammar = btr.grammarToSpaceMechanism ?? {};
    const grammarCount = GRAMMAR_DIMS.filter((d) => grammar[d]).length;
    if (grammarCount === 5) {
      score += 3;
      breakdown.push(`5/5 grammarToSpaceMechanism rules: +3`);
    } else {
      score += Math.floor(grammarCount * 3 / 5);
      breakdown.push(`${grammarCount}/5 grammar rules: +${Math.floor(grammarCount * 3 / 5)}`);
    }
    const motif = btr.motifToSpaceMechanism ?? [];
    if (motif.length === 5) {
      score += 4;
      breakdown.push(`5 motifToSpaceMechanism rules: +4`);
    } else {
      score += Math.floor(motif.length * 4 / 5);
      breakdown.push(`${motif.length} motif rules: +${Math.floor(motif.length * 4 / 5)}`);
    }
    const allLiteralForbidden = motif.every((m) => m.literalAssetForbidden === true);
    if (allLiteralForbidden) {
      score += 3;
      breakdown.push('all 5 motifs literalAssetForbidden=true (v1.0 §34 规则一/五): +3');
    } else {
      breakdown.push('not all motifs literalAssetForbidden=true: +0');
    }
  } else if (bsd) {
    // v0.1 fallback path
    breakdown.push('v0.1 brandSpaceDna fallback (no brandTranslationRules): +0 base');
    const spirit = bsd.brandSpirit ?? {};
    const highCount = SPIRIT_DIMS.filter((d) => typeof spirit[d] === 'number' && spirit[d] >= 0.7).length;
    if (highCount >= 4) {
      score += 5;
      breakdown.push(`brandSpirit high-weight: ${highCount}/5: +5`);
    } else {
      score += highCount;
      breakdown.push(`brandSpirit high-weight: ${highCount}/5: +${highCount}`);
    }
    const mf = bsd.motifFamily ?? [];
    if (mf.length === 5) {
      score += 4;
      breakdown.push('motifFamily has 5 candidates: +4');
    } else {
      score += Math.floor(mf.length * 4 / 5);
      breakdown.push(`motifFamily has ${mf.length}: +${Math.floor(mf.length * 4 / 5)}`);
    }
    if (bsd.injectionStrength !== undefined && bsd.injectionStrength <= 0.6) {
      score += 3;
      breakdown.push(`injectionStrength ${bsd.injectionStrength} <= 0.6: +3`);
    } else {
      breakdown.push(`injectionStrength ${bsd.injectionStrength} too high or missing: +0`);
    }
    if (bsd.literalAssetUsage?.directPeacockUsage === 'low') {
      score += 3;
      breakdown.push('directPeacockUsage=low (v1.0 §34): +3');
    }
  } else {
    breakdown.push('no brandSpaceDna / brandTranslationRules: +0');
  }
  return { score, max: 20, breakdown };
}

/**
 * Dimension 3: Functional Realism (20 pts)
 * v1.0 §25.3
 */
function scoreFunctional(dna) {
  let score = 0;
  const breakdown = [];
  const fd = dna.functionalDna ?? {};
  const sd = dna.sceneDefinition ?? {};
  if (fd.operationalRealism) {
    score += 3;
    breakdown.push(`operationalRealism=${fd.operationalRealism}: +3`);
  }
  const cf = fd.customerFlow ?? {};
  const flowKeys = ['entranceToReception', 'receptionToWaiting', 'waitingToConsultation'];
  const flowCount = flowKeys.filter((k) => cf[k]).length;
  if (flowCount === 3) {
    score += 3;
    breakdown.push('3/3 customerFlow keys: +3');
  } else {
    score += flowCount;
    breakdown.push(`${flowCount}/3 customerFlow: +${flowCount}`);
  }
  const privacy = fd.privacy ?? {};
  const privacyCount = ['publicZone', 'semiPrivateZone', 'treatmentZone'].filter((k) => privacy[k]).length;
  if (privacyCount === 3) {
    score += 3;
    breakdown.push('3/3 privacy zones: +3');
  } else {
    score += privacyCount;
    breakdown.push(`${privacyCount}/3 privacy: +${privacyCount}`);
  }
  const fr = fd.furnitureRequirements ?? {};
  const frCount = ['ergonomic', 'commercialGrade', 'accessible'].filter((k) => fr[k] === true).length;
  if (frCount === 3) {
    score += 3;
    breakdown.push('3/3 furnitureRequirements true: +3');
  } else {
    score += frCount;
    breakdown.push(`${frCount}/3 furnitureRequirements: +${frCount}`);
  }
  if (fd.medicalComplianceExpression?.visibleButNotHospitalLike === true) {
    score += 3;
    breakdown.push('medicalComplianceExpression visibleButNotHospitalLike=true: +3');
  } else {
    breakdown.push('medicalComplianceExpression missing: +0');
  }
  const reqZones = sd.requiredZones ?? [];
  if (reqZones.length >= 2) {
    score += 3;
    breakdown.push(`requiredZones count ${reqZones.length} >= 2: +3`);
  } else {
    breakdown.push(`requiredZones count ${reqZones.length} < 2: +0`);
  }
  if (sd.areaSqm && sd.areaSqm > 0) {
    score += 2;
    breakdown.push(`areaSqm=${sd.areaSqm}: +2`);
  }
  return { score, max: 20, breakdown };
}

/**
 * Dimension 4: Material + Lighting (15 pts)
 * v1.0 §25.4
 */
function scoreMaterialLighting(dna) {
  let score = 0;
  const breakdown = [];
  const md = dna.materialDna ?? {};
  const ld = dna.lightingDna ?? {};
  if (md.materialCountLimit) {
    score += 3;
    breakdown.push(`materialCountLimit=${md.materialCountLimit}: +3`);
  }
  const matTotal = (md.primaryMaterials?.length ?? 0) + (md.secondaryMaterials?.length ?? 0) + (md.accentMaterials?.length ?? 0);
  if (matTotal > 0) {
    score += 2;
    breakdown.push(`materials total ${matTotal} > 0: +2`);
  }
  if ((md.secondaryMaterials?.length ?? 0) >= 1) {
    score += 2;
    breakdown.push('secondary materials >= 1: +2');
  }
  if ((md.accentMaterials?.length ?? 0) >= 1) {
    score += 1;
    breakdown.push('accent materials >= 1: +1');
  }
  if (['architectural_indirect_light', 'natural_lighting', 'mixed', 'direct_lighting'].includes(ld.primaryStrategy)) {
    score += 2;
    breakdown.push(`lighting primaryStrategy=${ld.primaryStrategy}: +2`);
  }
  if (ld.architecturalGlow === 'high') {
    score += 2;
    breakdown.push('architecturalGlow=high: +2');
  }
  if (ld.brandLight?.saturation === 'low') {
    score += 2;
    breakdown.push('brandLight saturation=low: +2');
  }
  if (ld.brandLight?.areaRatio === 'limited') {
    score += 1;
    breakdown.push('brandLight areaRatio=limited: +1');
  }
  return { score, max: 15, breakdown };
}

/**
 * Dimension 5: Composition + Delivery (10 pts)
 * v1.0 §25.5
 */
function scoreComposition(dna) {
  let score = 0;
  const breakdown = [];
  const cd = dna.compositionDna ?? {};
  const fh = cd.focalHierarchy ?? {};
  const focalCount = ['primary', 'secondary', 'tertiary'].filter((k) => fh[k]).length;
  if (focalCount === 3) {
    score += 3;
    breakdown.push('3/3 focal hierarchy: +3');
  } else {
    score += focalCount;
    breakdown.push(`${focalCount}/3 focal: +${focalCount}`);
  }
  const cam = cd.camera ?? {};
  if (cam.lens && cam.height && cam.distortion) {
    score += 2;
    breakdown.push('camera lens+height+distortion: +2');
  }
  if (cd.framing?.depthLayers) {
    score += 2;
    breakdown.push(`framing depthLayers=${cd.framing.depthLayers}: +2`);
  }
  if (cd.visualBalance?.negativeSpace === 'high') {
    score += 2;
    breakdown.push('visualBalance.negativeSpace=high: +2');
  }
  if (cd.visualBalance?.density === 'low') {
    score += 1;
    breakdown.push('visualBalance.density=low: +1');
  }
  return { score, max: 10, breakdown };
}

/**
 * Dimension 6: Diversity + Consistency (10 pts)
 * v1.0 §25.6
 */
function scoreDiversity(dna) {
  let score = 0;
  const breakdown = [];
  const vc = dna.variationControl ?? {};
  const nc = dna.negativeConstraints ?? {};
  if ((vc.preserve?.length ?? 0) >= 1) {
    score += 2;
    breakdown.push(`preserve count ${vc.preserve.length}: +2`);
  }
  if ((vc.vary?.length ?? 0) >= 3) {
    score += 2;
    breakdown.push(`vary count ${vc.vary.length} >= 3: +2`);
  } else {
    score += vc.vary?.length ?? 0;
    breakdown.push(`vary count ${vc.vary?.length ?? 0}: +${vc.vary?.length ?? 0}`);
  }
  if (vc.motifRepetitionLimit) {
    score += 2;
    breakdown.push('motifRepetitionLimit present: +2');
  }
  if (vc.requireNovelSpatialSolution === true) {
    score += 2;
    breakdown.push('requireNovelSpatialSolution=true: +2');
  }
  if ((nc.prohibit?.length ?? 0) >= 8) {
    score += 2;
    breakdown.push(`negativeConstraints.prohibit count ${nc.prohibit.length} >= 8: +2`);
  } else {
    breakdown.push(`negativeConstraints.prohibit count ${nc.prohibit?.length ?? 0} < 8: +0`);
  }
  return { score, max: 10, breakdown };
}

/**
 * Map total score to quality level.
 * v1.0 §26:
 *   S: >= 85 (优秀, 建筑事务所设计感)
 *   A: 70-84
 *   B: 55-69
 *   C: < 55 (普通医美 + logo = 失败)
 */
function scoreToLevel(total) {
  if (total >= 85) return 'S';
  if (total >= 70) return 'A';
  if (total >= 55) return 'B';
  return 'C';
}

/**
 * Evaluate a Space DNA instance against v1.0 §25 6-dimension scoring.
 * @param dna  Space DNA instance (v0.1 or v1.1)
 * @returns   { total, max, level, dimensions: [{ name, score, max, breakdown }] }
 */
export function evaluateSpace(dna) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('evaluateSpace: dna must be a non-null object');
  }
  const dimensions = [
    { name: 'architecture_quality', label: '建筑设计质量 (v1.0 §25.1)', ...scoreArchitecture(dna) },
    { name: 'brand_translation', label: '品牌转译质量 (v1.0 §25.2)', ...scoreBrandTranslation(dna) },
    { name: 'functional_realism', label: '功能真实性 (v1.0 §25.3)', ...scoreFunctional(dna) },
    { name: 'material_lighting', label: '材质与照明 (v1.0 §25.4)', ...scoreMaterialLighting(dna) },
    { name: 'composition_delivery', label: '构图与交付质量 (v1.0 §25.5)', ...scoreComposition(dna) },
    { name: 'diversity_consistency', label: '多样性与一致性 (v1.0 §25.6)', ...scoreDiversity(dna) },
  ];
  const total = dimensions.reduce((s, d) => s + d.score, 0);
  const max = dimensions.reduce((s, d) => s + d.max, 0);
  return {
    total,
    max,
    level: scoreToLevel(total),
    dimensions,
  };
}
