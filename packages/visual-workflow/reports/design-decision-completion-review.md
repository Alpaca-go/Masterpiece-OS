# 两批设计决策保真编译修复：离线完成审查

状态：第二批离线实施完成，停在审查点；**总门禁未通过**。基于已审核第一批提交 `435f6ba`，本轮按用户指令提交到当前分支，审查及放行状态不变。真实模型调用 0，未修改原项目资料、完整性摘要、Golden、历史人工验收基准或兼容标识；没有合并、发布或视觉质量冻结。

## 代码与来源

- [第二批完整代码差异](./design-decision-completion-code.diff)
- [两批完整代码差异，起点为 3b7ed4d](./design-decision-combined-code.diff)
- [实施前四项失败的归因及原始证据](./design-decision-failure-attribution.md)
- [最终来源、保护文件哈希及只读证明](E:/image-quality-regression-evidence/design-decision-completion/review-proof.json)

第二批生产改动仅在独立包内：`generation-runtime/generation/compile.js`；`space/architecture-context.js`、`space/compiler.js`、`space/source-adapter.js`、`space/scene-projection/target-scene-projection.js`、`space/semantic/sanitize-brand-expression.js`。两批合计九个生产文件。第一批的动作对象保留、颜色角色可达和材料光学保留继续有效，第一批新增的 17 项测试保持原样。

| 主题 | 最终实现及权限 |
|---|---|
| 核心艺术装置 | 从既有来源收集装置提案，按镜头过滤，进入 Composition 的独立艺术焦点层。保留来源路径和提案身份；可选装置保持 optional；不凭空新增装置、吊装、落位、尺寸或光学工艺 |
| 功能与镜头 | 标准路径按来源识别当前镜头、其他功能区和跨场景关系。画外依赖完整留在 trace，不再要求所有节点在接待画面可见；保留接待、候客、通达和隐私边界 |
| Architecture Context | 品牌名称和已存品牌键不再自动启用锚点；只有显式传入 brandKey 才考虑可选例子，并检查当前场景、行业和当前镜头的机制证据，不用咨询内容替接待授权。锚点从属于项目和用户要求，不再声明“品牌已认可”或“项目不得与先验冲突” |
| 无锚点的正式路由 | 保留既有 architecture_context 区块 ID 与顺序，内容如实声明未选择例子及其权限边界；anchors/referenceImages 为空、architectureContextIncluded=false。未改路由基准或用默认锚点填充 |
| 艺术与商业 | 移除固定反画廊标题和按画廊气质自动删除的逻辑；行业约束用途、通达和隐私，不规定建筑风格；保留身份文字后合成保护 |
| 设计要求去重 | Architectural actions 只在 Architecture Language 渲染一次；其他建筑段引用其职责。体验目标由 Spatial Intent 承载，功能可见项与艺术焦点由 Composition 承载。既有 strategy/form/organization 数据容器不被删改来伪造兼容通过 |
| 色彩权限补充 | 保留模型提议的色名、背景角色、比例和光学作用，但标为 proposal_only；未确认的主背景和面积分配不能成为强制全空间要求。当前用户明确指令优先；色名、品牌主色、渐变不独立授权几何或大面积配色 |
| 来源映射 | 正式编译结果透传 blockSources、decisionTrace、canonicalOwners、artisticCandidates、artisticFocus、sceneScope。可识别原始字段路径与 derived 路径，画外排除并不丢弃原始依据 |

没有生产项目名称判断、固定配色、特定装置形式或材料工艺。未改创意策划、视觉迁移、公共宿主、Web 业务、分析 Prompt 或 Packet 生成实现。所有新增代码文件及标识采用语义名称。

## 完整正式 Prompt

| 输入与编译状态 | 完整输出 | 字符数 | SHA-256 |
|---|---|---:|---|
| 两批修复前，同一历史输入 | [原始完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-implementation/before/prompt.txt) | 8733 | `9494e7cf932217af59d3aaa45a9d74781d4f5365682dd2fae8069bac807a5f5d` |
| 第一批审核点，同一历史输入 | [第一批完整 Prompt](E:/image-quality-regression-evidence/design-decision-completion/before/prompt.txt) | 8889 | `88ffba59aae4ea0bfdae8d294903191c7bcfef563ca61f42f88df428de2a3323` |
| 两批完成，同一历史输入 | [最终完整 Prompt](E:/image-quality-regression-evidence/design-decision-completion/after/prompt.txt) | 7268 | `f647dc10360699f19ba15c3726d6db1c17c6025606df4371d0ccd25e547e323c` |
| 两批完成，仅内存任务副本补充用户定位 | [带用户定位的完整 Prompt](E:/image-quality-regression-evidence/design-decision-completion/user-positioning/prompt.txt) | 7288 | `1ec3f98e01ae29383601cfd43baf6f07c6b3636f24bfe4aff6dd4295eb9dbf27` |

[第二批逐行 Prompt 差异](E:/image-quality-regression-evidence/design-decision-completion/prompt.diff)、[两批合并逐行差异](E:/image-quality-regression-evidence/design-decision-completion/combined-prompt.diff)。最终两份均由 `compileSpacePrompt` 和正式 `compileShortChainGeneration` 路由生成并逐字一致；没有手工改写输出，也没有执行请求或将历史图片送入 payload。字符数变化不证明图像质量。

补充定位的文本为：“艺术展馆式高端医美：艺术表达须与接待、咨询、隐私和真实运营功能并存。”只替换离线内存副本的 currentInstruction，保存在证据中并标注 user_confirmed；原任务文件、Packet 和项目文件全量哈希不变。

## 九州美学来源分层与结果

[历史输入不变的最终来源映射](E:/image-quality-regression-evidence/design-decision-completion/after/trace.json)、[补充用户定位的来源映射](E:/image-quality-regression-evidence/design-decision-completion/user-positioning/trace.json)。

- 用户确认：本次明确的艺术展馆式定位，仅出现在内存副本任务中，不回填成历史素材事实。
- 素材事实：沿用已审核根因审计和原资产索引；不把旧模型提案或人工验收图观察当成新的原始资料。
- 模型提案：既有装置、配色、材料、运营关系。装置进入艺术焦点仍标 model_proposal，没有升级为用户批准的实体构造。
- 系统推导：颜色角色解析、场景范围过滤和渲染职责分配，有路径和推导理由；不是素材中的新事实。
- 未知：准确面积比例、装置尺寸和安装形式、未提供的光学机制。没有补入珠光配方、薄片厚度、固定暖白比例或默认吊装。

最终保留原装置提案并在构图中单独呈现一次，接待台与隐私隔断保留在运营可见层。19 条跨场景或其他功能区要求保存在画外来源记录；接待画面不再展示全院咨询、治疗及恢复节点。当前用户定位可与这些运营边界并列传达，编译器不再用反画廊规则或自动品牌先验压过它。此结论仅限离线语义可达与权限顺序，**没有新的图片人工验收结论**。

## 全量离线验证及失败归因

原始日志目录：[design-decision-completion](E:/image-quality-regression-evidence/design-decision-completion)。没有修改旧断言、测试预期或整体快照；因此不需要对任何预期刷新作追认。

| 检查 | 结果 |
|---|---|
| 第一批保真测试 | 17/17 PASS，测试文件哈希与第一批提交一致 |
| 第二批新增反例 | 13/13 PASS |
| 包内完整测试 + 独立集成测试 | 54/58 PASS；4 项失败仍分别属于下述既有类别 |
| npm test | 串行复跑 1701/1701 PASS |
| cli:test | 40/40 PASS |
| runtime:test | 串行复跑 Core 14/14 PASS；应用层 1291/1294，3 项独立工作流失败，未将摘要拦截记为业务通过 |
| verify:current-flows | FAIL，应用层 1291/1294，3 项独立工作流失败；因此不是发布通过 |
| web-runtime:test | 14/15 PASS；256 与 236 的既有宿主计数断言失败，未修改宿主或其预期 |
| web:build / web-runtime:typecheck | PASS；current-flows 短路后的类型检查另行执行 |
| web:smoke | 串行复跑 PASS，0 Provider calls、0 business writes；这不是独立业务 E2E 或新图质量验收 |
| repo:guard:test，含双向隔离反例 | 串行复跑 56/56 PASS |
| golden:test | 5 项 PASS，0 Provider calls、无 Golden 自动更新；既有视觉标签不是本次质量冻结 |
| repo:verify / repo:check | FAIL；Repository Contract PASS，完整性门禁按要求拒绝未更新的独立实现摘要，首个差异为 generation/compile.js |
| 版本、命名、workspace、obsolete、production、tracked-assets、project-specific、golden-boundary、analysis-guards | 全部独立执行 PASS |
| git diff --check | PASS |

四项独立工作流失败与第二批前归因一致：渐变一律降级的旧语义断言冲突；与共享提取实现逐字一致的输出断言冲突；Logo 选择操作与业务 E2E 两项摘要拦截。安装装置的旧 brand 容器读取断言继续通过：数据容器兼容保留，最终 Prompt 只在构图层渲染一次。没有通过改变旧字段、测试或共享实现消除失败。

首轮高并发执行还出现 secret-safety 子进程 60 秒超时、浏览器 renderer 超时，以及创意研究测试 `peak` 并发数 1 != 2。原始日志以 `*-concurrent.log` 保留；根测试、guard 和浏览器随后串行复跑通过，runtime 串行完整复跑中创意研究该断言也通过，仅剩上述 3 项独立工作流失败。这些非稳定复现的调度症状不能合并进四项独立工作流失败，更不构成修改创意策划的授权；不删除首轮证据。

## 反例与审查风险

1. 医美、酒店、餐饮分别通过正式编译路由：明确的强蓝背景和复杂曲线要求保留，没有自动艺术装置、品牌锚点或统一建筑语言。只使用脱敏通用案例，没有冒充其他真实项目验收。
2. 改品牌名、改变已存 brandKey 不启用锚点；显式请求示例时，接待不选咨询示例，不因数量不足加入机制不兼容项。锚点匹配使用有限的双语机制词汇，不能等同全面的建筑相容性判断。
3. 背景角色与比例可达性保留，但提案不再具有大面积强制执行权限；用户明确要求强色空间仍直接保留在 Task。没有固定色彩阈值。此为 Prompt 权限语义验证，不保证真实模型一定正确执行。
4. 场景过滤是保守的来源范围判定。跨多个功能区的整句可能被归到画外依赖；不拆句伪造源资料。未知自定义场景标记 unresolved，不宣称已完成空间程序的全面理解。
5. 装置、材质与光学提案完整传递，不证明提案本身充分、工法真实或图像保真。布局细节、运营动线和专业要求仍需要项目资料与用户确认。
6. 完整性摘要未更新，正式独立业务操作仍会被摘要验证器拦截。总门禁、业务 E2E 和视觉质量尚不能放行。待两批生产改动审查完成后，再按单独授权进行定点摘要更新与完整门禁重跑。

第二批到此停止；不继续真实生图、合并主线或冻结视觉质量。
