# 第二批实施前：第一批四项失败归因

基线提交 `435f6ba`，实施第二批前原样重跑：`node --import tsx --test packages/visual-workflow/tests/*.test.js packages/visual-workflow/tests/*.test.ts tests/runtime-application/visual-workflow-isolation.test.ts`。

结果 41/45 通过，四项失败；[完整原始日志](E:/image-quality-regression-evidence/design-decision-completion/before-tests.log)。未修改任何旧测试或预期。

| 测试 | 类别 | 实际证据与处理 |
|---|---|---|
| installation preservation retains identity and gradient guards | 历史行为断言冲突 | 断言要求 `color_demoted_to_accent`；第一批已批准取消无依据的统一降级。保留身份保护，另加颜色范围权威的正反例；不恢复旧规则 |
| completed analysis supplies migrated Logo roles without overriding a new intake selection | 完整性摘要拦截 | `VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: src/generation-runtime/space/compiler.js`；测试未能走到业务行为验证，不能据此声称 Logo 实现有缺陷 |
| owned standard compilation ignores global mode flags and preserves extracted prompt/payload bytes | 输出字节一致性冲突 | strictEqual 对比独立实现与共享提取原实现，第一批设计变化导致字节不同。保留旧失败，另测全局开关隔离和独立 payload 保真；不更新包外断言 |
| offline E2E: owned import, analysis, report and image request complete without shared settings or real providers | 完整性摘要拦截 | 同上，分析入口拒绝摘要漂移；不旁路、不使用替代摘要 |

这四项没有证实真实业务代码缺陷；这不等于代码无缺陷。针对用户提出的渐变语义审查，第一批虽然删除了点缀覆盖，但尚未把“模型提出的背景/比例”与“获得用户或素材证据授权的大面积执行要求”分开，存在真实的颜色权限缺口。第二批将保留原角色和光学信息，增加编译时权威判定及明确的未决范围，防止仅凭品牌主色、色名或未确认模型角色生成大面积硬要求。该补充不指定任何默认颜色、面积比例或材质。

第二批完成前后均保留四项失败对应证据；不刷新 Golden、完整性摘要、历史 Packet 或整体预期快照。后续任何新增失败将单独检查，不能直接归到上述四类以掩盖真实缺陷。
