const SPATIAL_LANGUAGE = [
  /接待台|前景|中景|后景|入口视角|空间动线|顾客区|等候区|天花|墙面|地面|建筑广角|35\s*mm|人物咨询/iu,
  /\breception desk\b|\bcirculation\b|\bceiling\b|\bwall\b|\barchitectural wide\b/iu,
];

function list(...values) {
  const result = [];
  const visit = (value) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    if (clean && !result.includes(clean)) result.push(clean);
  };
  values.forEach(visit);
  return result;
}

function spatialLeaks(value) {
  return SPATIAL_LANGUAGE.some((pattern) => pattern.test(String(value ?? '')));
}

export function validatePackagingTranslation(translation) {
  const missing = [];
  if (!translation?.packagingConcept) missing.push('packagingConcept');
  if (!list(translation?.productAndCategoryRole).length) missing.push('productAndCategoryRole');
  if (!Array.isArray(translation?.structureStrategy) || !translation.structureStrategy.length) {
    missing.push('structureStrategy');
  }
  if (!list(translation?.openingExperience).length) missing.push('openingExperience');
  if (!list(translation?.productArrangement).length) missing.push('productArrangement');
  if (!list(translation?.informationHierarchy).length) missing.push('informationHierarchy');
  if (!list(translation?.substrateLanguage).length) missing.push('substrateLanguage');
  if (!Array.isArray(translation?.craftLanguage) || !translation.craftLanguage.length) {
    missing.push('craftLanguage');
  }
  if (!list(
    translation?.colorBehavior?.base,
    translation?.colorBehavior?.identity,
    translation?.colorBehavior?.accent,
  ).length) missing.push('colorBehavior');
  if (!list(translation?.photographyDirection).length) missing.push('photographyDirection');
  const allText = JSON.stringify(translation || {});
  if (spatialLeaks(allText)) missing.push('crossMediaLanguage');
  return {
    status: missing.length ? 'insufficient' : 'ready',
    missingRequiredFields: [...new Set(missing)],
  };
}

export function buildPackagingTranslation(input = {}) {
  const source = input.packagingTranslation
    || input.visualDecisionPacket?.mediaTranslations?.packaging
    || {};
  const lockedStructures = list(
    input.lockedPackagingStructure,
    input.visualDecisionPacket?.lockedAssets
      ?.filter((asset) => asset?.type === 'packaging_structure')
      .map((asset) => asset.value),
  );
  const structureStrategy = (Array.isArray(source.structureStrategy) ? source.structureStrategy : [])
    .flatMap((item) => {
      const structure = String(item?.structure ?? '').trim();
      if (!structure || spatialLeaks(structure)) return [];
      return [{
        structure,
        purpose: String(item?.purpose ?? '').trim(),
        locked: Boolean(item?.locked || lockedStructures.includes(structure)),
        evidenceRefs: list(item?.evidenceRefs),
      }];
    });
  for (const structure of lockedStructures) {
    if (!structureStrategy.some((item) => item.structure === structure)) {
      structureStrategy.push({
        structure,
        purpose: 'Preserve the confirmed packaging construction and physical proportions.',
        locked: true,
        evidenceRefs: list(
          input.visualDecisionPacket?.lockedAssets
            ?.find((asset) => asset?.type === 'packaging_structure' && asset.value === structure)
            ?.evidenceRefs,
        ),
      });
    }
  }

  const graphicTranslation = (Array.isArray(source.graphicTranslation)
    ? source.graphicTranslation : []).flatMap((item) => {
    const expression = list(item?.packagingExpression).filter((value) => !spatialLeaks(value));
    const sourceMeaning = String(item?.sourceMeaning ?? '').trim();
    return sourceMeaning && expression.length ? [{
      sourceMeaning,
      packagingExpression: expression,
      forbiddenLiteralUse: list(item?.forbiddenLiteralUse),
    }] : [];
  });
  const craftLanguage = (Array.isArray(source.craftLanguage) ? source.craftLanguage : [])
    .flatMap((item) => {
      const craft = String(item?.craft ?? '').trim();
      return craft && !spatialLeaks(craft) ? [{
        craft,
        purpose: String(item?.purpose ?? '').trim(),
        forbiddenUse: list(item?.forbiddenUse),
      }] : [];
    });
  const clean = (value) => list(value).filter((item) => !spatialLeaks(item));
  const translation = {
    status: 'insufficient',
    packagingConcept: spatialLeaks(source.packagingConcept)
      ? '' : String(source.packagingConcept ?? '').trim(),
    productAndCategoryRole: clean(source.productAndCategoryRole),
    structureStrategy,
    openingExperience: clean(source.openingExperience),
    productArrangement: clean(source.productArrangement),
    graphicTranslation,
    informationHierarchy: clean(source.informationHierarchy),
    substrateLanguage: clean(source.substrateLanguage),
    craftLanguage,
    colorBehavior: {
      base: clean(source.colorBehavior?.base),
      identity: clean(source.colorBehavior?.identity),
      accent: clean(source.colorBehavior?.accent),
      forbidden: clean(source.colorBehavior?.forbidden),
    },
    logoPolicy: clean(source.logoPolicy),
    seriesArchitecture: clean(source.seriesArchitecture),
    photographyDirection: clean(source.photographyDirection),
    packagingMisreadRisks: clean(source.packagingMisreadRisks),
    missingRequiredFields: [],
  };
  const validation = validatePackagingTranslation(translation);
  translation.status = validation.status;
  translation.missingRequiredFields = validation.missingRequiredFields;
  return translation;
}

export function assertPackagingTranslation(translation) {
  const validation = validatePackagingTranslation(translation);
  if (validation.status !== 'ready') {
    const structureMissing = validation.missingRequiredFields.includes('structureStrategy');
    const code = structureMissing
      ? 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'
      : 'PACKAGING_TRANSLATION_INSUFFICIENT';
    throw Object.assign(new Error(`${code}: ${validation.missingRequiredFields.join(', ')}`), {
      code,
      issues: validation.missingRequiredFields,
    });
  }
  return translation;
}
