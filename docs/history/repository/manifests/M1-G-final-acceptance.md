# M1-G Manifest

Batch: M1-G  
Purpose: Full regression and final acceptance.

- Repository Contract: PASS; authorities 15; conflicts 0.
- Product version: unchanged `5.0.0-rc.1`.
- repo:verify/current-flows: PASS; 334/334.
- Unit/CLI/Runtime: PASS; CLI 40/40.
- Web Smoke: PASS; provider calls 0; business writes 0.
- Actual Web: PASS; known stage-label matches 0.
- Golden: G-01 through G-05 PASS; G-04 PASS; auto-update NO.
- A1/Qwen: provider contract, default and request semantics preserved; prompts unchanged.
- Rollback: revert M1 implementation and documentation as one batch; no data migration rollback required.
- Result: SEMANTIC_NAMING_M1_PASS.
