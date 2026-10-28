import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateSpatialSemantics as validate,
  normalizeSpatialFunctionalValue as normalize
} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';

// Real FTT (冯烫烫) spatial fields from the preserved 2026-10-26 analysis packet.
// They are transcribed here as a fixture; nothing is read from a machine-local project.
const FTT_SPATIAL = {
  functionalNetwork: [
    '顾客进入→品牌标识吸引→菜单查看→点餐→等候→取餐→就餐→离开',
    '员工动线：厨房→出餐口→清洁区，与顾客动线最小交叉',
    '外带动线：点餐→等候→取餐→离开，与堂食区域部分分离'
  ],
  mustBeVisible: [
    '入口处的品牌标识和菜单',
    '点餐区的清晰指示',
    '就餐区的舒适座椅和桌面',
    '厨房区域的部分可见性',
    '品牌色彩系统的层次化应用'
  ],
  functionalRelationships: [
    '入口区与点餐区直接相连，视觉引导清晰',
    '点餐区与等候区相邻，便于顾客停留',
    '等候区与就餐区部分分隔，减少干扰',
    '厨房区与出餐口紧密相连，与就餐区部分可见',
    '外带取餐区与堂食就餐区部分分离，减少交叉'
  ],
  sceneProgram: [
    '品牌入口：标识、菜单、吸引力',
    '点餐区：自助点餐机、人工点餐台、菜单展示',
    '等候区：座位、品牌影像、取餐提示',
    '就餐区：桌椅、照明、品牌元素',
    '厨房区：部分开放、烹饪展示',
    '外带区：取餐台、包装区'
  ]
};

test('FTT packet: a walking route that passes an entrance sign is a functional flow, not a decorative identity', () => {
  const result = validate(FTT_SPATIAL);
  assert.deepEqual(result.findings, []);
  assert.equal(result.status, 'pass');
});

test('FTT packet: a located sign plus menu at the entrance is a visibility requirement', () => {
  const result = validate({ mustBeVisible: ['入口处的品牌标识和菜单'] });
  assert.equal(result.status, 'pass');
});

test('FTT packet: the route keeps its functional steps when the wayfinding step is normalized away', () => {
  const value = normalize('顾客进入→品牌标识吸引→菜单查看→点餐→等候→取餐→就餐→离开', 'functionalNetwork');
  assert.equal(typeof value, 'string');
  assert.ok(!/标识/u.test(value as string), `identity step must be removed: ${value}`);
  assert.ok((value as string).includes('点餐') && (value as string).includes('离开'));
  assert.equal(validate({ functionalNetwork: [value as string] }).status, 'pass');
});

// Safety matrix: the wayfinding exception must not authorize decorative identity.
for (const [field, value] of [
  ['mustBeVisible', 'Logo'],
  ['mustBeVisible', '品牌标识'],
  ['mustBeVisible', '墙面品牌标识作为主视觉'],
  ['mustBeVisible', '整墙品牌标识'],
  ['mustBeVisible', '品牌标识放大作为入口主视觉'],
  ['functionalNetwork', '品牌标识'],
  ['functionalNetwork', 'Logo吸引顾客→品牌主视觉→品牌墙'],
  ['functionalNetwork', '品牌标识吸引→顾客进入'],
  ['operationConstraints', '入口处的品牌标识'],
  ['requiredSpatialElements', '品牌标识']
] as const) {
  test(`safety: ${field} keeps blocking decorative identity: ${value}`, () => {
    assert.equal(validate({ [field]: [value] }).status, 'block');
  });
}

test('safety: a plain functional route without identity is unaffected', () => {
  assert.equal(validate({ functionalNetwork: ['顾客进入→点餐→取餐→就餐→离开'] }).status, 'pass');
});
