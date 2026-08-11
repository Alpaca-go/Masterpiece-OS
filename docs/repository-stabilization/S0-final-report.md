# Masterpiece OS — Repository Stabilization Phase S0 Final Report

**Phase:** S0 — Repository Inventory & Version Topology Audit  
**Result:** PASS (inventory only)  
**Next phase:** S1 NOT STARTED  
**Snapshot date:** 2026-08-11

## 1. Repository summary

```text
Current Branch: codex/r10-4-regression-repair
Current Commit: 322ae676c546340fd7a9d467bca66ebe3fd023f7
Working Tree at snapshot: CLEAN
Untracked Files at snapshot: 0
Primary Runtime: Web
Legacy Runtime: Desktop (also hosts substantial Shared Core)
```

The audit covered tracked paths, ignored runtime directories, filenames/directories, imports/exports, package scripts, configs, tests, fixtures, docs/comments, CLI arguments, environment variables, filesystem resolution, dynamic imports, child processes, exact hashes and targeted Git history.

## 2. Inventory metrics

Metric definitions: “source files” are Git-tracked `.js/.mjs/.cjs/.ts/.tsx/.jsx`; version-named counts use tracked paths and the S0 pattern (`v*`, `r*`, `legacy`, `old`, `backup`, `deprecated`, `experimental`, `final`, `copy`, `temp/tmp`). Registry status counts are grouped implementation/version instances, not individual files.

```text
Total tracked files: 1414
Total source files: 683
Version-named files: 148
Version-named directories: 40

ACTIVE_RUNTIME: 4
ACTIVE_DEPENDENCY: 9
TEST_DEPENDENCY: 12
HISTORICAL_REFERENCE: 4
SUPERSEDED_CANDIDATE: 0
DUPLICATE_CANDIDATE: 2
ARCHIVE_CANDIDATE: 0
UNKNOWN: 3
```

Exact-hash audit found 36 duplicate groups among non-empty tracked text/code artifacts below 2 MiB. Most are evidence snapshots; at least two groups duplicate CLI v5 prompt resources into the frozen Space v1 baseline. No deduplication was performed.

## 3. Active version truth

| Capability | Active implementation truth |
|---|---|
| Visual Analysis | Web RPC -> Desktop `pipeline-service.ts` -> Qwen reasoner -> dynamic CLI `src/v5/bootstrap.js` -> `prompts/v5` |
| Reference First | `VNextGenerationWorkspace` -> Desktop `vnext-service` -> explicit resolver/policy -> vNext compile orchestration -> Space compiler -> Seedream/provider service |
| Prompt Compiler | Space defaults to `r8_6_golden`, implemented by current `src/space/phase9b-space-compiler.js`; `vnext_legacy` remains env-selectable fallback |
| Space Generator | R9 production module carrying frozen R8.6 parity plus R10/R11 semantic, route, continuation and target-scene layers |
| Packaging Generator | task/source bundle `3.0` -> task-builder V3 -> deliverable prompt compiler; v1/v2 compatibility remains active |
| Model Provider | Analysis defaults Qwen3.6 Plus with partial Qwen coupling; current Short-Chain generation selects Seedream protocol; shared adapters remain configurable |
| CLI | only executable implementation is CLI v5; it is both direct CLI and hidden Web dependency |
| Web Smoke | `npm run web:smoke` -> `apps/desktop/scripts/run-web-primary-smoke.mjs`, protected baseline |

## 4. Highest-risk historical/versioned dependencies

1. **Web -> Desktop-hosted main -> CLI v5.** Dynamic import and packaged prompt path make `v5` a CRITICAL active dependency.
2. **Current Reference-First -> vnext namespace -> R8.6/Phase9B/R9/R10/R11 layers.** These names are accumulated behavior, not removable old versions.
3. **`vnext_legacy` compiler fallback.** It looks superseded but remains environment-selectable; status ACTIVE_DEPENDENCY.
4. **Packaging task 1.0/2.0.** Current service migrates/retries persisted inputs; older schemas remain active compatibility surfaces.
5. **Lab visual-translation v2 -> v1.** v2 imports v1 prompts, validators, protocol and checkpoint store.
6. **Space v1 baseline/experimental.** Production does not import the experimental tree, but root scripts and current tests do.

## 5. Dynamic dependency findings

- `pipeline-service.ts` dynamically imports CLI v5.
- `MASTERPIECE_PROMPT_ROOT` redirects analysis prompt filesystem paths.
- `MASTERPIECE_SPACE_COMPILER_MODE` activates current aliases or legacy compiler fallback.
- Provider selection is profile/protocol string-based; adapters cannot be judged only by static imports.
- Many smoke/A-B scripts dynamically import current compilers from path-derived URLs.
- Test runners spawn Node/Git and execute scripts, creating non-module dependencies.
- No variable-form CommonJS production loader was found; three Electron smoke wrappers use static `require('electron')`.

## 6. Prompt / compiler / Reference-First protection

- Prompt resources and compiler variants are `BEHAVIOR_SENSITIVE`.
- Exact duplicates were recorded, not normalized.
- Reference upload, resolver, policy, target-scene projection, Reference Boundary, compiler and generator chain are all RED.
- R8.6 Golden remains frozen and test-bound.
- Web-first smoke remains `PROTECTED_BASELINE_INFRASTRUCTURE`.

## 7. Test version topology

- CURRENT_WEB_SMOKE: protected Web primary smoke.
- PIPELINE/CURRENT REGRESSION: root and Desktop tests, including R8.6/R9/R10/R11/R2 families.
- LEGACY_DESKTOP_SMOKE: V6/V18.1-named scripts; several remain package-script entrypoints.
- LAB TESTS: visual-translation v2 directly tests/imports v1; Space v1-experimental has multiple named root scripts.
- HISTORICAL EVIDENCE: frozen smoke outputs not imported by current tests are historical references; those bound by manifests/hashes remain TEST_DEPENDENCY.

## 8. Archive candidates

```text
High confidence: 0
Medium confidence: 0
Low confidence: 0
```

Strict threshold produced no archive candidates. `space-r10-archive` manual scripts and ignored/local histories remain UNKNOWN because absence of package imports does not rule out operator or filesystem use.

## 9. Important unknowns

- Whether `apps/desktop/scripts/space-r10-archive/*` is still part of a manual acceptance procedure.
- Intended lifecycle of ignored `assets/`, `.packet/`, `.workbuddy/` and local review content.
- Whether all standalone historical-looking smoke runners remain operationally required outside package scripts.
- A standalone R12 production compiler was not found; R12-named continuation evidence cannot be mapped beyond smoke iteration without additional authority.

Default decision for every unknown: `KEEP`.

## 10. Acceptance checklist

- [x] Repository inventory and top-level map
- [x] Version pattern scan and registry
- [x] Version families/topology
- [x] Web-to-version runtime map
- [x] CLI and dynamic dependency audit
- [x] Prompt/compiler audit
- [x] Reference-First and Space audit
- [x] Packaging and schema audit
- [x] Visual analysis/provider audit
- [x] Test/smoke topology
- [x] Duplicate detection
- [x] Targeted Git history evidence
- [x] Archive threshold report
- [x] Hot-zone map
- [x] UNKNOWN protection

## 11. Safety summary

```text
Production files deleted: 0
Production files moved: 0
Production files renamed: 0
Core logic modified: NO
Prompt modified: NO
Compiler modified: NO
Reference First modified: NO
Generator modified: NO
Provider modified: NO
Desktop modified: NO
Web runtime modified: NO
Repository cleanup performed: NO
S1 started: NO
```

## 12. S0 decision

S0 = PASS. The repository now has an evidence-backed topology, but S0 grants no cleanup permission. Work stops here pending explicit authorization for S1 Current Baseline Freeze.
