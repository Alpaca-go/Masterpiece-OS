const CROSS_MEDIA_PATTERNS = [
  /接待台|空间动线|顾客区|入口向内|前中后景空间|天花|墙面|建筑广角|35\s*mm|人物咨询/iu,
  /\breception desk\b|\barchitectural circulation\b|\bceiling structure\b/iu,
];
const DOMAIN_STYLE_PATTERNS = [
  /(?:industry|行业).{0,30}(?:therefore|所以|必须|自动).{0,50}(?:颜色|材质|构图|气质|color|material|composition|style)/iu,
];

const PREFLIGHT_REMEDIATION = Object.freeze({
  PROJECT_GENERATION_CONTRACT_INSUFFICIENT: 'rerun_structured_analysis',
  PROJECT_SPECIFICITY_TOO_LOW: 'rerun_structured_analysis',
  GENERIC_INDUSTRY_FALLBACK: 'rerun_structured_analysis',
  UNIQUE_UPGRADE_THESIS_MISSING: 'rerun_structured_analysis',
  BRAND_ROLE_UNDEREXPRESSED: 'rerun_structured_analysis',
  POSITIVE_SPATIAL_MECHANISM_MISSING: 'rerun_structured_analysis',
  BRAND_ROLE_NOT_SPATIALLY_MANIFESTED: 'rerun_structured_analysis',
  FLAGSHIP_PROGRAM_TOO_GENERIC: 'rerun_structured_analysis',
  PACKAGING_STRUCTURE_EVIDENCE_MISSING: 'upload_or_confirm_source_data',
  PACKAGING_PRODUCT_ROLE_MISSING: 'upload_or_confirm_source_data',
  LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED: 'upload_or_confirm_source_data',
  PROMPT_CHARACTER_BUDGET_EXCEEDED: 'restore_or_shorten_edited_prompt',
  CROSS_MEDIA_LANGUAGE_LEAK: 'edit_current_task',
  LITERAL_LEGACY_ASSET_REUSE: 'edit_current_task',
  OTHER_PROJECT_SEMANTIC_LEAK: 'engineering_boundary_failure',
  GOLDEN_CONTENT_LEAK: 'engineering_boundary_failure',
  DOMAIN_STYLE_TEMPLATE_LEAK: 'engineering_boundary_failure',
});

function remediationFor(code) {
  return PREFLIGHT_REMEDIATION[code] || 'review_prompt_contract';
}

export const SPACE_PROMPT_PREFLIGHT_FIELD_REQUIREMENTS = Object.freeze([
  Object.freeze({ path: 'mediaTranslations.spatial.brandRoleManifestation', minimumItems: 1 }),
  Object.freeze({ path: 'mediaTranslations.spatial.signatureSpatialMechanism', minimumItems: 1 }),
  Object.freeze({ path: 'mediaTranslations.spatial.functionalNetwork', minimumItems: 3 }),
  Object.freeze({ path: 'mediaTranslations.spatial.positiveDifferentiators', minimumItems: 1 }),
  Object.freeze({ path: 'mediaTranslations.spatial.mustBeVisible', minimumItems: 1 }),
  Object.freeze({ path: 'mediaTranslations.spatial.functionalRelationships', minimumItems: 1 }),
  Object.freeze({ path: 'mediaTranslations.spatial.sceneProgram', minimumItems: 3 }),
]);

function minimumSpaceItems(field) {
  return SPACE_PROMPT_PREFLIGHT_FIELD_REQUIREMENTS
    .find((requirement) => requirement.path.endsWith(`.${field}`))?.minimumItems ?? 1;
}

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function runPromptPreflightGate({
  finalPrompt,
  taskContract,
  projectContract,
  packagingTranslation,
  spatialTranslation,
  otherProjectTerms = [],
  goldenFragments = [],
  requireProjectContract = true,
  maxPromptCharacters,
}) {
  const prompt = String(finalPrompt ?? '');
  const findings = [];
  const add = (code, severity, detail) => findings.push({
    code,
    severity,
    detail,
    remediation: remediationFor(code),
  });
  if (!prompt.trim()) add('PROMPT_EMPTY', 'block', 'Final prompt is empty.');
  const promptCharacters = [...prompt].length;
  if (Number.isFinite(maxPromptCharacters)
    && maxPromptCharacters > 0
    && promptCharacters > maxPromptCharacters) {
    add(
      'PROMPT_CHARACTER_BUDGET_EXCEEDED',
      'block',
      `Final prompt contains ${promptCharacters} characters; the active adapter allows ${maxPromptCharacters}.`,
    );
  }
  if (requireProjectContract && (!projectContract || projectContract.validation?.status !== 'ready')) {
    add('PROJECT_GENERATION_CONTRACT_INSUFFICIENT', 'block', 'Project contract is not ready.');
  }
  if (requireProjectContract
    && projectContract?.projectSpecificDecisions?.specificity?.status !== 'ready') {
    add(
      'PROJECT_SPECIFICITY_TOO_LOW',
      'block',
      'No sufficiently specific approved creative decision reached the project contract.',
    );
  }
  const thesis = projectContract?.upgradeThesis;
  if (requireProjectContract && (
    !String(thesis?.statement ?? '').trim()
    || !list(thesis?.from).length
    || !list(thesis?.to).length
  )) {
    add(
      'UNIQUE_UPGRADE_THESIS_MISSING',
      'block',
      'A project-specific upgrade statement with explicit from/to decisions is required.',
    );
  }
  if (requireProjectContract
    && projectContract?.projectIdentity?.industry
    && projectContract?.projectSpecificDecisions?.specificity?.status !== 'ready') {
    add(
      'GENERIC_INDUSTRY_FALLBACK',
      'block',
      'Industry identity is present without an evidence-backed project-specific decision.',
    );
  }
  if (projectContract?.mustTransform?.some((item) =>
    list(item.forbiddenLiteralUse).some((forbidden) =>
      list(item.targetExpression).some((target) =>
        target === forbidden || (forbidden.length >= 4 && target.includes(forbidden)))))) {
    add(
      'LITERAL_LEGACY_ASSET_REUSE',
      'block',
      'A target expression reuses a forbidden literal legacy asset expression.',
    );
  }
  const positivePrompt = prompt
    .split(/\r?\n/u)
    .filter((line) => !/prohibition|negative|不得|禁止|避免|不要|不做|不形成|而非|do not|no large-scale/iu.test(line))
    .join('\n');
  for (const forbidden of list(projectContract?.mustTransform
    ?.flatMap((item) => item?.forbiddenLiteralUse))) {
    if (forbidden.length >= 2 && positivePrompt.includes(forbidden)) {
      add(
        'LITERAL_LEGACY_ASSET_REUSE',
        'block',
        `Positive generation instruction reuses forbidden literal legacy expression: ${forbidden}`,
      );
    }
  }
  if (requireProjectContract && taskContract?.deliverableFamily === 'space') {
    const brandRole = String(projectContract?.projectIdentity?.brandRole ?? '').trim();
    const relationships = list(spatialTranslation?.functionalRelationships);
    const scenes = list(spatialTranslation?.sceneProgram);
    const roleManifestation = list(spatialTranslation?.brandRoleManifestation);
    const signatureMechanism = list(spatialTranslation?.signatureSpatialMechanism);
    const functionalNetwork = list(spatialTranslation?.functionalNetwork);
    const differentiators = list(spatialTranslation?.positiveDifferentiators);
    const mustBeVisible = list(spatialTranslation?.mustBeVisible);
    if (!brandRole
      || !prompt.includes(brandRole)
      || relationships.length < minimumSpaceItems('functionalRelationships')
      || scenes.length < 1) {
      add(
        'BRAND_ROLE_UNDEREXPRESSED',
        'block',
        'The spatial prompt must express the confirmed brand role through multiple functional relationships and scene programs.',
      );
    }
    if (requireProjectContract && (
      list(projectContract?.projectSpecificDecisions?.generationGoals).length < 2
      || !Array.isArray(projectContract?.mustTransform)
      || projectContract.mustTransform.length < 1
      || relationships.length < minimumSpaceItems('functionalRelationships')
    )) {
      add(
        'PROJECT_SPECIFICITY_TOO_LOW',
        'block',
        'Project decisions do not yet contain enough transformation, generation-goal, and spatial-relationship evidence.',
      );
      add(
        'GENERIC_INDUSTRY_FALLBACK',
        'block',
        'The remaining instructions could be satisfied by a generic industry scene.',
      );
    }
    if (signatureMechanism.length < minimumSpaceItems('signatureSpatialMechanism')
      || differentiators.length < minimumSpaceItems('positiveDifferentiators')
      || mustBeVisible.length < minimumSpaceItems('mustBeVisible')) {
      add(
        'POSITIVE_SPATIAL_MECHANISM_MISSING',
        'block',
        'Formal space generation requires a drawable signature mechanism, positive differentiators, and visible evidence.',
      );
    }
    if (roleManifestation.length < minimumSpaceItems('brandRoleManifestation')
      || !roleManifestation.some((item) => prompt.includes(item))
      || functionalNetwork.length < minimumSpaceItems('functionalNetwork')) {
      add(
        'BRAND_ROLE_NOT_SPATIALLY_MANIFESTED',
        'block',
        'The confirmed brand role is not manifested through visible spatial relationships.',
      );
    }
    if (scenes.length < minimumSpaceItems('sceneProgram')
      || functionalNetwork.length < minimumSpaceItems('functionalNetwork')) {
      add(
        'FLAGSHIP_PROGRAM_TOO_GENERIC',
        'block',
        'The scene program and functional network do not establish a sufficiently specific multi-node flagship experience.',
      );
    }
    const positiveItems = list([
      ...(roleManifestation || []),
      ...(signatureMechanism || []),
      ...(functionalNetwork || []),
      ...(scenes || []),
      ...(differentiators || []),
      ...(mustBeVisible || []),
    ]);
    const negativeItems = list([
      ...(projectContract?.toneBoundaries?.flatMap((item) => item?.avoid) || []),
      ...(projectContract?.brandMisreadRisks?.map((item) => item?.description) || []),
      ...(projectContract?.mustTransform?.flatMap((item) => item?.forbiddenLiteralUse) || []),
      ...(taskContract?.mustAvoid || []),
    ]);
    const positiveCharacters = positiveItems.join('').length;
    const negativeCharacters = negativeItems.join('').length;
    const positiveStart = prompt.indexOf('Positive Spatial Mechanism');
    const firstNegative = prompt.search(
      /Tone Boundaries|Logo, Text and Strict Negatives|User prohibition:|Strict (?:non-literal )?prohibition:|Strict negative:/iu,
    );
    if (!positiveCharacters
      || negativeCharacters > positiveCharacters * 1.5
      || positiveStart < 0
      || (firstNegative >= 0 && positiveStart > firstNegative)) {
      add(
        'NEGATIVE_RULES_OUTWEIGH_POSITIVE_MECHANISM',
        'block',
        'Positive spatial propositions must precede and outweigh negative constraints.',
      );
    }
  }
  const hasLockedLogo = projectContract?.mustPreserve?.some((item) =>
    /logo|标志|标识/iu.test(String(item?.value ?? '')));
  if (hasLockedLogo && taskContract?.logoUsageMode !== 'post_composite') {
    add(
      'LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED',
      'block',
      'Confirmed Logo assets must be excluded from model references and routed to post-composite.',
    );
  }
  if (taskContract?.deliverableFamily === 'packaging') {
    if (!packagingTranslation?.structureStrategy?.some((item) => list(item?.evidenceRefs).length)) {
      add('PACKAGING_STRUCTURE_EVIDENCE_MISSING', 'block', 'Packaging structure evidence is missing.');
    }
    if (!list(packagingTranslation?.productRoleEvidenceRefs).length) {
      add(
        'PACKAGING_PRODUCT_ROLE_MISSING',
        'block',
        'Packaging product/category role has no confirmed evidence.',
      );
    }
    const productTerms = list(packagingTranslation?.productAndCategoryRole);
    const unsupportedProductInstruction = /瓶|罐|管|安瓶|精华|面膜|注射|器械|bottle|jar|tube|ampoule|serum/iu
      .test(String(taskContract?.currentInstruction ?? ''));
    if (!list(packagingTranslation?.productRoleEvidenceRefs).length
      && (productTerms.length || unsupportedProductInstruction)) {
      add(
        'UNSUPPORTED_PRODUCT_INVENTION',
        'block',
        'The prompt could cause an unconfirmed product or container to be invented.',
      );
    }
    for (const pattern of CROSS_MEDIA_PATTERNS) {
      const match = pattern.exec(prompt);
      if (match) add('CROSS_MEDIA_LANGUAGE_LEAK', 'block', match[0]);
    }
  }
  for (const term of list(otherProjectTerms)) {
    if (term && prompt.includes(term)) add('OTHER_PROJECT_SEMANTIC_LEAK', 'block', term);
  }
  for (const fragment of list(goldenFragments)) {
    if (fragment.length >= 12 && prompt.includes(fragment)) add('GOLDEN_CONTENT_LEAK', 'block', fragment.slice(0, 80));
  }
  for (const pattern of DOMAIN_STYLE_PATTERNS) {
    const match = pattern.exec(prompt);
    if (match) add('DOMAIN_STYLE_TEMPLATE_LEAK', 'block', match[0]);
  }
  const lockedValues = list(projectContract?.mustPreserve?.map((item) => item.value));
  for (const value of lockedValues) {
    if (taskContract?.logoUsageMode === 'post_composite'
      && /logo|标志|标准字|品牌.*名称|中英文名称|brand.*name|slogan|输出语言|output language/iu.test(value)) {
      continue;
    }
    if (value.length > 1 && !prompt.includes(value)) add('LOCKED_ASSET_OMITTED', 'warn', value);
  }
  return {
    schemaVersion: '1.0',
    status: findings.some((item) => item.severity === 'block') ? 'blocked' : 'pass',
    findings,
    promptCharacters,
    maxPromptCharacters: Number.isFinite(maxPromptCharacters) ? maxPromptCharacters : null,
    checkedAt: new Date().toISOString(),
  };
}

export function assertPromptPreflight(report) {
  if (report?.status === 'blocked') {
    throw Object.assign(new Error(
      `PROMPT_PREFLIGHT_BLOCKED: ${report.findings.map((item) => item.code).join(', ')}`,
    ), {
      code: report.findings[0]?.code || 'PROMPT_PREFLIGHT_BLOCKED',
      findings: report.findings,
    });
  }
  return report;
}
