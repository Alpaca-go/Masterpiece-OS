import crypto from 'node:crypto';

export const STYLE_PROFILE_COMPILER_VERSION = '1.0.0';

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value).trim()).filter(Boolean))];
}

function text(value, fallback = '') {
  return String(value ?? fallback).trim();
}

function semver(value) {
  if (!/^\d+\.\d+\.\d+$/.test(String(value))) {
    throw Object.assign(new Error(`Style Profile 版本无效：${value}`), { code: 'STYLE_PROFILE_INVALID' });
  }
  return String(value);
}

export function nextStyleProfileVersion(current, level = 'minor') {
  const [major, minor, patch] = semver(current).split('.').map(Number);
  if (level === 'major') return `${major + 1}.0.0`;
  if (level === 'minor') return `${major}.${minor + 1}.0`;
  if (level === 'patch') return `${major}.${minor}.${patch + 1}`;
  throw Object.assign(new Error(`未知版本级别：${level}`), { code: 'STYLE_PROFILE_INVALID' });
}

export function normalizeCreativeDecision(input) {
  if (input?.schemaVersion === '6.0' && input?.primaryDirection) return input;
  if (input?.schemaVersion === '2.0' && input?.decisionId) {
    const priority = (prefix) => unique(input.visualPriorities)
      .filter((item) => item.toLowerCase().startsWith(`${prefix}:`))
      .map((item) => item.slice(prefix.length + 1).trim())
      .filter(Boolean);
    return {
      schemaVersion: '6.0',
      id: input.decisionId,
      projectId: input.projectId,
      version: input.version || '2.0.0',
      brandCoreJudgment: unique([input.strategicDirection?.brandRole]),
      currentVisualProblems: unique(input.prohibitedExpressions),
      retainedAssets: unique((input.lockedAssetDecisions || [])
        .filter((item) => item.decision === 'locked')
        .map((item) => item.rationale)),
      reconstructableAssets: unique((input.lockedAssetDecisions || [])
        .filter((item) => item.decision === 'reconstructable' || item.decision === 'controlled_edit')
        .map((item) => item.rationale)),
      inheritedReferenceMechanisms: unique(input.coreVisualMechanism?.sourceMechanisms),
      prohibitedReferenceContent: unique(input.prohibitedExpressions),
      visualUpgradeThesis: text(input.strategicDirection?.proposition),
      primaryDirection: {
        name: text(input.coreVisualMechanism?.concept, 'Confirmed Direction'),
        summary: text(input.coreVisualMechanism?.generationLogic, input.strategicDirection?.proposition),
        keywords: unique([
          input.coreVisualMechanism?.visualHammer,
          input.coreVisualMechanism?.languageNail,
          ...unique(input.coreVisualMechanism?.sourceMechanisms),
        ]).slice(0, 8),
        mood: unique(input.brandPerceptionGoal),
      },
      styleBoundaries: {
        allowed: unique(input.allowedVariations),
        forbidden: unique(input.prohibitedExpressions),
      },
      outputPriorities: unique(input.touchpointPriorities),
      risks: unique(input.knownRisks),
      createdAt: input.generatedAt || new Date().toISOString(),
      _compat: {
        direction: {
          compositionStrategy: priority('composition'),
          colorRelationship: priority('color'),
          typographyRelationship: priority('typography'),
          materialAndLighting: priority('image_material'),
          sceneMechanism: [text(input.coreVisualMechanism?.generationLogic)].filter(Boolean),
        },
        mustChange: {},
      },
    };
  }
  const direction = input?.newDirection ?? {};
  const mustChange = input?.mustChange ?? {};
  const preserve = input?.preserve ?? {};
  const projectId = text(input?.projectId);
  if (!projectId) throw Object.assign(new Error('Creative Decision 缺少 projectId。'), { code: 'CREATIVE_DECISION_MISSING' });
  return {
    schemaVersion: '6.0',
    id: input?.id || `creative-decision-${input?.runId || crypto.randomUUID()}`,
    projectId,
    version: text(input?.version, '1.0.0'),
    brandCoreJudgment: unique(preserve.identity),
    currentVisualProblems: unique([
      ...unique(mustChange.composition),
      ...unique(mustChange.hierarchy),
      ...unique(mustChange.graphicLanguage),
    ]),
    retainedAssets: unique([
      ...unique(preserve.identity),
      ...unique(preserve.visualAssets),
      ...unique(preserve.structures),
    ]),
    reconstructableAssets: unique([
      ...unique(mustChange.composition),
      ...unique(mustChange.graphicLanguage),
      ...unique(mustChange.material),
      ...unique(mustChange.photography),
    ]),
    inheritedReferenceMechanisms: unique(input?.inheritedReferenceMechanisms),
    prohibitedReferenceContent: unique(input?.prohibitedCarryover),
    visualUpgradeThesis: text(direction.visualAnchor, '建立一致、可延展的品牌视觉系统'),
    primaryDirection: {
      name: text(input?.primaryDirection?.name, 'Primary Direction'),
      summary: text(direction.sceneMechanism, direction.visualAnchor || '建立统一视觉方向'),
      keywords: unique([
        ...unique(direction.colorRelationship),
        ...unique(direction.materialAndLighting),
      ]).slice(0, 8),
      mood: unique(input?.mood),
    },
    styleBoundaries: {
      allowed: unique([
        ...unique(direction.compositionStrategy),
        ...unique(direction.materialAndLighting),
      ]),
      forbidden: unique(input?.prohibitedCarryover),
    },
    outputPriorities: unique(input?.outputPriorities),
    risks: unique(input?.warnings),
    createdAt: input?.generatedAt || new Date().toISOString(),
    _compat: { direction, mustChange },
  };
}

export function compileStyleProfile(input, now = new Date().toISOString()) {
  const decision = normalizeCreativeDecision(input?.creativeDecision);
  const direction = decision._compat?.direction ?? input?.creativeDecision?.newDirection ?? {};
  const mustChange = decision._compat?.mustChange ?? input?.creativeDecision?.mustChange ?? {};
  const profile = {
    schemaVersion: '6.0',
    id: input?.id || `style-profile-${crypto.randomUUID()}`,
    projectId: decision.projectId,
    name: text(input?.name, `${decision.primaryDirection.name} Style Profile`),
    version: semver(input?.version || '1.0.0'),
    status: input?.status || 'draft',
    styleEssence: {
      summary: text(decision.primaryDirection.summary, decision.visualUpgradeThesis),
      keywords: unique(decision.primaryDirection.keywords),
      mood: unique(decision.primaryDirection.mood),
      visualPositioning: text(decision.visualUpgradeThesis),
    },
    colorSystem: {
      primary: unique(input?.overrides?.colorSystem?.primary),
      secondary: unique(input?.overrides?.colorSystem?.secondary),
      neutral: unique(input?.overrides?.colorSystem?.neutral),
      accent: unique(input?.overrides?.colorSystem?.accent),
      distributionRules: unique(direction.colorRelationship),
      forbiddenColors: unique(input?.overrides?.colorSystem?.forbiddenColors),
    },
    shapeLanguage: {
      geometry: unique(input?.overrides?.shapeLanguage?.geometry),
      silhouetteRules: unique(input?.overrides?.shapeLanguage?.silhouetteRules),
      proportionRules: unique(input?.overrides?.shapeLanguage?.proportionRules),
    },
    graphicLanguage: {
      coreMotifs: unique(input?.overrides?.graphicLanguage?.coreMotifs),
      patternRules: unique(mustChange.graphicLanguage),
      lineRules: unique(input?.overrides?.graphicLanguage?.lineRules),
      illustrationRules: unique(input?.overrides?.graphicLanguage?.illustrationRules),
      layoutRhythm: unique(direction.compositionStrategy),
    },
    compositionSystem: {
      hierarchy: unique([
        ...unique(direction.informationHierarchy),
        ...unique(mustChange.hierarchy),
      ]),
      density: text(input?.overrides?.compositionSystem?.density, '由 Primary Canon 校准'),
      negativeSpace: text(input?.overrides?.compositionSystem?.negativeSpace, '保留清晰呼吸区'),
      focalPointRules: unique(direction.compositionStrategy),
      cameraRules: unique(mustChange.photography),
      croppingRules: unique(input?.overrides?.compositionSystem?.croppingRules),
    },
    materialAndTexture: {
      materials: unique(direction.materialAndLighting),
      surfaceRules: unique(mustChange.material),
      printFeeling: unique(input?.overrides?.materialAndTexture?.printFeeling),
      renderingRules: unique(mustChange.photography),
      forbiddenTextures: unique(input?.overrides?.materialAndTexture?.forbiddenTextures),
    },
    lightingSystem: {
      type: text(input?.overrides?.lightingSystem?.type, direction.materialAndLighting?.[0] || ''),
      contrast: text(input?.overrides?.lightingSystem?.contrast),
      shadow: text(input?.overrides?.lightingSystem?.shadow),
      temperature: text(input?.overrides?.lightingSystem?.temperature),
    },
    typographyCompatibility: unique(direction.typographyRelationship),
    allowedVariations: unique(decision.styleBoundaries.allowed),
    forbiddenVariations: unique([
      ...decision.styleBoundaries.forbidden,
      ...decision.prohibitedReferenceContent,
    ]),
    promptComponents: {
      required: unique([
        decision.visualUpgradeThesis,
        ...decision.retainedAssets,
      ]),
      positive: unique([
        ...decision.primaryDirection.keywords,
        ...decision.styleBoundaries.allowed,
      ]),
      negative: unique([
        ...decision.styleBoundaries.forbidden,
        ...decision.prohibitedReferenceContent,
      ]),
    },
    source: {
      creativeDecisionId: decision.id,
      creativeDecisionVersion: decision.version,
      compilerVersion: input?.compilerVersion || STYLE_PROFILE_COMPILER_VERSION,
    },
    createdAt: now,
    updatedAt: now,
  };
  return validateStyleProfile(profile);
}

export function validateStyleProfile(profile) {
  if (!profile || profile.schemaVersion !== '6.0') {
    throw Object.assign(new Error('Style Profile Schema 版本无效。'), { code: 'STYLE_PROFILE_INVALID' });
  }
  for (const field of ['id', 'projectId', 'name', 'version']) {
    if (!text(profile[field])) throw Object.assign(new Error(`Style Profile ${field} 不能为空。`), { code: 'STYLE_PROFILE_INVALID' });
  }
  semver(profile.version);
  if (!['draft', 'confirmed', 'superseded'].includes(profile.status)) {
    throw Object.assign(new Error('Style Profile 状态无效。'), { code: 'STYLE_PROFILE_INVALID' });
  }
  if (!text(profile.styleEssence?.summary) || !text(profile.styleEssence?.visualPositioning)) {
    throw Object.assign(new Error('Style Essence 缺少 summary 或 visualPositioning。'), { code: 'STYLE_PROFILE_INVALID' });
  }
  if (!profile.promptComponents?.required?.length) {
    throw Object.assign(new Error('Style Profile 缺少 required Prompt Components。'), { code: 'STYLE_PROFILE_INVALID' });
  }
  const prohibited = unique(profile.forbiddenVariations).map((item) => item.toLowerCase());
  const positive = unique([...profile.promptComponents.required, ...profile.promptComponents.positive]).map((item) => item.toLowerCase());
  if (prohibited.some((rule) => positive.includes(rule))) {
    throw Object.assign(new Error('Style Profile 的正向与禁止规则发生冲突。'), { code: 'STYLE_PROFILE_INVALID' });
  }
  return profile;
}
