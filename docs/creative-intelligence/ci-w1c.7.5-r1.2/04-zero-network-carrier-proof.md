# Zero-Network Carrier Proof

## Focused execution

Command:

```text
npm exec --yes tsx -- --test tests/packages/creative-intelligence/ci-7.5-r1/npe-r1.2-planning-semantic-carrier.test.js tests/packages/creative-intelligence/ci-7.5-r1/npe-r1.1-pre-live-repair.test.js tests/packages/creative-intelligence/ci-7.5-r1/npe-narrative-extraction-basics.test.js
```

Result: **19 tests passed, 0 failed**.

## Proven behavior

- all 16 `PLANNING_CLAIM_KEYS` validate and project;
- unknown Planning keys are rejected;
- raw output without runtime metadata validates;
- Unicode NFC, trim, dedupe, and stable normalization are deterministic;
- a G01-isomorphic synthetic carrier projects all 12 qualification anchors, 12/12;
- Planning authority is present in the system message;
- raw source text exists only in the user document message;
- repair preserves the Planning instruction, source document, previous output, and validation errors;
- a strict prompt follower that returns only explicitly requested semantic fields completes parse, validate, normalize, and projection in one call;
- invalid base and repair outputs throw `NARRATIVE_EXTRACTION_FAILED`;
- existing orchestrator tests prove sufficient structured coverage skips narrative, insufficient coverage invokes narrative, success continues Strategic, and base-plus-repair failure keeps Strategic `NOT_RUN`;
- NPE-10 scans the new production semantic-contract file and reports no project-specific literal.

## Call and source counters

- live model calls: 0;
- image model calls: 0;
- legacy qualification PNG reads: 0;
- G01 real DOCX reads: 0;
- G01 Attempt 2 executions: 0.

All reasoner behavior in this proof is deterministic and in process.
