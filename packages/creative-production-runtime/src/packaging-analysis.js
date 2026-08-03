const SPATIAL_LANGUAGE = /接待台|空间动线|入口视角|天花|墙面|地面|建筑广角|\breception desk\b|\bcirculation\b|\bceiling\b/iu;

function list(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    if (clean && !SPATIAL_LANGUAGE.test(clean) && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}

function evidence(items) {
  return list((Array.isArray(items) ? items : []).flatMap((item) => item?.evidenceRefs));
}

export function validatePackagingStructuredAnalysis(analysis) {
  const missing = [];
  if (analysis?.schemaVersion !== '1.0') missing.push('schemaVersion');
  if (!analysis?.shotId) missing.push('shotId');
  if (!analysis?.packageStructure?.length) missing.push('packageStructure');
  if (!evidence(analysis?.packageStructure).length) missing.push('packageStructureEvidence');
  if (!analysis?.productArrangement?.length) missing.push('productArrangement');
  if (!analysis?.material?.length) missing.push('material');
  if (!analysis?.craft?.length) missing.push('craft');
  if (!analysis?.logoTreatment?.length) missing.push('logoTreatment');
  if (!analysis?.graphicSystem?.length) missing.push('graphicSystem');
  if (analysis?.shotId === 'PKG-SERIES-GROUP' && !analysis?.seriesArchitecture?.length) {
    missing.push('seriesArchitecture');
  }
  if (!list(analysis?.camera, analysis?.composition, analysis?.lighting).length) missing.push('photography');
  if (SPATIAL_LANGUAGE.test(JSON.stringify(analysis ?? {}))) missing.push('crossMediaLanguage');
  return { status: missing.length ? 'insufficient' : 'ready', missingRequiredFields: [...new Set(missing)] };
}

export function buildPackagingStructuredAnalysis(input = {}) {
  const packet = input.visualDecisionPacket ?? {};
  const source = packet.mediaTranslations?.packaging ?? input.packagingTranslation ?? {};
  const shotId = String(input.shotId ?? input.taskContract?.shot ?? '').trim();
  const structures = (Array.isArray(source.structureStrategy) ? source.structureStrategy : [])
    .flatMap((item) => {
      const structure = String(item?.structure ?? '').trim();
      return structure && !SPATIAL_LANGUAGE.test(structure) ? [{
        structure,
        purpose: String(item?.purpose ?? '').trim(),
        locked: Boolean(item?.locked),
        evidenceRefs: list(item?.evidenceRefs),
      }] : [];
    });
  const crafts = (Array.isArray(source.craftLanguage) ? source.craftLanguage : [])
    .flatMap((item) => list(item?.craft).map((craft) => ({
      craft,
      purpose: String(item?.purpose ?? '').trim(),
      forbiddenUse: list(item?.forbiddenUse),
    })));
  const graphics = (Array.isArray(source.graphicTranslation) ? source.graphicTranslation : [])
    .flatMap((item) => list(item?.packagingExpression).map((expression) => ({
      sourceMeaning: String(item?.sourceMeaning ?? '').trim(),
      expression,
      forbiddenLiteralUse: list(item?.forbiddenLiteralUse),
    })));
  const analysis = {
    schemaVersion: '1.0',
    status: 'insufficient',
    shotId,
    packageStructure: structures,
    productArrangement: list(source.productArrangement),
    material: list(source.substrateLanguage),
    craft: crafts,
    logoTreatment: list(source.logoPolicy),
    graphicSystem: graphics,
    seriesArchitecture: list(source.seriesArchitecture),
    informationHierarchy: list(source.informationHierarchy),
    colorBehavior: {
      base: list(source.colorBehavior?.base),
      identity: list(source.colorBehavior?.identity),
      accent: list(source.colorBehavior?.accent),
      forbidden: list(source.colorBehavior?.forbidden),
    },
    camera: list(source.photographyDirection),
    composition: list(source.photographyDirection, input.shotDefinition?.purpose
      ? `Shot contract: ${input.shotDefinition.purpose}` : ''),
    lighting: list(packet.lightingSystem?.source, packet.lightingSystem?.interactionWithMaterials),
    scene: list(source.sceneStrategy),
    props: list(source.props),
    brandExpression: list(source.packagingConcept, source.productAndCategoryRole),
    provenance: {
      sourceFingerprint: String(packet.provenance?.sourceFingerprint ?? ''),
      structureEvidenceRefs: evidence(structures),
      productEvidenceRefs: list(source.productRoleEvidenceRefs),
      generatedBy: 'deterministic_packaging_analysis',
    },
    confidence: {
      structure: evidence(structures).length ? 1 : 0,
      product: list(source.productRoleEvidenceRefs).length ? 1 : 0,
      visualTranslation: source.status === 'ready' ? 1 : 0.5,
      overall: 0,
    },
    missingRequiredFields: [],
  };
  analysis.confidence.overall = Number(((analysis.confidence.structure
    + analysis.confidence.product + analysis.confidence.visualTranslation) / 3).toFixed(3));
  const validation = validatePackagingStructuredAnalysis(analysis);
  analysis.status = validation.status;
  analysis.missingRequiredFields = validation.missingRequiredFields;
  return analysis;
}

export function assertPackagingStructuredAnalysis(analysis) {
  const validation = validatePackagingStructuredAnalysis(analysis);
  if (validation.status !== 'ready') {
    const code = validation.missingRequiredFields.some((item) => item.startsWith('packageStructure'))
      ? 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'
      : validation.missingRequiredFields.some((item) => item === 'productArrangement')
        ? 'PACKAGING_PRODUCT_ROLE_MISSING'
        : 'PACKAGING_ANALYSIS_INSUFFICIENT';
    throw Object.assign(new Error(`${code}: ${validation.missingRequiredFields.join(', ')}`), {
      code,
      issues: validation.missingRequiredFields,
    });
  }
  return analysis;
}
