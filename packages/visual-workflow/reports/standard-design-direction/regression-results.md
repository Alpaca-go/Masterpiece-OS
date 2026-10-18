# 离线回归结果

2026-10-18。本轮真实模型调用 0；没有测试豁免、自动摘要刷新、Golden 更新或人工视觉验收变更。

最终全量检查的原始日志位于 `.codex-smoke/project-design-direction/completed-checks/`；机器结果见 [gate-results.json](./gate-results.json)。共 24 项命令全部退出 0，另有独立 `web:typecheck` 及专项网页验证通过。审批前 19 项通过、5 项摘要阻断的历史结果单独保留，不作为当前门禁结论。

| 检查 | 实际结果 |
| --- | --- |
| 独立包全部测试 | 98/98 通过，含原四图路线与新标准路线公共操作 |
| 新增项目方向测试 | 11/11 通过 |
| 根测试 `npm test` | 1701/1701 通过 |
| CLI | 40/40 通过 |
| Runtime Core | 14/14 通过 |
| Runtime 应用层 | 1294/1294 通过，含此前阻断的独立 Logo 与离线 E2E |
| repo:verify / repo:check | 通过 |
| verify:current-flows | 通过 |
| Node Host 测试 / typecheck | 15/15；通过 |
| 独立 Web typecheck / Vite build | 分别通过；原有大 chunk 提示仍在 |
| 实际 Node Host + 首页浏览器 Smoke | 通过；Provider 调用 0，业务写入 0 |
| 新增方向面板 + 标准生成专项网页测试 | 通过；真实 React + Node Host + 公共操作 + 正式请求构造器；模型网络为离线替身 |
| golden:test / 空间 Golden 边界 | 5/5；通过，未更新 |
| repo:guard:test（含双向隔离反例） | 56/56 通过 |
| 版本一致性、命名、workspace 边界、废弃代码、生产边界、污染物检查 | 通过 |
| 无项目特判、Golden 生产边界、分析守卫、diff 检查 | 通过 |

通过的专项测试包括：无图片注册保存与确认方向；实际 Provider 标准请求无 `image`；网页任务与独立正式空间编译结果一致；用户确认的完整空间、材料、配色及禁用要求覆盖旧提案；分析/素材变化阻断过期确认；重新分析请求（含失败）保留内容并提示重确认；重新打开、重建服务实例保留状态；编译后编辑与跨项目输入阻断；纯自然语言网页字段可保存和编译；其他医美、餐饮和酒店项目 Prompt 与原编译一致；原四图功能仍正常。

限定 9 项摘要及单行类型保护的一个补充摘要分别获批后才更新，并重新运行全部门禁。没有跳过公共完整性验证。此前单独 Vite build 通过的结果不代表 TypeScript 检查已通过；发现面板空值问题后已修复，并由独立 `web:typecheck`、`verify:current-flows`、`repo:verify` 和 `repo:check` 重新验证。

专项浏览器还验证了：页面明确显示草稿和确认状态；主动勾选确认后实际标准请求无 `image`，与已审查 Provider Prompt 完全一致；重启 Host 并刷新页面保留已确认记录；编辑、保存新草稿并重开页面仍为草稿，标准生成按钮被禁用。实际记录型生图与校验各一次，真实 Provider 调用 0，原项目逐文件摘要不变。截图保存在本机 `.codex-smoke/project-design-direction/web-acceptance/`，路径见[公共请求证据](./public-request-evidence.json)。
