import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileLockedAssets,
  validateLockedAsset,
} from '@masterpiece/creative-production-runtime/locked-assets.js';

const NOW = '2026-07-28T00:00:00.000Z';

function visual(projectId, overrides = {}) {
  return {
    projectId,
    identity: { brandName: overrides.brandName ?? '示例品牌' },
    lockedAssets: {
      logoLocked: overrides.logoLocked ?? true,
      logoAssetIds: overrides.logoAssetIds ?? ['logo-1'],
      lockedFacts: overrides.lockedFacts ?? [],
    },
    products: { coreProducts: overrides.products ?? [] },
    packaging: {
      status: overrides.packagingStatus ?? 'unknown',
      structures: overrides.structures ?? [],
    },
  };
}

test('九州美学：只锁定身份与明确事实，不把所有旧视觉列为 Locked Assets', () => {
  const assets = compileLockedAssets({
    projectId: 'jiuzhou',
    visualContext: visual('jiuzhou', {
      brandName: '九州美学',
      lockedFacts: ['主色金色不可改变'],
      products: ['东方美学服务'],
    }),
    understanding: {
      identityLocks: ['品牌标准字必须保持'],
      valuableAssets: ['旧海报的留白节奏', '旧 VI 合集'],
    },
    sourceAssets: [{ id: 'logo-1', name: '九州美学 Logo.png', sourceFile: 'assets/logo.png' }],
  }, NOW);
  assert.ok(assets.some((asset) => asset.type === 'brand_name' && asset.name === '九州美学'));
  assert.ok(assets.some((asset) => asset.type === 'logo' && asset.sourceFile === 'assets/logo.png'));
  assert.ok(assets.some((asset) => asset.type === 'product_color'));
  assert.ok(!assets.some((asset) => asset.name.includes('旧海报') || asset.name.includes('VI 合集')));
  assert.ok(assets.filter((asset) => asset.priority === 'critical')
    .every((asset) => asset.forbiddenChanges.length > 0));
});

test('冯烫烫：只有 confirmed 包装结构进入 critical lock', () => {
  const confirmed = compileLockedAssets({
    projectId: 'feng',
    visualContext: visual('feng', {
      brandName: '冯烫烫',
      products: ['热卤烫菜'],
      packagingStatus: 'confirmed',
      structures: ['圆形外卖碗'],
    }),
  }, NOW);
  assert.ok(confirmed.some((asset) =>
    asset.type === 'packaging_structure'
    && asset.name === '圆形外卖碗'
    && asset.priority === 'critical'));

  const observed = compileLockedAssets({
    projectId: 'feng-observed',
    visualContext: visual('feng-observed', {
      packagingStatus: 'legacy_observed',
      structures: ['旧纸袋'],
    }),
  }, NOW);
  assert.ok(!observed.some((asset) => asset.name === '旧纸袋'));
});

test('插画项目：用户确认的核心符号可带允许变化边界', () => {
  const assets = compileLockedAssets({
    projectId: 'illustration',
    visualContext: visual('illustration', { logoLocked: false, logoAssetIds: [] }),
    explicitAssets: [{
      type: 'core_symbol',
      name: '山海鸟',
      rule: '山海鸟轮廓必须可识别。',
      priority: 'high',
      allowedChanges: ['可调整纹理密度'],
      forbiddenChanges: ['不得改变头部与翅膀比例'],
    }],
  }, NOW);
  const symbol = assets.find((asset) => asset.type === 'core_symbol');
  assert.deepEqual(symbol?.allowedChanges, ['可调整纹理密度']);
  assert.equal(symbol?.evidence.source, 'user_confirmed');
});

test('Locked Asset validation blocks path escapes and conflicting change rules', () => {
  const base = {
    schemaVersion: '6.0',
    id: 'locked-1',
    projectId: 'project-1',
    type: 'logo',
    name: 'Logo',
    rule: 'Logo 不得修改',
    priority: 'critical',
    allowedChanges: [],
    forbiddenChanges: ['不得重绘'],
    evidence: { source: 'user_confirmed', description: '用户确认' },
    createdAt: NOW,
    updatedAt: NOW,
  };
  assert.throws(() => validateLockedAsset({ ...base, sourceFile: '../outside.png' }), {
    code: 'LOCKED_ASSET_PATH_INVALID',
  });
  assert.throws(() => validateLockedAsset({
    ...base,
    allowedChanges: ['允许旋转'],
    forbiddenChanges: ['允许旋转'],
  }), { code: 'LOCKED_ASSET_RULE_CONFLICT' });
});

test('Locked Asset JSON Schema is closed and exposes all first-stage types', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), 'schemas/creative-production/locked-asset.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.type.enum.length, 10);
  assert.deepEqual(schema.properties.priority.enum, ['critical', 'high', 'medium', 'low']);
});
