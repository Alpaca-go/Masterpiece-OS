---
name: masterpiece-os
description: 逐张核验品牌视觉素材，通过 Brand DNA Decision 与信息压缩生成专业 Creative Brief。
---

# Masterpiece-OS v3.3

## 必须先做

1. 实际查看全部视觉图片，不用文件名、OCR、尺寸或元数据替代画面判断。
2. 联网核验至少三个真正同类型、同定位的案例。
3. 完成 Original Intent → Industry Benchmark → Creative Decision → Approved Brand DNA。
4. 用户现有视觉只能作为证据或候选，不能直接成为批准结论。
5. 无法确定的内容保持待确认。

## 运行

```bash
npm run analyze -- --project "项目名称" --mode standard
```

- Quick：只生成 `02-Creative-Brief.md`。
- Standard / Studio：生成 `01-Analysis.md`、`02-Creative-Brief.md`、`03-Design-Decisions.md`、`04-Design-Review.md`。

## Brief 边界

Brief 只有 Creative Vision、Brand Personality、Approved Brand DNA、Creative Principles、Must Keep、Can Explore、Photography Direction 与 Design Goal。不得混入对标、证据、Reasoning 或推导过程。

Compiler 不进行新推理。完整风险进入 Analysis，Brief 只保留 Avoid Rules。GPT 专用压缩结果仅存在于运行时，不创建第五个正式文件。

需要性能数据时使用 `--profile`；数据写入 `outputs/debug/performance.json`，不进入正式报告。
