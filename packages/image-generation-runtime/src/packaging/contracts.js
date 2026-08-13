// Shot Contract Production Representation — P2-B.
//
// Capability boundary:
//   this module is the SINGLE source of truth for the three V1 frozen
//   shot contracts (PKG-HERO-SINGLE, PKG-SERIES-GROUP, PKG-GIFT-OPEN).
//
// P2 spec §47 §49 (P2-B Exit):
//   - HERO contract compiles
//   - SERIES contract compiles
//   - OPEN contract compiles
//   - no fourth V1 shot contract added
//   - structure requirements differ meaningfully per shot
//
// Architectural position (per P2 spec §46 + §6 §21 §22 §23):
//   contracts -> translation -> future compiler
//
// Stop conditions honoured here (P2 spec §20 §58):
//   - no second runtime
//   - no project-specific literals (no brand color / motif / numeric range)
//   - no implicit project asset fallback
//   - no Golden fixture import
//
// Single-source-of-truth contract (P2 spec §47 + P2-B pre-conditions):
//   - translation.js MUST NOT carry a parallel SHOT_CONTRACT_SEED
//   - validation.js MUST NOT carry shot contract contents
//   - tests/ MUST NOT redefine shot contracts
//   - this file is the only place where each shot's id, purpose,
//     mustProve, compilerRequirements, structureRequirements,
//     presentationStrategy, openingLayout, skuStrategy live.
//
// Error code authority (P2 spec §32 + the P2-B constraint to align to
// the canonical invalidation code):
//   - all shot-id failures use SHOT_CONTRACT_INVALID
//   - the legacy prefixed alias from P2-A is NOT carried forward; if
//     a compat consumer is ever found, stop and report rather than
//     introduce a parallel authority.

export const PACKAGING_SHOT_CONTRACT_VERSION = '1.0.0';

// P2 spec §32: the canonical shot-id invalidation error code.
export const SHOT_CONTRACT_INVALID = 'SHOT_CONTRACT_INVALID';

export const PACKAGING_SHOT_CONTRACT_IDS = Object.freeze([
  'PKG-HERO-SINGLE',
  'PKG-SERIES-GROUP',
  'PKG-GIFT-OPEN',
]);

// Per-shot "package count" is the most concrete evidence that the three
// shots differ meaningfully. Other fields (openingVisibility, skuRelation,
// layout) reinforce the same.
const HERO = Object.freeze({
  id: 'PKG-HERO-SINGLE',
  purpose: 'single package hero render',
  mustProve: Object.freeze([
    'brand fidelity',
    'package structure fidelity',
    'material credibility',
    'visual direction',
    'hero composition',
    'commercial presentation',
  ]),
  compilerRequirements: Object.freeze([
    'single primary package',
    'clear structural readability',
    'premium product photography',
    'controlled environment',
    'visual hierarchy centered on product',
    'no excessive campaign storytelling',
  ]),
  structureRequirements: Object.freeze({
    packageCount: 1,
    layout: 'hero',
    openingVisibility: 'closed-or-resting',
    skuRelation: 'single',
    primaryPackage: 'one primary package as the visual subject',
    structuralReadability: 'clear silhouette + legible form factor',
  }),
  presentationStrategy: Object.freeze({
    composition: 'centered hero',
    background: 'controlled environment',
    focus: 'product',
    hierarchy: 'product first, brand second, environment third',
  }),
  openingLayout: null,
  skuStrategy: null,
});

const SERIES = Object.freeze({
  id: 'PKG-SERIES-GROUP',
  purpose: 'multi-SKU / series presentation',
  mustProve: Object.freeze([
    'series consistency',
    'SKU differentiation',
    'shared brand grammar',
    'controlled color relationship',
    'repeated packaging structure',
    'group composition',
  ]),
  compilerRequirements: Object.freeze([
    'same family',
    'not duplicate clones',
    'not unrelated products',
    'controlled multi-package composition',
    'shared brand grammar across SKUs',
  ]),
  structureRequirements: Object.freeze({
    packageCount: 'multiple',
    layout: 'group',
    openingVisibility: 'closed-or-resting',
    skuRelation: 'family',
    primaryPackage: 'multiple SKUs from the same family',
    structuralReadability: 'repeated structure with controlled variation',
  }),
  presentationStrategy: Object.freeze({
    composition: 'group arrangement',
    background: 'controlled environment',
    focus: 'family',
    hierarchy: 'family grammar first, individual SKU second, environment third',
  }),
  openingLayout: null,
  skuStrategy: Object.freeze({
    family: 'shared brand family',
    differentiationSource: 'controlled color or label variation per SKU',
    duplicatesForbidden: true,
    unrelatedForbidden: true,
    minimumDifferentiationRule: 'SKUs must differ on a controlled axis; they must not be visual clones',
  }),
});

const OPEN = Object.freeze({
  id: 'PKG-GIFT-OPEN',
  purpose: 'open gift box / internal structure',
  mustProve: Object.freeze([
    'outer package',
    'inner package logic',
    'tray / compartment logic',
    'open-box physical plausibility',
    'product placement',
    'structural hierarchy',
  ]),
  compilerRequirements: Object.freeze([
    'outer package visible',
    'inner package logic visible',
    'tray / compartment / opening mechanism visible',
    'physically plausible opening state',
    'clear product placement',
    'structural hierarchy from outer to inner',
  ]),
  structureRequirements: Object.freeze({
    packageCount: 1,
    layout: 'open',
    openingVisibility: 'open',
    skuRelation: 'single',
    primaryPackage: 'one open package with visible internal structure',
    structuralReadability: 'outer + inner both readable as a hierarchy',
  }),
  presentationStrategy: Object.freeze({
    composition: 'open state',
    background: 'controlled environment',
    focus: 'opening logic + inner structure',
    hierarchy: 'outer package first, opening mechanism second, inner content third',
  }),
  openingLayout: Object.freeze({
    outerVisible: true,
    innerVisible: true,
    trayOrCompartment: true,
    openingMechanism: 'visible',
    physicalPlausibility: 'opening state must be manufacturable, not floating in air',
  }),
  skuStrategy: null,
});

const SHOT_CONTRACTS = Object.freeze({
  'PKG-HERO-SINGLE': HERO,
  'PKG-SERIES-GROUP': SERIES,
  'PKG-GIFT-OPEN': OPEN,
});

/**
 * Look up a production shot contract by id. Throws SHOT_CONTRACT_INVALID
 * when the id is not one of the three V1 frozen values.
 */
export function getPackagingShotContract(id) {
  const contract = SHOT_CONTRACTS[id];
  if (!contract) {
    const err = new Error(`${SHOT_CONTRACT_INVALID}: unknown shot contract id: ${id || '(empty)'}`);
    err.code = SHOT_CONTRACT_INVALID;
    err.issues = [`unknown_shot_contract_id:${id || 'empty'}`];
    throw err;
  }
  return contract;
}

export function isPackagingShotContractId(id) {
  return PACKAGING_SHOT_CONTRACT_IDS.includes(id);
}

/**
 * Snapshot helper used by the Golden-boundary and cross-target tests:
 * returns a structural fingerprint of the three contracts so a test
 * can assert that the production shape is exactly what P2-B published,
 * not whatever happened to be in some other file.
 */
export function getPackagingShotContractFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_SHOT_CONTRACT_VERSION,
    ids: PACKAGING_SHOT_CONTRACT_IDS.slice(),
    counts: Object.freeze(Object.fromEntries(
      PACKAGING_SHOT_CONTRACT_IDS.map((id) => {
        const c = SHOT_CONTRACTS[id];
        return [id, Object.freeze({
          mustProve: c.mustProve.length,
          compilerRequirements: c.compilerRequirements.length,
          structureRequirementsFields: Object.keys(c.structureRequirements).length,
          hasOpeningLayout: c.openingLayout != null,
          hasSkuStrategy: c.skuStrategy != null,
        })];
      }),
    )),
  });
}
