# A2-F Blind Review Bundle — README

**Phase:** Visual Analysis A2 — Human Visual Review (A2-F)
**Date:** 2026-08-12
**Status:** `A2_F_BUNDLE_READY` (human scoring pending)
**A2-D run batch:** `2026-08-12T09-30-05-859Z`
**Manifest hash:** `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`
**Rubric frozen at:** `2026-08-12T17:14:44+08:00`

## 1. What is in this folder

```
human-review/
├── README.md                                (this file)
├── C01-A.md … C07-B.md                       (14 scorecards, 2 per case)
├── scorecards-all.md                        (all 14 scorecards in one file)
├── blinded/
│   ├── C01-A.md … C07-B.md                  (14 blinded raw output copies)
└── _MAPPING_DO_NOT_OPEN_UNTIL_DONE.md        (provider ↔ Result A/B mapping)
```

## 2. Blinding protocol

Per A2 spec §112:

- The 14 raw outputs in `docs/visual-analysis/evaluation/{caseId}/{provider}/`
  contain the provider name (`qwen` / `volcengine`) in the file path and
  the model name in the body. **Do not open any of those files during
  scoring.** Read only the blinded copies under `blinded/C0X-{A,B}.md`.
- Do NOT open `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` until all 14
  scorecards are recorded.
- Do NOT run `scripts/a2-f-llm-judge.mjs` (this is the LLM Judge
  secondary-evidence pass; explicitly NOT authorized for this round).

## 3. How to score

For each of the 14 scorecards (C01-A, C01-B, ..., C07-B):

1. Open the matching raw output: `blinded/C0X-A.md` or `blinded/C0X-B.md`.
2. Read the rubric dimensions (the table in the scorecard).
3. For each of the 10 dimensions, write a score 1–5 in the "Score" column.
4. Compute the weighted total: Σ (score × weight) ÷ 100.
5. Tick any hard-fail override (case = FAIL regardless of total).
6. Fill the "Reviewer notes" free-form section.

Do NOT modify the rubric. Do NOT adjust weights. Do NOT consult
the mapping. Do NOT open the original `evaluation/{caseId}/{provider}/`
paths during scoring.

## 4. After all 14 are recorded

1. Open `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` to learn the mapping.
2. Transfer scores + per-case notes into
   `docs/visual-analysis/A2-human-review-sheet.md` §3.1 + §5.
3. Fill `docs/visual-analysis/A2-model-character-profiles.md` for both providers.
4. A2-G (Production Model Decision) is the next batch.

## 5. Per-case blinding assignments (file naming only; the model/Provider identity is in the MAPPING file and is NOT to be consulted during scoring)

| Case | Result A | Result B |
|---|---|---|
| C01 | blinded/C01-A.md | blinded/C01-B.md |
| C02 | blinded/C02-A.md | blinded/C02-B.md |
| C03 | blinded/C03-A.md | blinded/C03-B.md |
| C04 | blinded/C04-A.md | blinded/C04-B.md |
| C05 | blinded/C05-A.md | blinded/C05-B.md |
| C06 | blinded/C06-A.md | blinded/C06-B.md |
| C07 | blinded/C07-A.md | blinded/C07-B.md |

## 6. Files you should NOT open during scoring

- `_MAPPING_DO_NOT_OPEN_UNTIL_DONE.md` (in this folder)
- `docs/visual-analysis/evaluation/{caseId}/{provider}/` (original raw outputs; contain provider/model names)
- `docs/visual-analysis/evaluation/evaluation-matrix.json` (records which provider is A vs B; do not consult)
- `scripts/a2-d-run-evaluations.mjs` (the runner; reads provider names; do not consult)
