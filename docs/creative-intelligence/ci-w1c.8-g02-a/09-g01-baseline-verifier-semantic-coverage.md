# G01 Baseline Verifier Semantic Coverage

The G01 manifest was not modified. Its canonical fingerprint remains `eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12`.

`scripts/verify-g01-frozen-baseline.mjs` now adds:

| Check | Contract |
|---|---|
| BASELINE-11 | exact applicable Human Review dimensions |
| BASELINE-12 | thresholds exactly 2 and 2.4 |
| BASELINE-13 | exact traceability hard contract |
| BASELINE-14 | diagnostics cannot become implicit hard gates |
| BASELINE-15 | `stopAfter=synthesis` |
| BASELINE-16 | Concept/Direction NOT_RUN, attempts 0, Provider attempts 0 |
| BASELINE-17 | `requestTimeoutMs` authority |
| BASELINE-18 | BASE1 / TRANSPORT1 / SEMANTIC1 / maximum 3 |
| BASELINE-19 | exact Provider failure taxonomy |
| BASELINE-20 | exact Provider ledger required-field set |

Result: BASELINE-01..20 PASS. The phase-critical invocation remains the independent `npm run verify:g01-frozen-baseline` command because existing repository-contract failures can stop `repo:verify` before later commands. Future CI integration should place this guard as an explicit independent job, not append it after a known early-failing chain.
