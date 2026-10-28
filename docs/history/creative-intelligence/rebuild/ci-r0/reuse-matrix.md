# CI-R0 Reuse Matrix

Each row has one primary classification. `KEEP_FROZEN` means the capability is
live and may be called only through its current public/application boundary.

| Item | REUSE | ADAPT | KEEP_FROZEN | DEPRECATE | DO_NOT_USE | Why |
|---|:---:|:---:|:---:|:---:|:---:|---|
| Document role classifier and corpus preparation | ✓ | | | | | Semantic role classification and bounded corpus preparation fit V1 intake |
| Runtime document parser | | ✓ | | | | Parser is reusable, but V1 needs a Design Brief adapter and PPT/PPTX extension |
| Document Context service | | | ✓ | | | Live schema/prompt/persistence authority used by current UI and CI |
| Project Store | | | ✓ | | | Canonical project and local asset persistence authority |
| `ProjectAsset` as `USER_REFERENCE` storage | | ✓ | | | Strong local asset identity; lacks research/search provenance |
| Project Context / Context Resolver | | | ✓ | | | Current grounding and merge authority |
| Reference First protocol | | | ✓ | | | Current explicit reference and generation behavior is baseline-sensitive |
| Reference Anchor upload/approval flow | | ✓ | | | Useful intake and human-decision patterns; domain is generation-oriented |
| CI truth/evidence primitives | | ✓ | | | Evidence discipline is reusable behind V1 contracts |
| CI need/insight/opportunity primitives | | ✓ | | | Useful deterministic transforms, but current inputs/outputs are not V1 models |
| CI concept/direction/evaluation primitives | | ✓ | | | Candidate/gate/evaluation logic can sit behind a V1 adapter |
| CI selection state/history | | ✓ | | | Revision/history rules are useful; selection target is direction, not reference |
| Current CI application service | | | ✓ | | | Live product flow; freeze during migration instead of extending into V1 |
| Current CI monolithic Web workspace | | | | ✓ | | Keep operational, then replace after V1 parity and migration |
| Creative Production Runtime | | | ✓ | | | Live deterministic production package with many consumers |
| Creative Session schema `6.0` | | | ✓ | | Production lifecycle, not research/search lifecycle |
| Anchor Candidate application surface | | ✓ | | | Can receive V1 Direction Board handoff without exposing internals |
| Anchor Production current CI sub-run | | | ✓ | | Live approval/history contract and image-generation bridge |
| Model Registry | ✓ | | | | | Current provider-selection authority |
| Model Runtime analysis/Vision adapters | ✓ | | | | | Existing multimodal analysis boundary |
| Image-generation application service | | | ✓ | | | V1 AI exploration must call it through an adapter |
| Web Runtime operation graph | | ✓ | | | Reuse host/RPC authority; add only semantic V1 operations later |
| Node settings and credential store | ✓ | | | | | Existing profile and secret authority |
| `VisualAssetUploader` | | ✓ | | | | Strong local upload UX; source roles and metadata need V1 props |
| CI Direction cards/dialog/drawer patterns | | ✓ | | | | Useful interaction patterns but local to a large component |
| Short-Chain `OutputGallery` | | ✓ | | | | Grid/A-B interaction is useful; current item contract is generated-output-specific |
| Short-Chain `PreviewCanvas` | | ✓ | | | | Useful AI-exploration display pattern; generation-state-specific |
| App shell, top bar, buttons, cards, confirm dialogs | ✓ | | | | | General UI primitives |
| Packaging and Space | | | ✓ | | | Read-only downstream handoff; no CI-R0/CI-R1 internal changes |
| `analysis-runtime` compatibility facades | | | ✓ | | | Existing import compatibility; remove only after zero consumers |
| `adaptLegacyRun` readers | | | ✓ | | | Persisted compatibility readers |
| Historical CI phase docs and deleted harnesses | | | | | ✓ | Historical evidence only; not a current implementation source |
| A second Provider/credential system | | | | | ✓ | Would violate current authority and duplicate infrastructure |
| LLM-generated “search results” | | | | | ✓ | Not real web/image search and lacks verifiable provenance |

## New capabilities required

- `ReferenceSearchGateway`
- Web reference source/provenance metadata
- Search query and search history persistence
- Reference-region/crop selection model
- Negative-signal model bound to user actions
- Preference-evidence mapping from selections/rejections
- Reference board and Direction Board contracts
- PPT/PPTX parser support if V1 requires the advertised format set

These are findings, not CI-R0 implementation authorization.
