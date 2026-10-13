# Baseline Lock

Current Baseline: Masterpiece OS Web + Stable Reference First — content pin 2026-08-11  
Baseline Content Commit (PIN only): `deb1cba8b40b22bf9c026ae5ec40f5b46389d6e2`  
Recorded 2026-08 freeze label: `FROZEN`  
Tip integration status: VM1 CONDITIONAL PASS / NOT FROZEN (`docs/runtime/visual-migration-vm1-integrated-baseline.md`)

The 2026-08 record named recovery tag `masterpiece-reference-first-stable-2026-08` and branch `codex/r10-4-regression-repair`. Both are absent on origin. The content commit above is the only recovery PIN. A replacement tag or branch is pending a Kyries decision. Do not invent one.

This lock does not resolve the FROZEN versus NOT FROZEN inconsistency and does not declare a new freeze.

Do not delete, move, consolidate, rename or rewrite baseline-critical modules before Golden Regression Phase S2 is complete.

Any modification to baseline-critical runtime, Prompt, Compiler, Reference First, Generator, Provider, configuration or schema code requires explicit regression verification. Read `CURRENT_BASELINE.md` and `docs/baseline/baseline-files-manifest.md` first.

The content PIN is a comparison point, not permission to run `git reset --hard` or another destructive recovery command without an explicit decision.
