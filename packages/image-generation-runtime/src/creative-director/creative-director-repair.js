const ARRAY_FIELDS = ['identity', 'visualAssets', 'structures', 'composition', 'graphicLanguage', 'hierarchy', 'material', 'photography', 'applicationStrategy', 'compositionStrategy', 'colorRelationship', 'materialAndLighting', 'typographyRelationship', 'informationHierarchy', 'prohibitedCarryover', 'warnings'];

function array(value) { return Array.isArray(value) ? value.filter(Boolean).map(String) : value ? [String(value)] : []; }

export function repairCreativeDirectorBrief(brief, input) {
  const repaired = structuredClone(brief ?? {});
  repaired.schemaVersion ??= '1.0'; repaired.projectId ??= input.projectId; repaired.mode ??= input.mode;
  repaired.outputTask ??= { type: 'anchor_image', responsibility: input.userIntent?.description ?? 'Establish the first visual anchor.', aspectRatio: input.userIntent?.aspectRatio ?? '16:9' };
  repaired.outputTask.type ??= 'anchor_image'; repaired.outputTask.aspectRatio ??= input.userIntent?.aspectRatio ?? '16:9';
  repaired.preserve ??= {}; repaired.mustChange ??= {}; repaired.newDirection ??= {}; repaired.imageReferencePlan ??= {};
  for (const key of ['identity', 'visualAssets', 'structures']) repaired.preserve[key] = array(repaired.preserve[key]);
  for (const key of ['composition', 'graphicLanguage', 'hierarchy', 'material', 'photography', 'applicationStrategy']) repaired.mustChange[key] = array(repaired.mustChange[key]);
  for (const key of ['compositionStrategy', 'colorRelationship', 'materialAndLighting', 'typographyRelationship', 'informationHierarchy']) repaired.newDirection[key] = array(repaired.newDirection[key]);
  for (const key of ['visualAnchor', 'sceneMechanism']) repaired.newDirection[key] = String(repaired.newDirection[key] ?? '');
  for (const key of ['identity_reference', 'structure_reference', 'style_reference', 'analysis_only', 'excluded']) repaired.imageReferencePlan[key] = array(repaired.imageReferencePlan[key]);
  for (const key of ['prohibitedCarryover', 'warnings']) repaired[key] = array(repaired[key]);
  repaired.creativeDifferenceTarget ??= { level: input.mode === 'extend' ? 'low' : input.mode === 'upgrade' ? 'medium' : 'high', explanation: '' };
  repaired.generatedAt ??= input.generatedAt ?? '';
  return repaired;
}
