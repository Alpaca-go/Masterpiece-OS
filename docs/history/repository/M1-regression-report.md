# M1 Regression Report

Date: 2026-08-12  
Result: PASS

| Gate | Result |
|---|---|
| `npm run repo:verify` | PASS |
| `verify:current-flows` | 334/334 PASS |
| `npm test` | PASS |
| `npm run cli:test` | 40/40 PASS |
| `npm run runtime:test` | PASS; runtime application 334/334 |
| `npm run web:smoke` | PASS; provider calls 0; business writes 0 |
| Actual Web | PASS; known stage-label matches 0 |
| `npm run golden:test` | G-01 through G-05 PASS |
| G-04 | PASS (`NOT_APPLICABLE`) |
| Repository Contract | PASS; authorities 15; conflicts 0 |
| Prompt integrity | PASS; frozen prompts changed NO |
| Golden files | changed NO; auto-updated NO |

Actual Web was started through the Node Runtime Host and inspected at the rendered page. It displayed `Masterpiece OS` / `Web`, normal project navigation, and no known `v5`, `vNext`, R11, or removed Desktop product copy. Qwen default evidence remained `qwen3.6-plus`.

The first `repo:verify` run exposed one stale test assertion that required `vNext` in a user-facing readiness reason. The assertion was updated to the semantic `Project Visual Context`; the complete gate then passed.

The legacy `check-baseline-drift.mjs` reports drift because its S1 manifest still lists removed Desktop/v5 topology. M1 did not change that baseline manifest or roll back the frozen S6/S7 Web + Node Host architecture.
