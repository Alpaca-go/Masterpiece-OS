# P1 Final Report

**Phase:** Packaging V1 / P1 — Golden Baseline & Shot Contracts
**Date:** 2026-08-12
**Status:** `P1_FROZEN` (Golden baseline + 3 shot contracts + rubric + failure taxonomy + boundary + Golden Prompts + Golden Baseline Output schema frozen; real baseline output runs pending user opt-in before P2)
**Spec:** Packaging V1 Revised Development Specification §P1
**Predecessor:** P0 frozen at `78c6021`; A4 frozen at `f94c51a`

## 1. P1 scope (per spec)

P1 freezes the **Golden baseline** + the **3 Shot Contracts**
+ the **Acceptance Rubric** + the **Failure Taxonomy** +
the **Golden-vs-Production Boundary** + the **3 Golden
Benchmark Prompts** (P1 / D1) + the **Golden Baseline Output
schema + scaffold/finalize runner** (P1 / D2). P1 is **NOT**
the Packaging Translation / Compiler / Validator (those are
P2 / P3).

## 2. P1 commit chain (7 commits, this branch)

| Commit | Batch | Subject |
|---|---|---|
| `1832375` | P1 / C1 | 5 P1 docs (golden baseline + shot contracts + rubric + failure taxonomy + boundary) |
| `d1190a0` | P1 / C2 | 11 Golden fixtures (Jiuzhou: visual direction + color baseline + motif language + forbidden motifs + 3 shot framings + rubric.json + failure-taxonomy.json + manifest.json + _PROVENANCE.md) |
| `ddde335` | P1 / C3 | PackagingShotContract + PackagingFailureCode types in `image-generation-contracts`; freezeCommit bumped to include C2 fixtures |
| `01f3d60` | P1 / C4 | 5 new offline test files (shot contract + rubric + failure taxonomy + reference-first golden + manifest integrity) |
| `d4d31e8` | P1 / C5 | P1 final report + freeze record + contract module plain-JS form (TS syntax → JSDoc) for cross-runtime consumers |
| `2fd1082` | P1 / D1 | 3 Golden Benchmark Prompts (Jiuzhou × 3 shot contracts, Reference-First); 1 _PROVENANCE; manifest bumped to 14 frozen files; 15 new offline tests |
| `81dc4cf` | P1 / D2 | `scripts/run-packaging-golden-baseline.mjs` (scaffold + finalize); `baseline-outputs/` dir contract; 8 new offline tests |

## 3. P1 deliverables (7/7 frozen)

| # | Deliverable | Path | Status |
|---|---|---|---|
| 1 | Jiuzhou Golden Baseline | `docs/packaging/jiuzhou-golden-baseline.md` | FROZEN |
| 2 | Shot Contracts | `docs/packaging/shot-contracts.md` | FROZEN |
| 3 | Acceptance Rubric | `docs/packaging/acceptance-rubric.md` | FROZEN |
| 4 | Failure Taxonomy | `docs/packaging/failure-taxonomy.md` | FROZEN |
| 5 | Golden-vs-Production Boundary | `docs/packaging/golden-vs-production-boundary.md` | FROZEN |
| 6 | Golden Benchmark Prompts (P1 / D1) | `tests/fixtures/packaging/jiuzhou/prompts/{_PROVENANCE,hero,series,open}.md` | FROZEN |
| 7 | Golden Baseline Output schema + runner (P1 / D2) | `scripts/run-packaging-golden-baseline.mjs` + `tests/fixtures/packaging/jiuzhou/baseline-outputs/` | SCHEMA FROZEN; first real run pending user opt-in |

## 4. P1 contract surface (frozen in `image-generation-contracts`)

```text
PACKAGING_SHOT_CONTRACT_VERSION     = '1.0.0'
PACKAGING_SHOT_CONTRACTS            = ['PKG-HERO-SINGLE', 'PKG-SERIES-GROUP', 'PKG-GIFT-OPEN']
PACKAGING_SHOT_CONTRACT_LABELS       = { 'PKG-HERO-SINGLE': ..., 'PKG-SERIES-GROUP': ..., 'PKG-GIFT-OPEN': ... }
isPackagingShotContract(value)      -> value is PackagingShotContract

PACKAGING_FAILURE_CODES_VERSION     = '1.0.0'
PACKAGING_FAILURE_CODES             = ['PKG-F01'..'PKG-F12']   (12 codes)
PACKAGING_AUTO_FAIL_CODES           = ['PKG-F01', 'PKG-F02', 'PKG-F11']
isPackagingFailureCode(value)       -> value is PackagingFailureCode
```

The new types are exported from
`@masterpiece/image-generation-contracts` (no new package).
The contract is a pure data surface; no business logic; the
Translation / Compiler / Validator are P2 / P3.

**Form (C5 cleanup):** the contract module is shipped as
**plain JavaScript with JSDoc types**
(`packages/image-generation-contracts/src/packaging-shot-contract.js`).
C3 originally added it as a `.ts` module; the rename + JSDoc
conversion was made in C5 so the file does not rely on
TypeScript's type-stripping loader at import time. The export
surface (8 named exports + the 2 type aliases) is unchanged.
This matches the A3 `provider-policy.js` form
(`packages/runtime-core/src/application/provider-policy.js`),
which also ships as plain JS with JSDoc.

## 5. P1 frozen Golden fixture (Jiuzhou)

```text
tests/fixtures/packaging/jiuzhou/
├── _PROVENANCE.md
├── visual-direction.md          东方秩序 × 生物光泽
├── color-baseline.md            65-70 / 20-25 / 5-10 / 局部高光
├── motif-language.md            5 abstract peacock components
├── forbidden-motifs.md          3 explicit fails
├── shot-contracts/
│   ├── hero.md                  PKG-HERO-SINGLE framing
│   ├── series.md                PKG-SERIES-GROUP framing
│   └── open.md                  PKG-GIFT-OPEN framing
├── acceptance-rubric.json       7-axis thresholds + composite
├── failure-taxonomy.json       12 codes (PKG-F01..F12)
├── manifest.json                SHA-256 digests (14 frozen files)
│
├── prompts/                     (P1 / D1 — 4 files)
│   ├── _PROVENANCE.md           boundary: NOT for production import
│   ├── hero.md                  jiuzhou.hero.rf.v1
│   ├── series.md                jiuzhou.series.rf.v1
│   └── open.md                  jiuzhou.open.rf.v1
│
└── baseline-outputs/            (P1 / D2 — schema frozen, runs pending)
    └── .gitkeep                 (real runs need human opt-in;
                                  first run drops manifest.json +
                                  output.png in <shot>/<id>/run-1/)
```

Every file is recorded in `manifest.json` with its SHA-256
digest. The `packaging-golden-manifest.test.js` (P1 / C4)
re-computes the digests and fails on drift. **Any drift is a
P1.x re-evaluation event; the freeze is not silently mutable.**

### 5.1 P1 / D1 — Golden Benchmark Prompts (Jiuzhou × 3 shots)

3 manually authored Golden Benchmark Prompts under
`tests/fixtures/packaging/jiuzhou/prompts/`. All 3 are
**Reference-First** (per V1 spec §7.2 / §20.2).

| Shot | goldenPromptId | Aspect | Auto-fail check |
|---|---|---|---|
| PKG-HERO-SINGLE | `jiuzhou.hero.rf.v1` | 4:5 (Golden framing) | F01 / F04 / F06 / F11 |
| PKG-SERIES-GROUP | `jiuzhou.series.rf.v1` | 16:9 (Golden framing) | F01 / F04 / F06 / F09 / F11 |
| PKG-GIFT-OPEN | `jiuzhou.open.rf.v1` | 4:3 (matches preflight) | F01 / F04 / F06 / F10 / F11 |

Each prompt references (not duplicates) the 4 shared baseline
files (`visual-direction.md` / `color-baseline.md` /
`motif-language.md` / `forbidden-motifs.md`). Each prompt
has a YAML front-matter (`goldenPromptId` / `version` /
`shotContract` / `generationMode` / `goldenProject` /
`language`) and a fenced ```text prompt body. Pinned by
`tests/image-generation/packaging-golden-prompts.test.js`
(15 cases).

### 5.2 P1 / D2 — Golden Baseline Output (schema frozen, runs pending)

Schema + scaffold/finalize runner:
`scripts/run-packaging-golden-baseline.mjs`.

The runner is a **manual / opt-in / cost-sensitive** tool.
It does NOT call a real provider; the human curator
performs the actual image generation through the standard
Masterpiece image-generation runtime (CLI / Web / future
Packaging workspace) using the prompt body in
`run-N/prompt.txt`, drops the output as `run-N/output.png`,
then runs `--finalize` to record the run manifest.

`manifest.json` schema (frozen at P1 / D2):

```json
{
  "schemaVersion": "1.0",
  "manifestVersion": "1.0.0",
  "goldenProject": "jiuzhou",
  "goldenProjectId": "golden-jiuzhou",
  "shotContract": "PKG-HERO-SINGLE",
  "generationMode": "reference-first",
  "goldenAnchorIds": ["..."],
  "goldenPrompt": { "id": "...", "version": "1.0.0", "file": "..." },
  "provider": "volcengine",
  "model": "doubao-seed-2.1-turbo",
  "runNumber": 1,
  "runFinalizedAt": "ISO-8601",
  "outputPath": "relative path to output.png",
  "humanApprovalStatus": "pending|approved|rejected",
  "acceptanceRubricResult": { ... } | null,
  "knownLimitations": "free text"
}
```

Pinned by `tests/image-generation/packaging-golden-baseline-runner.test.js`
(8 cases: --list, --scaffold, --force, --finalize requires
output.png, --finalize writes valid manifest, unknown
provider/approval rejected, production code does NOT import
the runner).

### 5.3 Boundary (V1 spec §"Golden Project Rules != Packaging Production Rules")

The Jiuzhou visual rules (pearl-white 65-70%, mineral
purple 20-25%, graphite 5-10%, 5 abstract peacock
components, 3 explicit fails) **exist ONLY** in:

- `tests/fixtures/packaging/jiuzhou/` (Golden / evaluation
  boundary; P1 frozen assets)
- `docs/packaging/jiuzhou-golden-baseline.md` and the 4
  shared baseline `.md` files (documentation; the source
  of truth the Golden Prompts reference)

They **MUST NOT** enter:

- `packages/image-generation-runtime/src/packaging/` (P2 / P3)
- `packages/image-generation-runtime/src/packaging-compiler.js`
  (P2)
- `packages/image-generation-runtime/src/packaging-validator.js`
  (P3)
- Shared Core production rules
- `apps/cli/src/`, `apps/web/src/`, `apps/web-runtime/src/`

The offline half of G-PKG-GOLDEN-BOUNDARY-01 is enforced
today by:

- `packaging-golden-prompts.test.js` — scans 7 production
  roots for any reference to `tests/fixtures/packaging/jiuzhou/prompts/`;
  0 matches.
- `packaging-golden-baseline-runner.test.js` — scans the
  same 7 production roots for any reference to the runner
  script; 0 matches.
- `packaging-golden-manifest.test.js` — scans 7 production
  roots for 6 forbidden Jiuzhou literals; 0 matches.

The full guard (`scripts/verify-packaging-golden-boundary.mjs`)
remains a P3 deliverable.

## 6. P1 Exit (per spec §P1)

| Exit criterion | Status |
|---|---|
| Golden Project registered | PASS — `golden-jiuzhou` registered in `manifest.json`; `goldenProjectId` discriminator enforced in P1 / D1 + D2 tests |
| Golden Anchors curated | PASS — shared baseline files (visual-direction / color-baseline / motif-language / forbidden-motifs) frozen; 3 shot framings frozen; references documented in `_PROVENANCE.md` |
| **Golden Prompts frozen** | **PASS (P1 / D1)** — 3 Golden Benchmark Prompts (`jiuzhou.hero.rf.v1` / `jiuzhou.series.rf.v1` / `jiuzhou.open.rf.v1`); all Reference-First; YAML front-matter + prompt body + comparison protocol + notes; 15 new offline tests |
| Golden Translation frozen | PASS — `visual-direction.md` (东方秩序 × 生物光泽) + `color-baseline.md` (65-70 / 20-25 / 5-10 / 局部高光) + `motif-language.md` (5 abstract peacock components) + `forbidden-motifs.md` (3 explicit fails) |
| **HERO Shot Contract frozen** | **PASS** — `PACKAGING_SHOT_CONTRACTS` is `Object.freeze` of exactly 3 entries; `shot-contracts/hero.md` frozen; `prompts/hero.md` frozen (jiuzhou.hero.rf.v1, Reference-First); `compileShortChainGeneration` compiles `three_quarter_hero` against the Golden shape |
| **SERIES Shot Contract frozen** | **PASS** — `shot-contracts/series.md` frozen; `prompts/series.md` frozen (jiuzhou.series.rf.v1, Reference-First); compiles `set_display` |
| **OPEN Shot Contract frozen** | **PASS** — `shot-contracts/open.md` frozen; `prompts/open.md` frozen (jiuzhou.open.rf.v1, Reference-First); compiles `open_box` |
| **HERO baseline approved** | **PENDING (P1 / D2.x)** — schema + runner frozen; first approved baseline run pending user opt-in (real provider call through Masterpiece runtime) |
| **SERIES baseline approved** | **PENDING (P1 / D2.x)** — same |
| **OPEN baseline approved** | **PENDING (P1 / D2.x)** — same |
| Acceptance Rubric frozen | PASS — `acceptance-rubric.json` (7-axis thresholds + composite); `tests/fixtures/packaging/jiuzhou/acceptance-rubric.json` referenced by `prompts/{hero,series,open}.md`; pinned by `packaging-acceptance-rubric.test.js` |
| Failure Taxonomy frozen | PASS — `failure-taxonomy.json` (12 codes, 3 auto-fail F01/F02/F11); pinned by `packaging-failure-taxonomy.test.js` |
| Golden / Production boundary | PASS — `golden-vs-production-boundary.md`; offline guard in 3 P1 / D1 + D2 tests; full guard (`verify-packaging-golden-boundary.mjs`) deferred to P3 / P4 |
| Space regression | PASS — `npm test` 908/908; no Space test regressed; no production code references Jiuzhou literal |
| repo:verify | PASS — 9/9 verify gates (current-flows, version-consistency, version-naming, workspace-boundaries, no-obsolete-code, production-boundaries, no-project-specific, golden-boundary, repository-contract) + 6/6 A4 guards |

## 7. STOP-P1 gates (introduced for P1)

| Gate | Status |
|---|---|
| STOP-P1-01 (contract drift) | NOT TRIGGERED — additive type only; 14-block Shared contract unchanged; no existing consumer affected |
| STOP-P1-02 (4th shot contract) | NOT TRIGGERED — `PACKAGING_SHOT_CONTRACTS` is `Object.freeze` of exactly 3 entries; the type allows only the 3; `isPackagingShotContract` rejects the rest |
| STOP-P1-03 (V-next / phase leak in new code) | NOT TRIGGERED — `verify-a4-version-namespace` scans the 7 new test files + the new contract module + the new runner script; 0 forbidden matches |
| STOP-P1-04 (Golden in production) | NOT TRIGGERED — offline guard in `packaging-golden-prompts.test.js` scans 7 production roots for any reference to `tests/fixtures/packaging/jiuzhou/prompts/`; 0 matches |
| STOP-P1-05 (forbidden motifs in production) | NOT TRIGGERED — same guard; 0 matches |
| STOP-P1-06 (Golden drift) | NOT TRIGGERED — `manifest.json` SHA-256 verifies; all 14 files match |
| STOP-P1-07 (baseline drift unannounced) | NOT TRIGGERED — the `freezeCommit` bump in C3 is mechanical (the bumped commit IS the baseline; the bump was recorded in the C3 commit message) |
| STOP-P1-08 (test re-introduces phase namespace) | NOT TRIGGERED — none of the 7 new test files contains `p\d-packaging-*` / `P\d_PACKAGING_*` / `packaging-vnext-*` / `packaging-p\d+` |
| STOP-P1-09 (P1 / D1 — production imports Golden Prompts) | NOT TRIGGERED — `packaging-golden-prompts.test.js` scans 7 production roots for any `tests/fixtures/packaging/jiuzhou/prompts/` reference; 0 matches |
| STOP-P1-10 (P1 / D2 — production imports the manual runner) | NOT TRIGGERED — `packaging-golden-baseline-runner.test.js` scans 7 production roots for any `run-packaging-golden-baseline` reference; 0 matches |

10/10 NOT TRIGGERED.

## 8. Repository status (per P1 spec)

```text
Working tree                              clean after this commit
Branch                                   codex/visual-analysis-a1-multi-provider
HEAD                                     81dc4cf (P1 / D2 frozen; D1 on top)
Ahead of origin                           7 commits (P1 C1..C5 + D1 + D2)
A2 PASS                                  confirmed at 295f83f
A3 PASS                                  confirmed at 2514784
A4 FROZEN                                confirmed at f94c51a
P0 FROZEN                                confirmed at 78c6021
P1 FROZEN                                recorded at 81dc4cf
```

P1 / D1 + D2 ship:

- `tests/fixtures/packaging/jiuzhou/prompts/` (4 new files;
  all SHA-256 in `manifest.json`)
- `tests/fixtures/packaging/jiuzhou/baseline-outputs/`
  (1 `.gitkeep`; directory contract; first real run pending
  user opt-in)
- `scripts/run-packaging-golden-baseline.mjs` (1 new file;
  scaffold + finalize; manual / opt-in / cost-sensitive)
- `tests/image-generation/packaging-golden-prompts.test.js`
  (15 new cases)
- `tests/image-generation/packaging-golden-baseline-runner.test.js`
  (8 new cases)
- `tests/image-generation/packaging-golden-manifest.test.js`
  (10 → 14 file count bump)
- `tests/image-generation/packaging-reference-first-golden-baseline.test.js`
  (10 → 14 file count bump)
- `tests/fixtures/packaging/jiuzhou/manifest.json`
  (10 → 14 file SHA-256 entries + 1 directory entry)

## 9. Final clean run (per P1 spec)

```text
repo:verify                9/9 PASS
  verify:repository-contract            PASS
  verify:version-consistency             PASS
  verify:version-naming                  PASS
  verify:workspace-boundaries            PASS (0 failure, 0 warning)
  verify:no-obsolete-code                PASS (628 files scanned)
  verify:production-boundaries           PASS (297 current production files)
  verify:no-project-specific             PASS
  verify:golden-boundary                 PASS
  verify:current-flows                   PASS (tsc strict 0 errors)
  verify:a4                              PASS (6 A4 guards:
                                                  default-authority 142 files,
                                                  frozen-prompt 2 digests,
                                                  version-namespace 157 files,
                                                  legacy-desktop 3 tracked dirs,
                                                  golden-mutation 2 fixtures,
                                                  secret-safety 1742 tracked files)
  repo:guard:test                        PASS

npm test                 908/908 PASS   (was 883 at C5; +25 P1 / D1+D2 tests)
cli:test                  40/40 PASS
runtime:test             334/334 PASS
golden:test              5/5 + G-04 PASS
web:smoke                PASS
apps/web:typecheck       0 errors
```

## 10. What is NOT in P1 (deferred to later phases)

| Item | Phase |
|---|---|
| `packaging-translation` module (semantic → stable rep) | P2 |
| `packaging-compiler` module (Translation + task → 14-block) | P2 |
| Reference Roles for Packaging | P2 |
| Locked Asset precedence integration in Packaging | P2 |
| Component semantic versioning (per spec) | P2 |
| `packaging-validator` module (12 codes + 7-axis rubric) | P3 |
| UI flow (Project → Mode → Shot → Locked → Refs → Generate → Validation → Save) | P3 |
| `packaging-generation-service` | P3 |
| `scripts/verify-packaging-golden-boundary.mjs` (G-PKG-GOLDEN-BOUNDARY-01, full guard) | P3 / P4 |
| `scripts/verify-packaging-naming.mjs` (G-PKG-NAMING-01) | P3 |
| First real Golden Baseline Output runs (output.png + finalized manifest per shot) | **P1 / D2.x — pending user opt-in env vars + image-gen runtime** |
| Analysis-led Golden Prompts (one per shot) | Deferred — Reference-First is the primary quality path |
| Multi-anchor Golden Prompts | V1 non-goal; V2+ |
| Multi-run per shot (run-1, run-2, ...) for regression comparison | After first approved run; P2 / P3 |
| Full regression + freeze | P4 |
| Rollback Point | P4 |
| Production Readiness Report | P4 |

## 11. P1 hand-off (per spec: "P1 完成后先汇报，不直接进入 P2")

P1 is **complete and frozen** at the schema + benchmark level.
**Real provider runs are pending the user's opt-in** (env vars
+ image-gen runtime) before P1 / D2.x records the first
approved baseline output per shot. Awaiting user approval to
start P2 (Packaging Translation & Compiler) once the first
approved baseline outputs are recorded.

User input expected before P2 starts:

- Confirm the Jiuzhou Golden Identity (golden-jiuzhou) is the V1
  only Golden; no second Golden brand.
- Confirm the 3 Shot Contracts (PKG-HERO-SINGLE / SERIES / OPEN) are
  the V1 only shot set; no 4th shot.
- Confirm the Reference-First golden path (per the new
  `packaging-reference-first-golden-baseline.test.js`):
  - `three_quarter_hero` / `set_display` / `open_box` mapping
  - aspect ratio 4:3 across the 3 shots (the existing preflight
    accepts 4:3; the spec's preferred ratios — HERO 4:5, SERIES
    16:9, OPEN 4:3 — are Golden framing, not preflight constraints;
    a future P2/P3 release may extend the preflight's accepted
    set)
- Confirm the failure-taxonomy's 12 codes are the right granularity
  for V1 (5 axes with code groupings; 3 auto-fail conditions; F12
  reserved for runtime).
- Confirm the Golden-vs-Production boundary is the correct rule
  (Golden is evaluator input; production never reads it unless
  `goldenProjectId: 'jiuzhou'` is set on the run).
- **NEW (P1 / D1)**: Confirm the 3 Golden Benchmark Prompts
  (`jiuzhou.hero.rf.v1` / `jiuzhou.series.rf.v1` / `jiuzhou.open.rf.v1`)
  are the V1 only golden prompts; no 4th prompt, no Analysis-led
  golden prompt in P1.
- **NEW (P1 / D2)**: Confirm the Golden Baseline Output schema
  + runner (`scripts/run-packaging-golden-baseline.mjs`) is the
  V1 only path; manual / opt-in / cost-sensitive; runs are
  human-curated.

**Manual opt-in workflow (P1 / D2 real runs):**

1. Set env vars (one of the two providers):
   - `$env:QWEN_API_KEY = '...'`
   - `$env:ARK_API_KEY = '...'` (alias: `VOLCENGINE_API_KEY`)
2. Scaffold: `node scripts/run-packaging-golden-baseline.mjs --scaffold --shot hero --run 1`
3. The script writes `prompt.txt` in the run dir; the human
   curator runs the actual image gen through Masterpiece's
   image-generation runtime (CLI / Web / future Packaging
   workspace) and drops the output as `output.png` in the
   same run dir.
4. Finalize: `node scripts/run-packaging-golden-baseline.mjs --finalize --shot hero --run 1 --provider volcengine --model doubao-seed-2.1-turbo --anchor-ids anchor-hero-rf-01 --approval approved`
5. Repeat for series and open. The first approved run per
   shot is recorded; subsequent runs (run-2, run-3, ...) are
   regression comparisons.

## 12. P1 final state — single sentence

Packaging V1 / P1 is **complete and frozen** at the schema +
benchmark level:

- the Jiuzhou Aesthetics Golden Project is the V1 only Golden
  (visual direction 东方秩序 × 生物光泽; color baseline
  65-70 / 20-25 / 5-10 / 局部高光; 5 abstract peacock components;
  3 explicit fails; 7-axis rubric; 12 failure codes);
- the 3 V1 Shot Contracts (PKG-HERO-SINGLE / PKG-SERIES-GROUP /
  PKG-GIFT-OPEN) are frozen in
  `@masterpiece/image-generation-contracts` as
  `PACKAGING_SHOT_CONTRACTS` (Object.freeze of 3);
- the Golden-vs-Production boundary is frozen as a hard rule
  (Golden is evaluator input only; production code never reads
  it without `goldenProjectId: 'jiuzhou'`);
- the 3 Golden Benchmark Prompts (P1 / D1) are frozen in
  `tests/fixtures/packaging/jiuzhou/prompts/`, all Reference-First;
- the Golden Baseline Output schema + scaffold/finalize runner
  (P1 / D2) is frozen; the first approved real baseline run
  per shot is pending the user's opt-in (manual / opt-in /
  cost-sensitive via the existing Masterpiece image-generation
  runtime, not via a one-off script);
- 66 new P1 contract tests (C4 41 + D1 15 + D2 8 + 2 file-count
  bumps) + 908/908 npm test + 9/9 verify + 10/10 STOP-P1 NOT
  TRIGGERED;
- 0 forbidden production namespace matches; 0 forbidden
  Golden literal in production; SHA-256 integrity verified for
  all 14 frozen files.
