# CI-W1C.7 — Baseline Freeze (PART A)

**Branch**: `feat/short-chain-simplified-ui`
**Expected baseline (per spec)**: `b52a0d4054d08897ec599a0162c3fdc7f3e49bad`
**Verified at start of phase**: `b52a0d4054d08897ec599a0162c3fdc7f3e49bad` (matches)
**Local == origin**: yes
**Untracked**: `space-generator/v1-experimental/prompt-compiler/anchor-aware/results/ab-comparison-report.json` (smoke artifact from CI-W1C.4 phase 8A, NOT in CI-W1C.7 scope)

## Recent history (last 5)

```
b52a0d40 feat(ci-w1c.6): planning-first creative authority + demote legacy visual evidence
e7100982 test(ci-w1c.5.1): NI-02..NI-07 Insight unit coverage + XD2-01..XD2-07 contract
c9db663e feat(ci-w1c.5): project-specific visual evidence propagation repair
23302590 docs(ci): record CI-W1C.4 Resume.1 audit + final report (HOLD_FOR_LIVE_WORKFLOW_DEFECT)
e9b30ade test(ci-3): update qualification-brief-hb to v2 evidence-strict contract
```

## Frozen HEAD confirmation

CI-W1C.7 inherits a clean CI-W1C.6 frozen state:

- `b52a0d40` is the **CI-W1C.6 production repair** commit (Rule 9 demoted to `type='preservation'` + `coverage='constraint_only'`; Concept/Direction 视觉锚点 suffix removed; `'creative_intelligence'` enum added; `compilePromptFromContract` extended with `planningText?`).
- Pre-existing failures (carried forward as baseline) are unchanged:
  - CI-6 golden 1 OFFICIAL_CERTIFICATION_CLAIM pattern matches "ce" in "audience"
  - verify:workspace-boundaries script bug at line 218
  - CI-W1A L1 / L10
  - CI-1B parity timestamp flake
  - XD01-XD05 + XD2-01..XD2-05 + XD2-07 use OLD smoke evidence (will pass after fresh smoke)

## What CI-W1C.7 does NOT touch

Confirmed by reading spec §3 "Frozen Surfaces":

- Document Intelligence extraction semantics
- DVC schema
- Project Truth taxonomy / precedence
- Conflict Detector
- Locked identity semantics
- CI-W1B.2 all-blocked semantics
- Recommendation != Selection (frozen)
- CI-7 Evaluation contract
- Selection revision/history
- CI-8 Visual Canon schema
- CI-W2 explicit Anchor approval
- CI-W1C.1 image model authority
- CI-W1C.3 RPC freshness
- CI-W1C.6 legacy visual evidence demotion
- Anchor Production
- Image Generation Runtime
- Space Translation
- Packaging Translation
- Space / Packaging consumers
- CI-10

## Image provider call count at start of phase

- **0 image provider calls** (no image generation runtime activation in CI-W1C.6)
- **0 analysis model calls** (CI-W1C.6 was deterministic)
- Analysis profile directory state: 4 unrelated profiles, no CI-W1C.4 2310 smoke profiles (carried forward from CI-W1C.5.1)
