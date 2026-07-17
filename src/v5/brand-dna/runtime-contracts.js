const EVIDENCE_STATUSES = ['confirmed', 'inferred', 'suggested', 'conflicting', 'missing'];
const MODEL_FACT_STATUSES = ['explicit', 'implicit', 'uncertain'];
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'];
const GENE_TYPES = ['functional', 'capability', 'relational', 'emotional', 'cultural', 'behavioral', 'aesthetic'];
const IMAGE_ROLES = [
  'anchor-image', 'brand-poster', 'product-or-service-scene', 'packaging-concept',
  'visual-system', 'application-scene', 'detail-craft', 'custom'
];

function fail(path, expected) {
  throw new Error(`${path} 必须是${expected}`);
}

export function objectValue(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, '对象');
  return value;
}

export function stringValue(value, path, options = {}) {
  if (typeof value !== 'string') fail(path, '字符串');
  const result = value.trim();
  if (!options.allowEmpty && !result) fail(path, '非空字符串');
  if (options.maxLength && result.length > options.maxLength) {
    throw new Error(`${path} 不得超过 ${options.maxLength} 个字符`);
  }
  return result;
}

export function numberValue(value, path, options = {}) {
  if (!Number.isFinite(value)) fail(path, '有限数字');
  if (options.min !== undefined && value < options.min) throw new Error(`${path} 不得小于 ${options.min}`);
  if (options.max !== undefined && value > options.max) throw new Error(`${path} 不得大于 ${options.max}`);
  return value;
}

export function integerValue(value, path, options = {}) {
  if (!Number.isInteger(value)) fail(path, '整数');
  return numberValue(value, path, options);
}

export function enumValue(value, allowed, path) {
  if (!allowed.includes(value)) throw new Error(`${path} 必须是 ${allowed.join('|')} 之一`);
  return value;
}

export function arrayValue(value, path, options = {}) {
  if (!Array.isArray(value)) fail(path, '数组');
  if (options.min !== undefined && value.length < options.min) throw new Error(`${path} 至少需要 ${options.min} 项`);
  if (options.max !== undefined && value.length > options.max) throw new Error(`${path} 最多允许 ${options.max} 项`);
  return value;
}

export function stringArray(value, path, options = {}) {
  return arrayValue(value, path, options).map((item, index) =>
    stringValue(item, `${path}[${index}]`, { maxLength: options.itemMaxLength })
  );
}

function brandFact(value, path) {
  const item = objectValue(value, path);
  const status = enumValue(item.status, EVIDENCE_STATUSES, `${path}.status`);
  return {
    value: stringValue(item.value, `${path}.value`),
    status,
    confidence: enumValue(item.confidence, CONFIDENCE_LEVELS, `${path}.confidence`),
    evidenceIds: stringArray(item.evidenceIds, `${path}.evidenceIds`, {
      min: status === 'confirmed' ? 1 : 0,
      itemMaxLength: 80
    }),
    evidence: Array.isArray(item.evidence) ? item.evidence : [],
    ...(typeof item.note === 'string' && item.note.trim() ? { note: item.note.trim() } : {})
  };
}

function brandFactArray(value, path, options = {}) {
  return arrayValue(value, path, options).map((item, index) => brandFact(item, `${path}[${index}]`));
}

function evidenceBackedItem(value, path, evidenceIds) {
  const item = objectValue(value, path);
  const status = enumValue(item.status, ['confirmed', 'inferred', 'conflicting', 'missing'], `${path}.status`);
  const refs = stringArray(item.evidenceIds, `${path}.evidenceIds`, { min: status === 'missing' ? 0 : 1 });
  if (refs.some((id) => !evidenceIds.has(id))) throw new Error(`${path}.evidenceIds 包含未知证据`);
  return {
    statement: stringValue(item.statement, `${path}.statement`),
    status,
    evidenceIds: refs,
    confidence: numberValue(item.confidence, `${path}.confidence`, { min: 0, max: 1 })
  };
}

function evidenceBackedArray(value, path, evidenceIds, options = {}) {
  return arrayValue(value, path, options).map((item, index) =>
    evidenceBackedItem(item, `${path}[${index}]`, evidenceIds)
  );
}

export function validateStrategicModelContract(value, evidenceIds) {
  const model = objectValue(value, 'strategicModel');
  const single = (key) => evidenceBackedItem(model[key], `strategicModel.${key}`, evidenceIds);
  const many = (key) => evidenceBackedArray(model[key], `strategicModel.${key}`, evidenceIds, { min: 1 });
  return {
    categoryDefinition: single('categoryDefinition'),
    businessReality: single('businessReality'),
    primaryAudience: many('primaryAudience'),
    userContext: many('userContext'),
    jobsToBeDone: many('jobsToBeDone'),
    barriersAndTensions: many('barriersAndTensions'),
    functionalValue: many('functionalValue'),
    emotionalValue: many('emotionalValue'),
    socialValue: many('socialValue'),
    positioning: single('positioning'),
    brandPromise: single('brandPromise'),
    reasonsToBelieve: many('reasonsToBelieve'),
    differentiators: many('differentiators'),
    relationshipModel: single('relationshipModel')
  };
}

export function validateBrandDnaCoreContract(value) {
  const dna = objectValue(value, 'brandDna');
  const audience = objectValue(dna.audience, 'brandDna.audience');
  const strategy = objectValue(dna.strategy, 'brandDna.strategy');
  const personality = objectValue(dna.personality, 'brandDna.personality');
  const culture = objectValue(dna.culture, 'brandDna.culture');
  const boundaries = objectValue(dna.boundaries, 'brandDna.boundaries');
  const diagnosis = objectValue(dna.diagnosis, 'brandDna.diagnosis');
  const genes = arrayValue(dna.genes, 'brandDna.genes', { min: 5, max: 8 }).map((gene, index) => {
    const path = `brandDna.genes[${index}]`;
    const item = objectValue(gene, path);
    return {
      id: stringValue(item.id, `${path}.id`),
      type: enumValue(item.type, GENE_TYPES, `${path}.type`),
      statement: stringValue(item.statement, `${path}.statement`),
      evidenceIds: stringArray(item.evidenceIds, `${path}.evidenceIds`, { min: 1 }),
      confidence: enumValue(item.confidence, CONFIDENCE_LEVELS, `${path}.confidence`),
      relationships: stringArray(item.relationships, `${path}.relationships`),
      brandDecisionImpact: stringArray(item.brandDecisionImpact, `${path}.brandDecisionImpact`, { min: 1 }),
      visualDecisionImpact: stringArray(item.visualDecisionImpact, `${path}.visualDecisionImpact`, { min: 1 }),
      mustNotBeMisreadAs: stringArray(item.mustNotBeMisreadAs, `${path}.mustNotBeMisreadAs`, { min: 1 }),
      evidence: Array.isArray(item.evidence) ? item.evidence : []
    };
  });
  if (new Set(genes.map((gene) => gene.id)).size !== genes.length) throw new Error('brandDna.genes 包含重复 ID');
  return {
    projectName: brandFact(dna.projectName, 'brandDna.projectName'),
    brandName: brandFact(dna.brandName, 'brandDna.brandName'),
    category: brandFact(dna.category, 'brandDna.category'),
    businessModel: brandFact(dna.businessModel, 'brandDna.businessModel'),
    developmentStage: brandFact(dna.developmentStage, 'brandDna.developmentStage'),
    audience: {
      primary: brandFactArray(audience.primary, 'brandDna.audience.primary', { min: 1 }),
      secondary: brandFactArray(audience.secondary, 'brandDna.audience.secondary'),
      needs: brandFactArray(audience.needs, 'brandDna.audience.needs', { min: 1 }),
      barriers: brandFactArray(audience.barriers, 'brandDna.audience.barriers'),
      usageScenarios: brandFactArray(audience.usageScenarios, 'brandDna.audience.usageScenarios')
    },
    strategy: {
      purpose: brandFact(strategy.purpose, 'brandDna.strategy.purpose'),
      positioning: brandFact(strategy.positioning, 'brandDna.strategy.positioning'),
      brandPromise: brandFact(strategy.brandPromise, 'brandDna.strategy.brandPromise'),
      differentiators: brandFactArray(strategy.differentiators, 'brandDna.strategy.differentiators', { min: 1 }),
      valueProposition: brandFactArray(strategy.valueProposition, 'brandDna.strategy.valueProposition', { min: 1 }),
      brandValues: brandFactArray(strategy.brandValues, 'brandDna.strategy.brandValues', { min: 1 })
    },
    personality: {
      traits: brandFactArray(personality.traits, 'brandDna.personality.traits', { min: 1 }),
      relationshipRole: brandFact(personality.relationshipRole, 'brandDna.personality.relationshipRole'),
      toneOfVoice: brandFactArray(personality.toneOfVoice, 'brandDna.personality.toneOfVoice', { min: 1 }),
      emotionalOutcome: brandFactArray(personality.emotionalOutcome, 'brandDna.personality.emotionalOutcome', { min: 1 })
    },
    culture: {
      culturalContext: brandFactArray(culture.culturalContext, 'brandDna.culture.culturalContext'),
      symbolicAssets: brandFactArray(culture.symbolicAssets, 'brandDna.culture.symbolicAssets'),
      narrativeThemes: brandFactArray(culture.narrativeThemes, 'brandDna.culture.narrativeThemes')
    },
    boundaries: {
      prohibitedClaims: brandFactArray(boundaries.prohibitedClaims, 'brandDna.boundaries.prohibitedClaims'),
      prohibitedStyles: brandFactArray(boundaries.prohibitedStyles, 'brandDna.boundaries.prohibitedStyles'),
      complianceRisks: brandFactArray(boundaries.complianceRisks, 'brandDna.boundaries.complianceRisks')
    },
    genes,
    oneSentenceDna: stringValue(dna.oneSentenceDna, 'brandDna.oneSentenceDna'),
    diagnosis: {
      conflicts: stringArray(diagnosis.conflicts, 'brandDna.diagnosis.conflicts'),
      missingInformation: stringArray(diagnosis.missingInformation, 'brandDna.diagnosis.missingInformation'),
      genericStatements: stringArray(diagnosis.genericStatements, 'brandDna.diagnosis.genericStatements'),
      strategicRisks: stringArray(diagnosis.strategicRisks, 'brandDna.diagnosis.strategicRisks')
    }
  };
}

function creativeDirectionArray(value, path) {
  return arrayValue(value, path, { min: 1 }).map((direction, index) => {
    const itemPath = `${path}[${index}]`;
    const item = objectValue(direction, itemPath);
    return {
      direction: stringValue(item.direction, `${itemPath}.direction`),
      rationale: stringValue(item.rationale, `${itemPath}.rationale`),
      actions: stringArray(item.actions, `${itemPath}.actions`, { min: 1 })
    };
  });
}

export function validateImageSystemContract(value) {
  const system = objectValue(value, 'imageSystem');
  const colorSystem = arrayValue(system.colorSystem, 'imageSystem.colorSystem', { min: 1 }).map((color, index) => {
    const path = `imageSystem.colorSystem[${index}]`;
    const item = objectValue(color, path);
    return {
      role: stringValue(item.role, `${path}.role`),
      direction: stringValue(item.direction, `${path}.direction`),
      usage: stringValue(item.usage, `${path}.usage`)
    };
  });
  return {
    systemId: stringValue(system.systemId, 'imageSystem.systemId'),
    brandDnaSummary: stringValue(system.brandDnaSummary, 'imageSystem.brandDnaSummary'),
    creativeThesis: stringValue(system.creativeThesis, 'imageSystem.creativeThesis'),
    anchorVisual: stringValue(system.anchorVisual, 'imageSystem.anchorVisual'),
    visualPersonality: stringArray(system.visualPersonality, 'imageSystem.visualPersonality', { min: 1 }),
    compositionSystem: stringValue(system.compositionSystem, 'imageSystem.compositionSystem'),
    colorSystem,
    materialSystem: stringArray(system.materialSystem, 'imageSystem.materialSystem', { min: 1 }),
    lightingSystem: stringValue(system.lightingSystem, 'imageSystem.lightingSystem'),
    imageLanguage: stringValue(system.imageLanguage, 'imageSystem.imageLanguage'),
    consistencyRules: stringArray(system.consistencyRules, 'imageSystem.consistencyRules', { min: 1 }),
    lockedFacts: stringArray(system.lockedFacts, 'imageSystem.lockedFacts', { min: 1 }),
    knownAssets: stringArray(system.knownAssets, 'imageSystem.knownAssets'),
    creativeFreedom: stringArray(system.creativeFreedom, 'imageSystem.creativeFreedom', { min: 1 }),
    globalProhibitions: stringArray(system.globalProhibitions, 'imageSystem.globalProhibitions', { min: 1 }),
    textPolicy: stringValue(system.textPolicy, 'imageSystem.textPolicy'),
    logoPolicy: stringValue(system.logoPolicy, 'imageSystem.logoPolicy')
  };
}

export function validateVisualTranslationContract(value, geneIds) {
  const translation = objectValue(value, 'visualTranslation');
  const creative = objectValue(translation.creativeTranslation, 'visualTranslation.creativeTranslation');
  const mappings = arrayValue(translation.mappings, 'visualTranslation.mappings', { min: 5 }).map((mapping, index) => {
    const path = `visualTranslation.mappings[${index}]`;
    const item = objectValue(mapping, path);
    const dnaGeneId = stringValue(item.dnaGeneId, `${path}.dnaGeneId`);
    if (!geneIds.has(dnaGeneId)) throw new Error(`${path}.dnaGeneId 引用了未知基因`);
    return {
      dnaGeneId,
      strategicMeaning: stringValue(item.strategicMeaning, `${path}.strategicMeaning`),
      visualVariable: enumValue(item.visualVariable, [
        'composition', 'color', 'shape', 'typography', 'material', 'lighting',
        'photography', 'illustration', 'motion', 'space', 'rhythm'
      ], `${path}.visualVariable`),
      decision: stringValue(item.decision, `${path}.decision`),
      rationale: stringValue(item.rationale, `${path}.rationale`),
      applicationExamples: stringArray(item.applicationExamples, `${path}.applicationExamples`, { min: 1 }),
      avoid: stringArray(item.avoid, `${path}.avoid`, { min: 1 })
    };
  });
  return {
    creativeTranslation: {
      visualPersonality: stringArray(creative.visualPersonality, 'visualTranslation.creativeTranslation.visualPersonality', { min: 1 }),
      visualKeywords: stringArray(creative.visualKeywords, 'visualTranslation.creativeTranslation.visualKeywords', { min: 1 }),
      emotionalTemperature: stringArray(creative.emotionalTemperature, 'visualTranslation.creativeTranslation.emotionalTemperature', { min: 1 }),
      colorDirection: creativeDirectionArray(creative.colorDirection, 'visualTranslation.creativeTranslation.colorDirection'),
      typographyDirection: creativeDirectionArray(creative.typographyDirection, 'visualTranslation.creativeTranslation.typographyDirection'),
      graphicDirection: creativeDirectionArray(creative.graphicDirection, 'visualTranslation.creativeTranslation.graphicDirection'),
      compositionDirection: creativeDirectionArray(creative.compositionDirection, 'visualTranslation.creativeTranslation.compositionDirection'),
      photographyDirection: creativeDirectionArray(creative.photographyDirection, 'visualTranslation.creativeTranslation.photographyDirection'),
      illustrationDirection: creativeDirectionArray(creative.illustrationDirection, 'visualTranslation.creativeTranslation.illustrationDirection'),
      materialDirection: creativeDirectionArray(creative.materialDirection, 'visualTranslation.creativeTranslation.materialDirection'),
      lightingDirection: creativeDirectionArray(creative.lightingDirection, 'visualTranslation.creativeTranslation.lightingDirection'),
      motionDirection: creativeDirectionArray(creative.motionDirection, 'visualTranslation.creativeTranslation.motionDirection'),
      suggestedAssets: stringArray(creative.suggestedAssets, 'visualTranslation.creativeTranslation.suggestedAssets', { min: 1 }),
      avoidDirections: stringArray(creative.avoidDirections, 'visualTranslation.creativeTranslation.avoidDirections', { min: 1 })
    },
    mappings
  };
}

export function validateImageTasksContract(value, imageSystem, geneIds) {
  const tasks = arrayValue(value, 'imageTasks', { min: 4, max: 8 }).map((task, index) => {
    const path = `imageTasks[${index}]`;
    const item = objectValue(task, path);
    const systemId = stringValue(item.systemId, `${path}.systemId`);
    if (systemId !== imageSystem.systemId) throw new Error(`${path}.systemId 与全局视觉系统不一致`);
    const brandDnaBasis = stringArray(item.brandDnaBasis, `${path}.brandDnaBasis`, { min: 1 });
    if (brandDnaBasis.some((id) => !geneIds.has(id))) throw new Error(`${path}.brandDnaBasis 引用了未知基因`);
    return {
      id: stringValue(item.id, `${path}.id`),
      systemId,
      sequence: integerValue(item.sequence, `${path}.sequence`, { min: 1 }),
      title: stringValue(item.title, `${path}.title`),
      role: enumValue(item.role, IMAGE_ROLES, `${path}.role`),
      objective: stringValue(item.objective, `${path}.objective`),
      brandDnaBasis,
      viewerTakeaway: stringValue(item.viewerTakeaway, `${path}.viewerTakeaway`),
      subject: stringValue(item.subject, `${path}.subject`),
      environment: stringValue(item.environment, `${path}.environment`),
      narrativeMoment: stringValue(item.narrativeMoment, `${path}.narrativeMoment`),
      composition: stringValue(item.composition, `${path}.composition`),
      focalHierarchy: stringValue(item.focalHierarchy, `${path}.focalHierarchy`),
      cameraAndPerspective: stringValue(item.cameraAndPerspective, `${path}.cameraAndPerspective`),
      colorDirection: stringValue(item.colorDirection, `${path}.colorDirection`),
      materialAndTexture: stringValue(item.materialAndTexture, `${path}.materialAndTexture`),
      lighting: stringValue(item.lighting, `${path}.lighting`),
      atmosphere: stringValue(item.atmosphere, `${path}.atmosphere`),
      requiredElements: stringArray(item.requiredElements, `${path}.requiredElements`, { min: 1 }),
      optionalElements: stringArray(item.optionalElements, `${path}.optionalElements`),
      prohibitedElements: stringArray(item.prohibitedElements, `${path}.prohibitedElements`, { min: 1 }),
      lockedAssetInstructions: stringArray(item.lockedAssetInstructions, `${path}.lockedAssetInstructions`, { min: 1 }),
      textPolicy: stringValue(item.textPolicy, `${path}.textPolicy`),
      logoPolicy: stringValue(item.logoPolicy, `${path}.logoPolicy`),
      consistencyWithPreviousTasks: stringArray(item.consistencyWithPreviousTasks, `${path}.consistencyWithPreviousTasks`, { min: 1 }),
      intentionalDifferenceFromPreviousTasks: stringArray(item.intentionalDifferenceFromPreviousTasks, `${path}.intentionalDifferenceFromPreviousTasks`, { min: 1 }),
      aspectRatio: stringValue(item.aspectRatio, `${path}.aspectRatio`),
      outputResponsibility: stringValue(item.outputResponsibility, `${path}.outputResponsibility`),
      finalPrompt: stringValue(item.finalPrompt, `${path}.finalPrompt`, { maxLength: 4000 })
    };
  });
  if (tasks[0].role !== 'anchor-image') throw new Error('imageTasks[0].role 必须是 anchor-image');
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) throw new Error('imageTasks 包含重复 ID');
  return tasks;
}

export function validateEvidenceItemContract(value, path, chunkIds) {
  const item = objectValue(value, path);
  const refs = arrayValue(item.sourceRefs, `${path}.sourceRefs`, { min: 1, max: 2 }).map((ref, index) => {
    const refPath = `${path}.sourceRefs[${index}]`;
    const source = objectValue(ref, refPath);
    const chunkId = stringValue(source.chunkId, `${refPath}.chunkId`);
    if (!chunkIds.has(chunkId)) throw new Error(`${refPath}.chunkId 引用了未知片段`);
    return {
      sourceId: stringValue(source.sourceId, `${refPath}.sourceId`),
      chunkId,
      excerpt: stringValue(source.excerpt, `${refPath}.excerpt`, { maxLength: 240 })
    };
  });
  return {
    id: stringValue(item.id, `${path}.id`),
    claim: stringValue(item.claim, `${path}.claim`, { maxLength: 300 }),
    category: enumValue(item.category, [
      'project', 'business', 'product', 'audience', 'market', 'positioning',
      'value', 'personality', 'channel', 'constraint', 'visual', 'risk'
    ], `${path}.category`),
    status: enumValue(item.status, MODEL_FACT_STATUSES, `${path}.status`),
    sourceRefs: refs,
    confidence: numberValue(item.confidence, `${path}.confidence`, { min: 0, max: 1 })
  };
}
