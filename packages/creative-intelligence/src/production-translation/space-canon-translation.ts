/**
 * Space Canon Translation.
 *
 * CI-9 Step 5: Translate the Visual Canon into a SpaceTranslationContract
 * that captures spatial identity, zone relationships, environmental
 * graphics, wayfinding, material behavior, brand presence, and scale
 * adaptation rules. NO production specs (no camera, lens, lighting, render,
 * seed, aspect ratio, provider, prompt).
 *
 * CI-9 is a TRANSLATION layer. It does NOT switch Space production
 * consumers in this phase. The space chain's existing input is read in
 * the comparison adapter only.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationContext,
  ProductionTranslationTrace,
  ProductionTranslationDiagnostic,
  SpaceAdaptationRule,
  SpaceTranslationContract,
} from './contracts.ts';
import {
  PRODUCTION_TRANSLATION_TRACE_VERSION,
} from './contracts.ts';
import {
  buildTranslationVersion,
  buildTranslationFingerprint,
  validateMediaContract,
} from './translation-boundary.ts';

export interface BuildSpaceTranslationInput {
  ctx: ProductionTranslationContext;
}

export interface BuildSpaceTranslationResult {
  contract: SpaceTranslationContract | null;
  diagnostics: ProductionTranslationDiagnostic[];
}

const SPACE_PROHIBITED_DRIFT = [
  'Specific lobby layout',
  'Photography angle',
  'Lighting prompt',
  'Render parameters',
  'Aspect ratio',
  'Provider prompt',
  'Seed',
  'New direction family',
  'New visual mechanism',
  'New brand identity',
  'Locked asset redesign',
  'Reference identity override',
];

const BASE_SPACE_RULES: Omit<SpaceAdaptationRule, 'sourceRef'>[] = [
  { id: 'sp.id.primary', rule: 'Maintain the selected Direction as the primary spatial identity source.', invariantLevel: 'hard' },
  { id: 'sp.id.mechanism', rule: 'Spatial expression must serve the selected visualMechanism, not introduce a new one.', invariantLevel: 'hard' },
  { id: 'sp.id.family', rule: 'Direction family constrains the spatial logic family; do not cross families.', invariantLevel: 'hard' },
  { id: 'sp.id.brand', rule: 'Brand identity and Locked Assets remain invariant in space.', invariantLevel: 'hard' },
  { id: 'sp.zone.adjacency', rule: 'Zone relationships follow hierarchy DNA, not arbitrary adjacency.', invariantLevel: 'strong' },
  { id: 'sp.zone.scale', rule: 'Zone scale may adapt to physical constraint while preserving relation logic.', invariantLevel: 'adaptive' },
  { id: 'sp.eg.grammar', rule: 'Environmental graphics use the same composition grammar as Canon.', invariantLevel: 'strong' },
  { id: 'sp.eg.locked', rule: 'Locked identity assets (logo, mark) appear in environmental graphics only via the Locked Asset Canon rule.', invariantLevel: 'hard' },
  { id: 'sp.way.system', rule: 'Wayfinding uses the hierarchy DNA for emphasis placement.', invariantLevel: 'strong' },
  { id: 'sp.way.density', rule: 'Wayfinding information density may adapt to foot traffic.', invariantLevel: 'adaptive' },
  { id: 'sp.mat.dna', rule: 'Material behavior must respect the material relationship rule from Canon.', invariantLevel: 'hard' },
  { id: 'sp.mat.scale', rule: 'Material density may adapt within the DNA relationship.', invariantLevel: 'adaptive' },
  { id: 'sp.brand.presence', rule: 'Brand presence uses the rhythm DNA for placement cadence.', invariantLevel: 'strong' },
  { id: 'sp.scale.zone', rule: 'Scale adaptation preserves relative size, not absolute size.', invariantLevel: 'strong' },
  { id: 'sp.scale.format', rule: 'Format ratio may adapt to spatial envelope.', invariantLevel: 'adaptive' },
];

function buildSpaceAdaptationRules(ctx: ProductionTranslationContext): SpaceAdaptationRule[] {
  const c = ctx.visualCanon;
  const allRules: SpaceAdaptationRule[] = [];

  for (const base of BASE_SPACE_RULES) {
    allRules.push({ ...base, sourceRef: c.selectedDirectionId });
  }

  // Map each color/material/typography/composition CanonRule into a space rule.
  const canonRules = [
    c.colorRelationship, c.materialRelationship, c.compositionLogic,
    c.typographyBehavior, c.graphicBehavior, c.imageBehavior,
  ].filter((r): r is NonNullable<typeof r> => !!r);

  for (const cr of canonRules) {
    allRules.push({
      id: `sp.fromcanon.${cr.id}`,
      rule: cr.statement,
      invariantLevel: cr.invariantLevel,
      sourceRef: cr.id,
    });
  }

  return allRules;
}

function bucketRules(rules: SpaceAdaptationRule[]): {
  spatialIdentityRules: SpaceAdaptationRule[];
  zoneRelationshipRules: SpaceAdaptationRule[];
  environmentalGraphicRules: SpaceAdaptationRule[];
  wayfindingRules: SpaceAdaptationRule[];
  materialBehaviorRules: SpaceAdaptationRule[];
  brandPresenceRules: SpaceAdaptationRule[];
  scaleAdaptationRules: SpaceAdaptationRule[];
} {
  const spatialIdentityRules: SpaceAdaptationRule[] = [];
  const zoneRelationshipRules: SpaceAdaptationRule[] = [];
  const environmentalGraphicRules: SpaceAdaptationRule[] = [];
  const wayfindingRules: SpaceAdaptationRule[] = [];
  const materialBehaviorRules: SpaceAdaptationRule[] = [];
  const brandPresenceRules: SpaceAdaptationRule[] = [];
  const scaleAdaptationRules: SpaceAdaptationRule[] = [];

  for (const r of rules) {
    if (r.id.startsWith('sp.id.')) spatialIdentityRules.push(r);
    else if (r.id.startsWith('sp.zone.')) zoneRelationshipRules.push(r);
    else if (r.id.startsWith('sp.eg.')) environmentalGraphicRules.push(r);
    else if (r.id.startsWith('sp.way.')) wayfindingRules.push(r);
    else if (r.id.startsWith('sp.mat.')) materialBehaviorRules.push(r);
    else if (r.id.startsWith('sp.brand.')) brandPresenceRules.push(r);
    else if (r.id.startsWith('sp.scale.')) scaleAdaptationRules.push(r);
    else spatialIdentityRules.push(r); // fromcanon → default to identity
  }

  return {
    spatialIdentityRules,
    zoneRelationshipRules,
    environmentalGraphicRules,
    wayfindingRules,
    materialBehaviorRules,
    brandPresenceRules,
    scaleAdaptationRules,
  };
}

function buildSpaceMustPreserve(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Direction family and visual mechanism',
    'Brand identity and Locked Assets',
    'Hard DNA categories (structural, identity, rhythm, hierarchy, relation)',
    'Hard VisualGrammar (composition + asset usage + forbidden combinations)',
    ...c.crossMediaCanon.adaptations['space'].mustPreserve,
  ];
}

function buildSpaceMayAdapt(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Physical scale',
    'Material density (within DNA relationship)',
    'Format ratio',
    ...c.crossMediaCanon.adaptations['space'].mayAdapt,
  ];
}

function buildSpaceMustNotIntroduce(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Camera angle',
    'Lighting prompt',
    'Render parameters',
    'Aspect ratio',
    'Provider prompt',
    'New visual mechanism',
    'New direction family',
    ...c.crossMediaCanon.adaptations['space'].mustNotIntroduce,
  ];
}

export function buildSpaceTranslation(
  input: BuildSpaceTranslationInput,
): BuildSpaceTranslationResult {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  const ctx = input.ctx;
  const c = ctx.visualCanon;

  // Required DNA / Grammar refs
  const requiredDNARefs = [
    ...c.visualDNA.requiredElementIds,
    ...c.visualDNA.structuralDNA.map((d) => d.id),
    ...c.visualDNA.identityDNA.map((d) => d.id),
    ...c.visualDNA.relationDNA.map((d) => d.id),
  ];
  const requiredGrammarRefs = [
    ...c.visualGrammar.compositionRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
    ...c.visualGrammar.assetUsageRules.filter((r) => r.invariantLevel === 'hard').map((r) => r.id),
  ];
  const lockedAssetRuleRefs = ctx.lockedAssetRules.map((r) => r.assetType);

  const trace: ProductionTranslationTrace = {
    selectedDirectionId: c.selectedDirectionId,
    canonVersion: ctx.canonVersion,
    dnaRefs: [...requiredDNARefs],
    grammarRefs: [...requiredGrammarRefs],
    lockedAssetRefs: [...lockedAssetRuleRefs],
    factRefs: [...c.trace.factRefs],
    evidenceRefs: [...c.trace.evidenceRefs],
    sourceFingerprint: `${ctx.selectedDirectionSnapshot.directionFingerprint}|${ctx.canonVersion}|space`,
  };

  const translationVersion = buildTranslationVersion(ctx.canonVersion, 'space');

  const rules = buildSpaceAdaptationRules(ctx);
  const buckets = bucketRules(rules);

  const baseContract: MediaTranslationContract = {
    schemaVersion: '0.1',
    projectId: ctx.projectId,
    media: 'space',
    selectedDirectionId: c.selectedDirectionId,
    selectionRevision: ctx.selectedDirectionSnapshot.selectionRevision,
    canonVersion: ctx.canonVersion,
    requiredDNARefs,
    requiredGrammarRefs,
    lockedAssetRuleRefs,
    mustPreserve: buildSpaceMustPreserve(ctx),
    mayAdapt: buildSpaceMayAdapt(ctx),
    mustNotIntroduce: buildSpaceMustNotIntroduce(ctx),
    trace,
    translationVersion,
    translationFingerprint: 'pending',
    status: c.status === 'blocked' ? 'blocked' : 'ready',
    authoritative: false,
    mode: 'shadow',
  };

  const contract: SpaceTranslationContract = {
    ...baseContract,
    media: 'space',
    ...buckets,
    prohibitedSpatialDrift: [...SPACE_PROHIBITED_DRIFT],
  };

  contract.translationFingerprint = buildTranslationFingerprint(contract);

  const validation = validateMediaContract(contract);
  diagnostics.push(...validation);

  if (c.status === 'blocked') {
    diagnostics.push({
      code: 'PT_CANON_BLOCKED',
      message: 'Space translation cannot proceed: VisualCanon is blocked',
    });
    return { contract: null, diagnostics };
  }

  return { contract, diagnostics };
}
