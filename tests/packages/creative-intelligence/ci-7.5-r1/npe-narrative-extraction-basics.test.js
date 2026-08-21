/**
 * CI-W1C.7.5-R1 — Narrative Planning Extraction Basics (NPE subset).
 *
 * Per spec PART L §47:
 *   NPE-08 structured key:value still uses fast path
 *   NPE-10 no project-specific extraction rules
 *
 * The model-required NPE-01..07 + NPE-09 tests need a live
 * model call. They will run as part of the G01 Attempt 2 live
 * re-qualification (PART M) — the G01 case IS the test of
 * the narrative extraction against a real human-authored
 * document. The CI-W1C.7.5 G01 Attempt 1 evidence preserved
 * under `docs/creative-intelligence/ci-w1c.7.5/` documents
 * the pre-R1 baseline (0 claims from regex-only). The R1
 * narrative path is the fix.
 *
 * This file covers:
 *   - NPE-08: structured fast path still works for `key: value`
 *     input (R2 PTR-01..10 + R2.1 LPG-01..10 + R1 SMP tests
 *     already cover this; the spec asks for a dedicated R1
 *     marker)
 *   - NPE-10: the narrative extraction prompt + projection
 *     have no project-specific literals (no 九州美学 / 医美 /
 *     九州通 / TCM / specific competitor names). The CI
 *     qualification script is OUT OF SCOPE — it carries
 *     project data for the live test, not production rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');

test('NPE-08: structured fast path extracts claims from key:value text (hybrid coverage sufficient)', async () => {
  // Verify the regex extractor still produces claims for
  // `key: value` style briefs. The existing EXTRACT_PATTERNS in
  // build-planning-strategic-evidence.ts match Chinese keys
  // (e.g. 行业, 品牌定位, 业务模式, 目标客群, 品牌承诺, etc.).
  const { buildPlanningStrategicEvidenceArtifact } = await import(
    pathToFileURL(path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')).href
  );
  // Synthetic structured brief: 8 key:value claims across 5+
  // semantic types. Uses project-agnostic Chinese values.
  // Excluded from NPE-10 because project-agnostic
  // (no real project names / industry terms).
  const structuredText = `行业: 有机生鲜订阅
品牌角色: 订阅型供应链运营方
业务模式: 会员制周配 + 产地直采
目标客群: 中产家庭
品牌承诺: 24 小时直达
差异化逻辑: 可被审计的生鲜
战略目标: 12 个月用户增长
品牌定位: 城市级有机生鲜品牌`;
  const { createHash } = await import('node:crypto');
  const contentHash = createHash('sha256')
    .update(structuredText.replace(/\r\n/g, '\n'))
    .digest('hex');
  const brief = {
    sourceId: 'planning-brief:npe-08:test',
    filename: 'npe-08.md',
    relativePath: 'planning-briefs/npe-08.md',
    contentHash,
    characterCount: structuredText.length,
    documentRole: 'brand-strategy',
    sourceRole: 'PLANNING_STRATEGIC_SOURCE',
    registeredAt: '2026-08-21T00:00:00.000Z'
  };
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'npe-08-'));
  await fs.promises.mkdir(path.join(tmpDir, 'planning-briefs'), { recursive: true });
  await fs.promises.writeFile(path.join(tmpDir, brief.relativePath), structuredText, 'utf8');
  try {
    const artifact = await buildPlanningStrategicEvidenceArtifact({
      projectId: 'npe-08',
      projectRoot: tmpDir,
      briefs: [brief]
    });
    const claimCount = artifact.claims.length;
    const semanticTypes = new Set(artifact.claims.map((c) => c.key));
    assert.ok(claimCount >= 5, `expected >= 5 claims, got ${claimCount}`);
    assert.ok(semanticTypes.size >= 3, `expected >= 3 distinct keys, got ${semanticTypes.size}`);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});

test('NPE-10: production code has no project-specific extraction literals', async () => {
  // Scan the new R1 production files for forbidden project-specific tokens.
  // The spec PART D §18 forbids hardcoding project names /
  // industry terms / specific competitor names into production
  // extraction rules. The CI qualification script is OUT OF
  // SCOPE — it carries project data for the live test, not
  // production rules.
  const forbidden = [
    '九州美学', '九州通', '医美', '医疗美容',
    '国药', '上药', '美械宝', '京东健康', '爱美客', '资生堂', '丸美', '修丽可',
    '罗兰贝格', '毕马威',
    '道法自然', '美在成久', '科学美学', '可信美学', '责任美学', '共情美学', '成长美学', '平台美学',
    '安迹'
  ];
  const filesToScan = [
    'packages/creative-intelligence/src/strategic-synthesis/document-context-to-planning-claims.ts',
    'packages/creative-intelligence/src/strategic-synthesis/planning-semantic-extraction.ts',
    'packages/creative-intelligence/src/strategic-synthesis/structured-extraction-coverage.ts',
    'packages/creative-intelligence/src/strategic-synthesis/build-planning-strategic-evidence.ts',
    'packages/creative-intelligence/src/strategic-synthesis/strategic-grounding-gate.ts',
    'packages/creative-intelligence/src/strategic-synthesis/parse-strategic-synthesis.ts',
    'packages/runtime-core/src/application/narrative-planning-extraction-runner.ts',
    'packages/runtime-core/src/application/planning-strategic-evidence-loader.ts',
    'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts',
    'packages/runtime-core/src/application/creative-reasoning-service.ts'
  ];
  const foundViolations = [];
  for (const rel of filesToScan) {
    const abs = path.join(repoRoot, rel);
    if (!fs.existsSync(abs)) continue;
    const content = fs.readFileSync(abs, 'utf8');
    for (const tok of forbidden) {
      if (content.includes(tok)) {
        foundViolations.push({ file: rel, token: tok });
      }
    }
  }
  assert.deepEqual(foundViolations, [],
    `production code contains project-specific literals: ${JSON.stringify(foundViolations)}`);
});
