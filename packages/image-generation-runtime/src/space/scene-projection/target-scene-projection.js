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

export const TARGET_SCENE_PROJECTION_VERSION = 'space-target-scene-projection@1.1.0';
export const TARGET_SCENE_AUTHORITY_GATE_VERSION = 'space-target-scene-authority@1.1.0';

export const TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS = Object.freeze([
  'functional_requirement',
  'architecture_function_bridge',
  'operation_constraints',
  'must_be_visible',
  'lighting',
  'composition',
  'brand_role_manifestation',
]);

const CONSULTATION_OPERATION_CONSTRAINTS = Object.freeze([
  'consultation is primary',
  'seating supports 1-to-1 / 1-to-2',
  'semi-private boundary supports confidential discussion',
  'enter the consultation unit without a lobby hierarchy',
  'information display within advisor-client reach',
  'lightweight secondary equipment',
]);

const BRAND_MECHANISMS = Object.freeze([
  { tag: 'curved_language', pattern: /curv|弧|曲线|流线/iu },
  { tag: 'semi_transparent_boundary', pattern: /semi[-\s]?transparent|translucent|半透明|透光|玻璃|亚克力/iu },
  { tag: 'localized_purple_glow', pattern: /purple|violet|紫色?|局部.{0,8}(?:发光|光带|光晕)|underglow/iu },
  { tag: 'radiating_rhythm', pattern: /radiat|radial|放射|辐射|向外延伸|层叠/iu },
  { tag: 'membrane_language', pattern: /membrane|膜结构|膜语言|包裹(?:感|边界)/iu },
  { tag: 'warm_wood_microcement', pattern: /warm wood|microcement|暖木|木饰面|微水泥/iu },
]);

const RECEPTION_SCENE_OBJECTS = Object.freeze([
  { tag: 'large_front_desk', pattern: /large.{0,16}(?:front|reception) desk|大型.{0,8}(?:公共)?(?:前台|接待台)|大尺度.{0,8}(?:前台|接待台)/iu },
  { tag: 'front_desk_visual_core', pattern: /(?:front|reception) desk.{0,64}(?:visual core|focal point|core display|(?:as|is).{0,12}(?:the )?core)|(?:前台|接待台).{0,32}(?:视觉核心|空间核心|核心展示|视觉焦点|光彩核心|作为.{0,12}(?:核心|焦点))/iu },
  { tag: 'public_waiting_lobby', pattern: /public.{0,12}(?:waiting|lobby)|公共.{0,8}(?:等候|候客|大堂|大厅)/iu },
  { tag: 'reception_arrival_hierarchy', pattern: /reception.{0,12}arrival hierarchy|arrival.{0,12}(?:axis|hierarchy)|前厅式迎宾|到达.{0,8}(?:轴线|层级)/iu },
]);

function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function consultationManifestationsFor(mechanisms) {
  const tags = new Set(mechanisms);
  return uniqueStrings([
    tags.has('curved_language') || tags.has('semi_transparent_boundary')
      ? 'curved layered translucent consultation enclosure'
      : '',
    tags.has('localized_purple_glow') || tags.has('radiating_rhythm')
      ? 'localized purple accent and radiating rhythm on glass or partition'
      : '',
    tags.has('membrane_language') ? 'membrane-like boundary language scaled to a human-size consultation unit' : '',
    tags.has('warm_wood_microcement') ? 'warm wood and microcement transition around the consultation interaction' : '',
  ]);
}

export function projectBrandManifestationToTargetScene({
  brandManifestation = [],
  mechanismEvidence = [],
  targetScene = '',
} = {}) {
  const source = uniqueStrings(brandManifestation);
  const evidence = uniqueStrings([...source, ...mechanismEvidence]);
  const preservedMechanisms = BRAND_MECHANISMS
    .filter(({ pattern }) => evidence.some((item) => pattern.test(item)))
    .map(({ tag }) => tag);
  const replacedSceneObjects = RECEPTION_SCENE_OBJECTS
    .filter(({ pattern }) => source.some((item) => pattern.test(item)))
    .map(({ tag }) => tag);

  if (targetScene !== 'consultation') {
    return {
      source: 'target_scene_projection',
      targetScene,
      preservedMechanisms,
      replacedSceneObjects: [],
      sourceSceneObjectsDropped: [],
      sceneManifestations: source,
    };
  }

  const safeSource = source.filter((item) =>
    !RECEPTION_SCENE_OBJECTS.some(({ pattern }) => pattern.test(item)));
  const translatedManifestations = consultationManifestationsFor(preservedMechanisms);
  return {
    source: 'target_scene_projection',
    targetScene,
    preservedMechanisms,
    replacedSceneObjects,
    sourceSceneObjectsDropped: replacedSceneObjects,
    sceneManifestations: translatedManifestations.length
      ? translatedManifestations.slice(0, 2)
      : safeSource.slice(0, 4),
  };
}

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
  const circulation = targetProgram.sceneId === 'consultation'
    ? ['清晰进入咨询单元的过渡，不经过公共等候层级', '咨询单元内部简洁动线，不穿越公共大厅']
    : targetProgram.circulationRequirements ?? [];
  const operational = targetProgram.operationalRequirements ?? [];

  // 1) Architecture-Function Bridge: target-owned. Project/source constraints
  //    remain audit inputs only; none are promoted into a target-scene hard
  //    block. This closes residual Reception/Treatment/Rest program leakage.
  const targetOperationConstraints = targetProgram.sceneId === 'consultation'
    ? [...CONSULTATION_OPERATION_CONSTRAINTS]
    : uniqueStrings([
        ...(targetProgram.operationConstraints ?? []),
        ...circulation,
        ...operational,
        ...privacy,
      ]).slice(0, 6);
  const bridge = {
    commercialPurpose: targetProgram.sceneLabel ?? projectBridge.commercialPurpose ?? '',
    spatialTranslation: requiredProgram.slice(0, 6),
    operationConstraints: targetOperationConstraints,
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
      operationConstraintsSource: 'target_scene_projection',
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

const CONSULTATION_AUTHORITY_MARKERS = Object.freeze([
  { tag: 'LARGE_FRONT_DESK', pattern: /large.{0,16}(?:public )?(?:front|reception) desk|大型.{0,8}(?:公共)?(?:前台|接待台)|大尺度.{0,8}(?:前台|接待台)/iu },
  { tag: 'FRONT_DESK_VISUAL_CORE', pattern: /(?:front|reception) desk.{0,64}(?:visual core|focal point|core display|(?:as|is).{0,12}(?:the )?core)|(?:前台|接待台).{0,32}(?:视觉核心|空间核心|核心展示|视觉焦点|光彩核心|作为.{0,12}(?:核心|焦点))/iu },
  { tag: 'LOBBY_WAITING', pattern: /public.{0,12}(?:waiting|lobby)|公共.{0,8}(?:等候|候客|大堂|大厅)/iu },
  { tag: 'PUBLIC_ARRIVAL_AXIS', pattern: /reception.{0,12}arrival hierarchy|arrival.{0,12}(?:axis|hierarchy)|前厅式迎宾|迎宾.{0,8}(?:轴线|层级)/iu },
  { tag: 'WHOLE_CLINIC_PROGRAM', pattern: /whole[-\s]?clinic.{0,16}(?:program|circulation)|全(?:院|诊所).{0,12}(?:功能|项目|动线)|接待.{0,12}等候.{0,12}(?:治疗|诊疗).{0,12}休息/iu },
  { tag: 'TREATMENT_REST_MUST_VISIBLE', pattern: /(?:treatment|post-treatment rest).{0,24}must be visible|(?:治疗|诊疗|术后休息).{0,16}(?:必须可见|必须呈现|must)/iu },
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
  operationConstraints,
  mustBeVisible,
  brandRoleManifestation,
  userRequirement,
} = {}) {
  if (!targetScene || !targetProgram || !blocksById) return { status: 'pass', findings: [] };
  const userExplicit = String(userRequirement ?? '').trim();
  const findings = [];
  const checks = [
    ['functional_requirement', blocksById?.functional_requirement?.text],
    ['architecture_function_bridge', blocksById?.architecture_function_bridge?.text],
    ['operation_constraints', uniqueStrings(operationConstraints ?? []).join('\n')],
    ['must_be_visible', uniqueStrings(mustBeVisible ?? []).join('\n')],
    ['lighting', blocksById?.lighting?.text],
    ['composition', blocksById?.composition?.text],
    ['brand_role_manifestation', uniqueStrings(brandRoleManifestation ?? []).join('\n') || blocksById?.brand_translation?.text],
  ];
  const markers = targetScene === 'consultation'
    ? CONSULTATION_AUTHORITY_MARKERS
    : PROJECT_WIDE_PROGRAM_MARKERS.map((pattern) => ({ tag: pattern.source, pattern }));
  for (const [blockId, value] of checks) {
    const text = String(value ?? '');
    if (!text) continue;
    for (const line of text.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean)) {
      const contrastOnly = /rather than|higher than|distinct from|different from|do not|must not|without|avoid|exclude|不穿越|不经过|而非|高于|区分|不得|避免|排除/iu.test(line);
      if (contrastOnly) continue;
      for (const marker of markers) {
        if (!marker.pattern.test(line)) continue;
        if (userExplicit && marker.pattern.test(userExplicit)) continue;
        findings.push({ code: 'SPACE_TARGET_SCENE_AUTHORITY_VIOLATION', blockId, marker: marker.tag });
      }
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
