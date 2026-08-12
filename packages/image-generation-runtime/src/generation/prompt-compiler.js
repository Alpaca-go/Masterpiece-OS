import crypto from 'node:crypto';
import { assertShortChainProjectPromptAsset } from './project-prompt-asset.js';
import {
  assertProjectSpecificGenerationContract,
  compileProjectSpecificGenerationContract,
} from '../../../creative-production-runtime/src/project-generation-contract.js';
import { buildPackagingTranslation } from '../../../creative-production-runtime/src/packaging-translation.js';
import { compilePackagingPromptContract } from '../prompt-contracts/packaging-contract.js';
import { applyUserConfirmedVisualDecision } from './user-confirmed-visual-decision.js';

export const SHORT_CHAIN_PROMPT_COMPILER_ID = 'short-chain-prompt-compiler';
export const SHORT_CHAIN_PROMPT_COMPILER_VERSION = 'short-chain-prompt-compiler@4.3.0';

const REQUIRED_BLOCK_IDS = Object.freeze([
  'deliverable_identity',
  'task_contract',
  'project_identity',
  'upgrade_thesis',
  'tone_boundary',
  'professional_contract',
  'brand_translation',
  'color_system',
  'material_system',
  'lighting_system',
  'camera_composition',
  'logo_text_and_negatives',
]);

function cleanList(...values) {
  const result = [];
  const seen = new Set();
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'string') return;
    const clean = value.trim().replace(/\s+/gu, ' ');
    const key = clean.toLocaleLowerCase();
    if (clean && !seen.has(key)) {
      seen.add(key);
      result.push(clean);
    }
  };
  values.forEach(visit);
  return result;
}

function comparable(value) {
  return String(value).toLocaleLowerCase().replace(/[\s.,，。:：;；\-_/()[\]{}]+/gu, '');
}

function exactConflicts(includes, avoids) {
  const avoided = new Map(avoids.map((item) => [comparable(item), item]));
  return includes
    .filter((item) => avoided.has(comparable(item)))
    .map((item) => ({ value: item, conflictingValue: avoided.get(comparable(item)) }));
}

function containsAny(values, patterns) {
  return cleanList(values).some((value) => patterns.some((pattern) => pattern.test(value)));
}

function packetExecutionSource(packet, family) {
  if (!packet) return null;
  if (packet.schemaVersion !== '1.0') {
    throw new Error('Visual Decision Packet schema must be 1.0');
  }
  if (packet.validation?.hardFactStatus !== 'pass') {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: hard facts ${packet.validation?.hardFactStatus || 'unknown'}`),
      { code: 'VISUAL_DECISION_PACKET_INSUFFICIENT' },
    );
  }
  if (packet.validation?.executionDataStatus !== 'ready') {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${cleanList(packet.validation?.missingExecutionFields).join(', ') || 'execution data'}`),
      { code: 'VISUAL_DECISION_PACKET_INSUFFICIENT' },
    );
  }
  if (!['space', 'packaging'].includes(family)) {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${family} media translation is interface-only`),
      { code: 'VISUAL_DECISION_PACKET_INSUFFICIENT' },
    );
  }
  const spatial = packet.mediaTranslations?.spatial || {};
  if (family === 'packaging') {
    return {
      projectFacts: {
        brandName: packet.projectFacts?.brandName?.value,
        industry: packet.projectFacts?.industry?.value,
        brandRole: packet.projectFacts?.brandRole?.value,
      },
      projectFactStatus: {
        industry: packet.projectFacts?.industry?.status,
        brandRole: packet.projectFacts?.brandRole?.status,
      },
      lockedAssets: packet.lockedAssets || [],
      diagnosis: packet.diagnosis || {},
      creativeDecision: packet.creativeDecision || {},
      abstractions: packet.abstractions || [],
      packaging: packet.mediaTranslations?.packaging || {},
      fingerprint: packet.provenance?.sourceFingerprint,
    };
  }
  const missingStructuredFields = [
    !cleanList(spatial.sceneProgram).length && 'mediaTranslations.spatial.sceneProgram',
    !cleanList(spatial.structureLanguage).length && 'mediaTranslations.spatial.structureLanguage',
    !(Array.isArray(spatial.materialLanguage) && spatial.materialLanguage.length)
      && 'mediaTranslations.spatial.materialLanguage',
    !cleanList(spatial.lightingLanguage?.source).length && 'mediaTranslations.spatial.lightingLanguage',
    // Synchronised with packages/image-generation-runtime/src/gates/prompt-preflight-gate.js
    // (BRAND_ROLE_NOT_SPATIALLY_MANIFESTED, FLAGSHIP_PROGRAM_TOO_GENERIC,
    // POSITIVE_SPATIAL_MECHANISM_MISSING). The desktop preflight gate
    // requires functionalNetwork.length >= 3, brandRoleManifestation.length
    // >= 1, mustBeVisible.length >= 1 for the prompt to ship. Catching the
    // gap at compile time (here) gives a clearer error than the preflight
    // gate's `PROMPT_PREFLIGHT_BLOCKED` aggregate message.
    !cleanList(spatial.functionalNetwork).length && 'mediaTranslations.spatial.functionalNetwork',
    !cleanList(spatial.brandRoleManifestation).length && 'mediaTranslations.spatial.brandRoleManifestation',
    !cleanList(spatial.mustBeVisible).length && 'mediaTranslations.spatial.mustBeVisible',
  ].filter(Boolean);
  if (missingStructuredFields.length) {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${missingStructuredFields.join(', ')}`),
      { code: 'VISUAL_DECISION_PACKET_INSUFFICIENT', issues: missingStructuredFields },
    );
  }
  return {
    projectFacts: {
      brandName: packet.projectFacts?.brandName?.value,
      industry: packet.projectFacts?.industry?.value,
      brandRole: packet.projectFacts?.brandRole?.value,
    },
    projectFactStatus: {
      industry: packet.projectFacts?.industry?.status,
      brandRole: packet.projectFacts?.brandRole?.status,
    },
    lockedAssets: packet.lockedAssets || [],
    diagnosis: packet.diagnosis || {},
    creativeDecision: packet.creativeDecision || {},
    abstractions: packet.abstractions || [],
    spatial: packet.mediaTranslations?.spatial || {},
    colorBehavior: packet.colorSystem || {},
    materialBehavior: packet.materialSystem || [],
    lightingBehavior: packet.lightingSystem || {},
    fingerprint: packet.provenance?.sourceFingerprint,
  };
}

function packetTransformationItems(abstractions, spatial) {
  return cleanList(
    spatial?.spatialConcept ? `空间核心：${spatial.spatialConcept}` : '',
    abstractions?.flatMap((item) => [
    item?.sourceAsset
      ? `从“${item.sourceAsset}”保留语义：${cleanList(item.semanticMeaning).join('、')}`
      : '',
    item?.sourceAsset
      ? `提取形式与节奏：${cleanList(item.formalProperties, item.rhythmProperties).join('、')}`
      : '',
    cleanList(item?.materialPotential).length
      ? `材料转译潜力：${cleanList(item.materialPotential).join('、')}`
      : '',
    cleanList(item?.lightingPotential).length
      ? `光线转译潜力：${cleanList(item.lightingPotential).join('、')}`
      : '',
    cleanList(item?.forbiddenLiteralUse).length
      ? [
        `Strict non-literal prohibition: ${cleanList(item.forbiddenLiteralUse).join('、')}.`,
        spatial
          ? 'No large-scale wall, partition, mural, furniture silhouette, or repeated surface may visually resolve into those legacy source objects.'
          : 'No dominant object or repeated surface may visually resolve into those legacy source objects.',
      ].join(' ')
      : '',
    ]),
    spatial?.structureLanguage?.map((item) => `空间结构转译：${item}`),
  );
}

function assertPacketConflicts({ packetSource, taskContract, negativeConstraints, logoUsageMode }) {
  const conflicts = [];
  const preserves = cleanList(
    packetSource.creativeDecision?.preserveCore,
    packetSource.lockedAssets?.map((item) => item.value),
  );
  conflicts.push(...exactConflicts(preserves, negativeConstraints)
    .map((item) => `preserve "${item.value}" conflicts with negative "${item.conflictingValue}"`));

  const requiresText = containsAny(
    [taskContract.currentInstruction, taskContract.mustInclude],
    [/文字|文案|标题|slogan|copy|headline|wordmark/iu],
  );
  if (requiresText && logoUsageMode !== 'reference') {
    conflicts.push('task requires text while logo/text mode forbids rendered text');
  }

  const logoPreservationVerbs = /变形|拆解|修改|重绘|替换|仿造|改变|distort|deform|redraw|replace|alter/iu;
  const forbidsLogo = cleanList(negativeConstraints).some((item) =>
    !logoPreservationVerbs.test(item)
    && /禁止(?:任何|全部|所有|画面|场景|出现|呈现|展示|使用|添加|\s)*logo|不要(?:任何|\s)*logo|移除(?:任何|\s)*logo|去除(?:任何|\s)*logo|no\s+logo|without\s+logo/iu.test(item));
  if (logoUsageMode === 'reference' && forbidsLogo) {
    conflicts.push('confirmed Logo reference conflicts with a no-Logo rule');
  }

  const requestsHighSaturation = containsAny(
    [taskContract.currentInstruction, taskContract.mustInclude],
    [/高饱和|亮紫|霓虹|high[-\s]?saturation|neon/iu],
  );
  const forbidsHighSaturation = containsAny(
    packetSource.colorBehavior?.forbidden,
    [/高饱和|亮紫|霓虹|high[-\s]?saturation|neon/iu],
  );
  if (requestsHighSaturation && forbidsHighSaturation) {
    conflicts.push('task requests high-saturation/neon color while the project color system forbids it');
  }

  if (cleanList(packetSource.creativeDecision?.upgradeFrom)
    .some((item) => cleanList(packetSource.creativeDecision?.upgradeTo).includes(item))) {
    conflicts.push('the same direction appears in upgradeFrom and upgradeTo');
  }
  if (conflicts.length) {
    throw Object.assign(new Error(`PROMPT_CONFLICT: ${conflicts.join('; ')}`), {
      code: 'PROMPT_CONFLICT',
      conflicts,
    });
  }
}

function riskAppliesToTask(risk, taskContract) {
  if (risk?.status !== 'confirmed') return false;
  const families = cleanList(risk?.appliesTo?.taskFamilies);
  const subtypes = cleanList(risk?.appliesTo?.subtypes);
  const scenes = cleanList(risk?.appliesTo?.scenes);
  if (!subtypes.length || !subtypes.includes(taskContract.subtype)) return false;
  if (families.length && !families.includes(taskContract.deliverableFamily)) return false;
  if (scenes.length && (!taskContract.scene || !scenes.includes(taskContract.scene))) return false;
  return true;
}

function applicableConfirmedRisks(packetSource, taskContract) {
  if (packetSource?.projectFactStatus?.industry !== 'confirmed'
    || packetSource?.projectFactStatus?.brandRole !== 'confirmed') {
    return [];
  }
  return (packetSource?.diagnosis?.brandMisreadRisks || [])
    .filter((risk) => riskAppliesToTask(risk, taskContract))
    .map((risk) => risk.description || risk.target);
}

function renderBlock(block) {
  return `【${block.title}】\n${block.items.map((item) => `- ${item}`).join('\n')}`;
}

function formatColorUsage(group, label) {
  return cleanList(group?.map((item) => {
    const ratio = Number.isFinite(item?.ratio) ? `，建议占比 ${item.ratio}%` : '';
    return `${label}：${item?.name || '未命名色'}，用途为 ${item?.role || '按品牌层级使用'}${ratio}`;
  }));
}

function transformationItems(transformations) {
  return cleanList(transformations?.flatMap((item) => [
    item?.sourceAsset ? `从“${item.sourceAsset}”提取抽象属性：${cleanList(item.abstractProperties).join('、')}` : '',
    cleanList(item?.newExpression).length
      ? `将其转译为：${cleanList(item.newExpression).join('；')}`
      : '',
    cleanList(item?.forbiddenLiteralUse).length
      ? `不得照搬：${cleanList(item.forbiddenLiteralUse).join('；')}`
      : '',
  ]));
}

function toneItems(boundaries, fallback) {
  const values = cleanList(boundaries?.map((item) => {
    const avoids = cleanList(item?.avoid);
    return item?.target
      ? `目标气质：${item.target}${avoids.length ? `；避免：${avoids.join('、')}` : ''}`
      : '';
  }));
  return values.length ? values : cleanList(fallback, '保持品牌气质清晰、克制且一致。');
}

function approvedProhibitionsForDeliverable(items, deliverableFamily) {
  const current = deliverableFamily === 'space'
    ? /空间|建筑|动线|space|interior|architecture/iu
    : /包装|盒|袋|开盒|packag|box|bag/iu;
  const other = deliverableFamily === 'space'
    ? /包装|盒|袋|开盒|名片|标签|海报|排版|slogan|12\s*列|packag|box|bag|poster|typograph/iu
    : /空间|建筑|动线|space|interior|architecture/iu;
  return cleanList(items).filter((item) => current.test(item) || !other.test(item));
}

function packetToneItems(creativeDecision) {
  const explicit = cleanList(creativeDecision?.toneBoundaries?.map((item) => {
    const avoids = cleanList(item?.avoid);
    return item?.target
      ? `目标气质：${item.target}${avoids.length ? `；避免：${avoids.join('、')}` : ''}`
      : '';
  }));
  if (explicit.length) return explicit;

  const targets = cleanList(creativeDecision?.targetWorldview);
  const avoids = cleanList(
    creativeDecision?.strategicNegatives,
    creativeDecision?.upgradeFrom,
  );
  return targets.map((target) =>
    `目标气质：${target}${avoids.length ? `；避免：${avoids.join('、')}` : ''}`);
}

function materialItems(materials, fallback) {
  const values = cleanList(materials?.map((item) => {
    const behavior = cleanList(item?.behavior).join('、');
    const forbidden = cleanList(item?.forbidden).join('、');
    return `${item?.material || '材料'}：${behavior || '呈现真实物理属性'}；品牌作用：${item?.brandRole || '承载品牌气质'}${forbidden ? `；避免：${forbidden}` : ''}`;
  }));
  return values.length ? values : cleanList(fallback, '材料、接缝、厚度与表面响应必须真实可建造。');
}

function createBlock(id, title, items, sources, fallback, strict = false) {
  const normalized = cleanList(items);
  if (strict && !normalized.length) {
    throw Object.assign(new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${id}`), {
      code: 'VISUAL_DECISION_PACKET_INSUFFICIENT',
      blockId: id,
    });
  }
  return {
    id,
    title,
    items: normalized.length ? normalized : [fallback],
    sources: cleanList(sources),
  };
}

function labeledJoined(label, values) {
  const items = cleanList(values);
  return items.length ? `${label}: ${items.join('；')}` : '';
}

export function compileShortChainPrompt({
  projectContext,
  taskContract,
  route,
  adapter,
  projectPromptAsset,
  approvedCreativeDecision,
  userConfirmedVisualDecision,
}) {
  if (projectContext.schemaVersion !== '2.0') {
    throw new Error('vNext prompt compiler requires Project Visual Context 2.0');
  }
  if (projectContext.projectId !== taskContract.projectId) {
    throw new Error('Task Contract and Project Visual Context belong to different projects');
  }

  const promptAsset = projectPromptAsset
    ? assertShortChainProjectPromptAsset(
      projectPromptAsset,
      taskContract.projectId,
      taskContract.deliverableFamily,
    )
    : null;
  const templates = route.templates;
  const templateSections = (key) => cleanList(
    templates.map((template) => template.sections?.[key] ?? []),
  );
  const source = projectContext.promptSourceObject;
  const confirmedDecision = applyUserConfirmedVisualDecision(
    projectContext.visualDecisionPacket,
    userConfirmedVisualDecision,
    taskContract.projectId,
    taskContract.deliverableFamily,
  );
  const packet = confirmedDecision.packet;
  if (packet && packet.projectId !== taskContract.projectId) {
    throw new Error('Visual Decision Packet and Task Contract belong to different projects');
  }
  const packetSource = packetExecutionSource(packet, taskContract.deliverableFamily);
  const strictPacket = Boolean(packetSource);
  const conflicts = exactConflicts(taskContract.mustInclude, taskContract.mustAvoid);
  if (conflicts.length) {
    throw new Error(`Task Contract contains the same requirement in mustInclude and mustAvoid: ${conflicts.map((item) => item.value).join(', ')}`);
  }

  const negativeConstraints = cleanList(
    taskContract.mustAvoid,
    packetSource ? applicableConfirmedRisks(packetSource, taskContract) : [],
    packetSource ? [] : source?.negativeRules?.project,
    packetSource ? [] : projectContext.styleBoundaries.mustAvoid,
    promptAsset?.negativeConstraints,
    packetSource ? ['随机中文', '错误英文品牌名', '自行生成 slogan', '模糊文字'] : source?.negativeRules?.model,
    templateSections('negative'),
  );
  const colorItems = packetSource
    ? cleanList(
      formatColorUsage(packetSource.colorBehavior?.primary, '主色'),
      formatColorUsage(packetSource.colorBehavior?.secondary, '辅助色'),
      formatColorUsage(packetSource.colorBehavior?.accent, '点缀色'),
      packetSource.colorBehavior?.forbidden?.map((item) => `色彩禁用：${item}`),
      packetSource.lockedAssets
        ?.filter((item) => item.type === 'color')
        .map((item) => `已确认品牌色：${item.value}`),
    )
    : cleanList(
      formatColorUsage(source?.renderLanguage?.colorBehavior?.primary, '主色'),
      formatColorUsage(source?.renderLanguage?.colorBehavior?.secondary, '辅助色'),
      formatColorUsage(source?.renderLanguage?.colorBehavior?.accent, '点缀色'),
      source?.renderLanguage?.colorBehavior?.forbidden?.map((item) => `色彩禁用：${item}`),
      projectContext.lockedAssets.confirmedColors.map((item) => `已确认品牌色：${item}`),
      projectContext.visualIdentity.colorBehavior,
    );
  const lighting = packetSource?.lightingBehavior || source?.renderLanguage?.lightingBehavior;
  const logoAssetIds = cleanList(
    packetSource?.lockedAssets?.filter((item) => item.type === 'logo').map((item) => item.assetId),
    packetSource ? [] : source?.lockedAssets?.logoAssetIds,
    projectContext.lockedAssets.logoAssetIds,
  );
  const logoUsageMode = taskContract.logoUsageMode || source?.lockedAssets?.logoUsageMode || 'blank_area';
  if (logoUsageMode === 'reference' && !logoAssetIds.length) {
    throw new Error('Logo reference mode requires a confirmed logo asset');
  }
  if (packetSource) {
    assertPacketConflicts({
      packetSource,
      taskContract,
      negativeConstraints,
      logoUsageMode,
    });
  }
  const projectGenerationContract = packet
    ? assertProjectSpecificGenerationContract(compileProjectSpecificGenerationContract({
      visualDecisionPacket: packet,
      deliverable: taskContract.deliverableFamily,
      approvedCreativeDecision: confirmedDecision.approvedCreativeDecision
        || approvedCreativeDecision
        || projectContext.approvedCreativeDecision,
      approvedCreativeDecisionSourcePath: confirmedDecision.approvedCreativeDecision
        ? `user_confirmed_visual_decision:${confirmedDecision.confirmation.id}`
        : approvedCreativeDecision || projectContext.approvedCreativeDecision
          ? 'outputs/creative_decision.json'
        : '',
    }))
    : null;
  const projectDecisions = projectGenerationContract?.projectSpecificDecisions || {};

  if (packet && taskContract.deliverableFamily === 'packaging') {
    const packagingTranslation = buildPackagingTranslation({
      visualDecisionPacket: packet,
    });
    const packagingContract = compilePackagingPromptContract({
      projectContract: projectGenerationContract,
      packagingTranslation,
      taskContract,
      logoUsageMode,
      templateSections,
    });
    const blocks = packagingContract.blocks;
    const finalPrompt = adapter.orderSections(blocks.map(renderBlock)).join('\n\n');
    const traceValue = {
      projectContextFingerprint: projectContext.provenance.sourceFingerprint,
      promptSourceFingerprint: packetSource.fingerprint,
      projectGenerationContractFingerprint: projectGenerationContract.provenance.sourceFingerprint,
      packagingContractVersion: packagingContract.version,
      taskContract,
      route: {
        familyTemplateId: route.familyTemplateId,
        subtypeTemplateId: route.subtypeTemplateId,
        shotTemplateId: route.shotTemplateId,
        templateVersions: route.templateVersions,
      },
      blocks,
      finalPrompt,
    };
    return {
      schemaVersion: '1.0',
      taskContract,
      projectContextVersion: projectContext.version,
      route: {
        familyTemplateId: route.familyTemplateId,
        subtypeTemplateId: route.subtypeTemplateId,
        shotTemplateId: route.shotTemplateId,
        templateVersions: route.templateVersions,
      },
      blocks,
      sourceMap: packagingContract.sourceMap,
      projectGenerationContract,
      packagingTranslation,
      effectiveVisualDecisionPacket: packet,
      userConfirmedVisualDecision: confirmedDecision.confirmation,
      packagingPromptContractVersion: packagingContract.version,
      completeness: {
        complete: true,
        requiredBlockIds: blocks.map((block) => block.id),
        missingBlockIds: [],
        conflictCount: conflicts.length,
        coverage: {
          hardFacts: 1,
          upgradeThesis: 1,
          brandTranslation: 1,
          toneBoundaries: 1,
          colorMaterialLighting: 1,
          taskContract: 1,
          packagingStructure: 1,
          packagingProfessionalContract: 1,
        },
      },
      finalPrompt,
      editablePrompt: finalPrompt,
      negativeConstraints,
      referenceAssetIds: taskContract.referenceAssetIds,
      logoUsageMode,
      compiledAt: new Date().toISOString(),
      trace: {
        compilerId: SHORT_CHAIN_PROMPT_COMPILER_ID,
        compilerVersion: SHORT_CHAIN_PROMPT_COMPILER_VERSION,
        adapterId: adapter.id,
        adapterVersion: adapter.version,
        sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(traceValue)).digest('hex'),
      },
    };
  }

  // Fixed block order is part of the provider contract. Within each block the
  // priority is task > locked facts > extracted translation > context > template.
  const blocks = [
    createBlock(
      'deliverable_identity',
      '01 Deliverable Identity',
      [
        `Generate exactly one ${taskContract.deliverableFamily} / ${taskContract.subtype} / ${taskContract.shot} result.`,
        templateSections('definition'),
      ],
      ['task_contract', ...templates.map((item) => item.id)],
      'Generate one clearly identifiable formal deliverable.',
    ),
    createBlock(
      'task_contract',
      '02 Current Task — Highest Priority',
      [
        taskContract.currentInstruction,
        taskContract.mustInclude.map((item) => `Must include: ${item}`),
        taskContract.scene ? `Scene: ${taskContract.scene}` : '',
        `Aspect ratio: ${taskContract.aspectRatio}`,
      ],
      ['task_contract'],
      'Execute the current user instruction without changing deliverable type.',
    ),
    createBlock(
      'project_identity',
      '03 Project Identity',
      [
        `Brand: ${packetSource?.projectFacts?.brandName || projectContext.brandCore.name}`,
        packetSource?.projectFacts?.industry || projectContext.brandCore.industry !== 'unknown'
          ? `Industry: ${packetSource?.projectFacts?.industry || projectContext.brandCore.industry}`
          : '',
        packetSource?.projectFacts?.brandRole || source?.projectFacts?.brandRole || projectContext.brandCore.brandRole
          ? `Brand role: ${packetSource?.projectFacts?.brandRole || source?.projectFacts?.brandRole || projectContext.brandCore.brandRole}`
          : '',
        !packetSource && source?.projectFacts?.primaryOfferings?.length
          ? `Primary offerings: ${source.projectFacts.primaryOfferings.join('、')}`
          : '',
        projectContext.brandCore.audience.length
          ? `Audience: ${projectContext.brandCore.audience.join('、')}`
          : '',
      ],
      ['project_record', 'structured_analysis'],
      'Preserve the confirmed project identity.',
      strictPacket,
    ),
    createBlock(
      'upgrade_thesis',
      '04 Upgrade Thesis',
      [
        projectDecisions.specificity?.status === 'ready'
          && projectGenerationContract?.upgradeThesis?.statement
          ? `Approved upgrade thesis: ${projectGenerationContract.upgradeThesis.statement}`
          : packetSource?.creativeDecision?.uniqueUpgradeThesis
            ? `Unique upgrade thesis: ${packetSource.creativeDecision.uniqueUpgradeThesis}`
            : '',
        projectDecisions.specificity?.status === 'ready'
          ? []
          : packetSource?.creativeDecision?.upgradeFrom?.map((item) => `Upgrade from: ${item}`),
        projectDecisions.specificity?.status === 'ready'
          ? []
          : packetSource?.creativeDecision?.preserveCore?.map((item) => `Preserve core: ${item}`),
        projectDecisions.specificity?.status === 'ready'
          ? []
          : packetSource?.creativeDecision?.upgradeTo?.map((item) => `Upgrade to: ${item}`),
        projectDecisions.recommendedDirection
          ? `Approved creative direction: ${projectDecisions.recommendedDirection}`
          : '',
        projectDecisions.generationGoals?.map((item) => `Approved generation goal: ${item}`),
        packetSource?.creativeDecision?.targetWorldview?.map(
          (item) => `Target worldview: ${item}`,
        ),
        packetSource ? [] : source?.upgradeTranslation?.preserve?.map((item) => `Preserve: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.weaken?.map((item) => `Weaken: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.remove?.map((item) => `Remove: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.targetWorldview?.map((item) => `Target worldview: ${item}`),
        promptAsset?.promptFragments,
      ],
      [
        ...(packetSource ? [
          'visual_decision_packet.creativeDecision',
          'project_generation_contract.projectSpecificDecisions',
        ] : ['prompt_source.upgradeTranslation']),
        ...(promptAsset ? [`project_prompt_asset:${promptAsset.id}`] : []),
      ],
      'Upgrade the existing identity through relationships, proportion and behavior rather than literal decoration.',
      strictPacket,
    ),
    ...(taskContract.deliverableFamily === 'space' ? [createBlock(
      'positive_spatial_mechanism',
      '05 Positive Spatial Mechanism — Must Drive the Image',
      [
        labeledJoined('Brand role manifestation',
          projectGenerationContract?.brandRoleManifestation,
        ),
        labeledJoined('Signature spatial mechanism',
          projectGenerationContract?.signatureSpatialMechanism,
        ),
        labeledJoined('Functional network',
          projectGenerationContract?.functionalNetwork,
        ),
        labeledJoined('Scene program', projectGenerationContract?.sceneProgram),
        labeledJoined('Positive differentiators',
          projectGenerationContract?.positiveDifferentiators,
        ),
        labeledJoined('Must be visibly legible in this single image',
          projectGenerationContract?.mustBeVisible,
        ),
      ],
      [
        'project_generation_contract.brandRoleManifestation',
        'project_generation_contract.signatureSpatialMechanism',
        'project_generation_contract.functionalNetwork',
        'project_generation_contract.sceneProgram',
        'project_generation_contract.positiveDifferentiators',
        'project_generation_contract.mustBeVisible',
      ],
      'Express the confirmed project role through a visible, project-grounded spatial mechanism.',
      false,
    )] : []),
    createBlock(
      'tone_boundary',
      '06 Tone Boundaries',
      packetSource
        ? cleanList(projectGenerationContract?.toneBoundaries?.length
          ? projectGenerationContract.toneBoundaries.flatMap((item) => [
            `Approved tone target: ${item.target}`,
            item.avoid?.map((avoid) => `Approved tone prohibition: ${avoid}`),
          ])
          : packetToneItems(packetSource.creativeDecision))
        : toneItems(
          source?.upgradeTranslation?.toneBoundaries,
          projectContext.visualIdentity.tone,
        ),
      [
        ...(packetSource
          ? ['visual_decision_packet.creativeDecision.toneBoundaries']
          : ['prompt_source.upgradeTranslation.toneBoundaries']),
        'project_context.visualIdentity.tone',
      ],
      'Keep the intended brand tone while avoiding generic industry clichés.',
      strictPacket,
    ),
    createBlock(
      'brand_translation',
      '07 Brand Translation',
      [
        packetSource?.lockedAssets?.map((item) => `Locked — preserve ${item.type}: ${item.value}`),
        packetSource ? packetTransformationItems(packetSource.abstractions, packetSource.spatial) : [],
        packetSource?.spatial?.brandIntegration?.map((item) => `Brand integration: ${item}`),
        packetSource?.spatial?.peopleBehavior?.map((item) => `People behavior: ${item}`),
        approvedProhibitionsForDeliverable(
          projectDecisions.prohibitedExpressions,
          taskContract.deliverableFamily,
        ).map((item) => `Approved project prohibition: ${item}`),
        packetSource ? [] : projectContext.lockedAssets.mustPreserve.map((item) => `Locked — preserve: ${item}`),
        packetSource ? [] : source?.lockedAssets?.mustPreserve?.map((item) => `Locked — preserve: ${item}`),
        packetSource ? [] : transformationItems(source?.upgradeTranslation?.transformations),
        packetSource ? [] : source?.renderLanguage?.graphicBehavior,
        packetSource ? [] : projectContext.visualIdentity.graphicBehavior,
      ],
      [
        'locked_assets',
        ...(packetSource
          ? [
            'visual_decision_packet.abstractions',
            'visual_decision_packet.mediaTranslations.spatial',
            'project_generation_contract.projectSpecificDecisions',
          ]
          : ['prompt_source.upgradeTranslation.transformations']),
        'project_context.visualIdentity',
      ],
      'Translate identity into form, rhythm, detail and spatial or object behavior; do not paste symbols as decoration.',
      strictPacket,
    ),
    createBlock(
      'color_system',
      '08 Color System',
      projectDecisions.specificity?.status === 'ready'
        ? projectGenerationContract.sharedVisualRules.colorBehavior
          .map((item) => `Approved project color system: ${item}`)
        : colorItems,
      packetSource
        ? ['visual_decision_packet.colorSystem', 'visual_decision_packet.lockedAssets']
        : ['locked_assets.confirmedColors', 'prompt_source.renderLanguage.colorBehavior', 'project_context.visualIdentity.colorBehavior'],
      'Use a controlled brand-led palette with clear dominant, secondary and accent hierarchy.',
      strictPacket,
    ),
    createBlock(
      'material_system',
      '09 Material System',
      projectDecisions.specificity?.status === 'ready'
        ? projectGenerationContract.sharedVisualRules.materialBehavior
          .map((item) => `Approved project material behavior: ${item}`)
        : materialItems(
          packetSource?.materialBehavior || source?.renderLanguage?.materialBehavior,
          strictPacket ? [] : projectContext.visualIdentity.materialBehavior,
        ),
      [
        ...(packetSource
          ? ['visual_decision_packet.materialSystem']
          : ['prompt_source.renderLanguage.materialBehavior']),
        'project_context.visualIdentity.materialBehavior',
      ],
      'Use physically credible materials with controlled junctions and scale.',
      strictPacket,
    ),
    createBlock(
      'lighting_system',
      '10 Lighting System',
      [
        projectDecisions.specificity?.status === 'ready'
          ? projectGenerationContract.sharedVisualRules.lightingBehavior
            .map((item) => `Approved project light/material behavior: ${item}`)
          : [
            lighting?.source?.length ? `Light sources: ${lighting.source.join('、')}` : '',
            lighting?.contrast ? `Contrast: ${lighting.contrast}` : '',
            lighting?.interactionWithMaterials?.map((item) => `Light/material behavior: ${item}`),
            lighting?.forbidden?.map((item) => `Lighting prohibition: ${item}`),
          ],
        packetSource ? [] : projectContext.visualIdentity.lightingBehavior,
      ],
      [
        ...(packetSource
          ? ['visual_decision_packet.lightingSystem']
          : ['prompt_source.renderLanguage.lightingBehavior']),
        'project_context.visualIdentity.lightingBehavior',
      ],
      'Use physically plausible layered lighting with readable material response and no blown highlights.',
      strictPacket,
    ),
    createBlock(
      'camera_composition',
      '11 Camera, Composition and Realism',
      [
        templateSections('composition'),
        projectContext.visualIdentity.compositionBehavior,
        taskContract.deliverableFamily === 'packaging'
          ? projectDecisions.compositionRules?.map((item) => `Approved project composition rule: ${item}`)
          : [],
        templateSections('realism'),
        `Output ratio: ${taskContract.aspectRatio}`,
      ],
      [...templates.map((item) => item.id), 'project_context.visualIdentity.compositionBehavior'],
      'Use a credible commercial camera view with controlled perspective, hierarchy, depth and scale.',
    ),
    createBlock(
      'professional_contract',
      taskContract.deliverableFamily === 'space' ? '12 Spatial Production Contract' : '12 Professional Production Contract',
      templateSections('professionalRequirements'),
      templates.map((item) => item.id),
      'Make the requested result physically credible, usable and professionally resolved.',
    ),
    createBlock(
      'logo_text_and_negatives',
      '13 Logo, Text and Strict Negatives',
      [
        logoUsageMode === 'reference'
          ? `Use the supplied logo asset as the only identity reference; preserve its structure and do not redesign it.`
          : logoUsageMode === 'post_composite'
            ? 'Do not render any logo or brand text. Reserve a clean, front-facing signage area for controlled post-compositing.'
            : 'Do not render any logo, letters, words, or signage copy. Reserve a clean identity placement area when signage is needed.',
        taskContract.mustAvoid.map((item) => `User prohibition: ${item}`),
        negativeConstraints.map((item) => `Strict negative: ${item}`),
      ],
      [
        'task_contract.mustAvoid',
        'locked_assets.logoAssetIds',
        ...(packetSource
          ? [
            'visual_decision_packet.diagnosis.brandMisreadRisks',
          ]
          : ['prompt_source.negativeRules']),
        ...templates.map((item) => item.id),
      ],
      'Do not invent logos, text, brand marks or unrequested deliverables.',
    ),
  ];

  const missingBlocks = REQUIRED_BLOCK_IDS.filter((id) =>
    !blocks.some((block) => block.id === id && block.items.length));
  if (missingBlocks.length) {
    throw new Error(`vNext prompt is incomplete; missing blocks: ${missingBlocks.join(', ')}`);
  }

  const genericProductionPlaceholders = [
    '保持品牌气质清晰、克制且一致。',
    '使用受品牌控制的主色、辅色和强调色。',
    '材料必须真实可建造。',
    '使用物理可信的分层照明。',
    'Use a controlled brand-led palette with clear dominant, secondary and accent hierarchy.',
    'Use physically credible materials with controlled junctions and scale.',
    'Use physically plausible layered lighting with readable material response and no blown highlights.',
  ];
  if (strictPacket) {
    const leaked = genericProductionPlaceholders.filter((placeholder) =>
      blocks.some((block) => block.items.includes(placeholder)));
    if (leaked.length) {
      throw Object.assign(new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: generic placeholders leaked: ${leaked.join(' | ')}`), {
        code: 'VISUAL_DECISION_PACKET_INSUFFICIENT',
      });
    }
  }

  const renderedBlocks = blocks.map(renderBlock);
  const finalPrompt = adapter.orderSections(renderedBlocks).join('\n\n');
  const sourceMap = Object.fromEntries(blocks.map((block) => [block.id, [...block.sources]]));
  if (confirmedDecision.confirmation) {
    for (const blockId of ['project_identity', 'upgrade_thesis', 'tone_boundary', 'brand_translation',
      'positive_spatial_mechanism', 'color_system', 'material_system', 'lighting_system']) {
      if (!sourceMap[blockId]) continue;
      sourceMap[blockId] = [
        `user_confirmed_visual_decision:${confirmedDecision.confirmation.id}`,
        ...sourceMap[blockId],
      ];
    }
  }
  const traceValue = {
    projectContextFingerprint: projectContext.provenance.sourceFingerprint,
    promptSourceFingerprint: packetSource?.fingerprint ?? source?.provenance?.sourceFingerprint ?? null,
    taskContract,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    projectPromptAsset: promptAsset
      ? { id: promptAsset.id, version: promptAsset.version }
      : null,
    blocks,
    finalPrompt,
  };

  return {
    schemaVersion: '1.0',
    taskContract,
    projectContextVersion: projectContext.version,
    route: {
      familyTemplateId: route.familyTemplateId,
      subtypeTemplateId: route.subtypeTemplateId,
      shotTemplateId: route.shotTemplateId,
      templateVersions: route.templateVersions,
    },
    blocks,
    sourceMap,
    projectGenerationContract,
    spatialTranslation: packetSource?.spatial || null,
    effectiveVisualDecisionPacket: packet,
    userConfirmedVisualDecision: confirmedDecision.confirmation,
    completeness: {
      complete: true,
      requiredBlockIds: [...REQUIRED_BLOCK_IDS],
      missingBlockIds: [],
      conflictCount: conflicts.length,
      coverage: {
        hardFacts: packetSource ? 1 : null,
        upgradeThesis: packetSource ? 1 : null,
        brandTranslation: packetSource ? 1 : null,
        toneBoundaries: packetSource ? 1 : null,
        colorMaterialLighting: packetSource ? 1 : null,
        taskContract: 1,
      },
    },
    finalPrompt,
    editablePrompt: finalPrompt,
    negativeConstraints,
    referenceAssetIds: taskContract.referenceAssetIds,
    logoUsageMode,
    compiledAt: new Date().toISOString(),
    trace: {
      compilerId: SHORT_CHAIN_PROMPT_COMPILER_ID,
      compilerVersion: SHORT_CHAIN_PROMPT_COMPILER_VERSION,
      adapterId: adapter.id,
      adapterVersion: adapter.version,
      sourceFingerprint: crypto.createHash('sha256').update(JSON.stringify(traceValue)).digest('hex'),
      ...(promptAsset ? {
        projectPromptAssetId: promptAsset.id,
        projectPromptAssetVersion: promptAsset.version,
      } : {}),
    },
  };
}
