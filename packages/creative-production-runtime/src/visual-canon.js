import crypto from 'node:crypto';
import path from 'node:path';

const IMAGE_TYPES = ['brand_hero', 'packaging', 'poster_graphic', 'vi_application', 'spatial', 'illustration'];

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function lower(values) {
  return unique(values).map((value) => value.toLowerCase());
}

function relativePath(value) {
  const normalized = text(value).replaceAll('\\', '/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized)
    || normalized.split('/').includes('..')) {
    throw Object.assign(new Error('Canon Image 必须使用项目内相对路径。'), { code: 'VISUAL_CANON_PATH_INVALID' });
  }
  return normalized;
}

export function nextVisualCanonVersion(current, level = 'minor') {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(text(current));
  if (!match) throw Object.assign(new Error('Visual Canon 版本无效。'), { code: 'VISUAL_CANON_INVALID' });
  const [, major, minor, patch] = match.map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw Object.assign(new Error('Visual Canon 版本级别无效。'), { code: 'VISUAL_CANON_INVALID' });
}

function toCanonImage(input, priority) {
  const anchor = input.anchor;
  if (anchor?.status !== 'accepted' || !anchor?.imagePath) {
    throw Object.assign(new Error('Visual Canon 只能引用 accepted Anchor Candidate。'), {
      code: 'ANCHOR_NOT_ACCEPTED',
    });
  }
  const type = input.type || (priority === 'primary' ? 'brand_hero' : 'vi_application');
  if (!IMAGE_TYPES.includes(type)) {
    throw Object.assign(new Error('Canon Image 类型无效。'), { code: 'VISUAL_CANON_INVALID' });
  }
  return {
    id: input.id || `canon-image-${crypto.randomUUID()}`,
    type,
    role: text(input.role) || (priority === 'primary' ? '定义整体视觉基准' : `补充 ${type} 触点基准`),
    imagePath: relativePath(anchor.imagePath),
    sourceAnchorId: anchor.id,
    priority,
    observations: {
      colors: unique(input.observations?.colors),
      materials: unique(input.observations?.materials),
      lighting: unique(input.observations?.lighting),
      graphicLanguage: unique(input.observations?.graphicLanguage),
      ...(text(input.observations?.compositionDensity)
        ? { compositionDensity: text(input.observations.compositionDensity) }
        : {}),
      preservedLockedAssetIds: unique(input.observations?.preservedLockedAssetIds ?? anchor.lockedAssetIds),
    },
  };
}

export function checkVisualCanonConflicts(canon, styleProfile, lockedAssets) {
  const conflicts = [];
  const criticalIds = lockedAssets.filter((asset) => asset.priority === 'critical').map((asset) => asset.id);
  const forbiddenColors = lower(styleProfile?.colorSystem?.forbiddenColors);
  const forbiddenMaterials = lower(styleProfile?.materialAndTexture?.forbiddenTextures);
  const forbiddenGraphics = lower(styleProfile?.forbiddenVariations);
  for (const image of canon.canonImages) {
    const missing = criticalIds.filter((id) => !image.observations.preservedLockedAssetIds.includes(id));
    if (missing.length) conflicts.push({
      dimension: 'locked_assets',
      severity: 'blocking',
      message: `Canon Image 未确认保留 critical Locked Assets：${missing.join('、')}`,
      canonImageIds: [image.id],
    });
    const checks = [
      ['color', lower(image.observations.colors), forbiddenColors],
      ['material', lower(image.observations.materials), forbiddenMaterials],
      ['graphic_language', lower(image.observations.graphicLanguage), forbiddenGraphics],
    ];
    for (const [dimension, actual, forbidden] of checks) {
      const hits = actual.filter((value) => forbidden.includes(value));
      if (hits.length) conflicts.push({
        dimension,
        severity: 'blocking',
        message: `Canon Image 命中 Style Profile 禁止项：${hits.join('、')}`,
        canonImageIds: [image.id],
      });
    }
  }
  const primary = canon.canonImages.find((image) => image.priority === 'primary');
  for (const supporting of canon.canonImages.filter((image) => image.priority === 'supporting')) {
    for (const [dimension, key] of [
      ['lighting', 'lighting'],
      ['composition_density', 'compositionDensity'],
    ]) {
      const primaryValues = key === 'compositionDensity'
        ? unique([primary?.observations?.[key]])
        : unique(primary?.observations?.[key]);
      const supportingValues = key === 'compositionDensity'
        ? unique([supporting.observations?.[key]])
        : unique(supporting.observations?.[key]);
      if (primaryValues.length && supportingValues.length
        && !lower(primaryValues).some((value) => lower(supportingValues).includes(value))) {
        conflicts.push({
          dimension,
          severity: 'warning',
          message: `Supporting Canon 的${dimension}与 Primary Canon 不一致，需人工确认。`,
          canonImageIds: [primary.id, supporting.id],
        });
      }
    }
  }
  return conflicts;
}

export function buildVisualCanon(input, now = new Date().toISOString()) {
  const styleProfile = input?.styleProfile;
  if (!text(input?.projectId) || styleProfile?.status !== 'confirmed') {
    throw Object.assign(new Error('构建 Visual Canon 需要项目与 confirmed Style Profile。'), {
      code: 'VISUAL_CANON_INPUT_MISSING',
    });
  }
  const primary = toCanonImage(input.primary, 'primary');
  const supporting = (input.supporting ?? []).map((item) => toCanonImage(item, 'supporting'));
  const canon = {
    schemaVersion: '6.0',
    id: input.id || `visual-canon-${crypto.randomUUID()}`,
    projectId: text(input.projectId),
    name: text(input.name) || `${styleProfile.name} Visual Canon`,
    version: text(input.version) || '1.0.0',
    status: 'draft',
    styleProfileId: styleProfile.id,
    styleProfileVersion: styleProfile.version,
    primaryCanonImageId: primary.id,
    canonImages: [primary, ...supporting],
    sharedRules: unique(input.sharedRules ?? styleProfile.promptComponents?.required),
    variationRules: unique(input.variationRules ?? styleProfile.allowedVariations),
    conflicts: [],
    createdAt: now,
    updatedAt: now,
  };
  canon.conflicts = checkVisualCanonConflicts(canon, styleProfile, input.lockedAssets ?? []);
  return validateVisualCanon(canon);
}

export function confirmVisualCanon(canon, now = new Date().toISOString()) {
  validateVisualCanon(canon);
  if (canon.conflicts.some((conflict) => conflict.severity === 'blocking')) {
    throw Object.assign(new Error('Visual Canon 存在阻断性冲突。'), { code: 'CANON_CONFLICT_BLOCKING' });
  }
  return validateVisualCanon({ ...canon, status: 'confirmed', updatedAt: now });
}

export function validateVisualCanon(canon) {
  if (!canon || canon.schemaVersion !== '6.0' || !text(canon.id) || !text(canon.projectId)
    || !text(canon.name) || !/^\d+\.\d+\.\d+$/.test(text(canon.version))) {
    throw Object.assign(new Error('Visual Canon 基础字段无效。'), { code: 'VISUAL_CANON_INVALID' });
  }
  if (!['draft', 'confirmed', 'superseded'].includes(canon.status)
    || !Array.isArray(canon.canonImages) || canon.canonImages.length < 1 || canon.canonImages.length > 4) {
    throw Object.assign(new Error('Visual Canon 状态或图片数量无效。'), { code: 'VISUAL_CANON_INVALID' });
  }
  const primaries = canon.canonImages.filter((image) => image.priority === 'primary');
  if (primaries.length !== 1 || primaries[0].id !== canon.primaryCanonImageId) {
    throw Object.assign(new Error('Visual Canon 必须且只能有一个 Primary Canon。'), {
      code: 'PRIMARY_CANON_INVALID',
    });
  }
  for (const image of canon.canonImages) {
    if (!IMAGE_TYPES.includes(image.type) || !text(image.id) || !text(image.sourceAnchorId)
      || !text(image.role) || !['primary', 'supporting'].includes(image.priority)) {
      throw Object.assign(new Error('Canon Image 字段无效。'), { code: 'VISUAL_CANON_INVALID' });
    }
    relativePath(image.imagePath);
    if (!Array.isArray(image.observations?.preservedLockedAssetIds)) {
      throw Object.assign(new Error('Canon Image 缺少 Locked Asset 检查结果。'), { code: 'VISUAL_CANON_INVALID' });
    }
  }
  return canon;
}
