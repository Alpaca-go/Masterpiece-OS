# CI-R1 Final Report

Branch: `codex/creative-intelligence-r1-domain-foundation`

Base: `4128084a4056c8c70cef262f53f40ae536508996`

Working-tree HEAD before CI-R1 commit: `4128084a4056c8c70cef262f53f40ae536508996`

## Scope

CI-R1 establishes a host-neutral Creative Research domain foundation inside
the current Runtime Core application authority. It defines semantic contracts,
deterministic state and evidence invariants, repository/capability ports,
current-authority adapter contracts and boundary tests.

CI-R1 does not implement orchestration, persistence, Provider calls, real
search, PPT/PPTX parsing, UI, RPC operations or current-consumer migration.

## Files Changed

Production foundation:

- `packages/runtime-core/src/application/creative-research/contracts.ts`
- `packages/runtime-core/src/application/creative-research/evidence.ts`
- `packages/runtime-core/src/application/creative-research/invariants.ts`
- `packages/runtime-core/src/application/creative-research/direction-context.ts`
- `packages/runtime-core/src/application/creative-research/ports.ts`
- `packages/runtime-core/src/application/creative-research/adapter-contracts.ts`
- `packages/runtime-core/src/application/creative-research/search-contract.ts`
- `packages/runtime-core/src/application/creative-research/index.ts`

Existing guard, minimally extended:

- `scripts/verify-production-boundaries.mjs`

Tests:

- `tests/runtime-application/creative-research-contracts.test.ts`
- `tests/runtime-application/creative-research-invariants.test.ts`
- `tests/runtime-application/creative-research-ports.test.ts`

Report:

- `docs/creative-intelligence/rebuild/ci-r1/final-report.md`

## Production Delta

The production delta is an unconsumed semantic foundation only. The package's
existing wildcard export exposes the new subpath without changing a package
manifest or a consumer. No service is constructed, no operation is registered,
and no disk/network/model implementation exists.

The existing production-boundary guard now enforces that files in
`creative-research/` can import only other files in that namespace. This keeps
the foundation isolated from Provider SDKs, filesystem APIs, browser code,
Packaging, Space, image-generation runtime, Desktop and historical modules.

## Domain Contracts

- `CreativeResearchSession` with exactly `INTAKE`, `RESEARCH`, `DIRECTION`,
  `COMPLETED`
- `DesignBrief` with monotonic revision, traceable document evidence and
  designer/AI keyword provenance
- `SearchKeyword`
- `SearchQuery`
- `ReferenceItem` as a discriminated union of `WEB_REFERENCE`,
  `USER_REFERENCE`, `AI_EXPLORATION`
- `ReferenceSelection`
- `ReferenceRegion` using `NORMALIZED_0_1`
- `NegativeSignal`
- `PreferenceInsight`
- `DirectionBoard`
- read-only `CreativeDirectionContext`

All domain values use plain JSON-compatible data, ISO 8601 strings and
provider-neutral IDs. The new session and brief contracts do not alias the
current `CreativeSession` or `CreativeIntelligenceRun` lifecycle.

## State Invariants

- `INTAKE -> RESEARCH` requires the active Design Brief and at least one
  enabled keyword.
- `INTAKE -> DIRECTION` is rejected.
- `RESEARCH -> DIRECTION` requires a designer-selected reference.
- `DIRECTION -> RESEARCH` is allowed.
- `RESEARCH -> INTAKE` is a reanalysis transition that requires the next brief
  revision and proves preservation of search, selection/rejection and negative
  evidence history.
- `DIRECTION -> COMPLETED` requires the active Direction Board and a matching,
  boundary-valid Creative Direction Context.
- A completed session cannot be destructively reset through this transition
  contract.

## Evidence Invariants

- A finalized Preference Insight must cite reference, region or negative
  evidence.
- A Direction Board must use designer-selected references; notes are
  supplementary, not a zero-evidence substitute.
- Negative Signals require a real designer actor and a type-appropriate source.
- Web references require absolute source/canonical URLs, provider, publisher,
  query, rank and retrieval time.
- User references require a Project Asset identity and cannot claim Web URLs.
- AI exploration requires generation provenance and cannot claim Web search
  provenance.
- Creative Direction Context rejects private downstream keys recursively and
  serializes deterministically.

## Ports

- `CreativeResearchSessionRepository`
- `DesignBriefRepository`
- `SearchHistoryRepository`
- `ReferenceResearchRepository`
- `PreferenceEvidenceRepository`
- `DirectionBoardRepository`
- `ReferenceSearchGateway`

The search gateway accepts query kind, cursor, limit and structured exclusions,
and returns only provenance-valid Web references. There is no concrete gateway.

## Adapter Contracts

- `DocumentIntakeAdapter`
- `ProjectBriefLinkAdapter`
- `AnalysisModelAdapter`
- `UserReferenceAdapter`
- `WebReferenceImportAdapter`
- `ExplorationGenerationAdapter`
- `ReferenceFirstHandoffAdapter`

The contracts preserve current authority ownership. They do not modify the
Document Context schema, Project Asset store, Model Registry/Runtime, image
generation service or Reference First policy.

## Provider Implementation

`NONE`

No external search API, remote download, image generation call, model call or
LLM-authored fake search evidence was added.

## UI / RPC Migration

`NONE`

No Web file, current operation graph, current Creative Intelligence operation,
workspace or persisted current-CI run was changed.

## Tests Added

Fourteen deterministic tests cover:

- four-state session contract and invalid status rejection;
- Design Brief revision/evidence/keyword provenance;
- the three non-interchangeable reference source contracts;
- search query, cursor, batch, exclusions and result provenance;
- selection attributes, normalized regions and negative signals;
- evidence-required finalized insights;
- deterministic Direction Context compilation and downstream-schema exclusion;
- all required state transitions and reanalysis preservation;
- declared Port/Adapter surfaces;
- integration with the existing production boundary guard;
- absence of Provider, network and filesystem implementation.

## R1 Test Result

`PASS — 14/14`

Strict TypeScript check of the full `creative-research/index.ts` export graph:
`PASS`.

## Repository Regression

| Command | Result |
|---|---|
| `npm run verify:repository-contract` | PASS |
| `npm run verify:workspace-boundaries` | PASS |
| `npm run verify:production-boundaries` | PASS; 583 production files checked |
| `npm run verify:version-naming` | PASS |
| `npm run verify:analysis-guards` | PASS |
| `npm run repo:guard:test` | PASS, 41/41 |
| `npm test` | PASS, 1674/1674 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run web-runtime:test` | PASS, 15/15 when run outside the restricted sandbox |
| `npm run golden:test` | PASS; Provider calls 0; no auto-update |
| `npm run runtime:test` | R1 tests pass; aggregate remains red on the two known Web assertions |
| `npm run verify:current-flows` | Same two known Web assertions as the pre-change baseline |
| `npm run repo:verify` | All gates before `verify:current-flows` pass; stops on the same two known assertions |
| `npm run web:smoke` | Existing operation-count assertion drift: host reports 180, smoke expects 155 |

The first sandboxed `web-runtime:test` attempt failed in the local `tsx`
temporary-directory bootstrap with `uv_os_get_passwd ENOMEM`. The required
outside-sandbox rerun passed 15/15; this was an execution-environment failure,
not a repository test failure.

## Pre-existing Failures

Recorded before production changes at base HEAD with
`npm run verify:current-flows`:

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`

The same command after CI-R1 produces the same two assertion names and failure
type. CI-R1 does not modify `apps/web/src/App.tsx`, the assertion file or any Web
source.

An additional existing Web Smoke contract drift was exposed by the full R1
regression set: `apps/web-runtime/scripts/run-web-primary-smoke.mjs` requires
`operationCount === 155`, while the unchanged current Node Host registers and
reports 180 operations. CI-R1 changes neither the smoke script nor the operation
graph. This issue belongs to Web/repository governance and is not repaired here.

## New Failures

`0`

All new R1 tests, the new strict typecheck and the extended production boundary
guard pass. No failure references a CI-R1 source or test file.

## Protected Boundaries

- Packaging: unchanged; no import or schema write.
- Space: unchanged; no import or compiler call.
- Reference First: unchanged; adapter interface only.
- Provider: unchanged; no registry, credential or implementation delta.
- Prompt/Golden: unchanged; all integrity and Golden checks pass.
- Current CI: unchanged; no service, operation, UI or persistence migration.
- Document Context: unchanged; evidence adapter interface only.
- Project Asset: unchanged; reference/import adapter interfaces only.

## CI-R2 Readiness

```text
CONDITIONAL GO — bounded Document -> Design Brief pipeline only
```

The Creative Research foundation is ready to support a separately scoped CI-R2
pipeline. The verdict remains conditional because repository-level Web
assertions and the Web Smoke operation-count contract are red outside this
change. CI-R2 must not absorb those governance repairs and must continue to
avoid real search, UI switching and current-CI migration.

## Recommended Next Step

Review and commit CI-R1 as an isolated foundation change. In a separate
repository-governance/Web change, reconcile the existing UI architecture
assertions and replace the stale hard-coded Web Smoke operation count with a
current authority-based invariant. Begin CI-R2 only from an accepted CI-R1
commit, and stop before any real search Provider work.
