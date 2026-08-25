// components/GateErrorHints.tsx
// 把生图 Gate 错误码映射成可操作的"为什么会发生 + 建议"。
// 后端逻辑不变 — 仅 UI 翻译层。

import type { ReactNode } from 'react';

interface GateError {
  code: string;
  message: string;
}

interface GateErrorHintsProps {
  errors: GateError[];
}

/** reason + action 二元组比两个独立字段更易读 */
type Hint = { reason: string; action: string };

const HINTS: Record<string, Hint> = {
  REFERENCE_IMAGE_MISSING: {
    reason: '生图 Provider 需要至少一张当前项目身份参考图（Logo / 字标 / 品牌身份资产），用来在新画面里保持品牌一致性。',
    action: '请先在项目里上传品牌 Logo 或字标作为「当前项目身份资产」，或确认 Reference Anchor 流程选的是「身份锁定」而非纯风格参考。',
  },
  REFERENCE_IMAGE_LIMIT_EXCEEDED: {
    reason: 'Provider 支持的参考图数量有上限，超出的图被自动降级到"仅分析"。',
    action: '如果生成结果缺少身份感，可考虑切换到支持更多参考图的模型，或减少参考风格图数量。',
  },
  REFERENCE_IMAGE_REQUIRED: {
    reason: '当前交付类型（如品牌海报、VI 应用）需要品牌身份参考，但项目里没有可用的身份图。',
    action: '请先在项目里上传 Logo / 字标 / 品牌识别图形，并将其标记为"身份资产"。',
  },
  GENERATION_INTENT_MISSING: {
    reason: '生图任务没有方向描述。',
    action: '请在「本次生成意图」中描述希望的画面方向（颜色、构图、氛围），或确认上游 CI / Reference 流程是否传入了方向摘要。',
  },
  PROVIDER_MODEL_UNAVAILABLE: {
    reason: '当前选中的 Provider / 模型与任务要求不一致，或 Provider 能力未加载完成。',
    action: '请在「生成模型」中选择一个可用的 Profile，或刷新页面让前端重新加载 Provider 能力。',
  },
  PROVIDER_CONFIG_MISSING: {
    reason: 'Provider 配置缺失 baseUrl 或 apiKey。',
    action: '请前往「API 设置」补全 Profile 的 baseUrl 和 apiKey。',
  },
  ASPECT_OR_SIZE_UNSUPPORTED: {
    reason: '当前画面比例不在 Provider 支持的尺寸列表里。',
    action: '请切换到 Provider 支持的画面比例（如 1:1 / 16:9 / 4:3 等）。',
  },
  TASK_PROMPT_EMPTY: {
    reason: '编译后的 Prompt 为空。',
    action: '通常是上游数据缺失，请回到 CI / Reference 流程补全必要输入。',
  },
  IMAGE_GENERATION_TASK_INVALID: {
    reason: '生图任务结构不合法。',
    action: '通常是上游数据契约被破坏，请刷新页面，或回到来源步骤重新发起任务。',
  },
  ANCHOR_GENERATION_BRIEF_MISSING: {
    reason: 'Anchor 任务缺少 Brief。',
    action: '请确认 Reference Anchor 任务已完成 Brief 编译阶段。',
  },
  OUTPUT_TYPE_UNSUPPORTED: {
    reason: '当前交付类型不在 Provider 支持范围内。',
    action: '请选择 Provider 支持的交付类型，或切换到支持该类型的 Provider。',
  },
};

function HintLine({ label, body }: { label: string; body: ReactNode }) {
  return (
    <p>
      <strong>{label}</strong>
      {body}
    </p>
  );
}

export function GateErrorHints({ errors }: GateErrorHintsProps) {
  if (errors.length === 0) return null;
  return (
    <div className="gate-error-hints">
      {errors.map((err) => {
        const hint = HINTS[err.code];
        return (
          <div key={err.code} className="gate-error-hints__item">
            <div className="gate-error-hints__head">
              <span className="gate-error-hints__code">{err.code}</span>
              <span className="gate-error-hints__msg">{err.message}</span>
            </div>
            {hint && (
              <div className="gate-error-hints__body">
                <HintLine label="为什么会发生：" body={hint.reason} />
                <HintLine label="建议：" body={hint.action} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
