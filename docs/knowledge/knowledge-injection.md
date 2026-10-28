# 知识注入规范（advisory precedents）

状态：**实验性**。用于把已验收项目的经验，以“建议”而不是“硬要求”的方式注入一次生图任务。

## 1. 为什么要有这个字段

之前是把经验手写进 `currentInstruction`，问题有三：

- 和用户指令混在一起，无法区分“项目要求”和“历史经验”；
- 无法统计哪些任务用了哪些经验；
- 模型容易把经验当成硬性风格，甚至发明品牌道具。

现在用独立的 `knowledgeContext` 字段。编译器会把它渲染成独立的 `Experience Reference (advisory)` 区块，并附带 guardrail。

## 2. 字段形状

```json
{
  "knowledgeContext": [
    {
      "id": "warm-low-light",
      "source": "冯烫烫 / 2026-10-28 验收",
      "text": "社区烟火气小馆：暖黄偏暗、保留暗部，通常优于明亮均匀的商场照明；前提是晚餐时段且需要可读性。"
    }
  ]
}
```

约束（已由 task contract 强制）：

- 最多 **7** 条；
- 每条正文最多 **1200** 字符；
- `source` 必填（默认 `case-library`），用于追溯；
- 空文本会被丢弃；
- `id` 使用 **kebab-case 语义 slug**（`warm-low-light`、`hood-in-structure`），禁止任何“字母 + 数字”的编号（例如 H 后直接跟数字）；`verify:history-naming` 会检查 `docs/knowledge/` 下的正文。

## 3. 怎么写一条经验

一条经验必须是“问题 → 动作 → 条件 → 禁止”，不是元素清单：

```
[问题] 社区小馆容易做成商场快餐。
[动作] 暖黄偏暗 + 砖木铜 + 明档前置 + 密度优先。
[条件] 街面可见、层高允许木构、排烟允许开放明档。
[禁止] 不做整店白墙、不做独立红黑金属烟罩、不压暗成酒吧。
```

反例（不要这样写）：

```
红砖、旧木、铜锅、暖光。
```

这是元素清单，模型会照抄，换一个品类就会出错。

## 4. Guardrail（编译器强制）

`knowledge_context` 区块会固定附带三条：

1. 这些是判断参考，不是硬性要求；
2. 不要复制它们的具体材料、符号、道具、吉祥物或品牌故事；
3. 不要发明本项目素材里没有的道具、角色、招牌文字或品牌资产。

这三条来自蛙耶反例测试：注入“生活感”后，模型自行加了一辆摩托车和一个头盔蛙。

## 5. 品牌取舍标准

“注入后更好还是更差”不能只看暖不暖、挤不挤，要先声明项目要什么：

| 项目类型 | 优先 | 可牺牲 | 判定信号 |
|---|---|---|---|
| 商场 IP 旗舰店 | 明亮、干净、品牌色识别、旗舰感 | 烟火气、密度 | 品牌色面积、入口 IP 焦点、整体亮度 |
| 社区烟火气小馆 | 暖、密、生活痕迹、明档可见 | 旗舰感、极简 | 人群密度、暖光、桌面细节、烟罩是否收敛 |
| 传统地域品类 | 文化符号的结构化转译、现代材料平衡 | 过度民俗 | 符号是否成为结构而非贴图；是否像“民俗表演” |
| 日常咖啡/烘焙 | 安静、自然材料、可久坐、克制 | 强识别 | 座位舒适、光比、材料真实度、是否网红装置 |

测试前先选一行，否则只能记录“变了”，不能记录“更好/更差”。

## 6. 测试协议

1. 同一个项目、同一份分析、同一组参数（family/subtype/shot/ratio/logo 模式/avoid）；
2. 对照组不带 `knowledgeContext`，实验组带；
3. 各出 1 张，记录 task/run、prompt 差异、自动校验、人工判断；
4. 单对单图只能算“1 次观察”，不能升级规则；
5. 至少 2–3 个项目、包含一个反例，才讨论是否升级。

## 7. 当前状态（2026-10-28）

| 假设 | 正对照 | 反例 | 状态 |
|---|---|---|---|
| warm-low-light 暖黄偏暗优于明亮均匀（社区烟火气） | 潮牛帮：支持 | 蛙耶干净对照：未变差，旗舰感略稀释 | 2 次支持/不损害，仍保持假设 |
| hood-in-structure 排烟罩收进结构 | 潮牛帮：支持 | 蛙耶：也收进了木构 | 2 次支持，仍保持假设 |
| lived-in-detail 生活细节提升烟火气 | 潮牛帮：细节明显增加 | 潮牛帮第三组：菜单/备餐/部位图增加，但编造价格、重心偏后厨 | 3 次观察，成立但有“编造价格/重心偏移”边界 |

**Guardrail 观察**：第一次反例把经验写进 `currentInstruction` 时，模型发明了摩托车；改用独立 `knowledgeContext` + guardrail 后，同一项目的干净对照没有再出现品牌道具。样本只有一对，不能证明因果，但值得继续观察。

## 8. 案例提取器

验收之后用 `scripts/extract-case.mjs` 生成草稿卡，减少手工录入：

```bash
# 已验收项目：自动填分析 + 验收证据
node scripts/extract-case.mjs \
  --project <projectId> \
  --acceptance docs/evidence/visual-workflow/<record>.md \
  --out .codex-smoke/case-drafts/<slug>-draft.md \
  --json .codex-smoke/case-drafts/<slug>-draft.json

# 未验收项目：只标注“最近一次成功运行”，不会冒充验收
node scripts/extract-case.mjs --project <projectId> --out <draft.md>
```

自动填充：

- 项目事实、创意决策、空间提案、材料/色彩/灯光、诊断；
- 最近一次成功运行的 task/run/model/图片 hash/校验状态；
- 证据路径。

必须人工填写：

- 第 4 节“人工覆盖”（材料、灯光、色彩面积、结构/烟罩、密度、品牌文字、构图）：最终接受什么、为什么改、证据；
- 第 5 节“规则使用”：这次注入了哪些 slug、是否适用。

定位：把单项目录入从约 60 分钟压到 15–30 分钟；**提取器不写“为什么”**。

## 9. 与代码的关系

显式风格约束（光照/密度/材质/品牌色面积/传统度/道具/镜头/价格）见 [style-controls.md](style-controls.md)。

- 字段：`packages/visual-workflow/src/generation-runtime/generation/task-contract.js`
- 渲染：`packages/visual-workflow/src/generation-runtime/space/compiler.js`（`knowledge_context` block）
- 测试：`packages/visual-workflow/tests/knowledge-context.test.ts`
- 校验器不读取 `knowledgeContext`；它只判断图，不判断经验。
  