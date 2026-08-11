import path from 'node:path';
import type { VisualAnalysisRuntimeAdapter } from '@masterpiece/analysis-runtime/core/visual-analysis-core.ts';

interface DesktopAppPaths {
  readonly isPackaged: boolean;
  getAppPath(): string;
}

export function createDesktopAnalysisRuntimeAdapter(app: DesktopAppPaths): VisualAnalysisRuntimeAdapter {
  return {
    resolvePromptRoot: () => app.isPackaged
      ? path.join(process.resourcesPath, '..', 'cli', 'prompts', 'v5')
      : path.resolve(app.getAppPath(), '..', '..', 'apps', 'cli', 'prompts', 'v5'),
  };
}
