import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runV4Pipeline, V4_STANDARD_OUTPUT_FILES } from '../src/v4-bootstrap.js';
import { readCreativeDecisionState } from '../src/creative-decision-state-store.js';
import { createV4CompilerState } from './fixtures/v4-creative-decision-state.js';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);
const execFileAsync = promisify(execFile);

function benchmarkEvidence(id, url, observedAt) {
  return {
    evidenceId: `evidence.benchmark.${id}`,
    sourceType: 'benchmark',
    sourceId: `benchmark.${id}`,
    locator: url,
    summary: `Verified same-category case ${id}`,
    observedAt,
    sourceDigest: `digest-benchmark-${id}`,
    confidentiality: 'public'
  };
}

function v4Config() {
  const fixture = createV4CompilerState();
  const at = fixture.meta.createdAt;
  const baseEvidence = fixture.provenance.evidenceIndex[0];
  const cases = [
    { name: 'Case A', url: 'https://example.com/a', relevance: 'Same-category identity system' },
    { name: 'Case B', url: 'https://example.com/b', relevance: 'Same-category photography system' },
    { name: 'Case C', url: 'https://example.com/c', relevance: 'Same-category retail system' }
  ];
  const benchmarkEvidenceIndex = cases.map((item, index) => benchmarkEvidence(String(index + 1), item.url, at));
  return {
    projectId: fixture.meta.projectId,
    projectVersion: fixture.meta.projectVersion,
    reasoningProviderResults: {
      brandUnderstanding: {
        runId: fixture.provenance.reasoningRuns.brandUnderstanding.runId,
        provider: 'test-reasoning-provider',
        model: 'test-model',
        completedAt: at,
        brandName: 'Bootstrap Test Brand',
        industry: 'tea',
        category: 'premium tea',
        projectType: 'identity evolution',
        originalIntent: { statement: fixture.brand.originalIntent.statement, evidenceRefs: [baseEvidence.evidenceId] },
        logos: ['asset.png'],
        colors: ['#112233'],
        typography: ['Approved Sans'],
        packaging: [],
        personality: fixture.brand.personality,
        currentVisualAssessment: fixture.brand.currentVisualAssessment,
        visualInspection: { verified: true, inspectedImages: ['asset.png'], findings: ['Verified source image.'] },
        evidenceIndex: [baseEvidence],
        sourceTimestamps: fixture.provenance.sourceTimestamps
      },
      industryBenchmark: {
        runId: fixture.provenance.reasoningRuns.industryBenchmark.runId,
        provider: 'test-reasoning-provider',
        model: 'test-model',
        completedAt: at,
        industry: 'tea',
        cases,
        observations: ['Identity remains consistent across touchpoints.'],
        opportunities: ['Upgrade material and lighting expression.'],
        evidenceIndex: benchmarkEvidenceIndex,
        sourceTimestamps: benchmarkEvidenceIndex.map((item) => ({ sourceId: item.sourceId, observedAt: at })),
        publicNetworkRequests: 3
      },
      creativeDecision: {
        runId: fixture.provenance.reasoningRuns.creativeDecision.runId,
        provider: 'test-reasoning-provider',
        model: 'test-model',
        completedAt: at,
        meta: {
          decisionId: fixture.meta.decisionId,
          createdAt: fixture.meta.createdAt,
          approvedAt: fixture.meta.approvedAt
        },
        evidenceIndex: [],
        sourceTimestamps: [],
        dataPolicyRef: fixture.provenance.dataPolicyRef,
        brand: fixture.brand,
        strategy: fixture.strategy,
        constraints: fixture.constraints,
        decisionRecord: fixture.decisionRecord,
        governance: {
          approvals: fixture.governance.approvals,
          blockers: [],
          warnings: [],
          extensions: {}
        },
        extensions: {}
      }
    }
  };
}

test('v4 Bootstrap creates one Active State, compiles it and publishes four outputs', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-os-v4-bootstrap-'));
  const input = path.join(projectRoot, 'input');
  const output = path.join(projectRoot, 'outputs');
  const configPath = path.join(projectRoot, 'masterpiece-os.json');
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, 'asset.png'), ONE_PIXEL_PNG);
  await fs.writeFile(configPath, JSON.stringify(v4Config(), null, 2));

  const first = await runV4Pipeline(input, { projectRoot, output, config: configPath, debug: true });
  assert.equal(first.result.version, '4.0.0');
  assert.equal(first.result.pipelineId, 'masterpiece-os-v4-pipeline');
  assert.equal(first.result.state.governance.readiness, 'release-ready');
  assert.equal(first.result.compilation.decisionId, first.result.state.meta.decisionId);
  assert.equal(first.result.compilation.stateDigest, first.result.state.meta.stateDigest);
  assert.deepEqual(first.result.outputFiles, V4_STANDARD_OUTPUT_FILES);
  assert.equal(first.result.review.status, 'PASS');
  assert.equal(first.result.performance.context.publicNetworkRequests, 3);

  const active = await readCreativeDecisionState(projectRoot, { required: true });
  assert.equal(active.meta.stateDigest, first.result.state.meta.stateDigest);
  const markdownFiles = (await fs.readdir(output)).filter((name) => name.endsWith('.md')).sort();
  assert.deepEqual(markdownFiles, [...V4_STANDARD_OUTPUT_FILES].sort());
  await assert.rejects(fs.access(path.join(output, 'Creative-Brief-GPT.md')), { code: 'ENOENT' });
  const brief = await fs.readFile(path.join(output, '02-Creative-Brief.md'), 'utf8');
  assert.equal((brief.match(/^## \d+\./gm) || []).length, 10);
  const debug = JSON.parse(await fs.readFile(path.join(output, 'masterpiece-os-result.json'), 'utf8'));
  assert.equal(debug.version, '4.0.0');
  assert.equal(debug.compilation.creativeBrief.runtimeGptBrief.content, '[runtime-only content omitted from persistence]');

  const second = await runV4Pipeline(input, { projectRoot, output, config: configPath });
  assert.equal(second.result.stateActivation.changed, false);
  assert.equal(second.result.state.meta.stateDigest, first.result.state.meta.stateDigest);
  await assert.rejects(fs.access(path.join(output, 'debug', 'performance.json')), { code: 'ENOENT' });
});

test('v4 Bootstrap fails closed when a Reasoning Provider result is missing', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-os-v4-missing-provider-'));
  const input = path.join(projectRoot, 'input');
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, 'asset.png'), ONE_PIXEL_PNG);
  const configPath = path.join(projectRoot, 'masterpiece-os.json');
  await fs.writeFile(configPath, JSON.stringify({ projectId: 'missing', projectVersion: '4.0-test' }));
  await assert.rejects(
    runV4Pipeline(input, { projectRoot, config: configPath }),
    (error) => error?.code === 'REASONING_RESULT_MISSING'
  );
  assert.equal(await readCreativeDecisionState(projectRoot), null);
});

test('default analyze CLI executes the v4 Pipeline instead of the legacy v3.3 path', async () => {
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-os-v4-cli-'));
  const input = path.join(projectRoot, 'input');
  const output = path.join(projectRoot, 'outputs');
  const configPath = path.join(projectRoot, 'masterpiece-os.json');
  await fs.mkdir(input);
  await fs.writeFile(path.join(input, 'asset.png'), ONE_PIXEL_PNG);
  await fs.writeFile(configPath, JSON.stringify(v4Config(), null, 2));
  const cli = path.resolve('bin', 'masterpiece-os.js');

  const { stdout } = await execFileAsync(process.execPath, [
    cli, 'analyze', input, '--config', configPath, '--output', output
  ], { cwd: path.resolve('.'), encoding: 'utf8' });

  assert.match(stdout, /v4 Active State：decision-compiler-test/);
  assert.match(stdout, /State Readiness：release-ready/);
  assert.doesNotMatch(stdout, /Masterpiece-OS v3\.3/);
  assert.deepEqual(
    (await fs.readdir(output)).filter((name) => name.endsWith('.md')).sort(),
    [...V4_STANDARD_OUTPUT_FILES].sort()
  );
});
