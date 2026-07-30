import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const auditRoot = path.join(repositoryRoot, 'docs', 'validation', 'positive-spatial-mechanism');
const config = JSON.parse(await fs.readFile(path.join(auditRoot, 'audit-config.json'), 'utf8'));

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

function promptDiff(before, after) {
  const beforeLines = before.split(/\r?\n/u).filter(Boolean);
  const afterLines = after.split(/\r?\n/u).filter(Boolean);
  const beforeSet = new Set(beforeLines);
  const afterSet = new Set(afterLines);
  return [
    '--- before/final-prompt.md',
    '+++ after/final-prompt.md',
    ...beforeLines.filter((line) => !afterSet.has(line)).map((line) => `- ${line}`),
    ...afterLines.filter((line) => !beforeSet.has(line)).map((line) => `+ ${line}`),
    '',
  ].join('\n');
}

function mechanismSnapshot(spatial, contract) {
  const fields = [
    'brandRoleManifestation',
    'signatureSpatialMechanism',
    'functionalNetwork',
    'sceneProgram',
    'positiveDifferentiators',
    'mustBeVisible',
  ];
  return Object.fromEntries(fields.map((field) => [field, {
    spatialTranslation: spatial?.[field] || [],
    projectContract: contract?.[field] || [],
  }]));
}

async function exportCompilation(label, compilationId) {
  const root = path.join(
    config.projectRoot,
    'image-generation-vnext',
    'compilations',
    compilationId,
  );
  const [compiled, packet, payload] = await Promise.all([
    readJson(path.join(root, 'compiled-prompt.json')),
    readJson(path.join(root, 'effective-visual-decision-packet.json')),
    readJson(path.join(root, 'provider-payload-preview.json')),
  ]);
  const spatial = compiled.spatialTranslation || packet.mediaTranslations?.spatial || {};
  const output = path.join(auditRoot, label);
  await Promise.all([
    writeJson(path.join(output, 'spatial-translation.json'), spatial),
    writeJson(
      path.join(output, 'project-specific-generation-contract.json'),
      compiled.projectGenerationContract,
    ),
    writeJson(path.join(output, 'prompt-source-map.json'), compiled.sourceMap),
    writeJson(path.join(output, 'preflight-report.json'), compiled.preflightReport),
    writeJson(path.join(output, 'provider-payload-preview.json'), payload),
    writeText(path.join(output, 'final-prompt.md'), compiled.finalPrompt),
  ]);
  return {
    compilationId,
    compiled,
    spatial,
    mechanism: mechanismSnapshot(spatial, compiled.projectGenerationContract),
  };
}

const before = await exportCompilation('before', config.beforeCompilationId);
const after = await exportCompilation('after', config.afterCompilationId);
await writeJson(path.join(auditRoot, 'spatial-mechanism-diff.json'), {
  schemaVersion: '1.0',
  beforeCompilationId: before.compilationId,
  afterCompilationId: after.compilationId,
  before: before.mechanism,
  after: after.mechanism,
  prompt: {
    beforeCharacters: before.compiled.finalPrompt.length,
    afterCharacters: after.compiled.finalPrompt.length,
    positiveBlockBefore: before.compiled.blocks
      .find((block) => block.id === 'positive_spatial_mechanism') || null,
    positiveBlockAfter: after.compiled.blocks
      .find((block) => block.id === 'positive_spatial_mechanism') || null,
  },
});
await writeText(
  path.join(auditRoot, 'final-prompt.diff'),
  promptDiff(before.compiled.finalPrompt, after.compiled.finalPrompt),
);

console.log(JSON.stringify({
  status: 'ok',
  auditRoot,
  beforeCompilationId: before.compilationId,
  afterCompilationId: after.compilationId,
  afterPreflight: after.compiled.preflightReport,
}, null, 2));
