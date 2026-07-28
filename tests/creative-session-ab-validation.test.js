import test from 'node:test';
import assert from 'node:assert/strict';
import { compileGenerationPromptSnapshot } from '../packages/creative-production-runtime/src/generation-prompt.js';

const style = {
  id: 'style-ab', version: '1.0.0', status: 'confirmed',
  promptComponents: { required: ['品牌身份清晰'], negative: ['旧 VI 平铺', '物料合集'] },
  forbiddenVariations: ['复制旧版式'],
  compositionSystem: { hierarchy: ['单一视觉焦点'], focalPointRules: ['完整主体'] },
  materialAndTexture: { materials: ['真实材质'] },
  lightingSystem: { type: '自然光', contrast: '中等对比' },
  typographyCompatibility: ['克制排版'],
  graphicLanguage: { coreMotifs: ['新视觉语言'] },
};

const canon = {
  id: 'canon-ab', version: '1.0.0', status: 'confirmed',
  primaryCanonImageId: 'canon-primary',
  sharedRules: ['统一色彩、材质与构图语言'],
  variationRules: ['按单一交付任务调整场景'],
  canonImages: [{
    id: 'canon-primary', type: 'brand_hero', priority: 'primary',
    role: 'Primary Canon', imagePath: 'anchors/candidates/primary/image.webp',
  }],
};

const projects = {
  feng: {
    name: '冯烫烫',
    direction: {
      id: 'direction-feng',
      version: '1.0.0',
      status: 'ready',
      projectTransformation: '从廉价市井 VI 陈列升级为克制、真实、可进入的现代川味小馆体验',
      oldVisualProblems: ['高饱和纯红、牛剪影与无网格物料堆叠'],
      designStrategy: '以深朱红、米白、原木、真实烟火摄影和清晰网格建立跨触点系统',
      primaryConcept: '受控热度与真实烟火',
      visualKeywords: ['深朱红', '米白留白', '原木', '真实烟火'],
      thingsToRemove: ['停止牛剪影、纯红满版、旧 VI 拼贴与光面塑料感'],
      thingsToKeep: ['保留冯烫烫品牌名、原 Logo 与跷脚牛肉品类'],
      colorStrategy: '米白为底，深朱红只作身份强调',
      materialStrategy: '原木、粗陶、未涂布纸与哑光金属',
      compositionStrategy: '单一焦点、明确网格与足够留白',
      photographyStrategy: '侧逆光表现热气、汤汁与真实用餐动作',
      spaceStrategy: '以开放后厨和共享餐桌建立完整动线，禁止 Logo 墙替代空间',
      packagingStrategy: '以原纸、单色印刷和信息带建立新包装系统',
      posterStrategy: '用食物热气与真实动作建立单一事件叙事',
      generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列'],
    },
  },
  jiuzhou: {
    name: '九州美学',
    direction: {
      id: 'direction-jiuzhou',
      version: '1.0.0',
      status: 'ready',
      projectTransformation: '从把 Logo 放到器物上的表层新中式，升级为可零售、可空间化的器物美学系统',
      oldVisualProblems: ['字体家族过多、红黑金冲突、包装只放标志且缺少距离层级'],
      designStrategy: '以月白、黛蓝、赭石、青瓷与木作建立克制的观看距离和器物叙事',
      primaryConcept: '器物之间的静默秩序',
      visualKeywords: ['月白', '黛蓝', '青瓷', '木作', '中线留白'],
      thingsToRemove: ['停止红黑金混用、西文副标放大和 Logo 贴附式应用'],
      thingsToKeep: ['保留九州美学中文 Logo、青瓷与木作材质证据'],
      colorStrategy: '月白 60%、黛蓝 30%、赭石 10%，辅以青瓷绿和暖木色',
      materialStrategy: '青瓷釉面、温润木作、棉纸与亚麻',
      compositionStrategy: '中线秩序、观看距离分级和大面积留白',
      photographyStrategy: '柔和侧光刻画器物表面与空间静谧感',
      spaceStrategy: '用器物陈列节奏、木作尺度与留白建立慢生活空间体验',
      packagingStrategy: '按近中远观看距离重排信息，青瓷纹样只作统一超级图形',
      posterStrategy: '用单件器物与光影关系建立视觉叙事，禁止 Logo 加产品照片模板',
      generationRules: ['禁止复制旧 VI、旧海报换内容、旧包装换皮和旧空间重新排列'],
    },
  },
};

const taskCases = [
  {
    task: '生成一张升级后的店内装修效果图',
    outputType: 'interior_scene',
    responsibility: /完整室内空间/,
    strategyField: 'spaceStrategy',
    legacyRisk: 'Logo墙+VI展示',
  },
  {
    task: '生成一张升级后的包装渲染图',
    outputType: 'packaging_render',
    responsibility: /真实包装渲染/,
    strategyField: 'packagingStrategy',
    legacyRisk: '旧包装换材质',
  },
  {
    task: '生成一张能建立新方向的品牌海报',
    outputType: 'brand_poster',
    responsibility: /单一主画面/,
    strategyField: 'posterStrategy',
    legacyRisk: 'Logo+产品照片',
  },
];

function locksFor(project) {
  return [{
    id: `logo-${project.direction.id}`,
    type: 'logo',
    priority: 'critical',
    sourceAssetId: `asset-${project.direction.id}`,
    sourceFile: `assets/${project.direction.id}.png`,
    rule: `${project.name} 品牌名与原 Logo 必须保持身份准确`,
    forbiddenChanges: ['不得重绘 Logo'],
  }];
}

function scoreContract(snapshot, project, taskCase) {
  const prompt = snapshot.instruction.finalPrompt;
  return {
    brandAccuracy: prompt.includes(project.name) && snapshot.selectedReferences.length === 1 ? 5 : 1,
    reconstruction: prompt.includes(project.direction.projectTransformation)
      && prompt.includes('旧包装换皮') ? 5 : 1,
    analysisImplementation: prompt.includes(project.direction[taskCase.strategyField])
      && prompt.includes(project.direction.thingsToRemove[0]) ? 5 : 1,
    designCompleteness: taskCase.responsibility.test(snapshot.instruction.outputResponsibility)
      && prompt.includes('禁止拼贴、禁止多格合集') ? 5 : 1,
  };
}

for (const project of Object.values(projects)) {
  for (const taskCase of taskCases) {
    test(`v18.1 offline A/B: ${project.name} ${taskCase.outputType} reaches all four contract targets`, () => {
      const snapshot = compileGenerationPromptSnapshot({
        projectId: `project-${project.direction.id}`,
        sessionId: `session-${project.direction.id}`,
        userRequest: taskCase.task,
        outputType: taskCase.outputType,
        creativeDirection: project.direction,
        styleProfile: style,
        visualCanon: canon,
        lockedAssets: locksFor(project),
      }, '2026-07-28T00:00:00.000Z');
      const scores = scoreContract(snapshot, project, taskCase);
      assert.ok(Object.values(scores).every((score) => score >= 4), JSON.stringify(scores));
      assert.match(taskCase.legacyRisk, /Logo|旧包装|产品照片/u);
      assert.ok(snapshot.selectedReferences.length <= 2);
      assert.deepEqual(snapshot.selectedReferences.map((reference) => reference.role), [
        'identity_reference',
      ]);
    });
  }
}

test('offline A/B baseline exposes the legacy spatial mismatch that v18.1 blocks', () => {
  const legacyInteriorPrompt = '品牌 VI 系统展示，包含菜单、工牌、包装、墙面和导视的多格物料合集';
  const candidate = compileGenerationPromptSnapshot({
    projectId: 'project-feng',
    sessionId: 'session-feng',
    userRequest: '生成一张升级后的店内装修效果图',
    outputType: 'interior_scene',
    creativeDirection: projects.feng.direction,
    styleProfile: style,
    visualCanon: canon,
    lockedAssets: locksFor(projects.feng),
  });
  assert.match(legacyInteriorPrompt, /VI 系统展示|多格物料合集/);
  assert.doesNotMatch(candidate.instruction.finalPrompt, /包含菜单、工牌、包装/);
  assert.match(candidate.instruction.outputResponsibility, /完整室内空间/);
  assert.match(candidate.instruction.finalPrompt, /开放后厨和共享餐桌/);
});
