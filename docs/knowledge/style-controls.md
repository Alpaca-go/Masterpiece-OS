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
- **UI**：已接入生图页的“风格约束（可选）”折叠面板（9 个下拉，默认跟随分析；价格默认“不出现数字”）。

## 6. 首轮对照（潮牛帮，2026-10-28）

- **对照**：只带默认价格策略（`priceDisplay: none`）。
- **实验**：`warm_dim + dense + mixed + accent + balanced + lived_in`，价格策略相同。
- **结果**：
  - 实验组明显更暖、更密、道具更多（食材盘、叠碗、部位图、多块菜单板）；
  - **两版都没有出现数字价格**，价格策略 A 在本轮生效；
  - 实验组出现“文字板过密”的副作用（大量中文菜单/故事板，虽无数字），需要后续加“文字密度”控制；
  - 两版自动校验均 `passed`。
- **结论**：7 个轴可用，价格策略可用；下一轮需要单独验证“文字密度”和“tag 与分析的冲突”。

2026-10-28 增补：新增 `textDensity`（少/中/多），并接入生图页面板；待用同一项目验证“文字密度少”是否能压住菜单墙。

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
