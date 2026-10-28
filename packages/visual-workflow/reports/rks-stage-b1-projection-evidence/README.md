# Stage B1 — BLOCK：Compiler 证据接口待人工批准

基准 `2e6da0fe2115880eac4323b2daa264f0c98df88c`，分支 `fix/rks-semantic-scope-and-operations`。Stage A 测试摘要与本地原始日志哈希见 [stage-a-checkpoint.json](stage-a-checkpoint.json)。先前日志产生于提交前、生产及测试内容与提交一致；新增 14 项在该提交重新执行。原 Stage A 和历史 BLOCK 报告未改写。

## 停止原因及代码证据

在实现前发现本阶段明确的停止条件：要保证投影保留的 unresolved 不被正式编译静默升级，同时按原字段类型校验，必须让 Compiler 接收并使用证据。当前 `compiler.js:326-330` 只把三个投影后的字符串数组传给 `validateSpatialSemantics`；`architectureFunctionBridge.operationConstraints` 被固定映射为 `functionalRelationships`，未传入 `sceneProgram`、`operationConstraints` 的原始类型、原句、来源状态或 unresolved 证据。当前 Compiler 不消费 proposed sidecar，也没有通过 sidecar 阻止生成。仅在 Adapter 新增 sidecar 并不改变此 gate；把审计证据说成执行保护是不成立的。

`target-scene-projection.js:34-68` 按标点拆分后，对于没有场景实体且不触发其他条件的子句默认 current_shot；`source-adapter.js:452-467` 将 `currentShotText` 重新压成字符串，丢失输出与原字段、原索引及父句的确定绑定。`source-adapter.js:253` 将 sceneProgram 按 functionalNetwork 字段降级，桥接字段最终又被 Compiler 固定映射成 functionalRelationships。来源与镜头权限的端到端不变性尚未得到证明。

依照用户的停止条件，本阶段没有修改 Projection、Adapter、Compiler 或任何其他生产文件，没有创建新 sidecar 或改变字符串接口；生产 diff 为空。没有继续建立合成测试或执行 B1 验证序列，因此不得声称 Stage B1 达到验收条件。

## 已有输入与历史诊断（不是本阶段新运行）

- FTT 历史原句：`点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费`（`tests/restaurant-knowledge/ftt-historical-packet.json:1071`）。先前 BLOCK 报告指出投影残句 `形成高效服务动线; 支持多场景消费`，父句丢失；未在 B1 重新运行或确认不同镜头的输出。
- FTT final-design 原句：`全店外带包装功能依赖；位置与设置方式待确认`（`ftt-final-design-fixture.ts:48`）。先前失败诊断记录了孤立的 `位置与设置方式待确认`，语义结果为 `conditional_or_unconfirmed_scope`；B1 未重新投影或证明父依赖保留。
- B1 原句：`Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route`（`shadow-fixtures.ts:34`）。历史诊断记录 `takeaway handoff keeps a clear route` 在旧功能关系字段失败；Stage A 字段契约单测将其识别为 constraint。B1 未重新投影或验证来源状态。
- 九州 / reference-first 与 continuation：本阶段未运行输入回放，原角色、父范围、条件及约束保留状态未核验。入口及厨房的合成反例同样未执行；不将任何一项记作通过。

## B2 最小接口需求（仅供人工决定）

1. Adapter 对每条投影输出提供可追溯 evidence sidecar：原字段、原索引、原文和范围、子句类型与模态、来源状态、投影去向、镜头权限及明确的 unresolved；重复值必须以索引或稳定标识区分。
2. Compiler 在渲染及最终执行授权之前读取并校验 sidecar 与字符串绑定；对原始或投影后未解决的证据保持阻断，不能把局部可投影片段当成整项通过。缺失、错配、被截断的证据须保守处理。
3. Compiler 按原字段和完整命题的证据契约验证节点、关系和设计约束，不能把 sceneProgram 节点或 operationConstraints 一律改作 functionalRelationships；不得从 sidecar 自动授予语义通过、来源确认或 current_shot。
4. 明确保持 off-frame、cross-scene 和 review-required 的边界以及 target program 的来源与作用域，并为 reference-first、continuation 和重复来源建立端到端离线反例。

本清单并不授权 B2 修改。既有完整性清单漂移依旧冻结；不自动同步。Stage A 的 8 项 E1F 失败、完整工作流已有失败及 28 项未展开测试仍按原报告归因，不能作为 B1 新测试结果。未调用 Provider、凭据或生图服务。
