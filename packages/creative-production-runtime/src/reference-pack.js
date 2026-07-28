import crypto from 'node:crypto';
import path from 'node:path';
import { validateVisualMemory } from './visual-memory.js';

export const REFERENCE_PACK_COMPILER_VERSION = 'reference-pack-1.0.0';
const TARGET_MIN = 5;
const TARGET_MAX = 8;

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function relative(value) {
  const normalized = text(value).replaceAll('\\', '/');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized)
    || normalized.split('/').includes('..')) {
    throw Object.assign(new Error('Reference Pack 路径必须是项目内相对路径。'), {
      code: 'REFERENCE_PACK_PATH_INVALID',
    });
  }
  return normalized;
}

function extension(value) {
  const ext = path.posix.extname(relative(value)).toLowerCase();
  return /^\.(?:png|jpe?g|webp)$/u.test(ext) ? ext : '.png';
}

function safeAssetId(value) {
  return text(value).replace(/[^a-z0-9._-]+/giu, '-').replace(/^-+|-+$/gu, '') || 'asset';
}

function packRole(candidate) {
  if (candidate.role === 'anchor_reference') return 'anchor';
  if (candidate.role === 'keep_reference') return 'locked';
  return 'style';
}

function packPath(candidate) {
  const role = packRole(candidate);
  return `visual-memory/reference-pack/${role}/${safeAssetId(candidate.asset_id)}${extension(candidate.source_path)}`;
}

function stableId(memory, candidates) {
  const digest = crypto.createHash('sha256').update(JSON.stringify({
    visualMemoryId: memory.id,
    candidates: candidates.map((item) => [
      item.asset_id, item.source_path, item.role, item.score,
    ]),
  })).digest('hex').slice(0, 20);
  return `reference-pack-${digest}`;
}

function compareCandidates(left, right) {
  const rolePriority = {
    anchor_reference: 0,
    keep_reference: 1,
    style_reference: 2,
    ignore_reference: 3,
  };
  return rolePriority[left.role] - rolePriority[right.role]
    || right.score - left.score
    || left.asset_id.localeCompare(right.asset_id);
}

function selectDiverse(candidates) {
  const eligible = candidates
    .filter((item) => item.role !== 'ignore_reference')
    .sort(compareCandidates);
  const selected = [];
  const take = (role, max) => {
    for (const item of eligible) {
      if (selected.length >= TARGET_MAX
        || selected.includes(item)
        || item.role !== role
        || selected.filter((candidate) => candidate.role === role).length >= max) continue;
      selected.push(item);
    }
  };
  take('anchor_reference', 2);
  take('keep_reference', 2);
  take('style_reference', TARGET_MAX);
  for (const item of eligible) {
    if (selected.length >= Math.min(TARGET_MAX, Math.max(TARGET_MIN, eligible.length))) break;
    if (!selected.includes(item)) selected.push(item);
  }
  return { eligible, selected: selected.slice(0, TARGET_MAX) };
}

export function compileReferencePack(input, now = new Date().toISOString()) {
  const memory = validateVisualMemory(input?.visualMemory);
  const anchors = (Array.isArray(input?.anchors) ? input.anchors : []).map((anchor) => ({
    asset_id: text(anchor.asset_id),
    source_kind: 'generated_anchor',
    source_path: relative(anchor.source_path),
    role: 'anchor_reference',
    rationale: text(anchor.rationale) || '来自已确认 Visual Canon 的新视觉锚点。',
    signals: unique(anchor.signals),
    score: Number.isFinite(anchor.score) ? anchor.score : 98,
  }));
  const candidates = [...anchors, ...memory.reference_strategy.candidates]
    .filter((item, index, list) => item.asset_id
      && list.findIndex((candidate) => candidate.asset_id === item.asset_id) === index);
  const { eligible, selected } = selectDiverse(candidates);
  const selectedIds = new Set(selected.map((item) => item.asset_id));
  const pack = {
    schema_version: '1.0',
    id: stableId(memory, candidates),
    project_id: memory.project_id,
    visual_memory_id: memory.id,
    selection: {
      input_count: memory.reference_strategy.candidates.length,
      eligible_count: eligible.length,
      selected_count: selected.length,
      target_min: TARGET_MIN,
      target_max: TARGET_MAX,
      status: selected.length >= TARGET_MIN ? 'ready' : 'insufficient_eligible_assets',
    },
    items: selected.map((item) => ({
      asset_id: item.asset_id,
      source_kind: item.source_kind,
      role: packRole(item),
      source_path: relative(item.source_path),
      pack_path: packPath(item),
      rationale: text(item.rationale),
      signals: unique(item.signals),
      score: item.score,
    })),
    excluded: candidates
      .filter((item) => !selectedIds.has(item.asset_id))
      .map((item) => ({
        asset_id: item.asset_id,
        source_path: relative(item.source_path),
        reason: item.role === 'ignore_reference'
          ? item.rationale
          : '超过 Reference Pack 5–8 张上限，保留在 Visual Memory 中但不进入执行包。',
      })),
    created_at: now,
  };
  return validateReferencePack(pack);
}

export function validateReferencePack(pack) {
  if (!pack || pack.schema_version !== '1.0' || !text(pack.id)
    || !text(pack.project_id) || !text(pack.visual_memory_id)
    || !Array.isArray(pack.items) || !Array.isArray(pack.excluded)) {
    throw Object.assign(new Error('Reference Pack 基础字段无效。'), { code: 'REFERENCE_PACK_INVALID' });
  }
  if (pack.items.length > TARGET_MAX || pack.selection?.selected_count !== pack.items.length
    || pack.selection?.target_min !== TARGET_MIN || pack.selection?.target_max !== TARGET_MAX
    || !['ready', 'insufficient_eligible_assets'].includes(pack.selection?.status)
    || (pack.selection.status === 'ready' && pack.items.length < TARGET_MIN)
    || (pack.selection.status === 'insufficient_eligible_assets' && pack.items.length >= TARGET_MIN)) {
    throw Object.assign(new Error('Reference Pack 选择统计无效。'), { code: 'REFERENCE_PACK_INVALID' });
  }
  const ids = new Set();
  for (const item of pack.items) {
    if (!text(item.asset_id) || ids.has(item.asset_id)
      || !['locked', 'style', 'anchor'].includes(item.role)
      || !text(item.rationale) || !Number.isFinite(item.score)) {
      throw Object.assign(new Error('Reference Pack Item 无效或重复。'), { code: 'REFERENCE_PACK_INVALID' });
    }
    ids.add(item.asset_id);
    relative(item.source_path);
    relative(item.pack_path);
  }
  for (const item of pack.excluded) {
    if (!text(item.asset_id) || ids.has(item.asset_id) || !text(item.reason)) {
      throw Object.assign(new Error('Reference Pack exclude 清单无效。'), { code: 'REFERENCE_PACK_INVALID' });
    }
    ids.add(item.asset_id);
    relative(item.source_path);
  }
  return pack;
}

/**
 * 5–8 张 Reference Pack 是可审计候选集；最终 Provider 按任务最多取 2 张。
 * 旧 style 图片不会默认进入 Provider，以免重新引入 Reference Dilution。
 */
export function selectProviderReferencesFromPack(pack, outputType) {
  validateReferencePack(pack);
  const anchors = pack.items.filter((item) => item.role === 'anchor');
  const locked = pack.items.filter((item) => item.role === 'locked');
  const bySignal = (pattern) => locked.find((item) =>
    item.signals.some((signal) => pattern.test(signal)));
  if (outputType === 'vi_application') {
    const identity = bySignal(/identity_reference|logo/iu);
    return identity ? [identity] : [];
  }
  if (outputType === 'packaging_render') {
    const structure = bySignal(/structure_reference|packaging_structure/iu);
    return [...(structure ? [structure] : []), ...anchors].slice(0, 2);
  }
  return anchors.slice(0, 1);
}
