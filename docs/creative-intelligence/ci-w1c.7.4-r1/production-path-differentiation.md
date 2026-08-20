# CI-W1C.7.4-R1 — Production-Path Differentiation

> **Spec section:** PART J (proof that A and B are semantically distinct on
> the production path)
> **Date:** 2026-08-20

## Goal

Prove that the production path (register → reload → loader → context → prompt)
preserves the semantic distinction between fixtures A and B.

## Identities verified

| Identity | A vs B | Verified by |
|---|---|---|
| `contentHash` per brief | distinct | A: `…3f1b` (illustrative); B: `…9c2a` (illustrative) |
| `sourceId` | `planning-brief:qualification-fixture-A:<hash[:16]>` vs `…-B:…` | RRW-01 |
| `planningEvidenceFingerprint` | distinct (canonical claim payload SHA-256) | E2E-01 + manual inspection |
| Prompt `PLANNING STRATEGIC EVIDENCE` section text | distinct (different values) | E2E-03 |
| Strategic Synthesis `inputFingerprint` | distinct (semantic-fingerprint re-mixes the planning section) | E2E-01 + manual inspection |
| `sourceIds.planningClaims` set | distinct (different claim IDs) | RRW-03 |

## Test evidence

E2E-03 asserts:

```text
✔ E2E-03: fixtures A and B produce materially different planning sections in the synthesis prompt
```

The test:

1. Creates two projects.
2. Registers fixture A in project A, fixture B in project B.
3. Runs the full production smoke on each.
4. Splits the user message at `# PLANNING STRATEGIC EVIDENCE` and asserts
   the two halves differ.
5. Asserts that A's industry value (`有机生鲜`) appears in section A.
6. Asserts that B's industry value (`Marketing technology`) appears in
   section B.

The two projects never share claims: each claim's `sourceDocumentId` is
prefixed by the project id and the source role, so dedupe is project-scoped.

## Conclusion

The production path preserves the semantic distinction between A and B end
to end. A planning-brief change in one project does not affect the other
project's prompt snapshot.
