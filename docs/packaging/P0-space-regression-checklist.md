# P0-6 — Space Regression Checklist

**Phase:** Packaging V1 / P0 — Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_SPACE_REGRESSION_CHECKLIST_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0 ("建立 Space regression checklist"; "Space Generator 必须持续保持 regression green")
**Predecessor:** `P0-reuse-decision-log.md`

## 1. Purpose (per P0 spec)

Establish a **reproducible** test path that proves Space
Generator still passes after every P1–P4 commit. This is the
hard gate that P3 / P4 will re-run before declaring any
Packaging milestone PASS.

## 2. Hard gate (run before / after every P1–P4 commit)

### 2.1 Required commands (in this order)

```bash
# A4 base gate (Visual Analysis)
npm run repo:verify
# repo:verify = verify:repository-contract + verify:version-consistency
#   + verify:version-naming + verify:workspace-boundaries
#   + verify:no-obsolete-code + verify:production-boundaries
#   + verify:no-project-specific-production-rules
#   + verify:golden-boundary + verify:current-flows
#   + verify:a4 (6 A4 guards)
#   + repo:guard:test (7 guard tests)

# Space-specific tests
npm test -- tests/image-generation
# All image-generation tests, including the Space r-series

# Golden regression
npm run golden:test
# 5/5 PASS + G-04 hard gate
```

If any command fails: stop. The P1–P4 commit is NOT allowed to
land until Space regression is green.

### 2.2 Required current counts (target after P0)

| Suite | Count at A4 | Required after P1–P4 (no decrease) |
|---|---|---|
| `npm test` | 842 / 842 PASS | ≥ 842 / 842 |
| `cli:test` | 40 / 40 PASS | ≥ 40 / 40 |
| `runtime:test` | 348 / 348 PASS | ≥ 348 / 348 |
| `golden:test` | 5 / 5 + G-04 PASS | 5 / 5 + G-04 |
| `web:smoke` | status=pass | status=pass |
| `repo:verify` | 9 / 9 PASS | 9 / 9 |

A **decrease** in any count is a Space regression. P1–P4 must
fix the regression in the same commit (or split the commit
into "P-step + Space fixup").

## 3. Space-specific test inventory (current)

The Space regression path is composed of the tests in
`tests/image-generation/`. P0 lists them so P1–P4 can diff
easily.

### 3.1 R-series (Space)

```text
tests/image-generation/space-r2-b1-reference-scene-relation.test.js
tests/image-generation/space-r2-b2-adapter-capability.test.js
tests/image-generation/space-r2-b3-reference-boundary.test.js
tests/image-generation/space-r8.6-baseline-manifest.test.js
tests/image-generation/space-r8.6-cross-brand-isolation.test.js
tests/image-generation/space-r8.6-reference-policy.test.js
tests/image-generation/space-r8.6-trace.test.js
tests/image-generation/space-r9-block-order.test.js
tests/image-generation/space-r9-golden-parity.test.js
tests/image-generation/space-r9-packaging-isolation.test.js  ← also pins
tests/image-generation/space-r9-reference-policy.test.js
tests/image-generation/space-r9-semantic-separation.test.js
tests/image-generation/space-r9-source-adapter.test.js
tests/image-generation/space-r9-trace.test.js
tests/image-generation/space-r10-final-reference-policy.test.js
tests/image-generation/space-r10-final-semantic-boundary.test.js
tests/image-generation/space-r10-final-status.test.js
tests/image-generation/space-r10-reference-first-state.test.js
tests/image-generation/space-r10-reference-first.test.js
tests/image-generation/space-r10-workflow-acceptance.test.js
tests/image-generation/space-r10.4.1-freshness.test.js
tests/image-generation/space-r11-continuation-compiler.test.js
tests/image-generation/space-r11-continuation-contract.test.js
tests/image-generation/space-r11-continuation-ui-state.test.js
tests/image-generation/space-r11-continuation-v1.1.test.js
tests/image-generation/space-r11-continuation-v1.2.test.js
tests/image-generation/space-r11.2-reference-routing.test.js
tests/image-generation/space-r11.2.3-target-scene-authority.test.js
tests/image-generation/space-r11.2.4-residual-target-scene-leakage.test.js
```

### 3.2 Space gates and quality

```text
tests/image-generation/space-mode-boundary.test.js
tests/image-generation/space-quality-gate.test.js
tests/image-generation/space-final-acceptance-artifact-integrity.test.js
tests/image-generation/space-prompt-budget.test.js
tests/image-generation/space-route-integrity.test.js
tests/image-generation/space-spatial-mechanism-source.test.js
tests/image-generation/space-spatial-semantic-gate.test.js
tests/image-generation/space-action-verb-rewrite.test.js
tests/image-generation/space-brand-expression-sanitize.test.js
tests/image-generation/space-color-geometry-guard.test.js
tests/image-generation/space-compiler-ab-smoke.test.js
tests/image-generation/space-compiler-baseline-files.test.js
tests/image-generation/space-compiler.test.js
tests/image-generation/space-d-compile-integrity-gate.test.js
tests/image-generation/space-d-provider-prompt-gate.test.js
tests/image-generation/space-decorative-object-semantic-gate.test.js
tests/image-generation/space-f4-evidence-integrity-gate.test.js
tests/image-generation/space-generation-core-facade.test.js
tests/image-generation/space-mechanism-provenance.test.js
tests/image-generation/space-motif-stripping.test.js
tests/image-generation/space-phase9b-reference-boundary.test.js
tests/image-generation/space-reference-policy.test.js
tests/image-generation/space-semantic-separation.test.js
```

### 3.3 Packaging + shared

```text
tests/image-generation/packaging-contract.test.js                    ← packaging
tests/image-generation/packaging-generation-core-facade.test.js        ← packaging
tests/image-generation/space-r9-packaging-isolation.test.js             ← packaging vs space
tests/image-generation/prompt-preflight-gate.test.js                  ← shared
tests/image-generation/reference-plan.test.js
tests/image-generation/provider-dashscope.test.js
tests/image-generation/architecture-boundaries.test.js
tests/image-generation/policies.test.js
tests/image-generation/multi-model-adapters.test.js
tests/image-generation/preset-gates.test.js
tests/image-generation/prompt-composer.test.js
tests/image-generation/prompt-template-compiler.test.js
tests/image-generation/creative-core.test.js
tests/image-generation/creative-director.test.js
tests/image-generation/creative-prompt-bridge.test.js
tests/image-generation/headless-cli.test.js
tests/image-generation/legacy-fixtures.test.js
tests/image-generation/recovery.test.js
tests/image-generation/service.test.js
tests/image-generation/runtime-compile.test.js
tests/image-generation/contracts-schema.test.js
tests/image-generation/deliverable-baseline.test.js
tests/image-generation/deliverable-contracts.test.js
tests/image-generation/deliverable-gate.test.js
tests/image-generation/deliverable-golden-validation.test.js
tests/image-generation/deliverable-policies.test.js
tests/image-generation/deliverable-prompt.test.js
tests/image-generation/deliverable-reference-plan.test.js
tests/image-generation/deliverable-template-system.test.js
tests/image-generation/e-flow-state.test.js
tests/image-generation/f-similarity-audit.test.js
tests/image-generation/image-evaluation-loop.test.js
tests/image-generation/image-generation-adapter.test.js
tests/image-generation/baseline.test.js
tests/image-generation/packaging-contract.test.js
tests/image-generation/task-v2.test.js
tests/image-generation/user-confirmed-visual-decision.test.js
```

P0 baseline: all of the above are PASS at commit `f94c51a`
(A4 FROZEN). P1–P4 must keep them all PASS.

## 4. Cross-target isolation tests (must stay green)

These tests directly assert "no leak between Space and
Packaging". P0 freezes them as the cross-target isolation
contract.

| Test | What it pins |
|---|---|
| `tests/image-generation/space-r9-packaging-isolation.test.js` | Space and Packaging are dispatched by `deliverableFamily`; Space-only blocks do not bleed into Packaging outputs |
| `tests/image-generation/packaging-generation-core-facade.test.js` | The Packaging facade (`core/packaging-generation-core.js`) re-exports the canonical `compileImageGenerationTask` without drift |
| `tests/image-generation/space-r11.2.3-target-scene-authority.test.js` | Space target scene authority does not override Packaging target |
| `tests/image-generation/space-r11.2.4-residual-target-scene-leakage.test.js` | No residual Space target-scene leakage into non-Space outputs |
| `tests/image-generation/space-mode-boundary.test.js` | Mode boundary is preserved |

## 5. New tests P1–P4 must add (per spec)

Per the spec, P1–P4 each introduce new tests. P0 records what
they must add so the regression checklist grows coherently:

### 5.1 P1 must add (Golden Baseline & Contracts)

```text
- packaging-golden-jiuzhou-*.test.js          (golden brand)
- shot-contract-*.test.js                     (PKG-HERO-SINGLE / SERIES / OPEN)
- acceptance-rubric.test.js                   (rubric thresholds)
- failure-taxonomy.test.js                    (12 PKG-F codes)
- reference-first-golden-baseline.test.js     (Reference-First Golden)
```

### 5.2 P2 must add (Translation & Compiler)

```text
- packaging-translation.test.js               (semantic → stable rep)
- packaging-compiler.test.js                  (Translation + task → 14-block)
- packaging-reference-roles.test.js           (Ref roles)
- locked-asset-precedence.test.js             (cross-target precedence)
- six-paths.test.js                           (3 modes × 2 led types = 6 paths)
- compiler-determinism.test.js                (fingerprint stable)
```

### 5.3 P3 must add (UI + Validation + Regression)

```text
- packaging-ui-flow.test.js                   (full UI happy path)
- packaging-validator.test.js                 (12 PKG-F + 7-axis rubric)
- packaging-cross-target-isolation.test.js    (P3 guard; new)
- packaging-web-acceptance.test.js
- web:smoke with packaging_render deliverable
```

### 5.4 P4 must add (Full Regression & Production Freeze)

```text
- packaging-full-regression.test.js           (all 6 paths)
- packaging-freeze-manifest.test.js           (freeze invariants)
- packaging-naming-compliance.test.js         (no P0/P1/.../P4 in production)
```

## 6. P0-6 acceptance

- [x] Hard gate commands listed
- [x] Required current counts captured
- [x] Space test inventory recorded (R-series + gates + quality)
- [x] Cross-target isolation tests recorded
- [x] New tests P1–P4 must add enumerated
- [x] No code change in P0
