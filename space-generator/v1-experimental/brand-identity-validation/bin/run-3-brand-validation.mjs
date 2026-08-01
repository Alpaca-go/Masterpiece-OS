// Phase 9C.0.5 3-Brand Validation Runner (text-level, no Provider)
// 用法: node brand-identity-validation/bin/run-3-brand-validation.mjs
//
// 对 3 brand 跑 validateBrandIdentity, 产出 results/3-brand-validation/.
// 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// bin/ -> brand-identity-validation/ -> v1-experimental/ -> space-generator/ -> D:/Masterpiece-OS
const repoRoot = join(__dirname, '..', '..', '..', '..');
const resultsRoot = join(__dirname, '..', 'results', '3-brand-validation');

const { validateBrandIdentity, loadRules, synthesizeAnalysisReport } = await import(
  `../compile-validation.mjs`
);

const brands = [
  { key: 'jiuzhou-aesthetics', dnaPath: 'field-schema/examples/jiuzhou-aesthetics.dna.json' },
  { key: 'feng-tang-tang', dnaPath: 'test-cases/regression/projects/feng-tang-tang.dna.json' },
  { key: 'yi-ji-liang-fang', dnaPath: 'test-cases/regression/projects/yi-jui-liang-fang.dna.json' },
  { key: 'wa-ye', dnaPath: 'test-cases/regression/projects/wa-ye.dna.json' },
];

mkdirSync(resultsRoot, { recursive: true });

const summaryRows = [];
const allBrandResults = {};

for (const b of brands) {
  console.log(`Validating ${b.key}...`);
  const dnaPath = join(repoRoot, 'space-generator', 'v1-experimental', b.dnaPath);
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const report = synthesizeAnalysisReport(dna);
  const result = validateBrandIdentity({ brandDNA: dna, analysisReport: report });

  const brandDir = join(resultsRoot, b.key);
  mkdirSync(brandDir, { recursive: true });
  writeFileSync(join(brandDir, 'validation-result.json'), JSON.stringify(result, null, 2), 'utf8');

  // human-readable summary
  let md = `# Phase 9C.0.5 Validation — ${b.key}\n\n`;
  md += `- **Status**: ${result.status}\n`;
  md += `- **Overall confidence**: ${result.overallConfidence}\n`;
  md += `- **Risk level**: ${result.riskLevel}\n`;
  md += `- **Issues**: ${result.issues.length}\n\n`;
  md += `## Field checks\n\n`;
  md += `| Field | Value | Matched industry | Confidence |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const f of ['industry', 'category', 'spaceType', 'audience']) {
    const c = result[f];
    const val = typeof c.value === 'string' ? c.value : JSON.stringify(c.value);
    md += `| ${f} | ${val ?? 'null'} | ${c.matchedIndustry ?? 'null'} | ${c.confidence} |\n`;
  }
  md += `\n## Issues\n\n`;
  if (result.issues.length === 0) {
    md += `_No issues._\n`;
  } else {
    for (const i of result.issues) {
      md += `### [${i.severity}] ${i.field}\n`;
      md += `${i.message}\n\n`;
      md += `**Evidence**: ${i.evidence.join(' | ')}\n\n`;
    }
  }
  writeFileSync(join(brandDir, 'validation-report.md'), md, 'utf8');

  allBrandResults[b.key] = result;
  summaryRows.push({
    brand: b.key,
    status: result.status,
    riskLevel: result.riskLevel,
    confidence: result.overallConfidence,
    issueCount: result.issues.length,
    industryMatched: result.industry.matchedIndustry,
  });
}

let md = '# Phase 9C.0.5 — 3-Brand Validation Summary\n\n';
md += `- **Generated**: ${new Date().toISOString()}\n`;
md += `- **Phase**: 9C.0.5 (Brand Identity Validation Gate)\n`;
md += `- **Status**: text-level 3-brand validation complete; no Provider called.\n\n`;
md += '## 1. Per-Brand Result\n\n';
md += '| Brand | Status | Risk | Confidence | Issues | Matched industry |\n';
md += '| --- | --- | --- | --- | --- | --- |\n';
for (const r of summaryRows) {
  md += `| ${r.brand} | ${r.status} | ${r.riskLevel} | ${r.confidence} | ${r.issueCount} | ${r.industryMatched ?? 'null'} |\n`;
}

md += '\n## 2. Test Cases (per §12)\n\n';
md += '### Case 01: 蛙耶 (wa-ye)\n';
const waye = allBrandResults['wa-ye'];
md += `- **Expected**: fail (sports retail DNA is wrong; reference images show 炭烧牛蛙 restaurant)\n`;
md += `- **Actual**: ${waye.status} (risk: ${waye.riskLevel}, confidence: ${waye.confidence})\n\n`;

md += '### Case 02: 九州美学 (jiuzhou-aesthetics)\n';
const jzmx = allBrandResults['jiuzhou-aesthetics'];
md += `- **Expected**: pass\n`;
md += `- **Actual**: ${jzmx.status} (risk: ${jzmx.riskLevel}, confidence: ${jzmx.confidence})\n\n`;

md += '### Case 03: 冯烫烫 (feng-tang-tang)\n';
const ftt = allBrandResults['feng-tang-tang'];
md += `- **Expected**: pass\n`;
md += `- **Actual**: ${ftt.status} (risk: ${ftt.riskLevel}, confidence: ${ftt.confidence})\n\n`;

md += '## 3. Validation Rules Summary\n\n';
md += '- **Industries covered**: restaurant, tcm_wellness, medical_aesthetics, sports_retail, fashion_retail, casual_dining\n';
md += '- **Fields validated**: industry, category, spaceType, audience, plus internal DNA consistency (motifFamily / negativeConstraints / materialDna / brandSpirit)\n';
md += '- **Thresholds**: pass >= 0.85 / review 0.65-0.85 / fail < 0.65\n';
md += '- **Risk levels**: critical (industry 完全错) / high (space type vs industry 冲突) / medium (motif / material 错位) / low (全部一致)\n';
md += '- **No image gen, no Provider API, no LLM call**: pure text-based rule engine over DNA JSON\n';

writeFileSync(join(resultsRoot, 'integration-summary.md'), md, 'utf8');

console.log('\n3-Brand Validation complete:');
for (const r of summaryRows) {
  console.log(`  ${r.brand}: ${r.status} (risk: ${r.riskLevel}, confidence: ${r.confidence}, issues: ${r.issueCount})`);
}
console.log(`\nReport: ${join(resultsRoot, 'integration-summary.md')}`);
