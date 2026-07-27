import path from 'node:path';
import type { GenerationSourceContext, ImageGenerationSourceBundle, ResolvedProjectContext } from '../../../shared/types';
import { resolveProjectRoot } from '../paths.ts';
import { readJson } from './loader-utils.ts';
import { createVisualSourceLoader } from './visual-source-loader.ts';
import { createReferenceSourceLoader } from './reference-source-loader.ts';
import { createDocumentSourceLoader } from './document-source-loader.ts';

export function createIntegratedSourceLoader(dataPath: string) {
  return {
    supports: (preset: string) => preset === 'integrated_anchor',
    async load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const projectId = bundle.visual?.projectId || bundle.projectId;
      if (!projectId || !bundle.reference?.referenceAnchorRunId) {
        throw Object.assign(new Error('完整上下文生成缺少项目或 Reference Anchor 来源。'), { code: 'SOURCE_BUNDLE_INVALID' });
      }
      const visual = await createVisualSourceLoader(dataPath).load({ ...bundle, preset: 'visual_extension' });
      const reference = await createReferenceSourceLoader(dataPath).load({ ...bundle, preset: 'reference_preview' });
      const document = bundle.document ? await createDocumentSourceLoader(dataPath).load({ ...bundle, preset: 'document_concept' }) : null;
      const projectRoot = await resolveProjectRoot(dataPath, projectId);
      const resolvedContext = await readJson<ResolvedProjectContext>(path.join(projectRoot, 'outputs', 'resolved-project-context.json'));
      return {
        preset: bundle.preset,
        purpose: bundle.purpose,
        projectId,
        visualContext: visual.visualContext,
        documentContext: document?.documentContext,
        resolvedContext: resolvedContext || undefined,
        referenceCapsule: reference.referenceCapsule,
        anchorBriefMarkdown: reference.anchorBriefMarkdown,
        referenceDecision: reference.referenceDecision,
        references: [...visual.references, ...reference.references],
        warnings: [],
        sourceMetadata: {
          ...visual.sourceMetadata,
          ...document?.sourceMetadata,
          ...reference.sourceMetadata,
        },
      };
    },
  };
}
