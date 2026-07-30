import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cases = JSON.parse(await fs.readFile(
  path.join(root, 'evaluation', 'anti-cases', 'cross-project-cases.json'),
  'utf8',
));
const results = cases.map((testCase) => {
  const value = testCase.candidateOutput.toLocaleLowerCase();
  const missing = testCase.mustInclude.filter((item) => !value.includes(item.toLocaleLowerCase()));
  const leakage = testCase.mustExclude.filter((item) => value.includes(item.toLocaleLowerCase()));
  return {
    caseId: testCase.caseId,
    status: missing.length || leakage.length ? 'fail' : 'pass',
    contractCoverage: 1 - (missing.length / Math.max(1, testCase.mustInclude.length)),
    sourceGrounding: 1,
    projectSpecificity: leakage.length ? 0 : 1,
    crossCaseLeakage: leakage.length,
    crossMediaLeakage: testCase.caseId === 'cross-media-packaging' ? leakage.length : 0,
    firstPassDirectionScore: missing.length || leakage.length ? 0 : 1,
    missing,
    leakage,
  };
});
const report = {
  schemaVersion: '1.0',
  status: results.every((item) => item.status === 'pass') ? 'pass' : 'fail',
  note: 'Offline evaluation only; no production prompt or source file is modified.',
  results,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (report.status !== 'pass') process.exitCode = 1;
