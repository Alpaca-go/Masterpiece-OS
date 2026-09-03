# Visual Migration VM-4 Provider Capability Authority Audit

Status: `VM4_CAPABILITY_AUDIT_COMPLETE`

Audit date: `2026-09-03`

VM-3 frozen parent: `1b911dc07334b7c7590e4b708718e80e4809d2d9`

VM-3 remote head verified before closure:
`2bceae3c9d69e08ca8f026c3e314ba1a944f12e5`

Branch: `codex/visual-migration-vm4-capability-materialization`

## Scope and method

This audit is documentation-only. It searched current applications, packages,
contracts, schemas, tests, and repository metadata for image-reference support,
multi-reference support, MIME declarations, `maxReferenceImages`,
`maxReferences`, reference slicing, and reference ordering. It also traced the
current Space, Packaging, legacy Reference Plan, shared multi-model adapter,
DashScope Provider, and VM-3 allocation call paths.

No Provider was called and no production implementation was changed.

## Current authority matrix

`Registry max` is the value in `packages/model-registry/src/index.js`.
`Adapter max` is a Provider/adapter-owned numeric declaration, not a route
product-policy ceiling.

| Provider | Model | Registry max | Adapter max | Selector assumption | Materializer assumption | Actual Provider contract evidence | Proposed authority | Conflict |
|---|---|---:|---:|---|---|---|---|---|
| OpenAI | `gpt-image-2` | missing | 16 in `multi-model.js` | Legacy selector consumes caller capability, then identity-first sorts and slices | Legacy plan consumes caller capability and slices in plan order | Official Image API documents one-or-more reference images and demonstrates four inputs, but the public page inspected in this audit does not state a numeric maximum | Existing Model Registry, after adding a verified image-reference capability record | **Open**: 16 is adapter-local and not independently supported by the inspected official contract; keep this model fail-closed for VM-4 until the registry value has accepted evidence |
| Google | registry alias `nano-banana` -> runtime `gemini-3.1-flash-image` | missing | 10 in `multi-model.js` | Same legacy caller-driven sort/slice | Same legacy caller-driven slice | Official Gemini documentation states up to 14 total references for Gemini 3 image models; Gemini 3.1 Flash Image separately identifies up to 10 high-fidelity objects and 4 characters | Existing Model Registry | **Yes**: the adapter's undifferentiated 10 is neither the documented total limit nor represented as a deliberate product limit |
| Volcengine | `seedream-5.0-pro` / configured concrete Seedream model | 10 | 10 in `multi-model.js`; 2 in Short-Chain adapter | Legacy selector can apply another caller-provided cap | Legacy plan can apply another caller-provided cap | Current Registry and shared execution adapter agree on 10. Official Seedream multi-image documentation available to this audit confirms a 10-image family limit; exact concrete 5.0 endpoint evidence remains an integration record concern | Existing Model Registry | **Yes, resolved for architecture**: Short-Chain 2 duplicates the Space product-policy UX ceiling and must not remain a Provider capability authority |
| DashScope | `wan2.7-image-pro` | missing | 9 in `DASHSCOPE_CAPABILITIES` | Wan adapter validates against Provider constant; legacy selector may still use a separate caller value on legacy routes | Legacy plan may still use a separate caller value | Official Wan 2.7 documentation states 0-9 input images, ordered by the content array | Existing Model Registry | **Yes**: the verified value exists only in the Provider package, not the Registry |

Official evidence inspected:

- OpenAI Image generation guide:
  <https://developers.openai.com/api/docs/guides/image-generation>
- Google Gemini image generation guide:
  <https://ai.google.dev/gemini-api/docs/image-generation>
- Google supported image input MIME types:
  <https://ai.google.dev/gemini-api/docs/image-understanding>
- Volcengine multi-image generation documentation:
  <https://www.volcengine.com/docs/85621/1863351>
- Alibaba Cloud Wan 2.7 image API reference:
  <https://help.aliyun.com/en/model-studio/wan-image-generation-and-editing-api-reference>

## Conflicting sources and their disposition

### Model Registry

The existing Model Registry is already the declared Packaging capability
authority. `resolvePackagingProviderCapability` explicitly projects
`registered.maxReferenceImages` and rejects unregistered models. Seedream is
the only current image model whose Registry entry has a numeric limit.

This is the correct current authority to extend. Creating another
`ImageProviderCapabilityRegistry` package would violate the repository's
single-authority rule.

### Shared multi-model adapter

`packages/image-generation-adapter/src/multi-model.js` privately owns 16, 10,
and 10 limits. Its input validator rejects above those numbers. This duplicates
Registry responsibility and would permit Registry/adapter drift. The adapter
must consume a resolved Registry capability and validate equality; it must not
rank, slice, substitute, or silently drop references.

### Seedream Short-Chain adapter and Space product policy

`generation/seedream-adapter.js` reports 2 as a Provider capability. Separately,
`space/product-policy.js` documents 2 as the Reference-First UX/product ceiling
and combines it with adapter capacity using `min(productPolicy, adapter)`.
Because the Registry/shared adapter limit is 10, the Short-Chain declaration
has collapsed a route policy into Provider capability.

The architecture-preserving correction is:

```text
Provider capability max = Model Registry value
Space effective max = min(Space product policy max, Provider capability max)
```

This retains Space behavior at 2 without allowing Space to redefine the
Provider's objective capability.

### DashScope Provider

`DASHSCOPE_CAPABILITIES.maxReferenceImages = 9` matches the official Wan 2.7
contract. It must become a projection/validation of the Registry record rather
than a second authoritative declaration. Provider serialization order remains
valid because the official contract makes input array order significant.

### Legacy selector and materializer

`reference-selector.js` sorts identity/product/style roles and slices to the
caller capability. `reference-plan-materializer.js` slices eligible items in
plan order. Both remain valid legacy behavior for existing routes, but neither
may run after VM-3 allocation on `visual_transfer`.

### Capability MIME gap

No current Registry entry declares supported reference MIME types. The shared
multi-model adapter only requires a non-empty MIME string. The VM-1 Pack and
VM-3 builder accept PNG, JPEG, and WebP, while Provider support differs. VM-4.1
must add a canonical, sorted MIME allowlist per image model and VM-4.3 must
validate selected evidence against that allowlist before Provider dispatch.

## VM-3 to VM-4 execution feasibility

- VM-3 allocation is deterministic and returns the final ordered
  `selectedCandidateIds`.
- Reference Pack candidates resolve through the production Pack service, which
  already enforces project/pack containment, realpath containment, byte size,
  and SHA-256.
- `locked_asset` declarations have an authoritative `sourceAssetId` mapping to
  Project Store assets.
- `project_asset` declarations use the project asset ID directly.
- `task_reference` declarations are validated against task membership and a
  ready project image through `imageAssetId`; that locator is intentionally not
  persisted in the frozen semantic Policy. VM-4 must carry the declaration's
  `candidateId -> imageAssetId` mapping as an execution-local locator. No local
  path or new field is required in the VM-3 schema.

Therefore Candidate Materialization can be implemented without modifying the
frozen VM-3 Policy contract and without accepting arbitrary external paths.

## VM-4.1 authority decision

The audit establishes the following single truth source:

> All image-reference Provider/model capabilities are owned by the existing
> `@masterpiece/model-registry`. Provider adapters, Space product policy,
> selectors, materializers, and route services may only resolve, validate, and
> consume its immutable capability snapshot.

VM-4.1 must extend the existing Registry with a capability-versioned resolver
and deterministic fingerprint. It must not introduce a parallel registry.
Unknown provider/model pairs and registered image models without accepted
numeric/MIME evidence fail closed with `PROVIDER_CAPABILITY_NOT_FOUND`.
Adapter disagreement fails closed with
`PROVIDER_CAPABILITY_CONTRACT_MISMATCH`.

The visual-transfer route may proceed only for a capability record that is
complete. This permits Seedream and Wan evidence to be centralized while the
unverified OpenAI numeric limit remains explicitly unavailable rather than
silently trusting the adapter-local 16.

## Route preservation decision

| Route | VM-4 treatment |
|---|---|
| `visual_transfer` | VM-3 allocation -> VM-4 materialization -> Provider envelope; no legacy reselection |
| Space Reference-First | Preserve product ceiling and current selection behavior; read Provider max from Registry when capability wiring is changed |
| Packaging Reference-First | Preserve current behavior; existing Registry-based resolver remains a consumer |
| Analysis-led / legacy generation | Preserve legacy selector and Reference Plan behavior |

## Audit gate

`VM4_CAPABILITY_AUTHORITY_PROVEN = YES`

`VM4_1_IMPLEMENTATION_UNLOCKED = YES`

The open GPT Image evidence item does not block the Registry architecture: it
blocks only that model's VM-4 visual-transfer capability record. No ambiguous
number will be installed as authority merely to activate the route.
