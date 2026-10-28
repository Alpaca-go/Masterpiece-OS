# CI-R3 Final Report

Branch: `codex/creative-intelligence-r3-baidu-reference-search`

Base: `c2dba06a7994a2fa1b86c40ebd328daba47c14a7`

Implementation HEAD: `c5bb991d`

## Scope

Baidu Real Reference Search only. CI-R3 stops after deterministic query
planning, real-provider normalization, provenance persistence and application
service orchestration. It does not add Inspiration Board UI, selection,
Preference Intelligence, Direction Board, AI exploration or current consumer
migration.

## Files Changed

- Controlled R1 refinements: `creative-research/contracts.ts`, `evidence.ts`,
  `ports.ts` and `search-contract.ts`.
- CI-R3 production modules: query planner, Baidu provider, search errors,
  research store and reference-search service under
  `packages/runtime-core/src/application/`.
- Verification assets: one Baidu response fixture, one R3 test suite, the
  affected R1 contract test and the opt-in manual smoke script.
- Repository integration: root smoke command and runtime user-data declaration
  for `reference-query.jsonl`.

## R1 Contract Refinement

- `ReferenceSearchInput` now requires `sessionId` and `queryId`.
- `WebReferenceItem` now distinguishes `resourceType: IMAGE | WEB`, source page
  URL and optional remote image URL/dimensions. `matchedQueryIds` preserves
  cross-query provenance.
- `SearchQuery` can persist bounded error/result/call telemetry.
- Search and reference repository lookup/update operations now carry
  `sessionId`, preventing cross-session ambiguity.

No R1 domain was replaced and no R4 contract was introduced.

## Baidu Product

百度 AI 搜索 -> 百度搜索. This implementation does not use the IMAGESEARCH
self-hosted gallery product and does not use generated answer text as a
Reference Source.

Official references reviewed:

- https://cloud.baidu.com/doc/qianfan/s/2mh4su4uy
- https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5

## API

- Endpoint: `POST https://qianfan.baidubce.com/v2/ai_search/web_search`
- API version/path: Qianfan v2 AI Search `web_search`
- Auth: `Authorization: Bearer <credential>`
- Search mode: `search_source = baidu_search_v2`
- Consumed response field: `references` only
- Ignored response content: `choices`, generated answer and summary fields

## Query Planner

- Concept: enabled `CONCEPT` plus an optional `VISUAL` modifier -> `CONCEPT`
  SearchQuery.
- Category: enabled `CATEGORY` plus an optional `VISUAL` modifier -> `CATEGORY`
  SearchQuery.
- Visual modifier: never becomes a third SearchQuery kind.
- Chinese: preserved as a first-class query path.
- English: preserved as its own AI/designer keyword path.
- Provenance: every query retains `derivedFromKeywordIds`.
- Max initial queries: four, targeting two concept and two category queries.
- Model expansion: none.

## Resource Strategy

- IMAGE: enabled when a real source page and a remote image/thumbnail URL both
  exist.
- WEB: enabled when a real source page URL exists.
- VIDEO: disabled.

Distinct images from the same page remain distinct because image identity is
based on the normalized remote image URL rather than source page alone.

## Search Lifecycle

`startResearch` enforces active Design Brief plus enabled keywords and performs
the R1 `INTAKE -> RESEARCH` transition. Planning persists `PENDING` queries.
Execution resolves a query in the same session, invokes the provider, stores
normalized references, then records `COMPLETED` or `FAILED` with safe
diagnostics. Batch execution uses two workers and continues processing pending
queries before surfacing the first failure.

Public application methods are `startResearch`, `planInitialSearch`,
`executeSearchQuery`, `executeSearchBatch`, `getSearchHistory`,
`listWebReferences` and `getReference`.

## WEB_REFERENCE Mapping

- `sourceUrl`: real Baidu reference page URL; never replaced by the image URL.
- `canonicalUrl`: lower-case scheme/host, no fragment and only explicit tracking
  parameters removed.
- `remoteImageUrl` / `thumbnail`: real image URL for IMAGE results; signed query
  parameters are preserved.
- `publisherOrDomain`: Baidu `website`, falling back to canonical hostname.
- `resourceType`: Baidu reference type normalized to IMAGE or WEB.
- Query provenance: `queryId` plus merged `matchedQueryIds`.
- `provider`: always `baidu-search`.
- License state: `UNKNOWN` unless a future authoritative source proves more.
- Stable identity: SHA-256 over provider, resource type, canonical source URL
  and optional remote image URL.

## Dedup

Within one provider response, IMAGE results deduplicate by normalized remote
image URL and WEB results by canonical source URL. Across queries, the stable
reference ID addresses one persisted record while `matchedQueryIds` and the
association log retain every query relationship. The minimum result rank is
retained.

## Credential Boundary

Search credentials are not model profiles. The provider receives only an
injected `readCredential` function. The helper for the existing encrypted Node
credential store reads the dedicated ID `reference-search-baidu`. Credentials
are never serialized, logged or returned; CI-R3 adds no Settings UI and no
plaintext secret file.

## Persistence

Under `<defaultDataPath>/creative-research/<sessionId>/research/`:

- `queries/<queryId>.json`
- `references/<referenceId>.json`
- `associations/reference-query.jsonl`

Writes use the existing atomic JSON writer. Session/query/reference identifiers
are path-validated and resolved beneath the configured data root. In-process
per-reference serialization prevents concurrent batch writes from losing
cross-query associations.

## Raw Provider Response

NOT PERSISTED. Web page body, generated answer/summary content and provider raw
payloads are also not persisted.

## Image Download

NONE. CI-R3 stores remote provenance metadata only and never stores image
bytes.

## Result Retention Review

`BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED`

The current Baidu AI Search service/API terms were reviewed, but no explicit
specialized grant for indefinite caching or redistribution of returned source
metadata/images was established. Therefore the runtime default is
`PROVENANCE_METADATA_ONLY`, license status remains `UNKNOWN`, and production
retention is not declared risk-free.

## Provider Errors

- Missing credential -> `SEARCH_CREDENTIAL_REQUIRED`
- Invalid input / over-length query -> `QUERY_INVALID`
- HTTP 401/403 or Baidu auth code -> `AUTH_FAILED`
- HTTP 429 -> `RATE_LIMITED`, no aggressive retry
- abort or documented 501/502 timeout -> `TIMEOUT`
- other 5xx/transport failure -> `PROVIDER_FAILED`
- invalid JSON/missing `references` -> `RESPONSE_INVALID`
- persistence failure -> `STORE_FAILED`
- missing query -> `QUERY_NOT_FOUND`

Timeout and HTTP 5xx failures receive at most one bounded retry. Auth, input,
rate-limit and invalid-response failures are not retried.

## Offline Tests

- R1/R2/R3 selected Creative Research regression: 22/22 PASS.
- Final affected contract + R3 suite: 12/12 PASS.
- R3 coverage includes deterministic Chinese/English planning, provenance,
  references-only normalization, source/image separation, signed image URLs,
  deduplication, dedicated credential ID, missing credential, auth, rate-limit,
  invalid response, bounded retry, lifecycle, max-two concurrency,
  cross-query association and fresh-store persistence.
- Root repository tests: 1674/1674 PASS.
- CLI tests: 40/40 PASS.
- Web Runtime tests: 15/15 PASS.

All automated R3 tests use a fixture or mocked HTTP transport and call no real
provider.

## Live Baidu Smoke

`LIVE_BAIDU_SMOKE = NOT RUN`

The opt-in command `npm run creative-research:smoke-baidu -- --confirm-live`
requires `MASTERPIECE_REFERENCE_SEARCH_BAIDU_API_KEY`. The no-authorization run
correctly recorded `NOT_RUN`; no key was present or logged. A representative
public query is fixed to `新中式餐饮品牌设计`.

## Provider Capability Snapshot

- Image results: fixture PASS; live NOT VERIFIED.
- Web results: fixture PASS; live NOT VERIFIED.
- Source URLs: fixture PASS.
- Publisher: fixture PASS.
- Preview/image URL: fixture PASS.
- Chinese design relevance: live NOT VERIFIED.
- English design relevance: live NOT VERIFIED.
- Latency: live NOT MEASURED.

## Repository Regression

PASS:

- version consistency and version naming
- workspace, production, obsolete-code, project-rule, Golden and tracked-runtime
  boundaries
- root tests, CLI tests, Web Runtime tests and Web production build
- R3 target suites and persistence reload

Repository-wide `web-runtime:typecheck` remains blocked by pre-existing
Creative Intelligence/Anchor type debt. An isolated strict check of the R3
entry files reached only the existing missing declarations for
`packaging-shot-contract.js`; no diagnostic named an R3 implementation file.

## Pre-existing Failures

- `verify:current-flows`: the same two R2 baseline Web static assertions fail:
  `analysis UI contains intake actions and a free-form API Profile provider`
  and `analysis API selection is controlled by App and survives settings navigation`.
- `web:smoke` baseline: Node Host reports 180 operations while the smoke runner
  still expects the older fixed count, so `nodeHostBoot` is false.
- Repository-wide TypeScript check has the previously recorded unrelated
  Creative Intelligence/Anchor and packaging declaration errors.

CI-R3 adds no Web UI, RPC operations or model-profile navigation and does not
touch the failing baseline surfaces.

## New R3 Failures

`NEW_R3_FAILURES = 0`

## Protected Boundaries

- Current CI: no consumer migration and no legacy/current workspace changes.
- Packaging: untouched.
- Space: untouched.
- Reference First: untouched.
- Creative Production: untouched.
- Prompt/Golden: no production prompt, Golden, anti-case, hidden-case or model
  request shape was modified.
- UI/RPC: zero delta.

## CI-R4 Readiness

`CONDITIONAL GO`

The technical R3 boundary is ready for a later Inspiration Board consumer, but
CI-R4/production persistence must remain conditional until a user-authorized
live Baidu smoke passes and Baidu result-retention rights are explicitly
confirmed. CI-R4 was not started.
