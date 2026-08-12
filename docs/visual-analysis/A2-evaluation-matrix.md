# A2 Evaluation Matrix

**Status:** RUN COMPLETE — all ok
**Run batch id:** `2026-08-12T09-30-05-859Z`
**Started at:** 2026-08-12T09:30:05.861Z
**Completed at:** 2026-08-12T09:55:59.979Z
**Manifest hash:** `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`
**Runs per case:** 1

## Per-run results

| Case | Category | Project | Provider | Run | Status | Latency (ms) | Model returned |
|---|---|---|---|---|---|---|---|
| C01 | Brand VI | 一剂良方-a13d6c09 | qwen | 1 | ok | 92903 | qwen3.6-plus |
| C01 | Brand VI | 一剂良方-a13d6c09 | volcengine | 1 | ok | 188996 | doubao-seed-2-1-turbo-260628 |
| C02 | Packaging / Physical Application | 九州美学-590eadf2 | qwen | 1 | ok | 54682 | qwen3.6-plus |
| C02 | Packaging / Physical Application | 九州美学-590eadf2 | volcengine | 1 | ok | 160577 | doubao-seed-2-1-turbo-260628 |
| C03 | Space / Environment | 九州美学-590eadf2 | qwen | 1 | ok | 55125 | qwen3.6-plus |
| C03 | Space / Environment | 九州美学-590eadf2 | volcengine | 1 | ok | 182338 | doubao-seed-2-1-turbo-260628 |
| C04 | Poster / Campaign | 视觉项目-20260728-002711-dca9b7d4 | qwen | 1 | ok | 66728 | qwen3.6-plus |
| C04 | Poster / Campaign | 视觉项目-20260728-002711-dca9b7d4 | volcengine | 1 | ok | 127811 | doubao-seed-2-1-turbo-260628 |
| C05 | Mixed Visual System | 九州美学-590eadf2 | qwen | 1 | ok | 56391 | qwen3.6-plus |
| C05 | Mixed Visual System | 九州美学-590eadf2 | volcengine | 1 | ok | 151384 | doubao-seed-2-1-turbo-260628 |
| C06 | Reference-heavy | 九州美学-590eadf2 | qwen | 1 | ok | 80893 | qwen3.6-plus |
| C06 | Reference-heavy | 九州美学-590eadf2 | volcengine | 1 | ok | 134654 | doubao-seed-2-1-turbo-260628 |
| C07 | Weak / Incomplete Input | 视觉项目-20260728-002711-dca9b7d4 | qwen | 1 | ok | 56055 | qwen3.6-plus |
| C07 | Weak / Incomplete Input | 视觉项目-20260728-002711-dca9b7d4 | volcengine | 1 | ok | 147311 | doubao-seed-2-1-turbo-260628 |

## Totals

| Provider | OK | FAIL | Total latency (ms) |
|---|---|---|---|
| qwen | 7 | 0 | 462777 |
| volcengine | 7 | 0 | 1093071 |

## Raw output locations

- C01 × qwen (run 1): docs\visual-analysis\evaluation\C01\qwen\C01-qwen-01.md
- C01 × volcengine (run 1): docs\visual-analysis\evaluation\C01\volcengine\C01-volcengine-01.md
- C02 × qwen (run 1): docs\visual-analysis\evaluation\C02\qwen\C02-qwen-01.md
- C02 × volcengine (run 1): docs\visual-analysis\evaluation\C02\volcengine\C02-volcengine-01.md
- C03 × qwen (run 1): docs\visual-analysis\evaluation\C03\qwen\C03-qwen-01.md
- C03 × volcengine (run 1): docs\visual-analysis\evaluation\C03\volcengine\C03-volcengine-01.md
- C04 × qwen (run 1): docs\visual-analysis\evaluation\C04\qwen\C04-qwen-01.md
- C04 × volcengine (run 1): docs\visual-analysis\evaluation\C04\volcengine\C04-volcengine-01.md
- C05 × qwen (run 1): docs\visual-analysis\evaluation\C05\qwen\C05-qwen-01.md
- C05 × volcengine (run 1): docs\visual-analysis\evaluation\C05\volcengine\C05-volcengine-01.md
- C06 × qwen (run 1): docs\visual-analysis\evaluation\C06\qwen\C06-qwen-01.md
- C06 × volcengine (run 1): docs\visual-analysis\evaluation\C06\volcengine\C06-volcengine-01.md
- C07 × qwen (run 1): docs\visual-analysis\evaluation\C07\qwen\C07-qwen-01.md
- C07 × volcengine (run 1): docs\visual-analysis\evaluation\C07\volcengine\C07-volcengine-01.md

## Notes

- All runs use the same semantic prompt (A2 spec §48-§49).
- Per-run raw markdown is preserved untouched (A2 spec §111).
- Provider identity is NOT blinded in this output (blinding happens in A2-F human review).
- Run batch id `2026-08-12T09-30-05-859Z` is the single source of truth for which runs belong to this A2-D evaluation.