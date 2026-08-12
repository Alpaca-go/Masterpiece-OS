# Runtime Static Asset Audit

**Document Type:** Repository Guard / Release Safety — Audit deliverable (per Tracked Runtime Assets Guard spec §24)
**Date:** 2026-08-12
**Scope:** Static runtime dependency completeness (per spec §0)
**Position in release flow:** Packaging P1 → Guard Hardening (this) → Packaging P2
**Status:** Audit complete; initial inventory declared; guard hardening ready to be committed
**Predecessor:** A4 frozen at `f94c51a`; P1 (Packaging) frozen at `33a3184`; A2/A3 PASS

## 1. Audit method (per spec §7)

Searched the production code in:

```text
apps/web
apps/web-runtime
apps/cli/src/analysis-engine
packages/runtime-core
packages/image-generation-runtime
packages/analysis-runtime
packages/project-contracts
packages/image-generation-contracts
packages/image-generation-adapter
packages/image-provider-dashscope
packages/model-benchmark
packages/model-registry
packages/model-runtime
packages/reference-asset-inspector
packages/creative-production-runtime
packages/document-ingestion
packages/evaluation-loop-contracts
```

Patterns scanned:

```text
fs.readFile / fs.readFileSync / readFile / readFileSync
existsSync
readdir / readdirSync
JSON.parse(readFile...)
path.resolve / path.join (in production)
new URL(..., import.meta.url)
```

Excluded (per spec §7, unless production imports them):

```text
archive/ labs/ tests/ docs/ evaluation/  (none of these are imported by production code today)
```

## 2. Findings summary

```text
Total fs.readFile* calls in production scope       87
Total existsSync calls in production scope          2 (smoke runner + architecture-context)
Total readdir calls in production scope            28
Total new URL(..., import.meta.url) calls           9 (most are URL parsing, not file resources)
```

Of the 87 readFile calls, the breakdown is:

| Class | Count | Example |
|---|---|---|
| **TRACKED_RUNTIME_ASSET** (static in repo, Git tracked, production read) | 5 (4 prompts + 1 registry) | `apps/cli/prompts/analysis/deep-creative-director.md`, `space-generator/v1-experimental/architecture-anchors/registry.json` |
| **GENERATED_RUNTIME_ASSET** (run output, written by production before read) | ~25 | `task-contract.json`, `run.json`, `trace.json`, `compiled-prompt.json`, `model-payload.json` (under user's project dir) |
| **USER_DATA** (per-user, never required in fresh install) | ~30 | `settings.json`, credential store, user attachments, project-context/ snapshots, Anchor-Generation-Brief.md, logo post-composite input |
| **OPTIONAL_RESOURCE** (smoke / debug only) | 2 | `apps/web-runtime/scripts/run-web-primary-smoke.mjs:66` (existsSync candidate scan) |

`existsSync` is used in 2 places:

- `apps/web-runtime/scripts/run-web-primary-smoke.mjs:66` — smoke runner, not production
- `packages/image-generation-runtime/src/space/architecture-context.js:64` — production read of the registry (TRACKED)

`readdir` calls are all USER_DATA directory walks (project runs, projects, anchor candidates, reference anchors, etc.) — none are TRACKED static assets.

`new URL(..., import.meta.url)` calls in production: 2 are static-asset style (the prompt root and benchmark preparation); the other 7 are URL / baseUrl parsing for network providers (not filesystem reads).

## 3. Initial Required Asset Inventory (spec §6)

### 3.1 Visual Analysis — prompt bundle

| Path | Read by | Tracked? |
|---|---|---|
| `apps/cli/prompts/analysis/deep-creative-director.md` | `apps/cli/src/analysis-engine/creative-director/prompt-builder.js:29` | ✓ |
| `apps/cli/prompts/analysis/benchmark-instructions.md` | same | ✓ |
| `apps/cli/prompts/analysis/execution-core-template.md` | same | ✓ |
| `apps/cli/prompts/analysis/report-schema.md` | same | ✓ |

The PROMPT_ROOT defaults to `apps/cli/prompts/analysis/` (the
`new URL('../../../', import.meta.url)` from
`apps/cli/src/analysis-engine/creative-director/prompt-builder.js:10`
+ `apps/cli/src/analysis-engine/preparation/benchmark-preparation.js:9`
both land at the CLI workspace root, then `path.join(...,
'prompts', 'analysis')`). It can be overridden by
`MASTERPIECE_PROMPT_ROOT` env var; the override path is **not**
a production requirement (when unset, the default in-repo path
must exist).

### 3.2 Space — architecture anchor registry + images

| Path | Read by | Tracked? |
|---|---|---|
| `space-generator/v1-experimental/architecture-anchors/registry.json` | `packages/image-generation-runtime/src/space/architecture-context.js:67` (readFileSync) | ✓ |
| `space-generator/v1-experimental/architecture-anchors/jiuzhou-aesthetics/JZMX-ARCH-01.png` | registry `imagePath` reference; resolved by `architecture-context.js:197` | ✓ |
| `space-generator/v1-experimental/architecture-anchors/jiuzhou-aesthetics/JZMX-ARCH-02.png` | same | ✓ |
| `space-generator/v1-experimental/architecture-anchors/jiuzhou-aesthetics/JZMX-ARCH-03.png` | same | ✓ |

The registry.json is the **single source of truth** for
architecture anchor metadata. Three brands are declared
(JZMX / FTT / YJLF); only JZMX anchors carry non-null
`imagePath` (the other two are `imageStatus: "concept_only"`,
no image referenced). Each imagePath in the registry resolves
to a tracked PNG file on disk today (verified by
`git ls-files --error-unmatch`).

The experimental `loader/load-anchors.mjs` is **not** in the
production path (per `verify:workspace-boundaries`); the
production code at `architecture-context.js` re-implements
the registry read + selection scoring. The experimental
loader is therefore not in the runtime asset inventory.

### 3.3 NOT in the inventory (per spec §5 + §19)

These are intentionally not declared as TRACKED_RUNTIME_ASSET:

- `.env`, API keys, credential stores
- user settings (`settings.json`)
- user projects, user references
- generated images, generated runs
- logs, cache, temporary files
- local smoke outputs
- runtime-generated state
- `node_modules/`, build output
- `outputs/`, `projects/*`, `Masterpiece-OS-Projects/`,
  `.runtime/`, `.codex-*/`, `.tmp-*.log`

These are correctly classified as USER_DATA / SECRET / CACHE
/ GENERATED / OPTIONAL per spec §8 and are protected by
existing `.gitignore` patterns:

```text
node_modules/
.runtime/
.codex-runtime/
.codex-smoke/
.codex-smoke-app/
.codex-temp/
.tmp-*.log / .tmp-*.err.log / .tmp-*.out.log
outputs/
projects/*    (with !projects/.gitkeep)
Masterpiece-OS-Projects/
```

## 4. STOP conditions (per spec §26)

| # | Condition | Status | Note |
|---|---|---|---|
| STOP-01 | Production depends on an untracked static file that affects output quality | **NOT TRIGGERED** | All 8 declared assets are Git tracked today (verified by `git ls-files --error-unmatch` for each) |
| STOP-02 | A required runtime file is matched only from local scratch / ignored path | **NOT TRIGGERED** | All 8 assets are tracked AND exist on disk; no required asset is matched only from a `.gitignore`d location |
| STOP-03 | A static dependency contains secret material | **NOT TRIGGERED** | Declared assets are the 4 VA prompts + 1 registry + 3 PNG anchor images; none are credentials / tokens / API keys (the secret-safety A4 guard also scans them) |
| STOP-04 | A runtime dependency points into user project data as a default source-of-truth | **NOT TRIGGERED (intended design)** | Production code reads `outputs/Anchor-Generation-Brief.md`, `task-contract.json`, `run.json`, `trace.json`, etc. — but all of these are GENERATED, not source-of-truth. The registry.json is the source-of-truth and is in the inventory. |
| STOP-05 | Fixing the issue would require moving baseline-critical Space resources | **DOCUMENTED — defer to Repository Stabilization** | `space-generator/v1-experimental/architecture-anchors/` is a non-production path. The production code reads from it via a hard-coded `REPO_ROOT` resolve. Per spec §2 ("do not move v1-experimental resources in this phase"), the inventory declares the asset at its current path; moving it to a production path is a future Repository Stabilization task. |
| STOP-06 | Fixing the issue would alter Prompt / Compiler / Reference-First semantics | **NOT TRIGGERED** | This phase adds 0 production code, 0 test changes, 0 schema changes. Pure additive: 1 manifest + 1 guard script + 1 test file + 1 audit doc + 1 npm-script wiring. |
| STOP-07 | A Golden or evaluation asset is imported by Production Runtime | **NOT TRIGGERED** | The 8 declared assets are not in the Golden / evaluation boundary (`tests/fixtures/packaging/jiuzhou/`, `tests/fixtures/visual-analysis/`, etc.). The P1 / C4 manifest guard + the P1 / D1 prompts-boundary guard already enforce the Golden-vs-Production boundary. |
| STOP-08 | `repo:verify` or Space regression becomes red | **NOT TRIGGERED** | This phase wires the new guard into `repo:verify` between `verify:production-boundaries` and `verify:no-project-specific-production-rules` (per spec §21). All existing 9 verify gates + 6 A4 guards remain green. |

## 5. Action taken (per spec §24)

| Action | Where |
|---|---|
| 1. Audit produced (this document) | `docs/repository/runtime-static-asset-audit.md` |
| 2. Manifest written with initial inventory | `config/repository-contract/runtime-static-assets.json` |
| 3. Guard script + npm command | `scripts/verify-tracked-runtime-assets.mjs` + `npm run verify:tracked-runtime-assets` |
| 4. Guard wired into `repo:verify` | `package.json` script chain (after `verify:production-boundaries`, before `verify:no-project-specific-production-rules`) |
| 5. Guard self-tests | `tests/tracked-runtime-assets-guard.test.js` (10 cases per spec §22) |
| 6. Existing guards left green | A4 `verify-a4-secret-safety` (1742+ tracked files, 0 secret matches) + existing 9 verify gates + 6 A4 guards |

## 6. Unresolved risks (per spec §24)

| Risk | Severity | Why not fixed in this phase |
|---|---|---|
| Space architecture anchors live under `v1-experimental/` (not a production path) | low | STOP-05; per spec §2 non-goal, defer to Repository Stabilization. The path is Git tracked today, so the immediate "untracked = silent release failure" risk is closed. |
| A future agent could add a new prompt file under `apps/cli/prompts/analysis/` without updating the manifest | low | This is exactly what the new `verify-tracked-runtime-assets` guard **detects**: a new file used by production but not declared in the manifest will be flagged at the next `repo:verify`. (The guard does not yet auto-discover; that is a P3 / D2 follow-up.) |
| Architecture anchor images (PNG) are large (~1.3 MB each) | low | Tracking them is the correct call (per spec §3); the size is unavoidable. |
| Experimental `loader/load-anchors.mjs` is not in the inventory | low | Not in production path; the workspace-boundary guard already prevents production from deep-importing it. The experimental loader is the only path that reads the `metadata.yaml` / `architecture-dna-analysis.yaml` files (3 brands × 2 files = 6 files), which are therefore not in the inventory. |

## 7. What this guard does NOT prove (per spec §30)

This phase establishes the **repository safety prerequisite**:
every production-critical static file is either Git tracked or
deterministically generated.

It does **NOT** prove the full release chain:

```text
fresh clone
    +
npm ci
    +
provider config
    +
full real generation
    =
production quality
```

That proof belongs to **Packaging P4 — Clean Clone Acceptance**,
which runs after P2 (Translation & Compiler) and P3 (UI +
Validation + Regression) complete.

## 8. Next step (per spec §31)

After this guard is frozen:

```text
Tracked Runtime Assets Guard ✅   (this phase)
        ↓
Packaging P2
Translation & Compiler
```

At Packaging P4:

```text
Clean Clone Acceptance
Release Completeness Test
```

After Packaging Freeze:

```text
Repository Stabilization
(may migrate runtime-owned assets out of historical / experimental
locations; resolves the STOP-05 deferred risk)
```

## 9. Audit traceability

| Field | Value |
|---|---|
| Audit date | 2026-08-12 |
| Audit tool | Manual grep over the 17 production-scope roots |
| Manifest commit (initial) | (this phase) |
| Guard script | (this phase) |
| Test file | (this phase) |
| Total declared assets | 8 |
| TRACKED + exists + SHA match | 8 / 8 |
| SECRETS / TOKENS in declared assets | 0 |
| A4 secret-safety scan after this phase | still PASS |
