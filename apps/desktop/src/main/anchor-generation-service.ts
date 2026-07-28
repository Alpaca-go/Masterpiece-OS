import type {
  CreativeDirection,
  LockedAsset,
  StyleProfile,
} from '../../../../packages/project-contracts/src/index.ts';
import type { CreativeDirectionService } from './creative-direction-service.ts';
import type { AnchorCandidateService } from './anchor-candidate-service.ts';
import type { ImageGenerationService } from './image-generation/service.ts';
import type { LockedAssetsService } from './locked-assets-service.ts';
import type { StyleProfileService } from './style-profile-service.ts';

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function list(values: string[]): string {
  return values.length ? values.map((value) => `- ${value}`).join('\n') : '- 无';
}

function resolveAnchorTask(purpose: string, direction: CreativeDirection): {
  responsibility: string;
  strategy: string;
  hardExclusions: string[];
} {
  if (/店内|室内|空间|装修|门店|店面|外立面|门头/iu.test(purpose)) {
    return {
      responsibility: [
        '只生成一张真实、完整、可进入的品牌商业空间效果图，使用单一透视视角。',
        '画面必须同时呈现地面、墙面、顶面、空间纵深、顾客动线、桌椅或服务设施，并形成可信的建筑尺度。',
        '品牌图形只能作为空间中的少量身份标识，不能成为画面主体。',
      ].join(''),
      strategy: direction.spaceStrategy || direction.designStrategy,
      hardExclusions: [
        '禁止品牌 VI 展示板、品牌规范页、物料合集、菜单排版、名片、包装平铺、海报墙合集',
        '禁止多格拼贴、正交立面板、材质样板、平面设计稿、白底 Mockup 集合',
        '禁止用 Logo 墙加几张桌椅冒充完整空间',
      ],
    };
  }
  if (/包装|包材|礼盒|袋装|瓶装/iu.test(purpose)) {
    return {
      responsibility: '只生成一个真实、完整、可生产的包装渲染结果，呈现明确结构、材质、开合关系与单一主视角。',
      strategy: direction.packagingStrategy || direction.designStrategy,
      hardExclusions: [
        '禁止包装合集、VI 展示板、多格拼贴、包装展开图与成品透视混排',
        '禁止只把旧包装换材质或替换贴图',
      ],
    };
  }
  if (/海报|主视觉|KV/iu.test(purpose)) {
    return {
      responsibility: '只生成一张单一主画面的完整品牌海报，以一个明确视觉事件建立新叙事。',
      strategy: direction.posterStrategy || direction.designStrategy,
      hardExclusions: [
        '禁止 VI 展示板、物料合集、多张海报并排、品牌规范页',
        '禁止 Logo 加产品照片的旧式模板或旧海报换内容',
      ],
    };
  }
  return {
    responsibility: '只生成一张用于验证新视觉方向的完整 Primary Anchor 主画面，不生成设计说明页。',
    strategy: direction.designStrategy,
    hardExclusions: ['禁止 VI 合集、多格拼贴、物料展示板、品牌规范页或说明板'],
  };
}

function compileAnchorPrompt(
  style: StyleProfile,
  direction: CreativeDirection,
  locks: LockedAsset[],
  purpose: string,
): string {
  const task = resolveAnchorTask(purpose, direction);
  const preserve = unique([
    ...locks.filter((item) => item.priority === 'critical').map((item) => item.rule),
    ...style.promptComponents.required,
  ]);
  const avoid = unique([
    ...locks.flatMap((item) => item.forbiddenChanges),
    ...style.promptComponents.negative,
    ...style.forbiddenVariations,
  ]);
  return [
    '# Task',
    purpose,
    '# Responsibility',
    task.responsibility,
    '# Deliverable hard gate',
    list(task.hardExclusions),
    '# Task-specific Creative Direction',
    task.strategy,
    '# Creative Direction — defines the new visual language',
    list([
      direction.projectTransformation,
      direction.designStrategy,
      direction.primaryConcept,
      ...direction.visualKeywords,
    ]),
    '# Must stop carrying over from the old visual system',
    list(direction.thingsToRemove),
    '# Style Profile — supporting rules only',
    `${style.styleEssence.summary}\n${list(style.styleEssence.keywords)}`,
    '# Preserve',
    list(preserve),
    '# Composition',
    list([
      ...style.compositionSystem.hierarchy,
      ...style.compositionSystem.focalPointRules,
      style.compositionSystem.negativeSpace,
    ]),
    '# Material and Lighting',
    list([
      ...style.materialAndTexture.materials,
      ...style.materialAndTexture.surfaceRules,
      style.lightingSystem.type,
      style.lightingSystem.contrast,
      style.lightingSystem.shadow,
    ]),
    '# Avoid',
    list([...avoid, ...direction.generationRules]),
    '# Anti-copy rules',
    '原方案只负责品牌身份。禁止复制旧 VI、旧海报换内容、旧包装换皮、旧空间重新排列。',
    '# Output Rules',
    [
      '- 只输出一张图',
      '- 输出必须直接是任务要求的最终场景或最终资产，不得输出设计过程、提案板或版式说明',
      '- 禁止水印',
      '- 禁止无关品牌、Logo、口号和签名图形',
      '- 不要输出解释文字',
    ].join('\n'),
  ].join('\n\n');
}

export function createAnchorGenerationService(
  styles: StyleProfileService,
  lockedAssets: LockedAssetsService,
  candidates: AnchorCandidateService,
  imageGeneration: ImageGenerationService,
  directions: CreativeDirectionService,
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
    const references = locks
      .filter((item) => item.sourceFile && ['logo', 'packaging_structure'].includes(item.type))
      .sort((left, right) => left.type === 'logo' ? -1 : right.type === 'logo' ? 1 : 0)
      .slice(0, 2)
      .map((item) => ({
        id: item.sourceAssetId || item.id,
        role: item.type === 'logo' ? 'identity_reference' as const : 'structure_reference' as const,
        projectRelativePath: `input/${item.sourceFile!.replaceAll('\\', '/')}`,
      }));
    const compiledPrompt = compileAnchorPrompt(style, direction, locks, purpose);
    const snapshot = {
      schemaVersion: '1.0',
      kind: 'anchor-candidate-prompt',
      projectId,
      candidateId: candidate.id,
      styleProfileId: style.id,
      styleProfileVersion: style.version,
      creativeDirectionId: direction.id,
      creativeDirectionVersion: direction.version,
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
    const candidate = await candidates.create(projectId, {
      purpose,
      aspectRatio: input.aspectRatio,
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
