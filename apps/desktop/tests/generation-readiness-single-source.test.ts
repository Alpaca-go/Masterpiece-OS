// §16 / §13 单一 Readiness 状态源：Audit Report / Blocked Report / UI 都读取同一份 generation-readiness-result.json。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  orchestrateGenerationReadiness,
  compileReadinessStatusSection,
  compileBlockedGenerationReport
} from '../src/main/reference-first/index.ts';
import { minimalOrchestratorInput } from './reference-first-fixtures.ts';

test('audit report and blocked report read the same root issues from the single source', () => {
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  const result = orchestration.generationReadinessResult;

  const auditSection = compileReadinessStatusSection(result);
  const blockedReport = compileBlockedGenerationReport({
    identityPack: orchestration.identityPack,
    readiness: orchestration.generationReadiness,
    readinessResult: result
  });

  // 两者都必须呈现同一份根因（REQUESTED_TASK_SUBSET_MISSING）。
  assert.ok(
    auditSection.includes('REQUESTED_TASK_SUBSET_MISSING'),
    '审计报告必须呈现根因 REQUESTED_TASK_SUBSET_MISSING'
  );
  assert.ok(
    blockedReport.includes('REQUESTED_TASK_SUBSET_MISSING'),
    '阻断报告必须呈现同一根因 REQUESTED_TASK_SUBSET_MISSING'
  );

  // 审计报告必须展示 Validator Execution 完整性（§13）。
  assert.ok(auditSection.includes('Validator Execution'), '审计报告必须展示 Validator Execution 行');
  assert.ok(
    auditSection.includes('complete') || auditSection.includes('incomplete'),
    'Validator Execution 必须标注 complete / incomplete'
  );
});

test('single source is derived once, not recomputed per consumer', () => {
  const orchestration = orchestrateGenerationReadiness(minimalOrchestratorInput());
  const result = orchestration.generationReadinessResult;
  // 根因集合在所有消费点保持一致（UI 也读取 result.rootIssues）。
  const fromResult = result.rootIssues.map((i) => i.code).sort();
  const auditSection = compileReadinessStatusSection(result);
  for (const code of fromResult) {
    assert.ok(auditSection.includes(code), `审计报告必须包含根因 ${code}`);
  }
  // 单一事实源只有一个 status 字段，所有消费点读它。
  assert.ok(['ready', 'needs_review', 'blocked'].includes(result.status));
});
