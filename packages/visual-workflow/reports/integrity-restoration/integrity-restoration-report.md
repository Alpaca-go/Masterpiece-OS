# 独立艺术指导参考图路线：完整性恢复交付

日期：2026-10-18。分支：`fix/visual-workflow-image-quality-regression`。已审核源码基准：`592b6021f316213faf1343a6190e5fea90913869`。

## 结论与授权范围

工程门禁已恢复：24 项检查全部退出 0，真实 Provider 调用为 0。本轮未修改生产源码；仅按获批申请替换完整性清单中 18 个已有文件摘要、加入 3 个新增文件记录。其余摘要、提取记录、Prompt 冻结记录、Golden 和人工质量状态保持原状。工程通过不表示视觉质量验收；`qualityAcceptance` 仍为 `pending-separate-quality-repair`。

更新前逐项核对了申请、磁盘源码、已审核提交中的源码和旧清单：21 项全部一致。详见 [更新前核对](./pre-update-verification.json)、[更新审计](./integrity-update-audit.json)、[闭环证明](./closure-proof.json)。历史申请仍按原样保留。

| 标识 | SHA-256 |
| --- | --- |
| 更新前 implementation-integrity.json | `7767be380484d444155df0b12ed4d1fe0fb860d562fb68869c8b43d3a3456bde` |
| 更新后 implementation-integrity.json | `e0709d88b6f04bf7544c354fd50ace2a738ee9118c17fd3f260332fa3582f5cb` |
| implementationDigest | `a90b0cc873a7999525148c660c05b2f22c90e2399d7c0c73001eebabe84627b3` |

## 正式公共操作链路证据

离线捕获器通过 `createVisualWorkflow.operations` 执行保存测试配置、导入参考图、编译、生成与 Logo 后期合成。完整性检查正常启用；编译和生成的执行快照均记录上述 implementationDigest。仅 Provider 网络边界注入记录型传输；校验器使用正式 Qwen 请求构造器捕获实际请求。全局网络兜底拒绝未注入的真实调用，测试未读取真实凭据。

九州美学的确认记录与四图注册只写入隔离测试副本。原项目及参考包执行前后逐文件摘要一致，见 [只读证明](./readonly-proof.json)。测试副本保留原项目 ID 以验证项目绑定，但存储根目录独立。

四图按建筑形态、空间融合、珠光材料、展馆留白顺序进入实际 Seedream 请求的 `image[0..3]`。捕获器解码实际请求中的 base64，逐张比对原文件真实字节、SHA-256、MIME 和顺序；失败图与 Logo 均未进入正向参考。参考注册清单包含项目、授权、职责、类型与摘要；执行快照绑定确认记录及资产。

- [完整正式编译 Prompt](./formal-prompt.txt)，SHA-256：`63fdcaa3d6f5ec98106fe7d6029231bb5f6a66b74fc7b4256bf0718739438604`。
- [完整 Provider Prompt](./provider-prompt.txt)，SHA-256：`74e7f6ee4b738719fa3c83e53bece7753dfaf4878b9199d792c9b210b7eee438`。
- [参考资产清单](./registered-assets.json)、[实际请求字节核对](./request-evidence.json)、[执行摘要](./public-operation-stamps.json)。
- [生图请求审查副本](./public-image-request-review.json)、[校验请求审查副本](./public-validator-request-review.json)。审查副本省略大体积 base64，保留解码摘要及本机完整原请求路径；无请求头或真实密钥。
- [其他三行业标准请求](./standard-requests.json)：医美、餐饮、酒店均经公共操作成功，参考图数量均为 0，实际请求不存在 `image` 字段。

正式 Prompt 延续已审核指导：暖白建筑背景、轻薄半透明珠光结构、局部克制品牌紫、展馆留白与自然光；本轮未重写 Prompt 或恢复旧 Packet 的装饰性紫色与曲线方案。

## 实际门禁结果

耗时、退出码和日志目录见 [gate-results.json](./gate-results.json)。全部 PASS：

| 检查 | 结果 |
| --- | --- |
| 独立包测试（含公共编译、生成、Logo 入口） | 87/87 |
| 根测试 | 1701/1701 |
| CLI 测试 | 40/40 |
| Runtime Core / Runtime 应用层 | 14/14；1294/1294 |
| Node Host 测试 / typecheck | 15/15；PASS |
| repo:verify / repo:check / verify:current-flows | PASS |
| Web build / 实际 Host + 浏览器 Smoke | PASS；Smoke 真实调用 0、业务写入 0 |
| Golden / 空间 Golden / 隔离守卫反例 | 5/5；PASS；56/56 |
| 版本一致性及命名、包边界、废弃代码、生产边界、污染资产、项目特判、Golden 边界、分析守卫、diff 检查 | 全部 PASS |

实际执行的 24 项命令如下；交付文档整理后又执行一次 `npm run repo:verify`，退出码仍为 0。

```powershell
npx tsx --test packages/visual-workflow/tests/*.test.js packages/visual-workflow/tests/*.test.ts
npm run repo:verify
npm run repo:check
npm run verify:current-flows
npm test
npm run cli:test
npm run runtime:test
npm run web-runtime:test
npm run web-runtime:typecheck
npm run web:build
npm run web:smoke
npm run golden:test
npm run verify:space-golden-boundary
npm run repo:guard:test
npm run verify:version-consistency
npm run verify:version-naming
npm run verify:workspace-boundaries
npm run verify:no-obsolete-code
npm run verify:production-boundaries
npm run verify:tracked-runtime-assets
npm run verify:no-project-specific-production-rules
npm run verify:golden-boundary
npm run verify:analysis-guards
git diff --check
```

此前被摘要阻断的独立 Logo 操作及正式业务离线 E2E 已通过。没有为测试豁免完整性验证，也没有刷新 Golden。缺失、篡改、跨项目、错角色、重复引用、不支持能力等阻断行为由独立包测试继续覆盖。

## 实际差异和剩余风险

[实际代码差异](./authorized-change.diff)包括清单更新、将过渡期“未获批摘要必须阻断”的测试改为获批后的公共操作正向测试，以及新增可重放的离线公共操作请求捕获工具。完整性负向保护测试仍保留。无生产源码、共享生图适配器、创意策划、视觉迁移或 Web 业务变更；双向隔离检查和反例均通过。未新增带版本号或迭代编号的自有文件、函数或业务标识。

离线输出使用合成图片，只证明链路与请求，不证明真实模型效果。当前每次生成操作最多一次生图和一次校验，但没有项目级累计调用或费用硬上限，校验请求也没有显式输出 token 上限。详见 [单次真实生图最终预检](./controlled-generation-preflight.md)。本轮未真实生图、自动重生成、合并、发布或冻结视觉质量；完成后停止，等待用户审核与另行授权。
