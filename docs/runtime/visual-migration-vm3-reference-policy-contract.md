# Visual Migration VM-3 Task-Aware Reference Policy Contract

Status: `VM3_DEVELOPMENT_CONTRACT_FROZEN`

Base: `10a73464b2949ea1b161a1a67b4ada34f9328e7c`

## Existing reference behavior

VM-3 does not modify the three existing reference authorities below:

| Current module | Frozen behavior | Base blob |
|---|---|---|
| `reference-plan/reference-plan-compiler.js` | identity, structure, style, analysis-only, excluded | `766ef2b92cc4ec05b23e67b7877e75d5e1ffa79a` |
| `reference-plan/reference-plan-materializer.js` | eligible candidates truncated with `slice(0, max)` | `de172bf55b2a50c1c6aee70ae8c52719ad878dcf` |
| `reference-selector.js` | logo, product, identity, style | `b458a3f7ceeae5a58f56aa9c3ad14e484b4f2761` |

These hashes are audit evidence, not runtime configuration. Non-visual-transfer
generation continues to use the existing ordering and truncation behavior.

## VM-3 authority

VM-3 adds an independent, task-scoped policy before Provider capability and
materialization:

```text
Session-linked immutable Canon
  + Canon-linked immutable Reference Pack
  + explicit task
  + explicitly classified current-project image evidence
  -> immutable TaskAwareReferencePolicyV1
  -> allocate(policy, abstract capacity)
```

Only `visual_transfer` is active. Reserved Space, Packaging,
identity-locked, and analysis-led presets fail with
`REFERENCE_POLICY_PRESET_NOT_ACTIVATED`.

## Candidate authority

- Every Reference Pack item becomes a `style_reference` in manifest order.
- Current-project identity or structure candidates require an explicit role
  declaration and a real, ready image asset entity.
- A Locked Asset becomes image-backed only when its `sourceAssetId` resolves
  to that real project image.
- Filenames are never a classification authority.
- `analysis_only` is `non_materializable` and can never be selected.
- Policy artifacts contain stable IDs and semantic metadata only—never local
  paths, absolute paths, bytes, base64, Provider identity, model identity, or
  payload data.

## Frozen visual-transfer law

```text
style floor = 1
identity floor = 1 when identity evidence is required-if-available and exists
structure floor = 1 only when required-if-explicit and an explicitly named
                  structure candidate exists
minimum = style + identity + structure floors
capacity < minimum -> REFERENCE_POLICY_CAPACITY_UNSATISFIABLE
```

One candidate per floor is reserved by source order and candidate ID. Remaining
capacity follows the legacy surplus order:

```text
identity_reference
-> structure_reference
-> style_reference
```

This guarantees style survival without changing the repository-wide default
ordering.

## Persistence and phase boundary

Policies are immutable at:

```text
<project-root>/visual-migration/reference-policies/<policyId>/policy.json
```

There is no active pointer. Allocation results are not written back into the
Policy. VM-3 does not read Provider capability, resolve image paths for a
payload, materialize files, or issue generation/model calls. Those operations
remain VM-4 work.
