# Space Generator Version Map

## Evidence-based topology

| Name | Kind | Current meaning | Status |
|---|---|---|---|
| `v1-baseline` | frozen comparison assets/prompts | test-read historical control; production source lives elsewhere | TEST_DEPENDENCY |
| `v1-experimental` | isolated experimental code | invoked by many root `test:space-*` scripts | TEST_DEPENDENCY |
| Phase 9B | compiler lineage | production compiler module now under package `src/space` | ACTIVE_DEPENDENCY |
| R8.6 | Golden identity/assets | frozen golden and block-order/reference boundary | TEST_DEPENDENCY; runtime mode identity ACTIVE_RUNTIME |
| R9 | productionization phase | moved Phase9B-quality compiler into package `src/space`; parity against R8.6 | ACTIVE_DEPENDENCY / TEST_DEPENDENCY |
| R10 / R10.2 / R10.4.1 | repair/Reference-First phases | semantic, route, upload and evidence regression layers | ACTIVE_DEPENDENCY through current files; baselines TEST_DEPENDENCY |
| R11 / R11.1 / R11.2.x | continuation and target-scene phases | current mode boundary, continuation, projection and authority gates | ACTIVE_DEPENDENCY; tests/baselines TEST_DEPENDENCY |
| R12 | smoke artifact label only (`r11.1-continuation-v12`) | no independent R12 source compiler found | HISTORICAL_REFERENCE / UNKNOWN relation |
| `vnext` | orchestration/API namespace | current Desktop service and runtime entry; also names legacy fallback compiler | ACTIVE_RUNTIME / ACTIVE_DEPENDENCY |
| R2-B1..B4 | later Reference-First repair spec labels | adapter capability/boundary and smoke tests, not product v2 | TEST_DEPENDENCY; implemented behavior active |

## Confirmed arrows

```text
Phase9B experimental compiler evidence
  -> R9 production module packages/.../src/space       (Git a2be36e)
  -> default r8_6_golden identity / R9 parity          (Git 8fe98e1, 0fe1fde)
  -> R10 semantic and route integrity repairs          (Git 378c0cc..de5b0f8)
  -> R11 continuation + R11.2 target authority layers  (Git a047e83..322ae67)
```

R8.6 is a frozen behavioral source baseline, while R9 is the productionized implementation phase. The arrow does not mean R9 may replace/delete R8.6; current tests enforce their parity.

## Reference-First protected chain

```text
explicit upload / asset picker
  -> Desktop reference-asset-resolver
  -> vnext task contract (generationBasis=reference_first)
  -> space-reference-policy (explicit_only, high_fidelity_visual_reference)
  -> target-scene projection and authority gate
  -> Phase9B compiler
  -> reference boundary
  -> Seedream adapter/provider service
```

## Relation unknowns

- No evidence supports a standalone R12 production implementation; the R12-named directory is a smoke iteration.
- Phase numbers reused inside `v1-experimental` do not map one-to-one to R phase numbers.
- `r85` filenames mean R8.5 redirect/stability work, not code version 85.
