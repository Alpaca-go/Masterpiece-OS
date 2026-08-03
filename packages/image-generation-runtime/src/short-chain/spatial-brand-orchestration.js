const SCENE_ROLE_DEFAULTS = Object.freeze({
  storefront: { recommendedIntensity: 'expressive', textTolerance: 'high', primaryAssetRequired: true },
  entrance: { recommendedIntensity: 'expressive', textTolerance: 'medium', primaryAssetRequired: true },
  reception: { recommendedIntensity: 'balanced', textTolerance: 'medium', primaryAssetRequired: true },
  lobby: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: true },
  brand_wall: { recommendedIntensity: 'expressive', textTolerance: 'high', primaryAssetRequired: true },
  dining_area: { recommendedIntensity: 'balanced', textTolerance: 'low', primaryAssetRequired: false },
  retail_area: { recommendedIntensity: 'balanced', textTolerance: 'medium', primaryAssetRequired: true },
  private_room: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: false },
  consultation_room: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: false },
  corridor: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: false },
  wayfinding: { recommendedIntensity: 'balanced', textTolerance: 'high', primaryAssetRequired: false },
  display_area: { recommendedIntensity: 'balanced', textTolerance: 'medium', primaryAssetRequired: false },
  waiting_area: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: false },
  material_closeup: { recommendedIntensity: 'subtle', textTolerance: 'low', primaryAssetRequired: false },
  overview: { recommendedIntensity: 'balanced', textTolerance: 'low', primaryAssetRequired: true },
});

const INTENSITY_BUDGETS = Object.freeze({
  subtle: { headlineGroups: 0, iconGroups: 0, patternZones: 2 },
  balanced: { headlineGroups: 1, iconGroups: 1, patternZones: 2 },
  expressive: { headlineGroups: 1, iconGroups: 1, patternZones: 3 },
});

const ROLE_PATTERNS = Object.freeze([
  ['brand_wall', /brand[_\s-]?wall|打卡墙|品牌墙/iu],
  ['storefront', /storefront|facade|门头|店面外立面/iu],
  ['entrance', /entrance|entry|入口|门厅/iu],
  ['reception', /reception|front[_\s-]?desk|前台|接待/iu],
  ['lobby', /lobby|大厅/iu],
  ['dining_area', /dining|restaurant|就餐|餐区/iu],
  ['retail_area', /retail|shop|零售|卖场/iu],
  ['private_room', /private[_\s-]?room|包间|贵宾室/iu],
  ['consultation_room', /consultation|consulting|诊室|咨询室/iu],
  ['corridor', /corridor|hallway|走廊/iu],
  ['wayfinding', /wayfinding|signage|导视|导向/iu],
  ['display_area', /display|exhibition|展示区|陈列/iu],
  ['waiting_area', /waiting|等候|候诊/iu],
  ['material_closeup', /material[_\s-]?close|closeup|close[_\s-]?up|材质特写|细节特写/iu],
  ['overview', /overview|全景|鸟瞰/iu],
]);

function cleanList(...values) {
  return [...new Set(values.flat(Infinity)
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function resolveSpatialSceneRole(task = {}) {
  const explicit = String(task.sceneRole || '').trim();
  if (Object.hasOwn(SCENE_ROLE_DEFAULTS, explicit)) {
    return { sceneRole: explicit, source: 'user' };
  }
  const subtype = String(task.subtype || '').trim();
  const subtypeMatch = ROLE_PATTERNS.find(([, pattern]) => pattern.test(subtype));
  if (subtypeMatch) return { sceneRole: subtypeMatch[0], source: 'task_subtype' };
  const taskText = `${task.scene || ''} ${task.shot || ''} ${task.currentInstruction || ''}`;
  const inferred = ROLE_PATTERNS.find(([, pattern]) => pattern.test(taskText));
  return { sceneRole: inferred?.[0] || 'overview', source: 'auto_resolved' };
}

export function inferCameraDistance(task = {}) {
  const text = `${task.shot || ''} ${task.currentInstruction || ''}`;
  if (/close[_\s-]?up|detail|macro|特写|近景/iu.test(text)) return 'close';
  if (/wide|overview|panorama|全景|广角|远景/iu.test(text)) return 'wide';
  return 'medium';
}

export function resolveBrandIntensity(input) {
  if (['subtle', 'balanced', 'expressive'].includes(input.userOverride)) {
    return { brandIntensity: input.userOverride, reasons: ['user_override'] };
  }
  const recommended = SCENE_ROLE_DEFAULTS[input.sceneRole]?.recommendedIntensity || 'balanced';
  let score = { subtle: 0.2, balanced: 0.5, expressive: 0.8 }[recommended];
  const personality = cleanList(input.brandPersonality).join(' ').toLowerCase();
  if (/(bold|playful|energetic|youth|大胆|活力|年轻|潮流|趣味)/iu.test(personality)) score += 0.12;
  if (/(restrained|quiet|calm|professional|minimal|克制|安静|专业|极简)/iu.test(personality)) score -= 0.12;
  if (input.cameraDistance === 'wide') score -= 0.05;
  if (input.cameraDistance === 'close') score += 0.03;
  const brandIntensity = score <= 0.35 ? 'subtle' : score >= 0.7 ? 'expressive' : 'balanced';
  return {
    brandIntensity,
    reasons: [`scene_role:${input.sceneRole}:${recommended}`, `camera_distance:${input.cameraDistance}`, `resolved_score:${score.toFixed(2)}`],
  };
}

function zoneForRole(sceneRole) {
  if (sceneRole === 'storefront') return 'entrance_brand_wall';
  if (sceneRole === 'entrance' || sceneRole === 'brand_wall') return 'central_feature_wall';
  if (sceneRole === 'reception' || sceneRole === 'lobby') return 'reception_back_wall';
  return 'central_feature_wall';
}

function secondaryRenderMode(assetType) {
  if (assetType === 'ip_character' || assetType === 'brand_installation') return 'materialized';
  if (assetType === 'icon') return 'symbol_only';
  return 'style_inheritance';
}

function choosePrimary(assets, sceneRole, intensity) {
  if (!assets.length) return undefined;
  if (intensity === 'expressive' && ['entrance', 'brand_wall'].includes(sceneRole)) {
    return assets.find((item) => item.type === 'ip_character') || assets.find((item) => item.type === 'logo') || assets[0];
  }
  return assets.find((item) => item.type === 'logo') || assets.find((item) => item.type === 'ip_character') || assets[0];
}

export function buildBrandAssetBudget({ sceneRole, brandIntensity, selectedAssets = [] }) {
  const assets = [...new Map(selectedAssets.filter((item) => item?.assetId)
    .map((item) => [item.assetId, { assetId: item.assetId, type: item.type || 'other' }])).values()];
  const primary = choosePrimary(assets, sceneRole, brandIntensity);
  const secondaryAssets = assets.filter((item) => item.assetId !== primary?.assetId).map((item) => ({
    assetId: item.assetId,
    assetType: item.type,
    allowedZones: item.type === 'ip_character' ? ['right_supporting_zone'] : ['left_supporting_wall'],
    maxOccurrences: 1,
    renderMode: secondaryRenderMode(item.type),
  }));
  const preset = INTENSITY_BUDGETS[brandIntensity];
  return {
    sceneRole,
    brandIntensity,
    ...(primary ? { primaryAsset: {
      assetId: primary.assetId,
      assetType: primary.type,
      targetZone: zoneForRole(sceneRole),
      maxOccurrences: 1,
    } } : {}),
    secondaryAssets,
    textBudget: {
      lockedLogoGroups: assets.some((item) => item.type === 'logo') ? 1 : 0,
      headlineGroups: preset.headlineGroups,
      supportingTextGroups: 0,
      smallTextAllowed: false,
      microTextAllowed: false,
    },
    styleInheritance: {
      palette: true,
      shapeLanguage: true,
      patternRhythm: true,
      typographyMood: brandIntensity !== 'expressive',
      spatialOrder: true,
    },
    prohibitedAssetIds: [],
    prohibitedContent: ['additional logos', 'invented brand names', 'pseudo typography', 'micro text'],
  };
}

export function buildTextSafetyZones({ sceneRole, assetBudget }) {
  const zones = [];
  if (assetBudget.primaryAsset) {
    zones.push({
      zoneId: assetBudget.primaryAsset.targetZone,
      zoneDescription: 'Primary approved brand asset carrier',
      policy: 'locked_text_only',
      allowedAssetIds: [assetBudget.primaryAsset.assetId],
      allowedText: [],
      maxTextGroups: assetBudget.textBudget.lockedLogoGroups + assetBudget.textBudget.headlineGroups,
      minimumReadableWidthPx: 96,
    });
  }
  for (const asset of assetBudget.secondaryAssets) {
    zones.push(...asset.allowedZones.map((zoneId) => ({
      zoneId,
      zoneDescription: 'Approved supporting brand asset carrier',
      policy: asset.renderMode === 'symbol_only' ? 'symbol_only' : 'decorative_pattern_only',
      allowedAssetIds: [asset.assetId],
      maxTextGroups: 0,
    })));
  }
  if (['lobby', 'consultation_room', 'corridor'].includes(sceneRole)) {
    zones.push({ zoneId: 'cabinet_label_system', zoneDescription: 'Cabinet and room indexing', policy: 'index_only', maxTextGroups: 1 });
    zones.push({ zoneId: 'glass_partition', zoneDescription: 'Secondary glass partition', policy: 'decorative_pattern_only', maxTextGroups: 0 });
  }
  zones.push({
    zoneId: 'all_unplanned_surfaces',
    zoneDescription: 'Every wall, floor, ceiling, furnishing and distant surface not explicitly listed above',
    policy: 'no_text',
    maxTextGroups: 0,
  });
  return zones;
}

export function buildSpatialBrandOrchestration(input) {
  const role = resolveSpatialSceneRole(input.task);
  const cameraDistance = input.cameraDistance || inferCameraDistance(input.task);
  const industry = input.projectContext?.visualDecisionPacket?.projectFacts?.industry?.value
    || input.projectContext?.promptSourceObject?.projectFacts?.industry
    || input.projectContext?.brandCore?.industry
    || 'unknown';
  const brandPersonality = cleanList(
    input.projectContext?.visualIdentity?.tone,
    input.projectContext?.promptSourceObject?.upgradeTranslation?.toneBoundaries?.map((item) => item?.target),
  );
  const intensity = resolveBrandIntensity({
    industry,
    sceneRole: role.sceneRole,
    brandPersonality,
    cameraDistance,
    userOverride: input.userBrandIntensity,
  });
  const assetBudget = buildBrandAssetBudget({
    sceneRole: role.sceneRole,
    brandIntensity: input.selectedAssets?.length ? intensity.brandIntensity : 'subtle',
    selectedAssets: input.selectedAssets,
  });
  return {
    schemaVersion: '1.0',
    sceneRole: role.sceneRole,
    sceneRoleSource: role.source,
    cameraDistance,
    brandIntensity: assetBudget.brandIntensity,
    intensityReason: input.selectedAssets?.length ? intensity.reasons : ['no_locked_assets:subtle'],
    assetBudget,
    textSafetyZones: buildTextSafetyZones({ sceneRole: role.sceneRole, assetBudget }),
    densityIssues: [],
    compiledRules: { positive: [], negative: [] },
  };
}

export function compileSpatialBrandOrchestrationRules(orchestration) {
  if (!orchestration) return { positive: [], negative: [] };
  const { assetBudget } = orchestration;
  const enabledInheritance = Object.entries(assetBudget.styleInheritance)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  return {
    positive: [
      `SCENE ROLE: ${orchestration.sceneRole}.`,
      `BRAND INTENSITY: ${orchestration.brandIntensity}. Intensity controls hierarchy and scale, not repeated Logo count.`,
      assetBudget.primaryAsset
        ? `PRIMARY BRAND ASSET: ${assetBudget.primaryAsset.assetId}; type ${assetBudget.primaryAsset.assetType}; assigned zone ${assetBudget.primaryAsset.targetZone}; maximum occurrences 1.`
        : 'PRIMARY BRAND ASSET: none. Do not invent a brand mark.',
      ...assetBudget.secondaryAssets.map((asset) => `APPROVED SECONDARY ASSET: ${asset.assetId}; type ${asset.assetType}; zones ${asset.allowedZones.join(', ')}; render mode ${asset.renderMode}; maximum occurrences ${asset.maxOccurrences}.`),
      `STYLE INHERITANCE: use ${enabledInheritance.join(', ')} to carry brand identity into materials, proportions, pattern rhythm and environmental details without repeating the Logo.`,
      `TEXT BUDGET: locked Logo groups ${assetBudget.textBudget.lockedLogoGroups}; headline groups ${assetBudget.textBudget.headlineGroups}; supporting text groups ${assetBudget.textBudget.supportingTextGroups}; small text forbidden; micro text forbidden.`,
      ...orchestration.textSafetyZones.map((zone) => `TEXT ZONE ${zone.zoneId}: ${zone.policy}; ${zone.zoneDescription}; maximum text groups ${zone.maxTextGroups ?? 0}${zone.allowedAssetIds?.length ? `; approved assets ${zone.allowedAssetIds.join(', ')}` : ''}.`),
      'Use approved locked assets only in their assigned zones. Preserve their identity and geometry.',
    ],
    negative: [
      'Do not generate additional logos or duplicate the brand name.',
      'Do not invent Chinese text, English text, slogans, captions or pseudo typography.',
      'Do not create illegible small text or micro text.',
      'Do not place logo-like symbols outside approved zones.',
      'Do not decorate every surface with brand graphics.',
      ...(orchestration.sceneRole === 'brand_wall' ? [] : ['Do not turn the space into a poster wall.']),
    ],
  };
}

function densityIssue(code, severity, message, suggestedFix) {
  return { code, severity, message, suggestedFix };
}

export function guardSpatialBrandDensity(orchestration) {
  if (!orchestration) return null;
  const budget = structuredClone(orchestration.assetBudget);
  const issues = [];
  const originalAssets = [budget.primaryAsset, ...budget.secondaryAssets].filter(Boolean);
  const logos = originalAssets.filter((asset) => asset.assetType === 'logo');
  if (logos.length > 1) {
    const retainedLogoId = budget.primaryAsset?.assetType === 'logo'
      ? budget.primaryAsset.assetId : logos[0].assetId;
    const removed = budget.secondaryAssets.filter((asset) =>
      asset.assetType === 'logo' && asset.assetId !== retainedLogoId);
    budget.secondaryAssets = budget.secondaryAssets.filter((asset) => !removed.includes(asset));
    budget.prohibitedAssetIds.push(...removed.map((asset) => asset.assetId));
    issues.push(densityIssue(
      'DUPLICATE_LOGO', 'error',
      'More than one complete Logo was scheduled for the same image.',
      `Retained ${retainedLogoId} once and prohibited the remaining complete Logo assets.`,
    ));
  }
  if (budget.secondaryAssets.length > 1) {
    const priority = { ip_character: 4, brand_installation: 4, icon: 2, logo: 5, other: 1 };
    const retained = [...budget.secondaryAssets]
      .sort((a, b) => (priority[b.assetType] || 0) - (priority[a.assetType] || 0))[0];
    const removed = budget.secondaryAssets.filter((asset) => asset.assetId !== retained.assetId);
    budget.secondaryAssets = [retained];
    budget.prohibitedAssetIds.push(...removed.map((asset) => asset.assetId));
    issues.push(densityIssue(
      'BRAND_DENSITY_OVERFLOW', 'error',
      'The explicit brand asset schedule exceeded one primary plus one supporting asset.',
      `Retained ${retained.assetId} as the only supporting asset; inherit other identity through style rather than literal repetition.`,
    ));
  }
  const totalTextGroups = budget.textBudget.lockedLogoGroups
    + budget.textBudget.headlineGroups + budget.textBudget.supportingTextGroups;
  const maximumTextGroups = budget.brandIntensity === 'subtle' ? 1 : 2;
  if (totalTextGroups > maximumTextGroups) {
    budget.textBudget.supportingTextGroups = 0;
    budget.textBudget.headlineGroups = Math.min(
      budget.textBudget.headlineGroups,
      Math.max(0, maximumTextGroups - budget.textBudget.lockedLogoGroups),
    );
    issues.push(densityIssue(
      'TOO_MANY_TEXT_GROUPS', 'error',
      `Scheduled text groups ${totalTextGroups} exceeded the ${maximumTextGroups}-group budget.`,
      'Removed supporting copy first and limited the image to one approved headline after the locked Logo.',
    ));
  }
  if (budget.textBudget.smallTextAllowed || budget.textBudget.microTextAllowed) {
    budget.textBudget.smallTextAllowed = false;
    budget.textBudget.microTextAllowed = false;
    issues.push(densityIssue(
      'SMALL_TEXT_NOT_ALLOWED', 'error',
      'Small or micro text was enabled for a generated spatial image.',
      'Disabled small and micro text; use blank labels, symbols or simple indexing instead.',
    ));
  }
  const occupiedZones = new Set();
  if (budget.primaryAsset) occupiedZones.add(budget.primaryAsset.targetZone);
  budget.secondaryAssets = budget.secondaryAssets.filter((asset) => {
    const zones = asset.allowedZones.filter((zone) => !occupiedZones.has(zone));
    if (!zones.length) {
      budget.prohibitedAssetIds.push(asset.assetId);
      issues.push(densityIssue(
        'ASSET_ZONE_CONFLICT', 'error',
        `${asset.assetId} competed with the primary asset on the same architectural carrier.`,
        'Removed the lower-priority placement instead of stacking brand assets on one surface.',
      ));
      return false;
    }
    asset.allowedZones = zones;
    zones.forEach((zone) => occupiedZones.add(zone));
    return true;
  });
  const inheritsSpatialIdentity = budget.styleInheritance.palette
    && budget.styleInheritance.shapeLanguage
    && budget.styleInheritance.patternRhythm
    && budget.styleInheritance.spatialOrder;
  if (budget.brandIntensity === 'subtle' && !inheritsSpatialIdentity) {
    Object.assign(budget.styleInheritance, {
      palette: true, shapeLanguage: true, patternRhythm: true, spatialOrder: true,
    });
    issues.push(densityIssue(
      'BRAND_EXPRESSION_TOO_WEAK', 'warning',
      'The subtle scene relied on a mark without enough inherited brand order.',
      'Enabled palette, shape language, pattern rhythm and spatial order; no additional Logo was added.',
    ));
  }
  const textSafetyZones = orchestration.textSafetyZones.map((zone) => ({ ...zone }));
  if (!textSafetyZones.some((zone) => zone.zoneId === 'all_unplanned_surfaces' && zone.policy === 'no_text')) {
    textSafetyZones.push({
      zoneId: 'all_unplanned_surfaces',
      zoneDescription: 'Every unplanned architectural and furnishing surface',
      policy: 'no_text',
      maxTextGroups: 0,
    });
    issues.push(densityIssue(
      'BRAND_DENSITY_OVERFLOW', 'warning',
      'Unplanned surfaces did not have a fail-closed text policy.',
      'Added a no-text policy for every unplanned surface.',
    ));
  }
  return {
    ...orchestration,
    assetBudget: {
      ...budget,
      prohibitedAssetIds: [...new Set(budget.prohibitedAssetIds)],
    },
    textSafetyZones,
    densityIssues: [...orchestration.densityIssues, ...issues],
  };
}

export { SCENE_ROLE_DEFAULTS };
