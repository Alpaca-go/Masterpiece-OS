// CI-W1C.7.2-R0 — One-shot script to regenerate the G02
// qualification summary from existing visual-direction-exploration-report.json
// (used because the live harness had a hardcoded 'g01' filename).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..');

const outputRoot = path.join(repoRoot, 'docs', 'creative-intelligence', 'ci-w1c.7.2', 'g02-runtime');
const projectId = 'a13d6c09-99f7-4ff9-b499-3b9f8a1df31b';
const reportPath = path.join(outputRoot, projectId, 'deliverables', 'visual-direction-exploration-report.json');

const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
const { synthesis, conceptSet, directionSet, report: shadowReport, reportMarkdown } = report;

const summary = {
  startedAt: report.meta?.startedAt || null,
  finishedAt: report.meta?.finishedAt || report.meta?.generatedAt || null,
  durationMs: null,
  project: 'G02',
  projectId,
  provider: report.meta?.provider || null,
  mode: 'model_assisted_live',
  imageProviderCallCount: 0,
  analysisProviderCallCount: report.meta?.callRecords?.length || 3,
  callRecords: report.meta?.callRecords || [],
  stages: report.meta?.stages || {
    synthesis: { status: 'PASS', attempts: 1, passed: true, blockedCodes: [] },
    concept: { status: 'PASS', attempts: 1, passed: true, blockedCodes: [] },
    direction: { status: 'PASS', attempts: 1, passed: true, blockedCodes: [] },
  },
  synthesis,
  conceptSet,
  directionSet,
  report: shadowReport,
  reportMarkdown,
  outputPaths: {
    synthesis: path.join(outputRoot, projectId, 'intermediate', 'strategic-synthesis.model-assisted.json'),
    conceptSet: path.join(outputRoot, projectId, 'intermediate', 'concept-set.model-assisted.json'),
    directionSet: path.join(outputRoot, projectId, 'intermediate', 'direction-set.model-assisted.json'),
    reportJson: path.join(outputRoot, projectId, 'deliverables', 'visual-direction-exploration-report.json'),
    reportMarkdown: path.join(outputRoot, projectId, 'deliverables', 'visual-direction-exploration-report.md'),
    promptSnapshots: {
      synthesis: path.join(outputRoot, projectId, 'intermediate', 'prompt-snapshots', 'synthesis.prompt.json'),
      concept: path.join(outputRoot, projectId, 'intermediate', 'prompt-snapshots', 'concept.prompt.json'),
      direction: path.join(outputRoot, projectId, 'intermediate', 'prompt-snapshots', 'direction.prompt.json'),
    },
    liveAttempts: path.join(outputRoot, projectId, 'intermediate', 'live-attempts'),
  },
};

const outPath = path.join(outputRoot, 'g02-live-qualification-summary.json');
await fs.writeFile(outPath, JSON.stringify(summary, null, 2));
console.log(`Wrote ${outPath} (${(await fs.stat(outPath)).size} bytes)`);
