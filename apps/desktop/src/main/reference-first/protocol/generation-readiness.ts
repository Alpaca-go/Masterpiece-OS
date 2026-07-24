import type {
  AudienceFact,
  GenerationIdentityPack,
  GenerationReadinessGate,
  ProjectGraphicAnchor,
  ReferenceSignatureGraphic,
  StyleCarrier,
  TaskReferenceSubset
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
}): GenerationReadinessGate {
  const authenticityErrors = validateAuthenticityDecisions(input.authenticityDecisions);
  const styleErrors = validateStyleCarriers(input.styleCarriers);
  const graphicErrors = validateGraphicReconstruction(input.anchor, input.signatureGraphics);
  const identityPackReady = input.identityPack.assets.length > 0;
  const projectFactsReady = input.identityPack.identityFacts.length > 0;
  const structurePolicyResolved = Boolean(input.identityPack.structurePolicy.status);
  const styleCarriersReady = input.styleCarriers.some((item) =>
    item.priority === 'primary' && Boolean(item.readableRule || item.description)
  ) && styleErrors.length === 0;
  const taskReferenceReady = Boolean(
    input.taskReference
    && input.taskReference.matchLevel !== 'insufficient'
    && input.taskReference.selectedAssetIds.length
  );
  const anchorDefinitionReady = Boolean(input.anchor?.sourceElements.length);
  const noSignatureGraphicLeak = graphicErrors.length === 0;
  const noUnverifiedAssetLeak = authenticityErrors.length === 0;
  const generationBriefReady = Boolean(
    input.generationBrief.trim()
    && input.taskReference
    && input.generationBrief.includes(input.taskReference.outputType)
  );
  const blockingReasons: string[] = [];
  if (!identityPackReady) blockingReasons.push('GENERATION_IDENTITY_PACK_EMPTY');
  if (!projectFactsReady) blockingReasons.push('GENERATION_IDENTITY_PACK_MISSING_REQUIRED_IDENTITY');
  if (!structurePolicyResolved) blockingReasons.push('STRUCTURE_STATUS_UNRESOLVED');
  if (!styleCarriersReady) blockingReasons.push(...styleErrors);
  if (!taskReferenceReady) blockingReasons.push('TASK_REFERENCE_MATCH_CONTRADICTION');
  if (!noSignatureGraphicLeak) blockingReasons.push(...graphicErrors);
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
    projectFactsReady,
    structurePolicyResolved,
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
