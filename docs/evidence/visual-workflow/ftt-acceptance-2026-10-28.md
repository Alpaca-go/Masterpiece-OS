# 冯烫烫 · 首版视觉方向验收记录

日期：2026-10-28（Asia/Shanghai）
验收人：用户（Kyries）
验收原话：**“V8通过”**

## 验收对象

| 字段 | 值 |
|---|---|
| 项目 | 冯烫烫（`3b5b03c0-915a-41aa-9c54-4ffaa166ab88`） |
| 任务 | `vnext-task-4b27a3cd-8984-4d49-a63f-cdc87e9e12cc` |
| 运行 | `a146d50c-1e5c-4709-9d52-c261d2db536d` |
| 图片 | `images/output.png`，2816×1584，8,276,021 bytes |
| SHA-256 | `321785e0718e0a9bd39739fe5d0968a8a52ff72a9f540e4b0a23415ef82e88ba` |
| 本地副本 | `.codex-smoke/ftt-dining-in-image-20261028.png` |
| 运行目录 | `%APPDATA%\masterpiece-os-desktop\visual-workflow\runs\a146d50c-1e5c-4709-9d52-c261d2db536d\` |

## 生成条件

| 字段 | 值 |
|---|---|
| Provider | volcengine |
| 模型 | `doubao-seedream-5-0-pro-260628` |
| 类型 / 镜头 | space / dining / `three_quarter_wide`（用户显式） |
| 比例 / 数量 | 16:9 / 1 张 |
| 参考图 | 0 张 |
| Logo 模式 | `in_image`（图内直接渲染品牌文字，2026-10-28 新增模式） |
| 实现摘要 | `21120d80cb564cf8c0cfa585b4c3696ffe6a2153d6271f3044b8bc2f477a566a` |

## 自动校验

`status: passed`；`logoTextStatus: correct`；`brandMatch: matched`；`sceneCompleteness: complete`；无缺失项、无禁止项、无质量项。

## 验收范围（重要）

**通过的是：**

- 空间方向：暖黄偏暗的社区小馆氛围、红砖与旧木、赤陶地砖、铜锅蒸笼蒸汽、开放明档、密集用餐。
- 品牌呈现：门头“冯烫烫”木牌与“冯”圆标正确、可读，图内直接出字。
- 构图：室内就餐区朝明档的 `three_quarter_wide`。

**没有通过 / 不在范围内：**

- 菜单板上的价格与菜品名是模型编的示意内容，**不是客户事实**；正式交付前必须替换为真实菜单，或改成空白/示意。
- 这不是施工图或材料样板，不构成尺寸、做法、材料参数的确认。
- 本次只验收 1 个角度；门头、外摆、其他镜头未验收。
- 图片为单次生成结果，不保证同 Prompt 复现完全一致。

## 后续

1. 以本记录为基线，后续同方向改动必须对照本图；不得用改 Prompt/Golden 的方式掩盖漂移。
2. 下一张图优先做门头/外摆角度，或把菜单板改成真实菜单后再出。
3. 本记录写入案例库的冯烫烫卡；案例卡升级为“已验收”状态，但跨项目复用仍需第二个项目验证。
