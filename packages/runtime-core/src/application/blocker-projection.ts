/**
 * CI-W1B.2: Direction-Blocked Blocker Projection.
 *
 * Pure functions that convert Concept gate diagnostics + DirectionSet
 * selection outcomes into structured `CreativeIntelligenceBlockerSummary`
 * rows. The Runtime owns the projection so the Web side never has to
 * re-derive Gate semantics from raw `conceptSet.gateResults`.
 *
 * Hard invariants:
 *   - Web NEVER imports the CI package; this module is the only
 *     place where conceptSet.gateResults shape is read.
 *   - The Web side consumes `blockerSummaries` as opaque projection
 *     rows; it does not parse `code` / `issueCodes` semantically.
 *   - `count` is computed from `affectedConceptIds.length`; the
 *     projection is the single source of truth for "how many".
 *
 * Pure. No IO. No model call.
 */

import type { CreativeIntelligenceBlockerSummary } from '../application-contracts.ts';

// ---------------------------------------------------------------------------
// Title registry (Chinese + English). Title is the only user-facing
// text; everything else is opaque to the Web. Titles are stable across
// versions because they are the Web's only contract for grouping.
// ---------------------------------------------------------------------------

const BLOCKER_TITLE_BY_CODE: Record<string, string> = {
  MISSING_CRITICAL_NEED_COVERAGE: '关键需求覆盖不足',
  OFFICIAL_CERTIFICATION_CLAIM: '未经事实支持的认证信息',
  CRITICAL_CONFLICT_DEPENDENCY: '品牌身份存在未解决冲突',
  CRITICAL_UNKNOWN_DEPENDENCY: '概念依赖关键未知事实',
  REFERENCE_IDENTITY_CONTAMINATION: '参考来源污染了品牌身份',
  NO_TRACED_FACTS: '概念没有可追溯到的事实依据',
  UNSUPPORTED_CLAIM: '概念含未经证据支持的事实声明',
  ALL_TRACED_FACTS_ARE_REFERENCE: '概念的所有事实均来自参考',
  EVIDENCE_REFS_DONT_RESOLVE: '概念证据引用未与事实关联',
  UNEXPECTED_BRAND_NAME_WARNING: '概念文本中出现疑似品牌名称',
  BRAND_IDENTITY_REDESIGN_PROPOSED: '概念提议修改品牌身份',
  SPECIFIC_PERCENTAGE_CLAIM: '概念含具体百分比声明',
  SPECIFIC_SCALE_CLAIM: '概念含具体规模数字',
  PRODUCT_GENERATION_CLAIM: '概念含具体产品代际声明',
  LOCKED_ASSET_REDESIGN_SUSPECTED: '概念含可能修改锁定资产的动词',
  REFERENCE_BRAND_AS_CURRENT: '概念将参考品牌当作当前品牌',
  VISUAL_MECHANISM_IN_STRATEGIC: 'strategicMechanism 中疑似包含具体视觉机制',
  FORBIDDEN_FIELD_NAME: '概念包含禁止的字段名',
  FORBIDDEN_TEXT_PATTERN: '概念文本包含禁止的方向/视觉机制模式',
  CONFLICT_DEPENDENCY: '概念依赖未解决冲突',
  UNKNOWN_DEPENDENCY: '概念依赖未知事实',
  REFERENCE_FACTS_PRESENT: '概念引用了参考事实',
  CI_APP_DIRECTION_BLOCKED_ALL: '当前没有可选择的创意方向',
};

const BLOCKER_CATEGORY_BY_CODE: Record<string, CreativeIntelligenceBlockerSummary['category']> = {
  MISSING_CRITICAL_NEED_COVERAGE: 'need_coverage',
  OFFICIAL_CERTIFICATION_CLAIM: 'asset_authorization',
  CRITICAL_CONFLICT_DEPENDENCY: 'identity_conflict',
  CRITICAL_UNKNOWN_DEPENDENCY: 'identity_conflict',
  REFERENCE_IDENTITY_CONTAMINATION: 'identity_conflict',
  NO_TRACED_FACTS: 'evidence_gap',
  UNSUPPORTED_CLAIM: 'unsupported_claim',
  ALL_TRACED_FACTS_ARE_REFERENCE: 'evidence_gap',
  EVIDENCE_REFS_DONT_RESOLVE: 'evidence_gap',
  UNEXPECTED_BRAND_NAME_WARNING: 'unsupported_claim',
  BRAND_IDENTITY_REDESIGN_PROPOSED: 'unsupported_claim',
  SPECIFIC_PERCENTAGE_CLAIM: 'unsupported_claim',
  SPECIFIC_SCALE_CLAIM: 'unsupported_claim',
  PRODUCT_GENERATION_CLAIM: 'unsupported_claim',
  LOCKED_ASSET_REDESIGN_SUSPECTED: 'asset_authorization',
  REFERENCE_BRAND_AS_CURRENT: 'identity_conflict',
  VISUAL_MECHANISM_IN_STRATEGIC: 'other',
  FORBIDDEN_FIELD_NAME: 'other',
  FORBIDDEN_TEXT_PATTERN: 'other',
  CONFLICT_DEPENDENCY: 'identity_conflict',
  UNKNOWN_DEPENDENCY: 'evidence_gap',
  REFERENCE_FACTS_PRESENT: 'evidence_gap',
  CI_APP_DIRECTION_BLOCKED_ALL: 'other',
};

// `recoverable` reflects today's known user recovery path:
//   - fact-confirmation revision is NOT yet supported (per Spec §12)
//   - "重新创建任务" / "删除此任务" are always available
// So the projection reports `recoverable: false` whenever the only
// path is a future revision capability. Today every blocker is
// non-recoverable from the application surface; the Web must
// therefore NOT show a fake "返回事实确认" button (Spec §11).
const NON_RECOVERABLE_CODES = new Set<string>([
  'MISSING_CRITICAL_NEED_COVERAGE',
  'OFFICIAL_CERTIFICATION_CLAIM',
  'CRITICAL_CONFLICT_DEPENDENCY',
  'CRITICAL_UNKNOWN_DEPENDENCY',
  'REFERENCE_IDENTITY_CONTAMINATION',
  'NO_TRACED_FACTS',
  'UNSUPPORTED_CLAIM',
  'ALL_TRACED_FACTS_ARE_REFERENCE',
  'EVIDENCE_REFS_DONT_RESOLVE',
  'REFERENCE_BRAND_AS_CURRENT',
  'FORBIDDEN_FIELD_NAME',
  'FORBIDDEN_TEXT_PATTERN',
  'CONFLICT_DEPENDENCY',
  'UNKNOWN_DEPENDENCY',
  'LOCKED_ASSET_REDESIGN_SUSPECTED',
  'REFERENCE_FACTS_PRESENT',
  'VISUAL_MECHANISM_IN_STRATEGIC',
]);

// Stable exported constants for tests
export const CI_APP_DIRECTION_BLOCKED_ALL = 'CI_APP_DIRECTION_BLOCKED_ALL';
export {
  BLOCKER_TITLE_BY_CODE,
  BLOCKER_CATEGORY_BY_CODE,
  NON_RECOVERABLE_CODES,
};

// ---------------------------------------------------------------------------
// Internal shapes — read from the persisted `conceptSet.gateResults`
// and `directionSet.evaluations` as structural type mirrors. We
// never import CI semantic types here; runtime-core owns the
// projection.
// ---------------------------------------------------------------------------

interface ConceptIssueLike {
  code: string;
  severity: 'warning' | 'block';
  message: string;
  conceptId: string;
  gate: string;
}

interface ConceptGateResultLike {
  conceptId: string;
  gate: string;
  status: 'pass' | 'pass_with_warnings' | 'blocked';
  issues: ConceptIssueLike[];
}

interface ConceptSetLike {
  concepts?: Array<{ id: string; status?: string }>;
  blockedConceptIds?: string[];
  gateResults?: ConceptGateResultLike[];
}

interface DirectionLike {
  id: string;
  status?: string;
}

interface DirectionEvaluationLike {
  directionId: string;
  status?: 'pass' | 'pass_with_warnings' | 'blocked';
  issues?: Array<{ code?: string; severity?: string; message?: string }>;
}

interface DirectionSetLike {
  directions?: DirectionLike[];
  blockedDirectionIds?: string[];
  evaluations?: DirectionEvaluationLike[];
}

/**
 * Determine whether a Direction is "selectable" (i.e. can be picked
 * by the user in the Web UI).
 *
 * Selectable iff:
 *   - its `status` is `grounded` OR `provisional`
 *   - it is NOT in `directionSet.blockedDirectionIds`
 *   - its evaluation `status` is NOT `blocked`
 *
 * This is the single source of truth used by both the application
 * state machine (decides whether to transition to `direction_blocked`
 * vs `awaiting_direction_selection`) and the Web controller (decides
 * whether a selection card can be offered).
 */
export function isSelectableDirection(
  direction: DirectionLike,
  directionSet: DirectionSetLike,
): boolean {
  if (direction.status !== 'grounded' && direction.status !== 'provisional') return false;
  const blockedIds = new Set<string>(directionSet.blockedDirectionIds ?? []);
  if (blockedIds.has(direction.id)) return false;
  const evaln = (directionSet.evaluations ?? []).find((e) => e.directionId === direction.id);
  if (evaln && evaln.status === 'blocked') return false;
  return true;
}

export function countSelectableDirections(directionSet: DirectionSetLike | null | undefined): number {
  if (!directionSet || !Array.isArray(directionSet.directions)) return 0;
  let n = 0;
  for (const d of directionSet.directions) {
    if (isSelectableDirection(d, directionSet)) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Project blocker summaries from a ConceptSet. The projection is
// grouped by issue code; affected Concept ids are listed for each
// code so the Web drawer can deep-link.
// ---------------------------------------------------------------------------

export function projectBlockerSummaries(
  conceptSet: ConceptSetLike | null | undefined,
  directionSet: DirectionSetLike | null | undefined,
  options: { includeAllBlockedFallback?: boolean } = {},
): CreativeIntelligenceBlockerSummary[] {
  if (!conceptSet) return [];
  const out: CreativeIntelligenceBlockerSummary[] = [];
  const gateResults = conceptSet.gateResults ?? [];

  // Group: code -> { conceptIds, title, category }
  const byCode = new Map<string, { conceptIds: Set<string>; codes: Set<string> }>();
  for (const r of gateResults) {
    if (r.status !== 'blocked') continue;
    for (const issue of r.issues) {
      if (issue.severity !== 'block') continue;
      let bucket = byCode.get(issue.code);
      if (!bucket) {
        bucket = { conceptIds: new Set(), codes: new Set() };
        byCode.set(issue.code, bucket);
      }
      bucket.conceptIds.add(r.conceptId);
      bucket.codes.add(issue.code);
    }
  }

  // Stable order: by descending concept count, then by code
  const codes = [...byCode.entries()].sort((a, b) => {
    if (b[1].conceptIds.size !== a[1].conceptIds.size) {
      return b[1].conceptIds.size - a[1].conceptIds.size;
    }
    return a[0].localeCompare(b[0]);
  });

  for (const [code, bucket] of codes) {
    const affectedConceptIds = [...bucket.conceptIds];
    out.push({
      code,
      title: BLOCKER_TITLE_BY_CODE[code] ?? code,
      category: BLOCKER_CATEGORY_BY_CODE[code] ?? 'other',
      affectedConceptIds,
      issueCodes: [...bucket.codes],
      count: affectedConceptIds.length,
      recoverable: !NON_RECOVERABLE_CODES.has(code),
    });
  }

  // If the set produced 0 selectable directions but the issue list is
  // empty (extremely rare; e.g. the ConceptSet itself was empty), emit
  // a single `CI_APP_DIRECTION_BLOCKED_ALL` summary so the Web always
  // has at least one row to render.
  if (out.length === 0 && options.includeAllBlockedFallback) {
    const hasZero = countSelectableDirections(directionSet) === 0;
    if (hasZero) {
      out.push({
        code: CI_APP_DIRECTION_BLOCKED_ALL,
        title: BLOCKER_TITLE_BY_CODE[CI_APP_DIRECTION_BLOCKED_ALL] ?? CI_APP_DIRECTION_BLOCKED_ALL,
        category: 'other',
        affectedConceptIds: [],
        issueCodes: [CI_APP_DIRECTION_BLOCKED_ALL],
        count: 0,
        recoverable: false,
      });
    }
  }

  return out;
}
