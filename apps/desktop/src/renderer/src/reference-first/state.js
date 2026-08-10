// R10.2 Reference-First UI state helpers (pure, no React, no Electron).
//
// Centralizes the light validation and basis/selection rules so the React
// component and the unit tests share one source of truth:
//   - MAX_SPACE_REFERENCE_IMAGES (1..4 selection cap)
//   - hard validation (fail-closed: no refs / too many / missing asset /
//     unsupported kind) -> blocks generation
//   - soft validation (small file / unusual extension) -> warns only, never
//     blocks (R10.2 §13/§19/§20 — no AI, no classifier)
//   - basis/refs decision used for the CTA and the taskContract refs
//   - remove/replace helpers that only affect the current task selection and
//     never delete the project asset file

export const MAX_SPACE_REFERENCE_IMAGES = 4;

export const SUPPORTED_REFERENCE_EXTENSIONS = /\.(png|jpe?g|webp)$/iu;

export function isSupportedReferenceKind(kind) {
  return kind === 'image';
}

export function isSupportedReferenceFile(name = '') {
  return SUPPORTED_REFERENCE_EXTENSIONS.test(name);
}

/**
 * Hard validation — any failure means the Reference-First CTA is disabled.
 * @param {Array<{id:string, kind?:string, bytes?:number, extension?:string}>} assets
 * @param {string[]} referenceAssetIds
 * @returns {string[]} human-readable hard errors (empty => ok)
 */
export function validateReferenceHard(assets, referenceAssetIds) {
  const errors = [];
  const ids = Array.isArray(referenceAssetIds) ? referenceAssetIds : [];
  if (ids.length < 1) errors.push('请至少选择 1 张参考图');
  if (ids.length > MAX_SPACE_REFERENCE_IMAGES) {
    errors.push(`参考图最多 ${MAX_SPACE_REFERENCE_IMAGES} 张`);
  }
  for (const id of ids) {
    const asset = assets.find((item) => item.id === id);
    if (!asset) {
      errors.push('所选参考图已不可用，请重新选择。');
      continue;
    }
    if (!isSupportedReferenceKind(asset.kind)) {
      errors.push(`当前文件格式不支持，请更换图片（${asset.name || id}）。`);
    }
  }
  return errors;
}

/**
 * Soft validation — warnings only, never blocks (R10.2 §20).
 * @returns {string[]}
 */
export function validateReferenceSoft(assets, referenceAssetIds) {
  const warnings = [];
  const ids = Array.isArray(referenceAssetIds) ? referenceAssetIds : [];
  for (const id of ids) {
    const asset = assets.find((item) => item.id === id);
    if (!asset) continue;
    if (typeof asset.bytes === 'number' && asset.bytes > 0 && asset.bytes < 40 * 1024) {
      warnings.push(`${asset.name || id}：图片尺寸偏小`);
    }
    const ext = String(asset.extension || asset.name || '').toLowerCase();
    if (ext && !/\.(png|jpe?g|webp)$/iu.test(ext)) {
      warnings.push(`${asset.name || id}：长宽比/格式可能异常`);
    }
  }
  if (warnings.length === 0) {
    warnings.push('建议使用清晰的室内、门店、展厅或建筑空间图片，以获得更稳定的生成结果。');
  }
  return warnings;
}

/**
 * CTA + task-contract decision (R10.2 §21/§24).
 * @returns {boolean} true when the current basis may compile/generate.
 */
export function canUseGenerationBasis(basis, referenceAssetIds, sceneValid) {
  if (basis === 'standard') return Boolean(sceneValid);
  return Boolean(sceneValid && Array.isArray(referenceAssetIds) && referenceAssetIds.length >= 1);
}

/**
 * Toggle a reference for the current task (remove when already selected).
 * @returns {string[]} next selection, capped at MAX_SPACE_REFERENCE_IMAGES.
 */
export function toggleReferenceId(current, assetId) {
  const ids = Array.isArray(current) ? current : [];
  if (ids.includes(assetId)) return ids.filter((id) => id !== assetId);
  return [...ids, assetId].slice(0, MAX_SPACE_REFERENCE_IMAGES);
}

/**
 * Remove one reference for the current task only — never deletes the project
 * asset file (R10.2 §14).
 */
export function removeReferenceId(current, assetId) {
  const ids = Array.isArray(current) ? current : [];
  return ids.filter((id) => id !== assetId);
}

/**
 * Replace one reference for the current task (old id dropped; new ids appended,
 * capped at the max). The project asset file is untouched.
 */
export function replaceReferenceIds(current, oldAssetId, newAssetIds) {
  const base = removeReferenceId(current, oldAssetId);
  for (const id of Array.isArray(newAssetIds) ? newAssetIds : []) {
    if (!base.includes(id)) base.push(id);
  }
  return base.slice(0, MAX_SPACE_REFERENCE_IMAGES);
}

/**
 * Merge an upload result into the current explicit selection. A chosen file
 * that already exists in the project library is skipped by the import (its
 * asset id is reported as a duplicate); both the newly imported ids and the
 * matching existing ids belong in the reference selection.
 * @returns {string[]} next selection, capped at MAX_SPACE_REFERENCE_IMAGES.
 */
export function mergeUploadedReferenceIds(current, uploadedIds, duplicateIds) {
  const base = Array.isArray(current) ? current : [];
  const fresh = [...uploadedIds, ...duplicateIds].filter((id) => id && !base.includes(id));
  return [...base, ...fresh].slice(0, MAX_SPACE_REFERENCE_IMAGES);
}
