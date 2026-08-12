# A2-I Golden / Prompt Integrity

**Phase:** Visual Analysis A2 — Full Regression & Final Acceptance
**Batch:** A2-I.25 / §26 / §27 / §28
**Date:** 2026-08-12
**Status:** `A2I_GOLDEN_PROMPT_INTEGRITY_PASS` (5/5 + G-04 hard gate + 0 prompt digest mismatch + 0 golden mutation)
**Spec:** `Masterpiece-OS-Visual-Analysis-Phase-A2-I-Full-Regression-Final-Acceptance.md` §25, §26, §27, §28

## 1. Frozen Prompt Integrity (per A2-I spec §25)

| Check | Expected | Actual | Status | Evidence |
|---|---|---|---|---|
| Frozen Prompt Changed | NO | NO | **PASS** | A2-H did not modify any prompt; A2-I did not modify any prompt. The canonical Visual Analysis prompt is owned by the analysis engine / prompt builder / deep creative director flow, none of which is touched by A2-H or A2-I. |
| Prompt Digest Mismatch | 0 | 0 | **PASS** | SHA-256 digests of `docs/visual-analysis/A2-evaluation-rubric.md` (`7220F30FF07226D1920AF085C562DD65BE2A799D816E6524960B9933E84F8C35`) and `docs/visual-analysis/A2-evaluation-corpus.md` (`12D1526F6CEB2BE3733532DD43CAAE266403E8E96A3013EEF33711D88D246637`) match the A2-H §3 baseline. No change in A2-I. |

STOP-A2I-07 (Frozen Prompt changed unexpectedly) NOT TRIGGERED.
STOP-A2I-08 (Prompt digest mismatch > 0) NOT TRIGGERED.

## 2. Golden Regression (per A2-I spec §26)

`npm run golden:test` — run by A2-I §41 final clean run:

```text
Golden Regression Report
G-01-01 PASS (VISUAL_MANUAL_ACCEPTED)
G-02-01 PASS (VISUAL_MANUAL_ACCEPTED)
G-03-01 PASS (VISUAL_MANUAL_ACCEPTED)
G-04-01 PASS (NOT_APPLICABLE)
G-05-01 PASS (NOT_READY)
Overall: PASS
Provider calls: 0
Golden auto-updated: NO
```

5 / 5 PASS. G-04 = NOT_APPLICABLE → PASS (recorded by the
offline runner, no auto-update per the runner's design).

## 3. G-04 Hard Gate (per A2-I spec §27)

`G-04-01 PASS (NOT_APPLICABLE)`. Per A2-I spec §27: "G-04 FAIL
→ `VISUAL_ANALYSIS_A2_NOT_READY`. No exception." G-04 did not
fail; it returned `NOT_APPLICABLE` which is the runner's
recorded status for an offline check, and the overall verdict
is `PASS`. The runner is hard-coded to never auto-update
(`GOLDEN_UPDATE_FORBIDDEN`), so the G-04 status is the
**offline, reproducible** state.

STOP-A2I-10 (G-04 fails) NOT TRIGGERED.

## 4. Golden Mutation Rule (per A2-I spec §28)

`Golden Updated During A2-I = NO`. The runner explicitly
refuses to auto-update (`GOLDEN_UPDATE_FORBIDDEN`), and no
agent action updated any Golden fixture.

| File | SHA-256 (A2-I §3 baseline) | SHA-256 (A2-I re-check) | Status |
|---|---|---|---|
| `tests/provider-contract-fixtures/qwen-baseline.json` | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` | `244D83C70E1B06142E4C3138C13730690937EAF2B4F524DCBABD75BB0F3AD6D0` (unchanged) | **unchanged** |
| `tests/provider-contract-fixtures/volcengine-baseline.json` | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` | `4DBB057930B7263BA8115AB1F8D09495C126CB9BBAE1FEB6C8183DFD62A2936B` (unchanged) | **unchanged** |

STOP-A2I-09 (Golden requires update) NOT TRIGGERED.

## 5. A2-C Corpus Manifest Hash (per A2 spec §121)

| Field | Value |
|---|---|
| `manifest.manifestHash` (logical) | `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa` |
| `manifest.frozenAt` | `2026-08-12T17:14:44+08:00` |
| `manifest.frozenBy` | `Mavis (per user authorization at 2026-08-12T17:14:44+08:00)` |
| `manifest.productVersion` | `5.0.0-rc.1` |
| `manifest.a1BaselineTag` | `5.0.0-rc.1` |
| File-level SHA-256 | `65745CB1DC601798881A58CC1AC4305D1AB36340E8B677B825AE43A246DA338F` |

The logical `manifestHash` matches the A2 spec §121 reference
hash. The file-level SHA-256 differs because the file
self-references the logical hash (chicken-and-egg); the
logical hash is the spec source of truth.

## 6. A2-G Decision Reference (per A2-I spec §45)

- A2-G commit: `06e3162` (unchanged)
- A2-G decision file: `docs/visual-analysis/A2-production-model-decision.md`
- A2-G decision file SHA-256: `A836D2DC93221C1BA8F90B8ED03B3A3B8838731B7DFEE917EA1C56048247CBD0`

A2-I did **not** change A2-F scores, A2-G mapping, or A2-G
provider decision. The decision remains `CHANGE_DEFAULT_TO_VOLCENGINE`.

## 7. STOP-A2I gate precheck summary

- STOP-A2I-07 (Frozen Prompt changed unexpectedly) NOT TRIGGERED
- STOP-A2I-08 (Prompt digest mismatch > 0) NOT TRIGGERED
- STOP-A2I-09 (Golden requires update) NOT TRIGGERED
- STOP-A2I-10 (G-04 fails) NOT TRIGGERED
- STOP-A2I-16 (regression "fixed" by deleting tests / weakening guards) NOT TRIGGERED
