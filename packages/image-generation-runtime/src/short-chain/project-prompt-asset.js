export function validateShortChainProjectPromptAsset(asset, projectId, deliverableFamily) {
  const errors = [];
  if (!asset || typeof asset !== 'object' || Array.isArray(asset)) errors.push('asset must be an object');
  if (asset?.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
  if (!asset?.id) errors.push('id is required');
  if (asset?.projectId !== projectId) errors.push('project prompt asset cannot cross projects');
  if (asset?.deliverableFamily !== deliverableFamily) errors.push('project prompt asset cannot cross deliverable families');
  if (!Array.isArray(asset?.promptFragments)) errors.push('promptFragments must be an array');
  if (!Array.isArray(asset?.negativeConstraints)) errors.push('negativeConstraints must be an array');
  return { valid: errors.length === 0, errors };
}

export function assertShortChainProjectPromptAsset(asset, projectId, deliverableFamily) {
  const result = validateShortChainProjectPromptAsset(asset, projectId, deliverableFamily);
  if (!result.valid) throw new Error(`Invalid project prompt asset: ${result.errors.join('; ')}`);
  return structuredClone(asset);
}
