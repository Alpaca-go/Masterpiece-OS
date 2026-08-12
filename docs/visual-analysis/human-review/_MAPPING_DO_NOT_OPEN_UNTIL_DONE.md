# MAPPING — DO NOT OPEN UNTIL SCORING IS COMPLETE

**Status:** BLINDED. Do not consult this file during the scoring pass. Reveal only after every score is recorded.

A2-D run batch: `2026-08-12T09-30-05-859Z`
Manifest hash: `f57da490dcb31f99f07142aaa3b3fc9a2bd2be0d3a5b849e872adb117100cdaa`

## Provider ↔ Result mapping (per case)

| Case | Result A | Result B |
|---|---|---|
| C01 | **Result A = qwen (model: qwen3.6-plus)** | **Result B = volcengine (model: doubao-seed-2-1-turbo-260628)** |
| C02 | **Result A = volcengine (model: doubao-seed-2-1-turbo-260628)** | **Result B = qwen (model: qwen3.6-plus)** |
| C03 | **Result A = qwen (model: qwen3.6-plus)** | **Result B = volcengine (model: doubao-seed-2-1-turbo-260628)** |
| C04 | **Result A = volcengine (model: doubao-seed-2-1-turbo-260628)** | **Result B = qwen (model: qwen3.6-plus)** |
| C05 | **Result A = qwen (model: qwen3.6-plus)** | **Result B = volcengine (model: doubao-seed-2-1-turbo-260628)** |
| C06 | **Result A = volcengine (model: doubao-seed-2-1-turbo-260628)** | **Result B = qwen (model: qwen3.6-plus)** |
| C07 | **Result A = qwen (model: qwen3.6-plus)** | **Result B = volcengine (model: doubao-seed-2-1-turbo-260628)** |

## Reproducibility

The per-case assignment is computed as:

```js
function pickRandomA(caseId) {
  let h = 0;
  for (let i = 0; i < caseId.length; i += 1) h = ((h << 5) - h + caseId.charCodeAt(i)) | 0;
  return (h & 1) === 0 ? "qwen" : "volcengine";
}
```

Deterministic from caseId alone; no random seed required.

## After scoring

Once all 14 scorecards are recorded, read this file to learn the mapping, then transfer the scores into `A2-human-review-sheet.md` §3.1 and the per-case notes §5.