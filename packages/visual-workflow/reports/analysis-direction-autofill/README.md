# B1 analysis direction autofill — offline acceptance

Scope: B1 only. Baseline HEAD `9a93bc1aec6e0d9c272c789a8230e141041375e1`, Tree `c6bdd114003762b50965a7a0f4047a7987651de6`, origin `Alpaca-go/Masterpiece-OS`. Development branch: `codex/b1-analysis-direction-autofill`. Separate checkout: `E:/MP-B1`. The original checkout stays on the baseline with a clean working tree.

## Behavior

`analysisDirectionSuggestion(projectId, packet, analysisFingerprint)` is a pure, deterministic projection. It rejects another project's Packet. It returns `fields`, `sourceType: analysis_suggestion`, the unchanged input fingerprint, exact `sourcePaths`, and `missingFields`. It does not call a model, create a creative decision, read files, use a clock/random ID, or manufacture a confirmation.

Only `get()` adds `analysisSuggestion` to the existing report result. Existing `fields`, state, hashes, source and confirmation are unchanged. Mutation and compilation methods keep their original behavior. The editor uses suggestion fields only when status is `missing`; draft, confirmed and needs_reconfirmation use saved fields. The existing parent remount after analysis completion rereads the current Packet. The editor checks project and fingerprint consistency, shows “AI 分析建议，尚未人工确认”, expands missing-project fields, and labels absent evidence as pending. The human source statement stays blank. Prefill neither marks the form dirty nor sends a write. The original explicit save/confirm flow remains in place.

## Field provenance

All paths below are relative to the current project's VisualDecisionPacket. Arrays retain their order; emitted provenance records the specific populated element indexes. There is no fallback to other projects, global color/material systems, diagnostic risk text or inferred design dimensions.

| Editor field | Packet source | Rule |
|---|---|---|
| spatialConcept | mediaTranslations.spatial.spatialConcept | Explicit text only |
| structureLanguage | mediaTranslations.spatial.structureLanguage | Explicit strings only |
| artisticFocus | mediaTranslations.spatial.signatureSpatialMechanism | No mechanism invented |
| lightingLanguage | mediaTranslations.spatial.lightingLanguage.source | Explicit strings only |
| lightingContrast | mediaTranslations.spatial.lightingLanguage.contrast | Blank when absent |
| lightingInteraction | mediaTranslations.spatial.lightingLanguage.interactionWithMaterials | Explicit strings only |
| lightingAvoid | mediaTranslations.spatial.lightingLanguage.forbidden | Analysis suggestion, not a user prohibition |
| colorAvoid | mediaTranslations.spatial.colorBehavior.forbidden | Analysis suggestion, not a user prohibition |
| functionalProgram | mediaTranslations.spatial.sceneProgram | No functional nodes added |
| functionalNetwork | mediaTranslations.spatial.functionalNetwork | No circulation inferred |
| functionalRelationships | mediaTranslations.spatial.functionalRelationships | Independent from nodes/network |
| visibleRequirements | mediaTranslations.spatial.mustBeVisible | No equipment inferred |
| compositionRequirements | mediaTranslations.spatial.compositionRequirements | Blank for Packets without this field |
| mustAvoid | creativeDecision.strategicNegatives | Explicit existing proposal only; no diagnosis risks or tone warnings promoted |
| colorEntries[].name / role / surfaceApplicability / spatialUsage | mediaTranslations.spatial.colorBehavior.{primary,secondary,accent}[i].{same property} | Copy populated properties only; spatialUsage must be a supported explicit enum |
| colorEntries[].paletteRole | mediaTranslations.spatial.colorBehavior.{primary,secondary,accent} | Group membership only; does not authorize spatial coverage |
| materialEntries[].material / behavior / brandRole / forbidden | mediaTranslations.spatial.materialLanguage[i].{same property} | A legacy string supplies the name only; other properties remain blank |
| materialLanguage | Names/behaviors from the mapped spatial materials | Text projection with leaf provenance; no role inference |
| colorPolicy | Names/roles/explicit surfaces from the mapped spatial colors | Text projection with leaf provenance; no inferred proportions |

## Missing evidence and limits

Blank, unknown, placeholder and non-string prose values are not filled. Each missing field or incomplete color/material property is listed explicitly. Partial spatial analysis may contribute only its individually populated fields.

The existing generic fixture has no compositionRequirements, surfaceApplicability or spatialUsage: all seven corresponding missing entries stay unresolved. An 80% color ratio or primary/secondary/accent rank does not supply an architectural area or surface permission. A material name or optical behavior does not supply its spatial role. Missing building dimensions, areas, installation methods and scope are never inferred. Source statements and confirmation remain human actions. Saving a partial suggestion as a draft continues to require clarification through the existing semantic validation before confirmation.

## Changed files and reasons

| File | Reason |
|---|---|
| src/analysis-direction-suggestion.js | Pure analysis-to-editor projection, provenance and missing evidence |
| src/project-design-direction.js | Additive read-only get() result on the existing report RPC |
| apps/web/src/features/visual-workflow/api.ts | Types for fingerprint and analysisSuggestion |
| apps/web/src/features/visual-workflow/ProjectDesignDirectionPanel.tsx | Missing-only prefill, project/fingerprint check and pending-evidence presentation |
| tests/analysis-direction-suggestion.test.ts | Five mapping/read/isolation/compatibility tests using existing local fixture |
| tests/project-design-direction.test.ts | Keep the original deep comparison of preexisting direction fields while separately asserting the new additive suggestion |
| implementation-integrity.json | Explicit B1 record: add the new module and update only the changed store/two UI hashes; Prompt digests, other modules and qualityAcceptance unchanged |
| reports/analysis-direction-autofill/README.md | Scope, provenance table, limitations and acceptance evidence |

No pipeline, short-chain service, generation compiler, image adapter, Provider settings, Prompt, Golden baseline, planning or migration implementation changed. The implementation record update is scoped to this explicitly authorized B1 change; it is not image-quality acceptance or a blanket hash refresh.

## Offline tests

- Independent workflow regression: **87/87 PASS** (five new B1 tests plus the existing regressions). Existing generation/analysis regression tests use their local mocks; no user project was reanalyzed and no real Provider was called.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS; Vite retains its advisory bundle-size warning.
- `npm run repo:verify`: PASS, including current-flows, Node Host/Web TypeScript checks, isolation and guard counterexamples.
- `npm run golden:test`: PASS; Provider calls 0, Golden auto-updated NO. This command checks the existing recorded Golden statuses; it does not create new visual quality acceptance.
- `git diff --check`: PASS.

The new tests cover deterministic provenance, untouched input, missing/unknown data, no scope derived from ratios/color groups, no role derived from material names, no risk-to-ban promotion, project mismatch rejection, current analysis refresh, read-only existing RPC behavior, and unchanged draft/confirmed/needs_reconfirmation record bytes and semantics.

## Browser acceptance

The production Node Host and Web UI from the development checkout ran against a new credential-free userData at `E:/MP-B1-evidence-20261022/p7b-user-data`, on **5214 → 4357** only, with external network and model RPCs blocked. Local structured fixtures represent completed analysis; no analysis request was submitted.

Observed results:

1. A missing direction automatically displays the existing fixture's spatial concept, structure, mechanism, lighting, function and materials. Color spatial permissions remain blank. Screenshot: `05-new-project-autofill-focused.jpg`; complete page: `06-new-project-autofill-full.jpg`.
2. Reading and switching projects creates neither design-direction.json nor its history directory. Reopening produces the same suggestion.
3. The P7B isolated copy still displays its confirmed human direction. Every original get() property, both hashes and analysis fingerprint equal the baseline store's result; browser text fields match those confirmed fields.
4. Only an explicit browser save creates a draft for the disposable generic fixture. Confirmation remains null; the edited draft survives page reload without being replaced by analysis suggestions.
5. Formal userData (772 files), historical readonly userData (331), P7B working userData (331), and snapshot (331) retain identical before/after SHA256 inventories. All 331 original P7B files in the browser copy also remain identical.

## P7B request parity

The existing offline rebuild/capture procedure was reused in a **separate disposable compile-user-data**. The production adapter's injected fetch boundary captures one request and aborts before native transport. It creates an expected failed, zero-image offline run only inside that disposable copy. No original historical record or evidence is changed.

| Historical digest | Rebuilt digest — exact match |
|---|---|
| Formal Prompt | 031d2d20b203d73b5a11b77c27792bde9b02a15cc912c8e0c5f2d9f8dd886ab9 |
| Provider Prompt | a7b402054cc0153517dd3d2411668fe0d1583f89c9c9eb3b8f30b6d64edfdc97 |
| Request Body | 79d70c85ba1eced01a0256dcb60cb60dc8e6acf1d1021a903f78eddbcb090b99 |

Real paid Provider calls: **0**. Real image generation calls: **0**. User-project reanalysis calls: **0**. Automatic retries: **0**. Offline adapter interceptions: **1**, returned images: **0**. Browser model-operation RPCs: **0**. Credentials copied: **NO**.

## Evidence and handoff

Evidence directory: `E:/MP-B1-evidence-20261022/` (outside Git; contains local project data and must not be committed).

- final-acceptance.json: protection, exact original get() parity, browser isolation and three digests.
- protected-before.json: source protection inventories.
- offline-rebuild-result.json and p7b-offline-capture.log: existing Adapter-boundary proof.
- workflow-regression.log, web-typecheck.log, web-build.log, repo-verify.log, golden.log: test outputs.
- browser-no-auto-write.json, browser-reopen.json, browser-explicit-save.json, browser-draft-reload.json: observed interaction results.
- Screenshots 01–06: automatic suggestions, pending evidence, retained P7B direction and explicit draft save.

No merge or default entry switch. No B2, new image-generation experiment, deployment or release. Stop after the B1 commit and wait for human review.
