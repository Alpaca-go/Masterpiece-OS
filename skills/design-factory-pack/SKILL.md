---
name: design-factory-pack
description: 逐张核验品牌视觉素材，以 Creative Reasoning 建立品牌视觉 DNA，并生成分层 Chat 生图任务包。
---

# Design Factory Pack v3.0

## 必须先做

1. 实际查看项目中的每张视觉图片。
2. 不得仅依据文件名、OCR、尺寸或元数据判断画面内容。
3. 把核验数量、画面发现和不能确认的信息写入 `design-factory.json`。
4. `visualInspection.verified` 只能在全部图片完成核验后设为 `true`。

## 默认执行

```bash
npm run analyze -- --project "项目名称"
```

Fast Mode 只检查：

- `01-项目分析报告.md`
- `02-Chat生图任务包.md`

项目分析必须包含品牌定位、关键词、气质、视觉 DNA、摄影语言、创意方向和 Design Risks。Chat 任务包必须先给出品牌设计意图，再给出默认继承该意图的图片任务。

## 可选评审

用户明确需要 Knowledge Review、Design Review 或成长分析时执行：

```bash
npm run analyze -- --project "项目名称" --mode review
```

此时检查全部四份编号报告。Knowledge、Rule、Prompt、Template 始终由人工审核，禁止自动修改；禁止自动执行 Git Commit/Push。
