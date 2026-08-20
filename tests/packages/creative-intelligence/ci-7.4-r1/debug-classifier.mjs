import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const docPrepUrl = pathToFileURL(path.join(repoRoot, 'packages/document-ingestion/src/document-preparation.js')).href;
const { readPlanningBriefFile, buildPlanningStrategicEvidenceArtifact, buildPlanningBriefRecord } = await import(
  pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href
);
const { classifyDocumentRole } = await import(docPrepUrl);
const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'planning-briefs', 'qualification-planning-a.md');
const { rawText } = await readPlanningBriefFile(fixturePath);
const cls = classifyDocumentRole({ id: 'brief-a', filename: 'qualification-planning-a.md', rawText });
console.log('classifyDocumentRole returned:', JSON.stringify(cls));
const record = buildPlanningBriefRecord({
  projectId: 'qualification-fixture-A',
  filename: 'qualification-planning-a.md',
  relativePath: 'tests/fixtures/planning-briefs/qualification-planning-a.md',
  rawText,
  registeredAt: '2026-08-20T00:00:00.000Z'
});
const artifact = await buildPlanningStrategicEvidenceArtifact({
  projectId: 'qualification-fixture-A',
  projectRoot: repoRoot,
  briefs: [record]
});
console.log('sourceDocuments:', artifact.sourceDocuments.length);
console.log('claims:', artifact.claims.length);
for (const c of artifact.claims.slice(0, 5)) {
  console.log(`  - key=${c.key} class=${c.epistemicClass} value=${c.value.slice(0, 40)}`);
}
