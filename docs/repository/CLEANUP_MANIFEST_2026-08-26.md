# Repository Cleanup Manifest — 2026-08-26

Status: **CLOSED RETIREMENT LEDGER**

This manifest records retired path families removed during repository cleanup.
It is not a current authority registry and does not reproduce the full Git
diff. The source material remains recoverable from Git history. Material moved
into the tracked `archive/` tree continues to be governed separately by
`archive/ARCHIVE_REGISTRY.md`.

The principal cleanup batches are commits `70f63ca0` (versioned artifact
consolidation) and `d980a78e` (lifecycle organization). Recovery means reading
or restoring an explicitly selected path from its parent commit; it does not
authorize restoring an entire retired tree to current production.

| Batch | Previous path / family | Classification | Runtime consumer | Test dependency at retirement | Replacement / authority | Action | Recovery |
|---|---|---|---|---|---|---|---|
| RC-SPACE-01 | `space-generator/v1-experimental/**` | Historical experimental and evaluation tree | None in current production | Historical experiment tests and scripts were retired or consolidated | `packages/image-generation-runtime/src/space` and current Space tests | Removed from the working tree in `70f63ca0`; production architecture assets were migrated to the tracked runtime asset registry | Git history before `70f63ca0` |
| RC-SPACE-02 | `space-generator/v1-baseline/**`, retired `space-generator/quality-baselines/**`, and superseded version-labelled Space reports | Historical comparison, smoke, and acceptance evidence | None in current production | Selected current behavior evidence was renamed or moved into maintained Golden/evaluation assets; obsolete copies were retired | Current Space authority plus `evaluation/`, `golden/standard-space`, and current tests | Removed or consolidated in `d980a78e`; no bulk archive copy was created | Git history before `d980a78e` |
| RC-CI-01 | `docs/creative-intelligence/ci-0` through `ci-9` and `docs/creative-intelligence/ci-w1*` | Historical phase implementation and qualification evidence | Documentation only | No deterministic current test dependency | Creative Intelligence application authority under `packages/runtime-core/src/application`; maintained tests under `tests/packages/creative-intelligence/current` | Historical phase documents removed in `d980a78e`; current tests retained or renamed by capability | Git history before `d980a78e` |
| RC-CI-02 | `tests/packages/creative-intelligence/ci-*` and `ci-w1*` | Version-labelled historical qualification suites | None in production | Current-value cases were retained under `tests/packages/creative-intelligence/current`; redundant phase suites were retired | Current Creative Intelligence tests and repository gates | Removed or renamed by capability in `d980a78e` | Git history before `d980a78e` |
| RC-CI-03 | `apps/web-runtime/scripts/ci-w1c/**` | One-shot qualification and evidence-extraction harness | None; not part of the Node Host runtime | Manual qualification harness only | Current runtime/application tests, analysis guards, repository gates, and zero-provider Web smoke | Removed in `d980a78e` | Git history before `d980a78e` |
| RC-ANALYSIS-01 | `scripts/a2-*` | Historical corpus evaluation, bundle, and judge tooling | None in production | Standalone evaluation tooling | Current analysis engine tests, `evaluation/`, and analysis release guards | Retired in `70f63ca0` | Git history before `70f63ca0` |
| RC-ANALYSIS-02 | `scripts/a3-provider-health-probe.mjs` and version-labelled A3 tests | Historical stage-labelled provider health tooling | Provider probe only; no runtime authority | Relevant cases retained under capability names | `scripts/probe-analysis-provider-health.mjs` and provider capability tests | Renamed or consolidated across `70f63ca0` and `d980a78e` | Follow rename history from `70f63ca0` / `d980a78e` |
| RC-ANALYSIS-03 | `scripts/verify-a4-*` and related A4 guard tests | Historical stage-labelled release guards | None in production | Guard behavior remains required | Capability-named `verify-analysis-*`, `verify-runtime-isolation`, `verify-secret-safety`, and `tests/analysis-release-guards.test.js` | Renamed or consolidated in `70f63ca0` | Follow rename history from `70f63ca0` |
| RC-PACKAGING-01 | Version- or phase-labelled Packaging acceptance and runtime-application test families | Historical acceptance naming and duplicated qualification coverage | None as standalone runtime modules | Maintained behavior cases retained under capability names | Current packaging contract tests, task schema compatibility tests, and runtime application tests | Removed, consolidated, or renamed by capability in `70f63ca0` / `d980a78e` | Follow Git history for the specific former test path |

## Closure rules

- Do not restore these families merely because a historical identifier is
  needed for research; inspect them in Git first.
- Do not import retired material from current production.
- Do not use this manifest to redefine current capability authority or
  compatibility policy.
- Add a new row only for a reviewed cleanup batch with an explicit current
  replacement or retirement rationale.
