// 生图功能：Headless CLI 验收测试（§15.3）。
// 用真实 fixture + 子进程运行 scripts/image-generation/generate-image.ts --dry-run，
// 验证：生成 task.json / compiled-prompt.md / 正确阻断（anchor 未批准）/ 输出运行摘要。
// 全程离线，dry-run 不调用模型。
// 运行：node --test tests/image-generation/headless-cli.test.js

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const cliPath = path.join(repoRoot, 'scripts', 'image-generation', 'generate-image.ts');

const PROJECT_ID = '11111111-2222-3333-4444-555555555555';
const REF_RUN_ID = 'ref-run-headless-1';
const PROJECT_NAME = '冯烫烫';

function resolvedContext() {
  return {
    schemaVersion: '1.0',
    projectId: PROJECT_ID,
    generatedAt: '2026-01-01T00:00:00.000Z',
    identity: { projectName: PROJECT_NAME, brandName: PROJECT_NAME, industry: '餐饮' },
    lockedAssets: { logoLocked: true, logoAssetIds: ['logo-1'], lockedFacts: ['主色为暖橙'] },
    products: ['招牌烫菜'],
    services: ['堂食'],
    targetAudience: ['年轻上班族'],
    pricePositioning: '中端',
    businessModel: '连锁',
    brandPersonality: ['热闹'],
    visualPreferences: ['可调整版式'],
    currentVisualSystem: {
      existingVisualAssets: [],
      primaryColors: ['#E8622D'],
      supportingColors: [],
      graphicAssets: [],
      typographySignals: [],
      materialSignals: [],
      photographySignals: [],
    },
    packaging: { structures: [], status: 'unknown', evidenceSources: [] },
    businessTouchpoints: { packaging: ['外卖盒'], viApplications: [], spatial: [], digital: [] },
    prohibitedDirections: ['禁止冷淡性冷淡风'],
    uncertainties: [],
    conflicts: [],
    sourceVersions: { resolverVersion: '1.0' },
  };
}

function capsule() {
  return {
    schemaVersion: '1.0',
    sourceRunId: REF_RUN_ID,
    currentProjectId: PROJECT_ID,
    generatedAt: '2026-01-01T00:00:00.000Z',
    currentProject: {
      brandName: PROJECT_NAME,
      industry: '餐饮',
      logoLocked: true,
      logoAssetIds: ['logo-1'],
      lockedFacts: ['主色为暖橙'],
      coreProducts: ['招牌烫菜'],
      businessTouchpoints: ['外卖盒'],
    },
    projectFacts: {
      coreProducts: ['招牌烫菜'],
      services: ['堂食'],
      touchpoints: { packaging: ['外卖盒'], viApplications: [], serviceMaterials: [], spatial: [], digital: [] },
      designAdvice: [],
      uncertainties: [],
    },
    inheritedStyle: {
      color: ['暖橙主色 + 米白背景'],
      layoutAndTypography: ['大标题 + 网格'],
      graphicLanguage: ['手绘食材图形'],
      materialAndPhotography: ['哑光纸质感'],
      extensionMechanism: ['图形可平铺'],
    },
    userPreference: '希望更有烟火气',
    userAvoidance: ['避免高冷极简'],
    prohibitedReferenceIdentity: {
      brandNames: ['某参考品牌X'],
      logos: ['参考品牌X的圆形logo'],
      slogans: ['参考品牌X的slogan'],
      signatureGraphics: ['参考品牌X的波浪纹'],
      proprietaryPatterns: [],
    },
    anchorGoal: '确立冯烫烫的暖橙烟火气主视觉',
    aspectRatio: '16:9',
    humanNotes: [],
    uncertainties: [],
  };
}

async function buildFixture(dataPath, { decision, status }) {
  const projectDir = path.join(dataPath, 'projects', `${PROJECT_NAME}-${PROJECT_ID.slice(0, 8)}`);
  await fs.mkdir(path.join(projectDir, 'outputs'), { recursive: true });
  await fs.mkdir(path.join(projectDir, 'input'), { recursive: true });
  const logoBuf = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#E8622D' } })
    .png().toBuffer();
  await fs.writeFile(path.join(projectDir, 'input', 'logo.png'), logoBuf);
  await fs.writeFile(
    path.join(projectDir, 'project.json'),
    JSON.stringify({
      id: PROJECT_ID,
      projectName: PROJECT_NAME,
      detectedProjectName: PROJECT_NAME,
      logoLocked: true,
      outputLanguage: 'zh-CN',
      assets: [{ id: 'logo-1', role: 'logo', status: 'ready', relativePath: path.join('input', 'logo.png') }],
    }, null, 2),
  );
  await fs.writeFile(
    path.join(projectDir, 'outputs', 'resolved-project-context.json'),
    JSON.stringify(resolvedContext(), null, 2),
  );

  const refDir = path.join(dataPath, 'reference-runs', REF_RUN_ID);
  await fs.mkdir(path.join(refDir, 'outputs'), { recursive: true });
  await fs.mkdir(path.join(refDir, 'runtime'), { recursive: true });
  await fs.mkdir(path.join(refDir, 'input', 'reference-assets'), { recursive: true });
  await fs.writeFile(
    path.join(refDir, 'outputs', 'reference-style-capsule.json'),
    JSON.stringify(capsule(), null, 2),
  );
  await fs.writeFile(
    path.join(refDir, 'runtime', 'run.json'),
    JSON.stringify({ runId: REF_RUN_ID, decision, status }, null, 2),
  );
  await fs.writeFile(
    path.join(refDir, 'outputs', 'Anchor-Generation-Brief.md'),
    '# Anchor Generation Brief\n\n暖橙烟火气主视觉方向。\n',
  );
  const refBuf = await sharp({ create: { width: 128, height: 72, channels: 3, background: '#F5E9D6' } })
    .png().toBuffer();
  await fs.writeFile(path.join(refDir, 'input', 'reference-assets', 'ref1.png'), refBuf);

  return { projectDir, refDir };
}

function runCli(args, dataPath) {
  const result = spawnSync(process.execPath, [cliPath, ...args, '--data-path', dataPath], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  return { code: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function findRunDir(projectDir) {
  const igRoot = path.join(projectDir, 'image-generation');
  const entries = fsSync.readdirSync(igRoot, { withFileTypes: true }).filter((e) => e.isDirectory());
  assert.equal(entries.length >= 1, true, '应至少生成一个运行目录');
  return path.join(igRoot, entries[0].name);
}

test('dry-run 生成 task.json / compiled-prompt.md 并输出摘要（anchor 已批准 → 未阻断）', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-headless-ok-'));
  const { projectDir } = await buildFixture(dataPath, { decision: 'approved', status: 'completed' });

  const { code, stdout } = runCli(
    ['--project', PROJECT_NAME, '--reference-run', REF_RUN_ID, '--output', 'master_anchor_image', '--dry-run'],
    dataPath,
  );

  assert.equal(code, 0, `CLI 应成功退出，实际 stdout=\n${stdout}`);
  assert.match(stdout, /运行摘要/);
  assert.match(stdout, /status\s*:\s*ready/);

  const runDir = findRunDir(projectDir);
  assert.equal(fsSync.existsSync(path.join(runDir, 'task.json')), true, '应生成 task.json');
  assert.equal(fsSync.existsSync(path.join(runDir, 'compiled-prompt.md')), true, '应生成 compiled-prompt.md');
  assert.equal(fsSync.existsSync(path.join(runDir, 'prompt-source-map.json')), true, '应生成 prompt-source-map.json');

  const task = JSON.parse(fsSync.readFileSync(path.join(runDir, 'task.json'), 'utf8'));
  assert.equal(task.projectId, PROJECT_ID);
  const prompt = fsSync.readFileSync(path.join(runDir, 'compiled-prompt.md'), 'utf8');
  assert.equal(prompt.length > 0, true, 'compiled-prompt.md 不应为空');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('anchor 未批准 → 三层 Gate 阻断，不提交，退出码非零', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-headless-block-'));
  const { projectDir } = await buildFixture(dataPath, { decision: 'pending', status: 'awaiting_review' });

  const { code, stdout } = runCli(
    ['--project', PROJECT_NAME, '--reference-run', REF_RUN_ID, '--dry-run'],
    dataPath,
  );

  assert.equal(code, 2, `阻断时退出码应为 2，实际 stdout=\n${stdout}`);
  assert.match(stdout, /status\s*:\s*blocked/);
  assert.match(stdout, /gate\.blocked\s*:\s*true/);

  // 阻断时仍应落盘 task.json（用于排查），但不得有 images
  const runDir = findRunDir(projectDir);
  assert.equal(fsSync.existsSync(path.join(runDir, 'task.json')), true);
  assert.equal(fsSync.existsSync(path.join(runDir, 'images')), true);
  const imgs = fsSync.readdirSync(path.join(runDir, 'images'));
  assert.equal(imgs.length, 0, '阻断时不应产出图片');

  await fs.rm(dataPath, { recursive: true, force: true });
});

test('未知项目名 → 友好报错，退出码 1', async () => {
  const dataPath = await fs.mkdtemp(path.join(os.tmpdir(), 'ig-headless-noproj-'));
  await fs.mkdir(path.join(dataPath, 'projects'), { recursive: true });

  const { code, stderr } = runCli(
    ['--project', '不存在的项目', '--reference-run', REF_RUN_ID, '--dry-run'],
    dataPath,
  );

  assert.equal(code, 1);
  assert.match(stderr, /未找到名为/);

  await fs.rm(dataPath, { recursive: true, force: true });
});
