// compileExecutionDirectionV2 (doc section 十一 compatibility strategy).
//
// v2 reads the existing v1 Checkpoint inputs — brand facts, Evidence Index,
// Audience Boundary, Asset Boundary and selected touchpoints — and produces a
// validated, readiness-scored set of execution-oriented directions. It must NOT
// re-implement Document Extraction or the v1 pipeline; it only consumes their
// outputs. In production the raw v2 direction objects come from the v2 prompt
// (direction-generation-prompt-v2); for offline testing they come from fixtures.

import { EXPERIMENT_MODE, isExecutionMode } from '../config/direction-generation-mode.js';
import { validateExecutionDirectionV2 } from '../schemas/direction-contract-v2.js';
import { evaluateExecutionReadiness } from './execution-readiness-evaluator.js';
import { guardAssetAuthorization, guardAudienceBoundary, guardEvidencePreservation } from './regression-guards.js';

function toIdSet(list, key) {
  return new Set((list || []).map((item) => (typeof item === 'string' ? item : (item[key] || item.asset_id || item.assetId || item.id || item.evidence_id || item.evidenceId))));
}

export function compileExecutionDirectionV2({
  brandFacts = {},
  evidenceIndex = [],
  audienceBoundary = {},
  assetBoundary = {},
  selectedTouchpoints = [],
  rawDirections = []
} = {}) {
  const reportLanguage = brandFacts.reportLanguage || 'zh-CN';
  const context = {
    reportLanguage,
    evidenceIds: toIdSet(evidenceIndex, 'evidence_id'),
    allowedAssetIds: toIdSet(assetBoundary.allowed_assets || assetBoundary.allowed, 'asset_id'),
    restrictedAssetIds: toIdSet(assetBoundary.restricted_assets || assetBoundary.restricted, 'asset_id')
  };

  const directions = rawDirections.map((raw, index) => {
    const validated = validateExecutionDirectionV2(raw, context);
    const readiness = evaluateExecutionReadiness(validated);
    const assetAuthorization = guardAssetAuthorization(validated, assetBoundary);
    const evidencePreservation = guardEvidencePreservation(validated, evidenceIndex);
    const audienceBoundaryGuard = guardAudienceBoundary(validated, audienceBoundary);
    return {
      direction: validated,
      readiness,
      assetAuthorization,
      evidencePreservation,
      audienceBoundaryGuard
    };
  });

  const overallStatus = directions.every((item) => item.readiness.execution_status === 'ready' && item.assetAuthorization.ok && item.evidencePreservation.ok && item.audienceBoundaryGuard.ok)
    ? 'ready'
    : 'rewrite_required';

  return {
    contract_version: 'visual-direction-v2-execution',
    direction_generation_mode: EXPERIMENT_MODE,
    execution_mode_active: isExecutionMode(EXPERIMENT_MODE),
    brandFacts,
    audienceBoundary,
    assetBoundary: {
      allowed_asset_count: context.allowedAssetIds.size,
      restricted_asset_count: context.restrictedAssetIds.size
    },
    selectedTouchpoints,
    evidence_index_count: context.evidenceIds.size,
    directions,
    overall_status: overallStatus
  };
}
