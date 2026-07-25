export type ReadinessStatus = 'ready' | 'needs_review' | 'blocked';

/**
 * §12 生成准备状态 → 用户提示文案。
 * 三种状态均不得出现「可交给 GPT 进行生图」之类的成功诱导文案；
 * blocked 必须明确告知不可进入生图。
 */
export function readinessStatusUserNotice(status: ReadinessStatus): string {
  switch (status) {
    case 'ready':
      return '视觉重构执行文档已生成，可进入生图。';
    case 'needs_review':
      return '生成上下文已完成，但仍有建议人工确认项。';
    case 'blocked':
      return '生成上下文未完成，已生成阻断报告，当前不可进入生图。';
  }
}
