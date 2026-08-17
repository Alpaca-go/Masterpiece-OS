/**
 * Packaging Canon Translation.
 *
 * CI-9 Step 6: Translate the Visual Canon into a PackagingTranslationContract
 * that captures product identity, structure preservation, information
 * hierarchy, family system, material behavior, brand presence, and locked
 * copy rules. NO production specs (no box geometry, shot contract, render,
 * seed, aspect ratio, provider, prompt).
 *
 * CI-9 is a TRANSLATION layer. It does NOT switch Packaging production
 * consumers in this phase. The packaging chain's existing input is read in
 * the comparison adapter only.
 *
 * The frozen packaging contract semantics (analysis_led, reference_first,
 * frozen shot contracts, brand, logo, productIdentity, category, structure,
 * mandatoryCopy, confirmedComponents, execution identity, metadata,
 * fingerprint, provider behavior) are preserved as required identity rules,
 * not as production inputs.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationContext,
  ProductionTranslationTrace,
  ProductionTranslationDiagnostic,
  PackagingAdaptationRule,
  PackagingTranslationContract,
} from './contracts.ts';
import {
  PRODUCTION_TRANSLATION_TRACE_VERSION,
} from './contracts.ts';
import {
  buildTranslationVersion,
  buildTranslationFingerprint,
  validateMediaContract,
} from './translation-boundary.ts';

export interface BuildPackagingTranslationInput {
  ctx: ProductionTranslationContext;
}

export interface BuildPackagingTranslationResult {
  contract: PackagingTranslationContract | null;
  diagnostics: ProductionTranslationDiagnostic[];
}

const PACKAGING_PROHIBITED_DRIFT = [
  'Specific box geometry',
  'Shot contract',
  'Render prompt',
  'Aspect ratio',
  'Provider prompt',
  'Seed',
  'New direction family',
  'New visual mechanism',
  'New brand identity',
  'Locked asset redesign',
  'Reference identity override',
  'Mandatory copy replacement',
];

const BASE_PACKAGING_RULES: Omit<PackagingAdaptationRule, 'sourceRef'>[] = [
  // productIdentityRules
  { id: 'pk.pi.direction', rule: 'Product identity derives from the selected Direction family.', invariantLevel: 'hard' },
  { id: 'pk.pi.brand', rule: 'Brand name and Locked Asset identity remain invariant.', invariantLevel: 'hard' },
  { id: 'pk.pi.category', rule: 'Category signals follow the selected Direction visualMechanism.', invariantLevel: 'hard' },
  { id: 'pk.pi.dna', rule: 'Identity DNA of the selected Direction must appear in product identity.', invariantLevel: 'hard' },
  // structurePreservationRules
  { id: 'pk.st.analysis', rule: 'Packaging is analysis-led: structure reflects selected Direction analysis logic.', invariantLevel: 'hard' },
  { id: 'pk.st.reference', rule: 'Reference-First flow may contribute under existing reference policy; reference identity never outranks Canon identity.', invariantLevel: 'hard' },
  { id: 'pk.st.shot', rule: 'Frozen shot contracts are preserved; the translation does not introduce new shot contracts.', invariantLevel: 'hard' },
  { id: 'pk.st.modular', rule: 'Structure uses the modular identity grammar from VisualGrammar.', invariantLevel: 'strong' },
  // informationHierarchyRules
  { id: 'pk.ih.order', rule: 'Information order follows hierarchy DNA of the selected Direction.', invariantLevel: 'hard' },
  { id: 'pk.ih.density', rule: 'Information density may adapt to surface area while preserving order.', invariantLevel: 'adaptive' },
  { id: 'pk.ih.mandatory', rule: 'Mandatory copy elements are preserved exactly.', invariantLevel: 'hard' },
  // familySystemRules
  { id: 'pk.fs.system', rule: 'Family system follows the direction family and cross-media canon.', invariantLevel: 'strong' },
  { id: 'pk.fs.variant', rule: 'Variant logic respects forbidden combinations from VisualGrammar.', invariantLevel: 'hard' },
  { id: 'pk.fs.confirmed', rule: 'Confirmed components remain unchanged in family system.', invariantLevel: 'hard' },
  // materialBehaviorRules
  { id: 'pk.mat.dna', rule: 'Material behavior respects the material relationship rule from Canon.', invariantLevel: 'hard' },
  { id: 'pk.mat.scale', rule: 'Material behavior may adapt to format within DNA relationship.', invariantLevel: 'adaptive' },
  // brandPresenceRules
  { id: 'pk.bp.locked', rule: 'Locked identity assets (logo, mark) appear in packaging only via Locked Asset Canon rules.', invariantLevel: 'hard' },
  { id: 'pk.bp.rhythm', rule: 'Brand presence uses the rhythm DNA of the selected Direction.', invariantLevel: 'strong' },
  // lockedCopyRules
  { id: 'pk.lc.mandatory', rule: 'Mandatory copy elements are not changed by the translation.', invariantLevel: 'hard' },
  { id: 'pk.lc.confirmed', rule: 'Confirmed copy components are preserved exactly.', invariantLevel: 'hard' },
  { id: 'pk.lc.adaptive', rule: 'Auxiliary copy may adapt to surface area while preserving brand voice.', invariantLevel: 'adaptive' },
];

function buildPackagingAdaptationRules(ctx: ProductionTranslationContext): PackagingAdaptationRule[] {
  const c = ctx.visualCanon;
  const allRules: PackagingAdaptationRule[] = [];

  for (const base of BASE_PACKAGING_RULES) {
    allRules.push({ ...base, sourceRef: c.selectedDirectionId });
  }

  // Map each color/material/typography/composition CanonRule into a packaging rule.
  const canonRules = [
    c.colorRelationship, c.materialRelationship, c.compositionLogic,
    c.typographyBehavior, c.graphicBehavior, c.imageBehavior,
  ].filter((r): r is NonNullable<typeof r> => !!r);

  for (const cr of canonRules) {
    allRules.push({
      id: `pk.fromcanon.${cr.id}`,
      rule: cr.statement,
      invariantLevel: cr.invariantLevel,
      sourceRef: cr.id,
    });
  }

  return allRules;
}

function bucketRules(rules: PackagingAdaptationRule[]): {
  productIdentityRules: PackagingAdaptationRule[];
  structurePreservationRules: PackagingAdaptationRule[];
  informationHierarchyRules: PackagingAdaptationRule[];
  familySystemRules: PackagingAdaptationRule[];
  materialBehaviorRules: PackagingAdaptationRule[];
  brandPresenceRules: PackagingAdaptationRule[];
  lockedCopyRules: PackagingAdaptationRule[];
} {
  const productIdentityRules: PackagingAdaptationRule[] = [];
  const structurePreservationRules: PackagingAdaptationRule[] = [];
  const informationHierarchyRules: PackagingAdaptationRule[] = [];
  const familySystemRules: PackagingAdaptationRule[] = [];
  const materialBehaviorRules: PackagingAdaptationRule[] = [];
  const brandPresenceRules: PackagingAdaptationRule[] = [];
  const lockedCopyRules: PackagingAdaptationRule[] = [];

  for (const r of rules) {
    if (r.id.startsWith('pk.pi.')) productIdentityRules.push(r);
    else if (r.id.startsWith('pk.st.')) structurePreservationRules.push(r);
    else if (r.id.startsWith('pk.ih.')) informationHierarchyRules.push(r);
    else if (r.id.startsWith('pk.fs.')) familySystemRules.push(r);
    else if (r.id.startsWith('pk.mat.')) materialBehaviorRules.push(r);
    else if (r.id.startsWith('pk.bp.')) brandPresenceRules.push(r);
    else if (r.id.startsWith('pk.lc.')) lockedCopyRules.push(r);
    else productIdentityRules.push(r); // fromcanon → default to product identity
  }

  return {
    productIdentityRules,
    structurePreservationRules,
    informationHierarchyRules,
    familySystemRules,
    materialBehaviorRules,
    brandPresenceRules,
    lockedCopyRules,
  };
}

function buildPackagingMustPreserve(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Direction family and visual mechanism',
    'Brand identity and Locked Assets',
    'Hard DNA categories (structural, identity, rhythm, hierarchy, relation)',
    'Hard VisualGrammar (composition + asset usage + forbidden combinations)',
    'analysis_led execution',
    'reference_first policy compatibility',
    'frozen shot contracts',
    'mandatory copy',
    'confirmed components',
    ...c.crossMediaCanon.adaptations['packaging'].mustPreserve,
  ];
}

function buildPackagingMayAdapt(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Information density',
    'Material density (within DNA relationship)',
    'Auxiliary copy',
    ...c.crossMediaCanon.adaptations['packaging'].mayAdapt,
  ];
}

function buildPackagingMustNotIntroduce(ctx: ProductionTranslationContext): string[] {
  const c = ctx.visualCanon;
  return [
    'Specific box geometry',
    'Shot contract (replaces frozen one)',
    'Render prompt',
    'Aspect ratio',
    'Provider prompt',
    'New visual mechanism',
    'New direction family',
    'Locked asset redesign',
    ...c.crossMediaCanon.adaptations['packaging'].mustNotIntroduce,
  ];
}

export function buildPackagingTranslation(
  input: BuildPackagingTranslationInput,
): BuildPackagingTranslationResult {
  const diagnostics: ProductionTranslationDiagnostic[] = [];
  const ctx = input.ctx;
  const c = ctx.visualCanon;

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
    sourceFingerprint: `${ctx.selectedDirectionSnapshot.directionFingerprint}|${ctx.canonVersion}|packaging`,
  };

  const translationVersion = buildTranslationVersion(ctx.canonVersion, 'packaging');

  const rules = buildPackagingAdaptationRules(ctx);
  const buckets = bucketRules(rules);

  const baseContract: MediaTranslationContract = {
    schemaVersion: '0.1',
    projectId: ctx.projectId,
    media: 'packaging',
    selectedDirectionId: c.selectedDirectionId,
    selectionRevision: ctx.selectedDirectionSnapshot.selectionRevision,
    canonVersion: ctx.canonVersion,
    requiredDNARefs,
    requiredGrammarRefs,
    lockedAssetRuleRefs,
    mustPreserve: buildPackagingMustPreserve(ctx),
    mayAdapt: buildPackagingMayAdapt(ctx),
    mustNotIntroduce: buildPackagingMustNotIntroduce(ctx),
    trace,
    translationVersion,
    translationFingerprint: 'pending',
    status: c.status === 'blocked' ? 'blocked' : 'ready',
    authoritative: false,
    mode: 'shadow',
  };

  const contract: PackagingTranslationContract = {
    ...baseContract,
    media: 'packaging',
    ...buckets,
    prohibitedPackagingDrift: [...PACKAGING_PROHIBITED_DRIFT],
  };

  contract.translationFingerprint = buildTranslationFingerprint(contract);

  const validation = validateMediaContract(contract);
  diagnostics.push(...validation);

  if (c.status === 'blocked') {
    diagnostics.push({
      code: 'PT_CANON_BLOCKED',
      message: 'Packaging translation cannot proceed: VisualCanon is blocked',
    });
    return { contract: null, diagnostics };
  }

  return { contract, diagnostics };
}
