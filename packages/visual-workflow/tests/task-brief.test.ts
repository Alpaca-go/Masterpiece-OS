import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildTaskBrief } from '../src/runtime/task-brief.js';
import { createVisualWorkflow } from '../src/service.js';

function packet() {
  return {
    mediaTranslations: {
      spatial: {
        spatialConcept: 'IP 驱动的年轻化餐饮空间',
        structureLanguage: '入口装置作为空间锚点；点餐台为功能中心',
        mustBeVisible: ['入口区域立体造型装置', '点餐区上方菜单展示屏'],
        materialLanguage: [
          { material: '哑光金属漆', brandRole: '主要墙面基底' },
          { material: '亚克力发光字', brandRole: '品牌标志载体' },
        ],
        lightingLanguage: { source: ['环境光提供基础照明', '重点照明突出 IP 装置'], contrast: '高对比重点照明与柔和环境光结合', interactionWithMaterials: '光打在哑光漆上形成柔和的反射' },
        colorBehavior: {
          primary: [{ name: '紫色 #4116B7', role: '空间基调色' }],
          secondary: [{ name: '绿色', role: '明档与导视' }],
          accent: [{ name: '橙色', role: '局部点缀' }],
        },
      },
    },
  };
}

test('the brief restates the analysis decisions in a usable order', () => {
  const brief = buildTaskBrief(packet());
  assert.ok(brief.startsWith('IP 驱动的年轻化餐饮空间'));
  assert.match(brief, /必见：入口区域立体造型装置；点餐区上方菜单展示屏/u);
  assert.match(brief, /材料：哑光金属漆（主要墙面基底）；亚克力发光字（品牌标志载体）/u);
  assert.match(brief, /灯光：/u);
  assert.match(brief, /色彩：紫色 #4116B7（空间基调色）；绿色（明档与导视）；橙色（局部点缀）/u);
  assert.match(brief, /结构：入口装置作为空间锚点/u);
  assert.match(brief, /不要照抄具体品牌符号/u);
  assert.ok(!brief.includes('生成符合项目气质的空间效果图'), 'must not be the placeholder');
});

test('post-composite mode drops brand-text must-see items and says so', () => {
  const source = packet();
  source.mediaTranslations.spatial.mustBeVisible = ['入口门头：高亮度发光招牌及品牌名称标识', '点餐区上方菜单展示屏'];
  source.mediaTranslations.spatial.structureLanguage = '入口门头：横向招牌+品牌标志发光字；空间骨架：中性色为主框架；视觉焦点：入口形象墙';
  const brief = buildTaskBrief(source, { logoUsageMode: 'post_composite' });
  assert.ok(!brief.includes('品牌名称标识'), 'brand text must not be requested in-scene');
  assert.match(brief, /必见：点餐区上方菜单展示屏/u);
  assert.ok(!brief.includes('品牌标志发光字'), 'signage lettering must be filtered from the structure line too');
  assert.match(brief, /结构：空间骨架：中性色为主框架；视觉焦点：入口形象墙/u);
  assert.match(brief, /品牌文字与 Logo 不画在图内/u);
  const inImage = buildTaskBrief(source, { logoUsageMode: 'in_image' });
  assert.match(inImage, /品牌名称标识/u);
  assert.ok(!inImage.includes('品牌文字与 Logo 不画在图内'));
});

test('a packet without a spatial proposal is rejected instead of returning filler', () => {
  assert.throws(() => buildTaskBrief({ mediaTranslations: {} }), /没有空间提案/u);
  assert.throws(() => buildTaskBrief(null), /没有空间提案/u);
});

test('the task-brief operation refuses a project that has no analysis', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'task-brief-'));
  try {
    const workflow = createVisualWorkflow({ root, emit: () => {} });
    const project = await workflow.operations['visual-workflow:create-project']({}, { projectName: '蛙耶', brandName: '蛙耶', industry: '餐饮' });
    await assert.rejects(() => workflow.operations['visual-workflow:task-brief']({}, project.id), /尚未完成分析/u);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
