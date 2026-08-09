// R11.2 Continuation UI state helpers (pure, no React, no Electron).
//
// Centralizes the continuation panel rules so the React component and the
// unit tests share one source of truth:
//   - same-scene target is disabled (source scene card)
//   - custom scene requires a non-empty description
//   - a confirmed/revoked source gates submit
//   - lineage label (Reception → Consultation)
//   - scene card list (user-facing labels, no engineering terms)

export const CONTINUATION_SCENE_CARDS = Object.freeze([
  { id: 'entrance', label: '门店入口', hint: '建立到达、识别与进入体验' },
  { id: 'lobby', label: '大厅', hint: '开敞的公共到达与等候空间' },
  { id: 'reception', label: '前台 / 接待', hint: '到达接待与引导' },
  { id: 'consultation', label: '咨询室', hint: '更高私密度的专业交流空间' },
  { id: 'treatment_room', label: '治疗室', hint: '围绕专业操作与隐私需求展开' },
  { id: 'private_room', label: '私密房间', hint: '一对一专属服务 / 会面' },
  { id: 'display', label: '展示 / 展厅', hint: '展品与浏览动线' },
  { id: 'retail', label: '零售', hint: '商品陈列与选购' },
  { id: 'dining', label: '堂食', hint: '用餐与明档服务' },
  { id: 'custom', label: '自定义', hint: '描述一个具体的目标空间' },
]);

export const CONTINUATION_PRESERVE_COPY = ['空间语言', '材质体系', '光线气质', '品牌世界', '色彩关系'];
export const CONTINUATION_REDESIGN_COPY = ['功能布局', '动线', '尺度', '隐私关系', '家具与设备', '构图'];

export function normalizeSceneId(scene) {
  return String(scene ?? '').trim().toLowerCase();
}

/**
 * A target scene card is disabled when it equals the source scene (same-scene
 * variation is not supported in R11.2).
 */
export function isTargetSceneDisabled(targetSceneId, sourceScene) {
  const t = normalizeSceneId(targetSceneId);
  const s = normalizeSceneId(sourceScene);
  return Boolean(s && t === s);
}

/**
 * Custom scene requires a non-empty description.
 */
export function isCustomSceneValid(targetSceneId, customDescription) {
  if (normalizeSceneId(targetSceneId) !== 'custom') return true;
  return Boolean(String(customDescription ?? '').trim());
}

/**
 * The submit CTA is enabled when: a confirmed source exists, a target is
 * selected, target != source, and custom is valid.
 */
export function canSubmitContinuation({
  sourceConfirmed,
  sourceScene,
  targetScene,
  customDescription,
}) {
  if (!sourceConfirmed) return false;
  if (!targetScene) return false;
  if (isTargetSceneDisabled(targetScene, sourceScene)) return false;
  return isCustomSceneValid(targetScene, customDescription);
}

/**
 * Lineage label used on outputs (R11.2 §24).
 */
export function continuationLineageLabel(sourceScene, targetScene) {
  const s = normalizeSceneId(sourceScene);
  const t = normalizeSceneId(targetScene);
  if (!s || !t) return '';
  return `${s} → ${t}`;
}
