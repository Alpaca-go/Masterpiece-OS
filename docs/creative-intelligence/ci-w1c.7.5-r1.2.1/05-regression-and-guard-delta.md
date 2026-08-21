# Regression and Guard Delta

## Planning regressions

- R1: 38/38;
- R2: 34/34;
- R2.1: 10/10;
- combined: 82/82.

The six-test increase over R1.2 is exactly EPI-01..06. Existing 16/16 schema, 12/12 carrier, strict follower, repair, fail-closed, canonical coverage, source/claim ID, routing, grounding, and Hybrid merge proofs remain passing.

## Wider checks

- CLI: 40/40;
- Web Runtime: 20/20;
- Web typecheck: pass;
- Web build: pass;
- root tests: 1602/1604, with the same two existing failures as R1.2 after accounting for six new passing tests;
- runtime tests: 1621/1638, same 17 existing frozen-diff, branch-cleanliness, Web surface, and diagnostic failures;
- `verify:current-flows`: still fails through that same runtime-application baseline.

One first aggregate root run also showed a transient decision-runtime parity failure; the exact 17-test file passed 17/17 immediately, and the aggregate rerun returned to the established two-failure baseline.

## Passing guards

- version consistency;
- version naming;
- production boundaries;
- no project-specific production rules;
- Golden production boundary;
- no obsolete code;
- A4 aggregate;
- repository guard tests 40/40.

## Existing guard failures

- `repo:verify` stops at existing repository-contract RC007 ×1 and RC005 ×2;
- workspace boundaries retain the existing missing dependency/deep-import findings and `dir is not defined` script error;
- tracked runtime assets retains 11 existing findings, including the preserved unrelated untracked probe script;
- current flows retains the existing runtime-application failure set.

No failure points to the R1.2.1 resolver, classifier correction, confidence removal, runner wiring, or adversarial tests. Relevant negative guard delta: **none**.
