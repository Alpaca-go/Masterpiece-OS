// Tests: space color-geometry guard (R8.5.1 §13)
//
// A color term that drives a geometry action must not become an
// architecture mechanism. The phrase "purple feather membrane descends and
// forms ceiling structure" must be flagged and stripped.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyPhrase,
  normalizeArchitectureSemantics,
  compileSpatialMechanisms,
  SEMANTIC_CLASS,
} from '@masterpiece/image-generation-runtime/generation/space-quality/index.js';

test('color+geometry coupling is flagged color_geometry', () => {
  const r = classifyPhrase('purple feather membrane descends and forms ceiling structure', 'signatureSpatialMechanism');
  assert.equal(r.classification, SEMANTIC_CLASS.COLOR_GEOMETRY);
});

test('color gradient as spatial mechanism is color_geometry', () => {
  const r = classifyPhrase('从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）', 'signatureSpatialMechanism');
  assert.equal(r.classification, SEMANTIC_CLASS.COLOR_GEOMETRY);
});

test('color-accent is NOT color_geometry', () => {
  const r = classifyPhrase('紫色点缀打破医疗空间的沉闷', 'brandRoleManifestation');
  // Has color + a metaphor-like structure but NO geometry action word;
  // also has a clear accent marker. Should route to color_accent.
  assert.equal(r.classification, SEMANTIC_CLASS.COLOR_ACCENT);
});

test('color-geometry normalizer strips the color chain', () => {
  const r = normalizeArchitectureSemantics('从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）', 'signatureSpatialMechanism');
  assert.ok(r.normalized);
  assert.ok(!/浅紫|深紫|白|紫/.test(r.normalized), 'color chain must be removed');
});

test('compiled IR: colorGeometryCouplingRisk is set on JZMX-like packets', () => {
  const packet = {
    schemaVersion: '1.0',
    mediaTranslations: {
      spatial: {
        status: 'ready',
        spatialConcept: '层叠半透明介质从天花垂落',
        structureLanguage: ['连续曲面', '无硬收边'],
        signatureSpatialMechanism: [
          '流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感',
          '中心放射状的灯光或吊顶设计，呼应辅助图形',
          '从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）',
        ],
        functionalNetwork: ['入口→接待', '接待→等候', '等候→咨询', '咨询→治疗'],
        sceneProgram: ['迎宾', '咨询', '治疗'],
        brandRoleManifestation: ['空间作为艺术画廊'],
        mustBeVisible: ['抽象羽毛纹理的墙面或屏风'],
      },
    },
    projectFacts: {
      brandName: { value: '九州美学' },
      industry: { value: '医疗美容' },
      brandRole: { value: '提供兼具科学严谨与艺术美学的精细化医美服务' },
    },
    creativeDecision: {
      targetWorldview: ['美是科学与艺术的结晶'],
      uniqueUpgradeThesis: '用层叠曲面表达克制与优雅。',
    },
    colorSystem: {
      primary: [{ name: 'Peacock Violet', role: '视觉焦点' }],
      secondary: [{ name: 'Light Purple' }, { name: 'White' }],
      accent: [{ name: 'Gold' }],
      forbidden: ['高饱和度荧光色'],
    },
  };
  const ir = compileSpatialMechanisms(packet);
  assert.equal(ir.colorGeometryCouplingRisk, true, 'must flag the JZMX-style packet');

  // Architecture side: NO motif literal may enter (the JZMX case was the
  // exact failure mode).
  for (const m of ir.architectureSemantics) {
    assert.ok(!/feather|plume|peacock|羽|翎|孔雀|花瓣|莲/.test(m.text),
      `architecture mechanism must not contain motif literal: "${m.text}"`);
  }
  // Brand side: at least one motif item captured.
  assert.ok(ir.brandMotifSemantics.length >= 1, 'motif should be captured in brand stream');
});
