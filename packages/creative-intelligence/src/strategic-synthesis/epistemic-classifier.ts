/**
 * CI-W1C.7.4-R1 — Planning Claim Epistemic Classifier.
 *
 * Deterministic, conservative classifier for planning-claim
 * epistemic class. Replaces the previous all-FACT extraction
 * (PART F).
 *
 * Hard rules (spec PART F / PART G):
 *  - Precedence: UNKNOWN > USER_REQUIREMENT > MODEL_INFERENCE > FACT.
 *    The FIRST matching category wins; the rest are ignored.
 *  - If a line carries an UNKNOWN marker (e.g. 待确认 / TBD), it
 *    is UNKNOWN regardless of any other marker.
 *  - USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN MUST NEVER be
 *    promoted to FACT (the router in `epistemic-routing.ts`
 *    enforces this separately).
 *  - Default = FACT (a plain declarative statement without any
 *    of the markers above).
 *
 * Marker sources:
 *  - UNKNOWN: 待确认 / 未知 / 未定 / TBD / unknown / not confirmed
 *  - USER_REQUIREMENT: 必须 / 需要 / 应 / 目标是 / 希望 / 要求 /
 *    should / must / need to / objective is / required / required to
 *  - MODEL_INFERENCE: 建议 / 可以考虑 / 推测 / 可能 / recommend /
 *    suggest / could / may / likely / probably
 *
 * The classifier performs NO model call. It is pure regex over
 * the value + line text. Conservative precedence biases toward
 * UNKNOWN/USER_REQUIREMENT over FACT — the spec calls for this
 * explicitly so a planning brief with mixed voice (declarative +
 * recommended + unknown) does not collapse to all FACT.
 */

import type { PlanningEpistemicClass } from './planning-strategic-evidence.ts';

interface MarkerGroup {
  readonly class: PlanningEpistemicClass;
  readonly patterns: readonly RegExp[];
}

const UNKNOWN_MARKERS: MarkerGroup = {
  class: 'UNKNOWN',
  patterns: [
    /待确认/,
    /未知/,
    /未定/,
    /TBD/,
    /\bnot\s+confirmed\b/i,
    /\bunknown\b/i,
    /\bunconfirmed\b/i,
    /\bto be (?:determined|defined|decided)\b/i,
    /\bnot yet\b/i
  ]
};

const USER_REQUIREMENT_MARKERS: MarkerGroup = {
  class: 'USER_REQUIREMENT',
  patterns: [
    /必须/,
    /需要/,
    /需要/,
    /\b应该\b/,
    /目标是/,
    /希望/,
    /要求/,
    /\bshould\b/i,
    /\bmust\b/i,
    /\bneed(?:s|ed)?\s+to\b/i,
    /\bobjectives?\s+(?:is|are)\b/i,
    /\brequired\b/i,
    /\bmandatory\b/i,
    /\bhas to\b/i
  ]
};

const MODEL_INFERENCE_MARKERS: MarkerGroup = {
  class: 'MODEL_INFERENCE',
  patterns: [
    /建议/,
    /可以考虑/,
    /推测/,
    /\b可能\b/,
    /\b或许\b/,
    /\brecommend(?:ed|ation)?\b/i,
    /\bsuggest(?:ed|ion)?\b/i,
    /\bcould\b/i,
    /\bmay\b/i,
    /\blikely\b/i,
    /\bprobably\b/i,
    /\bperhaps\b/i,
    /\bpossibly\b/i
  ]
};

/**
 * Marker groups in precedence order. First match wins.
 */
const MARKER_GROUPS: readonly MarkerGroup[] = [
  UNKNOWN_MARKERS,
  USER_REQUIREMENT_MARKERS,
  MODEL_INFERENCE_MARKERS
];

/**
 * Classify a single planning-claim value (or full line) into an
 * epistemic class. Conservative precedence:
 *   UNKNOWN > USER_REQUIREMENT > MODEL_INFERENCE > FACT.
 *
 * @param input.value     The matched value (after the key + colon).
 *                        This is the user-stated claim text.
 * @param input.lineText  The full line (key + value). Used so the
 *                        classifier can pick up context near the key.
 * @param input.documentRole  The classifyDocumentRole() result.
 *                        Reserved for future tuning; currently unused.
 */
export function classifyPlanningClaimEpistemicClass(input: {
  value: string;
  lineText?: string;
  documentRole?: string;
}): PlanningEpistemicClass {
  const haystack = `${input.lineText ?? ''}\n${input.value ?? ''}`;
  for (const group of MARKER_GROUPS) {
    for (const pattern of group.patterns) {
      if (pattern.test(haystack)) return group.class;
    }
  }
  return 'FACT';
}

/**
 * Test-only / debug export: the marker groups.
 */
export const __INTERNAL_MARKER_GROUPS = MARKER_GROUPS;
