# S4 Final Report — Core Extraction & Runtime Decoupling

## Result

```text
S4_EXTRACTION_BATCHES = PASS
S4_RUNTIME_DECOUPLING = PASS_WITH_REMAINING_ADAPTERS
S5_READINESS = S5_NOT_READY
```

Facade-first ownership extraction completed without intentional behavior changes. Web runtime process independence did not pass: the current Web smoke still launches Electron, so Desktop removal is forbidden.

## Starting state

| Field | Value |
|---|---|
| Branch | `codex/stabilization-s4-core-extraction` |
| Starting commit / S3 commit | `0227ec7` |
| Recovery tag | `masterpiece-reference-first-stable-2026-08` (`a17eee3`) |
| Starting working tree | CLEAN |
| Entry regression | Unit 711/711; CLI 40/40; Web PASS; Golden 5/5 |

## Extraction summary

Capabilities extracted or bounded:

- Reference Engine implementation moved to the shared image-generation runtime; the old Desktop path is `COMPATIBILITY_ONLY`.
- Space Generation Core facade contains historical vNext/space topology for current consumers.
- Packaging Generation Core facade contains compiler, migration, gates, fingerprints, verification and redaction topology.
- Visual Analysis Core facade owns the shared completion contract; Electron prompt-root resolution is injected through a Desktop adapter.

New Core modules: 4. Business implementations duplicated: 0. Desktop deleted: NO. CLI v5 deleted: NO.

## Runtime decoupling

| Metric | Before | After |
|---|---|---|
| Web renderer static imports of Desktop main services | 0 | 0 |
| Web business runtime dependency on Desktop host | PRESENT | PRESENT — BLOCKER |
| Shared Core imports of Desktop | 0 | 0 |
| Named current generation consumers importing historical runtime namespaces | 4 | 0 |
| CLI process dependency | 0 | 0 |
| CLI v5 module dependency | 1 | 1 (`INTERNAL_ACTIVE`) |
| Desktop process required for Web smoke | YES | YES |

Desktop-off verification result: **FAIL / NOT AVAILABLE**. `npm run web:smoke` invokes `run-web-primary-smoke.mjs`, which spawns `electron-vite`; the observed verification log explicitly built and started the Electron main process. `settings-store.ts` also imports Electron `app` and `safeStorage`. A Node/local-RPC host with storage/config adapters does not yet exist.

## Capability ownership

| Capability | Current owner |
|---|---|
| Visual Analysis boundary | `@masterpiece/analysis-runtime/core/visual-analysis-core.ts` |
| Reference First resolution | `@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts` |
| Space | `@masterpiece/image-generation-runtime/core/space-generation-core.js` |
| Packaging | `@masterpiece/image-generation-runtime/core/packaging-generation-core.js` |
| Providers | Existing `@masterpiece/model-runtime` and image-provider packages |
| Schemas | Existing `@masterpiece/*-contracts` packages |

The broader Visual Analysis pipeline, project storage, credentials and RPC composition remain Desktop-hosted adapters/debt. Visual Analysis is therefore no longer exclusively defined by an Electron path contract, but it is not yet a standalone Web runtime service.

## Historical debt remaining

| Layer | Status |
|---|---|
| CLI v5 / prompts v5 | `INTERNAL_ACTIVE`, `CLI_V5_CORE_EXTRACTION_INCOMPLETE`, `DEFER_TO_S6` |
| vNext | `INTERNAL_ACTIVE` behind Space Core, `DEFER_TO_S6` |
| Phase9B | `INTERNAL_ACTIVE` behind Space Core, `DEFER_TO_S6` |
| R8.6 | `INTERNAL_ACTIVE` quality/golden contract, `DEFER_TO_S6` |
| R10 | `INTERNAL_ACTIVE` semantic repair, `DEFER_TO_S6` |
| R11 | `INTERNAL_ACTIVE` continuation behavior, `DEFER_TO_S6` |
| R11.2 | `INTERNAL_ACTIVE` target-scene behavior, `DEFER_TO_S6` |
| Desktop reference resolver old path | `COMPATIBILITY_ONLY`, remove in S6 |

## Final verification

| Gate | Result |
|---|---|
| Unit | PASS — 719/719 |
| CLI | PASS — 40/40 |
| Desktop build | PASS |
| Repository release gates | PASS — version, naming, workspace, obsolete-code, production, project-rule, Golden boundary and current-flows |
| Web smoke | PASS — provider calls 0, business writes 0; Electron host used |
| Golden | PASS — 5/5; provider calls 0; auto-update NO |
| G-01 | PASS — `VISUAL_MANUAL_ACCEPTED` |
| G-02 | PASS — `VISUAL_MANUAL_ACCEPTED` |
| G-03 | PASS — `VISUAL_MANUAL_ACCEPTED` |
| G-04 | PASS — `NOT_APPLICABLE` in current Golden corpus |
| G-05 deterministic | PASS — `NOT_READY` for visual acceptance |
| Archive boundary | PASS |
| Desktop-off Web smoke | FAIL / NOT AVAILABLE — Electron is the current host |

The S2 baseline drift checker reports the intentionally changed S4 production files. Golden expectations were not changed; the Golden suite and archive boundary both pass. This report records that drift rather than mutating the frozen S2 manifest.

## Architecture guards

- Production to archive: 0 (existing archive guard PASS).
- Shared Core to Desktop: 0 (new guard PASS).
- Web renderer to Desktop main business imports: 0 (new guard PASS).
- Current named generation consumers to historical runtime namespaces: 0 (new guard PASS).
- Visual Analysis pipeline direct Electron import: 0 (new guard PASS).
- Web runtime host dependence on Electron: PRESENT (documented S5 blocker).

## Safety summary

| Change | Intentional? |
|---|---|
| Production behavior changed | NO |
| Prompt semantics changed | NO |
| Compiler semantics changed | NO |
| Reference behavior changed | NO |
| Generator behavior changed | NO |
| Schema semantics changed | NO |
| Provider behavior changed | NO |
| Desktop deleted | NO |
| CLI v5 deleted | NO |
| Historical implementations deleted | NO |
| Golden updated | NO |
| Naming cleanup performed | NO |

## S5 blockers

1. Replace Electron-hosted settings and `safeStorage` with an explicit runtime config/credential adapter suitable for a Node/local-RPC host.
2. Move main-process service composition into a host-neutral Runtime Service entrypoint.
3. Make Web start/smoke launch that host without `electron-vite` or an Electron process.
4. Re-run Unit, CLI, Web, Golden and Desktop-off verification before declaring `S5_READY`.
