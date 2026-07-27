import type { ImageGenerationSourceBundle } from '../../../shared/types';

export function normalizeImageGenerationSources(input: unknown): ImageGenerationSourceBundle {
  const value = (input || {}) as Record<string, any>;
  if (value.sources?.preset) return value.sources as ImageGenerationSourceBundle;
  if (value.preset) return value as ImageGenerationSourceBundle;
  if (value.projectId && value.referenceAnchorRunId) {
    return {
      preset: 'integrated_anchor',
      purpose: 'production',
      projectId: value.projectId,
      visual: { projectId: value.projectId, visualRunId: value.visualRunId },
      document: value.documentRunId ? { documentRunId: value.documentRunId } : undefined,
      reference: { referenceAnchorRunId: value.referenceAnchorRunId },
      userIntent: {},
    };
  }
  throw Object.assign(new Error('生图来源参数无效。'), { code: 'SOURCE_BUNDLE_INVALID' });
}
