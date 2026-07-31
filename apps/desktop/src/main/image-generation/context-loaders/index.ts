import type { GenerationSourceContext, ImageGenerationSourceBundle } from '../../../shared/types';
import { createVisualSourceLoader } from './visual-source-loader.ts';
import { createDocumentSourceLoader } from './document-source-loader.ts';
import { createReferenceSourceLoader } from './reference-source-loader.ts';
import { createIntegratedSourceLoader } from './integrated-source-loader.ts';
import {
  toLegacyImageGenerationSources,
  type AnyImageGenerationSourceBundle,
} from './legacy-context-adapter.ts';

export {
  normalizeImageGenerationSources,
  toLegacyImageGenerationSources,
  type AnyImageGenerationSourceBundle,
} from './legacy-context-adapter.ts';

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
    async load(bundle: AnyImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const legacyBundle = toLegacyImageGenerationSources(bundle);
      const loader = loaders.find((candidate) => candidate.supports(legacyBundle.preset));
      if (!loader) throw Object.assign(
        new Error(`不支持的生图预设：${legacyBundle.preset}`),
        { code: 'GENERATION_PRESET_UNSUPPORTED' },
      );
      return loader.load(legacyBundle);
    },
  };
}
