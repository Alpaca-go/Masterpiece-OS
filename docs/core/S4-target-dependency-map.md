# S4 Target Dependency Map

## Before S4

```text
Web renderer
  -> Electron Desktop main host
     -> Desktop business services
        -> CLI v5 module / prompts v5
        -> image-generation vnext / space historical topology
        -> Desktop reference resolver
```

## Implemented after S4

```text
Web renderer
  -> local RPC
     -> Electron Desktop main host                    REMAINING HOST BLOCKER
        -> Desktop service composition                REMAINING ADAPTER DEBT
           -> Visual Analysis Core facade
              -> CLI v5 module / prompts v5            INTERNAL_ACTIVE
           -> Reference Engine
           -> Space Generation Core facade
              -> vnext / Phase9B / R8.6-R11 internals  INTERNAL_ACTIVE
           -> Packaging Generation Core facade

Desktop renderer
  -> Desktop IPC adapter
     -> the same Shared Core boundaries
```

## Desired S5 entry graph

```text
Web renderer
  -> Node/local RPC runtime host
     -> Shared Core

Desktop renderer
  -> Desktop adapter
     -> Shared Core
```

The Shared Core to Desktop direction is zero. Current named generation consumers have zero direct imports of `@masterpiece/image-generation-runtime/vnext` or `/space`; historical topology is contained behind the owning facade. The Web process is not yet independent: `web:smoke` still starts Electron and main-process service composition, so the desired S5 graph has not been reached.

## Metrics

| Metric | Before | After |
|---|---:|---:|
| Renderer static imports of Desktop main business services | 0 | 0 |
| Shared packages importing Desktop | 0 | 0 |
| Current named generation consumers importing historical runtime namespaces | 4 | 0 |
| Shared capability boundaries introduced | 0 | 4 |
| CLI process spawns for analysis | 0 | 0 |
| CLI v5 module dependency | 1 | 1 |
| Desktop process required by Web smoke | YES | YES |

