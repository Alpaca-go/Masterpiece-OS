# A3 Rollback Plan

**Phase:** Visual Analysis A3 — Default Provider Transition & Production Readiness
**Batch:** A3-Rollback
**Date:** 2026-08-12
**Status:** `A3_ROLLBACK_PLAN_DESIGNED`
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A3-Default-Provider-Transition-Production-Readiness.md` §39, §40, §41
**Predecessor:** A3-K regression design

## 1. One-Step Rollback (per A3 spec §39)

A3 must define a one-step rollback:

```text
default → qwen / qwen3.6-plus
```

**without deleting Volcengine integration.**

## 2. Rollback Mechanism (Phase 2 implementation)

The A3 policy is versioned and lives in a single
`packages/runtime-core/src/application/provider-policy.js`
file. (Phase 2 ships the file as plain JavaScript with JSDoc
typings so both the Web Runtime Host via `tsx` and the headless
CLI via raw Node can import it without a build step. Earlier
prose in this design referred to `.ts`; the substantive contract
is unchanged.) The rollback is a **single line change** in that
file:

```js
// pre-A3 (A2-H baseline)
default: Object.freeze({ provider: 'qwen', model: 'qwen3.6-plus' })
```

becomes

```js
// post-A2-H (A3-A current)
default: Object.freeze({ provider: 'volcengine', model: 'doubao-seed-2.1-turbo' })
```

The rollback is the **reverse** change:

```js
// A3 rollback (one-step)
default: Object.freeze({ provider: 'qwen', model: 'qwen3.6-plus' })
```

The Volcengine provider remains registered as the
`alternative[0]`; it is not deleted, only the default is
swapped back. The `qwen` provider is still available for
explicit selection (A3 spec §41: "A3 does not remove Qwen").

## 3. Rollback Triggers (per A3 spec §40)

Examples that may trigger the rollback:

- production error spike (error rate > 5% in 1 hour)
- critical latency regression (p95 > 2× the A2-E baseline)
- provider instability (3+ consecutive 5xx from the default)
- billing anomaly (cost > 2× the projected baseline)
- contract failure (canonical contract validation failure rate > 1% in 1 hour)
- user-visible quality regression (3+ user reports of degraded analysis in 24 h)

The triggers are **examples**, not hard thresholds. A3 does
not invent new thresholds; the existing 5-minute
`AbortSignal.timeout` is the only hard operational contract.

## 4. Rollback Procedure (operator-level)

1. Edit `packages/runtime-core/src/application/provider-policy.ts`:
   change `default.provider` from `'volcengine'` to `'qwen'`
   and `default.model` from `'doubao-seed-2.1-turbo'` to
   `'qwen3.6-plus'`.
2. Run `npm run repo:verify` and `npm run runtime:test` to
   confirm no regression.
3. Commit with message `A3 rollback: default → qwen` and push
   to the current branch.
4. Trigger a Web re-deploy / restart.
5. Verify the Web UI badge shows `Qwen / qwen3.6-plus`.
6. Verify a real Visual Analysis run produces a `qwen3.6-plus`
   result.

The rollback is a single-line code change; no data migration is
required (the project persistence schema is provider-agnostic
per A2-H §31 / §32).

## 5. No Provider Removal (per A3 spec §41)

A3 does **not** remove Qwen. A3 does **not** remove Volcengine.
Provider removal requires a separate future decision.

After rollback:

- Default = Qwen / qwen3.6-plus
- Alternative = Volcengine / doubao-seed-2.1-turbo
- Both providers are still registered
- Both providers are still selectable
- All A2-I acceptance criteria remain valid (the only change
  is which provider is the default)

## 6. STOP-A3 gate precheck

- STOP-A3-13 (Qwen removal proposed) NOT TRIGGERED (rollback does not remove Qwen; it just swaps which one is the default)

## 7. Acceptance

- [x] One-step rollback plan designed
- [x] Rollback does not delete Volcengine integration
- [x] Rollback does not delete Qwen
- [x] Rollback procedure is operator-level (one-line code change + tests)
- [ ] (Phase 2) `provider-policy.ts` is the single source of truth for the default
- [ ] (Phase 2) Rollback procedure is documented in `apps/cli/README.md` (or equivalent)
- [ ] (Phase 3) Rollback dry-run (revert default to Qwen, re-run regression, restore default to Volcengine) — if user wants
