# CI-R8 Acceptance Matrix

Evidence date: 2026-08-28  
Freeze candidate: `16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a`  
Verification authority: `LOCAL_VERIFICATION_ONLY`

## Offline acceptance

| Gate | Result | Evidence |
|---|---:|---|
| R1-R8 Creative Research targeted | PASS | 72/72 |
| Root `npm test` | PASS | 1674/1674 |
| CLI | PASS | 40/40 |
| Shared Runtime JS | PASS | 14/14 |
| Runtime application | PRE_EXISTING_ONLY | 1230/1232; exactly 2 known failures |
| Node Web Host | PASS | 15/15 |
| Web production build | PASS | 132 modules transformed |
| Web primary smoke | PASS | operation count 213; provider calls 0; business writes 0; Electron/Desktop processes 0 |
| Golden regression | PASS | G-01-01 through G-05-01; provider calls 0; auto-update NO |
| Repository structural gates | PASS | Repository Contract, version, namespace, workspace, production, tracked assets, project-rule and Golden boundaries |
| Analysis guards | PASS | provider authority, prompt digest, namespace, runtime isolation, Golden digest and secret safety |
| Repository guard tests | PASS | 41/41 |
| `verify:current-flows` / `repo:verify` aggregate command | PRE_EXISTING_ONLY | Stops on the two known Runtime application Analysis UI tests |

## R1-R8 coverage

| Stage | Status | Accepted behavior |
|---|---|---|
| R1 | PASS | Four-state session machine and transition evidence |
| R2 | PASS | Document ingestion, evidence-bound Brief, revisions and store failures |
| R3 | PASS | Baidu request/response contract, credentials, auth, 429, timeout, zero results and partial batch |
| R4 | PASS | Browser-safe provenance, Concept/Category projection and unavailable-image fallback |
| R5 | PASS | Designer selection/rejection, Preference evidence, first-finalize timestamp and immutability |
| R6 | PASS | Refresh, keyword adjustment, similar search and explicit reanalysis |
| R7 | PASS | Board revisions, re-entry, Context, completion and read-only lifecycle |
| R8 | PASS | Timing reconciliation, atomic-write failure and completion retry recovery |

## Typecheck delta

| Scope | R7 baseline | R8 final | New identities |
|---|---:|---:|---:|
| Web Runtime | 160 | 160 | 0 |
| Web | 1 (`ReferenceAnchorWorkspace.tsx:157`, TS2532) | same identity | 0 |

The normalized Web Runtime identity set remains the R7 debt set. Errors reported in files also touched by R8 are unchanged implicit-parameter errors on pre-existing lines; no error intersects an R8 changed hunk. The two failing Runtime application tests read `App.tsx`/Analysis UI and have zero path intersection with the R8 change set.

## Failure and recovery acceptance

| Scenario | Status | Evidence |
|---|---|---|
| Credential missing | PASS | `SEARCH_CREDENTIAL_REQUIRED` |
| Credential invalid / auth failure | PASS | 401/403 -> `AUTH_FAILED` |
| Baidu 429 | PASS | `RATE_LIMITED`, no aggressive retry |
| Baidu timeout | PASS | Abort -> `TIMEOUT`; credential absent from error |
| Zero search results | PASS | completed empty result page |
| Partial search batch | PASS | completed references retained; failed query persisted; Session remains RESEARCH |
| Remote image unavailable | PASS | Reference and Direction cards switch to `图片暂不可用` with no-referrer policy |
| Analysis profile missing/invalid | PASS | explicit profile gates in R2/R5/R6 adapters |
| Preference invalid JSON/evidence | PASS | one repair maximum, then fail closed before persistence |
| Reanalysis invalid output/evidence | PASS | one repair boundary and fabricated evidence rejection |
| Direction Board atomic-write failure | PASS | previous revision current; no half revision; active ID unchanged |
| Context write failure | PASS | Session remains DIRECTION; no false Context |
| Context persisted + Session completion failure | PASS | retry reuses same Context and completes Session |
| RESEARCH reload | PASS | query/reference/selection/preference stores reopened from the same root |
| DIRECTION reload | PASS | Board revision history reopened and previous revision preserved |
| COMPLETED reload | PASS | Context reopened from disk; completed Session stays read-only |

No accepted recovery case loses Session or evidence, and the secret-safety guard reports zero violations.

## Live acceptance

No user-authorized real Provider credential or Public Test Session was supplied in this task.

```text
LIVE_R4_REFERENCE_E2E = NOT RUN
LIVE_R5_SELECTION_E2E = NOT RUN
LIVE_R6_CORRECTION_E2E = NOT RUN
LIVE_R7_DIRECTION_E2E = NOT RUN
LIVE_E2E_VERDICT = NOT RUN
```

## Provider capability snapshot

Runtime observation is `NOT RUN`. The following is documentation-only and must not be represented as live evidence.

| Field | Documented status |
|---|---|
| Provider | `baidu-search` |
| Endpoint | `POST https://qianfan.baidubce.com/v2/ai_search/web_search` |
| Search source | `baidu_search_v2` |
| Auth | API Key / Bearer |
| IMAGE refs | Documented; top_k maximum 30 |
| WEB refs | Documented; top_k maximum 50 |
| Site filter | Documented |
| Recency filter | week/month/semiyear/year documented |
| Source/remote-image quality | NOT RUN |
| Chinese/English design-query quality | NOT RUN |
| Latency/rate-limit behavior | NOT RUN beyond deterministic mocked failure tests |

Official API reference: <https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5>

## Retention review

Official material reviewed on 2026-08-28:

- Baidu Search API reference, updated 2026-08-14: <https://cloud.baidu.com/doc/qianfan-api/s/Wmbq4z7e5>
- Baidu Cloud online ordering agreement, updated 2026-04-23: <https://cloud.baidu.com/doc/Agreements/s/Tjwvy200q>
- Baidu Cloud business-data terms: <https://cloud.baidu.com/doc/Agreements/s/Ek72myukw>
- Qianfan special terms: <https://cloud.baidu.com/doc/qianfan/s/emh4stmvj>
- Qianfan product history describing source-image display: <https://cloud.baidu.com/doc/qianfan/s/tmh4stryt>

The API reference defines the response fields and the product history permits displaying source-associated images as covers. None of the reviewed official texts expressly grants long-term retention of third-party search-result metadata or remote image URLs. The online ordering agreement also says that, absent a separate written agreement, materials/software/data supplied by Baidu belong to Baidu and may not be distributed or provided to others. Therefore retention is not confirmed.

| Persisted field | Status | Reason |
|---|---|---|
| query text | ALLOWED | User-provided business input; user remains responsible for source legality |
| source URL | UNCLEAR | Official response field; no explicit long-term retention grant found |
| canonical URL | UNCLEAR | Locally normalized from returned URL; underlying result right remains unclear |
| title | UNCLEAR | Official response field; may contain third-party protected text |
| publisher/domain | UNCLEAR | Official response field; retention permission not explicit |
| remote image URL | UNCLEAR | Display use is documented; long-term persistence is not |
| thumbnail URL | UNCLEAR | Same authority as remote image URL |
| retrievedAt | ALLOWED | Locally generated operational timestamp |
| rank | UNCLEAR | Derived from Provider response ordering |
| provider | ALLOWED | Locally assigned provenance identifier |

```text
BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED
RETENTION_MODE = PROVENANCE_METADATA_ONLY
REMOTE_IMAGE_BYTES = NOT PERSISTED
TRANSIENT_IMAGE_ANALYSIS_ONLY
```

No raw Provider response, content/snippet body or remote binary is persisted by the current Creative Research implementation.

