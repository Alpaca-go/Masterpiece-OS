/**
 * Document Context Semantic Core — extracted from
 *   packages/runtime-core/src/application/document-context-core.ts
 *
 * CI-3 ownership: pure semantic logic; zero IO; zero model calls; fully
 * deterministic. CI does NOT import runtime-core. This file uses only
 * CI-local types and project-contracts.
 *
 * Spec #5: primary extraction candidate is document-context-core.ts.
 *         Copy → parity → compatibility → selected consumer switch.
 *
 * Behavior is byte-identical to the original. Do not modify.
 */

import type {
  DocumentContextWarning,
  DocumentVisualContext,
  DocumentVisualContextEvidence,
  NormalizedDocument,
  VisualStrategyCorpus,
} from './contracts.ts';

// ── Phase 2 文档分析上下文提取器：纯逻辑核心 ──
// CI-3: original comment retained for traceability. All semantics preserved.

export const DOCUMENT_CONTEXT_SCHEMA_VERSION = '1.0' as const;

const LIST_FIELDS = [
  'products',
  'services',
  'targetAudience',
  'brandPersonality',
  'visualPreferences',
  'requiredTouchpoints',
  'lockedFacts',
  'prohibitedDirections'
] as const;

type ListField = (typeof LIST_FIELDS)[number];

const EVIDENCE_FIELDS = new Set<string>([
  'brandName',
  'industry',
  'pricePositioning',
  'businessModel',
  ...LIST_FIELDS
]);

// 与视觉设计无关、默认压缩的主题（用于剔除模型越权输出的市场类事实）
const NON_VISUAL_PATTERN = /(市场规模|市场份额|复合增长率|CAGR|销售预测|营收预测|财务(数据|报表|预测)|融资|组织(架构|结构)|人员编制|渗透率|行业发展史)/u;

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanStringOrNull(value: unknown): string | null {
  const text = cleanString(value);
  return text ? text : null;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of value) {
    const text = cleanString(item);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

// ── Schema 校验（与 schemas/document-visual-context.schema.json 对齐）──

export function validateDocumentVisualContext(input: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['context 必须是对象'] };
  }
  const value = input as Record<string, unknown>;
  if (value.schemaVersion !== DOCUMENT_CONTEXT_SCHEMA_VERSION) errors.push('schemaVersion 必须为 "1.0"');
  if (!cleanString(value.sourceRunId)) errors.push('sourceRunId 不能为空');
  if (!cleanString(value.generatedAt)) errors.push('generatedAt 不能为空');
  if (typeof value.brandName !== 'string') errors.push('brandName 必须是字符串');
  if (typeof value.industry !== 'string') errors.push('industry 必须是字符串');
  for (const field of LIST_FIELDS) {
    const list = value[field];
    if (!Array.isArray(list) || list.some((item) => typeof item !== 'string')) errors.push(`${field} 必须是字符串数组`);
  }
  for (const field of ['pricePositioning', 'businessModel'] as const) {
    if (value[field] !== null && typeof value[field] !== 'string') errors.push(`${field} 必须是字符串或 null`);
  }
  if (!Array.isArray(value.unknownFields) || (value.unknownFields as unknown[]).some((item) => typeof item !== 'string')) {
    errors.push('unknownFields 必须是字符串数组');
  }
  if (!Array.isArray(value.evidence)) errors.push('evidence 必须是数组');
  else {
    (value.evidence as unknown[]).forEach((entry, index) => {
      const item = entry as Record<string, unknown> | null;
      if (!item || typeof item !== 'object') { errors.push(`evidence[${index}] 必须是对象`); return; }
      if (!cleanString(item.field)) errors.push(`evidence[${index}].field 不能为空`);
      if (!cleanString(item.documentId)) errors.push(`evidence[${index}].documentId 不能为空`);
      if (!cleanString(item.filename)) errors.push(`evidence[${index}].filename 不能为空`);
      if (typeof item.summary !== 'string') errors.push(`evidence[${index}].summary 必须是字符串`);
    });
  }
  if (!Array.isArray(value.sourceDocuments)) errors.push('sourceDocuments 必须是数组');
  else {
    (value.sourceDocuments as unknown[]).forEach((entry, index) => {
      const item = entry as Record<string, unknown> | null;
      if (!item || typeof item !== 'object') { errors.push(`sourceDocuments[${index}] 必须是对象`); return; }
      if (!cleanString(item.documentId)) errors.push(`sourceDocuments[${index}].documentId 不能为空`);
      if (!cleanString(item.filename)) errors.push(`sourceDocuments[${index}].filename 不能为空`);
      if (!['pdf', 'docx', 'markdown', 'text'].includes(String(item.sourceType))) errors.push(`sourceDocuments[${index}].sourceType 非法`);
      if (typeof item.characterCount !== 'number' || item.characterCount < 0) errors.push(`sourceDocuments[${index}].characterCount 非法`);
    });
  }
  return { valid: errors.length === 0, errors };
}

// ── 模型输出 JSON 解析 ──

export function parseModelJson(text: string): Record<string, unknown> {
  const stripped = String(text || '')
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json)?/gi, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw Object.assign(new Error('模型输出中未找到 JSON 对象'), { code: 'DOCUMENT_CONTEXT_SCHEMA_INVALID' });
  }
  try {
    const parsed = JSON.parse(stripped.slice(start, end + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('JSON 根节点必须是对象');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    throw Object.assign(new Error(`模型输出 JSON 解析失败：${(error as Error).message}`), { code: 'DOCUMENT_CONTEXT_SCHEMA_INVALID' });
  }
}

// ── 提示词（1 次结构化提取 + 最多 1 次 Repair）──

const EXTRACTION_SYSTEM_PROMPT = `你是品牌视觉设计项目的信息提取器。你的任务必须分两步进行：

【Step 1：对每条陈述做 epistemic classification（认知分类）】
【Step 2：然后根据分类结果 routing 到正确字段】

严禁跳过 Step 1 直接猜字段。分类错误会污染 Project Truth。

==============================================================
【Step 1 · 认知分类 Epistemic Classification】
==============================================================

A. FACT（事实）
   文档明确陈述的可观察、可验证项目属性。不含任何 hedging、不含希望/想要/可以等情态词。
   例：
   - "品牌名称是品牌A" → FACT
   - "业务为医美生态平台" → FACT

B. LOCKED_RULE（不可变更规则）
   文档使用 strong lock signal 表达"不可改变 / 必须保持 / 不允许 / 固定 / 锁定"的
   non-negotiable rule。strong lock signal 词：
   必须 / 不可 / 不允许 / 不得 / 不能修改 / 固定 / 锁定 / 禁止 / 务必保持 / 必须保持 / 不得改变
   例：
   - "Logo 不允许修改" → LOCKED_RULE
   - "信息层级固定且不得修改" → LOCKED_RULE
   - "Logo 必须原样使用" → LOCKED_RULE
   - "所有包装必须共享同一信息架构，不得调整" → LOCKED_RULE
   - "原始 Logo 不允许修改、重绘、拆解、替换、仿造或改变内部字形" → LOCKED_RULE

C. USER_REQUIREMENT（用户需求 / 偏好）
   文档使用 soft requirement 词陈述创意要求、视觉偏好、设计愿望。
   soft requirement 词：
   希望 / 想要 / 期待 / 应该 / 鼓励 / 倾向 / 期望 / 希望强调
   例：
   - "希望整体视觉更专业理性" → USER_REQUIREMENT
   - "希望强调全链生态平台协同" → USER_REQUIREMENT
   - "空间氛围希望更具疗愈感" → USER_REQUIREMENT
   - "希望建立稳定的信息层级" → USER_REQUIREMENT（"稳定"是 weak lexeme，单独不构成 LOCKED）
   - "希望保持视觉一致性" → USER_REQUIREMENT（"保持"是 weak lexeme，单独不构成 LOCKED）
   - "不同包装共享同一套信息架构" → USER_REQUIREMENT（"共享"是 weak lexeme）

D. CREATIVE_HYPOTHESIS（创意假设 / 可探索方向）
   文档使用 creative hypothesis 词陈述可探索的创意假设。
   creative hypothesis 词：
   可以探索 / 可以尝试 / 或许 / 可考虑 / 建议探索 / 尝试 / 可能采用 / 可以延展
   例：
   - "可以探索网络化视觉语言" → CREATIVE_HYPOTHESIS
   - "可以延续现有品牌资产" → CREATIVE_HYPOTHESIS

E. MODEL_INFERENCE（模型推断 / 不确定）
   文档使用 hedging 词陈述判断、推测或不确定。
   hedging 词：
   可能 / 似乎 / 大概 / 推测 / 看起来像 / 或许属于 / 待确认 / 暂不确定
   例：
   - "行业可能属于医美服务" → MODEL_INFERENCE
   - "目标用户似乎为高端消费者" → MODEL_INFERENCE

==============================================================
【强约束：Weak Lexeme 不构成 LOCKED】
==============================================================

以下 weak / contextual 词单独出现不构成 LOCKED_RULE（与是否有"必须"等强信号无关，
仍要按 Step 1 分类优先规则判定）：

  保持 / 一致 / 稳定 / 统一 / 贯穿 / 共享 / 延续 / 持续 / 一致性 / 稳定性

对比：
  - "希望保持视觉一致性"             → USER_REQUIREMENT
  - "必须保持 Logo 不变"              → LOCKED_RULE（"必须" 强信号 + Logo non-negotiable 主体）
  - "希望建立稳定的信息层级"           → USER_REQUIREMENT（只有"希望"+"稳定"）
  - "信息层级固定且不得修改"           → LOCKED_RULE（"固定"+"不得修改" + 主体）
  - "不同包装共享同一信息架构"         → USER_REQUIREMENT（只有"共享"）
  - "所有包装必须共享且不得改变"       → LOCKED_RULE（"必须"+"不得改变" + 主体）
  - "可以延续品牌资产"                → CREATIVE_HYPOTHESIS
  - "Logo 必须原样使用"               → LOCKED_RULE（"必须" + Logo non-negotiable 主体）

==============================================================
【Step 2 · 字段路由 Field Routing】
==============================================================

| 分类结果 | 路由字段 |
|---|---|
| FACT (品牌名) | brandName |
| FACT (行业，无 hedging) | industry |
| FACT (产品/服务/价格/模式) | products / services / targetAudience / pricePositioning / businessModel |
| LOCKED_RULE | lockedFacts |
| USER_REQUIREMENT | visualPreferences / brandPersonality / requiredTouchpoints |
| CREATIVE_HYPOTHESIS | visualPreferences (aspirational) / requiredTouchpoints (aspirational) |
| MODEL_INFERENCE | industry 留空 → unknownFields; 或 evidence 标注 hedge |
| 显式禁止方向（"禁止X" / "X 不可"） | prohibitedDirections |

==============================================================
【品牌身份特例 Brand Identity Special Rule】
==============================================================

"品牌名称是X" / "品牌名称必须保持为X" / "品牌名称固定为X" 一律：
  → brandName = X（FACT identity value）
  → 不得把 X 复制到 lockedFacts 形成第二个 carrier

"必须保持" / "固定" 表达的是 non-mutation 要求；brand identity value 本身
是事实陈述。Brand identity = fact, never a locked fact entry。

==============================================================
【禁止的负向路由 Negative Routing Rules】
==============================================================

【绝对禁止】将以下内容路由到 lockedFacts：
  - 含 "希望 / 想要 / 期待 / 应该 / 鼓励 / 倾向 / 期望" 的陈述
  - 含 "可以探索 / 可以尝试 / 或许 / 可考虑 / 建议探索" 的陈述
  - 任何"保持 / 一致 / 稳定 / 统一 / 贯穿 / 共享" 单独出现的弱语

【绝对禁止】将以下内容升级为 AUTHORITATIVE fact：
  - 含 "可能 / 似乎 / 大概 / 推测 / 或许属于 / 待确认" 的 hedging 句
  - industry 字段必须留空字符串，字段名加入 unknownFields
  - 不得写入 industry 字段作为确认事实

【绝对禁止】将 brand identity value（"品牌A"等）复制到 lockedFacts。

【允许】lock signal + non-negotiable 主体同时存在时进入 lockedFacts：
  例："原始 Logo 不允许修改、重绘、拆解、替换、仿造" → lockedFacts
  例："Logo 必须原样使用" → lockedFacts
  例："所有包装必须共享同一信息架构，不得调整" → lockedFacts

==============================================================
【正例 Examples】
==============================================================

输入："希望视觉保持一致"
  → brandPersonality: ["希望视觉保持一致"]
  → visualPreferences: ["希望视觉保持一致"]
  → lockedFacts: []   ← 严禁

输入："Logo 必须保持不变"
  → lockedFacts: ["Logo 必须保持不变"]
  → brandPersonality: []
  → visualPreferences: []

输入："可以探索网络化结构"
  → visualPreferences: ["可以探索网络化结构"] (creative_hypothesis)
  → lockedFacts: []

输入："行业可能属于医美"
  → industry: ""   ← 留空
  → unknownFields: ["industry"]
  → evidence: [{ field: "industry", summary: "hedged=可能；industry 推测医美，不进入 authoritative fact" }]

输入："品牌名称必须保持为品牌A"
  → brandName: "品牌A"   ← 品牌身份走 brandName
  → lockedFacts: []   ← 严禁把 "品牌A" 复制为 lockedFact

输入："我们希望这个项目的方向探索能够围绕方剂可读性、药材地道感、功效传承这三个主题来展开"
  → brandPersonality: ["方剂可读性", "药材地道感", "功效传承"]
  → visualPreferences: ["方剂可读性", "药材地道感", "功效传承"]
  → lockedFacts: []   ← "希望" + 创意主题 → USER_REQUIREMENT

输入："我们希望保持一种贯穿触点的视觉一致性"
  → visualPreferences: ["希望保持一种贯穿触点的视觉一致性"]  ← USER_REQUIREMENT
  → lockedFacts: []   ← "希望" + weak lexeme → 严禁 LOCKED

输入："不同包装形态共享同一套信息架构，但允许根据具体形态调整信息密度"
  → requiredTouchpoints: ["共享同一套信息架构"]  ← 共享 = weak lexeme
  → visualPreferences: ["允许根据具体形态调整信息密度"]
  → lockedFacts: []   ← 严禁

==============================================================
【通用规则 General Rules】
==============================================================

1. 只输出一个 JSON 对象，不要输出任何解释、Markdown 或代码块以外的文本。
2. 严禁编造。文档里没有明确写出的信息，一律不要填：字符串字段留空字符串或 null，数组留空，并把字段名写入 unknownFields。
3. 忽略与视觉设计无关的内容：市场规模、行业发展史、销售/财务预测、组织架构、运营流程、重复的品牌故事。
4. 每个非空字段尽量给出 evidence 条目（field、documentId、filename、section、summary），summary 用一句话概括文档原文依据。
5. 不同文档对同一事实说法冲突时，把冲突写进 conflicts 数组（每条一句话，说明字段、两个来源和两种说法），不要自行裁决。
6. 当 document 包含禁止方向（"禁止X" / "X 不可" / "不要做X"），路由到 prohibitedDirections（AUTHORITATIVE_DOCUMENT_FACT），不要路由到 lockedFacts（除非同时含"必须"等强锁信号）。

==============================================================
【输出 JSON 形状】
==============================================================
{
  "brandName": string,
  "industry": string,
  "products": string[],
  "services": string[],
  "targetAudience": string[],
  "pricePositioning": string | null,
  "businessModel": string | null,
  "brandPersonality": string[],
  "visualPreferences": string[],
  "requiredTouchpoints": string[],
  "lockedFacts": string[],
  "prohibitedDirections": string[],
  "unknownFields": string[],
  "evidence": [{ "field": string, "documentId": string, "filename": string, "section": string, "summary": string }],
  "conflicts": string[]
}`;

const PER_DOCUMENT_CHAR_LIMIT = 16000;
const TOTAL_CHAR_LIMIT = 60000;

export function buildExtractionMessages(corpus: VisualStrategyCorpus): Array<{ role: string; content: string }> {
  const blocks: string[] = [];
  let total = 0;
  for (const document of corpus.documents) {
    let body = document.rawText.slice(0, PER_DOCUMENT_CHAR_LIMIT);
    if (total + body.length > TOTAL_CHAR_LIMIT) body = body.slice(0, Math.max(0, TOTAL_CHAR_LIMIT - total));
    total += body.length;
    const tables = document.tables.length
      ? `\n[表格]\n${document.tables.map((table) => table.markdown).join('\n\n').slice(0, 4000)}`
      : '';
    blocks.push([
      `<document id="${document.id}" filename="${document.filename}" role="${document.documentRole || 'unknown'}"${document.title ? ` title="${document.title}"` : ''}>`,
      body + tables,
      '</document>'
    ].join('\n'));
    if (total >= TOTAL_CHAR_LIMIT) break;
  }
  return [
    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
    { role: 'user', content: `请从以下 ${corpus.documents.length} 份策略文档中提取项目视觉上下文。文档角色仅用于事实优先级（visual-guideline > creative-brief > product-information > brand-strategy > market-research > unknown）。\n\n${blocks.join('\n\n')}` }
  ];
}

export function buildRepairMessages(previousText: string, errors: string[]): Array<{ role: string; content: string }> {
  return [
    { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `你上一次的输出无法通过校验。请只输出修复后的完整 JSON 对象，不要输出其它内容。\n\n校验错误：\n${errors.map((error) => `- ${error}`).join('\n')}\n\n上一次输出：\n${String(previousText || '').slice(0, 20000)}`
    }
  ];
}

// ── 确定性归一化（03-local-normalization）──

export interface NormalizedExtraction {
  context: DocumentVisualContext;
  warnings: DocumentContextWarning[];
}

export function normalizeExtractedContext(
  raw: Record<string, unknown>,
  corpus: VisualStrategyCorpus,
  runId: string,
  now: () => string = () => new Date().toISOString()
): NormalizedExtraction {
  const documentIds = new Set(corpus.documents.map((document) => document.id));
  const filenameById = new Map(corpus.documents.map((document) => [document.id, document.filename]));

  const evidence: DocumentVisualContextEvidence[] = [];
  if (Array.isArray(raw.evidence)) {
    for (const entry of raw.evidence as Array<Record<string, unknown>>) {
      if (!entry || typeof entry !== 'object') continue;
      const field = cleanString(entry.field);
      const documentId = cleanString(entry.documentId);
      if (!EVIDENCE_FIELDS.has(field) || !documentIds.has(documentId)) continue;
      const item: DocumentVisualContextEvidence = {
        field,
        documentId,
        filename: filenameById.get(documentId) || cleanString(entry.filename),
        summary: cleanString(entry.summary)
      };
      const section = cleanString(entry.section);
      if (section) item.section = section;
      if (typeof entry.page === 'number' && Number.isFinite(entry.page)) item.page = entry.page;
      evidence.push(item);
    }
  }

  const lists = {} as Record<ListField, string[]>;
  for (const field of LIST_FIELDS) {
    // 剔除模型越权带入的市场类事实（市场规模、财务预测等不进入视觉简报）
    lists[field] = cleanStringArray(raw[field]).filter((item) => !NON_VISUAL_PATTERN.test(item));
  }

  const brandName = cleanString(raw.brandName);
  const industry = cleanString(raw.industry);
  const pricePositioning = cleanStringOrNull(raw.pricePositioning);
  const businessModel = cleanStringOrNull(raw.businessModel);

  const unknownFields = new Set(cleanStringArray(raw.unknownFields).filter((field) => EVIDENCE_FIELDS.has(field)));
  if (!brandName) unknownFields.add('brandName');
  if (!industry) unknownFields.add('industry');
  if (!lists.targetAudience.length) unknownFields.add('targetAudience');
  if (!pricePositioning) unknownFields.add('pricePositioning');
  if (!businessModel) unknownFields.add('businessModel');
  // 非空字段不应停留在 unknownFields
  for (const field of [...unknownFields]) {
    if (field === 'brandName' && brandName) unknownFields.delete(field);
    if (field === 'industry' && industry) unknownFields.delete(field);
    if (field === 'pricePositioning' && pricePositioning) unknownFields.delete(field);
    if (field === 'businessModel' && businessModel) unknownFields.delete(field);
    if ((LIST_FIELDS as readonly string[]).includes(field) && lists[field as ListField].length) unknownFields.delete(field);
  }

  const context: DocumentVisualContext = {
    schemaVersion: DOCUMENT_CONTEXT_SCHEMA_VERSION,
    sourceRunId: runId,
    generatedAt: now(),
    brandName,
    industry,
    products: lists.products,
    services: lists.services,
    targetAudience: lists.targetAudience,
    pricePositioning,
    businessModel,
    brandPersonality: lists.brandPersonality,
    visualPreferences: lists.visualPreferences,
    requiredTouchpoints: lists.requiredTouchpoints,
    lockedFacts: lists.lockedFacts,
    prohibitedDirections: lists.prohibitedDirections,
    unknownFields: [...unknownFields].sort(),
    evidence,
    sourceDocuments: corpus.documents.map((document) => ({
      documentId: document.id,
      filename: document.filename,
      sourceType: document.sourceType,
      ...(document.title ? { title: document.title } : {}),
      characterCount: document.characterCount,
      ...(typeof document.pageCount === 'number' ? { pageCount: document.pageCount } : {})
    }))
  };

  const warnings: DocumentContextWarning[] = [];
  for (const document of corpus.documents) {
    if (!document.documentRole || document.documentRole === 'unknown') {
      warnings.push({ code: 'DOCUMENT_ROLE_UNKNOWN', message: `无法识别文档角色：${document.filename}` });
    }
  }
  if (unknownFields.has('targetAudience')) warnings.push({ code: 'TARGET_AUDIENCE_UNKNOWN', message: '文档中未找到明确的目标用户描述', field: 'targetAudience' });
  if (unknownFields.has('pricePositioning')) warnings.push({ code: 'PRICE_POSITIONING_UNKNOWN', message: '文档中未找到明确的价格定位', field: 'pricePositioning' });
  if (unknownFields.has('businessModel')) warnings.push({ code: 'BUSINESS_MODEL_UNKNOWN', message: '文档中未找到明确的商业模式', field: 'businessModel' });
  for (const conflict of cleanStringArray(raw.conflicts)) {
    warnings.push({ code: 'DOCUMENT_FACT_CONFLICT', message: conflict });
  }
  const populatedFields = [
    brandName ? 'brandName' : null,
    industry ? 'industry' : null,
    ...LIST_FIELDS.filter((field) => lists[field].length)
  ].filter((field): field is string => Boolean(field));
  const evidencedFields = new Set(evidence.map((item) => item.field));
  for (const field of populatedFields) {
    if (!evidencedFields.has(field)) {
      warnings.push({ code: 'DOCUMENT_SOURCE_WEAK', message: `字段 ${field} 缺少可追溯的来源证据`, field });
    }
  }
  return { context, warnings };
}

export function isContextEmpty(context: DocumentVisualContext): boolean {
  return !context.brandName
    && !context.industry
    && !context.pricePositioning
    && !context.businessModel
    && LIST_FIELDS.every((field) => context[field].length === 0);
}

// ── 本地简报编译（05-local-brief-compiler，零模型调用）──

function section(lines: string[], title: string, body: string[]): void {
  lines.push(`## ${title}`, '');
  if (body.length) lines.push(...body);
  else lines.push('（待确认）');
  lines.push('');
}

function bullets(items: string[]): string[] {
  return items.map((item) => `- ${item}`);
}

const FIELD_LABELS: Record<string, string> = {
  brandName: '品牌名称',
  industry: '行业',
  products: '产品',
  services: '服务',
  targetAudience: '目标用户',
  pricePositioning: '价格定位',
  businessModel: '商业模式',
  brandPersonality: '品牌气质',
  visualPreferences: '视觉偏好',
  requiredTouchpoints: '必要设计触点',
  lockedFacts: 'Locked Facts',
  prohibitedDirections: '禁止方向'
};

export function compileContextBrief(context: DocumentVisualContext): string {
  const lines: string[] = ['# 项目视觉上下文简报', ''];
  section(lines, '1. 项目身份', [
    `- 品牌名称：${context.brandName || '待确认'}`,
    `- 行业：${context.industry || '待确认'}`
  ]);
  section(lines, '2. 产品与服务', [
    ...(context.products.length ? ['产品：', ...bullets(context.products)] : []),
    ...(context.services.length ? ['服务：', ...bullets(context.services)] : [])
  ]);
  section(lines, '3. 目标用户与价格位置', [
    ...(context.targetAudience.length ? ['目标用户：', ...bullets(context.targetAudience)] : ['- 目标用户：待确认']),
    `- 价格定位：${context.pricePositioning || '待确认'}`,
    `- 商业模式：${context.businessModel || '待确认'}`
  ]);
  section(lines, '4. 品牌气质与视觉偏好', [
    ...(context.brandPersonality.length ? ['品牌气质：', ...bullets(context.brandPersonality)] : []),
    ...(context.visualPreferences.length ? ['视觉偏好：', ...bullets(context.visualPreferences)] : [])
  ]);
  section(lines, '5. 必要设计触点', bullets(context.requiredTouchpoints));
  section(lines, '6. Locked Facts', bullets(context.lockedFacts));
  const explorable = context.lockedFacts.length || context.prohibitedDirections.length
    ? ['除 Locked Facts 与禁止方向之外，风格语言、色彩系统、版式结构、图形语法均可自由探索。']
    : ['文档未锁定任何视觉资产或方向，全部视觉语言均可自由探索。'];
  if (context.visualPreferences.length) explorable.push('探索时建议以已声明的视觉偏好为锚点，但不受其唯一限定。');
  section(lines, '7. 可以探索的范围', explorable);
  section(lines, '8. 禁止方向', bullets(context.prohibitedDirections));
  section(lines, '9. 待确认信息', bullets(context.unknownFields.map((field) => FIELD_LABELS[field] || field)));
  return `${lines.join('\n').trim()}\n`;
}

// ── Legacy Adapter（§14：旧三方向结果 → DocumentVisualContext）──

function pickStrings(...candidates: unknown[]): string[] {
  for (const candidate of candidates) {
    const list = cleanStringArray(candidate);
    if (list.length) return list;
  }
  return [];
}

function pickString(...candidates: unknown[]): string {
  for (const candidate of candidates) {
    const text = cleanString(candidate);
    if (text) return text;
  }
  return '';
}

export function adaptLegacyVisualTranslationResult(input: unknown): DocumentVisualContext {
  const root = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const run = (root.run && typeof root.run === 'object' ? root.run : {}) as Record<string, unknown>;
  const brief = (root.visualBrief || root.brief || root.visual_brief || {}) as Record<string, unknown>;
  const facts = (root.visualFacts || root.facts || root.visual_facts || {}) as Record<string, unknown>;
  const identity = (brief.identity || facts.identity || {}) as Record<string, unknown>;

  const brandName = pickString(identity.brandName, identity.brand_name, brief.brandName, facts.brandName, run.projectName, root.projectName);
  const industry = pickString(identity.industry, brief.industry, facts.industry);
  const targetAudience = pickStrings(brief.targetAudience, brief.target_audience, facts.targetAudience, facts.target_audience);
  const products = pickStrings(brief.products, facts.products, facts.productFacts, facts.product_facts);
  const services = pickStrings(brief.services, facts.services);
  const brandPersonality = pickStrings(brief.brandPersonality, brief.brand_personality, facts.brandPersonality, facts.personality);
  const visualPreferences = pickStrings(brief.visualPreferences, brief.visual_preferences, facts.visualPreferences, facts.stylePreferences);
  const requiredTouchpoints = pickStrings(brief.requiredTouchpoints, brief.touchpoints, facts.touchpoints);
  const lockedFacts = pickStrings(root.lockedFacts, brief.lockedFacts, facts.lockedFacts, facts.locked_facts);
  const prohibitedDirections = pickStrings(brief.prohibitedDirections, brief.prohibited, facts.prohibitedDirections);
  const pricePositioning = cleanStringOrNull(pickString(brief.pricePositioning, brief.price_positioning, facts.pricePositioning));
  const businessModel = cleanStringOrNull(pickString(brief.businessModel, brief.business_model, facts.businessModel));

  const unknownFields: string[] = [];
  if (!brandName) unknownFields.push('brandName');
  if (!industry) unknownFields.push('industry');
  if (!targetAudience.length) unknownFields.push('targetAudience');
  if (!pricePositioning) unknownFields.push('pricePositioning');
  if (!businessModel) unknownFields.push('businessModel');

  const documentNames = cleanStringArray(run.documentNames);
  return {
    schemaVersion: DOCUMENT_CONTEXT_SCHEMA_VERSION,
    sourceRunId: pickString(run.id, root.runId, root.run_id) || 'legacy-run',
    generatedAt: new Date().toISOString(),
    brandName,
    industry,
    products,
    services,
    targetAudience,
    pricePositioning,
    businessModel,
    brandPersonality,
    visualPreferences,
    requiredTouchpoints,
    lockedFacts,
    prohibitedDirections,
    unknownFields: unknownFields.sort(),
    evidence: [],
    sourceDocuments: documentNames.map((filename, index) => ({
      documentId: `legacy-doc-${index + 1}`,
      filename,
      sourceType: filename.toLowerCase().endsWith('.pdf') ? 'pdf' : filename.toLowerCase().endsWith('.docx') ? 'docx' : filename.toLowerCase().endsWith('.txt') ? 'text' : 'markdown',
      characterCount: 0
    }))
  };
}
