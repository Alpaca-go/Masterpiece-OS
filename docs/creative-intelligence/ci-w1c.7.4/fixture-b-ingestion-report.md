# CI-W1C.7.4 — Fixture B Ingestion Report

> **Fixture**: `tests/fixtures/planning-briefs/qualification-planning-b.md`
> **Project ID**: `qualification-fixture-B`
> **Status**: PASS

## 1. Fixture identity

This is a **TEST FIXTURE**, not real G01 / G02 data. It is a synthetic
brand-strategy brief for a B2B audience-intelligence platform (English
content). The first 1200 chars of the file's raw text classify as
`brand-strategy` (matches `品牌(?:策略|战略|定位|策划)|brand\s*(?:strategy|positioning)`).

## 2. Pre-conditions

- File extension `.md` is in `PLANNING_BRIEF_SUPPORTED_EXTENSIONS`.
- File is read via the existing `readPlanningBriefFile` →
  `parseStrategyDocument` → `parseTextDocument` path.

## 3. Ingestion steps

| Step | Result |
|---|---|
| Read file via `readPlanningBriefFile` | OK |
| Compute content hash | `c75a0d9ae445e7ab5e0d290e47c3a7c35c6f68f28febb5963ee7e0469577c40a` |
| Build `PlanningBriefRecord` | OK |
| Classify role | `brand-strategy` (medium) |
| Map to `sourceRole` | `PLANNING_STRATEGIC_SOURCE` |
| Defensive skip check | (skipped — planning role) |
| `prepareDocumentSet` | 1 chunk (text < 4000 chars) |
| `documentSetHash` | `cc51596a9e38084e35943ecd51178f0ffee0bf2ce8720661bdad3ce4becdd693` |
| `extractClaimsFromChunk` | 2 claims extracted |

## 4. Extracted claims (2)

| Key | Value (truncated) | Confidence | Epistemic class |
|---|---|:-:|:-:|
| `industry` | Marketing technology | 0.8 | FACT |
| `product_service` | Real-time audience graph query API + offline cohort sync SDK | 0.7 | FACT |

The body of Fixture B uses English snake_case labels
(`industry:`, `product:`, `business_model:`, etc.). The CI-W1C.7.4
heuristic `EXTRACT_PATTERNS` only matches a subset of these labels
explicitly (`industry`, `product`); the rest are NOT extracted by
the heuristic. This is a known limitation of the minimal
heuristic; a follow-up phase may extend the patterns to all 16
`PLANNING_CLAIM_KEYS` in English snake_case form.

For the qualification purposes, 2 claims are sufficient to
demonstrate:
- English-label claim extraction works.
- The carrier is correctly typed (FACT class, confidence, chunk refs).
- The artifact-level fingerprint is stable and 64-char hex.

## 5. Artifact fingerprint

```
planningEvidenceFingerprint: ffa7b12e717bd88affcfbd6b995680f732283fff2739d9d0ba80d526547f10a5
documentSetHash:           cc51596a9e38084e35943ecd51178f0ffee0bf2ce8720661bdad3ce4becdd693
```

## 6. Tests covering this fixture

| Test | Verifies |
|---|---|
| `PSC-08` | two different planning claim values → different fingerprints (A vs B) |
| `PFP-04` | a brief content change invalidates BOTH content hash AND artifact fingerprint |

All pass.

## 7. Cross-project distinctness (preview)

| Property | Fixture A | Fixture B |
|---|---|---|
| contentHash | `bd554fe0…` | `c75a0d9a…` |
| sourceDocumentId | `…qualification-planning-a.md:bd554fe0…` | `…qualification-planning-b.md:c75a0d9a…` |
| claimKeys | 13 (Chinese labels) | 2 (English labels) |
| `industry` value | 有机生鲜电商 | Marketing technology |
| `product_service` value | 有机蔬菜 + 当季水果 + 半成品净菜… | Real-time audience graph query API + offline cohort sync SDK |
| `planningEvidenceFingerprint` | `f6847acf…` | `ffa7b12e…` |

The two artifacts are semantically distinct. See
`fixture-cross-project-differentiation.md` for the full
distinctness audit.
