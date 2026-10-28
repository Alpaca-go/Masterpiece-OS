#!/usr/bin/env node
// Offline case extractor.
//
// Reads one visual-workflow project's analysis packet and latest successful run,
// then emits a draft case card: analysis proposals and accepted evidence are
// filled automatically; the override table is intentionally left for a human.
//
// Usage:
//   node scripts/extract-case.mjs --project <uuid> [--out draft.md] [--json draft.json]
//        [--acceptance <acceptance-record.md>] [--root <visual-workflow data root>]
//
// No network, no provider calls, read-only on the project directory.
import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback = undefined) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const projectId = arg('project');
if (!projectId) {
  console.error('Usage: node scripts/extract-case.mjs --project <uuid> [--out file] [--json file] [--acceptance file]');
  process.exit(1);
}
const root = path.resolve(arg('root', path.join(process.env.APPDATA || '', 'masterpiece-os-desktop', 'visual-workflow')));
const taskFilter = arg('task');
const projectDir = path.join(root, 'data', 'projects', projectId);
const packetPath = path.join(projectDir, 'project-context', 'visual-decision-packet.json');
const projectPath = path.join(projectDir, 'project.json');

async function readJson(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return fallback; throw error; }
}

const project = await readJson(projectPath);
const packet = await readJson(packetPath);
if (!project || !packet) {
  console.error(`missing project.json or packet for ${projectId}`);
  process.exit(1);
}

// Latest successful compilation: prefer completedAt, then mtime.
const compilationsDir = path.join(projectDir, 'image-generation-vnext', 'compilations');
let latest = null;
try {
  for (const entry of await fs.readdir(compilationsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (taskFilter && entry.name !== taskFilter) continue;
    const run = await readJson(path.join(compilationsDir, entry.name, 'run.json'));
    if (!run || run.status !== 'succeeded') continue;
    const stamp = run.completedAt || run.updatedAt || '';
    if (!latest || stamp > latest.stamp) latest = { taskId: entry.name, run, stamp };
  }
} catch { /* no compilations yet */ }

let validation = null;
if (latest) {
  const summary = await readJson(path.join(projectDir, 'image-generation-vnext', 'validations', `${latest.taskId}.summary.json`));
  validation = summary ? {
    terminalStatus: summary.terminalStatus,
    validationStatus: summary.initialValidation?.status ?? null,
    logoTextStatus: summary.initialValidation?.logoTextStatus ?? null
  } : null;
}

const facts = packet.projectFacts ?? {};
const decision = packet.creativeDecision ?? {};
const spatial = packet.mediaTranslations?.spatial ?? {};
const value = (entry) => (entry && typeof entry === 'object' && 'value' in entry ? entry.value : entry);
const list = (value, empty = '- (none)') => (Array.isArray(value) ? value : []).filter(Boolean).map((item) => `- ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\n') || empty;
const materials = (spatial.materialLanguage ?? []).map((item) => `- ${item.material}: ${(item.behavior ?? []).join('、')}；用途：${item.brandRole ?? '-'}；禁用：${(item.forbidden ?? []).join('、') || '-'}`).join('\n') || '- (none)';
const colors = ['primary', 'secondary', 'accent', 'forbidden'].flatMap((key) => {
  const items = spatial.colorBehavior?.[key] ?? packet.colorSystem?.[key] ?? [];
  return (Array.isArray(items) ? items : []).map((item) => `- ${key}: ${typeof item === 'string' ? item : `${item.name}｜${item.role}｜${item.spatialUsage}`}`);
}).join('\n') || '- (none)';
const diagnosis = Object.entries(packet.diagnosis ?? {})
  .flatMap(([key, items]) => (Array.isArray(items) ? items : []).map((item) => `- ${key}: ${item.target ?? ''} ${item.observation ?? ''}`.trim()))
  .join('\n') || '- (none)';

const generatedAt = new Date().toISOString();
const acceptance = arg('acceptance');
const lines = [];
lines.push(`# ${value(facts.brandName) ?? project.projectName} · 案例草稿（自动生成）`);
lines.push('');
lines.push(`> 生成时间：${generatedAt}。分析提案与验收证据为自动抽取；**人工覆盖表必须由人填写**。`);
lines.push(`> 项目：\`${projectId}\`；项目名：${project.projectName}；行业：${value(facts.industry) ?? project.industry}`);
lines.push('');
lines.push('## 1. 项目事实');
lines.push('');
lines.push(`- 品牌：${value(facts.brandName) ?? project.brandName}`);
lines.push(`- 行业：${value(facts.industry) ?? project.industry}`);
lines.push(`- 品牌角色：${value(facts.brandRole) ?? '-'}`);
lines.push('');
lines.push('## 2. 分析提案（自动抽取）');
lines.push('');
lines.push('### 2.1 创意决策');
lines.push('');
lines.push(`- 品牌角色陈述：${decision.brandRoleStatement ?? '-'}`);
lines.push(`- 升级命题：${decision.uniqueUpgradeThesis ?? '-'}`);
lines.push('- 保留核心：');
lines.push(list(decision.preserveCore));
lines.push('- 升级方向：');
lines.push(list(decision.upgradeTo));
lines.push('- 语气边界：');
lines.push(list((decision.toneBoundaries ?? []).map((item) => `${item.target}（避免：${(item.avoid ?? []).join('、')}）`)));
lines.push('- 战略否定：');
lines.push(list(decision.strategicNegatives));
lines.push('');
lines.push('### 2.2 空间提案');
lines.push('');
lines.push(`- 空间概念：${spatial.spatialConcept ?? '-'}`);
lines.push('- 功能网络：');
lines.push(list(spatial.functionalNetwork));
lines.push('- 必见项：');
lines.push(list(spatial.mustBeVisible));
lines.push('- 功能关系：');
lines.push(list(spatial.functionalRelationships));
lines.push('- 品牌角色在空间中的表现：');
lines.push(list(spatial.brandRoleManifestation));
lines.push('');
lines.push('### 2.3 材料 / 色彩 / 灯光');
lines.push('');
lines.push('材料：');
lines.push(materials);
lines.push('');
lines.push('色彩：');
lines.push(colors);
lines.push('');
lines.push(`灯光：来源 ${(spatial.lightingLanguage?.source ?? packet.lightingSystem?.source ?? []).join('、') || '-'}；对比 ${spatial.lightingLanguage?.contrast ?? packet.lightingSystem?.contrast ?? '-'}；禁用 ${(spatial.lightingLanguage?.forbidden ?? packet.lightingSystem?.forbidden ?? []).join('、') || '-'}`);
lines.push('');
lines.push('### 2.4 诊断');
lines.push('');
lines.push(diagnosis);
lines.push('');
lines.push(acceptance ? '## 3. 验收证据（自动抽取）' : '## 3. 最近一次成功运行（未验收）');
lines.push('');
if (!acceptance) {
  lines.push('> 未提供 `--acceptance` 记录：本节只说明最近一次成功运行，**不代表人工验收**。');
  lines.push('');
}
if (latest) {
  const image = latest.run.images?.[0] ?? {};
  lines.push(`- 任务：\`${latest.taskId}\``);
  lines.push(`- 运行：\`${latest.run.runId}\``);
  lines.push(`- 模型：${latest.run.provider ?? '-'} / ${latest.run.modelId ?? '-'}`);
  lines.push(`- 图片：${image.width ?? '?'}×${image.height ?? '?'}，${image.sizeBytes ?? '?'} bytes，SHA-256 \`${image.sha256 ?? '-'}\``);
  lines.push(`- 自动校验：${validation ? `${validation.terminalStatus} / ${validation.validationStatus} / logoText=${validation.logoTextStatus}` : '未找到'}`);
} else {
  lines.push('- 未找到成功的生图运行');
}
if (acceptance) lines.push(`- 验收记录：\`${path.resolve(acceptance)}\``);
lines.push('');
lines.push('## 4. 人工覆盖（必须填写）');
lines.push('');
lines.push('| 维度 | 分析提案 | 最终接受 | 为什么改 | 证据 |');
lines.push('|---|---|---|---|---|');
for (const row of ['材料', '灯光', '色彩面积', '结构 / 烟罩', '密度', '品牌文字', '构图']) {
  lines.push(`| ${row} | （见第 2 节） | TODO | TODO | TODO |`);
}
lines.push('');
lines.push('## 5. 规则使用（必须填写）');
lines.push('');
lines.push('| 规则 slug | 是否注入 | 是否适用 | 结论 |');
lines.push('|---|---|---|---|');
lines.push('| TODO | | | |');
lines.push('');
lines.push('## 6. 证据路径');
lines.push('');
lines.push(`- packet：\`${packetPath}\``);
lines.push(`- project：\`${projectPath}\``);
if (latest) lines.push(`- 运行目录：\`${path.join(compilationsDir, latest.taskId)}\``);
lines.push('');
lines.push('> 填完第 4、5 节后，把本文件移到 `docs/knowledge/restaurant-cases/<slug>.md`，并在 `README.md` 索引中登记。');

const output = lines.join('\n') + '\n';
const out = arg('out');
if (out) {
  await fs.mkdir(path.dirname(path.resolve(out)), { recursive: true });
  await fs.writeFile(path.resolve(out), output, 'utf8');
  console.log(`draft written: ${path.resolve(out)}`);
} else {
  process.stdout.write(output);
}

const jsonOut = arg('json');
if (jsonOut) {
  const sidecar = {
    schemaVersion: '1.0',
    generatedAt,
    projectId,
    projectName: project.projectName,
    facts: Object.fromEntries(Object.entries(facts).map(([key, entry]) => [key, value(entry)])),
    analysis: { decision, spatial, diagnosis: packet.diagnosis ?? {}, abstractions: packet.abstractions ?? [] },
    accepted: acceptance && latest ? { taskId: latest.taskId, run: latest.run, validation } : null,
    latestRun: latest ? { taskId: latest.taskId, run: latest.run, validation } : null,
    acceptanceRecord: acceptance ? path.resolve(acceptance) : null,
    overrides: null
  };
  await fs.mkdir(path.dirname(path.resolve(jsonOut)), { recursive: true });
  await fs.writeFile(path.resolve(jsonOut), JSON.stringify(sidecar, null, 2) + '\n', 'utf8');
  console.log(`json written: ${path.resolve(jsonOut)}`);
}
