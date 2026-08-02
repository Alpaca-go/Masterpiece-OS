import type {
  AnalysisDeliverable,
  FieldRepairPolicy,
} from './contracts.ts';

const ALL_DELIVERABLES: AnalysisDeliverable[] = ['space', 'packaging', 'poster', 'vi'];

function policy(
  value: Omit<FieldRepairPolicy, 'appliesTo'> & { appliesTo?: AnalysisDeliverable[] },
): FieldRepairPolicy {
  return {
    ...value,
    appliesTo: value.appliesTo ?? ALL_DELIVERABLES,
  };
}

export const FIELD_REPAIR_POLICIES: readonly FieldRepairPolicy[] = Object.freeze([
  policy({
    path: 'schemaVersion',
    code: 'SCHEMA_VERSION_MISSING',
    severity: 'repairable',
    repairStrategy: 'deterministic',
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'projectId',
    code: 'PROJECT_ID_MISSING',
    severity: 'fatal',
    repairStrategy: 'none',
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'provenance.generatedAt',
    code: 'GENERATED_AT_MISSING',
    severity: 'repairable',
    repairStrategy: 'deterministic',
    requiredEvidencePaths: ['provenance.createdFrom'],
  }),
  policy({
    path: 'provenance.sourceFingerprint',
    code: 'SOURCE_FINGERPRINT_MISSING',
    severity: 'repairable',
    repairStrategy: 'deterministic',
    requiredEvidencePaths: ['provenance.createdFrom', 'projectFacts'],
  }),
  policy({
    path: 'projectFacts.brandName.value',
    code: 'BRAND_NAME_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    requiredEvidencePaths: ['projectFacts.brandName'],
  }),
  policy({
    path: 'projectFacts.industry.value',
    code: 'INDUSTRY_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    requiredEvidencePaths: ['projectFacts.industry'],
  }),
  policy({
    path: 'projectFacts.brandRole.value',
    code: 'BRAND_ROLE_FACT_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    requiredEvidencePaths: ['projectFacts.brandRole'],
  }),
  policy({
    path: 'diagnosis.valuableAssets',
    code: 'VALUABLE_ASSETS_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'assetInventory',
      'creativeDecision.preserveCore',
    ],
  }),
  policy({
    path: 'creativeDecision.brandRoleStatement',
    code: 'BRAND_ROLE_STATEMENT_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'projectFacts.brandRole',
      'diagnosis.valuableAssets',
      'creativeDecision.preserveCore',
    ],
  }),
  policy({
    path: 'creativeDecision.uniqueUpgradeThesis',
    code: 'UPGRADE_THESIS_INCOMPLETE',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'creativeDecision.upgradeFrom',
      'creativeDecision.upgradeTo',
      'diagnosis.brandMisreadRisks',
    ],
  }),
  policy({
    path: 'creativeDecision.toneBoundaries',
    code: 'TONE_BOUNDARIES_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'creativeDecision.uniqueUpgradeThesis',
      'creativeDecision.targetWorldview',
      'creativeDecision.strategicNegatives',
      'diagnosis.brandMisreadRisks',
    ],
  }),
  policy({
    path: 'diagnosis.brandMisreadRisks',
    code: 'BRAND_MISREAD_RISKS_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'diagnosis.overusedExpressions',
      'diagnosis.outdatedExpressions',
      'diagnosis.categoryCliches',
      'creativeDecision.strategicNegatives',
    ],
  }),
  policy({
    path: 'abstractions',
    code: 'VISUAL_ABSTRACTIONS_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    requiredEvidencePaths: [
      'assetInventory',
      'diagnosis.valuableAssets',
      'creativeDecision.preserveCore',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.spatialConcept',
    code: 'SPATIAL_TRANSLATION_INCOMPLETE',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'creativeDecision.uniqueUpgradeThesis',
      'abstractions',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.structureLanguage',
    code: 'SPATIAL_STRUCTURE_LANGUAGE_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'abstractions',
      'mediaTranslations.spatial.spatialConcept',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.materialLanguage',
    code: 'SPATIAL_MATERIAL_LANGUAGE_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'abstractions',
      'creativeDecision.preserveCore',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.lightingLanguage.source',
    code: 'SPATIAL_LIGHTING_LANGUAGE_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'abstractions',
      'mediaTranslations.spatial.materialLanguage',
    ],
  }),
  ...(['primary', 'secondary', 'accent'] as const).map((group) => policy({
    path: `mediaTranslations.spatial.colorBehavior.${group}`,
    code: `SPATIAL_${group.toUpperCase()}_COLOR_MISSING`,
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'assetInventory.colorAssets',
      'creativeDecision.preserveCore',
      'diagnosis.valuableAssets',
    ],
  })),
  policy({
    path: 'mediaTranslations.spatial.signatureSpatialMechanism',
    code: 'SIGNATURE_MECHANISM_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'abstractions',
      'mediaTranslations.spatial.structureLanguage',
      'creativeDecision.uniqueUpgradeThesis',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.positiveDifferentiators',
    code: 'POSITIVE_DIFFERENTIATORS_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'diagnosis.categoryCliches',
      'diagnosis.brandMisreadRisks',
      'creativeDecision.upgradeTo',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.brandRoleManifestation',
    code: 'BRAND_ROLE_MANIFESTATION_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'projectFacts.brandRole',
      'creativeDecision.brandRoleStatement',
      'creativeDecision.uniqueUpgradeThesis',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.functionalNetwork',
    code: 'FUNCTIONAL_NETWORK_INCOMPLETE',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'projectFacts.brandRole',
      'creativeDecision.uniqueUpgradeThesis',
      'mediaTranslations.spatial.sceneProgram',
      'mediaTranslations.spatial.functionalRelationships',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.sceneProgram',
    code: 'SCENE_PROGRAM_INCOMPLETE',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    requiredEvidencePaths: [
      'projectFacts.brandRole',
      'mediaTranslations.spatial.functionalNetwork',
      'mediaTranslations.spatial.mustBeVisible',
    ],
  }),
  policy({
    path: 'mediaTranslations.spatial.functionalRelationships',
    code: 'FUNCTIONAL_RELATIONSHIPS_INCOMPLETE',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['space'],
    // The two original `requiredEvidencePaths` only referenced sibling fields
    // (`functionalNetwork`, `sceneProgram`) that are themselves new creative
    // output and never carry `evidenceRefs`. That made the AI batch impossible
    // to satisfy (`REPAIR_EVIDENCE_UNAVAILABLE`), and the orchestrator marked
    // every `deliverable: 'space'` run as failed without ever calling the
    // model. The fix anchors on the upstream `projectFacts.brandRole` (which
    // always carries `evidenceRefs` whenever the run has reached this stage)
    // and keeps `sceneProgram` and the unique upgrade thesis as semantic
    // guidance that the model can cite even when those fields are empty.
    requiredEvidencePaths: [
      'projectFacts.brandRole',
      'creativeDecision.uniqueUpgradeThesis',
      'mediaTranslations.spatial.sceneProgram',
    ],
  }),
  policy({
    path: 'mediaTranslations.packaging.productAndCategoryRole',
    code: 'PACKAGING_PRODUCT_ROLE_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    appliesTo: ['packaging'],
    requiredEvidencePaths: [
      'projectFacts',
      'assetInventory.packagingStructures',
    ],
  }),
  policy({
    path: 'mediaTranslations.packaging.structureStrategy',
    code: 'PACKAGING_STRUCTURE_EVIDENCE_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    appliesTo: ['packaging'],
    requiredEvidencePaths: [
      'assetInventory.packagingStructures',
      'lockedAssets',
    ],
  }),
  policy({
    path: 'mediaTranslations.packaging.openingExperience',
    code: 'PACKAGING_OPENING_EXPERIENCE_MISSING',
    severity: 'repairable',
    repairStrategy: 'ai_from_evidence',
    appliesTo: ['packaging'],
    requiredEvidencePaths: [
      'mediaTranslations.packaging.structureStrategy',
      'mediaTranslations.packaging.productAndCategoryRole',
    ],
  }),
  policy({
    path: 'mediaTranslations.packaging.productArrangement',
    code: 'PACKAGING_PRODUCT_ARRANGEMENT_MISSING',
    severity: 'requires_confirmation',
    repairStrategy: 'ask_user',
    appliesTo: ['packaging'],
    requiredEvidencePaths: [
      'mediaTranslations.packaging.productAndCategoryRole',
      'mediaTranslations.packaging.structureStrategy',
    ],
  }),
  policy({
    path: 'execution.camera.focalLength',
    code: 'CAMERA_DEFAULT_APPLIED',
    severity: 'defaultable',
    repairStrategy: 'system_default',
    appliesTo: ['space'],
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'execution.outputLanguage',
    code: 'OUTPUT_LANGUAGE_DEFAULT_APPLIED',
    severity: 'defaultable',
    repairStrategy: 'system_default',
    requiredEvidencePaths: ['projectFacts'],
  }),
  policy({
    path: 'execution.aspectRatio',
    code: 'ASPECT_RATIO_DEFAULT_APPLIED',
    severity: 'defaultable',
    repairStrategy: 'system_default',
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'mediaTranslations.packaging',
    code: 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE',
    severity: 'optional',
    repairStrategy: 'ignore_for_current_task',
    appliesTo: ['packaging'],
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'mediaTranslations.poster',
    code: 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE',
    severity: 'optional',
    repairStrategy: 'ignore_for_current_task',
    appliesTo: ['poster'],
    requiredEvidencePaths: [],
  }),
  policy({
    path: 'mediaTranslations.vi',
    code: 'OPTIONAL_FIELD_SKIPPED_FOR_DELIVERABLE',
    severity: 'optional',
    repairStrategy: 'ignore_for_current_task',
    appliesTo: ['vi'],
    requiredEvidencePaths: [],
  }),
]);

export function repairPolicyForPath(path: string): FieldRepairPolicy | undefined {
  return FIELD_REPAIR_POLICIES.find((item) => item.path === path);
}
