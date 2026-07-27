import test from 'node:test'; import assert from 'node:assert/strict';
import { getDeliverablePolicy } from '../../packages/image-generation-runtime/src/deliverables/index.js';
test('interior policy requires spatial depth and bans VI material collections', () => { const p = getDeliverablePolicy('interior_scene'); assert.equal(p.requiresSpatialDepth, true); assert.ok(p.requiredPromptConcepts.includes('墙面')); assert.ok(p.forbiddenPromptConcepts.includes('VI 物料平铺')); });
test('VI application deliberately permits material displays', () => { const p = getDeliverablePolicy('vi_application'); assert.equal(p.allowsMockupCollection, true); });
