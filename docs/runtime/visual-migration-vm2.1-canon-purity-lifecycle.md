# Visual Migration VM-2.1 Canon Purity and Lifecycle Closure

Status: `VM2_FROZEN`

VM-3 status: `VM3_UNLOCKED`

Implementation base: `976e4ddff9c88c50cd6525c07863092a24a37714`

Branch: `codex/visual-migration-vm2.1-canon-purity-lifecycle`

## Closed defects

VM-2.1 closes the remaining semantic-purity and persistence-lifecycle gaps in
`VisualMigrationCanonV1`:

- `StyleProfile.allowedVariations` is no longer flattened into
  `extensionMechanism`. Extension rules come only from the approved Capsule.
- Style Profile enrichment remains limited to its explicit color,
  layout/typography, graphic-language, and material/photography fields.
- Canon compiler identity is `1.1.0` and is recorded in both `source` and
  `trace`.
- Compiler identity participates in `sourceFingerprint`, and therefore in the
  deterministic `canonId`, preventing collision with VM-2 compiler output.
- `canon.json` is immutable after first creation. Lifecycle selection is owned
  exclusively by `active.json`.
- Activating a new Canon never rewrites the old Canon's status, timestamps, or
  semantic bytes.
- A failed active-pointer write fails the handoff, preserves the old active
  pointer and old Canon, and cannot create a Session linkage to the orphan
  Canon.

Legacy VM-2 Canon files without compiler identity remain read-only resolvable.
New Canon output always includes compiler identity and validates source/trace
agreement plus source-fingerprint participation.

## Persistence authority

```text
<project-root>/visual-migration/canons/
├── active.json                 # sole active lifecycle authority
└── <canonId>/canon.json        # immutable semantic artifact
```

Creation and activation use this order:

```text
build deterministic Canon
-> validate existing active pointer and linked evidence
-> write a new canon.json only when absent
-> read back and validate the immutable Canon
-> atomically write active.json when selection changes
-> read back and validate the pointer
-> resolve active Canon and linked Reference Pack
-> return success and allow Session linkage
```

No `lifecycle.json` or new runtime static-asset basename was introduced.

## Acceptance evidence

All VM-2.1 gates G1-G20 passed:

- Purity tests prove all five approved Capsule dimensions remain intact and
  extension rules contain no color, layout, graphic, or material pollution.
- Compiler tests prove deterministic equality for one compiler, distinct
  source fingerprints/Canon IDs across compiler identities, fail-closed
  source/trace mismatch, and legacy/current Canon coexistence.
- Immutable lifecycle tests prove byte-for-byte old-Canon preservation,
  unchanged bytes and mtime on identical reuse, active-pointer switching,
  pointer-write failure recovery, Session non-linkage, and restart recovery of
  Canon plus Reference Pack.
- Runtime Application: 1315/1315 passed.
- Runtime Core plus Runtime Application: 1329/1329 passed.
- Root test suite: 1687/1687 passed.
- CLI: 40/40 passed.
- Node Web Host: 15/15 passed.
- Web typecheck and production build passed.
- `verify:current-flows`, `verify:tracked-runtime-assets`,
  `verify:repository-contract`, `repo:verify`, Web primary smoke, Golden
  regression, and the aggregate `repo:check` all passed.
- Repository Contract reported Provider calls `0`, business writes `0`, and no
  Golden or frozen-prompt mutation.
- Web primary smoke and Golden regression independently reported Provider
  calls `0`.

## Scope proof

VM-2.1 changed no Provider, Reference Plan, Materializer, Audit, Retry, Space,
Packaging, or Creative Intelligence shadow-Canon behavior. It made no model
calls. The tracked fixture is a fresh deterministic VM-2.1 integration output
with compiler identity and Capsule-only extension rules.

## VM-3 input boundary

VM-3 may consume the frozen Canon only as an identity-clean,
transfer-dimension-clean, reference-evidence-linked, compiler-versioned,
immutable, fingerprinted, and restart-resolvable authority. Task-aware
reference selection remains VM-3 work; VM-3 must not repair or reinterpret the
Canon.
