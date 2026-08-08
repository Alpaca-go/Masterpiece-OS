// rewrite-architecture-semantics
//
// R8.5 redirected: after R8.5.1 classification + motif-stripping, this module
// REWRITES each surviving architecture phrase into short English construction
// language partitioned into three registers:
//
//   strategy      -> Spatial Strategy block (direction keywords)
//   form          -> Architectural Characteristics (construction sentences)
//   organization  -> Spatial Organization (circulation / privacy phrases)
//
// This matches the P9B-B high-water-mark prompt that reached 5/5 Expressiveness:
// the three architecture blocks used DIFFERENT registers, not the same list
// copied three times.
//
// Pipeline position:
//
//   raw V5 phrase
//     -> separate-space-semantics   (classify)
//     -> normalize-architecture-semantics (strip motif, preserve spatial prop)
//     -> rewrite-architecture-semantics  (THIS: prop -> English action verbs)
//     -> phase9b-space-compiler renders the three action lists into blocks
//
// Principles:
//   - Deterministic, no LLM, no network.
//   - Never invents spatial facts: action verbs are triggered ONLY by signals
//     already present in the motif-stripped text.
//   - Globally deduped per register: one V5 sentence cannot produce the same
//     phrase across multiple blocks (fixes R8.4 finding: one phrase appeared
//     4 times in CURRENT-T prompt).
//   - Drop fallback: if a stripped phrase carries NO recognisable spatial
//     signal, it is dropped from the architecture IR entirely rather than
//     copied verbatim as Chinese prose.
//   - No brand / project / motif hardcoding.

import { rewriteArchitectureItems } from './action-verbs.js';

/**
 * @typedef {{
 *   text: string,
 *   sourceField: string,
 *   sourcePath?: string,
 *   classification?: string,
 *   strip?: string[],
 *   mechanismId?: string,
 * }} ArchitectureSemantic
 */

/**
 * Rewrite one motif-stripped architecture semantic into action verbs.
 * Delegates to the integrated item rewriter in action-verbs.js.
 *
 * @param {ArchitectureSemantic} item
 */
export function rewriteArchitectureItem(item) {
  const result = rewriteArchitectureItems([item]);
  return result.items[0];
}

/**
 * Rewrite a list of architecture semantics. Returns per-item records plus
 * three globally-deduped action lists ready for block rendering.
 *
 * @param {ArchitectureSemantic[]} items
 */
export function rewriteArchitectureSemantics(items) {
  const result = rewriteArchitectureItems(items);
  return {
    items: result.items,
    // Back-compat alias: the flat action list.
    actions: result.allActions,
    strategy: result.strategy,
    form: result.form,
    organization: result.organization,
    stats: result.stats,
  };
}

export const REWRITE_ARCHITECTURE_SEMANTICS_VERSION = '1.0.0';
