# Runtime Ownership

## Product roles

- Web is the primary product UI runtime.
- Shared Core packages own reusable domain capability boundaries.
- `@masterpiece/runtime-core` owns current application orchestration, persistence semantics, service composition and business operation dispatch.
- Desktop is a legacy Electron host and adapter.
- CLI is a legacy/tooling adapter; its v5 module remains an active internal dependency of Visual Analysis.
- `archive/` is historical-only and is forbidden from production imports.

## Capability owners

| Capability | Owner | Host/adapters | Remaining internal implementation debt |
|---|---|---|---|
| Visual Analysis completion contract | `@masterpiece/analysis-runtime/core/visual-analysis-core.ts` | Shared Analysis Runtime plus Desktop prompt-root adapter | CLI v5 bootstrap and prompts remain active |
| Reference resolution | `@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts` | Shared Reference Runtime; Desktop compatibility re-export | Compatibility path remains until S6 |
| Space generation | `@masterpiece/image-generation-runtime/core/space-generation-core.js` | Shared Image Generation Runtime consumes facade | Historical internal implementation names remain active behind the facade |
| Packaging generation | `@masterpiece/image-generation-runtime/core/packaging-generation-core.js` | Shared Image Generation Runtime consumes facade | Historical compiler/gate modules remain internal |
| Provider adapters | Existing `@masterpiece/model-runtime` and image-provider packages | Credentials are resolved by the current host | Desktop settings store still owns Electron `safeStorage` integration |
| Schemas/contracts | Existing `@masterpiece/*-contracts` packages | All runtimes | No S4 semantic changes |
| Application service graph | `@masterpiece/runtime-core/application/runtime-services.ts` | Electron host today; future Node host in S4.1R | Host adapters remain to be replaced for Desktop-off Web |
| Business operation dispatch | `@masterpiece/runtime-core` Shared Operation Registry | Electron IPC/Web RPC adapters | Eleven native channels remain intentionally Desktop-only |

## Forbidden dependency directions

```text
Shared Core -> apps/desktop
Shared Runtime -> apps/desktop
Shared Runtime -> electron
Operation Registry -> apps/desktop
Operation Registry -> electron
Web renderer -> Desktop main business modules
Production -> archive
Current generation consumer -> historical version namespace
```

Architecture tests enforce these static directions and directly compose the current service graph with Electron and Desktop off. They do not claim Web process independence: the current Web launch path still uses Electron. Replacing Electron settings/credentials/path adapters and RPC binding with a Node host is S4.1R scope.
