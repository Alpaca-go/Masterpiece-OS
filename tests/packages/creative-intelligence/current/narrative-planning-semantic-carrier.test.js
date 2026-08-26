/**
 * CI-W1C.7.5-R1.2 — zero-network Planning semantic carrier proof.
 * Every model call is an in-process deterministic fake.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const strategicUrl = pathToFileURL(path.join(
  repoRoot,
  'packages/creative-intelligence/src/strategic-synthesis/index.ts'
)).href;
const narrativeUrl = pathToFileURL(path.join(
  repoRoot,
  'packages/runtime-core/src/application/narrative-planning-extraction-runner.ts'
)).href;

const ALL_KEYS = [
  'brand_positioning',
  'brand_role',
  'industry',
  'business_model',
  'product_service',
  'target_audience',
  'audience_problem',
  'brand_promise',
  'competitive_context',
  'differentiation_logic',
  'communication_task',
  'strategic_objective',
  'experience_objective',
  'transformation_objective',
  'touchpoint_priority',
  'brand_personality'
];

const G01_ISOMORPHIC_KEYS = [
  'industry',
  'brand_role',
  'business_model',
  'target_audience',
  'audience_problem',
  'brand_promise',
  'competitive_context',
  'differentiation_logic',
  'strategic_objective',
  'brand_positioning',
  'brand_personality',
  'transformation_objective'
];

function rawExtraction(keys, sourceDocumentId = 'semantic-source', filename = 'brief.docx') {
  return {
    schemaVersion: 'ci-planning-extraction-v1',
    claims: keys.map((key, index) => ({
      key,
      value: `  Value ${index + 1}  `,
      epistemicClass: index % 2 === 0 ? 'FACT' : 'USER_REQUIREMENT',
      evidence: [{
        documentId: sourceDocumentId,
        filename,
        section: ` Section ${index + 1} `,
        summary: ` Evidence ${index + 1} `
      }]
    })),
    conflicts: [],
    unknownKeys: []
  };
}

test('R1.2 carrier: raw schema covers every canonical PlanningClaimKey and projects all 16', async () => {
  const {
    PLANNING_CLAIM_KEYS,
    buildSourceDocumentId,
    normalizePlanningSemanticExtractionResult,
    projectPlanningExtractionToClaims,
    validatePlanningSemanticExtractionResult
  } = await import(strategicUrl);
  assert.deepEqual([...PLANNING_CLAIM_KEYS], ALL_KEYS);

  const sourceDocumentId = buildSourceDocumentId(
    'synthetic-project',
    'PLANNING_STRATEGIC_SOURCE',
    'brief.docx',
    '0123456789abcdef0123456789abcdef'
  );
  const raw = rawExtraction(ALL_KEYS, sourceDocumentId);
  assert.deepEqual(validatePlanningSemanticExtractionResult(raw), { valid: true, errors: [] });
  const normalized = normalizePlanningSemanticExtractionResult(raw);
  const projected = projectPlanningExtractionToClaims({
    extraction: normalized,
    sourceDocumentId,
    documentRole: 'brand-strategy'
  });

  assert.equal(projected.length, 16);
  assert.deepEqual(new Set(projected.map((claim) => claim.key)), new Set(ALL_KEYS));
  assert.ok(projected.every((claim) => claim.sourceDocumentId === sourceDocumentId));
  assert.ok(projected.every((claim) => claim.claimId.startsWith(`${sourceDocumentId}:`)));
  assert.ok(projected.every((claim) => claim.chunkRefs[0].startsWith('Section ')));
});

test('R1.2 validation: unknown Planning key is rejected and runtime metadata is not required', async () => {
  const { validatePlanningSemanticExtractionResult } = await import(strategicUrl);
  const withoutRuntimeMetadata = rawExtraction(['industry']);
  assert.deepEqual(
    validatePlanningSemanticExtractionResult(withoutRuntimeMetadata),
    { valid: true, errors: [] }
  );
  assert.equal('sourceRunId' in withoutRuntimeMetadata, false);
  assert.equal('generatedAt' in withoutRuntimeMetadata, false);
  assert.equal('sourceDocuments' in withoutRuntimeMetadata, false);

  const unknown = rawExtraction(['market_vibe']);
  const validation = validatePlanningSemanticExtractionResult(unknown);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join('\n'), /not an allowed PlanningClaimKey/);
});

test('R1.2 normalization: trim, Unicode NFC, dedupe, and stable order only', async () => {
  const { normalizePlanningSemanticExtractionResult } = await import(strategicUrl);
  const raw = rawExtraction(['industry', 'brand_role']);
  raw.claims[0].value = '  Cafe\u0301  ';
  raw.claims.push({
    ...raw.claims[0],
    value: 'Café',
    evidence: [...raw.claims[0].evidence]
  });
  raw.unknownKeys = ['industry', 'industry'];
  const first = normalizePlanningSemanticExtractionResult(raw);
  const second = normalizePlanningSemanticExtractionResult(raw);
  assert.deepEqual(first, second);
  assert.equal(first.claims.length, 2);
  assert.equal(first.claims.find((claim) => claim.key === 'industry').value, 'Café');
  assert.deepEqual(first.unknownKeys, ['industry']);
});

test('R1.2 G01-isomorphic synthetic carrier projects all 12 qualification anchors', async () => {
  const {
    normalizePlanningSemanticExtractionResult,
    projectPlanningExtractionToClaims,
    validatePlanningSemanticExtractionResult
  } = await import(strategicUrl);
  const sourceDocumentId = 'synthetic-g01:PLANNING_STRATEGIC_SOURCE:brief.docx:0123456789abcdef';
  const raw = rawExtraction(G01_ISOMORPHIC_KEYS, sourceDocumentId);
  assert.equal(validatePlanningSemanticExtractionResult(raw).valid, true);
  const claims = projectPlanningExtractionToClaims({
    extraction: normalizePlanningSemanticExtractionResult(raw),
    sourceDocumentId,
    documentRole: 'brand-strategy'
  });
  assert.equal(claims.length, 12);
  assert.deepEqual(new Set(claims.map((claim) => claim.key)), new Set(G01_ISOMORPHIC_KEYS));
});

test('R1.2 prompt: Planning authority is system-only and raw text remains a user document', async () => {
  const { PLANNING_EXTRACTION_SYSTEM_INSTRUCTION, buildPlanningExtractionMessages } = await import(strategicUrl);
  const rawMarker = 'RAW_TEXT_SENTINEL_DO_NOT_PREPEND';
  const messages = buildPlanningExtractionMessages({
    documentId: 'prompt-source',
    filename: 'prompt.docx',
    documentRole: 'brand-strategy',
    rawText: rawMarker
  });
  assert.deepEqual(messages.map((message) => message.role), ['system', 'user']);
  assert.equal(messages[0].content, PLANNING_EXTRACTION_SYSTEM_INSTRUCTION);
  assert.ok(ALL_KEYS.every((key) => messages[0].content.includes(key)));
  assert.equal(messages[0].content.includes(rawMarker), false);
  assert.match(messages[1].content, /<document[^>]*>/);
  assert.match(messages[1].content, new RegExp(rawMarker));
  assert.equal(messages[1].content.startsWith(PLANNING_EXTRACTION_SYSTEM_INSTRUCTION), false);
});

test('R1.2 repair: preserves Planning instruction, original source, prior output, and errors', async () => {
  const {
    PLANNING_EXTRACTION_SYSTEM_INSTRUCTION,
    buildPlanningRepairMessages
  } = await import(strategicUrl);
  const messages = buildPlanningRepairMessages({
    sourceDocument: {
      documentId: 'repair-source',
      filename: 'repair.docx',
      documentRole: 'brand-strategy',
      rawText: 'ORIGINAL_PLANNING_SOURCE'
    },
    previousText: '{"bad":"PREVIOUS_OUTPUT"}',
    errors: ['claims must be an array']
  });
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[0].content, PLANNING_EXTRACTION_SYSTEM_INSTRUCTION);
  assert.match(messages[1].content, /ORIGINAL_PLANNING_SOURCE/);
  assert.match(messages[1].content, /PREVIOUS_OUTPUT/);
  assert.match(messages[1].content, /claims must be an array/);
});

test('R1.2 strict prompt follower: explicitly requested semantic fields complete the runner chain', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  const sourceDocumentId = 'strict:PLANNING_STRATEGIC_SOURCE:strict.docx:0123456789abcdef';
  let calls = 0;
  const output = await runNarrativePlanningExtraction({
    projectId: 'strict-project',
    sourceDocumentId,
    rawText: 'Industry: circular materials.',
    documentRole: 'brand-strategy',
    filename: 'strict.docx',
    reasoner: async ({ prompt }) => {
      calls += 1;
      const system = prompt.messages.find((message) => message.role === 'system').content;
      for (const field of ['schemaVersion', 'claims', 'key', 'value', 'epistemicClass', 'evidence', 'conflicts', 'unknownKeys']) {
        assert.ok(system.includes(field), `strict follower did not see ${field}`);
      }
      return {
        reportMarkdown: JSON.stringify({
          schemaVersion: 'ci-planning-extraction-v1',
          claims: [{
            key: 'industry',
            value: 'circular materials',
            epistemicClass: 'FACT',
            evidence: [{
              documentId: sourceDocumentId,
              filename: 'strict.docx',
              summary: 'Industry: circular materials.'
            }]
          }],
          conflicts: [],
          unknownKeys: []
        })
      };
    }
  });
  assert.equal(calls, 1);
  assert.equal(output.claims.length, 1);
  assert.equal(output.claims[0].key, 'industry');
  assert.equal(output.attempts[0].finishStatus, 'ok');
});

test('R1.2 runner remains fail closed after invalid base and repair', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  let calls = 0;
  await assert.rejects(
    runNarrativePlanningExtraction({
      projectId: 'fail-project',
      sourceDocumentId: 'fail-source',
      rawText: 'Planning source.',
      documentRole: 'brand-strategy',
      filename: 'fail.docx',
      reasoner: async () => {
        calls += 1;
        return { reportMarkdown: calls === 1 ? '{}' : '{"claims":[]}' };
      }
    }),
    (error) => error?.code === 'NARRATIVE_EXTRACTION_FAILED'
  );
  assert.equal(calls, 2);
});
