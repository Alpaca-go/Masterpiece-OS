import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  normalizeProjectFacts,
  projectFactsLines,
  projectFactsConstraints,
  PROJECT_FACTS_SCHEMA_VERSION,
} from '../src/runtime/project-facts.js';
import { buildFusionEnhancedTask } from '../src/runtime/analysis-contract.js';
import { createProjectStore } from '../src/project-store.js';

test('facts schema version is declared', () => {
  assert.equal(PROJECT_FACTS_SCHEMA_VERSION, '1.0');
});

test('blank and unknown facts are dropped, numbers are rounded', () => {
  const facts = normalizeProjectFacts({
    floorArea: '86.4', ceilingHeight: 3.21, locationType: 'street',
    dineInShare: '', budgetBand: undefined, somethingElse: 'x',
  });
  assert.deepEqual(facts, { floorArea: 86.4, ceilingHeight: 3.2, locationType: 'street' });
  assert.deepEqual(normalizeProjectFacts(undefined), {});
  assert.deepEqual(normalizeProjectFacts({}), {});
});

test('invalid facts fail loudly instead of being stored', () => {
  assert.throws(() => normalizeProjectFacts({ locationType: 'rooftop' }), /取值无效/);
  assert.throws(() => normalizeProjectFacts({ floorArea: 'big' }), /必须是数字/);
  assert.throws(() => normalizeProjectFacts({ ceilingHeight: 40 }), /应在/);
  assert.throws(() => normalizeProjectFacts({ floorArea: 0 }), /应在/);
});

test('facts lines are ordered and readable, and the constraint list is empty without facts', () => {
  assert.deepEqual(projectFactsLines({}), []);
  assert.deepEqual(projectFactsConstraints({}), []);
  assert.deepEqual(projectFactsConstraints(undefined), []);

  const lines = projectFactsLines({
    kitchenExhaust: 'open_flame', budgetBand: 'mid', servicePeriod: 'dinner',
    dineInShare: 'mostly_dine_in', locationType: 'street', ceilingHeight: 3.2, floorArea: 86,
  });
  assert.deepEqual(lines, [
    '- 场地：街面 / 社区底商；面积约 86 ㎡；层高约 3.2 m',
    '- 经营：堂食为主；主要时段：晚市',
    '- 预算档：中档',
    '- 厨房与排烟：可开放明火明档',
  ]);

  const constraints = projectFactsConstraints({ floorArea: 86, kitchenExhaust: 'open_flame' });
  assert.ok(constraints[0].includes('项目事实与约束'));
  assert.ok(constraints[1].includes('面积约 86 ㎡'));
  assert.ok(constraints.at(-1).includes('已经确认'), 'the locked-fact instruction must be present');
  assert.ok(constraints.at(-1).includes('不要为了填满结构而编造'));
});

test('the analysis task text itself stays free of the facts block', () => {
  // Facts travel through factualConstraints, not the user task: the task text
  // must stay identical for the same description.
  const task = buildFusionEnhancedTask('深度审计现有视觉方案', '临时项目');
  assert.equal(task.includes('项目事实与约束'), false);
  assert.equal(task, buildFusionEnhancedTask('深度审计现有视觉方案', '临时项目'));
});

test('project store keeps facts on create and invalidates analysis when they change', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'project-facts-'));
  try {
    const store = createProjectStore(root);
    const created = await store.create({ projectName: '事实测试', industry: '餐饮', facts: { floorArea: 80, locationType: 'street' } });
    assert.deepEqual(created.facts, { floorArea: 80, locationType: 'street' });

    // Simulate a finished analysis, then re-save unrelated fields: the analysis
    // context must survive because the facts did not change.
    const analysed = await store.update(created.id, { visualContextStatus: 'ready', visualContextVNextStatus: 'ready', status: 'completed' });
    const unchanged = await store.updateDetails(created.id, {
      projectName: '事实测试', industry: '餐饮', facts: { floorArea: 80, locationType: 'street' }, expectedUpdatedAt: analysed.updatedAt,
    });
    assert.equal(unchanged.visualContextVNextStatus, 'ready');
    assert.deepEqual(unchanged.facts, { floorArea: 80, locationType: 'street' });

    const changed = await store.updateDetails(created.id, {
      projectName: '事实测试', industry: '餐饮', facts: { floorArea: 80, locationType: 'mall' }, expectedUpdatedAt: unchanged.updatedAt,
    });
    assert.deepEqual(changed.facts, { floorArea: 80, locationType: 'mall' });
    assert.equal(changed.visualContextVNextStatus, 'missing');

    await assert.rejects(() => store.updateDetails(created.id, {
      projectName: '事实测试', industry: '餐饮', facts: { budgetBand: 'luxury' }, expectedUpdatedAt: changed.updatedAt,
    }), /取值无效/);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
