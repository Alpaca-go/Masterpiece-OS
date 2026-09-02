# Visual Migration VM-3 Reference Policy Baseline

Status: `VM3_FROZEN`

Next stage: `VM4_UNLOCKED`

Implementation base: `10a73464b2949ea1b161a1a67b4ada34f9328e7c`

Verified implementation head: `049da274`

Branch: `codex/visual-migration-vm3-task-aware-reference-policy`

## Frozen outcome

VM-3 adds a deterministic, Provider-independent
`TaskAwareReferencePolicyV1` between the Session-linked VM-2 Canon and future
reference materialization. The policy combines the immutable Canon and its
revalidated VM-1 Reference Pack with an explicit task and explicitly
classified current-project image evidence.

Only the `visual_transfer` preset is activated. The reserved
`reference_first_space`, `packaging_reference_first`,
`identity_locked_generation`, and `analysis_led` presets fail closed with
`REFERENCE_POLICY_PRESET_NOT_ACTIVATED`.

The schema is `visual-migration-reference-policy/v1` and the frozen compiler
version is `1.0.0`. Compiler identity, project identity, Canon and Pack
fingerprints, normalized task identity, and normalized candidate-set identity
all participate in `sourceFingerprint`. The deterministic policy ID is:

```text
vrp-<first 32 hex chars of sha256(canonical({ projectId, sourceFingerprint }))>
```

`policyFingerprint` is the SHA-256 fingerprint of the complete canonical
policy semantic object excluding only `policyFingerprint` itself.

## Production chain

```text
Creative Session Canon linkage
  -> resolve and validate immutable VM-2 Canon
  -> resolve and validate Canon-linked immutable VM-1 Reference Pack
  -> normalize explicit task and current-project candidate declarations
  -> immutable TaskAwareReferencePolicyV1
  -> allocate(policy, abstract maxReferences)
```

Policy construction does not read Provider identity, model identity, Provider
payload, or a concrete capability source. Capacity is an allocator input and
does not participate in policy identity.

## Candidate authority

- Reference Pack items are `style_reference` candidates in manifest order.
- Identity and structure candidates require an explicit declaration and a
  ready, image-backed current-project asset.
- Image-backed Locked Assets must resolve through their `sourceAssetId`.
- Filename patterns are not a classification authority.
- The same source entity cannot be assigned multiple policy roles.
- `analysis_only` candidates are `non_materializable` and never selected.
- Policy JSON contains stable IDs and semantic metadata only. Absolute/local
  paths, traversal, image bytes, base64, Provider/model fields, payload fields,
  and capacity fields are rejected.

## Frozen visual-transfer allocation law

```text
style floor = 1
identity floor = 1 only when required-if-available and eligible evidence exists
structure floor = 1 only when required-if-explicit and an explicitly named
                  eligible structure candidate exists
minimum required = style + identity + structure floors
capacity below minimum = REFERENCE_POLICY_CAPACITY_UNSATISFIABLE
```

One candidate per active floor is reserved by source order and candidate ID.
Remaining capacity preserves the legacy surplus order:

```text
identity_reference
-> structure_reference
-> style_reference
```

The required scenario matrix passed:

| Eligible candidates | Capacity | Frozen result |
|---|---:|---|
| style × 4 | 1 | one style survives |
| identity × 2 + style × 4 | 1 | fail closed: unsatisfiable |
| identity × 2 + style × 4 | 2 | first identity + reserved style |
| identity × 2 + style × 4 | 3 | two identities + reserved style |
| identity + structure + style, structure required | 2 | fail closed: unsatisfiable |
| identity + structure + style, structure not required | 2 | identity + reserved style |

## Persistence and lifecycle

```text
<project-root>/visual-migration/reference-policies/<policyId>/policy.json
```

There is no active pointer and allocation output is not written back into the
policy. Equal source input reuses the existing policy without changing its
bytes or modification time. Changed source input creates a new policy ID and
does not alter the old policy. A restarted service resolves both old and new
policies. Reads revalidate policy fingerprints, deterministic IDs, Canon
fingerprints, and Canon-to-Pack linkage. Policy, Canon, Pack, and persistence
tampering fail closed.

## Frozen legacy scope

VM-3 made no change to Provider adapters, reference materialization, global
reference selection, Space, Packaging, Audit/Retry, VM-2 Canon, or VM-1
Reference Pack behavior. The legacy reference files retained their base blobs:

| Module | Blob |
|---|---|
| `reference-plan/reference-plan-compiler.js` | `766ef2b92cc4ec05b23e67b7877e75d5e1ffa79a` |
| `reference-plan/reference-plan-materializer.js` | `de172bf55b2a50c1c6aee70ae8c52719ad878dcf` |
| `reference-selector.js` | `b458a3f7ceeae5a58f56aa9c3ad14e484b4f2761` |

Existing Reference Plan and selector regression tests pass with identity-first
legacy ordering unchanged.

## Acceptance and verification evidence

All G1–G24 gates passed:

- exact base `10a73464...`, behind `0`;
- VM-2 Canon and VM-1 Pack contracts unchanged;
- complete deterministic policy contract and compiler identity;
- no Provider/model/path/bytes/capacity fields in policy artifacts;
- only `visual_transfer` activated;
- style, conditional identity, and explicit-only structure floors verified;
- capacity fail-closed and all six required scenarios verified;
- `analysis_only` never selected;
- equal-source byte and mtime stability verified;
- changed-source immutability, restart resolution, tamper detection, and
  Canon-to-Pack revalidation verified;
- existing Reference Plan live behavior unchanged;
- Provider/model calls `0`;
- full repository regression passed.

Commands and results:

- VM-3 targeted tests: `15/15` pass.
- `npm run runtime-application:test`: `1330/1330` pass.
- `npm run runtime:test`: pass, including `1330/1330` Runtime Application tests.
- `npm test`: `1687/1687` pass.
- `npm run cli:test`: `40/40` pass.
- `npm run web-runtime:test`: `15/15` pass.
- `npm run web-runtime:typecheck`: pass.
- `npm run web:build`: pass; the existing large-chunk advisory is non-blocking.
- `npm run verify:current-flows`: pass with no external API calls.
- `npm run verify:tracked-runtime-assets`: pass.
- `npm run verify:repository-contract`: pass; Provider calls `0`, business
  writes `0`, Golden changed `NO`.
- `npm run repo:verify`: pass.
- `npm run web:smoke`: pass; Provider calls `0`, business writes `0`, and no
  Electron/Desktop process.
- `npm run golden:test`: pass; Provider calls `0`, auto-update `NO`.
- `npm run repo:check`: pass.
- `git diff --check`: pass.

## Next boundary

VM-4 is unlocked to consume a validated policy and abstract allocation at the
materialization/Provider-capability boundary. VM-4 must not mutate frozen VM-3
policy identity or floors, must not overwrite policy JSON, and must preserve
legacy behavior outside the explicitly activated visual-transfer path.
