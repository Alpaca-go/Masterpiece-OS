import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runPipeline } from '../src/pipeline.js';

const projects = ['匿名文旅Demo', '匿名食品Demo', '匿名文创Demo'];

for (const project of projects) {
  test(`长期回归：${project}`, async () => {
    const root = path.resolve('examples', project);
    const output = await fs.mkdtemp(path.join(os.tmpdir(), `design-factory-${project}-`));
    const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), `design-factory-history-${project}-`));
    const { result } = await runPipeline(root, { output, historyDir, mode: 'review' });
    assert.equal(result.brandLock.brandName, project);
    assert.match(result.brandLock.primaryColor, /^#[0-9A-F]{6}$/);
    assert.ok(!result.brandLock.secondaryColors.includes(result.brandLock.primaryColor));
    assert.ok(result.brandLock.logo.files.length >= 1);
    assert.equal(result.imagePlan.count, 13);
    assert.equal(result.gaps.topThree.length, 3);
    const taskPackage = await fs.readFile(path.join(output, '02-Chat生图任务包.md'), 'utf8');
    assert.match(taskPackage, new RegExp(project));
    assert.match(taskPackage, /## 品牌设计意图/);
    assert.match(taskPackage, /### 品牌视觉 DNA/);
    assert.match(taskPackage, /### 摄影语言/);
    assert.match(taskPackage, /### 创意方向/);
    assert.match(taskPackage, /## Chat 执行规则/);
    assert.match(taskPackage, /## 图片任务/);
    assert.match(taskPackage, /完整继承“品牌设计意图”/);
    assert.doesNotMatch(taskPackage, /- 品牌约束：/);
    assert.doesNotMatch(taskPackage, /\\n\+?>/);
    const projectAnalysis = await fs.readFile(path.join(output, '01-项目分析报告.md'), 'utf8');
    const knowledgeReview = await fs.readFile(path.join(output, '03-Knowledge-Review.md'), 'utf8');
    const designReview = await fs.readFile(path.join(output, '04-Design-Review.md'), 'utf8');
    assert.match(projectAnalysis, /## 品牌设计推理（Creative Reasoning）/);
    assert.match(projectAnalysis, /## Design Risks/);
    assert.match(knowledgeReview, /未经人工审核不得写入 knowledge\/approved\//);
    assert.match(knowledgeReview, /本次项目未发现新的通用设计规律，仅产生项目级经验/);
    assert.match(knowledgeReview, /建议动作：Project Only/);
    assert.match(designReview, /首次项目，暂无历史数据。/);
    assert.match(designReview, /## 14\. Action Items/);
    assert.deepEqual(result.knowledgeAnalysis.statistics, { new: 0, update: 0, duplicate: 0, projectOnly: 4 });
    await assert.rejects(fs.access(path.join(output, 'design-factory-result.json')), { code: 'ENOENT' });
    assert.equal(result.designReview.radar.length, 8);
    assert.ok(result.creativeReasoning.creativeDirection);
    assert.ok(result.designReview.strengths.length >= 3);
    assert.ok(result.designReview.improvements.length >= 5);
  });
}

test('重复运行不会把自定义输出当作素材', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-idempotent-'));
  await fs.cp(path.resolve('examples', '匿名文旅Demo'), root, { recursive: true });
  const output = path.join(root, 'reports', 'latest');
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-idempotent-history-'));
  const first = await runPipeline(root, { output, historyDir });
  const second = await runPipeline(root, { output, historyDir });
  assert.equal(second.result.inventory.totalFiles, first.result.inventory.totalFiles);
  assert.ok(!second.result.inventory.items.some((x) => x.path.startsWith('reports/')));
});

test('默认 Fast Mode 只生成两份核心报告且清理旧评审文件', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-default-output-'));
  await fs.cp(path.resolve('examples', '匿名食品Demo'), root, { recursive: true });
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-default-history-'));
  await fs.mkdir(path.join(root, 'outputs'), { recursive: true });
  await fs.writeFile(path.join(root, 'outputs', '03-Knowledge-Review.md'), 'stale');
  await fs.writeFile(path.join(root, 'outputs', '04-Design-Review.md'), 'stale');
  const first = await runPipeline(root, { historyDir });
  const second = await runPipeline(root, { historyDir });
  assert.equal(first.output, path.join(root, 'outputs'));
  assert.equal(first.result.mode, 'fast');
  assert.equal(second.result.inventory.totalFiles, first.result.inventory.totalFiles);
  for (const name of ['01-项目分析报告.md', '02-Chat生图任务包.md']) {
    await assert.doesNotReject(fs.access(path.join(root, 'outputs', name)));
  }
  await assert.rejects(fs.access(path.join(root, 'outputs', '03-Knowledge-Review.md')), { code: 'ENOENT' });
  await assert.rejects(fs.access(path.join(root, 'outputs', '04-Design-Review.md')), { code: 'ENOENT' });
  assert.equal(first.result.knowledgeAnalysis, undefined);
  assert.equal(first.result.designReview, undefined);
  assert.deepEqual(first.result.outputFiles, ['01-项目分析报告.md', '02-Chat生图任务包.md']);
  await assert.rejects(fs.access(path.join(root, 'outputs', 'design-factory-result.json')), { code: 'ENOENT' });
});

test('Review Mode 保持四份规范报告与只读 Knowledge 审核', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-review-output-'));
  await fs.cp(path.resolve('examples', '匿名食品Demo'), root, { recursive: true });
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-review-history-'));
  const { result } = await runPipeline(root, { historyDir, mode: 'review' });
  for (const name of ['01-项目分析报告.md', '02-Chat生图任务包.md', '03-Knowledge-Review.md', '04-Design-Review.md']) {
    await assert.doesNotReject(fs.access(path.join(root, 'outputs', name)));
  }
  assert.equal(result.mode, 'review');
  assert.equal(result.outputFiles.length, 4);
  assert.ok(result.knowledgeAnalysis);
  assert.ok(result.designReview);
});

test('Research Mode 必须显式启用并保持四份文件上限', async () => {
  const root = path.resolve('examples', '匿名文创Demo');
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-research-output-'));
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-research-history-'));
  const { result } = await runPipeline(root, { output, historyDir, mode: 'research' });
  assert.equal(result.mode, 'research');
  assert.deepEqual(result.outputFiles, ['01-项目分析报告.md', '02-Chat生图任务包.md', '03-Knowledge-Review.md', '04-Design-Review.md']);
  assert.equal((await fs.readdir(output)).filter((name) => name.endsWith('.md')).length, 4);
});

test('未知分析模式会被拒绝', async () => {
  await assert.rejects(runPipeline(path.resolve('examples', '匿名文创Demo'), { mode: 'slow' }), /未知分析模式/);
});

test('调试模式额外生成结构化 JSON', async () => {
  const root = path.resolve('examples', '匿名食品Demo');
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-debug-output-'));
  const historyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'design-factory-debug-history-'));
  await runPipeline(root, { output, historyDir, debug: true, mode: 'review' });
  const json = JSON.parse(await fs.readFile(path.join(output, 'design-factory-result.json'), 'utf8'));
  assert.equal(json.version, '3.0.0');
  assert.equal(json.mode, 'review');
  assert.ok(json.creativeReasoning.creativeDirection);
  assert.equal(json.designReview.radar.length, 8);
});
