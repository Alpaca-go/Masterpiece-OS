import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createDocumentContextService } from '@masterpiece/runtime-core/application/document-context-service.ts';
import {
  adaptLegacyVisualTranslationResult,
  compileContextBrief,
  normalizeExtractedContext,
  parseModelJson,
  validateDocumentVisualContext
} from '@masterpiece/runtime-core/application/document-context-core.ts';
import type { DocumentVisualContext, PublicSettings, VisualStrategyCorpus } from '@masterpiece/runtime-core/application-contracts.ts';

function mockSettings(defaultDataPath: string): PublicSettings {
  return { profiles: [], defaultProfileId: null, provider: '', baseUrl: '', model: '', hasApiKey: false, defaultDataPath, cacheEnabled: true, logLevel: 'info', connectionStatus: 'untested' } as unknown as PublicSettings;
}

const mockCredentials = async () => ({ profileId: 'profile-test', provider: 'mock', baseUrl: 'https://example.test/v1', model: 'mock-model', apiKey: 'secret' });

function extractDocumentId(messages: Array<{ role: string; content: string }>): string {
  const match = messages[1]?.content.match(/<document id="([^"]+)"/u);
  return match?.[1] || 'missing-document-id';
}

function buildCorpus(): VisualStrategyCorpus {
  return {
    documents: [{
      id: 'doc-1',
      filename: '品牌策略.md',
      mimeType: 'text/markdown',
      title: '云杉集品牌策略',
      sourceType: 'markdown',
      rawText: '云杉集是高端植物护肤品牌。',
      sections: [],
      tables: [],
      characterCount: 14,
      parseWarnings: [],
      documentRole: 'brand-strategy'
    }],
    sourceIndex: [],
    mergedText: '云杉集是高端植物护肤品牌。',
    warnings: []
  } as unknown as VisualStrategyCorpus;
}

// ── §18.2 核心纯逻辑：解析 / 不编造 / 可溯源 ──

test('parseModelJson strips code fences and flags unparseable output with schema-invalid code', () => {
  const parsed = parseModelJson('```json\n{"brandName":"云杉集"}\n```');
  assert.equal(parsed.brandName, '云杉集');
  assert.throws(() => parseModelJson('对不起，我无法输出 JSON。'), (error: Error & { code?: string }) => error.code === 'DOCUMENT_CONTEXT_SCHEMA_INVALID');
});

test('normalizeExtractedContext never fabricates: missing facts go to unknownFields with warnings', () => {
  const corpus = buildCorpus();
  const { context, warnings } = normalizeExtractedContext({
    brandName: '云杉集',
    industry: '',
    products: ['精华油'],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    lockedFacts: ['全线市场规模达到 500 亿元', '品牌 Logo 为手写体「云杉集」'],
    evidence: [
      { field: 'brandName', documentId: 'doc-1', filename: '品牌策略.md', summary: '文档首段声明品牌名' },
      { field: 'products', documentId: 'doc-x-not-exists', filename: '不存在.md', summary: '伪造来源' }
    ],
    conflicts: ['价格定位在两份文档中不一致：高端 vs 大众']
  }, corpus, 'run-test');
  assert.ok(context.unknownFields.includes('industry'));
  assert.ok(context.unknownFields.includes('targetAudience'));
  assert.ok(context.unknownFields.includes('pricePositioning'));
  assert.ok(context.unknownFields.includes('businessModel'));
  // 非视觉事实（市场规模）被确定性剔除
  assert.deepEqual(context.lockedFacts, ['品牌 Logo 为手写体「云杉集」']);
  // 伪造 documentId 的 evidence 被丢弃，可溯源性只认已知文档
  assert.deepEqual(context.evidence.map((item) => item.field), ['brandName']);
  const codes = warnings.map((warning) => warning.code);
  assert.ok(codes.includes('TARGET_AUDIENCE_UNKNOWN'));
  assert.ok(codes.includes('PRICE_POSITIONING_UNKNOWN'));
  assert.ok(codes.includes('BUSINESS_MODEL_UNKNOWN'));
  assert.ok(codes.includes('DOCUMENT_FACT_CONFLICT'));
  // products 有值但无有效来源 → 来源薄弱警告
  assert.ok(warnings.some((warning) => warning.code === 'DOCUMENT_SOURCE_WEAK' && warning.field === 'products'));
  assert.equal(validateDocumentVisualContext(context).valid, true);
});

test('compileContextBrief outputs the 9 fixed sections and never emits directions/recommendations/audits', () => {
  const corpus = buildCorpus();
  const { context } = normalizeExtractedContext({ brandName: '云杉集', industry: '护肤', prohibitedDirections: ['不做赛博霓虹'] }, corpus, 'run-test');
  const brief = compileContextBrief(context);
  for (const heading of ['1. 项目身份', '2. 产品与服务', '3. 目标用户与价格位置', '4. 品牌气质与视觉偏好', '5. 必要设计触点', '6. Locked Facts', '7. 可以探索的范围', '8. 禁止方向', '9. 待确认信息']) {
    assert.ok(brief.includes(`## ${heading}`), `缺少章节：${heading}`);
  }
  assert.doesNotMatch(brief, /三个视觉方向|方向 A|方向 B|方向 C|自动推荐|推荐方向|技术审计/u);
  assert.match(brief, /- 目标用户：待确认/u);
});

// ── §18.4 Legacy Adapter ──

test('adaptLegacyVisualTranslationResult converts old three-direction output without fabrication', () => {
  const context = adaptLegacyVisualTranslationResult({
    run: { id: 'run-legacy-1', projectName: '名济堂', documentNames: ['名济堂调研.docx'] },
    visualBrief: { industry: '中医药健康', targetAudience: ['25-40 岁都市白领'], visualPreferences: ['沉稳的东方质感'] }
  });
  assert.equal(context.schemaVersion, '1.0');
  assert.equal(context.sourceRunId, 'run-legacy-1');
  assert.equal(context.brandName, '名济堂');
  assert.equal(context.industry, '中医药健康');
  assert.deepEqual(context.targetAudience, ['25-40 岁都市白领']);
  // 旧结果里没有的信息必须落入 unknownFields，而不是被编造
  assert.ok(context.unknownFields.includes('pricePositioning'));
  assert.ok(context.unknownFields.includes('businessModel'));
  assert.equal(context.sourceDocuments[0]?.sourceType, 'docx');
  assert.equal(validateDocumentVisualContext(context).valid, true);
});

// ── §18.1 + §18.2 + §18.3 服务级端到端（离线 mock 模型）──

test('Document Context service runs extraction to human confirmation, honors user overrides and compiles brief locally', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'document-context-service-'));
  const source = path.join(temporary, '云杉集品牌策略.md');
  await fs.writeFile(source, '# 云杉集品牌策略\n\n云杉集是高端植物护肤品牌，目标用户为一线城市 25-40 岁女性。必须保留手写体 Logo。', 'utf8');
  let modelCalls = 0;
  const stages: string[] = [];
  const service = createDocumentContextService(
    mockCredentials,
    async () => mockSettings(temporary),
    (event) => stages.push(event.stage),
    () => async (messages: Array<{ role: string; content: string }>) => {
      modelCalls += 1;
      const documentId = extractDocumentId(messages);
      return {
        text: JSON.stringify({
          brandName: '云杉集',
          industry: '植物护肤',
          products: ['精华油'],
          services: [],
          targetAudience: ['一线城市 25-40 岁女性'],
          pricePositioning: '高端',
          businessModel: null,
          brandPersonality: ['克制', '自然'],
          visualPreferences: [],
          requiredTouchpoints: ['包装', '电商详情页'],
          lockedFacts: ['必须保留手写体 Logo'],
          prohibitedDirections: [],
          unknownFields: [],
          evidence: [{ field: 'brandName', documentId, filename: '云杉集品牌策略.md', section: '首段', summary: '文档标题与首段声明品牌名' }],
          conflicts: []
        })
      };
    }
  );

  try {
    // §18.1 解析与角色索引
    const inspected = await service.inspectDocuments([source]);
    assert.equal(inspected[0]?.sourceType, 'markdown');
    const run = await service.start([source], 'profile-test');
    assert.equal(run.status, 'awaiting_confirmation');
    assert.equal(run.mode, 'context_extraction');
    assert.equal(run.modelCallCount, 1);
    assert.equal(run.repairCount, 0);
    assert.ok(stages.includes('00-document-preparation'));
    assert.ok(stages.includes('01-document-role-index'));
    assert.ok(stages.includes('04-human-confirmation'));
    const root = await service.runRoot(run.id);
    const corpus = JSON.parse(await fs.readFile(path.join(root, 'intermediate', 'normalized-corpus.json'), 'utf8'));
    assert.equal(corpus.documents[0].documentRole ? typeof corpus.documents[0].documentRole : 'missing', 'string');

    // §18.2 提取结果可读取、evidence 可溯源
    const extracted = await service.getExtracted(run.id);
    assert.equal(extracted.brandName, '云杉集');
    assert.equal(extracted.evidence[0]?.field, 'brandName');
    assert.ok(extracted.evidence[0]?.documentId);

    // §18.2 用户修改覆盖模型结果
    const overridden: DocumentVisualContext = {
      ...extracted,
      brandName: '云杉集·山野系列',
      targetAudience: [...extracted.targetAudience, '高端 SPA 采购方'],
      lockedFacts: extracted.lockedFacts.filter((item) => !item.includes('手写体'))
    };
    const confirmedRun = await service.confirm(run.id, overridden);
    assert.equal(confirmedRun.status, 'compiling');

    // §18.3 本地编译零模型调用
    const callsBeforeCompile = modelCalls;
    const result = await service.compile(run.id);
    assert.equal(modelCalls, callsBeforeCompile);
    assert.equal(result.run.status, 'completed');
    assert.equal(result.run.briefFilename, '项目视觉上下文简报.md');
    assert.match(result.briefMarkdown, /云杉集·山野系列/u);
    assert.match(result.briefMarkdown, /高端 SPA 采购方/u);
    assert.doesNotMatch(result.briefMarkdown, /手写体/u);
    assert.doesNotMatch(result.briefMarkdown, /三个视觉方向|自动推荐|技术审计/u);
    const savedContext = JSON.parse(await fs.readFile(path.join(root, 'outputs', 'document-visual-context.json'), 'utf8'));
    assert.equal(savedContext.brandName, '云杉集·山野系列');
    assert.match(await fs.readFile(await service.briefPath(run.id), 'utf8'), /项目视觉上下文简报/u);

    // 已完成任务 resume 直接返回，不再调模型
    const resumed = await service.resume(run.id);
    assert.equal(resumed.status, 'completed');
    assert.equal(modelCalls, callsBeforeCompile);
    assert.equal(modelCalls, 1);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('Document Context service repairs invalid model output exactly once, then fails explicitly', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'document-context-repair-'));
  const source = path.join(temporary, '策略.md');
  await fs.writeFile(source, '# 策略\n\n品牌以简洁自然为核心。', 'utf8');
  let calls = 0;
  const makeService = (responses: string[]) => {
    calls = 0;
    return createDocumentContextService(
      mockCredentials,
      async () => mockSettings(temporary),
      () => {},
      () => async () => {
        const text = responses[Math.min(calls, responses.length - 1)]!;
        calls += 1;
        return { text };
      }
    );
  };

  try {
    // 第一次输出坏 JSON，Repair 后成功：modelCallCount=2、repairCount=1
    const good = JSON.stringify({ brandName: '简然', industry: '生活方式', products: [], services: [], targetAudience: [], pricePositioning: null, businessModel: null, brandPersonality: [], visualPreferences: [], requiredTouchpoints: [], lockedFacts: [], prohibitedDirections: [], unknownFields: [], evidence: [], conflicts: [] });
    const repaired = await makeService(['这不是 JSON', good]).start([source], 'profile-test');
    assert.equal(repaired.status, 'awaiting_confirmation');
    assert.equal(repaired.modelCallCount, 2);
    assert.equal(repaired.repairCount, 1);

    // 两次都坏：明确失败，禁止第三次自动修复
    const failing = makeService(['第一次坏输出', '第二次仍然坏']);
    await assert.rejects(() => failing.start([source], 'profile-test'), (error: Error & { code?: string }) => error.code === 'DOCUMENT_CONTEXT_REPAIR_FAILED');
    assert.equal(calls, 2);
    const failedRun = (await failing.listRuns()).find((item) => item.status === 'failed');
    assert.equal(failedRun?.errorCode, 'DOCUMENT_CONTEXT_REPAIR_FAILED');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('Document Context service recovers crashed runs to confirmation page when checkpoint exists, else fails them', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'document-context-recovery-'));
  const source = path.join(temporary, '策略.md');
  await fs.writeFile(source, '# 策略\n\n品牌主打户外机能风格。', 'utf8');
  const good = JSON.stringify({ brandName: '山行', industry: '户外装备', products: [], services: [], targetAudience: [], pricePositioning: null, businessModel: null, brandPersonality: [], visualPreferences: [], requiredTouchpoints: [], lockedFacts: [], prohibitedDirections: [], unknownFields: [], evidence: [], conflicts: [] });
  const build = () => createDocumentContextService(mockCredentials, async () => mockSettings(temporary), () => {}, () => async () => ({ text: good }));

  try {
    const run = await build().start([source], 'profile-test');
    const runFile = path.join(temporary, 'document-runs', run.id, 'runtime', 'run.json');

    // 模拟崩溃：磁盘停留在 extracting，但有 extracted checkpoint → 回到确认页
    const record = JSON.parse(await fs.readFile(runFile, 'utf8'));
    await fs.writeFile(runFile, JSON.stringify({ ...record, status: 'extracting' }), 'utf8');
    const reconciled = await build().getRun(run.id);
    assert.equal(reconciled.status, 'awaiting_confirmation');

    // 无 checkpoint 的执行中任务 → 降级为 failed
    await fs.rm(path.join(temporary, 'document-runs', run.id, 'intermediate', 'extracted-context.json'));
    await fs.writeFile(runFile, JSON.stringify({ ...record, status: 'extracting', errorCode: null, lastError: null }), 'utf8');
    const failed = await build().getRun(run.id);
    assert.equal(failed.status, 'failed');
    assert.ok(failed.lastError);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('Document Context service cancels an in-flight extraction as cancelled, not failed', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'document-context-cancel-'));
  const source = path.join(temporary, '策略.md');
  await fs.writeFile(source, '# 策略\n\n品牌以速度感为核心。', 'utf8');
  const service = createDocumentContextService(
    mockCredentials,
    async () => mockSettings(temporary),
    () => {},
    () => (_messages: unknown, context: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
      context.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })
  );
  try {
    const pending = service.start([source], 'profile-test');
    let cancelled = false;
    for (let attempt = 0; attempt < 100 && !cancelled; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 20));
      const runs = await service.listRuns();
      const running = runs.find((item) => item.status === 'extracting' || item.status === 'repairing');
      if (running) cancelled = await service.cancel(running.id);
    }
    assert.equal(cancelled, true);
    await assert.rejects(() => pending);
    const runs = await service.listRuns();
    assert.equal(runs[0]?.status, 'cancelled');
    assert.equal(runs[0]?.errorCode ?? null, null);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
