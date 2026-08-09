import { useEffect, useMemo, useState } from 'react';
import type {
  ApiProfile,
  AssetItem,
  CompileVNextGenerationResult,
  ImageGenerationRun,
  ProjectRecord,
  VNextCreativeSession,
  VNextDeliverableValidation,
  VNextLogoUsageMode,
  VNextTaskContract,
} from '../../../shared/types';
import { cleanError } from '../utils';
import {
  MAX_SPACE_REFERENCE_IMAGES,
  validateReferenceHard,
  validateReferenceSoft,
  canUseGenerationBasis,
  toggleReferenceId,
  replaceReferenceIds,
} from '../reference-first/state.js';

interface Props {
  project: ProjectRecord;
  imageProfiles: ApiProfile[];
  imageApiProfileId: string;
  onImageApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

type Family = VNextTaskContract['deliverableFamily'];
type TemplateOptions = Record<Family, { subtypes: string[]; shots: string[] }>;

const FAMILY_LABELS: Record<Family, string> = {
  space: '空间效果图',
  packaging: '包装效果图',
  vi: 'VI 应用图',
  poster: '海报画面',
};

const DEFAULTS: Record<Family, { subtype: string; shot: string; ratio: VNextTaskContract['aspectRatio'] }> = {
  space: { subtype: 'reception', shot: 'entrance_view', ratio: '16:9' },
  packaging: { subtype: 'lid_and_base_box', shot: 'three_quarter_hero', ratio: '3:4' },
  vi: { subtype: 'business_card', shot: 'front', ratio: '1:1' },
  poster: { subtype: 'brand_key_visual', shot: 'subject_centered', ratio: '3:4' },
};

// R10.2 §15: light-weight source label for the reference card. The full
// trace keeps the real source; this label is display-only and derived from
// the asset kind/name, not a second source-of-truth.
function referenceSourceLabel(asset: AssetItem): string {
  if (asset.sourceType === 'archive-extracted') return '项目素材';
  if (/^outputs?|generated|result/i.test(asset.name) || asset.relativePath.includes('outputs')) return '生成结果';
  if (/anchor/i.test(asset.name) || asset.relativePath.includes('anchor')) return '锚点';
  return '项目素材';
}

export function VNextGenerationWorkspace({
  project,
  imageProfiles,
  imageApiProfileId,
  onImageApiProfileChange,
  onBack,
  onOpenSettings,
}: Props) {
  const [options, setOptions] = useState<TemplateOptions | null>(null);
  const [session, setSession] = useState<VNextCreativeSession | null>(null);
  const [family, setFamily] = useState<Family>('space');
  const [subtype, setSubtype] = useState(DEFAULTS.space.subtype);
  const [shot, setShot] = useState(DEFAULTS.space.shot);
  const [aspectRatio, setAspectRatio] = useState<VNextTaskContract['aspectRatio']>('16:9');
  const [instruction, setInstruction] = useState('');
  const [mustIncludeText, setMustIncludeText] = useState('');
  const [mustAvoidText, setMustAvoidText] = useState('');
  const [logoUsageMode, setLogoUsageMode] = useState<VNextLogoUsageMode>('blank_area');
  const [compiled, setCompiled] = useState<CompileVNextGenerationResult | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [activeRun, setActiveRun] = useState<ImageGenerationRun | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  const [lastValidation, setLastValidation] = useState<VNextDeliverableValidation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // R10.2 Reference-First: Generation Basis switches between Standard
  // (analysis-led, text-only) and Reference-First (reference-assisted, High
  // Fidelity). When a reference image is chosen its assetId flows through
  // the frozen R9 High Fidelity runtime (referenceAssetIds -> resolveSpaceReferences).
  const [generationBasis, setGenerationBasis] = useState<'standard' | 'reference'>('standard');
  const [projectAssets, setProjectAssets] = useState<AssetItem[]>([]);
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [referenceWarnings, setReferenceWarnings] = useState<Record<string, string[]>>({});

  const activeAnchor = session?.implicitAnchors[family];
  const familyOptions = options?.[family];
  // R10.2 §21: Standard enables with a valid scene; Reference-First requires
  // refs >= 1. Hard validation is fail-closed (missing/unsupported -> Block).
  // Computed per render (small dataset) — no memo on a local helper needed.
  const referenceValidation = generationBasis === 'reference'
    ? validateReferenceSelection(projectAssets)
    : { hard: [], soft: [] as string[] };
  const canCompile = canUseGenerationBasis(generationBasis, referenceAssetIds, Boolean(instruction.trim() && subtype && shot));
  const canGenerate = Boolean(compiled && imageApiProfileId && !busy);
  function splitRules(value: string): string[] {
    return [...new Set(value.split(/\r?\n|；|;/u).map((item) => item.trim()).filter(Boolean))];
  }
  const compileStale = useMemo(() => {
    if (!compiled) return true;
    const task = compiled.taskContract;
    return task.deliverableFamily !== family
      || task.subtype !== subtype
      || task.shot !== shot
      || task.aspectRatio !== aspectRatio
      || task.currentInstruction !== instruction.trim()
      || task.logoUsageMode !== logoUsageMode
      || task.mustInclude.join('\n') !== splitRules(mustIncludeText).join('\n')
      || task.mustAvoid.join('\n') !== splitRules(mustAvoidText).join('\n')
      || (generationBasis === 'reference'
        && JSON.stringify(task.referenceAssetIds) !== JSON.stringify(referenceAssetIds));
  }, [compiled, family, subtype, shot, aspectRatio, instruction, logoUsageMode, mustIncludeText, mustAvoidText, generationBasis, referenceAssetIds]);

  async function refreshSession() {
    const next = await window.masterpiece.imageGeneration.getVNextSession(project.id);
    setSession(next);
    return next;
  }

  useEffect(() => {
    void Promise.all([
      window.masterpiece.imageGeneration.getVNextOptions(),
      window.masterpiece.projectContext.getVNext(project.id)
        .catch(() => window.masterpiece.projectContext.rebuildVNext(project.id)),
      refreshSession(),
    ]).then(([nextOptions, context]) => {
      setOptions(nextOptions as TemplateOptions);
      // A project with a confirmed logo is always subject to the v5
      // "logo locked" contract. The backend therefore refuses any
      // `logoUsageMode` other than `post_composite` for those projects
      // (see `LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED` in
      // `apps/desktop/src/main/image-generation/vnext-service.ts`). The
      // previous default of `reference` here forced every logo-locked
      // project into a guaranteed compile failure; the new default flips
      // straight to `post_composite` so the workspace never opens in an
      // illegal state. Projects without a confirmed logo still default
      // to `blank_area`, which remains valid.
      //
      // Belt-and-braces: the upstream `promptSourceObject` was emitting
      // `'reference'` for logo-locked projects up to this fix, and any
      // project on disk with that stale value would still re-trigger the
      // backend error. The conditional below coerces those leftovers
      // into `post_composite` on first load, so legacy project data
      // heals automatically.
      const hasLogo = context.lockedAssets.logoAssetIds.length > 0;
      const upstream = context.promptSourceObject?.lockedAssets.logoUsageMode;
      const initialMode: VNextLogoUsageMode =
        hasLogo ? 'post_composite' : (upstream === 'reference' ? 'blank_area' : (upstream || 'blank_area'));
      setLogoUsageMode(initialMode);
    })
      .catch((reason) => setError(cleanError(reason)));
  }, [project.id]);

  useEffect(() => {
    const unsubscribe = window.masterpiece.imageGeneration.onRunUpdated((event) => {
      if (!activeRun || event.runId !== activeRun.runId) return;
      if (['succeeded', 'failed', 'cancelled', 'blocked'].includes(event.status)) {
        void window.masterpiece.imageGeneration.getRun(event.runId).then(async (run) => {
          if (!run) return;
          setActiveRun(run);
          if (run.status === 'succeeded' && run.images[0]) {
            const image = await window.masterpiece.imageGeneration
              .getImageDataUrl(run.runId, run.images[0].imageId);
            setImageDataUrl(image?.dataUrl ?? '');
          }
        });
      }
    });
    return unsubscribe;
  }, [activeRun?.runId]);

  function changeFamily(next: Family) {
    const defaults = DEFAULTS[next];
    setFamily(next);
    setSubtype(defaults.subtype);
    setShot(defaults.shot);
    setAspectRatio(defaults.ratio);
    setCompiled(null);
    setEditedPrompt('');
    setActiveRun(null);
    setImageDataUrl('');
    setLastValidation(null);
  }

  async function loadProjectAssets() {
    setAssetsLoading(true);
    try {
      const summary = await window.masterpiece.projects.scanAssets(project.id);
      setProjectAssets(summary.items.filter((item) => item.kind === 'image'));
    } catch (reason) {
      // Asset list is best-effort for Reference-First; failure must not block
      // the standard text-only path.
      setProjectAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }

  function changeBasis(next: 'standard' | 'reference') {
    setGenerationBasis(next);
    setCompiled(null);
    setEditedPrompt('');
    setActiveRun(null);
    setImageDataUrl('');
    setLastValidation(null);
    if (next === 'reference') void loadProjectAssets();
  }

  function toggleReferenceAsset(assetId: string) {
    setReferenceAssetIds((current) => {
      const next = toggleReferenceId(current, assetId);
      setCompiled(null);
      setEditedPrompt('');
      setLastValidation(null);
      return next;
    });
  }

  // R10.2 §9: upload a reference image. The file goes through the Project
  // Asset system (choose -> import -> scan) so it is tracked/reusable by
  // current/history tasks and R11 Continuation, not a temporary blob.
  async function uploadReferenceImage() {
    try {
      const chosen = await window.masterpiece.projects.chooseFiles('assets');
      if (!chosen || chosen.length === 0) return;
      setUploading(true);
      setError('');
      const imported = await window.masterpiece.projects.importFiles(project.id, chosen, 'assets');
      const newIds = (imported.summary.items ?? []).map((item) => item.id);
      // Re-scan to get thumbnails/mime for the newly imported assets.
      const summary = await window.masterpiece.projects.scanAssets(project.id);
      const images = summary.items.filter((item) => item.kind === 'image');
      setProjectAssets(images);
      setReferenceAssetIds((current) => {
        const fresh = newIds.filter((id) => !current.includes(id));
        return [...current, ...fresh].slice(0, MAX_SPACE_REFERENCE_IMAGES);
      });
      setCompiled(null);
      setEditedPrompt('');
      setLastValidation(null);
    } catch (reason) {
      setError('参考图上传失败，请重试。');
    } finally {
      setUploading(false);
    }
  }

  // R10.2 §14: replace removes the old selection for this task and swaps in
  // a new upload/asset; the project asset file itself is never deleted.
  async function replaceReferenceAsset(assetId: string) {
    setReferenceAssetIds((current) => replaceReferenceIds(current, assetId, []));
    setCompiled(null);
    setEditedPrompt('');
    setLastValidation(null);
    await uploadReferenceImage();
  }

  // R10.2 §13/§19: hard validation is fail-closed (missing/unreadable/unsupported
  // -> Error blocks generation); soft validation only warns (R10.2 §20, no AI).
  function validateReferenceSelection(assets: AssetItem[]): {
    hard: string[];
    soft: string[];
  } {
    return {
      hard: validateReferenceHard(assets, referenceAssetIds),
      soft: validateReferenceSoft(assets, referenceAssetIds),
    };
  }

  async function compilePrompt() {
    if (!canCompile) return;
    setBusy(true);
    setError('');
    try {
      const result = await window.masterpiece.imageGeneration.compileVNext({
        projectId: project.id,
        task: {
          deliverableFamily: family,
          subtype,
          shot,
          count: 1,
          aspectRatio,
          currentInstruction: instruction.trim(),
          generationBasis: generationBasis === 'reference' ? 'reference_first' : 'standard',
          mustInclude: splitRules(mustIncludeText),
          mustAvoid: splitRules(mustAvoidText),
          referenceAssetIds: generationBasis === 'reference' ? referenceAssetIds : [],
          logoUsageMode,
        },
      });
      setCompiled(result);
      setEditedPrompt(result.compiledPrompt.editablePrompt);
      setNotice('最终 Prompt 已编译，可检查或轻度编辑后生成。');
      await refreshSession();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    if (!compiled || compileStale) return;
    if (!imageApiProfileId) {
      onOpenSettings();
      return;
    }
    setBusy(true);
    setError('');
    setNotice('正在生成第一张正式成果…');
    try {
      const validated = await window.masterpiece.imageGeneration.startValidatedVNext({
        projectId: project.id,
        taskId: compiled.taskContract.taskId,
        apiProfileId: imageApiProfileId,
        editedPrompt,
      });
      const run = validated.correctionRun ?? validated.initialRun;
      setLastValidation(validated.correctionValidation ?? validated.initialValidation);
      setActiveRun(run);
      if (run.status === 'succeeded' && run.images[0]) {
        const image = await window.masterpiece.imageGeneration
          .getImageDataUrl(run.runId, run.images[0].imageId);
        setImageDataUrl(image?.dataUrl ?? '');
        if (validated.terminalStatus === 'passed') {
          setNotice(validated.automaticRetryCount
            ? '首次结果对题失败，系统已完成一次纠偏；纠偏结果通过验证。'
            : '正式成果已生成并通过对题验证。确认后可沿用为本类型参考。');
        } else if (validated.terminalStatus === 'unverified') {
          setNotice('正式成果已生成，但没有可用的多模态分析配置，结果尚未自动验证。');
        } else {
          setError('结果仍未通过对题验证。系统已停止自动扩展，请调整要求后重做。');
        }
      } else if (run.status === 'failed' || run.status === 'blocked') {
        setError(run.errorMessage || '生成失败');
      }
      await refreshSession();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDirection() {
    const image = activeRun?.images[0];
    if (!activeRun || !image) return;
    setBusy(true);
    try {
      const next = await window.masterpiece.imageGeneration.confirmVNextDirection(
        project.id,
        activeRun.runId,
        image.imageId,
      );
      setSession(next);
      setNotice(`已设为“${FAMILY_LABELS[family]}”的隐式参考，不影响其他成果物类型。`);
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function savePromptAsset() {
    if (!editedPrompt.trim()) return;
    setBusy(true);
    try {
      await window.masterpiece.imageGeneration.saveVNextProjectPromptAsset({
        projectId: project.id,
        deliverableFamily: family,
        name: `${FAMILY_LABELS[family]}项目级 Prompt`,
        // Persist the project-specific creative requirement, not the fully
        // compiled public template or the current shot contract.
        promptFragments: [instruction.trim()],
      });
      await refreshSession();
      setNotice('已保存为当前项目专用 Prompt 资产；不会修改公共模板。');
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setBusy(false);
    }
  }

  function applyResultFeedback(kind: 'deliverable' | 'tone' | 'logo_text') {
    const instructionByKind = {
      deliverable: '纠偏：必须生成完整、连续、功能清晰的当前成果物，不能变成展板、拼贴或局部装饰。',
      tone: '纠偏：品牌气质不正确，请恢复已确认的色彩、材质、光线与形态边界，去除模板化行业风格。',
      logo_text: logoUsageMode === 'reference'
        ? '纠偏：Logo/文字不正确，只能使用真实 Logo 参考，不得改形、重复或杜撰文字。'
        : '纠偏：移除所有 Logo、文字、字母与伪文字，只保留干净的标识安装区域。',
    }[kind];
    setInstruction((current) => `${current.trim()}\n${instructionByKind}`.trim());
    setCompiled(null);
    setLastValidation(null);
    setNotice('已加入纠偏要求，请重新查看最终 Prompt。');
  }

  return <div className="page project-page">
    <header className="page-header">
      <div>
        <p className="eyebrow">图片生成</p>
        <h1>{project.projectName}</h1>
        <p>{project.brandName} · 首图直接交付，无需先选 Anchor</p>
      </div>
      <div className="button-row">
        <button className="button ghost" onClick={onBack}>返回报告</button>
        <button className="button secondary" onClick={onOpenSettings}>模型设置</button>
      </div>
    </header>

    {error && <div className="notice error top-notice">{error}</div>}
    {notice && !error && <div className="notice ok top-notice">{notice}</div>}

    <div className="project-grid image-generation-grid">
      <section className="panel assets-panel">
        <div className="section-heading"><span>01</span><div><h2>当前任务</h2><p>任务类型优先于历史上下文和模板默认值</p></div></div>
        <div className="deliverable-grid">
          {(Object.keys(FAMILY_LABELS) as Family[]).map((item) =>
            <button
              key={item}
              className={family === item ? 'deliverable-card selected' : 'deliverable-card'}
              onClick={() => changeFamily(item)}
            ><strong>{FAMILY_LABELS[item]}</strong></button>)}
        </div>
        <div className="basis-grid">
          <button
            type="button"
            className={generationBasis === 'standard' ? 'basis-card selected' : 'basis-card'}
            onClick={() => changeBasis('standard')}
          >
            <strong>标准生成 / Standard</strong>
            <span>基于当前项目分析结果生成空间方案</span>
          </button>
          <button
            type="button"
            className={generationBasis === 'reference' ? 'basis-card selected' : 'basis-card'}
            onClick={() => changeBasis('reference')}
          >
            <strong>参考图生成 / Reference-First</strong>
            <span>根据已有空间参考图进行高保真生成</span>
          </button>
        </div>

        {generationBasis === 'reference' && <div className="facts-box">
          <small>Reference-First（R10）</small>
          <p>参考图生成不会重新运行完整视觉分析。妙作会在当前项目语境下，基于参考图生成高保真空间方案。</p>
        </div>}

        {generationBasis === 'reference' && <div className="reference-first-module">
          <label>参考图（1–{MAX_SPACE_REFERENCE_IMAGES} 张）
            <div className="button-row">
              <button className="button secondary" disabled={uploading} onClick={() => void uploadReferenceImage()}>
                {uploading ? '正在上传参考图…' : '上传参考图'}
              </button>
              <button className="button ghost" onClick={() => setPickerOpen((value) => !value)}>
                {pickerOpen ? '收起素材选择' : '从项目素材选择'}
              </button>
            </div>
          </label>

          {referenceAssetIds.length > 0 && <div className="reference-cards">
            {projectAssets
              .filter((asset) => referenceAssetIds.includes(asset.id))
              .map((asset) => (
                <div key={asset.id} className="reference-card">
                  {asset.thumbnailDataUrl
                    ? <img src={asset.thumbnailDataUrl} alt={asset.name} />
                    : <span className="asset-fallback">{asset.name.slice(0, 12)}</span>}
                  <div className="reference-card-meta">
                    <strong>{asset.name}</strong>
                    <span>{referenceSourceLabel(asset)}</span>
                  </div>
                  <div className="reference-card-actions">
                    <button
                      className="button ghost"
                      title="替换（仅更新本次任务的参考选择，不删除项目原文件）"
                      onClick={() => void replaceReferenceAsset(asset.id)}
                    >替换</button>
                    <button
                      className="button ghost danger"
                      title="移除（仅取消本次任务的参考引用，不删除项目原文件）"
                      onClick={() => toggleReferenceAsset(asset.id)}
                    >移除</button>
                  </div>
                </div>
              ))}
          </div>}

          {pickerOpen && <div className="asset-picker">
            {assetsLoading
              ? <span className="muted">正在加载项目图片资产…</span>
              : <div className="reference-asset-grid">
                {projectAssets.length === 0
                  ? <span className="muted">当前项目没有可用图片资产。请先上传参考图。</span>
                  : projectAssets.map((asset) => (
                    <label key={asset.id} className={referenceAssetIds.includes(asset.id) ? 'asset-tile selected' : 'asset-tile'}>
                      <input
                        type="checkbox"
                        disabled={!referenceAssetIds.includes(asset.id) && referenceAssetIds.length >= MAX_SPACE_REFERENCE_IMAGES}
                        checked={referenceAssetIds.includes(asset.id)}
                        onChange={() => toggleReferenceAsset(asset.id)}
                      />
                      {asset.thumbnailDataUrl
                        ? <img src={asset.thumbnailDataUrl} alt={asset.name} />
                        : <span className="asset-fallback">{asset.name.slice(0, 12)}</span>}
                      <span>{asset.name}</span>
                    </label>
                  ))}
              </div>}
          </div>}

          {referenceAssetIds.length >= MAX_SPACE_REFERENCE_IMAGES && (
            <span className="muted">最多可选 {MAX_SPACE_REFERENCE_IMAGES} 张参考图。</span>
          )}

          {generationBasis === 'reference' && referenceValidation.hard.length > 0 && (
            <div className="notice error">{referenceValidation.hard.join('；')}</div>
          )}
          {generationBasis === 'reference' && referenceValidation.hard.length === 0 && referenceValidation.soft.length > 0 && (
            <div className="notice warn">{referenceValidation.soft.join('；')}</div>
          )}
        </div>}
        <label>子类型
          <select value={subtype} onChange={(event) => setSubtype(event.target.value)}>
            {(familyOptions?.subtypes ?? []).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>镜头 / 构图
          <select value={shot} onChange={(event) => setShot(event.target.value)}>
            {(familyOptions?.shots ?? []).map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>比例
          <select value={aspectRatio} onChange={(event) =>
            setAspectRatio(event.target.value as VNextTaskContract['aspectRatio'])}>
            {['1:1', '4:3', '3:4', '16:9', '9:16'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label>生成模型
          <select value={imageApiProfileId} onChange={(event) => onImageApiProfileChange(event.target.value)}>
            <option value="">请选择 Seedream 生图配置</option>
            {imageProfiles.map((profile) =>
              <option key={profile.id} value={profile.id}>{profile.displayName} / {profile.modelId}</option>)}
          </select>
        </label>
        <label>本轮要求
          <textarea
            rows={5}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="例如：生成真实可进入的前台接待空间，强调清晰动线与克制但不冷的品牌气质。"
          />
        </label>
        {activeAnchor && <div className="facts-box"><small>本类型隐式参考</small><p>{activeAnchor.runId.slice(0, 8)} · 只影响 {FAMILY_LABELS[family]}</p></div>}
        <label>Logo 处理方式
          <select value={logoUsageMode} onChange={(event) =>
            setLogoUsageMode(event.target.value as VNextLogoUsageMode)}>
            <option value="post_composite">后期合成 Logo 到结果图（v5 Logo Locked 项目必须）</option>
            <option value="blank_area">不生成文字，预留干净 Logo 区域</option>
            <option value="reference" disabled>把真实 Logo 作为模型参考（仅无 logo 项目可用）</option>
          </select>
        </label>
        <label>必须包含（每行一项）
          <textarea
            rows={3}
            value={mustIncludeText}
            onChange={(event) => setMustIncludeText(event.target.value)}
            placeholder="例如：完整前台；清晰入口动线"
          />
        </label>
        <label>必须避免（每行一项）
          <textarea
            rows={3}
            value={mustAvoidText}
            onChange={(event) => setMustAvoidText(event.target.value)}
            placeholder="例如：VI 展板；错误品牌文字"
          />
        </label>
        <button className="button primary full" disabled={!canCompile || busy} onClick={() => void compilePrompt()}>
          查看最终 Prompt
        </button>
      </section>

      <section className="panel">
        <div className="section-heading"><span>02</span><div><h2>Prompt 与正式成果</h2><p>可轻度编辑、恢复模板编译结果或保存为项目资产</p></div></div>
        {compiled ? <>
          <div className="prompt-source-summary">
            <div>
              <small>Logo 策略</small>
              <strong>{compiled.compiledPrompt.logoUsageMode === 'reference'
                ? '真实 Logo 参考'
                : '无文字 · 预留干净区域'}</strong>
            </div>
            <div>
              <small>必须包含</small>
              <p>{compiled.taskContract.mustInclude.join('；') || '仅执行本轮任务要求'}</p>
            </div>
            <div>
              <small>必须避免</small>
              <p>{compiled.taskContract.mustAvoid.join('；') || '使用项目与模板默认禁用项'}</p>
            </div>
          </div>
          <details className="prompt-preview">
            <summary>查看 12 个 Prompt 区块与来源</summary>
            <div className="prompt-block-list">
              {compiled.compiledPrompt.blocks.map((block) => <div key={block.id}>
                <strong>{block.title}</strong>
                <small>{block.sources.join(' · ')}</small>
              </div>)}
            </div>
          </details>
          <textarea rows={18} value={editedPrompt} onChange={(event) => setEditedPrompt(event.target.value)} />
          <div className="button-row">
            <button className="button ghost" onClick={() => setEditedPrompt(compiled.compiledPrompt.finalPrompt)}>恢复模板默认</button>
            <button className="button secondary" disabled={!editedPrompt.trim() || busy} onClick={() => void savePromptAsset()}>保存为项目 Prompt</button>
            <button className="button primary" disabled={!canGenerate || compileStale} onClick={() => void generate()}>生成正式成果</button>
          </div>
        </> : <div className="empty-state"><strong>先明确成果物，再查看最终 Prompt</strong><p>默认只生成 1 张，避免错误批量放大。</p></div>}

        {imageDataUrl && <div className="result-card">
          <img src={imageDataUrl} alt="已生成的图片" />
          {lastValidation && <div className="validation-summary">
            <strong>结果校验：{lastValidation.status}</strong>
            <p>{lastValidation.mismatchTypes.length
              ? lastValidation.mismatchTypes.join(' · ')
              : '未发现可见结构性偏差'}</p>
          </div>}
          <div className="button-row">
            <button className="button primary" disabled={busy} onClick={() => void confirmDirection()}>沿用此方向</button>
            <button className="button secondary" onClick={() => void generate()}>调整后重做</button>
          </div>
          <div className="button-row result-feedback">
            <button className="button ghost" onClick={() => applyResultFeedback('deliverable')}>成果物/场景不对</button>
            <button className="button ghost" onClick={() => applyResultFeedback('tone')}>品牌气质不对</button>
            <button className="button ghost" onClick={() => applyResultFeedback('logo_text')}>Logo/文字不对</button>
          </div>
        </div>}
        {session?.history.length ? <div className="facts-box">
          <small>结果与 Prompt 历史</small>
          <p>{session.history.length} 条记录 · 空间、包装、VI、海报分别保存参考</p>
        </div> : null}
      </section>
    </div>
  </div>;
}
