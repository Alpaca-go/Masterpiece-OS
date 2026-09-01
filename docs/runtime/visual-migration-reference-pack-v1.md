# Visual Migration Reference Pack V1

Status: frozen for VM-0 / implemented by VM-1.

## Authority boundary

Reference Anchor produces two distinct inputs for visual production:

- Semantic rules: the Reference Style Capsule, Anchor Brief, Creative Decision,
  and Style Profile explain what may or may not transfer.
- Visual evidence: the original approved reference image bytes explain which
  pixel evidence grounded those rules.

Semantic rules never substitute for visual evidence. A production handoff is
successful only when the evidence pack is persisted and linked to the Creative
Session. This contract is separate from the legacy Visual Memory
`ReferencePack`; neither schema changes the other.

## Manifest contract

`VisualMigrationReferencePackV1` uses schema version
`visual-migration-reference-pack/v1` and contains:

- stable `referencePackId`, owning `projectId`, and
  `sourceReferenceAnchorRunId`;
- `sourceFingerprint` and canonical `manifestFingerprint`;
- immutable reference entries with a project-relative `storagePath`, original
  filename, MIME type, byte size, actual-bytes SHA-256, and the VM-1 default
  role `style_reference`;
- optional semantic evidence fingerprints and semantic entity identifiers.

The reserved `authority`, `transferableDimensions`, and
`forbiddenDimensions` fields carry no provider or materialization behavior in
VM-1.

## Storage and identity

The owning project stores each pack at:

```text
visual-migration/reference-packs/<referencePackId>/
├── manifest.json
└── assets/
    └── <referenceId>.<extension>
```

All manifest paths are POSIX-style locators relative to the project root.
Absolute paths, backslash paths, empty segments, and traversal segments are
invalid. The service resolves and verifies paths against both the project root
and the immutable pack root.

Pack identity is deterministic over the project, approved Reference Anchor Run,
and source fingerprint. The source fingerprint canonically includes the
project, source run, sorted reference byte hashes, Capsule fingerprint, and
Brief fingerprint. Repeating an unchanged handoff resolves the same pack;
mutating an already handed-off source run is an integrity error and never
overwrites the old pack.

## Atomicity and compatibility

VM-1 copies evidence into a temporary sibling directory, verifies every copied
SHA-256, writes the validated manifest atomically, then renames the complete
directory into place. The Creative Session receives `referencePackId` only
after the pack and existing semantic extraction both succeed. Pack persistence
failure aborts the handoff before semantic production state is created.

Legacy Creative Sessions without `referencePackId` remain valid. VM-1 does not
change Reference Plan priority, provider capacity, reference materialization,
Space or Packaging behavior, or model-call count.
