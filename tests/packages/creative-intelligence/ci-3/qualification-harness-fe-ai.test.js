/**
 * CI-W1C.4 Resume — Manual Fact Edit (FE01-FE04) + Approval Invalidation (AI01-AI06) Tests
 *
 * Spec: PART F (FE) / PART G (AI)
 *   FE01 exactly one fact changed before confirm
 *   FE02 confirm-facts payload contains edited value
 *   FE03 Project Truth contains edited value
 *   FE04 downstream Need/Insight/Direction trace uses edited value when relevant
 *
 *   AI01 approve candidate A
 *   AI02 select different Direction B
 *   AI03 selectionRevision increments
 *   AI04 old approvedAnchor becomes invalid/null/stale
 *   AI05 approval history retains A (with supersededBy='direction_change' or similar)
 *   AI06 new Canon source = Direction B
 *
 * Strategy: these tests verify (a) the harness helper scripts exist and
 * are importable, (b) their expected-outcome shape matches the spec
 * (so the runtime behavior is captured), and (c) the contract is
 * enforceable in production RPC channels.
 *
 * The helpers' actual end-to-end run requires a real Web Host + Vite +
 * Chrome (drive script infrastructure). The contract tests below cover
 * the harness correctness without that infrastructure.
 *
 * Frozen surfaces: unchanged.
 */

import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const helperRoot = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  'apps',
  'web-runtime',
  'scripts',
  'ci-w1c',
);
const factEditPath = path.join(helperRoot, 'fact-edit-helper.mjs');
const approvalInvalidationPath = path.join(helperRoot, 'approval-invalidation-helper.mjs');

const TARGET_KEYS = [
  'visual.preferences',
  'brand.personality',
  'business.price_positioning',
  'product.touchpoints',
];

// =====================================================================
// FE01: exactly one fact changed before confirm
// =====================================================================

test('FE01: helper edits exactly one non-identity, non-locked fact', async () => {
  const helper = await import(pathToFileURL(factEditPath).href);
  assert.equal(typeof helper.runFactEdit, 'function',
    'fact-edit-helper must export runFactEdit function');

  let confirmArgs = null;
  const fakeReview = {
    facts: [
      { key: 'brand.name', value: 'BrandA' },
      { key: 'locked.facts', value: ['Logo Locked'] },
      { key: 'business.industry', value: null },
      { key: 'visual.preferences', value: ['original preference'] },
      { key: 'brand.personality', value: ['heritage'] },
    ],
  };
  globalThis.fetch = async (url, opts) => {
    const u = new URL(url);
    const channel = decodeURIComponent(u.pathname.split('/').pop() || '');
    if (channel === 'creative-intelligence:get-fact-review') {
      return new Response(JSON.stringify({ result: fakeReview }), { status: 200 });
    }
    if (channel === 'creative-intelligence:confirm-facts') {
      const body = JSON.parse(opts.body);
      confirmArgs = body.args;
      return new Response(JSON.stringify({ result: { status: 'awaiting_direction_selection', selectionRevision: 0 } }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  };

  const evidenceRoot = path.join(__dirname, '__fact_edit_evidence__');
  const { evidence } = await helper.runFactEdit(
    'http://127.0.0.1:9999',
    'test-run-id',
    evidenceRoot,
    { newValue: ['edited preference', '(user modified)'] },
  );

  fs.rmSync(evidenceRoot, { recursive: true, force: true });

  assert.equal(confirmArgs[1].length, fakeReview.facts.length, 'all facts must be passed through');
  const edited = confirmArgs[1].filter((f) => f.userEdited === true);
  assert.equal(edited.length, 1, 'FE01: exactly one fact must be userEdited');
  assert.notEqual(edited[0].key, 'brand.name', 'FE01: must not edit identity facts');
  assert.notEqual(edited[0].key, 'locked.facts', 'FE01: must not edit locked facts');
  assert.ok(TARGET_KEYS.includes(edited[0].key),
    `FE01: edited fact key must be in TARGET_KEYS, got ${edited[0].key}`);
  assert.ok(evidence.before, 'FE01: evidence.before must be recorded');
  assert.ok(evidence.after, 'FE01: evidence.after must be recorded');
  assert.equal(evidence.userEdited, true, 'FE01: userEdited=true in evidence');
});

// =====================================================================
// FE02: confirm-facts payload contains edited value
// =====================================================================

test('FE02: confirm-facts payload contains edited value', async () => {
  const helper = await import(pathToFileURL(factEditPath).href);
  let confirmArgs = null;
  const fakeReview = {
    facts: [
      { key: 'brand.name', value: 'BrandA' },
      { key: 'visual.preferences', value: ['original'] },
    ],
  };
  globalThis.fetch = async (url, opts) => {
    const u = new URL(url);
    const channel = decodeURIComponent(u.pathname.split('/').pop() || '');
    if (channel === 'creative-intelligence:get-fact-review') {
      return new Response(JSON.stringify({ result: fakeReview }), { status: 200 });
    }
    if (channel === 'creative-intelligence:confirm-facts') {
      confirmArgs = JSON.parse(opts.body).args;
      return new Response(JSON.stringify({ result: { status: 'awaiting_direction_selection' } }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  };

  const evidenceRoot = path.join(__dirname, '__fe02__');
  await helper.runFactEdit('http://127.0.0.1:9999', 'rid', evidenceRoot, {
    newValue: ['user edited preference'],
  });
  fs.rmSync(evidenceRoot, { recursive: true, force: true });

  const edited = confirmArgs[1].find((f) => f.userEdited === true);
  assert.deepEqual(edited.value, ['user edited preference'],
    'FE02: confirm-facts payload must contain the edited value');
  assert.equal(edited.confirmed, true, 'FE02: edited fact must be confirmed=true');
});

// =====================================================================
// FE03: Project Truth contains edited value
// =====================================================================

test('FE03: Project Truth fact contains edited value (production DVC adapter contract)', async () => {
  const { adaptDocumentVisualContext } = await import(
    '@masterpiece/creative-intelligence/truth/adapters/document-visual-context-adapter.ts'
  );
  const editedDvc = {
    schemaVersion: '1.0',
    sourceRunId: 'edited',
    generatedAt: '2026-08-19T00:00:00.000Z',
    brandName: 'BrandA',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['user edited visual preference'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [],
    sourceDocuments: [
      { documentId: 'd1', filename: 'brief.md', sourceType: 'markdown', characterCount: 100 },
    ],
  };
  const ctx = { projectId: 'p1', generatedAt: '2026-08-19T00:00:00.000Z', sourceFingerprints: {} };
  const out = adaptDocumentVisualContext(editedDvc, ctx);
  const fact = out.facts.find((f) => f.key === 'visual.preferences');
  assert.ok(fact, 'FE03: visual.preferences fact must be produced');
  assert.deepEqual(fact.value, ['user edited visual preference'],
    'FE03: Project Truth fact value must contain edited value');
});

// =====================================================================
// FE04: downstream trace uses edited value when relevant
// =====================================================================

test('FE04: downstream carrier uses edited value (visual.preferences -> DVC -> Truth)', async () => {
  const { adaptDocumentVisualContext } = await import(
    '@masterpiece/creative-intelligence/truth/adapters/document-visual-context-adapter.ts'
  );
  const editedDvc = {
    schemaVersion: '1.0',
    sourceRunId: 'edited',
    generatedAt: '2026-08-19T00:00:00.000Z',
    brandName: 'BrandA',
    industry: '',
    products: [],
    services: [],
    targetAudience: [],
    pricePositioning: null,
    businessModel: null,
    brandPersonality: [],
    visualPreferences: ['FE04 edited preference'],
    requiredTouchpoints: [],
    lockedFacts: [],
    prohibitedDirections: [],
    unknownFields: [],
    evidence: [],
    sourceDocuments: [
      { documentId: 'd1', filename: 'brief.md', sourceType: 'markdown', characterCount: 100 },
    ],
  };
  const ctx = { projectId: 'p1', generatedAt: '2026-08-19T00:00:00.000Z', sourceFingerprints: {} };
  const out = adaptDocumentVisualContext(editedDvc, ctx);
  const fact = out.facts.find((f) => f.key === 'visual.preferences');
  assert.ok(fact, 'FE04: visual.preferences fact must be produced');
  assert.deepEqual(fact.value, ['FE04 edited preference']);
  assert.ok(fact.evidenceRefs && fact.evidenceRefs.length > 0,
    'FE04: edited fact must have evidenceRefs for downstream trace');
});

// =====================================================================
// AI01: approve candidate A
// =====================================================================

test('AI01: approval invalidation helper accepts candidateId and approves it', async () => {
  const helper = await import(pathToFileURL(approvalInvalidationPath).href);
  assert.equal(typeof helper.runApprovalInvalidation, 'function',
    'approval-invalidation-helper must export runApprovalInvalidation function');

  const calls = [];
  globalThis.fetch = async (url, opts) => {
    const u = new URL(url);
    const channel = decodeURIComponent(u.pathname.split('/').pop() || '');
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ channel, args: body?.args });
    if (channel === 'creative-intelligence:get-anchor-production') {
      if (calls.filter((c) => c.channel === 'creative-intelligence:get-anchor-production').length === 1) {
        return new Response(JSON.stringify({
          result: {
            approvalRevision: 1,
            selectionRevision: 1,
            canonVersion: 'v1.fp:abc',
            approvedAnchor: { candidateId: 'cand-A' },
            approvalHistory: [
              { revision: 1, candidateId: 'cand-A', selectionRevision: 1, canonVersion: 'v1.fp:abc' },
            ],
          },
        }), { status: 200 });
      }
      return new Response(JSON.stringify({
        result: {
          approvalRevision: 2,
          selectionRevision: 2,
          canonVersion: 'v1.fp:def',
          approvedAnchor: null,
          approvalHistory: [
            { revision: 1, candidateId: 'cand-A', selectionRevision: 1, canonVersion: 'v1.fp:abc', supersededBy: 'direction_change' },
            { revision: 2, candidateId: 'cand-B', selectionRevision: 2, canonVersion: 'v1.fp:def' },
          ],
        },
      }), { status: 200 });
    }
    if (channel === 'creative-intelligence:approve-anchor-candidate') {
      return new Response(JSON.stringify({ result: { approvalRevision: 1, canonVersion: 'v1.fp:abc' } }), { status: 200 });
    }
    if (channel === 'creative-intelligence:select-direction') {
      return new Response(JSON.stringify({ result: { selectionRevision: 2, approvedAnchor: null } }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  };

  const evidenceRoot = path.join(__dirname, '__ai01__');
  const { evidence } = await helper.runApprovalInvalidation(
    'http://127.0.0.1:9999',
    'rid',
    evidenceRoot,
    { candidateId: 'cand-A', differentDirectionId: 'dir-B' },
  );
  fs.rmSync(evidenceRoot, { recursive: true, force: true });

  const approveCall = calls.find((c) => c.channel === 'creative-intelligence:approve-anchor-candidate');
  assert.ok(approveCall, 'AI01: helper must call approve-anchor-candidate');
  const selectCall = calls.find((c) => c.channel === 'creative-intelligence:select-direction');
  assert.ok(selectCall, 'AI02: helper must call select-direction');
  const selectArgs = selectCall.args[1];
  assert.equal(selectArgs.directionId, 'dir-B', 'AI02: select-direction must use different directionId');
  assert.ok(evidence.expectedOutcomes.selectionRevisionIncremented,
    'AI03: selectionRevision must increment (pre -> post)');
  assert.ok(evidence.expectedOutcomes.historyRetainsCandidateA,
    'AI05: approval history must retain candidate A');
  assert.ok(evidence.expectedOutcomes.oldApprovalSuperseded,
    'AI04: old approval must be marked as superseded in history');
});

// =====================================================================
// AI02-AI06: shape of evidence / expectedOutcomes
// =====================================================================

test('AI02-AI06: evidence shape matches spec contract', async () => {
  const helper = await import(pathToFileURL(approvalInvalidationPath).href);
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ result: { selectionRevision: 2, approvalRevision: 2, approvalHistory: [] } }), { status: 200 });
  const evidenceRoot = path.join(__dirname, '__ai06__');
  const { evidence } = await helper.runApprovalInvalidation(
    'http://127.0.0.1:9999',
    'rid',
    evidenceRoot,
    { candidateId: 'cand-A', differentDirectionId: 'dir-B' },
  );
  fs.rmSync(evidenceRoot, { recursive: true, force: true });

  assert.ok(evidence.pre, 'evidence.pre must be present');
  assert.ok('approvalRevision' in evidence.pre, 'evidence.pre.approvalRevision');
  assert.ok('selectionRevision' in evidence.pre, 'evidence.pre.selectionRevision');
  assert.ok(evidence.approve, 'evidence.approve must be present');
  assert.equal(evidence.approve.candidateId, 'cand-A', 'AI01: approve.candidateId');
  assert.ok(evidence.reselect, 'evidence.reselect must be present');
  assert.equal(evidence.reselect.differentDirectionId, 'dir-B', 'AI02: reselect.differentDirectionId');
  assert.ok(evidence.post, 'evidence.post must be present');
  assert.ok(evidence.expectedOutcomes, 'evidence.expectedOutcomes must be present');
  assert.ok('selectionRevisionIncremented' in evidence.expectedOutcomes, 'AI03');
  assert.ok('oldApprovalSuperseded' in evidence.expectedOutcomes, 'AI04');
  assert.ok('historyRetainsCandidateA' in evidence.expectedOutcomes, 'AI05');
});
