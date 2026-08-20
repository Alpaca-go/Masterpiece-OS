# CI-W1C.7.3 — G02 Semantic Propagation Ledger (一剂良方)

> **Project**: G02 一剂良方 (projectId a13d6c09-99f7-4ff9-b499-3b9f8a1df31b)
> **Audit HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Mode**: Zero-API static audit
> **Scoring rubric**: 2 = preserved project-specific; 1 = generalized/weakened; 0 = lost

## Anchor-by-anchor propagation (G02)

| Anchor | What it is | 1 Src | 2 Parse | 3 DI/DVC | 4 Evid | 5 Truth | 6 Need | 7 StratCtxt | 8 Prompt | 9 Synth | 12 Concept | 13 Dir | Total | Retention |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|---:|---:|
| A01 4-element logo (良字+素问印章) | 图标+印章+拼音 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 0 | 1 | 1 | 13/22 | 0.59 |
| A02 #B59A6B+#B00000+#E8E5E0 | 木色+红+灰 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A03 思源宋体+繁体字形 | 思源宋体 | 2 | 2 | 2 | 1 | 1 | 1 | 1 | 1 | 0 | 0 | 0 | 11/22 | 0.50 |
| A04 花瓣/圆形底纹 | Logo-derived grid | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A05 中药柜摄影 | reference_case | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A06 活动物料摄影 | reference_case | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A07 比例与安全空间规范 | 图标高度X基准 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A08 浅灰名片+背面凸印 | material_cue | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A09 处方签与记录单 | 表格+Logo水印 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A10 药柜标签 | 大号宋体药材名 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A11 室内导视系统 | 4科室+3空间 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A12 门头外观 (疼痛·慢病·养生) | reference_case | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A13 素问一脉承 良方开新境 | 4 taglines | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A14 MISREAD_PHARMACY_ONLY | 误读药店 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A15 creativeDecision block | 升级叙事 | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| A16 红色+木色+宋体+水墨 cliché | 行业 cliché | 2 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6/22 | 0.27 |
| **TOTAL** | | 32 | 32 | 32 | 2 | 2 | 2 | 2 | 2 | 0 | 1 | 1 | 108/352 | **0.31** |

## Per-stage retention

| Stage | Anchors present (2) | Generalized (1) | Lost (0) | Retention % |
|---|:-:|:-:|:-:|---:|
| 1 Source | 16/16 | 0 | 0 | 100% |
| 2 Parsed | 16/16 | 0 | 0 | 100% |
| 3 DI/DVC | 16/16 | 0 | 0 | 100% |
| 4 Evidence | 0/16 | 2 | 14 | 6.3% |
| 5 Truth | 0/16 | 2 | 14 | 6.3% |
| 6 Need | 0/16 | 2 | 14 | 6.3% |
| 7 Strategic Context | 0/16 | 2 | 14 | 6.3% |
| 8 Prompt | 0/16 | 2 | 14 | 6.3% |
| 9 Synthesis | 0/16 | 0 | 16 | 0% |
| 10 Insight (slice of Synth) | 0/16 | 0 | 16 | 0% |
| 11 Opportunity (slice of Synth) | 0/16 | 0 | 16 | 0% |
| 12 Concept | 0/16 | 1 | 15 | 3.1% |
| 13 Direction | 0/16 | 1 | 15 | 3.1% |

## Key findings (G02)

1. **Same hard cliff: 3 DI/DVC (100%) → 4 Evidence (6.3%)**. The visual-decision-packet has all 16 anchors; the evidence-ledger only carries 4 generic entries. **14 of 16 anchors are LOST at the DI → Evidence boundary**.

2. **Only 2 LOCKED anchors survive into Truth (A01 4-element logo, A03 思源宋体)**. The other 14 are non-Truth: their content lives in `visual-decision-packet.{assetInventory, diagnosis, creativeDecision}`, not in `project-truth.json`.

3. **A15 (creativeDecision block) is a G02-specific LAYER that G01 lacks**. The 4-paragraph `creativeDecision` block (brandRoleStatement, upgradeFrom, preserveCore, upgradeTo, uniqueUpgradeThesis) is a rich strategic narrative — but it lives in `visual-decision-packet.creativeDecision`, NOT in `project-truth.json`. So the prompt never sees it.

4. **Stage 9 Synthesis has 0% retention** for any of the 16 anchors. The 3 synthesis tensions are project-agnostic ("asset preservation vs differentiation", "unresolved identity vs fixed execution", "preservation vs progression"). No 木色, no 良字, no 中医, no 处方签, no 4科室, no 素问.

5. **Stage 12 Concept recovers ONE anchor weakly (A01 logo)**: the model produces "静止的恒星与可塑的轨道空间" (a stationary star + adaptable orbit space) as a metaphor for 静场域·空间留白架构. The "stationary" maps to 原始锁定Logo. Other 15 anchors absent.

6. **Stage 13 Direction has the same weak recovery (A01 only)**: 语境插槽·模块化叙事框架 mentions "印章式固定落位" which is a weak echo of the 素问印章. The other 15 anchors are absent.

## Material drops

| Transition | Drop | Count | Severity |
|---|---:|---:|---|
| 3 DI/DVC → 4 Evidence | 93.7% (1.00 → 0.06) | 14 anchors lost (A02..A16) | **CRITICAL** |
| 3 DI/DVC → 5 Truth | 93.7% (1.00 → 0.06) | 14 anchors lost | **CRITICAL** |
| 5 Truth → 9 Synthesis | 6.3% (0.06 → 0.00) | 2 anchors lost (A01, A03) | SEVERE |
| 9 Synthesis → 12 Concept | 3.1% (0.00 → 0.03) | +1 anchor partial recovery (A01) | MILD RECOVERY |
| 12 Concept → 13 Direction | 0% (0.03 → 0.03) | same | STABLE (low) |

**Primary FIRST_LOSS_STAGE for G02: 3 DI/DVC → 4 Evidence** (same as G01).

## Cross-project observation (G01 ∩ G02)

- Both projects lose 13-14 of their distinctive anchors at the DI → Evidence boundary.
- Both recover 1 anchor weakly at Concept.
- The recovery is for the LOGO anchor only — the project-specific COLORS / COPY / SPATIAL / RISK / IMAGERY anchors never recover.
- **The pattern is structurally identical between G01 and G02**: the FIRST_LOSS_STAGE is the same for both projects.
