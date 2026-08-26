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
| brand-motif-architecture-pollution | 同上（品牌母题污染 architecture IR） | 同上 | 同上 | 同上 | 同上 |
| generic-luxury-clinic | R8.5 早期 generic luxury clinic 形态（R8 baseline 已知风险） | 待补充 | 待补充 | 待补充 | 待补充 |
| cross-brand-style-leak | R8 诊断（JZMX 膜语言污染 FTT / YJLF 类风险） | 待补充 | 待补充 | 待补充 | 待补充 |

### 说明

R8.5.1 的唯一失败诊断样本同时呈现多种失败形态（feather 墙面 / purple 天花 /
motif 雕塑 / 品牌母题污染 architecture IR），因此多个类别共用同一 run 资产。
`generic-luxury-clinic` 与 `cross-brand-style-leak` 为 R8 已知风险类别的占位，
随后续诊断累积应补齐独立样本。

**Anti-regression 资产绝不删除**：它们是 R9 Productionization 与任何未来
Compiler 改动最重要的回归反例。

完整失败诊断见 `failed-diagnostics/r8.5.1-jzmx-brand-motif-architecture-pollution/diagnosis.md`。
