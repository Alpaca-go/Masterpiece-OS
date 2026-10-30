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

## 追加：确定性覆盖之后的两次运行

方案定了"确定性覆盖"（见末节），随后又跑了两次，都是同一项目、同一批事实：

| 次序 | 结果 | 观察 |
|---|---|---|
| D | **失败** | 与 B 同一症状：`REPAIR_RESPONSE_INVALID`，自动修复两次仍不通过 |
| E | 成功 | 覆盖生效：`projectFactsApplied` 记录 7 个字段；模型自己写的「店铺面积约为 200 平米（基于 ProjectRecord）」被移除；「排烟管道及燃气管道的具体位置未知」被移除；`assumptions` 追加「面积、层高、尺寸、预算、时段与排烟条件以项目事实为准（用户提供）」 |

E 的 packet 检索：`120`、`3.6`、`开放明火`、`晚市`、`堂食为主` 均命中（来自 `projectFacts` 条目），说明事实已经作为**事实字段**进入报告上下文，而不是只停留在请求里。

E 的运行读数：`success`，模型调用 5 次（含修复），模型耗时 74,956 ms，报告 6,200 字符（在 8,000 预算内）。

**已知问题**：4 次带事实的分析里 2 次在"决策校验 + 自动修复"环节失败（B、D），两次都报 `REPAIR_RESPONSE_INVALID`；同一提示、同一事实下 C、E 成功。判断是修复环节的稳定性问题（模型返回结构偶发不合规），与覆盖逻辑无关，需要单独处理（重试策略或修复提示加固），不应靠"再跑一次"掩盖。

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

## 下一步（已选方案 1，见上节）

1. **确定性覆盖（推荐，不改冻结提示词）**：分析完成后，用事实覆盖 packet 中对应字段（面积/层高/排烟/时段/预算），标记 `provenance: user_provided`，并把与事实冲突的推断项改写成"以用户事实为准"。生成链路直接读事实，不依赖模型是否记得。
2. **改分析提示词**：在 `prompts/analysis/*.md` 加"项目事实与约束"一节并约束 schema。提示词是冻结且带摘要的，改动需你批准并重跑全部离线门禁 + 真实冒烟；影响面比方案 1 大。


## 追加：修复环节加固后的复测（同日）

针对 D/B 的 `REPAIR_RESPONSE_INVALID`，做了两处加固（不改验收标准）：

1. 修复响应在严格校验前先做**宽容归一化**：接受 `{path: entry}` 映射形式、外层 `result/repair` 包装、path 省略前缀、`evidenceRefs` 用数字字符串或夹带文本、以及值容器写错（该给数组给了字符串等）。
2. 最大修复次数 2 → 3。

复测两次（同一项目、同一事实集，仍是 `qwen3.6-plus`）：

| 次序 | 结果 | 修复环节 | 观察 |
|---|---|---|---|
| F | `success` | attempts=1，repairedFields=`functionalNetwork`（3 条证据），errors=[] | 覆盖移除 4 条与事实冲突的假设/待确认（面积、层高各 2 条） |
| G | `success` | attempts=1，errors=[] | 报告 7,698 字符，在预算内 |

**判断**：F 修复的字段正是 D 失败时报错的那个字段（`functionalNetwork`），且两次都在第一次修复就通过。样本只有两次，不能证明根治；但失败面从"4 次里 2 次"变成"加固后 2 次全过"，且失败原因（格式而非内容）已被归一化覆盖。**仍需在更多真实项目上观察**，不作为稳定性结论。

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
