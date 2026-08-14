// P3-B3 — Packaging Workspace UI (Reference Selection + Truth Projection).
//
// P3-B3 changes from P3-B2:
//   - The "02 Reference Assignments" tile now has a real
//     picker: the user can add / remove / change-role on
//     reference assignments. The picker reads the project's
//     existing `AssetSummary` (via
//     `window.masterpiece.projects.scanAssets(projectId)`)
//     and reuses the safe asset identity (AssetItem.id) as
//     the Packaging reference `assetId`.
//   - The canonical 6 roles are imported through the narrow,
//     browser-safe `@masterpiece/runtime-core/browser/packaging-contracts.js`
//     seam. That seam re-exports the frozen P2 Reference Policy authority. The
//     role vocabulary is NOT derived from `view.references`
//     (which only carries the user's current assignments).
//   - The "03 Locked Assets" tile now shows the REAL truth
//     projection resolved on the runtime side from the
//     upstream Locked-Assets-Service (no fake seed). Empty
//     fields render as "未提供" (which is the same
//     presentation the upstream "no Locked Asset configured"
//     case produces).
//   - The "重新解析真相面" button now calls
//     `refreshPackagingTruth(sessionId)` which only sends
//     the sessionId. The runtime re-resolves the truth
//     surface from the canonical authority and rejects any
//     cross-project truth authority override at the operations
//     layer (P3-B3 §11/§12).
//   - No precedence / priority / sort-by-role logic exists
//     in the Web feature. The P2 frozen authority is the
//     sole owner of reference precedence (per P3-A freeze
//     report §11.2 / P3-B3 §5).
//   - Locked Asset UI is strictly read-only. No edit /
//     unlock / replace / delete / upload / save action is
//     exposed (P3-B3 §13 + §14).
//
// Capability projection (still): the buttons are enabled /
// disabled exclusively from `view.readiness.*` and
// `view.isBusy` (P3-A4 §5). React does NOT maintain a
// second rule table.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PACKAGING_REFERENCE_ROLES } from '@masterpiece/runtime-core/browser/packaging-contracts.js';
import type {
  AssetItem,
  AssetSummary,
  PackagingWorkspaceLockedField,
  PackagingWorkspaceReference,
  PackagingWorkspaceView,
} from '@masterpiece/runtime-core/application-contracts.ts';
import {
  createPackagingSession,
  executePackagingGeneration,
  getPackagingArtifactPreview,
  getPackagingView,
  isPackagingRuntimeAvailable,
  preparePackagingGeneration,
  refreshPackagingTruth,
  resetPackagingPreparation,
  updatePackagingIntent,
  type PackagingClientSession,
} from './service';
import styles from './PackagingWorkspace.module.css';

interface Props {
  onBack: () => void;
  /**
   * Optional pre-selected project id. When the Web side
   * enters the Packaging workspace from the project page, the
   * caller passes the selected project id here. When the user
   * enters from the home page without a selected project, the
   * workspace shows the project-id bootstrap form.
   */
  initialProjectId?: string;
}

type WorkspaceState =
  | { kind: 'unavailable'; reason: string }
  | { kind: 'bootstrap'; defaultProjectId: string; error: string | null; pending: boolean }
  | { kind: 'ready'; sessionId: string; projectId: string; view: PackagingWorkspaceView; pending: boolean; error: string | null };

const RPC_UNAVAILABLE_REASON =
  '包装生成服务暂时不可用。请确认 Masterpiece Web Runtime 已启动，然后重试。';

// P3-B3 §2: presentation-only label map. The semantic value
// remains the canonical role from `PACKAGING_REFERENCE_ROLES`
// (frozen P3-A authority). This map is display-only.
const ROLE_PRESENTATION_LABELS: Record<string, string> = Object.freeze({
  high_fidelity_visual_reference: '高保真视觉参考',
  structure_reference: '结构参考',
  material_reference: '材料参考',
  composition_reference: '构图参考',
  style_reference: '风格参考',
  product_identity_reference: '产品身份参考',
});

const STATUS_PRESENTATION_LABELS: Record<string, string> = Object.freeze({
  new: '新建',
  unprepared: '待准备',
  preparing: '正在准备',
  ready: '已就绪',
  stale: '配置已变化',
  executing: '正在生成',
  executed: '生成完成',
  failed: '生成失败',
});

function roleLabel(role: string): string {
  return ROLE_PRESENTATION_LABELS[role] || role;
}

function useDialogKeyboard(
  onClose: () => void,
  dialogRef: React.RefObject<HTMLElement | null>,
  initialFocusRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    initialFocusRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable.at(0);
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dialogRef, initialFocusRef, onClose]);
}

export function PackagingWorkspace({ onBack, initialProjectId = '' }: Props) {
  const runtimeAvailable = useMemo(() => isPackagingRuntimeAvailable(), []);

  const [state, setState] = useState<WorkspaceState>(() => {
    if (!runtimeAvailable) {
      return { kind: 'unavailable', reason: RPC_UNAVAILABLE_REASON };
    }
    return {
      kind: 'bootstrap',
      defaultProjectId: initialProjectId,
      error: null,
      pending: false,
    };
  });

  const handleCreateSession = useCallback(async (projectId: string) => {
    setState((current) => current.kind === 'bootstrap' ? { ...current, pending: true, error: null } : current);
    try {
      const result: PackagingClientSession = await createPackagingSession({ projectId });
      setState({
        kind: 'ready',
        sessionId: result.sessionId,
        projectId: result.view.projectId || projectId,
        view: result.view,
        pending: false,
        error: null,
      });
    } catch (reason) {
      void reason;
      const message = '无法打开项目工作台，请确认项目与服务状态后重试。';
      setState((current) => current.kind === 'bootstrap'
        ? { ...current, pending: false, error: message }
        : current);
    }
  }, []);

  const handleRefreshView = useCallback(async () => {
    if (state.kind !== 'ready') return;
    try {
      const view = await getPackagingView(state.sessionId);
      setState((current) => current.kind === 'ready' ? { ...current, view } : current);
    } catch {
      // Refresh errors are non-blocking; the next mutation
      // will surface a real error.
    }
  }, [state]);

  const handlePrepare = useCallback(async () => {
    if (state.kind !== 'ready' || state.pending) return;
    setState({ ...state, pending: true, error: null });
    try {
      const view = await preparePackagingGeneration(state.sessionId);
      setState({ ...state, view, pending: false });
    } catch (reason) {
      void reason;
      const message = '准备未完成，请检查当前配置后重试。';
      setState({ ...state, pending: false, error: message });
    }
  }, [state]);

  const handleExecute = useCallback(async () => {
    if (state.kind !== 'ready' || state.pending) return;
    setState({ ...state, pending: true, error: null });
    try {
      const view = await executePackagingGeneration({ sessionId: state.sessionId });
      setState({ ...state, view, pending: false });
    } catch (reason) {
      void reason;
      const message = '生成未完成，请查看错误提示并重试。';
      setState({ ...state, pending: false, error: message });
    }
  }, [state]);

  const handleReset = useCallback(async () => {
    if (state.kind !== 'ready' || state.pending) return;
    setState({ ...state, pending: true, error: null });
    try {
      const view = await resetPackagingPreparation(state.sessionId);
      setState({ ...state, view, pending: false });
    } catch (reason) {
      void reason;
      const message = '重置未完成，请稍后重试。';
      setState({ ...state, pending: false, error: message });
    }
  }, [state]);

  const handlePatchIntent = useCallback(async (patch: Record<string, unknown>) => {
    if (state.kind !== 'ready' || state.pending) return;
    setState({ ...state, pending: true, error: null });
    try {
      const view = await updatePackagingIntent(state.sessionId, patch);
      setState({ ...state, view, pending: false });
    } catch (reason) {
      void reason;
      const message = '配置更新未完成，请检查输入后重试。';
      setState({ ...state, pending: false, error: message });
    }
  }, [state]);

  const handleRefreshTruth = useCallback(async () => {
    if (state.kind !== 'ready' || state.pending) return;
    setState({ ...state, pending: true, error: null });
    try {
      const view = await refreshPackagingTruth(state.sessionId);
      setState({ ...state, view, pending: false });
    } catch (reason) {
      void reason;
      const message = '锁定信息刷新未完成，请稍后重试。';
      setState({ ...state, pending: false, error: message });
    }
  }, [state]);

  if (state.kind === 'unavailable') {
    return <UnavailableSurface reason={state.reason} onBack={onBack} />;
  }
  if (state.kind === 'bootstrap') {
    return (
      <BootstrapSurface
        defaultProjectId={state.defaultProjectId}
        error={state.error}
        pending={state.pending}
        onCreate={handleCreateSession}
        onBack={onBack}
      />
    );
  }
  return (
    <ReadySurface
      sessionId={state.sessionId}
      projectId={state.projectId}
      view={state.view}
      pending={state.pending}
      transientError={state.error}
      onPrepare={handlePrepare}
      onExecute={handleExecute}
      onReset={handleReset}
      onRefreshView={handleRefreshView}
      onPatchIntent={handlePatchIntent}
      onRefreshTruth={handleRefreshTruth}
      onBack={onBack}
    />
  );
}

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

function UnavailableSurface({ reason, onBack }: { reason: string; onBack: () => void }) {
  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <p className={styles.eyebrow}>PACKAGING GENERATOR</p>
          <h1 className={styles.title}>包装生成工作台</h1>
        </div>
        <div className={styles.topNavRight}>
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </div>
      </header>
      <main className={styles.bootstrapMain}>
        <section className={styles.bootstrapPanel}>
          <h2 className={styles.bootstrapTitle}>包装生成服务不可用</h2>
          <p className={styles.bootstrapBody}>
            当前无法连接生成服务。你可以返回首页，确认服务状态后再次进入。
          </p>
          <p className={styles.bootstrapBody}>{reason}</p>
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </section>
      </main>
    </div>
  );
}

function BootstrapSurface({
  defaultProjectId,
  error,
  pending,
  onCreate,
  onBack,
}: {
  defaultProjectId: string;
  error: string | null;
  pending: boolean;
  onCreate: (projectId: string) => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState(defaultProjectId);
  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <p className={styles.eyebrow}>PACKAGING GENERATOR</p>
          <h1 className={styles.title}>包装生成工作台</h1>
          <p className={styles.subtitle}>
            选择项目，开始配置参考图并生成包装效果图。
          </p>
        </div>
        <div className={styles.topNavRight}>
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </div>
      </header>
      <main className={styles.bootstrapMain}>
        <section className={styles.bootstrapPanel}>
          <h2 className={styles.bootstrapTitle}>打开项目工作台</h2>
          <label className={styles.bootstrapLabel}>
            项目 ID
            <input
              className={styles.bootstrapInput}
              value={value}
              placeholder="例如 pkg-2024-skin-cream"
              onChange={(event) => setValue(event.target.value)}
              disabled={pending}
            />
          </label>
          {error && <p className={styles.bootstrapError}>{error}</p>}
          <div className={styles.bootstrapActions}>
            <button
              className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
              disabled={pending || !value.trim()}
              onClick={() => onCreate(value.trim())}
            >
              {pending ? '正在打开…' : '打开工作台'}
            </button>
            <button className={styles.toolbarButton} onClick={onBack} disabled={pending}>
              取消
            </button>
          </div>
          <p className={styles.bootstrapHint}>
            项目中的参考素材与锁定信息会自动载入。
          </p>
        </section>
      </main>
    </div>
  );
}

interface ReadySurfaceProps {
  sessionId: string;
  projectId: string;
  view: PackagingWorkspaceView;
  pending: boolean;
  transientError: string | null;
  onPrepare: () => void;
  onExecute: () => void;
  onReset: () => void;
  onRefreshView: () => void;
  onPatchIntent: (patch: Record<string, unknown>) => Promise<void>;
  onRefreshTruth: () => void;
  onBack: () => void;
}

function ReadySurface(props: ReadySurfaceProps) {
  const {
    sessionId, projectId, view, pending, transientError,
    onPrepare, onExecute, onReset, onRefreshView, onPatchIntent, onRefreshTruth, onBack,
  } = props;
  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <p className={styles.eyebrow}>PACKAGING GENERATOR</p>
          <h1 className={styles.title}>包装生成工作台</h1>
          <p className={styles.subtitle}>
            配置参考图，确认项目锁定信息，然后准备并生成包装效果图。
          </p>
        </div>
        <div className={styles.topNavRight}>
          <StatusBadge status={view.status} label={view.statusLabel} />
          <SessionIdBadge value={sessionId} />
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </div>
      </header>

      <section className={styles.projectIdentity} aria-labelledby="packaging-project-title">
        <div>
          <p className={styles.projectIdentityLabel}>当前项目</p>
          <h2 id="packaging-project-title" className={styles.projectIdentityTitle}>{projectId}</h2>
        </div>
        <p className={styles.projectIdentityHint}>参考图与锁定信息均来自此项目。</p>
      </section>

      <ActionToolbar
        view={view}
        pending={pending}
        onPrepare={onPrepare}
        onExecute={onExecute}
        onReset={onReset}
        onRefreshView={onRefreshView}
      />

      <main className={styles.tiles}>
        <GenerationIntentTile view={view} onPatchIntent={onPatchIntent} />
        <ReferenceAssignmentsTile
          view={view}
          projectId={projectId}
          pending={pending}
          onPatchIntent={onPatchIntent}
        />
        <LockedAssetsTile view={view} onRefreshTruth={onRefreshTruth} />
        <ReadinessStaleTile view={view} transientError={transientError} />
        <ResultTile view={view} sessionId={sessionId} />
        <ErrorSurfaceTile view={view} />
      </main>

      <footer className={styles.footer}>妙作 · 包装生成工作台</footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level UI bits
// ---------------------------------------------------------------------------

function ActionToolbar({
  view,
  pending,
  onPrepare,
  onExecute,
  onReset,
  onRefreshView,
}: {
  view: PackagingWorkspaceView;
  pending: boolean;
  onPrepare: () => void;
  onExecute: () => void;
  onReset: () => void;
  onRefreshView: () => void;
}) {
  // Capability projection comes from the frozen view
  // model. React MUST NOT re-derive a rule table.
  // P3-B4: canRetry is exposed by the frozen P3-A readiness
  // (READY / EXECUTED → retry allowed). It maps to the same
  // `executeGeneration` RPC and is NOT an implicit
  // prepare+execute (P3-A §10.6).
  const canPrepare = Boolean(view.readiness?.canPrepare);
  const canExecute = Boolean(view.readiness?.canExecute);
  const canReset = Boolean(view.readiness?.canReset);
  const canRetry = Boolean(view.readiness?.canRetry);
  const isBusy = Boolean(view.isBusy) || pending;
  const status = String(view.status || '');
  const isStale = status === 'stale';
  // P3-B4 §VII: real status copy only. We never render fake
  // progress percentages — the busy label simply names the
  // current lifecycle stage.
  const busyLabel =
    status === 'preparing' ? '准备中… 正在准备生成配置' :
    status === 'executing' ? '执行中… 正在生成包装效果图' :
    null;
  // P3-B4 §XV: STALE state hints at the user that the
  // current configuration no longer matches the prepared
  // snapshot; they must re-Prepare before they can Execute
  // again. We surface this as a non-actionable hint next to
  // the toolbar (not as a fake disable reason).
  return (
    <div className={styles.toolbar}>
      <div>
        <p className={styles.toolbarHint}>{actionGuidance(status)}</p>
        {isStale && (
          <p className={styles.toolbarStaleHint}>
            当前配置已变化，需要重新准备。上一次结果仍会保留供你查看。
          </p>
        )}
      </div>
      <div className={styles.toolbarButtons}>
        {isBusy && busyLabel && (
          <span className={styles.toolbarBusy} aria-live="polite">
            <span className={styles.toolbarBusyDot} />
            {busyLabel}
          </span>
        )}
        <button
          className={`${styles.toolbarButton} ${canPrepare ? styles.toolbarButtonPrimary : ''}`}
          onClick={onPrepare}
          disabled={!canPrepare || isBusy}
          type="button"
          aria-label="准备生成"
        >
          {status === 'preparing' ? '准备中…' : '准备生成'}
        </button>
        <button
          className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
          onClick={onExecute}
          disabled={!canExecute || isBusy}
          title={isStale ? '当前配置已变化，请先重新准备' : undefined}
          type="button"
          aria-label="执行生成"
        >
          {status === 'executing' ? '执行中…' : '执行生成'}
        </button>
        {canRetry && !isBusy && status === 'executed' && (
          <button
            className={styles.toolbarRetryButton}
            onClick={onExecute}
            // Retry shares the same `executeGeneration` RPC;
            // we re-use `onExecute` (same handler) because the
            // RPC contract is identical — no new endpoint, no
            // implicit prepare.
            data-action="retry"
            title="使用当前已准备的配置再次生成"
            type="button"
          >
            再次生成
          </button>
        )}
        <button
          className={styles.toolbarButton}
          onClick={onReset}
          disabled={!canReset || isBusy}
          type="button"
          aria-label="重置准备"
        >
          重置准备
        </button>
        <button
          className={styles.refreshButton}
          onClick={onRefreshView}
          disabled={isBusy}
          type="button"
          aria-label="刷新工作台状态"
        >
          刷新视图
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const tone = resolveStatusTone(status);
  return (
    <span className={`${styles.badge} ${styles[`badge_${tone}`]}`}>
      <span className={styles.badgeDot} />
      <span className={styles.visuallyHidden}>当前状态：</span>
      {STATUS_PRESENTATION_LABELS[status] || label || status || '未知状态'}
    </span>
  );
}

function SessionIdBadge({ value }: { value: string }) {
  if (!value) return null;
  const short = value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
  return (
    <details className={styles.sessionDetails}>
      <summary>会话详情</summary>
      <code className={styles.sessionBadge} title={value}>{short}</code>
    </details>
  );
}

// ---------------------------------------------------------------------------
// 01 — Generation Intent
// ---------------------------------------------------------------------------

function GenerationIntentTile({
  view,
  onPatchIntent,
}: {
  view: PackagingWorkspaceView;
  onPatchIntent: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const intent = view.intent;
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>01</span>
        <div>
          <h2 className={styles.tileTitle}>生成意图</h2>
          <p className={styles.tileSubtitle}>
            核对生成方式、镜头与模型设置。
          </p>
        </div>
      </header>
      {intent ? (
        <>
          <dl className={styles.kvList}>
            <KV label="生成模式" value={intent.generationMode || '—'} />
            <KV label="镜头合约" value={intent.shotContractId || '—'} />
            <KV
              label="显式约束"
              value={intent.explicitUserConstraintsText || '—'}
              mono
            />
            <KV label="参考图数量" value={String(intent.referenceCount)} />
            <KV
              label="生成模型"
              value={intent.providerModelId || '—'}
              mono
            />
            <KV
              label="服务配置"
              value={intent.apiProfileId || '—'}
              mono
            />
          </dl>
          <IntentPatchForm
            disabled={!view.canEditIntent}
            onPatch={onPatchIntent}
          />
        </>
      ) : (
        <EmptyHint message="尚未设置生成意图。" />
      )}
    </section>
  );
}

function IntentPatchForm({
  disabled,
  onPatch,
}: {
  disabled: boolean;
  onPatch: (patch: Record<string, unknown>) => Promise<void>;
}) {
  const [apiProfileId, setApiProfileId] = useState('');
  const [providerModelId, setProviderModelId] = useState('');
  return (
    <details className={styles.intentSettings}>
      <summary>调整模型设置</summary>
      <form
        className={styles.patchForm}
      onSubmit={async (event) => {
        event.preventDefault();
        const patch: Record<string, unknown> = {};
        if (apiProfileId.trim()) patch.apiProfileId = apiProfileId.trim();
        if (providerModelId.trim()) patch.providerModelId = providerModelId.trim();
        if (Object.keys(patch).length === 0) return;
        await onPatch(patch);
        setApiProfileId('');
        setProviderModelId('');
      }}
    >
      <label className={styles.patchLabel}>
        服务配置 ID
        <input
          className={styles.bootstrapInput}
          value={apiProfileId}
          onChange={(event) => setApiProfileId(event.target.value)}
          placeholder="可选 — 留空则不更新"
          disabled={disabled}
        />
      </label>
      <label className={styles.patchLabel}>
        生成模型 ID
        <input
          className={styles.bootstrapInput}
          value={providerModelId}
          onChange={(event) => setProviderModelId(event.target.value)}
          placeholder="可选 — 留空则不更新"
          disabled={disabled}
        />
      </label>
      <button
        className={styles.toolbarButton}
        type="submit"
        disabled={disabled || (!apiProfileId.trim() && !providerModelId.trim())}
      >
        应用设置
      </button>
      </form>
    </details>
  );
}

// ---------------------------------------------------------------------------
// 02 — Reference Assignments (P3-B3 real picker)
// ---------------------------------------------------------------------------

interface ReferenceAssignmentsTileProps {
  view: PackagingWorkspaceView;
  projectId: string;
  pending: boolean;
  onPatchIntent: (patch: Record<string, unknown>) => Promise<void>;
}

function ReferenceAssignmentsTile(props: ReferenceAssignmentsTileProps) {
  const { view, projectId, pending, onPatchIntent } = props;
  const refs = view.references ?? [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [assetSummary, setAssetSummary] = useState<AssetSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const pickerTriggerRef = useRef<HTMLButtonElement>(null);

  const openPicker = useCallback(async () => {
    if (!projectId) return;
    setPickerOpen(true);
    if (assetSummary && assetSummary.items.length > 0) return;
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      if (!window.masterpiece?.projects?.scanAssets) {
        throw new Error('PACKAGING_RPC_UNAVAILABLE: projects.scanAssets is not available');
      }
      const summary = await window.masterpiece.projects.scanAssets(projectId);
      setAssetSummary(summary);
    } catch (reason) {
      void reason;
      const message = '无法读取项目资产，请返回项目页确认素材后重试。';
      setSummaryError(message);
    } finally {
      setLoadingSummary(false);
    }
  }, [assetSummary, projectId]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
    requestAnimationFrame(() => pickerTriggerRef.current?.focus());
  }, []);

  const handleAddAssignment = useCallback(
    async (asset: AssetItem, role: string) => {
      const normalized: PackagingWorkspaceReference = {
        assetId: asset.id,
        role,
        source: 'user',
        displayName: asset.name,
        previewUri: asset.thumbnailDataUrl || '',
      };
      const nextRefs = mergeAssignment(refs, normalized);
      await onPatchIntent({ referenceAssignments: nextRefs });
      setPickerOpen(false);
    },
    [refs, onPatchIntent]
  );

  const handleRemoveAssignment = useCallback(
    async (assetId: string) => {
      const nextRefs = refs.filter((ref) => ref.assetId !== assetId);
      await onPatchIntent({ referenceAssignments: nextRefs });
    },
    [refs, onPatchIntent]
  );

  const handleChangeRole = useCallback(
    async (assetId: string, newRole: string) => {
      const nextRefs = refs.map((ref) => ref.assetId === assetId ? { ...ref, role: newRole } : ref);
      await onPatchIntent({ referenceAssignments: nextRefs });
    },
    [refs, onPatchIntent]
  );

  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>02</span>
        <div>
          <h2 className={styles.tileTitle}>参考图分配</h2>
          <p className={styles.tileSubtitle}>
            已添加 {refs.length} 张。为每张参考图指定它在生成中的作用。
          </p>
        </div>
      </header>
      {refs.length > 0 ? (
        <ul className={styles.refList}>
          {refs.map((ref) => (
            <ReferenceRow
              key={ref.assetId}
              ref={ref}
              disabled={pending || !view.canEditIntent}
              onRemove={() => handleRemoveAssignment(ref.assetId)}
              onChangeRole={(newRole) => handleChangeRole(ref.assetId, newRole)}
            />
          ))}
        </ul>
      ) : (
        <div className={styles.referenceEmpty}>
          <strong>暂无参考图</strong>
          <p>可添加视觉、结构、材质、构图、风格或产品身份参考。</p>
        </div>
      )}
      <div className={styles.refActions}>
        <button
          ref={pickerTriggerRef}
          className={styles.toolbarButton}
          onClick={openPicker}
          disabled={pending || !view.canEditIntent}
          type="button"
        >
          + 添加参考图
        </button>
        <span className={styles.refMetaHint}>支持 6 种参考作用</span>
      </div>
      <details className={styles.refRolesHelp}>
        <summary>查看可选参考作用</summary>
        <ul className={styles.roleList}>
          {(PACKAGING_REFERENCE_ROLES as readonly string[]).map((role) => (
            <li key={role} className={styles.roleChip}>
              <span className={styles.roleChipLabel}>{roleLabel(role)}</span>
            </li>
          ))}
        </ul>
      </details>
      {pickerOpen && (
        <ReferencePicker
          assetSummary={assetSummary}
          loading={loadingSummary}
          error={summaryError}
          existingRefs={refs}
          onCancel={closePicker}
          onAdd={handleAddAssignment}
        />
      )}
    </section>
  );
}

function ReferenceRow({
  ref,
  disabled,
  onRemove,
  onChangeRole,
}: {
  ref: PackagingWorkspaceReference;
  disabled: boolean;
  onRemove: () => void;
  onChangeRole: (role: string) => void;
}) {
  return (
    <li className={styles.refRow}>
      <div className={styles.refRowMain}>
        {ref.previewUri ? (
          <img
            src={ref.previewUri}
            alt=""
            className={styles.refThumb}
          />
        ) : (
          <div className={styles.refThumbPlaceholder} aria-hidden>无</div>
        )}
        <div className={styles.refRowText}>
          <strong>{ref.displayName || ref.assetId}</strong>
          <small className={styles.refRowRole}>{roleLabel(ref.role)}</small>
          <code className={styles.refRowAssetId}>{ref.assetId}</code>
        </div>
      </div>
      <div className={styles.refRowActions}>
        <select
          className={styles.refRoleSelect}
          aria-label={`更改 ${ref.displayName || ref.assetId} 的参考作用`}
          value={ref.role}
          onChange={(event) => onChangeRole(event.target.value)}
          disabled={disabled}
        >
          {(PACKAGING_REFERENCE_ROLES as readonly string[]).map((role) => (
            <option key={role} value={role}>{roleLabel(role)}</option>
          ))}
        </select>
        <button
          className={styles.refRemoveButton}
          onClick={onRemove}
          disabled={disabled}
          aria-label={`移除 ${ref.displayName || ref.assetId}`}
        >
          移除
        </button>
      </div>
    </li>
  );
}

function ReferencePicker({
  assetSummary,
  loading,
  error,
  existingRefs,
  onCancel,
  onAdd,
}: {
  assetSummary: AssetSummary | null;
  loading: boolean;
  error: string | null;
  existingRefs: PackagingWorkspaceReference[];
  onCancel: () => void;
  onAdd: (asset: AssetItem, role: string) => void;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>(
    (PACKAGING_REFERENCE_ROLES as readonly string[])[0] || ''
  );
  const existingIds = new Set(existingRefs.map((r) => r.assetId));
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const candidates = (assetSummary?.items || []).filter((item) => {
    if (existingIds.has(item.id)) return false;
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return true;
    return `${item.name} ${item.id}`.toLocaleLowerCase().includes(needle);
  });
  useDialogKeyboard(onCancel, dialogRef, closeButtonRef);
  return (
    <div
      className={styles.pickerBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div
        ref={dialogRef}
        className={styles.pickerPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reference-picker-title"
        aria-describedby="reference-picker-description"
      >
        <header className={styles.pickerHeader}>
          <div>
            <h3 id="reference-picker-title" className={styles.pickerTitle}>添加参考图</h3>
            <p id="reference-picker-description" className={styles.pickerDescription}>
              从当前项目资产中选择一张图片并指定参考作用。
            </p>
          </div>
          <button
            ref={closeButtonRef}
            className={styles.iconButton}
            onClick={onCancel}
            type="button"
            aria-label="关闭参考图选择器"
          >×</button>
        </header>
        {error && <p className={styles.bootstrapError}>{error}</p>}
        {loading && <p className={styles.bootstrapHint}>正在读取项目资产…</p>}
        {!loading && !error && candidates.length === 0 && (
          <p className={styles.bootstrapHint}>
            {query ? '没有匹配的项目资产，请尝试其他关键词。' :
              `项目当前没有可添加的资产（共 ${assetSummary?.totalFiles ?? 0} 个文件）。`}
          </p>
        )}
        {!loading && !error && (assetSummary?.items?.length ?? 0) > 0 && (
          <>
            <label className={styles.pickerSearchLabel}>
              <span className={styles.visuallyHidden}>搜索项目资产</span>
              <input
                className={styles.bootstrapInput}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文件名…"
              />
            </label>
            <div className={styles.pickerAssetGrid} role="listbox" aria-label="可用项目资产">
              {candidates.map((asset) => (
                <button
                  key={asset.id}
                  className={`${styles.pickerAsset} ${selectedAssetId === asset.id ? styles.pickerAssetSelected : ''}`}
                  type="button"
                  role="option"
                  aria-selected={selectedAssetId === asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                >
                  {asset.thumbnailDataUrl ? (
                    <img className={styles.pickerAssetThumb} src={asset.thumbnailDataUrl} alt="" />
                  ) : (
                    <span className={styles.pickerAssetPlaceholder} aria-hidden>图</span>
                  )}
                  <span className={styles.pickerAssetName} title={asset.name}>{asset.name}</span>
                </button>
              ))}
            </div>
            <label className={styles.bootstrapLabel}>
              参考作用
              <select
                className={styles.bootstrapInput}
                value={selectedRole}
                onChange={(event) => setSelectedRole(event.target.value)}
              >
                {(PACKAGING_REFERENCE_ROLES as readonly string[]).map((role) => (
                  <option key={role} value={role}>{roleLabel(role)}</option>
                ))}
              </select>
            </label>
            <div className={styles.bootstrapActions}>
              <button
                className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
                disabled={!selectedAssetId || !selectedRole}
                onClick={() => {
                  const asset = candidates.find((a) => a.id === selectedAssetId);
                  if (asset) onAdd(asset, selectedRole);
                }}
                type="button"
              >
                添加到参考图
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function mergeAssignment(
  current: PackagingWorkspaceReference[],
  next: PackagingWorkspaceReference
): PackagingWorkspaceReference[] {
  // Append if not present; otherwise leave the existing
  // entry untouched (Web does NOT auto-reorder; the P2
  // frozen authority is the sole owner of precedence).
  if (current.some((r) => r.assetId === next.assetId)) return current;
  return [...current, next];
}

// ---------------------------------------------------------------------------
// 03 — Locked Assets (P3-B3 real projection from runtime)
// ---------------------------------------------------------------------------

function LockedAssetsTile({
  view,
  onRefreshTruth,
}: {
  view: PackagingWorkspaceView;
  onRefreshTruth: () => void;
}) {
  const fields = view.lockedAssets?.fields ?? {};
  const allLocked = Boolean(view.lockedAssets?.allLocked);
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>03</span>
        <div>
          <h2 className={styles.tileTitle}>锁定资产</h2>
          <p className={styles.tileSubtitle}>
            来自项目的锁定信息，仅供当前工作台读取。
          </p>
        </div>
        <span className={styles.lockedHeaderBadge}>{allLocked ? '全部锁定' : '只读'}</span>
      </header>
      <ul className={styles.lockedList}>
        {LOCKED_FIELD_LABELS.map(({ key, label, render }) => {
          const field = (fields as Record<string, PackagingWorkspaceLockedField | undefined>)[key];
          return (
            <li key={key} className={styles.lockedRow}>
              <span className={styles.lockedLabel}>{label}</span>
              <span className={styles.lockedValue}>
                {render ? render(field) : <em className={styles.lockedMuted}>未提供</em>}
              </span>
              <span className={styles.lockedFlag}>已锁定</span>
            </li>
          );
        })}
      </ul>
      <p className={styles.lockedNote}>
        如需变更，请返回项目设置更新锁定资产；此处不会修改原始信息。
      </p>
      <button
        className={styles.toolbarButton}
        onClick={onRefreshTruth}
        title="从项目重新读取锁定信息"
        type="button"
      >
        刷新锁定信息
      </button>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 04 — Readiness & Stale
// ---------------------------------------------------------------------------

function ReadinessStaleTile({
  view,
  transientError,
}: {
  view: PackagingWorkspaceView;
  transientError: string | null;
}) {
  const r = view.readiness;
  const reasons = view.staleReasons ?? [];
  const isStale = Boolean(r?.isStale);
  // P3-B4 §XIII: Prepared Summary. We surface a deliberately
  // small subset of view.prepared here — the UI must not
  // expose the full compiler debug surface (the 5 P2-F
  // hashes + executionIdentityHash stay on the View Model's
  // fingerprintSummary as canonical short ids). The
  // compiledPromptPreview is a read-only surface (P3-A
  // §22) and is exposed as a collapsible details so the user
  // can inspect it without editing it.
  const prepared = view.prepared;
  return (
    <section
      className={`${styles.tile} ${isStale ? styles.tileStale : ''}`}
    >
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>04</span>
        <div>
          <h2 className={styles.tileTitle}>就绪状态 / 失效</h2>
          <p className={styles.tileSubtitle}>
            查看当前是否可以准备或执行，以及下一步需要完成什么。
          </p>
        </div>
      </header>
      <div className={styles.capabilityGrid}>
        <CapabilityChip label="可编辑配置" on={Boolean(r?.canEditIntent)} />
        <CapabilityChip label="可以准备" on={Boolean(r?.canPrepare)} />
        <CapabilityChip label="可以执行" on={Boolean(r?.canExecute)} />
        <CapabilityChip label="可以再次生成" on={Boolean(r?.canRetry)} />
      </div>
      {prepared && (
        <div className={styles.preparedSummary}>
          <h3 className={styles.preparedSummaryTitle}>
            已准备的生成配置
          </h3>
          <dl className={styles.kvList}>
            <KV label="模式" value={prepared.generationMode || '—'} />
            <KV label="镜头" value={prepared.shotContractId || '—'} />
            <KV
              label="参考图"
              value={
                prepared.referenceSummary
                  ? `${prepared.referenceSummary.count ?? 0} 张${
                      prepared.referenceSummary.required ? '（必出）' : ''
                    }`
                  : '—'
              }
            />
            <KV
              label="Provider"
              value={
                prepared.providerSummary
                  ? `${prepared.providerSummary.provider || '—'} / ${
                      prepared.providerSummary.registryModelId || '—'
                    }`
                  : '—'
              }
            />
          </dl>
          {prepared.warnings && prepared.warnings.length > 0 && (
            <div className={styles.preparedSummaryWarnings}>
              <strong>需要注意：</strong>
              <ul>
                {prepared.warnings.map((w: string) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {prepared.compiledPromptPreview && (
            <details className={styles.preparedSummaryDetails}>
              <summary>查看编译后的提示词（只读）</summary>
              <pre className={styles.preparedSummaryPrompt}>
                {prepared.compiledPromptPreview}
              </pre>
              <p className={styles.preparedSummaryHint}>
                此内容仅用于核对，无法在这里编辑。
              </p>
            </details>
          )}
        </div>
      )}
      {transientError && (
        <div className={styles.errorBox} role="alert">
          <strong>操作未完成</strong>
          <p>请检查当前配置后重试；安全错误详情会显示在错误提示区域。</p>
        </div>
      )}
      {isStale ? (
        <div className={styles.staleBox}>
          <strong>当前配置已变化，需要重新准备。</strong>
          <p>完成重新准备后，才能使用最新配置执行生成。</p>
          {Array.isArray(r?.blockers) && r.blockers.length > 0 && (
            <p className={styles.staleBlocker}>
              当前需要处理：{r.blockers.join(' / ')}
            </p>
          )}
          {reasons.length > 0 && (
            <details className={styles.diagnosticDetails}>
              <summary>技术详情</summary>
              <ul>
                {reasons.map((reason: string) => (
                  <li key={reason} className={styles.staleReason}>{reason}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      ) : (
        <p className={styles.readinessHint}>
          {readinessGuidance(view.status, r?.blockers ?? [])}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 05 — Result Tile (P3-B4 Execution & Result Gallery)
//
// Authority:
//   - Consumes ONLY the frozen `view.execution` UI-safe summary.
//   - No raw preparedResult / executionResult / Provider payload /
//     absolute path is ever read. The artifact cards surface
//     safe metadata (imageId / mimeType / hasB64 / hasUrl / width
//     / height / sizeBytes) and a placeholder thumbnail.
//   - P3-B4 §IX: the production saveRun adapter is owned by the
//     runtime; the Packaging runId (`pkg-...`) does NOT route
//     through `imageGeneration.getImageDataUrl`. We do not call
//     any preview RPC from the Web feature — the preview is a
//     safe metadata card. Downloading a real preview requires
//     the production runtime to wire the canonical
//     artifact-serving seam, which is out of scope for B4.
//   - P3-B4 §XV: when the current `view.status === 'stale'`,
//     `view.execution` still carries the previous result (the
//     View Model does NOT clear it on STALE). We render a
//     presentation-only "上次结果" badge so the user can see
//     the old gallery while understanding the prepared
//     snapshot is no longer valid.
// ---------------------------------------------------------------------------

function ResultTile({ view, sessionId }: { view: PackagingWorkspaceView; sessionId: string }) {
  const exec = view.execution;
  const status = String(view.status || '');
  const isStale = status === 'stale';
  const isExecuted = status === 'executed';
  const isFailed = status === 'failed';
  // P3-B4 §XV: the previous-result label applies whenever the
  // current lifecycle is NOT executed — stale, failed, etc.
  // show "上次结果" so the user is not misled into thinking the
  // gallery reflects the current configuration.
  const showPreviousLabel = Boolean(exec) && !isExecuted;
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>05</span>
        <div>
          <h2 className={styles.tileTitle}>当前产物</h2>
          <p className={styles.tileSubtitle}>
            生成结果会优先显示图片，运行信息位于下方。
          </p>
        </div>
      </header>
      {exec ? (
        <>
          <div className={styles.resultHeader}>
            <div className={styles.resultMeta}>
              <span className={styles.resultMetaTitle}>
                {exec.provider?.provider || '—'} · {exec.model?.registryModelId || '—'} · {exec.model?.providerModelId || '—'}
              </span>
              <span>状态：{exec.status || '—'}</span>
            </div>
            <div className={styles.resultBadgeRow}>
              {showPreviousLabel && (
                <span className={styles.resultPreviousBadge}>
                  <span className={styles.resultPreviousBadgeDot} />
                  {isStale ? '上次结果 · 当前配置已变化' : isFailed ? '上次结果 · 上次执行未成功' : '上次结果'}
                </span>
              )}
              {isExecuted && (
                <span className={styles.resultCurrentBadge}>
                  <span className={styles.resultCurrentBadgeDot} />
                  本次结果
                </span>
              )}
            </div>
          </div>

          {/* P3-B5: artifact cards. Each card loads its preview
              via the canonical `packaging:get-artifact-preview`
              RPC channel. The preview is identity-validated on
              the runtime side (`runId` must equal
              `view.execution.runId`); the Web feature never
              sees an absolute path, a Buffer, or a credential. */}
          {Array.isArray(exec.artifacts) && exec.artifacts.length > 0 ? (
            <div className={styles.resultArtifacts}>
              {exec.artifacts.map((artifact, index) => {
                const cardKey = artifact.imageId || `artifact-${index}`;
                return (
                  <ArtifactPreviewCard
                    key={cardKey}
                    sessionId={sessionId}
                    runId={exec.runId}
                    artifact={artifact}
                    index={index}
                  />
                );
              })}
            </div>
          ) : (
            <div className={styles.resultEmpty}>
              <div className={styles.resultEmptyTitle}>本次生成没有图片结果</div>
              <div>
                请检查模型配置，必要时重新准备后再次生成。
              </div>
            </div>
          )}

          {/* P3-B4 §VIII: diagnostics. We surface duration /
              referenceCount / imageCount / region only — the
              raw redactedRequest / redactedResponse bodies
              stay on the internal session, not the View. */}
          {exec.diagnostics && (
            <div className={styles.resultDiagnostics}>
              {exec.diagnostics.durationMs != null && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>耗时</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.durationMs} ms
                  </span>
                </div>
              )}
              {exec.diagnostics.referenceCount != null && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>参考图</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.referenceCount}
                  </span>
                </div>
              )}
              {exec.diagnostics.imageCount != null && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>产物数</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.imageCount}
                  </span>
                </div>
              )}
              {exec.diagnostics.startedAt && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>开始</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.startedAt}
                  </span>
                </div>
              )}
              {exec.diagnostics.completedAt && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>完成</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.completedAt}
                  </span>
                </div>
              )}
              {exec.diagnostics.region && (
                <div className={styles.resultDiagnosticsRow}>
                  <span className={styles.resultDiagnosticsLabel}>审计区域</span>
                  <span className={styles.resultDiagnosticsValue}>
                    {exec.diagnostics.region}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* P3-B4 §XV: STALE + previous result banner. The View
              Model still carries the old result; we explicitly
              call out that re-Execute requires Prepare. The
              banner is a presentation-only hint; the application
              state machine remains the source of truth. */}
          {isStale && (
            <div className={styles.resultStaleBanner}>
              <strong>这是上一次结果</strong>
              当前配置已经发生变化。请重新准备并执行，以获得与当前配置一致的新结果。
            </div>
          )}

          {/* P3-B4 §IX: explicit note explaining that real
              preview bytes are not loaded in B4. The production
              artifact-serving seam is owned by the runtime; the
              Web feature is RPC-only and never reaches into the
              filesystem. */}
          <details className={styles.resultNote}>
            <summary>运行详情</summary>
            <code>{exec.runId}</code>
          </details>
        </>
      ) : (
        <div className={styles.resultEmpty}>
          <div className={styles.resultEmptyTitle}>尚未执行任何生成。</div>
          <div>
            先完成「准备生成」，再选择「执行生成」。生成的包装效果图会显示在这里。
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 05.x — Artifact preview card (P3-B5)
//
// Loads a single artifact preview via the canonical
// `packaging:get-artifact-preview` RPC channel. The runtime
// enforces identity (`runId` must equal `view.execution.runId`)
// and shape (`imageId` must match `image-NN`); the Web feature
// just renders the data URL it receives.
//
// State machine:
//   - 'idle' / 'loading' → CSS placeholder + scan animation.
//   - 'loaded'            → `<img src={dataUrl}>` (data URL).
//   - 'unavailable'       → CSS placeholder + "预览不可用".
//   - 'error'             → CSS placeholder + "预览失败".
//
// Notes:
//   - The data URL is owned by the preview tile only. The tile
//     never persists it (no localStorage / sessionStorage /
//     IndexedDB; the runtime is the SOLE preview authority).
//   - When `view.execution` changes (e.g. Retry produces a new
//     runId), the `useEffect` re-fires and the tile re-loads.
// ---------------------------------------------------------------------------

type ArtifactPreviewState =
  | { kind: 'loading' }
  | { kind: 'loaded'; dataUrl: string; mimeType: string }
  | { kind: 'unavailable' }
  | { kind: 'error'; message: string };

interface PackagingArtifactView {
  // We deliberately omit `relativePath` and
  // `thumbnailRelativePath` from this view shape (P3-B4 Y-02
  // / P3-B5 §IX): the Web feature MUST NOT carry filesystem
  // path identifiers through its component contract. The
  // runtime is the SOLE authority for the underlying
  // artifact paths; the Web side identifies artifacts by
  // their logical `imageId` only.
  imageId: string;
  mimeType: string;
  hasB64: boolean;
  hasUrl: boolean;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
}

function ArtifactPreviewCard({
  sessionId,
  runId,
  artifact,
  index,
}: {
  sessionId: string;
  runId: string;
  artifact: PackagingArtifactView;
  index: number;
}) {
  const [state, setState] = useState<ArtifactPreviewState>({ kind: 'loading' });
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewTriggerRef = useRef<HTMLButtonElement>(null);
  // P3-B5 §XVIII: preview presentation state only. The
  // artifact list, run metadata, and result authority live on
  // `view.execution` (frozen P3-A). The data URL is held in
  // local state and is NEVER persisted to the browser side.
  useEffect(() => {
    let cancelled = false;
    setState({ kind: 'loading' });
    setPreviewOpen(false);
    async function load() {
      const imageId = artifact.imageId;
      if (!imageId || !runId || !sessionId) {
        if (!cancelled) setState({ kind: 'unavailable' });
        return;
      }
      try {
        const result = await getPackagingArtifactPreview({ sessionId, runId, imageId });
        if (cancelled) return;
        if (result && result.preview) {
          setState({
            kind: 'loaded',
            dataUrl: result.preview.dataUrl,
            mimeType: result.preview.mimeType,
          });
        } else {
          setState({ kind: 'unavailable' });
        }
      } catch (reason) {
        if (cancelled) return;
        const message = reason instanceof Error ? reason.message : String(reason);
        setState({ kind: 'error', message });
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, runId, artifact.imageId]);
  const cardKey = artifact.imageId || `artifact-${index}`;
  return (
    <article
      key={cardKey}
      className={styles.resultArtifactCard}
      data-testid="packaging-artifact-card"
    >
      <div className={styles.resultArtifactThumb}>
        {state.kind === 'loaded' ? (
          <button
            ref={previewTriggerRef}
            className={styles.previewTrigger}
            type="button"
            onClick={() => setPreviewOpen(true)}
            aria-label={`放大预览 ${artifact.imageId || `结果 ${index + 1}`}`}
          >
            <img
              className={styles.resultArtifactThumbImage}
              src={state.dataUrl}
              alt={artifact.imageId || `artifact-${index + 1}`}
              data-testid="packaging-artifact-preview-img"
            />
          </button>
        ) : null}
        {state.kind === 'loading' && (
          <span className={styles.resultArtifactThumbLoading}>加载中…</span>
        )}
        {state.kind === 'unavailable' && (
          <span className={styles.resultArtifactThumbMuted}>
            预览不可用（缩略图占位）
          </span>
        )}
        {state.kind === 'error' && (
          <span className={`${styles.resultArtifactThumbMuted} ${styles.resultArtifactThumbError}`}>
            预览失败
          </span>
        )}
      </div>
      <div className={styles.resultArtifactBody}>
        <span
          className={styles.resultArtifactTitle}
          title={artifact.imageId || ''}
        >
          {artifact.imageId || `artifact-${index + 1}`}
        </span>
        <ArtifactKv label="MIME" value={artifact.mimeType || '—'} />
        {artifact.width != null && artifact.height != null && (
          <ArtifactKv
            label="尺寸"
            value={`${artifact.width} × ${artifact.height}`}
          />
        )}
        {artifact.sizeBytes != null && (
          <ArtifactKv
            label="大小"
            value={formatBytes(artifact.sizeBytes)}
          />
        )}
        {artifact.hasB64 && (
          <ArtifactKv label="内联" value="b64" />
        )}
        {artifact.hasUrl && (
          <ArtifactKv label="Provider URL" value="已提供（仅元数据）" />
        )}
      </div>
      {previewOpen && state.kind === 'loaded' && (
        <PreviewDialog
          dataUrl={state.dataUrl}
          alt={artifact.imageId || `结果 ${index + 1}`}
          onClose={() => {
            setPreviewOpen(false);
            requestAnimationFrame(() => previewTriggerRef.current?.focus());
          }}
        />
      )}
    </article>
  );
}

function PreviewDialog({ dataUrl, alt, onClose }: { dataUrl: string; alt: string; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogKeyboard(onClose, dialogRef, closeButtonRef);
  return (
    <div
      className={styles.previewBackdrop}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={dialogRef} className={styles.previewDialog} role="dialog" aria-modal="true" aria-label={`${alt} 大图预览`}>
        <button
          ref={closeButtonRef}
          className={styles.previewClose}
          type="button"
          onClick={onClose}
          aria-label="关闭大图预览"
        >×</button>
        <img className={styles.previewImage} src={dataUrl} alt={alt} />
      </div>
    </div>
  );
}

function ArtifactKv({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.resultArtifactKv}>
      <span className={styles.resultArtifactKvLabel}>{label}</span>
      <span className={styles.resultArtifactKvValue}>{value}</span>
    </div>
  );
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

// ---------------------------------------------------------------------------
// 06 — Error Surface (consume view.error only; raw error.message never used)
// ---------------------------------------------------------------------------

function ErrorSurfaceTile({ view }: { view: PackagingWorkspaceView }) {
  const err = view.error;
  return (
    <section
      className={`${styles.tile} ${err ? styles.tileError : ''}`}
    >
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>06</span>
        <div>
          <h2 className={styles.tileTitle}>错误提示</h2>
          <p className={styles.tileSubtitle}>
            Error Surface · view.error（仅消费 code / title /
            userMessage / recoverable / suggestedAction）
          </p>
        </div>
      </header>
      {err ? (
        <div className={styles.errorBox}>
          <div className={styles.errorHeader}>
            <strong>{err.recoverable ? '操作未完成' : '生成被阻止'}</strong>
            <span
              className={`${styles.badge} ${
                err.recoverable ? styles.badge_ready : styles.badge_failed
              }`}
            >
              {err.recoverable ? '可恢复' : '阻塞'}
            </span>
          </div>
          {err.title && err.title !== err.code && (
            <p className={styles.errorTitle}>{err.title}</p>
          )}
          {err.userMessage && (
            <p className={styles.errorMessage}>{err.userMessage}</p>
          )}
          {err.suggestedAction && (
            <p className={styles.errorAction}>
              建议：{err.suggestedAction}
            </p>
          )}
          <details className={styles.diagnosticDetails}>
            <summary>技术详情</summary>
            <code className={styles.errorCode}>{err.code}</code>
          </details>
        </div>
      ) : (
        <EmptyHint message="无错误。" />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small reusable bits
// ---------------------------------------------------------------------------

function KV({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.kvRow}>
      <dt className={styles.kvLabel}>{label}</dt>
      <dd className={`${styles.kvValue} ${mono ? styles.mono : ''}`}>
        {value}
      </dd>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return <p className={styles.emptyHint}>{message}</p>;
}

function CapabilityChip({ label, on }: { label: string; on: boolean }) {
  return (
    <div
      className={`${styles.chip} ${on ? styles.chipOn : styles.chipOff}`}
    >
      <span className={styles.chipDot} />
      <span>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TONE_OVERRIDES: Record<string, string> = {
  ready: 'ready',
  executed: 'completed',
  failed: 'failed',
  stale: 'failed',
  preparing: 'running',
  executing: 'running',
};

function resolveStatusTone(status: string): string {
  if (STATUS_TONE_OVERRIDES[status]) return STATUS_TONE_OVERRIDES[status];
  if (status === 'new' || status === 'unprepared') return 'neutral';
  return 'neutral';
}

function actionGuidance(status: string): string {
  if (status === 'preparing') return '正在准备生成配置，请稍候。';
  if (status === 'executing') return '正在生成包装效果图，请稍候。';
  if (status === 'ready') return '配置已准备完成，可以执行生成。';
  if (status === 'executed') return '生成已完成；可再次生成，或修改配置后重新准备。';
  if (status === 'failed') return '上次生成未完成，请按错误提示处理后重试。';
  if (status === 'stale') return '配置已变化，需要重新准备。';
  return '确认生成意图、参考图与锁定信息后，准备生成配置。';
}

function readinessGuidance(status: string, blockers: readonly string[]): string {
  if (blockers.length > 0) return `完成以下事项后继续：${blockers.join(' / ')}`;
  if (status === 'ready') return '配置已准备完成，可以执行生成。';
  if (status === 'executed') return '本次生成已完成，可以查看结果或再次生成。';
  if (status === 'preparing') return '正在准备生成配置…';
  if (status === 'executing') return '正在生成包装效果图…';
  if (status === 'failed') return '生成未完成，请查看错误提示并重试。';
  return '当前配置可以继续编辑；完成后选择“准备生成”。';
}

interface LockedFieldDef {
  key: string;
  label: string;
  render?: (value: PackagingWorkspaceLockedField | undefined) => React.ReactNode;
}

const LOCKED_FIELD_LABELS: LockedFieldDef[] = [
  {
    key: 'brand',
    label: '品牌',
    render: (v) => v?.name || <MutedEmpty />,
  },
  {
    key: 'logo',
    label: 'Logo',
    render: (v) => {
      const present = Boolean(v?.present);
      const usage = v?.usageMode || 'reserved';
      return (
        <>
          {present ? '已提供' : '未提供'} · 用法：{usage}
        </>
      );
    },
  },
  {
    key: 'productIdentity',
    label: '产品身份',
    render: (v) => v?.name || <MutedEmpty />,
  },
  {
    key: 'category',
    label: '品类',
    render: (v) => v?.name || <MutedEmpty />,
  },
  {
    key: 'structure',
    label: '结构',
    render: (v) => v?.formFactor || <MutedEmpty />,
  },
  {
    key: 'mandatoryCopy',
    label: '必出元素',
    render: (v) => {
      const items = Array.isArray(v?.items) ? v!.items : [];
      return items.length > 0 ? <LockedItems items={items} /> : <MutedEmpty />;
    },
  },
  {
    key: 'confirmedComponents',
    label: '已排除 / 已确认',
    render: (v) => {
      const items = Array.isArray(v?.items) ? v!.items : [];
      return items.length > 0 ? <LockedItems items={items} /> : <MutedEmpty />;
    },
  },
];

function LockedItems({ items }: { items: unknown[] }) {
  return (
    <span className={styles.lockedItems}>
      {items.map((item, index) => (
        <span key={`${String(item)}-${index}`}>{String(item)}</span>
      ))}
    </span>
  );
}

function MutedEmpty() {
  return <em className={styles.lockedMuted}>未提供</em>;
}
