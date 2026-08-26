# S2 Golden Candidates

These are candidates only. S1 does not create S2 Golden Regression or claim new visual results.

## G-01 Reference-First cross-scene — priority

- Project/input: 九州美学 existing Visual Decision Packet and Reference-First assets.
- Reference: accepted Reception reference already bound in existing evidence.
- Target scene: Consultation.
- Evidence paths:
  - `space-generator/quality-baselines/current-verification/production-acceptance/jiuzhou-aesthetics/reference-first/`
  - `space-generator/quality-baselines/current-verification/reference-first-smoke/jiuzhou-aesthetics/jzrx-reception-to-consultation-b4-1-final/`
- Expected prompt: `generationBasis=reference_first`, explicit-only reference, high-fidelity visual role, consultation target projection, no public reception program as hard requirement.
- Expected behavior: visual-world continuity, consultation function authority, complete provenance/evidence, near-copy risk bounded.
- Known-good output: existing `output.png` files in the cited directories.
- S2 readiness: HIGH; existing manual product acceptance PASS.

## G-02 Standard Space — R8.6/R9 parity set

- Inputs/projects: 九州美学, 冯烫烫, 一剂良方.
- Evidence: `space-generator/quality-baselines/current-verification/space-golden/` and `current-verification/production-acceptance/`.
- Expected: frozen block order, architecture expressiveness, cross-brand isolation, zero implicit references for Standard.
- Known-good outputs: four R8.6 accepted `output.png` files.
- S2 readiness: HIGH; manifest records human 4/4 acceptance and R9 byte/visual parity.

## G-03 Continuation cross-scene

- Input: confirmed generated output from existing R11.1 continuation evidence.
- Expected: `generationBasis=continuation`, role `world_consistency`, source scene differs from target, full lineage, `KEEP GRAMMAR / CHANGE PROGRAM`.
- Evidence: `space-generator/quality-baselines/current-verification/continuation-smoke/`.
- S2 readiness: MEDIUM; requires selection of the canonical final evidence directory.

## G-04 Visual Analysis

- Input/evidence: `evaluation/reports/jiuzhou-golden-audit/visual-fixture-manifest.json` and recorded current analysis report.
- Expected schema: project facts/asset decisions/Visual Decision Packet and vNext project context accepted by current validators.
- Expected provider: Qwen-compatible reasoner, registry default `qwen3.6-plus`.
- Expected properties: grounded identity, no fabricated project rules, fixed report structure, one reasoning run.
- S2 readiness: MEDIUM; input source binding must be reconfirmed without copying private project material.

## G-05 Packaging

- Text fixture: `tests/image-generation/fixtures/deliverable-golden/fengtangtang.json`.
- Expected: physical package structure required, packaging-only prompt, deterministic reference priority and V3 compile fingerprint.
- Offline status: tests PASS.
- Real visual status: `NOT_READY_FOR_VISUAL_GOLDEN` in S1; no new real-provider packaging visual was authorized/run.
- S2 readiness: TEXT HIGH / VISUAL NOT_READY.
