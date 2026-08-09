// R11.1 v1.1 Target Functional Program Registry.
//
// For a continuation task, the target scene is NOT just a label — it compiles
// into a Target Functional Program that OVERRIDES the source scene's program
// (R11.1 §6-§9, §22). This registry is a deterministic / compile-time
// ephemeral IR: it is never written back to the V5 packet and never calls an
// LLM. It is generic (scene taxonomy), not a brand/project hardcode.
//
// Each program declares:
//   requiredFunctions           — what the scene must actually do
//   requiredSpatialElements     — fixtures / spatial objects that must exist
//   circulationRequirements     — how people move through the scene
//   privacyRequirements         — openness vs enclosure
//   scaleRequirements           — human scale / room size intent
//   operationalRequirements     — equipment / service / operations
//   sourceProgramElementsToDrop — carry-over from the source scene that must
//                                 NOT persist (never via negative prompts)

export const TARGET_FUNCTIONAL_PROGRAM_VERSION = 'space-target-functional-program@1.0.0';

export const TARGET_FUNCTIONAL_PROGRAMS = Object.freeze({
  consultation: Object.freeze({
    sceneId: 'consultation',
    sceneLabel: '咨询室',
    // R11.1 v1.2: view strategy is a semantic composition role, not a fixed
    // lens. consultation must NOT use entrance_view / lobby overview.
    viewStrategy: 'human_scale_consultation_view',
    requiredFunctions: [
      '1 对 1 / 1 对 2 专业咨询',
      '产品 / 服务信息展示与说明',
      '轻量专业咨询操作',
    ],
    requiredSpatialElements: [
      '咨询桌或低桌',
      '2–3 人咨询座位',
      '半私密或私密边界',
      '医疗 / 产品信息展示面',
      '咨询设备或轻量专业设备',
      '清晰入口与落座关系',
    ],
    circulationRequirements: [
      '从公共等候区明确进入咨询单元的过渡',
      '咨询单元内部简洁动线，不穿越公共大厅',
    ],
    privacyRequirements: [
      '半私密到私密边界',
      '与公共接待 / 等候区明确区分',
    ],
    scaleRequirements: [
      '较小尺度、人尺度咨询单元',
      '非大堂级尺度',
    ],
    operationalRequirements: [
      '咨询过程所需的桌面与座位关系',
      '信息展示与咨询动作可达',
    ],
    sourceProgramElementsToDrop: [
      '大型公共接待台',
      '大尺度 Lobby 构图',
      '大面积公共等候区',
      '前厅式迎宾轴线',
    ],
    // R11.1 v1.2 semantic tags (scene-program semantics, not brand hardcode).
    sourceProgramDropTags: [
      'PUBLIC_RECEPTION',
      'PUBLIC_ARRIVAL_AXIS',
      'LOBBY_WAITING',
      'PUBLIC_FRONT_DESK_HIERARCHY',
    ],
  }),
  entrance: Object.freeze({
    sceneId: 'entrance',
    sceneLabel: '门店入口',
    viewStrategy: 'threshold_arrival_view',
    requiredFunctions: [
      '门店到达、识别与欢迎',
      '进入堂食 / 内部空间的引导',
    ],
    requiredSpatialElements: [
      'storefront / threshold 门槛',
      'arrival sequence 到达序列',
      'welcome / host 迎宾点',
      '入口与内部空间的局部可见关系',
    ],
    circulationRequirements: [
      '从街道 / 室外到内部的清晰进入路径',
      '到达到识别到进入的三段序列',
    ],
    privacyRequirements: [
      '入口开敞、欢迎、透明',
      '不设封闭前室',
    ],
    scaleRequirements: [
      '人尺度入口宽度与净高',
      '街面尺度而非堂食大厅尺度',
    ],
    operationalRequirements: [
      '迎宾 / 引导可达',
      '排队 / 取餐关系（如适用）的入口布置',
    ],
    sourceProgramElementsToDrop: [
      '中央开放厨房作为画面主体',
      '完整堂食大厅布局',
      '大面积餐桌卡座',
      '以出餐区为中心的内部运营构图',
    ],
    sourceProgramDropTags: [
      'OPEN_KITCHEN_CORE_AS_MAIN_COMPOSITION',
      'DINING_HALL_AS_MAIN_PROGRAM',
      'FULL_SEATING_LAYOUT',
      'INTERNAL_OPERATION_CENTERED_VIEW',
    ],
  }),
  lobby: Object.freeze({
    sceneId: 'lobby',
    sceneLabel: '大堂 / 大厅',
    requiredFunctions: [
      '到达、等候、导向',
      '公共动线组织',
    ],
    requiredSpatialElements: [
      '主入口与到达区',
      '等候座位区',
      '导向 / 服务点',
    ],
    circulationRequirements: [
      '入口到各功能区的清晰分支动线',
    ],
    privacyRequirements: [
      '开敞公共，低私密',
    ],
    scaleRequirements: [
      '中等偏大公共尺度',
    ],
    operationalRequirements: [
      '到达接待与短时等候',
    ],
    sourceProgramElementsToDrop: [
      '深私密咨询单元',
      '治疗 / 设备密集布局',
    ],
  }),
  reception: Object.freeze({
    sceneId: 'reception',
    sceneLabel: '接待 / 前台',
    requiredFunctions: [
      '到达接待与引导',
      '短时咨询与预约',
    ],
    requiredSpatialElements: [
      '接待台',
      '访客暂停区',
      '与后方动线的关系',
    ],
    circulationRequirements: [
      '入口到接待台的直接视线',
      '接待台到各区域的分配动线',
    ],
    privacyRequirements: [
      '半公共，接待面开放',
    ],
    scaleRequirements: [
      '人尺度前台',
    ],
    operationalRequirements: [
      '接待人员操作面',
      '访客短时停留',
    ],
    sourceProgramElementsToDrop: [
      '大尺度诊疗设备',
      '深私密咨询床区',
    ],
  }),
  treatment_room: Object.freeze({
    sceneId: 'treatment_room',
    sceneLabel: '治疗室',
    requiredFunctions: [
      '专业治疗 / 护理操作',
      '设备使用与清洁动线',
    ],
    requiredSpatialElements: [
      '治疗床',
      '设备区',
      '清洁与储备面',
      '私密入口',
    ],
    circulationRequirements: [
      '治疗床周边操作环',
      '不与公共动线交叉',
    ],
    privacyRequirements: [
      '私密',
    ],
    scaleRequirements: [
      '紧凑人尺度治疗单元',
    ],
    operationalRequirements: [
      '设备电源与管线位置',
      '工作人员操作面',
    ],
    sourceProgramElementsToDrop: [
      '公共接待台',
      '大堂等候区',
    ],
  }),
  private_room: Object.freeze({
    sceneId: 'private_room',
    sceneLabel: '私密房间',
    requiredFunctions: [
      '一对一专属服务 / 咨询',
      '私密会面',
    ],
    requiredSpatialElements: [
      '私密边界',
      '小型洽谈 / 服务家具',
      '专属入口',
    ],
    circulationRequirements: [
      '独立到达与离开',
    ],
    privacyRequirements: [
      '高私密',
    ],
    scaleRequirements: [
      '小型私密单元',
    ],
    operationalRequirements: [
      '专属服务可达',
    ],
    sourceProgramElementsToDrop: [
      '公共动线',
      '开放展示区',
    ],
  }),
  display: Object.freeze({
    sceneId: 'display',
    sceneLabel: '展示 / 展览',
    requiredFunctions: [
      '展品 / 产品展示与浏览',
      '观看距离与动线组织',
    ],
    requiredSpatialElements: [
      '展陈面 / 展台',
      '浏览动线',
      '重点展品层级',
    ],
    circulationRequirements: [
      '连续浏览动线',
      '清晰观看距离',
    ],
    privacyRequirements: [
      '开敞浏览',
    ],
    scaleRequirements: [
      '展示尺度',
    ],
    operationalRequirements: [
      '展品可达与安全',
    ],
    sourceProgramElementsToDrop: [
      '封闭私密单元',
      '治疗设备布局',
    ],
  }),
  retail: Object.freeze({
    sceneId: 'retail',
    sceneLabel: '零售',
    requiredFunctions: [
      '商品陈列与选购',
      '收银与购买',
    ],
    requiredSpatialElements: [
      '货架 / 陈列面',
      '收银点',
      '顾客通道',
    ],
    circulationRequirements: [
      '进店到选购到收银动线',
    ],
    privacyRequirements: [
      '开敞商业',
    ],
    scaleRequirements: [
      '零售人尺度',
    ],
    operationalRequirements: [
      '补货与收银操作',
    ],
    sourceProgramElementsToDrop: [
      '诊疗设备',
      '私密咨询单元',
    ],
  }),
  dining: Object.freeze({
    sceneId: 'dining',
    sceneLabel: '用餐区',
    requiredFunctions: [
      '堂食点餐与就餐',
      '明档 / 出餐可见',
    ],
    requiredSpatialElements: [
      '餐桌与座位',
      '明档 / 出餐面',
      '顾客与服务员动线',
    ],
    circulationRequirements: [
      '进店到落座到点餐到就餐动线',
    ],
    privacyRequirements: [
      '开敞餐饮',
    ],
    scaleRequirements: [
      '餐饮人尺度',
    ],
    operationalRequirements: [
      '服务通道',
      '出餐与收台',
    ],
    sourceProgramElementsToDrop: [
      '咨询桌椅',
      '诊疗设备',
    ],
  }),
});

/**
 * Resolve a target functional program for a scene id.
 * @param {string} scene  target scene id (lowercase slug)
 * @param {string} [customSceneDescription] required when scene === 'custom'
 * @returns {object} target functional program IR
 */
export function resolveTargetFunctionalProgram(scene, customSceneDescription) {
  const id = String(scene ?? '').trim().toLowerCase();
  const known = TARGET_FUNCTIONAL_PROGRAMS[id];
  if (known) return known;
  if (id === 'custom') {
    const description = String(customSceneDescription ?? '').trim();
    if (!description) {
      throw Object.assign(new Error('SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED: custom scene requires a description'), {
        code: 'SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED',
      });
    }
    // Deterministic minimal program from the user description (no LLM).
    return Object.freeze({
      sceneId: 'custom',
      sceneLabel: '自定义空间',
      requiredFunctions: [description],
      requiredSpatialElements: [],
      circulationRequirements: ['按照用户描述组织进入与内部动线'],
      privacyRequirements: [],
      scaleRequirements: ['人尺度'],
      operationalRequirements: [],
      sourceProgramElementsToDrop: ['原场景的大型公共接待台', '原场景的大堂级布局'],
    });
  }
  throw Object.assign(new Error(`SPACE_CONTINUATION_TARGET_SCENE_UNKNOWN: unknown target scene "${scene}"`), {
    code: 'SPACE_CONTINUATION_TARGET_SCENE_UNKNOWN',
  });
}

// R11.1 v1.2 view strategy registry (semantic composition role, not a fixed lens).
// The target scene overrides the source view; continuation never inherits the
// source entrance/lobby overview framing.
export const TARGET_VIEW_STRATEGIES = Object.freeze({
  entrance: 'threshold_arrival_view',
  lobby: 'public_overview_view',
  reception: 'reception_arrival_view',
  consultation: 'human_scale_consultation_view',
  treatment_room: 'private_treatment_view',
  private_room: 'intimate_private_view',
  display: 'exhibit_browse_view',
  retail: 'retail_aisle_view',
  dining: 'operational_dining_view',
  custom: 'custom_scene_view',
});

/**
 * Resolve the semantic view strategy for a target scene id.
 */
export function viewStrategyForScene(scene) {
  const id = String(scene ?? '').trim().toLowerCase();
  return TARGET_VIEW_STRATEGIES[id] ?? 'human_scale_consultation_view';
}

