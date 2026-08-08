# Architecture Mechanism — ReceptionMembrane

> **基准（benchmark）说明**：本文描述旧链路曾经产出的 S 级空间机制，用于 R8.5 评估"新版本是否能复现同等级别的空间结构机制"。  
> **不用于**复制膜结构、曲线、前台形状、镜头。任何"长成类似"都被视为 production failure。
> **来源锚点**：`JZMX-ARCH-01-ReceptionMembrane`（anchor registry，imagePath 真实可用，provenance 见 `provenance.json`）。

---

## 1. 核心空间机制（Core Spatial Mechanism）

```
ceiling
  → descends
    → becomes translucent spatial boundary
      → frames reception
        → continues into circulation
```

**一句话表述**：一片连续的天花从上方下降，弯成半透明的接待区边界，再继续向动线延伸，最终消解于走廊。

**机制层数**：5 层（from / action 1 / action 2 / action 3 / action 4 / to）

---

## 2. 评估重点（Evaluation Anchors）

每条评估项在 1–5 分 Architecture Expressiveness 中对应 1 分贡献：

| # | 检查点 | 是否属于"建筑机制" |
|---|---|---|
| A | ceiling 主动参与空间组织（不是平顶 + 灯） | ✔ |
| B | ceiling / wall / boundary 在几何上是连续的（不是各管各的） | ✔ |
| C | 接待台嵌在空间机制里（不是独立家具） | ✔ |
| D | 建筑结构主导品牌体验（而非装修 / 装饰 / 灯） | ✔ |
| E | 动线由空间结构自然产生（不是硬隔断引导） | ✔ |

5 项全过 = 5/5。任一项仅"做出来形似"则扣 0.5–1 分。

---

## 3. 对新版本（Phase 9B Mode B）的要求

**允许**：从已有 V5 字段中 derive 一个等价的 5 层机制描述，写入 prompt（用 `from / action / through / to` 句式）。  
**禁止**：在 prompt 中写"参考 JZMX-ARCH-01"或任何隐式引用历史 Golden 图。  
**禁止**：把 `membrane ceiling` / `translucent boundary` 等具体形式固化为 brand 必选。

---

## 4. 与 R8 baseline 的关系

- R8 frozen `jiuzhou-aesthetics/reception` 的 prompt（5901 chars）已使用 anchor 01 的 mechanism 文本，但未显式输出 5 层动作句。
- R8.5.2 审计应测量：当前 14 blocks 中，architecture 块（`architecture_language` / `architecture_context` / `architecture_function_bridge` / `architectural_concept` / `architecture_dna`）字符数 / 总字符数 ≥ 35% 才视为机制层有承载。
- R8.5.4 新增 `compile-spatial-mechanisms.js` 输出的"动作句"必须等价于本文第 1 节的 5 层结构（不是 1–2 句的"soft continuity"抽象形容词）。
