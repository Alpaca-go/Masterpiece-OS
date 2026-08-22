# Planning variance diagnostic

数据源仅为仓库内既有 Attempt 2/3/4 runtime Planning audit；没有重新提取或模型调用。

| Attempt | Claims | Keys | Class / route 摘要 |
|---|---:|---:|---|
| 2 | 15 | 15 unique | FACT 5；USER_REQUIREMENT 10；TRUTH 1 / EVIDENCE_ONLY 4 / USER_REQ 10 |
| 3 | 15 | 15 unique | FACT 6；USER_REQUIREMENT 9；TRUTH 1 / EVIDENCE_ONLY 5 / USER_REQ 9 |
| 4 | 16 | 16 unique | FACT 15；USER_REQUIREMENT 1；TRUTH 2 / EVIDENCE_ONLY 13 / USER_REQ 1 |

Attempts 2 与 3 的 key set 相同。Attempt 4 新增且仅新增 canonical key `touchpoint_priority`；16 个 key 全部 unique，无 duplicate、unknown key 或 schema violation。它是 16-key Planning carrier 的合法成员，不是 project-specific extension。

Epistemic/route variance 是诊断信息，不建立 same-key/same-class hard gate。主要差异：Attempt 3 相对 Attempt 2 的 `audience_problem` 从 USER_REQUIREMENT/USER_REQ 变为 FACT/EVIDENCE_ONLY；Attempt 4 除 `brand_personality` 外其余为 FACT，并依 canonical router 分配。R1.4.1 已对 audience sub-claim 做 source-faithful reconciliation，本阶段不重开 classifier 或修改 Planning architecture。
