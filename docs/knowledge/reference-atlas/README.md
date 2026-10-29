# Reference Atlas（风格参考图集）

状态：**模板已建，网页可拖拽录入。** 这里放“认可的方案”，不放“验收案例”。

## 它和 restaurant-cases 的区别

| | restaurant-cases | reference-atlas |
|---|---|---|
| 来源 | 自有项目，有分析与验收 | 认可的方案/参考图，可能没有分析过程 |
| 能回答 | 为什么这样做、前提、被否掉什么 | 长什么样、用了什么材料/光/密度 |
| 能否产出规则 | 可以（需多项目验证） | 不可以，只能产出风格描述 |
| 目录 | `docs/knowledge/restaurant-cases/` | `docs/knowledge/reference-atlas/` |

## 网页入口

视觉分析与生图页 → 顶部“参考图集”。

- 新建条目：slug、标题、风格作用域、品牌/品类、场地、喜欢的三点、否掉了什么、落地与修改；
- 拖拽图片到虚线区，或点“选择图片”；
- 图片与备注默认存在 `%APPDATA%\masterpiece-os-desktop\visual-workflow\reference-atlas\<slug>\`；
- 点“导出”生成 `notes.md` + `images/`，再复制到本目录 `<slug>/` 并提交。

默认不直接写仓库，避免拖一张图就把工作区弄脏；入库是显式动作。

## 目录结构

```
reference-atlas/
  README.md
  TEMPLATE.md
  <slug>/
    notes.md
    images/
      1.jpg
      2.jpg
```

`<slug>` 用 kebab-case，和风格相关而不是和项目名相关，例如：

- `warm-izakaya`
- `community-wok`
- `mall-ip-flagship`
- `minimal-coffee`

## 写作要求

1. **只写“看到什么”**：材料、光线、密度、色彩面积、符号、构图；
2. **不写“应该怎样”**：不要从参考图直接推规则；
3. **喜欢的三点要具体**：不要写“高级”，写“暖光只打在桌面和明档”“木色偏灰不偏黄”；
4. **否掉了什么**：哪怕一句“太像日料店”，也比没有强；
5. **落地与修改**：没落地就写“未落地”，不要假装验证过。

## 入库流程

1. 网页里建条目、拖图、填备注；
2. 点“导出”，得到 `notes.md` 与 `images/`；
3. 复制到 `docs/knowledge/reference-atlas/<slug>/`；
4. 检查 `notes.md` 里的图片名与 `images/` 一致；
5. 提交：`docs(knowledge): add <slug> reference atlas entry`。

## 不能做什么

- 不能把参考图集条目当作“已验收案例”；
- 不能从参考图集直接升级规则；
- 不能把客户未公开的方案图提交到仓库（除非你确认可以）。
