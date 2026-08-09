// R11.1 v1.2 Source Program Leakage Gate.
//
// Fail-closed: in continuation mode the final prompt must NOT re-introduce the
// source scene's program elements (or their semantic tags) that the target
// program explicitly dropped. If it does, generation is blocked with
// SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK and the provider never runs.
//
// This is NOT a keyword ban ("reception" is still legal for a consultation
// project's small check-in). It checks that the SPECIFIC dropped source
// elements / tags / view strategies have not resurfaced as hard functional
// requirements or the active view.

export const SOURCE_PROGRAM_LEAKAGE_GATE_VERSION = 'space-source-program-leakage-gate@1.2.0';

/**
 * Scan the final continuation prompt for source program leakage.
 *
 * @param {object} input
 * @param {object} input.contract       validated continuation contract
 * @param {string} input.finalPrompt    compiled final prompt
 * @returns {{ status:'pass'|'block', findings:string[], leaked:string[] }}
 */
export function assertNoSourceProgramLeakage({ contract = {}, finalPrompt = '' } = {}) {
  const findings = [];
  const leaked = [];
  const rawPrompt = String(finalPrompt ?? '');
  // The Continuation Intent block intentionally lists the source elements to
  // drop ("Do not carry over from source"). Those are DROP INSTRUCTIONS, not
  // source program leakage. Scan only the blocks AFTER the intent, so the
  // intent's own drop list does not self-trigger the gate.
  const intentStart = rawPrompt.indexOf('# Continuation Intent');
  let prompt = rawPrompt;
  if (intentStart >= 0) {
    // Remove the intent block: from its title to the next '# ' block header.
    const nextHeader = rawPrompt.indexOf('\n# ', intentStart + 1);
    prompt = nextHeader >= 0 ? rawPrompt.slice(nextHeader + 1) : rawPrompt.slice(intentStart + 1);
  }
  const program = contract.targetFunctionalProgram ?? {};
  const dropElements = (program.sourceProgramElementsToDrop ?? []).map((d) => d.trim()).filter(Boolean);
  const dropTags = (program.sourceProgramDropTags ?? []).map((d) => String(d).toLowerCase()).filter(Boolean);
  const viewStrategy = program.viewStrategy ?? '';
  const sourceScene = String(contract.sourceScene ?? '');

  // 1) Dropped source elements must not reappear as hard functional content.
  for (const element of dropElements) {
    if (!element) continue;
    // "大型公共接待台" must not be a hard requirement. But a generic "接待"
    // mention inside a consultation context is legal; we only flag the exact
    // dropped element or its strong synonym.
    if (prompt.includes(element)) {
      leaked.push(element);
      findings.push(`source element re-leaked: ${element}`);
    }
  }

  // 2) Dropped semantic tags: if the tag's source phrase appears in a
  //    hard-requirement context (Architecture-Function Bridge /
  //    Functional Requirement), flag it.
  const tagPhrases = {
    PUBLIC_RECEPTION: ['接待台正对入口', '大型公共接待台', '大型公共前台'],
    PUBLIC_ARRIVAL_AXIS: ['前厅式迎宾', '迎宾轴线', '入口视线聚焦'],
    LOBBY_WAITING: ['大面积公共等候区'],
    PUBLIC_FRONT_DESK_HIERARCHY: ['前台主导', 'front desk as primary'],
    OPEN_KITCHEN_CORE_AS_MAIN_COMPOSITION: ['中央开放厨房作为画面主体'],
    DINING_HALL_AS_MAIN_PROGRAM: ['完整堂食大厅布局'],
    FULL_SEATING_LAYOUT: ['大面积餐桌卡座'],
    INTERNAL_OPERATION_CENTERED_VIEW: ['以出餐区为中心'],
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

  // 3) Source view strategy must not be the active view for the target.
  //    entrance_view is the classic source-frame leak for a consultation target.
  if (sourceScene && contract.targetScene && viewStrategy) {
    const sourceView = { reception: 'entrance_view', dining: 'entrance_view', lobby: 'entrance_view' }[sourceScene];
    if (sourceView && prompt.includes(sourceView)) {
      leaked.push(`source view ${sourceView}`);
      findings.push(`source view strategy ${sourceView} still active for target ${contract.targetScene}`);
    }
  }

  return {
    schemaVersion: '1.0',
    version: SOURCE_PROGRAM_LEAKAGE_GATE_VERSION,
    status: findings.length ? 'block' : 'pass',
    findings,
    leaked,
  };
}

/**
 * Throw the fail-closed error when leakage is found.
 */
export function enforceNoSourceProgramLeakage(input) {
  const result = assertNoSourceProgramLeakage(input);
  if (result.status === 'block') {
    throw Object.assign(
      new Error(`SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK: ${result.findings.join('; ')}`),
      { code: 'SPACE_CONTINUATION_SOURCE_PROGRAM_LEAK', leakage: result },
    );
  }
  return result;
}
