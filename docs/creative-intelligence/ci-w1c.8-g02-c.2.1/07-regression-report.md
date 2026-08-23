# Offline Regression Report

## Stage-specific verification

- `STR-TRANSPORT-01..03`: 3/3 PASS
- `ATTEMPT-COUNT-01..03`: 3/3 PASS
- provider transport contract suite: 29/29 PASS
- related Qwen and G02 anchor/epistemic suite: 16/16 PASS
- CI R1/R2/R2.1/MOCK/Transport/SR/SG13/QR/SCOPE/TRACE partition: 238/238 PASS
- G01 frozen baseline and readiness checks: 26/26 PASS
- G02 pre-live readiness: 51/51 PASS

## Wider verification

Root `npm test`: 1712/1714 PASS. The two failures are outside this phase and already present in the dirty working tree: the image source-bundle enum expects four values while production exposes `creative_intelligence`, and the tracked-runtime-assets manifest does not declare paths referenced by existing CI scripts.

`verify:current-flows` completed its document, naming, project-specific-rule, golden-boundary, and cross-project checks, then the `tsx` runtime partition could not start because Node reported `uv_os_get_passwd ENOMEM`. A direct retry produced the same environment error. The affected C.2.1 runtime tests were also executed directly with `node --test` and passed.

Repository release guards for version consistency, version naming, obsolete code, production boundaries, project-specific production rules, and golden boundaries pass. `verify:workspace-boundaries` is already failing on existing Web Runtime/test deep imports and then encounters its own `dir is not defined` verifier defect; the new C.2.1 test imports use public `@masterpiece/model-runtime` exports and add no new deep import.

Historical `verify:g02-source-readiness` remains at its archived A.1 HOLD state. Current `verify:g02-prelive-readiness` passes in full.
