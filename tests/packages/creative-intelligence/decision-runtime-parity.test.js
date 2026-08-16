import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * CI-1B Decision Runtime Parity Tests.
 *
 * Verifies that @masterpiece/creative-intelligence/decisions produces
 * behavior-identical results to @masterpiece/analysis-runtime for all
 * key decision runtime operations.
 *
 * These are NOT comprehensive functional tests — they verify parity
 * between old and new paths. Functional correctness is already covered
 * by the existing analysis-runtime test suite (tests/runtime-application/).
 */

import { VISUAL_ANALYSIS_CORE_ID as OLD_CORE_ID } from '@masterpiece/analysis-runtime/core/visual-analysis-core.ts';
import { VISUAL_ANALYSIS_CORE_ID as NEW_CORE_ID } from '@masterpiece/creative-intelligence/decisions/core/visual-analysis-core.ts';

import { validateAnalysisPacketSchema as oldValidateSchema } from '@masterpiece/analysis-runtime/schema-validator.ts';
import { validateAnalysisPacketSchema as newValidateSchema } from '@masterpiece/creative-intelligence/decisions/schema-validator.ts';

import { computeSourceFingerprint as oldFingerprint } from '@masterpiece/analysis-runtime/source-fingerprint.ts';
import { computeSourceFingerprint as newFingerprint } from '@masterpiece/creative-intelligence/decisions/source-fingerprint.ts';

import { migrateAnalysisPacket as oldMigrate } from '@masterpiece/analysis-runtime/schema-migrations.ts';
import { migrateAnalysisPacket as newMigrate } from '@masterpiece/creative-intelligence/decisions/schema-migrations.ts';

import { buildClarificationQuestions as oldClarification } from '@masterpiece/analysis-runtime/clarification-builder.ts';
import { buildClarificationQuestions as newClarification } from '@masterpiece/creative-intelligence/decisions/clarification-builder.ts';

import {
  completeStructuredAnalysis as oldComplete,
} from '@masterpiece/analysis-runtime/analysis-completion-orchestrator.ts';
import {
  completeStructuredAnalysis as newComplete,
} from '@masterpiece/creative-intelligence/decisions/analysis-completion-orchestrator.ts';

import { evidenceSafeMerge as oldSafeMerge } from '@masterpiece/analysis-runtime/evidence-safe-merge.ts';
import { evidenceSafeMerge as newSafeMerge } from '@masterpiece/creative-intelligence/decisions/evidence-safe-merge.ts';

import { resolveRepairConflict as oldResolveConflict } from '@masterpiece/analysis-runtime/conflict-resolver.ts';
import { resolveRepairConflict as newResolveConflict } from '@masterpiece/creative-intelligence/decisions/conflict-resolver.ts';

// ---- fixtures ----

// Full valid packet — structure from real production shape
const validPacket = {
  schemaVersion: '1.0',
  projectId: 'test-project',
  projectFacts: {
    brandName: { value: 'TestBrand', status: 'source_fact', confidence: 0.9, evidenceRefs: ['src-1'], generatedBy: 'source_parser', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
    industry: { value: 'technology', status: 'source_fact', confidence: 0.8, evidenceRefs: ['src-1'], generatedBy: 'source_parser', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
    brandRole: { value: 'innovator', status: 'inferred', confidence: 0.5, evidenceRefs: ['m-1'], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
  },
  lockedAssets: [],
  assetInventory: [],
  diagnosis: {
    valuableAssets: [],
    brandMisreadRisks: [],
    overusedExpressions: [],
    outdatedExpressions: [],
    categoryCliches: [],
  },
  creativeDecision: {
    brandRoleStatement: { value: 'TestBrand as innovator', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
    uniqueUpgradeThesis: { value: 'Better tech', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
    toneBoundaries: {
      target: { value: 'professional', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      avoid: [
        { value: 'childish', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
        { value: 'cheap', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      ],
    },
  },
  abstractions: [],
  mediaTranslations: {
    spatial: {
      concept: { value: 'modern office', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      targetWorldview: { value: 'innovation', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      structureLanguage: { value: 'clean geometric', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      materialLanguage: { value: 'glass metal', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      lightingLanguage: { value: 'soft cool', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      colorBehavior: {
        primary: { value: 'blue', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      },
      signatureSpatialMechanism: { value: 'floating volumes', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      positiveDifferentiators: [],
      sceneProgram: { value: 'collaboration space', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      functionalRelationships: [],
      functionalNetwork: { value: 'open plan', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      brandRoleManifestation: { value: 'tech showcase', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
      mustBeVisible: [],
      peopleBehavior: { value: 'collaborating', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp1', schemaVersion: '1.0' },
    },
    packaging: null,
    poster: null,
    vi: null,
  },
  provenance: {
    generatedAt: '2026-01-01T00:00:00.000Z',
    sourceFingerprint: 'fp1',
  },
};

// ---- parity tests ----

test('CI-1B parity — VISUAL_ANALYSIS_CORE_ID unchanged', () => {
  assert.equal(NEW_CORE_ID, OLD_CORE_ID);
  assert.equal(NEW_CORE_ID, 'visual-analysis-core@1.0.0');
});

test('CI-1B parity — schema validation produces identical issues for valid packet', () => {
  const oldResult = oldValidateSchema(validPacket);
  const newResult = newValidateSchema(validPacket);
  assert.deepEqual(newResult, oldResult);
});

test('CI-1B parity — schema validation produces identical issues for corrupted input', () => {
  const oldResult = oldValidateSchema(null);
  const newResult = newValidateSchema(null);
  assert.equal(newResult.length, oldResult.length);
  assert.equal(newResult[0].code, oldResult[0].code);
});

test('CI-1B parity — schema validation produces identical issues for empty packet', () => {
  const emptyPacket = { schemaVersion: '1.0', projectId: 'test' };
  const oldResult = oldValidateSchema(emptyPacket);
  const newResult = newValidateSchema(emptyPacket);
  assert.equal(newResult.length, oldResult.length);
  // Compare issue codes
  const oldCodes = oldResult.map((i) => i.code).sort();
  const newCodes = newResult.map((i) => i.code).sort();
  assert.deepEqual(newCodes, oldCodes);
});

test('CI-1B parity — source fingerprint is identical for full packet', () => {
  assert.equal(newFingerprint(validPacket), oldFingerprint(validPacket));
});

test('CI-1B parity — source fingerprint of empty object is identical', () => {
  assert.equal(newFingerprint({}), oldFingerprint({}));
});

test('CI-1B parity — source fingerprint of null is identical', () => {
  assert.equal(newFingerprint(null), oldFingerprint(null));
});

test('CI-1B parity — schema migration produces identical result (unversioned → 1.0)', () => {
  const unversioned = { projectId: 'test', projectFacts: {} };
  const oldResult = oldMigrate(unversioned);
  const newResult = newMigrate({ ...unversioned });
  assert.equal(newResult.migrated, oldResult.migrated);
  assert.equal(newResult.fromVersion, oldResult.fromVersion);
  assert.equal(newResult.toVersion, oldResult.toVersion);
  assert.deepEqual(newResult.changes, oldResult.changes);
  assert.deepEqual(newResult.requiresRepair, oldResult.requiresRepair);
});

test('CI-1B parity — schema migration passes through already-versioned packet', () => {
  const versioned = { schemaVersion: '1.0', projectId: 'test' };
  const oldResult = oldMigrate(versioned);
  const newResult = newMigrate({ ...versioned });
  assert.equal(newResult.migrated, oldResult.migrated);
  assert.equal(newResult.toVersion, oldResult.toVersion);
  assert.deepEqual(newResult.packet, oldResult.packet);
});

test('CI-1B parity — conflict resolver produces same result for inferred vs existing value', () => {
  const packet = { test: { path: { value: 'existing', status: 'inferred', confidence: 0.5, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp', schemaVersion: '1.0' } } };
  const patch = { path: 'test.path', value: { value: 'new', status: 'inferred', confidence: 0.7, evidenceRefs: ['e1'], generatedBy: 'repair_model', sourceFingerprint: 'fp', schemaVersion: '1.0' } };
  const oldResult = oldResolveConflict({ packet, patch });
  const newResult = newResolveConflict({ packet: structuredClone(packet), patch });
  assert.deepEqual(newResult, oldResult);
});

test('CI-1B parity — conflict resolver produces same result for locked path', () => {
  const packet = { projectFacts: { brandName: { value: 'Brand', status: 'confirmed', confidence: 1, evidenceRefs: ['e1'], generatedBy: 'user', sourceFingerprint: 'fp', schemaVersion: '1.0' } } };
  const patch = { path: 'projectFacts.brandName', value: { value: 'NewBrand', status: 'inferred', confidence: 0.7, evidenceRefs: ['e2'], generatedBy: 'repair_model', sourceFingerprint: 'fp', schemaVersion: '1.0' } };
  const oldResult = oldResolveConflict({ packet, patch });
  const newResult = newResolveConflict({ packet: structuredClone(packet), patch });
  assert.deepEqual(newResult, oldResult);
});

test('CI-1B parity — evidence-safe-merge: confirmed field rejects patch', () => {
  const basePacket = {
    schemaVersion: '1.0',
    projectFacts: {
      brandName: { value: 'LockedBrand', status: 'confirmed', confidence: 1.0, evidenceRefs: ['e1'], generatedBy: 'user', sourceFingerprint: 'fp', schemaVersion: '1.0' },
    },
    provenance: { sourceFingerprint: 'fp' },
  };
  const patches = [{
    path: 'projectFacts.brandName',
    value: { value: 'NewBrand', status: 'inferred', confidence: 0.7, evidenceRefs: ['e2'], generatedBy: 'repair_model', sourceFingerprint: 'fp', schemaVersion: '1.0' },
  }];
  const oldMerge = oldSafeMerge({ packet: basePacket, patches, sourceFingerprint: 'fp' });
  const newMerge = newSafeMerge({ packet: structuredClone(basePacket), patches, sourceFingerprint: 'fp' });

  assert.deepEqual(newMerge.applied, oldMerge.applied);
  assert.deepEqual(newMerge.rejected, oldMerge.rejected);
  assert.deepEqual(newMerge.conflicts, oldMerge.conflicts);
  assert.deepEqual(newMerge.unchanged, oldMerge.unchanged);
  // Confirmed field should be rejected in both
  assert.ok(newMerge.rejected.includes('projectFacts.brandName'));
  // Original value must be preserved
  assert.equal(newMerge.packet.projectFacts.brandName.value, 'LockedBrand');
});

test('CI-1B parity — evidence-safe-merge: inferred field applies patch when in repairablePaths', () => {
  const basePacket = {
    schemaVersion: '1.0',
    diagnosis: {
      brandMisreadRisks: [],
      overusedExpressions: [],
    },
    creativeDecision: {
      brandRoleStatement: { value: 'old-role', status: 'inferred', confidence: 0.3, evidenceRefs: [], generatedBy: 'analysis_model', sourceFingerprint: 'fp', schemaVersion: '1.0' },
    },
    provenance: { sourceFingerprint: 'fp' },
  };
  const patches = [{
    path: 'creativeDecision.brandRoleStatement',
    value: { value: 'new-role', status: 'inferred', confidence: 0.8, evidenceRefs: ['e1'], generatedBy: 'repair_model', sourceFingerprint: 'fp', schemaVersion: '1.0' },
  }];
  const repairablePaths = ['creativeDecision.brandRoleStatement'];
  const oldMerge = oldSafeMerge({ packet: basePacket, patches, sourceFingerprint: 'fp', repairablePaths });
  const newMerge = newSafeMerge({ packet: structuredClone(basePacket), patches, sourceFingerprint: 'fp', repairablePaths });

  assert.deepEqual(newMerge.applied.sort(), oldMerge.applied.sort());
  // Verify the applied path's value is identical between old and new
  assert.deepEqual(
    newMerge.packet.creativeDecision.brandRoleStatement,
    oldMerge.packet.creativeDecision.brandRoleStatement,
  );
  // And that metadata is identical
  assert.deepEqual(newMerge.metadata, oldMerge.metadata);
});

test('CI-1B parity — clarification builder produces same question codes', () => {
  const issues = [
    { path: 'projectFacts.brandName', code: 'missing', severity: 'requires_confirmation', repairStrategy: 'ask_user', appliesTo: ['space'], requiredEvidencePaths: [], availableEvidenceRefs: [], message: 'brand name missing' },
  ];
  const oldQs = oldClarification(issues, 'zh');
  const newQs = newClarification(issues, 'zh');
  assert.equal(newQs.length, oldQs.length);
  assert.equal(newQs[0].code, oldQs[0].code);
  assert.equal(newQs[0].question, oldQs[0].question);
});

test('CI-1B parity — full orchestrator produces identical result for valid packet (no AI repair)', async () => {
  // Complete packet with no missing fields → orchestrator runs deterministically.
  // This is the most important parity test: end-to-end completion behavior.
  const persistence = {
    saveInitial: async () => {},
    saveAttempt: async () => {},
    saveFinal: async () => {},
    saveAudit: async () => {},
    saveRuntimeArtifact: async () => {},
  };
  const model = async () => ({ repairs: [] });
  const validateFinalPacket = () => ({ status: 'pass', findings: [] });

  // Deep-clone only the packet (data) to avoid mutation cross-contamination;
  // functions (persistence, model, validateFinalPacket) are shared stateless mocks.
  const oldInput = {
    packet: structuredClone(validPacket),
    deliverable: 'space',
    persistence,
    model,
    runId: 'parity-test-run',
    validateFinalPacket,
    repairInvalidFinalPacket: undefined,
  };
  const newInput = {
    packet: structuredClone(validPacket),
    deliverable: 'space',
    persistence,
    model,
    runId: 'parity-test-run',
    validateFinalPacket,
    repairInvalidFinalPacket: undefined,
  };

  const oldResult = await oldComplete(oldInput);
  const newResult = await newComplete(newInput);

  assert.equal(newResult.status, oldResult.status, 'status mismatch');
  assert.equal(newResult.attempts, oldResult.attempts, 'attempts mismatch');
  assert.deepEqual(newResult.repairedFields.sort(), oldResult.repairedFields.sort(), 'repairedFields mismatch');
  assert.deepEqual(newResult.defaultedFields.sort(), oldResult.defaultedFields.sort(), 'defaultedFields mismatch');
  assert.deepEqual(newResult.ignoredFields.sort(), oldResult.ignoredFields.sort(), 'ignoredFields mismatch');
  assert.deepEqual(newResult.unresolvedFields.sort(), oldResult.unresolvedFields.sort(), 'unresolvedFields mismatch');
  assert.deepEqual(newResult.conflicts.sort(), oldResult.conflicts.sort(), 'conflicts mismatch');
  assert.equal(newResult.clarificationQuestions.length, oldResult.clarificationQuestions.length, 'clarificationQuestions count mismatch');
  assert.equal(newResult.modelCallCount, oldResult.modelCallCount, 'modelCallCount mismatch');
  // Source fingerprint must match (hard parity gate)
  assert.equal(newResult.audit.sourceFingerprint, oldResult.audit.sourceFingerprint, 'source fingerprint mismatch');
  assert.equal(newResult.audit.status, oldResult.audit.status, 'audit status mismatch');
  assert.equal(newResult.audit.schemaVersion, oldResult.audit.schemaVersion, 'audit schemaVersion mismatch');
  assert.equal(newResult.audit.repairVersion, oldResult.audit.repairVersion, 'audit repairVersion mismatch');
  // Packet should be semantically equal
  assert.equal(
    JSON.stringify(newResult.packet, Object.keys(newResult.packet).sort()),
    JSON.stringify(oldResult.packet, Object.keys(oldResult.packet).sort()),
    'packet content mismatch',
  );
});

test('CI-1B parity — core facade exports the same completion function', async () => {
  // Verify the core facade pattern still works from the new path
  const { completeStructuredAnalysis: coreComplete } = await import('@masterpiece/creative-intelligence/decisions/core/visual-analysis-core.ts');
  const { completeStructuredAnalysis: orchestratorComplete } = await import('@masterpiece/creative-intelligence/decisions/analysis-completion-orchestrator.ts');
  assert.equal(coreComplete, orchestratorComplete);
});

test('CI-1B parity — MAX_REPAIR_ATTEMPTS constant is identical', async () => {
  const oldMod = await import('@masterpiece/analysis-runtime/contracts.ts');
  const newMod = await import('@masterpiece/creative-intelligence/decisions/contracts.ts');
  assert.equal(newMod.MAX_REPAIR_ATTEMPTS, oldMod.MAX_REPAIR_ATTEMPTS);
  assert.equal(newMod.MAX_REPAIR_ATTEMPTS, 2);
});
