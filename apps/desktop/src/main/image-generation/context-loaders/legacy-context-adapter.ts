import type { ImageGenerationSourceBundle, ImageGenerationSourceBundleV3 } from '../../../shared/types';

export type AnyImageGenerationSourceBundle = ImageGenerationSourceBundle | ImageGenerationSourceBundleV3;

export function normalizeImageGenerationSources(input: ImageGenerationSourceBundleV3 | { sources: ImageGenerationSourceBundleV3 }): ImageGenerationSourceBundleV3;
export function normalizeImageGenerationSources(input: ImageGenerationSourceBundle | { sources: ImageGenerationSourceBundle }): ImageGenerationSourceBundle;
export function normalizeImageGenerationSources(input: {
  projectId: string;
  referenceAnchorRunId: string;
  visualRunId?: string;
  documentRunId?: string;
}): ImageGenerationSourceBundle;
export function normalizeImageGenerationSources(input: unknown): AnyImageGenerationSourceBundle;
export function normalizeImageGenerationSources(input: unknown): AnyImageGenerationSourceBundle {
  const value = (input || {}) as Record<string, any>;
  if (value.sources?.schemaVersion === '3.0') return value.sources as ImageGenerationSourceBundleV3;
  if (value.schemaVersion === '3.0') return value as ImageGenerationSourceBundleV3;
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

export function toLegacyImageGenerationSources(bundle: AnyImageGenerationSourceBundle): ImageGenerationSourceBundle {
  if (!('sourcePreset' in bundle)) return bundle;
  const preset = {
    visual_analysis: 'visual_extension',
    document_context: 'document_concept',
    reference_anchor: 'reference_preview',
    integrated_context: 'integrated_anchor',
  }[bundle.sourcePreset] as ImageGenerationSourceBundle['preset'];
  return {
    preset,
    purpose: bundle.purpose,
    projectId: bundle.projectId,
    visual: bundle.visual,
    document: bundle.document,
    reference: bundle.reference,
    userIntent: {
      prompt: bundle.userIntent.prompt,
      outputDescription: bundle.userIntent.prompt,
      subject: bundle.userIntent.subject,
      aspectRatio: bundle.userIntent.aspectRatio,
    },
  };
}
