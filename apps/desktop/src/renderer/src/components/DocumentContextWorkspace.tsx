import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useMemo, useState } from 'react';
import type {
  DocumentContextProgress,
  DocumentContextRun,
  DocumentContextStage,
  DocumentVisualContext,
  PublicSettings,
  VisualTranslationDocumentSummary,
  VisualTranslationRunRecord
} from '../../../shared/types';
import { cleanError, formatDurationHuman } from '../utils';

interface Props {
  settings: PublicSettings;
  selectedApiProfileId: string;
  initialRunId?: string;
  onApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

const STAGES: Array<[DocumentContextStage, string]> = [
  ['00-document-preparation', '文档准备'],
  ['01-document-role-index', '角色索引'],
  ['02-visual-context-extraction', '上下文提取'],
  ['03-local-normalization', '本地归一化'],
  ['04-human-confirmation', '人工确认'],
  ['05-local-brief-compiler', '简报编译']
];

const STAGE_INDEX: Record<DocumentContextStage, number> = {
  '00-document-preparation': 0,
  '01-document-role-index': 1,
  '02-visual-context-extraction': 2,
  '03-local-normalization': 3,
  '04-human-confirmation': 4,
  '05-local-brief-compiler': 5
};

const STATUS_LABELS: Record<DocumentContextRun['status'], string> = {
  pending: '等待中',
  parsing: '解析文档中',
  extracting: '提取上下文中',
  repairing: '修复输出中',
  awaiting_confirmation: '待人工确认',
  compiling: '待编译简报',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消'
};

const EXECUTING_STATUSES = new Set<DocumentContextRun['status']>(['pending', 'parsing', 'extracting', 'repairing']);

type ScalarKey = 'brandName' | 'industry' | 'pricePositioning' | 'businessModel';
type ListKey = 'products' | 'services' | 'targetAudience' | 'brandPersonality' | 'visualPreferences' | 'requiredTouchpoints' | 'lockedFacts' | 'prohibitedDirections';

const SCALAR_FIELDS: Array<{ key: ScalarKey; label: string; nullable: boolean }> = [
  { key: 'brandName', label: '品牌名称', nullable: false },
  { key: 'industry', label: '行业', nullable: false },
  { key: 'pricePositioning', label: '价格定位', nullable: true },
  { key: 'businessModel', label: '商业模式', nullable: true }
];

const LIST_FIELDS: Array<{ key: ListKey; label: string; hint: string }> = [
  { key: 'products', label: '产品', hint: '文档中明确提到的产品' },
  { key: 'services', label: '服务', hint: '文档中明确提到的服务' },
  { key: 'targetAudience', label: '目标用户', hint: '目标人群画像' },
  { key: 'brandPersonality', label: '品牌气质', hint: '品牌性格与调性关键词' },
  { key: 'visualPreferences', label: '视觉偏好', hint: '文档中提到的视觉倾向或明确喜好' },
  { key: 'requiredTouchpoints', label: '必要设计触点', hint: '必须覆盖的设计物料 / 场景' },
  { key: 'lockedFacts', label: 'Locked Facts', hint: '不可违背的既定事实' },
  { key: 'prohibitedDirections', label: '禁止方向', hint: '文档中明确禁止的方向' }
];

function FieldEvidence({ field, context }: { field: string; context: DocumentVisualContext }) {
  const entries = context.evidence.filter((item) => item.field === field);
  if (!entries.length) return null;
  return <details className="context-evidence">
    <summary>查看来源（{entries.length}）</summary>
    <ul>{entries.map((entry, index) => <li key={`${entry.documentId}-${index}`}>
      <strong>{entry.filename}</strong>
      {entry.section ? <span> · {entry.section}</span> : null}
      {entry.page ? <span> · 第 {entry.page} 页</span> : null}
      <p>{entry.summary}</p>
    </li>)}</ul>
  </details>;
}

export function DocumentContextWorkspace({ settings, selectedApiProfileId, initialRunId, onApiProfileChange, onBack, onOpenSettings }: Props) {
  const profiles = settings.profiles.filter((profile) => profile.isEnabled);
  const initialProfile = profiles.find((profile) => profile.isDefault) || profiles[0];
  const profileId = profiles.some((profile) => profile.id === selectedApiProfileId) ? selectedApiProfileId : initialProfile?.id || '';
  const [documents, setDocuments] = useState<VisualTranslationDocumentSummary[]>([]);
  const [runs, setRuns] = useState<DocumentContextRun[]>([]);
  const [activeRunId, setActiveRunId] = useState('');
  const [progress, setProgress] = useState<DocumentContextProgress | null>(null);
  const [selectedRun, setSelectedRun] = useState<DocumentContextRun | null>(null);
  const [view, setView] = useState<'workspace' | 'confirm' | 'brief'>('workspace');
  const [draft, setDraft] = useState<DocumentVisualContext | null>(null);
  const [confirmedFields, setConfirmedFields] = useState<Set<string>>(new Set());
  const [briefMarkdown, setBriefMarkdown] = useState('');
  const [briefHtml, setBriefHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [legacyRuns, setLegacyRuns] = useState<VisualTranslationRunRecord[] | null>(null);
  const [legacyContextJson, setLegacyContextJson] = useState('');
  const activeStageIndex = progress ? STAGE_INDEX[progress.stage] : -1;
  const totalCharacters = useMemo(() => documents.reduce((sum, document) => sum + document.characterCount, 0), [documents]);

  async function refreshRuns() {
    const next = await window.masterpiece.documentContext.listRuns();
    setRuns(next);
    if (selectedRun) setSelectedRun(next.find((run) => run.id === selectedRun.id) || selectedRun);
    return next;
  }

  useEffect(() => {
    void refreshRuns().catch((reason) => setError(cleanError(reason)));
    return window.masterpiece.documentContext.onProgress((event) => {
      setActiveRunId(event.runId);
      setProgress(event);
    });
  }, []);

  useEffect(() => {
    void Promise.resolve(marked.parse(briefMarkdown)).then((value) => setBriefHtml(DOMPurify.sanitize(value)));
  }, [briefMarkdown]);

  useEffect(() => {
    if (!initialRunId) return;
    void (async () => {
      const next = await refreshRuns();
      const run = next.find((item) => item.id === initialRunId);
      if (run) await openRun(run);
    })().catch((reason) => setError(cleanError(reason)));
  }, [initialRunId]);

  async function addDocuments(paths: string[]) {
    setError('');
    try {
      if (!paths.length) return;
      setBusy(true);
      const mergedPaths = [...new Set([...documents.map((document) => document.path), ...paths])];
      setDocuments(await window.masterpiece.documentContext.inspectDocuments(mergedPaths));
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function chooseDocuments() {
    await addDocuments(await window.masterpiece.documentContext.chooseDocuments());
  }

  async function openConfirmation(run: DocumentContextRun) {
    setError('');
    setNotice('');
    const context = await window.masterpiece.documentContext.getExtracted(run.id);
    setSelectedRun(run);
    setDraft(structuredClone(context));
    setConfirmedFields(new Set());
    setView('confirm');
  }

  async function openBrief(run: DocumentContextRun) {
    setError('');
    setSelectedRun(run);
    setBriefMarkdown(await window.masterpiece.documentContext.readBrief(run.id));
    setView('brief');
  }

  async function openRun(run: DocumentContextRun) {
    try {
      if (run.status === 'completed') return await openBrief(run);
      if (run.status === 'awaiting_confirmation' || run.status === 'compiling') return await openConfirmation(run);
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function start() {
    if (!documents.length || !profileId) return;
    setBusy(true);
    setError('');
    setNotice('');
    setProgress(null);
    try {
      const run = await window.masterpiece.documentContext.start(documents.map((document) => document.path), profileId);
      setNotice('上下文提取完成，请逐项确认提取结果。系统不会自动生成设计方向。');
      await refreshRuns();
      if (run.status === 'awaiting_confirmation') await openConfirmation(run);
    } catch (reason) {
      setError(cleanError(reason));
      await refreshRuns().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function resume(run: DocumentContextRun) {
    setBusy(true);
    setError('');
    setNotice('');
    setActiveRunId(run.id);
    try {
      const next = await window.masterpiece.documentContext.resume(run.id, profileId || run.apiProfileId);
      await refreshRuns();
      if (next.status === 'awaiting_confirmation' || next.status === 'compiling') {
        setNotice('已恢复到人工确认阶段（复用本地缓存，未重复调用模型）。');
        await openConfirmation(next);
      } else if (next.status === 'completed') {
        await openBrief(next);
      }
    } catch (reason) {
      setError(cleanError(reason));
      await refreshRuns().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  function toggleFieldConfirmed(key: string) {
    setConfirmedFields((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateUnknown(context: DocumentVisualContext, key: string, unknown: boolean): string[] {
    const next = context.unknownFields.filter((item) => item !== key);
    if (unknown) next.push(key);
    return next;
  }

  function setScalar(key: ScalarKey, value: string) {
    setDraft((current) => {
      if (!current) return current;
      const trimmed = value;
      const nullable = SCALAR_FIELDS.find((field) => field.key === key)?.nullable;
      const nextValue = nullable && !trimmed.trim() ? null : trimmed;
      return { ...current, [key]: nextValue, unknownFields: updateUnknown(current, key, !trimmed.trim()) };
    });
  }

  function markScalarUnknown(key: ScalarKey) {
    setDraft((current) => {
      if (!current) return current;
      const nullable = SCALAR_FIELDS.find((field) => field.key === key)?.nullable;
      return { ...current, [key]: nullable ? null : '', unknownFields: updateUnknown(current, key, true) };
    });
  }

  function setListItem(key: ListKey, index: number, value: string) {
    setDraft((current) => {
      if (!current) return current;
      const list = [...current[key]];
      list[index] = value;
      return { ...current, [key]: list };
    });
  }

  function removeListItem(key: ListKey, index: number) {
    setDraft((current) => {
      if (!current) return current;
      const list = current[key].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [key]: list, unknownFields: updateUnknown(current, key, list.length === 0) };
    });
  }

  function addListItem(key: ListKey) {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, [key]: [...current[key], ''], unknownFields: updateUnknown(current, key, false) };
    });
  }

  function markListUnknown(key: ListKey) {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, [key]: [], unknownFields: updateUnknown(current, key, true) };
    });
  }

  async function confirmAndCompile() {
    if (!selectedRun || !draft) return;
    setBusy(true);
    setError('');
    try {
      const cleaned: DocumentVisualContext = {
        ...draft,
        brandName: draft.brandName.trim(),
        industry: draft.industry.trim(),
        pricePositioning: draft.pricePositioning?.trim() || null,
        businessModel: draft.businessModel?.trim() || null,
        products: draft.products.map((item) => item.trim()).filter(Boolean),
        services: draft.services.map((item) => item.trim()).filter(Boolean),
        targetAudience: draft.targetAudience.map((item) => item.trim()).filter(Boolean),
        brandPersonality: draft.brandPersonality.map((item) => item.trim()).filter(Boolean),
        visualPreferences: draft.visualPreferences.map((item) => item.trim()).filter(Boolean),
        requiredTouchpoints: draft.requiredTouchpoints.map((item) => item.trim()).filter(Boolean),
        lockedFacts: draft.lockedFacts.map((item) => item.trim()).filter(Boolean),
        prohibitedDirections: draft.prohibitedDirections.map((item) => item.trim()).filter(Boolean),
        unknownFields: [...new Set(draft.unknownFields)]
      };
      await window.masterpiece.documentContext.confirm(selectedRun.id, cleaned);
      const result = await window.masterpiece.documentContext.compile(selectedRun.id);
      setSelectedRun(result.run);
      setBriefMarkdown(result.briefMarkdown);
      setNotice('人工确认完成，项目视觉上下文简报已在本地编译（零模型调用）。');
      setView('brief');
      await refreshRuns().catch(() => {});
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function exportBrief() {
    if (!selectedRun) return;
    try {
      const destination = await window.masterpiece.documentContext.export(selectedRun.id);
      if (destination) setNotice(`已导出：${destination}`);
    } catch (reason) { setError(cleanError(reason)); }
  }

  async function loadLegacyRuns() {
    setError('');
    try {
      const all = await window.masterpiece.visualTranslation.listRuns();
      setLegacyRuns(all.filter((run) => run.status === 'completed'));
    } catch (reason) { setError(cleanError(reason)); }
  }

  async function convertLegacyRun(runId: string) {
    setError('');
    setLegacyContextJson('');
    try {
      const context = await window.masterpiece.documentContext.adaptLegacyRun(runId);
      setLegacyContextJson(JSON.stringify(context, null, 2));
      setNotice('旧任务已按 DocumentVisualContext v1.0 转换（缺失字段已列入待确认信息）。');
    } catch (reason) { setError(cleanError(reason)); }
  }

  // ── 简报页 ──
  if (view === 'brief' && selectedRun) return <div className="page report-page visual-translation-report">
    <header className="page-header">
      <div><p className="eyebrow">VISUAL CONTEXT BRIEF</p><h1>{selectedRun.projectName}</h1><p>{selectedRun.briefFilename || '项目视觉上下文简报.md'}</p></div>
      <button className="button ghost" onClick={() => { setView('workspace'); setBriefMarkdown(''); void refreshRuns().catch(() => {}); }}>返回工作台</button>
    </header>
    <div className="result-summary">
      <div><small>模型</small><strong>{selectedRun.model}</strong></div>
      <div><small>模型调用</small><strong>{selectedRun.modelCallCount ?? 0} 次</strong></div>
      <div><small>Repair</small><strong>{selectedRun.repairCount ?? 0} 次</strong></div>
      <div><small>非阻断警告</small><strong>{selectedRun.warnings?.length ?? 0} 条</strong></div>
    </div>
    <div className="result-actions">
      <button className="button primary" onClick={() => void exportBrief()}>导出简报</button>
      <button className="button secondary" onClick={() => void navigator.clipboard.writeText(briefMarkdown).then(() => setNotice('简报内容已复制。'))}>复制内容</button>
      <button className="button secondary" onClick={() => void window.masterpiece.documentContext.openFolder(selectedRun.id)}>打开输出文件夹</button>
    </div>
    {notice && <div className="notice ok">{notice}</div>}
    {error && <div className="notice error">{error}</div>}
    {selectedRun.warnings?.length ? <div className="notice warn">{selectedRun.warnings.map((warning) => <p key={`${warning.code}-${warning.field || ''}`}>{warning.message}</p>)}</div> : null}
    <article className="markdown-preview" dangerouslySetInnerHTML={{ __html: briefHtml }} />
  </div>;

  // ── 人工确认页 ──
  if (view === 'confirm' && selectedRun && draft) {
    const totalFields = SCALAR_FIELDS.length + LIST_FIELDS.length;
    return <div className="page document-context-confirm-page">
      <header className="page-header">
        <div><p className="eyebrow">HUMAN CONFIRMATION</p><h1>{selectedRun.projectName}</h1><p>逐项核对提取结果：确认、修改、删除或标记未知。你的修改会覆盖模型结果。</p></div>
        <button className="button ghost" onClick={() => { setView('workspace'); setDraft(null); }}>返回工作台</button>
      </header>
      {error && <div className="notice error">{error}</div>}
      {notice && <div className="notice ok">{notice}</div>}
      {selectedRun.warnings?.length ? <div className="notice warn"><strong>非阻断提示</strong>{selectedRun.warnings.map((warning) => <p key={`${warning.code}-${warning.field || ''}`}>{warning.message}</p>)}</div> : null}

      <div className="context-confirm-grid">
        <section className="panel">
          <div className="section-heading"><span>01</span><div><h2>核心事实</h2><p>品牌身份与商业位置</p></div></div>
          {SCALAR_FIELDS.map((field) => {
            const value = draft[field.key] ?? '';
            const unknown = draft.unknownFields.includes(field.key);
            return <div key={field.key} className={`context-field ${confirmedFields.has(field.key) ? 'confirmed' : ''}`}>
              <div className="context-field-head">
                <strong>{field.label}</strong>
                <div className="context-field-actions">
                  <button type="button" className={confirmedFields.has(field.key) ? 'chip active' : 'chip'} onClick={() => toggleFieldConfirmed(field.key)}>{confirmedFields.has(field.key) ? '✓ 已确认' : '确认'}</button>
                  <button type="button" className={unknown ? 'chip warn active' : 'chip warn'} onClick={() => markScalarUnknown(field.key)}>标记未知</button>
                </div>
              </div>
              <input value={value || ''} placeholder={unknown ? '未知（待项目方补充）' : `填写${field.label}`} onChange={(event) => setScalar(field.key, event.target.value)} />
              <FieldEvidence field={field.key} context={draft} />
            </div>;
          })}
        </section>

        <section className="panel">
          <div className="section-heading"><span>02</span><div><h2>清单字段</h2><p>产品 / 用户 / 气质 / 触点 / 约束</p></div></div>
          {LIST_FIELDS.map((field) => {
            const list = draft[field.key];
            const unknown = draft.unknownFields.includes(field.key);
            return <div key={field.key} className={`context-field ${confirmedFields.has(field.key) ? 'confirmed' : ''}`}>
              <div className="context-field-head">
                <strong>{field.label}</strong><small>{field.hint}</small>
                <div className="context-field-actions">
                  <button type="button" className={confirmedFields.has(field.key) ? 'chip active' : 'chip'} onClick={() => toggleFieldConfirmed(field.key)}>{confirmedFields.has(field.key) ? '✓ 已确认' : '确认'}</button>
                  <button type="button" className="chip" onClick={() => addListItem(field.key)}>+ 添加</button>
                  <button type="button" className={unknown ? 'chip warn active' : 'chip warn'} onClick={() => markListUnknown(field.key)}>标记未知</button>
                </div>
              </div>
              {list.length ? <ul className="context-item-list">{list.map((item, index) => <li key={`${field.key}-${index}`}>
                <input value={item} onChange={(event) => setListItem(field.key, index, event.target.value)} />
                <button type="button" aria-label={`删除${field.label}第 ${index + 1} 项`} onClick={() => removeListItem(field.key, index)}>×</button>
              </li>)}</ul> : <p className="context-empty">{unknown ? '已标记为未知，将进入简报「待确认信息」。' : '暂无条目。'}</p>}
              <FieldEvidence field={field.key} context={draft} />
            </div>;
          })}
        </section>
      </div>

      <footer className="context-confirm-footer panel">
        <div>
          <strong>已确认 {confirmedFields.size} / {totalFields} 项字段</strong>
          <p>待确认信息：{draft.unknownFields.length ? draft.unknownFields.join('、') : '无'}。确认后将在本地编译正式简报，不再调用模型。</p>
        </div>
        <button className="button primary" disabled={busy} onClick={() => void confirmAndCompile()}>{busy ? '正在编译简报…' : '确认并生成简报'}</button>
      </footer>
    </div>;
  }

  // ── 工作台（默认视图）──
  return <div className="page visual-translation-page document-context-page">
    <header className="page-header">
      <div><p className="eyebrow">DOCUMENT → VISUAL CONTEXT</p><h1>文档上下文提取</h1><p>上传项目文档，提取视觉相关品牌事实，经人工确认后生成项目视觉上下文简报。</p></div>
      <div className="button-row"><button className="button ghost" onClick={onOpenSettings}>API 设置</button><button className="button ghost" onClick={onBack}>返回首页</button></div>
    </header>

    {error && <div className="notice error">{error}</div>}
    {notice && <div className="notice ok">{notice}</div>}

    <div className="visual-translation-grid">
      <section className="panel visual-translation-form">
        <div className="section-heading"><span>01</span><div><h2>准备提取任务</h2><p>支持 PDF、DOCX、Markdown 和 TXT</p></div></div>
        <label>提取模型<select value={profileId} onChange={(event) => onApiProfileChange(event.target.value)}><option value="">请选择 API Profile</option>{profiles.map((profile) => <option value={profile.id} key={profile.id}>{profile.displayName} / {profile.modelId}</option>)}</select></label>
        <div className="mode-hint">默认流程：1 次模型调用（最多 1 次修复）提取事实 → 本地归一化 → 人工逐项确认 → 本地编译简报。不联网检索、不生成三个方向、不自动推荐。</div>
        <div className="document-toolbar"><div><strong>项目文档</strong><small>{documents.length} 份 · {totalCharacters.toLocaleString('zh-CN')} 字符</small></div></div>
        <div className={`drop-zone translation-drop-zone ${busy ? 'busy' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
          event.preventDefault();
          void addDocuments(Array.from(event.dataTransfer.files).map((file) => window.masterpiece.files.getPathForFile(file)));
        }}>
          <div className="upload-orbit">↥</div>
          <strong>{busy ? '正在读取与解析文档…' : '将项目文档拖到这里'}</strong>
          <p>支持 PDF、DOCX、Markdown 和 TXT，可一次拖入多份文档</p>
          <button className="button secondary" type="button" disabled={busy} onClick={() => void chooseDocuments()}>选择文档</button>
        </div>
        {documents.length ? <div className="visual-document-list translation-selected-documents">{documents.map((document) => <div key={document.path}><span className="document-kind">{document.sourceType.toUpperCase()}</span><div><strong>{document.filename}</strong><small>{document.title || '未识别标题'} · {document.characterCount.toLocaleString('zh-CN')} 字符{document.pageCount ? ` · ${document.pageCount} 页` : ''}</small>{document.warnings.map((warning) => <em key={warning}>{warning}</em>)}</div><button aria-label={`移除 ${document.filename}`} onClick={() => setDocuments((current) => current.filter((item) => item.path !== document.path))}>×</button></div>)}</div> : <div className="auto-project-name-note">上传后将从文档标题和正文自动识别项目名称，无需手动填写。</div>}
        {!profiles.some((profile) => profile.hasApiKey) && <div className="notice error">尚未配置可用的 API Profile，请先前往 API 设置。</div>}
        <button className="button primary full" disabled={busy || !documents.length || !profiles.find((profile) => profile.id === profileId)?.hasApiKey} onClick={() => void start()}>{busy ? '提取运行中…' : '开始提取'}</button>
      </section>

      <aside className="panel visual-translation-history">
        <div className="section-heading"><span>02</span><div><h2>提取记录</h2><p>待确认任务可直接进入确认页；恢复只走本地缓存，不重复调用模型</p></div></div>
        {runs.length ? <div className="visual-run-list">{runs.map((run) => <div key={run.id} className={`visual-run-card ${run.status}`}>
          <div><strong>{run.projectName}</strong><span>{STATUS_LABELS[run.status]}</span></div>
          <small>{run.documentCount} 份文档 · {run.model}</small>
          <small>{new Date(run.createdAt).toLocaleString('zh-CN')}{run.durationMs ? ` · ${formatDurationHuman(run.durationMs)}` : ''}</small>
          {run.lastError && <em>{run.lastError}</em>}
          <div className="button-row">
            {run.status === 'completed' && <button className="button secondary" onClick={() => void openBrief(run).catch((reason) => setError(cleanError(reason)))}>查看简报</button>}
            {(run.status === 'awaiting_confirmation' || run.status === 'compiling') && <button className="button secondary" onClick={() => void openConfirmation(run).catch((reason) => setError(cleanError(reason)))}>进入人工确认</button>}
            {(run.status === 'failed' || run.status === 'cancelled') && <button className="button ghost" disabled={busy} onClick={() => void resume(run)}>继续任务</button>}
            {EXECUTING_STATUSES.has(run.status) && <button className="button danger" onClick={() => void window.masterpiece.documentContext.cancel(run.id)}>取消</button>}
          </div>
        </div>)}</div> : <div className="visual-document-empty">还没有文档上下文提取任务。</div>}

        <details className="legacy-adapter-block">
          <summary>旧「文档视觉转译」任务转换（Legacy）</summary>
          <p>把旧三方向流程的产物转换为 DocumentVisualContext v1.0。缺失字段会列入待确认信息，不会伪造。</p>
          <button className="button ghost" onClick={() => void loadLegacyRuns()}>加载旧任务列表</button>
          {legacyRuns && (legacyRuns.length ? <ul className="legacy-run-list">{legacyRuns.map((run) => <li key={run.id}><span>{run.projectName}</span><button className="button secondary" onClick={() => void convertLegacyRun(run.id)}>转换</button></li>)}</ul> : <p>没有已完成的旧任务。</p>)}
          {legacyContextJson && <div className="legacy-context-output">
            <div className="button-row"><button className="button secondary" onClick={() => void navigator.clipboard.writeText(legacyContextJson).then(() => setNotice('转换结果已复制。'))}>复制 JSON</button><button className="button ghost" onClick={() => setLegacyContextJson('')}>关闭</button></div>
            <pre>{legacyContextJson}</pre>
          </div>}
        </details>
      </aside>
    </div>

    {(busy || progress) && <section className="panel visual-progress-panel">
      <div><p className="eyebrow">提取进度</p><h2>{progress?.message || '正在创建任务'}</h2><p>{progress?.model || profiles.find((profile) => profile.id === profileId)?.modelId}</p></div>
      <div className="visual-stage-strip">{STAGES.map(([stage, label], index) => <div key={stage} className={index < activeStageIndex ? 'done' : index === activeStageIndex ? 'active' : ''}><span>{index < activeStageIndex ? '✓' : String(index + 1).padStart(2, '0')}</span><strong>{label}</strong></div>)}</div>
      {busy && activeRunId && <button className="button danger" onClick={() => void window.masterpiece.documentContext.cancel(activeRunId)}>取消提取</button>}
    </section>}
  </div>;
}
