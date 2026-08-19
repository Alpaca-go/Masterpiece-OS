# CI-W1C.7 — Reference Routing Audit (PART F)

This document audits the Model-Assisted reference routing: which references are allowed, which are blocked, and how the gates enforce the boundary.

## 1. Three source roles

The spec requires three roles:

1. **LOCKED_IDENTITY** — verified logo / wordmark; auto-referenceable.
2. **LEGACY_VISUAL_EVIDENCE** — visualAsset.* / old VI / old poster / old packaging / old spatial; never positive creative source.
3. **USER_SELECTED_REFERENCE** — positive future reference only after explicit user action; not yet implemented.

The existing `ProjectTruthFact.authority` field encodes these:

| Role | Authority | What it covers |
|---|---|---|
| LOCKED_IDENTITY | `LOCKED` | Verified identity (e.g. `brand.locked_logo`) |
| LEGACY_VISUAL_EVIDENCE | `VISUAL_SOURCE_FACT` | visualAsset.* (logo / color / typography / motif / imagery / layout / material) |
| USER_REQUIREMENT (planning) | `USER_CONFIRMED` / `CONFIRMED` | brand.name, audience.primary, etc. |
| USER_SELECTED_REFERENCE (future) | (not yet implemented) | TBD in follow-up phase |

## 2. Model-Assisted reference gate

The reference gate is implemented as a deterministic helper `simulateCreativeAnchorReferencePlan(input)`. The gate is **test-only** (deferred to runtime in follow-up).

```ts
function simulateCreativeAnchorReferencePlan(input: {
  userSelected: { role: 'identity_reference', lockedIdentity: true, assetId: string } | null;
}): {
  references: Array<...>;
  blocked: string[];
  legacyImageRefs: string[];
  styleRefs: string[];
  structureRefs: string[];
  spatialRefs: string[];
}
```

### ALLOW

- `[]` (zero references — default)
- `{ role: 'identity_reference', lockedIdentity: true }` (verified locked identity, traced from a LOCKED fact)

### BLOCK (by default)

- `current_project_identity` generic image
- `vi_page`, `old_poster`, `old_packaging_render`, `old_spatial_render`
- `style_reference`, `structure_reference`, `spatial_reference`

## 3. Hard rule: legacy positive prompt blocks = 0

The Strategic Grounding Gate (SG-04 NO_LEGACY_VISUAL_POSITIVE_AUTHORITY) blocks any model output that uses legacy visual evidence as positive creative source. The check is text-level:

```ts
if (/\bbased on (?:the |our )?(?:old |existing |current )?(vi|visual identity|poster|packaging|spatial|brand visual)\b/i.test(t.value)) {
  block('SG-04', t.where, `positive creative authority claim from legacy visual: "${t.value}"`);
}
```

The check is project-agnostic — it does not hardcode 九州美学 / 一剂良方. It matches the *phrasing* "based on the old VI" etc., which is the actual positive-authority claim pattern.

Additionally, the grounding gate asserts `sourceMap.legacyVisualEvidenceExcluded` contains the spec minimum set. This is the **positive authority audit trail**: the model output is required to acknowledge which authorities it excluded from positive creative authority.

## 4. VisualMechanism gate (MD-11)

The Direction gate MD-11 enforces:

- A visualMechanism is not composed only of generic visual cliches.
- A visualMechanism answers at least 3 of the 5 required questions:
  - what is organized?
  - by what rule?
  - what changes across touchpoints?
  - what remains invariant?
  - why does this answer the strategic problem?

The generic-phrase list (`MODEL_ASSISTED_GENERIC_VISUAL_PHRASES`) is industry-agnostic: `'使用简洁现代的视觉语言'`, `'通过统一的设计系统建立识别度'`, `'采用高级感配色'`, `'使用模块化布局'`, etc. The test fixtures assert that these phrases are not used as the entire visualMechanism.

## 5. Cross-direction collapse (MD-05)

The Direction gate MD-05 blocks two directions with identical `creativeThesis` or `visualMechanism`. It warns when two directions hit the same template family with high echo similarity (≥ 0.55). This is project-agnostic: it is about *semantic* collapse, not project-specific.

## 6. Cross-project semantic collapse (MD-06)

The Direction gate MD-06 requires a `foreignDirectionSet` and blocks identical `creativeThesis` / `visualMechanism` / `systemHypothesis` across projects. This is the core counterfactual test: same planning → different outputs (because planning differs); same legacy visual → similar outputs (because legacy is not a creative source).

## 7. Reference plan source map

The `CreativeReasoningPromptSourceMap` includes `legacyVisualEvidenceExcluded: string[]` (non-empty). The StrategicSynthesisArtifact.sourceMap.planningTruth / userRequirements / lockedIdentity / prohibitedDirections / needs / evidence lists are the *only* allowed positive creative authority sources.

The `sourceMap` is serialized with every artifact (synthesis, conceptSet, directionSet, report) and persisted to the shadow artifact files. This is the audit trail: every future read of the report can verify what the model was allowed to use as positive authority.

## 8. Hard prohibitions (verified)

- ❌ No image generation model called in any Model-Assisted stage.
- ❌ No current_project_identity image used as reference (unless verified locked identity).
- ❌ No style / structure / spatial reference.
- ❌ No "based on the old ..." phrasing in any model output.
- ❌ No project-specific hardcode in production rules.

## 9. Deferred to follow-up

- Runtime gate at `submitAnchorGeneration` (the helper is wired to the test contract; the production path does not yet consult it).
- USER_SELECTED_REFERENCE source role (UI flow + storage schema).
- Prompt source map runtime scanner.

The CI-W1C.7 surface is complete and tested; the runtime wiring is the only piece left. That wiring is the next phase's work.
