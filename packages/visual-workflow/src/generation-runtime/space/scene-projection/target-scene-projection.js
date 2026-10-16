import {
  resolveTargetFunctionalProgram,
  viewStrategyForScene
} from "../continuation/target-functional-programs.js";
const TARGET_SCENE_PROJECTION_VERSION = "space-target-scene-projection@1.1.0";
const TARGET_SCENE_AUTHORITY_GATE_VERSION = "space-target-scene-authority@1.1.0";
const TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS = Object.freeze([
  "functional_requirement",
  "architecture_function_bridge",
  "operation_constraints",
  "must_be_visible",
  "lighting",
  "composition",
  "brand_role_manifestation"
]);
const CONSULTATION_OPERATION_CONSTRAINTS = Object.freeze([
  "consultation is primary",
  "seating supports 1-to-1 / 1-to-2",
  "semi-private boundary supports confidential discussion",
  "enter the consultation unit without a lobby hierarchy",
  "information display within advisor-client reach",
  "lightweight secondary equipment"
]);
const BRAND_MECHANISMS = Object.freeze([
  { tag: "curved_language", pattern: /curv|弧|曲线|流线/iu },
  { tag: "semi_transparent_boundary", pattern: /semi[-\s]?transparent|translucent|半透明|透光|玻璃|亚克力/iu },
  { tag: "localized_purple_glow", pattern: /purple|violet|紫色?|局部.{0,8}(?:发光|光带|光晕)|underglow/iu },
  { tag: "radiating_rhythm", pattern: /radiat|radial|放射|辐射|向外延伸|层叠/iu },
  { tag: "membrane_language", pattern: /membrane|膜结构|膜语言|包裹(?:感|边界)/iu },
  { tag: "warm_wood_microcement", pattern: /warm wood|microcement|暖木|木饰面|微水泥/iu }
]);
const RECEPTION_SCENE_OBJECTS = Object.freeze([
  { tag: "large_front_desk", pattern: /large.{0,16}(?:front|reception) desk|大型.{0,8}(?:公共)?(?:前台|接待台)|大尺度.{0,8}(?:前台|接待台)/iu },
  { tag: "front_desk_visual_core", pattern: /(?:front|reception) desk.{0,64}(?:visual core|focal point|core display|(?:as|is).{0,12}(?:the )?core)|(?:前台|接待台).{0,32}(?:视觉核心|空间核心|核心展示|视觉焦点|光彩核心|作为.{0,12}(?:核心|焦点))/iu },
  { tag: "public_waiting_lobby", pattern: /public.{0,12}(?:waiting|lobby)|公共.{0,8}(?:等候|候客|大堂|大厅)/iu },
  { tag: "reception_arrival_hierarchy", pattern: /reception.{0,12}arrival hierarchy|arrival.{0,12}(?:axis|hierarchy)|前厅式迎宾|到达.{0,8}(?:轴线|层级)/iu }
]);
function uniqueStrings(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))];
}
function consultationManifestationsFor(mechanisms) {
  const tags = new Set(mechanisms);
  return uniqueStrings([
    tags.has("curved_language") || tags.has("semi_transparent_boundary") ? "curved layered translucent consultation enclosure" : "",
    tags.has("localized_purple_glow") || tags.has("radiating_rhythm") ? "localized purple accent and radiating rhythm on glass or partition" : "",
    tags.has("membrane_language") ? "membrane-like boundary language scaled to a human-size consultation unit" : "",
    tags.has("warm_wood_microcement") ? "warm wood and microcement transition around the consultation interaction" : ""
  ]);
}
function projectBrandManifestationToTargetScene({
  brandManifestation = [],
  mechanismEvidence = [],
  targetScene = ""
} = {}) {
  const source = uniqueStrings(brandManifestation);
  const evidence = uniqueStrings([...source, ...mechanismEvidence]);
  const preservedMechanisms = BRAND_MECHANISMS.filter(({ pattern }) => evidence.some((item) => pattern.test(item))).map(({ tag }) => tag);
  const replacedSceneObjects = RECEPTION_SCENE_OBJECTS.filter(({ pattern }) => source.some((item) => pattern.test(item))).map(({ tag }) => tag);
  if (targetScene !== "consultation") {
    return {
      source: "target_scene_projection",
      targetScene,
      preservedMechanisms,
      replacedSceneObjects: [],
      sourceSceneObjectsDropped: [],
      sceneManifestations: source
    };
  }
  const safeSource = source.filter((item) => !RECEPTION_SCENE_OBJECTS.some(({ pattern }) => pattern.test(item)));
  const translatedManifestations = consultationManifestationsFor(preservedMechanisms);
  return {
    source: "target_scene_projection",
    targetScene,
    preservedMechanisms,
    replacedSceneObjects,
    sourceSceneObjectsDropped: replacedSceneObjects,
    sceneManifestations: translatedManifestations.length ? translatedManifestations.slice(0, 2) : safeSource.slice(0, 4)
  };
}
function isKnownTargetScene(scene) {
  try {
    return Boolean(resolveTargetFunctionalProgram(scene));
  } catch {
    return false;
  }
}
function filterProjectWideConstraintsForTargetScene({
  sourceConstraints = [],
  sourceScene,
  targetProgram = {}
} = {}) {
  const drop = (targetProgram.sourceProgramElementsToDrop ?? []).map((d) => String(d).trim());
  const out = [];
  for (const raw of sourceConstraints) {
    const item = String(raw ?? "").trim();
    if (!item) continue;
    if (drop.some((d) => item.includes(d) || d.includes(item))) continue;
    const receptionLeak = /接待台正对入口|前厅式迎宾|大型公共接待台|大型公共前台/iu.test(item);
    if (receptionLeak && targetProgram.sceneId !== "reception") continue;
    out.push(item);
  }
  return out;
}
function buildTargetSceneProjection({
  targetProgram = {},
  projectBridge = {},
  projectConstraints = [],
  sourceScene = ""
} = {}) {
  const requiredProgram = [
    ...targetProgram.requiredFunctions ?? [],
    ...targetProgram.requiredSpatialElements ?? []
  ];
  const privacy = targetProgram.privacyRequirements ?? [];
  const scale = targetProgram.scaleRequirements ?? [];
  const circulation = targetProgram.sceneId === "consultation" ? ["\u6E05\u6670\u8FDB\u5165\u54A8\u8BE2\u5355\u5143\u7684\u8FC7\u6E21\uFF0C\u4E0D\u7ECF\u8FC7\u516C\u5171\u7B49\u5019\u5C42\u7EA7", "\u54A8\u8BE2\u5355\u5143\u5185\u90E8\u7B80\u6D01\u52A8\u7EBF\uFF0C\u4E0D\u7A7F\u8D8A\u516C\u5171\u5927\u5385"] : targetProgram.circulationRequirements ?? [];
  const operational = targetProgram.operationalRequirements ?? [];
  const targetOperationConstraints = targetProgram.sceneId === "consultation" ? [...CONSULTATION_OPERATION_CONSTRAINTS] : uniqueStrings([
    ...targetProgram.operationConstraints ?? [],
    ...circulation,
    ...operational,
    ...privacy
  ]).slice(0, 6);
  const bridge = {
    commercialPurpose: targetProgram.sceneLabel ?? projectBridge.commercialPurpose ?? "",
    spatialTranslation: requiredProgram.slice(0, 6),
    operationConstraints: targetOperationConstraints,
    humanExperience: privacy.slice(0, 3),
    commercialReality: scale.slice(0, 3),
    conceptDriftGuards: [
      ...operational.slice(0, 3),
      ...privacy.slice(0, 2)
    ]
  };
  const functionalRequirement = {
    sceneProgram: targetProgram.requiredFunctions ?? [],
    functionalNetwork: [
      ...circulation,
      ...privacy
    ],
    mustBeVisible: targetProgram.requiredSpatialElements ?? [],
    positiveDifferentiators: [
      ...scale,
      ...operational
    ]
  };
  const composition = {
    viewStrategy: targetProgram.viewStrategy ?? viewStrategyForScene(targetProgram.sceneId),
    scene: targetProgram.sceneLabel ?? targetProgram.sceneId ?? "",
    mustBeVisible: targetProgram.requiredSpatialElements ?? [],
    positiveDifferentiators: functionalRequirement.positiveDifferentiators
  };
  const lightingFunctionalIntent = [
    ...privacy.length ? [`${privacy[0]} lighting zone`] : [],
    ...scale.length ? [`human-scale ${targetProgram.sceneLabel || targetProgram.sceneId} light`] : []
  ].filter(Boolean);
  const lightingContrast = privacy.length ? `calm ${targetProgram.sceneLabel || targetProgram.sceneId} focal zone against a softer privacy boundary` : "";
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
      functionalBlockSource: "target_scene_projection",
      architectureBridgeSource: "target_scene_projection",
      operationConstraintsSource: "target_scene_projection"
    }
  };
}
function resolveTargetViewStrategy({ scene, shot, shotSource } = {}) {
  if (!isKnownTargetScene(scene)) {
    return { viewStrategy: null, shotSource: shotSource ?? "legacy_project_default" };
  }
  if (shotSource === "user_explicit") {
    return { viewStrategy: shot || null, shotSource: "user_explicit" };
  }
  return { viewStrategy: viewStrategyForScene(scene), shotSource: "target_scene_default" };
}
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
  /前台作为核心展示区/
]);
const CONSULTATION_AUTHORITY_MARKERS = Object.freeze([
  { tag: "LARGE_FRONT_DESK", pattern: /large.{0,16}(?:public )?(?:front|reception) desk|大型.{0,8}(?:公共)?(?:前台|接待台)|大尺度.{0,8}(?:前台|接待台)/iu },
  { tag: "FRONT_DESK_VISUAL_CORE", pattern: /(?:front|reception) desk.{0,64}(?:visual core|focal point|core display|(?:as|is).{0,12}(?:the )?core)|(?:前台|接待台).{0,32}(?:视觉核心|空间核心|核心展示|视觉焦点|光彩核心|作为.{0,12}(?:核心|焦点))/iu },
  { tag: "LOBBY_WAITING", pattern: /public.{0,12}(?:waiting|lobby)|公共.{0,8}(?:等候|候客|大堂|大厅)/iu },
  { tag: "PUBLIC_ARRIVAL_AXIS", pattern: /reception.{0,12}arrival hierarchy|arrival.{0,12}(?:axis|hierarchy)|前厅式迎宾|迎宾.{0,8}(?:轴线|层级)/iu },
  { tag: "WHOLE_CLINIC_PROGRAM", pattern: /whole[-\s]?clinic.{0,16}(?:program|circulation)|全(?:院|诊所).{0,12}(?:功能|项目|动线)|接待.{0,12}等候.{0,12}(?:治疗|诊疗).{0,12}休息/iu },
  { tag: "TREATMENT_REST_MUST_VISIBLE", pattern: /(?:treatment|post-treatment rest).{0,24}must be visible|(?:治疗|诊疗|术后休息).{0,16}(?:必须可见|必须呈现|must)/iu }
]);
function validateTargetSceneAuthority({
  targetScene,
  targetProgram,
  blocksById,
  operationConstraints,
  mustBeVisible,
  brandRoleManifestation,
  userRequirement
} = {}) {
  if (!targetScene || !targetProgram || !blocksById) return { status: "pass", findings: [] };
  const userExplicit = String(userRequirement ?? "").trim();
  const findings = [];
  const checks = [
    ["functional_requirement", blocksById?.functional_requirement?.text],
    ["architecture_function_bridge", blocksById?.architecture_function_bridge?.text],
    ["operation_constraints", uniqueStrings(operationConstraints ?? []).join("\n")],
    ["must_be_visible", uniqueStrings(mustBeVisible ?? []).join("\n")],
    ["lighting", blocksById?.lighting?.text],
    ["composition", blocksById?.composition?.text],
    ["brand_role_manifestation", uniqueStrings(brandRoleManifestation ?? []).join("\n") || blocksById?.brand_translation?.text]
  ];
  const markers = targetScene === "consultation" ? CONSULTATION_AUTHORITY_MARKERS : PROJECT_WIDE_PROGRAM_MARKERS.map((pattern) => ({ tag: pattern.source, pattern }));
  for (const [blockId, value] of checks) {
    const text = String(value ?? "");
    if (!text) continue;
    for (const line of text.split(/\r?\n/u).map((item) => item.trim()).filter(Boolean)) {
      const contrastOnly = /rather than|higher than|distinct from|different from|do not|must not|without|avoid|exclude|不穿越|不经过|而非|高于|区分|不得|避免|排除/iu.test(line);
      if (contrastOnly) continue;
      for (const marker of markers) {
        if (!marker.pattern.test(line)) continue;
        if (userExplicit && marker.pattern.test(userExplicit)) continue;
        findings.push({ code: "SPACE_TARGET_SCENE_AUTHORITY_VIOLATION", blockId, marker: marker.tag });
      }
    }
  }
  if (findings.length) {
    throw Object.assign(
      new Error(`SPACE_TARGET_SCENE_AUTHORITY_VIOLATION: target scene "${targetScene}" lost functional authority (${findings.map((f) => f.blockId).join(", ")})`),
      { code: "SPACE_TARGET_SCENE_AUTHORITY_VIOLATION", findings }
    );
  }
  return { status: "pass", findings: [] };
}
export {
  TARGET_SCENE_AUTHORITY_CHECKED_BLOCKS,
  TARGET_SCENE_AUTHORITY_GATE_VERSION,
  TARGET_SCENE_PROJECTION_VERSION,
  buildTargetSceneProjection,
  filterProjectWideConstraintsForTargetScene,
  isKnownTargetScene,
  projectBrandManifestationToTargetScene,
  resolveTargetViewStrategy,
  validateTargetSceneAuthority
};
