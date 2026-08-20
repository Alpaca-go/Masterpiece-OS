# CI-W1C.7.4-R1 — Fixture B Production Smoke

> **Spec section:** PART I / PART J
> **Date:** 2026-08-20
> **Fixture:** `tests/fixtures/planning-briefs/qualification-planning-b.md`

## Fixture Provenance

- Project: `qualification-fixture-B`
- NOT REAL G01 / NOT REAL G02
- English B2B audience intelligence platform brand strategy brief
- Counterpart to fixture A (Chinese B2C grocery subscription)

## Coverage (per PART I)

- 22 claim lines, all matched by the 16 `EXTRACT_PATTERNS`.
- 8+ claim keys covered (same set as A; multi-line variants per key).
- Epistemic classes exercised across A+B: **FACT, USER_REQUIREMENT, MODEL_INFERENCE, UNKNOWN**.

## Header Compliance

Same constraint as A: the fixture header intentionally avoids the substring
`vi` inside `e-v-i-dence` / `v-i-sual` so the document-role classifier does
not match the buggy `VI` rule. The classifier resolves the role to
`brand-strategy` (PLANNING_STRATEGIC_SOURCE).

## Production Smoke (PART J)

Same production path as fixture A. The B smoke additionally exercises:

- E2E-03: A / B prompts differ materially (different industry, brand
  promise, audience, etc.).
- REE-09: across A + B, all four epistemic classes are exercised.

## Acceptance (B-specific)

- E2E-01: full production path runs end-to-end on B ✓
- E2E-03: A and B produce materially different `PLANNING STRATEGIC EVIDENCE`
  sections in the synthesis prompt ✓
- REE-09: B contributes its own USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN
  lines ✓

## Epistemic-class distribution (B)

The B fixture produces:

- 16 `FACT` claims (declarative lines)
- 3 `USER_REQUIREMENT` claims (lines containing `must` / `should`)
- 2 `MODEL_INFERENCE` claims (lines containing `could` / `likely` /
  `possibly`)
- 1 `UNKNOWN` claim (line containing `TBD`)

## Cross-fixture (A + B)

Combined distribution:

- 32 `FACT` (≥ 4 required ✓)
- 5 `USER_REQUIREMENT` (≥ 2 required ✓)
- 4 `MODEL_INFERENCE` (≥ 1 required ✓)
- 2 `UNKNOWN` (≥ 1 required ✓)

The cross-fixture required-distribution gate (PART I) is satisfied.
