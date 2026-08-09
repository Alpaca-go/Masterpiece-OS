# R10 Reference-First — Real Provider Smoke (R10.4)

- Date: 2026-08-09
- Production compiler: `r8_6_golden` (src/space), Reference-First route
- Provider/model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- Reference: user_explicit core_reference (JZMX: architecture anchor;
  FTT/YJLF: R8.6 accepted golden output, per R10 §32 Generated Output → Reference)

## 1. Runs (3 images)

| Brand | Scene | refs | reference | promptChars | sha256 |
|---|---|---|---|---|---|
| 九州美学 | reception | 1 | JZMX-ARCH-01 (anchor) | 6825 | `2188be7c…` |
| 冯烫烫 | dining | 1 | R8.6 golden dining output | 6200 | `640484e2…` |
| 一剂良方 | reception | 1 | R8.6 golden reception output | 6272 | `cd1f833d…` |

All runs: `r8_6_golden`, reference-trace `referenceCount=1` source `user_explicit`,
provider payload carries the image reference, 14-block architecture-before-brand
hierarchy intact.

## 2. Acceptance (R10 §40)

| Check | Required | Result |
|---|---|---|
| Reference route works | PASS | **PASS** (3/3, refs=1 each) |
| Project identity remains correct | PASS | **PASS** (per-brand packets, distinct prompts) |
| Cross-brand isolation remains correct | PASS | **PASS** (three distinct brands, no language leak) |
| Standard route remains intact | PASS | **PASS** (R9 Standard parity unchanged; text-only 4/4 in r9-parity) |

## 3. Note on image-level scoring

The 3 output.png under `quality-baselines/r10-reference-first/` need human image
review (I cannot view images). Because each prompt is byte-equivalent to the
accepted R8.6 golden prompt (modulo the run-label currentInstruction) plus a
core reference, and the reference route is the R9 production runtime, the
engineering verdict is PASS pending human visual confirmation.

## 4. Verdict

**R10.4 real-provider Reference-First smoke = PASS (engineering).** 3/3 runs
generated successfully through the Reference-First UI contract path
(referenceAssetIds → r8_6_golden → resolveSpaceReferences → provider).
