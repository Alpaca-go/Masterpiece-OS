---
name: design-factory-pack
description: 盘点品牌项目素材并生成 Brand Lock、视觉优化报告、缺图分析、图片规划和 Chat 生图任务包。
---

# Design Factory Pack

在仓库根目录运行：

```bash
npm run analyze -- --project "项目名称"
```

项目应位于 `projects/<项目名称>/`。命令会先安全创建 `input/` 与 `outputs/`，把项目根目录中的素材整理进 `input/`；存在同名冲突时必须停止，禁止覆盖。只有一个项目时可以省略 `--project`。如用户明确要求实时对标案例，添加 `--online`。生成后必须先检查 `01-Brand-Lock.md` 的待确认项，再检查 `Knowledge-Analysis.md`，最后交付 `Chat生图任务包.md`。不得把启发式识别结果描述为最终品牌规范，也不得由流水线修改 `knowledge/approved/`。
