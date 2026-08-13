// P3-B1 — Packaging Workspace UI Shell.
//
// P3-B1 is a UI SHELL ONLY. This component:
//   - Consumes only the P3-A public barrel
//     (`@masterpiece/runtime-core`); no deep-imports.
//   - Calls `getView()` to obtain a frozen, UI-safe projection
//     of the Workspace session. The raw session / preparedResult
//     / executionResult are NEVER read here (P3-A freeze report
//     §13.2).
//   - Renders the 6 canonical sections (Generation Intent /
//     Reference Assignments / Locked Assets / Readiness & Stale
//     / Last Execution / Error Surface) in a tile grid.
//   - Does NOT wire real RPC. Prepare / Execute / Reset are
//     visible as disabled placeholders to make the contract
//     surface explicit, but they do NOT trigger any real
//     operation. Real RPC binding lands in a follow-up P3-B
//     sub-step.
//
// Architectural guard rails honoured:
//   - P3-A7 STOP-P3-A-09: no direct Provider network call.
//   - P3-A7 B: no deep-import of
//     `packages/image-generation-runtime/...`.
//   - P3-A4: no second state machine / no parallel rule table
//     in React; all capabilities come from `view.readiness.*`
//     and the top-level `view.isBusy` / `view.canEditIntent`.
//   - P3-A4 hostile-input redaction: only the redacted view
//     is read; raw error.message / path / payload never reach
//     the DOM.
//   - P3-A6: Locked Assets are read-only display only. No
//     edit / unlock / replace / save calls from this file.
//   - P3-A5.1: STALE is distinguishable from UNPREPARED via
//     `view.readiness.isStale` and `view.staleReasons`. The
//     readiness tile shows the canonical STALE-specific
//     reason list rather than a generic "not ready" hint.

import { useMemo, useState } from 'react';
import {
  PACKAGING_WORKSPACE_STATUS_LABELS,
  PACKAGING_REFERENCE_ROLES,
  type createPackagingWorkspaceService,
} from '@masterpiece/runtime-core';
import {
  createPackagingShellSession,
  type PackagingShellService,
} from './service';
import styles from './PackagingWorkspace.module.css';

type WorkspaceView = ReturnType<PackagingShellService['getView']>;

interface Props {
  onBack: () => void;
}

export function PackagingWorkspace({ onBack }: Props) {
  const session = useMemo(() => createPackagingShellSession(), []);
  const [view, setView] = useState<WorkspaceView>(() =>
    session.service.getView(session.sessionId)
  );

  function refresh() {
    setView(session.service.getView(session.sessionId));
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topNav}>
        <div className={styles.topNavLeft}>
          <p className={styles.eyebrow}>PACKAGING GENERATOR</p>
          <h1 className={styles.title}>包装生成工作台</h1>
          <p className={styles.subtitle}>
            基于已完成的视觉分析，使用 Workspace Architecture
            推导并生成包装效果图。
          </p>
        </div>
        <div className={styles.topNavRight}>
          <StatusBadge status={view.status} label={view.statusLabel} />
          <SessionIdBadge value={view.sessionId} />
          <button className={styles.backButton} onClick={onBack}>
            返回首页
          </button>
        </div>
      </header>

      <PlaceholderToolbar />

      <main className={styles.tiles}>
        <GenerationIntentTile view={view} />
        <ReferenceAssignmentsTile view={view} />
        <LockedAssetsTile view={view} />
        <ReadinessStaleTile view={view} />
        <LastExecutionTile view={view} />
        <ErrorSurfaceTile view={view} />
      </main>

      <footer className={styles.footer}>
        <small>
          P3-B1 仅为 UI Shell。所有写入操作（准备 / 执行 / 重置）在
          后续 P3-B 子步骤中通过 Shared Runtime RPC 接入，本屏不直接
          调用任何 Provider。
        </small>
        <button
          className={styles.refreshButton}
          onClick={refresh}
          title="重新读取当前 Workspace 视图"
        >
          刷新视图
        </button>
      </footer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-level UI bits
// ---------------------------------------------------------------------------

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

function PlaceholderToolbar() {
  return (
    <div className={styles.toolbar}>
      <p className={styles.toolbarHint}>
        当前为 P3-B1 UI Shell：仅渲染 View Model。Prepare /
        Execute / Reset 将在后续子步骤中接入真实 RPC。
      </p>
      <div className={styles.toolbarButtons}>
        <button className={styles.toolbarButton} disabled>
          准备生成
        </button>
        <button className={`${styles.toolbarButton} ${styles.toolbarButtonPrimary}`} disabled>
          执行生成
        </button>
        <button className={styles.toolbarButton} disabled>
          重置
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 01 — Generation Intent
// ---------------------------------------------------------------------------

function GenerationIntentTile({ view }: { view: WorkspaceView }) {
  const intent = view.intent;
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>01</span>
        <div>
          <h2 className={styles.tileTitle}>生成意图</h2>
          <p className={styles.tileSubtitle}>
            Generation Intent · view.intent
          </p>
        </div>
      </header>
      {intent ? (
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
      ) : (
        <EmptyHint message="尚未设置生成意图。" />
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 02 — Reference Assignments (consume view.references only)
// ---------------------------------------------------------------------------

function ReferenceAssignmentsTile({ view }: { view: WorkspaceView }) {
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
          {refs.map((ref, index) => (
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
          {PACKAGING_REFERENCE_ROLES.map((role) => (
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

function LockedAssetsTile({ view }: { view: WorkspaceView }) {
  const fields = view.lockedAssets?.fields ?? {};
  const allLocked = Boolean(view.lockedAssets?.allLocked);
  return (
    <section className={styles.tile}>
      <header className={styles.tileHeader}>
        <span className={styles.tileIndex}>03</span>
        <div>
          <h2 className={styles.tileTitle}>锁定资产</h2>
          <p className={styles.tileSubtitle}>
            Locked Assets · view.lockedAssets（只读，
            {allLocked ? '全部已锁定' : '存在可编辑项'}）
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
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 04 — Readiness & Stale
// ---------------------------------------------------------------------------

function ReadinessStaleTile({ view }: { view: WorkspaceView }) {
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
      {isStale ? (
        <div className={styles.staleBox}>
          <strong>当前准备结果已失效，需要重新准备。</strong>
          <p>STALE 原因（canonical code，来自 view.staleReasons）：</p>
          <ul>
            {reasons.length > 0 ? (
              reasons.map((reason) => (
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

function LastExecutionTile({ view }: { view: WorkspaceView }) {
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

function ErrorSurfaceTile({ view }: { view: WorkspaceView }) {
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
// tree-shaker doesn't drop the dependency; we deliberately read
// `view.statusLabel` from the projection rather than the labels
// table so the view remains the single source of UI text.
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

// Pinned reference: keep the type-only import tied to its source so the
// `createPackagingWorkspaceService` return-type inference stays stable
// when the underlying factory signature is updated. The actual factory
// call lives in `service.ts`; this file only consumes the resulting
// service via the `PackagingShellService` alias.
type _FactoryRef = ReturnType<typeof createPackagingWorkspaceService>;
