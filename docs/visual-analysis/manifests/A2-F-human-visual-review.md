# A2-F Manifest

**Batch:** A2-F — Human Visual Review
**Purpose:** Record the human reviewer's per-(Case × Provider)
scorecard on the A2-evaluation-rubric.md dimensions, plus
optional LLM Judge secondary evidence, plus a Model
Character Profile per Provider. The output of A2-F is the
input to A2-G (Production Model Decision).
**Status:** `A2_F_TEMPLATE_READY` (human scoring pending; LLM
judge script ready but not run by default)

## Files

### Created
- `docs/visual-analysis/A2-human-review-sheet.md` — scorecard
  template with blinding protocol (§2), 14-cell score table
  (§3), per-case notes (§5), critical error log (§6), LLM
  Judge section (§7), reveal section (§8).
- `docs/visual-analysis/A2-model-character-profiles.md` —
  per-Provider character profile template (strengths,
  weaknesses, best-fit, failure patterns, cost/latency, role).
- `scripts/a2-f-llm-judge.mjs` — optional opt-in LLM Judge
  pass (secondary evidence only; not run by default; user
  must explicitly authorize; reads the 14 raw outputs and
  scores per the rubric dimensions).

### Source (already in repo)
- `docs/visual-analysis/evaluation/{caseId}/{provider}/{runId}.md` (14 raw markdowns)
- `docs/visual-analysis/evaluation/evaluation-matrix.json`
- `docs/visual-analysis/A2-cost-latency-reliability.md`
- `docs/visual-analysis/A2-evaluation-corpus.manifest.json`
- `docs/visual-analysis/A2-evaluation-rubric.md`

## STOP conditions encountered

None. A2-F is human work; no API calls are made by A2-F
itself unless the LLM Judge script is run.

The LLM Judge script (if authorized) is opt-in / networked /
cost-sensitive per A2 spec §20. It is NOT in default CI per
A2 spec §21 and §105. If run, it writes its scorecard to
`docs/visual-analysis/evaluation/llm-judge-scores.json` and
its raw judge outputs to `docs/visual-analysis/evaluation/llm-judge/{caseId}/{provider}/judge-NN.md`,
mirroring the A2-D run structure.

## Reveal (recorded here for audit, also in Human Review Sheet §8)

For A2-D run batch `2026-08-12T09-30-05-859Z`:

- **Candidate A** = `volcengine` (model resolved: `doubao-seed-2-1-turbo-260628`)
- **Candidate B** = `qwen` (model resolved: `qwen3.6-plus`)

The mapping is recorded in the Human Review Sheet §8 and
mirrored here. The human reviewer must NOT consult this
section until all scores are recorded (blinding protocol,
A2 spec §112).

## Verification

- The scorecard references the frozen rubric
  (`A2-evaluation-rubric.md`, `f57da490...` manifest hash).
- The blinding protocol is documented; the LLM Judge section
  marks its output as secondary evidence only (A2 spec §63).
- No corpus, rubric, Golden, Prompt, or Qwen request-semantics
  changes are made by A2-F.

## Rollback

A2-F is human work. If the human review is invalidated (e.g.
the reviewer changes their mind after reveal), the scorecard
is re-opened and re-scored. The frozen corpus and rubric are
NOT modified.

## A2-F exit gate

- [ ] Human scorecard complete for all 14 (Case × Provider)
  combinations (in `A2-human-review-sheet.md` §3.1)
- [ ] Hard-failure log signed off (in §6)
- [ ] Per-case human notes recorded (in §5)
- [ ] Pairwise comparison completed for close cases (in §4/§5)
- [ ] LLM Judge pass run (if authorized) and recorded in §7
- [ ] Reveal section (§8) consulted only after all above
- [ ] `A2-model-character-profiles.md` filled for both providers

A2-G (Production Model Decision) is the next batch. Its
input is the filled A2-F deliverable + A2-E operational
evidence + A2-D run matrix.
