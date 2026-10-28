# CI-R3.1 Final Reconciliation

Branch: `codex/creative-intelligence-r3-baidu-reference-search`

Base: `1ae8d6d446302336c7e976bb406f42392dad33a7`

Corrective HEAD: `b8d366b7`

## Scope

CI-R3.1 corrects the Baidu `web_search` request contract, makes provider-safe
query execution auditable, and restores the R1 transition invariant as the
single state authority. It does not implement CI-R4, UI, RPC consumers,
selection, preference analysis, Direction Board, Packaging, Space, Reference
First or current-CI integration.

## Corrective Files Changed

- `creative-research-reference-search-baidu.ts`: official request DTO/builder,
  array filters, query-unit policy, deterministic trimming and string image
  dimension compatibility.
- `creative-research-reference-search-service.ts`: R1 transition invariant,
  provider query audit persistence and omission of an unset cursor.
- Creative Research contracts/ports/evidence/search contract: optional
  `providerQueryText` refinement and validation.
- `creative-research-baidu-smoke.ts`: real Web-reference and provenance checks.
- R3 fixture/tests plus the new exact R3.1 Baidu contract suite.

## Official Baidu API Contract Verified

Official documentation reviewed on 2026-08-27:

- https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5
- https://cloud.baidu.com/doc/qianfan/s/2mh4su4uy

Verified contract:

- Product: 百度 AI 搜索 -> 百度搜索, not intelligent search generation.
- Endpoint: `POST https://qianfan.baidubce.com/v2/ai_search/web_search`.
- Authentication request structure: `Authorization: Bearer <API Key>`.
- Search engine: `search_source = baidu_search_v2`.
- Search input: one user message.
- Reference source: `references[]` only.
- `resource_type_filter`: array of typed resources.
- Web `top_k <= 50`; image `top_k <= 30`.
- Query limit: 72 units; one Chinese character counts as two units.
- Image width/height may arrive as strings and are normalized to positive
  integers.

Generated `choices`, answer, summary and page-content fields remain excluded
from `WEB_REFERENCE` persistence.

## resource_type_filter Fix

The provider no longer emits the invalid object keyed by `web` and `image`.
`buildBaiduReferenceSearchRequest()` now deterministically emits:

```json
[
  { "type": "web", "top_k": 20 },
  { "type": "image", "top_k": 20 }
]
```

The actual value follows the requested limit and is independently capped at 50
for Web and 30 for image. An outgoing-JSON test parses the fetch body, asserts
that the field is an array and deep-compares the exact entries and order.

## Query-unit Policy

`normalizeBaiduQueryWhitespace()` performs NFC normalization, collapses Unicode
whitespace to one ASCII space and trims edges.

`measureBaiduQueryUnits()` uses the deterministic conservative rule:

- ASCII / Basic Latin (`U+0000..U+007F`): 1 unit per code point.
- CJK, full-width characters, emoji and all other non-ASCII code points: 2
  units per code point.
- Unicode iteration is by code point, so a surrogate pair is never split.

`prepareBaiduQueryText()` never relies on server-side truncation. If the
normalized query exceeds 72 units, it first removes trailing whitespace-delimited
tokens, which removes the planner's appended Visual modifier before the primary
keyword in the normal R3 query shape. If the remaining single token still
exceeds the limit, it trims at a Unicode code-point boundary to the largest
legal prefix.

Locked tests cover ASCII 72/73, Chinese 36/37, mixed Chinese/English, multiple
spaces, emoji and an over-length Visual modifier.

## providerQueryText Handling

`SearchQuery.text` remains the semantic planned query. The provider request
builder computes the actual normalized/trimmed query. When it differs, the
gateway returns optional `providerQueryText`, and the search service persists
that value in Search History on successful execution. Query ID, semantic text,
`derivedFromKeywordIds` and reference query provenance remain unchanged.

## State-invariant Reconciliation

`startResearch()` no longer duplicates the `INTAKE -> RESEARCH` rules. It loads
the active brief and delegates the decision to:

```ts
assertCreativeResearchTransition(session, 'RESEARCH', {
  activeDesignBrief: brief,
  searchKeywords: brief.searchKeywords,
});
```

Only after the R1 invariant succeeds is `status = RESEARCH` persisted. Tests
prove the valid path and rejection of a mismatched active brief ID, a brief from
another session and an enabled keyword from another brief.

## Tests

- R1/R2/R3/R3.1 targeted Creative Research tests: 29/29 PASS.
- R3.1 exact contract tests: request array/caps, query-unit boundaries and R1
  transition authority PASS.
- Root repository tests: 1674/1674 PASS.
- CLI tests: 40/40 PASS.
- Web Runtime tests: 15/15 PASS.
- Web production build: PASS.
- Repository contract, version, namespace, workspace, obsolete-code,
  production, tracked-runtime, project-rule and Golden boundary gates: PASS.

The fixture remains offline; raw responses and credentials are not persisted or
printed.

## Live Baidu Smoke

`LIVE_BAIDU_SMOKE = NOT RUN`

No explicitly authorized Baidu API Key was available in this turn. The smoke
gate returned `NOT_RUN` before any HTTP call. When authorized, the command is:

```text
npm run creative-research:smoke-baidu -- --confirm-live
```

It uses only `新中式餐饮品牌设计` and now requires at least one real Web
reference, valid source URLs, `baidu-search` provider identity and matching
query provenance. It reports only counts, publisher domains and latency. Image
metadata is validated when image references are returned.

## Result Retention Review

`BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED`

Policy remains `PROVENANCE_METADATA_ONLY`:

- no image bytes
- no raw provider response
- no page body
- no generated answer/summary
- `licenseOrUsageStatus = UNKNOWN`

No claim of permanent caching or redistribution rights is made.

## Repository Regression

`npm run repo:verify` passed every gate before `verify:current-flows`, then
stopped on the two unchanged R2 baseline Web static assertions listed below.
No R3.1 file is implicated. The isolated strict TypeScript check reaches only
the pre-existing missing declarations for `packaging-shot-contract.js`; it
reports no R3.1 diagnostic.

## Pre-existing Failures

- `analysis UI contains intake actions and a free-form API Profile provider`
- `analysis API selection is controlled by App and survives settings navigation`
- Web smoke baseline still has the previously recorded fixed operation-count
  mismatch (runtime 180 versus stale smoke expectation).
- Repository-wide TypeScript checking retains the previously recorded unrelated
  Creative Intelligence/Anchor and packaging declaration debt.

R3.1 changes no Web UI, operation registry, model profile, prompt, Golden,
Packaging, Space, Reference First or current-CI surface.

## New R3.1 Failures

`NEW_R3_1_FAILURES = 0`

## CI-R3 Final Verdict

`CONDITIONAL PASS`

The audited request contract, query policy, state authority and offline
regressions now pass. The result is conditional solely because
`LIVE_BAIDU_SMOKE = NOT RUN` and
`BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED`.

## CI-R4 Readiness Verdict

`CONDITIONAL GO`

CI-R4 UI work may begin in a later task, but it must not default to permanently
caching Baidu images as local assets. CI-R4 was not started in this change.
