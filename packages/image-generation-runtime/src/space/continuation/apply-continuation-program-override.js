// R11.1 v1.2 Continuation Program Override Layer.
//
// Solves CONTINUATION_SOURCE_PROGRAM_LEAKAGE: in continuation mode the target
// scene's functional program must OVERRIDE the source / project-wide program
// in the high-weight functional blocks (Architecture-Function Bridge,
// Functional Requirement, Composition / View Strategy). The reference image is
// world-consistency only; it never dictates layout / composition / program.
//
// This is NOT a new compiler — it prepares runtime IR that the frozen
// r8_6_golden compiler then renders. It is pure / deterministic / offline.
//
// Priorities (R11.1 §31-§32):
//   functional:  Target Program > Project Context > Source Program
//   aesthetics:  Source Visual Grammar > Project Visual Context > Generic Style

export const CONTINUATION_OVERRIDE_VERSION = 'space-continuation-program-override@1.2.0';

/**
 * Filter source-scene hard constraints that are incompatible with the target
 * scene. A hard must-hold from the source (e.g. "接待台正对入口") must NOT
 * remain a hard constraint when the target scene is consultation.
 *
 * @param {string[]} sourceConstraints  e.g. operationConstraints
 * @param {string} sourceScene
 * @param {object} targetProgram
 * @returns {string[]} target-compatible constraints
 */
export function filterSourceSceneConstraintsForContinuation({
  sourceConstraints = [],
  sourceScene,
  targetProgram = {},
} = {}) {
  const drop = (targetProgram.sourceProgramElementsToDrop ?? []).map((d) => d.trim());
  const out = [];
  for (const raw of sourceConstraints) {
    const item = String(raw ?? '').trim();
    if (!item) continue;
    // A constraint that re-mentions a source element to drop is removed.
    if (drop.some((d) => item.includes(d) || d.includes(item))) continue;
    // Reception-specific hard constraints (source scene) are incompatible with
    // a consultation target.
    const sourceLeak = /接待台正对入口|前厅式迎宾|大型公共接待台|大型公共前台/iu.test(item);
    if (sourceLeak && targetProgram.sceneId !== 'reception') continue;
    out.push(item);
  }
  return out;
}

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
  const requiredProgram = [
    ...(targetProgram.requiredFunctions ?? []),
    ...(targetProgram.requiredSpatialElements ?? []),
  ];
  const privacy = targetProgram.privacyRequirements ?? [];
  const scale = targetProgram.scaleRequirements ?? [];

  // 1) Architecture-Function Bridge: target-aware. Drop source-only hard
  //    constraints; keep generic spatial translation + target program items.
  const filteredConstraints = filterSourceSceneConstraintsForContinuation({
    sourceConstraints: sourceBridge.operationConstraints ?? [],
    sourceScene,
    targetProgram,
  });
  const bridge = {
    commercialPurpose: sourceBridge.commercialPurpose ?? '',
    spatialTranslation: requiredProgram.slice(0, 6),
    operationConstraints: [
      ...filteredConstraints.slice(0, 4),
      ...(targetProgram.circulationRequirements ?? []).slice(0, 2),
    ],
    humanExperience: (targetProgram.privacyRequirements ?? []).slice(0, 3),
    commercialReality: scale.slice(0, 3),
    // R11.1 v1.2: concept drift guards must express TARGET positive
    // requirements (what the scene should become), never re-list the dropped
    // source elements — those already live in the Continuation Intent block.
    conceptDriftGuards: [
      ...(targetProgram.operationalRequirements ?? []).slice(0, 3),
      ...(targetProgram.privacyRequirements ?? []).slice(0, 2),
    ],
  };

  // 2) Functional Requirement: FULLY replaced by the target program. Project-
  //    wide program nodes must not be "must be legible in one image".
  const functionalRequirement = {
    sceneProgram: targetProgram.requiredFunctions ?? [],
    functionalNetwork: [
      ...(targetProgram.circulationRequirements ?? []),
      ...privacy,
    ],
    mustBeVisible: targetProgram.requiredSpatialElements ?? [],
    positiveDifferentiators: [
      ...(targetProgram.scaleRequirements ?? []),
      ...(targetProgram.operationalRequirements ?? []),
    ],
  };

  // 3) Composition / View Strategy: target view overrides source view.
  const composition = {
    viewStrategy: targetProgram.viewStrategy ?? 'human_scale_consultation_view',
    scene: targetProgram.sceneLabel ?? targetProgram.sceneId ?? '',
  };

  return { architectureFunctionBridge: bridge, functionalRequirement, composition };
}
