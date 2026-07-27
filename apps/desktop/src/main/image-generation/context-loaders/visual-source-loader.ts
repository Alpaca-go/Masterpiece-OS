import path from 'node:path';
import type { GenerationSourceContext, ImageGenerationSourceBundle, ProjectVisualContext } from '../../../shared/types';
import { resolveProjectRoot } from '../paths.ts';
import { hashFile, readJson } from './loader-utils.ts';

export function createVisualSourceLoader(dataPath: string) {
  return {
    supports: (preset: string) => preset === 'visual_extension',
    async load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const projectId = bundle.visual?.projectId || bundle.projectId;
      if (!projectId) throw Object.assign(new Error('视觉延展缺少项目来源。'), { code: 'SOURCE_BUNDLE_INVALID' });
      const projectRoot = await resolveProjectRoot(dataPath, projectId);
      const visualContext = await readJson<ProjectVisualContext>(path.join(projectRoot, 'outputs', 'project-visual-context.json'));
      const project = await readJson<{ assets?: Array<{ id: string; status?: string; mimeType?: string; relativePath?: string }> }>(path.join(projectRoot, 'project.json'));
      const selected = new Set(bundle.visual?.selectedAssetIds || []);
      const assets = (project?.assets || [])
        .filter((asset) => asset.status === 'ready' && asset.relativePath && /^image\//i.test(asset.mimeType || ''))
        .filter((asset) => selected.size === 0 || selected.has(asset.id))
        .sort((a, b) => String(a.relativePath).localeCompare(String(b.relativePath)))
        .slice(0, 6);
      const references = await Promise.all(assets.map(async (asset) => {
        const localPath = path.join(projectRoot, asset.relativePath!);
        return {
          assetId: asset.id,
          role: 'current_project_identity' as const,
          localPath,
          sha256: await hashFile(localPath),
          source: 'project_visual_context' as const,
          includeReason: '当前项目视觉素材，用于延续既有视觉语言。',
        };
      }));
      return {
        preset: bundle.preset,
        purpose: bundle.purpose,
        projectId,
        visualContext: visualContext || undefined,
        references,
        warnings: [],
        sourceMetadata: { visualRunId: bundle.visual?.visualRunId },
      };
    },
  };
}
