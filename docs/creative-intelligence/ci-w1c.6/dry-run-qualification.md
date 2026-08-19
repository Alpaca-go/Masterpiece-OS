# CI-W1C.6 — Zero-Cost Dry-Run Qualification

**Status: NOT RUN** (smoke infrastructure missing)

## PART J — Required assertions (planned)

A future dry-run script would drive the CI pipeline through to the
AnchorProductionContract + compiled prompt + reference plan +
contamination scan, then STOP before any Provider call:

```
CI pipeline
→ user-selection fixture / existing explicit selection mechanism
→ Canon
→ Anchor
→ AnchorProductionContract
→ compiled prompt
→ reference plan
→ contamination scan
```

### Planned assertions (PART J)

| Assertion | Implementation status |
| --- | --- |
| Direction trace is planning-derived | verified by `tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js` DIFF-01 (PASS) |
| G01/G02 differ meaningfully because planning differs | verified by DIFF-01, DIFF-03 (PASS) |
| Differentiation does NOT rely on old visual styles | verified by AUTH-02, AUTH-03 (PASS) — Concept / Direction have no 视觉锚点 suffix |
| Prompt contains real semantic direction text | verified by PROMPT-01 (PASS) — planning-first prompt structure |
| `selectedReferences <= 1` | verified by REF-01, REF-02 (PASS) — reference gate simulation |
| If 1, it is verified locked identity | verified by REF-02 (PASS) — only `identity_reference + lockedIdentity=true` is allowed |
| Legacy-only positive prompt tokens = 0 | verified by CONTAM-01, CONTAM-02 (PASS) — contamination scanner finds no findings |
| Legacy-only Provider references = 0 | verified by REF-01 (PASS) — default reference plan is empty |

### Planned test additions

1. **Planning-only counterfactual test**: a project that has only
   planning-derived facts (no visual evidence, no locked identity)
   should still produce a non-empty planning-derived differentiation.
2. **Legacy-swap test**: swapping the visual evidence between two
   projects should NOT change the differentiation (planning
   semantics, not visual).
3. **Identity-only reference test**: a project with only a verified
   locked logo can produce a CI Anchor contract with one allowed
   reference.

### Why not run

The dry-run script requires an analysis profile in the credentials
directory. The previous CI-W1C.4 Resume.1 smoke (2310) used:
- G01: `profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca` (qwen3.6-plus)
- G02: `profile-fa854643-4c01-43e7-8e5a-4ec52862c23b` (qwen3.7-plus-2026-05-26)

These profiles are not in the current credentials directory. The
`list-profiles.mjs` script confirms `profiles: []` (no analysis
profiles available). Without a working analysis profile, the dry-run
cannot be invoked.

The dry-run is deferred to a follow-up phase that requires the user
to re-create the analysis profile and authorize the run.

## Production safety

The dry-run is **read-only** at the unit-test level. The production
path is not exercised. The CI-W1C.6 PART B demotion is verified
deterministically by `tests/.../planning-first-authority-auth-ref-prompt-contam-diff.test.js`
(15/15 PASS). The contamination scanner is exercised by CONTAM-03
(positive case: scanner detects injected legacy descriptors).

No live Provider call is made by the CI-W1C.6 changes.
