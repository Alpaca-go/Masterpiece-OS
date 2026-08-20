# CI-W1C.7.1A — Semantic Input Fingerprint Audit

> Date: 2026-08-20
> Phase: CI-W1C.7.1A
> Module: `packages/creative-intelligence/src/strategic-synthesis/semantic-fingerprint.ts`

---

## 1. Why a new fingerprint

The CI-W1C.7.1 prompt builders' `inputFingerprint` was a stable JSON
serialization of `projectId + factCount + needCount + evidenceCount
+ lockedCount + prohibitedCount`, then hex-encoded and truncated to
32 chars. This had two problems:

1. **Collision risk** — two semantically different inputs with the
   same counts produced the same hash.
2. **Not a true SHA-256** — the `Buffer.from(...).toString('hex').slice(0, 32)`
   is a hex encoding of JSON, not a cryptographic hash.

CI-W1C.7.1A replaces this with a **canonical SHA-256** of the full
Planning-First semantic payload.

---

## 2. Canonical semantic payload (Strategic)

```ts
{
  promptVersion: string,
  projectId: string,
  authoritativeFacts: [{ id, key, value, authority }],
  userRequirements: [{ id, key, value }],
  lockedIdentity: [{ id, key, value }],
  prohibitedDirections: [{ id, key, value }],
  needs: [{
    id, type, statement, coverage,
    factRefs (sorted lexicographically),
    evidenceRefs (sorted lexicographically),
  }],
  evidence: [{
    id, sourceKind, summary, confidence,
    factRefs (sorted lexicographically),
  }],
  legacyVisualEvidenceExcluded: sorted ascending,
}
```

For Concept and Direction fingerprints, the payload is extended
with:

| Stage | Additional field |
|---|---|
| Concept | `upstreamSynthesisFingerprint` (SHA-256 of canonical StrategicSynthesisArtifact) |
| Direction | `upstreamSynthesisFingerprint` + `upstreamConceptSetFingerprint` (SHA-256 of canonical ModelAssistedConceptSet) |

---

## 3. Canonicalization rules

1. **Object keys are sorted alphabetically** at every level
   (`sortKeysDeep` recursion).
2. **Arrays are sorted lexicographically** (default `sortArray=true`)
   — this means `factRefs`, `evidenceRefs`, `legacyVisualEvidenceExcluded`,
   etc. are order-invariant. See FP-06.
3. **Timestamps are stripped** — `generatedAt`, `createdAt`,
   `updatedAt`, `lastEditedAt`, `snapshotAt`, `now`, `timestamp`
   are removed from the canonical payload before hashing. See FP-05.
4. **Null / undefined are normalized** to the sentinel `<<null>>`.
5. **Line endings are normalized** to LF (inside `normalizeValue`).
6. **JSON output is compact** (no whitespace) to ensure
   determinism across runtimes.

---

## 4. Hash algorithm

```ts
import { createHash } from 'node:crypto';
const canonical = sortKeysDeep(stripTimestamps(payload), true);
const json = JSON.stringify(canonical);
const hash = createHash('sha256').update(json, 'utf8').digest('hex');
// hash is always 64 lowercase hex chars
```

The result is a 64-character lowercase hex SHA-256 digest.

No external dependency is introduced. Node 20+ ships `crypto` in
stdlib.

---

## 5. Fingerprint tests (FP-01..08)

All 8 tests pass:

| Test | Property |
|---|---|
| FP-01 | Same semantic input → same SHA-256 |
| FP-02 | Fact value change (same count) → different fingerprint |
| FP-03 | Need statement change (same count) → different fingerprint |
| FP-04 | Evidence summary change (same count) → different fingerprint |
| FP-05 | `generatedAt` only change → fingerprint unchanged |
| FP-06 | Unordered ref order change → fingerprint unchanged |
| FP-07 | `promptVersion` change → different fingerprint |
| FP-08 | G01 ≠ G02 real-project fingerprint |

Test source: `tests/packages/creative-intelligence/ci-7.1a/real-project-prompt-qualification-fp-bg-snap-rpq.test.js`

---

## 6. G01 / G02 real-project fingerprints

| Stage | G01 | G02 |
|---|---|---|
| Strategic | `655f19133e938b8e9c3dfe46530cba986d6124c36a788e9c871bf55602f74448` | `52182d5cab793ed5d63f8ad94e10db2b7caa0bab9183f67cda9de5c4fd860e9e` |
| Concept | `3d5d344e21fbfddd85478e3ce28434599fb8ad67c8f890471340375d2527bffe` | `a9d88c3a19bf24899ded657abde0a6fbd3f8ae173a025aeb429ac3d1ff621663` |
| Direction | `1a768023ce07bd785ad0c663f3d385af162c5f6f5599db750d9cf586823ff768` | `58bb7592eb68bc8c6fb5fa4db05831a028198f6b898a448880f604c1d8b7a159` |

All 6 fingerprints are 64-char lowercase hex. G01 and G02 differ
across all 3 stages, as expected for two real distinct projects.

---

## 7. Cross-runtime verification

The harness script implements the same canonicalization in pure
JavaScript and produces the SAME fingerprint as the production
TypeScript module for the same input. The verification was
performed by:

1. Loading real G01 data into the TS `compileStrategicReasoningContext`
2. Computing `strategicInputFingerprint(...)` via the TS module
3. Comparing against the fingerprint computed by the pure-JS
   script

Result: **exact match** (`655f19133e938b8e9c3dfe46530cba986d6124c36a788e9c871bf55602f74448`).

This proves the script is consistent with the production runtime
and can be used to inspect prompt wiring without invoking the
TypeScript build.

---

## 8. Backward compatibility

The previous `inputFingerprint` was a 32-char hex of sorted JSON.
The new `inputFingerprint` is a 64-char SHA-256 hex. Code that
previously asserted `inputFingerprint.length === 32` will need
to be updated to `=== 64`.

The CI-W1C.7.1 tests asserted only that `inputFingerprint` is a
non-empty string, so no test changes are required.
