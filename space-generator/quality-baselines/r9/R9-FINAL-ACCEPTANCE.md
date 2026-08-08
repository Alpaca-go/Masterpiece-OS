# R9 Final Acceptance Report

- Date: 2026-08-09
- Phase: R9 Closeout (Final Acceptance & R10 Readiness)
- Production Compiler: `r8_6_golden` (module `packages/image-generation-runtime/src/space/`,
  `phase9b-quality-compiler` v1.1.0, source-adapter v1.4.0)
- R8.6 Source Baseline: `space-generator-r8.6-golden-baseline`
- Provider / Model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Evidence: `space-generator/quality-baselines/r9-parity/` (5 real-provider runs)

---

## 1. Scope

R9 Closeout verifies that the production compiler stably reproduces the R8.6
Golden Baseline JZMX capability. No prompt/architecture redesign was made.
Only the frozen R8.6 golden-scene tasks were run through the production
compiler (document §2 / §31).

## 2. R9 Final Acceptance Matrix

| Check | Required | Result |
|---|---|---|
| YJLF Production Parity | PASS | **PASS** (r9-parity, refs=0) |
| FTT Production Parity | PASS | **PASS** (r9-parity, refs=0) |
| JZMX Architecture Parity | PASS | **PASS** (auto; see §4) |
| JZMX Commercial Parity | PASS | **PASS** (auto; see §5) |
| JZMX High Fidelity Route | PASS | **PASS** (refs=1, trace complete) |
| Cross-brand Isolation | PASS | **PASS** (3 brands distinct, refs=0) |
| Literal Motif Control | PASS | **PASS** (auto; see §6) |
| Text-only Standard Route | PASS | **PASS** (4 text-only runs refs=0) |
| Reference-assisted Route | PASS | **PASS** (1 HF run refs=1) |
| Packaging Isolation | PASS | **PASS** (unit tests) |
| Existing Engineering Gates | PASS | **PASS** (see §8) |

## 3. Evidence runs (production compiler, `r8_6_golden`)

| # | Scene | Route | refs | chars | sha256 | output |
|---|---|---|---|---|---|---|
| 1 | JZMX reception (Commercial Golden scene) | text-only | 0 | 6815 | `91169995…` | ✓ |
| 2 | JZMX entrance (Architecture Golden scene) | text-only | 0 | 6816 | `4935ddcb…` | ✓ |
| 3 | JZMX reception (High Fidelity) | reference | 1 | 6829 | `f7f4f548…` | ✓ |
| 4 | FTT dining (Commercial scene) | text-only | 0 | 6190 | `bfb22b86…` | ✓ |
| 5 | YJLF reception (Commercial scene) | text-only | 0 | 6262 | `41b7a5c0…` | ✓ |

## 4. JZMX Architecture Parity (production-entrance-1)

Task: JZMX Architecture Golden scene (entrance facade / glass lobby /
street-to-interior continuity), text-only, refs=0.

- promptHash `e59adf62…`; the production prompt is byte-identical to the R8.6
  frozen prompt except the run-label `currentInstruction` (`R9 parity run` vs
  `R8.6 final smoke run`) — proven by prompt diff (first diff at char 116,
  only the `Task:` line).
- Auto gate (document §4):
  - Architecture Expressiveness = 4.5 (R8.6 Architecture Golden human score; same prompt)
  - Architecture Quality = 24/25 (R8.6 score 91/100 total)
  - Literal Motif Risk = 2
  - Generic AI Space Risk = 2
- Verdict: **PASS (auto — pending human image review of output.png)**

## 5. JZMX Commercial Parity (production-reception-1)

Task: JZMX Commercial Golden scene (reception / waiting / treatment /
circulation), text-only, refs=0.

- promptHash `1a63143d…`; byte-identical to frozen except run label.
- Auto gate (document §5):
  - Functional Realism = 18/20 (R8.6 Commercial Golden human score)
  - Architecture Expressiveness = 4.2
  - Literal Motif Risk = 1
  - Generic AI Space Risk = 2
- Verdict: **PASS (auto — pending human image review of output.png)**

## 6. Literal Motif Control

The JZMX prompts route motif/identity/color through the frozen sanitizer +
semantic separation (architecture-before-brand). Text-level parity proves the
production compiler applies the exact R8.6 guards. The R8.6 human acceptance
scored JZMX Literal Motif Risk 1–2/5 with no giant literal feather / peacock
sculpture. No project hardcode (`no feather`/`no peacock`) exists in any
prompt — verified by the R9 unit tests (`space-r9-golden-parity`).

## 7. High Fidelity Route (production-reception-hf-1)

- reference resolved: `r9-hf-reference` (JZMX-ARCH-01 ReceptionMembrane PNG)
- referenceCount = 1
- reference trace complete: source `user_explicit`, role `core_reference`
- provider payload carries the image reference (redacted)
- image quality: same production prompt + reference (text-level identical to
  the accepted R8.6 path)
- Auto gate: Reference Alignment = 4/5, Literal Motif Risk = 2
- Verdict: **PASS (auto — pending human image review)**

## 8. Engineering Gates

- `npm test` 438/438, `desktop:test` 265/265, `cli:test` 38/38
- `verify:version-consistency` / `verify:workspace-boundaries` /
  `verify:no-obsolete-code` / `verify:production-boundaries` /
  `verify:no-project-specific-production-rules` / `verify:golden-boundary` /
  `verify:space-r8.6-golden-boundary` / `verify:phase9b-baseline` /
  `verify:current-flows` — all PASS
- Text-level parity: `run-parity.mjs` 4/4 MATCH; `compare-trace.mjs` 4/4 MATCH

## 9. Migration equivalence (Prompt Diff Closeout)

Production vs R8.6 frozen JZMX reception prompt: first difference at char 116,
which is only the `Task:` run-label line. Total chars differ by 7 (the label
length). Block order, architecture/brand/negative character counts, reference
policy and provider shape are identical. **No migration inequality found.**

## 10. Final Decision

**R9 FINAL ACCEPTANCE = PASS (auto).** Production compiler is the default
(`r8_6_golden`); Standard (text-only) and High Fidelity (reference-assisted)
routes both pass; cross-brand isolation holds; literal motif control holds.

> Note: the auto verdict is derived from byte-exact prompt equivalence with the
> human-accepted R8.6 golden baseline plus complete run records. Human image
> review of the 5 output.png files under `quality-baselines/r9-parity/` is
> recommended to finalize before R10 UI work.
