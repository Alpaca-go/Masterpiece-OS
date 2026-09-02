# Visual Migration Canon V1 Contract

Status: `VM2_CONTRACT_FROZEN`

## Responsibility

`VisualMigrationCanonV1` is the production semantic authority for one approved
Visual Migration handoff. It aggregates project identity, Locked Assets,
approved Capsule transfer rules, the derived Style Profile, and a foreign key
to the immutable Production Reference Pack. It stores no image bytes, Provider
parameters, Reference Plan, materialized reference selection, or model output.

The Creative Intelligence Visual Canon remains an independent shadow artifact:
`authoritative: false`, `mode: shadow`, and Selected Direction as sole source.

## Source precedence

1. Project Identity, Locked Facts, and Locked Assets.
2. User-approved Reference Style Capsule.
3. Style Profile and Creative Decision derived from that Capsule.
4. Optional advisory compatibility sources, which VM-2 does not require.

Reference identity can never override project identity. Capsule and Style
Profile conflicts fail closed. Reference Pack content is visual evidence only
and never participates in textual-rule precedence.

## Fingerprints

- Canonical serialization reuses `canonicalSerializeVisualMigrationValue()`.
- `projectIdentityFingerprint` hashes stable project identity fields.
- `lockedAssetFingerprint` hashes sorted semantic Locked Asset records.
- `styleProfileFingerprint` hashes the validated Style Profile.
- `sourceFingerprint` hashes all source fingerprints, Pack fingerprints,
  project id, and Creative Decision id.
- `canonFingerprint` hashes semantic Canon content while excluding Canon id,
  lifecycle status, creation/update timestamps, and the fingerprint itself.
- `canonId` is `vmc-` plus the first 32 hexadecimal characters of the canonical
  SHA-256 of `{ projectId, sourceFingerprint }`.

## Persistence and lifecycle

```text
<project-root>/visual-migration/canons/
├── active.json
└── <canonId>/canon.json
```

Equal source content reuses the same Canon. A changed formal source creates a
new Canon, marks the former active Canon `superseded`, retains its semantic
content, and atomically advances the active pointer. Integrity resolution also
resolves and verifies the referenced VM-1 Production Reference Pack.

Legacy Sessions without Canon linkage remain readable and do not create a
Canon until an explicit Visual Migration handoff is executed.

## Generated fixture

`docs/runtime/fixtures/visual-migration-canon-v1.example.json` was copied from
the persisted `canon.json` produced by the real Quick Extraction → Reference
Pack → Canon integration test. Project and run identifiers are synthetic; the
fixture contains no absolute paths, image bytes, Provider parameters, or model
responses. The contract test validates it on every run.
