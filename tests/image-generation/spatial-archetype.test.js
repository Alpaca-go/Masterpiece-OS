import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertArchetypeHasNoProjectSignature,
  loadPremiumMedicalAestheticsArchetype,
  matchVerticalSpatialArchetype,
} from '@masterpiece/image-generation-runtime';

test('premium medical aesthetics archetype loads and contains only reusable semantics', () => {
  const archetype = loadPremiumMedicalAestheticsArchetype();
  assert.equal(archetype.id, 'premium-medical-aesthetics');
  assert.equal(archetype.antiClonePolicy.minimumDistinctDimensions, 3);
  assert.equal(archetype.paletteRelation.neutralBase, 'dominant');
  assert.doesNotMatch(JSON.stringify(archetype), /九州美学|Jointown|孔雀|九瓣|紫色水晶|虹彩羽瓣/iu);
});

test('static archetype guard rejects project-specific signatures', () => {
  assert.throws(() => assertArchetypeHasNoProjectSignature({
    id: 'bad-generic-archetype',
    motif: '孔雀羽瓣',
  }, ['九州美学', 'Jointown Aesthetics', '孔雀', '九瓣', '紫色水晶', '虹彩羽瓣']),
  (error) => error.code === 'ARCHETYPE_PROJECT_SIGNATURE_LEAK');
});

test('matcher activates from at least two independent premium medical signals', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'medical aesthetics',
    themes: ['female_aesthetics'],
    tone: ['mature', 'restrained', 'professional', 'warm hospitality'],
  });
  assert.equal(match.matched, true);
  assert.ok(match.confidence >= 0.72);
  assert.ok(match.signals.length >= 2);
});

test('matcher does not activate for an ordinary hospital', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'traditional_hospital',
    themes: ['female_health'],
    tone: ['professional'],
  });
  assert.equal(match.matched, false);
  assert.deepEqual(match.blockedBy, ['traditional_hospital']);
});

test('matcher does not turn a premium club into a medical reception by itself', () => {
  const match = matchVerticalSpatialArchetype({
    industry: 'private club hospitality',
    themes: ['private_club_hospitality'],
    tone: ['quiet', 'warm'],
  });
  assert.equal(match.matched, true);
  assert.equal(match.signals.includes('medical_or_wellbeing_industry'), false);
  assert.equal(match.archetype.medicalHospitalityBalance.medicalCredibility, 0.78);
});
