# Visual Migration VM-6 Audit and Corrective Retry Seam Audit

Status: `APPROVED FOR IMPLEMENTATION`

Audit date: `2026-09-03`

## Baseline

- Branch: `codex/visual-migration-vm6-audit-corrective-retry`
- Exact VM-6 base: `75a22bbf8562b81353835b4cab802151801feee1`
- VM-5 implementation ancestor: `405b9a995fcd357372b7b8c9210ff055550fba33`
- VM-5 baseline: `FROZEN`, G1-G62 PASS, `VM5_FROZEN = YES`,
  `VM6_UNLOCKED = YES`

The branch was created directly from the remotely read-back VM-5 freeze HEAD.
This audit changes no production behavior.

## Output evidence

`ImageGenerationRun` is sufficient to locate one generated output only when all
of the following are revalidated against the run root:

- the run exists, belongs to the requested project, is `succeeded`, and has an
  image record;
- `GeneratedImage.relativePath` is relative and its resolved real path remains
  inside `image-generation/<runId>/`;
- the resolved target is a regular file;
- file-signature MIME is an allowed image MIME and matches the persisted MIME;
- actual byte size and SHA-256 match `sizeBytes` and `sha256`.

`resolveProjectRoot()` plus `runRootUnder()` are the existing path authorities.
No output path or image bytes need to enter the persisted Audit record. Any
failed check must produce `VISUAL_MIGRATION_AUDIT_OUTPUT_INTEGRITY_FAILED`
before an observer call.

## Generation evidence authority

The Audit must load provenance only through
`visualMigrationGenerationEvidence.getGenerationEvidenceSnapshot()` with
`verifyArtifacts: true`. Directly parsing `generation-evidence-snapshot.json`
would skip VM-5 fingerprint, authority, current Registry capability, and run
artifact verification and is therefore prohibited.

The Snapshot's selected, materialized, and Provider-envelope candidate arrays
already freeze the exact ordered evidence set. Dropped candidates are available
only as negative provenance and must never become Audit attachments.

## Source and reference evidence recovery

The existing VM-4 materializer remains the file-integrity authority. VM-6 may
reuse its Project Store, Reference Pack, Locked Asset, MIME, containment, hash,
and byte-size rules, but Audit attachment selection is a bounded projection of
the already selected VM-5 evidence and never a new allocation.

| Source kind | Post-generation recovery | Result |
|---|---|---|
| `visual_migration_reference_pack` | Resolve the frozen Pack through the Pack service, locate its production-owned relative path, then verify MIME/SHA/size against the selected Snapshot item. | Resolvable without Snapshot changes. |
| `locked_asset` | Resolve the frozen Locked Asset in the same project, follow its `sourceAssetId` into the live Project Store, then verify the selected Snapshot evidence. | Resolvable without Snapshot changes. |
| `project_asset` | Resolve `sourceId` from the live Project Store and verify containment, MIME/SHA/size against the selected Snapshot evidence. | Resolvable without Snapshot changes. |
| `task_reference` | Re-read the VM-5-verified `task.json` and its persisted reference entries, map the frozen candidate/source identity to the Project Store asset, then verify containment, MIME/SHA/size. | Conditionally resolvable; ambiguous, absent, non-project, or stale mappings fail closed. |

VM-5 intentionally does not persist `runtimeLocator`. The independent
`VisualMigrationAuditEvidenceResolver` must recover a task-reference locator
from existing run artifacts and Project Store state. It must not mutate the
Snapshot. If exactly one verified mapping cannot be reconstructed, the result
is `VISUAL_MIGRATION_AUDIT_EVIDENCE_UNRESOLVABLE` and observer calls remain
zero.

## Audit observer transport

The existing analysis reasoner/profile/credential/attachment transport is
reusable. The existing deliverable-validation and similarity-audit schemas,
persistence locations, numeric scores, and Space-specific prompt semantics are
not reusable. VM-6 requires two independent, versioned observation prompts and
strict categorical JSON contracts. The observers supply observations only;
the final decision is a pure deterministic mapping.

## Provider submission order

### Multi-model adapters

`executeMultiModelLive()` currently performs:

```text
compileRequest(universalInput)
write provider-request.redacted.json
adapter.execute(universalInput)
```

This route has a valid pre-network location. A narrow hook can receive the
compiled request evidence after local compilation and before `adapter.execute`.

### DashScope / Wan

`executeLive()` currently performs:

```text
provider.submit(persistedTask)
buildSubmitBody(persistedTask)
write provider-request.redacted.json
```

This route does not satisfy the VM-5 pre-submit invariant. Corrective retry may
not use it unchanged. The safe narrow refactor is:

```text
buildSubmitBody(persistedTask)
build redacted request evidence
optional beforeProviderSubmit guard
provider.submit(persistedTask)
```

With no guard, the same task, endpoint, region, model, request body, reference
order/count, prompt, Provider adapter, polling, download, and retry behavior
must be preserved. Only the timing of local redacted evidence construction may
move before the network call.

## Corrective retry integration decision

The existing Image Generation service is the sole Provider execution stack.
VM-6 will add a narrow internal pre-submit hook with a default no-op and route a
dedicated corrective retry entry through the existing retry and execution
functions. The hook must complete before either `provider.submit()` or
`adapter.execute()` and must be able to:

1. rerun VM-4 against the frozen Policy and current Registry capability;
2. assert parent selected IDs equal child allocation, materialization, and
   Provider-envelope IDs in exact order;
3. persist and read-back validate the child VM-5 Snapshot;
4. persist and hash-verify the redacted Provider request artifact;
5. bind the source Audit and Correction Plan to the child run.

Any hook failure maps to `VISUAL_MIGRATION_CORRECTIVE_PRE_SUBMIT_FAILED`, leaves
Provider calls at zero, and must not update the immutable parent Run evidence.
VM-6 will not call adapters directly, duplicate polling/download orchestration,
change VM-3 allocation, change VM-4 capacity/materialization, or change the
VM-5 Snapshot contract.

## Seam decision

```text
OUTPUT_EVIDENCE = SUFFICIENT_WITH_REVALIDATION
SOURCE_EVIDENCE = RESOLVABLE_WITH_INDEPENDENT_FAIL_CLOSED_RESOLVER
MULTIMODAL_TRANSPORT = REUSABLE_WITH_VM6_CONTRACT
DASHSCOPE_PRE_SUBMIT_SEAM = NARROW_REFACTOR_REQUIRED
MULTI_MODEL_PRE_SUBMIT_SEAM = AVAILABLE
DUPLICATE_PROVIDER_STACK_REQUIRED = NO
VM5_CONTRACT_CHANGE_REQUIRED = NO
VM6_IMPLEMENTATION_MAY_PROCEED = YES
```
