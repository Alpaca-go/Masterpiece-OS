# Visual Migration VM-2 Canon Baseline

Status: `VM2_IMPLEMENTED_AND_VERIFIED`

Base commit: `f5ecdfa2aa21d1b00dc1311bf356a2d8e062701d`

Branch: `codex/visual-migration-vm2-canon`

## Frozen outcome

VM-2 adds one production-owned semantic authority,
`VisualMigrationCanonV1`, between the approved Quick Extraction inputs and
future task-aware reference policy. It combines current-project identity,
Locked Assets, approved Capsule transfer mechanisms, and the derived Style
Profile while retaining the VM-1 Reference Pack as an immutable foreign-keyed
visual-evidence source.

The implementation is deterministic and offline. It adds no model call and
does not change Provider payloads, Reference Plan behavior, materialization,
Space, Packaging, or the independent Creative Intelligence shadow Canon.

## Production chain

```text
approved Reference Anchor
  -> immutable VM-1 Reference Pack
  -> Locked Assets + Style Profile
  -> deterministic Visual Migration Canon
  -> Session Canon linkage
  -> Canon -> Reference Pack -> verified reference files
```

Quick Extraction returns success only after Canon creation or reuse and after
both Reference Pack and Canon linkage have been persisted to the Session.
Canon construction failure leaves neither linkage written by that handoff.

## Persistence

```text
<project-root>/visual-migration/canons/
├── active.json
└── <canonId>/canon.json
```

Equal semantic source input reuses the deterministic Canon. Changed source
input creates a new Canon, marks the former active Canon `superseded`, preserves
its semantic content, and advances the active pointer. Every read validates the
Canon fingerprint and resolves the linked Reference Pack with its own integrity
checks.

## Session linkage

VM-2 Sessions persist:

- `visualMigrationCanonId`
- `visualMigrationCanonFingerprint`
- `visualMigrationCanonSourceFingerprint`

All three fields are optional for legacy Sessions and form an all-or-nothing
validated tuple when present.

## Generated evidence

The real integration path generated and persisted the contract-valid fixture
at `docs/runtime/fixtures/visual-migration-canon-v1.example.json`. It contains
four verified reference records, synthetic project identifiers, and no
absolute path, image bytes, Provider
parameters, credentials, or model responses.

## Verification evidence

- VM-2 contract, builder, persistence, Session, and handoff tests: pass.
- Runtime restart resolution and idempotent repeat handoff: pass.
- Canon and active-pointer tamper detection: pass.
- Quick Extraction failure-closed behavior: pass.
- `verify:current-flows`: pass, including 1308/1308 Runtime Application tests
  and Node Host/Web type checks.
- `verify:tracked-runtime-assets`: pass after classifying `active.json` as a
  generated runtime artifact.
- `repo:check`: pass, covering repository verification, root tests, CLI tests,
  Runtime tests, Web primary smoke, and Golden regression.
- `web-runtime:test`: 15/15 pass.
- `web:build`: pass; the pre-existing large-chunk advisory remains non-blocking.
- Provider/model calls during VM-2 implementation and verification: `0`.

## Next boundary

VM-3 may introduce task-aware reference policy. VM-2 does not assign task
priority, select materialized references, or change Provider capacity policy.
