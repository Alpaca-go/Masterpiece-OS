# Visual Migration VM-1 Integrated Baseline Record

## Status

- Verdict: **FROZEN**
- Integration branch: `codex/visual-migration-vm1-integration-freeze`
- Repository Contract closure branch: `codex/repository-contract-rc004-baseline-repair`
- Tested integration base HEAD: `cf719e2b08e1326e5973af963ab94ced122be11f`
- Freeze record: the commit containing this updated document; its exact HEAD is recorded in the delivery report.
- Merge base: `7f6b22a5fb749396394d06f6fc2fb5f316424122`
- Merge commit: `b7fd0b68b227709c87a6850d806fef0b4dd1b198`
- VM-2 unlock decision: **YES**. RC004 and the complete offline freeze gates pass.

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
| G12 | PASS | RC004 repaired from proven LF Git object authority; `verify:repository-contract` and `repo:verify` pass. |
| G13 | PASS | Scope diff contains no Provider/Reference Plan/Audit/Retry implementation. |
| G14 | PASS | This record identifies the integrated base, closure branch, verification environment, and containing freeze commit. |

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
- Root `npm test`: **1686/1686 PASS**.
- Runtime application suite: **1277/1277 PASS**.
- `npm run verify:current-flows`: PASS as part of the official aggregate gate.
- `npm run verify:repository-contract`: PASS; RC004 = 0.
- `npm run repo:verify`: PASS; final exit code 0; Repository Contract self-tests 45/45.
- `npm run web:smoke`: PASS; operation count 236; Provider calls 0; business writes 0.
- `npm run golden:test`: G-01 through G-05 PASS; auto-update NO.
- `git diff --check`: PASS.

## Repository Contract closure

RC004 was a digest-baseline and checkout-EOL defect, not Prompt content drift.
At `d980a78e8ec94fe51a37f778dc463bef84eacfe7` and the integrated base HEAD,
all four frozen Prompt Git objects are byte-identical LF content. The original
manifests recorded CRLF worktree hashes on a repository with no EOL contract.
The closure pins only those four paths to LF, repairs both digest inventories to
the proven Git object authority, and adds byte-exact regression coverage. See
`docs/repository/rc004-prompt-integrity-resolution.md` for the complete audit.

Official aggregate verification ran on Windows with Node.js `v24.19.0` outside
the restricted process boundary that caused `uv_os_get_passwd ENOMEM` under
the default Node.js `v26.7.0`. No production workaround was added. A stale
Web-smoke-only operation count was synchronized from 235 to the already-tested
Node Host authority count of 236; no registry or production operation changed.

VM-0 and VM-1 are now frozen. VM-2 is unlocked. This closure changes no Visual
Migration, Provider, Reference Plan, Materializer, Audit, retry, generation,
or Reference Pack production behavior.
