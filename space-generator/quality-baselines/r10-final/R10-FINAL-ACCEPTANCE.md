# R10 Final Acceptance Report

- Date: 2026-08-09 (R10.4.1 Final Sign-off)
- Phase: R10.4.1 Decorative Object Semantic Gate & Final Acceptance Artifact Integrity → R11 Unlock
- Production Compiler: `r8_6_golden` (src/space, `phase9b-quality-compiler` v1.1.0,
  source-adapter v1.4.0) — frozen
- Provider / Model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Repair baseline: `r10.4.1-post-repair` (commit `de5b0f8`)
- Artifacts: `space-generator/quality-baselines/r10-final/`
- Visual acceptance: **PASS** (human, 2026-08-09) — 3/3 fresh Standard + carried-forward HF
- Artifact integrity: **PASS** (fail-closed, all binding checks green)

---

## 1. Executive Decision

R10.4 repaired real-provider outputs (human PASS):

```text
JZMX Standard × 1          = PASS
JZMX Reference-First × 1   = PASS
FTT Standard × 1           = PASS
YJLF Standard × 1          = PASS
Cross-brand Isolation      = PASS
Literal Motif Control      = PASS
Functional Realism         = PASS
```

**R10.4 REGRESSION REPAIR = PASS. R10 REGRESSION HOLD = CLOSED. R11 = UNLOCKED.**

## 2. Image Gate (R10 §7)

| Sample | Required | Result |
|---|---:|---|
| JZMX Standard | PASS | PASS |
| JZMX Reference-First | PASS | PASS |
| FTT Standard | PASS | PASS |
| YJLF Standard | PASS | PASS |
| Literal Motif Control | PASS | PASS |
| Cross-brand Isolation | PASS | PASS |
| Functional Realism | PASS | PASS |

**4 / 4 IMAGE SMOKE PASS**

## 3. Sample roles (R10 §2)

| Sample | Role |
|---|---|
| JZMX-STD-01 | Standard Generation Acceptance |
| JZMX-HF-01 | High Fidelity / Reference-First Acceptance |
| FTT-STD-01 | Cross-brand Commercial Acceptance |
| YJLF-STD-01 | Cross-brand Wellness / Healthcare Acceptance |

## 4. Human scores (R10 §3-§6)

| Sample | Arch Exp | Func Real | Brand Spec | Motif Risk | Cross-brand |
|---|---:|---:|---:|---:|---:|
| JZMX-STD-01 | 4.2 | 4.4 | 3.7 | 0.5 | 5 |
| JZMX-HF-01 | 4.5 | 4.3 | 4.4 | 1 | 5 |
| FTT-STD-01 | — | 4.6 | 3.9 | 1 | 5 |
| YJLF-STD-01 | — | 4.1 | 4.3 | 1 | 5 |

## 5. Structural risks confirmed controlled

- JZMX no longer shows a literal peacock as spatial protagonist
- No giant feather / brand icon directly architecturalized
- Purple back to local brand accent
- Architecture Language is the primary spatial organization mechanism again
- FTT / YJLF not polluted by JZMX language
- Functional layout and commercial space realism restored

## 6. Frozen Safety Boundaries (R10 §9-§15)

- Generation Route Integrity Gate (deliverableFamily=space, compilerMode
  r8_6_golden, required blocks, budget, semantic gate, reference policy,
  aspect ratio; fail => provider must not run)
- Frozen required architecture blocks (spatial_intent / architecture_language /
  architecture_context / architecture_function_bridge / architectural_concept /
  architecture_dna / brand_translation / negative_constraints)
- Semantic Boundary Freeze (functional layer != brand motif layer; mustBeVisible
  = real operational entities only; no logo/wordmark/icon/motif/gradient/totem
  in functional conditions)
- Color Role Freeze (brand primary color = local accent; spatial dominant color
  by semantic role + spatial usage)
- Standard / Reference-First Reference Policy (standard refs=0, no auto-attach;
  reference_first explicit refs>=1, record id/source/count)
- Architecture Anchor Freeze (prompt-level mechanism prior only; never an
  automatic Standard provider reference; Reference-First only when user selects)

See `route-baseline.json` for the machine-readable freeze.

## 7. R10 Final Acceptance Checklist (R10 §38)

- [x] 4 real-provider smokes archived (9 files each under r10-final/)
- [x] JZMX Standard PASS
- [x] JZMX Reference-First PASS
- [x] FTT Standard PASS
- [x] YJLF Standard PASS
- [x] Literal Motif Control PASS
- [x] Cross-brand Isolation PASS
- [x] Route Integrity PASS
- [x] Spatial Semantic Gate PASS
- [x] Standard refs=0 PASS
- [x] Reference-First explicit refs PASS
- [x] Architecture Anchor not auto-attached to Standard
- [x] 16:9 / provider aspect ratio gate PASS
- [x] trace / reference provenance complete
- [x] R10-FINAL-STATUS.json created
- [x] R10 final tag created

## 8. R11 Unlock (R10 §39)

`R10-FINAL-STATUS.json` has `r11Ready=true`. Next development phase is
**Phase R11.1 — Confirmed Generated Image & Continuation Contract** (explicit
user confirm -> confirmed_generated_output -> referenceAssetIds -> new scene ->
same frozen compiler -> continuation output). No R11.2/R11.3 in this pass.

## 8a. R10.4.1 Final Sign-off (2026-08-09)

### Decorative Object Semantic Gate — Visual Acceptance PASS

Three fresh post-repair Standard smokes were human-reviewed (R10.4.1):

| Sample | Result | Core risk checked |
|---|---|---|
| jzmx-standard-r10.4.1 | PASS | Decorative centerpiece (architecture still dominant) |
| ftt-standard-r10.4.1 | PASS | Semantic over-filtering (open kitchen / food display intact) |
| yjlf-standard-r10.4.1 | PASS | Semantic over-filtering (herbal cabinet / wood grid intact) |

The JZMX prompt now demotes "接待台正对入口，视线引导至艺术装置" into
"接待台正对入口，建立清晰入口视觉焦点和空间导向" — the decorative object is no
longer a functional hard requirement. Small artistic objects remain as
subordinate accent (Decorative Centerpiece Risk = 2, an appropriate ceiling,
not a fail). FTT / YJLF real operational objects were NOT mis-demoted.

Cross-brand isolation confirmed (JZMX medical-aesthetics / FTT commercial
dining / YJLF wellness-herbal, no style leakage).

### Final Acceptance Artifact Integrity — PASS (fail-closed)

For each fresh Standard sample (baseline `r10.4.1-post-repair`, repair commit
`de5b0f8`, refs=0, r8_6_golden, 2K, 16:9), the integrity gate re-computed and
matched all bindings:

| Sample | runId | imageSha256 | promptHash | compiler | commit | baseline | fresh |
|---|---|---:|---:|---|---|---|---|
| jzmx-standard-r10.4.1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| ftt-standard-r10.4.1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| yjlf-standard-r10.4.1 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

JZMX Reference-First (`JZMX-HF-01`) is **carriedForwardEvidence=true**: its
original run/hash/baseline (`r10-reference-first`) are preserved; it is NOT
counted as a fresh sample.

See `final-acceptance-manifest.json` (3 fresh Standard + 1 carried-forward HF).

## 9. Final Decision

**R10 = COMPLETE. R11 = UNLOCKED.**
