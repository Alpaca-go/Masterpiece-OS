import {
  buildVisualUnderstandingCore,
  validateVisualUnderstandingCore
} from "./visual-understanding-core.js";
import {
  buildVisualDecisionPacket,
  validateVisualDecisionPacket
} from "./visual-decision-packet.js";
function buildUnifiedVisualUnderstandingPrompt(project, assetIds) {
  return `\u4F60\u662F Unified Visual Understanding \u5F15\u64CE\u3002\u53EA\u57FA\u4E8E\u672C\u6D88\u606F\u4E2D\u7684 ProjectRecord \u786C\u4E8B\u5B9E\u548C\u968F\u9644\u539F\u59CB\u89C6\u89C9\u8D44\u4EA7\u5DE5\u4F5C\uFF0C\u4E0D\u5F97\u8BFB\u53D6\u3001\u5F15\u7528\u6216\u590D\u8FF0\u4EFB\u4F55\u5206\u6790\u62A5\u544A\uFF0C\u4E5F\u4E0D\u5F97\u4F7F\u7528\u5176\u4ED6\u9879\u76EE\u7684\u7ED3\u8BBA\u3002

\u9879\u76EE\u786C\u4E8B\u5B9E\uFF08\u4F18\u5148\u4E8E\u89C6\u89C9\u63A8\u65AD\uFF09\uFF1A
- projectId: ${project.id}
- brandName: ${project.brandName || project.projectName || "unknown"}
- industry: ${project.industry || project.detectedIndustry || "unknown"}
- logoLocked: ${project.logoLocked !== false}
- userLockedFacts: ${JSON.stringify(project.lockedFacts || [])}
- attachedAssetIds: ${JSON.stringify(assetIds)}

\u8DE8\u9879\u76EE\u6DF1\u5EA6\u6807\u51C6\uFF08\u5177\u4F53\u7B54\u6848\u53EA\u80FD\u6765\u81EA\u5F53\u524D\u9879\u76EE\u8BC1\u636E\uFF09\uFF1A
- brandRole \u53EA\u8BB0\u5F55\u8BC1\u636E\u652F\u6301\u7684\u4E1A\u52A1\u89D2\u8272\uFF0C\u4E0D\u5F97\u7531\u884C\u4E1A\u8BCD\u3001\u54C1\u724C\u540D\u79F0\u6216\u62BD\u8C61\u6982\u5FF5\u8865\u5199\u573A\u666F\u529F\u80FD\u3002
- diagnosis \u5206\u522B\u8BB0\u5F55\u5386\u53F2\u8D44\u4EA7\u4EF7\u503C\u3001\u8FC7\u5EA6\u6216\u8FC7\u65F6\u8868\u8FBE\u3001\u54C1\u7C7B\u9648\u8BCD\u6EE5\u8C03\u3001\u9879\u76EE\u8BEF\u8BFB\u98CE\u9669\u548C\u8DE8\u5A92\u4ECB\u65AD\u5C42\u3002
- brandMisreadRisks \u6BCF\u9879\u5FC5\u987B\u5305\u542B\u7A33\u5B9A code\u3001\u53EF\u6267\u884C description\u3001\u9002\u7528\u7684\u4EFB\u52A1 family/subtype/scene\u3001\u8BC1\u636E\u3001\u7F6E\u4FE1\u5EA6\u548C\u786E\u8BA4\u72B6\u6001\uFF1B\u65E0\u6CD5\u786E\u8BA4\u9002\u7528\u8303\u56F4\u65F6\u6807\u8BB0 probable\u3002
- creativeDecision \u8BF4\u660E\u4FDD\u7559\u3001\u524A\u5F31\u3001\u79FB\u9664\u548C\u5347\u7EA7\u5173\u7CFB\uFF1B\u4E0D\u5F97\u7528\u901A\u7528\u6C14\u8D28\u8BCD\u66FF\u4EE3\u5F53\u524D\u9879\u76EE\u5224\u65AD\u3002
- abstractions \u4EC5\u4ECE\u5F53\u524D\u8D44\u4EA7\u8BC1\u636E\u63D0\u53D6\u8BED\u4E49\u3001\u5F62\u5F0F\u3001\u8282\u594F\u3001\u6750\u6599\u548C\u5149\u7EBF\u6F5C\u529B\uFF0C\u5E76\u660E\u786E\u7981\u6B62\u5B57\u9762\u590D\u5236\u3002
- spatial \u7684\u7ED3\u6784\u3001\u6750\u6599\u3001\u5149\u7EBF\u3001\u8272\u5F69\u548C\u54C1\u724C\u6574\u5408\u5FC5\u987B\u662F\u5F53\u524D\u9879\u76EE\u7684\u7ED3\u6784\u5316\u51B3\u7B56\uFF0C\u4E0D\u80FD\u7531\u884C\u4E1A\u540D\u79F0\u6216\u54C1\u724C\u89D2\u8272\u8865\u9F50\u3002
- brandRoleManifestation\u3001signatureSpatialMechanism\u3001functionalNetwork\u3001positiveDifferentiators \u548C mustBeVisible \u53EA\u80FD\u6765\u81EA\u5F53\u524D\u9879\u76EE\u8BC1\u636E\u6216\u7528\u6237\u786E\u8BA4\uFF1B\u4E0D\u5F97\u4ECE\u9879\u76EE\u540D\u3001\u884C\u4E1A\u6216\u901A\u7528\u6A21\u677F\u63A8\u65AD\u3002
- signatureSpatialMechanism \u5FC5\u987B\u63CF\u8FF0\u4E00\u4E2A\u53EF\u4EE5\u88AB\u76F4\u63A5\u753B\u51FA\u5E76\u5728\u591A\u4E2A\u670D\u52A1\u8282\u70B9\u8FDE\u7EED\u8FFD\u8E2A\u7684\u6838\u5FC3\u7A7A\u95F4\u7EC4\u7EC7\u673A\u5236\uFF1BmustBeVisible \u8BF4\u660E\u5355\u5F20\u7ED3\u679C\u4E2D\u5FC5\u987B\u53EF\u89C1\u7684\u8BC1\u636E\u3002
- functionalRelationships \u53EA\u5217\u8BC1\u636E\u660E\u786E\u652F\u6301\u7684\u529F\u80FD\u5173\u7CFB\uFF1BsceneProgram \u53EA\u5217\u5F53\u524D\u6210\u679C\u7269\u6240\u9700\u7684\u7A7A\u95F4\u7A0B\u5E8F\uFF1BpeopleBehavior \u4E3A\u7A7A\u5373\u8868\u793A\u4E0D\u8981\u6C42\u4EBA\u7269\u3002
- \u989C\u8272\u5C42\u7EA7\u3001\u6750\u6599\u7269\u7406\u884C\u4E3A\u548C\u5149\u7EBF\u4E92\u52A8\u5FC5\u987B\u53EF\u6267\u884C\uFF0C\u4F46\u4E0D\u5F97\u5957\u7528\u56FA\u5B9A\u6BD4\u4F8B\u3001\u56FA\u5B9A\u6750\u8D28\u6216\u56FA\u5B9A\u6C14\u8D28\u7B54\u6848\u3002
- \u9879\u76EE\u8BEF\u8BFB\u98CE\u9669\u4E0D\u5F97\u5199\u5165\u65E0\u5173\u4EFB\u52A1\uFF1BappliesTo \u662F\u540E\u7EED Compiler \u662F\u5426\u5E94\u7528\u8BE5\u98CE\u9669\u7684\u552F\u4E00\u573A\u666F\u8FB9\u754C\u3002

\u53EA\u8FD4\u56DE\u4E00\u4E2A\u88F8 JSON \u5BF9\u8C61\uFF0C\u4E0D\u8981 Markdown\u3001\u89E3\u91CA\u6216\u4EE3\u7801\u56F4\u680F\u3002\u7ED3\u6784\u5982\u4E0B\uFF1A
{
  "projectFacts": {
    "brandName": { "value": "", "source": "project_record|source_document|visual_asset|user_input|file_metadata|model_inference", "evidenceRefs": [], "confidence": 0.0, "status": "confirmed|probable|unknown|conflict" },
    "industry": { "value": "", "source": "...", "evidenceRefs": [], "confidence": 0.0, "status": "..." },
    "brandRole": { "value": "", "source": "...", "evidenceRefs": [], "confidence": 0.0, "status": "..." }
  },
  "assetInventory": {
    "logoAssets": [],
    "colorAssets": [],
    "typographyAssets": [],
    "graphicMotifs": [],
    "imageryAssets": [],
    "layoutPatterns": [],
    "materialCues": [],
    "packagingStructures": [],
    "spatialCues": [],
    "copyAssets": []
  },
  "diagnosis": {
    "valuableAssets": [],
    "overusedExpressions": [],
    "outdatedExpressions": [],
    "weakSystemAreas": [],
    "categoryCliches": [],
    "brandMisreadRisks": [{
      "code": "",
      "description": "",
      "target": "",
      "observation": "",
      "whyItMatters": "",
      "appliesTo": { "taskFamilies": [], "subtypes": [], "scenes": [] },
      "evidenceRefs": [],
      "confidence": 0.0,
      "status": "confirmed|probable"
    }],
    "crossMediaGaps": []
  },
  "creativeDecision": {
    "brandRoleStatement": "",
    "upgradeFrom": [],
    "preserveCore": [],
    "upgradeTo": [],
    "uniqueUpgradeThesis": "",
    "targetWorldview": [],
    "toneBoundaries": [
      {
        "target": "",
        "avoid": [""]
      },
      {
        "target": "",
        "avoid": [""]
      }
    ],
    "strategicNegatives": []
  },
  "abstractions": [{
    "sourceAsset": "",
    "semanticMeaning": [],
    "formalProperties": [],
    "rhythmProperties": [],
    "materialPotential": [],
    "lightingPotential": [],
    "forbiddenLiteralUse": [],
    "evidenceRefs": [],
    "confidence": 0.0
  }],
  "mediaTranslations": {
    "sharedBrandCore": [],
    "spatial": {
      "spatialConcept": "",
      "brandRoleManifestation": [],
      "signatureSpatialMechanism": [],
      "functionalNetwork": [],
      "positiveDifferentiators": [],
      "mustBeVisible": [],
      "structureLanguage": [],
      "materialLanguage": [
        { "material": "\u5F53\u524D\u9879\u76EE\u8BC1\u636E\u652F\u6301\u7684\u6750\u6599", "behavior": ["\u53EF\u89C2\u5BDF\u7684\u7269\u7406\u884C\u4E3A"], "brandRole": "\u8BE5\u6750\u6599\u5728\u5F53\u524D\u8BBE\u8BA1\u51B3\u7B56\u4E2D\u7684\u4F5C\u7528", "forbidden": [] }
      ],
      "lightingLanguage": {
        "source": ["\u5F53\u524D\u573A\u666F\u7684\u5149\u6E90\u51B3\u7B56"],
        "contrast": "\u5F53\u524D\u9879\u76EE\u7684\u5BF9\u6BD4\u5173\u7CFB",
        "interactionWithMaterials": ["\u5149\u7EBF\u4E0E\u5DF2\u9009\u6750\u6599\u7684\u7269\u7406\u4E92\u52A8"],
        "forbidden": []
      },
      "colorBehavior": {
        "primary": [{ "name": "\u5F53\u524D\u9879\u76EE\u4E3B\u8272", "role": "\u5F53\u524D\u8BC1\u636E\u652F\u6301\u7684\u4F5C\u7528" }],
        "secondary": [{ "name": "\u5F53\u524D\u9879\u76EE\u8F85\u52A9\u8272", "role": "\u5F53\u524D\u8BC1\u636E\u652F\u6301\u7684\u4F5C\u7528" }],
        "accent": [{ "name": "\u5F53\u524D\u9879\u76EE\u5F3A\u8C03\u8272", "role": "\u5F53\u524D\u8BC1\u636E\u652F\u6301\u7684\u4F5C\u7528" }],
        "forbidden": []
      },
      "brandIntegration": [],
      "functionalRelationships": [],
      "sceneProgram": [],
      "peopleBehavior": [],
      "functionalExperience": [],
      "sceneMisreadRisks": []
    },
    "packaging": {
      "packagingConcept": "",
      "productAndCategoryRole": [],
      "structureStrategy": [{ "structure": "", "purpose": "", "locked": false, "evidenceRefs": [] }],
      "openingExperience": [],
      "productArrangement": [],
      "graphicTranslation": [{ "sourceMeaning": "", "packagingExpression": [], "forbiddenLiteralUse": [] }],
      "informationHierarchy": [],
      "substrateLanguage": [],
      "craftLanguage": [{ "craft": "", "purpose": "", "forbiddenUse": [] }],
      "colorBehavior": { "base": [], "identity": [], "accent": [], "forbidden": [] },
      "logoPolicy": [],
      "seriesArchitecture": [],
      "photographyDirection": [],
      "packagingMisreadRisks": []
    },
    "poster": { "concept": "", "expressionLanguage": [], "misreadRisks": [] },
    "vi": { "concept": "", "expressionLanguage": [], "misreadRisks": [] }
  }
}

\u6570\u7EC4\u8D44\u4EA7\u9879\u4F7F\u7528\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
{ "assetId": "", "name": "", "occurrenceRefs": [], "frequency": 1, "visualFeatures": [], "possibleBrandMeaning": [], "isOriginalAsset": true, "userConfirmed": false, "editable": null, "contextRole": "brand_asset|mockup_environment|reference_case|display_decoration|unknown", "confidence": 0.0 }

\u666E\u901A\u8BCA\u65AD\u9879\u4F7F\u7528\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
{ "target": "", "observation": "", "whyItMatters": "", "evidenceRefs": [], "confidence": 0.0 }

brandMisreadRisks \u4F7F\u7528\u4EE5\u4E0B\u5B57\u6BB5\uFF1A
{ "code": "", "description": "", "target": "", "observation": "", "whyItMatters": "", "appliesTo": { "taskFamilies": [], "subtypes": [], "scenes": [] }, "evidenceRefs": [], "confidence": 0.0, "status": "confirmed|probable" }

\u5F3A\u5236\u89C4\u5219\uFF1A
1. \u6BCF\u4E2A\u786C\u4E8B\u5B9E\u548C\u8BCA\u65AD\u5FC5\u987B\u643A\u5E26\u53EF\u5B9A\u4F4D evidenceRefs\uFF1B\u65E0\u6CD5\u786E\u8BA4\u5C31\u6807 unknown\uFF0C\u7981\u6B62\u7F16\u9020\u884C\u4E1A\u66FF\u4EE3\u7B54\u6848\u3002
2. Mockup \u80CC\u666F\u6750\u8D28\u3001\u5C55\u793A\u9875\u88C5\u9970\u548C\u53C2\u8003\u6848\u4F8B\u5FC5\u987B\u4E0E\u771F\u5B9E\u54C1\u724C\u8D44\u4EA7\u5206\u5F00\u3002
3. model_inference \u4E0D\u5F97\u4F2A\u88C5\u6210 confirmed\uFF0C\u4E5F\u4E0D\u5F97\u63D0\u51FA Locked Assets\uFF1BLocked Assets \u7531\u672C\u5730\u7CFB\u7EDF\u6839\u636E ProjectRecord \u6784\u5EFA\u3002
4. \u8BCA\u65AD\u5FC5\u987B\u533A\u5206\u201C\u6709\u5386\u53F2\u8BC6\u522B\u4EF7\u503C\u201D\u4E0E\u201C\u4F7F\u7528\u8FC7\u5EA6/\u8FC7\u65F6\u201D\uFF1B\u8BEF\u8BFB\u98CE\u9669\u5FC5\u987B\u63D0\u4F9B\u4EFB\u52A1\u9002\u7528\u8303\u56F4\uFF0C\u7981\u6B62\u8F93\u51FA\u65E0\u573A\u666F\u8FB9\u754C\u7684\u884C\u4E1A\u9ED8\u8BA4\u9650\u5236\u3002
5. uniqueUpgradeThesis \u5FC5\u987B\u540C\u65F6\u56DE\u7B54\u539F\u6765\u662F\u4EC0\u4E48\u3001\u4E3A\u4EC0\u4E48\u4E0D\u8DB3\u3001\u4FDD\u7559\u4EC0\u4E48\u3001\u5347\u7EA7\u6210\u4EC0\u4E48\u3001\u5982\u4F55\u907F\u514D\u65B0\u8BEF\u8BFB\u3002
6. \u62BD\u8C61\u4E0D\u5F97\u53EA\u8F93\u51FA\u201C\u51E0\u4F55\u7EB9\u7406\u201D\uFF1B\u5FC5\u987B\u540C\u65F6\u8986\u76D6\u8BED\u4E49\u3001\u5F62\u5F0F\u3001\u8282\u594F\u3001\u6750\u6599\u6F5C\u529B\u3001\u5149\u7EBF\u6F5C\u529B\u548C\u7981\u6B62\u5B57\u9762\u590D\u5236\u3002
7. spatial \u5FC5\u987B\u628A\u62BD\u8C61\u5C5E\u6027\u8F6C\u6210\u771F\u5B9E\u7A7A\u95F4\u7ED3\u6784\u3001\u6750\u6599\u884C\u4E3A\u3001\u5149\u7EBF\u884C\u4E3A\u3001\u8272\u5F69\u884C\u4E3A\u548C\u663E\u5F0F\u573A\u666F\u7A0B\u5E8F\uFF1B\u6CA1\u6709\u8BC1\u636E\u65F6\u4EBA\u7269\u548C\u529F\u80FD\u5173\u7CFB\u4FDD\u6301\u7A7A\u6570\u7EC4\u3002
8. \u4E0D\u5F97\u6839\u636E\u884C\u4E1A\u8BCD\u3001\u54C1\u724C\u89D2\u8272\u8BCD\u3001\u9879\u76EE\u540D\u79F0\u6216\u62BD\u8C61\u6C14\u8D28\u8BCD\u63A8\u65AD\u5177\u4F53\u6750\u6599\u3001\u4EBA\u7269\u3001\u529F\u80FD\u5173\u7CFB\u3001\u7A7A\u95F4\u7A0B\u5E8F\u6216\u8D1F\u9762\u573A\u666F\u3002
9. packaging \u5FC5\u987B\u628A\u9879\u76EE\u51B3\u7B56\u8F6C\u8BD1\u4E3A\u5305\u88C5\u7ED3\u6784\u3001\u5F00\u5408\u3001\u5185\u88C5\u3001\u56FE\u5F62\u4FE1\u606F\u3001\u57FA\u6750\u3001\u5DE5\u827A\u3001\u8272\u5F69\u4E0E\u4EA7\u54C1\u6444\u5F71\u8BED\u8A00\uFF1B\u6CA1\u6709\u5305\u88C5\u7ED3\u6784\u8BC1\u636E\u65F6 structureStrategy \u7559\u7A7A\uFF0C\u7981\u6B62\u731C\u6D4B\u76D2\u578B\u3002poster/vi \u672C\u8F6E\u4ECD\u53EF\u7559\u7A7A\u3002
10. \u4E0D\u5F97\u590D\u5236 Golden Prompt \u6216\u4EFB\u4F55\u56FA\u5B9A\u9879\u76EE\u7B54\u6848\uFF1B\u6240\u6709\u7ED3\u8BBA\u5FC5\u987B\u7531\u5F53\u524D\u9879\u76EE\u8BC1\u636E\u63A8\u51FA\u3002
11. toneBoundaries \u81F3\u5C11\u8F93\u51FA 2 \u9879\uFF1B\u6BCF\u9879\u5FC5\u987B\u540C\u65F6\u5305\u542B\u975E\u7A7A target \u4E0E\u81F3\u5C11 1 \u4E2A avoid\u3002target \u4E0E avoid \u5FC5\u987B\u7531\u5F53\u524D\u9879\u76EE\u8BC1\u636E\u3001\u8BEF\u8BFB\u98CE\u9669\u6216\u6218\u7565\u8D1F\u9762\u9879\u63A8\u51FA\uFF0C\u7981\u6B62\u586B\u5199\u901A\u7528\u884C\u4E1A\u6A21\u677F\u3002`;
}
function normalizeUnifiedVisualUnderstanding(input) {
  const core = buildVisualUnderstandingCore(input);
  const coreValidation = validateVisualUnderstandingCore(core);
  if (!coreValidation.valid) {
    throw Object.assign(new Error(`Visual Understanding Core invalid: ${coreValidation.errors.join("; ")}`), {
      code: "VISUAL_UNDERSTANDING_INVALID",
      issues: coreValidation.errors
    });
  }
  const packet = buildVisualDecisionPacket({ core, extracted: input.extracted });
  const packetValidation = validateVisualDecisionPacket(packet);
  if (!packetValidation.valid) {
    throw Object.assign(new Error(`Visual Decision Packet invalid: ${packetValidation.errors.join("; ")}`), {
      code: "VISUAL_DECISION_PACKET_INVALID",
      issues: packetValidation.errors
    });
  }
  const enforceExecutionSufficiency = input.enforceExecutionSufficiency !== false;
  if (enforceExecutionSufficiency && packet.validation.hardFactStatus === "pass" && packet.validation.executionDataStatus !== "ready") {
    throw Object.assign(
      new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${packet.validation.missingExecutionFields.join(", ")}`),
      {
        code: "VISUAL_DECISION_PACKET_INSUFFICIENT",
        issues: packet.validation.missingExecutionFields
      }
    );
  }
  if (enforceExecutionSufficiency && packet.validation.hardFactStatus === "pass") {
    const issues = [];
    if (!packet.diagnosis.valuableAssets.length) issues.push("diagnosis.valuableAssets");
    if (!packet.creativeDecision.uniqueUpgradeThesis) issues.push("creativeDecision.uniqueUpgradeThesis");
    if (!packet.colorSystem.primary.length || !packet.colorSystem.secondary.length || !packet.colorSystem.accent.length) {
      issues.push("mediaTranslations.spatial.colorBehavior requires primary/secondary/accent");
    }
    if (issues.length) {
      throw Object.assign(new Error(`VISUAL_DECISION_PACKET_INSUFFICIENT: ${issues.join(", ")}`), {
        code: "VISUAL_DECISION_PACKET_INSUFFICIENT",
        issues
      });
    }
  }
  return { core, packet };
}
export {
  buildUnifiedVisualUnderstandingPrompt,
  normalizeUnifiedVisualUnderstanding
};
