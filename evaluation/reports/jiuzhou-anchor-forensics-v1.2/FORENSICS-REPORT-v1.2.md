# 九州美学空间生图链路取证报告 v1.2（第一阶段）

> 分支：`fix/jiuzhou-spatial-anchor-forensics-v1.2`
> 基线 Tag：`pre-jiuzhou-spatial-calibration-v1.2`（指向 main `0832bb2`）
> 取证日期：2026-08-03
> 取证对象：当前稳定版本最近两次真实 run（项目「九州美学-80b80c56」）
> 性质：只读取证，未修改任何生产代码、Prompt、包装链路、VI 链路

---

## 0. 取证对象

| 项 | run-f51407a0 | run-b7a794e0 |
|---|---|---|
| 时间 | 2026-08-03 22:28（本地） | 2026-08-03 22:32（本地） |
| Provider / 模型 | volcengine / doubao-seedream-5-0-pro-260628 | 同左 |
| 端点 | ark.cn-beijing.volces.com/api/v3/images/generations | 同左 |
| 交付类型 | space / reception / entrance_view | 同左 |
| 状态 | succeeded（但结果失败） | succeeded（但结果失败） |
| 失败图 | `run-f51407a0/failed-result-image-01.png` | `run-b7a794e0/failed-result-image-01.png` |

冻结证据：`config-snapshot/`（5 份生效配置）、两次 run 的 `compiled-prompt.md` / `task.json` / `run.json` / `provider-request.redacted.json` / 失败图、`run-b7a794e0/model-payload.json` + `trace.json`、`reference-images.json`。

---

## 1. 模型真实收到的 reference_images 数组（结论 ④）

**两次 run 均只有 1 张参考图**（完整实况见 `reference-images.json`）：

```text
[0] 九州美学视觉方案-11.png（assetId 12c8d0b4…，role=current_project_identity，
    用户手选，base64 内联，未经任何结构化预处理）
```

- 无 JZMX-SGR-02-Reception（Golden Anchor）。
- 无 Source Space Reference 结构预处理产物。
- 数组顺序、上限（≤2）等保护逻辑从未被触发，因为空间链路整体未进入。

## 2. JZMX-SGR-02-Reception 是否进入最终请求（结论 ⑤）

**否。且从未进入过任何一次真实请求。**

- 资产存在且校验链完整：`assets/golden-references/spatial/jiuzhou-aesthetics/JZMX-SGR-02-Reception.png` + `anchor-manifest-v1.json`（含 sha256）。
- 选择逻辑存在：`anchor-loader.js:63-69`（reception/lobby/large_lobby → SGR-02）。
- 但全部历史 run 的 `task.json` 中 `golden-anchor` 命中数为 **0**。
- 断点在 `short-chain-service.ts:231-237`：`loadSpatialProjectBundle` 抛 ENOENT 时被 `.catch` 吞掉并返回 `null`，随后 Anchor 选择、结构预处理、空间编译段全部被跳过，**无任何告警、无中止——静默降级**。

## 3. Source Space Reference 是否经过结构化预处理（结论 ⑥）

**代码存在，实际 run 未执行。**

- 预处理实现存在：`spatial-structure-reference.ts:31-40`（sharp：灰度化 + 模糊 1.1 + 线性压纹理 + 锐化恢复边缘；无 edge map / depth map / Logo 模糊）。
- 触发条件：`short-chain-service.ts:273-292`，仅在 `spatialProjectBundle` 非 null 时执行。
- 实际 run：因 §2 的静默降级，预处理未运行；模型收到的是**原始彩色图**，同时充当了结构参考与风格参考——正是 v1.1 文档 §2.1 描述的"结构/风格未分离"失败模式。

## 4. 最终 Prompt 模板语言扫描（结论 ⑦）

对两版真实 `compiled-prompt.md`（5664 字符，【01】–【13】段）扫描：

| 关键词 | 命中 |
|---|---|
| corporate lobby / hotel lobby / dark wood / executive reception / business lounge | **0（全仓运行时模板中也不存在）** |
| technology showroom / futuristic clinic | 最终 Prompt 中 0；仅以**负向排除项**存在于 `project-exclusions-v2.json`（未注入本次 Prompt） |
| GOLDEN ANCHOR / JZMX / STRUCTURE FOUNDATION / NEGATIVE GUARDS / LOGO SCALE | **0** |

结论：最终 Prompt **不含**后置模板语言，失败不来自 Prompt 文案污染；但 v1.1 要求的九个空间编译段**整段缺失**——失败来自空间校准链路未生效。

## 5. architectural_language: 0.75 的实际映射（结论 ⑧）

**标记为：无效配置（无任何执行行为映射）。**

证据链：

1. 值存在于 `anchor-manifest-v1.json: influenceCaps.architecturalLanguage = 0.75` 与 `metadata.yaml:50-59`。
2. 运行时读取 cap 的入口是 `resolveAnchorInfluence`（`context-compiler.js:82`），但它只消费 `anchorSignals` 中出现的维度。
3. 信号唯一来源 `anchorSignalsFromSelection`（`anchor-loader.js:131-139`）的 `roleToDimension` 映射表**不包含** `architectural_language` 角色，因此永远不会产出 `architecturalLanguage` 信号。
4. 结果：该 cap 从未被读取生效——不改 Prompt、不改请求参数、不改任何执行行为。
5. `metadata.yaml` 整体亦无任何运行时消费者（`config-loader.js` 只读 JSON）。
6. 即便 §2 的静默降级被修复，`architectural_language: 0.75` 依然不会生效，需要补角色→维度映射或删除该配置。

对照：`spatialScale: 0` 是**有效**的（`anchor-loader.js:108-112` 强制 + `resolveAnchorInfluence` cap≤0 拒绝路径），brand_atmosphere 等其余 cap 仅影响 `[GOLDEN ANCHOR CALIBRATION]` Prompt 文本。

## 6. 根因假设（待第二阶段 A/B/C 验证，不提前定案）

- **H1 静默降级（已坐实存在）**：运行环境缺少 `config/spatial` → bundle 加载 ENOENT 被吞 → 空间链路整体跳过。佐证：当前打包产物（07-28）的 `resources/` 无 `config/spatial` 与 `assets/golden-references`（`extraResources` 于 07-29 后才加入 `electron-builder.yml:19-24`），开发态默认 `DEFAULT_CONFIG_ROOT_URL` 在打包 bundle 中同样失效。
- **H2 参考图职责未分离**：唯一参考图未预处理，原视觉皮肤被整体继承（v1.1 §2.1）。
- **H3 Anchor 校准缺失**：无 Golden Anchor 输入 + architectural_language 无效配置，空间气质无人校准。

H1 是链路级事实，H2/H3 对最终画质的影响权重需由第二阶段四次对照生成判定。

## 7. 红线自查（第一阶段）

- 未改包装生图链路 / VI 生图链路；未启用 Vertical Spatial Archetype；未新增 Anchor；未建知识库；未大范围重构。✔
- 本阶段唯一变更：新增 `evaluation/reports/jiuzhou-anchor-forensics-v1.2/` 证据目录（独立提交，可独立 revert）。✔
- 「Anchor 未进入模型时必须中止」：当前实现**违反**该原则（静默降级），记录为修复候选 F1，待第二阶段后定路线。✔

## 8. 第二阶段前置条件（需用户确认）

- 四次对照（A=Golden Anchor Only / B=Source Space Only / C1=Source First+Anchor Second / C2=Anchor First+Source Second）需**真实 Provider 调用授权**；按 AGENTS.md 需用户逐次授权。
- 模型统一为当前生效模型 `doubao-seedream-5-0-pro-260628`（volcengine），画幅统一 16:9（与失败 run 一致）。
- **Seed 不支持**：DashScope 与 volcengine 两条 Provider 代码均未传 seed（`buildSubmitBody` 仅 size/n/watermark），四次测试将以"同 Prompt、同参考图、逐次执行"代替同 Seed，报告中如实标注。
- 执行 A/B/C 前需先让 Anchor 能进入请求（否则四组全部退化为同一组）；最小手段是脚本直调 runtime 编译 + provider 提交，不触碰生产链路。

---

**End of Forensics Report v1.2 (Phase 1)**
