import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {classify, auditConflicts, validateClaim, validateKnowledge, compareDirections} from '../../offline/restaurant-knowledge/index.js';

const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
const dictionary = read('../../offline/restaurant-knowledge/rks-tag-dictionary.json');
const archetypes = read('../../offline/restaurant-knowledge/rks-archetypes.json');
const cases = read('./cases.json');
const cards = read('../../reports/restaurant-knowledge/rks-candidate-knowledge.json');
const run = input => classify(input, dictionary, archetypes);
const clone = value => structuredClone(value);

for (const [index, fixture] of cases.entries()) test(`six-case counterexample: ${fixture.label}`, () => {
  const before = clone(fixture);
  const result = run(fixture);
  const conflicts = auditConflicts(result, fixture.audit);
  assert.deepEqual(fixture, before);
  assert.equal(result.primaryArchetype, [archetypes[0].id, archetypes[1].id, archetypes[3].id, null, archetypes[2].id, null][index]);
  assert.deepEqual(conflicts.map(c => c.code).sort(), index === 0 ? ['RKS-CF-001', 'RKS-CF-002', 'RKS-CF-006'] : []);
  assert.equal(result.tags.some(t => t.dimension === 'material'), false);
  if (index === 0) assert(result.auxiliaryMechanisms.includes('efficient_service'));
  if (index === 5) { assert.equal(result.status, 'unknown'); assert.equal(result.missingDimensions.length, 11); }
  if (index === 3 || index === 4) assert(result.tags.some(t => t.tag === 'retro'));
});

test('order, synonyms, provenance and project-name independence', () => {
  const f = clone(cases[0]);
  assert.deepEqual(run(f), run({...f, claims: [...f.claims].reverse()}));
  f.claims[3].tag = 'efficient-service'; assert.deepEqual(run(f), run(cases[0]));
  const renamed = {...f, projectId: 'unrelated-name', claims: f.claims.map(c => ({...c, projectId: 'unrelated-name', appliesTo: ['unrelated-name']}))};
  assert.deepEqual(auditConflicts(run(renamed), f.audit), auditConflicts(run(f), f.audit));
  const pair = auditConflicts(run(f), f.audit).find(c => c.code === 'RKS-CF-002');
  assert.deepEqual(pair.claimIds, ['c5', 'c6']); assert.equal(pair.evidenceRefs.length, 2); assert.equal(pair.priority, 'P0');
  // Goal and proposal both survive diagnostics; no silent state update.
  assert.equal(run(f).tags.find(c => c.id === 'c5').status, 'confirmed');
  assert.equal(run(f).tags.find(c => c.id === 'c6').status, 'probable');
});

test('all six conflict codes with paired evidence and no efficiency-only false positive', () => {
  const f = clone(cases[0]);
  f.claims[2].assertion = 'fact';
  f.claims.push({...f.claims[6], id: 'material', dimension: 'material', tag: 'red_brick'});
  const audit = {...f.audit, inferences: [...f.audit.inferences, {from: 'c7', to: 'material'}],
    applications: [{knowledge: cards[2], targetProjectId: f.projectId}]};
  const findings = auditConflicts(run(f), audit);
  assert.deepEqual(findings.map(f => f.code).sort(), ['001','002','003','004','005','006'].map(n => 'RKS-CF-'+n));
  assert(findings.every(f => f.evidenceRefs.length));
  const modern = run(cases[1]);
  assert.deepEqual(auditConflicts(modern, {inferences: [{from: 'c2', to: 'c3'}]}), []);
  assert.deepEqual(auditConflicts(run(cases[0])), []); // no invented causal edge from co-occurrence
});

test('unknown tags, conflicting facts and competing archetypes stay unresolved', () => {
  const f = clone(cases[0]); f.claims[0].tag = 'unverified-brand-format';
  assert.equal(run(f).primaryArchetype, null);
  assert.equal(run(f).tags[0].status, 'unknown');
  const fact = {...f.claims[1], id: 'fact', tag: 'mall', assertion: 'fact', sourceType: 'source_fact'};
  f.claims.push(fact);
  assert.equal(auditConflicts(run(f), {incompatibilities: [['fact', 'c1'] ]})[0].priority, 'P2');
  assert.equal(run(f).tags.find(c => c.id === 'fact').tag, 'mall');
  const competing = clone(cases[0]); competing.claims.push({...competing.claims[0], id: 'other-format', tag: 'standardized_fast_casual'});
  assert.equal(run(competing).status, 'conflict'); assert.equal(run(competing).primaryArchetype, null);
});

test('invalid ownership and fake authority fail closed', () => {
  for (const edit of [c => c.projectId = 'other', c => c.appliesTo = ['other'], c => c.evidenceRefs = [],
    c => c.sourceType = 'invented', c => c.status = 'invented', c => c.scope = 'industry', c => c.assertion = 'invented']) {
    const f = clone(cases[0]); edit(f.claims[0]); assert.throws(() => run(f), /RKS_INVALID/);
  }
  const fake = {...cases[0].claims[6], status: 'confirmed'};
  assert.throws(() => validateClaim(fake), /self-confirm/);
  assert.throws(() => run({...cases[0], claims: [cases[0].claims[0], cases[0].claims[0]]}), /duplicate/);
  assert.throws(() => auditConflicts(run(cases[0]), {inferences: [{from: 'missing', to: 'c1'}]}), /unknown claim/);
});

test('candidate cards cannot be mistaken for promoted cross-project knowledge', () => {
  cards.forEach(validateKnowledge);
  assert(cards.every(c => ['candidate', 'project_observation'].includes(c.status)));
  assert(cards.every(c => c.validatedCases.length === 0));
  assert.throws(() => validateKnowledge({...cards[0], status: 'validated'}), /human evidence/);
  const own = {...cases[0], projectId: 'feng-tang-tang', claims: []};
  assert.deepEqual(auditConflicts(run(own), {applications: [{knowledge: cards[2], targetProjectId: own.projectId}]}), []);
  assert.throws(() => validateKnowledge({...cards[0], exceptions: []}), /exceptions/);
});

test('direction comparison is read-only, controlled and explicitly unconfirmed', () => {
  const baseline = read('../../reports/restaurant-knowledge/ftt-direction-baseline.json');
  const proposal = read('../../reports/restaurant-knowledge/ftt-direction-proposal.json');
  const before = clone({baseline, proposal});
  assert.equal(compareDirections(baseline, proposal).length, 5);
  assert.deepEqual({baseline, proposal}, before);
  assert.deepEqual(proposal.controls.referenceAssetIds, []);
  assert.equal(proposal.controls.shot, null);
  assert(proposal.changes.every(c => c.originalSource && c.evidenceRefs.length && c.futureValidation));
  assert.throws(() => compareDirections(baseline, {...proposal, status: 'confirmed'}), /offline/);
  assert.throws(() => compareDirections(baseline, {...proposal, controls: {...proposal.controls, shot: 'changed'}}), /controls/);
  assert.throws(() => compareDirections(baseline, {...proposal, projectId: 'other'}), /PROJECT_MISMATCH/);
});

test('prototype has no transport, production imports, brand rules or mutable global store', () => {
  const source = fs.readFileSync(new URL('../../offline/restaurant-knowledge/index.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\bimport\b|\bfetch\s*\(|node:|https?:|feng-tang-tang|冯烫烫/);
  const before = clone(cases[0]); run(cases[1]); run(cases[0]); assert.deepEqual(cases[0], before);
});
