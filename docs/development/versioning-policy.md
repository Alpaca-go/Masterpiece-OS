# Version naming policy

Masterpiece OS uses independent version domains. A version must describe the
thing that actually changes; product releases, stored schemas, runtime
components, and prompts must not share a generation label.

## Canonical fields

| Field | Meaning | Format | Example |
|---|---|---|---|
| `productVersion` | Shipped Masterpiece OS release | SemVer | `5.0.0-rc.1` |
| `schemaVersion` | Serialized data, IPC, or checkpoint shape | Artifact-local numeric version | `1.0` |
| `componentVersion` | Runtime, compiler, adapter, validator, or policy implementation | `<component>@<semver>` | `short-chain-compiler@4.3.0` |
| `promptVersion` | Prompt contract or prompt template revision | `<prompt>@<semver>` | `creative-reading@1.0.0` |

Trace-specific fields such as `compilerVersion`, `adapterVersion`, and
`validatorVersion` may be retained, but their values follow the
`<component>@<semver>` component-version format.

## Naming rules

- `/VERSION` is the only source of truth for `productVersion`.
- Product release numbers must not be copied into schema versions.
- `V5`, `V6`, `V18`, `vnext`, and phase names are historical generation labels,
  not version domains. Do not introduce them in new active version constants or
  trace values.
- The formal image-generation path is named **Short-Chain**. Existing `vnext`
  IPC channels and on-disk paths remain compatibility contracts until an
  explicit migration is shipped.
- Existing `schemaVersion: '6.0'` Creative Production artifacts remain readable.
  Their value must only change through a reader/writer migration.
- Historical wording is allowed in `CHANGELOG.md`, `docs/archive/`, release
  evidence, compatibility tests, and migration code.

## Ownership

- Product release: `VERSION` and `scripts/sync-product-version.mjs`.
- Schema version: the package that owns the serialized artifact.
- Component and prompt version: the implementation module that emits the trace.
- Compatibility aliases and legacy readers must be explicitly marked and
  tested; they are not names for new code.
