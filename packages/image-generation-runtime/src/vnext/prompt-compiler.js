import crypto from 'node:crypto';
import { assertVNextProjectPromptAsset } from './project-prompt-asset.js';

export const VNEXT_PROMPT_COMPILER_ID = 'vnext-prompt-compiler';
export const VNEXT_PROMPT_COMPILER_VERSION = '3.2.0';

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
      new Error(`PROMPT_SOURCE_INSUFFICIENT: hard facts ${packet.validation?.hardFactStatus || 'unknown'}`),
      { code: 'PROMPT_SOURCE_INSUFFICIENT' },
    );
  }
  if (packet.validation?.executionDataStatus !== 'ready') {
    throw Object.assign(
      new Error(`PROMPT_SOURCE_INSUFFICIENT: ${cleanList(packet.validation?.missingExecutionFields).join(', ') || 'execution data'}`),
      { code: 'PROMPT_SOURCE_INSUFFICIENT' },
    );
  }
  if (family !== 'space') {
    throw Object.assign(
      new Error(`PROMPT_SOURCE_INSUFFICIENT: ${family} media translation is interface-only`),
      { code: 'PROMPT_SOURCE_INSUFFICIENT' },
    );
  }
  return {
    projectFacts: {
      brandName: packet.projectFacts?.brandName?.value,
      industry: packet.projectFacts?.industry?.value,
      brandRole: packet.projectFacts?.brandRole?.value,
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
      ? `不得字面复制：${cleanList(item.forbiddenLiteralUse).join('、')}`
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
  if (requiresText && logoUsageMode === 'blank_area') {
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

function roleEvidenceText(taskContract, packetSource) {
  return cleanList(
    taskContract.currentInstruction,
    taskContract.mustInclude,
    packetSource?.projectFacts?.industry,
    packetSource?.projectFacts?.brandRole,
    packetSource?.creativeDecision?.brandRoleStatement,
  ).join(' ');
}

function isPlatformRole(roleText) {
  return /全链|生态平台|产业平台|协作平台|服务平台|ecosystem|platform|network/iu.test(roleText);
}

function isMedicalAestheticsRole(roleText) {
  return /医美|医疗美容|医学美容|medical\s+aesthetics?|aesthetic\s+medicine|cosmetic\s+medicine/iu.test(roleText);
}

function platformRoleContract(taskContract, packetSource) {
  const roleText = roleEvidenceText(taskContract, packetSource);
  if (!isPlatformRole(roleText)) return '';
  return [
    'Brand role contract: express the confirmed ecosystem or platform role through a coherent composite experience, not a generic single-purpose storefront.',
    'Platform relationship contract: visibly connect at least two functions supported by project evidence — such as arrival or reception, consultation or collaboration, capability display, waiting, or back-of-house circulation. Do not invent unsupported functions or replace spatial relationships with explanatory graphics.',
    'Human behavior contract: when people are appropriate, use 1–3 naturally behaving adults only as secondary evidence of scale and use. No posing, selfies, greeting lineups, exaggerated smiles, or advertising portraits.',
    ...(isMedicalAestheticsRole(roleText) ? [
      'Medical-aesthetics boundary: this flagship experience space is not a single consumer beauty store; do not show injections, treatment beds, nursing, or staged treatment scenes.',
    ] : []),
  ].join(' ');
}

function assertProjectSpecificity({ packetSource, taskContract, logoUsageMode }) {
  if (!packetSource || taskContract.deliverableFamily !== 'space') return;
  const issues = [];
  const roleText = roleEvidenceText(taskContract, packetSource);
  if (!isPlatformRole(roleText)) return;

  const integration = cleanList(packetSource.spatial?.brandIntegration).join(' ');
  const interfaceCount = [
    /隔断|partition/iu,
    /墙体|墙面|wall/iu,
    /天花|顶面|ceiling/iu,
    /光线|光过滤|lighting|light-filter/iu,
    /展示|display/iu,
    /动线|路径|circulation|path/iu,
  ].filter((pattern) => pattern.test(integration)).length;
  if (interfaceCount < 2 || /单一.*(?:雕塑|装置)|巨型.*(?:雕塑|装置)|打卡装置/iu.test(integration)) {
    issues.push('distributed_spatial_translation');
  }
  if (logoUsageMode === 'reference'
    && (!/(小面积|次层级|后方|内部|预留|留白|small|subtle|background|internal|reserved)/iu.test(integration)
      || /顶部中央|入口门头|主招牌|最大视觉中心|top center|storefront sign/iu.test(integration))) {
    issues.push('subtle_logo_behavior');
  }

  const story = cleanList(packetSource.spatial?.functionalExperience).join(' ');
  for (const [id, pattern] of [
    ['foreground', /前景|foreground/iu],
    ['midground', /中景|midground/iu],
    ['background', /背景|background/iu],
    ['circulation', /动线|进入|前往后方|circulation|arrival.*consult/iu],
  ]) {
    if (!pattern.test(story)) issues.push(`scene_story_${id}`);
  }

  const primaryRatio = (packetSource.colorBehavior?.primary || [])
    .reduce((sum, item) => sum + Number(item?.ratio || 0), 0);
  const secondaryRatio = (packetSource.colorBehavior?.secondary || [])
    .reduce((sum, item) => sum + Number(item?.ratio || 0), 0);
  const accentRatio = (packetSource.colorBehavior?.accent || [])
    .reduce((sum, item) => sum + Number(item?.ratio || 0), 0);
  const colorRatioTotal = primaryRatio + secondaryRatio + accentRatio;
  if (colorRatioTotal > 0
    && (Math.abs(colorRatioTotal - 100) > 1 || primaryRatio <= accentRatio)) {
    issues.push('color_hierarchy_behavior');
  }
  const accentFamilies = new Set(
    (packetSource.colorBehavior?.accent || []).flatMap((item) =>
      [...String(item?.name || '').matchAll(/[紫红蓝绿橙黄金粉]|purple|violet|red|blue|green|orange|gold|pink/giu)]
        .map((match) => match[0].toLowerCase())),
  );
  const nonAccentColors = [
    ...(packetSource.colorBehavior?.primary || []),
    ...(packetSource.colorBehavior?.secondary || []),
  ];
  if (nonAccentColors.some((item) =>
    [...accentFamilies].some((family) => String(item?.name || '').toLowerCase().includes(family)))) {
    issues.push('accent_color_overweight');
  }

  const materials = JSON.stringify(packetSource.materialBehavior || []);
  if (!/厚度|接缝|收边|透射|反射|肌理|触感|thickness|joint|edge|transmission|reflection|texture|tactile/iu.test(materials)) {
    issues.push('material_physical_behavior');
  }

  const lighting = JSON.stringify(packetSource.lightingBehavior || {});
  if (!/光|照明|light|lighting/iu.test(lighting)
    || !/反射|透射|穿透|阴影|高光|reflection|transmission|through|shadow|highlight/iu.test(lighting)) {
    issues.push('lighting_material_interaction');
  }

  const negatives = cleanList(
    packetSource.diagnosis?.brandMisreadRisks?.map((item) => item.target),
    packetSource.spatial?.sceneMisreadRisks,
    packetSource.creativeDecision?.strategicNegatives,
    taskContract.mustAvoid,
  );
  if (negatives.length < 2) issues.push('project_specific_scene_negatives');

  if (issues.length) {
    throw Object.assign(
      new Error(`PROMPT_PROJECT_SPECIFICITY_INSUFFICIENT: ${issues.join(', ')}`),
      { code: 'PROMPT_PROJECT_SPECIFICITY_INSUFFICIENT', issues },
    );
  }
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
    throw Object.assign(new Error(`PROMPT_SOURCE_INSUFFICIENT: ${id}`), {
      code: 'PROMPT_SOURCE_INSUFFICIENT',
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

export function compileVNextPrompt({ projectContext, taskContract, route, adapter, projectPromptAsset }) {
  if (projectContext.schemaVersion !== '2.0') {
    throw new Error('vNext prompt compiler requires Project Visual Context 2.0');
  }
  if (projectContext.projectId !== taskContract.projectId) {
    throw new Error('Task Contract and Project Visual Context belong to different projects');
  }

  const promptAsset = projectPromptAsset
    ? assertVNextProjectPromptAsset(
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
  const packet = projectContext.visualDecisionPacket;
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
    packetSource?.creativeDecision?.strategicNegatives,
    packetSource?.diagnosis?.brandMisreadRisks?.map((item) => item.target),
    packetSource?.spatial?.sceneMisreadRisks,
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
    assertProjectSpecificity({
      packetSource,
      taskContract,
      logoUsageMode,
    });
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
        platformRoleContract(taskContract, packetSource),
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
        packetSource?.creativeDecision?.uniqueUpgradeThesis
          ? `Unique upgrade thesis: ${packetSource.creativeDecision.uniqueUpgradeThesis}`
          : '',
        packetSource?.creativeDecision?.upgradeFrom?.map((item) => `Upgrade from: ${item}`),
        packetSource?.creativeDecision?.preserveCore?.map((item) => `Preserve core: ${item}`),
        packetSource?.creativeDecision?.upgradeTo?.map((item) => `Upgrade to: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.preserve?.map((item) => `Preserve: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.weaken?.map((item) => `Weaken: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.remove?.map((item) => `Remove: ${item}`),
        packetSource ? [] : source?.upgradeTranslation?.targetWorldview?.map((item) => `Target worldview: ${item}`),
        promptAsset?.promptFragments,
      ],
      [
        ...(packetSource ? ['visual_decision_packet.creativeDecision'] : ['prompt_source.upgradeTranslation']),
        ...(promptAsset ? [`project_prompt_asset:${promptAsset.id}`] : []),
      ],
      'Upgrade the existing identity through relationships, proportion and behavior rather than literal decoration.',
      strictPacket,
    ),
    createBlock(
      'tone_boundary',
      '05 Tone Boundaries',
      toneItems(
        packetSource?.creativeDecision?.toneBoundaries || source?.upgradeTranslation?.toneBoundaries,
        strictPacket ? [] : projectContext.visualIdentity.tone,
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
      'professional_contract',
      taskContract.deliverableFamily === 'space' ? '06 Spatial Contract' : '06 Professional Contract',
      templateSections('professionalRequirements'),
      templates.map((item) => item.id),
      'Make the requested result physically credible, usable and professionally resolved.',
    ),
    createBlock(
      'brand_translation',
      '07 Brand Translation',
      [
        packetSource?.lockedAssets?.map((item) => `Locked — preserve ${item.type}: ${item.value}`),
        packetSource ? packetTransformationItems(packetSource.abstractions, packetSource.spatial) : [],
        packetSource?.spatial?.brandIntegration?.map((item) => `Brand integration: ${item}`),
        packetSource?.spatial?.functionalExperience?.map((item) => `Functional experience: ${item}`),
        packetSource ? [] : projectContext.lockedAssets.mustPreserve.map((item) => `Locked — preserve: ${item}`),
        packetSource ? [] : source?.lockedAssets?.mustPreserve?.map((item) => `Locked — preserve: ${item}`),
        packetSource ? [] : transformationItems(source?.upgradeTranslation?.transformations),
        packetSource ? [] : source?.renderLanguage?.graphicBehavior,
        packetSource ? [] : projectContext.visualIdentity.graphicBehavior,
      ],
      [
        'locked_assets',
        ...(packetSource
          ? ['visual_decision_packet.abstractions', 'visual_decision_packet.mediaTranslations.spatial']
          : ['prompt_source.upgradeTranslation.transformations']),
        'project_context.visualIdentity',
      ],
      'Translate identity into form, rhythm, detail and spatial or object behavior; do not paste symbols as decoration.',
      strictPacket,
    ),
    createBlock(
      'color_system',
      '08 Color System',
      colorItems,
      packetSource
        ? ['visual_decision_packet.colorSystem', 'visual_decision_packet.lockedAssets']
        : ['locked_assets.confirmedColors', 'prompt_source.renderLanguage.colorBehavior', 'project_context.visualIdentity.colorBehavior'],
      'Use a controlled brand-led palette with clear dominant, secondary and accent hierarchy.',
      strictPacket,
    ),
    createBlock(
      'material_system',
      '09 Material System',
      materialItems(
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
        lighting?.source?.length ? `Light sources: ${lighting.source.join('、')}` : '',
        lighting?.contrast ? `Contrast: ${lighting.contrast}` : '',
        lighting?.interactionWithMaterials?.map((item) => `Light/material behavior: ${item}`),
        lighting?.forbidden?.map((item) => `Lighting prohibition: ${item}`),
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
        templateSections('realism'),
        `Output ratio: ${taskContract.aspectRatio}`,
      ],
      [...templates.map((item) => item.id), 'project_context.visualIdentity.compositionBehavior'],
      'Use a credible commercial camera view with controlled perspective, hierarchy, depth and scale.',
    ),
    createBlock(
      'logo_text_and_negatives',
      '12 Logo, Text and Strict Negatives',
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
            'visual_decision_packet.creativeDecision.strategicNegatives',
            'visual_decision_packet.diagnosis.brandMisreadRisks',
            'visual_decision_packet.mediaTranslations.spatial.sceneMisreadRisks',
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
      throw Object.assign(new Error(`PROMPT_SOURCE_INSUFFICIENT: generic placeholders leaked: ${leaked.join(' | ')}`), {
        code: 'PROMPT_SOURCE_INSUFFICIENT',
      });
    }
  }

  const renderedBlocks = blocks.map(renderBlock);
  const finalPrompt = adapter.orderSections(renderedBlocks).join('\n\n');
  const sourceMap = Object.fromEntries(blocks.map((block) => [block.id, [...block.sources]]));
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
      compilerId: VNEXT_PROMPT_COMPILER_ID,
      compilerVersion: VNEXT_PROMPT_COMPILER_VERSION,
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
