# CI-W1C.7.5-R1.1 G01 Attempt-2 Readiness

1. **ESM runtime bug closed?** Yes. Static `node:crypto` ESM import and NPE-11 execution pass.
2. **Canonical coverage is the only orchestrator authority?** Yes. The local `claims >= 5 / semanticTypes >= 3` policy was removed; the orchestrator calls `computeStructuredExtractionCoverage()` with real raw text and chunks.
3. **Narrative-required failure fail-closed?** Yes. Missing reasoner or base + repair failure stops before Strategic with `Strategic=NOT_RUN`.
4. **CI-3 `buildRepairMessages` reused?** Yes. Repair receives previous output and collected validation errors.
5. **Hybrid merge contract consistent?** Yes. Exact-id structured precedence, higher-confidence normalized-content precedence, structured tie precedence, conflicting-content retention, and unknown-source drop are tested.
6. **Real zero-network narrative path executed?** Yes. Fake-reasoner tests execute the production runner, CI-3 parse/validate/normalize, projection, merge, and orchestrator block/continue paths.
7. **Qualification script avoids directory scanning?** Yes. It accepts and registers only the explicit `planningBriefPath`; the parent and sibling boundary is documented in code.
8. **Legacy PNGs excluded?** Yes. R1.1 read none and added no visual intake path.
9. **Current source trace level?** Section-level transitional trace. It is not exact canonical chunk grounding.
10. **Multi-document narrative still a non-goal?** Yes. Current qualification supports one narrative planning brief per case.
11. **Any live model call?** No. Live model calls = 0; image calls = 0.
12. **May a human authorize G01 Attempt 2 next?** Yes, based on R1.1 code readiness. R1.1 itself did not run it.

Pre-existing Attempt-2-named files were observed in the starting worktree and left untouched. They are not treated as R1.1 evidence and do not change the zero-call accounting for this stage.

Readiness: `READY_FOR_G01_ATTEMPT_2`
