// Tests: space mechanism provenance (R8.5.1 §4)
//
// Every spatial mechanism in the architecture prompt must carry a
// provenance record (id, sourceField, sourcePath, sourceRawText,
// classification, compiledAction, includedInArchitecturePrompt).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  traceMechanism,
  auditMechanismSources,
  MECHANISM_PROVENANCE_VERSION,
} from '@masterpiece/image-generation-runtime/generation/space-quality/index.js';

test('traceMechanism: basic fields populated', () => {
  const r = traceMechanism({
    raw: 'feather-like layered translucent boundary',
    sourceField: 'signatureSpatialMechanism',
    sourcePath: 'mediaTranslations.spatial.signatureSpatialMechanism[0]',
  });
  assert.equal(typeof r.id, 'string');
  assert.equal(r.sourceField, 'signatureSpatialMechanism');
  assert.equal(r.sourcePath, 'mediaTranslations.spatial.signatureSpatialMechanism[0]');
  assert.equal(r.sourceRawText, 'feather-like layered translucent boundary');
  assert.equal(typeof r.classification, 'string');
  assert.equal(typeof r.includedInArchitecturePrompt, 'boolean');
  assert.ok(Array.isArray(r.motifHits));
  assert.ok(Array.isArray(r.colorHits));
  assert.ok(Array.isArray(r.strip));
});

test('traceMechanism: id counter is sequential', () => {
  const r1 = traceMechanism({ raw: 'layered translucent boundary', sourceField: 'x', sourcePath: 'x' });
  const r2 = traceMechanism({ raw: 'continuous curved ceiling', sourceField: 'x', sourcePath: 'x' });
  assert.notEqual(r1.id, r2.id);
});

test('auditMechanismSources: summary is correct for a JZMX-style packet', () => {
  const packet = {
    schemaVersion: '1.0',
    mediaTranslations: {
      spatial: {
        status: 'ready',
        signatureSpatialMechanism: [
          '流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感',
          '中心放射状的灯光或吊顶设计，呼应辅助图形',
          '从入口到诊疗室的渐变色彩过渡（白->浅紫->深紫）',
        ],
        structureLanguage: ['连续曲面', '无硬收边'],
        functionalNetwork: ['入口→接待', '接待→等候', '等候→咨询', '咨询→治疗'],
        sceneProgram: ['迎宾', '咨询'],
        mustBeVisible: ['抽象羽毛纹理的墙面或屏风'],
        brandRoleManifestation: ['空间作为艺术画廊'],
        brandIntegration: ['入口处大型发光Logo'],
        spatialConcept: '翎羽之境 (Realm of Feathers) - 沉浸式美学空间',
      },
    },
    projectFacts: {
      brandName: { value: '九州美学' },
      industry: { value: '医疗美容' },
    },
    creativeDecision: {
      targetWorldview: ['美是科学与艺术的结晶'],
      uniqueUpgradeThesis: '长 brand 论述 含 孔雀 羽毛 紫 ...',
    },
    colorSystem: { primary: [{ name: 'Peacock Violet' }] },
  };
  const audit = auditMechanismSources(packet);
  assert.ok(audit.summary.total > 10, 'records should be populated');
  assert.equal(audit.summary.colorGeometryRisk, 1, 'one color-geometry item expected');
  assert.ok(audit.summary.motifCount >= 3, 'at least 3 motif-bearing items expected');
  assert.ok(audit.summary.decorativeIdentityCount >= 1, 'logo expected');
  // Every record has the required fields.
  for (const r of audit.records) {
    assert.equal(typeof r.id, 'string');
    assert.equal(typeof r.sourceField, 'string');
    assert.equal(typeof r.sourcePath, 'string');
    assert.equal(typeof r.sourceRawText, 'string');
    assert.equal(typeof r.classification, 'string');
    assert.equal(typeof r.includedInArchitecturePrompt, 'boolean');
  }
});

test('MECHANISM_PROVENANCE_VERSION is a non-empty semver string', () => {
  assert.match(MECHANISM_PROVENANCE_VERSION, /^\d+\.\d+\.\d+$/);
});
