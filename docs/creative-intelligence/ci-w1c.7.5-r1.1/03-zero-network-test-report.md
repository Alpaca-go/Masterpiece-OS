# CI-W1C.7.5-R1.1 Zero-Network Test Report

Date: 2026-08-21

## Focused R1.1 proof

Command:

```text
node --test tests/packages/creative-intelligence/ci-7.5-r1/*.test.js
```

Result: **24/24 PASS**.

New runtime-level coverage includes:

- NPE-11: real ESM projection execution;
- NPE-12/13/15: canonical character-count and chunk-coverage decisions;
- NPE-17/23: fake reasoner → build messages → parse → validate → normalize → DVC projection → hybrid merge;
- NPE-24/25: invalid output repairs with previous output and validation errors visible;
- NPE-26: base + repair failure throws canonical error;
- NPE-19..22: confidence, tie, conflict, exact-id, and unknown-source merge behavior;
- NPE-14/18: sufficient structured coverage skips narrative and Strategic runs;
- NPE-16: insufficient narrative base + repair failure blocks before Strategic;
- NPE-12/15/17: long-document insufficient coverage invokes narrative and continues after valid fake output.

## R2 / R2.1 / R1 regression

```text
node --test ci-7.4-r2 ci-7.4-r2.1 ci-7.5-r1 suites
```

- R2: 34/34 PASS
- R2.1: 10/10 PASS
- R1 including R1.1: 24/24 PASS
- Combined: **68/68 PASS**

## Wider regressions

- `npm run web:typecheck`: PASS
- `npm run cli:test`: 40/40 PASS
- runtime-core portion of `npm run runtime:test`: 14/14 PASS
- `npm run web-runtime:test`: 20/20 PASS
- `npm test`: 1586/1590 PASS, 4 historical unrelated failures
- runtime-application portion: 1620/1638 PASS, 18 historical unrelated failures
- `npm run web-runtime:typecheck`: historical cross-domain type failures; no new error points at an R1.1 runner/orchestrator/test line.

The historical failures are recorded in `04-guard-delta-report.md`; none is in the R1.1 focused path.

## Network and asset accounting

- Live model calls: **0**
- Image calls: **0**
- Legacy PNG reads: **0**
- Narrative model seams: deterministic in-process fake reasoners only
- Planning fixtures: synthetic temporary `.md` files only
