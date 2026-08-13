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
//   - The canonical 6 roles are imported from
//     `@masterpiece/runtime-core` (the frozen P3-A authority
//     via `application/packaging/index.js` re-export). The
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

import { useCallback, useMemo, useState } from 'react';
import {
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_WORKSPACE_STATUS_LABELS,
} from '@masterpiece/runtime-core';
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
  'window.masterpiece.packaging 命名空间未注册。' +
  'Packaging Workspace 依赖 Shared Runtime RPC 桥接。' +
  '请确认 Node Runtime Host 已启动并加载了 P3-B2 operations。';

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

function roleLabel(role: string): string {
  return ROLE_PRESENTATION_LABELS[role] || role;
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
      const message = reason instanceof Error ? reason.message : String(reason);
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
          <h2 className={styles.bootstrapTitle}>Shared Runtime RPC 不可用</h2>
          <p className={styles.bootstrapBody}>
            P3-B2/B3 将 Packaging Workspace 完全迁移到了 Shared Runtime RPC。Web
            端不再本地实例化 Workspace service。
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
            选择项目以建立 Packaging Workspace 会话。Locked Assets 等事实面
            将由 runtime 侧从项目存储与 Locked-Assets-Service 解析。
          </p>
        </div>
        <div className={styles.topNavRight}>
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </div>
      </header>
      <main className={styles.bootstrapMain}>
        <section className={styles.bootstrapPanel}>
          <h2 className={styles.bootstrapTitle}>建立 Workspace 会话</h2>
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
              {pending ? '建立中…' : '建立会话'}
            </button>
            <button className={styles.toolbarButton} onClick={onBack} disabled={pending}>
              取消
            </button>
          </div>
          <p className={styles.bootstrapHint}>
            会话由 runtime 端持有。Web 端只保留 sessionId + View Model。本地
            不再存在 Packaging Workspace service 实例。
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
            基于已完成的视觉分析，使用 Workspace Architecture 推导并生成包装效果图。
            参考图与锁定资产均来自项目既有事实面（runtime 侧解析）。
          </p>
        </div>
        <div className={styles.topNavRight}>
          <StatusBadge status={view.status} label={view.statusLabel} />
          <SessionIdBadge value={sessionId} />
          <button className={styles.backButton} onClick={onBack}>返回首页</button>
        </div>
      </header>

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
        <ResultTile view={view} />
        <ErrorSurfaceTile view={view} />
      </main>

      <footer className={styles.footer}>
        <small>
          P3-B3: 参考图与锁定资产均来自 runtime 端既有事实面（Locked-Assets-Service
          + project store + analysis context）。Web 不再构造 second authority。
        </small>
      </footer>
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
    status === 'preparing' ? '准备中…' :
    status === 'executing' ? '执行中…' :
    null;
  // P3-B4 §XV: STALE state hints at the user that the
  // current configuration no longer matches the prepared
  // snapshot; they must re-Prepare before they can Execute
  // again. We surface this as a non-actionable hint next to
  // the toolbar (not as a fake disable reason).
  return (
    <div className={styles.toolbar}>
      <div>
        <p className={styles.toolbarHint}>
          按钮启用状态由 View Model 决定。execute ≠ implicit prepare + execute
          （P3-A §10.6）。Retry 走同一个 executeGeneration RPC，不是
          隐式 prepare+execute。
        </p>
        {isStale && (
          <p className={styles.toolbarStaleHint}>
            当前 configuration 已变化 — 上次准备已失效，需先「准备生成」再执行。
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
          className={styles.toolbarButton}
          onClick={onPrepare}
          disabled={!canPrepare || isBusy}
        >
          {status === 'preparing' ? '准备中…' : '准备生成'}
        </button>
        <button
          className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
          onClick={onExecute}
          disabled={!canExecute || isBusy}
          title={isStale ? 'STALE: 请先重新准备' : undefined}
        >
          {status === 'executing' ? '执行中…' : '执行生成'}
        </button>
        {canRetry && !isBusy && (
          <button
            className={styles.toolbarRetryButton}
            onClick={onExecute}
            // Retry shares the same `executeGeneration` RPC;
            // we re-use `onExecute` (same handler) because the
            // RPC contract is identical — no new endpoint, no
            // implicit prepare.
            data-action="retry"
            title="使用当前 prepared snapshot 再执行一次（与 Execute 共用 RPC）"
          >
            再次生成
          </button>
        )}
        <button
          className={styles.toolbarButton}
          onClick={onReset}
          disabled={!canReset || isBusy}
        >
          重置
        </button>
        <button
          className={styles.refreshButton}
          onClick={onRefreshView}
          disabled={isBusy}
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
      {label || status || '未知状态'}
    </span>
  );
}

function SessionIdBadge({ value }: { value: string }) {
  if (!value) return null;
  const short = value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
  return (
    <span className={styles.sessionBadge} title={value}>
      会话 {short}
    </span>
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
            Generation Intent · view.intent（支持 RPC updateIntent）
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
              label="Provider Model"
              value={intent.providerModelId || '—'}
              mono
            />
            <KV
              label="API Profile"
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
        更新 API Profile
        <input
          className={styles.bootstrapInput}
          value={apiProfileId}
          onChange={(event) => setApiProfileId(event.target.value)}
          placeholder="可选 — 留空则不更新"
          disabled={disabled}
        />
      </label>
      <label className={styles.patchLabel}>
        更新 Provider Model
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
        写入 updateIntent
      </button>
    </form>
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
      const message = reason instanceof Error ? reason.message : String(reason);
      setSummaryError(message);
    } finally {
      setLoadingSummary(false);
    }
  }, [assetSummary, projectId]);

  const closePicker = useCallback(() => {
    setPickerOpen(false);
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
            Reference Assignments · view.references（{refs.length} 项）· 来自
            项目既有资产（runtime `projects.scanAssets`），不在 Web 端伪造
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
        <EmptyHint message="尚未分配参考图。在下方选择项目资产并赋予 canonical role。" />
      )}
      <div className={styles.refActions}>
        <button
          className={styles.toolbarButton}
          onClick={openPicker}
          disabled={pending || !view.canEditIntent}
        >
          + 添加参考图
        </button>
        <span className={styles.refMetaHint}>
          canonical 角色来自 P3-A frozen `PACKAGING_REFERENCE_ROLES`（6 项）
        </span>
      </div>
      <details className={styles.refRolesHelp}>
        <summary>canonical 角色（来自 P2 frozen reference-policy）</summary>
        <ul className={styles.roleList}>
          {(PACKAGING_REFERENCE_ROLES as readonly string[]).map((role) => (
            <li key={role} className={styles.roleChip}>
              <code>{role}</code>
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
  const [selectedRole, setSelectedRole] = useState<string>(
    (PACKAGING_REFERENCE_ROLES as readonly string[])[0] || ''
  );
  const existingIds = new Set(existingRefs.map((r) => r.assetId));
  const candidates = (assetSummary?.items || []).filter(
    (item) => !existingIds.has(item.id)
  );
  return (
    <div className={styles.pickerBackdrop} role="dialog" aria-label="选择参考图">
      <div className={styles.pickerPanel}>
        <header className={styles.pickerHeader}>
          <h3 className={styles.pickerTitle}>选择项目资产作为参考</h3>
          <button className={styles.toolbarButton} onClick={onCancel}>取消</button>
        </header>
        {error && <p className={styles.bootstrapError}>{error}</p>}
        {loading && <p className={styles.bootstrapHint}>正在读取项目资产…</p>}
        {!loading && !error && candidates.length === 0 && (
          <p className={styles.bootstrapHint}>
            项目当前没有可用的资产（{assetSummary?.totalFiles ?? 0} 个文件）。
            请先在项目页导入素材。
          </p>
        )}
        {!loading && !error && candidates.length > 0 && (
          <>
            <label className={styles.bootstrapLabel}>
              资产
              <select
                className={styles.bootstrapInput}
                value={selectedAssetId}
                onChange={(event) => setSelectedAssetId(event.target.value)}
              >
                <option value="">选择资产…</option>
                {candidates.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name}（{asset.id}）
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.bootstrapLabel}>
              Canonical Role
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
            Locked Assets · view.lockedAssets（只读 · 来源：runtime
            Locked-Assets-Service + project store ·{' '}
            {allLocked ? '全部已锁定' : '存在可配置项'}）
          </p>
        </div>
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
        UI 不直接编辑锁定资产；变更请走既有项目 / Locked-Assets-Service 流程。
        空值 = 真实 project 当前未提供该字段（NOT a fake seed）。
      </p>
      <button
        className={styles.toolbarButton}
        onClick={onRefreshTruth}
        title="触发 RPC refreshPackagingTruth(sessionId) — runtime 重新走 Locked-Assets-Service 解析"
      >
        重新解析真相面
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
            Readiness & Stale · view.readiness · view.staleReasons
          </p>
        </div>
      </header>
      <div className={styles.capabilityGrid}>
        <CapabilityChip label="可编辑意图" on={Boolean(r?.canEditIntent)} />
        <CapabilityChip label="可准备" on={Boolean(r?.canPrepare)} />
        <CapabilityChip label="可执行" on={Boolean(r?.canExecute)} />
        <CapabilityChip label="可重试" on={Boolean(r?.canRetry)} />
        <CapabilityChip label="可重置" on={Boolean(r?.canReset)} />
        <CapabilityChip label="执行中" on={Boolean(r?.isBusy)} />
      </div>
      {prepared && (
        <div className={styles.preparedSummary}>
          <h3 className={styles.preparedSummaryTitle}>
            本次准备（view.prepared，UI-safe 摘要）
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
              <strong>Warnings:</strong>
              <ul>
                {prepared.warnings.map((w: string) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {prepared.compiledPromptPreview && (
            <details className={styles.preparedSummaryDetails}>
              <summary>Compiled Prompt Preview（read-only）</summary>
              <pre className={styles.preparedSummaryPrompt}>
                {prepared.compiledPromptPreview}
              </pre>
              <p className={styles.preparedSummaryHint}>
                P3-A §22: 该预览为只读。无法编辑或回写至 intent。
              </p>
            </details>
          )}
        </div>
      )}
      {transientError && (
        <div className={styles.staleBox}>
          <strong>本次 RPC 错误：</strong>
          <p>{transientError}</p>
        </div>
      )}
      {isStale ? (
        <div className={styles.staleBox}>
          <strong>当前准备结果已失效，需要重新准备。</strong>
          <p>STALE 原因（canonical code，来自 view.staleReasons）：</p>
          <ul>
            {reasons.length > 0 ? (
              reasons.map((reason: string) => (
                <li key={reason} className={styles.staleReason}>
                  {reason}
                </li>
              ))
            ) : (
              <li className={styles.staleReason}>（无显式原因）</li>
            )}
          </ul>
          {Array.isArray(r?.blockers) && r.blockers.length > 0 && (
            <p className={styles.staleBlocker}>
              当前阻塞：{r.blockers.join(' / ')}
            </p>
          )}
        </div>
      ) : (
        <p className={styles.readinessHint}>
          当前状态为「{view.statusLabel || view.status || '未知'}」，
          不是 STALE。
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

function ResultTile({ view }: { view: PackagingWorkspaceView }) {
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
            Result Gallery · view.execution（仅消费 UI-safe 字段）
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
              <span>Run ID: {exec.runId || '—'}</span>
              <span>状态: {exec.status || '—'}</span>
            </div>
            <div className={styles.resultBadgeRow}>
              {showPreviousLabel && (
                <span className={styles.resultPreviousBadge}>
                  <span className={styles.resultPreviousBadgeDot} />
                  {isStale ? '上次结果 · 当前 configuration 已变化' : isFailed ? '上次结果 · 上次执行未成功' : '上次结果'}
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

          {/* P3-B4 §VIII: artifact cards. P3-B4 §IX does not call
              any preview RPC; we surface only the safe metadata
              that the frozen View Model already redacts. */}
          {Array.isArray(exec.artifacts) && exec.artifacts.length > 0 ? (
            <div className={styles.resultArtifacts}>
              {exec.artifacts.map((artifact, index) => {
                const cardKey = artifact.imageId || `artifact-${index}`;
                return (
                  <article
                    key={cardKey}
                    className={styles.resultArtifactCard}
                    data-testid="packaging-artifact-card"
                  >
                    <div className={styles.resultArtifactThumb}>
                      <span className={styles.resultArtifactThumbMuted}>
                        缩略图占位
                      </span>
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
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.resultEmpty}>
              <div className={styles.resultEmptyTitle}>该次执行未产出 artifacts。</div>
              <div>
                Provider 报告执行成功但没有图像产物。请检查
                Provider 配额 / 模型能力，必要时重新准备后再执行。
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
              <strong>本次结果已过期</strong>
              当前 configuration（参考图、锁定资产、模型）已变化，
              旧 prepared snapshot 不能再用于生成。请在「准备生成」后
              再「执行生成」以产出与当前 configuration 一致的新结果。
            </div>
          )}

          {/* P3-B4 §IX: explicit note explaining that real
              preview bytes are not loaded in B4. The production
              artifact-serving seam is owned by the runtime; the
              Web feature is RPC-only and never reaches into the
              filesystem. */}
          <p className={styles.resultNote}>
            产物缩略图由 runtime artifact-serving seam 渲染（不属于
            P3-B4 scope）。B4 仅展示 frozen View Model 已经裁剪过的
            safe metadata，不读取任何 absolute path / 文件系统 / Provider
            原始响应。
          </p>
        </>
      ) : (
        <div className={styles.resultEmpty}>
          <div className={styles.resultEmptyTitle}>尚未执行任何生成。</div>
          <div>
            完成「准备生成」后，「执行生成」会调用同一个
            <code style={{ margin: '0 4px' }}>executeGeneration</code>
            RPC；B4 不会隐式 prepare+execute。成功执行后，artifact 元数据会
            在这里出现。
          </div>
        </div>
      )}
    </section>
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
            <strong className={styles.errorCode}>{err.code}</strong>
            <span
              className={`${styles.badge} ${
                err.recoverable ? styles.badgeReady : styles.badgeFailed
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

// Sentinel: keep PACKAGING_WORKSPACE_STATUS_LABELS imported so the
// tree-shaker doesn't drop the dependency; the view's
// `statusLabel` is the canonical UI text.
void PACKAGING_WORKSPACE_STATUS_LABELS;

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
      return items.length > 0 ? `${items.length} 项` : <MutedEmpty />;
    },
  },
  {
    key: 'confirmedComponents',
    label: '已排除 / 已确认',
    render: (v) => {
      const items = Array.isArray(v?.items) ? v!.items : [];
      return items.length > 0 ? `${items.length} 项` : <MutedEmpty />;
    },
  },
];

function MutedEmpty() {
  return <em className={styles.lockedMuted}>未提供</em>;
}
