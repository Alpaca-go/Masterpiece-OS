# CI-W1C.8-G02-A Final Report

## Outcome

The single approved candidate was read only for exact-path identity verification. Its filename, 1,062,344-byte size, and SHA-256 exactly match frozen G01. Material independence is therefore 0 dimensions, below the required 3.

Final verdict: `HOLD_FOR_G02_SOURCE_SELECTION_REPAIR`.

## Deterministic checks

- document role: `brand-strategy`, medium confidence, Planning Strategic Evidence eligible;
- structured coverage: exact frozen-provenance replay, 0 claims, 0 semantic types, 0/3 chunks, ratio 0, 10,737 characters, `no_claims`, expected Narrative fallback;
- independent anchor count: 0, construction intentionally BLOCKED;
- G01 manifest semantic values: unchanged;
- G01 fingerprint: `eda3982872a0545f8d8f30f34c931a423bd1c134e14f430ac93e132544e58d12`;
- BASELINE-01..20: PASS.

## Mandatory test result

- G02SRC: 01..04 PASS; 05 FAIL because materially different dimensions are 0;
- G02ROLE: 2/2 PASS;
- G02ANCHOR: 4 PASS and 4 BLOCKED; no independent map was authorized;
- G02READY-07..08: 2/2 PASS;
- BASELINE-01..20: 20/20 PASS;
- focused R1/R2/R2.1/MOCK/Transport/SR/SG13/QR/SCOPE/TRACE: all PASS.

The full root `npm test` equivalent produced 1563/1566: the two existing V3/tracked-assets failures plus one existing nondeterministic CI-1B parity failure. Runtime Core passed 14/14; Runtime Application retained its existing 1621/1638 result. Web typecheck, CLI 40/40, Web Runtime 20/20, Web build, relevant guards, A4, and repository guard 40/40 passed. Guard delta: 0.

## Boundary

- selected source reads: 1;
- parent directory scans: 0;
- sibling source reads: 0;
- unrelated source reads: 0;
- Provider/model calls: 0;
- G02 executions: 0;
- Image calls: 0.
- successful qualification/test external network I/O: 0;
- downloads: 0.

## Next condition

Replace the candidate with a source that differs materially from G01 in at least three dimensions. Only then may a new independent, source-grounded, human-reviewed anchor map be created. G02 Attempt 1 remains forbidden.
