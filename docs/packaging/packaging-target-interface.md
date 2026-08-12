# P0-3 �?Packaging Target Interface

**Phase:** Packaging V1 / P0 �?Architecture & Reuse Audit
**Date:** 2026-08-12
**Status:** `P0_TARGET_INTERFACE_FROZEN`
**Spec:** Packaging V1 Revised Development Specification §P0 ("定义 GenerationTarget: space | packaging")
**Predecessor:** `shared-vs-target-matrix.md`

## 1. Purpose (per P0 spec)

Define `GenerationTarget` as an explicit type / constant, with
`'space' | 'packaging'` as the two production values. Currently
the dispatch is implicit (a `deliverableFamily: 'space' |
'packaging'` field on the task contract); P0 freezes the type
and the dispatch rule so P1–P4 can build on a stable surface.

## 2. GenerationTarget type (frozen at P0)

```text
type GenerationTarget = 'space' | 'packaging'
```

Two values, exactly. No other value is accepted by the production
compiler. Unknown targets fail explicitly with a structured error
code (no silent mapping; per A4 G-A4-09 default/fallback
separation discipline applied to target identity).

### 2.1 Error code for unknown target

```text
GENERATION_TARGET_UNSUPPORTED: <id>
```

The `compileImageGenerationTask` / `compileShortChainGeneration`
functions in `task-builder.js` (re-exported by
`core/packaging-generation-core.js`) MUST throw this when
`deliverableFamily` is not one of the two values.

## 3. Target dispatch surface (frozen at P0)

The target is set in the **task contract** (see `domain-schema.md`)
and is the single dispatch field. All other modules read this
field; they MUST NOT independently infer the target from
context.

```text
task.deliverableFamily  ──┬──>  'space'     �?Space-specific shape
                          └──>  'packaging' �?Packaging-specific shape
```

## 4. Capability matrix (cross-target)

```text
                         space                    packaging
─────────────────────────────────────────────────────────────────
14-block contract        YES (golden)             YES (P1 will freeze
                                                    Packaging golden;
                                                    current packaging
                                                    test pins it)
Architecture context     YES                      NO  (Space-only)
Building / floor         YES                      NO
Reception shot           YES                      NO
Reference (r8.6)         YES (resolveSpaceRef)    P2 (Packaging Ref Role)
Locked Asset precedence  YES (shared)             YES (shared)
Golden baseline          Space (phase9b-recovered) P1 (Packaging golden
                                                    brand 九州美学)
Visual direction         Space golden             P1 (Packaging golden
                                                    "东方秩序 × 生物光泽")
Color ratio              Space golden             P1 (Packaging golden
                                                    珍珠�?暖灰 65-70% etc.)
Provider capability      Shared preset            Shared preset
```

## 5. Cross-target contract surface (frozen at P0)

These are the cross-target invariants that P1–P4 must honor:

1. **Same 14-block contract.** `task.compiledPrompt.blocks` is
   `Object.freeze([14 blocks])`. Block IDs are listed in
   `domain-schema.md §3`.
2. **Same canonical run contract.** A run is created via
   `runtime-core/application/image-generation/short-chain-service.ts`
   and persisted via `run-store.ts`. Both targets write to the
   same store.
3. **Same provider dispatch.** Provider selection goes through
   `@masterpiece/image-generation-adapter` and
   `@masterpiece/image-provider-dashscope` (and any other
   registered provider). Packaging does not add a parallel
   provider.
4. **Same reference asset resolver.** `prompt-contracts/reference-asset-resolver.ts` is target-agnostic. Locked Asset
   precedence is the same.
5. **Same fingerprint.** `createCompileFingerprint` is
   target-agnostic. Determinism contract is the same.
6. **Same deliverable gate interface.** `evaluateDeliverableGate` is
   target-agnostic; Packaging Validator (P3) layers on top.
7. **Same redactor.** `redactProviderRequest / redactProviderResponse`
   is target-agnostic. No Pk redactor.

## 6. Target Interface (proposed for P1)

P1 will formalize a `packagingTargetInterface` named export. At
P0 the audit records the **shape** the interface must expose:

```text
// Proposed in P1 (subject to P1 freeze)
type PackagingTargetInterface = {
  // Translation: from Visual Analysis + Reference + Locked Assets
  //             �?Packaging semantically-stable representation
  translate(input: {
    visualDecisionPacket: VisualDecisionPacket
    referenceAssets: ReferenceAsset[]
    lockedAssets: LockedAsset[]
    shotContract: 'PKG-HERO-SINGLE' | 'PKG-SERIES-GROUP' | 'PKG-GIFT-OPEN'
    analysisContext?: AnalysisContext
  }): PackagingTranslation

  // Compiler: from PackagingTranslation + task contract
  //           �?14-block compiled prompt + fingerprint
  compile(input: {
    translation: PackagingTranslation
    task: ImageGenerationTask
  }): {
    compiledPrompt: { blocks: Block[], preflightReport, finalPrompt }
    fingerprint: CompileFingerprint
  }

  // Validator: from compiled output + golden + target
  //            �?validator verdict (used by P3)
  validate(input: {
    task: ImageGenerationTask
    output: GenerationOutput
    golden?: PackagingGoldenProject
  }): PackagingValidationResult
}
```

P0 freezes the **shape**; P1 freezes the **concrete types and
exports**.

## 7. GenerationTarget field placement

P0 freezes the field location:

```text
ImageGenerationTask {
  schemaVersion       '1.0'        // frozen
  taskId              string
  projectId           string
  deliverableFamily   GenerationTarget  // <-- 'space' | 'packaging'
  subtype             string
  shot                string
  shotSource          'target_scene_default' | ...
  count               number
  aspectRatio         string
  currentInstruction  string
  mustInclude         string[]
  mustAvoid           string[]
  referenceAssetIds   string[]
  generationBasis     'standard' | 'reference_first' | 'continuation'
  logoUsageMode       'post_composite' | ...
  createdAt           string (ISO)
}
```

P0 does NOT mutate the existing `ImageGenerationTask` type.
P1 may add new fields (e.g. `shotContract` from the P1 spec);
the existing 14 fields stay unchanged.

## 8. P0-3 acceptance

- [x] `GenerationTarget` type frozen as `'space' | 'packaging'`
- [x] Dispatch field frozen (`task.deliverableFamily`)
- [x] Error code frozen (`GENERATION_TARGET_UNSUPPORTED`)
- [x] Cross-target capability matrix documented
- [x] Cross-target contract surface documented (7 invariants)
- [x] Packaging Target Interface shape proposed for P1
- [x] No code change in P0
