# RKS-02E1A · 独立分析准备与调用边界检查

日期：2026-10-25（Asia/Shanghai）。结论：**隔离项目准备完成；真实分析仍禁止启动。现有正式接口不能保证全部阶段合计最多 2 次 Provider 派发、零自动重试及未知状态立即停止。** 本轮仅提交受控方案，未实现或启用新的发送闸门。

| 项目 | 实际结果 |
| --- | --- |
| 工作分支 | `codex/rks-ftt-confirmed-input-freeze`，未切分支、未合并、未发布 |
| 隔离项目 ID | `d9ccf5c1-10f3-4c43-b0a7-cd64b62f4627` |
| 项目名称 | 冯烫烫 |
| 所属行业 | 餐饮服务 / 四川特色小吃 / 跷脚牛肉 |
| 独立工作流根 | 仓库下 `.codex-smoke/rks-02e1a/workflow` |
| 独立数据根 | `.codex-smoke/rks-02e1a/workflow/data` |
| 创建方式 | 正式 `visual-workflow:create-project` 一次，随后正式 `visual-workflow:import-files` 一次 |
| 状态转换 | API 自然产生 `draft / missing → ready / missing` |
| 分析素材 | 10 张原图，全部 `usage=analysis_source`；来源记录、原始文件、导入副本 SHA256 三方相等 |
| 方向确认 | `missing`；未调用 saveDraft / confirm / capture |
| 分析成果 | 无新 Run、Packet、报告、completed 状态或可执行冻结 |
| 费用授权 | 无；历史单张 Seedream 授权不覆盖分析 |
| 实际模型调用 | 真实分析 0、生图 0、模型校验 0、自动重试 0 |

原用户项目 `3b5b03c0-915a-41aa-9c54-4ffaa166ab88` 保持只读。创建前再次核对 project.json 摘要与 E1R 记录相等；其目录全部普通文件在准备前后逐文件哈希一致。未复制历史报告、Packet、确认记录或凭据到新项目。实验数据与图像保存在 gitignore 的本地目录中，不纳入版本控制。

新项目并未解除 completed / ready 资格门禁；它解除的是“没有合法独立待分析项目”的准备阻塞。只有今后单独授权的真实分析通过原有全部校验、正式写入上下文后，才可能取得分析资格。

交付索引：

- [项目准备记录](preparation-record.json)、[10 张素材 SHA256 和来源映射](material-sha256.json)、[原项目逐文件不变性证据](source-readonly-proof.json)。
- [固定模型与北京地域、费用和 Token 估算](model-and-cost-review.md)、[配置元数据](model-region-review.json)、[纯离线输入测量](offline-input-sizing.json)。
- [完整请求路径审计及最小受控方案](request-boundary-review.md)。
- [真实分析前授权清单、成功后的确认与冻结流程](authorization-and-freeze.md)。
- [最终验证记录](validation.json)、[仓库验证日志](repo-verification.txt)。

仅新增本报告目录和两个显式执行的离线审计工具：`tests/restaurant-knowledge/ftt-analysis-prepare-offline.mjs`、`ftt-analysis-inspect-offline.mjs`。工具不属于生产入口，也不自动运行；准备工具拒绝覆盖已有实验根。首轮仓库检查指出工具不能放在报告目录调用独立业务模块，现已移至该模块现有测试工具目录，未修改隔离守卫或豁免规则；首轮失败日志保留。

本轮未修改生产实现、Prompt、Compiler、P7B、B1、RKS Shadow、Golden 或完整性摘要。RKS 仍为 Shadow 原型；没有正式分类能力启用或新图质量结论。10 张原图只用于分析，未来 Seedream 继续 **零参考图**。

准备执行进程的网络闸门未触发，模型派发为零。另行只读取了阿里云公开文档核查地域和计费；这些公开网页读取不属于模型请求，也没有上传项目素材。
