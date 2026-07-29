export const IMAGE_GENERATION_PIPELINE_MODES = Object.freeze({
  LEGACY: 'legacy',
  VNEXT: 'vnext',
});

export function resolveImageGenerationPipelineMode(value, fallback = IMAGE_GENERATION_PIPELINE_MODES.VNEXT) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (Object.values(IMAGE_GENERATION_PIPELINE_MODES).includes(normalized)) return normalized;
  throw Object.assign(new Error(`Unsupported image-generation pipeline mode: ${normalized}`), {
    code: 'IMAGE_GENERATION_PIPELINE_MODE_UNSUPPORTED',
  });
}
