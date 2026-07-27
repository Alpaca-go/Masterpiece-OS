import path from 'node:path';
import fs from 'node:fs/promises';
import type { GenerationSourceContext, ImageGenerationSourceBundle, ReferenceStyleCapsule } from '../../../shared/types';
import { readJson, referenceFiles } from './loader-utils';

export function createReferenceSourceLoader(dataPath: string) {
  return {
    supports: (preset: string) => preset === 'reference_preview',
    async load(bundle: ImageGenerationSourceBundle): Promise<GenerationSourceContext> {
      const referenceAnchorRunId = bundle.reference?.referenceAnchorRunId;
      if (!referenceAnchorRunId) throw Object.assign(new Error('参考预览缺少 Reference Anchor 来源。'), { code: 'SOURCE_BUNDLE_INVALID' });
      const root = path.join(path.resolve(dataPath), 'reference-runs', referenceAnchorRunId);
      const referenceCapsule = await readJson<ReferenceStyleCapsule>(path.join(root, 'outputs', 'reference-style-capsule.json'));
      const referenceDecision = await readJson<{ status: string; decision?: string }>(path.join(root, 'runtime', 'run.json'));
      const anchorBriefMarkdown = await fs.readFile(path.join(root, 'outputs', 'Anchor-Generation-Brief.md'), 'utf8').catch(() => '');
      const references = await referenceFiles(
        path.join(root, 'input', 'reference-assets'),
        'reference_style',
        'reference_anchor_run',
        '参考风格图，仅继承视觉机制，不迁移参考品牌身份。',
      );
      return {
        preset: bundle.preset,
        purpose: bundle.purpose,
        projectId: bundle.projectId,
        referenceCapsule: referenceCapsule || undefined,
        anchorBriefMarkdown,
        referenceDecision: referenceDecision || undefined,
        references,
        warnings: [],
        sourceMetadata: { referenceAnchorRunId },
      };
    },
  };
}
