// R11.2.3 Target Scene Projection (shared Space scene layer).
//
// Target Scene Functional Authority: when a generation has a concrete target
// scene (subtype), the scene's functional program owns the functional blocks —
// Functional Requirement, Architecture-Function Bridge, Must-Be-Visible,
// Lighting Functional Intent and View Strategy. The project-wide program
// (Reception / Treatment / Rest / Arrival) must NOT be "must be legible in one
// image" for a single scene.
//
// Shared by:
//   Standard        — project the chosen subtype
//   Reference-First — target functional authority + high-fidelity visual ref
//   Continuation    — target functional authority + source program drop +
//                     world-consistency reference
//
// This reuses the R11.1 Target Functional Program registry; it is pure /
// deterministic / offline and never rewrites the frozen compiler or the
// provider parameters.

import {
  resolveTargetFunctionalProgram,
  viewStrategyForScene,
} from '../continuation/target-functional-programs.js';

export const TARGET_SCENE_PROJECTION_VERSION = 'space-target-scene-projection@1.0.0';
export const TARGET_SCENE_AUTHORITY_GATE_VERSION = 'space-target-scene-authority@1.0.0';

// A known target scene for which the projection applies (subtype is a scene).
export function isKnownTargetScene(scene) {
  try {
    return Boolean(resolveTargetFunctionalProgram(scene));
  } catch {
    return false;
  }
}

/**
 * Filter project-wide hard constraints that are incompatible with the target
 * scene. A project-wide must-hold (e.g. "接待台正对入口") must not remain a hard
 * constraint when the target scene is consultation.
 *
 * @param {object} input
 * @param {string[]} [input.sourceConstraints]  project/source operation constraints
 * @param {string} [input.sourceScene]          source scene (continuation only)
 * @param {object} input.targetProgram          compiled target functional program
 * @returns {string[]} target-compatible constraints
 */
export function filterProjectWideConstraintsForTargetScene({
  sourceConstraints = [],
  sourceScene,
  targetProgram = {},
} = {}) {
  const drop = (targetProgram.sourceProgramElementsToDrop ?? []).map((d) => String(d).trim());
  const out = [];
  for (const raw of sourceConstraints) {
    const item = String(raw ?? '').trim();
    if (!item) continue;
    // A constraint that re-mentions a target-drop element is removed.
    if (drop.some((d) => item.includes(d) || d.includes(item))) continue;
    // Reception-specific hard constraints (source / project-wide) are
    // incompatible with a consultation-style target.
    const receptionLeak = /接待台正对入口|前厅式迎宾|大型公共接待台|大型公共前台/iu.test(item);
    if (receptionLeak && targetProgram.sceneId !== 'reception') continue;
    out.push(item);
  }
  return out;
}

/**
 * Build the target-scene-projected functional layers.
 *
 * @param {object} input
 * @param {object} input.targetProgram      compiled target functional program
 * @param {object} [input.projectBridge]    project-wide architectureFunctionBridge layers
 * @param {string[]} [input.projectConstraints]  project-wide operation constraints to filter
 * @param {string} [input.sourceScene]      continuation source scene (for filtering)
 * @returns {object} { architectureFunctionBridge, functionalRequirement,
 *                     composition, lightingFunctionalIntent, lightingContrast,
 *                     viewStrategy, requiredProgramNodes, targetFunctionalProgram,
 *                     provenance }
 */
export function buildTargetSceneProjection({
  targetProgram = {},
  projectBridge = {},
  projectConstraints = [],
  sourceScene = '',
} = {}) {
  const requiredProgram = [
    ...(targetProgram.requiredFunctions ?? []),
    ...(targetProgram.requiredSpatialElements ?? []),
  ];
  const privacy = targetProgram.privacyRequirements ?? [];
  const scale = targetProgram.scaleRequirements ?? [];
  const circulation = targetProgram.circulationRequirements ?? [];
  const operational = targetProgram.operationalRequirements ?? [];

  // 1) Architecture-Function Bridge: target-aware. Project-wide hard
  //    constraints that conflict with the target scene are filtered.
  const filteredConstraints = filterProjectWideConstraintsForTargetScene({
    sourceConstraints: projectConstraints,
    sourceScene,
    targetProgram,
  });
  const bridge = {
    commercialPurpose: targetProgram.sceneLabel ?? projectBridge.commercialPurpose ?? '',
    spatialTranslation: requiredProgram.slice(0, 6),
    operationConstraints: [
      ...filteredConstraints.slice(0, 4),
      ...circulation.slice(0, 2),
    ],
    humanExperience: privacy.slice(0, 3),
    commercialReality: scale.slice(0, 3),
    conceptDriftGuards: [
      ...operational.slice(0, 3),
      ...privacy.slice(0, 2),
    ],
  };

  // 2) Functional Requirement: FULLY replaced by the target program. Project-
  //    wide program nodes must not be "must be legible in one image".
  const functionalRequirement = {
    sceneProgram: targetProgram.requiredFunctions ?? [],
    functionalNetwork: [
      ...circulation,
      ...privacy,
    ],
    mustBeVisible: targetProgram.requiredSpatialElements ?? [],
    positiveDifferentiators: [
      ...scale,
      ...operational,
    ],
  };

  // 3) Composition / View Strategy: target view (unless user explicitly chose a
  //    different shot — the shot lens may differ, the program never does).
  const composition = {
    viewStrategy: targetProgram.viewStrategy ?? viewStrategyForScene(targetProgram.sceneId),
    scene: targetProgram.sceneLabel ?? targetProgram.sceneId ?? '',
    mustBeVisible: targetProgram.requiredSpatialElements ?? [],
    positiveDifferentiators: functionalRequirement.positiveDifferentiators,
  };

  // 4) Lighting Functional Intent: the scene's functional light target (privacy
  //    / scale), distinct from the reference/brand light style.
  const lightingFunctionalIntent = [
    ...(privacy.length ? [`${privacy[0]} lighting zone`] : []),
    ...(scale.length ? [`human-scale ${targetProgram.sceneLabel || targetProgram.sceneId} light`] : []),
  ].filter(Boolean);
  const lightingContrast = privacy.length
    ? `calm ${targetProgram.sceneLabel || targetProgram.sceneId} focal zone against a softer privacy boundary`
    : '';

  return {
    architectureFunctionBridge: bridge,
    functionalRequirement,
    composition,
    lightingFunctionalIntent,
    lightingContrast,
    viewStrategy: composition.viewStrategy,
    requiredProgramNodes: functionalRequirement.sceneProgram,
    targetFunctionalProgram: targetProgram,
    provenance: {
      targetScene: targetProgram.sceneId,
      targetProgramId: targetProgram.sceneId,
      functionalBlockSource: 'target_scene_projection',
      architectureBridgeSource: 'target_scene_projection',
    },
  };
}

/**
 * Resolve the view strategy for a target scene.
 *
 * Priority (R11.2.3 §19-§21): user_explicit > target_scene_default >
 * legacy_project_default. A user-explicit shot is a lens choice (the functional
 * program stays target-owned); otherwise the target scene owns the view.
 *
 * @param {object} input
 * @param {string} [input.scene]       target scene id
 * @param {string} [input.shot]        task shot (lens)
 * @param {string} [input.shotSource]  'user_explicit' | 'target_scene_default' | 'legacy_project_default'
 * @returns {{ viewStrategy: string|null, shotSource: string }}
 */
export function resolveTargetViewStrategy({ scene, shot, shotSource } = {}) {
  if (!isKnownTargetScene(scene)) {
    return { viewStrategy: null, shotSource: shotSource ?? 'legacy_project_default' };
  }
  if (shotSource === 'user_explicit') {
    return { viewStrategy: shot || null, shotSource: 'user_explicit' };
  }
  return { viewStrategy: viewStrategyForScene(scene), shotSource: 'target_scene_default' };
}

// Project-wide program markers that must NOT become hard requirements / must-be-
// visible items in a single target scene, unless the user explicitly asked for
// them (R11.2.3 §9-§15, §24-§25). These are fail-closed guards on the FINAL
// blocks; the primary mechanism is the projection itself.
const PROJECT_WIDE_PROGRAM_MARKERS = Object.freeze([
  /大型公共接待台/,
  /大型公共前台/,
  /大面积公共等候区/,
  /前厅式迎宾轴线/,
  /等候休息区/,
  /治疗室位于空间后部/,
  /休息区靠近外侧/,
  /接待区位于空间前部/,
  /底部发光的前台接待台/,
  /前台作为核心展示区/,
]);

/**
 * R11.2.3 Target Scene Authority Gate (fail closed).
 *
 * Verifies the final functional blocks of a target scene generation do not carry
 * project-wide program hard requirements that are incompatible with the target,
 * unless the user explicitly requested them.
 *
 * @param {object} input
 * @param {string} [input.targetScene]
 * @param {object} [input.targetProgram]
 * @param {object} [input.blocksById]    final compiled blocks by id
 * @param {string} [input.userRequirement]
 * @returns {{ status: 'pass'|'block', findings: Array<object> }}
 */
export function validateTargetSceneAuthority({
  targetScene,
  targetProgram,
  blocksById,
  userRequirement,
} = {}) {
  if (!targetScene || !targetProgram || !blocksById) return { status: 'pass', findings: [] };
  const userExplicit = String(userRequirement ?? '').trim();
  const findings = [];
  for (const blockId of ['functional_requirement', 'architecture_function_bridge', 'composition', 'lighting']) {
    const text = String(blocksById?.[blockId]?.text ?? '');
    if (!text) continue;
    for (const marker of PROJECT_WIDE_PROGRAM_MARKERS) {
      if (!marker.test(text)) continue;
      if (userExplicit && marker.test(userExplicit)) continue;
      findings.push({ code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION', blockId, marker: marker.source });
    }
  }
  if (findings.length) {
    throw Object.assign(
      new Error(`SPACE_TARGET_SCENE_AUTHORITY_VIOLATION: target scene "${targetScene}" lost functional authority (${findings.map((f) => f.blockId).join(', ')})`),
      { code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION', findings },
    );
  }
  return { status: 'pass', findings: [] };
}
