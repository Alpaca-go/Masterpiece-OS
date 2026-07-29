import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  compileDeliverableGenerationBlueprint,
  getDeliverablePromptTemplate,
  validateDeliverableGenerationBlueprint,
} from '../../packages/image-generation-runtime/src/prompt-templates/deliverable-template-system.js';

function visualMemory() {
  return {
    schema_version: '1.0',
    id: 'visual-memory-1',
    brand_core: {
      industry: '品牌餐饮',
      positioning: '面向城市生活的当代东方体验',
      mood: ['克制', '温暖'],
      core_temperament: ['清晰', '有触感'],
    },
    visual_dna: {
      colors: ['暖白为环境基底', '深灰为结构色', '铜色为强调色'],
      materials: ['未涂布纸', '拉丝金属'],
      photography: ['自然侧光', '真实商业尺度'],
      composition: ['单一焦点'],
      graphic_language: ['模块化留白', '细线框架'],
    },
    visual_problems: ['旧方案依赖物料拼贴'],
    visual_opportunities: ['建立跨触点的材质节奏'],
    generation_rules: {
      preserve: ['保留 Logo'],
      transform: ['重建构图'],
      avoid: ['禁止复制旧 VI'],
    },
  };
}

for (const [deliverableType, templateId, source] of [
  ['interior_scene', 'interior', 'interior.md'],
  ['packaging_render', 'packaging', 'packaging.md'],
  ['brand_poster', 'poster', 'poster.md'],
]) {
  test(`${templateId} template compiles Visual Memory into a complete Generation Blueprint`, () => {
    const template = getDeliverablePromptTemplate(deliverableType);
    assert.equal(template.templateId, templateId);
    const blueprint = compileDeliverableGenerationBlueprint({
      visualMemory: visualMemory(),
      deliverableType,
      userIntent: `生成${templateId}商业提案图`,
      referenceAssets: Array.from({ length: 7 }, (_, index) => ({
        assetId: `asset-${index}`,
        role: index === 0 ? 'locked' : 'style',
        rationale: 'approved reference pool',
      })),
    });
    assert.equal(validateDeliverableGenerationBlueprint(blueprint), blueprint);
    assert.equal(blueprint.templateId, templateId);
    assert.equal(blueprint.visualMemoryId, 'visual-memory-1');
    assert.match(blueprint.templateSource, new RegExp(`${source}$`));
    assert.equal(blueprint.referenceAssets.length, 5);
    assert.ok(blueprint.color.usageRule.includes('10%'));
    for (const field of [
      'visualDirection', 'material', 'composition', 'photography', 'negativeRules',
    ]) assert.ok(blueprint[field].length > 0, field);
  });
}

test('Markdown templates expose the required eight-section contract', () => {
  for (const filename of ['interior.md', 'packaging.md', 'poster.md']) {
    const markdown = fs.readFileSync(
      new URL(`../../prompt-templates/image-generation/${filename}`, import.meta.url),
      'utf8',
    );
    for (const heading of [
      '## 1. Task Definition',
      '## 2. Brand Context',
      '## 3. Visual Mechanism',
      '## 4. Color System',
      '## 5. Material System',
      '## 6. Composition / Structure',
      '## 7. Photography Direction',
      '## 8. Negative Rules',
    ]) assert.ok(markdown.includes(heading), `${filename}: ${heading}`);
  }
});

test('Deliverable Generation Blueprint schema is closed and versioned', () => {
  const schema = JSON.parse(fs.readFileSync(
    new URL('../../schemas/image-generation/deliverable-generation-blueprint.schema.json', import.meta.url),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.templateVersion.const, '1.0.0');
  assert.equal(schema.properties.referenceAssets.maxItems, 5);
});

test('template system rejects unsupported deliverables and missing Visual Memory', () => {
  assert.throws(
    () => getDeliverablePromptTemplate('free_concept'),
    (error) => error.code === 'DELIVERABLE_TEMPLATE_UNSUPPORTED',
  );
  assert.throws(
    () => compileDeliverableGenerationBlueprint({ deliverableType: 'interior_scene' }),
    (error) => error.code === 'VISUAL_MEMORY_REQUIRED',
  );
});
