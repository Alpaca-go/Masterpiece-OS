import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compileDeliverableGenerationBlueprint,
} from '../../packages/image-generation-runtime/src/prompt-templates/deliverable-template-system.js';
import {
  PROMPT_TEMPLATE_COMPILER_VERSION,
  compilePromptTemplate,
  verifyPromptTemplateFingerprint,
} from '../../packages/image-generation-runtime/src/prompt-templates/prompt-template-compiler.js';

const memory = {
  schema_version: '1.0',
  id: 'memory-1',
  brand_core: {
    industry: '美学服务',
    positioning: '专业、克制的当代美学品牌',
    mood: ['安静', '准确'],
    core_temperament: ['专业'],
  },
  visual_dna: {
    colors: ['暖白 70%', '深灰 20%', '铜色 10%'],
    materials: ['矿物涂料', '拉丝金属'],
    photography: ['自然侧光'],
    composition: ['清晰纵深'],
    graphic_language: ['细线框架'],
  },
  visual_problems: ['旧方案过度装饰'],
  visual_opportunities: ['建立空间秩序'],
  generation_rules: {
    preserve: ['保留 Logo'],
    transform: ['重建空间'],
    avoid: ['禁止复制旧空间'],
  },
};

const canon = {
  schemaVersion: '6.0',
  id: 'canon-1',
  version: '1.0.0',
  status: 'confirmed',
  visualDNA: {
    brandKeywords: ['当代东方'],
    moodAttributes: ['克制'],
    industryAttributes: ['美学服务'],
    coreVisualMetaphor: '以空间路径承载审美判断',
  },
  colorSystem: {
    primary: ['暖白'],
    secondary: ['深灰'],
    accent: ['铜色'],
    forbidden: ['荧光色'],
  },
  materialSystem: {
    materialLanguage: ['矿物涂料'],
    surfaceTextures: ['哑光'],
    craftRules: ['细部收口准确'],
  },
  lightingSystem: {
    direction: ['自然侧光'],
    contrast: ['中低对比'],
    photographyAtmosphere: ['安静'],
  },
  compositionSystem: {
    compositionMethods: ['清晰纵深'],
    gridRules: ['模块网格'],
    negativeSpaceRules: ['保留呼吸区'],
  },
  sharedRules: ['保持细线框架'],
};

test('Prompt Compiler v2 converts a Blueprint into a deterministic professional prompt', () => {
  const blueprint = compileDeliverableGenerationBlueprint({
    visualMemory: memory,
    visualCanon: canon,
    deliverableType: 'interior_scene',
    userIntent: '生成九州美学店内效果图',
    referenceAssets: [{
      assetId: 'logo-1',
      role: 'identity_reference',
      rationale: '保留品牌身份',
    }],
  });
  const input = {
    blueprint,
    visualMemory: memory,
    visualCanon: canon,
    modelConstraints: {
      preserve: ['Logo 不得重绘'],
      executionRules: ['一个完整连续空间'],
      textSafety: ['不生成随机小字'],
      outputSpec: ['单张 16:9 图片'],
    },
  };
  const first = compilePromptTemplate(input);
  const second = compilePromptTemplate(input);
  assert.deepEqual(first, second);
  assert.equal(first.compilerVersion, PROMPT_TEMPLATE_COMPILER_VERSION);
  assert.match(first.promptVersion, /interior@2\.0\.0/u);
  assert.match(first.promptFingerprint, /^[a-f0-9]{64}$/u);
  for (const heading of [
    '## 1. Task Definition',
    '## 2. Brand Context',
    '## 3. Visual Mechanism',
    '## 4. Color System',
    '## 5. Material System',
    '## 6. Composition / Structure',
    '## 7. Photography Direction',
    '## 8. Asset Template / Reference Conditioning',
    '## 9. Negative Rules',
    '## 10. Model Execution Constraints',
  ]) assert.ok(first.finalPrompt.includes(heading), heading);
  assert.equal(first.promptSourceMap.sections.length, 10);
  assert.equal(verifyPromptTemplateFingerprint({
    blueprint,
    promptVersion: first.promptVersion,
    finalPrompt: first.finalPrompt,
    promptSourceMap: first.promptSourceMap,
    promptFingerprint: first.promptFingerprint,
  }), true);
  assert.equal(verifyPromptTemplateFingerprint({
    blueprint,
    promptVersion: first.promptVersion,
    finalPrompt: `${first.finalPrompt}\nchanged`,
    promptSourceMap: first.promptSourceMap,
    promptFingerprint: first.promptFingerprint,
  }), false);
});

test('Prompt Compiler rejects a Blueprint bound to stale Visual Memory', () => {
  const blueprint = compileDeliverableGenerationBlueprint({
    visualMemory: memory,
    visualCanon: canon,
    deliverableType: 'brand_poster',
  });
  assert.throws(
    () => compilePromptTemplate({
      blueprint,
      visualMemory: { ...memory, id: 'memory-2' },
      visualCanon: canon,
    }),
    (error) => error.code === 'PROMPT_TEMPLATE_VISUAL_MEMORY_STALE',
  );
});

test('Prompt Compiler rejects a Blueprint bound to stale Visual Canon', () => {
  const blueprint = compileDeliverableGenerationBlueprint({
    visualMemory: memory,
    visualCanon: canon,
    deliverableType: 'packaging_render',
  });
  assert.throws(
    () => compilePromptTemplate({
      blueprint,
      visualMemory: memory,
      visualCanon: { ...canon, version: '2.0.0' },
    }),
    (error) => error.code === 'PROMPT_TEMPLATE_VISUAL_CANON_STALE',
  );
});
