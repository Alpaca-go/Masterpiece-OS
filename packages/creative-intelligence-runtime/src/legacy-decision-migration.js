import { stableFingerprint } from './evidence-ledger.js';
import { validateCreativeDecisionV2 } from './creative-decision-v2.js';

function text(value) {
  return String(value ?? '').trim();
}

/**
 * Old projects keep their production decision intact. We deliberately do not
 * invent a V2 Evidence Ledger, three-direction trace, or user confirmation for
 * a decision created before those concepts existed.
 */
export function migrateCreativeDecisionForV2(input, options = {}) {
  const decision = input && typeof input === 'object' ? input : null;
  const projectId = text(options.projectId || decision?.projectId);
  if (!decision || !projectId) {
    return {
      schemaVersion: '1.0', projectId: projectId || null, status: 'missing',
      creativeDecisionV2: null, productionDecision: null, decisionTrace: null,
      warnings: ['No persisted Creative Decision is available.']
    };
  }
  if (decision.schemaVersion === '2.0' && validateCreativeDecisionV2(decision).length === 0) {
    return {
      schemaVersion: '1.0', projectId, status: 'v2_ready', creativeDecisionV2: decision,
      productionDecision: decision, decisionTrace: options.decisionTrace || null,
      sourceFingerprint: stableFingerprint(decision), warnings: []
    };
  }
  return {
    schemaVersion: '1.0', projectId, status: 'legacy_passthrough',
    creativeDecisionV2: null,
    productionDecision: decision,
    decisionTrace: null,
    sourceFingerprint: stableFingerprint(decision),
    warnings: [
      'Legacy decision remains available to the existing Fast/Short-Chain runtime.',
      'Historical Evidence Ledger, direction alternatives, and user selection trace were not fabricated.',
      'Use Guided Direction mode to create a trace-complete Creative Decision V2 when needed.'
    ]
  };
}
