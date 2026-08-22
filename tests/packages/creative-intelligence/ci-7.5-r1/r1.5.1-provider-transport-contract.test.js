import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  createPlanningAwareTestReasonerFactory,
  dummyReadCredentials,
} from '../ci-7.4-r2.1/planning-aware-test-reasoner.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const serviceUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/creative-reasoning-service.ts')).href;
const narrativeUrl = pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/narrative-planning-extraction-runner.ts')).href;
const modelRuntimeUrl = pathToFileURL(path.join(repoRoot, 'packages/model-runtime/src/openai-compatible-text-reasoner.js')).href;
const taxonomyUrl = pathToFileURL(path.join(repoRoot, 'packages/model-runtime/src/provider-failure-taxonomy.js')).href;
const strategicUrl = pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href;

function truth(projectId) {
  return {
    projectId,
    facts: [{ id: 'transport-fact', key: 'transport.fact', value: 'Distinct project fact', authority: 'CONFIRMED', sourceRefs: [] }],
    conflicts: [], sourceRefs: [], schemaVersion: 'project-truth-v0.1', generatedAt: '2026-08-22T00:00:00.000Z'
  };
}

const needs = () => [{ id: 'transport-need', type: 'user.requirement', statement: 'Distinct project need', factRefs: [], coverageRequirement: 'required' }];
const evidence = (projectId) => ({ projectId, entries: [], generatedAt: '2026-08-22T00:00:00.000Z' });

function stageOf(input) {
  const text = input.prompt.messages.map((item) => item.content ?? '').join('\n');
  if (/ModelAssistedDirectionSet/iu.test(text)) return 'direction';
  if (/ModelAssistedConceptSet/iu.test(text)) return 'concept';
  return 'synthesis';
}

function passingHandler(projectId, seen = []) {
  const base = createPlanningAwareTestReasonerFactory(repoRoot)({ provider: 'mock', model: 'transport-test' });
  return async (input) => {
    const stage = stageOf(input);
    seen.push({ stage, input });
    const response = await base(input);
    const artifact = JSON.parse(response.reportMarkdown);
    artifact.projectId = projectId;
    if (stage === 'concept') {
      artifact.candidates.forEach((candidate, index) => {
        const n = index + 1;
        Object.assign(candidate, {
          title: `Distinct concept ${n}`,
          coreProposition: `Project-specific proposition ${n} grounded in opportunity ${n}`,
          strategicMechanism: `Mechanism ${n} converts the source constraint into a distinct operating principle`,
          whyThisProject: `This project requires route ${n} because its source-backed challenge is distinct`,
          whyNotCategoryCliche: `Route ${n} avoids a generic category template through its cited opportunity`,
          translationHypothesis: { organizationLogic: `Organization logic ${n}`, expressionLogic: `Expression logic ${n}`, possibleVisualBehaviors: [`Behavior ${n}`] }
        });
      });
    }
    if (stage === 'direction') {
      artifact.directions.forEach((direction, index) => {
        const n = index + 1;
        Object.assign(direction, {
          title: `Distinct direction ${n}`,
          creativeThesis: `Direction thesis ${n} with a unique project-specific hierarchy`,
          visualMechanism: `Visual mechanism ${n} translates the selected concept without duplication`,
          systemHypothesis: `System hypothesis ${n} remains testable across touchpoints`,
          whyThisProject: `Direction ${n} answers the project's cited strategic mechanism`,
          differenceFromOtherDirections: `Direction ${n} uses a separate organizing principle`
        });
      });
    }
    return { reportMarkdown: JSON.stringify(artifact) };
  };
}

async function runService(handler, options = {}) {
  const { createCreativeReasoningService } = await import(serviceUrl);
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-r151-'));
  const projectId = options.projectId ?? 'transport-contract-project';
  try {
    const service = createCreativeReasoningService({
      outputRoot: async () => root,
      reasonerFactory: () => handler,
      readCredentials: dummyReadCredentials
    });
    return await service.run({
      projectId, truth: truth(projectId), needs: needs(), evidence: evidence(projectId), useMock: false,
      ...(options.stopAfter === undefined ? { stopAfter: 'synthesis' } : options.stopAfter ? { stopAfter: options.stopAfter } : {}),
      ...(options.qualificationTimeouts ? { qualificationTimeouts: options.qualificationTimeouts } : {})
    });
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

function transportTimeout() {
  return Object.assign(new Error('headers timeout'), {
    code: 'REQUEST_FAILED',
    details: { causeCode: 'UND_ERR_HEADERS_TIMEOUT', responseHeadersReceived: false }
  });
}

test('TIMEOUT-01: Strategic receives the stage-specific canonical requestTimeoutMs', async () => {
  const seen = [];
  await runService(passingHandler('transport-contract-project', seen), { qualificationTimeouts: { strategicSynthesisMs: 321_000 } });
  assert.equal(seen[0].input.requestTimeoutMs, 321_000);
  assert.equal('maximumDurationMs' in seen[0].input, false);
});

test('TIMEOUT-02: requestTimeoutMs is authority and legacy maximumDurationMs is only an alias', async () => {
  const { resolveRequestTimeoutMs } = await import(modelRuntimeUrl);
  assert.equal(resolveRequestTimeoutMs({ maximumDurationMs: 17_000 }), 17_000);
  assert.equal(resolveRequestTimeoutMs({ requestTimeoutMs: 29_000, maximumDurationMs: 17_000 }), 29_000);
});

test('TIMEOUT-03: OpenAI-compatible reasoner enforces requestTimeoutMs without network', async () => {
  const { createOpenAICompatibleTextReasoner } = await import(modelRuntimeUrl);
  const reason = createOpenAICompatibleTextReasoner({
    apiKey: 'redacted-test-key', model: 'offline', baseUrl: 'https://offline.invalid/v1',
    client: (_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true }))
  });
  await assert.rejects(
    reason([{ role: 'user', content: 'offline' }], { requestTimeoutMs: 20 }),
    (error) => error.code === 'REQUEST_TIMEOUT' && error.details.responseHeadersReceived === false
  );
});

test('TIMEOUT-04: policy reflects measured Planning/Strategic history and is not 60 seconds', async () => {
  const { DEFAULT_CREATIVE_REASONING_TIMEOUTS } = await import(serviceUrl);
  assert.equal(DEFAULT_CREATIVE_REASONING_TIMEOUTS.planningNarrativeMs, 180_000);
  assert.equal(DEFAULT_CREATIVE_REASONING_TIMEOUTS.strategicSynthesisMs, 290_000);
  assert.ok(DEFAULT_CREATIVE_REASONING_TIMEOUTS.strategicSynthesisMs > 255_000);
  assert.notEqual(DEFAULT_CREATIVE_REASONING_TIMEOUTS.strategicSynthesisMs, 60_000);
});

test('TIMEOUT-05: narrative Planning receives its stage-specific timeout', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  let seen;
  const output = await runNarrativePlanningExtraction({
    projectId: 'planning-timeout', sourceDocumentId: 'planning-source', rawText: 'Industry: services.',
    documentRole: 'brand-strategy', filename: 'planning.docx', requestTimeoutMs: 181_000,
    reasoner: async (input) => {
      seen = input;
      return { reportMarkdown: JSON.stringify({
        schemaVersion: 'ci-planning-extraction-v1',
        claims: [{ key: 'industry', value: 'services', epistemicClass: 'FACT', evidence: [{ documentId: 'planning-source', filename: 'planning.docx', summary: 'Industry: services.' }] }],
        conflicts: [], unknownKeys: []
      }) };
    }
  });
  assert.equal(seen.requestTimeoutMs, 181_000);
  assert.equal(output.providerAttempts, 1);
});

test('TIMEOUT-06: default orchestration remains backward-compatible through all three stages', async () => {
  const seen = [];
  const result = await runService(passingHandler('transport-contract-project', seen), { stopAfter: null });
  assert.deepEqual(seen.map((entry) => entry.stage), ['synthesis', 'concept', 'direction']);
  assert.deepEqual([result.stages.synthesis.status, result.stages.concept.status], ['PASS', 'PASS']);
  assert.ok(result.stages.direction.attempts > 0);
});

test('RETRY-01: retryable timeout retries the exact base prompt without repair framing', async () => {
  const calls = [];
  const pass = passingHandler('transport-contract-project');
  const result = await runService(async (input) => {
    calls.push(input);
    if (calls.length === 1) throw transportTimeout();
    return pass(input);
  });
  assert.deepEqual(calls.map((call) => call.attemptKind), ['BASE', 'TRANSPORT_RETRY']);
  assert.deepEqual(calls[0].prompt.messages, calls[1].prompt.messages);
  assert.doesNotMatch(calls[1].prompt.messages[1].content, /# REPAIR/u);
  assert.deepEqual([result.stages.synthesis.providerAttempts, result.stages.synthesis.transportRetries, result.stages.synthesis.semanticRepairAttempts], [2, 1, 0]);
});

test('RETRY-02: two transport timeouts fail closed with one bounded retry', async () => {
  const calls = [];
  const result = await runService(async (input) => { calls.push(input); throw transportTimeout(); });
  assert.deepEqual(calls.map((call) => call.attemptKind), ['BASE', 'TRANSPORT_RETRY']);
  assert.equal(result.stages.synthesis.failureClass, 'TRANSPORT_TIMEOUT');
  assert.deepEqual([result.stages.synthesis.providerAttempts, result.stages.synthesis.transportRetries, result.stages.synthesis.semanticRepairAttempts], [2, 1, 0]);
});

test('RETRY-03: gate failure alone creates semantic repair with blocked-code context', async () => {
  const calls = [];
  const pass = passingHandler('transport-contract-project');
  const result = await runService(async (input) => {
    calls.push(input);
    const response = await pass(input);
    if (calls.length === 1) {
      const artifact = JSON.parse(response.reportMarkdown);
      artifact.projectUnderstanding.factRefs = ['foreign-fact'];
      return { reportMarkdown: JSON.stringify(artifact) };
    }
    return response;
  });
  assert.deepEqual(calls.map((call) => call.attemptKind), ['BASE', 'SEMANTIC_REPAIR']);
  assert.match(calls[1].prompt.messages[1].content, /# REPAIR/u);
  assert.deepEqual([result.stages.synthesis.transportRetries, result.stages.synthesis.semanticRepairAttempts], [0, 1]);
});

test('RETRY-04: parse failure creates semantic repair and preserves previous output', async () => {
  const calls = [];
  const pass = passingHandler('transport-contract-project');
  const result = await runService(async (input) => {
    calls.push(input);
    return calls.length === 1 ? { reportMarkdown: 'not-json' } : pass(input);
  });
  assert.equal(result.stages.synthesis.status, 'PASS');
  assert.deepEqual(calls.map((call) => call.attemptKind), ['BASE', 'SEMANTIC_REPAIR']);
  assert.match(calls[1].prompt.messages[1].content, /not-json/u);
});

test('RETRY-05: non-retryable authentication failure does not retry', async () => {
  const calls = [];
  const auth = Object.assign(new Error('unauthorized'), { code: 'API_ERROR', details: { httpStatus: 401, responseHeadersReceived: true } });
  const result = await runService(async (input) => { calls.push(input); throw auth; });
  assert.equal(calls.length, 1);
  assert.equal(result.stages.synthesis.failureClass, 'AUTHENTICATION_ERROR');
  assert.equal(result.stages.synthesis.transportRetries, 0);
});

test('RETRY-06: base transport + retry semantic failure + repair transport is capped at three', async () => {
  const calls = [];
  const result = await runService(async (input) => {
    calls.push(input);
    if (calls.length === 1 || calls.length === 3) throw transportTimeout();
    return { reportMarkdown: 'not-json' };
  });
  assert.deepEqual(calls.map((call) => call.attemptKind), ['BASE', 'TRANSPORT_RETRY', 'SEMANTIC_REPAIR']);
  assert.equal(result.stages.synthesis.status, 'FAIL');
  assert.deepEqual([result.stages.synthesis.providerAttempts, result.stages.synthesis.transportRetries, result.stages.synthesis.semanticRepairAttempts], [3, 1, 1]);
});

test('RETRY-07: empty response cannot enter semantic repair without previous output', async () => {
  const calls = [];
  const result = await runService(async (input) => { calls.push(input); return { reportMarkdown: '' }; });
  assert.equal(calls.length, 1);
  assert.deepEqual([result.stages.synthesis.providerAttempts, result.stages.synthesis.semanticRepairAttempts], [1, 0]);
});

test('TAX-01: UND_ERR_HEADERS_TIMEOUT is retryable pre-header transport timeout', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.deepEqual(classifyProviderFailure(transportTimeout()), {
    failureClass: 'TRANSPORT_TIMEOUT', retryable: true, responseHeadersReceived: false,
    errorCode: 'REQUEST_FAILED', causeCode: 'UND_ERR_HEADERS_TIMEOUT', httpStatus: null
  });
});

test('TAX-02: connection reset is retryable transport connection failure', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.equal(classifyProviderFailure(Object.assign(new Error('reset'), { code: 'ECONNRESET' })).failureClass, 'TRANSPORT_CONNECTION');
});

test('TAX-03: 429 and 5xx have distinct retryable provider classes', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.deepEqual([429, 503].map((httpStatus) => classifyProviderFailure({ code: 'API_ERROR', details: { httpStatus } }).failureClass), ['RATE_LIMIT_RETRYABLE', 'PROVIDER_5XX_RETRYABLE']);
});

test('TAX-04: non-auth 4xx and authentication are non-retryable and distinct', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.deepEqual([400, 401].map((httpStatus) => classifyProviderFailure({ code: 'API_ERROR', details: { httpStatus } }).failureClass), ['PROVIDER_4XX_NON_RETRYABLE', 'AUTHENTICATION_ERROR']);
});

test('TAX-05: cancellation is never retried', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.deepEqual(classifyProviderFailure(new DOMException('cancel', 'AbortError')).failureClass, 'CANCELLED');
  assert.equal(classifyProviderFailure(new DOMException('cancel', 'AbortError')).retryable, false);
});

test('TAX-06: semantic classes and unknown provider failure remain distinguishable', async () => {
  const { classifyProviderFailure } = await import(taxonomyUrl);
  assert.deepEqual(['SEMANTIC_PARSE_FAILURE', 'SEMANTIC_GATE_FAILURE', 'mystery'].map((code) => classifyProviderFailure({ code }).failureClass), ['SEMANTIC_PARSE_FAILURE', 'SEMANTIC_GATE_FAILURE', 'UNKNOWN_PROVIDER_FAILURE']);
});

function evidenceV21(callLedger) {
  return {
    schemaVersion: 'ci-qualification-evidence-v2.1',
    sourceHashes: { sha256: 'a'.repeat(64), registeredContentHash: 'b'.repeat(64) },
    callLedger, planningClaims: [], planningEpistemicAudit: [],
    allowedSourceSets: { facts: [], needs: [], evidence: [], planningClaims: [] },
    artifactMirrorSets: { planningTruth: [], needs: [], evidence: [], planningClaims: [] },
    blockedCodes: { accepted: [], attempts: [] }, stageStatuses: {},
    strategicUsage: {
      projectUnderstanding: [], tensions: [], insights: [], opportunities: [],
      usedPlanningClaimIds: [], usedPlanningClaimCount: 0, totalPlanningClaimRefOccurrences: 0,
      uncitedPlanningClaimIds: [], directAnchorTraceCoverage: { evaluatedAnchorClaimIds: [], citedAnchorClaimIds: [], uncitedAnchorClaimIds: [], citedCount: 0, totalCount: 0, ratio: 1 }
    }
  };
}

const failedLedger = (attemptKind = 'BASE') => ({
  stage: 'strategic_synthesis', attemptKind, provider: 'redacted-provider', model: 'redacted-model', latencyMs: 305_852,
  success: false, errorCode: 'REQUEST_FAILED', causeCode: 'UND_ERR_HEADERS_TIMEOUT', failureClass: 'TRANSPORT_TIMEOUT', retryable: true, responseHeadersReceived: false
});

test('EVID-TR-01: v2.1 requires and accepts complete transport failure evidence', async () => {
  const { validateRedactedQualificationEvidenceV2, classifyStrategicQualificationFailure } = await import(strategicUrl);
  const ledger = [failedLedger('BASE'), failedLedger('TRANSPORT_RETRY')];
  assert.deepEqual(validateRedactedQualificationEvidenceV2(evidenceV21(ledger)), { valid: true, errors: [] });
  assert.equal(classifyStrategicQualificationFailure({ stage: { status: 'FAIL' }, callLedger: ledger }), 'HOLD_FOR_PROVIDER_TRANSPORT_REPAIR');
});

test('EVID-TR-02: all three attempt kinds are valid and semantic response changes verdict class', async () => {
  const { validateRedactedQualificationEvidenceV2, classifyStrategicQualificationFailure } = await import(strategicUrl);
  const ledger = [failedLedger('BASE'), failedLedger('TRANSPORT_RETRY'), { ...failedLedger('SEMANTIC_REPAIR'), success: true, errorCode: null, causeCode: null, failureClass: null, retryable: null, responseHeadersReceived: true }];
  assert.equal(validateRedactedQualificationEvidenceV2(evidenceV21(ledger)).valid, true);
  assert.equal(classifyStrategicQualificationFailure({ stage: { status: 'FAIL' }, callLedger: ledger }), 'HOLD_FOR_STRATEGIC_SYNTHESIS_REPAIR');
});

test('EVID-TR-03: secrets, full URL, and incomplete failure records are rejected', async () => {
  const { validateRedactedQualificationEvidenceV2 } = await import(strategicUrl);
  const input = evidenceV21([{ ...failedLedger(), causeCode: undefined, fullUrl: 'https://secret.invalid/key' }]);
  const result = validateRedactedQualificationEvidenceV2(input);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.includes('forbidden key: fullUrl')));
  assert.ok(result.errors.some((error) => error.includes('causeCode required')));
});

test('EVID-TR-04: historical v2 evidence remains valid without transport extension fields', async () => {
  const { validateRedactedQualificationEvidenceV2 } = await import(strategicUrl);
  const input = evidenceV21([{ stage: 'strategic_synthesis', provider: 'redacted-provider', model: 'redacted-model', latencyMs: 1 }]);
  input.schemaVersion = 'ci-qualification-evidence-v2';
  assert.deepEqual(validateRedactedQualificationEvidenceV2(input), { valid: true, errors: [] });
});
