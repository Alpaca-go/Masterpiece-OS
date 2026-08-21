/**
 * CI-W1C.7.5-R1.1 — zero-network pre-live repair proof.
 * All model seams below are deterministic in-process fakes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
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
const orchestratorUrl = pathToFileURL(path.join(
  repoRoot,
  'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts'
)).href;

function hashText(text) {
  return createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
}

function validDvc(sourceDocumentId, filename, rawLength = 1000) {
  return {
    schemaVersion: '1.0',
    sourceRunId: 'zero-network-narrative-run',
    generatedAt: '2026-08-21T00:00:00.000Z',
    brandName: 'Example Brand',
    industry: 'Circular materials',
    products: ['Recovered fiber'],
    services: [],
    targetAudience: ['Procurement teams'],
    pricePositioning: null,
    businessModel: 'Subscription supply',
    brandPersonality: ['Practical'],
    visualPreferences: [],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [
      { field: 'industry', documentId: sourceDocumentId, filename, section: 'Market context', summary: 'Circular materials' },
      { field: 'businessModel', documentId: sourceDocumentId, filename, section: 'Commercial model', summary: 'Subscription supply' },
      { field: 'targetAudience', documentId: sourceDocumentId, filename, section: 'Audience', summary: 'Procurement teams' }
    ],
    sourceDocuments: [{ documentId: sourceDocumentId, filename, sourceType: 'docx', characterCount: rawLength }]
  };
}

async function makeProject(briefText, filename = 'planning-brief.md') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mp-r1-1-'));
  const relativePath = path.join('planning-briefs', filename);
  const storedText = briefText.trimEnd();
  await fs.mkdir(path.dirname(path.join(root, relativePath)), { recursive: true });
  await fs.writeFile(path.join(root, relativePath), storedText, 'utf8');
  const contentHash = hashText(storedText);
  const projectId = `r1-1-${contentHash.slice(0, 8)}`;
  const brief = {
    sourceId: `planning-brief:${projectId}:${contentHash.slice(0, 16)}`,
    filename,
    relativePath,
    contentHash,
    characterCount: storedText.length,
    documentRole: 'brand-strategy',
    sourceRole: 'PLANNING_STRATEGIC_SOURCE',
    registeredAt: '2026-08-21T00:00:00.000Z'
  };
  const project = { id: projectId, projectName: 'R1.1 fixture', planningBriefFiles: [brief] };
  const store = {
    async get(id) {
      assert.equal(id, projectId);
      return project;
    },
    async paths(id) {
      assert.equal(id, projectId);
      return { root };
    },
    async remove() {}
  };
  return { root, projectId, brief, store };
}

function emptyReasoningContext(projectId) {
  return {
    truth: {
      projectId,
      facts: [],
      conflicts: [],
      sourceRefs: [],
      schemaVersion: 'project-truth-v0.1',
      generatedAt: '2026-08-21T00:00:00.000Z'
    },
    needs: [],
    evidence: { projectId, entries: [], generatedAt: '2026-08-21T00:00:00.000Z' }
  };
}

const fakeCredentials = async () => ({
  profileId: 'zero-network',
  provider: 'mock',
  protocol: 'openai-chat',
  modelType: 'analysis',
  baseUrl: 'http://127.0.0.1:1',
  model: 'fake',
  apiKey: ''
});

test('NPE-11: ESM projection executes and emits stable claims without require()', async () => {
  const { projectDocumentContextToPlanningClaims } = await import(strategicUrl);
  const sourceDocumentId = 'project:PLANNING_STRATEGIC_SOURCE:brief.docx:0123456789abcdef';
  const claims = projectDocumentContextToPlanningClaims({
    dvc: validDvc(sourceDocumentId, 'brief.docx'),
    sourceDocumentId,
    documentRole: 'brand-strategy'
  });
  assert.ok(claims.length >= 4);
  assert.ok(claims.every((claim) => claim.claimId.startsWith(sourceDocumentId)));
});

test('NPE-12/13/15: canonical coverage uses character count and chunk coverage', async () => {
  const { computeStructuredExtractionCoverage } = await import(strategicUrl);
  const longFew = computeStructuredExtractionCoverage({
    claims: [{ key: 'industry', chunkRefs: ['c1'] }],
    chunks: [{ chunkId: 'c1' }],
    rawText: 'x'.repeat(4001)
  });
  assert.equal(longFew.sufficient, false);
  assert.equal(longFew.reason, 'few_claims_for_long_doc');
  assert.equal(longFew.characterCount, 4001);

  const sparse = computeStructuredExtractionCoverage({
    claims: [
      { key: 'industry', chunkRefs: ['c1'] },
      { key: 'brand_role', chunkRefs: ['c1'] },
      { key: 'business_model', chunkRefs: ['c1'] },
      { key: 'target_audience', chunkRefs: ['c1'] },
      { key: 'brand_promise', chunkRefs: ['c1'] }
    ],
    chunks: Array.from({ length: 10 }, (_, index) => ({ chunkId: `c${index + 1}` })),
    rawText: 'structured'
  });
  assert.equal(sparse.sufficient, false);
  assert.equal(sparse.reason, 'low_source_chunk_coverage');
  assert.equal(sparse.sourceChunkCoverage, 0.1);
});

test('NPE-17/23: fake reasoner runs parse/validate/normalize/projection and hybrid merge', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  const { buildPlanningStrategicEvidenceArtifactHybrid, buildSourceDocumentId } = await import(strategicUrl);
  const ctx = await makeProject('# 品牌战略规划\n行业: Circular materials\n品牌角色: Materials partner\n');
  try {
    const sourceDocumentId = buildSourceDocumentId(
      ctx.projectId,
      'PLANNING_STRATEGIC_SOURCE',
      ctx.brief.filename,
      ctx.brief.contentHash
    );
    let calls = 0;
    const output = await runNarrativePlanningExtraction({
      projectId: ctx.projectId,
      sourceDocumentId,
      rawText: 'A narrative planning document about circular material procurement.',
      documentRole: 'brand-strategy',
      filename: ctx.brief.filename,
      reasoner: async ({ prompt }) => {
        calls += 1;
        assert.ok(prompt.messages.some((message) => message.content.includes('<document')));
        return { reportMarkdown: JSON.stringify(validDvc(sourceDocumentId, ctx.brief.filename)) };
      }
    });
    assert.equal(calls, 1);
    assert.equal(output.attempts[0].finishStatus, 'ok');
    assert.ok(output.claims.length >= 4);

    const hybrid = await buildPlanningStrategicEvidenceArtifactHybrid({
      projectId: ctx.projectId,
      projectRoot: ctx.root,
      briefs: [ctx.brief],
      narrativeClaims: output.claims
    });
    assert.ok(hybrid.claims.some((claim) => claim.key === 'business_model'));
    assert.ok(hybrid.claims.some((claim) => claim.key === 'industry'));
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('NPE-24/25: repair receives previous output plus validation errors and succeeds', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  const sourceDocumentId = 'project:PLANNING_STRATEGIC_SOURCE:repair.docx:0123456789abcdef';
  const seenMessages = [];
  const responses = ['{"brandName": 7}', JSON.stringify(validDvc(sourceDocumentId, 'repair.docx'))];
  const output = await runNarrativePlanningExtraction({
    projectId: 'repair-project',
    sourceDocumentId,
    rawText: 'Narrative planning text.',
    documentRole: 'brand-strategy',
    filename: 'repair.docx',
    reasoner: async ({ prompt }) => {
      seenMessages.push(prompt.messages);
      return { reportMarkdown: responses.shift() };
    }
  });
  assert.equal(seenMessages.length, 2);
  const repairText = seenMessages[1].map((message) => message.content).join('\n');
  assert.match(repairText, /上一次输出/);
  assert.match(repairText, /\{"brandName": 7\}/);
  assert.match(repairText, /schemaVersion/);
  assert.equal(output.attempts[0].finishStatus, 'repair');
  assert.ok(output.attempts[0].validationErrors.length > 0);
  assert.equal(output.attempts[1].finishStatus, 'repair');
});

test('NPE-26: base and repair failure throws canonical fail-closed error', async () => {
  const { runNarrativePlanningExtraction } = await import(narrativeUrl);
  let calls = 0;
  await assert.rejects(
    runNarrativePlanningExtraction({
      projectId: 'failed-project',
      sourceDocumentId: 'failed:source',
      rawText: 'Narrative planning text.',
      documentRole: 'brand-strategy',
      filename: 'failed.docx',
      reasoner: async () => {
        calls += 1;
        return { reportMarkdown: calls === 1 ? 'not-json' : '{"still":"invalid"}' };
      }
    }),
    /NARRATIVE_EXTRACTION_FAILED/
  );
  assert.equal(calls, 2);
});

test('NPE-19..22: hybrid merge applies confidence, tie, conflict, id, and source rules', async () => {
  const { buildPlanningStrategicEvidenceArtifact, buildPlanningStrategicEvidenceArtifactHybrid } = await import(strategicUrl);
  const ctx = await makeProject('# 品牌战略规划\n行业: Café\n品牌角色: Neighborhood host\n业务模式: Membership\n');
  try {
    const structured = await buildPlanningStrategicEvidenceArtifact({
      projectId: ctx.projectId,
      projectRoot: ctx.root,
      briefs: [ctx.brief]
    });
    const industry = structured.claims.find((claim) => claim.key === 'industry');
    const role = structured.claims.find((claim) => claim.key === 'brand_role');
    assert.ok(industry && role);
    const narrative = [
      { ...industry, claimId: 'narrative-higher', value: ` ${industry.value.normalize('NFD')} `, confidence: 0.99 },
      { ...role, claimId: 'narrative-tie', confidence: role.confidence },
      { ...industry, claimId: 'narrative-conflict', value: 'Tea house', confidence: 0.99 },
      { ...industry, claimId: 'unknown-source', sourceDocumentId: 'foreign-source', confidence: 1 }
    ];
    const hybrid = await buildPlanningStrategicEvidenceArtifactHybrid({
      projectId: ctx.projectId,
      projectRoot: ctx.root,
      briefs: [ctx.brief],
      narrativeClaims: narrative
    });
    assert.ok(hybrid.claims.some((claim) => claim.claimId === 'narrative-higher'));
    assert.ok(hybrid.claims.some((claim) => claim.claimId === role.claimId));
    assert.ok(!hybrid.claims.some((claim) => claim.claimId === 'narrative-tie'));
    assert.ok(hybrid.claims.some((claim) => claim.claimId === 'narrative-conflict'));
    assert.ok(!hybrid.claims.some((claim) => claim.claimId === 'unknown-source'));

    const exactCollision = await buildPlanningStrategicEvidenceArtifactHybrid({
      projectId: ctx.projectId,
      projectRoot: ctx.root,
      briefs: [ctx.brief],
      narrativeClaims: [{ ...industry, confidence: 1 }]
    });
    const exactWinner = exactCollision.claims.find((claim) => claim.claimId === industry.claimId);
    assert.equal(exactWinner?.confidence, industry.confidence);
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('NPE-14/18: sufficient structured coverage skips narrative and continues Strategic', async () => {
  const { runCreativeReasoningForProject } = await import(orchestratorUrl);
  const briefText = [
    '# 品牌战略规划',
    '行业: Circular retail',
    '品牌角色: Community operator',
    '业务模式: Membership',
    '目标客群: Urban families',
    '品牌承诺: Reliable reuse',
    '战略目标: Local adoption'
  ].join('\n');
  const ctx = await makeProject(briefText);
  let narrativeCalls = 0;
  try {
    const result = await runCreativeReasoningForProject(
      {
        projectId: ctx.projectId,
        useMock: true,
        readCredentials: fakeCredentials,
        reasonerFactory: () => async () => {
          narrativeCalls += 1;
          throw new Error('narrative must be skipped');
        }
      },
      {
        projectStore: ctx.store,
        outputRoot: async () => path.join(ctx.root, 'out'),
        loadReasoningContext: async () => emptyReasoningContext(ctx.projectId)
      }
    );
    assert.equal(narrativeCalls, 0);
    assert.notEqual(result.stages.synthesis.status, 'NOT_RUN');
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('NPE-16: insufficient narrative base+repair failure blocks Strategic', async () => {
  const { runCreativeReasoningForProject } = await import(orchestratorUrl);
  const ctx = await makeProject(`# 品牌战略规划\n行业: Circular retail\n${'Narrative paragraph. '.repeat(3000)}`);
  let calls = 0;
  try {
    await assert.rejects(
      runCreativeReasoningForProject(
        {
          projectId: ctx.projectId,
          useMock: true,
          readCredentials: fakeCredentials,
          reasonerFactory: () => async () => {
            calls += 1;
            return { reportMarkdown: 'invalid narrative output' };
          }
        },
        {
          projectStore: ctx.store,
          outputRoot: async () => path.join(ctx.root, 'out'),
          loadReasoningContext: async () => emptyReasoningContext(ctx.projectId)
        }
      ),
      /PLANNING_NARRATIVE_EXTRACTION_FAILED:.*Strategic=NOT_RUN/
    );
    assert.equal(calls, 2);
    await assert.rejects(fs.access(path.join(ctx.root, 'out')));
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});

test('NPE-12/15/17: long-document canonical coverage triggers narrative and continues', async () => {
  const { runCreativeReasoningForProject } = await import(orchestratorUrl);
  const { buildSourceDocumentId } = await import(strategicUrl);
  const structuredHead = [
    '# 品牌战略规划',
    '行业: Circular retail'
  ].join('\n');
  const ctx = await makeProject(`${structuredHead}\n${'Long narrative body without labels. '.repeat(10000)}`);
  const sourceDocumentId = buildSourceDocumentId(
    ctx.projectId,
    'PLANNING_STRATEGIC_SOURCE',
    ctx.brief.filename,
    ctx.brief.contentHash
  );
  let narrativeCalls = 0;
  try {
    const result = await runCreativeReasoningForProject(
      {
        projectId: ctx.projectId,
        useMock: true,
        readCredentials: fakeCredentials,
        reasonerFactory: () => async () => {
          narrativeCalls += 1;
          return { reportMarkdown: JSON.stringify(validDvc(sourceDocumentId, ctx.brief.filename, ctx.brief.characterCount)) };
        }
      },
      {
        projectStore: ctx.store,
        outputRoot: async () => path.join(ctx.root, 'out'),
        loadReasoningContext: async () => emptyReasoningContext(ctx.projectId)
      }
    );
    assert.equal(narrativeCalls, 1);
    assert.notEqual(result.stages.synthesis.status, 'NOT_RUN');
    const snapshot = JSON.parse(await fs.readFile(result.outputPaths.promptSnapshots.synthesis, 'utf8'));
    const promptText = snapshot.messages.map((message) => message.content).join('\n');
    assert.match(promptText, /Subscription supply/);
  } finally {
    await fs.rm(ctx.root, { recursive: true, force: true });
  }
});
