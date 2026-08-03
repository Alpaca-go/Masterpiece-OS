export const PACKAGING_PROMPT_CONTRACT_VERSION = '1.2.0';

export const PACKAGING_PROMPT_BLOCKS = Object.freeze([
  ['output_task', 'A. Single Output Task'],
  ['brand_product_identity', 'B. Brand and Product Identity'],
  ['category_commercial_use', 'C. Packaging Category and Commercial Use'],
  ['locked_structure', 'D. Locked Packaging Structure'],
  ['opening_arrangement', 'E. Opening and Internal Arrangement'],
  ['brand_translation', 'F. Brand-to-Packaging Translation'],
  ['graphic_information', 'G. Graphic and Information Hierarchy'],
  ['color_behavior', 'H. Color Behavior'],
  ['substrate_craft', 'I. Substrate and Craft'],
  ['logo_required_information', 'J. Logo and Required Information'],
  ['photography_view', 'K. Product Photography and View'],
  ['misread_risks', 'L. Packaging Misread Risks'],
  ['text_safety', 'M. Text Safety'],
  ['output_specification', 'N. Output Specification'],
]);

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

function block(id, title, items, sources) {
  return { id, title, items: list(items), sources: list(sources) };
}

export function compilePackagingPromptContract({
  projectContract,
  packagingTranslation,
  taskContract,
  logoUsageMode,
  templateSections = () => [],
  referenceDirectives = [],
}) {
  if (projectContract?.validation?.status !== 'ready') {
    throw Object.assign(new Error('PROJECT_GENERATION_CONTRACT_INSUFFICIENT'), {
      code: 'PROJECT_GENERATION_CONTRACT_INSUFFICIENT',
      issues: projectContract?.validation,
    });
  }
  if (packagingTranslation?.status !== 'ready') {
    const evidenceOnly = new Set(['structureEvidenceRefs', 'productRoleEvidenceRefs']);
    const contentIssues = (packagingTranslation?.missingRequiredFields || [])
      .filter((item) => !evidenceOnly.has(item));
    if (contentIssues.length) {
      const code = contentIssues.includes('structureStrategy')
        ? 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'
        : contentIssues.includes('productAndCategoryRole')
          ? 'PACKAGING_PRODUCT_ROLE_MISSING'
          : 'PACKAGING_TRANSLATION_INSUFFICIENT';
      throw Object.assign(new Error(`${code}: ${contentIssues.join(', ')}`), {
        code,
        issues: contentIssues,
      });
    }
  }
  const identity = projectContract.projectIdentity;
  const colors = packagingTranslation.colorBehavior;
  const blocks = [
    block('output_task', PACKAGING_PROMPT_BLOCKS[0][1], [
      taskContract.currentInstruction,
      referenceDirectives,
      'Generate exactly one finished packaging deliverable, never a collage, comparison board, or multi-panel proposal.',
    ], ['task_contract.currentInstruction', 'family.packaging']),
    block('brand_product_identity', PACKAGING_PROMPT_BLOCKS[1][1], [
      `Brand: ${identity.brandName}`,
      `Industry/category: ${identity.industry}`,
      `Brand role: ${identity.brandRole}`,
      packagingTranslation.productAndCategoryRole,
    ], ['project_generation_contract.projectIdentity', 'packaging_translation.productAndCategoryRole']),
    block('category_commercial_use', PACKAGING_PROMPT_BLOCKS[2][1], [
      templateSections('definition'),
      templateSections('professionalRequirements'),
    ], ['family.packaging', `subtype.packaging.${taskContract.subtype}`]),
    block('locked_structure', PACKAGING_PROMPT_BLOCKS[3][1],
      packagingTranslation.structureStrategy.map((item) =>
        `${item.locked ? 'Locked' : 'Exploratory'} structure: ${item.structure}; purpose: ${item.purpose}`),
      ['packaging_translation.structureStrategy']),
    block('opening_arrangement', PACKAGING_PROMPT_BLOCKS[4][1], [
      packagingTranslation.openingExperience.map((item) => `Opening: ${item}`),
      packagingTranslation.productArrangement.map((item) => `Arrangement: ${item}`),
    ], ['packaging_translation.openingExperience', 'packaging_translation.productArrangement']),
    block('brand_translation', PACKAGING_PROMPT_BLOCKS[5][1], [
      `Packaging concept: ${packagingTranslation.packagingConcept}`,
      packagingTranslation.graphicTranslation.flatMap((item) => [
        `${item.sourceMeaning} becomes ${item.packagingExpression.join('; ')}`,
        item.forbiddenLiteralUse.length
          ? `Do not translate it literally as ${item.forbiddenLiteralUse.join('; ')}`
          : '',
      ]),
      projectContract.mustTransform.map((item) =>
        `${item.sourceAsset}: preserve ${item.semanticMeaning.join('; ')} through approved packaging expressions.`),
      projectContract.projectSpecificDecisions?.generationGoals
        ?.map((item) => `Approved project-specific goal: ${item}`),
      projectContract.projectSpecificDecisions?.prohibitedExpressions
        ?.map((item) => `Approved project-specific prohibition: ${item}`),
    ], [
      'packaging_translation.graphicTranslation',
      'project_generation_contract.mustTransform',
      'project_generation_contract.projectSpecificDecisions',
    ]),
    block('graphic_information', PACKAGING_PROMPT_BLOCKS[6][1],
      packagingTranslation.informationHierarchy,
      ['packaging_translation.informationHierarchy']),
    block('color_behavior', PACKAGING_PROMPT_BLOCKS[7][1], [
      projectContract.projectSpecificDecisions?.colorSystem
        ?.map((item) => `Approved project color system: ${item}`),
      colors.base.map((item) => `Base color behavior: ${item}`),
      colors.identity.map((item) => `Identity color behavior: ${item}`),
      colors.accent.map((item) => `Accent color behavior: ${item}`),
      colors.forbidden.map((item) => `Forbidden color behavior: ${item}`),
    ], [
      'packaging_translation.colorBehavior',
      'project_generation_contract.projectSpecificDecisions.colorSystem',
    ]),
    block('substrate_craft', PACKAGING_PROMPT_BLOCKS[8][1], [
      projectContract.projectSpecificDecisions?.materialSystem
        ?.map((item) => `Approved project material system: ${item}`),
      packagingTranslation.substrateLanguage.map((item) => `Substrate: ${item}`),
      packagingTranslation.craftLanguage.flatMap((item) => [
        `Craft: ${item.craft}; purpose: ${item.purpose}`,
        item.forbiddenUse.length ? `Do not use ${item.craft} for ${item.forbiddenUse.join('; ')}` : '',
      ]),
    ], [
      'packaging_translation.substrateLanguage',
      'packaging_translation.craftLanguage',
      'project_generation_contract.projectSpecificDecisions.materialSystem',
    ]),
    block('logo_required_information', PACKAGING_PROMPT_BLOCKS[9][1], [
      packagingTranslation.logoPolicy,
      logoUsageMode === 'post_composite'
        ? 'Do not render any logo, brand name, letters, or slogan. Reserve one clean, front-facing, production-credible identity area for controlled post-compositing.'
        : 'Do not render any logo, letters, words, or slogan. Reserve one clean identity area.',
    ], ['packaging_translation.logoPolicy', 'task_contract.logoUsageMode']),
    block('photography_view', PACKAGING_PROMPT_BLOCKS[10][1], [
      packagingTranslation.photographyDirection,
      templateSections('composition'),
      templateSections('realism'),
    ], ['packaging_translation.photographyDirection', `shot.packaging.${taskContract.shot}`]),
    block('misread_risks', PACKAGING_PROMPT_BLOCKS[11][1], [
      packagingTranslation.packagingMisreadRisks.map((item) => `Avoid misread: ${item}`),
      projectContract.brandMisreadRisks
        .filter((risk) => risk.status === 'confirmed'
          && (!risk.appliesTo.deliverables?.length
            || risk.appliesTo.deliverables.includes('packaging')))
        .map((risk) => `Avoid project misread: ${risk.description}`),
      'Do not restyle an old package surface while leaving the underlying design problem unchanged.',
    ], ['packaging_translation.packagingMisreadRisks', 'project_generation_contract.brandMisreadRisks']),
    block('text_safety', PACKAGING_PROMPT_BLOCKS[12][1], [
      'Do not invent slogans, claims, ingredients, regulatory copy, or random characters.',
      'Only render supplied mandatory text when reliable; otherwise preserve deliberate text-safe areas.',
    ], ['family.packaging.textSafety']),
    block('output_specification', PACKAGING_PROMPT_BLOCKS[13][1], [
      `Aspect ratio: ${taskContract.aspectRatio}`,
      `Shot: ${taskContract.shot}`,
      'Show credible proportions, construction, opening logic, product placement, contact shadows, and manufacturable detail.',
      'Output one clear commercial packaging image.',
    ], ['task_contract.aspectRatio', 'task_contract.shot', 'family.packaging']),
  ];
  const missing = blocks.filter((item) => !item.items.length).map((item) => item.id);
  if (missing.length) {
    throw Object.assign(new Error(`PACKAGING_PROMPT_CONTRACT_INCOMPLETE: ${missing.join(', ')}`), {
      code: 'PACKAGING_PROMPT_CONTRACT_INCOMPLETE',
      issues: missing,
    });
  }
  return {
    schemaVersion: '1.0',
    version: PACKAGING_PROMPT_CONTRACT_VERSION,
    blocks,
    sourceMap: Object.fromEntries(blocks.map((item) => [item.id, item.sources])),
  };
}
