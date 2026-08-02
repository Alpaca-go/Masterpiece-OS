import type {
  AnalysisDeliverable,
  DeliverableExecutionContext,
  DeliverableSufficiencyResult,
  SchemaValidationIssue,
} from './contracts.ts';
import { classifyMissingFields } from './missing-field-classifier.ts';
import {
  isRecord,
  nonEmptyArray,
  nonEmptyText,
  valueAtPath,
} from './path-utils.ts';
import { validateAnalysisPacketSchema } from './schema-validator.ts';

interface RequiredFieldRule {
  path: string;
  code: string;
  kind?: 'text' | 'array' | 'object';
  minimumItems?: number;
}

const SHARED_RULES: RequiredFieldRule[] = [
  {
    path: 'diagnosis.valuableAssets',
    code: 'VALUABLE_ASSETS_MISSING',
    kind: 'array',
    minimumItems: 1,
  },
  { path: 'creativeDecision.brandRoleStatement', code: 'BRAND_ROLE_STATEMENT_MISSING' },
  { path: 'creativeDecision.uniqueUpgradeThesis', code: 'UPGRADE_THESIS_INCOMPLETE' },
  {
    path: 'creativeDecision.toneBoundaries',
    code: 'TONE_BOUNDARIES_MISSING',
    kind: 'array',
    minimumItems: 2,
  },
  {
    path: 'diagnosis.brandMisreadRisks',
    code: 'BRAND_MISREAD_RISKS_MISSING',
    kind: 'array',
    minimumItems: 1,
  },
];

const DELIVERABLE_RULES: Record<AnalysisDeliverable, RequiredFieldRule[]> = {
  space: [
    { path: 'abstractions', code: 'VISUAL_ABSTRACTIONS_MISSING', kind: 'array', minimumItems: 1 },
    { path: 'mediaTranslations.spatial.spatialConcept', code: 'SPATIAL_TRANSLATION_INCOMPLETE' },
    {
      path: 'mediaTranslations.spatial.structureLanguage',
      code: 'SPATIAL_STRUCTURE_LANGUAGE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.materialLanguage',
      code: 'SPATIAL_MATERIAL_LANGUAGE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.lightingLanguage.source',
      code: 'SPATIAL_LIGHTING_LANGUAGE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.colorBehavior.primary',
      code: 'SPATIAL_PRIMARY_COLOR_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.colorBehavior.secondary',
      code: 'SPATIAL_SECONDARY_COLOR_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.colorBehavior.accent',
      code: 'SPATIAL_ACCENT_COLOR_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.signatureSpatialMechanism',
      code: 'SIGNATURE_MECHANISM_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.brandRoleManifestation',
      code: 'BRAND_ROLE_MANIFESTATION_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.functionalNetwork',
      code: 'FUNCTIONAL_NETWORK_INCOMPLETE',
      kind: 'array',
      minimumItems: 3,
    },
    {
      path: 'mediaTranslations.spatial.positiveDifferentiators',
      code: 'POSITIVE_DIFFERENTIATORS_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.spatial.sceneProgram',
      code: 'SCENE_PROGRAM_INCOMPLETE',
      kind: 'array',
      minimumItems: 3,
    },
    {
      path: 'mediaTranslations.spatial.functionalRelationships',
      code: 'FUNCTIONAL_RELATIONSHIPS_INCOMPLETE',
      kind: 'array',
      minimumItems: 1,
    },
  ],
  packaging: [
    {
      path: 'mediaTranslations.packaging.productAndCategoryRole',
      code: 'PACKAGING_PRODUCT_ROLE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.packaging.structureStrategy',
      code: 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.packaging.openingExperience',
      code: 'PACKAGING_OPENING_EXPERIENCE_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
    {
      path: 'mediaTranslations.packaging.productArrangement',
      code: 'PACKAGING_PRODUCT_ARRANGEMENT_MISSING',
      kind: 'array',
      minimumItems: 1,
    },
  ],
  poster: [],
  vi: [],
};

function satisfies(value: unknown, rule: RequiredFieldRule): boolean {
  if (rule.kind === 'array') {
    return Array.isArray(value) && value.length >= (rule.minimumItems ?? 1);
  }
  if (rule.kind === 'object') return isRecord(value);
  return nonEmptyText(value);
}

function issueForRule(rule: RequiredFieldRule): SchemaValidationIssue {
  return {
    path: rule.path,
    code: rule.code,
    kind: 'missing',
    message: `${rule.path} is required for the current deliverable.`,
  };
}

function executionIssues(
  deliverable: AnalysisDeliverable,
  execution: DeliverableExecutionContext,
): SchemaValidationIssue[] {
  const issues: SchemaValidationIssue[] = [];
  if (deliverable === 'space' && !nonEmptyText(execution.camera?.focalLength)) {
    issues.push(issueForRule({
      path: 'execution.camera.focalLength',
      code: 'CAMERA_DEFAULT_APPLIED',
    }));
  }
  if (!nonEmptyText(execution.outputLanguage)) {
    issues.push(issueForRule({
      path: 'execution.outputLanguage',
      code: 'OUTPUT_LANGUAGE_DEFAULT_APPLIED',
    }));
  }
  if (!nonEmptyText(execution.aspectRatio)) {
    issues.push(issueForRule({
      path: 'execution.aspectRatio',
      code: 'ASPECT_RATIO_DEFAULT_APPLIED',
    }));
  }
  return issues;
}

export function evaluateDeliverableSufficiency(input: {
  packet: unknown;
  deliverable: AnalysisDeliverable;
  execution?: DeliverableExecutionContext;
}): DeliverableSufficiencyResult {
  const schemaIssues = validateAnalysisPacketSchema(input.packet);
  const rules = [...SHARED_RULES, ...DELIVERABLE_RULES[input.deliverable]];
  const scopedIssues = rules
    .filter((rule) => !satisfies(valueAtPath(input.packet, rule.path), rule))
    .map(issueForRule);
  const deduplicated = [...scopedIssues, ...schemaIssues, ...executionIssues(
    input.deliverable,
    input.execution ?? {},
  )].filter((candidate, index, all) => (
    all.findIndex((item) => item.path === candidate.path) === index
  ));
  const issues = classifyMissingFields({
    packet: input.packet,
    deliverable: input.deliverable,
    issues: deduplicated,
  });

  let status: DeliverableSufficiencyResult['status'] = 'ready';
  if (issues.some((item) => item.severity === 'fatal')) status = 'failed';
  else if (issues.some((item) => item.severity === 'requires_confirmation')) {
    status = 'requires_confirmation';
  } else if (issues.some((item) => (
    item.severity === 'repairable' || item.severity === 'defaultable'
  ))) {
    status = 'repairable';
  } else if (issues.length) status = 'ready_with_warnings';

  return {
    deliverable: input.deliverable,
    status,
    issues,
  };
}
