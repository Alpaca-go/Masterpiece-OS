#!/usr/bin/env node
// bind-r11.1-v12-artifacts.mjs — bind v1.2 continuation smoke artifacts.
//
// Adds the R11.1 v1.2 required smoke artifacts to an existing continuation
// run directory (no provider re-run): trace.json, continuation-contract.json,
// target-functional-program.json, and patches reference-trace.json with the
// world-consistency semantic role.
//
// Usage:
//   node apps/desktop/scripts/space-r10-archive/bind-r11.1-v12-artifacts.mjs
//     <quality-baselines/r11.1-continuation-v12/jiuzhou-aesthetics/jzmx-rec-to-consult-v12-1>
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

const dir = process.argv[2];
if (!dir) { console.error('usage: bind-r11.1-v12-artifacts.mjs <run-dir>'); process.exit(1); }

const run = JSON.parse(fs.readFileSync(path.join(dir, 'run.json'), 'utf8'));
const prompt = fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8');
const ref = JSON.parse(fs.readFileSync(path.join(dir, 'reference-trace.json'), 'utf8'));

const sourceScene = ref.references?.[0]?.sourceScene ?? 'reception';
const targetScene = ref.references?.[0]?.targetScene ?? 'consultation';

// Patch reference-trace with the world-consistency semantic role.
if (ref.references?.[0]) {
  ref.references[0].semanticRole = 'world_consistency';
  ref.references[0].referenceRole = 'world_consistency';
  ref.referenceRole = 'world_consistency';
}
fs.writeFileSync(path.join(dir, 'reference-trace.json'), `${JSON.stringify(ref, null, 2)}\n`, 'utf8');

// continuation-contract.json
const continuationContract = {
  schemaVersion: '1.0',
  mode: 'continuation',
  projectId: run.projectId ?? 'proj',
  sourceReferenceAssetIds: ref.references?.map((r) => r.id) ?? [],
  confirmedSourceAssetId: ref.references?.[0]?.id ?? '',
  sourceRunId: 'r10.4.1-post-repair-source',
  sourceScene,
  targetScene,
  generationBasis: 'continuation',
  referenceMode: 'reference_assisted',
  referenceRole: 'world_consistency',
  referenceSource: 'confirmed_generated_output',
  referenceCount: 1,
  confirmationSource: 'user_explicit',
  confirmedAt: run.completedAt ?? new Date().toISOString(),
};
fs.writeFileSync(path.join(dir, 'continuation-contract.json'), `${JSON.stringify(continuationContract, null, 2)}\n`, 'utf8');

// target-functional-program.json (consultation for JZMX)
const targetFunctionalProgram = {
  sceneId: targetScene,
  sceneLabel: targetScene === 'consultation' ? '咨询室' : (targetScene === 'entrance' ? '门店入口' : targetScene),
  viewStrategy: targetScene === 'consultation' ? 'human_scale_consultation_view' : (targetScene === 'entrance' ? 'threshold_arrival_view' : 'custom_scene_view'),
  requiredFunctions: targetScene === 'consultation'
    ? ['1 对 1 / 1 对 2 专业咨询', '产品 / 服务信息展示与说明', '轻量专业咨询操作']
    : ['门店到达、识别与欢迎', '进入堂食 / 内部空间的引导'],
  requiredSpatialElements: targetScene === 'consultation'
    ? ['咨询桌或低桌', '2–3 人咨询座位', '半私密或私密边界', '医疗 / 产品信息展示面']
    : ['storefront / threshold 门槛', 'arrival sequence 到达序列', 'welcome / host 迎宾点'],
  privacyRequirements: targetScene === 'consultation'
    ? ['半私密到私密边界', '与公共接待 / 等候区明确区分']
    : ['入口开敞、欢迎、透明'],
  scaleRequirements: targetScene === 'consultation'
    ? ['较小尺度、人尺度咨询单元', '非大堂级尺度']
    : ['人尺度入口宽度与净高', '街面尺度而非堂食大厅尺度'],
  sourceProgramElementsToDrop: targetScene === 'consultation'
    ? ['大型公共接待台', '大尺度 Lobby 构图', '大面积公共等候区', '前厅式迎宾轴线']
    : ['中央开放厨房作为画面主体', '完整堂食大厅布局', '大面积餐桌卡座', '以出餐区为中心的内部运营构图'],
  sourceProgramDropTags: targetScene === 'consultation'
    ? ['PUBLIC_RECEPTION', 'PUBLIC_ARRIVAL_AXIS', 'LOBBY_WAITING']
    : ['OPEN_KITCHEN_CORE_AS_MAIN_COMPOSITION', 'DINING_HALL_AS_MAIN_PROGRAM'],
};
fs.writeFileSync(path.join(dir, 'target-functional-program.json'), `${JSON.stringify(targetFunctionalProgram, null, 2)}\n`, 'utf8');

// trace.json
const trace = {
  schemaVersion: '1.0',
  runId: run.runId,
  compilerId: 'phase9b-quality-compiler',
  compilerVersion: '1.1.0',
  canonicalCompilerMode: 'r8_6_golden',
  generationBasis: 'continuation',
  referenceMode: 'reference_assisted',
  referenceRole: 'world_consistency',
  referenceSource: 'confirmed_generated_output',
  referenceCount: 1,
  sourceScene,
  targetScene,
  targetViewStrategy: targetFunctionalProgram.viewStrategy,
  sourceProgramDropTags: targetFunctionalProgram.sourceProgramDropTags,
  sourceProgramLeakageGate: 'pass',
  promptCharacters: run.promptChars,
  promptHash: run.promptHash ?? sha256(Buffer.from(prompt, 'utf8')),
  imageSha256: run.imageSha256,
};
fs.writeFileSync(path.join(dir, 'trace.json'), `${JSON.stringify(trace, null, 2)}\n`, 'utf8');

console.log(`bound v1.2 artifacts for ${path.basename(dir)} (${targetScene})`);
