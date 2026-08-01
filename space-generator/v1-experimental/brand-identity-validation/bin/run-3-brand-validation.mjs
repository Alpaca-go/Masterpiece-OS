// Phase 9C.0.5 4-Brand Validation Runner (text-level, no Provider)
// 跟 Updated doc 对齐: status "pass"|"blocked" 二态, recommendation 字段,
// 6 fields (industry / category / spaceType / audience / materialDirection /
// functionalRelationship).
//
// 用法: node brand-identity-validation/bin/run-3-brand-validation.mjs
//
// 对 4 brand (JZMX / FTT / YJLF / WAYE-corrected) 跑 validateBrandIdentity,
// 产出 results/3-brand-validation/. 不调真实 Provider, 不污染生产代码, 不动 v1-baseline.

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

  // human-readable summary (Updated schema)
  let md = `# Phase 9C.0.5 Validation — ${b.key}\n\n`;
  md += `- **Status**: ${result.status}\n`;
  md += `- **Risk level**: ${result.riskLevel}\n`;
  md += `- **Recommendation**: ${result.recommendation}\n`;
  md += `- **Overall confidence**: ${result.overallConfidence}\n`;
  md += `- **Issues**: ${result.issues.length}\n\n`;
  md += `## Field checks (Phase 9C.0.5 Updated §6, 6 fields)\n\n`;
  md += `| Field | Value | Matched industry | Confidence |\n`;
  md += `| --- | --- | --- | --- |\n`;
  for (const f of ['industry', 'category', 'spaceType', 'audience', 'materialDirection', 'functionalRelationship']) {
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
    recommendation: result.recommendation,
    confidence: result.overallConfidence,
    issueCount: result.issues.length,
    industryMatched: result.industry.matchedIndustry,
  });
}

let md = '# Phase 9C.0.5 — 4-Brand Validation Summary (Updated doc schema)\n\n';
md += `- **Generated**: ${new Date().toISOString()}\n`;
md += `- **Phase**: 9C.0.5 (Brand Identity Validation Gate — Updated doc schema v2.0.0)\n`;
md += `- **Status**: text-level 4-brand validation complete; no Provider called.\n`;
md += `- **Schema**: status "pass" | "blocked" 二态, recommendation "continue" | "review_brand_DNA" | "ask_user", 6 validation fields (industry / category / spaceType / audience / materialDirection / functionalRelationship).\n\n`;
md += '## 1. Per-Brand Result\n\n';
md += '| Brand | Status | Risk | Recommendation | Confidence | Issues | Matched industry |\n';
md += '| --- | --- | --- | --- | --- | --- | --- |\n';
for (const r of summaryRows) {
  md += `| ${r.brand} | ${r.status} | ${r.riskLevel} | ${r.recommendation} | ${r.confidence} | ${r.issueCount} | ${r.industryMatched ?? 'null'} |\n`;
}

md += '\n## 2. Test Cases (per §9 Updated doc)\n\n';
md += '### Case 01: 蛙耶 (wa-ye, post-9C.0.5 DNA 修正)\n';
const waye = allBrandResults['wa-ye'];
md += `- **Expected**: pass + continue (DNA 修正后 industry=casual_dining, 6 fields 全一致)\n`;
md += `- **Actual**: ${waye.status} + ${waye.recommendation} (risk: ${waye.riskLevel}, confidence: ${waye.confidence}, issues: ${waye.issueCount})\n`;
md += `- **Note**: 蛙耶 v0.1 frozen test case 在 gate 9C.0.5 commit f7c97df 阶段报 blocked + review_brand_DNA (5 cross-industry contamination issues). 9C.0.5 (post-correction) commit 65252fd 已修 DNA, 现在 4 brand 全 pass + continue.\n\n`;

md += '### Case 02: 九州美学 (jiuzhou-aesthetics)\n';
const jzmx = allBrandResults['jiuzhou-aesthetics'];
md += `- **Expected**: pass + continue (medical_aesthetics, 6 fields 全一致)\n`;
md += `- **Actual**: ${jzmx.status} + ${jzmx.recommendation} (risk: ${jzmx.riskLevel}, confidence: ${jzmx.confidence})\n\n`;

md += '### Case 03: 冯烫烫 (feng-tang-tang)\n';
const ftt = allBrandResults['feng-tang-tang'];
md += `- **Expected**: pass + continue (restaurant, 6 fields 全一致)\n`;
md += `- **Actual**: ${ftt.status} + ${ftt.recommendation} (risk: ${ftt.riskLevel}, confidence: ${ftt.confidence})\n\n`;

md += '### Case 04: 一剂良方 (yi-ji-liang-fang)\n';
const yjlf = allBrandResults['yi-ji-liang-fang'];
md += `- **Expected**: pass + continue (tcm_wellness, 6 fields 全一致)\n`;
md += `- **Actual**: ${yjlf.status} + ${yjlf.recommendation} (risk: ${yjlf.riskLevel}, confidence: ${yjlf.confidence})\n\n`;

md += '## 3. Updated doc Validation Rules Summary\n\n';
md += '- **Phase 9C.0.5 Updated §2**: 跟 Structured Analysis Self-Healing 关系 — Self-healing 修 contract drift, 9C.0.5 修 cross-industry contamination (品牌语义), 二者不合并\n';
md += '- **Phase 9C.0.5 Updated §5**: 检测范围只 Cross Industry Contamination, 不处理创意质量 / 风格优劣 / 美学判断\n';
md += '- **Phase 9C.0.5 Updated §6**: 6 validation fields (industry / category / spaceType / audience / materialDirection / functionalRelationship)\n';
md += '- **Phase 9C.0.5 Updated §7**: Pass/Block 二态 status, recommendation 字段 (continue / review_brand_DNA / ask_user)\n';
md += '- **Phase 9C.0.5 Updated §8**: critical (行业完全冲突) / high (空间功能冲突) / medium (人工确认)\n';
md += '- **Phase 9C.0.5 Updated §10**: 不增加生图成本 / 不影响正常流程 / 不替代 Creative Decision\n';
md += '- **Phase 9C.0.5 Updated §11**: Phase 10 升级为完整 Decision Consistency Validator (Industry/Brand Personality/Visual DNA/Spatial Translation/Constraint Contradiction)\n';
md += '- **No image gen, no Provider API, no LLM call**: pure text-based rule engine over DNA JSON\n';

writeFileSync(join(resultsRoot, 'integration-summary.md'), md, 'utf8');

console.log('\n4-Brand Validation complete (Updated doc schema):');
for (const r of summaryRows) {
  console.log(`  ${r.brand}: ${r.status} + ${r.recommendation} (risk: ${r.riskLevel}, confidence: ${r.confidence}, issues: ${r.issueCount})`);
}
console.log(`\nReport: ${join(resultsRoot, 'integration-summary.md')}`);
