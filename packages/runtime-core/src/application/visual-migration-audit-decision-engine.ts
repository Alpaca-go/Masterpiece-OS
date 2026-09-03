import type {
  ReferenceAuditObservationV1,
  SourceAuditObservationV1,
  VisualMigrationAuditDecisionV1,
  VisualMigrationFailureClass,
} from './visual-migration-audit-contract.ts';

const ORDER: VisualMigrationFailureClass[] = [
  'REFERENCE_CONFLICT', 'SOURCE_IDENTITY_LOSS', 'TARGET_IDENTITY_LOSS',
  'STRUCTURE_DRIFT', 'PALETTE_DRIFT', 'GRAPHIC_LANGUAGE_DRIFT',
  'STYLE_DRIFT', 'NEAR_COPY_RISK',
];

export function decideVisualMigrationAudit(input: {
  source: SourceAuditObservationV1;
  reference: ReferenceAuditObservationV1;
  exactCopyDetected?: boolean;
}): VisualMigrationAuditDecisionV1 {
  const failures = new Set<VisualMigrationFailureClass>();
  const { source, reference } = input;
  const style = [reference.colorSystem, reference.layoutAndTypography,
    reference.graphicLanguage, reference.materialAndPhotography, reference.extensionMechanism];
  if (style.filter((value) => value === 'major_drift').length >= 2) failures.add('STYLE_DRIFT');
  if (source.identityPreservation === 'major_drift' || source.lockedAssetIntegrity === 'fail') failures.add('SOURCE_IDENTITY_LOSS');
  if (source.contentHierarchy === 'major_drift') failures.add('TARGET_IDENTITY_LOSS');
  if (source.structurePreservation === 'major_drift') failures.add('STRUCTURE_DRIFT');
  if (reference.colorSystem === 'major_drift') failures.add('PALETTE_DRIFT');
  if (reference.graphicLanguage === 'major_drift') failures.add('GRAPHIC_LANGUAGE_DRIFT');
  if (input.exactCopyDetected || reference.referenceIdentityLeakage === 'visible' || reference.nearCopyRisk === 'high') failures.add('NEAR_COPY_RISK');
  if (reference.referenceConflict === 'confirmed') failures.add('REFERENCE_CONFLICT');
  const failureClasses = ORDER.filter((item) => failures.has(item));
  if (failures.has('REFERENCE_CONFLICT')) return { failureClasses, severity: 'blocking', disposition: 'reference_conflict_blocked', retryEligibility: false, exactCopyDetected: Boolean(input.exactCopyDetected) };
  const hardUncertain = source.identityPreservation === 'uncertain'
    || source.lockedAssetIntegrity === 'uncertain'
    || reference.referenceIdentityLeakage === 'uncertain'
    || reference.nearCopyRisk === 'uncertain'
    || reference.referenceConflict === 'uncertain';
  if (hardUncertain) return { failureClasses, severity: 'blocking', disposition: 'manual_review_required', retryEligibility: false, exactCopyDetected: Boolean(input.exactCopyDetected) };
  if (failureClasses.length) return { failureClasses, severity: 'blocking', disposition: 'corrective_retry_required', retryEligibility: true, exactCopyDetected: Boolean(input.exactCopyDetected) };
  const warning = [source.identityPreservation, source.contentHierarchy, source.structurePreservation,
    reference.colorSystem, reference.layoutAndTypography, reference.graphicLanguage,
    reference.materialAndPhotography, reference.extensionMechanism].includes('minor_drift')
    || source.foreignIdentityVisible === 'suspected'
    || reference.referenceIdentityLeakage === 'suspected'
    || reference.nearCopyRisk === 'medium'
    || reference.referenceConflict === 'suspected';
  return { failureClasses, severity: warning ? 'warning' : 'none', disposition: warning ? 'pass_with_warnings' : 'pass', retryEligibility: false, exactCopyDetected: Boolean(input.exactCopyDetected) };
}
