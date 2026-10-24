# 正式分析与 B1 的最小接口提案 · 未接线

本轮仅提供 `runRestaurantShadowPipeline(input, resources)` 的纯离线实现，不注册任何生产 operation、UI、存储或分析回调。正式启用须另行审阅，不将本提案视为实施授权。

1. 分析前：由受信的入口把原始项目资料和用户确认目标整理为有项目归属、document ID、字段路径、来源类型及证据引用的结构化绑定；从资料实际确认的事实与设计目标分开。调用 `buildRestaurantBoundary`，保存的是待审实验结果，不改变项目资料。无法验证的资料维持 unknown。生产接线前必须另行实现/审阅来源认证，当前 prototype 的 verification 仅为调用方声明。
2. 分析后：传入同项目 Packet、分析指纹和精确字段绑定，独立调用 Shadow 审核。受审文本只能通过精确别名或显式 reviewedMapping 归类；不得把本轮单条历史文字映射推广成开放 NLP 提取器。未绑定或未映射文案保留人工审查，不把 Packet 内部 confirmed 标记直接当原始事实权威。
3. B1 未来可消费 proposed envelope：projectId、analysisFingerprint、fields、fieldSources、candidateSuggestions、unknownFacts、status=proposed_offline。字段只读展示；保留 sourceType、sourcePath、evidenceRefs、scope、lifecycle、适用前提与不确定性。原有 B1 projection、人工方向记录及确认/指纹失效机制仍为正式权威，不能静默以 RKS 草案覆盖它们。
4. 显式选择：用户先审阅冲突和候选，再决定是否将某一条复制进设计方向草案；继续通过现有校验、保存、显式确认和 stale 检查。候选知识不能因为被展示、选中或合成 Prompt 保留而自动改为 validated。材质行为、物业、客群、镜头权限未明确时不补默认事实。
5. 编译：保持现有 subtype/shot、零参考图、模型及所有 Provider 边界。入口看到某一经营区域须有明确来源权限，不能由菜系、区位或 RKS 原型推导。沿用 RKS-01F 的逐字段 owner/scope 审计。生产接口如涉及受保护实现变更，需单独提交最小 diff 与审批，不自动更新摘要。

最小未来展示是一个只读“建议与证据”面板及用户主动复制操作；本轮未修改面板、路由或任何 B1 代码。冯烫烫真实 A/B、图 1 Run 补证、知识泛化验收均另行授权。
