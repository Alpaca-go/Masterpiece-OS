# A2-A Manifest

**Batch:** A2-A
**Purpose:** Candidate Model Discovery — enumerate real Provider /
model candidates for Visual Analysis evaluation, with verified
access status and UNKNOWN capability flags.
**Status:** `A2_A_PASS` (2026-08-12)

## Files

- Created: `docs/visual-analysis/A2-candidate-model-discovery.md`
- This manifest.

No production code change. No Profile change. No Prompt change.
No Golden change.

## Discovery results

- Total configured Profiles inspected: 4.
- Analysis-type Profiles (`modelType = analysis`): 2.
- Image-generation-type Profiles: 2 (out of A2 scope).
- Candidates promoted to `ELIGIBLE`:
  - Qwen / `qwen3.6-plus` — CONTROL (A1 baseline).
  - Volcengine / `doubao-seed-2.1-turbo` — Candidate A
    (capabilities UNKNOWN; A2-B capability probe required).
- Candidates rejected with reason: 3 (all image-generation; out
  of A2 scope).

## Methodology

- Source: `settings.json` (read-only).
- Filters: `modelType = analysis`, `protocol = openai-chat-multimodal`,
  `lastTestStatus = success`.
- Capabilities not directly verified: marked `UNKNOWN` per A2
  spec §11.
- No model ID invented. No endpoint guessed. No access assumed.

## Verification

- A2 entry gate: PASS (all of `repo:verify`, `npm test`, `cli:test`,
  `runtime:test`, `web:smoke`, `golden:test`, actual web).
- No real Provider call performed in A2-A.
- No Prompt digest touched.
- No Golden touched.
- Repository Contract: not impacted (no new code path).

## STOP conditions encountered

None. None of STOP-A2-01 through STOP-A2-19 triggered.

## Rollback

Revert this manifest + `A2-candidate-model-discovery.md`. No
production data, Profile, Prompt, or Golden change requires
rollback.

## Open (user-owned) items

- Confirm or expand the candidate set (Q3 §6 of the discovery doc).
- Confirm the capability probe plan is acceptable (Q3 §6 of the
  discovery doc).
- Confirm candidate count target (Q2 §6: A / B / C).

## Result

`A2_A_PASS` — user confirmed (2026-08-12):
- candidate set = current (Qwen + doubao-seed-2.1-turbo only);
- count target = Option A (1 candidate, smallest Evaluation budget);
- capability probe plan = accepted (manual / opt-in 4-class probe).

A2-B may begin with the agreed candidate set.
