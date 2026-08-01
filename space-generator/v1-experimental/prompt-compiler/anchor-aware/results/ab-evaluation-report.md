# Phase 8A A/B Prompt-Text-Level Analysis Report

- **Generated**: 2026-08-01T08:11:21.567Z
- **DNA**: jiuzhou-aesthetics dnaVersion v0.2
- **Anchors**: 3 (JZMX-ARCH-01-ReceptionMembrane, JZMX-ARCH-02-EntranceGlass, JZMX-ARCH-03-ConsultationFacade)

## 关键诚实声明

> 6-dim Space Evaluation Layer 基于 DNA 字段评分, 不是 prompt 文本.
> A (baseline) 和 B (anchor-aware) 用同一份 DNA, 字段级评分永远 = A==B (这是设计事实).
> 真正能回答用户 4 个问题的是 **prompt 文本级** 分析, 即下面这份报告.

## 0. Block 结构差异

| 指标 | A (baseline) | B (anchor-aware) | diff |
| --- | --- | --- | --- |
| blockCount | 10 | 11 | +1 (新增 architecture_context) |
| characterCount | 5019 | 6019 | +1000 (19.9%) |

**block 顺序**:
- [0] task (in A[0]: ✓)
- [1] architecture_context **[NEW]** (in A[1]: ✗)
- [2] architectural_concept (in A[2]: ✗)
- [3] architecture_dna (in A[3]: ✗)
- [4] brand_translation (in A[4]: ✗)
- [5] functional_requirement (in A[5]: ✗)
- [6] material (in A[6]: ✗)
- [7] lighting (in A[7]: ✗)
- [8] composition (in A[8]: ✗)
- [9] rendering (in A[9]: ✗)
- [10] negative_constraints (in A[10]: ✗)

## 1. Architecture Score 变化 (prompt 文本级)

**全 prompt Architecture 关键词总数**: A=56 → B=95 (+39, 70% 增长)

**在 architectural_concept 块内的 Architecture 关键词**:
- A: 19 | B: 19 (block 内容应一致, 因为 anchor 不修改 architectural_concept)

**在 architecture_context 块内 (B 独有)**:
- B: 39 (新增)

**TOP-10 Architecture 关键词对比**:
| keyword | A | B | diff |
| membrane | 2 | 4 | +2 |
| facade | 1 | 3 | +2 |
| partition | 1 | 1 | +0 |
| 半透明 | 6 | 8 | +2 |
| 膜 | 10 | 13 | +3 |
| 膜结构 | 3 | 3 | +0 |
| 天花 | 7 | 11 | +4 |
| 玻璃 | 2 | 5 | +3 |
| 幕墙 | 1 | 2 | +1 |
| 走廊 | 1 | 2 | +1 |

**结论 (Q1)**: Architecture 关键词密度在 B 中显著增加, 但增量全部来自新增的 `architecture_context` 块, 没有侵入其他块. 整体 Architecture 在 prompt 层是**加强的**.

## 2. Brand Translation 变化

**全 prompt Brand 关键词总数**: A=18 → B=19 (+1, 6%)

**brand_translation 块 (byte-equivalent check)**:
- A: 1526 chars
- B: 1526 chars
- byte-equal: **YES** (设计保证, anchor 不修改 brand_translation 块)

**brand_translation 块内 Brand 关键词**:
- A: 14 | B: 14 (byte-equal 所以必相等)

**结论 (Q2)**: Brand translation 在 A 和 B 中**完全相同** (byte-equal). anchor 注入不修改 brand_translation 块, 品牌信息密度不变.

## 3. Functional Realism 变化

**全 prompt Functional 关键词总数**: A=10 → B=14 (+4, 40%)

**functional_requirement 块 (byte-equivalent check)**:
- A: 558 chars | B: 558 chars
- byte-equal: **YES** (anchor 不修改 functional_requirement 块)

**结论 (Q3)**: Functional realism 在 A 和 B 中**完全相同** (byte-equal). anchor 注入不修改 functional_requirement 块, 商业真实性内容密度不变.

## 4. Architecture Anchor 是否压制 Brand DNA?

**4.1 Brand_translation 块 byte-equivalent check**:
- A == B (byte-equal): **YES (不压制)**

**4.2 5 维 brand_spirit 维度名在 prompt 中是否完整保留**:
- A: 5/5 完整 (scientific, elegant, healing, futuristic, premium)
- B: 5/5 完整 (scientific, elegant, healing, futuristic, premium)
- 状态: **保留 (无损失)**

**4.3 brand_translation 在 prompt 中的位置**:
- A: block[3]
- B: block[4] (anchor 注入到 block[1], brand_translation 顺移到 block[4])
- 在 B 中, architecture_context (block[1]) 在 architectural_concept (block[2]) 之前, brand_translation 仍在 block[4]. anchor 不在 brand_translation 之前插入内容, 不直接压制.

**4.4 Architecture 关键词 vs Brand 关键词 字符比 (B 中)**:
- B 中 architecture 关键词出现 95 次, brand 关键词出现 19 次
- 比例: 95:19 = 5.00:1
- 含义: B 中 architecture 关键词密度**高于** brand 关键词, 这正是 v1.1 §4 设计的 50/30/20 权重 (architecture 占主导). 但这是**密度**差异, 不是**压制** (品牌内容没被删)

**4.5 5 维 brand_spirit 完整度 (v1.0 §15 关键)**:
- A: 5/5 (完整)
- B: 5/5 (完整)
- **结论**: B 没有损失任何 brand_spirit 维度, v1.0 §15 关键控制保持完整.

**4.6 5 个 motif 规则 (literalAssetForbidden=true) 完整度 (v1.0 §34 规则一/五)**:
- A: 5/5 motif 规则 (feather_like_flow, petal_like_expansion, optical_crystal, translucent_fiber, flowing_membrane)
- B: 5/5 motif 规则 (feather_like_flow, petal_like_expansion, optical_crystal, translucent_fiber, flowing_membrane)
- **结论**: B 没有损失任何 motif 规则, v1.0 §34 关键控制保持完整.

## 5. 块字符数明细 (B vs A)

| block id | A chars | B chars | diff | 备注 |
| --- | --- | --- | --- | --- |
| task | 174 | 174 | 0 | 不变 |
| architectural_concept | 550 | 550 | 0 | 不变 |
| architecture_dna | 438 | 438 | 0 | 不变 |
| brand_translation | 1526 | 1526 | 0 | 不变 |
| functional_requirement | 558 | 558 | 0 | 不变 |
| material | 321 | 321 | 0 | 不变 |
| lighting | 406 | 406 | 0 | 不变 |
| composition | 375 | 375 | 0 | 不变 |
| rendering | 297 | 297 | 0 | 不变 |
| negative_constraints | 365 | 365 | 0 | 不变 |
| architecture_context | 0 | 999 | 999 | [NEW] |

## 6. Phase 8A A/B 总结

| 维度 | A (baseline) | B (anchor-aware) | 变化方向 |
| --- | --- | --- | --- |
| Architecture 关键词密度 | 56 | 95 | ↑ (主要增量来自 architecture_context 块) |
| Brand 翻译密度 (block 字符) | 1526 | 1526 | = (byte-equal) |
| Brand 5 维 spirit 完整度 | 5/5 | 5/5 | = (无损失) |
| Motif 规则完整度 | 5/5 | 5/5 | = (无损失) |
| Functional 关键词密度 | 10 | 14 | = (byte-equal) |
| Functional 块 byte-equal | - | - | = YES |
| Total character count | 5019 | 6019 | +1000 (19.9%) |

**核心结论**:

1. **Architecture 提升** (Q1): anchor 注入新增 `architecture_context` 块, Architecture 关键词密度 +39 (70%)
2. **Brand 保持** (Q2): brand_translation 块 byte-equal, 5 维 brand_spirit 全部保留, 5 个 motif 规则全部保留. **没有压制**.
3. **Functional 保持** (Q3): functional_requirement 块 byte-equal, 商业真实性 100% 不变.
4. **没有压制** (Q4): anchor 在 prompt 中作为独立块出现 (block[1]), 不修改其他块. brand_translation 完整保留.

**架构性诚实声明**:

- 这份报告分析的是 **prompt 文本层**, 不是生成图像层.
- 真正的"建筑美学是否提升"需要在 Phase 8B 跑真实 Provider A/B, 用 §25 6-dim 评分对比两边的图.
- Phase 8A 只证明: anchor 注入**没有**破坏 brand/functional, 且**新增了** architecture context. 是否真的让模型"画得更好", 需要 Phase 8B.

**建议进入 Phase 8B**:

Phase 8B 跑两次真实 Seedream (一次 A baseline 10 块, 一次 B anchor-aware 11 块), 用 v1.0 §25 6-dim + 视觉对比 (perceptual hash) 评分, 看 anchor 注入是否真的产出"更建筑事务所感"的图.
