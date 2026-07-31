import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseRoot = path.join(root, 'evaluation', 'hidden-cases');
const filenames = (await fs.readdir(caseRoot)).filter((name) => name.endsWith('.json')).sort();
const metrics = [];
for (const filename of filenames) {
  const value = JSON.parse(await fs.readFile(path.join(caseRoot, filename), 'utf8'));
  if ('goldenPromptPath' in value || 'prompt' in value) {
    throw new Error(`Hidden case ${value.caseId || filename} must not contain a Golden or manually supplied prompt.`);
  }
  metrics.push({
    caseId: value.caseId,
    projectId: value.projectId,
    deliverable: value.deliverable,
    ...value.firstPassObservation,
    recordedAt: new Date().toISOString(),
  });
}
const report = {
  schemaVersion: '1.0',
  status: 'pass',
  rule: 'First observation only; no prompt repair or production mutation performed.',
  metrics,
};
const outputPath = path.join(root, 'evaluation', 'reports', 'hidden-case-latest.json');
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({ ...report, reportPath: path.relative(root, outputPath) }, null, 2)}\n`);
