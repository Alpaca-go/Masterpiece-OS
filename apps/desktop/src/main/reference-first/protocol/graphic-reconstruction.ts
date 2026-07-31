import type {
  ProjectGraphicAnchor,
  ReferenceSignatureGraphic,
  SignatureGraphicLeakValidation,
  StyleCarrier,
  SystemAnchor
} from '../../../shared/types.ts';

export function validateGraphicReconstruction(
  anchor: ProjectGraphicAnchor | undefined,
  signatures: ReferenceSignatureGraphic[]
): string[] {
  if (!anchor) return [];
  const errors: string[] = [];
  if (anchor.resemblesReferenceSignatureGraphic) {
    errors.push('REFERENCE_SIGNATURE_GRAPHIC_LEAK');
  }
  if (signatures.some((item) =>
    item.forbiddenToCopy
    && item.description.trim()
    && (anchor.formDescription || anchor.reconstructedForm).includes(item.description.trim())
  )) {
    errors.push('REFERENCE_SIGNATURE_GRAPHIC_LEAK');
  }
  return [...new Set(errors)];
}

/**
 * §3.4 参考专属图形泄漏校验。
 * 禁止复制的参考专属图形不得进入：Primary / Secondary Style Carriers、
 * System Anchor、Project Graphic Anchor、Generation Brief。
 */
export function validateSignatureGraphicLeak(input: {
  signatures: ReferenceSignatureGraphic[];
  carriers?: StyleCarrier[];
  anchor?: ProjectGraphicAnchor;
  systemAnchor?: SystemAnchor;
  briefText?: string;
}): SignatureGraphicLeakValidation {
  const forbidden = input.signatures.filter((item) => item.forbiddenToCopy);
  const forbiddenIds = new Set(forbidden.flatMap((item) => item.evidenceAssetIds));
  const leakageText = (text: string): boolean => Boolean(text.trim()) && forbidden.some((item) =>
    item.description.trim() && text.includes(item.description.trim())
  );

  const carriers = input.carriers || [];
  const primaryLeak = carriers.filter((item) =>
    item.priority === 'primary'
    && (item.containsReferenceIdentity || (item.referencesSignatureGraphicIds || []).some((id) => forbiddenIds.has(id)))
  );
  const secondaryLeak = carriers.filter((item) =>
    item.priority === 'secondary' || item.priority === 'optional')
    .filter((item) =>
      item.containsReferenceIdentity || (item.referencesSignatureGraphicIds || []).some((id) => forbiddenIds.has(id))
    );
  const systemAnchorLeak = input.systemAnchor && leakageText([
    input.systemAnchor.colorRelationship,
    input.systemAnchor.layoutGrammar,
    input.systemAnchor.typographyHierarchy,
    input.systemAnchor.materialLanguage,
    input.systemAnchor.crossTouchpointConsistency
  ].filter(Boolean).join('\n')) ? [input.systemAnchor.primaryStyleCarrierIds.join(',') || 'system'] : [];
  const anchorLeak = input.anchor && leakageText([
    input.anchor.formDescription || input.anchor.reconstructedForm,
    ...(input.anchor.sourceElements || [])
  ].filter(Boolean).join('\n')) ? ['project-graphic-anchor'] : [];
  const briefLeak = input.briefText && leakageText(input.briefText) ? ['generation-brief'] : [];

  return {
    primaryStyleCarrierLeakIds: primaryLeak.map((item) => item.id),
    secondaryStyleCarrierLeakIds: secondaryLeak.map((item) => item.id),
    systemAnchorLeakIds: systemAnchorLeak,
    projectGraphicAnchorLeakIds: anchorLeak,
    generationBriefLeakIds: briefLeak,
    passed: primaryLeak.length === 0
      && secondaryLeak.length === 0
      && systemAnchorLeak.length === 0
      && anchorLeak.length === 0
      && briefLeak.length === 0
  };
}
