# Runtime Ownership

## Product roles

- `apps/web` owns the only production UI.
- `apps/web-runtime` owns Node lifecycle, local RPC, credentials, paths and
  native filesystem operations.
- `@masterpiece/runtime-core` owns application service composition,
  orchestration, persistence semantics and the 136-operation business
  registry.
- Shared capability packages own analysis, reference, generation, provider
  and contract behavior.
- `apps/cli` remains an active tooling adapter and Visual Analysis dependency.
- `labs/`, `evaluation/` and `archive/` are isolated from production imports.

## Capability owners

| Capability | Owner | Host adapter |
|---|---|---|
| Visual Analysis | `@masterpiece/analysis-runtime` + CLI v5 prompts | Node Web Host path adapter |
| Reference resolution | `@masterpiece/image-generation-runtime/reference-engine` | Shared Runtime |
| Space/packaging generation | Image Generation Runtime Core facades | Shared Runtime + provider adapters |
| Provider/model execution | model and image-provider packages | Node credential/settings stores |
| Application services | `@masterpiece/runtime-core/application` | Node Web Host |
| Business dispatch | Shared Operation Registry (136) | local RPC |
| Native operations | `apps/web-runtime/src/node-native-operations.ts` (11) | Node Web Host |
| UI | `apps/web` | browser RPC client |

## Forbidden directions

```text
Shared Core/Runtime -> apps/web-runtime
Shared Core/Runtime -> apps/web
Current Production -> Desktop/Electron
Web Renderer -> Node Host implementation
Production -> labs/evaluation/archive
```

Current topology contains no Desktop workspace or Electron runtime dependency.
