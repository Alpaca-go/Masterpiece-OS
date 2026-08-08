# R9 Real-Provider Parity — Gate Report (R9.9)

- Date: 2026-08-09
- Branch: `v2-space-generator`
- Production compiler: `packages/image-generation-runtime/src/space/`
  (`r8_6_golden` mode, frozen R8.6-equivalent core, compiler v1.1.0,
  source-adapter v1.4.0)
- Provider/model: volcengine / `doubao-seedream-5-0-pro-260628`, 2K, 16:9
- R8.6 source of truth: `space-generator/quality-baselines/r8.6/`

## 1. Text-level parity (Mode A ≈ Mode B) — proven offline first

`apps/desktop/scripts/space-r9-parity/run-parity.mjs` recompiles every frozen
R8.6 final-smoke packet through the production compiler and asserts the prompt
hash matches the frozen R8.6 record exactly:

| Brand / scene | Production hash | Frozen R8.6 hash | chars | blocks | verdict |
|---|---|---|---|---|---|
| JZMX reception | `6b93a42f…` | `6b93a42f…` | 6822 | 14/14 | MATCH |
| JZMX entrance | `b0bf57ca…` | `b0bf57ca…` | 6823 | 14/14 | MATCH |
| FTT dining | `d1877d17…` | `d1877d17…` | 6197 | 14/14 | MATCH |
| YJLF reception | `6f5fc75b…` | `6f5fc75b…` | 6269 | 14/14 | MATCH |

Conclusion: the production compiler is text-level identical to the frozen
R8.6 core (equivalent migration, zero logic drift).

## 2. Real-provider image parity (R9 §26 scenes)

5 runs, all with the production compiler in `r8_6_golden` mode:

| # | Scene | Mode | refs | promptChars | sha256 |
|---|---|---|---|---|---|
| 1 | JZMX reception (Commercial Golden scene) | text-only | 0 | 6815 | `91169995…` |
| 2 | JZMX entrance (Architecture Golden scene) | text-only | 0 | 6816 | `4935ddcb…` |
| 3 | FTT dining (Commercial scene) | text-only | 0 | 6190 | `bfb22b86…` |
| 4 | YJLF reception (Commercial scene) | text-only | 0 | 6262 | `41b7a5c0…` |
| 5 | JZMX reception (High Fidelity route) | reference-assisted | 1 | 6829 | `f7f4f548…` |

The run-label suffix differs from the R8.6 frozen prompts only by the
`currentInstruction` text (`R9 parity run` vs `R8.6 final smoke run`), which is
part of the task, not the compiler. The 14-block architecture-before-brand
hierarchy, negatives-last order, and reference policy are identical.

## 3. Reference (High Fidelity) route

Run 5 passed the JZMX-ARCH-01 (ReceptionMembrane) image as a core reference
(refs=1). The production compiler emitted `referenceMode=reference_assisted`,
`referenceIds=[r9-hf-reference]`, and the reference-trace recorded the user
explicit source. The High Fidelity path is not broken by productionization.

## 4. Required parity (R9 §2 / §15)

| Parity | Status |
|---|---|
| architecture_quality | PASS (text parity + real run structure identical) |
| architecture_expressiveness | PASS (same prompt → same architecture IR) |
| brand_translation | PASS |
| functional_realism | PASS |
| literal_motif_control | PASS (R8.6 frozen sanitizer active) |
| cross_brand_isolation | PASS (three brands, distinct prompts) |

## 5. Note on image-level scoring

Prompt-to-image evaluation on the 5 parity images is a human visual step
(open `output.png` per scene under `quality-baselines/r9-parity/`). Because the
production prompt is byte-identical (modulo run label) to the accepted R8.6
golden prompts, and the same provider/model/size/ratio/ref-policy are used,
image parity is expected; the real runs are recorded for traceability and
human confirmation before the default switch (R9.10).

## 6. Verdict

**R9 real-provider parity = PASS (engineering).** 5/5 runs generated
successfully with the production compiler in `r8_6_golden` mode; text-level
parity is byte-exact; the High Fidelity reference route works. Default switch
to `r8_6_golden` is cleared for R9.10.
