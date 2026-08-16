import type { DocumentContextRun, ProjectRecord, ReferenceAnchorRun } from '@masterpiece/runtime-core/application-contracts.ts';
import { Badge } from './ui/Badge';

type StatusKind = 'visual-analysis' | 'reference-anchor' | 'document-context';

interface Props {
  status: ProjectRecord['status'] | ReferenceAnchorRun['status'] | DocumentContextRun['status'];
  kind?: StatusKind;
}

const REFERENCE_ANCHOR_EXECUTING = new Set<ReferenceAnchorRun['status']>([
  'pending', 'preparing', 'analyzing_reference', 'compiling_capsule', 'compiling_brief'
]);

const DOCUMENT_CONTEXT_EXECUTING = new Set<DocumentContextRun['status']>([
  'pending', 'parsing', 'extracting', 'repairing'
]);

function labelFor(status: string, kind: StatusKind): string {
  if (kind === 'visual-analysis') {
    const labels: Record<ProjectRecord['status'], string> = {
      draft: '待导入', ready: '可分析', running: '分析中',
      completed: '已完成', failed: '失败', cancelled: '已取消'
    };
    return labels[status as ProjectRecord['status']] || status;
  }
  if (kind === 'reference-anchor') {
    const labels: Record<ReferenceAnchorRun['status'], string> = {
      pending: '等待中', preparing: '准备中', analyzing_reference: '参考分析中',
      compiling_capsule: '胶囊编译中', compiling_brief: 'Brief 编译中',
      awaiting_decision: '待决策', completed: '已通过', rejected: '已拒绝',
      failed: '失败', cancelled: '已取消'
    };
    return labels[status as ReferenceAnchorRun['status']] || status;
  }
  // document-context
  const labels: Record<DocumentContextRun['status'], string> = {
    pending: '等待中', parsing: '解析中', extracting: '提取中',
    repairing: '修复中', awaiting_confirmation: '待确认',
    compiling: '待编译', completed: '已完成', failed: '失败', cancelled: '已取消'
  };
  return labels[status as DocumentContextRun['status']] || status;
}

type BadgeTone = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';

function toneFor(status: string, kind: StatusKind): BadgeTone {
  if (kind === 'visual-analysis') {
    const s = status as ProjectRecord['status'];
    if (s === 'completed') return 'success';
    if (s === 'failed') return 'error';
    if (s === 'running') return 'primary';
    if (s === 'ready') return 'info';
    if (s === 'cancelled') return 'default';
    return 'default'; // draft
  }
  if (kind === 'reference-anchor') {
    const s = status as ReferenceAnchorRun['status'];
    if (s === 'completed') return 'success';
    if (s === 'failed' || s === 'rejected') return 'error';
    if (s === 'awaiting_decision') return 'warning';
    if (REFERENCE_ANCHOR_EXECUTING.has(s)) return 'primary';
    if (s === 'cancelled') return 'default';
    return 'default';
  }
  // document-context
  const s = status as DocumentContextRun['status'];
  if (s === 'completed') return 'success';
  if (s === 'failed') return 'error';
  if (s === 'awaiting_confirmation' || s === 'compiling') return 'warning';
  if (DOCUMENT_CONTEXT_EXECUTING.has(s)) return 'primary';
  if (s === 'cancelled') return 'default';
  return 'default';
}

export function StatusBadgeInline({ status, kind = 'visual-analysis' }: Props) {
  return (
    <Badge tone={toneFor(status, kind)} size="sm">
      {labelFor(status, kind)}
    </Badge>
  );
}
