# P1-5 — Golden vs Production Boundary

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `GOLDEN_PRODUCTION_BOUNDARY_FROZEN` (hard rule)
**Spec:** Packaging V1 Revised Development Specification §P1 ("P1 不进入 production rules"; "Golden Project Rules != Packaging Production Rules")
**Predecessor:** `failure-taxonomy.md`

## 1. Purpose (per user direction)

Per the user's hard constraint delivered with the P0 sign-off:

> 全部只能作为：
> Jiuzhou Golden Baseline / Evaluation Criteria。
> 禁止进入通用 Packaging Production Rules；
> 禁止硬编码进 Packaging Translation / Compiler / Validator；
> 禁止作为其他项目的默认包装规则。
>
> Golden Project Rules != Packaging Production Rules.

This document freezes that boundary. P1 introduces 5 docs (this
+ `jiuzhou-golden-baseline.md` + `shot-contracts.md` +
`acceptance-rubric.md` + `failure-taxonomy.md`); P2 introduces
Translation / Compiler; P3 introduces Validator. None of the P2
or P3 code is allowed to read the Jiuzhou Golden baseline as a
production rule. The Golden is **evaluator input only**.

## 2. The boundary in one sentence

> **The Jiuzhou Golden is the rubric against which outputs are
> scored. The Jiuzhou Golden is NOT a default; the Jiuzhou Golden
> is NOT a hard-coded production rule; the Jiuzhou Golden is NOT
> a fallback when the user does not provide a brand.**

## 3. What the boundary forbids

| Source | Forbidden use |
|---|---|
| `tests/fixtures/packaging/jiuzhou/color-baseline.md` (65-70 / 20-25 / 5-10 / 局部高光) | Hard-coding these ratios into Packaging Translation's color guidance for any project. The ratios apply **only** to the Golden evaluation. |
| `tests/fixtures/packaging/jiuzhou/motif-language.md` (5 abstract motifs) | Default-inserting any of these into Packaging Translation's motif guidance for any project. The motifs apply **only** to the Golden evaluation. |
| `tests/fixtures/packaging/jiuzhou/forbidden-motifs.md` (大面积浓紫 / 大面积写实羽毛 / 夜店式虹彩) | Using the forbidden set as a hard production Validator rule. The forbidden set applies **only** to the Golden evaluation. Other projects may have their own forbidden motif sets (or none). |
| `tests/fixtures/packaging/jiuzhou/visual-direction.md` (东方秩序 × 生物光泽) | Default-applying this direction to any non-Jiuzhou project. The direction applies **only** to the Golden evaluation. |
| `tests/fixtures/packaging/jiuzhou/shot-contracts/{hero,series,open}.md` | Wiring shot-specific framing guidance from these files into Packaging Translation for any non-Golden project. These files are the **evaluator's** expected framing; not the producer's default. |
| `tests/fixtures/packaging/jiuzhou/acceptance-rubric.json` (7-axis thresholds) | Hard-coding the thresholds into Packaging Validator. The thresholds are the Golden's thresholds; non-Golden projects may have different (or no) thresholds. |
| `tests/fixtures/packaging/jiuzhou/failure-taxonomy.json` (12 codes) | Treating the 12 codes as a global Packaging error code namespace. The codes are Golden-specific; the global namespace remains `REQUEST_FAILED` / `MALFORMED_RESPONSE` / etc. (per A4-2). |

## 4. What the boundary allows

| Source | Allowed use |
|---|---|
| `tests/fixtures/packaging/jiuzhou/*` | Reading as **evaluator input** when an explicit `goldenProjectId: 'jiuzhou'` (or equivalent) is set on the task or the run. P3's Validator is allowed to read the Golden **iff** the run is tagged as a Golden run. |
| `tests/fixtures/packaging/jiuzhou/*` | Reading as **test fixture** in offline tests. Tests that need a known Golden input (e.g. `packaging-reference-first-golden-baseline.test.js`) can read these files. |
| `tests/fixtures/packaging/jiuzhou/manifest.json` | Reading as a manifest of which Golden files exist and their SHA-256 digests. The manifest is the source of truth for "is the Golden still frozen?". |

## 5. The mechanism (frozen)

The boundary is enforced by a `goldenProjectId` discriminator:

```ts
interface GoldenRun {
  // ... all other fields ...
  goldenProjectId?: 'jiuzhou' | string;  // when set, Golden evaluator runs
}
```

- If `goldenProjectId` is set: the Golden evaluator reads the
  Golden fixtures; the 7-axis rubric + 12 failure codes apply;
  the thresholds are the Golden's.
- If `goldenProjectId` is **not** set: the Golden evaluator does
  NOT run; the run is a **production** run; the Golden
  fixtures are not read.

P3's Packaging Validator implements this discriminator. P3
must NOT use the absence of `goldenProjectId` as "fall back to
Golden" — that would violate the boundary. The absence means
"no Golden evaluation; production run only".

## 6. P1 vs P4 (the eventual freeze)

This boundary is **frozen at P1**. It will be re-stated at P4
freeze; P4 will not weaken it. P1's role is to record the rule;
P4's role is to verify the rule has been respected at every
P2 / P3 commit (via a dedicated guard).

P3 (or P4) must add the boundary guard:

```text
scripts/verify-packaging-golden-boundary.mjs   # G-PKG-GOLDEN-BOUNDARY-01
```

The guard scans all `apps/`, `packages/`, `runtime-core/.../image-generation/`
files for hard-coded references to:

- `九州美学` (literal brand name) outside the test fixture
  directory and the `jiuzhou-golden-baseline.md` doc
- `东方秩序` (literal direction) outside Golden evaluator files
- `65 – 70 %` / `20 – 25 %` / `5 – 10 %` (literal color ranges) outside
  the Golden fixture and the rubric doc
- `羽眼椭圆` / `九瓣放射` / `羽毛流线` (literal motifs) outside
  the Golden fixture
- `大面积浓紫` / `大面积写实羽毛` / `夜店式虹彩` (literal
  forbidden motifs) outside the Golden fixture

P0 named this guard; P3 (or P4) implements it. P0 + P1 do not
implement the guard (per "P0 不引入新 guard").

## 7. P1-5 acceptance

- [x] Boundary in one sentence recorded
- [x] Forbidden uses enumerated (7 sources)
- [x] Allowed uses enumerated (3 sources)
- [x] Mechanism (`goldenProjectId` discriminator) recorded
- [x] P3 / P4 guard deferred (per P0 plan)
- [x] Boundary frozen at P1; re-stated at P4
