# RKS-02C.1 场景权威兼容性收口

日期：2026-10-25（Asia/Shanghai）。冻结起点 `81c0256a6966c0d1dbe56eb822ad32849172e8c6`；候选分支 `codex/rks-scene-authority-compatibility`。本轮消除四项 custom 纯编译回归；保持 RKS-02C 已映射场景输出。**候选待审，完整门禁仍受未审批摘要阻断，不可发布。**

## A. 原有 custom 契约与兼容策略

直接来源是既有 `tests/methodology/acceptance.test.mjs`：第 39–57 行构造项目 Packet，第 57 行明确使用 `generationBasis: standard`、`subtype: custom` 和相同 projectId；没有 shot、scene、currentInstruction、参考图或 Provider 执行。第 71、105、112–115 行直接调用底层 `compileSpacePrompt`。这不是公开生成任务，不能把它的合法性扩大到任意 custom 镜头。

Bakery 和 Outdoor 案例是人工编写的合成 brief，Packet 自带功能节点、全项目经营关系、可见要求、建筑组织、材料、色彩表面和灯光。另两项测试验证品牌/行业重命名不改变这些关系，以及修改座椅关系确实改变编译文本。`design-decision-methodology/automatic-proposal-implementation.md` 记录它们此前 6/6 通过；本轮起点重跑为 2/6，四个失败均为 `SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED: custom`。既有测试文件及期待值没有修改。

现在仅识别以下兼容入口，全部条件同时满足：

- subtype 恰为 `custom`，basis 恰为 `standard`；其他 unknown subtype 不能进入。
- Packet 已通过原有 ready / hard-fact 标记和实际功能、建筑语义完整性校验；清理后的 sceneProgram 与可安全保留的 mustBeVisible 非空。缺失数据不生成默认程序。
- 非空 Packet projectId 与 task projectId 一致；若另给上下文 Packet，其 projectId 也须一致。
- 没有 shot、scene、currentInstruction，没有显式/目标默认镜头来源；只允许缺省或既有 legacy 来源标记。没有参考图、continuation 或 artDirection 元数据；不跨成果类型。

输出是**来源定义的项目程序预览**，不是单镜头生成请求：

- 保留原项目关系和设计信息，经原有语义清理进入编译文本；未知光学参数、尺寸及颜色比例不补造。
- trace 逐项保存原字段路径、原值及证据等级；默认仍为 `model_proposal`，不自动升为人工确认。
- targetScene / targetProgramId 标记来源程序为 custom；`executionBoundary=pure_compile_preview_only`、`cameraVisibilityAuthority=none`。源程序校验为 pass，**镜头 gate 为 review_required**；没有伪称检查过镜头 blocks。
- visible trace 的 `owner=null`、`disposition=preview_only`；另以 previewOwner / previewOutputText 记录文本保留位置，不把文本出现当作执行权威。
- 编译文本明确写明不是已授权图片请求；功能网络标为项目依赖，不标作当前镜头可见列表。隔窗内容即使作为预览来源保留，也没有可执行 owner 或窥见室内授权。

公开 task 契约仍要求 shot 和 currentInstruction，且模板路由没有 custom；因此该兼容入口不会变成绕开完整性检查的公开生图通道。带镜头 custom 保持拒绝。若未来需要实际 custom 生图，须独立审核视角/可见节点绑定、跨场景隐私、窗口权限、公开模板及相应迁移；不能直接将预览当作可运行任务。

## B. 公开场景选项审核

依据现有 template-registry、target-functional-programs、Web 的选项展示及请求构造代码核对。程序化结果见 [public-scene-audit.json](public-scene-audit.json)。下表“可解析”仅指直接编译能力；公开业务操作当前仍受完整性守卫阻断。

| 选项 | 已有 UI / 模板 | 正式功能程序 | 当前兼容状态 | 产品风险与后续方案 |
| --- | --- | --- | --- | --- |
| storefront | 有 | storefront | 可解析；显式 front 与来源保留 | 室内隔窗权限继续待审，不扩大外立面视域 |
| entrance | 有 | entrance | 可解析 | 全项目网络不代表入口全店可见，保留明确局部位置与边界 |
| dining | 有 | dining | 可解析 | 厨师、热气、顾客等仍依来源权限保留，不重复 |
| exhibition | 有 | 缺少同名映射；另有 display 程序 | 编译阻断 | 用户可选却无法执行；需单独审核展陈语义及 display 是否可作为明确别名，不自动映射 |
| interior_panorama | 有 | 缺少映射 | 编译阻断 | 全景不等于所有私密/室内区域可见；需定义完整可见域及跨区权限 |
| counter | 有 | 缺少映射 | 编译阻断 | 需审核柜台使用、排队、员工/顾客侧与设备边界；不替换为 reception、entrance 或 dining |
| custom | 无公开选项/模板 | 无静态程序 | 仅限本轮受限纯编译预览；镜头/公开路由拒绝 | 不向用户声称已支持 custom 生成；另立显式程序与相机协议 |
| 其他 unknown subtype | 无合法映射 | 无 | 拒绝，无 custom 回退 | 不依据品牌、行业或相似名称猜测映射 |

本轮不修改 UI，不新增上述三种公开场景的隐式映射。其“选项可见但编译被拒绝”的风险仍未解决。下一阶段应由产品/设计/工程审阅各自功能域，再决定实现独立程序或明确的兼容映射；如需暂时禁用选项和用户提示，另提 UI 方案。本报告不把这项风险记为功能通过。

## C. 不回退证据

RKS-02C 原定向测试 82/82 通过，覆盖外立面/front、显式 shot 与来源、中文完整网络依赖、堂食经营行为去重、外立面未知活动待审、跨场景隐私、玻璃可见待审及跨项目反例。

另用同一组历史派生 A/B 输入复核 storefront、entrance、dining：六组输入摘要、正式 Prompt 摘要、Provider Prompt 摘要、sourceMap、镜头权威及任务/模型控制全部与起点已记录结果一致。见 [mapped-scene-parity.json](mapped-scene-parity.json)。这比关键词检查更严格，但仍只是离线文本一致性，不代表视觉质量。

[custom-preview-evidence.json](custom-preview-evidence.json) 保存独立合成输入、正式预览、字段匹配、sourceMap 与 trace。没有为 custom 构造 Provider 请求；其 providerRequest 为 null。原有 Bakery/Outdoor 的实际验收执行日志保留在 `logs/baseline-methodology.txt` 与 `logs/final-methodology.txt`。

## D. 完整回归

完整命令、退出码、耗时、原始/规范化日志 SHA256 见 [baseline-results.json](baseline-results.json)、[final-results.json](final-results.json)。日志只规范 CRLF、行尾空白和终止换行；诊断正文保留。结果有重叠，不累加统计。

| 检查 | 起点 / 最终结果 | 分类 |
| --- | --- | --- |
| 原 methodology acceptance | 2/6 → 6/6 | 四项新引入 custom 回归消除，另两项继续通过 |
| RKS-02C 定向 | 82/82 → 82/82 | 核心功能通过 |
| 新 custom 契约测试 | 10/10 | 来源绑定、边界拒绝、纯编译语义、公开路由拒绝、六组一致性 |
| 全部 visual-workflow | 244/249；5 FAIL | 五项均由未审批完整性摘要阻断；不再有 custom 行为失败 |
| current-flows | 文档准备 2/2；Runtime 1292/1294 | 两项独立流程公开操作被同一完整性守卫拒绝；整体 FAIL |
| Golden | 5/5；Provider 0，未自动更新 | 既有状态记录校验，不新增质量验收 |
| repo:verify | Repository Contract 通过；隔离完整性阶段退出 1 | 未刷新 manifest，整体 FAIL |
| repo:guard:test | 56/56 | 边界及其反例通过 |
| Node Host / Web typecheck | 分别通过 | current-flows 提前退出后独立核验 |
| 版本、命名、包边界、废弃代码、生产边界、tracked assets、项目特判、Golden 边界、analysis guards | 独立执行均通过 | 因 repo:verify 提前退出而单独补跑 |
| repository-policy | 起点 0/2；最终 0/2 | 原有两份项目交付文档及五个栅格图的位置政策冲突，不清理或放宽 |
| 新引入行为回归 | 最终未发现 | 不能把完整性阻断归为功能通过 |

逐个失败的测试名称、位置及分类见 [failure-audit.json](failure-audit.json)。P7B 的公开组合测试仍会先被完整性校验拒绝；这不等于其全部公开链路已通过。没有运行完整根 npm test，历史政策冲突采用独立测试在起点和最终复现。

## 源码范围与下一阶段审批

本轮仅增加两个生产文件的候选差异：

| 文件 | 必要原因 | 验证范围 |
| --- | --- | --- |
| `src/generation-runtime/space/source-adapter.js` | 区分受限的来源程序 custom 预览与未知镜头；验证项目绑定和完整输入，保存血缘，并禁止预览取得执行 owner | methodology、custom 契约、全部视觉工作流及公开入口拒绝 |
| `src/generation-runtime/space/compiler.js` | 将预览与真实生成/当前镜头用语区分，明确项目网络及镜头待审状态；已映射场景分支字节不变 | 六组 A/B 摘要一致性、82 项核心回归、完整回归与 Golden |

准确 diff 见 [candidate.diff](candidate.diff)。[protected-change-approval.json](protected-change-approval.json) 区分本轮 81c0256a → 候选的两文件旧/新 SHA256，以及相对未改动 manifest 的累计四文件差异（含 RKS-02C 的外立面程序和投影文件）。下一阶段应审核累计四项，不能只批准本轮两项而忽略先前候选。守卫只报告第一个差异，审批单逐一列全。

`implementation-integrity.json` 字节及 qualityAcceptance 未改；P7B、B1、模型配置、Prompt 资产目录、Golden、知识状态、Web UI、共享业务、公共宿主和 lockfile 均未更改。真实分析、生图、模型校验、自动重试、网络尝试、用户真实项目读写、合并、部署及发布均为 0。

本轮到候选代码、测试与兼容报告提交为止。等待人工审核；不自行更新摘要、不接通 custom 生图、不修改三个未映射选项的 UI，也不继续开展窗口接口或模板/材料设计。
