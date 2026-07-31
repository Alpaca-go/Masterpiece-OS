import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createContextIntegrationService,
  ContextIntegrationError,
  type ContextIntegrationDeps,
  type ContextIntegrationService
} from '../src/main/context-integration-service.ts';
import { resolveProjectContext, applyUserOverride, hasBlockingConflict } from '../src/main/context-resolver.ts';
import { resolvedToMerged } from '../src/main/reference-anchor-core.ts';
import type {
  DocumentContextRun,
  DocumentVisualContext,
  ProjectRecord,
  ProjectVisualContext,
  PublicSettings
} from '../src/shared/types';

// ── 测试夹具 ──

const BASE_VISUAL: ProjectVisualContext = {
  schemaVersion: '1.0',
  projectId: 'p1',
  sourceRunId: 'run-v',
  generatedAt: '2026-01-01T00:00:00.000Z',
  identity: { projectName: '冯烫烫茶铺', brandName: '冯烫烫', industry: '茶饮' },
  confidence: { projectName: 0.9, brandName: 0.95, industry: 0.9 },
  lockedAssets: { logoLocked: true, logoAssetIds: ['asset-logo-1'], lockedAssetIds: [], lockedFacts: ['品牌 Logo 为手写体'] },
  products: { coreProducts: ['手作茶饮'], secondaryProducts: [] },
  currentVisualSystem: {
    existingVisualAssets: ['杯身插画'],
    primaryColors: ['#3a5a40'],
    supportingColors: [],
    graphicAssets: [],
    typographySignals: [],
    materialSignals: [],
    photographySignals: []
  },
  packaging: { structures: ['纸杯'], status: 'confirmed', evidenceSources: ['report'] },
  businessTouchpoints: { packaging: ['纸杯'], viApplications: ['菜单'], spatial: ['门店'], digital: ['小程序'] },
  evaluation: { visualStrengths: [], visualProblems: [], modifiableAssets: [] },
  uncertainties: ['空间风格待确认'],
  source: { reportPath: 'r.md', runtimeReportPath: 'rt.md', assetCount: 4, imageCount: 4, provider: 'mock', model: 'mock' }
};

const BASE_DOC: DocumentVisualContext = {
  schemaVersion: '1.0',
  sourceRunId: 'run-d',
  generatedAt: '2026-02-01T00:00:00.000Z',
  brandName: '冯烫烫',
  industry: '茶饮零售',
  products: ['手作茶饮', '茶礼盒'],
  services: ['会员订阅'],
  targetAudience: ['都市白领'],
  pricePositioning: '中高端',
  businessModel: '直营+电商',
  brandPersonality: ['温润'],
  visualPreferences: ['低饱和'],
  requiredTouchpoints: ['包装', '小程序'],
  lockedFacts: ['品牌 Logo 为手写体'],
  prohibitedDirections: ['赛博霓虹'],
  unknownFields: [],
  evidence: [],
  sourceDocuments: [{ documentId: 'doc-1', filename: '策略.md', sourceType: 'markdown', title: '策略', characterCount: 10 }]
};

interface Harness {
  service: ContextIntegrationService;
  tmp: string;
  visualStore: Map<string, ProjectVisualContext>;
  docStore: Map<string, DocumentVisualContext>;
  statusMap: Map<string, 'missing' | 'ready' | 'failed'>;
  docService: { getRun(id: string): Promise<DocumentContextRun>; getExtracted(id: string): Promise<DocumentVisualContext> };
  cleanup(): Promise<void>;
}

async function createHarness(opts: { seedVisual?: boolean; seedDoc?: boolean; visualStatus?: 'missing' | 'ready' | 'failed'; rebuildThrows?: boolean } = {}): Promise<Harness> {
  const { seedVisual = true, seedDoc = true, visualStatus = 'ready', rebuildThrows = false } = opts;
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ctx-int-'));
  const visualStore = new Map<string, ProjectVisualContext>();
  const docStore = new Map<string, DocumentVisualContext>();
  const statusMap = new Map<string, 'missing' | 'ready' | 'failed'>();
  if (seedVisual) {
    visualStore.set('p1', structuredClone(BASE_VISUAL));
    statusMap.set('p1', visualStatus);
  }
  if (seedDoc) docStore.set('d1', structuredClone(BASE_DOC));

  const settings = { profiles: [], defaultDataPath: tmp } as unknown as PublicSettings;
  const docService = {
    getRun: async (id: string) =>
      ({ id, mode: 'strategy', projectName: '文档', status: 'completed', apiProfileId: '', provider: '', model: '', documentCount: 1, documentNames: [], createdAt: '', startedAt: '' } as unknown as DocumentContextRun),
    getExtracted: async (id: string) => {
      const d = docStore.get(id);
      if (!d) throw new Error('DOCUMENT_CONTEXT_NOT_FOUND');
      return d;
    }
  };
  const deps = {
    readSettings: async () => settings,
    projects: {
      paths: async (id: string) => {
        const out = path.join(tmp, 'projects', id, 'outputs');
        await fs.mkdir(out, { recursive: true });
        return { outputs: out };
      },
      get: async (id: string) => ({ id, visualContextStatus: statusMap.get(id) ?? 'missing', visualContextSchemaVersion: '1.0' } as unknown as ProjectRecord)
    },
    projectContext: {
      get: async (id: string) => {
        const v = visualStore.get(id);
        if (!v) throw new ContextIntegrationError('PROJECT_VISUAL_CONTEXT_MISSING', '视觉上下文缺失');
        return v;
      },
      rebuild: async (id: string) => {
        if (rebuildThrows) throw new Error('REBUILD_FAILED');
        const v = visualStore.get(id);
        if (!v) throw new Error('视觉上下文缺失');
        statusMap.set(id, 'ready');
        return v;
      },
      export: async () => null
    },
    documentContext: docService,
    showSaveDialog: async () => ({ canceled: true })
  } as unknown as ContextIntegrationDeps;

  const service = createContextIntegrationService(deps);
  return { service, tmp, visualStore, docStore, statusMap, docService, cleanup: () => fs.rm(tmp, { recursive: true, force: true }) };
}

// ─────────────────────────────────────────────────────────────
// §15.1 Resolver 单元测试（纯逻辑，零模型调用）
// ─────────────────────────────────────────────────────────────

test('15.1 视觉品牌名优先：文档品牌名不同不覆盖，记录 unresolved 冲突', () => {
  const doc = { ...structuredClone(BASE_DOC), brandName: '冯烫烫官方' };
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: doc });
  assert.equal(resolved.identity.brandName, '冯烫烫');
  const conflict = resolved.conflicts.find((c) => c.field === 'brandName');
  assert.ok(conflict);
  assert.equal(conflict!.resolution, 'unresolved');
  assert.equal(conflict!.visualValue, '冯烫烫');
  assert.equal(conflict!.documentValue, '冯烫烫官方');
});

test('15.1 视觉 Logo 优先：logoLocked / logoAssetIds 来自视觉主源，不被文档覆盖', () => {
  const doc = { ...structuredClone(BASE_DOC), lockedFacts: ['完全不同的锁定事实'] };
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: doc });
  assert.equal(resolved.lockedAssets.logoLocked, true);
  assert.deepEqual(resolved.lockedAssets.logoAssetIds, ['asset-logo-1']);
});

test('15.1 Locked Assets 不被文档覆盖：文档锁定事实差异生成 unresolved 冲突', () => {
  const doc = { ...structuredClone(BASE_DOC), lockedFacts: ['品牌 Logo 为手写体', '新增锁定事实'] };
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: doc });
  const conflict = resolved.conflicts.find((c) => c.field === 'lockedFacts');
  assert.ok(conflict && conflict.resolution === 'unresolved');
  assert.deepEqual(resolved.lockedAssets.lockedFacts, ['品牌 Logo 为手写体']);
});

test('15.1 文档补充目标用户：视觉无该字段时取文档，记录 document_wins', () => {
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: structuredClone(BASE_DOC) });
  assert.deepEqual(resolved.targetAudience, ['都市白领']);
  assert.ok(resolved.conflicts.some((c) => c.field === 'targetAudience' && c.resolution === 'document_wins'));
});

test('15.1 文档补充价格定位：取文档值，记录 document_wins', () => {
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: structuredClone(BASE_DOC) });
  assert.equal(resolved.pricePositioning, '中高端');
  assert.ok(resolved.conflicts.some((c) => c.field === 'pricePositioning' && c.resolution === 'document_wins'));
});

test('15.1 冲突进入 conflicts 数组且全部可追溯', () => {
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: structuredClone(BASE_DOC) });
  assert.ok(resolved.conflicts.length >= 1);
  for (const conflict of resolved.conflicts) {
    assert.ok(['visual_wins', 'document_wins', 'user_confirmed', 'unresolved'].includes(conflict.resolution));
    assert.ok(typeof conflict.field === 'string' && conflict.field.length > 0);
  }
});

test('15.1 用户 Override 正确覆盖字段并记录 user_confirmed', () => {
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: structuredClone(BASE_DOC), userOverrides: { industry: '茶饮·新中式' } });
  assert.equal(resolved.identity.industry, '茶饮·新中式');
  const conflict = resolved.conflicts.find((c) => c.field === 'industry');
  assert.ok(conflict && conflict.resolution === 'user_confirmed');
});

test('15.1 合并过程不修改输入对象', () => {
  const visual = structuredClone(BASE_VISUAL);
  const doc = structuredClone(BASE_DOC);
  resolveProjectContext({ projectId: 'p1', projectVisualContext: visual, documentVisualContext: doc });
  assert.equal(visual.identity.brandName, '冯烫烫');
  assert.deepEqual(doc.targetAudience, ['都市白领']);
});

test('15.1 applyUserOverride 仅写入目标字段，不触碰其他字段', () => {
  const resolved = resolveProjectContext({ projectId: 'p1', projectVisualContext: structuredClone(BASE_VISUAL), documentVisualContext: structuredClone(BASE_DOC) });
  applyUserOverride(resolved, 'pricePositioning', '大众');
  assert.equal(resolved.pricePositioning, '大众');
  assert.equal(resolved.identity.brandName, '冯烫烫');
});

// ─────────────────────────────────────────────────────────────
// §15.2 关联测试
// ─────────────────────────────────────────────────────────────

test('15.2 文档 Context 可关联视觉项目', async () => {
  const h = await createHarness();
  try {
    const link = await h.service.linkDocumentContext('p1', 'd1');
    assert.equal(link.projectId, 'p1');
    assert.equal(link.documentContextRunId, 'd1');
    const got = await h.service.getLink('p1');
    assert.ok(got && got.documentContextRunId === 'd1');
  } finally { await h.cleanup(); }
});

test('15.2 一个文档 Context 可关联多个视觉项目', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.linkDocumentContext('p2', 'd1');
    const a = await h.service.getLink('p1');
    const b = await h.service.getLink('p2');
    assert.equal(a?.documentContextRunId, 'd1');
    assert.equal(b?.documentContextRunId, 'd1');
  } finally { await h.cleanup(); }
});

test('15.2 解除关联只删除 Link，不删除原文档任务', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.unlinkDocumentContext('p1');
    assert.equal(await h.service.getLink('p1'), null);
    // 原文档任务仍可被读取（未被删除）
    const run = await h.docService.getRun('d1');
    assert.equal(run.id, 'd1');
  } finally { await h.cleanup(); }
});

test('15.2 删除被引用文档 Context 前可追溯引用关系（提示）', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    assert.equal(await h.service.isDocumentContextReferenced('d1'), true);
    assert.equal(await h.service.isDocumentContextReferenced('other'), false);
  } finally { await h.cleanup(); }
});

// ─────────────────────────────────────────────────────────────
// §15.3 缓存测试
// ─────────────────────────────────────────────────────────────

test('15.3 视觉身份生成时间变化使 Resolved Context 失效（返回 null）', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.resolve('p1');
    assert.ok(await h.service.getResolved('p1'));
    // 视觉上下文重新生成，generatedAt 变化
    const v = h.visualStore.get('p1')!;
    v.generatedAt = '2026-03-01T00:00:00.000Z';
    h.visualStore.set('p1', v);
    assert.equal(await h.service.getResolved('p1'), null);
  } finally { await h.cleanup(); }
});

test('15.3 文档目标用户等生成时间变化只使 Resolved 失效', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.resolve('p1');
    assert.ok(await h.service.getResolved('p1'));
    const d = h.docStore.get('d1')!;
    d.generatedAt = '2026-04-01T00:00:00.000Z';
    h.docStore.set('d1', d);
    assert.equal(await h.service.getResolved('p1'), null);
  } finally { await h.cleanup(); }
});

test('15.3 getResolved 只读取不重跑上游：指纹一致时原样返回已合并结果', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    const resolved = await h.service.resolve('p1');
    const again = await h.service.getResolved('p1');
    assert.ok(again);
    assert.equal(again!.generatedAt, resolved.generatedAt);
  } finally { await h.cleanup(); }
});

// ─────────────────────────────────────────────────────────────
// §15.4 状态隔离测试
// ─────────────────────────────────────────────────────────────

test('15.4 文档上下文状态不影响视觉分析完成状态（getVisualStatus 独立）', async () => {
  const h = await createHarness({ seedDoc: false });
  try {
    const status = await h.service.getVisualStatus('p1');
    assert.equal(status.status, 'ready');
  } finally { await h.cleanup(); }
});

test('15.4 文档提取失败不破坏 Resolved Context 读取：优雅降级返回 null', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.resolve('p1');
    // 模拟文档任务丢失
    h.docStore.delete('d1');
    assert.equal(await h.service.getResolved('p1'), null);
    assert.deepEqual(await h.service.listConflicts('p1'), []);
  } finally { await h.cleanup(); }
});

test('15.4 Context Resolver 失败不删除上游：视觉上下文缺失时 Resolved 文件仍在磁盘', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    await h.service.resolve('p1');
    const resolvedPath = path.join(h.tmp, 'projects', 'p1', 'outputs', 'resolved-project-context.json');
    assert.ok(await fs.access(resolvedPath).then(() => true).catch(() => false));
    // 视觉上下文缺失 → getResolved 返回 null，但文件未被删除
    h.visualStore.delete('p1');
    assert.equal(await h.service.getResolved('p1'), null);
    assert.ok(await fs.access(resolvedPath).then(() => true).catch(() => false));
  } finally { await h.cleanup(); }
});

// ─────────────────────────────────────────────────────────────
// §15.5 历史项目迁移测试
// ─────────────────────────────────────────────────────────────

test('15.5 旧视觉项目可升级 Context：rebuild 后状态转为 ready', async () => {
  const h = await createHarness({ visualStatus: 'missing' });
  try {
    const result = await h.service.migrate('p1');
    assert.equal(result.visualContextStatus, 'ready');
  } finally { await h.cleanup(); }
});

test('15.5 已关联文档的旧项目迁移时重新合并，生成 Resolved Context', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    const result = await h.service.migrate('p1');
    assert.ok(result.resolvedGeneratedAt);
  } finally { await h.cleanup(); }
});

test('15.5 迁移失败（rebuild 异常）不破坏原文件，也不抛出', async () => {
  const h = await createHarness({ visualStatus: 'missing', rebuildThrows: true });
  try {
    const result = await h.service.migrate('p1');
    assert.equal(result.visualContextStatus, 'missing');
  } finally { await h.cleanup(); }
});

test('15.5 旧文档任务可经 Legacy Adapter 转换为 DocumentVisualContext（复用既有能力）', async () => {
  // 该能力由 document-context-service.adaptLegacyRun 提供，已有独立测试覆盖；
  // 此处确认集成层 resolve 在文档已转换（getExtracted 可用）时能正常合并。
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    const resolved = await h.service.resolve('p1');
    assert.equal(resolved.sourceVersions.documentVisualContext, '1.0');
  } finally { await h.cleanup(); }
});

// ─────────────────────────────────────────────────────────────
// §15.6 端到端测试（关联 → 解决冲突 → 生成 Resolved → 进入 Reference 消费）
// ─────────────────────────────────────────────────────────────

test('15.6 端到端：关联 → 合并 → 解决身份冲突 → Resolved 可用 → Reference 读取合并视图', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    const resolved = await h.service.resolve('p1');

    // 默认存在未解决的身份冲突（行业：视觉「茶饮」 vs 文档「茶饮零售」）
    const conflicts = await h.service.listConflicts('p1');
    const industryConflict = conflicts.find((c) => c.field === 'industry');
    assert.ok(industryConflict && industryConflict.resolution === 'unresolved');
    assert.equal(hasBlockingConflict(resolved), true);

    // 用户确认采用文档结果（行业），并确认核心产品以视觉主源为准（茶礼盒为文档额外项，需人工确认）
    const updated = await h.service.applyConflictResolution('p1', [
      { field: 'industry', resolution: 'document_wins', value: '茶饮零售' },
      { field: 'products', resolution: 'user_confirmed', value: ['手作茶饮'] }
    ]);
    assert.equal(updated.identity.industry, '茶饮零售');
    assert.equal(updated.conflicts.find((c) => c.field === 'industry')!.resolution, 'document_wins');
    assert.equal(updated.conflicts.find((c) => c.field === 'products')!.resolution, 'user_confirmed');
    assert.equal(hasBlockingConflict(updated), false);

    // 重新读取应拿到已确认的 Resolved（缓存未失效）
    const reread = await h.service.getResolved('p1');
    assert.ok(reread);
    assert.equal(reread!.identity.industry, '茶饮零售');

    // Reference 流水线消费合并视图：身份来自视觉主源，文档补充字段进入 facts
    const merged = resolvedToMerged(updated);
    assert.equal(merged.brandName, '冯烫烫'); // 视觉优先，未被文档覆盖
    assert.equal(merged.industry, '茶饮零售'); // 用户确认值
    assert.deepEqual(merged.coreProducts, ['手作茶饮']); // 视觉主源
    assert.ok(merged.facts.services.includes('会员订阅')); // 文档补充
    assert.ok(merged.conflicts.some((c) => c.includes('industry')));
  } finally { await h.cleanup(); }
});

test('15.6 阻断性冲突未解决时阻断 Reference Workflow（hasBlockingConflict 门禁）', async () => {
  const h = await createHarness();
  try {
    await h.service.linkDocumentContext('p1', 'd1');
    const resolved = await h.service.resolve('p1');
    // 行业冲突未解决 → 阻断
    assert.equal(hasBlockingConflict(resolved), true);
    const merged = resolvedToMerged(resolved);
    // Reference Anchor 服务据此抛 IDENTITY_CONFLICT_UNRESOLVED，此处验证门禁信号正确
    assert.ok(merged.conflicts.some((c) => c.includes('industry')));
  } finally { await h.cleanup(); }
});
