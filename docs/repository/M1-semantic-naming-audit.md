# M1 Semantic Naming Audit

Status: COMPLETE  
Date: 2026-08-12  
Scope: current Web, CLI analysis, Shared Runtime, and model-runtime source.

The audit target is zero unexplained current semantic debt, not zero textual occurrences of historical labels.

| Match | Representative location | Classification | Action | Compatibility reason |
|---|---|---|---|---|
| `Web / v5`, `Desktop / v5` | `apps/web/src/App.tsx` | CURRENT_PRODUCT_COPY | Replaced with `Web`; removed obsolete branch | None |
| `Project Visual Context vNext` | Web and project-context errors | CURRENT_PRODUCT_COPY | Replaced with `Project Visual Context` | Persisted filename and fields remain unchanged |
| `Reference-First (R11.2.2)` | Short-Chain UI | CURRENT_PRODUCT_COPY | Replaced with `Reference First` | None |
| `v5 Logo Locked` | Short-Chain UI | CURRENT_PRODUCT_COPY | Replaced with `Logo Locked` | None |
| `v5 Pipeline` | CLI/runtime messages | CURRENT_PRODUCT_COPY | Replaced with `Visual Analysis Pipeline` | None |
| `r11-cont-*` new IDs | Short-Chain Continuation UI | CURRENT_RUNTIME_IDENTIFIER | New writes use `continuation-*` | Existing task IDs are opaque and remain readable |
| `V5ConfigError` | CLI analysis config | CURRENT_INTERNAL_SYMBOL | `AnalysisConfigError` | Internal only |
| `createV5ProjectConfig` | CLI analysis config | CURRENT_INTERNAL_SYMBOL | `createAnalysisProjectConfig` | Internal only |
| `writeV5RunReport` | CLI telemetry | CURRENT_INTERNAL_SYMBOL | `writeAnalysisRunReport` | Internal only |
| `deep-creative-director-provider-v5` | analysis implementation | CURRENT_INTERNAL_SYMBOL | Canonical ID is `deep-creative-director-provider` | No persisted or external consumer found |
| Desktop factual/report/API symbols | Shared Runtime/Web | CURRENT_INTERNAL_SYMBOL | Renamed to analysis/runtime semantics | No Desktop runtime authority remains |
| `masterpiece-os-v5.json` | CLI/runtime config discovery | LEGAL_COMPATIBILITY | Preserved | Existing project config filename |
| `visualContextVNext*`, `.vnext.json` | project records/context | LEGAL_COMPATIBILITY | Preserved | Existing persisted project contract |
| `image-generation-vnext`, `vnext-1.0`, `pipelineMode=vnext` | Short-Chain artifacts | LEGAL_COMPATIBILITY | Preserved | Existing run/session/artifact contract |
| `VNEXT_*` codes/events | Short-Chain runtime | LEGAL_COMPATIBILITY | Preserved | Existing diagnostic and persisted trace vocabulary |
| `r8_6_golden`, `phase9b_quality`, `vnext_legacy` | Space generation | LEGAL_COMPATIBILITY | Preserved | Configuration, provenance, and Golden contract |
| R11/Phase labels in historical comments/tests | tests and implementation archaeology | HISTORICAL | Not mass-renamed | Behavior evidence, not a current product name |

## Final metrics

- Known Current Product Copy Debt: 0
- New Historical-stage Runtime IDs: 0
- Unexplained Current V5* Symbols: 0
- Unexplained Current R11* Symbols: 0
- Misleading Current Desktop Semantics: 0
- Legal Compatibility Legacy Names: 6 classified families
- Unknown Naming Matches: 0
- Existing projects rewritten: NO
- Persisted schema changed: NO

Encoding audit remains DEFERRED. The previously known mojibake comments in `application-contracts.ts` were not expanded into this phase.
