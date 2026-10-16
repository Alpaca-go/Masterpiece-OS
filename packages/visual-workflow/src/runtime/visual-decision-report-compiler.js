function bullets(values, empty = "[Unknown] \u6682\u65E0\u53EF\u9760\u8BC1\u636E") {
  return values.length ? values.map((item) => `- ${item}`).join("\n") : `- ${empty}`;
}
function fact(label, value) {
  const tag = value.source === "user_input" ? "[User Confirmed]" : value.source === "model_inference" ? value.status === "unknown" ? "[Unknown]" : "[AI Diagnosis]" : "[Source Fact]";
  return `- ${tag} ${label}\uFF1A${Array.isArray(value.value) ? value.value.join("\u3001") : String(value.value)}\uFF08${value.status} / ${value.confidence.toFixed(2)}\uFF1B\u8BC1\u636E\uFF1A${value.evidenceRefs.join("\u3001") || "\u65E0"}\uFF09`;
}
function diagnosis(values) {
  return values.map((item) => `[AI Diagnosis] ${item.target}\uFF1A${item.observation}\uFF1B\u5F71\u54CD\uFF1A${item.whyItMatters}\uFF1B\u8BC1\u636E\uFF1A${item.evidenceRefs.join("\u3001") || "\u65E0"}\uFF1B\u7F6E\u4FE1\u5EA6\uFF1A${item.confidence.toFixed(2)}`);
}
function materials(packet) {
  return packet.materialSystem.map((item) => `[Creative Proposal] ${item.material}\uFF1A${item.behavior.join("\u3001")}\uFF1B\u54C1\u724C\u4F5C\u7528\uFF1A${item.brandRole}${item.forbidden.length ? `\uFF1B\u907F\u514D\uFF1A${item.forbidden.join("\u3001")}` : ""}`);
}
function colors(packet) {
  const render = (label, values) => values.map((item) => `[Creative Proposal] ${label} ${item.name}${item.ratio == null ? "" : ` ${item.ratio}%`}\uFF1A${item.role}`);
  return [
    ...render("\u4E3B\u8272", packet.colorSystem.primary),
    ...render("\u8F85\u52A9\u8272", packet.colorSystem.secondary),
    ...render("\u5F3A\u8C03\u8272", packet.colorSystem.accent),
    ...packet.colorSystem.forbidden.map((item) => `[Creative Proposal] \u8272\u5F69\u7981\u6B62\uFF1A${item}`)
  ];
}
function compileVisualDecisionReport(packet, options = {}) {
  const spatial = packet.mediaTranslations.spatial;
  const creative = packet.creativeDecision;
  const title = options.title || `${packet.projectFacts.brandName.value}\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A`;
  return `# ${title}

> \u672C\u62A5\u544A\u7531 Visual Decision Packet ${packet.schemaVersion} \u786E\u5B9A\u6027\u6E32\u67D3\u3002\u5206\u6790\u62A5\u544A\u4E0E\u751F\u56FE\u6267\u884C\u6570\u636E\u6765\u81EA\u540C\u4E00\u4EFD\u7EDF\u4E00\u89C6\u89C9\u7406\u89E3\u3002

## 0. \u9879\u76EE\u4E8B\u5B9E\u4E0E\u7F6E\u4FE1\u5EA6

${fact("\u54C1\u724C\u540D\u79F0", packet.projectFacts.brandName)}
${fact("\u884C\u4E1A", packet.projectFacts.industry)}
${fact("\u54C1\u724C\u4E1A\u52A1\u89D2\u8272", packet.projectFacts.brandRole)}
- ${packet.validation.hardFactStatus === "pass" ? "[Source Fact]" : "[Unknown]"} Hard Fact Gate\uFF1A${packet.validation.hardFactStatus}
${packet.validation.message ? `- [Unknown] ${packet.validation.message}` : ""}

## 1. \u539F\u65B9\u6848\u771F\u5B9E\u54C1\u724C\u8D44\u4EA7

${bullets(packet.lockedAssets.map((item) => `[${item.lockSource === "user_confirmed" ? "User Confirmed" : "Source Fact"}] ${item.type}\uFF1A${item.value}\uFF1B\u8BC1\u636E\uFF1A${item.evidenceRefs.join("\u3001") || "\u65E0"}`))}

## 2. \u6709\u4EF7\u503C\u7684\u89C6\u89C9\u8BB0\u5FC6

${bullets(diagnosis(packet.diagnosis.valuableAssets))}

## 3. \u8FC7\u5EA6\u3001\u8FC7\u65F6\u548C\u884C\u4E1A\u4FD7\u5957

${bullets([
    ...diagnosis(packet.diagnosis.overusedExpressions),
    ...diagnosis(packet.diagnosis.outdatedExpressions),
    ...diagnosis(packet.diagnosis.categoryCliches)
  ])}

## 4. \u54C1\u724C\u8BEF\u8BFB\u98CE\u9669

${bullets(diagnosis(packet.diagnosis.brandMisreadRisks))}

## 5. \u552F\u4E00\u89C6\u89C9\u5347\u7EA7\u547D\u9898

- [AI Diagnosis] \u54C1\u724C\u89D2\u8272\uFF1A${creative.brandRoleStatement || "\u672A\u5F62\u6210"}
- [Creative Proposal] \u4ECE\uFF1A${creative.upgradeFrom.join("\u3001") || "\u672A\u5F62\u6210"}
- [Creative Proposal] \u4FDD\u7559\uFF1A${creative.preserveCore.join("\u3001") || "\u672A\u5F62\u6210"}
- [Creative Proposal] \u5347\u7EA7\u4E3A\uFF1A${creative.upgradeTo.join("\u3001") || "\u672A\u5F62\u6210"}
- [Creative Proposal] ${creative.uniqueUpgradeThesis || "\u5C1A\u672A\u5F62\u6210\u552F\u4E00\u5347\u7EA7\u547D\u9898"}

## 6. \u6B63\u5411\u6C14\u8D28\u4E0E\u53CD\u5411\u8FB9\u754C

${bullets(creative.toneBoundaries.map((item) => `[Creative Proposal] ${item.target}\uFF1B\u907F\u514D\uFF1A${item.avoid.join("\u3001") || "\u672A\u5B9A\u4E49"}`))}

## 7. \u539F\u8D44\u4EA7\u62BD\u8C61\u5206\u6790

${bullets(packet.abstractions.map((item) => `[AI Diagnosis] ${item.sourceAsset}
  - \u8BED\u4E49\uFF1A${item.semanticMeaning.join("\u3001")}
  - \u5F62\u5F0F\uFF1A${item.formalProperties.join("\u3001")}
  - \u8282\u594F\uFF1A${item.rhythmProperties.join("\u3001")}
  - \u6750\u6599\u6F5C\u529B\uFF1A${item.materialPotential.join("\u3001")}
  - \u5149\u7EBF\u6F5C\u529B\uFF1A${item.lightingPotential.join("\u3001")}
  - \u7981\u6B62\u5B57\u9762\u590D\u5236\uFF1A${item.forbiddenLiteralUse.join("\u3001")}
  - \u8BC1\u636E\uFF1A${item.evidenceRefs.join("\u3001") || "\u65E0"}\uFF1B\u7F6E\u4FE1\u5EA6\uFF1A${item.confidence.toFixed(2)}`))}

## 8. \u5305\u88C5\u8F6C\u8BD1

- [Unknown] \u672C\u8F6E\u4EC5\u4FDD\u7559\u63A5\u53E3\uFF0C\u672A\u5F62\u6210\u6B63\u5F0F\u5305\u88C5\u7ED3\u8BBA\u3002

## 9. \u6D77\u62A5\u8F6C\u8BD1

- [Unknown] \u672C\u8F6E\u4EC5\u4FDD\u7559\u63A5\u53E3\uFF0C\u672A\u5F62\u6210\u6B63\u5F0F\u6D77\u62A5\u7ED3\u8BBA\u3002

## 10. \u7A7A\u95F4\u8F6C\u8BD1

- [Creative Proposal] \u7A7A\u95F4\u6982\u5FF5\uFF1A${spatial.spatialConcept || "\u6570\u636E\u4E0D\u8DB3"}
${bullets(spatial.structureLanguage.map((item) => `[Creative Proposal] \u7ED3\u6784\uFF1A${item}`))}
${bullets(spatial.brandIntegration.map((item) => `[Creative Proposal] \u54C1\u724C\u878D\u5408\uFF1A${item}`))}
${bullets(spatial.functionalRelationships.map((item) => `[Creative Proposal] \u529F\u80FD\u5173\u7CFB\uFF1A${item}`))}
${bullets(spatial.sceneProgram.map((item) => `[Creative Proposal] \u573A\u666F\u7A0B\u5E8F\uFF1A${item}`))}
${bullets(spatial.peopleBehavior.map((item) => `[Creative Proposal] \u4EBA\u7269\u884C\u4E3A\uFF1A${item}`))}
${bullets(packet.diagnosis.brandMisreadRisks.map((item) => `[AI Diagnosis] \u8BEF\u8BFB\u98CE\u9669 ${item.code}\uFF08${item.status}\uFF09\uFF1A${item.description}`))}

## 11. VI \u8F6C\u8BD1

- [Unknown] \u672C\u8F6E\u4EC5\u4FDD\u7559\u63A5\u53E3\uFF0C\u672A\u5F62\u6210\u6B63\u5F0F VI \u7ED3\u8BBA\u3002

## 12. \u8272\u5F69\u3001\u6750\u6599\u3001\u5149\u7EBF\u884C\u4E3A

### \u8272\u5F69

${bullets(colors(packet))}

### \u6750\u6599

${bullets(materials(packet))}

### \u5149\u7EBF

- [Creative Proposal] \u5149\u6E90\uFF1A${packet.lightingSystem.source.join("\u3001") || "\u6570\u636E\u4E0D\u8DB3"}
- [Creative Proposal] \u5BF9\u6BD4\uFF1A${packet.lightingSystem.contrast || "\u6570\u636E\u4E0D\u8DB3"}
${bullets(packet.lightingSystem.interactionWithMaterials.map((item) => `[Creative Proposal] \u6750\u6599\u4EA4\u4E92\uFF1A${item}`))}
${bullets(packet.lightingSystem.forbidden.map((item) => `[Creative Proposal] \u5149\u7EBF\u7981\u6B62\uFF1A${item}`))}

## 13. Locked / Confirmed / Proposed / Unknown

- [Source Fact] \u4E0E [User Confirmed] \u624D\u53EF\u8FDB\u5165 Locked Assets\u3002
- [AI Diagnosis] \u662F\u6709\u8BC1\u636E\u7684\u4E13\u4E1A\u5224\u65AD\uFF0C\u4E0D\u7B49\u4E8E\u7528\u6237\u9501\u5B9A\u4E8B\u5B9E\u3002
- [Creative Proposal] \u662F\u5347\u7EA7\u5EFA\u8BAE\uFF0C\u9664\u975E\u7528\u6237\u786E\u8BA4\uFF0C\u5426\u5219\u4E0D\u5F97\u81EA\u52A8 Locked\u3002
- [Unknown] \u4FDD\u6301\u672A\u77E5\u6216\u8FDB\u5165\u63A2\u7D22\u6A21\u5F0F\uFF0C\u7981\u6B62\u7528\u6A21\u578B\u63A8\u65AD\u9759\u9ED8\u8865\u9F50\u3002

## 14. \u751F\u56FE\u6267\u884C\u6458\u8981

- Packet\uFF1A${packet.validation.executionDataStatus}
- \u6B63\u5F0F\u5347\u7EA7\u6A21\u5F0F\uFF1A${packet.validation.mode}
- \u4E16\u754C\u89C2\uFF1A${creative.targetWorldview.join("\u3001") || "\u6570\u636E\u4E0D\u8DB3"}
- \u7A7A\u95F4\u7ED3\u6784\uFF1A${spatial.structureLanguage.join("\u3001") || "\u6570\u636E\u4E0D\u8DB3"}
- \u9879\u76EE\u4E13\u5C5E\u7981\u6B62\uFF1A${[
    ...packet.diagnosis.brandMisreadRisks.filter((item) => item.status === "confirmed").map((item) => item.description)
  ].filter((item, index, values) => values.indexOf(item) === index).join("\u3001") || "\u6570\u636E\u4E0D\u8DB3"}
`;
}
export {
  compileVisualDecisionReport
};
