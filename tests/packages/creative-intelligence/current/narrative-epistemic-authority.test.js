/**
 * CI-W1C.7.5-R1.2.1 — zero-network adversarial epistemic proof.
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
const sourceDocumentId = 'epi:PLANNING_STRATEGIC_SOURCE:brief.docx:0123456789abcdef';

function extraction(value, epistemicClass, key = 'business_model') {
  return {
    schemaVersion: 'ci-planning-extraction-v1',
    claims: [{
      key,
      value,
      epistemicClass,
      evidence: [{
        documentId: sourceDocumentId,
        filename: 'brief.docx',
        section: 'Planning statement',
        summary: value
      }]
    }],
    conflicts: [],
    unknownKeys: []
  };
}

async function projectOne(value, epistemicClass, key) {
  const {
    normalizePlanningSemanticExtractionResult,
    projectPlanningExtractionToClaims,
    validatePlanningSemanticExtractionResult
  } = await import(strategicUrl);
  const raw = extraction(value, epistemicClass, key);
  assert.deepEqual(validatePlanningSemanticExtractionResult(raw), { valid: true, errors: [] });
  return projectPlanningExtractionToClaims({
    extraction: normalizePlanningSemanticExtractionResult(raw),
    sourceDocumentId,
    documentRole: 'brand-strategy'
  })[0];
}

test('EPI-01: model FACT proposal cannot promote 希望 statement above USER_REQUIREMENT', async () => {
  const { routePlanningClaim } = await import(strategicUrl);
  const claim = await projectOne('希望品牌成为区域平台', 'FACT', 'brand_role');
  assert.equal(claim.epistemicClass, 'USER_REQUIREMENT');
  assert.equal(routePlanningClaim(claim).destination, 'USER_REQ');
});

test('EPI-02: model FACT proposal cannot promote 可能 statement above MODEL_INFERENCE', async () => {
  const { resolvePlanningClaimEpistemicClass, routePlanningClaim } = await import(strategicUrl);
  const claim = await projectOne('该业务可能面向年轻家庭', 'FACT', 'target_audience');
  assert.equal(claim.epistemicClass, 'MODEL_INFERENCE');
  assert.equal(routePlanningClaim(claim).destination, 'INFERENCE');
  assert.equal(resolvePlanningClaimEpistemicClass({
    modelProposal: 'FACT',
    value: '该业务面向年轻家庭',
    evidence: [{ documentId: sourceDocumentId, filename: 'brief.docx', summary: '该业务可能面向年轻家庭' }],
    documentRole: 'brand-strategy'
  }), 'MODEL_INFERENCE');
});

test('EPI-03: model FACT proposal cannot promote 待确认 statement above UNKNOWN', async () => {
  const { routePlanningClaim } = await import(strategicUrl);
  const claim = await projectOne('最终业务模式待确认', 'FACT', 'business_model');
  assert.equal(claim.epistemicClass, 'UNKNOWN');
  assert.equal(routePlanningClaim(claim).destination, 'UNKNOWN');
});

test('EPI-04: plain declarative FACT remains FACT', async () => {
  const claim = await projectOne('公司采用订阅制供应模式', 'FACT', 'business_model');
  assert.equal(claim.epistemicClass, 'FACT');
});

test('EPI-05: conservative model proposal is not automatically upgraded', async () => {
  const claim = await projectOne('公司采用订阅制供应模式', 'USER_REQUIREMENT', 'business_model');
  assert.equal(claim.epistemicClass, 'USER_REQUIREMENT');
});

test('EPI-06: model confidence is rejected and projected narrative confidence is undefined', async () => {
  const {
    PLANNING_EXTRACTION_SYSTEM_INSTRUCTION,
    normalizePlanningSemanticExtractionResult,
    projectPlanningExtractionToClaims,
    validatePlanningSemanticExtractionResult
  } = await import(strategicUrl);
  const withConfidence = extraction('公司采用订阅制供应模式', 'FACT');
  withConfidence.claims[0].confidence = 0.99;
  const rejected = validatePlanningSemanticExtractionResult(withConfidence);
  assert.equal(rejected.valid, false);
  assert.match(rejected.errors.join('\n'), /PLANNING_MODEL_CONFIDENCE_NOT_ALLOWED/);
  assert.equal(PLANNING_EXTRACTION_SYSTEM_INSTRUCTION.includes('"confidence"'), false);
  assert.match(PLANNING_EXTRACTION_SYSTEM_INSTRUCTION, /Do not output confidence/);

  const withoutConfidence = extraction('公司采用订阅制供应模式', 'FACT');
  const claims = projectPlanningExtractionToClaims({
    extraction: normalizePlanningSemanticExtractionResult(withoutConfidence),
    sourceDocumentId,
    documentRole: 'brand-strategy'
  });
  assert.equal(claims[0].confidence, undefined);
  assert.equal(Object.hasOwn(claims[0], 'confidence'), false);
});
