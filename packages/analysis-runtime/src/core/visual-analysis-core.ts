export const VISUAL_ANALYSIS_CORE_ID = 'visual-analysis-core@1.0.0';

export interface VisualAnalysisRuntimeAdapter {
  resolvePromptRoot(): string;
}

export {
  completeStructuredAnalysis,
} from '../analysis-completion-orchestrator.ts';
export type {
  AnalysisRepairResult,
  StructuredRepairModelRequest,
} from '../contracts.ts';
