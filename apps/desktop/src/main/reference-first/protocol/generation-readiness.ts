import type {
  AnchorContradictionValidation,
  AudienceFact,
  CrossArtifactConsistencyValidation,
  GenerationContextManifest,
  GenerationIdentityPack,
  GenerationReadinessGate,
  GenerationTaskDefinition,
  IdentityPackGranularityValidation,
  ProjectGraphicAnchor,
  ReferenceSignatureGraphic,
  SignatureGraphicLeakValidation,
  StyleCarrier,
  TaskReferenceSubset,
  TaskScopedStyleCarrierSet
} from '../../../shared/types.ts';
import { validateAuthenticityDecisions } from './asset-authenticity.ts';
import { validateGraphicReconstruction } from './graphic-reconstruction.ts';
import { validateStyleCarriers } from './style-carrier-ranking.ts';
import type { AssetAuthenticityDecision } from '../../../shared/types.ts';

export function evaluateGenerationReadiness(input: {
  identityPack: GenerationIdentityPack;
  authenticityDecisions: AssetAuthenticityDecision[];
  styleCarriers: StyleCarrier[];
  taskReference: TaskReferenceSubset | undefined;
  anchor: ProjectGraphicAnchor | undefined;
  signatureGraphics: ReferenceSignatureGraphic[];
  generationBrief: string;
  targetAudience?: AudienceFact[] | string[];
  taskScopedStyleCarriers?: TaskScopedStyleCarrierSet[];
  generationTaskDefinition?: GenerationTaskDefinition;
  generationContextManifest?: GenerationContextManifest;
  anchorContradiction?: AnchorContradictionValidation;
  crossArtifact?: CrossArtifactConsistencyValidation;
  signatureGraphicLeak?: SignatureGraphicLeakValidation;
  identityPackGranularity?: IdentityPackGranularityValidation;
  requestedTaskSubsetReady?: boolean;
}): GenerationReadinessGate {
  const authenticityErrors = validateAuthenticityDecisions(input.authenticityDecisions);
  const styleErrors = validateStyleCarriers(input.styleCarriers);
  const graphicErrors = validateGraphicReconstruction(input.anchor, input.signatureGraphics);
  const identityPackReady = input.identityPack.assets.length > 0;
  const identityPackGranularityReady = input.identityPackGranularity
    ? input.identityPackGranularity.passed
    : input.identityPack.assets.every((item) => item.usage !== 'user_locked_asset' || !item.containsLegacyStyle);
  const structurePolicyResolved = Boolean(input.identityPack.structurePolicy.status);
  const signatureGraphicLeakPassed = input.signatureGraphicLeak
    ? input.signatureGraphicLeak.passed
    : true;
  const referenceSignatureGraphicsIsolated = graphicErrors.length === 0 && signatureGraphicLeakPassed;
  const anchorSingleSourceReady = input.anchorContradiction
    ? input.anchorContradiction.passed
    : true;
  const requestedTaskSubsetReady = input.requestedTaskSubsetReady
    ?? Boolean(
      input.taskReference
      && input.taskReference.matchLevel !== 'insufficient'
      && input.taskReference.selectedAssetIds.length
    );
  const taskScopedStyleCarriersReady = (input.taskScopedStyleCarriers || [])
    .every((set) => set.requiredPrimary.length >= 3 && set.requiredPrimary.length <= 6);
  const generationTaskDefinitionReady = input.generationTaskDefinition
    ? Boolean(
      input.generationTaskDefinition.outputType
      && input.generationTaskDefinition.primarySubjectTypes.length > 0
    )
    : true;
  const auditBriefConsistencyReady = input.crossArtifact ? input.crossArtifact.passed : true;
  const styleCarriersReady = input.styleCarriers.some((item) =>
    item.priority === 'primary' && Boolean(item.readableRule || item.description)
  ) && styleErrors.length === 0;
  const taskReferenceReady = Boolean(
    input.taskReference
    && input.taskReference.matchLevel !== 'insufficient'
    && input.taskReference.selectedAssetIds.length
  );
  const anchorDefinitionReady = Boolean(input.anchor?.sourceElements.length);
  const noSignatureGraphicLeak = referenceSignatureGraphicsIsolated;
  const noUnverifiedAssetLeak = authenticityErrors.length === 0;
  const generationBriefReady = Boolean(
    input.generationBrief.trim()
    && input.taskReference
    && input.generationBrief.includes(input.taskReference.outputType)
  );
  const blockingReasons: string[] = [];
  if (!identityPackReady) blockingReasons.push('GENERATION_IDENTITY_PACK_EMPTY');
  if (!identityPackGranularityReady) blockingReasons.push('GENERATION_IDENTITY_PACK_GRANULARITY_INVALID');
  if (!structurePolicyResolved) blockingReasons.push('STRUCTURE_STATUS_UNRESOLVED');
  if (!referenceSignatureGraphicsIsolated) {
    blockingReasons.push(...graphicErrors);
    if (!signatureGraphicLeakPassed) blockingReasons.push('REFERENCE_SIGNATURE_GRAPHIC_IN_STYLE_CARRIERS');
  }
  if (!anchorSingleSourceReady) blockingReasons.push('ANCHOR_SINGLE_SOURCE_VIOLATION');
  if (!requestedTaskSubsetReady) blockingReasons.push('REQUESTED_TASK_SUBSET_MISSING');
  if (!taskScopedStyleCarriersReady) blockingReasons.push('TASK_STYLE_CARRIER_INCOMPATIBLE');
  if (!generationTaskDefinitionReady) blockingReasons.push('GENERATION_TASK_DEFINITION_INCOMPLETE');
  if (!auditBriefConsistencyReady) blockingReasons.push('AUDIT_BRIEF_TASK_MISMATCH');
  if (!styleCarriersReady) blockingReasons.push(...styleErrors);
  if (!taskReferenceReady) blockingReasons.push('TASK_REFERENCE_MATCH_CONTRADICTION');
  if (!noUnverifiedAssetLeak) blockingReasons.push(...authenticityErrors);
  if (!generationBriefReady) blockingReasons.push('GENERATION_BRIEF_MISSING_TASK_DETAILS');
  const needsReview = input.identityPack.structurePolicy.requiresHumanConfirmation
    || input.taskReference?.requiresHumanReview
    || input.authenticityDecisions.some((item) => item.requiresHumanReview);
  const optionalAudienceContextAvailable = Boolean(input.targetAudience?.length);
  const warnings = optionalAudienceContextAvailable
    ? []
    : ['TARGET_AUDIENCE_UNAVAILABLE_NON_BLOCKING'];
  return {
    identityPackReady,
    identityPackGranularityReady,
    structurePolicyResolved,
    referenceSignatureGraphicsIsolated,
    anchorSingleSourceReady,
    requestedTaskSubsetReady,
    taskScopedStyleCarriersReady,
    generationTaskDefinitionReady,
    auditBriefConsistencyReady,
    styleCarriersReady,
    taskReferenceReady,
    anchorDefinitionReady,
    noSignatureGraphicLeak,
    noUnverifiedAssetLeak,
    generationBriefReady,
    optionalAudienceContextAvailable,
    warnings,
    status: blockingReasons.length ? 'blocked' : needsReview ? 'needs_review' : 'ready',
    blockingReasons: [...new Set(blockingReasons)]
  };
}
