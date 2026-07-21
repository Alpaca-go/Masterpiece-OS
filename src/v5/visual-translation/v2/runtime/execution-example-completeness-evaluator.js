// Execution Example Completeness Gate (v2.1.3 doc section 四).
//
// Evaluates each Execution Example across three severity tiers:
//   Critical  missing → blocked (the example cannot be executed as-is)
//   Required  missing → conditional (the example can run but needs supplementation)
//   Optional  missing → warning ( cosmetic / nice-to-have )
//
// Touchpoint coverage is computed as:
//   touchpointCoverageScore = 0.25 * countCoverage + 0.75 * fieldCompleteness

export const EXECUTION_EXAMPLE_COMPLETENESS_VERSION = 'execution-example-completeness-evaluator-v1';

function isFull(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const CRITICAL_FIELDS = [
  { key: 'touchpoint', alt: null },
  { key: 'hero_subject', alt: 'subject' },
  { key: 'information_zone', alt: null },
  { key: 'brand_zone', alt: null },
  { key: 'reused_assets', alt: null, isArray: true },
  { key: 'industry_recognition_source', alt: null }
];

const REQUIRED_FIELDS = [
  'canvas_ratio',
  'hero_subject_position',
  'hero_subject_scale',
  'whitespace_behavior',
  'responsive_adaptation',
  'anti_concept_art_rule'
];

const OPTIONAL_FIELDS = [
  { key: 'supporting_subjects', alt: null },
  { key: 'graphic_overlay', alt: null },
  { key: 'ratio_breakdown', alt: null, compound: ['canvas_ratio', 'photography_ratio', 'graphic_ratio', 'information_ratio'] },
  { key: 'downstream_consumer_note', alt: null, dcv: true, dcvField: 'value_statement' }
];

function checkExample(example) {
  const critical = [];
  const required = [];
  const optional = [];

  for (const f of CRITICAL_FIELDS) {
    if (f.isArray) {
      if (!example[f.key] || !Array.isArray(example[f.key]) || example[f.key].length < 1) {
        critical.push(f.key);
      }
      continue;
    }
    if (!isFull(example[f.key]) && !isFull(example[f.alt])) {
      critical.push(f.key);
    }
  }

  for (const f of REQUIRED_FIELDS) {
    if (!isFull(example[f])) required.push(f);
  }

  for (const f of OPTIONAL_FIELDS) {
    if (f.compound) {
      if (!f.compound.some((k) => isFull(example[k]))) optional.push(f.key);
    } else if (f.dcv) {
      const dcv = example.downstream_consumer_value;
      if (!dcv || !isFull(dcv[f.dcvField])) optional.push(f.key);
    } else if (!isFull(example[f.key]) && !isFull(example[f.alt])) {
      optional.push(f.key);
    }
  }

  return { critical, required, optional };
}

function computeTouchpointCoverageScore(directions) {
  const totalExamples = directions.reduce((sum, d) => sum + (d.execution_examples || []).length, 0);
  const totalExpected = directions.length * 3;

  const touchpoints = new Set();
  directions.forEach((d) => {
    (d.execution_examples || []).forEach((e) => {
      if (e.touchpoint && e.touchpoint.trim()) touchpoints.add(e.touchpoint);
    });
  });

  const countCoverage = totalExpected > 0 ? Math.min(1, touchpoints.size / totalExpected) : 0;

  // Field completeness: all critical fields across all examples
  let totalFields = 0;
  let filledFields = 0;
  directions.forEach((d) => {
    (d.execution_examples || []).forEach((ex) => {
      for (const f of CRITICAL_FIELDS) {
        totalFields++;
        if (f.isArray) {
          if (ex[f.key] && Array.isArray(ex[f.key]) && ex[f.key].length > 0) filledFields++;
        } else if (isFull(ex[f.key]) || isFull(ex[f.alt])) {
          filledFields++;
        }
      }
    });
  });

  const fieldCompleteness = totalFields > 0 ? filledFields / totalFields : 0;
  const score = 0.25 * countCoverage + 0.75 * fieldCompleteness;
  return { score, countCoverage, fieldCompleteness, touchpointCount: touchpoints.size, totalExamples, totalExpected };
}

export function evaluateExecutionExampleCompleteness(directions = []) {
  const perDirection = [];
  let anyBlocked = false;
  let anyConditional = false;
  let anyWarning = false;

  for (const direction of directions) {
    const examples = direction.execution_examples || [];
    const exampleResults = [];
    let dirBlocked = false;
    let dirConditional = false;
    let dirWarning = false;

    for (const ex of examples) {
      const { critical, required, optional } = checkExample(ex);
      if (critical.length > 0) dirBlocked = true;
      else if (required.length > 0) dirConditional = true;
      else if (optional.length > 0) dirWarning = true;

      exampleResults.push({
        touchpoint: ex.touchpoint || 'unknown',
        critical_missing: critical,
        required_missing: required,
        optional_missing: optional
      });
    }

    if (dirBlocked) anyBlocked = true;
    if (dirConditional) anyConditional = true;
    if (dirWarning) anyWarning = true;

    perDirection.push({
      direction_id: direction.direction_id,
      blocked: dirBlocked,
      conditional: dirConditional && !dirBlocked,
      warning: dirWarning && !dirBlocked && !dirConditional,
      example_count: examples.length,
      examples: exampleResults
    });
  }

  const coverage = computeTouchpointCoverageScore(directions);

  // Conditional when touchpoint coverage is low but not zero (<= 3 in doc §四)
  const coverageConditional = coverage.score > 0 && coverage.score <= 0.6;
  if (coverageConditional && !anyBlocked) anyConditional = true;

  return {
    evaluator_version: EXECUTION_EXAMPLE_COMPLETENESS_VERSION,
    per_direction: perDirection,
    touchpoint_coverage_score: Math.round(coverage.score * 100) / 100,
    touchpoint_count: coverage.touchpointCount,
    total_examples: coverage.totalExamples,
    expected_examples: coverage.totalExpected,
    field_completeness: Math.round(coverage.fieldCompleteness * 100) / 100,
    any_blocked: anyBlocked,
    any_conditional: anyConditional,
    any_warning: anyWarning,
    rewrite_required: anyBlocked,
    conditional: anyConditional && !anyBlocked,
    warning: anyWarning && !anyBlocked && !anyConditional,
    blocking_reasons: anyBlocked ? ['execution_example_critical_missing'] : []
  };
}
