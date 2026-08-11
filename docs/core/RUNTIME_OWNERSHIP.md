# Runtime Ownership

## Product roles

- Web is the primary product UI runtime.
- Shared packages own reusable business capability boundaries.
- Desktop is a legacy Electron host and adapter.
- CLI is a legacy/tooling adapter; its v5 module remains an active internal dependency of Visual Analysis.
- `archive/` is historical-only and is forbidden from production imports.

## Capability owners

| Capability | Owner | Host/adapters | Remaining internal implementation debt |
|---|---|---|---|
| Visual Analysis completion contract | `@masterpiece/analysis-runtime/core/visual-analysis-core.ts` | Desktop prompt-root adapter and pipeline service | CLI v5 bootstrap and prompts remain active; broader pipeline composition remains Desktop-hosted |
| Reference resolution | `@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts` | Desktop compatibility re-export | Compatibility path remains until S6 |
| Space generation | `@masterpiece/image-generation-runtime/core/space-generation-core.js` | Desktop/Web-hosted services consume facade | vNext, Phase9B and R8.6-R11 names remain internal active implementations |
| Packaging generation | `@masterpiece/image-generation-runtime/core/packaging-generation-core.js` | Desktop/Web-hosted services consume facade | Historical compiler/gate modules remain internal |
| Provider adapters | Existing `@masterpiece/model-runtime` and image-provider packages | Credentials are resolved by the current host | Desktop settings store still owns Electron `safeStorage` integration |
| Schemas/contracts | Existing `@masterpiece/*-contracts` packages | All runtimes | No S4 semantic changes |

## Forbidden dependency directions

```text
Shared Core -> apps/desktop
Web renderer -> Desktop main business modules
Production -> archive
Current generation consumer -> historical version namespace
```

Architecture tests enforce these static directions. They do not claim process independence: the current Web launch path still uses Electron. Replacing Electron settings/storage and main-process composition with a Node/local-RPC host is the remaining runtime-decoupling blocker.

