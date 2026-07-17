# Brand DNA v3 Sprint 3 交付记录

## 修改范围

- `image-prompt-compiler` 一次编译整套 2～8 张英文 Prompt，默认关闭思考。
- Prompt 严格限制 180～350 英文词，校验 Anchor/后续 Previous Tasks、Logo、Text Policy 和任务 ID。
- `final-audit` 使用可独立注入的 Auditor Reasoner，只返回评分、问题 Path 和允许修复路径。
- 审计为 `needs-patch` 时只允许修复审计白名单内的已有叶子字段，随后重新校验 Decision、Visual System、Prompt，并由 Auditor 独立复审一次；禁止整对象重生成。
- 完整报告由本地 Compiler 生成，Prompt、Evidence 和审计位于附录。
- Desktop 新增 `v2-reliable` / `v3-deep-compact` 灰度开关；默认仍为 v2。

## 正常短文档调用

```text
Evidence Map                 1
Brand Creative Decision      1
Visual System & Task Plan    1
Image Prompt Compiler        1
Final Independent Audit      1
总计                         5
```

符合文档要求的 4～6 次调用目标。所有报告编译和质量硬规则均在本地执行。

若审计确实发现可局部修复的问题，异常路径额外增加 1 次受限 Patch 和 1 次独立复审，最多 7 次；硬失败和不可安全修复路径直接停止，不进行全量重写。

## 版本

- Prompt Compiler：`image-prompt-compiler-prompt-v3.1`
- Final Audit：`final-brand-dna-audit-prompt-v3.1`
- Audit Patch：`audit-issue-patch-v3.1`
- Full Report：`brand-dna-full-report-v3`

## Checkpoint 与回滚

v3 使用 `brand-dna-v3-checkpoints.json`，不读取或覆盖 v2 Checkpoint。设置中切回 v2 即完成回滚。核心报告完成后，任何视觉、Prompt 或审计失败仍进入 `completed-core`。

## 测试与限制

- 离线完整路径验证 5 次调用、四张 Prompt、独立 Audit、完整报告和最终 Checkpoint。
- 实际 Provider 未返回 Usage 时记录 `null`，不影响结果。
- 未执行真实 Qwen A/B；真实耗时、Token、费用和一次通过率必须在用户授权后记录。
- v3 在完成真实矩阵和连续成功率验收前不会设为默认。

## 合并建议

可以作为灰度功能合并，不建议成为默认 Brand DNA Pipeline。
