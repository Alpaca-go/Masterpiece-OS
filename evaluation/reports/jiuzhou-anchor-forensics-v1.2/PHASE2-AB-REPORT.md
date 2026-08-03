# 九州美学空间生图链路取证 v1.2 — 第二阶段 A/B/C 对照报告

> 分支：`fix/jiuzhou-spatial-anchor-forensics-v1.2`
> 基线 Tag：`pre-jiuzhou-spatial-calibration-v1.2`
> 执行日期：2026-08-03
> 执行方式：`apps/desktop/scripts/jiuzhou-anchor-forensics-v12.ts`（独立取证脚本，未改生产代码）

## 1. 受控变量

| 变量 | 值 |
|---|---|
| 模型 | volcengine / doubao-seedream-5-0-pro-260628（与失败 run 一致） |
| 画幅 | 2560*1440（16:9，与失败 run 一致） |
| 基础 Prompt | 第一阶段冻结的 `run-b7a794e0/compiled-prompt.md` 逐字复用，四次未调整 |
| Seed | **不支持**（两条 Provider 链路均无 seed 参数），以同 Prompt/同参考图逐次执行代替 |
| 唯一变量 | 参考图组合与顺序 |

中止规则执行：每次提交前校验 Anchor sha256 与 `anchor-manifest-v1.json` 一致；每次 run 完成后回读 `task.json`，确认 `references` 的 id 与顺序与变体规格完全一致（Anchor 未进入即 exit 1）。四次全部通过校验，无静默降级。

## 2. 四次对照

| 变体 | 参考图（顺序） | runId | 状态 | 耗时 |
|---|---|---|---|---|
| A Golden Anchor Only | [JZMX-SGR-02-Reception] | 90265dd1 | succeeded | ~128s |
| B Source Space Only | [九州美学视觉方案-11.png] | 7ad96015 | succeeded | ~85s |
| C1 Source→Anchor | [source, anchor] | f175a976 | succeeded | ~99s |
| C2 Anchor→Source | [anchor, source] | c6c8809e | succeeded | ~80s |

产物：`phase2/test-{a,b,c1,c2}/{prompt.md, run.json, image.png}`。

## 3. 结果判读

### Test A（Golden Anchor Only）
珍珠白连续曲面、暖中性柔光、低饱和淡紫边缘光、羽瓣装置（小尺度/背景）、弧形门廊纵深、品牌墙克制、Logo 比例恰当。Anchor 的材质/灯光/品牌整合/装饰密度被完整继承，无科技展厅、无巨型 Logo、无大面积紫墙。

### Test B（Source Space Only）
**完整复现失败模式**：深木色展示柜墙（dark wood）、灰色硬包墙面、酒店式大堂台灯与接待员、商务休息室气质、Logo 放大上墙、大面积紫色地毯块。与 08-03 两张失败图同源——证明 Source Space Reference 单独输入时，模型继承的是**旧视觉皮肤**而非仅空间结构。

### Test C1（Source First + Anchor Second）
与 A 几乎一致：珍珠白、弧廊、淡紫边缘光、羽瓣、克制 Logo。Source 的深木/酒店语言被完全压制。

### Test C2（Anchor First + Source Second）
与 A、C1 几乎一致。**参考图顺序在本模型上无可观测影响。**

## 4. 结论（据此选择修复路线）

1. **Golden Anchor 本身校准能力充足**：只要它真实进入请求（A/C1/C2），无需任何 Prompt 改动、无需 architectural_language 权重、无需结构预处理，视觉皮肤即被正确重构。
2. **生产失败的根因是链路层**：Anchor 从未进入真实请求（第一阶段 H1 静默降级坐实），而不是 Anchor 不够多、Prompt 不够长或权重不够高。
3. **Source Space 单独输入是失败放大器**（B）：结构/风格未分离时，它把 dark wood / hotel lobby / Logo 上墙的旧皮肤整体带回。
4. **顺序无关**（C1≈C2）：无需为参考图排序投入修复。
5. `architectural_language: 0.75` 维持第一阶段结论——无效配置，对结果无贡献（A/C1/C2 的成功发生在它完全不生效的情况下）。

## 5. 修复路线（按测试结果选定，未提前假设）

- **F1（必须）**：消除静默降级——`deliverableFamily === 'space'` 且项目存在空间配置时，`loadSpatialProjectBundle` 失败必须硬中止（满足"Anchor 未进入模型时必须中止"红线）；同时修复打包资源分发（`extraResources` 已在 `electron-builder.yml:19-24`，但 07-28 打包产物缺失，需重新打包）与 dev 态 configRoot 解析。
- **F2（随 F1 恢复）**：JZMX-SGR-02-Reception 进入 reference 数组即足够；无需新增 Anchor、无需排序逻辑。
- **F3（小）**：删除或接线 `architectural_language: 0.75` 无效配置；鉴于 A/C1/C2 证明锚图本身足够，建议**删除**而非新增映射（不增加复杂度）。
- **F4（保留现状）**：Source Space 结构化预处理（灰度+纹理抑制）保留，大空间（large_lobby）场景的结构锁定价值由 v1.1 回归测试覆盖，本轮不改。
- 不做：Prompt 文案修改、Vertical Spatial Archetype、新 Anchor、知识库、大范围重构。

## 6. 备注

- 基础 Prompt 中含 "MANDATORY SELECTED VISUAL ASSET 1: 九州美学视觉方案-11.png" 文案，Test A 中参考图 1 实为 Anchor——按协议四次不调整 Prompt，该错位如实记录；结果显示其未影响 Anchor 校准效果，但正式修复时应让 Prompt 引用与实际参考图一致（属 F1/F2 的连带检查项）。
- 四次生成为真实 Provider 调用，用户已授权；凭据走 settings-store 解密，未落库、未入仓。

---

**End of Phase 2 A/B/C Report**
