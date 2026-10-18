# 跨区域运营关系修正与完整门禁恢复

状态：本轮针对性修正和离线工程验证完成，**完整门禁通过**，停止等待人工审查。工作分支 `fix/visual-workflow-image-quality-regression`，起点 `3ea00af`；本轮按用户指令提交到当前分支，人工审查及放行边界不变。真实模型调用 0，未合并、发布或冻结视觉质量。

## 最终差异及保护范围

- [本轮完整代码、定点摘要及测试差异](./cross-zone-gate-recovery-code.diff)
- [自 3b7ed4d 起的两批及本轮合并差异](./design-decision-reviewed-code.diff)
- [全部结果、只读证明及最终摘要值](./cross-zone-gate-recovery-results.json)

本轮生产源码只修改既有九文件集合中的三个：`space/scene-projection/target-scene-projection.js`、`space/source-adapter.js`、`space/compiler.js`。其余六个与已审核提交字节相同。没有修改创意策划、视觉迁移、公共宿主实现、分析 Prompt、原项目 Packet 或历史报告。新增测试与审查工具均位于独立包 tests，文件及业务标识使用语义名称。

包外改动仅为用户逐项批准的两个测试用例；批准申请和补充申请见下文。没有共享实现修改、Golden 刷新、整体预期替换或删除测试。

## 跨场景关系修正

旧行为只要句子出现其他场景词，就整句排入画外，可能丢失接待区仍须遵守的合法关系。本轮按子句分别记录：

| 类别 | Prompt 承载与权限 |
|---|---|
| 当前镜头实体/要求 | 保留当前镜头的功能、建筑或构图要求；未涉及外区时保持原文 |
| 跨区域运营约束 | 单独进入 Architecture-Function Bridge 的 Cross-zone operational constraints；明确只约束当前镜头的边界，不授予其他区域内部的可见性 |
| 其他区域内部实体 | 仍留在画外来源记录，不进入当前镜头必见项或功能节点 |
| 未知场景 | 保持 unresolved；不能因新增投影字段为空而删除原有复杂建筑表达 |

来源记录保留原句、原/派生路径、子句、边界约束和画外实体。关系判定同时使用当前区域上下文与来源字段语义：已声明在运营关系字段中、涉及当前区域的关系不必命中有限的动线/隐私关键词，避免漏掉“接待区与治疗区之间应保持隔声边界”一类表达。其他场景的设备、家具描述不能仅因邻句提到接待关系而获得画面可见性。

新增 15 项通用反例，包括中英文接待—治疗分流、接待—咨询隐私、恢复返回人流、邻接隔声、混合句的实体/关系分离、来源字段差异，以及正式编译器中约束只出现一次、输入不变的验证。没有项目名称、固定配色、装置形式或材料工艺的生产特判。

## 九个文件的摘要审查和定点更新

[首次九项旧摘要—候选摘要逐项记录](./compiler-integrity-review.json) 包含完整 SHA-256、已审核提交源码哈希及范围核验。其他 **118 条实现/资产/Prompt 记录、3 条前端记录**均未漂移。

最后补充声明式关系反例时，只再次变更上述场景投影文件；[补充审查与更新记录](./compiler-integrity-scope-review.json) 保留前次记录、该单项前后摘要，并提供 **九项原始摘要到最终候选摘要的完整对应表**。首次记录没有被覆盖以伪装从未发生过补充修正。

`implementation-integrity.json` 的最终差异严格只有九个对应文件的 sha256 值；所有元数据、文件顺序、非候选记录和前端记录不变。

| 摘要 | 更新前 | 最终 |
|---|---|---|
| manifest 文件 SHA-256 | `3dddc8f21fb1154f9456b81b6869d1b22db0033e5acf47831308119da78afb9d` | `7767be380484d444155df0b12ed4d1fe0fb860d562fb68869c8b43d3a3456bde` |
| implementationDigest | `ab3302821d6ba1acae9026967b9cc0996711a279debc1fa96d31c0956234470d` | `6bb6c099b5120c7a5209e8048dc4bd3f4dde115b04e6fb3ab4aeff3ea456f71d` |

`qualityAcceptance` 仍为 `pending-separate-quality-repair`；owner、extractionStatus、extraction-provenance、人工质量状态及 Golden 均未改变。更新依据是用户本轮有条件授权、源码差异审查和完整范围核验，没有旁路完整性验证器。

## 历史断言与获批包外测试

1. **渐变断言（包内）**：品牌色一律降为小件点缀属于已经批准撤销的旧行为。原身份保护断言保留；新增明确断言原装置渐变文字被保留，未确认背景角色/比例仍只有 proposal_only 权限，不可成为大面积硬要求。不是简单删除旧用例。
2. **提取实现逐字一致（包外）**：[具体申请与派生计数补充申请](./isolated-compilation-test-change-request.md) 均先获用户批准再实施。同一独立输入在不同全局开关下仍须产生相同 Prompt/payload；与共享旧实现仅规范化获准改变的 Prompt 及其派生字符计数后比较所有其余字段；计数另外严格等于独立 Prompt 的 Unicode 字符数。仍验证固定独立路由、实际 Prompt 到 payload 的保真、无隐式参考图。共享实现没有修改。
3. **宿主旧计数（包外）**：[具体申请](./host-registration-test-change-request.md) 获用户批准后，只改首个测试的名称、说明和计数断言：原有 236 个非独立通道、20 个独立工作流通道、总数 256、唯一性和关键独立操作存在。其余 RPC、凭据和健康断言保留，宿主实现不变。严格类型检查发现的 string[] 注解缺失也已修正，未放宽断言。

此前被摘要拦截的 Logo 选择用例与独立工作流离线 E2E 现已真正执行通过；E2E 使用临时项目、模拟推理/图像响应和捕获请求，不是真实模型调用。

## 九州美学最终离线编译

| 任务 | 完整正式 Prompt | Unicode 字符数 | SHA-256 |
|---|---|---:|---|
| 历史输入不变 | [完整 Prompt](E:/image-quality-regression-evidence/cross-zone-gate-recovery/historical/prompt.txt) | 7739 | `6c8d77f60f02e035dc7a9c6b360bf2d337102b3efea111b1308a279e5cc0b563` |
| 只在内存任务副本增加用户定位 | [完整 Prompt](E:/image-quality-regression-evidence/cross-zone-gate-recovery/user-positioning/prompt.txt) | 7793 | `108dd9aacf66ad53b76056d23e82b20b35b4ee7c06987399dfb1ef63def18761` |

[本轮 Prompt 差异](E:/image-quality-regression-evidence/cross-zone-gate-recovery/prompt.diff)、[所有修复合并 Prompt 差异](E:/image-quality-regression-evidence/cross-zone-gate-recovery/combined-prompt.diff)。两份均通过正式 `compileSpacePrompt` 与实际生成编译路由 `compileShortChainGeneration` 的逐字一致性检查；实际请求封装另由离线 E2E 校验。没有截断、手工改写输出或注入历史验收图片。

第二份任务的可追溯用户输入严格为：

> 九州美学是具有艺术展馆空间气质的高端医美机构，艺术表达、建筑、材料与空间体验需要整体协调，同时保留真实的接待、咨询、隐私与医疗运营功能。

该文本只进入内存任务副本的 currentInstruction，记录 user_confirmed 和 in_memory_review_task_only；生产规则中没有此定位或品牌名称。[历史任务来源映射](E:/image-quality-regression-evidence/cross-zone-gate-recovery/historical/trace.json)、[用户任务副本来源映射](E:/image-quality-regression-evidence/cross-zone-gate-recovery/user-positioning/trace.json) 及[全量只读证明](E:/image-quality-regression-evidence/cross-zone-gate-recovery/review-proof.json) 证明原 Packet、项目报告和其他项目文件与上轮审查时逐项哈希一致。

实际保留了接待通过受控通道进入咨询区、声学隐私与服务关系、内部安全通达和公共视野暴露约束。当前功能节点仍为接待大厅和走廊/过道；核心艺术装置仍以 model_proposal 进入艺术焦点，接待台和隐私边界保持可用。用户定位没有升级旧模型提案为已确认构造，也没有补入装置尺寸、安装或材料工艺事实。

## 全部验证结果

[机器可读结果](./cross-zone-gate-recovery-results.json)。[完整 repo:check 日志](E:/image-quality-regression-evidence/cross-zone-gate-recovery/repo-check.log) 包含实际执行的嵌套 repo:verify、current-flows、全部离线闸门和回归，不是仅启动检查。

| 检查 | 最终结果 |
|---|---|
| 独立包全部测试 + 独立集成测试 | **73/73 PASS**；含新增 15 项跨区域反例、原两批反例、Logo 选择及真实执行的模拟 E2E |
| repo:verify、完整双向隔离与反例 | PASS；反例/治理测试 56/56 |
| verify:current-flows | PASS；含应用层 1294/1294、Node Host 和 Web 类型检查 |
| npm test | 1701/1701 PASS |
| cli:test | 40/40 PASS |
| runtime:test | Core 14/14、应用层 1294/1294 PASS |
| web-runtime:test | 15/15 PASS |
| web:smoke | PASS，0 Provider calls、0 business writes |
| web:build | PASS |
| golden:test | 5 项 PASS，0 Provider calls、无 Golden 更新 |
| repo:check | **PASS**，完成全部顺序检查，没有前置失败短路后的未执行项 |
| git diff --check（源码及测试） | PASS |

阶段证据保留：[摘要更新前调试日志](E:/image-quality-regression-evidence/cross-zone-gate-recovery/before-integrity-tests.log)、[宿主测试类型注解失败日志](E:/image-quality-regression-evidence/cross-zone-gate-recovery/repo-check-type-failure.log)、[声明式关系补充前完整通过记录](E:/image-quality-regression-evidence/cross-zone-gate-recovery/repo-check-before-scope-refinement.log)。新增反例发现的遗漏、未知场景原文丢失均通过修正生产逻辑解决，没有修改这些反例预期掩盖问题。

## 验收边界

- 本次恢复的是离线工程门禁，不能据此冻结人工视觉质量或授权真实生图、合并和发布。
- 7739/7793 字符超过 7500 的质量软预算，trace 保留 qualityBudgetExceeded=true；低于 12000 的 Provider 硬限制。没有改预算、削掉运营约束或用重复内容消除提示。
- 子句和关系判定仍是通用的有限语言规则与来源语义推导，不能声称理解所有自然语言或验证医疗工法。原文、推导与画外实体保留可供人工核对。
- 医美、酒店、餐饮的已有通用反例均通过：明确的复杂曲线、强色彩和不同建筑表达能力保留，普通项目不会被自动加艺术装置或行业风格。没有用通用反例冒充其他真实项目验收。

工作到此停止，等待人工审查；不执行下一次真实生图。
