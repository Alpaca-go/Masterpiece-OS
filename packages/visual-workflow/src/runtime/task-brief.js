// Turns the finished analysis packet into a usable generation brief.
//
// Why: the Web form ships with a placeholder instruction
// ("生成符合项目气质的空间效果图"). A request with only that placeholder, the
// default reception/entrance shot and all style axes left to the designer gives
// the model nothing to hold on to, and the result drifts to the model's own
// default (a mall food-court look). The 2026-10-30 Web run showed exactly that,
// while a hand-written brief produced a materially better image.
//
// This builder only restates what the analysis already decided: the spatial
// concept, the must-see items, the material system, the lighting intent and the
// colour roles. It never invents content, and it is optional - the user can
// edit or ignore it.

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).join('；');
  return '';
}

function firstSentence(value) {
  return text(value).split(/[。；]/u)[0].trim();
}

const BRAND_TEXT = /(品牌|字标|招牌|标识|店名|logo)/iu;

export function buildTaskBrief(packet, options = {}) {
  const spatial = packet?.mediaTranslations?.spatial;
  if (!spatial || typeof spatial !== 'object') {
    throw Object.assign(new Error('分析结果里没有空间提案，无法生成任务书'), { code: 'TASK_BRIEF_PACKET_MISSING' });
  }
  const lines = [];
  const concept = text(spatial.spatialConcept) || text(spatial.designProposal?.basis?.[0]);
  if (concept) lines.push(concept);

  const postComposite = options.logoUsageMode === 'post_composite';
  const mustItems = (Array.isArray(spatial.mustBeVisible) ? spatial.mustBeVisible : [])
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim());
  const keptMust = postComposite ? mustItems.filter((item) => !BRAND_TEXT.test(item)) : mustItems;
  if (keptMust.length) lines.push(`必见：${keptMust.join('；')}`);
  if (postComposite && keptMust.length !== mustItems.length) {
    lines.push('品牌文字与 Logo 不画在图内：生成后由后期合成放置（当前品牌文字模式为后期合成）。');
  }

  const materials = (Array.isArray(spatial.materialLanguage) ? spatial.materialLanguage : [])
    .slice(0, 3)
    .map((item) => {
      const material = text(item?.material);
      const role = firstSentence(item?.brandRole);
      return material ? (role ? `${material}（${role}）` : material) : '';
    })
    .filter(Boolean);
  if (materials.length) lines.push(`材料：${materials.join('；')}`);

  const lighting = spatial.lightingLanguage || {};
  const lightingParts = [firstSentence(lighting.contrast), firstSentence(lighting.interactionWithMaterials)].filter(Boolean);
  const lightingSource = text(lighting.source);
  if (lightingSource) lightingParts.unshift(firstSentence(lightingSource));
  if (lightingParts.length) lines.push(`灯光：${lightingParts.join('；')}`);

  const color = spatial.colorBehavior || {};
  const colorParts = [];
  for (const key of ['primary', 'secondary', 'accent']) {
    const entry = Array.isArray(color[key]) ? color[key][0] : null;
    const name = text(entry?.name);
    const role = firstSentence(entry?.role);
    if (name) colorParts.push(role ? `${name}（${role}）` : name);
  }
  if (colorParts.length) lines.push(`色彩：${colorParts.join('；')}`);

  // Structure items that name signage lettering conflict with post-composite mode,
  // where the model is told not to render brand text at all.
  const structureItems = text(spatial.structureLanguage).split(/[；;]/u).map((item) => item.trim()).filter(Boolean);
  const keptStructure = postComposite ? structureItems.filter((item) => !BRAND_TEXT.test(item)) : structureItems;
  if (keptStructure.length) lines.push(`结构：${keptStructure.join('；')}`);

  const mustBeVisibleNote = '本条任务书来自分析结果，可直接修改；不要照抄具体品牌符号，也不要发明素材里没有的道具或文字。';
  lines.push(mustBeVisibleNote);

  return lines.join('\n');
}
