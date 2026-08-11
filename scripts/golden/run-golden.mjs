import fs from 'node:fs';
import path from 'node:path';
import { runGoldenSuite, repoRoot } from '../../tests/golden/golden-suite.js';

if (process.argv.some((arg) => /update[-_]golden/i.test(arg))) {
  console.error('GOLDEN_UPDATE_FORBIDDEN: expected files require explicit human approval and are never rewritten by this runner.');
  process.exit(2);
}

if (process.argv.includes('--provider')) {
  console.error('PROVIDER_GOLDEN_NOT_CONFIGURED: S2 default runner is offline; real-provider verification requires a separately authorized workflow.');
  process.exit(2);
}

const report = await runGoldenSuite();
console.log('Golden Regression Report');
for (const item of report.results) {
  console.log(`${item.id} ${item.result}${item.visual ? ` (${item.visual})` : ''}`);
  if (item.error) console.error(item.error);
}
console.log(`Overall: ${report.overall}`);
console.log(`Provider calls: ${report.providerCalls}`);
console.log(`Golden auto-updated: ${report.autoUpdated ? 'YES' : 'NO'}`);

const reportDir = path.join(repoRoot, '.runtime', 'golden');
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'latest-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

if (report.overall === 'FAIL' || report.overall === 'BLOCKED') process.exitCode = 1;
