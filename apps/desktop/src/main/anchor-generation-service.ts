import type {
  CreativeDirection,
  GenerationBlueprint,
  LockedAsset,
  StyleProfile,
} from '../../../../packages/project-contracts/src/index.ts';
import {
  compileGenerationBlueprintPrompt,
} from '../../../../packages/creative-production-runtime/src/generation-blueprint.js';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { GenerationBlueprintService } from './generation-blueprint-service.ts';
import type { AnchorCandidateService } from './anchor-candidate-service.ts';
import type { ImageGenerationService } from './image-generation/service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';

function resolveBlueprintPurpose(purpose: string): GenerationBlueprint['imagePurpose'] {
  if (/店内|室内|空间|装修|门店|店面|外立面|门头/iu.test(purpose)) {
    return 'interior_scene';
  }
  if (/包装|包材|礼盒|袋装|瓶装/iu.test(purpose)) {
    return 'packaging_render';
  }
  return 'brand_poster';
}

function defaultAspectRatio(
  imagePurpose: GenerationBlueprint['imagePurpose'],
): '16:9' | '4:5' | '3:4' | '1:1' {
  if (['interior_scene', 'storefront_scene'].includes(imagePurpose)) return '16:9';
  if (imagePurpose === 'brand_poster') return '4:5';
  if (imagePurpose === 'illustration') return '3:4';
  return '1:1';
}

export function createAnchorGenerationService(
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  candidates: AnchorCandidateService,
  imageGeneration: ImageGenerationService,
  directions: CreativeDirectionService,
  blueprints: GenerationBlueprintService,
) {
  async function execute(
    projectId: string,
    candidate: Awaited<ReturnType<AnchorCandidateService['create']>>,
    style: StyleProfile,
    direction: CreativeDirection,
    locks: LockedAsset[],
    input: {
      apiProfileId?: string;
      dryRun?: boolean;
    },
  ) {
    const purpose = candidate.task.purpose;
    const aspectRatio = candidate.task.aspectRatio;
    const availableReferences = locks
      .filter((item) => item.sourceFile && ['logo', 'packaging_structure'].includes(item.type))
      .sort((left, right) => left.type === 'logo' ? -1 : right.type === 'logo' ? 1 : 0)
      .slice(0, 2)
      .map((item) => {
        const projectRelativePath = item.type === 'logo' && item.thumbnail
          ? item.thumbnail
          : `input/${item.sourceFile!.replaceAll('\\', '/')}`;
        return {
          id: item.sourceAssetId || item.id,
          role: item.type === 'logo' ? 'identity_reference' as const : 'structure_reference' as const,
          projectRelativePath,
        };
      });
    const blueprint = await blueprints.compile(projectId, {
      userRequest: purpose,
      imagePurpose: resolveBlueprintPurpose(purpose),
      materialRules: [
        ...style.materialAndTexture.materials,
        ...style.materialAndTexture.surfaceRules,
      ],
      brandAssetRules: [
        ...locks.filter((item) => item.priority === 'critical').map((item) => item.rule),
      ],
      avoid: [
        ...locks.flatMap((item) => item.forbiddenChanges),
        ...style.promptComponents.negative,
        ...style.forbiddenVariations,
      ],
    });
    const references = blueprint.imagePurpose === 'vi_application'
      ? availableReferences.filter((reference) => reference.role === 'identity_reference').slice(0, 1)
      : blueprint.imagePurpose === 'packaging_render'
        ? availableReferences.filter((reference) => reference.role === 'structure_reference').slice(0, 1)
        : [];
    const compiledPrompt = compileGenerationBlueprintPrompt(blueprint);
    const snapshot = {
      schemaVersion: '1.0',
      kind: 'anchor-candidate-prompt',
      projectId,
      candidateId: candidate.id,
      styleProfileId: style.id,
      styleProfileVersion: style.version,
      creativeDirectionId: direction.id,
      creativeDirectionVersion: direction.version,
      creativeDirectionSnapshot: direction,
      generationBlueprintId: blueprint.id,
      generationBlueprint: blueprint,
      lockedAssetIds: locks.map((item) => item.id),
      purpose,
      references,
      compiledAt: new Date().toISOString(),
    };
    const run = await imageGeneration.startCompiledCreativeTask({
      projectId,
      compiledPrompt,
      promptVersion: 'anchor-candidate-18.1.0',
      snapshot,
      sourceMap: {
        candidateId: candidate.id,
        styleProfile: `${style.id}@${style.version}`,
        creativeDirection: `${direction.id}@${direction.version}`,
        generationBlueprint: blueprint.id,
        lockedAssetIds: locks.map((item) => item.id),
        references,
      },
      references,
      event: 'ANCHOR_CANDIDATE_PROMPT_ATTACHED',
      apiProfileId: input.apiProfileId,
      size: aspectRatio === '16:9' ? '1440*810'
        : aspectRatio === '4:5' ? '1024*1280'
          : aspectRatio === '3:4' ? '1024*1365'
            : '1024*1024',
      dryRun: input.dryRun,
    });
    const generating = await candidates.beginGeneration(projectId, candidate.id, run.runId);
    if (run.status !== 'succeeded' || !run.images[0]) {
      return { candidate: generating, run };
    }
    const completed = await candidates.completeGeneration(
      projectId,
      candidate.id,
      `image-generation/${run.runId}/${run.images[0].relativePath}`,
    );
    return { candidate: completed, run };
  }

  async function generate(projectId: string, input: {
    purpose?: string;
    aspectRatio?: '16:9' | '4:5' | '3:4' | '1:1';
    apiProfileId?: string;
    dryRun?: boolean;
  }) {
    const [style, direction, locks] = await Promise.all([
      styles.getActive(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!style || style.status !== 'confirmed') {
      throw Object.assign(new Error('生成 Anchor Candidate 前必须确认 Style Profile。'), {
        code: 'STYLE_PROFILE_NOT_CONFIRMED',
      });
    }
    if (!direction || direction.status !== 'ready') {
      throw Object.assign(new Error('生成 Anchor Candidate 前必须存在 ready Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    const purpose = input.purpose?.trim() || '建立新的品牌主视觉方向';
    const imagePurpose = resolveBlueprintPurpose(purpose);
    const candidate = await candidates.create(projectId, {
      purpose,
      aspectRatio: input.aspectRatio || defaultAspectRatio(imagePurpose),
    });
    return execute(projectId, candidate, style, direction, locks, input);
  }

  async function retry(projectId: string, candidateId: string, input: {
    apiProfileId?: string;
    dryRun?: boolean;
  }) {
    const [style, direction, locks] = await Promise.all([
      styles.getActive(projectId),
      directions.getActive(projectId),
      lockedAssets.list(projectId),
    ]);
    if (!style || style.status !== 'confirmed') {
      throw Object.assign(new Error('重试 Anchor Candidate 前必须确认 Style Profile。'), {
        code: 'STYLE_PROFILE_NOT_CONFIRMED',
      });
    }
    if (!direction || direction.status !== 'ready') {
      throw Object.assign(new Error('重试 Anchor Candidate 前必须存在 ready Creative Direction。'), {
        code: 'CREATIVE_DIRECTION_NOT_READY',
      });
    }
    const candidate = await candidates.retry(projectId, candidateId);
    return execute(projectId, candidate, style, direction, locks, input);
  }

  return { generate, retry };
}

export type AnchorGenerationService = ReturnType<typeof createAnchorGenerationService>;
