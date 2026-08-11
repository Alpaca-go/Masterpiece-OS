import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createReferenceAnchorService } from '@masterpiece/runtime-core/application/reference-anchor-service.ts';
import {
  ABSTRACT_GRAPHIC_MECHANISM,
  BRIEF_MAX_LENGTH,
  DEFAULT_ANCHOR_DOMAIN_PROFILE,
  MAX_RULES_PER_CATEGORY,
  abstractGraphicRule,
  adaptLegacyReferenceResultToStyleCapsule,
  classifyProjectFacts,
  compileAnchorBrief,
  compileCapsuleMarkdown,
  compileReferenceStyleCapsule,
  dedupeBriefRules,
  detectReferenceIdentityLeaks,
  detectReferenceSignatureReentry,
  filterStyleCapsuleForTask,
  mergeCurrentProjectContext,
  normalizeAspectRatio,
  validateAnchorBrief,
  validateReferenceStyleCapsule
} from '@masterpiece/runtime-core/application/reference-anchor-core.ts';
import type {
  DocumentVisualContext,
  ProjectVisualContext,
  PublicSettings,
  ReferenceCurrentProjectContext,
  ReferenceStyleProfile
} from '@masterpiece/runtime-core/application-contracts.ts';

// ── 共享 fixture ──

function buildVisualContext(): ProjectVisualContext {
  return {
    schemaVersion: '1.0',
    projectId: 'project-current',
    identity: { brandName: '九州美学', projectName: '九州美学品牌升级', industry: '文创礼品' },
    lockedAssets: { logoLocked: true, logoAssetIds: ['asset-logo-1'], lockedFacts: ['Logo 为篆书印章造型，不可重绘'] },
    products: { coreProducts: ['节气茶礼盒', '山水丝巾'] },
    businessTouchpoints: { packaging: ['礼盒包装'], viApplications: ['名片'], spatial: [], digital: ['小程序首页'] },
    packaging: { status: 'confirmed' }
  } as unknown as ProjectVisualContext;
}

function buildDocumentContext(): DocumentVisualContext {
  return {
    brandName: '观夏东方',
    industry: '香氛家居',
    products: ['昆仑煮雪香薰'],
    targetAudience: ['25-40 岁新中产'],
    requiredTouchpoints: ['电商详情页'],
    lockedFacts: ['价格带 300-800 元'],
    unknownFields: [],
    evidence: []
  } as unknown as DocumentVisualContext;
}

function buildReferenceStyle(overrides: Partial<ReferenceStyleProfile> = {}): ReferenceStyleProfile {
  const rule = (text: string, confidence = 0.9) => ({ rule: text, confidence });
  return {
    schemaVersion: '1.0',
    overallTemperament: '克制的东方现代主义',
    colorSystem: [rule('以米白为底、朱砂红为唯一强调色，强调色面积不超过 10%'), rule('大面积留白承载呼吸感', 0.85)],
    compositionSystem: [rule('竖向中轴构图，信息沿中线对称展开')],
    graphicLanguage: [rule('用细线描摹的山形轮廓做贯穿性图形母题')],
    typographySystem: [rule('宋体标题与无衬线正文形成级差')],
    materialSystem: [rule('哑光纸面质感，避免高反光')],
    lightingSystem: [rule('顶光柔和过渡')],
    photographySystem: [rule('产品置于素色织物上俯拍')],
    packagingPresentation: [rule('包装以套盒抽屉结构呈现')],
    posterPresentation: [rule('海报保留三分之一净空')],
    viExtensionSystem: [rule('通过强调色位置变化区分系列')],
    excludedIdentityTerms: ['观夏', 'To Summer'],
    sourceAssetIds: ['ref-1', 'ref-2'],
    ...overrides
  } as unknown as ReferenceStyleProfile;
}

// ── §17.1 参考身份隔离（确定性兜底）──

test('detectReferenceIdentityLeaks blocks reference brand terms but tolerates current-project terms', () => {
  const leaks = detectReferenceIdentityLeaks(
    ['继承观夏的留白节奏', '大面积米白底色'],
    '为九州美学生成主视觉',
    ['观夏', 'To Summer', '九州美学'],
    ['九州美学', '文创礼品']
  );
  assert.equal(leaks.length, 1);
  assert.equal(leaks[0]!.code, 'REFERENCE_BRAND_IDENTITY_LEAK');
  assert.match(leaks[0]!.message, /观夏/u);
});

test('detectReferenceIdentityLeaks catches logo copy / slogan / signature graphic directives', () => {
  const leaks = detectReferenceIdentityLeaks(
    ['直接使用参考方案的 Logo 作为角标', '沿用参考品牌的 Slogan 文案', '照搬参考方案的山形图案作为主图形'],
    '',
    [],
    []
  );
  const codes = leaks.map((item) => item.code).sort();
  assert.deepEqual(codes, ['REFERENCE_LOGO_DIRECT_COPY', 'REFERENCE_SIGNATURE_GRAPHIC_DIRECT_COPY', 'REFERENCE_SLOGAN_LEAK']);
});

// ── §17.2 合并视图（§11 文档不得覆盖当前项目身份）──

test('mergeCurrentProjectContext keeps current-project identity and records conflicts', () => {
  const merged = mergeCurrentProjectContext({
    visual: buildVisualContext(),
    document: buildDocumentContext()
  } as ReferenceCurrentProjectContext);
  assert.equal(merged.brandName, '九州美学');
  assert.equal(merged.industry, '文创礼品');
  assert.deepEqual(merged.coreProducts, ['节气茶礼盒', '山水丝巾']);
  assert.ok(merged.conflicts.some((item) => item.includes('观夏东方') && item.includes('以当前项目为准')));
  assert.ok(merged.conflicts.some((item) => item.includes('香氛家居')));
  assert.ok(merged.lockedFacts.includes('Logo 为篆书印章造型，不可重绘'));
  assert.ok(merged.lockedFacts.includes('价格带 300-800 元'));
  assert.ok(merged.businessTouchpoints.includes('电商详情页'));
});

test('mergeCurrentProjectContext lets document fill gaps only when visual context is empty', () => {
  const visual = buildVisualContext();
  (visual as unknown as { identity: { industry: string } }).identity.industry = '';
  (visual as unknown as { products: { coreProducts: string[] } }).products.coreProducts = [];
  const merged = mergeCurrentProjectContext({ visual, document: buildDocumentContext() } as ReferenceCurrentProjectContext);
  assert.equal(merged.industry, '香氛家居');
  assert.deepEqual(merged.coreProducts, ['昆仑煮雪香薰']);
});

// ── §17.3 胶囊质量（每类 ≤5 条、禁止项齐全、Schema 校验）──

test('compileReferenceStyleCapsule caps rules per category and fills prohibited identity', () => {
  const manyRules = Array.from({ length: 12 }, (_, index) => ({ rule: `色彩规则长描述第 ${index + 1} 条`, confidence: 1 - index * 0.05 }));
  const { capsule, warnings } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle({ colorSystem: manyRules } as unknown as Partial<ReferenceStyleProfile>)
  });
  assert.ok(capsule.inheritedStyle.color.length <= MAX_RULES_PER_CATEGORY);
  assert.equal(capsule.inheritedStyle.color[0], '色彩规则长描述第 1 条');
  assert.deepEqual(capsule.prohibitedReferenceIdentity.brandNames, ['观夏', 'To Summer']);
  assert.ok(capsule.prohibitedReferenceIdentity.logos.length);
  assert.ok(capsule.anchorGoal.includes('九州美学'));
  assert.ok(warnings.every((warning) => typeof warning.code === 'string'));
  const validation = validateReferenceStyleCapsule(capsule);
  assert.equal(validation.valid, true, validation.errors.join(';'));
});

test('validateReferenceStyleCapsule rejects category overflow and missing fields', () => {
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  });
  const broken = structuredClone(capsule) as unknown as { inheritedStyle: { color: string[] }; anchorGoal: string };
  broken.inheritedStyle.color = Array.from({ length: MAX_RULES_PER_CATEGORY + 1 }, (_, index) => `超量规则 ${index}`);
  broken.anchorGoal = '';
  const validation = validateReferenceStyleCapsule(broken);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.includes('inheritedStyle.color')));
  assert.ok(validation.errors.some((item) => item.includes('anchorGoal')));
});

// ── §17.4 Anchor Brief（七块齐全、无内部 ID、长度受控）──

test('compileAnchorBrief produces all 7 blocks and passes validation', () => {
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle(),
    userPreference: '继承它的留白节奏',
    userAvoidance: ['不要它的插画风格']
  });
  const brief = compileAnchorBrief(capsule);
  for (const block of ['## A.', '## B.', '## C.', '## D.', '## E.', '## F.', '## G.']) {
    assert.ok(brief.includes(block), `缺少区块 ${block}`);
  }
  assert.ok(brief.includes('九州美学'));
  assert.ok(brief.includes('禁止出现参考品牌的名称与文字：观夏、To Summer'));
  assert.ok(brief.includes('禁止：不要它的插画风格'));
  const validation = validateAnchorBrief(brief);
  assert.equal(validation.valid, true, validation.errors.join(';'));
  assert.ok(validation.lengthChars <= BRIEF_MAX_LENGTH * 2);
  // 胶囊 Markdown 六节齐全
  const capsuleMd = compileCapsuleMarkdown(capsule);
  for (const section of ['## 1. 当前项目', '## 2. 本次主要继承', '## 3. 当前项目必须重建', '## 4. 禁止复制', '## 5. Anchor Image 目标', '## 6. 人工注意事项']) {
    assert.ok(capsuleMd.includes(section), `胶囊缺少 ${section}`);
  }
});

test('validateAnchorBrief blocks internal UUID / PTM / ranking / quality-score leakage', () => {
  const base = compileAnchorBrief(compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  }).capsule);
  const polluted = `${base}\n内部追踪：3f2c1a08-9b7d-4e21-a5c3-0d9e8f7a6b5c PTM-3 Style Carrier 排名 质量总分 87`;
  const validation = validateAnchorBrief(polluted);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((item) => item.includes('UUID')));
  assert.ok(validation.errors.some((item) => item.includes('PTM')));
  assert.ok(validation.errors.some((item) => item.includes('排名')));
  assert.ok(validation.errors.some((item) => item.includes('质量总分')));
});

// ── §17.5 Legacy 适配器（尽力提取、绝不编造）──

test('adaptLegacyReferenceResultToStyleCapsule extracts old reconstruction without fabrication', () => {
  const capsule = adaptLegacyReferenceResultToStyleCapsule({
    run: { id: 'legacy-run-1', preference: '延续留白' },
    reconstruction: {
      currentProjectProfile: {
        projectId: 'project-legacy',
        brandName: '明济堂',
        industry: '中式健康食品',
        coreProducts: ['八珍糕'],
        lockedAssets: ['明济堂 Logo 印章'],
        businessTouchpoints: ['礼盒']
      },
      referenceStyleProfile: {
        colorSystem: [{ rule: '低饱和青绿主色' }],
        graphicLanguage: [{ translatedMechanism: '细线药草插图网格' }],
        excludedIdentityTerms: ['同仁堂']
      }
    }
  });
  assert.equal(capsule.schemaVersion, '1.0');
  assert.equal(capsule.currentProject.brandName, '明济堂');
  assert.equal(capsule.currentProject.logoLocked, true);
  assert.deepEqual(capsule.inheritedStyle.color, ['低饱和青绿主色']);
  assert.deepEqual(capsule.inheritedStyle.graphicLanguage, ['细线药草插图网格']);
  assert.deepEqual(capsule.prohibitedReferenceIdentity.brandNames, ['同仁堂']);
  assert.ok(capsule.uncertainties.some((item) => item.includes('旧参考转译结果转换')));
  const validation = validateReferenceStyleCapsule(capsule);
  assert.equal(validation.valid, true, validation.errors.join(';'));
});

test('adaptLegacyReferenceResultToStyleCapsule surfaces missing data as uncertainties', () => {
  const capsule = adaptLegacyReferenceResultToStyleCapsule({ run: {}, reconstruction: {} });
  assert.equal(capsule.currentProject.brandName, '');
  assert.ok(capsule.uncertainties.some((item) => item.includes('未找到当前项目品牌名')));
  assert.ok(capsule.uncertainties.some((item) => item.includes('未提取到可继承的色彩或图形规则')));
});

// ── §17.6 服务级：1 次模型调用、缓存重试零调用、决策流转、身份泄漏硬阻断 ──

interface ServiceHarness {
  service: ReturnType<typeof createReferenceAnchorService>;
  modelCalls: () => number;
  removedProjects: string[];
  dataPath: string;
  assetPaths: string[];
  setReferenceStyle: (profile: ReferenceStyleProfile) => void;
  setVisualContext: (context: ProjectVisualContext | null) => void;
}

async function buildHarness(): Promise<ServiceHarness> {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'reference-anchor-test-'));
  const assetPaths: string[] = [];
  for (let index = 0; index < 2; index += 1) {
    const assetPath = path.join(dataPath, `ref-${index + 1}.jpg`);
    await fs.writeFile(assetPath, Buffer.from([0xff, 0xd8, 0xff, 0xdb, index]));
    assetPaths.push(assetPath);
  }
  const settings = {
    defaultDataPath: dataPath,
    defaultProfileId: 'profile-1',
    profiles: [{ id: 'profile-1', isEnabled: true, isDefault: true, hasApiKey: true, displayName: 'Mock', modelId: 'mock-model', baseUrl: 'https://example.test/v1' }]
  } as unknown as PublicSettings;

  let callCount = 0;
  let referenceStyle = buildReferenceStyle();
  let visualContext: ProjectVisualContext | null = buildVisualContext();
  const removedProjects: string[] = [];

  const service = createReferenceAnchorService(() => settings, {
    projects: {
      get: async () => ({ id: 'project-current', projectName: '九州美学品牌升级', brandName: '九州美学', apiProfileId: 'profile-1' }),
      create: async () => ({ id: 'reference-temp-project' }),
      scan: async () => ({}),
      remove: async (projectId: string) => { removedProjects.push(projectId); }
    } as never,
    pipeline: {
      analyzeReferenceStyle: async () => {
        callCount += 1;
        return { value: referenceStyle, provider: 'mock', model: 'mock-model', modelCallCount: 1 };
      },
      cancel: () => undefined
    } as never,
    projectContext: {
      get: async () => {
        if (!visualContext) throw new Error('project-visual-context.json 不存在');
        return visualContext;
      }
    } as never,
    documentContext: {
      getExtracted: async () => buildDocumentContext()
    } as never
  });
  return {
    service,
    modelCalls: () => callCount,
    removedProjects,
    dataPath,
    assetPaths,
    setReferenceStyle: (profile) => { referenceStyle = profile; },
    setVisualContext: (context) => { visualContext = context; }
  };
}

test('service start runs full pipeline with exactly 1 model call and awaits decision', async () => {
  const harness = await buildHarness();
  const result = await harness.service.start({
    currentProjectId: 'project-current',
    referenceAssetPaths: harness.assetPaths,
    apiProfileId: 'profile-1',
    documentRunId: 'doc-run-1',
    preference: '继承留白节奏',
    avoidance: ['不要插画风格']
  });
  assert.equal(result.run.status, 'awaiting_decision');
  assert.equal(result.run.decision, 'pending');
  assert.equal(harness.modelCalls(), 1);
  assert.equal(result.run.modelCallCount, 1);
  // 临时参考项目已清理
  assert.deepEqual(harness.removedProjects, ['reference-temp-project']);
  // 参考图不足 4 张 → 非阻断警告
  assert.ok(result.run.warnings?.some((warning) => warning.code === 'REFERENCE_ASSETS_TOO_FEW'));
  // §6 目录结构与产物
  const root = path.join(harness.dataPath, 'reference-runs', result.run.id);
  for (const relative of [
    'outputs/reference-style-capsule.json',
    'outputs/参考风格胶囊.md',
    'outputs/Anchor-Generation-Brief.md',
    'runtime/run.json',
    'debug/raw-reference-observations.json',
    'debug/validation-details.json',
    'input/current-project-context.json',
    'input/reference-assets/01-ref-1.jpg'
  ]) {
    await fs.access(path.join(root, ...relative.split('/')));
  }
  // 胶囊内容：当前项目身份 + 文档冲突进入 uncertainties
  assert.equal(result.capsule.currentProject.brandName, '九州美学');
  assert.ok(result.capsule.uncertainties.some((item) => item.includes('观夏东方')));

  // §13/§16 修改偏好 → 重编胶囊+Brief，零额外模型调用
  const updated = await harness.service.updatePreference(result.run.id, '突出朱砂红点缀', ['不要复刻版式骨架']);
  assert.equal(harness.modelCalls(), 1);
  assert.equal(updated.run.retryCount, 1);
  assert.equal(updated.capsule.userPreference, '突出朱砂红点缀');
  assert.ok(updated.briefMarkdown.includes('突出朱砂红点缀'));

  // §13 只重编 Brief（胶囊不变）
  const retried = await harness.service.retryBrief(result.run.id);
  assert.equal(harness.modelCalls(), 1);
  assert.equal(retried.run.retryCount, 2);
  assert.equal(retried.capsule.userPreference, '突出朱砂红点缀');

  // 编辑后的 Brief：合法则采用，泄漏内部 ID 则硬阻断
  const edited = `${retried.briefMarkdown}\n\n（设计师补充：强调礼盒场景）`;
  const adopted = await harness.service.retryBrief(result.run.id, edited);
  assert.ok(adopted.briefMarkdown.includes('设计师补充'));
  await assert.rejects(
    () => harness.service.retryBrief(result.run.id, `${retried.briefMarkdown}\nUUID: 3f2c1a08-9b7d-4e21-a5c3-0d9e8f7a6b5c`),
    (error: Error & { code?: string }) => error.code === 'SCHEMA_VALIDATION_FAILED'
  );

  // §13 决策流转：approved → completed
  const approved = await harness.service.setDecision(result.run.id, 'approved', '方向正确');
  assert.equal(approved.status, 'completed');
  assert.equal(approved.decision, 'approved');
  assert.ok(approved.completedAt);
});

test('service start hard-blocks reference identity leak with §12 code', async () => {
  const harness = await buildHarness();
  harness.setReferenceStyle(buildReferenceStyle({
    colorSystem: [{ rule: '延续观夏的米白底与琥珀色点缀', confidence: 0.9 }],
    excludedIdentityTerms: ['观夏']
  } as unknown as Partial<ReferenceStyleProfile>));
  await assert.rejects(
    () => harness.service.start({ currentProjectId: 'project-current', referenceAssetPaths: harness.assetPaths, apiProfileId: 'profile-1' }),
    (error: Error & { code?: string }) => error.code === 'REFERENCE_BRAND_IDENTITY_LEAK'
  );
  const runs = await harness.service.listRuns();
  assert.equal(runs.length, 1);
  assert.equal(runs[0]!.status, 'failed');
  assert.equal(runs[0]!.errorCode, 'REFERENCE_BRAND_IDENTITY_LEAK');
});

test('service start blocks when current project context is missing (zero model calls)', async () => {
  const harness = await buildHarness();
  harness.setVisualContext(null);
  await assert.rejects(
    () => harness.service.start({ currentProjectId: 'project-current', referenceAssetPaths: harness.assetPaths, apiProfileId: 'profile-1' }),
    (error: Error & { code?: string }) => error.code === 'CURRENT_PROJECT_CONTEXT_MISSING'
  );
  assert.equal(harness.modelCalls(), 0);
});

test('orphaned executing run downgrades to awaiting_decision when outputs already exist', async () => {
  const harness = await buildHarness();
  const result = await harness.service.start({ currentProjectId: 'project-current', referenceAssetPaths: harness.assetPaths, apiProfileId: 'profile-1' });
  const recordPath = path.join(harness.dataPath, 'reference-runs', result.run.id, 'runtime', 'run.json');
  const record = JSON.parse(await fs.readFile(recordPath, 'utf8'));
  record.status = 'analyzing_reference';
  await fs.writeFile(recordPath, JSON.stringify(record), 'utf8');
  const reconciled = await harness.service.getRun(result.run.id);
  assert.equal(reconciled.status, 'awaiting_decision');
});

// ── v5.3.1 §14 质量修复回归 ──

// Test 1：产品分类 —— 名片/工牌/菜单不得进入 coreProducts
test('v5.3.1 Test1: classifyProjectFacts routes VI touchpoints out of coreProducts', () => {
  const { facts, auditCodes } = classifyProjectFacts({ candidateProducts: ['名片', '工牌', '菜单', '跷脚牛肉'] });
  assert.deepEqual(facts.coreProducts, ['跷脚牛肉']);
  assert.deepEqual(facts.touchpoints.viApplications, ['名片', '工牌', '菜单']);
  assert.ok(auditCodes.includes('CORE_PRODUCTS_CONTAIN_TOUCHPOINTS'));
});

// Test 2：设计建议清洗 —— 名片：简洁设计，突出 Logo，使用特种纸
test('v5.3.1 Test2: classifyProjectFacts extracts design advice from touchpoint clauses', () => {
  const { facts, auditCodes } = classifyProjectFacts({ candidateProducts: ['名片：简洁设计，突出 Logo，使用特种纸'] });
  assert.deepEqual(facts.touchpoints.viApplications, ['名片']);
  assert.deepEqual(facts.designAdvice, ['简洁设计', '突出 Logo', '使用特种纸']);
  assert.equal(facts.coreProducts.length, 0);
  assert.ok(auditCodes.includes('CORE_PRODUCTS_CONTAIN_DESIGN_ADVICE'));
  assert.ok(auditCodes.includes('CORE_PRODUCTS_EMPTY_WITH_FALSE_FALLBACK'));
});

// Test 3：参考专属图形回流 —— 正向规则含禁止表层元素 → blocking
test('v5.3.1 Test3: reference signature reentry is detected and blocks at service level', async () => {
  const conflicts = detectReferenceSignatureReentry(['以砂锅轮廓作为超级符号'], ['砂锅轮廓', '参考印章', '连纹']);
  assert.ok(conflicts.length >= 1);
  assert.equal(conflicts[0]!.value, '砂锅轮廓');

  // 服务级：图形规则被抽象为机制并写入 prohibited；同一表层元素若残留在其他正向规则则硬阻断。
  const harness = await buildHarness();
  harness.setReferenceStyle(buildReferenceStyle({
    graphicLanguage: [{ rule: '以砂锅轮廓作为超级符号，结合印章与连纹', confidence: 0.9 }],
    colorSystem: [{ rule: '延续砂锅轮廓的暖橙色调作为主色', confidence: 0.9 }]
  } as unknown as Partial<ReferenceStyleProfile>));
  await assert.rejects(
    () => harness.service.start({ currentProjectId: 'project-current', referenceAssetPaths: harness.assetPaths, apiProfileId: 'profile-1' }),
    (error: Error & { code?: string }) => ['PROHIBITED_REFERENCE_ELEMENT_IN_POSITIVE_RULES', 'REFERENCE_SIGNATURE_REENTERED_ANCHOR_BRIEF'].includes(error.code || '')
  );
  const runs = await harness.service.listRuns();
  assert.equal(runs[0]!.status, 'failed');
});

// Test 4：机制抽象 —— 砂锅轮廓 → 抽象机制，绝不保留表层元素
test('v5.3.1 Test4: graphic rule is abstracted to mechanism, surface elements go to prohibited', () => {
  const { rule, prohibitedSurface } = abstractGraphicRule('参考以砂锅轮廓作为超级符号，结合印章与连纹');
  assert.equal(rule, ABSTRACT_GRAPHIC_MECHANISM);
  assert.ok(prohibitedSurface.includes('砂锅轮廓'));
  assert.ok(!rule.includes('砂锅'));

  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle({
      graphicLanguage: [{ rule: '以砂锅轮廓作为超级符号', confidence: 0.9 }]
    } as unknown as Partial<ReferenceStyleProfile>)
  });
  assert.ok(capsule.inheritedStyle.graphicLanguage.includes(ABSTRACT_GRAPHIC_MECHANISM));
  assert.ok(!capsule.inheritedStyle.graphicLanguage.some((r) => r.includes('砂锅')));
  assert.ok(capsule.prohibitedReferenceIdentity.signatureGraphics.some((r) => r.includes('砂锅轮廓')));
});

// Test 5：Anchor 任务过滤 —— 保留天然材质/暖光，移除厨师/空间/微距
test('v5.3.1 Test5: filterStyleCapsuleForTask removes food/kitchen/space rules for anchor_vi_system', () => {
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  });
  capsule.inheritedStyle.materialAndPhotography = ['食品微距特写', '厨师烹饪动态', '用餐空间氛围', '天然材质哑光', '方向性暖光'];
  const task = filterStyleCapsuleForTask(capsule, 'anchor_vi_system');
  assert.ok(task.inheritedStyle.materialAndPhotography.includes('天然材质哑光'));
  assert.ok(task.inheritedStyle.materialAndPhotography.includes('方向性暖光'));
  assert.ok(!task.inheritedStyle.materialAndPhotography.some((r) => r.includes('厨师')));
  assert.ok(!task.inheritedStyle.materialAndPhotography.some((r) => r.includes('空间氛围')));
  assert.ok(task.removedRules.some((r) => r.includes('食品微距')));
});

// Test 6：Warning —— 存在推断/待确认/专属元素风险时人工注意事项不为空
test('v5.3.1 Test6: warning compiler produces non-empty humanNotes when risks exist', () => {
  const visual = buildVisualContext();
  (visual as unknown as { identity: { industry: string } }).identity.industry = '';
  (visual as unknown as { products: { coreProducts: string[] } }).products.coreProducts = [];
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle({
      graphicLanguage: [{ rule: '以砂锅轮廓作为超级符号', confidence: 0.9 }]
    } as unknown as Partial<ReferenceStyleProfile>)
  });
  assert.ok(capsule.humanNotes.length > 0);
  assert.ok(capsule.humanNotes.some((n) => n.includes('行业')));
  assert.ok(capsule.humanNotes.some((n) => n.includes('核心产品')));
  assert.ok(capsule.humanNotes.some((n) => n.includes('专属')));
  const capsuleMd = compileCapsuleMarkdown(capsule);
  assert.ok(!capsuleMd.includes('暂无需要特别注意的事项'));
});

// Test 7：比例 —— "3:4 或 1:1" 触发 ANCHOR_ASPECT_RATIO_AMBIGUOUS，单值通过
test('v5.3.1 Test7: ambiguous aspect ratio is rejected, single value passes', () => {
  assert.equal(normalizeAspectRatio('3:4 或 1:1'), '16:9');
  assert.equal(normalizeAspectRatio('4:5'), '4:5');
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  });
  const brief = compileAnchorBrief(capsule);
  assert.equal(validateAnchorBrief(brief).valid, true);
  assert.ok(brief.includes('比例 16:9'));
  const polluted = brief.replace('比例 16:9', '比例 3:4 或 1:1');
  const validation = validateAnchorBrief(polluted);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.some((e) => e.includes('ANCHOR_ASPECT_RATIO_AMBIGUOUS')));
});

// Test 8：去重 —— Locked Assets 只列一次、语义重复合并
test('v5.3.1 Test8: dedupeBriefRules merges duplicate/semantic-duplicate rules', () => {
  const deduped = dedupeBriefRules(['简体中文输出', '简体中文输出', '简体中文', '品牌名称：冯烫烫']);
  assert.equal(deduped.filter((x) => x.includes('简体中文')).length, 1);
  assert.ok(deduped.includes('品牌名称：冯烫烫'));

  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  });
  const brief = compileAnchorBrief(capsule);
  const bBlock = brief.slice(brief.indexOf('## B.'), brief.indexOf('## C.'));
  const cBlock = brief.slice(brief.indexOf('## C.'), brief.indexOf('## D.'));
  // Locked Assets 只在 B 部分出现，C 部分不重复 Logo 锁定表述
  assert.ok(bBlock.includes('简体中文输出'));
  assert.ok(!cBlock.includes('简体中文输出'));
  assert.ok(!cBlock.includes('Logo：已锁定'));
});

// 行业中性化（精简重构叠加层）：领域词库画像可替换，引擎不绑定具体行业。
test('domain profile is swappable: a non-catering profile classifies and filters its own vocabulary', () => {
  // 默认画像保持既有（含餐饮验证项）行为。
  assert.ok(DEFAULT_ANCHOR_DOMAIN_PROFILE.serviceMaterialTerms.includes('筷子套'));
  assert.ok(DEFAULT_ANCHOR_DOMAIN_PROFILE.anchorBlacklistTerms.includes('厨师'));

  // 自定义「服装零售」画像：不含任何餐饮词，改用本行业词表。
  const apparelProfile = {
    viApplicationTerms: ['吊牌', '海报', '名片'],
    serviceMaterialTerms: ['购物袋', '包装盒', '防尘袋'],
    designAdviceMarkers: ['建议', '突出 Logo'],
    anchorBlacklistTerms: ['模特走秀', 'T台动态', '橱窗空间主导'],
    anchorOptionalTerms: ['少量道具'],
    subjectDominanceProhibition: '禁止以模特走秀、T台动态或橱窗空间氛围作为画面主导'
  };

  // 事实分类使用自定义画像：购物袋 → serviceMaterials，吊牌 → viApplications，连衣裙 → coreProducts。
  const { facts, auditCodes } = classifyProjectFacts(
    { candidateProducts: ['吊牌', '购物袋', '连衣裙：突出 Logo'] },
    apparelProfile
  );
  assert.deepEqual(facts.coreProducts, ['连衣裙']);
  assert.deepEqual(facts.touchpoints.viApplications, ['吊牌']);
  assert.deepEqual(facts.touchpoints.serviceMaterials, ['购物袋']);
  assert.ok(facts.designAdvice.includes('突出 Logo'));
  assert.ok(auditCodes.includes('CORE_PRODUCTS_CONTAIN_TOUCHPOINTS'));

  // 任务过滤使用自定义黑名单：移除模特走秀，保留其它；餐饮词此时不再被视为黑名单。
  const { capsule } = compileReferenceStyleCapsule({
    runId: 'run-1',
    projectId: 'project-current',
    merged: mergeCurrentProjectContext({ visual: buildVisualContext() } as ReferenceCurrentProjectContext),
    referenceStyle: buildReferenceStyle()
  });
  capsule.inheritedStyle.materialAndPhotography = ['模特走秀动态', '厨师烹饪动态', '天然材质哑光'];
  const task = filterStyleCapsuleForTask(capsule, 'anchor_vi_system', apparelProfile);
  assert.ok(task.removedRules.some((r) => r.includes('模特走秀')));
  assert.ok(task.inheritedStyle.materialAndPhotography.includes('天然材质哑光'));
  // 餐饮词不在服装画像黑名单里，应被保留（证明引擎已解绑餐饮硬编码）。
  assert.ok(task.inheritedStyle.materialAndPhotography.includes('厨师烹饪动态'));

  // Brief 禁止事项使用自定义主体主导禁令。
  const brief = compileAnchorBrief(capsule, apparelProfile);
  assert.ok(brief.includes('模特走秀'));
  assert.ok(!brief.includes('禁止以厨师、烹饪动态'));
});
