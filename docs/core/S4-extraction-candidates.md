# S4 Extraction Candidates

| Capability | Current Owner | Consumers | Desktop Coupling | Version Debt | Golden Coverage | Decision |
|---|---|---|---|---|---|---|
| Reference asset resolution | Desktop `reference-asset-resolver.ts` | vNext service, Desktop tests | None; pure Node filesystem input | None | G-01, G-03 plus resolver tests | EXTRACT_NOW |
| Space compilation facade | image-generation runtime historical `vnext`/`space` paths | Desktop vNext service, tests, scripts | None | vNext, Phase9B, R8.6–R11.2 | G-01, G-02, G-03 | EXTRACT_NOW |
| Packaging compilation facade | image-generation runtime task/deliverable paths | Desktop image service, tests | None | task 1.0/2.0/3.0 compatibility | G-05 | EXTRACT_NOW |
| Visual Analysis orchestration | Desktop `pipeline-service.ts` | Web RPC, Desktop IPC | Electron prompt-root resolution | CLI v5 and prompts/v5 | G-04 | ADAPTER_FIRST |
| Reasoner boundary | Desktop pipeline + model-runtime Qwen adapter | Visual Analysis | Credentials supplied by Desktop settings | Qwen name only | G-04 | EXTRACT_NOW |
| Analysis schema registry | Desktop `model-schema/*` | Pipeline and tests | None | Historical Desktop location | G-04 | KEEP_TEMPORARILY |
| Project store / filesystem | Desktop `project-store.ts` | Nearly every service | Node filesystem; config path supplied by settings | None | Unit + Web smoke | ADAPTER_FIRST |
| Settings and credentials | Desktop `settings-store.ts` | Provider-backed services | Electron `app` and `safeStorage` | None | Web smoke config check | DEFER |
| Image run persistence | Desktop image service/run store | Space and Packaging execution | Node filesystem plus shell/open-folder host action | V1/V2/V3 persistence | G-01–G-03, G-05 | ADAPTER_FIRST |
| Full Web backend host | Electron main `index.ts` | Web renderer | Electron lifecycle, dialogs, shell and safeStorage | Desktop host topology | Web smoke | DEFER until storage/config adapters exist |
| Desktop lifecycle/UI | Electron main and renderer | Legacy Desktop | Electron-specific by definition | Legacy shell | Desktop build/test | KEEP_TEMPORARILY |

## Decision notes

- `EXTRACT_NOW` means behavior-preserving ownership/facade work with no prompt, compiler, provider, schema, or generation-quality change.
- `ADAPTER_FIRST` means the host dependency must be injected before a file can be safely moved.
- `DEFER` means attempting extraction now would require a behavior or credential-storage change outside the S4 safety budget.
- Versioned names are not used as evidence for extraction or deletion.

