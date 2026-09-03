# Visual Migration VM-5 Generation Evidence Baseline

Status: `FREEZE_READY — REMOTE CONFIRMATION PENDING`

Freeze-candidate date: `2026-09-03`

## Repository state

- Branch: `codex/visual-migration-vm5-generation-evidence-snapshot`
- Required base HEAD: `5166ec617f69d6c0da93620466ebde6809cbe415`
- Tested implementation HEAD: `6b85b7308e2409ddf2d4438b59bfad6e532e109b`
- Freeze record: the commit containing this document
- Remote comparison before the freeze-record commit: ahead 5, behind 0 relative
  to the frozen VM-4 base branch
- Working tree before this record: clean

The older baseline-drift script reports `BASELINE_DRIFT_DETECTED` because its
comparison point remains `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`.
The exact required VM-5 base already contains the approved repository
consolidation and frozen VM-4 implementation. The branch was created directly
from the required clean HEAD; no reset or hidden drift occurred.

## Commits

| SHA | Message |
|---|---|
| `cea15e87` | `docs(visual-migration): audit VM-5 evidence persistence seam` |
| `9463a2a2` | `feat(visual-migration): define generation evidence snapshot contract` |
| `de420cd3` | `feat(image-generation): persist immutable generation evidence snapshot` |
| `0097e23e` | `feat(visual-migration): bind VM-4 evidence to generation runs` |
| `6b85b730` | `test(visual-migration): verify generation evidence lifecycle and tamper gates` |

## Changed production files

- `packages/runtime-core/src/application/visual-migration-generation-evidence-contract.ts`
- `packages/runtime-core/src/application/visual-migration-generation-evidence-builder.ts`
- `packages/runtime-core/src/application/visual-migration-generation-evidence-service.ts`
- `packages/runtime-core/src/application/image-generation/paths.ts`
- `packages/runtime-core/src/application/image-generation/run-store.ts`
- `packages/runtime-core/src/application/runtime-services.ts`

The frozen VM-3 Policy schema, builder, allocator and persistence service were
not modified. VM-4 Model Registry capability authority and materialization were
not modified. Space and Packaging production paths have zero VM-5 diff.

## Snapshot contract

- Schema: `visual-migration-generation-evidence-snapshot/v1`
- Run-relative path: `image-generation/<runId>/generation-evidence-snapshot.json`
- Lifecycle: pre-submit, immutable, create-once
- Same valid input: existing bytes are reused without rewriting or changing mtime
- Different input for the same run: `GENERATION_EVIDENCE_CONFLICT`
- Snapshot ID: `vmges-` plus the first 32 hex characters of the existing
  canonical SHA-256 over `projectId + runId + reproducibilityFingerprint`
- Snapshot fingerprint: existing Visual Migration canonical SHA-256 over the
  complete Snapshot payload excluding `snapshotFingerprint`
- Reproducibility fingerprint: existing Visual Migration canonical SHA-256 over
  Canon/Pack/Policy/capability, requested/selected/dropped/materialized evidence,
  Provider Envelope identity and run-artifact hashes; excludes run identity,
  timestamps, parent binding, outputs, response, review and metrics

## Persistence and Provider ordering

The existing image-generation RunStore remains the only persistence authority.
Create-once publication uses the existing per-run write coordinator and an
exclusive hard-link publication of fully written and synced temporary bytes.

```text
request-built
< snapshot-persisted
< snapshot-validated
< provider-called
```

Write failure, conflict, read-back failure, authority mismatch, artifact
tamper, unsafe payload or unsatisfiable allocation all leave Provider calls at
zero. The redacted Provider request is persisted and read back only after the
Snapshot has been persisted and validated.

## Authority linkage

| Authority | Frozen evidence |
|---|---|
| Canon | ID, Canon fingerprint, source fingerprint, project identity fingerprint, locked-asset fingerprint |
| Reference Pack | ID and manifest fingerprint; production resolve revalidates image evidence |
| Policy | ID, policy/source/task/candidate-set fingerprints |
| Capability | Complete immutable VM-4 Registry snapshot and capability fingerprint |

Retrieval revalidates Snapshot integrity, Project/Run binding, Canon → Pack,
Policy → Canon/Pack and the current Model Registry fingerprint. With
`verifyArtifacts=true`, every referenced run artifact is re-read and re-hashed.

## Golden evidence scenario

The VM-5 fixture freezes a Policy containing one current-project identity image
and four Reference Pack style candidates at capacity 2:

```text
requested: identity-1 + style-1..style-4
selected:  identity-1 + style-1
dropped:   style-2 + style-3 + style-4
reasons:   capacity_surplus × 3
materialized IDs == selected IDs in exact order
Provider Envelope IDs == selected IDs in exact order
```

The existing VM-4 A-F matrix remains unchanged and passed together with VM-5:
style-only/cap1, identity+style/cap1 failure, identity+style/cap2,
identity×2+style/cap3, required structure/cap2 failure and
identity+structure+style/cap3.

## Artifact evidence matrix

| Artifact | Result |
|---|---|
| `task.json` | filename, SHA-256 and byte size frozen and restart-verified |
| `source-context-snapshot.json` | filename, SHA-256 and byte size frozen and restart-verified |
| `compiled-prompt.md` | filename, SHA-256 and byte size frozen; mutation rejected |
| `prompt-source-map.json` | filename, SHA-256 and byte size frozen and restart-verified |
| `compile-fingerprint.json` | optional; recorded and verified when present |
| `provider-request.redacted.json` | in-memory canonical bytes hashed before Snapshot; persisted bytes revalidated before submit |

Only this fixed allowlist is accepted. Traversal, absolute paths and arbitrary
run filenames are rejected.

## Retry matrix

| Scenario | Snapshot ID | Reproducibility fingerprint | Parent mutation |
|---|---|---|---|
| Same inputs, new retry run | Different | Same | None; parent bytes unchanged |
| Changed prompt input, new retry run | Different | Different | None; parent bytes unchanged |

## Tamper and safety matrix

| Scenario | Result |
|---|---|
| Snapshot JSON field mutation | `GENERATION_EVIDENCE_FINGERPRINT_MISMATCH` |
| Recomputed outer fingerprint with stale reproducibility evidence | `GENERATION_EVIDENCE_FINGERPRINT_MISMATCH` |
| Compiled prompt mutation | `GENERATION_EVIDENCE_ARTIFACT_TAMPERED` |
| Redacted Provider request mutation | `GENERATION_EVIDENCE_ARTIFACT_TAMPERED` |
| Canon/Policy/Pack resolution or fingerprint mutation | `GENERATION_EVIDENCE_AUTHORITY_MISMATCH`, upstream cause preserved |
| Registry capability mutation | `GENERATION_EVIDENCE_CAPABILITY_MISMATCH` |
| Materialized/Envelope order or SHA replacement | `GENERATION_EVIDENCE_REFERENCE_SET_MISMATCH` |
| Raw bytes, Buffer, base64/data URI | `GENERATION_EVIDENCE_UNSAFE_PAYLOAD` |
| API key, Authorization, Bearer, token, cookie or credential fields | `GENERATION_EVIDENCE_UNSAFE_PAYLOAD` |
| Windows/UNC/POSIX absolute path or `file://` URI | `GENERATION_EVIDENCE_UNSAFE_PAYLOAD` |

Snapshot JSON contains no runtime locator, raw Provider request, image bytes,
base64, absolute local path, secret or Provider response.

## Regression results

| Command | Result |
|---|---|
| VM-4 + VM-5 targeted tests | PASS, 25/25; VM-5 10/10 |
| `npm test` | PASS, 1694/1694 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run runtime:test` | PASS, Runtime Core 14/14; Runtime Application 1355/1355 |
| `npm run web-runtime:test` | PASS, 15/15 |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web:smoke` | PASS; all JSON checks true; Provider calls 0; business writes 0 |
| `npm run golden:test` | PASS, G-01 through G-05; Provider calls 0; auto-update NO |
| `npm run verify:current-flows` | PASS; Runtime Application 1355/1355; external calls 0 |
| `npm run verify:tracked-runtime-assets` | PASS, 8 declared assets |
| `npm run verify:repository-contract` | PASS; Provider calls 0; business writes 0; digest auto-update NO |
| `npm run repo:verify` | PASS; repository contract tests 45/45 |
| `npm run repo:check` | PASS; Provider calls 0; business writes 0; Golden update NO |
| `git diff --check` | PASS after freeze-record commit |

On this managed Windows host the Web smoke helper emitted a permission warning
for `Get-CimInstance Win32_Process`, so its descendant-process inspection count
was zero. The smoke still exited 0 and its host, health, renderer,
configuration, route reachability, zero-Provider-call and zero-business-write
checks all passed. The warning is recorded rather than hidden.

## External effects and exclusions

- Real Provider calls: 0
- Business writes during guard/smoke tests: 0
- Golden updates: NO
- Prompt/digest/baseline auto-update: NO
- Provider response or generated output in Snapshot: NO
- VM-6 Similarity Audit, drift decisions or corrective retry: NO
- VM-3 selection-law changes: NO
- VM-4 capability or materialization-law changes: NO
- New global Store/database/history root: NO
- Space/Packaging/legacy route migration: NO
- UI work: NO

## Acceptance gates

- G1-G61: PASS (61/61)
- G62: PENDING — the tested commits and this freeze record have not yet been
  published to and read back from the remote VM-5 branch

```text
VM5_FROZEN = NO
VM6_UNLOCKED = NO
```

The implementation and all local gates are complete. Final freeze requires an
explicitly authorized remote push followed by remote HEAD verification; this
document must then be updated to `FROZEN`, `G1-G62 = PASS`,
`VM5_FROZEN = YES`, and `VM6_UNLOCKED = YES`.
