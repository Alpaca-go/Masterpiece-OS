# Visual Migration VM-6 Dual-Sided Audit and Corrective Retry Baseline

Status: `FROZEN`

Freeze-candidate date: `2026-09-03`

## Repository state

- Branch: `codex/visual-migration-vm6-audit-corrective-retry`
- Required VM-5 base HEAD: `75a22bbf8562b81353835b4cab802151801feee1`
- Verified VM-5 implementation ancestor: `405b9a995fcd357372b7b8c9210ff055550fba33`
- Tested VM-6 implementation HEAD: `fc66b92dd7a274040057d6ef14d6f7f244065082`
- Merge base with the required VM-5 base: `75a22bbf8562b81353835b4cab802151801feee1`
- Freeze record: the commit containing this document
- Working tree before this record: clean
- Remote mutation: none; this local freeze did not push the VM-6 branch

The required VM-5 branch HEAD was confirmed read-only before VM-6 work began.
The VM-6 branch was created directly from that exact clean commit. The frozen
VM-3 Policy, VM-4 allocation/materialization, and VM-5 Snapshot production
contracts have no unintended semantic edits. VM-6 composes through their
public services and adds only the narrowly required image-generation
pre-submit seam and run bindings.

## Commits

| SHA | Message |
|---|---|
| `7273dd52` | `docs(visual-migration): audit VM-6 output and retry seams` |
| `b250f4c4` | `feat(visual-migration): define audit and corrective contracts` |
| `9197ee90` | `feat(visual-migration): add immutable dual-sided audit` |
| `db73bd95` | `feat(visual-migration): integrate bounded corrective retry` |
| `82d596be` | `test(visual-migration): verify audit and corrective retry lifecycle` |
| `45957504` | `test(image-generation): prove pre-submit guard ordering` |
| `a83ece77` | `fix(visual-migration): preserve corrective rule provenance` |
| `fc66b92d` | `chore(repository): classify VM6 run artifacts` |

## Production surface

- Audit contract, deterministic decision engine, evidence resolver, observer,
  and service under `packages/runtime-core/src/application/`.
- Corrective retry contract and service under the same Shared Core boundary.
- Existing image-generation RunStore remains the sole persistence authority.
- Existing image-generation service exposes one optional pre-submit guard;
  the no-hook path retains its prior behavior.
- Runtime service composition exposes the new audit and corrective services.
- Image-generation run records add only optional parent-audit, correction-plan,
  and automatic-depth bindings.
- `audit.json` and `correction-plan.json` are classified as generated per-run
  user data by the repository static-asset guard.

No Desktop/Electron adapter, global database, second Audit Store, UI route,
Space migration, Packaging migration, legacy selector rewrite, Golden rule, or
project-specific production rule was introduced.

## Audit contract and evidence

- Schema: `visual-migration-audit/v1`
- Source prompt: `visual-migration-source-audit@1.0.0`
- Reference prompt: `visual-migration-reference-audit@1.0.0`
- Decision rules: `visual-migration-audit-decision@1.0.0`
- Persistence: `visual-migration-audits/<auditId>/audit.json`
- Audit ID: deterministic from the complete audit input authority, output SHA,
  selected source/reference evidence SHA values, prompt/rule versions, and
  auditor provider/model.
- Lifecycle: create-once, byte-immutable, restart-readable, fingerprint-checked.

Only a succeeded run with a valid, artifact-verified VM-5 Snapshot can enter
the observer. Generated output containment, regular-file status, MIME
signature, SHA-256 and byte size are revalidated first. Frozen selected
evidence is recovered in VM-5 order from the production Pack, Locked Asset,
Project Asset, or the uniquely resolved task reference. Dropped and
`analysis_only` candidates are never promoted. Exact-copy output-to-reference
SHA equality is detected without a model call.

The source side receives the generated output plus at most two frozen identity
images and one frozen structure image. The reference side receives the output
plus at most three frozen style images. Each side makes at most one strict-JSON
multimodal observation call. There is no AI arbitration call. Provider, model,
prompt versions and both observation run IDs are recorded; raw reasoning,
absolute paths, bytes, data URIs and secrets are rejected from the Audit.

## Deterministic decision matrix

| Evidence | Failure/disposition |
|---|---|
| Clean | `pass` |
| Minor-only drift | `pass_with_warnings` |
| Source identity major or locked-asset failure | `SOURCE_IDENTITY_LOSS` |
| Target content major | `TARGET_IDENTITY_LOSS` |
| Structure major | `STRUCTURE_DRIFT` |
| Color major | `PALETTE_DRIFT` |
| Graphic-language major | `GRAPHIC_LANGUAGE_DRIFT` |
| At least two transferable style dimensions major | `STYLE_DRIFT` |
| Exact copy, high near-copy risk, or visible reference identity | `NEAR_COPY_RISK` |
| Confirmed reference conflict | `REFERENCE_CONFLICT`, no auto retry |
| Hard uncertainty | `manual_review_required`, no auto retry |

The fixed failure priority is reference conflict, source identity, target
identity, structure, palette, graphic language, style, then near-copy risk.

## Corrective retry contract

- Schema: `visual-migration-corrective-retry-plan/v1`
- Persistence:
  `visual-migration-corrections/<correctionPlanId>/correction-plan.json`
- Planning is deterministic and makes no LLM call.
- Failure classes map to fixed correction actions.
- The Plan freezes policy ID, Canon ID, capability fingerprint, exact selected
  candidate IDs, Canon/prohibited-transfer rules used, source Audit, and parent
  VM-5 Snapshot authority.
- The overlay uses only frozen Canon semantics, frozen prohibited-transfer
  rules, and existing task/original-Prompt requirements. Missing independent
  structure text falls back to the original compiled Prompt and explicitly
  forbids introducing a new structure.
- The original compiled Prompt is preserved and the bounded overlay is appended
  under `[VISUAL MIGRATION CORRECTIVE OVERLAY v1]`.
- Prompt Source Map records the Plan, Audit, failure classes, fixed actions,
  Canon ID and exact `canonRulesUsed`.

Automatic corrective depth is capped at one. A child is always a new run with
`parentRunId`, `sourceAuditId`, `correctionPlanId`, and depth `1`. The existing
edited-Prompt retry flow reruns the existing pre-submit gates. Before Provider
submission, VM-4 must reproduce the exact parent selected IDs and SHA order,
current capability must equal the frozen capability fingerprint, and current
Policy/Canon/Pack authority must match the parent. A distinct child VM-5
Snapshot is persisted and read back before submission; its Snapshot ID and
Prompt-bound reproducibility fingerprint must differ from the parent.

Every reference, authority, capability, persistence, read-back, or depth
failure closes before Provider submission. The parent run, Snapshot, Audit and
Correction Plan remain unchanged. A failed audit of a depth-1 child cannot
create another automatic child and therefore requires manual review.

## Verification results

| Command or matrix | Result |
|---|---|
| VM-3 through VM-6 targeted tests | PASS, 50/50; VM-6 audit/retry 10/10 |
| `npm test` | PASS, 1694/1694 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run runtime:test` | PASS, Runtime Core 14/14; Runtime Application 1365/1365 |
| `npm run web-runtime:test` | PASS, 15/15 |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web:smoke` | PASS; all JSON checks true; Provider calls 0; business writes 0 |
| `npm run golden:test` | PASS, G-01 through G-05; Provider calls 0; auto-update NO |
| `npm run verify:current-flows` | PASS; Runtime Application 1365/1365; external calls 0 |
| `npm run verify:tracked-runtime-assets` | PASS, 8 declared static assets |
| `npm run verify:repository-contract` | PASS; Provider calls 0; business writes 0; digest auto-update NO |
| `npm run repo:verify` | PASS; repository guard tests 45/45 |
| `npm run repo:check` | PASS; Provider calls 0; business writes 0; Golden update NO |
| `git diff --check` | PASS before freeze record; rerun after freeze-record commit |

On this managed Windows host the Web smoke helper emitted a permission warning
while attempting `Get-CimInstance Win32_Process`, so descendant inspection
count was zero. The smoke still exited successfully and independently verified
host boot, health, renderer, configuration, production routes, zero Provider
calls, zero business writes, and no detected Electron/Desktop processes. The
warning is preserved here rather than hidden.

## Side effects and release boundary

- Real Provider calls during VM-6 verification: `0`
- Provider calls in every fail-closed corrective test: `0`
- Business writes during repository/smoke gates: `0`
- Golden updates: `NO`
- Prompt, digest, or baseline auto-update: `NO`
- Remote pushes or tags: `0`
- Real-provider release smoke: not run; this work freezes the local VM-6
  implementation and does not publish a Web release. A later release still
  requires the separately user-authorized real-provider procedure in the
  repository contract.

## Acceptance gates

- G1-G6 Baseline Safety: PASS
- G7-G15 Audit Evidence: PASS
- G16-G25 Auditor: PASS
- G26-G38 Decision Engine: PASS
- G39-G45 Audit Persistence: PASS
- G46-G54 Correction Plan: PASS
- G55-G70 Corrective Retry: PASS
- G71-G90 Regression and repository gates: PASS

```text
G1-G90 = 90/90 PASS
VM6_FROZEN = YES
VISUAL_MIGRATION_CORE_FROZEN = YES
```

## VM-6.1 Closure Reopen Record

Remote post-freeze audit identified three closure items after commit
`9e9591d2baa47b0c475a165a85973b018c5333c8`:

1. exact-copy integrity covered only the bounded Reference Audit sample rather
   than all selected style references;
2. Audit safe-payload validation did not reject POSIX absolute paths;
3. Audit reads validated record integrity but did not explicitly bind the
   returned project, run, and Audit ID to the requested authority.

The historical VM-6 G1-G90 result above remains intact. Freeze is reopened only
for these three VM-6.1 closure items and will not be restored until the VM-6.1
G1-G61 acceptance matrix passes in full.

## VM-6.1 Remote Audit Closure

Remote-audited previous freeze HEAD:
`9e9591d2baa47b0c475a165a85973b018c5333c8`

Required VM-5 frozen ancestor:
`75a22bbf8562b81353835b4cab802151801feee1`

Tested VM-6.1 implementation HEAD before this refreeze record:
`5f4493a4fcb7d907bc08f6247c73dc622fcc3114`

### Closure commits

| SHA | Message |
|---|---|
| `3b31ecf3` | `docs(visual-migration): reopen VM6 freeze for integrity closure` |
| `d8fa4585` | `fix(visual-migration): close audit integrity gaps` |
| `5f4493a4` | `test(visual-migration): verify VM6.1 audit closure` |

### Changed files

- `packages/runtime-core/src/application/visual-migration-audit-contract.ts`
- `packages/runtime-core/src/application/visual-migration-audit-evidence-resolver.ts`
- `packages/runtime-core/src/application/visual-migration-audit-service.ts`
- `tests/runtime-application/visual-migration-audit.test.ts`
- this baseline record

No VM-3, VM-4, VM-5, corrective-retry, pre-submit, Provider, Space,
Packaging, legacy selector/materializer, or UI file changed in VM-6.1.

### Exact-copy closure proof

Before VM-6.1, deterministic SHA equality used the bounded Reference Audit
sample after `slice(0, 3)`. It now uses all materialized entries whose frozen
role is `style_reference`. The multimodal sample remains separately ordered
with the reserved style first and remains capped at three attachments.

The new fixture selects `style-1` through `style-4`, reserves `style-1`, and
makes the generated output byte-identical to `style-4`. It proves:

```text
Reference Audit sample = style-1, style-2, style-3
sample size = 3
exactCopyDetected = true
decision failureClasses includes NEAR_COPY_RISK
```

A second fixture makes the output byte-identical to a dropped `style-5` while
only `style-1` and `style-2` are selected. It proves
`exactCopyDetected = false`; dropped or merely Pack-present references never
enter the integrity set. Detection remains SHA-256 equality with zero model,
embedding, similarity, or threshold calls.

### Payload and binding closure proof

Audit safe-payload validation now rejects Windows drive paths, UNC paths,
POSIX absolute paths, file URIs, data URIs, and traversal. Dedicated assertions
cover `/tmp/private/image.png` and confirm that ordinary visual prose such as
`logo sits near / above the title`, `ratio is 4/3`, and
`paper / foil contrast is visible` remains valid.

`VisualMigrationAuditService.get()` now validates the immutable record and
then explicitly requires its `projectId`, `runId`, and `auditId` to equal the
requested authority. Valid matching historical Audits remain readable. Each
of project mismatch, run mismatch, and requested Audit-ID mismatch fails with
the existing deterministic `VISUAL_MIGRATION_AUDIT_CONFLICT` code. The Audit
input fingerprint, Audit ID, and Audit fingerprint algorithms are unchanged.

### VM-6.1 verification results

| Command or evidence | Result |
|---|---|
| VM-6 audit + corrective targeted tests | PASS, 12/12 |
| VM-3 through VM-6 targeted suite | PASS, 52/52 |
| `npm test` | PASS, 1694/1694 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run runtime:test` | PASS, Runtime Core 14/14; Runtime Application 1367/1367 |
| `npm run web-runtime:test` | PASS, 15/15 |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web:smoke` | PASS; Provider calls 0; business writes 0 |
| `npm run golden:test` | PASS; Provider calls 0; auto-update NO |
| `npm run verify:current-flows` | PASS; external calls 0 |
| `npm run verify:tracked-runtime-assets` | PASS, 8 declared static assets |
| `npm run verify:repository-contract` | PASS; Provider calls 0; business writes 0; digest auto-update NO |
| `npm run repo:verify` | PASS; repository guard tests 45/45 |
| `npm run repo:check` | PASS; Provider calls 0; business writes 0; Golden update NO |
| `git diff --check` | PASS before refreeze record; rerun after its commit |

One unrelated Document Context in-flight cancellation assertion missed its
timing window during the first high-load Runtime run. Its isolated suite then
passed 8/8, and the complete Runtime suite passed 1367/1367 on the immediate
rerun and on subsequent aggregate gates. No out-of-scope code was changed.

The managed Windows smoke helper retained its existing `Get-CimInstance`
permission warning. The smoke exited successfully and all structured checks
passed; Provider calls and business writes remained zero.

### VM-6.1 acceptance

- G1-G9 Near-Copy Integrity: PASS
- G10-G17 Payload Safety: PASS
- G18-G25 Binding Integrity: PASS
- G26-G36 Scope: PASS
- G37-G61 Regression and side-effect gates: PASS

The original VM-6 G1-G90 remain historical acceptance. VM-6.1 G1-G61 close
the three post-freeze remote-audit findings.

```text
VM6.1 G1-G61 = 61/61 PASS
VM6_FROZEN = YES
VM6_1_CLOSED = YES
VISUAL_MIGRATION_CORE_FROZEN = YES
```
