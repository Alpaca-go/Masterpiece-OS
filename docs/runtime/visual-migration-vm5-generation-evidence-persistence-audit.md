# Visual Migration VM-5 Generation Evidence Persistence Audit

Status: `PASS`

Audit date: `2026-09-03`

## Repository baseline

- Required base branch: `codex/visual-migration-vm4-capability-materialization`
- Required base HEAD: `5166ec617f69d6c0da93620466ebde6809cbe415`
- Development branch: `codex/visual-migration-vm5-generation-evidence-snapshot`
- The development branch was created directly from the required clean HEAD.

The legacy baseline-drift script reports `BASELINE_DRIFT_DETECTED` because its
comparison anchor remains `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`.
The VM-5 required base already contains the approved repository consolidation
and the frozen VM-4 implementation. This is the same known comparison mismatch
recorded by the VM-4 freeze; no reset or hidden branch drift occurred.

## Audited seams

| Concern | Repository fact | VM-5 decision |
|---|---|---|
| Run root | Existing `<projectRoot>/image-generation/<runId>/` | Reuse it; add one run-relative artifact |
| RunStore | Existing project-aware store with atomic JSON writes | Extend the existing store; do not create another store |
| Write coordination | Existing per-run `RunWriteCoordinator` | Serialize create-once publication through it |
| Artifact persistence | Task, source context, compiled prompt, prompt map, optional compile fingerprint and redacted request already have canonical filenames | Hash the persisted bytes and keep only filename/SHA/size in the Snapshot |
| Provider request | Existing `provider-request.redacted.json` | Build redacted evidence in memory, freeze Snapshot first, then persist and read back the request artifact |
| Retry | Existing retry creates a new run and records `parentRunId` | Each retry receives its own Snapshot; parent Snapshot remains immutable |
| VM-4 output | Policy/capability/allocation/materialized references/envelope/request-builder seam are available | Consume and validate exact ordered outputs without re-selection |
| Formal submit entry | No isolated production `visual_transfer` network-submit entry exists yet | Compose a production VM-5 preparation service and explicit pre-submit callback gate; do not migrate legacy routes |

## Scope decision

The audited repository supports VM-5 without changing VM-3 selection law,
VM-4 capability authority, Space ceilings, Packaging policy, legacy generation
routes, Provider adapters or UI. VM-6 audit and corrective retry remain out of
scope.

```text
VM5_0_PERSISTENCE_AUDIT = PASS
PROVIDER_CALLS = 0
BUSINESS_WRITES = 0
```
