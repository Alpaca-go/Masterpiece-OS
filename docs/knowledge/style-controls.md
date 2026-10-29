# Style Controls（自选约束）

状态：**已实现编译字段，待真实对照验收。** 用户 2026-10-28 确认 7 个轴与价格策略 A。

## 1. 它是什么

`styleControls` 是任务级的**显式约束**，由用户在生图前选择；不是风格预设，也不是案例名。

- 每个轴默认 `designer_choice`（让设计师/分析决定）；
- 选择后写入 task contract，随任务一起归档，便于统计“哪种组合被验收”；
- 编译时渲染成 `Style Controls (explicit)` 区块，并在 negatives 里追加对应硬约束；
- **冲突规则：用户 tag > 分析提案 > 可选示例。**

## 2. 轴与取值

| 轴 | 取值 | 编译含义 |
|---|---|---|
| `lighting` | `bright` / `warm_dim` / `natural` / `designer_choice` | 明亮均匀 / 暖黄偏暗保留暗部 / 自然光为主 |
| `density` | `sparse` / `balanced` / `dense` / `designer_choice` | 疏 / 中 / 密且动线可读 |
| `materials` | `brick_wood` / `metal` / `stone` / `plaster` / `mixed` / `designer_choice` | 砖木铜 / 金属玻璃亚克力 / 石材 / 涂料 / 混合但一个主family |
| `brandColorArea` | `accent` / `half` / `dominant` / `designer_choice` | 品牌色点缀 / 约一半 / 主导 |
| `tradition` | `modern` / `balanced` / `traditional` / `designer_choice` | 现代 / 现代+克制传统 / 传统作结构不作戏服 |
| `props` | `none` / `lived_in` / `designer_choice` | 无道具 / 仅用素材支持的道具（禁止发明品牌故事） |
| `shot` | `entrance` / `interior` / `detail` / `designer_choice` | 门头 / 室内 / 细节 |
| `textDensity` | `minimal` / `moderate` / `rich` / `designer_choice` | 每视角最多一块文字板 / 少量 / 允许菜单墙 |
| `priceDisplay` | `none`（默认）/ `real_menu` / `placeholder` | 不出现数字价格 / 只用真实菜单价格 / 留白或非数字 |

## 3. 价格策略 A（用户选择）

默认 `priceDisplay: "none"`：

- 编译区块写“不要出现数字、价格、货币符号或编造的菜单数字”；
- negatives 里追加同一条；
- 校验器的 forbidden 列表包含“任何可见价格/数字/货币”；
- 原因：`lived-in-detail` 对照证明，提示词里写“价格必须真实”无法阻止模型编价格（潮牛帮第三组）。

## 4. 字段示例

```json
{
  "styleControls": {
    "lighting": "warm_dim",
    "density": "dense",
    "materials": "mixed",
    "brandColorArea": "accent",
    "tradition": "balanced",
    "props": "lived_in",
    "shot": "designer_choice",
    "priceDisplay": "none"
  }
}
```

未知值不会让任务失败，会回落到 `designer_choice`（`priceDisplay` 回落到 `none`）。

## 5. 与其它机制的关系

- **分析提案**：tag 为空时完全跟随分析；有 tag 时覆盖冲突项。
- **knowledgeContext**：经验是“建议”，tag 是“决定”；两者冲突时以 tag 为准。
- **校验器**：价格策略会改变 forbidden 判定；其它 tag 只影响 Prompt，不新增自动校验。
- **气质预设（只读）**：`visual-workflow:style-presets` 提供人工策展的气质锚点（8 轴取值 + 反漂移清单），`visual-workflow:style-preflight` 扫描编译后的 Prompt 给出只读告警。选中预设只填轴、不注入文字；见 [style-framework](style-framework/README.md)。
- **UI**：已接入生图页的“风格约束（可选）”折叠面板（8 个下拉，默认跟随分析；价格默认“不出现数字”）。2026-10-29 隐藏面板内与取景重叠的 `shot`，统一由表单“镜头 / 构图”选择；任务契约仍支持显式 `styleControls.shot`，UI 保持其默认 `designer_choice`。

## 6. 首轮对照（潮牛帮，2026-10-28）

- **对照**：只带默认价格策略（`priceDisplay: none`）。
- **实验**：`warm_dim + dense + mixed + accent + balanced + lived_in`，价格策略相同。
- **结果**：
  - 实验组明显更暖、更密、道具更多（食材盘、叠碗、部位图、多块菜单板）；
  - **两版都没有出现数字价格**，价格策略 A 在本轮生效；
  - 实验组出现“文字板过密”的副作用（大量中文菜单/故事板，虽无数字），需要后续加“文字密度”控制；
  - 两版自动校验均 `passed`。
- **结论**：7 个轴可用，价格策略可用；下一轮需要单独验证“文字密度”和“tag 与分析的冲突”。

2026-10-28 增补：新增 `textDensity`（少/中/多），并接入生图页面板。

**textDensity minimal 实测（潮牛帮）**：菜单墙消失、没有数字价格，只保留主招牌、两块侧招、一块室内横幅和取餐口；但画面同时变得干净、偏疏，`dense`/`lived_in` 的效果被削弱。结论：文字密度与密度/生活感会互相拉扯；已在编译映射中补充“密度通过人物、物件和灯光实现，不靠文字板”。下一轮需要把 `dense + minimal` 作为专门组合验证。

## 7. 测试协议

1. 同一项目、同一分析；对照组不传 tags，实验组传 tags；
2. 两版都保留 `priceDisplay: none`，先验证“数字价格不再出现”；
3. 各出 1 张，记录 task/run、校验、人工判断；
4. 单对单图只算观察，不升级规则。

## 8. 代码位置

- 字段与默认值：`packages/visual-workflow/src/generation-runtime/generation/task-contract.js`
- 渲染：`packages/visual-workflow/src/generation-runtime/space/compiler.js`（`style_controls` block + negatives）
- 校验提示：`packages/visual-workflow/src/runtime/image-generation/deliverable-validator-service.js`
- 测试：`packages/visual-workflow/tests/style-controls.test.ts`

## 9. dense + minimal 组合对照（2026-10-29，单对单图观察）

项目：潮牛帮 `b2bc6cf8-fad4-4770-a49b-b6fbee59745b`。用户确认本轮两张预算后，各生成 1 张，共 2 次真实生图请求，重试 0 次。**本节是单对单图观察，不升级规则，也不代表用户质量验收。**

两组均显式传入以下 `styleControls`，实验组只把 `textDensity` 从 `moderate` 改为 `minimal`：

```json
{
  "lighting": "warm_dim", "density": "dense", "materials": "mixed",
  "brandColorArea": "accent", "tradition": "balanced", "props": "lived_in",
  "shot": "designer_choice", "textDensity": "moderate", "priceDisplay": "none"
}
```

其它任务字段经离线比对完全一致（生成的 taskId / createdAt 除外）：`space / dining / three_quarter_wide / 16:9 / count 1 / in_image`，`generationBasis: standard`，`shotSource: user_explicit`，`mustInclude: []`、`referenceAssetIds: []`，不传 `knowledgeContext`。沿用此前任务 `vnext-task-868bff90-b0d1-4d1c-b826-d8dc01bb1a50` 的指令与避免项：

```text
currentInstruction:
临街社区店，潮汕牛杂；中央明档用大鼎炖煮，锅具与蒸汽可见。
入口做钢结构门廊，厝角头-牛角符号作为结构元素，不做表面贴图。
阳橘只做局部（字标底板、菜单、导视），碳黑做文字与收边；微水泥墙面地面、木色铝框、不锈钢台面。
品牌文字可以入画，但要清晰正确。

mustAvoid: 民俗表演 / 红灯笼 / 脸谱 / 假古董 / 白墙冷光 / 杂乱堆砌
```

| 组别 | taskId | runId | 编译 preflight | 图片 validation | 图片路径 |
|---|---|---|---|---|---|
| dense + moderate | `vnext-task-405e5a9d-4fc7-4008-90ae-78cfff735964` | `27192ac1-e3e9-4f5a-a06d-7401e28407f8` | `pass` | `passed` | `C:/Users/kyrie/AppData/Roaming/masterpiece-os-desktop/visual-workflow/runs/27192ac1-e3e9-4f5a-a06d-7401e28407f8/images/output.png` |
| dense + minimal | `vnext-task-5b47b09b-12b4-41e0-b529-9a05446baa79` | `4eeb2645-e4d1-467b-934a-5b9f9bbe4b5d` | `pass` | `passed` | `C:/Users/kyrie/AppData/Roaming/masterpiece-os-desktop/visual-workflow/runs/4eeb2645-e4d1-467b-934a-5b9f9bbe4b5d/images/output.png` |

- 生图：Volcengine / `doubao-seedream-5-0-pro-260628`；两图均为 2816×1584，原始 Logo 未另行合成（`in_image`）。
- 校验：Qwen / `qwen3.6-plus`；应用层调用为 2 次生图 + 2 次图像校验，没有重生图。两版 `brandMatch: matched`、`brandToneMatch: matched`、`sceneCompleteness: complete`、`logoTextStatus: correct`，blocking findings 均为空。
- 时长（含校验）：moderate 131.992 秒，minimal 129.300 秒，合计 261.292 秒。
- 图片 SHA-256：moderate `2dff8b9c1a99de29d357f2be97859a30b37edda29dcabf78dbb13552d86fe05b`；minimal `af2b1441d6e39588e597af37bb57a0090a970b7829e4c6fdb23591b4c602d766`。

`style_controls` 区块只有以下一行不同；暖光、密度、材质、色彩面积、传统度、道具与价格禁令相同，`shot: designer_choice` 不渲染取景覆盖：

```diff
- - textDensity: a few text panels, balanced with the space
+ - textDensity: at most one text panel per view; no menu walls or dense copy. Achieve density through people, objects and lighting, not text
```

实验组另由既有编译逻辑在 `negative_constraints` 追加 `no wall of text panels, menu walls or long copy`；其它区块相同。没有修改生产 Prompt、映射或 Golden。

### 图像观察与边界

文字板按独立物理载体计数，包含品牌字标、菜单与功能牌，纯图形牛角不计；一条连续四格菜单算 1 个载体，并注明格数。先采用这一口径，再单列去掉品牌识别后的数量，避免把品牌字标排除后误判达标。

| 检查项 | dense + moderate | dense + minimal |
|---|---|---|
| 文字板数量 | 明确可辨 8 处：左墙品牌/品类 2、立柱品牌 1、厨房背墙菜单/说明 2、明档顶招 1、点餐牌 1、右墙说明 1；另有远景小牌 1 处无法可靠判读 | 明确可辨 5 处：前柱品牌 1、厨房上方连续四格菜单 1、点餐牌 1、取餐牌 1、后墙品牌 1 |
| 排除品牌识别后 | 5 处明确菜单/说明/功能载体，另有远景小牌 | 3 处菜单/功能载体；仍超过 ≤2，未达到目标 |
| 数字价格 | 未见数字价格、阿拉伯数字或货币符号；自动校验未报价格违规 | 同左；菜单仍有菜名，但无数字价格 |
| 密度与可读性 | 有食材展示、蒸汽、锅具及后景用餐人群；入口与通道可读，前景偏空，就餐区偏后 | 明档锅具、备餐台下器皿、两名操作人员与后景顾客保留生活密度，通道可读；就餐区仍偏后，画面重心更偏操作现场 |
| 素材外道具核对 | 有一盆灰色落地盆栽 | 左侧有一盆深色落地盆栽 |

盆栽核对：本项目 28 张输入素材中，街景插画（asset `d57eca0b-f629-43b9-9a33-3e469afbf081`）确有窗口盆栽与街树；未找到两张生成图中同款落地花盆的造型与摆位。因此，**盆栽类别有素材依据，具体落地布景属于模型补充；无法确认严格满足“仅素材支持的道具”**。未见摩托车、头盔蛙等新的叙事道具或角色。本判断没有把“自动校验 passed”当成道具来源证明。

**观察结论：部分达到目标。** minimal 相比 moderate 减少了明确文字载体（8 → 5），两版均未见数字价格；人物、锅具与蒸汽仍提供一定生活密度，未完全退回空旷画面。但 minimal 仍有多个文字载体（即使去掉品牌识别也有 3 处），未达到“文字板 ≤2”，更未满足 Prompt 的“最多一块”；同时未证明就餐氛围优于偏后厨的构图，落地盆栽来源也有边界。故不能写成“dense + minimal 组合验收通过”或推广为规则。自动校验只覆盖既有交付闸门，不检查文字板数量、tag 命中率或逐道具来源。

本机证据：`.codex-smoke/dense-minimal-2026-10-29/` 内的 `plan.json`、`moderate-task.json`、`minimal-task.json`、两份 `*-prompt.txt`、`*-result.json` 与 `image-request-*.sent`；均不提交。生产任务与校验记录仍在独立工作流用户数据目录。分析上下文与 decision packet 的 SHA-256 在两次编译及生成前后相同，未重新分析。

本轮预算已用完，不继续生成。三条假设的状态仍按既有独立证据复核，见 [candidate-rules.md](restaurant-cases/candidate-rules.md)；这次两组共有暖光与道具控制，不能用来单独归因暖光、烟罩或生活细节假设。
