# S4 Compatibility Adapters

| Adapter | Old Consumer | New Core | Needed Until | Removal Phase |
|---|---|---|---|---|
| `apps/desktop/src/main/reference-asset-resolver.ts` (`COMPATIBILITY_ONLY`) | Historical Desktop imports and rollback | Image Generation Runtime / Reference Engine | All consumers use the package export | S6 |
| `apps/desktop/src/main/analysis-runtime-adapter.ts` | Desktop startup and authorized Desktop smoke runners | Analysis Runtime / Visual Analysis Core contract | Desktop host exists | S5 |
| `space-generation-core.js` internal re-exports | Consumers formerly aware of `vnext`, `space`, Phase9B and later behavior layers | Image Generation Runtime / Space Core | Historical implementations are capability-renamed | S6 |
| `packaging-generation-core.js` internal re-exports | Packaging service formerly aware of compiler/gate file topology | Image Generation Runtime / Packaging Core | Historical internals are capability-renamed | S6 |
| CLI v5 dynamic module loading in `pipeline-service.ts` | Visual Analysis pipeline | Future shared analysis execution module | CLI v5 capability extraction completes | S6 |

Adapters translate paths or expose one existing implementation. None contains a second business implementation. New production consumers must use a Shared Core facade rather than an old Desktop or historical runtime path.

