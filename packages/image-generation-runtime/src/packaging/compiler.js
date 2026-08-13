// Packaging Compiler — P2-D.
//
// Capability boundary:
//   validated PackagingTranslation (from translation.js, validated by
//   validation.js, with Reference Policy resolved by reference-policy.js
//   and Shot Contract contents from contracts.js)
//     -> { blocks[], sourceMap, fingerprint, ... }
//
// P2 spec §47 §51 (P2-D Exit):
//   [ ] deterministic compiler
//   [ ] stable 14-block order
//   [ ] compiler consumes validated Translation
//   [ ] contracts.js remains Shot authority
//   [ ] reference-policy.js remains Reference authority
//   [ ] Locked Assets preserved
//   [ ] no second reasoning call
//   [ ] no Golden import
//   [ ] no project-specific hidden prompt
//   [ ] Analysis-led compiles
//   [ ] Reference-First compiles
//   [ ] HERO compiles
//   [ ] SERIES compiles
//   [ ] OPEN compiles
//   [ ] same input -> same semantic prompt
//
// Architectural position (P2 spec §17 §18 §20):
//   "Reason once. Translate explicitly. Compile deterministically.
//   Generate."
//
//   The Compiler is NOT a second Translation layer. It does not
//   re-analyze brand, does not invent visual direction, color, motif,
//   or material, does not reinterpret reference roles, does not
//   rewrite Locked Assets, and does not call a reasoning model. It
//   normalises, orders, renders, formats, serialises, and enforces
//   deterministic constraints on the Translation that P2-A has already
//   resolved.
//
// P2 spec §19 (Stable 14-block order) — single source of truth, single
// prompt topology. The Compiler produces the SAME 14-block order
// regardless of generation mode (analysis_led / reference_first) and
// regardless of shot contract (HERO / SERIES / OPEN). Per-shot
// differences come from the Translation shape (structureRequirements /
// openingLayout / skuStrategy / references), NOT from per-route
// per-shot fork logic in the Compiler.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model
//   - does not import any Golden project asset
//   - does not mutate the input translation
//   - does not silently rewrite Locked Assets
//   - does not fork 6 separate prompt topologies
//   - does not invent project-specific visual defaults
//   - does not hardcode any brand color / motif / numeric range
//
// P2-E known item (recorded here, not handled in P2-D):
//   reference count > provider maxReferenceImages currently surfaces
//   as REFERENCE_ROLE_INVALID (placeholder) in reference-policy.js.
//   P2-E will rename this to PROVIDER_CAPABILITY_MISMATCH (P2 spec
//   §32). P2-D does NOT extend provider serialization.

import {
  PACKAGING_SHOT_CONTRACT_IDS,
  SHOT_CONTRACT_INVALID,
  getPackagingShotContract,
} from './contracts.js';
import {
  PACKAGING_REFERENCE_PRECEDENCE,
} from './reference-policy.js';
import {
  validatePackagingTranslation,
  inspectPackagingTranslation,
} from './validation.js';

export const PACKAGING_COMPILER_VERSION = '1.0.0';

// Canonical compiler failure code (P2 spec §32).
export const PACKAGING_COMPILE_FAILED = 'PACKAGING_COMPILE_FAILED';

// P2 spec §19 frozen 14-block order. Each entry is [id, title] where
// the id is the stable, capability-named identifier (test-pinned) and
// the title is the canonical section label the downstream prompt
// consumer renders. 6 routes (analysis_led × HERO/SERIES/OPEN +
// reference_first × HERO/SERIES/OPEN) share this single topology.
export const PACKAGING_PROMPT_BLOCKS = Object.freeze([
  Object.freeze(['task', 'A. Output Task']),
  Object.freeze(['product_package_identity', 'B. Product / Package Identity']),
  Object.freeze(['shot_contract', 'C. Shot Contract']),
  Object.freeze(['structural_requirements', 'D. Structural Requirements']),
  Object.freeze(['locked_assets', 'E. Locked Assets']),
  Object.freeze(['visual_direction', 'F. Visual Direction']),
  Object.freeze(['color_system', 'G. Color System']),
  Object.freeze(['motif_graphic_language', 'H. Motif / Graphic Language']),
  Object.freeze(['material_system', 'I. Material System']),
  Object.freeze(['reference_boundary', 'J. Reference Boundary']),
  Object.freeze(['composition_camera', 'K. Composition / Camera']),
  Object.freeze(['lighting', 'L. Lighting']),
  Object.freeze(['rendering_requirements', 'M. Rendering Requirements']),
  Object.freeze(['negative_constraints', 'N. Negative Constraints']),
]);

const BLOCK_IDS = PACKAGING_PROMPT_BLOCKS.map(([id]) => id);
Object.freeze(BLOCK_IDS);

// ---------------------------------------------------------------------------
// Helpers (deterministic, no project-specific literals)
// ---------------------------------------------------------------------------

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

function asObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function block(id, title, items, sources) {
  return {
    id,
    title,
    items: asArray(items),
    sources: asArray(sources),
  };
}

function throwCompileFailed(message, issues) {
  const err = new Error(`${PACKAGING_COMPILE_FAILED}: ${message}`);
  err.code = PACKAGING_COMPILE_FAILED;
  err.issues = asArray(issues);
  throw err;
}

// ---------------------------------------------------------------------------
// Block builders (one per frozen block id).
//
// Each builder is a pure function of the input Translation. It does
// NOT call a model, does NOT reach for project assets, does NOT
// inspect the brand name, and does NOT emit any literal that could
// be a Golden project default. The Compiler is a renderer.
// ---------------------------------------------------------------------------

function buildTaskBlock(t, shotContract) {
  return block('task', PACKAGING_PROMPT_BLOCKS[0][1], [
    `Shot: ${shotContract.id} (${shotContract.purpose})`,
    'Generate exactly one finished packaging deliverable, never a collage, comparison board, or multi-panel proposal.',
  ], ['translation.shotContract.id', 'translation.shotContract.purpose']);
}

function buildProductPackageIdentityBlock(t) {
  const identity = asObject(t.projectIdentity);
  return block('product_package_identity', PACKAGING_PROMPT_BLOCKS[1][1], [
    `Brand: ${asString(identity.brandName)}`,
    `Industry / category: ${asString(identity.industry)}`,
    `Brand role: ${asString(identity.brandRole)}`,
    `Product identity: ${asString(identity.productIdentity)}`,
  ], ['translation.projectIdentity']);
}

function buildShotContractBlock(t, shotContract) {
  return block('shot_contract', PACKAGING_PROMPT_BLOCKS[2][1], [
    `Shot id: ${shotContract.id}`,
    `Purpose: ${shotContract.purpose}`,
    `Must prove: ${shotContract.mustProve.join('; ')}`,
    `Compiler requirements: ${shotContract.compilerRequirements.join('; ')}`,
  ], ['translation.shotContract']);
}

function buildStructuralRequirementsBlock(t, shotContract) {
  const structure = asObject(t.structure);
  const items = [
    `Form factor: ${asString(structure.formFactor)}`,
    `Primary package: ${asString(structure.primaryPackage)}`,
  ];
  if (asArray(structure.structuralFeatures).length) {
    items.push(`Structural features: ${asArray(structure.structuralFeatures).join('; ')}`);
  }
  if (asArray(structure.openingLogic).length) {
    items.push(`Opening logic: ${asArray(structure.openingLogic).join('; ')}`);
  }
  if (asArray(structure.arrangement).length) {
    items.push(`Arrangement: ${asArray(structure.arrangement).join('; ')}`);
  }
  // Per-shot contract adds structuralRequirements / openingLayout /
  // skuStrategy (P2-B). These come verbatim from the Shot Contract
  // canonical authority (contracts.js), not from a Compiler re-derive.
  if (shotContract.structureRequirements) {
    const sr = asObject(shotContract.structureRequirements);
    const srItems = [];
    if (sr.packageCount != null) srItems.push(`packageCount: ${sr.packageCount}`);
    if (sr.layout) srItems.push(`layout: ${sr.layout}`);
    if (sr.openingVisibility) srItems.push(`openingVisibility: ${sr.openingVisibility}`);
    if (sr.skuRelation) srItems.push(`skuRelation: ${sr.skuRelation}`);
    if (sr.primaryPackage) srItems.push(`shotContract primaryPackage: ${sr.primaryPackage}`);
    if (sr.structuralReadability) srItems.push(`structuralReadability: ${sr.structuralReadability}`);
    if (srItems.length) {
      items.push(`Shot-specific structural requirements: ${srItems.join('; ')}`);
    }
  }
  if (shotContract.openingLayout) {
    const ol = asObject(shotContract.openingLayout);
    const olItems = [];
    if (ol.outerVisible) olItems.push('outer package visible');
    if (ol.innerVisible) olItems.push('inner package visible');
    if (ol.trayOrCompartment) olItems.push('tray / compartment visible');
    if (ol.openingMechanism) olItems.push(`opening mechanism: ${ol.openingMechanism}`);
    if (olItems.length) {
      items.push(`Opening layout (OPEN shot): ${olItems.join('; ')}`);
    }
  }
  if (shotContract.skuStrategy) {
    const ss = asObject(shotContract.skuStrategy);
    const ssItems = [];
    if (ss.family) ssItems.push(`family: ${ss.family}`);
    if (ss.differentiationSource) ssItems.push(`differentiation source: ${ss.differentiationSource}`);
    if (ss.duplicatesForbidden) ssItems.push('duplicates forbidden');
    if (ss.unrelatedForbidden) ssItems.push('unrelated products forbidden');
    if (ss.minimumDifferentiationRule) ssItems.push(`minimum differentiation rule: ${ss.minimumDifferentiationRule}`);
    if (ssItems.length) {
      items.push(`SKU strategy (SERIES shot): ${ssItems.join('; ')}`);
    }
  }
  return block('structural_requirements', PACKAGING_PROMPT_BLOCKS[3][1], items, [
    'translation.structure',
    'translation.shotContract.structureRequirements',
    'translation.shotContract.openingLayout',
    'translation.shotContract.skuStrategy',
  ]);
}

function buildLockedAssetsBlock(t) {
  // P2 spec §16 + P2-C: Locked Assets are NEVER rewritten. The
  // Compiler only renders the canonical Locked Asset block from the
  // Translation. If a Locked Asset field is empty in the Translation,
  // it is a Translation-shape problem and the Compiler fails closed.
  const la = asObject(t.lockedAssets);
  const items = [];
  const sources = ['translation.lockedAssets'];
  if (la.brand?.locked === true) {
    items.push(`Locked brand: ${asString(la.brand.name)}`);
  } else {
    throwCompileFailed('locked asset brand is not locked', ['locked_assets_brand_not_locked']);
  }
  if (la.logo?.locked === true) {
    items.push(`Locked logo: usageMode=${asString(la.logo.usageMode)} present=${la.logo.present === true}`);
  } else {
    throwCompileFailed('locked asset logo is not locked', ['locked_assets_logo_not_locked']);
  }
  if (la.productIdentity?.locked === true) {
    items.push(`Locked product identity: ${asString(la.productIdentity.name)}`);
  } else {
    throwCompileFailed('locked asset product identity is not locked', ['locked_assets_product_identity_not_locked']);
  }
  if (la.category?.locked === true) {
    items.push(`Locked category: ${asString(la.category.name)}`);
  } else {
    throwCompileFailed('locked asset category is not locked', ['locked_assets_category_not_locked']);
  }
  if (la.structure?.locked === true) {
    items.push(`Locked structure form factor: ${asString(la.structure.formFactor)}`);
  } else {
    throwCompileFailed('locked asset structure is not locked', ['locked_assets_structure_not_locked']);
  }
  if (la.mandatoryCopy?.locked === true) {
    const copy = asArray(la.mandatoryCopy.items);
    if (copy.length) items.push(`Locked mandatory copy: ${copy.join('; ')}`);
  }
  if (la.confirmedComponents?.locked === true) {
    const comps = asArray(la.confirmedComponents.items);
    if (comps.length) items.push(`Locked confirmed components: ${comps.join('; ')}`);
  }
  return block('locked_assets', PACKAGING_PROMPT_BLOCKS[4][1], items, sources);
}

function buildVisualDirectionBlock(t) {
  const vd = asObject(t.visualDirection);
  const items = [
    `Visual direction summary: ${asString(vd.summary)}`,
  ];
  if (asString(vd.intent)) items.push(`Visual direction intent: ${asString(vd.intent)}`);
  if (asArray(vd.keywords).length) {
    items.push(`Visual direction keywords: ${asArray(vd.keywords).join('; ')}`);
  }
  return block('visual_direction', PACKAGING_PROMPT_BLOCKS[5][1], items, ['translation.visualDirection']);
}

function buildColorSystemBlock(t) {
  const cs = asObject(t.colorSystem);
  const items = [];
  if (asArray(cs.base).length) items.push(`Base color behavior: ${asArray(cs.base).join('; ')}`);
  if (asArray(cs.identity).length) items.push(`Identity color behavior: ${asArray(cs.identity).join('; ')}`);
  if (asArray(cs.accent).length) items.push(`Accent color behavior: ${asArray(cs.accent).join('; ')}`);
  if (asArray(cs.forbidden).length) items.push(`Forbidden color behavior: ${asArray(cs.forbidden).join('; ')}`);
  return block('color_system', PACKAGING_PROMPT_BLOCKS[6][1], items, ['translation.colorSystem']);
}

function buildMotifGraphicLanguageBlock(t) {
  const ms = asObject(t.motifSystem);
  const items = [];
  if (asArray(ms.primary).length) items.push(`Primary motifs: ${asArray(ms.primary).join('; ')}`);
  if (asArray(ms.graphicHierarchy).length) items.push(`Graphic hierarchy: ${asArray(ms.graphicHierarchy).join('; ')}`);
  if (asArray(ms.forbidden).length) items.push(`Forbidden motifs: ${asArray(ms.forbidden).join('; ')}`);
  return block('motif_graphic_language', PACKAGING_PROMPT_BLOCKS[7][1], items, ['translation.motifSystem']);
}

function buildMaterialSystemBlock(t) {
  const ms = asObject(t.materialSystem);
  const items = [];
  if (asArray(ms.substrate).length) items.push(`Substrate: ${asArray(ms.substrate).join('; ')}`);
  if (asArray(ms.craft).length) items.push(`Craft: ${asArray(ms.craft).join('; ')}`);
  if (asArray(ms.forbidden).length) items.push(`Forbidden material behavior: ${asArray(ms.forbidden).join('; ')}`);
  return block('material_system', PACKAGING_PROMPT_BLOCKS[8][1], items, ['translation.materialSystem']);
}

function buildReferenceBoundaryBlock(t) {
  // The Reference Boundary block is the Compiler-side surface for the
  // Reference Policy authority. The Compiler does NOT recompute
  // roles, precedence, or count; it only renders what the
  // reference-policy.js authority has already resolved.
  //
  // The 6-layer precedence chain is rendered as a frozen ordered
  // list, with the strongest authority named first. Locked Assets
  // win over Reference Image, which is the architectural promise
  // of P2 spec §12 §13.
  const rp = asObject(t.referencePolicy);
  const items = [];
  if (!rp.enabled) {
    items.push('Reference boundary: disabled (no Reference image contributes)');
  } else {
    items.push(`Reference boundary: enabled; mode=${asString(t.generationMode)}; count=${rp.count}`);
    if (Array.isArray(rp.references) && rp.references.length > 0) {
      for (const r of rp.references) {
        if (!r || !r.assetId || !r.role) {
          // The reference-policy authority would have already
          // rejected this upstream; if it reaches the Compiler it
          // is a Translation-shape corruption. Fail closed.
          throwCompileFailed('reference has no explicit assetId or role', ['reference_policy_reference_invalid']);
        }
        items.push(`Reference: ${r.assetId} as ${r.role}${r.source ? ` (source=${r.source})` : ''}`);
      }
    } else if (t.generationMode === 'reference_first') {
      // Should not reach here (REFERENCE_REQUIRED thrown upstream),
      // but defense in depth.
      throwCompileFailed('reference_first with no references', ['reference_required_in_reference_first']);
    }
  }
  // The frozen 6-layer precedence is rendered as a list, strongest
  // first, so the downstream prompt consumer reads the precedence
  // top-down.
  items.push('Reference precedence (strongest first):');
  for (const layer of PACKAGING_REFERENCE_PRECEDENCE) {
    items.push(`  - ${layer}`);
  }
  if (rp.providerCapability) {
    const cap = asObject(rp.providerCapability);
    if (cap.referenceSupport === false) {
      items.push('Provider capability: reference support = false (no reference image carried)');
    } else {
      items.push(`Provider capability: reference support = true${cap.maxReferenceImages != null ? `, maxReferenceImages = ${cap.maxReferenceImages}` : ''}`);
    }
  }
  return block('reference_boundary', PACKAGING_PROMPT_BLOCKS[9][1], items, [
    'translation.referencePolicy',
    'reference-policy.PACKAGING_REFERENCE_PRECEDENCE',
  ]);
}

function buildCompositionCameraBlock(t) {
  const comp = asObject(t.composition);
  const cam = asObject(t.camera);
  const scene = asObject(t.sceneProgram);
  const items = [];
  if (asString(comp.type)) items.push(`Composition: ${asString(comp.type)}`);
  if (asString(comp.primaryFocus)) items.push(`Primary focus: ${asString(comp.primaryFocus)}`);
  if (asArray(comp.secondary).length) items.push(`Secondary composition: ${asArray(comp.secondary).join('; ')}`);
  if (asString(cam.intent)) items.push(`Camera intent: ${asString(cam.intent)}`);
  if (asString(cam.aspectRatio)) items.push(`Aspect ratio: ${asString(cam.aspectRatio)}`);
  if (asString(cam.depthOfField)) items.push(`Depth of field: ${asString(cam.depthOfField)}`);
  if (asString(cam.angle)) items.push(`Camera angle: ${asString(cam.angle)}`);
  if (asString(scene.type)) items.push(`Scene program type: ${asString(scene.type)}`);
  if (asArray(scene.elements).length) items.push(`Scene elements: ${asArray(scene.elements).join('; ')}`);
  return block('composition_camera', PACKAGING_PROMPT_BLOCKS[10][1], items, [
    'translation.composition',
    'translation.camera',
    'translation.sceneProgram',
  ]);
}

function buildLightingBlock(t) {
  const lt = asObject(t.lighting);
  const items = [];
  if (asString(lt.intent)) items.push(`Lighting intent: ${asString(lt.intent)}`);
  if (asString(lt.direction)) items.push(`Lighting direction: ${asString(lt.direction)}`);
  if (asString(lt.quality)) items.push(`Lighting quality: ${asString(lt.quality)}`);
  return block('lighting', PACKAGING_PROMPT_BLOCKS[11][1], items, ['translation.lighting']);
}

function buildRenderingRequirementsBlock(t, shotContract) {
  const hints = asObject(t.providerHints);
  const items = [];
  if (asString(hints.aspectRatio)) items.push(`Aspect ratio: ${asString(hints.aspectRatio)}`);
  if (hints.imageSize) items.push(`Image size: ${asString(hints.imageSize)}`);
  if (hints.qualityProfile) items.push(`Quality profile: ${asString(hints.qualityProfile)}`);
  if (asString(shotContract.presentationStrategy?.composition)) {
    items.push(`Presentation strategy composition: ${asString(shotContract.presentationStrategy.composition)}`);
  }
  if (asString(shotContract.presentationStrategy?.background)) {
    items.push(`Presentation strategy background: ${asString(shotContract.presentationStrategy.background)}`);
  }
  if (asString(shotContract.presentationStrategy?.focus)) {
    items.push(`Presentation strategy focus: ${asString(shotContract.presentationStrategy.focus)}`);
  }
  if (asString(shotContract.presentationStrategy?.hierarchy)) {
    items.push(`Presentation strategy hierarchy: ${asString(shotContract.presentationStrategy.hierarchy)}`);
  }
  items.push('Show credible proportions, construction, opening logic, product placement, contact shadows, and manufacturable detail.');
  items.push('Output one clear commercial packaging image.');
  return block('rendering_requirements', PACKAGING_PROMPT_BLOCKS[12][1], items, [
    'translation.providerHints',
    'translation.shotContract.presentationStrategy',
  ]);
}

function buildNegativeConstraintsBlock(t) {
  const items = [];
  const negatives = asArray(t.negativeConstraints);
  for (const n of negatives) items.push(n);
  items.push('Do not invent slogans, claims, ingredients, regulatory copy, or random characters.');
  items.push('Only render supplied mandatory text when reliable; otherwise preserve deliberate text-safe areas.');
  return block('negative_constraints', PACKAGING_PROMPT_BLOCKS[13][1], items, [
    'translation.negativeConstraints',
    'family.packaging.textSafety',
  ]);
}

// ---------------------------------------------------------------------------
// Compile entry point
// ---------------------------------------------------------------------------

/**
 * Compile a validated PackagingTranslation into a deterministic
 * 14-block prompt representation.
 *
 * @param {object} translation - a validated PackagingTranslation
 *   (P2-A / P2-B / P2-C). The Compiler does NOT re-validate; the
 *   caller is expected to have already run validatePackagingTranslation
 *   (or to accept the upstream canonical error if not). The Compiler
 *   still runs inspectPackagingTranslation as a defensive shape check
 *   so that any drift surfaces as PACKAGING_COMPILE_FAILED rather than
 *   silently producing a bad prompt.
 * @param {object} [options]
 * @param {boolean} [options.skipValidation] - skip the defensive
 *   inspect (use only when the caller has already validated).
 * @returns {{
 *   schemaVersion: string,
 *   compilerVersion: string,
 *   target: 'packaging',
 *   generationMode: 'analysis_led' | 'reference_first',
 *   shotContractId: string,
 *   blocks: Array<{id, title, items, sources}>,
 *   sourceMap: object,
 *   blockOrder: string[],
 * }}
 *
 * Throws:
 *   - PACKAGING_TRANSLATION_INVALID (re-thrown from inspect, upstream)
 *   - PACKAGING_STRUCTURE_EVIDENCE_MISSING (re-thrown from inspect, upstream)
 *   - PACKAGING_COMPILE_FAILED (this layer; bad shape, missing field,
 *     etc.)
 *
 * Determinism contract: given the same translation (with provenance.
 * createdAt stripped or ignored), compile(translation) returns
 * byte-identical output. createdAt and any other non-semantic
 * runtime metadata are NOT part of the output shape.
 */
export function compilePackagingPrompt(translation, options = {}) {
  // ---- Compiler boundary ----
  // PACKAGING_COMPILE_FAILED: only when the Compiler cannot even
  //                              start (translation is null /
  //                              non-object) or when a block
  //                              builder finds an unexpected
  //                              shape corruption (defense in
  //                              depth). Semantic input errors
  //                              (target wrong, partial
  //                              Translation, unknown shot id,
  //                              empty Locked Asset, missing
  //                              structure evidence) are re-thrown
  //                              with the upstream canonical code
  //                              (PACKAGING_TRANSLATION_INVALID /
  //                              PACKAGING_STRUCTURE_EVIDENCE_MISSING
  //                              / SHOT_CONTRACT_INVALID) per
  //                              P2 spec §32 + the P2-D pre-
  //                              condition that canonical error
  //                              codes are not silently
  //                              re-wrapped.

  if (translation == null || typeof translation !== 'object') {
    throwCompileFailed('translation is not an object', ['translation_not_an_object']);
  }

  // Defensive shape check: surface any drift from the P2-A/B/C
  // shape as the upstream canonical code, not as a generic
  // PACKAGING_COMPILE_FAILED. The Compiler's role is rendering,
  // not re-validating.
  if (!options.skipValidation) {
    const inspect = inspectPackagingTranslation(translation);
    if (!inspect.valid) {
      const legacy = inspect.issues.includes('structure_evidence_missing')
        ? 'PACKAGING_STRUCTURE_EVIDENCE_MISSING'
        : 'PACKAGING_TRANSLATION_INVALID';
      const err = new Error(`${legacy}: ${inspect.issues.join(', ')}`);
      err.code = legacy;
      err.issues = inspect.issues;
      err.translation = translation;
      throw err;
    }
  }

  // Pull canonical Shot Contract contents from contracts.js (P2-B
  // single source of truth). getPackagingShotContract throws
  // SHOT_CONTRACT_INVALID for unknown ids; the Compiler re-throws
  // it verbatim (canonical upstream code preserved).
  let shotContract;
  try {
    shotContract = getPackagingShotContract(translation.shotContract?.id);
  } catch (err) {
    if (err && err.code === SHOT_CONTRACT_INVALID) throw err;
    throw err;
  }

  // Build the 14 blocks in the frozen order. Each builder is a
  // pure function of translation + the canonical shot contract.
  const blocks = [
    buildTaskBlock(translation, shotContract),
    buildProductPackageIdentityBlock(translation),
    buildShotContractBlock(translation, shotContract),
    buildStructuralRequirementsBlock(translation, shotContract),
    buildLockedAssetsBlock(translation),
    buildVisualDirectionBlock(translation),
    buildColorSystemBlock(translation),
    buildMotifGraphicLanguageBlock(translation),
    buildMaterialSystemBlock(translation),
    buildReferenceBoundaryBlock(translation),
    buildCompositionCameraBlock(translation),
    buildLightingBlock(translation),
    buildRenderingRequirementsBlock(translation, shotContract),
    buildNegativeConstraintsBlock(translation),
  ];

  // Block-order enforcement: the array index of each block must
  // match the frozen PACKAGING_PROMPT_BLOCKS order. If a future
  // contributor reorders or drops a block, this guard fails.
  for (let i = 0; i < blocks.length; i += 1) {
    if (blocks[i].id !== BLOCK_IDS[i]) {
      throwCompileFailed(
        `block at index ${i} is ${blocks[i].id}; expected ${BLOCK_IDS[i]}`,
        ['block_order_violation'],
      );
    }
  }

  // Source map: block id -> sources.
  const sourceMap = Object.freeze(
    Object.fromEntries(blocks.map((b) => [b.id, b.sources.slice()])),
  );

  return Object.freeze({
    schemaVersion: '1.0',
    compilerVersion: PACKAGING_COMPILER_VERSION,
    target: 'packaging',
    generationMode: translation.generationMode,
    shotContractId: translation.shotContract.id,
    blocks: Object.freeze(blocks.map((b) => Object.freeze({
      id: b.id,
      title: b.title,
      items: Object.freeze(b.items.slice()),
      sources: Object.freeze(b.sources.slice()),
    }))),
    sourceMap,
    blockOrder: Object.freeze(BLOCK_IDS.slice()),
  });
}

/**
 * Snapshot helper for tests: returns a structural fingerprint of the
 * frozen 14-block order so a test can pin the production shape.
 */
export function getPackagingCompilerFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_COMPILER_VERSION,
    blockCount: PACKAGING_PROMPT_BLOCKS.length,
    blockIds: BLOCK_IDS.slice(),
    blockTitles: PACKAGING_PROMPT_BLOCKS.map(([, title]) => title),
  });
}

// Re-export the canonical validator so the Compiler is a complete
// P2-D entry point without forcing the caller to import validation.js
// directly.
export { validatePackagingTranslation, inspectPackagingTranslation };
