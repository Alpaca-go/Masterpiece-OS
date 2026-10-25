const TARGET_FUNCTIONAL_PROGRAM_VERSION = "space-target-functional-program@1.0.0";
const TARGET_FUNCTIONAL_PROGRAMS = Object.freeze({
  // Exterior authority describes the camera's domain, never an inferred
  // interior program or permission to see through a window.
  storefront: Object.freeze({
    sceneId: "storefront",
    sceneLabel: "门店外立面",
    viewStrategy: "exterior_front_view",
    requiredFunctions: ["Exterior arrival and identification"],
    requiredSpatialElements: ["Facade boundary", "Threshold and street relationship"],
    circulationRequirements: ["Street-to-threshold access"],
    privacyRequirements: [],
    scaleRequirements: [],
    operationalRequirements: [],
    sourceProgramElementsToDrop: []
  }),
  consultation: Object.freeze({
    sceneId: "consultation",
    sceneLabel: "\u54A8\u8BE2\u5BA4",
    // R11.1 v1.2: view strategy is a semantic composition role, not a fixed
    // lens. consultation must NOT use entrance_view / lobby overview.
    viewStrategy: "human_scale_consultation_view",
    requiredFunctions: [
      "1 \u5BF9 1 / 1 \u5BF9 2 \u4E13\u4E1A\u54A8\u8BE2",
      "\u4EA7\u54C1 / \u670D\u52A1\u4FE1\u606F\u5C55\u793A\u4E0E\u8BF4\u660E",
      "\u8F7B\u91CF\u4E13\u4E1A\u54A8\u8BE2\u64CD\u4F5C"
    ],
    requiredSpatialElements: [
      "\u54A8\u8BE2\u684C\u6216\u4F4E\u684C",
      "2\u20133 \u4EBA\u54A8\u8BE2\u5EA7\u4F4D",
      "\u534A\u79C1\u5BC6\u6216\u79C1\u5BC6\u8FB9\u754C",
      "\u533B\u7597 / \u4EA7\u54C1\u4FE1\u606F\u5C55\u793A\u9762",
      "\u54A8\u8BE2\u8BBE\u5907\u6216\u8F7B\u91CF\u4E13\u4E1A\u8BBE\u5907",
      "\u6E05\u6670\u5165\u53E3\u4E0E\u843D\u5EA7\u5173\u7CFB"
    ],
    circulationRequirements: [
      "\u4ECE\u516C\u5171\u7B49\u5019\u533A\u660E\u786E\u8FDB\u5165\u54A8\u8BE2\u5355\u5143\u7684\u8FC7\u6E21",
      "\u54A8\u8BE2\u5355\u5143\u5185\u90E8\u7B80\u6D01\u52A8\u7EBF\uFF0C\u4E0D\u7A7F\u8D8A\u516C\u5171\u5927\u5385"
    ],
    privacyRequirements: [
      "\u534A\u79C1\u5BC6\u5230\u79C1\u5BC6\u8FB9\u754C",
      "\u4E0E\u516C\u5171\u63A5\u5F85 / \u7B49\u5019\u533A\u660E\u786E\u533A\u5206"
    ],
    scaleRequirements: [
      "\u8F83\u5C0F\u5C3A\u5EA6\u3001\u4EBA\u5C3A\u5EA6\u54A8\u8BE2\u5355\u5143",
      "\u975E\u5927\u5802\u7EA7\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u54A8\u8BE2\u8FC7\u7A0B\u6240\u9700\u7684\u684C\u9762\u4E0E\u5EA7\u4F4D\u5173\u7CFB",
      "\u4FE1\u606F\u5C55\u793A\u4E0E\u54A8\u8BE2\u52A8\u4F5C\u53EF\u8FBE"
    ],
    sourceProgramElementsToDrop: [
      "\u5927\u578B\u516C\u5171\u63A5\u5F85\u53F0",
      "\u5927\u5C3A\u5EA6 Lobby \u6784\u56FE",
      "\u5927\u9762\u79EF\u516C\u5171\u7B49\u5019\u533A",
      "\u524D\u5385\u5F0F\u8FCE\u5BBE\u8F74\u7EBF"
    ],
    // R11.1 v1.2 semantic tags (scene-program semantics, not brand hardcode).
    sourceProgramDropTags: [
      "PUBLIC_RECEPTION",
      "PUBLIC_ARRIVAL_AXIS",
      "LOBBY_WAITING",
      "PUBLIC_FRONT_DESK_HIERARCHY"
    ]
  }),
  entrance: Object.freeze({
    sceneId: "entrance",
    sceneLabel: "\u95E8\u5E97\u5165\u53E3",
    viewStrategy: "threshold_arrival_view",
    requiredFunctions: [
      "\u95E8\u5E97\u5230\u8FBE\u3001\u8BC6\u522B\u4E0E\u6B22\u8FCE",
      "\u8FDB\u5165\u5802\u98DF / \u5185\u90E8\u7A7A\u95F4\u7684\u5F15\u5BFC"
    ],
    requiredSpatialElements: [
      "storefront / threshold \u95E8\u69DB",
      "arrival sequence \u5230\u8FBE\u5E8F\u5217",
      "welcome / host \u8FCE\u5BBE\u70B9",
      "\u5165\u53E3\u4E0E\u5185\u90E8\u7A7A\u95F4\u7684\u5C40\u90E8\u53EF\u89C1\u5173\u7CFB"
    ],
    circulationRequirements: [
      "\u4ECE\u8857\u9053 / \u5BA4\u5916\u5230\u5185\u90E8\u7684\u6E05\u6670\u8FDB\u5165\u8DEF\u5F84",
      "\u5230\u8FBE\u5230\u8BC6\u522B\u5230\u8FDB\u5165\u7684\u4E09\u6BB5\u5E8F\u5217"
    ],
    privacyRequirements: [
      "\u5165\u53E3\u5F00\u655E\u3001\u6B22\u8FCE\u3001\u900F\u660E",
      "\u4E0D\u8BBE\u5C01\u95ED\u524D\u5BA4"
    ],
    scaleRequirements: [
      "\u4EBA\u5C3A\u5EA6\u5165\u53E3\u5BBD\u5EA6\u4E0E\u51C0\u9AD8",
      "\u8857\u9762\u5C3A\u5EA6\u800C\u975E\u5802\u98DF\u5927\u5385\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u8FCE\u5BBE / \u5F15\u5BFC\u53EF\u8FBE",
      "\u6392\u961F / \u53D6\u9910\u5173\u7CFB\uFF08\u5982\u9002\u7528\uFF09\u7684\u5165\u53E3\u5E03\u7F6E"
    ],
    sourceProgramElementsToDrop: [
      "\u4E2D\u592E\u5F00\u653E\u53A8\u623F\u4F5C\u4E3A\u753B\u9762\u4E3B\u4F53",
      "\u5B8C\u6574\u5802\u98DF\u5927\u5385\u5E03\u5C40",
      "\u5927\u9762\u79EF\u9910\u684C\u5361\u5EA7",
      "\u4EE5\u51FA\u9910\u533A\u4E3A\u4E2D\u5FC3\u7684\u5185\u90E8\u8FD0\u8425\u6784\u56FE"
    ],
    sourceProgramDropTags: [
      "OPEN_KITCHEN_CORE_AS_MAIN_COMPOSITION",
      "DINING_HALL_AS_MAIN_PROGRAM",
      "FULL_SEATING_LAYOUT",
      "INTERNAL_OPERATION_CENTERED_VIEW"
    ]
  }),
  lobby: Object.freeze({
    sceneId: "lobby",
    sceneLabel: "\u5927\u5802 / \u5927\u5385",
    requiredFunctions: [
      "\u5230\u8FBE\u3001\u7B49\u5019\u3001\u5BFC\u5411",
      "\u516C\u5171\u52A8\u7EBF\u7EC4\u7EC7"
    ],
    requiredSpatialElements: [
      "\u4E3B\u5165\u53E3\u4E0E\u5230\u8FBE\u533A",
      "\u7B49\u5019\u5EA7\u4F4D\u533A",
      "\u5BFC\u5411 / \u670D\u52A1\u70B9"
    ],
    circulationRequirements: [
      "\u5165\u53E3\u5230\u5404\u529F\u80FD\u533A\u7684\u6E05\u6670\u5206\u652F\u52A8\u7EBF"
    ],
    privacyRequirements: [
      "\u5F00\u655E\u516C\u5171\uFF0C\u4F4E\u79C1\u5BC6"
    ],
    scaleRequirements: [
      "\u4E2D\u7B49\u504F\u5927\u516C\u5171\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u5230\u8FBE\u63A5\u5F85\u4E0E\u77ED\u65F6\u7B49\u5019"
    ],
    sourceProgramElementsToDrop: [
      "\u6DF1\u79C1\u5BC6\u54A8\u8BE2\u5355\u5143",
      "\u6CBB\u7597 / \u8BBE\u5907\u5BC6\u96C6\u5E03\u5C40"
    ]
  }),
  reception: Object.freeze({
    sceneId: "reception",
    sceneLabel: "\u63A5\u5F85 / \u524D\u53F0",
    requiredFunctions: [
      "\u5230\u8FBE\u63A5\u5F85\u4E0E\u5F15\u5BFC",
      "\u77ED\u65F6\u54A8\u8BE2\u4E0E\u9884\u7EA6"
    ],
    requiredSpatialElements: [
      "\u63A5\u5F85\u53F0",
      "\u8BBF\u5BA2\u6682\u505C\u533A",
      "\u4E0E\u540E\u65B9\u52A8\u7EBF\u7684\u5173\u7CFB"
    ],
    circulationRequirements: [
      "\u5165\u53E3\u5230\u63A5\u5F85\u53F0\u7684\u76F4\u63A5\u89C6\u7EBF",
      "\u63A5\u5F85\u53F0\u5230\u5404\u533A\u57DF\u7684\u5206\u914D\u52A8\u7EBF"
    ],
    privacyRequirements: [
      "\u534A\u516C\u5171\uFF0C\u63A5\u5F85\u9762\u5F00\u653E"
    ],
    scaleRequirements: [
      "\u4EBA\u5C3A\u5EA6\u524D\u53F0"
    ],
    operationalRequirements: [
      "\u63A5\u5F85\u4EBA\u5458\u64CD\u4F5C\u9762",
      "\u8BBF\u5BA2\u77ED\u65F6\u505C\u7559"
    ],
    sourceProgramElementsToDrop: [
      "\u5927\u5C3A\u5EA6\u8BCA\u7597\u8BBE\u5907",
      "\u6DF1\u79C1\u5BC6\u54A8\u8BE2\u5E8A\u533A"
    ]
  }),
  treatment_room: Object.freeze({
    sceneId: "treatment_room",
    sceneLabel: "\u6CBB\u7597\u5BA4",
    requiredFunctions: [
      "\u4E13\u4E1A\u6CBB\u7597 / \u62A4\u7406\u64CD\u4F5C",
      "\u8BBE\u5907\u4F7F\u7528\u4E0E\u6E05\u6D01\u52A8\u7EBF"
    ],
    requiredSpatialElements: [
      "\u6CBB\u7597\u5E8A",
      "\u8BBE\u5907\u533A",
      "\u6E05\u6D01\u4E0E\u50A8\u5907\u9762",
      "\u79C1\u5BC6\u5165\u53E3"
    ],
    circulationRequirements: [
      "\u6CBB\u7597\u5E8A\u5468\u8FB9\u64CD\u4F5C\u73AF",
      "\u4E0D\u4E0E\u516C\u5171\u52A8\u7EBF\u4EA4\u53C9"
    ],
    privacyRequirements: [
      "\u79C1\u5BC6"
    ],
    scaleRequirements: [
      "\u7D27\u51D1\u4EBA\u5C3A\u5EA6\u6CBB\u7597\u5355\u5143"
    ],
    operationalRequirements: [
      "\u8BBE\u5907\u7535\u6E90\u4E0E\u7BA1\u7EBF\u4F4D\u7F6E",
      "\u5DE5\u4F5C\u4EBA\u5458\u64CD\u4F5C\u9762"
    ],
    sourceProgramElementsToDrop: [
      "\u516C\u5171\u63A5\u5F85\u53F0",
      "\u5927\u5802\u7B49\u5019\u533A"
    ]
  }),
  private_room: Object.freeze({
    sceneId: "private_room",
    sceneLabel: "\u79C1\u5BC6\u623F\u95F4",
    requiredFunctions: [
      "\u4E00\u5BF9\u4E00\u4E13\u5C5E\u670D\u52A1 / \u54A8\u8BE2",
      "\u79C1\u5BC6\u4F1A\u9762"
    ],
    requiredSpatialElements: [
      "\u79C1\u5BC6\u8FB9\u754C",
      "\u5C0F\u578B\u6D3D\u8C08 / \u670D\u52A1\u5BB6\u5177",
      "\u4E13\u5C5E\u5165\u53E3"
    ],
    circulationRequirements: [
      "\u72EC\u7ACB\u5230\u8FBE\u4E0E\u79BB\u5F00"
    ],
    privacyRequirements: [
      "\u9AD8\u79C1\u5BC6"
    ],
    scaleRequirements: [
      "\u5C0F\u578B\u79C1\u5BC6\u5355\u5143"
    ],
    operationalRequirements: [
      "\u4E13\u5C5E\u670D\u52A1\u53EF\u8FBE"
    ],
    sourceProgramElementsToDrop: [
      "\u516C\u5171\u52A8\u7EBF",
      "\u5F00\u653E\u5C55\u793A\u533A"
    ]
  }),
  display: Object.freeze({
    sceneId: "display",
    sceneLabel: "\u5C55\u793A / \u5C55\u89C8",
    requiredFunctions: [
      "\u5C55\u54C1 / \u4EA7\u54C1\u5C55\u793A\u4E0E\u6D4F\u89C8",
      "\u89C2\u770B\u8DDD\u79BB\u4E0E\u52A8\u7EBF\u7EC4\u7EC7"
    ],
    requiredSpatialElements: [
      "\u5C55\u9648\u9762 / \u5C55\u53F0",
      "\u6D4F\u89C8\u52A8\u7EBF",
      "\u91CD\u70B9\u5C55\u54C1\u5C42\u7EA7"
    ],
    circulationRequirements: [
      "\u8FDE\u7EED\u6D4F\u89C8\u52A8\u7EBF",
      "\u6E05\u6670\u89C2\u770B\u8DDD\u79BB"
    ],
    privacyRequirements: [
      "\u5F00\u655E\u6D4F\u89C8"
    ],
    scaleRequirements: [
      "\u5C55\u793A\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u5C55\u54C1\u53EF\u8FBE\u4E0E\u5B89\u5168"
    ],
    sourceProgramElementsToDrop: [
      "\u5C01\u95ED\u79C1\u5BC6\u5355\u5143",
      "\u6CBB\u7597\u8BBE\u5907\u5E03\u5C40"
    ]
  }),
  retail: Object.freeze({
    sceneId: "retail",
    sceneLabel: "\u96F6\u552E",
    requiredFunctions: [
      "\u5546\u54C1\u9648\u5217\u4E0E\u9009\u8D2D",
      "\u6536\u94F6\u4E0E\u8D2D\u4E70"
    ],
    requiredSpatialElements: [
      "\u8D27\u67B6 / \u9648\u5217\u9762",
      "\u6536\u94F6\u70B9",
      "\u987E\u5BA2\u901A\u9053"
    ],
    circulationRequirements: [
      "\u8FDB\u5E97\u5230\u9009\u8D2D\u5230\u6536\u94F6\u52A8\u7EBF"
    ],
    privacyRequirements: [
      "\u5F00\u655E\u5546\u4E1A"
    ],
    scaleRequirements: [
      "\u96F6\u552E\u4EBA\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u8865\u8D27\u4E0E\u6536\u94F6\u64CD\u4F5C"
    ],
    sourceProgramElementsToDrop: [
      "\u8BCA\u7597\u8BBE\u5907",
      "\u79C1\u5BC6\u54A8\u8BE2\u5355\u5143"
    ]
  }),
  dining: Object.freeze({
    sceneId: "dining",
    sceneLabel: "\u7528\u9910\u533A",
    requiredFunctions: [
      "\u5802\u98DF\u70B9\u9910\u4E0E\u5C31\u9910",
      "\u660E\u6863 / \u51FA\u9910\u53EF\u89C1"
    ],
    requiredSpatialElements: [
      "\u9910\u684C\u4E0E\u5EA7\u4F4D",
      "\u660E\u6863 / \u51FA\u9910\u9762",
      "\u987E\u5BA2\u4E0E\u670D\u52A1\u5458\u52A8\u7EBF"
    ],
    circulationRequirements: [
      "\u8FDB\u5E97\u5230\u843D\u5EA7\u5230\u70B9\u9910\u5230\u5C31\u9910\u52A8\u7EBF"
    ],
    privacyRequirements: [
      "\u5F00\u655E\u9910\u996E"
    ],
    scaleRequirements: [
      "\u9910\u996E\u4EBA\u5C3A\u5EA6"
    ],
    operationalRequirements: [
      "\u670D\u52A1\u901A\u9053",
      "\u51FA\u9910\u4E0E\u6536\u53F0"
    ],
    sourceProgramElementsToDrop: [
      "\u54A8\u8BE2\u684C\u6905",
      "\u8BCA\u7597\u8BBE\u5907"
    ]
  })
});
function resolveTargetFunctionalProgram(scene, customSceneDescription) {
  const id = String(scene ?? "").trim().toLowerCase();
  const known = TARGET_FUNCTIONAL_PROGRAMS[id];
  if (known) return known;
  if (id === "custom") {
    const description = String(customSceneDescription ?? "").trim();
    if (!description) {
      throw Object.assign(new Error("SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED: custom scene requires a description"), {
        code: "SPACE_CONTINUATION_CUSTOM_SCENE_DESCRIPTION_REQUIRED"
      });
    }
    return Object.freeze({
      sceneId: "custom",
      sceneLabel: "\u81EA\u5B9A\u4E49\u7A7A\u95F4",
      requiredFunctions: [description],
      requiredSpatialElements: [],
      circulationRequirements: ["\u6309\u7167\u7528\u6237\u63CF\u8FF0\u7EC4\u7EC7\u8FDB\u5165\u4E0E\u5185\u90E8\u52A8\u7EBF"],
      privacyRequirements: [],
      scaleRequirements: ["\u4EBA\u5C3A\u5EA6"],
      operationalRequirements: [],
      sourceProgramElementsToDrop: ["\u539F\u573A\u666F\u7684\u5927\u578B\u516C\u5171\u63A5\u5F85\u53F0", "\u539F\u573A\u666F\u7684\u5927\u5802\u7EA7\u5E03\u5C40"]
    });
  }
  throw Object.assign(new Error(`SPACE_CONTINUATION_TARGET_SCENE_UNKNOWN: unknown target scene "${scene}"`), {
    code: "SPACE_CONTINUATION_TARGET_SCENE_UNKNOWN"
  });
}
const TARGET_VIEW_STRATEGIES = Object.freeze({
  storefront: "exterior_front_view",
  entrance: "threshold_arrival_view",
  lobby: "public_overview_view",
  reception: "reception_arrival_view",
  consultation: "human_scale_consultation_view",
  treatment_room: "private_treatment_view",
  private_room: "intimate_private_view",
  display: "exhibit_browse_view",
  retail: "retail_aisle_view",
  dining: "operational_dining_view",
  custom: "custom_scene_view"
});
function viewStrategyForScene(scene) {
  const id = String(scene ?? "").trim().toLowerCase();
  return TARGET_VIEW_STRATEGIES[id] ?? "human_scale_consultation_view";
}
export {
  TARGET_FUNCTIONAL_PROGRAMS,
  TARGET_FUNCTIONAL_PROGRAM_VERSION,
  TARGET_VIEW_STRATEGIES,
  resolveTargetFunctionalProgram,
  viewStrategyForScene
};
