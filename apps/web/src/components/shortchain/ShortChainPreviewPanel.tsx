// ShortChainPreviewPanel — Phase 5.9 sub-component (extracted from
// ShortChainGenerationWorkspace). Pure presentational; the parent
// owns all state and the FAMILY_LABELS lookup table.
//
// This panel covers the 5 right-side sections:
//   - 编译结果 (compile result summary + prompt preview)
//   - 对题验证 (validation result, if any)
//   - 提示 (stale compile warning)
//   - 运行信息 (active run provider info)
//   - 历史记录 (history count)
//
// None of these take user input — the buttons / actions that mutate
// state live in ShortChainGenerationWorkspace's left config panel
// (deliverable / mode / intent / flow banners). Extracting this
// panel removed ~100 lines of read-only JSX from the monolith
// without changing a single line of business logic.
//
// Step 1 UI cleanup: removed 10 inline `style={{...}}` props and
// routed them through BEM modifier classes (`.sc-detail-row__value--start`,
// `.sc-detail-row__value--mono`, `.sc-panel__section--warning`,
// `.sc-panel__placeholder`, `.sc-prompt-preview-wrap`) so the
// spacing is themable and not bound to JSX literals.

import type {
  CompileShortChainGenerationResult,
  ImageGenerationRun,
  ShortChainCreativeSession,
  ShortChainDeliverableValidation
} from '@masterpiece/runtime-core/application-contracts.ts';
import type { Family } from './ShortChainTypes';

const FAMILY_LABELS: Record<Family, string> = {
  space: '空间',
  packaging: '包装',
  vi: 'VI',
  poster: '海报'
};

interface Props {
  family: Family;
  subtype: string;
  aspectRatio: string;
  editedPrompt: string;
  compiled: CompileShortChainGenerationResult | null;
  lastValidation: ShortChainDeliverableValidation | null;
  compileStale: boolean;
  activeRun: ImageGenerationRun | null;
  session: ShortChainCreativeSession | null;
}

export function ShortChainPreviewPanel({
  family, subtype, aspectRatio, editedPrompt,
  compiled, lastValidation, compileStale, activeRun, session
}: Props) {
  return (
    <div className="sc-panel">
      {/* Prompt summary */}
      <div className="sc-panel__section">
        <h3 className="sc-panel__section-title">编译结果</h3>
        {compiled ? (
          <>
            <div className="sc-detail-row">
              <span className="sc-detail-row__label">类型</span>
              <span className="sc-detail-row__value">{FAMILY_LABELS[family]} · {subtype}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-row__label">比例</span>
              <span className="sc-detail-row__value">{aspectRatio}</span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-row__label">Logo 策略</span>
              <span className="sc-detail-row__value">
                {compiled.compiledPrompt.logoUsageMode === 'reference'
                  ? '真实 Logo 参考'
                  : '预留干净区域'}
              </span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-row__label">必须包含</span>
              <span className="sc-detail-row__value sc-detail-row__value--start">
                {compiled.taskContract.mustInclude.join('；') || '仅任务要求'}
              </span>
            </div>
            <div className="sc-detail-row">
              <span className="sc-detail-row__label">必须避免</span>
              <span className="sc-detail-row__value sc-detail-row__value--start">
                {compiled.taskContract.mustAvoid.join('；') || '默认禁用项'}
              </span>
            </div>

            <details className="prompt-preview sc-prompt-preview-wrap">
              <summary>查看完整 Prompt（只读）</summary>
              <div className="sc-prompt-preview">{editedPrompt}</div>
            </details>
          </>
        ) : (
          <p className="sc-panel__placeholder">
            左侧填写任务要求后，点击「编译并生成」以查看编译结果。
          </p>
        )}
      </div>

      {/* Validation */}
      {lastValidation && (
        <div className="sc-panel__section">
          <h3 className="sc-panel__section-title">对题验证</h3>
          <div className="sc-detail-row">
            <span className="sc-detail-row__label">状态</span>
            <span className="sc-detail-row__value">{lastValidation.status}</span>
          </div>
          <div className="sc-detail-row">
            <span className="sc-detail-row__label">偏差项</span>
            <span className="sc-detail-row__value sc-detail-row__value--start">
              {lastValidation.mismatchTypes.length
                ? lastValidation.mismatchTypes.join(' · ')
                : '未发现结构性偏差'}
            </span>
          </div>
        </div>
      )}

      {/* Stale indicator */}
      {compileStale && (
        <div className="sc-panel__section sc-panel__section--warning">
          <h3 className="sc-panel__section-title sc-panel__section-title--warning">提示</h3>
          <p className="sc-panel__placeholder sc-panel__placeholder--warning">
            设置已变更，当前 Prompt 已过期。请重新编译。
          </p>
        </div>
      )}

      {/* Provider info */}
      {activeRun && (
        <div className="sc-panel__section">
          <h3 className="sc-panel__section-title">运行信息</h3>
          <div className="sc-detail-row">
            <span className="sc-detail-row__label">模型</span>
            <span className="sc-detail-row__value sc-detail-row__value--mono">
              {activeRun.modelId || '—'}
            </span>
          </div>
          <div className="sc-detail-row">
            <span className="sc-detail-row__label">耗时</span>
            <span className="sc-detail-row__value">
              {activeRun.startedAt && activeRun.completedAt
                ? Math.round((new Date(activeRun.completedAt).getTime() - new Date(activeRun.startedAt).getTime()) / 1000) + 's'
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* History */}
      {session?.history.length ? (
        <div className="sc-panel__section">
          <h3 className="sc-panel__section-title">历史记录</h3>
          <p className="sc-panel__placeholder">
            {session.history.length} 条记录
          </p>
        </div>
      ) : null}
    </div>
  );
}
