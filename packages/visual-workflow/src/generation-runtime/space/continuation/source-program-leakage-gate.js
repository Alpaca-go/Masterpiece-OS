const SOURCE_PROGRAM_LEAKAGE_GATE_VERSION = "space-source-program-leakage-gate@1.2.0";
function assertNoSourceProgramLeakage({ contract = {}, finalPrompt = "" } = {}) {
  const findings = [];
  const leaked = [];
  const rawPrompt = String(finalPrompt ?? "");
  const intentStart = rawPrompt.indexOf("# Continuation Intent");
  let prompt = rawPrompt;
  if (intentStart >= 0) {
    const nextHeader = rawPrompt.indexOf("\n# ", intentStart + 1);
    prompt = nextHeader >= 0 ? rawPrompt.slice(nextHeader + 1) : rawPrompt.slice(intentStart + 1);
  }
  const program = contract.targetFunctionalProgram ?? {};
  const dropElements = (program.sourceProgramElementsToDrop ?? []).map((d) => d.trim()).filter(Boolean);
  const dropTags = (program.sourceProgramDropTags ?? []).map((d) => String(d).toLowerCase()).filter(Boolean);
  const viewStrategy = program.viewStrategy ?? "";
  const sourceScene = String(contract.sourceScene ?? "");
  for (const element of dropElements) {
    if (!element) continue;
    if (prompt.includes(element)) {
      leaked.push(element);
      findings.push(`source element re-leaked: ${element}`);
    }
  }
  const tagPhrases = {
    PUBLIC_RECEPTION: ["\u63A5\u5F85\u53F0\u6B63\u5BF9\u5165\u53E3", "\u5927\u578B\u516C\u5171\u63A5\u5F85\u53F0", "\u5927\u578B\u516C\u5171\u524D\u53F0"],
    PUBLIC_ARRIVAL_AXIS: ["\u524D\u5385\u5F0F\u8FCE\u5BBE", "\u8FCE\u5BBE\u8F74\u7EBF", "\u5165\u53E3\u89C6\u7EBF\u805A\u7126"],
    LOBBY_WAITING: ["\u5927\u9762\u79EF\u516C\u5171\u7B49\u5019\u533A"],
    PUBLIC_FRONT_DESK_HIERARCHY: ["\u524D\u53F0\u4E3B\u5BFC", "front desk as primary"],
    OPEN_KITCHEN_CORE_AS_MAIN_COMPOSITION: ["\u4E2D\u592E\u5F00\u653E\u53A8\u623F\u4F5C\u4E3A\u753B\u9762\u4E3B\u4F53"],
    DINING_HALL_AS_MAIN_PROGRAM: ["\u5B8C\u6574\u5802\u98DF\u5927\u5385\u5E03\u5C40"],
    FULL_SEATING_LAYOUT: ["\u5927\u9762\u79EF\u9910\u684C\u5361\u5EA7"],
    INTERNAL_OPERATION_CENTERED_VIEW: ["\u4EE5\u51FA\u9910\u533A\u4E3A\u4E2D\u5FC3"]
  };
  for (const tag of dropTags) {
    const phrases = tagPhrases[tag.toUpperCase()] ?? [];
    for (const phrase of phrases) {
      if (prompt.includes(phrase)) {
        leaked.push(`${tag}:${phrase}`);
        findings.push(`source semantic tag ${tag} re-leaked via: ${phrase}`);
      }
    }
  }
  if (sourceScene && contract.targetScene && viewStrategy) {
    const sourceView = { reception: "entrance_view", dining: "entrance_view", lobby: "entrance_view" }[sourceScene];
    if (sourceView && prompt.includes(sourceView)) {
      leaked.push(`source view ${sourceView}`);
      findings.push(`source view strategy ${sourceView} still active for target ${contract.targetScene}`);
    }
  }
  return {
    schemaVersion: "1.0",
    version: SOURCE_PROGRAM_LEAKAGE_GATE_VERSION,
    status: findings.length ? "block" : "pass",
    findings,
    leaked
  };
}
function enforceNoSourceProgramLeakage(input) {
  const result = assertNoSourceProgramLeakage(input);
  if (result.status === "block") {
    throw Object.assign(
      new Error(`SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK: ${result.findings.join("; ")}`),
      { code: "SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK", leakage: result }
    );
  }
  return result;
}
export {
  SOURCE_PROGRAM_LEAKAGE_GATE_VERSION,
  assertNoSourceProgramLeakage,
  enforceNoSourceProgramLeakage
};
