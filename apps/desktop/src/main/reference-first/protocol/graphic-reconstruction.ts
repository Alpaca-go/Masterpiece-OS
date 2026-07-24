import type {
  ProjectGraphicAnchor,
  ReferenceSignatureGraphic
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
