# Anti-regression Samples (R8.6)

> R8.5 / R8.5.1 失败输出永久保留为 Anti-regression Samples。**不要删除失败图**——
> 它们是非常重要的测试资产，用于防止未来生成核心"恢复"到失败行为。
>
> 本目录只登记索引（hash + runId + 引用路径），输出图二进制留在
> `failed-diagnostics/` 对应目录，遵循仓库"大图 gitignore + hash 追溯"约定。

## 用途

Future Space Generator change（尤其是 R9 Productionization 迁移）必须证明：
- 不再出现 `giant literal feather` 一类的 literal motif architecture
- 品牌色不再充当空间几何生成器（紫色天花板 / 紫色亚克力隧道）
- 无跨品牌风格泄漏（JZMX 膜语言污染 FTT / YJLF）
- 不变回 generic commercial interior

## 样本

| 类别 | 来源 | runId | promptHash | imageSha256 | 位置 |
|---|---|---|---|---|---|
| jzmx-purple-feather-space | R8.5.1 Mode T reception smoke | `r85-smoke-jz-reception-v1-1786183915715` | `03aab37e…9f46` | `fa8dc88c…0aaf4` | `failed-diagnostics/r8.5.1-jzmx-brand-motif-architecture-pollution/` |
| jzmx-giant-feather-wall | 同上（giant feather / peacock focal wall） | 同上 | 同上 | 同上 | 同上 |
| jzmx-literal-brand-sculpture | 同上（品牌母题作为大型雕塑形体） | 同上 | 同上 | 同上 | 同上 |

### 说明

R8.5.1 的唯一失败诊断样本同时呈现三种失败形态（feather 墙面 / purple 天花 /
motif 雕塑），因此三个类别共用同一 run 资产。随着后续 R8 诊断累积，应在此
追加 `cross-brand-style-leak` 与 `generic-commercial-interior` 类别的独立样本。

完整失败诊断见 `failed-diagnostics/r8.5.1-jzmx-brand-motif-architecture-pollution/diagnosis.md`。
