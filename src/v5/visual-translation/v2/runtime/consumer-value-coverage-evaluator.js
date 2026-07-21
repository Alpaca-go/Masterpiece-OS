// Consumer Value Coverage Gate (doc section 四 / 八).
//
// v2.1 adds an explicit downstream consumer value dimension so the three
// directions together cover the B2B2C 消费者安心与美学价值 leg. Each direction
// may declare `downstream_consumer_value` (present / role / value_statement /
// visual_expression / touchpoints / evidence_ids); when absent the gate derives
// the same signal from free text (the doc forbids forcing a human subject onto
// every direction — E01 may be secondary, E02/E03 must be explicit).
//
// Set-level rules (doc section 四):
//   - the three directions together must cover consumer value
//   - at least two directions must explicitly contain consumer value
//   - at least one direction's consumer value must be Primary or Strong Secondary
// Missing any of these => set_missing_consumer_value => blocked.

import { collectDirectionText } from './direction-text-util.js';
import { countKeywordHits } from './evaluator-keywords.js';

export const CONSUMER_VALUE_COVERAGE_EVALUATOR_VERSION = 'consumer-value-coverage-evaluator-v1';

const CONSUMER_KEYWORDS = ['消费者', '安心', '用户体验', '美学价值', '信任', '用户', '终端', '终端消费者', '消费者体验', '品质感', '精致'];
const PRIMARY_SECONDARY_ROLES = ['primary', 'strong_secondary'];

function detectPresent(text) {
  return countKeywordHits(text, CONSUMER_KEYWORDS) > 0;
}

function inferRole(present, structured) {
  if (structured && structured.consumer_value_role) return structured.consumer_value_role;
  if (!present) return 'none';
  // Without an explicit role we treat a detected (text-derived) presence as at
  // least secondary; the specialized-fix doc keeps E01 allowed to be secondary.
  return 'strong_secondary';
}

export function evaluateConsumerValueCoverage(directions = []) {
  const perDirection = directions.map((direction) => {
    const text = collectDirectionText(direction);
    const structured = direction.downstream_consumer_value;
    const present = structured && typeof structured.present === 'boolean'
      ? structured.present
      : detectPresent(text);
    const role = inferRole(present, structured);
    return {
      direction_id: direction.direction_id,
      present,
      consumer_value_role: role,
      value_statement: structured?.value_statement || '',
      visual_expression: structured?.visual_expression || '',
      touchpoints: structured?.touchpoints || [],
      evidence_ids: structured?.evidence_ids || [],
      explicit: Boolean(structured && typeof structured.present === 'boolean' ? structured.present : present)
    };
  });

  const explicitCount = perDirection.filter((item) => item.present).length;
  const primaryOrStrong = perDirection.filter((item) => PRIMARY_SECONDARY_ROLES.includes(item.consumer_value_role)).length;
  const setCovered = primaryOrStrong > 0;

  const blockingReasons = [];
  if (!setCovered) blockingReasons.push('set_missing_consumer_value');
  if (explicitCount < 2) blockingReasons.push('fewer_than_two_directions_consumer_value');
  if (primaryOrStrong < 1) blockingReasons.push('no_primary_or_strong_secondary_consumer_value');

  const setMissingConsumerValue = blockingReasons.length > 0;

  return {
    evaluator_version: CONSUMER_VALUE_COVERAGE_EVALUATOR_VERSION,
    per_direction: perDirection,
    explicit_consumer_count: explicitCount,
    primary_or_strong_secondary_count: primaryOrStrong,
    set_consumer_covered: setCovered,
    set_missing_consumer_value: setMissingConsumerValue,
    blocking_reasons: blockingReasons
  };
}
