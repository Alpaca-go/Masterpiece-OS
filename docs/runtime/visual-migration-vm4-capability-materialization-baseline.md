# Visual Migration VM-4 Capability Materialization Baseline

Status: `FROZEN`

Freeze date: `2026-09-03`

## Repository state

- Branch: `codex/visual-migration-vm4-capability-materialization`
- Required starting HEAD: `8314e764f7f833066fd4e0d95f8420251363a306`
- Tested implementation HEAD: `66ef3ec89c0808d7ebd733f2217f3179f7289357`
- Remote comparison before the freeze-record commit: ahead 4, behind 0
- Working tree before this record: clean
- The freeze-record commit itself is intentionally not part of the tested
  implementation HEAD recorded above.

The repository's older baseline-drift script reports
`BASELINE_DRIFT_DETECTED` because it compares against
`deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`. The exact VM-4 starting HEAD
already contains the approved repository consolidation after that commit,
including removal of Electron and historical v5/vnext paths. The mandated
VM-4 branch and starting HEAD were exact and the working tree was clean; no
VM-4 branch drift or hidden reset occurred.

## Commits

| SHA | Message | Scope |
|---|---|---|
| `3988d00b9a2aba903b8028039f1035147eefa972` | `feat(model-registry): centralize image reference capabilities` | Registry schema/resolver, adapter and Provider consumers, Space compatibility |
| `f24750dbd985048db8ada30a7e293091e6dc77fd` | `feat(visual-migration): materialize allocation-bound references` | Policy-to-capability bridge, evidence materialization, envelope, runtime composition |
| `ab6f431a3d276c03972bc80795613f8467937612` | `test(visual-migration): verify capability-aware reference flow` | Capacity, source, integrity and ordered-set matrix |
| `66ef3ec89c0808d7ebd733f2217f3179f7289357` | `test(model-registry): freeze capability fingerprint contract` | Cross-process and standard SHA-256 equivalence |

## Changed production files

### Model Registry

- `packages/model-registry/src/index.js`

The existing `@masterpiece/model-registry` is the only Provider/model
image-reference capability authority. It returns immutable normalized
`image-reference-capability/v1` snapshots with canonical MIME lists and a
browser-safe, standard SHA-256 capability fingerprint.

### Image Generation adapters and Providers

- `packages/image-generation-adapter/src/multi-model.js`
- `packages/image-generation-adapter/package.json`
- `packages/image-generation-runtime/src/generation/seedream-adapter.js`
- `packages/image-generation-runtime/package.json`
- `packages/image-provider-dashscope/src/index.js`
- `packages/image-provider-dashscope/package.json`

The shared adapter no longer declares private numeric limits. Its legacy
`maxReferences` listing field is a compatibility projection from the Registry
and is `null` for incomplete capabilities. Supplied snapshots are checked for
identity, complete contract equality and fingerprint equality. No adapter
selection, sorting, substitution, `Math.min()` reconciliation or `slice()` was
added.

### Visual Migration Runtime

- `packages/runtime-core/src/application/visual-migration-reference-execution-service.ts`
- `packages/runtime-core/src/application/runtime-services.ts`
- `packages/runtime-core/package.json`

### Repository metadata

- `package-lock.json`

The frozen VM-3 Policy contracts, allocator, service and schema were not
modified. No final production diff exists under the frozen Packaging subtree.

## Capability authority table

| Model | Registry capability | Evidence status | VM-4 `visual_transfer` | Notes |
|---|---|---|---|---|
| `gpt-image-2` | `referenceSupport=true`; numeric max and MIME contract absent | Incomplete | Fail closed with `PROVIDER_CAPABILITY_INCOMPLETE` | Historical adapter value 16 was removed and not promoted |
| `nano-banana` / runtime Gemini | `referenceSupport=true`; no unambiguous universal numeric max/MIME record | Incomplete | Fail closed with `PROVIDER_CAPABILITY_INCOMPLETE` | Historical adapter value 10 was removed and not promoted |
| `seedream-5.0-pro` | max 10; `image/jpeg`, `image/png` | Accepted | Enabled | Capability fingerprint `5143cbe6290089eb2bd1f451683fcad44bf74577383c9307c32313911d11bea0` |
| `wan2.7-image-pro` | max 9; `image/bmp`, `image/jpeg`, `image/png`, `image/webp` | Accepted | Enabled | Capability fingerprint `652c6040e58c5e61e286f4de5df2c126eb77b26a2bc698ca7948b08b6496d86e` |

Provider documents remain changeable external evidence. This freeze records
only the accepted contract at implementation time; unresolved Providers are
not reported as supported.

## Capacity matrix

The test fixture's first Pack style candidate is
`vrpc-129af88c3413e209`. Every successful row asserts ordered equality through
the dry-run Provider request builder.

| Case | Capability max | Allocation IDs | Materialized IDs | Provider envelope IDs | Provider calls | Result |
|---|---:|---|---|---|---:|---|
| A | 1 | `[vrpc-129af88c3413e209]` | exact allocation | exact allocation | 1 | PASS, style × 1 |
| B | 1 | fail before allocation result | none | none | 0 | PASS, required identity + style is unsatisfiable |
| C | 2 | `[identity-1, vrpc-129af88c3413e209]` | exact allocation | exact allocation | 1 | PASS, identity × 1 + style × 1 |
| D | 3 | `[identity-1, identity-2, vrpc-129af88c3413e209]` | exact allocation | exact allocation | 1 | PASS, identity × 2 + style × 1 |
| E | 2 | fail before allocation result | none | none | 0 | PASS, identity + required structure + style is unsatisfiable |
| F | 3 | `[identity-1, structure-1, vrpc-129af88c3413e209]` | exact allocation | exact allocation | 1 | PASS, identity + structure + style |

The synthetic capacities in A-F are injected only through the contract-test
resolver seam. The production composition root omits that seam and always uses
`resolveImageReferenceCapability` from `@masterpiece/model-registry`.

## Materialization source matrix

| Source or failure | Result |
|---|---|
| Production Reference Pack | PASS: VM-1 service resolves exact production-owned bytes; manifest, project, realpath, ordinary-file, byte count and SHA are checked again |
| Locked Asset | PASS: `locked_asset -> sourceAssetId -> Project Store`; missing source and cross-project lock fail closed |
| Project Asset | PASS: exact current-project ready image; missing, not-ready, non-image, path escape and SHA mutation fail closed |
| Task Reference | PASS: task membership plus execution-local `candidateId -> imageAssetId`; missing locator fails with `TASK_REFERENCE_LOCATOR_MISSING` |
| Analysis Only | PASS: allocator never selects it; materializer hard-fails if a non-materializable candidate reaches it |
| MIME mismatch | PASS: Registry canonical allowlist is enforced before request construction |
| Path tamper / missing Pack file | PASS: `REFERENCE_MATERIALIZATION_PATH_UNSAFE` before Provider |
| Hash tamper | PASS: `REFERENCE_EVIDENCE_INTEGRITY_FAILED` before Provider |
| Cross-project | PASS: `REFERENCE_MATERIALIZATION_PROJECT_MISMATCH` before Provider |

No materialization failure substitutes another candidate. The materialization
result is transient and is not persisted as a Generation Evidence Snapshot.

## Ordered invariant proof

Case C freezes the exact invariant:

```text
allocation.selectedCandidateIds = [identity-1, vrpc-129af88c3413e209]
materializedCandidateIds        = [identity-1, vrpc-129af88c3413e209]
providerEnvelopeCandidateIds    = [identity-1, vrpc-129af88c3413e209]
```

An explicit reversed-reference test fails with
`REFERENCE_MATERIALIZATION_SET_MISMATCH`. The provider-role projection is:

```text
identity_reference  -> current_project_identity
structure_reference -> current_project_product
style_reference     -> reference_style
```

## Legacy route regression

- Space Reference-First: unchanged product ceiling 2. Seedream's objective
  Provider max is 10, so the effective Space max remains `min(2, 10) = 2`.
- Packaging Reference-First: frozen Packaging production subtree has zero
  final diff; Shot Contract and Reference Policy behavior are unchanged.
- Legacy Reference Plan: unchanged and remains available only to existing
  legacy routes.
- Legacy selector: unchanged and is not invoked after VM-3 allocation on
  `visual_transfer`.

## Test results

| Command | Result |
|---|---|
| `node --test tests/model-registry.test.js` | PASS, 7/7 |
| `npx tsx --test tests/runtime-application/visual-migration-reference-execution-service.test.ts` | PASS, 15/15 |
| `npm test` | PASS, 1694/1694 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run runtime:test` | PASS, Runtime Core 14/14 and Runtime Application 1345/1345 |
| `npm run web-runtime:test` | PASS, 15/15 |
| `npm run web-runtime:typecheck` | PASS |
| `npm run web:typecheck` | PASS |
| `npm run web:build` | PASS |
| `npm run web:smoke` | PASS, all reported JSON checks true; Provider calls 0, business writes 0 |
| `npm run golden:test` | PASS, G-01 through G-05; Provider calls 0; auto-update NO |
| `npm run verify:current-flows` | PASS; Runtime Application 1345/1345; external API calls 0 |
| `npm run verify:tracked-runtime-assets` | PASS, 8/8 declared assets |
| `npm run verify:repository-contract` | PASS; Provider calls 0; business writes 0 |
| `npm run repo:verify` | PASS; repository guard tests 45/45 |
| `npm run repo:check` | PASS |
| `git diff --check` | PASS after freeze-record commit |

On this managed Windows host, the Web smoke helper printed a permission warning
while attempting `Get-CimInstance Win32_Process`; its process inspection count
was therefore zero. The smoke command still exited 0 and its host, health,
renderer, configuration, route reachability, zero-Provider-call and
zero-business-write checks all passed. This warning is recorded rather than
suppressed.

## External effects and scope

- Real Provider calls: 0
- Business writes during guard/smoke tests: 0
- Golden updates: NO
- Digest or baseline auto-update: NO
- VM-5 persistent Generation Evidence Snapshot implementation: NO
- VM-6 Similarity Audit / STYLE_DRIFT / NEAR_COPY_RISK / retry implementation: NO
- Frozen VM-3 Policy schema changed: NO
- New parallel Capability Registry: NO
- New Electron/Desktop adapter: NO
- Legacy Space, Packaging, analysis-led and selector/materializer migration: NO

## Acceptance gates

G1-G28: PASS (28/28). No blocking gate remains.

```text
VM4_FROZEN = YES
VM5_UNLOCKED = YES
```
