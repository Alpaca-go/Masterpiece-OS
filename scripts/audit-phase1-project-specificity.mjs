import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileShortChainImageGeneration } from '../packages/image-generation-runtime/src/short-chain/index.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditRoot = path.join(
  repositoryRoot,
  'docs',
  'validation',
  'phase1-project-specificity-regression',
);
const config = JSON.parse(await fs.readFile(path.join(auditRoot, 'audit-config.json'), 'utf8'));
const projectRoot = process.env.MASTERPIECE_AUDIT_PROJECT_ROOT || config.projectRoot;

async function readJson(filename) {
  return JSON.parse(await fs.readFile(filename, 'utf8'));
}

async function writeJson(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeText(filename, value) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  await fs.writeFile(filename, value.endsWith('\n') ? value : `${value}\n`, 'utf8');
}

function missingArtifact(name, reason) {
  return { schemaVersion: '1.0', artifact: name, status: 'missing', reason };
}

function taskInput(task) {
  return {
    projectId: task.projectId,
    deliverableFamily: task.deliverableFamily,
    subtype: task.subtype,
    shot: task.shot,
    count: task.count,
    aspectRatio: task.aspectRatio,
    currentInstruction: task.currentInstruction,
    mustInclude: task.mustInclude,
    mustAvoid: task.mustAvoid,
    referenceAssetIds: task.referenceAssetIds,
    logoUsageMode: 'post_composite',
  };
}

function comparable(value) {
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !['compiledAt', 'generatedAt', 'checkedAt', 'taskId', 'createdAt'].includes(key))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => [key, comparable(item)]));
}

function changeSummary(before, after, prefix = '') {
  const changes = [];
  const keys = new Set([
    ...Object.keys(before && typeof before === 'object' ? before : {}),
    ...Object.keys(after && typeof after === 'object' ? after : {}),
  ]);
  for (const key of [...keys].sort()) {
    const field = prefix ? `${prefix}.${key}` : key;
    const left = before?.[key];
    const right = after?.[key];
    if (JSON.stringify(comparable(left)) === JSON.stringify(comparable(right))) continue;
    if (left && right && !Array.isArray(left) && !Array.isArray(right)
      && typeof left === 'object' && typeof right === 'object') {
      changes.push(...changeSummary(left, right, field));
    } else {
      changes.push({ field, before: left ?? null, after: right ?? null });
    }
  }
  return changes;
}

function promptDiff(before, after, family) {
  const beforeLines = before.split(/\r?\n/u).filter(Boolean);
  const afterLines = after.split(/\r?\n/u).filter(Boolean);
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  return [
    `--- before/${family}/final-prompt.md`,
    `+++ after/${family}/final-prompt.md`,
    ...beforeLines.filter((line) => !afterSet.has(line)).map((line) => `- ${line}`),
    ...afterLines.filter((line) => !beforeSet.has(line)).map((line) => `+ ${line}`),
    '',
  ].join('\n');
}

const context = await readJson(path.join(projectRoot, 'project-context', 'project-visual-context.short-chain.json'));
const packet = await readJson(path.join(projectRoot, 'project-context', 'visual-decision-packet.json'));
context.visualDecisionPacket = packet;
const approvedDecision = await readJson(path.join(projectRoot, 'outputs', 'creative_decision.json'));
const userConfirmedVisualDecision = await readJson(path.join(
  projectRoot,
  'project-context',
  'user-confirmed-visual-decision.json',
));
const visualUnderstandingCore = await readJson(path.join(
  projectRoot,
  'creative-session',
  'reading',
  'creative-understanding.json',
));
const activePointer = await readJson(path.join(
  projectRoot,
  'creative-session',
  'blueprints',
  'active-blueprint.json',
));
const activeBlueprint = await readJson(path.join(
  projectRoot,
  'creative-session',
  'blueprints',
  `${activePointer.blueprintId}.json`,
));

const failCases = [];
const diffReport = {};
for (const family of ['space', 'packaging']) {
  const entry = config[family];
  const oldCompilationRoot = path.join(
    projectRoot,
    'image-generation-short-chain',
    'compilations',
    entry.failedCompilationId,
  );
  const oldCompiled = await readJson(path.join(oldCompilationRoot, 'compiled-prompt.json'));
  const oldTask = await readJson(path.join(oldCompilationRoot, 'task-contract.json'));
  const result = compileShortChainImageGeneration({
    projectContext: context,
    approvedCreativeDecision: approvedDecision,
    userConfirmedVisualDecision,
    task: taskInput(oldTask),
    now: '2026-07-30T00:00:00.000Z',
  });
  const beforeArtifacts = {
    'project-specific-generation-contract.json': oldCompiled.projectGenerationContract
      || missingArtifact(
        'project-specific-generation-contract.json',
        'The legacy space compiler did not assemble a Project-Specific Generation Contract.',
      ),
    'visual-decision-packet.json': packet,
    'visual-understanding-core.json': visualUnderstandingCore,
    'spatial-translation.json': packet.mediaTranslations?.spatial
      || missingArtifact('spatial-translation.json', 'No spatial translation was stored.'),
    'packaging-translation.json': oldCompiled.packagingTranslation
      || packet.mediaTranslations?.packaging
      || missingArtifact('packaging-translation.json', 'No packaging translation was stored.'),
    'generation-blueprint.json': activeBlueprint,
    'prompt-source-map.json': oldCompiled.sourceMap
      || missingArtifact('prompt-source-map.json', 'No prompt source map was stored.'),
    'preflight-report.json': oldCompiled.preflightReport
      || missingArtifact(
        'preflight-report.json',
        'The legacy compiler did not run project preflight for this branch.',
      ),
    'provider-payload-preview.json': await readJson(path.join(oldCompilationRoot, 'model-payload.json'))
      .catch(() => missingArtifact('provider-payload-preview.json', 'No provider payload preview was stored.')),
  };
  const afterArtifacts = {
    'project-specific-generation-contract.json': result.compiledPrompt.projectGenerationContract,
    'visual-decision-packet.json': result.compiledPrompt.effectiveVisualDecisionPacket || packet,
    'visual-understanding-core.json': visualUnderstandingCore,
    'spatial-translation.json': result.compiledPrompt.spatialTranslation
      || packet.mediaTranslations?.spatial,
    'packaging-translation.json': result.compiledPrompt.packagingTranslation
      || packet.mediaTranslations?.packaging,
    'generation-blueprint.json': activeBlueprint,
    'prompt-source-map.json': result.compiledPrompt.sourceMap,
    'preflight-report.json': result.compiledPrompt.preflightReport,
    'provider-payload-preview.json': result.payload,
  };
  for (const [filename, value] of Object.entries(beforeArtifacts)) {
    await writeJson(path.join(auditRoot, 'before', family, filename), value);
  }
  for (const [filename, value] of Object.entries(afterArtifacts)) {
    await writeJson(path.join(auditRoot, 'after', family, filename), value);
  }
  await writeText(path.join(auditRoot, 'before', family, 'final-prompt.md'), oldCompiled.finalPrompt);
  await writeText(path.join(auditRoot, 'after', family, 'final-prompt.md'), result.compiledPrompt.finalPrompt);
  await writeText(
    path.join(auditRoot, `${family}-prompt.diff`),
    promptDiff(oldCompiled.finalPrompt, result.compiledPrompt.finalPrompt, family),
  );
  diffReport[family] = {
    structuredArtifacts: Object.fromEntries(Object.keys(afterArtifacts).map((filename) => [
      filename,
      changeSummary(beforeArtifacts[filename], afterArtifacts[filename]),
    ])),
    prompt: {
      beforeCharacters: [...oldCompiled.finalPrompt].length,
      afterCharacters: [...result.compiledPrompt.finalPrompt].length,
      addedProjectDecisionSources: Object.entries(result.compiledPrompt.sourceMap)
        .filter(([, sources]) => sources.some((source) =>
          source.startsWith('project_generation_contract.projectSpecificDecisions')))
        .map(([blockId]) => blockId),
      logoUsageBefore: oldCompiled.logoUsageMode,
      logoUsageAfter: result.compiledPrompt.logoUsageMode,
    },
    preflight: result.compiledPrompt.preflightReport,
  };
  failCases.push({
    id: `REGRESSION-${family.toUpperCase()}-${entry.failedRunId}`,
    projectId: context.projectId,
    family,
    status: 'regression_fail',
    failedRunId: entry.failedRunId,
    failedCompilationId: entry.failedCompilationId,
    imagePath: path.join(
      projectRoot,
      'image-generation',
      entry.failedRunId,
      'images',
      'image-01.png',
    ),
    observedRegression: entry.observedRegression,
  });
  for (const attempt of entry.repairAttempts || []) {
    failCases.push({
      id: `REGRESSION-${family.toUpperCase()}-${attempt.failedRunId}`,
      projectId: context.projectId,
      family,
      status: 'regression_fail',
      failedRunId: attempt.failedRunId,
      failedCompilationId: attempt.failedCompilationId,
      imagePath: path.join(
        projectRoot,
        'image-generation',
        attempt.failedRunId,
        'images',
        'image-01.png',
      ),
      observedRegression: attempt.observedRegression,
    });
  }
}

const peacockCase = failCases.find((item) =>
  item.failedRunId === 'ea21d802-a334-486e-8892-035dbb963e7c');
const genericPartialCase = failCases.find((item) =>
  item.failedRunId === '8551a8c0-ea48-4765-a27f-c7c2ff140ae7');
const safeGenericClinicCase = failCases.find((item) =>
  item.failedRunId === 'd7fe0976-018c-41e9-9759-bcaf45e3acf3');
if (peacockCase) failCases.push({ ...peacockCase, id: 'jiuzhou-space-peacock-theme-fail' });
if (genericPartialCase) {
  failCases.push({ ...genericPartialCase, id: 'jiuzhou-space-generic-medical-partial' });
}
if (safeGenericClinicCase) {
  failCases.push({
    ...safeGenericClinicCase,
    id: 'jiuzhou-space-safe-generic-clinic-partial',
    status: 'partial_fail',
  });
}

await writeJson(path.join(auditRoot, 'regression-fail-cases.json'), {
  schemaVersion: '1.0',
  registeredAt: new Date().toISOString(),
  cases: failCases,
});
await writeJson(path.join(auditRoot, 'artifact-diff.json'), {
  schemaVersion: '1.0',
  generatedAt: new Date().toISOString(),
  diff: diffReport,
});
console.log(JSON.stringify({
  status: 'ok',
  auditRoot,
  spacePreflight: diffReport.space.preflight,
  packagingPreflight: diffReport.packaging.preflight,
}, null, 2));
