// R11.1 v1.2 Continuation Program Override Layer.
//
// Solves CONTINUATION_SOURCE_PROGRAM_LEAKAGE: in continuation mode the target
// scene's functional program must OVERRIDE the source / project-wide program
// in the high-weight functional blocks (Architecture-Function Bridge,
// Functional Requirement, Composition / View Strategy). The reference image is
// world-consistency only; it never dictates layout / composition / program.
//
// R11.2.3: the target-scene projection is now the SHARED Space scene layer
// (scene-projection/target-scene-projection.js). This module keeps the
// continuation-specific concerns (source scene constraint filtering + drop
// tags) on top of that shared projection. It is pure / deterministic / offline
// and never rewrites the frozen r8_6_golden compiler.

import { buildTargetSceneProjection } from '../scene-projection/target-scene-projection.js';

export const CONTINUATION_OVERRIDE_VERSION = 'space-continuation-program-override@1.2.0';

/**
 * Filter source-scene hard constraints that are incompatible with the target
 * scene. A hard must-hold from the source (e.g. "接待台正对入口") must NOT
 * remain a hard constraint when the target scene is consultation.
 *
 * @param {object} input
 * @param {string[]} [input.sourceConstraints]  e.g. operationConstraints
 * @param {string} input.sourceScene
 * @param {object} input.targetProgram
 * @returns {string[]} target-compatible constraints
 */
export {
  filterProjectWideConstraintsForTargetScene as filterSourceSceneConstraintsForContinuation,
} from '../scene-projection/target-scene-projection.js';

/**
 * Build the continuation-overridden functional layers to feed the frozen
 * compiler. Returns a shallow layer override object.
 *
 * @param {object} input
 * @param {object} input.targetProgram        compiled target functional program
 * @param {object} input.sourceBridge         source architectureFunctionBridge layers
 * @param {string} input.sourceScene
 * @returns {object} { architectureFunctionBridge, functionalRequirement, composition }
 */
export function applyContinuationProgramOverride({
  targetProgram = {},
  sourceBridge = {},
  sourceScene = '',
} = {}) {
  const projection = buildTargetSceneProjection({
    targetProgram,
    projectBridge: sourceBridge,
    projectConstraints: sourceBridge.operationConstraints ?? [],
    sourceScene,
  });
  return {
    architectureFunctionBridge: projection.architectureFunctionBridge,
    functionalRequirement: projection.functionalRequirement,
    composition: projection.composition,
  };
}
