// §16 / §10 Structure Policy：未确认结构不得标记为 confirmed；无确认时解析为 open_for_redesign。
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStructurePolicy,
  REFERENCE_FIRST_VALIDATORS,
  VALIDATOR_IDS
} from '../src/main/reference-first/index.ts';
import type { AssetAuthenticityDecision, ReadinessValidationIssue } from '../src/shared/types.ts';
import type { GenerationValidationContext } from '../src/main/reference-first/validators/validator-registry.ts';
import { buildValidContext } from './reference-first-fixtures.ts';

const structurePolicyValidator = REFERENCE_FIRST_VALIDATORS.find(
  (v) => v.id === VALIDATOR_IDS.STRUCTURE_POLICY
)!;

test('resolves unverified structure as open_for_redesign', () => {
  const policy = buildStructurePolicy([], undefined, []);
  assert.equal(policy.status, 'open_for_redesign', '无确认结构必须解析为 open_for_redesign');
  assert.equal(policy.redesignAllowed, true);
  // 含未确认样机资产（非 brand_original / user_confirmed_real / user_confirmed_locked）也不得声明 confirmed。
  const unverified: AssetAuthenticityDecision[] = [
    { assetId: 'mock-1', authenticity: 'stock_mockup', canProveStructure: false } as unknown as AssetAuthenticityDecision
  ];
  const policy2 = buildStructurePolicy(unverified, undefined, []);
  assert.notEqual(policy2.status, 'user_confirmed', '未确认样机资产不得标记为 confirmed');
});

test('blocks when unverified structure is marked confirmed', () => {
  const ctx = buildValidContext() as unknown as Record<string, unknown>;
  const badPolicy = { status: 'user_confirmed' as const, confirmedAssetIds: ['bad-1'] };
  ctx.structurePolicy = badPolicy;
  ctx.identityPack = {
    assets: [{ assetId: 'a1' }],
    structurePolicy: badPolicy
  };
  ctx.authenticityDecisions = [
    { assetId: 'bad-1', authenticity: 'stock_mockup', canProveStructure: true } as unknown as AssetAuthenticityDecision
  ];
  const outcome = structurePolicyValidator.validate(ctx as unknown as GenerationValidationContext);
  assert.ok(
    outcome.issues.some((issue: ReadinessValidationIssue) => issue.code.startsWith('UNVERIFIED_STRUCTURE_MARKED_CONFIRMED') && issue.severity === 'blocking'),
    '未确认结构标记为 confirmed 必须阻断'
  );
});

test('structure policy validator is registered in the production registry', () => {
  const ids = VALIDATOR_IDS;
  assert.equal(ids.STRUCTURE_POLICY, 'structure-policy');
});
