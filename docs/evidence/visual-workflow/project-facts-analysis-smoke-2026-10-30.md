# 项目事实注入：真实 Provider 冒烟记录（2026-10-30）

状态：**已跑通传输，未跑通"被采纳"。** 结论先写：项目事实已进入分析请求，但模型仍按素材证据下判断，甚至与事实矛盾。因此这一层**不能算完成**，需要下一步（见末节）。

## 设置

- 项目：潮牛帮·大鼎牛杂 `b2bc6cf8-fad4-4770-a49b-b6fbee59745b`（未验收，可反复重跑）
- 事实：面积 120 ㎡、层高 3.6 m、街面/社区底商、堂食为主、晚市、预算中档、可开放明火明档
- Provider / 模型：`dashscope` / `qwen3.6-plus`（`fusion-enhanced` 分析）
- 未做任何生图；图像预算 0

## 三次尝试

| 次序 | 注入位置 | 结果 | 观察 |
|---|---|---|---|
| A | 追加到 `userTask` 文本 | 完成，成功 | packet 仍写"层高满足常规餐饮要求（约 3.5–4 米）"，排烟列入"待确认" |
| B | 移到 `brandFacts.factualConstraints`（措辞较硬） | **失败**：`REPAIR_RESPONSE_INVALID` ×2 | 两个字段缺失（`signatureSpatialMechanism`、`functionalNetwork`），修复模型返回不合规结构 |
| C | 同 B，措辞放宽（"已经确认，不需要再写成待确认项…不要编造"） | 完成，成功 | 事实仍未采用，且出现与事实相反的推断 |

C 的关键读数（`project-context/visual-decision-packet.json`）：

- `assumptions`：`有基本的水电与排烟条件`（仍是通用假设）
- `unresolvedQuestions`：`具体空间尺寸与柱网结构`、`预算限制细节`（我们已提供面积与预算档）
- `designProposal.basis`：`200㎡小店型的空间限制`（来自素材证据，**与事实的 120 ㎡ 矛盾**）
- 全 packet 检索：`120`、`3.6 m`、`明火`、`晚市` 均 0 命中

## 本轮运行读数（C）

| 字段 | 值 |
|---|---|
| 状态 | `success` |
| 模型调用 | 3 次（含 1 次修复） |
| 模型耗时 | 115,497 ms |
| 报告 | `outputs/潮牛帮·大鼎牛杂-视觉方案升级报告-qwen3.6-plus.md` 8,506 字符（超出 8,000 预算，属既有现象） |
| 验证器 | 未调用（本轮不生成图片） |

## 已确认可用 / 不可用

**可用**

- 事实能存进项目、能校验（非法取值报错）、能在变更时让旧分析失效。
- 事实能进入分析请求：`brandFacts.factualConstraints` 里可见 7 条（行业 1 条 + 事实 5 行 + 处理要求 1 条）。
- 不填事实的项目：请求体不变（离线测试锁定：`userTask` 不含事实区块）。

**不可用（关键）**

- 模型**不接受**这些事实为权威：仍把面积/层高/排烟当成待推断项，且可能给出与事实冲突的数字（200 ㎡）。
- 一旦把事实发给模型却不生效，报告与 packet 会同时存在"事实"和"矛盾推断"，比不注入更糟。

## 下一步（二选一，需决策）

1. **确定性覆盖（推荐，不改冻结提示词）**：分析完成后，用事实覆盖 packet 中对应字段（面积/层高/排烟/时段/预算），标记 `provenance: user_provided`，并把与事实冲突的推断项改写成"以用户事实为准"。生成链路直接读事实，不依赖模型是否记得。
2. **改分析提示词**：在 `prompts/analysis/*.md` 加"项目事实与约束"一节并约束 schema。提示词是冻结且带摘要的，改动需你批准并重跑全部离线门禁 + 真实冒烟；影响面比方案 1 大。

## 复现命令

```bash
# 事实写入（RPC）
curl -X POST http://127.0.0.1:4317/_masterpiece/rpc/visual-workflow%3Aupdate-project \
  -H "content-type: application/json" -H "Origin: http://127.0.0.1:5173" \
  --data '{"args":["b2bc6cf8-fad4-4770-a49b-b6fbee59745b",{"projectName":"潮牛帮·大鼎牛杂","industry":"餐饮服务 · 潮汕牛杂","facts":{"floorArea":120,"ceilingHeight":3.6,"locationType":"street","dineInShare":"mostly_dine_in","servicePeriod":"dinner","budgetBand":"mid","kitchenExhaust":"open_flame"},"expectedUpdatedAt":"<上一条记录的时间>"}]}'

# 真实分析
curl -X POST http://127.0.0.1:4317/_masterpiece/rpc/visual-workflow%3Aanalyze \
  -H "content-type: application/json" -H "Origin: http://127.0.0.1:5173" \
  --data '{"args":["b2bc6cf8-fad4-4770-a49b-b6fbee59745b",true]}'
```

证据文件：`%APPDATA%\masterpiece-os-desktop\visual-workflow\data\projects\b2bc6cf8-...\runtime\run-report.json`、`project-context\visual-decision-packet.json`、`project-context\analysis-repair-audit.json`。
