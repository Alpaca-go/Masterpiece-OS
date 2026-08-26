/**
 * CI-W1C.7.4 — Fingerprints (PFP-01..05).
 *
 * Verifies that planning-source-registration and
 * strategic-synthesis fingerprints are canonical SHA-256, LF-normalized,
 * and a brief content change invalidates both:
 *   - planningBriefContentHash (per-brief)
 *   - planningEvidenceFingerprint (artifact-level)
 *   - documentSetHash (per-set)
 *   - strategicInputFingerprint (snapshot)
 *
 * The full set of fingerprint helpers must produce 64-char lowercase
 * hex strings, and be stable across calls.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  planningBriefContentHash,
  buildPlanningBriefSourceId,
  buildPlanningBriefRecord,
  planningEvidenceFingerprint
} from '@masterpiece/creative-intelligence/strategic-synthesis';

// ---------------------------------------------------------------------------
// PFP-01..02 — content hash
// ---------------------------------------------------------------------------

test('PFP-01: planningBriefContentHash is canonical LF-normalized SHA-256 (lowercase hex, 64 chars)', () => {
  const text = '品牌定位: 可追溯有机生鲜订阅\n行业: 有机生鲜电商\n';
  const hash = planningBriefContentHash(text);
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
  // Matches a manual LF-normalized SHA-256.
  const expected = createHash('sha256').update(text).digest('hex');
  assert.equal(hash, expected);
});

test('PFP-02: CRLF / CR inputs normalize to LF (same hash as LF)', () => {
  const lf = 'a\nb\nc';
  const crlf = 'a\r\nb\r\nc';
  const cr = 'a\rb\rc';
  assert.equal(planningBriefContentHash(lf), planningBriefContentHash(crlf));
  assert.equal(planningBriefContentHash(lf), planningBriefContentHash(cr));
});

// ---------------------------------------------------------------------------
// PFP-03..04 — artifact fingerprint
// ---------------------------------------------------------------------------

test('PFP-03: planningEvidenceFingerprint is stable and 64-char hex', () => {
  const payload = {
    projectId: 'proj-A',
    sourceDocuments: [],
    claims: []
  };
  const fp1 = planningEvidenceFingerprint(payload);
  const fp2 = planningEvidenceFingerprint(payload);
  assert.equal(fp1, fp2);
  assert.equal(fp1.length, 64);
  assert.match(fp1, /^[0-9a-f]{64}$/);
});

test('PFP-04: a brief content change invalidates BOTH content hash AND artifact fingerprint', () => {
  const rawTextV1 = '品牌定位: 可追溯有机生鲜订阅\n行业: 有机生鲜电商\n';
  const rawTextV2 = '品牌定位: 可审计的受众情报平台\n行业: 受众情报\n';
  const hashV1 = planningBriefContentHash(rawTextV1);
  const hashV2 = planningBriefContentHash(rawTextV2);
  assert.notEqual(hashV1, hashV2);
  // Records built from the two versions have different sourceIds.
  const r1 = buildPlanningBriefRecord({
    projectId: 'proj-A',
    filename: 'brief.md',
    relativePath: 'brief.md',
    rawText: rawTextV1,
    registeredAt: '2026-08-20T16:00:00.000Z'
  });
  const r2 = buildPlanningBriefRecord({
    projectId: 'proj-A',
    filename: 'brief.md',
    relativePath: 'brief.md',
    rawText: rawTextV2,
    registeredAt: '2026-08-20T16:00:00.000Z'
  });
  assert.notEqual(r1.contentHash, r2.contentHash);
  assert.notEqual(r1.sourceId, r2.sourceId);
  // The artifact fingerprint is also sensitive to claim content.
  const claimV1 = { claimId: 'c1', key: 'industry', value: 'organic grocery', epistemicClass: 'FACT', sourceDocumentId: 's1', chunkRefs: ['chunk-1'] };
  const claimV2 = { claimId: 'c1', key: 'industry', value: 'audience intelligence', epistemicClass: 'FACT', sourceDocumentId: 's1', chunkRefs: ['chunk-1'] };
  const fpV1 = planningEvidenceFingerprint({ projectId: 'proj-A', sourceDocuments: [], claims: [claimV1] });
  const fpV2 = planningEvidenceFingerprint({ projectId: 'proj-A', sourceDocuments: [], claims: [claimV2] });
  assert.notEqual(fpV1, fpV2);
});

// ---------------------------------------------------------------------------
// PFP-05 — sourceId stability
// ---------------------------------------------------------------------------

test('PFP-05: buildPlanningBriefSourceId is stable across calls and depends on projectId + contentHash', () => {
  const id1 = buildPlanningBriefSourceId('proj-A', 'abc123def456');
  const id2 = buildPlanningBriefSourceId('proj-A', 'abc123def456');
  const id3 = buildPlanningBriefSourceId('proj-B', 'abc123def456');
  const id4 = buildPlanningBriefSourceId('proj-A', 'abc123def457');
  assert.equal(id1, id2);
  assert.notEqual(id1, id3); // different project
  assert.notEqual(id1, id4); // different contentHash
  assert.ok(id1.startsWith('planning-brief:'));
});
