import { useState } from 'react';
import type {
  AnalysisProgress,
  AssetSummary,
  GenerationContextReadiness
} from '@masterpiece/runtime-core/application-contracts.ts';
import type { AnalysisMode } from '../components/AnalysisModeTabs';

/**
 * Owns the analysis-flow runtime state: assets + progress + error/runFailure
 * + analysisMode + generationReadiness. Pure state; effect that surfaces
 * transient errors as toasts stays in AppContent because it depends on
 * `settings` (owned by useAppShellState).
 */
export interface UseAnalysisProgressResult {
  assets: AssetSummary | null;
  setAssets: React.Dispatch<React.SetStateAction<AssetSummary | null>>;
  progress: AnalysisProgress | null;
  setProgress: React.Dispatch<React.SetStateAction<AnalysisProgress | null>>;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  runFailure: string;
  setRunFailure: React.Dispatch<React.SetStateAction<string>>;
  analysisMode: AnalysisMode;
  setAnalysisMode: React.Dispatch<React.SetStateAction<AnalysisMode>>;
  generationReadiness: GenerationContextReadiness | null;
  setGenerationReadiness: React.Dispatch<React.SetStateAction<GenerationContextReadiness | null>>;
}

export function useAnalysisProgress(): UseAnalysisProgressResult {
  const [assets, setAssets] = useState<AssetSummary | null>(null);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState('');
  const [runFailure, setRunFailure] = useState('');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('visual-analysis');
  const [generationReadiness, setGenerationReadiness] = useState<GenerationContextReadiness | null>(null);

  return {
    assets,
    setAssets,
    progress,
    setProgress,
    error,
    setError,
    runFailure,
    setRunFailure,
    analysisMode,
    setAnalysisMode,
    generationReadiness,
    setGenerationReadiness,
  };
}
