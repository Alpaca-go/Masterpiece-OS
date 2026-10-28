# M1-A Manifest

Batch: M1-A  
Purpose: Current product-copy cleanup.

- Files modified: Web App/Short-Chain UI, CLI help and current analysis messages.
- Current semantic names changed: v5/vNext/R11 product labels to Web, Visual Analysis, Project Visual Context, Reference First, Logo Locked.
- Compatibility names preserved: `masterpiece-os-v5.json` shown explicitly as a compatibility filename.
- Runtime/persisted/A1/Prompt/Golden impact: no behavior or persisted contract change; A1 preserved; prompts and Golden unchanged.
- Verification: CLI 40/40; Web typecheck PASS; Actual Web PASS.
- Rollback: revert M1-A copy-only hunks.
- Result: PASS.
