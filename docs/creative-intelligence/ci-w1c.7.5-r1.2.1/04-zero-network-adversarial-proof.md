# Zero-Network Adversarial Proof

## Focused result

The R1.2.1 adversarial tests plus existing Planning carrier/orchestrator proofs passed **25/25** with deterministic in-process reasoners.

| Test | Adversarial input | Final result |
| --- | --- | --- |
| EPI-01 | `希望品牌成为区域平台`, model FACT | USER_REQUIREMENT — PASS |
| EPI-02 | `该业务可能面向年轻家庭`, model FACT | MODEL_INFERENCE — PASS |
| EPI-03 | `最终业务模式待确认`, model FACT | UNKNOWN — PASS |
| EPI-04 | `公司采用订阅制供应模式`, model FACT | FACT — PASS |
| EPI-05 | plain declarative source, model USER_REQUIREMENT | USER_REQUIREMENT — PASS |
| EPI-06 | model emits `confidence: 0.99` | validator rejects; valid projection confidence undefined — PASS |

EPI-02 additionally proves that an inference marker present in `evidence.summary` participates in deterministic classification.

## Preserved proofs

- all 16 Planning keys validate and project;
- G01-isomorphic carrier projects 12/12 anchors;
- strict prompt follower completes the full chain;
- base plus repair failure throws `NARRATIVE_EXTRACTION_FAILED`;
- orchestrator keeps Strategic `NOT_RUN` after narrative failure;
- R1.1 Hybrid merge regression passes without implementation changes;
- NPE-10 scans both changed production semantic files and passes.

## Forbidden-call counters

- live model calls: 0;
- image calls: 0;
- legacy PNG reads: 0;
- G01 real DOCX reads: 0;
- G01 Attempt 2 executions: 0.
