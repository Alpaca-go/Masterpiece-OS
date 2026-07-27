import type { GenerationSourceContext, ImageGenerationSourceBundle } from '../../../shared/types';
import { createVisualSourceLoader } from './visual-source-loader';
import { createDocumentSourceLoader } from './document-source-loader';
import { createReferenceSourceLoader } from './reference-source-loader';
import { createIntegratedSourceLoader } from './integrated-source-loader';
export { normalizeImageGenerationSources } from './legacy-context-adapter';

export interface ImageGenerationSourceLoader {
  supports(preset: string): boolean;
  load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext>;
}

export function createGenerationSourceLoader(dataPath: string) {
  const loaders: ImageGenerationSourceLoader[] = [
    createVisualSourceLoader(dataPath),
    createDocumentSourceLoader(dataPath),
    createReferenceSourceLoader(dataPath),
    createIntegratedSourceLoader(dataPath),
  ];
  return {
    async load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const loader = loaders.find((candidate) => candidate.supports(bundle.preset));
      if (!loader) throw Object.assign(new Error(`不支持的生图预设：${bundle.preset}`), { code: 'GENERATION_PRESET_UNSUPPORTED' });
      return loader.load(bundle);
    },
  };
}
