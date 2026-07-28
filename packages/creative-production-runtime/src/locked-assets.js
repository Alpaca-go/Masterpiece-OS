import crypto from 'node:crypto';
import path from 'node:path';

export const LOCKED_ASSET_TYPES = Object.freeze([
  'brand_name',
  'logo',
  'product_category',
  'packaging_structure',
  'packaging_artwork',
  'product_color',
  'product_arrangement',
  'core_symbol',
  'required_visual_element',
  'forbidden_reference_content',
]);

export const LOCKED_ASSET_PRIORITIES = Object.freeze(['critical', 'high', 'medium', 'low']);

function clean(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
}

function stableId(projectId, type, name, sourceAssetId = '') {
  const digest = crypto.createHash('sha256')
    .update([projectId, type, name.toLowerCase(), sourceAssetId].join('\0'))
    .digest('hex')
    .slice(0, 16);
  return `locked-asset-${digest}`;
}

function inferType(value) {
  const rule = clean(value);
  if (/logo|标志|标识|标准字|字标/iu.test(rule)) return 'logo';
  if (/包装.*(?:结构|瓶型|盒型|袋型)|(?:结构|瓶型|盒型|袋型).*包装/iu.test(rule)) return 'packaging_structure';
  if (/包装.*(?:画面|图形|版式|图案)/iu.test(rule)) return 'packaging_artwork';
  if (/颜色|色彩|色值|主色|产品色/iu.test(rule)) return 'product_color';
  if (/排列|陈列|组合顺序/iu.test(rule)) return 'product_arrangement';
  if (/符号|图腾|超级图形/iu.test(rule)) return 'core_symbol';
  if (/参考.*(?:禁止|不得)|禁止.*参考|不得复制|身份泄漏/iu.test(rule)) return 'forbidden_reference_content';
  return 'required_visual_element';
}

function defaultPriority(type) {
  if (['brand_name', 'logo', 'packaging_structure'].includes(type)) return 'critical';
  if (['product_category', 'packaging_artwork', 'forbidden_reference_content'].includes(type)) return 'high';
  return 'medium';
}

function defaultForbiddenChanges(type, name) {
  const rules = {
    brand_name: [`不得改变品牌名称“${name}”的文字内容`],
    logo: ['不得重绘、拆解、替换、仿造或改变 Logo 内部字形与比例'],
    product_category: [`不得把产品类别“${name}”改成其他品类`],
    packaging_structure: [`不得改变已确认包装结构“${name}”的关键形态`],
    packaging_artwork: [`不得丢失已确认包装画面资产“${name}”的识别要素`],
    product_color: [`不得违反产品颜色规则：${name}`],
    product_arrangement: [`不得违反产品排列规则：${name}`],
    core_symbol: [`不得替换或误用核心符号“${name}”`],
    required_visual_element: [`不得遗漏必要视觉元素“${name}”`],
    forbidden_reference_content: [`不得引入被禁止的参考内容：${name}`],
  };
  return rules[type] ?? [`不得违反锁定规则：${name}`];
}

function makeAsset(input, now) {
  const type = input.type;
  const name = clean(input.name);
  const projectId = clean(input.projectId);
  const sourceAssetId = clean(input.sourceAssetId);
  const item = {
    schemaVersion: '6.0',
    id: input.id || stableId(projectId, type, name, sourceAssetId),
    projectId,
    type,
    name,
    ...(sourceAssetId ? { sourceAssetId } : {}),
    ...(clean(input.sourceFile) ? { sourceFile: clean(input.sourceFile).replaceAll('\\', '/') } : {}),
    ...(clean(input.thumbnail) ? { thumbnail: clean(input.thumbnail).replaceAll('\\', '/') } : {}),
    rule: clean(input.rule, name) || name,
    priority: input.priority || defaultPriority(type),
    allowedChanges: unique(input.allowedChanges),
    forbiddenChanges: unique(input.forbiddenChanges).length
      ? unique(input.forbiddenChanges)
      : defaultForbiddenChanges(type, name),
    evidence: {
      source: input.evidence?.source || 'user_confirmed',
      description: clean(input.evidence?.description, input.rule || name),
    },
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
  return validateLockedAsset(item);
}

/**
 * 从已确认事实编译 Locked Assets。Creative Understanding 的 valuableAssets 不会自动锁定，
 * 避免把旧视觉方案整体固化为生成约束。
 */
export function compileLockedAssets(input, now = new Date().toISOString()) {
  const projectId = clean(input?.projectId || input?.visualContext?.projectId);
  if (!projectId) {
    throw Object.assign(new Error('Locked Assets 缺少 projectId。'), { code: 'LOCKED_ASSET_INVALID' });
  }
  const visual = input?.visualContext ?? {};
  const understanding = input?.understanding ?? {};
  const sourceAssets = new Map((input?.sourceAssets ?? []).map((asset) => [clean(asset.id), asset]));
  const candidates = [];
  const add = (asset) => candidates.push(makeAsset({ projectId, ...asset }, now));

  const brandName = clean(visual?.identity?.brandName || understanding?.projectIdentity?.brandName);
  if (brandName && !/待确认|未知|unknown/iu.test(brandName)) {
    add({
      type: 'brand_name',
      name: brandName,
      rule: `品牌名称必须保持为“${brandName}”。`,
      evidence: { source: 'project_visual_context', description: '来自项目身份字段。' },
    });
  }

  if (visual?.lockedAssets?.logoLocked) {
    const logoIds = unique(visual?.lockedAssets?.logoAssetIds);
    for (const logoId of logoIds.length ? logoIds : ['']) {
      const source = sourceAssets.get(logoId);
      add({
        type: 'logo',
        name: source?.name || (brandName ? `${brandName} Logo` : '项目 Logo'),
        sourceAssetId: logoId,
        sourceFile: source?.sourceFile,
        thumbnail: source?.thumbnail,
        rule: 'Logo 为身份资产，必须原样保留。',
        evidence: { source: 'project_visual_context', description: 'ProjectVisualContext.logoLocked=true。' },
      });
    }
  }

  for (const product of unique(visual?.products?.coreProducts ?? understanding?.projectIdentity?.products)) {
    add({
      type: 'product_category',
      name: product,
      rule: `核心产品类别必须保持为“${product}”。`,
      evidence: { source: 'project_visual_context', description: '来自已识别的核心产品事实。' },
    });
  }

  if (visual?.packaging?.status === 'confirmed') {
    for (const structure of unique(visual?.packaging?.structures)) {
      add({
        type: 'packaging_structure',
        name: structure,
        rule: `已确认的包装结构“${structure}”不可被生成模型改写。`,
        evidence: { source: 'project_visual_context', description: '包装结构状态为 confirmed。' },
      });
    }
  }

  for (const rule of unique(visual?.lockedAssets?.lockedFacts)) {
    add({
      type: inferType(rule),
      name: rule,
      rule,
      evidence: { source: 'project_visual_context', description: '来自用户或项目记录中的 lockedFacts。' },
    });
  }

  for (const rule of unique(understanding?.identityLocks)) {
    add({
      type: inferType(rule),
      name: rule,
      rule,
      evidence: { source: 'creative_understanding', description: 'Creative Reading 识别为必须锁定。' },
    });
  }

  for (const explicit of input?.explicitAssets ?? []) {
    add({
      ...explicit,
      evidence: {
        source: 'user_confirmed',
        description: clean(explicit?.evidence?.description, '用户明确确认。'),
      },
    });
  }

  const byKey = new Map();
  for (const item of candidates) {
    const key = `${item.type}\0${item.name.toLowerCase()}\0${item.sourceAssetId ?? ''}`;
    const existing = byKey.get(key);
    byKey.set(key, existing ? validateLockedAsset({
      ...existing,
      priority: LOCKED_ASSET_PRIORITIES.indexOf(item.priority) < LOCKED_ASSET_PRIORITIES.indexOf(existing.priority)
        ? item.priority : existing.priority,
      allowedChanges: unique([...existing.allowedChanges, ...item.allowedChanges]),
      forbiddenChanges: unique([...existing.forbiddenChanges, ...item.forbiddenChanges]),
      updatedAt: now,
    }) : item);
  }
  return validateLockedAssetCollection([...byKey.values()]);
}

export function validateLockedAsset(asset) {
  if (!asset || asset.schemaVersion !== '6.0') {
    throw Object.assign(new Error('Locked Asset Schema 版本无效。'), { code: 'LOCKED_ASSET_INVALID' });
  }
  for (const field of ['id', 'projectId', 'name', 'rule']) {
    if (!clean(asset[field])) {
      throw Object.assign(new Error(`Locked Asset ${field} 不能为空。`), { code: 'LOCKED_ASSET_INVALID' });
    }
  }
  if (!LOCKED_ASSET_TYPES.includes(asset.type) || !LOCKED_ASSET_PRIORITIES.includes(asset.priority)) {
    throw Object.assign(new Error('Locked Asset 类型或优先级无效。'), { code: 'LOCKED_ASSET_INVALID' });
  }
  for (const field of ['sourceFile', 'thumbnail']) {
    if (!asset[field]) continue;
    const normalized = String(asset[field]).replaceAll('\\', '/');
    if (path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized) || normalized.split('/').includes('..')) {
      throw Object.assign(new Error(`Locked Asset ${field} 必须是项目内相对路径。`), { code: 'LOCKED_ASSET_PATH_INVALID' });
    }
  }
  if (!Array.isArray(asset.allowedChanges) || !Array.isArray(asset.forbiddenChanges)) {
    throw Object.assign(new Error('Locked Asset 变更规则必须为数组。'), { code: 'LOCKED_ASSET_INVALID' });
  }
  if (asset.priority === 'critical' && asset.forbiddenChanges.length === 0) {
    throw Object.assign(new Error('critical Locked Asset 必须声明 forbiddenChanges。'), { code: 'CRITICAL_LOCK_RULE_MISSING' });
  }
  const allowed = new Set(unique(asset.allowedChanges).map((item) => item.toLowerCase()));
  if (unique(asset.forbiddenChanges).some((item) => allowed.has(item.toLowerCase()))) {
    throw Object.assign(new Error('Locked Asset 的 allowedChanges 与 forbiddenChanges 冲突。'), { code: 'LOCKED_ASSET_RULE_CONFLICT' });
  }
  if (!['project_visual_context', 'creative_understanding', 'user_confirmed'].includes(asset.evidence?.source)
    || !clean(asset.evidence?.description)) {
    throw Object.assign(new Error('Locked Asset 必须具有可追溯证据。'), { code: 'LOCKED_ASSET_EVIDENCE_MISSING' });
  }
  return asset;
}

export function validateLockedAssetCollection(assets) {
  if (!Array.isArray(assets)) {
    throw Object.assign(new Error('Locked Assets 必须为数组。'), { code: 'LOCKED_ASSET_INVALID' });
  }
  const ids = new Set();
  for (const asset of assets) {
    validateLockedAsset(asset);
    if (ids.has(asset.id)) {
      throw Object.assign(new Error(`Locked Asset ID 重复：${asset.id}`), { code: 'LOCKED_ASSET_INVALID' });
    }
    ids.add(asset.id);
  }
  return assets;
}
