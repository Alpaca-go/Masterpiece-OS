# CI-R8 Final Report

Branch: `codex/creative-intelligence-r8-production-freeze`  
Base: `ef59a4caf0059e44d9440b1d32593f8f884d42b2`  
Freeze candidate: `16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a`  
Date: 2026-08-28

## Outcome

Creative Intelligence V1 has a code-and-test freeze candidate with an audited rollback and parallel-migration posture. It is not an unconditional Production Freeze because no real-provider Live R4-R7 flow was authorized and Baidu search-result retention permission remains unconfirmed.

```text
CODE_FREEZE_VERDICT = PASS
LIVE_E2E_VERDICT = NOT RUN
RETENTION_VERDICT = NOT_CONFIRMED / PROVENANCE_METADATA_ONLY
LEGACY_CI_MIGRATION_READINESS = READY_FOR_PARALLEL
DEFAULT_CUTOVER_VERDICT = NO-GO
REFERENCE_FIRST_CONSUMER_VERDICT = DEFERRED_NO_SAFE_READ_BOUNDARY
OVERALL_R8_VERDICT = CONDITIONAL GO
```

## R7 baseline

```text
HEAD = ef59a4caf0059e44d9440b1d32593f8f884d42b2
operation count = 213
root = 1674/1674
CLI = 40/40
Shared Runtime = 14/14
Runtime application = 1223/1225 (2 pre-existing failures)
Node Web Host = 15/15
web:build = PASS
web:smoke = PASS
golden:test = PASS
Live R4-R7 = NOT RUN
retention = NOT_CONFIRMED
```

## Pre-freeze reconciliation

Implemented optional `PreferenceInsight.finalizedAt`:

- first `DRAFT -> FINALIZED` writes `now()`;
- repeated finalize is idempotent;
- Designer Override preserves the timestamp;
- persisted `finalizedAt` cannot be changed or removed;
- legacy FINALIZED records without it remain readable;
- Direction re-entry uses `finalizedAt ?? createdAt`.

No new UI or RPC channel was added. Operation count remains 213.

## Offline acceptance

R1-R8 targeted: **72/72 PASS**.

| Suite | Pass | Fail |
|---|---:|---:|
| Root | 1674 | 0 |
| CLI | 40 | 0 |
| Shared Runtime JS | 14 | 0 |
| Runtime application | 1230 | 2 pre-existing |
| Node Web Host | 15 | 0 |
| Repository guard tests | 41 | 0 |

`web:build`, `web:smoke`, Golden regression, Repository Contract structural gates and all analysis guards pass. Web smoke reports 213 operations, zero Provider calls, zero business writes and zero Electron/Desktop processes. Golden reports zero Provider calls and no auto-update.

`verify:current-flows` and therefore aggregate `repo:verify` stop on the same two pre-existing Analysis UI tests. R8 does not modify or reclassify them.

## Typecheck delta

```text
Web Runtime baseline: 160
Web Runtime final: 160
New normalized identities: 0

Web baseline: ReferenceAnchorWorkspace.tsx:157 TS2532
Web final: same identity
New identities: 0
```

No typecheck error intersects an R8 changed hunk.

## Failure and recovery

PASS coverage includes missing/invalid credentials, auth failure, 429, timeout, zero results, partial batch, unavailable remote image, invalid analysis/preference/reanalysis output, Board atomic-write failure, Context write failure, Context-before-Session completion retry, and persisted RESEARCH/DIRECTION/COMPLETED reload behavior.

The Board failure test proves the previous revision stays current and `activeDirectionBoardId` does not move. The completion retry test proves an already persisted Context is reused rather than regenerated.

## Live acceptance

```text
LIVE_R4_REFERENCE_E2E = NOT RUN
LIVE_R5_SELECTION_E2E = NOT RUN
LIVE_R6_CORRECTION_E2E = NOT RUN
LIVE_R7_DIRECTION_E2E = NOT RUN
```

No authorized real credentials or public live fixture were supplied. No mocked result is labeled Live PASS.

## Provider and retention

The current official Baidu Search API documents the v2 endpoint, API Key authentication, WEB/IMAGE response fields, site filtering and recency filtering. The reviewed official agreements do not expressly authorize long-term retention of third-party search-result metadata or remote image URLs.

```text
BAIDU_RESULT_RETENTION_REVIEW = NOT_CONFIRMED
PROVENANCE_METADATA_ONLY = ACTIVE
REMOTE_IMAGE_BYTES = NOT PERSISTED
```

The per-field decision and official links are recorded in `acceptance-matrix.md`.

## Legacy CI audit

Legacy `/creative-intelligence` remains active through Web navigation, 21 RPC channels, a large application service, `@masterpiece/creative-intelligence`, persisted `creative-intelligence-runs`, Visual Canon and anchor production.

Creative Research replaces the bounded research journey but not legacy strategic synthesis, direction evaluation/ranking, Visual Canon, anchor approval or production translation. Schemas are non-isomorphic and all legacy data remains readable.

```text
LEGACY_CI_MIGRATION_READINESS = READY_FOR_PARALLEL
```

## Default cutover

`NO-GO`. The existing default/navigation behavior is unchanged. Both `/creative-intelligence` and `/creative-research` remain available.

## Rollback

No destructive migration exists. Current rollback is a no-op for navigation. If the R8 reconciliation must be reverted, normal reviewed Git reverts target `16d1a842` and `90a5fead`; both data roots remain untouched.

## Reference First

No new safe read-only consumer exists. All current candidates would cross frozen schema or prompt authority.

```text
REFERENCE_FIRST_DIRECT_CONSUMER = DEFERRED_NO_SAFE_READ_BOUNDARY
```

## Privacy and verification authority

The secret-safety guard scanned 1732 tracked files with zero violations. R8 fixtures use synthetic credentials/domains; no real key, raw Provider response, customer document, remote binary or machine-private path was added.

```text
VERIFICATION_AUTHORITY = LOCAL_VERIFICATION_ONLY
NEW_R8_FAILURES = 0
```

## Freeze authority

The exact frozen code-and-acceptance checkpoint is:

```text
16d1a842c83de2c1f5595a2c8a68c739b3f1eb7a
```

Authority is this SHA plus `freeze-manifest.md`. No Git tag is created.

R8 stops here. No new Creative Intelligence V1 capability and no legacy deletion is authorized by this report.

