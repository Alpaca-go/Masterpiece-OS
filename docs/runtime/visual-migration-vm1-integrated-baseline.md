# Visual Migration VM-1 Integrated Baseline Record

## Status

- Verdict: **CONDITIONAL PASS — NOT FROZEN**
- Baseline branch: `codex/visual-migration-vm1-integration-freeze`
- Tested integration HEAD: `970a6c8dc1acb0e5d0c81c75c9747c88e97ae68d`
- Freeze record: the commit containing this document; the exact remote HEAD is recorded in the delivery report.
- Merge base: `7f6b22a5fb749396394d06f6fc2fb5f316424122`
- Merge commit: `b7fd0b68b227709c87a6850d806fef0b4dd1b198`
- VM-2 unlock decision: **NO**. G12 is not satisfied, so VM-1 must not be declared FROZEN.

## Integrated commits

- `c90cb1b372daa528cf5221b00dc8c93292acfdee` — expose Visual Migration and restore Browser Upload.
- `cf6d0293` — freeze the VM-0 reference evidence contract.
- `f9f4f83e` — persist production-owned Reference Packs.
- `4e61b17c97977ca427250e4c32a250be78996adc` — attach Reference Pack to the production handoff.
- `970a6c8dc1acb0e5d0c81c75c9747c88e97ae68d` — verify the Browser intake to restart-safe Pack lifecycle.

Both `4e61b17c97977ca427250e4c32a250be78996adc` and
`c90cb1b372daa528cf5221b00dc8c93292acfdee` are ancestors of the tested
integration HEAD. The merge completed without textual conflicts. The shared
`ReferenceAnchorWorkspace` was reviewed semantically and retains explicit
project selection, Browser upload, and production Pack handoff.

## Capability status

- VM-0 contract: DONE. The immutable reference evidence and production-owned Pack contract is documented and validated.
- VM-1 persistence: DONE. Approved Run evidence is copied into a persistent Pack, resolves after runtime restart, and preserves legacy compatibility.
- Browser upload integration: DONE. Browser intake is copied into Run-owned `input/reference-assets`; successful intake cleanup does not remove Run evidence.
- Production handoff: DONE. Quick extraction creates or reuses a Pack and Creative Session stores the exact `referencePackId`.
- Idempotency: DONE. Repeating the handoff for the same approved Run reuses the same Pack.
- VM-2 scope: unchanged. No Provider, Reference Plan, Audit, retry loop, role/authority planning, or generation-contract behavior was added.

## Acceptance gates

| Gate | Result | Evidence |
|---|---|---|
| G1 | PASS | R8 UI/Browser Upload commit is an ancestor. |
| G2 | PASS | All three VM-0/VM-1 commits are ancestors. |
| G3 | PASS | Semantic review and Web guardrails cover Browser Upload plus Pack handoff. |
| G4 | PASS | Quick extraction and Pack service tests create a production-owned Pack. |
| G5 | PASS | Pack service and cross-boundary test resolve after service restart. |
| G6 | PASS | Creative Session and handoff tests assert exact `referencePackId`. |
| G7 | PASS | Pack handoff idempotency tests pass. |
| G8 | PASS | Cross-boundary test removes intake while preserving Run evidence. |
| G9 | PASS | Contract/service compatibility tests cover legacy Session/Pack data. |
| G10 | PASS | VM targeted matrix: 23/23. |
| G11 | PASS | Web UX/core reference tests 10/10; Web Runtime 15/15; Web typecheck/build pass. |
| G12 | **FAIL** | Pre-existing Repository Contract RC004 failures for four frozen Prompt digests; aggregate gates therefore fail. |
| G13 | PASS | Scope diff contains no Provider/Reference Plan/Audit/Retry implementation. |
| G14 | PASS | This record identifies the tested baseline and branch; delivery report records its exact containing commit. |

## Test matrix

- VM contract/service/handoff/quick-style/session plus Browser lifecycle: **23/23 PASS**.
- Web UX guardrails and reference operation tests: **10/10 PASS**.
- Web Runtime host tests: **15/15 PASS**.
- CLI tests: **40/40 PASS**.
- Shared Runtime Core JavaScript tests: **14/14 PASS**.
- `npm run web-runtime:typecheck`: PASS.
- `npm run web:typecheck`: PASS.
- `npm run web:build`: PASS.
- Individual boundary gates passing: version consistency, version naming, workspace boundaries, no obsolete code, production boundaries, no project-specific production rules, golden boundary, and tracked runtime assets.
- Root `npm test`: **1681/1682 PASS**. The existing tracked-runtime-assets guard reports the `deep-creative-director.md` manifest digest drift.
- Runtime application suite through Node native TypeScript stripping: **1272/1273 PASS**. The remaining test uses an extensionless directory import unsupported by this fallback loader; all VM, Provider, Reference Plan, spatial, and packaging tests in the suite pass.
- `npm run verify:current-flows`: FAIL at `tsx` startup because this Windows/Node 26 host returns `uv_os_get_passwd ENOMEM`; all preceding offline sub-gates pass.
- `npm run verify:repository-contract`: FAIL with pre-existing RC004 digest drift for `benchmark-instructions.md`, `deep-creative-director.md`, `execution-core-template.md`, and `report-schema.md`.
- `npm run repo:verify`: FAIL at the same Repository Contract gate.
- `git diff --check`: PASS.

## Deferred baseline issues

The Repository Contract failure exists on both integration parents and was not
introduced by VM-1.5. Correcting frozen Prompt content or its manifest digests
is outside this integration-only phase and requires a separately authorized
baseline decision. The host-specific `tsx` startup failure likewise does not
indicate a VM lifecycle regression, but it prevents the official aggregate
command from recording a clean pass on this machine.

Until G12 passes under the official commands, this branch is an integration
candidate only: do not label VM-1 FROZEN and do not create the VM-2 branch.
