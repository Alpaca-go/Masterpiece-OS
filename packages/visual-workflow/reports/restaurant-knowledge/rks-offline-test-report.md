# RKS 离线验证

日期：2026-10-24。只使用仓库合成数据和现有测试替身，无网络、凭据或本机项目依赖。

| 检查 | 结果 |
| --- | --- |
| RKS 专项：`node --import tsx --test packages/visual-workflow/tests/restaurant-knowledge/*.test.js packages/visual-workflow/tests/restaurant-knowledge/*.test.ts` | 14/14 PASS（含诊断实验测试，不表示编译字段保留验收通过） |
| 工作流全回归：`node --import tsx --test packages/visual-workflow/tests/*.test.js packages/visual-workflow/tests/*.test.ts packages/visual-workflow/tests/methodology/*.test.mjs packages/visual-workflow/tests/restaurant-knowledge/*.test.js packages/visual-workflow/tests/restaurant-knowledge/*.test.ts` | 149/149 PASS |
| `npm run repo:verify` | PASS，含 current-flows、Host/Web typecheck、双向隔离和 56 项守卫反例测试 |
| `npm run golden:test` | PASS；只检查既有验收状态，Provider calls 0，Golden auto-updated NO |
| `git diff --check` | PASS |
| 合成 Prompt 中三项 mustBeVisible 传递 | **未通过：blocked_field_loss** |

六个独立反例覆盖社区四川特色小馆、商场川味快餐、现代临街外带店、社区复古咖啡馆、
写字楼复古中餐厅、资料不足品牌。没有品牌名特判。覆盖顺序不敏感、同义词、未知词、
多原型冲突、用户目标/提案双向来源、物业目标误写事实、跨项目经验泄漏、假确认拒绝、
输入不变性、知识卡不自动晋升、对照条件相等和纯函数无网络依赖。

编译实验只调用现有 `compileShortChainGeneration`，使用内存合成 Packet 副本；
没有调用确认存储、生成 start 或传输 Adapter。任务固定 standard、lobby、entrance_view、
16:9、同一 Seedream 模型与零参考图。除 Prompt 及其字符数统计外 payload 所有字段相等。
全局 fetch 替身一旦调用就失败；调用计数为零。未调用任何真实校验或重试。

最初按全部字段保留断言时实验失败：chef preparing food、steam above dishes、
customers dining at tables 未出现在正式 Prompt。最终测试负责记录这个诊断结果，
`semanticStatus` 仍明确为 blocked_field_loss；没有改 Compiler、Golden 或期待文本
伪造语义成功。该实验不是本次图 1 的重放，也不是新图质量验收。

首次 repo:verify 对新测试的 `fixtures` 标识触发了宽范围读取词法守卫。已将新增合成
案例文件命名为 cases.json 并调整新测试标识；未改守卫、放宽生产依赖或引入历史 Golden
读取。再次完整门禁通过。

修改范围是未注册的离线原型，生产行为未改变；运行受影响模块完整回归与既有 Golden，
不发布，未运行真实 Provider 发布 smoke。日志在 Git 忽略的 `.codex-smoke/rks-offline/`
中，仅提交本报告和脱敏证据。保护文件比对见 `protected-source-check.json`。
