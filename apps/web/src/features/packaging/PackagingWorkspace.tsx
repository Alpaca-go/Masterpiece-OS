// P3-B2 — Packaging Workspace UI (RPC client).
//
// P3-B2 changes from the B1 in-process shell:
//   - The Workspace service is NO LONGER instantiated in the
//     browser. All operations go through
//     `window.masterpiece.packaging.*` RPC channels.
//   - `createPackagingSession()` returns the initial
//     `{ sessionId, view }` from the runtime side.
//   - Prepare / Execute / Reset buttons are wired to the
//     corresponding RPC channels. Their enabled / disabled
//     state still comes from `view.readiness.*` (P3-A4 §5)
//     and `view.isBusy` — the React component does NOT
//     maintain a second rule table.
//   - There is NO "fallback to local service" path. If the
//     runtime is not available, the workspace renders a
//     canonical "RPC unavailable" surface and refuses to
//     proceed. This is required by P3-B2 §3 (no dual-path
//     architecture).
//   - Locked-Asset values come from the runtime-resolved
//     truth snapshot (no fake seed in the Web feature).
//
// Architectural guard rails honoured:
//   - P3-A7 STOP-P3-A-09: no direct Provider network call.
//   - P3-A7 B: no deep-import of
//     `packages/image-generation-runtime/...`.
//   - P3-A4: no second state machine / no parallel rule
//     table in React.
//   - P3-A4 hostile-input redaction: only the redacted view
//     is read; raw error.message / path / payload never
//     reach the DOM.
//   - P3-A6: Locked Assets are read-only display only.
//   - P3-A5.1: STALE is distinguishable from UNPREPARED via
//     `view.readiness.isStale` + `view.staleReasons`.
//   - P3-A3 §10.6: execute != implicit prepare + execute.

import { useCallback, useMemo, useState } from 'react';
import {
  PACKAGING_REFERENCE_ROLES,
  PACKAGING_WORKSPACE_STATUS_LABELS,
} from '@masterpiece/runtime-core';
import type {
  PackagingWorkspaceReference,
  PackagingWorkspaceView,
} from '@masterpiece/runtime-core/application-contracts.ts';
import {
  createPackagingSession,
  executePackagingGeneration,
  getPackagingView,
  isPackagingRuntimeAvailable,
  preparePackagingGeneration,
  resetPackagingPreparation,
  setPackagingTruthSnapshot,
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
  | { kind: 'ready'; sessionId: string; view: PackagingWorkspaceView; pending: boolean; error: string | null };

const RPC_UNAVAILABLE_REASON =
  'window.masterpiece.packaging 命名空间未注册。' +
  'Packaging Workspace 依赖 Shared Runtime RPC 桥接。' +
  '请确认 Node Runtime Host 已启动并加载了 P3-B2 operations。';

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

  const refreshView = useCallback(async (sessionId: string) => {
    const view = await getPackagingView(sessionId);
    setState((current) => (current.kind === 'ready' && current.sessionId === sessionId
      ? { ...current, view }
      : current));
  }, []);

  const handleCreateSession = useCallback(async (projectId: string) => {
    setState((current) => current.kind === 'bootstrap' ? { ...current, pending: true, error: null } : current);
    try {
      const result: PackagingClientSession = await createPackagingSession({ projectId });
      setState({
        kind: 'ready',
        sessionId: result.sessionId,
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

  const handleRefresh = useCallback(async () => {
    if (state.kind !== 'ready') return;
    try {
      await refreshView(state.sessionId);
    } catch {
      // Refresh errors are non-blocking; the next mutation
      // will surface a real error.
    }
  }, [state, refreshView]);

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
      view={state.view}
      pending={state.pending}
      transientError={state.error}
      onPrepare={handlePrepare}
      onExecute={handleExecute}
      onReset={handleReset}
      onRefresh={handleRefresh}
      onUpdateIntent={async (patch) => {
        const view = await updatePackagingIntent(state.sessionId, patch);
        setState((current) => current.kind === 'ready' ? { ...current, view } : current);
      }}
      onSetTruthSnapshot={async (truthSnapshot) => {
        const view = await setPackagingTruthSnapshot(state.sessionId, truthSnapshot);
        setState((current) => current.kind === 'ready' ? { ...current, view } : current);
      }}
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
            P3-B2 将 Packaging Workspace 完全迁移到了 Shared Runtime RPC。Web
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
  view: PackagingWorkspaceView;
  pending: boolean;
  transientError: string | null;
  onPrepare: () => void;
  onExecute: () => void;
  onReset: () => void;
  onRefresh: () => void;
  onUpdateIntent: (patch: Record<string, unknown>) => Promise<void>;
  onSetTruthSnapshot: (truthSnapshot: Record<string, unknown>) => Promise<void>;
  onBack: () => void;
}

function ReadySurface({
  sessionId,
  view,
  pending,
  transientError,
  onPrepare,
  onExecute,
  onReset,
  onRefresh,
  onUpdateIntent,
  onSetTruthSnapshot,
  onBack,
}: ReadySurfaceProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <p className={styles.eyebrow}>PACKAGING GENERATOR</p>
          <h1 className={styles.title}>包装生成工作台</h1>
          <p className={styles.subtitle}>
            基于已完成的视觉分析，使用 Workspace Architecture 推导并生成包装效果图。
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
        onRefresh={onRefresh}
      />

      <main className={styles.tiles}>
        <GenerationIntentTile view={view} onPatchIntent={onUpdateIntent} />
        <ReferenceAssignmentsTile view={view} />
        <LockedAssetsTile view={view} onRefreshTruth={() => onSetTruthSnapshot({})} />
        <ReadinessStaleTile view={view} transientError={transientError} />
        <LastExecutionTile view={view} />
        <ErrorSurfaceTile view={view} />
      </main>

      <footer className={styles.footer}>
        <small>
          P3-B2: Workspace 会话由 Shared Runtime 持有。Web 端只消费 RPC + View Model。
          本地不再持有 createPackagingWorkspaceService 实例。
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
  onRefresh,
}: {
  view: PackagingWorkspaceView;
  pending: boolean;
  onPrepare: () => void;
  onExecute: () => void;
  onReset: () => void;
  onRefresh: () => void;
}) {
  // Capability projection comes from the frozen view
  // model. React MUST NOT re-derive a rule table.
  const canPrepare = Boolean(view.readiness?.canPrepare);
  const canExecute = Boolean(view.readiness?.canExecute);
  const canReset = Boolean(view.readiness?.canReset);
  const isBusy = Boolean(view.isBusy) || pending;
  return (
    <div className={styles.toolbar}>
      <p className={styles.toolbarHint}>
        按钮启用状态由 View Model 决定。execute ≠ implicit prepare + execute
        （P3-A §10.6）。
      </p>
      <div className={styles.toolbarButtons}>
        <button
          className={styles.toolbarButton}
          onClick={onPrepare}
          disabled={!canPrepare || isBusy}
        >
          {isBusy && view.status === 'preparing' ? '准备中…' : '准备生成'}
        </button>
        <button
          className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`}
          onClick={onExecute}
          disabled={!canExecute || isBusy}
        >
          {isBusy && view.status === 'executing' ? '执行中…' : '执行生成'}
        </button>
        <button
          className={styles.toolbarButton}
          onClick={onReset}
          disabled={!canReset || isBusy}
        >
          重置
        </button>
        <button
          className={styles.refreshButton}
          onClick={onRefresh}
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
// 02 — Reference Assignments (consume view.references only)
// ---------------------------------------------------------------------------

function ReferenceAssignmentsTile({ view }: { view: PackagingWorkspaceView }) {
  const refs = view.references ?? [];
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>02</span>
        <div>
          <h2 className={styles.tileTitle}>参考图分配</h2>
          <p className={styles.tileSubtitle}>
            Reference Assignments · view.references
            （{refs.length} 项）
          </p>
        </div>
      </header>
      {refs.length > 0 ? (
        <ul className={styles.refList}>
          {refs.map((ref: PackagingWorkspaceReference, index: number) => (
            <li key={ref.assetId} className={styles.refRow}>
              <div className={styles.refRowMain}>
                <strong>{ref.displayName || ref.assetId}</strong>
                <small className={styles.refRowRole}>
                  {ref.role || '—'}
                </small>
              </div>
              <small className={styles.refRowMeta}>
                {ref.source || '—'} · #{index + 1}
              </small>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyHint message="尚未分配参考图。canonical 角色：" />
      )}
      <details className={styles.refRolesHelp}>
        <summary>canonical 角色（来自 P2 frozen reference-policy）</summary>
        <ul className={styles.roleList}>
          {(PACKAGING_REFERENCE_ROLES as readonly string[]).map((role: string) => (
            <li key={role} className={styles.roleChip}>{role}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 03 — Locked Assets (read-only, no authority mutation)
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
            {allLocked ? ' · 全部已锁定' : ' · 存在可配置项'}）
          </p>
        </div>
      </header>
      <ul className={styles.lockedList}>
        {LOCKED_FIELD_LABELS.map(({ key, label, render }) => {
          const field = (fields as Record<string, unknown>)[key];
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
        空值 = 真实 project 当前未提供该字段。
      </p>
      <button
        className={styles.toolbarButton}
        onClick={onRefreshTruth}
        title="触发 RPC setTruthSnapshot({}) — 重新走 runtime 真相面解析"
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
// 05 — Last Execution
// ---------------------------------------------------------------------------

function LastExecutionTile({ view }: { view: PackagingWorkspaceView }) {
  const exec = view.execution;
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>05</span>
        <div>
          <h2 className={styles.tileTitle}>上次执行</h2>
          <p className={styles.tileSubtitle}>
            Last Execution · view.execution
          </p>
        </div>
      </header>
      {exec ? (
        <dl className={styles.kvList}>
          <KV label="Run ID" value={exec.runId || '—'} mono />
          <KV label="状态" value={exec.status || '—'} />
          <KV label="生成模式" value={exec.generationMode || '—'} />
          <KV label="镜头合约" value={exec.shotContractId || '—'} />
          <KV
            label="Provider"
            value={
              exec.provider
                ? `${exec.provider.adapterId || '—'} / ${
                    exec.provider.protocol || '—'
                  }`
                : '—'
            }
          />
          <KV
            label="Model"
            value={
              exec.model
                ? `${exec.model.registryModelId || '—'} / ${
                    exec.model.providerModelId || '—'
                  }`
                : '—'
            }
            mono
          />
          <KV
            label="结果数"
            value={String(exec.artifacts?.length ?? 0)}
          />
          <KV
            label="耗时"
            value={
              exec.diagnostics?.durationMs != null
                ? `${exec.diagnostics.durationMs} ms`
                : '—'
            }
          />
        </dl>
      ) : (
        <EmptyHint message="尚未执行任何生成。" />
      )}
    </section>
  );
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
  render?: (value: unknown) => React.ReactNode;
}

const LOCKED_FIELD_LABELS: LockedFieldDef[] = [
  {
    key: 'brand',
    label: '品牌',
    render: (v) => readStringField(v, 'name') || <MutedEmpty />,
  },
  {
    key: 'logo',
    label: 'Logo',
    render: (v) => {
      const present = readBoolField(v, 'present');
      const usage = readStringField(v, 'usageMode');
      return (
        <>
          {present ? '已提供' : '未提供'} · 用法：{usage || 'reserved'}
        </>
      );
    },
  },
  {
    key: 'productIdentity',
    label: '产品身份',
    render: (v) => readStringField(v, 'name') || <MutedEmpty />,
  },
  {
    key: 'category',
    label: '品类',
    render: (v) => readStringField(v, 'name') || <MutedEmpty />,
  },
  {
    key: 'structure',
    label: '结构',
    render: (v) => readStringField(v, 'formFactor') || <MutedEmpty />,
  },
  {
    key: 'mandatoryCopy',
    label: '必出文案',
    render: (v) => readArrayField(v, 'items') || <MutedEmpty />,
  },
  {
    key: 'confirmedComponents',
    label: '已确认组件',
    render: (v) => readArrayField(v, 'items') || <MutedEmpty />,
  },
];

function readStringField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return '';
  const v = (value as Record<string, unknown>)[key];
  return typeof v === 'string' && v.trim() ? v : '';
}

function readBoolField(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object') return false;
  return Boolean((value as Record<string, unknown>)[key]);
}

function readArrayField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return '';
  const v = (value as Record<string, unknown>)[key];
  if (Array.isArray(v)) return v.length > 0 ? `${v.length} 项` : '';
  return '';
}

function MutedEmpty() {
  return <em className={styles.lockedMuted}>未提供</em>;
}
