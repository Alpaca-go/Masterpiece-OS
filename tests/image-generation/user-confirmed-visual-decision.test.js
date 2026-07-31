import assert from 'node:assert/strict';
import test from 'node:test';
import { applyUserConfirmedVisualDecision } from '@masterpiece/image-generation-runtime/vnext/index.js';
import { phase1Packet } from '../phase1-fixtures.js';

test('user-confirmed visual decision overlays only its own project packet', () => {
  const packet = phase1Packet();
  const confirmation = {
    schemaVersion: '1.0',
    id: 'confirmed-space-v1',
    projectId: packet.projectId,
    status: 'confirmed',
    sourceDocument: 'user-task.md',
    evidenceRefs: ['user_confirmation:space'],
    projectIdentity: { brandRole: '旗舰展示、咨询与系统服务平台' },
    creativeDecision: {
      upgradeFrom: ['旧的具象表达'],
      upgradeTo: ['连续服务关系'],
      uniqueUpgradeThesis: '从旧的具象表达升级为连续服务关系。',
      toneBoundaries: [{ target: '专业但不冰冷', avoid: ['通用前台'] }],
    },
    abstractions: [{
      sourceAsset: '旧资产',
      semanticMeaning: ['生长'],
      formalProperties: ['连续'],
      forbiddenLiteralUse: ['具象旧资产'],
      evidenceRefs: ['asset:old'],
    }],
    spatialTranslation: {
      spatialConcept: '以连续服务链组织空间',
      brandRoleManifestation: ['平台角色通过入口、展示、咨询与服务连接被看见'],
      signatureSpatialMechanism: ['连续半透明结构连接多个服务节点'],
      functionalNetwork: ['入口连接展示', '展示连接咨询', '咨询连接服务'],
      positiveDifferentiators: ['同一结构在多个节点发生可见变化'],
      mustBeVisible: ['单一画面可追踪连续结构与三个节点'],
      structureLanguage: ['入口连接展示、咨询与服务'],
      materialLanguage: [{ material: '矿物涂层', behavior: ['低反射'] }],
      lightingLanguage: { source: ['自然光'] },
      colorBehavior: { primary: [{ name: '暖白', role: '基础', ratio: 80 }] },
      functionalRelationships: ['入口连接展示', '咨询连接服务'],
      sceneProgram: ['入口', '展示接待', '咨询'],
    },
  };
  const result = applyUserConfirmedVisualDecision(packet, confirmation, packet.projectId);
  assert.equal(result.packet.projectFacts.brandRole.value, confirmation.projectIdentity.brandRole);
  assert.equal(result.packet.mediaTranslations.spatial.spatialConcept, confirmation.spatialTranslation.spatialConcept);
  assert.equal(result.packet.provenance.userConfirmationId, confirmation.id);
  assert.throws(
    () => applyUserConfirmedVisualDecision(packet, {
      ...confirmation,
      projectId: 'other-project',
    }, packet.projectId),
    /USER_CONFIRMED_VISUAL_DECISION_INVALID/u,
  );
});
