# S4 Space Capability Map

This map translates historical implementation names into the current capability graph. It does not rename or merge implementations.

| Historical name | Current capability | Evidence | S4 ownership decision |
|---|---|---|---|
| `vNext` | Image-generation orchestration, task contract routing and compatibility fallback | `vnext/compile.js`, task contracts and route tests | Encapsulate behind Space Core facade |
| `Phase9B` | Current deterministic Space prompt compiler and source adapter | default compiler route and block-order tests | Internal active implementation |
| `R8.6` | Frozen parity identity, block ordering and quality contract | protected manifest and Golden G-02 | Internal active quality baseline |
| `R9` | Production route and packaging separation | route/trace tests | Internal active production layer |
| `R10` | Reference policy, semantic repair and route-integrity behavior | Reference First and semantic gate tests | Internal active behavior layer |
| `R11` | Continuation contract and generated-output lineage | continuation tests and Golden G-03 | Internal active behavior layer |
| `R11.2` | Target-scene authority, program override and leakage prevention | target-scene tests and Golden G-01/G-03 | Internal active behavior layer |

## Capability graph

```text
Space Generation Core facade
  -> orchestration
  -> task contract
  -> reference context
  -> scene and mode policy
  -> continuation policy
  -> target-scene authority
  -> deterministic compiler
  -> quality and provider-prompt gates
  -> provider payload adapter
```

The facade may call the historical internal graph during S4. New Web/Desktop consumers must depend on the capability facade rather than individual historical implementation paths.
