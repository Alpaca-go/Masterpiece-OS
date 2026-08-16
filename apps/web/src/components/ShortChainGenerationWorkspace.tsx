import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  ApiProfile,
  AssetItem,
  CompileShortChainGenerationResult,
  ImageGenerationRun,
  PreflightReferenceAssetsResultEntry,
  ProjectRecord,
  ShortChainConfirmedGeneratedOutput,
  ShortChainCreativeSession,
  ShortChainDeliverableValidation,
  ShortChainGenerationFlowState,
  ShortChainLogoUsageMode,
  ShortChainReferenceSceneRelation,
  ShortChainShotSource,
  ShortChainSimilarityAuditResult,
  ShortChainTaskContract,
  ShortChainValidatedGenerationImageRef,
} from '@masterpiece/runtime-core/application-contracts.ts';
import { cleanError } from '../utils';
import { AppShell } from './layout/AppShell';
import { TopBar, TopBarBreadcrumb, TopBarActions } from './layout/TopBar';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { ShortChainHeader } from './shortchain/ShortChainHeader';
import { ShortChainPreviewPanel } from './shortchain/ShortChainPreviewPanel';
import { ShortChainBanners } from './shortchain/ShortChainBanners';
import type { Family } from './shortchain/ShortChainTypes';
import {
  MAX_SPACE_REFERENCE_IMAGES,
  validateReferenceHard,
  validateReferenceSoft,
  canUseGenerationBasis,
  toggleReferenceId,
  replaceReferenceIds,
  mergeUploadedReferenceIds,
} from '../reference-first/state.js';
import {
  CONTINUATION_SCENE_CARDS,
  CONTINUATION_PRESERVE_COPY,
  CONTINUATION_REDESIGN_COPY,
  isTargetSceneDisabled,
  isCustomSceneValid,
  canSubmitContinuation,
  continuationLineageLabel,
  normalizeSceneId,
  generationModeLabel,
  findCrossSceneReference,
  createContinuationTaskId,
} from '../continuation/ui-state.js';

interface Props {
  project: ProjectRecord;
  imageProfiles: ApiProfile[];
  imageApiProfileId: string;
  onImageApiProfileChange(profileId: string): void;
  onBack(): void;
  onOpenSettings(): void;
}

type TemplateOptions = Record<Family, { subtypes: string[]; shots: string[] }>;

const FAMILY_LABELS: Record<Family, string> = {
  space: '空间效果图',
  packaging: '包装效果图',
  vi: 'VI 应用图',
  poster: '海报画面',
};

const DEFAULTS: Record<Family, { subtype: string; shot: string; ratio: ShortChainTaskContract['aspectRatio'] }> = {
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

// R11.2.1 §43: precise provenance label for an explicit reference. The
// selection state owns the authoritative source (user_upload vs
// project_visual_asset); fall back to the heuristic label.
function referenceSourceLabelFor(asset: AssetItem, provenance?: 'user_upload' | 'project_visual_asset'): string {
  if (provenance === 'user_upload') return '用户上传';
  if (provenance === 'project_visual_asset') return '项目素材';
  return referenceSourceLabel(asset);
}

export function ShortChainGenerationWorkspace({
  project,
  imageProfiles,
  imageApiProfileId,
  onImageApiProfileChange,
  onBack,
  onOpenSettings,
}: Props) {
  const [options, setOptions] = useState<TemplateOptions | null>(null);
  const [session, setSession] = useState<ShortChainCreativeSession | null>(null);
  const [family, setFamily] = useState<Family>('space');
  const [subtype, setSubtype] = useState(DEFAULTS.space.subtype);
  const [shot, setShot] = useState(DEFAULTS.space.shot);
  const [shotSource, setShotSource] = useState<ShortChainShotSource>('target_scene_default');
  // r2.0 §4.9: auxiliary metadata. Default 'unknown' (we do not auto-detect
  // reference asset scene labels in this commit; Phase F will add asset
  // metadata + auto-compute). Visible only in Reference-First mode.
  const [referenceSceneRelation, setReferenceSceneRelation] =
    useState<ShortChainReferenceSceneRelation>('unknown');
  const [aspectRatio, setAspectRatio] = useState<ShortChainTaskContract['aspectRatio']>('16:9');
  const [instruction, setInstruction] = useState('');
  const [mustIncludeText, setMustIncludeText] = useState('');
  const [mustAvoidText, setMustAvoidText] = useState('');
  const [logoUsageMode, setLogoUsageMode] = useState<ShortChainLogoUsageMode>('blank_area');
  const [compiled, setCompiled] = useState<CompileShortChainGenerationResult | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [activeRun, setActiveRun] = useState<ImageGenerationRun | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState('');
  // r2.0 §4.13 / Phase E: first-image preservation. When the initial
  // Provider call produced an image but a later validation / correction
  // step failed, the UI keeps the first image visible. The state
  // here is the FIRST image reference, NOT the current run's image;
  // the `imageDataUrl` is loaded from this reference (or from the
  // active run when the active run is the first run with no
  // correction).
  const [firstImage, setFirstImage] = useState<ShortChainValidatedGenerationImageRef | null>(null);
  // r2.0 §4.13 / Phase E: the 5-state flow state. Drives the banner
  // copy and the "first-image preservation" UI behavior.
  const [flowState, setFlowState] = useState<ShortChainGenerationFlowState | null>(null);
  // r2.0 §6.7 / Phase F-3 + Phase E UI extension: similarity audit
  // marker. null = audit not triggered (standard / continuation /
  // reference_first + same_scene / unknown / no audit service);
  // 'unavailable' = audit was triggered but failed (network /
  // reasoner / write); object = audit ran to completion.
  // The audit is ADVISORY: it never changes flowState / terminalStatus.
  // When 'unavailable', a separate Final Acceptance banner appears;
  // the generation result is preserved as-is.
  const [similarityAudit, setSimilarityAudit] = useState<ShortChainSimilarityAuditResult | 'unavailable' | null>(null);
  const [lastValidation, setLastValidation] = useState<ShortChainDeliverableValidation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // R11.2 Continuation UI: a generated space output the user explicitly
  // confirmed as the continuation source. Persisted via the session.
  const [confirmedOutputs, setConfirmedOutputs] = useState<Record<string, ShortChainConfirmedGeneratedOutput>>({});
  const [continuationPanelOpen, setContinuationPanelOpen] = useState(false);
  const [continuationSource, setContinuationSource] = useState<ShortChainConfirmedGeneratedOutput | null>(null);
  const [continuationTargetScene, setContinuationTargetScene] = useState<string | null>(null);
  const [continuationCustomDescription, setContinuationCustomDescription] = useState('');
  const [continuationRequirement, setContinuationRequirement] = useState('');
  const [continuationBusy, setContinuationBusy] = useState(false);
  // R10.2 Reference-First: Generation Basis switches between Standard
  // (analysis-led, text-only) and Reference-First (reference-assisted, High
  // Fidelity). When a reference image is chosen its assetId flows through
  // the frozen R9 High Fidelity runtime (referenceAssetIds -> resolveSpaceReferences).
  const [generationBasis, setGenerationBasis] = useState<'standard' | 'reference'>('standard');
  const [projectAssets, setProjectAssets] = useState<AssetItem[]>([]);
  const [referenceAssetIds, setReferenceAssetIds] = useState<string[]>([]);
  // R11.2.1 provenance: which explicit reference each asset came from
  // (user_upload vs project_visual_asset). Project assets never auto-enter.
  const [referenceSources, setReferenceSources] = useState<Record<string, 'user_upload' | 'project_visual_asset'>>({});
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [referenceWarnings, setReferenceWarnings] = useState<Record<string, string[]>>({});
  // r2.0 §4.11 / Phase C-3: per-asset preflight result. Populated by
  // runPreflight() after the asset list loads and after importFiles. The
  // map is keyed by assetId and drives the status badge on each asset
  // tile. A failed preflight (REFERENCE_ASSET_NOT_FOUND /
  // FORMAT_UNSUPPORTED / NOT_READY / etc.) disables the "use as reference"
  // checkbox because vnext-service.start() will reject the same ID at
  // submit time — better to block it here.
  const [referencePreflight, setReferencePreflight] = useState<Record<string, PreflightReferenceAssetsResultEntry>>({});
  // R11.2.2: the cross-scene advisory is dismissible per user intent
  // ("仍使用参考优先"). Dismissing never changes the mode.
  const [crossSceneAdvisoryDismissed, setCrossSceneAdvisoryDismissed] = useState(false);

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
  // R11.2.2 §9-§12: cross-scene advisory fires only when a selected reference
  // is a confirmed generated SPACE output of a different scene than the target.
  const crossSceneReference = generationBasis === 'reference' && family === 'space'
    ? findCrossSceneReference({
        referenceAssetIds,
        confirmedOutputs,
        targetScene: subtype,
      })
    : null;
  const showCrossSceneAdvisory = Boolean(crossSceneReference) && !crossSceneAdvisoryDismissed;
  // R11.2.2 §33-§36: mode badge + lineage on the current result.
  const activeModeBadge = generationModeLabel(compiled?.taskContract.generationBasis);
  const activeLineage = compiled?.taskContract.generationBasis === 'continuation'
    ? continuationLineageLabel(
      compiled.taskContract.continuation?.sourceScene,
      compiled.taskContract.continuation?.targetScene,
    )
    : '';
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
    const next = await window.masterpiece.imageGeneration.getShortChainSession(project.id);
    setSession(next);
    return next;
  }

  // ---- R11.2 Continuation UI ----------------------------------------------
  // The generated-output card offers [以此方向继续]. Clicking it validates the
  // asset, marks it confirmed_for_continuation (persisted), then opens the
  // Continuation Panel. It never generates immediately.
  async function openContinuation(runId: string, imageId: string) {
    try {
      setError('');
      const confirmed = await window.masterpiece.imageGeneration.confirmShortChainGeneratedOutput(
        project.id,
        runId,
        imageId,
      );
      await refreshConfirmedOutputs();
      setContinuationSource(confirmed);
      setContinuationTargetScene(null);
      setContinuationCustomDescription('');
      setContinuationRequirement('');
      setContinuationPanelOpen(true);
      setNotice('已将这张图确认为空间延展方向。');
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  async function refreshConfirmedOutputs() {
    const outputs = await window.masterpiece.imageGeneration.getShortChainConfirmedGeneratedOutputs(project.id);
    setConfirmedOutputs(outputs);
    return outputs;
  }

  async function revokeContinuation(assetId: string) {
    try {
      setError('');
      await window.masterpiece.imageGeneration.revokeShortChainGeneratedOutput(project.id, assetId);
      await refreshConfirmedOutputs();
      if (continuationSource?.assetId === assetId) {
        setContinuationPanelOpen(false);
        setContinuationSource(null);
        setContinuationTargetScene(null);
      }
      setNotice('已取消该方向的延展确认。');
    } catch (reason) {
      setError(cleanError(reason));
    }
  }

  // R11.2.2 §17: "改为以此方向继续" routes OUT of the Reference-First task draft
  // and into the Continuation Panel using the ORIGINAL confirmed generated
  // output (provenance kept — never a user-upload copy). Target scene is
  // prefilled from the current draft subtype.
  function routeCrossSceneReferenceToContinuation() {
    if (!crossSceneReference || !crossSceneReference.confirmed) return;
    const confirmed = crossSceneReference.confirmed;
    const prefilled = subtype && normalizeSceneId(subtype) !== normalizeSceneId(confirmed.sourceScene)
      ? subtype
      : null;
    setContinuationSource(confirmed);
    setContinuationTargetScene(prefilled);
    setContinuationCustomDescription('');
    setContinuationRequirement('');
    setContinuationPanelOpen(true);
    setCrossSceneAdvisoryDismissed(true);
    setReferenceAssetIds([]);
    setReferenceSources({});
    setCompiled(null);
    setEditedPrompt('');
    setLastValidation(null);
    setNotice('已切换到空间延展，保留原生成方向的 provenance。');
  }

  // R11.2 §21-§22: the UI only builds a structured continuation intent; the
  // runtime assembles the task through the R11.1 contract and compiles it.
  async function submitContinuation() {
    const source = continuationSource;
    const target = continuationTargetScene;
    if (!source || !target) return;
    if (!imageApiProfileId) {
      onOpenSettings();
      return;
    }
    const targetScene = target === 'custom' ? 'custom' : target;
    const customDescription = target === 'custom' ? continuationCustomDescription.trim() : '';
    if (target === 'custom' && !customDescription) {
      setError('请填写目标空间说明。');
      return;
    }
    setContinuationBusy(true);
    setError('');
    setNotice('正在延展空间方向…');
    try {
      // Structured continuation task; the frozen r8_6_golden compiler + R11.1
      // contract build the prompt. We do not assemble a prompt here.
      const task: ShortChainTaskContract = {
        schemaVersion: '1.0',
        taskId: createContinuationTaskId(),
        projectId: project.id,
        deliverableFamily: 'space',
        subtype: targetScene,
        shot: 'entrance_view',
        count: 1,
        aspectRatio: '16:9',
        currentInstruction: `延续已确认方向，生成${targetScene}空间。${continuationRequirement.trim() ? ` ${continuationRequirement.trim()}` : ''}`,
        generationBasis: 'continuation',
        mustInclude: [],
        mustAvoid: [],
        referenceAssetIds: [source.assetId],
        logoUsageMode: 'post_composite',
        continuation: {
          sourceAssetId: source.assetId,
          sourceRunId: source.sourceRunId,
          sourceScene: source.sourceScene || 'space',
          targetScene,
          confirmedAt: source.confirmedAt,
          confirmationSource: 'user_explicit',
          referenceSource: 'confirmed_generated_output',
          ...(customDescription ? { customSceneDescription: customDescription } : {}),
          ...(continuationRequirement.trim() ? { userRequirement: continuationRequirement.trim() } : {}),
        },
        createdAt: new Date().toISOString(),
      };
      const result = await window.masterpiece.imageGeneration.compileShortChain({
        projectId: project.id,
        task,
      });
      setCompiled(result);
      setEditedPrompt(result.compiledPrompt.editablePrompt);
      setNotice('延展空间方向已编译，正在生成…');
      const validated = await window.masterpiece.imageGeneration.startValidatedShortChain({
        projectId: project.id,
        taskId: result.taskContract.taskId,
        apiProfileId: imageApiProfileId,
        editedPrompt: result.compiledPrompt.editablePrompt,
      });
      const run = validated.correctionRun ?? validated.initialRun;
      setActiveRun(run);
      setFlowState(validated.flowState);
      // r2.0 §6.7 / Phase F-3: similarity audit is ADVISORY. When
      // 'unavailable', a separate Final Acceptance block banner
      // appears; the generation result is preserved as-is and the
      // flowState is unchanged.
      setSimilarityAudit(validated.similarityAudit);
      // r2.0 §4.13 / Phase E: first-image preservation. Always load
      // the FIRST image (not the current run's image). This way a
      // correction that fails keeps the original visible.
      if (validated.firstImage) {
        setFirstImage(validated.firstImage);
        const image = await window.masterpiece.imageGeneration
          .getImageDataUrl(validated.firstImage.runId, validated.firstImage.imageId);
        setImageDataUrl(image?.dataUrl ?? '');
      }
      if (run.status === 'succeeded' && run.images[0]) {
        setLastValidation(validated.correctionValidation ?? validated.initialValidation);
        setNotice(`空间延展生成完成：${source.sourceScene} → ${targetScene}`);
      } else if (run.status === 'failed' || run.status === 'blocked') {
        setError(run.errorMessage || '延展任务校验失败，请重新选择目标空间或稍后重试。');
      }
      await refreshSession();
    } catch (reason) {
      setError(cleanError(reason));
    } finally {
      setContinuationBusy(false);
    }
  }

  function isConfirmedSource(runId: string, imageId: string): boolean {
    return Object.values(confirmedOutputs).some(
      (o) => o.sourceRunId === runId && o.confirmationState === 'confirmed',
    );
  }

  useEffect(() => {
    void Promise.all([
      window.masterpiece.imageGeneration.getShortChainOptions(),
      window.masterpiece.projectContext.getShortChain(project.id)
        .catch(() => window.masterpiece.projectContext.rebuildShortChain(project.id)),
      refreshSession(),
      refreshConfirmedOutputs(),
    ]).then(([nextOptions, context]) => {
      setOptions(nextOptions as TemplateOptions);
      // A project with a confirmed logo is always subject to the v5
      // "logo locked" contract. The backend therefore refuses any
      // `logoUsageMode` other than `post_composite` for those projects
      // (see `LOGO_POST_COMPOSITE_ROUTE_NOT_ENFORCED` in
      // `@masterpiece/runtime-core/application/image-generation/short-chain-service.ts`). The
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
      const initialMode: ShortChainLogoUsageMode =
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
    setShotSource('target_scene_default');
    setReferenceSceneRelation('unknown');
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
      const images = summary.items.filter((item) => item.kind === 'image');
      setProjectAssets(images);
      // r2.0 §4.11 / Phase C-3: preflight the assets so the user can see
      // which ones are reference-eligible BEFORE clicking. Best-effort:
      // if the IPC or the resolver fails, leave the map empty (the user
      // gets a "checking…" indicator but the picker stays usable).
      void runPreflight(images.map((a) => a.id));
    } catch (reason) {
      // Asset list is best-effort for Reference-First; failure must not block
      // the standard text-only path.
      setProjectAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  }

  // r2.0 §4.11 / Phase C-3: run preflight over a list of asset IDs. The
  // IPC handler is fail-soft (returns per-ID results, never throws), so
  // a bad asset or an unavailable handler does not block the picker —
  // the user sees a "checking…" badge until we know otherwise.
  async function runPreflight(assetIds: string[]) {
    if (assetIds.length === 0) return;
    if (!window.masterpiece.imageGeneration.preflightReferenceAssets) {
      // Backward-compat: an older renderer / older preload. Skip silently.
      return;
    }
    try {
      const out = await window.masterpiece.imageGeneration.preflightReferenceAssets({
        projectId: project.id,
        assetIds,
      });
      setReferencePreflight((current) => {
        const next = { ...current };
        for (const entry of out.results) next[entry.assetId] = entry;
        return next;
      });
    } catch (reason) {
      // Fail-soft: do not surface as an error, do not block the picker.
      // The next runPreflight (e.g. on re-import) will retry.
    }
  }

  function changeBasis(next: 'standard' | 'reference') {
    setGenerationBasis(next);
    setShotSource('target_scene_default');
    setReferenceSceneRelation('unknown');
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
      // R11.2.1: selecting from the project picker is project_visual_asset
      // provenance (explicit user selection). Only mark when newly added.
      if (next.includes(assetId) && !current.includes(assetId)) {
        setReferenceSources((sources) => ({ ...sources, [assetId]: 'project_visual_asset' }));
      }
      setCompiled(null);
      setEditedPrompt('');
      setLastValidation(null);
      return next;
    });
  }

  // R10.2 §9: upload a reference image through the browser file
  // picker. The File bytes travel as raw base64 over the sanctioned
  // `projects:import-file-bytes` RPC and become a project-bound
  // generation_reference asset (project-store.persistBufferAsset).
  // The file picker is a real <input type="file"> — never the
  // env-based `projects:chooseFiles` path (P3-D3.6A/6B).
  const uploadInputRef = useRef<HTMLInputElement>(null);

  async function uploadReferenceImage() {
    // Open the real browser picker.
    uploadInputRef.current?.click();
  }

  async function handleUploadFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];
    // Always reset so the same file can be reselected.
    input.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      // Renderer precheck (UX only; runtime is authoritative).
      const imageMime = new Set(['image/png', 'image/jpeg', 'image/webp']);
      if (!imageMime.has(file.type)) {
        setError('仅支持 PNG、JPEG、WEBP 参考图。');
        return;
      }
      if (file.size <= 0) {
        setError('所选文件为空。');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        setError('参考图超过 8 MiB 上限。');
        return;
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      }
      const content = btoa(binary);
      const imported = await window.masterpiece.projects.importFileBytes({
        projectId: project.id,
        file: {
          name: file.name,
          mime: file.type,
          size: file.size,
          content,
        },
      });
      if (imported.asset.projectId !== project.id) {
        setError('导入的参考图不属于当前项目。');
        return;
      }
      const importedId = imported.asset.id;
      const beforeIds = new Set(referenceAssetIds);
      const fresh = !beforeIds.has(importedId) ? [importedId] : [];
      const duplicateIds = beforeIds.has(importedId) ? [importedId] : [];
      setReferenceAssetIds((current) => mergeUploadedReferenceIds(current, fresh, duplicateIds));
      setReferenceSources((current) => ({
        ...current,
        [importedId]: 'user_upload',
      }));
      void runPreflight([importedId]);
      await loadProjectAssets();
      setCompiled(null);
      setEditedPrompt('');
      setLastValidation(null);
      setNotice('参考图已上传并加入参考选择。');
    } catch (reason) {
      setError(cleanError(reason) || '参考图上传失败，请重试。');
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
      const result = await window.masterpiece.imageGeneration.compileShortChain({
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
          shotSource,
          ...(generationBasis === 'reference' ? { referenceSceneRelation } : {}),
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
      const validated = await window.masterpiece.imageGeneration.startValidatedShortChain({
        projectId: project.id,
        taskId: compiled.taskContract.taskId,
        apiProfileId: imageApiProfileId,
        editedPrompt,
      });
      const run = validated.correctionRun ?? validated.initialRun;
      setLastValidation(validated.correctionValidation ?? validated.initialValidation);
      setActiveRun(run);
      setFlowState(validated.flowState);
      // r2.0 §6.7 / Phase F-3: similarity audit marker (advisory).
      // The audit is fail-soft; 'unavailable' only triggers the
      // Final Acceptance block banner. flowState is unchanged.
      setSimilarityAudit(validated.similarityAudit);
      // r2.0 §4.13 / Phase E: first-image preservation. Always load
      // the FIRST image (not the current run's image). This way a
      // correction that fails keeps the original visible.
      if (validated.firstImage) {
        setFirstImage(validated.firstImage);
        const image = await window.masterpiece.imageGeneration
          .getImageDataUrl(validated.firstImage.runId, validated.firstImage.imageId);
        setImageDataUrl(image?.dataUrl ?? '');
      }
      if (run.status === 'succeeded' && run.images[0]) {
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
      const next = await window.masterpiece.imageGeneration.confirmShortChainDirection(
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
      await window.masterpiece.imageGeneration.saveShortChainProjectPromptAsset({
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

  return (
    <AppShell
      topBar={
        <TopBar
          left={
            <TopBarBreadcrumb
              items={[
                { label: '项目', onClick: onBack },
                { label: project.projectName, onClick: onBack },
                { label: 'Short-Chain 生成' },
              ]}
            />
          }
          right={
            <TopBarActions>
              <Button variant="ghost" size="sm" onClick={onOpenSettings}>API 设置</Button>
              <Button variant="primary" size="sm" onClick={onBack}>返回报告</Button>
            </TopBarActions>
          }
        />
      }
      bottomBar={
        <>
          <span>Short-Chain · 视觉生成</span>
          <span>{project.projectName} · {project.industry}</span>
        </>
      }
    >
    <div className="sc-workspace">
      {/* ── Header ── Phase 5.9: extracted to ShortChainHeader */}
      <ShortChainHeader project={project} onBack={onBack} onOpenSettings={onOpenSettings} />

      {/* ── Error / notice banners ── Phase 5.9: extracted to ShortChainBanners */}
      <ShortChainBanners error={error} notice={notice} />

      {/* ── 3-column body ── */}
      <div className="sc-workspace__body">
        {/* ═══════ LEFT COLUMN: CONFIG ═══════ */}
        <div className="sc-panel">
          {/* Deliverable type */}
          <div className="sc-panel__section">
            <h3 className="sc-panel__section-title">成果物类型</h3>
            <div className="sc-deliverable-grid">
              {(Object.keys(FAMILY_LABELS) as Family[]).map((item) => (
                <button
                  key={item}
                  className={family === item ? 'sc-deliverable-card is-selected' : 'sc-deliverable-card'}
                  onClick={() => changeFamily(item)}
                >
                  <strong>{FAMILY_LABELS[item]}</strong>
                </button>
              ))}
            </div>
          </div>

          {/* Generation basis */}
          <div className="sc-panel__section">
            <h3 className="sc-panel__section-title">生成模式</h3>
            <div className="sc-basis-switch">
              <button
                type="button"
                className={generationBasis === 'standard' ? 'is-active' : ''}
                onClick={() => changeBasis('standard')}
              >
                标准生成
              </button>
              <button
                type="button"
                className={generationBasis === 'reference' ? 'is-active' : ''}
                onClick={() => changeBasis('reference')}
              >
                参考优先
              </button>
            </div>

            {generationBasis === 'reference' && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <div className="sc-ref-actions">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ display: 'none' }}
                    onChange={(event) => void handleUploadFileChange(event)}
                  />
                  <button
                    className="button secondary"
                    disabled={uploading}
                    onClick={() => void uploadReferenceImage()}
                  >
                    {uploading ? '上传中…' : '上传参考图'}
                  </button>
                  <button className="button ghost" onClick={() => setPickerOpen((value) => !value)}>
                    {pickerOpen ? '收起' : '从项目选择'}
                  </button>
                </div>

                {referenceAssetIds.length > 0 && (
                  <div className="sc-ref-list">
                    {projectAssets
                      .filter((asset) => referenceAssetIds.includes(asset.id))
                      .map((asset) => (
                        <div key={asset.id} className="sc-ref-item">
                          {asset.thumbnailDataUrl
                            ? <img src={asset.thumbnailDataUrl} alt={asset.name} />
                            : <span className="sc-ref-item__fallback">{asset.name.slice(0, 8)}</span>}
                          <div className="sc-ref-item__meta">
                            <strong>{asset.name}</strong>
                            <small>{referenceSourceLabelFor(asset, referenceSources[asset.id])}</small>
                          </div>
                          <div className="sc-ref-item__actions">
                            <button
                              title="替换"
                              onClick={() => void replaceReferenceAsset(asset.id)}
                            >替换</button>
                            <button
                              className="danger"
                              title="移除"
                              onClick={() => toggleReferenceAsset(asset.id)}
                            >×</button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                {pickerOpen && (
                  <div className="asset-picker" style={{ marginTop: 'var(--space-3)' }}>
                    {assetsLoading
                      ? <span className="muted">加载中…</span>
                      : <div className="reference-asset-grid">
                        {projectAssets.length === 0
                          ? <span className="muted">当前项目没有可用图片资产。</span>
                          : projectAssets.map((asset) => {
                            const preflight = referencePreflight[asset.id];
                            const preflightFailed = preflight?.status === 'failed';
                            const checkboxDisabled = preflightFailed
                              || (!referenceAssetIds.includes(asset.id)
                                && referenceAssetIds.length >= MAX_SPACE_REFERENCE_IMAGES);
                            return (
                              <label
                                key={asset.id}
                                className={
                                  referenceAssetIds.includes(asset.id)
                                    ? 'asset-tile selected'
                                    : preflightFailed
                                      ? 'asset-tile disabled-preflight'
                                      : 'asset-tile'
                                }
                                title={preflightFailed && preflight.status === 'failed' ? preflight.failure.message : undefined}
                              >
                                <input
                                  type="checkbox"
                                  disabled={checkboxDisabled}
                                  checked={referenceAssetIds.includes(asset.id)}
                                  onChange={() => toggleReferenceAsset(asset.id)}
                                />
                                {asset.thumbnailDataUrl
                                  ? <img src={asset.thumbnailDataUrl} alt={asset.name} />
                                  : <span className="asset-fallback">{asset.name.slice(0, 12)}</span>}
                                <span>{asset.name}</span>
                                <span
                                  className={
                                    preflight?.status === 'resolved'
                                      ? 'preflight-badge preflight-ok'
                                      : preflight?.status === 'failed'
                                        ? 'preflight-badge preflight-fail'
                                        : 'preflight-badge preflight-pending'
                                  }
                                >
                                  {preflight?.status === 'resolved' ? '✓'
                                    : preflight?.status === 'failed' ? '✕ ' + preflight.failure.code
                                      : '…'}
                                </span>
                              </label>
                            );
                          })}
                      </div>}
                  </div>
                )}

                {referenceAssetIds.length >= MAX_SPACE_REFERENCE_IMAGES && (
                  <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    最多可选 {MAX_SPACE_REFERENCE_IMAGES} 张参考图。
                  </p>
                )}

                {referenceAssetIds.length > 0 && (
                  <div className="notice info" style={{ marginTop: 'var(--space-3)' }}>
                    参考优先会较强地保留参考图的空间结构与构图。
                  </div>
                )}

                {showCrossSceneAdvisory && crossSceneReference && (
                  <div className="notice warn advisory" style={{ marginTop: 'var(--space-3)' }}>
                    <strong>跨场景建议</strong>
                    <p>这张参考图来自「{crossSceneReference.confirmed.sourceScene || '已确认空间'}」，当前目标为「{subtype}」。</p>
                    <p>建议使用「空间延展」保持方向的同时重新设计功能空间。</p>
                    <div className="button-row" style={{ marginTop: 'var(--space-3)' }}>
                      <button className="button secondary" onClick={() => setCrossSceneAdvisoryDismissed(true)}>仍使用参考优先</button>
                      <button className="button primary" onClick={() => routeCrossSceneReferenceToContinuation()}>改为以此方向继续</button>
                    </div>
                  </div>
                )}

                {referenceValidation.hard.length > 0 && (
                  <div className="notice error" style={{ marginTop: 'var(--space-3)' }}>
                    {referenceValidation.hard.join('；')}
                  </div>
                )}
                {referenceValidation.hard.length === 0 && referenceValidation.soft.length > 0 && (
                  <div className="notice warn" style={{ marginTop: 'var(--space-3)' }}>
                    {referenceValidation.soft.join('；')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtype + instruction */}
          <div className="sc-panel__section">
            <h3 className="sc-panel__section-title">创意指令</h3>
            <label style={{ display: 'grid', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>子类型</span>
              <select value={subtype} onChange={(event) => setSubtype(event.target.value)}>
                {(familyOptions?.subtypes ?? []).map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
              <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>本轮要求</span>
              <textarea
                className="sc-instruction"
                rows={5}
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
                placeholder="例如：生成真实可进入的前台接待空间，强调清晰动线与克制但不冷的品牌气质。"
              />
            </label>
            {activeAnchor && (
              <div className="facts-box" style={{ marginTop: 'var(--space-4)' }}>
                <small>本类型隐式参考</small>
                <p>{activeAnchor.runId.slice(0, 8)} · 只影响 {FAMILY_LABELS[family]}</p>
              </div>
            )}

            {/* Advanced settings */}
            <details className="sc-advanced">
              <summary>高级设置</summary>
              <div className="sc-advanced__content">
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>镜头 / 构图</span>
                  <select value={shot} onChange={(event) => { setShot(event.target.value); setShotSource('user_explicit'); }}>
                    {(familyOptions?.shots ?? []).map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                {generationBasis === 'reference' && (
                  <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>参考图场景关系</span>
                    <select
                      value={referenceSceneRelation}
                      onChange={(event) => setReferenceSceneRelation(event.target.value as ShortChainReferenceSceneRelation)}
                    >
                      <option value="unknown">未知（待人工或自动判定）</option>
                      <option value="same_scene">同场景</option>
                      <option value="cross_scene">跨场景</option>
                    </select>
                  </label>
                )}
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>比例</span>
                  <select value={aspectRatio} onChange={(event) =>
                    setAspectRatio(event.target.value as ShortChainTaskContract['aspectRatio'])}>
                    {['1:1', '4:3', '3:4', '16:9', '9:16'].map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>生成模型</span>
                  <select value={imageApiProfileId} onChange={(event) => onImageApiProfileChange(event.target.value)}>
                    <option value="">请选择 Seedream 生图配置</option>
                    {imageProfiles.map((profile) =>
                      <option key={profile.id} value={profile.id}>{profile.displayName} / {profile.modelId}</option>)}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>Logo 处理方式</span>
                  <select value={logoUsageMode} onChange={(event) =>
                    setLogoUsageMode(event.target.value as ShortChainLogoUsageMode)}>
                    <option value="post_composite">后期合成 Logo 到结果图</option>
                    <option value="blank_area">不生成文字，预留干净 Logo 区域</option>
                    <option value="reference" disabled>把真实 Logo 作为模型参考</option>
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>必须包含（每行一项）</span>
                  <textarea
                    rows={3}
                    value={mustIncludeText}
                    onChange={(event) => setMustIncludeText(event.target.value)}
                    placeholder="例如：完整前台；清晰入口动线"
                  />
                </label>
                <label style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>必须避免（每行一项）</span>
                  <textarea
                    rows={3}
                    value={mustAvoidText}
                    onChange={(event) => setMustAvoidText(event.target.value)}
                    placeholder="例如：VI 展板；错误品牌文字"
                  />
                </label>
              </div>
            </details>
          </div>

          {/* Generate CTA */}
          <div className="sc-cta">
            <button
              className="sc-cta__primary"
              disabled={!canCompile || busy}
              onClick={() => void compilePrompt()}
            >
              {busy ? '编译中…' : '编译并生成'}
            </button>
            <button
              className="sc-cta__secondary"
              disabled={!compiled || busy}
              onClick={() => void compilePrompt()}
            >
              仅查看最终 Prompt
            </button>
          </div>
        </div>

        {/* ═══════ CENTER COLUMN: PREVIEW ═══════ */}
        <div className="sc-center">
          <div className="sc-preview">
            {imageDataUrl ? (
              <>
                {/* Flow state banner */}
                {flowState && (
                  <div className={'sc-flow-banner sc-flow-banner--' + (FLOW_STATE_COPY[flowState]?.tone || 'info')}>
                    <strong>{FLOW_STATE_COPY[flowState]?.title}</strong>
                    <p>{FLOW_STATE_COPY[flowState]?.detail}</p>
                    {firstImage && <small>下方展示的是首张图，即使后续步骤失败也会保留。</small>}
                  </div>
                )}
                {similarityAudit === 'unavailable' && (
                  <div className="sc-flow-banner sc-flow-banner--block">
                    <strong>终验收阻塞：审计证据不完整</strong>
                    <p>生成已成功。相似度审计失败，结果被标记为 unavailable。</p>
                    <small>请重跑一次以补齐审计证据，或在人工核验后手动确认方向。</small>
                  </div>
                )}
                {similarityAudit && similarityAudit !== 'unavailable' && similarityAudit.pass.overall === false && (
                  <div className="sc-flow-banner sc-flow-banner--block">
                    <strong>终验收阻塞：相似度审计未通过</strong>
                    <p>生成已成功。多模态审计在 6 维评分上未达标，Final Acceptance 暂时阻塞。</p>
                    <small>请参考审计报告调整 Prompt，或人工复核后确认方向。</small>
                  </div>
                )}

                <div className="sc-preview__body">
                  <img src={imageDataUrl} alt="已生成的图片" />
                </div>

                <div className="sc-preview__badges">
                  {activeModeBadge && <span className="mode-badge">{activeModeBadge}</span>}
                  {activeLineage && <span className="lineage-badge">{activeLineage}</span>}
                  {activeRun && isConfirmedSource(activeRun.runId, activeRun.images?.[0]?.imageId ?? '') && (
                    <span className="confirmation-badge">已确认方向</span>
                  )}
                </div>

                <div className="sc-preview__actions">
                  <button className="ui-button ui-button--primary" style={{ flex: 1 }} disabled={busy} onClick={() => void confirmDirection()}>
                    沿用此方向
                  </button>
                  <button className="ui-button ui-button--secondary" style={{ flex: 1 }} onClick={() => void generate()}>
                    调整后重做
                  </button>
                </div>
                <div className="sc-preview__actions sc-preview__actions--secondary">
                  {activeRun && activeRun.images?.[0] && (() => {
                    const firstImg = activeRun.images![0];
                    return (
                      <button
                        className="ui-button ui-button--ghost"
                        disabled={busy || continuationBusy}
                        onClick={() => void openContinuation(activeRun.runId, firstImg.imageId)}
                      >
                        以此方向继续
                      </button>
                    );
                  })()}
                  {activeRun && isConfirmedSource(activeRun.runId, activeRun.images?.[0]?.imageId ?? '') && (() => {
                    const confirmed = Object.values(confirmedOutputs).find(
                      (o) => o.sourceRunId === activeRun.runId && o.confirmationState === 'confirmed',
                    );
                    return confirmed ? (
                      <button className="ui-button ui-button--ghost danger" disabled={busy || continuationBusy} onClick={() => void revokeContinuation(confirmed.assetId)}>
                        取消确认
                      </button>
                    ) : null;
                  })()}
                </div>

                <div className="sc-feedback">
                  <button onClick={() => applyResultFeedback('deliverable')}>成果物/场景不对</button>
                  <button onClick={() => applyResultFeedback('tone')}>品牌气质不对</button>
                  <button onClick={() => applyResultFeedback('logo_text')}>Logo/文字不对</button>
                </div>
              </>
            ) : compiled ? (
              <div className="sc-preview__body">
                <div className="sc-preview__empty">
                  <div className="sc-preview__empty-icon">→</div>
                  <strong>Prompt 已就绪</strong>
                  <p>点击下方按钮，开始生成正式成果。</p>
                </div>
              </div>
            ) : (
              <div className="sc-preview__body">
                <div className="sc-preview__empty">
                  <div className="sc-preview__empty-icon">M</div>
                  <strong>先明确成果物，再生成</strong>
                  <p>填写左侧任务要求后，系统将自动编译并生成。</p>
                </div>
              </div>
            )}

            {compiled && !imageDataUrl && (
              <div className="sc-preview__actions">
                <button
                  className="ui-button ui-button--primary"
                  style={{ flex: 1 }}
                  disabled={!canGenerate || compileStale}
                  onClick={() => void generate()}
                >
                  生成正式成果
                </button>
              </div>
            )}
          </div>

          {/* Continuation panel (below preview) */}
          {continuationPanelOpen && continuationSource && (
            <div className="sc-continuation">
              <h3 className="sc-continuation__title">空间延展</h3>
              <div className="confirmed-source-card" style={{ marginBottom: 'var(--space-5)' }}>
                {imageDataUrl
                  ? <img src={imageDataUrl} alt="已确认方向" />
                  : <span className="asset-fallback">已确认方向</span>}
                <div className="confirmed-source-meta">
                  <strong>已确认方向</strong>
                  <span>源场景：{continuationSource.sourceScene || 'space'}</span>
                  <small>以此图作为后续空间延展的设计依据</small>
                </div>
                <button className="button ghost danger" disabled={continuationBusy} onClick={() => void revokeContinuation(continuationSource.assetId)}>
                  取消确认
                </button>
              </div>

              <label style={{ display: 'block', marginBottom: 'var(--space-4)' }}>
                <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>选择目标空间</span>
                <div className="continuation-scene-grid" style={{ marginTop: 'var(--space-3)' }}>
                  {CONTINUATION_SCENE_CARDS.map((card) => {
                    const isSource = isTargetSceneDisabled(card.id, continuationSource.sourceScene);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        className={continuationTargetScene === card.id ? 'scene-card selected' : 'scene-card'}
                        disabled={isSource || continuationBusy}
                        onClick={() => {
                          setContinuationTargetScene(card.id);
                          setContinuationCustomDescription('');
                        }}
                      >
                        <strong>{card.label}</strong>
                        <span>{isSource ? '当前场景' : card.hint}</span>
                      </button>
                    );
                  })}
                </div>
                {continuationTargetScene === 'custom' && (
                  <textarea
                    rows={3}
                    style={{ marginTop: 'var(--space-3)', width: '100%' }}
                    value={continuationCustomDescription}
                    onChange={(event) => setContinuationCustomDescription(event.target.value)}
                    placeholder="例如：一个更私密的小型 VIP 咨询室"
                  />
                )}
              </label>

              <label style={{ display: 'block', marginBottom: 'var(--space-4)' }}>
                <span style={{ color: 'var(--color-text-strong)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>补充要求（可选）</span>
                <textarea
                  rows={2}
                  style={{ marginTop: 'var(--space-3)', width: '100%' }}
                  value={continuationRequirement}
                  onChange={(event) => setContinuationRequirement(event.target.value)}
                  placeholder="例如：更私密；更开放；增加展示"
                />
              </label>

              <div className="continuation-boundary-grid">
                <div className="continuation-boundary-block">
                  <strong>将保留</strong>
                  <ul>{CONTINUATION_PRESERVE_COPY.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="continuation-boundary-block redesign">
                  <strong>将重新设计</strong>
                  <ul>{CONTINUATION_REDESIGN_COPY.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>

              <button
                className="sc-cta__primary"
                style={{ marginTop: 'var(--space-5)', width: '100%' }}
                disabled={continuationBusy
                  || !canSubmitContinuation({
                    sourceConfirmed: Boolean(continuationSource),
                    sourceScene: continuationSource.sourceScene,
                    targetScene: continuationTargetScene,
                    customDescription: continuationCustomDescription,
                  })}
                onClick={() => void submitContinuation()}
              >
                {continuationBusy ? '正在生成延展空间…' : '生成延展空间'}
              </button>
            </div>
          )}
        </div>

        {/* ═══════ RIGHT COLUMN: DETAILS ═══════ Phase 5.9: extracted to ShortChainPreviewPanel */}
        <ShortChainPreviewPanel
          family={family}
          subtype={subtype}
          aspectRatio={aspectRatio}
          editedPrompt={editedPrompt}
          compiled={compiled}
          lastValidation={lastValidation}
          compileStale={compileStale}
          activeRun={activeRun}
          session={session}
        />
      </div>
    </div>
    </AppShell>
  );
}

// r2.0 §4.13 / Phase E: the 5-state banner shown above the result
// image. Each state has a distinct copy so the user always knows
// which step the flow is in. The component is intentionally small
// (no logic, just a label + a one-liner) so the parent re-renders
// are cheap.
const FLOW_STATE_COPY: Record<ShortChainGenerationFlowState, { tone: string; title: string; detail: string }> = {
  initial_failed: {
    tone: 'fail',
    title: '首次生成失败',
    detail: 'Provider 没有产出可用的图片。可以调整指令后重做，或更换 Provider 配置文件。',
  },
  awaiting_validation: {
    tone: 'info',
    title: '首次生成完成，等待自动对题',
    detail: '首张图已生成，多模态分析正在跑。图被保留；下一步会根据对题结果决定是否自动纠偏。',
  },
  correcting: {
    tone: 'info',
    title: '首次结果未对题，正在自动纠偏',
    detail: '首张图已保留（见下）。系统已发出一次纠偏 Prompt，Provider 正在跑修正版。',
  },
  correction_start_failed: {
    tone: 'warn',
    title: '自动纠偏启动失败',
    detail: '首张图已保留（见下）。Provider 在跑纠偏版时出错；可以调整指令后重做，或更换 Provider 配置文件。',
  },
  correction_still_failed: {
    tone: 'fail',
    title: '纠偏结果仍未通过',
    detail: '首张图已保留（见下）。纠偏版的多模态分析也未通过；系统已停止自动扩展，请调整要求后重做。',
  },
  passed: {
    tone: 'ok',
    title: '结果通过对题验证',
    detail: '可以沿用此方向作为同类型参考；当前 direction 未确认。',
  },
};

function FlowStateBanner({ state, hasFirstImage }: { state: ShortChainGenerationFlowState; hasFirstImage: boolean }) {
  const copy = FLOW_STATE_COPY[state] ?? FLOW_STATE_COPY.passed;
  const firstImageNote = hasFirstImage
    ? '下方展示的是首张图（first image），即使后续步骤失败也会保留。'
    : '';
  return (
    <div className={`flow-state-banner flow-state-${copy.tone}`}>
      <strong>{copy.title}</strong>
      <p>{copy.detail}</p>
      {firstImageNote && <small>{firstImageNote}</small>}
    </div>
  );
}

// r2.0 §6.7 / Phase E UI extension: minimal Final Acceptance block
// banner. Renders ONLY when the similarity audit was triggered but
// failed (similarityAudit === 'unavailable'). The generation result
// is preserved as-is: the image below is the successful first image,
// flowState is unchanged. This banner is orthogonal to the
// FlowStateBanner (which is about generation) — it is about
// Final Acceptance, the user-facing step that says "this result
// can be confirmed as the project's direction".
//
// We intentionally do NOT add a new acceptance dashboard, new
// tab, or new state machine. Just a banner copy that explains:
//   1) generation succeeded
//   2) the audit evidence is incomplete
//   3) Final Acceptance is therefore blocked
//   4) how the user can recover (re-run, or manually override)
function FinalAcceptanceBlockBanner({ reason }: { reason: 'audit_unavailable' | 'audit_failed' }) {
  const copy = reason === 'audit_unavailable'
    ? {
      tone: 'block',
      title: '终验收阻塞：审计证据不完整',
      detail: '生成已成功（下方图片就是结果）。相似度审计在多模态调用 / 凭据 / 写盘时失败，结果被标记为 unavailable。',
      action: '请重跑一次以补齐审计证据，或在人工核验后手动确认方向。',
    }
    : {
      tone: 'block',
      title: '终验收阻塞：相似度审计未通过',
      detail: '生成已成功（下方图片就是结果）。多模态审计在 6 维评分上未达标，Final Acceptance 暂时阻塞。',
      action: '请参考审计报告调整 Prompt，或人工复核后确认方向。',
    };
  return (
    <div className={`flow-state-banner flow-state-${copy.tone}`}>
      <strong>{copy.title}</strong>
      <p>{copy.detail}</p>
      <small>{copy.action}</small>
    </div>
  );
}
