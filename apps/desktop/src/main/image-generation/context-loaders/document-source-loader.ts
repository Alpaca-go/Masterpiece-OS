import path from 'node:path';
import type { DocumentVisualContext, GenerationSourceContext, ImageGenerationSourceBundle } from '../../../shared/types';
import { readJson } from './loader-utils.ts';

export function createDocumentSourceLoader(dataPath: string) {
  return {
    supports: (preset: string) => preset === 'document_concept',
    async load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const documentRunId = bundle.document?.documentRunId;
      if (!documentRunId) throw Object.assign(new Error('文策概念生成缺少文档任务来源。'), { code: 'SOURCE_BUNDLE_INVALID' });
      const documentContext = await readJson<DocumentVisualContext>(
        path.join(path.resolve(dataPath), 'document-runs', documentRunId, 'outputs', 'document-visual-context.json'),
      );
      return {
        preset: bundle.preset,
        purpose: bundle.purpose,
        documentContext: documentContext || undefined,
        references: [],
        warnings: [],
        sourceMetadata: { documentRunId },
      };
    },
  };
}
