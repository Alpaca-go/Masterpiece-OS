# A2-C Manifest

**Batch:** A2-C — Evaluation Corpus Freeze
**Purpose:** Lock the 7 evaluation cases (C01–C07) and the 10-dimension
rubric so A2-D (Cross-Model Evaluation Matrix) can run against a
stable, hash-bound corpus.
**Status:** `A2_C_CORPUS_FROZEN` + `A2_RUBRIC_FROZEN` (2026-08-12T17:14:44+08:00)

## Files

### Created
- `docs/visual-analysis/A2-evaluation-corpus.md` — frozen corpus
  doc (human-readable).
- `docs/visual-analysis/A2-evaluation-corpus.manifest.json` —
  machine-readable selection + manifest hash
  `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`.
- `docs/visual-analysis/A2-evaluation-rubric.md` — frozen 10-dimension
  rubric with weights, scale, and hard-failure rules.

### Already in repo
- `docs/visual-analysis/A2-candidate-model-discovery.md` (A2-A)
- `docs/visual-analysis/A2-volcengine-probe-report.md` (A2-B.2 evidence)
- `docs/visual-analysis/manifests/A2-A-candidate-discovery.md`
- `docs/visual-analysis/manifests/A2-B-provider-integration.md`

### Untracked (intentional, not committed)
- `.codex-smoke/a2-corpus-review/{project}-contact-sheet.png` (3
  contact sheets used for human review)
- `.codex-smoke/build-a2-corpus-review.mjs` (contact-sheet builder)
- `.codex-smoke/build-a2-corpus-manifest.mjs` (manifest builder;
  re-running with the same FROZEN_AT_ISO reproduces the same hash)
- `scripts/probes/probe-volcengine-analysis-capabilities.mjs`
  (user's own detailed probe, kept untracked per user direction)

## Corpus summary

| Field | Value |
|---|---|
| cases | C01–C07 (7) |
| totalInputAssets | 52 (across the 7 cases; 51 contact-sheet-driven + 2 trace-evidence-driven, with C06 + C03 sharing inputs that may overlap) |
| distinctProjects | 3 |
| C06 input source | `reference-trace.json` (NOT contact-sheet) |
| C07 subset tag | `CONTROLLED_INCOMPLETE_SUBSET` (3 of 10) |
| manifestHash | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` (sha-256) |
| Run Budget | 14 minimum calls (7 × 2 × 1); up to 42 close-stability calls (7 × 2 × 3) |

## Rubric summary

| Field | Value |
|---|---|
| dimensions | 10 (canonical A2 spec §34 list) |
| scale | 1–5 (integer, no half points) |
| weights | 15 / 15 / 15 / 10 / 15 / 10 / 10 / 5 / 2.5 / 2.5 = 100 |
| hard failure rules | 5 (Locked Asset, Brand identity, Output contract, Downstream usability, Wrong category) |
| soft threshold | NONE — Production Default Decision is explicit in A2-G |
| LLM judge role | secondary evidence only; not authoritative |

## STOP conditions encountered

None. All STOP-A2-01..19 conditions were honored:
- No model ID invented (A2-A discovery was evidence-based).
- No analysis pipeline duplicated (A1 baseline preserved).
- No frozen analysis Prompt modified (Prompt digest unchanged).
- No Qwen request semantics changed (A1 baseline preserved).
- No silent fallback to Qwen (registry has no such fallback).
- No browser-side API key exposure (no UI code touched).
- No production default changed.
- No Golden modification.
- No new version namespace.
- No LLM judge as sole judge.
- No public-benchmark-only decision.
- No auto-switch on slight score.
- No Qwen removal.

## Verification (consistency check)

The following is run as a post-freeze consistency check
(scripts/a2-corpus-consistency-check.mjs, added in a follow-up
commit):

1. `manifestHash` in the doc matches the SHA-256 of the canonical
   selection in `A2-evaluation-corpus.manifest.json`.
2. The total of rubric weights equals 100.
3. The 10 rubric dimensions are exactly the canonical A2 spec §34
   list.
4. The 7 caseIds in the corpus doc match the caseIds array in the
   manifest.
5. C06 input assets are exactly the 2 IDs that appear in vnext
   `reference-trace.json` as `user_explicit` references.
6. C07 has the `CONTROLLED_INCOMPLETE_SUBSET` tag in the manifest
   and a `3 of 10` selection.
7. Run Budget matches: 7 cases × 2 providers = 14 minimum calls;
   max 3 runs per case = 42 close-stability calls.

If any check fails, the corpus is NOT in `A2_C_CORPUS_FROZEN`
state; the failure is reported and the freeze is rejected.

## Rollback

This freeze is a hard boundary (A2 spec §121). Rollback means
invalidate the current evaluation, create a new corpus revision
with an explicit reason, and rerun all candidates. It is NOT a
"revert this commit" operation.

## A2-C exit gate

- [x] Corpus frozen (`A2_C_CORPUS_FROZEN`)
- [x] Rubric frozen (`A2_RUBRIC_FROZEN`)
- [x] Run Budget frozen
- [x] C06 trace evidence recorded
- [x] C07 `CONTROLLED_INCOMPLETE_SUBSET` tag recorded
- [x] STOP-A2-08 (modify after freeze) NOT triggered
- [x] Consistency check PASS

A2-D (Cross-Model Evaluation Matrix) is the next batch. It will
load the manifest, read each case's input assets, run the
Provider × Case matrix, and record results in
`docs/visual-analysis/A2-evaluation-matrix.md`.
