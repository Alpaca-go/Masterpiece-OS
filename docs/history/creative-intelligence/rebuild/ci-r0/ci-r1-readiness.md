# CI-R0 Final Report and CI-R1 Readiness

Branch: `codex/creative-intelligence-r0-audit`  
Base HEAD: `ce0e6f7f`  
Production code delta: **0**  
Docs delta: five CI-R0 audit documents

## Required conclusions

| Required output | Result |
|---|---|
| Capability inventory | Complete in `legacy-capability-audit.md` |
| Dependency map | Complete in `integration-boundary.md` |
| Reuse matrix | Complete in `reuse-matrix.md` |
| Data-model gap | Complete in `data-model-gap.md` |
| Real-search decision | **NO**; `ReferenceSearchGateway` required |
| UI reuse map | Complete in `integration-boundary.md` |
| Golden regression set | Defined below |
| Proposed integration boundary | **NEW DOMAIN + ADAPTERS** |
| Deprecation plan | Defined in `integration-boundary.md`; nothing deleted now |
| CI-R1 readiness | **CONDITIONAL GO** |

## Golden regression set

These are existing repository commands, not invented aliases.

| Gate | Command | Protects |
|---|---|---|
| Repository contract | `npm run verify:repository-contract` | Current authorities, boundaries, compatibility, Prompt/Golden integrity |
| Workspace boundaries | `npm run verify:workspace-boundaries` | Package dependency and export boundaries |
| Production boundaries | `npm run verify:production-boundaries` | No Desktop/archive/lab imports |
| Current flows | `npm run verify:current-flows` | Document parsing/delivery, Runtime application, Node Host and Web typecheck |
| Repository aggregate | `npm run repo:verify` | All offline repository/analysis guards |
| Root behavior suite | `npm test` | Current CI, Creative Production, image generation and shared contracts |
| CLI analysis | `npm run cli:test` | Current analysis engine and document preparation |
| Runtime application | `npm run runtime:test` | Document, project/context, Reference First, CI/production services |
| Web Runtime | `npm run web-runtime:test` | Node adapters, data paths, operation host |
| Web smoke | `npm run web:smoke` | Real Node Host + browser UI, zero provider calls/writes |
| Golden | `npm run golden:test` | Frozen behavior evidence |
| Full local product | `npm run repo:check` | Aggregate + root/CLI/runtime/Web/Golden |

The following existing test families are mandatory targeted evidence whenever
their corresponding adapter changes:

- `tests/packages/creative-intelligence/current/*.test.js`
- `tests/packages/creative-intelligence/*.test.js`
- `tests/packages/creative-production-runtime/*.test.js`
- `tests/packages/document-ingestion/*.test.js`
- `tests/packages/runtime-core/context-document-reference-operations.test.js`
- `tests/runtime-application/document-context-service.test.ts`
- `tests/runtime-application/visual-translation-document-processing.test.ts`
- `tests/runtime-application/reference-*.test.ts`
- `tests/runtime-application/asset-selection-protocol.test.ts`
- `tests/runtime-application/web-asset-upload-contract.test.ts`
- `tests/image-generation/space-*.test.js`
- `tests/image-generation/packaging-*.test.js`

Prompt, provider request shape, Reference First, image generation, Packaging or
Space changes require their stricter existing gates; CI-R1 Foundation should
avoid those changes.

## CI-R1 entry conditions

CI-R1 may create only the new domain foundation and adapter interfaces after:

- [x] Current authorities confirmed.
- [x] Current and historical CI distinguished.
- [x] Runtime consumers traced through construction, RPC and Web invocation.
- [x] Document/file pipeline and persistence mapped.
- [x] Project, asset, session and context persistence mapped.
- [x] Reference First reuse boundary mapped.
- [x] Provider/model/credential authority mapped.
- [x] UI reuse map completed.
- [x] Real search determined to be absent.
- [x] V1 model gaps identified.
- [x] Packaging, Space, Prompt, Provider and Golden protection listed.
- [ ] Existing `repo:verify` failure in two Web architecture assertions is
  resolved or explicitly baselined in a separate change.
- [ ] Stale Desktop paths in baseline narrative/manifest are reconciled by the
  repository-governance owner or explicitly recorded as immutable historical
  baseline paths.

## Verdict

```text
CONDITIONAL GO — CI-R1 New Domain Foundation
```

The architecture decision is clear enough to begin a bounded foundation:
new V1 contracts and ports, no provider implementation, no UI switch, and no
production consumer migration. It is not an unrestricted GO because the
repository aggregate gate is currently red on two pre-existing Web
architecture assertions, and baseline documentation contains known current
path drift.

## CI-R1 blockers and non-blockers

Blockers to declaring an unconditional GO:

1. `verify:current-flows` currently fails the existing assertions
   `analysis UI contains intake actions and a free-form API Profile provider`
   and `analysis API selection is controlled by App and survives settings navigation`.
2. Baseline path drift needs an explicit governance disposition.

Not blockers to a bounded domain foundation:

- Real search is absent; this is an expected new port (`ReferenceSearchGateway`),
  not permission to fake search.
- PPT/PPTX is absent; the foundation can declare the parser port without
  claiming support.
- Current CI remains live; parallel domain contracts can be introduced without
  switching consumers.

## Recommended next step

Create CI-R1 as a separate, narrowly scoped change containing:

1. V1 domain contracts and state invariants;
2. repository/port interfaces for session, brief, search, reference selection,
   preference evidence and Direction Board;
3. adapter interface definitions for current Document, Asset, Model and
   Generation authorities;
4. deterministic contract tests;
5. no provider, UI, RPC consumer switch, Packaging or Space implementation.

Do not start CI-R2 search-provider implementation or migrate the current CI
entry point during CI-R1.
