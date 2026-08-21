# CI-W1C.7.5-R1.2 Carrier Gap Audit

## Scope and starting state

- Target branch: `feat/short-chain-simplified-ui`.
- Confirmed local HEAD and `origin/feat/short-chain-simplified-ui` at start: `a4f38eea44dd92b136287d1006cfaa3efde2bcb7`.
- The tracked worktree was clean at start. Existing unrelated untracked artifacts were preserved.
- No reset, rebase, force push, or history rewrite was used.

## Confirmed gap

R1.1 correctly made insufficient structured coverage require narrative extraction and fail closed, but its narrative carrier was `DocumentVisualContext`. DVC exposes visual/document fields and cannot represent the canonical Planning vocabulary without lossy aliases. In particular, anchors such as `audience_problem`, `brand_promise`, `competitive_context`, `differentiation_logic`, `strategic_objective`, and `transformation_objective` had no first-class raw field.

That mismatch made a strict prompt follower unable to return the full Planning ground truth even when the source contained it. Routing Planning meaning through `visualPreferences`, `brandPersonality`, or `requiredTouchpoints` would also assign semantic ownership to the wrong layer.

## Repair boundary

R1.2 therefore changes only the Planning narrative carrier and its prompt/repair path. It preserves the R1.1 canonical coverage decision, mandatory narrative fallback, base-plus-repair fail-closed behavior, hybrid merge policy, and zero-network orchestration behavior.

The following remain intentionally out of scope:

- G01 Attempt 2 and any live provider call;
- image generation, UI, Concept, Direction, and Anchor work;
- canonical chunk-id remapping;
- multi-document narrative extraction;
- project-specific production extraction rules.

## Source boundary audit

The implementation accepts the one explicitly registered Planning brief supplied by the orchestrator. It adds no directory scan and no parent-directory discovery. This repair did not read the G01 DOCX or any legacy PNG under the qualification project directory.

## Root package BOM

The root `package.json` began with the UTF-8 BOM byte sequence `EF BB BF`. Removing that marker produced valid JSON with no semantic field change and restored the version-consistency and repository-guard paths. The change is kept independently scoped from the carrier repair.
