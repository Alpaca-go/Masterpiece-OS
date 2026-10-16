function record(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/gu, " ") : "";
}
function strings(value, limit = 40) {
  const result = [];
  const visit = (candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    const normalized = text(candidate);
    if (normalized && !result.includes(normalized) && result.length < limit) result.push(normalized);
  };
  visit(value);
  return result;
}
function normalizePackagingTranslationV2(value) {
  const candidate = record(value);
  const structureStrategy = (Array.isArray(candidate.structureStrategy) ? candidate.structureStrategy : []).flatMap((item) => {
    const entry = record(item);
    const structure = text(entry.structure);
    if (!structure) return [];
    return [{
      structure,
      purpose: text(entry.purpose),
      locked: Boolean(entry.locked),
      evidenceRefs: strings(entry.evidenceRefs)
    }];
  });
  const graphicTranslation = (Array.isArray(candidate.graphicTranslation) ? candidate.graphicTranslation : []).flatMap((item) => {
    const entry = record(item);
    const sourceMeaning = text(entry.sourceMeaning);
    const packagingExpression = strings(entry.packagingExpression);
    return sourceMeaning && packagingExpression.length ? [{
      sourceMeaning,
      packagingExpression,
      forbiddenLiteralUse: strings(entry.forbiddenLiteralUse)
    }] : [];
  });
  const craftLanguage = (Array.isArray(candidate.craftLanguage) ? candidate.craftLanguage : []).flatMap((item) => {
    const entry = record(item);
    const craft = text(entry.craft);
    return craft ? [{
      craft,
      purpose: text(entry.purpose),
      forbiddenUse: strings(entry.forbiddenUse)
    }] : [];
  });
  const color = record(candidate.colorBehavior);
  const missingRequiredFields = strings(candidate.missingRequiredFields);
  if (!text(candidate.packagingConcept)) missingRequiredFields.push("packagingConcept");
  if (!strings(candidate.productAndCategoryRole).length) missingRequiredFields.push("productAndCategoryRole");
  if (!structureStrategy.length) missingRequiredFields.push("structureStrategy");
  if (!strings(candidate.openingExperience).length) missingRequiredFields.push("openingExperience");
  if (!strings(candidate.productArrangement).length) missingRequiredFields.push("productArrangement");
  if (!strings(candidate.informationHierarchy).length) missingRequiredFields.push("informationHierarchy");
  if (!strings(candidate.substrateLanguage).length) missingRequiredFields.push("substrateLanguage");
  if (!craftLanguage.length) missingRequiredFields.push("craftLanguage");
  if (!strings(candidate.photographyDirection).length) missingRequiredFields.push("photographyDirection");
  const uniqueMissing = [...new Set(missingRequiredFields)];
  return {
    status: uniqueMissing.length ? "insufficient" : "ready",
    packagingConcept: text(candidate.packagingConcept),
    productAndCategoryRole: strings(candidate.productAndCategoryRole),
    structureStrategy,
    openingExperience: strings(candidate.openingExperience),
    productArrangement: strings(candidate.productArrangement),
    graphicTranslation,
    informationHierarchy: strings(candidate.informationHierarchy),
    substrateLanguage: strings(candidate.substrateLanguage),
    craftLanguage,
    colorBehavior: {
      base: strings(color.base),
      identity: strings(color.identity),
      accent: strings(color.accent),
      forbidden: strings(color.forbidden)
    },
    logoPolicy: strings(candidate.logoPolicy),
    seriesArchitecture: strings(candidate.seriesArchitecture),
    photographyDirection: strings(candidate.photographyDirection),
    packagingMisreadRisks: strings(candidate.packagingMisreadRisks),
    missingRequiredFields: uniqueMissing
  };
}
function validatePackagingTranslationV2(value) {
  const normalized = normalizePackagingTranslationV2(value);
  const errors = normalized.status === "ready" ? [] : normalized.missingRequiredFields.map((field) => `${field} is required`);
  return { valid: errors.length === 0, errors, value: normalized };
}
export {
  normalizePackagingTranslationV2,
  validatePackagingTranslationV2
};
