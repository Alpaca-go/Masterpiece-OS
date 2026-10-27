# RKS-02E1G · 独立审核

**结论：BLOCK。E1H 完整性同步不可启动。**

审核提交：28a42491a91036c5da8bedc163c3e2683a95fa8c。比较基准：ff1f076dfada89268393b6624d5294b4254506a3。审核分支：audit/rks-02e1g-independent-review。

本轮独立构造反例并用同一测试文件比较两个提交；没有以 E1F 自述作为安全结论。只新增本目录及 independent-review.test.ts，没有改被审核实现、原断言、完整性记录、历史报告、Prompt、Golden 或模型配置，没有正式分析、真实 Provider、真实 Key、收费调用、生图、合并或发布。

## 1. 结论依据

E1E 的 19 条、E1F 的 159 项定向及 69 项跨行业全部复验通过，但新增审核揭示条件范围丢失、指代不明仍放行、非可见性字段继续按来源兜底，以及正常描述的误阻断。**既有测试全过不足以批准 E1H。**

新增 46 项：23 PASS / 23 FAIL。通过数包含一项“兼容路径行为刻画”，该项通过只是确认旧路径仍会调用模型并得到 ready，不代表该行为获得安全批准。同一套审核测试在基准为 20 PASS / 26 FAIL。逐条比较：11 项改善、8 项新回归、15 项持续失败、11 项维持通过、1 项兼容行为刻画。23 项失败有重复层级验证，不能当作 23 个独立漏洞。

### F1 — P1：品牌分离丢失整句条件或未确认范围

位置：validate-spatial-semantics.js:139–168，尤其 150–159。kind 先按品牌类别处理，and/和 切分后单独验证右侧，未保留左侧 If / Only if / 未确认 / 如果 对整个并列命题的约束。

| 原句 | 原句 gate | 分离后 | 完成器 |
| --- | --- | --- | --- |
| Only if Logo and staff operating equipment | block | staff operating equipment，pass，unresolved=0 | ready，模型回调 0 |
| 未确认Logo和员工操作设备 | block | 员工操作设备，pass，unresolved=0 | ready，模型回调 0 |
| 如果有Logo and staff operating equipment | block | staff operating equipment，pass，unresolved=0 | 分离层已复现 |

If Logo…、如果出现Logo…同样复现。不是“否定词没有命中”的单点问题：**分离改变了命题作用域，把条件/未确认陈述变成无条件活动**。Packet 输入保持不可变并不能抵消输出的语义升级。这些反例在 ff1f076 也失败，属于本轮目标中仍未解决的问题，不标为 E1F 新增回归。证据：[independent-probes.json](independent-probes.json) 的 semantic 与 completion 记录。

### F2 — P1：完整字符串匹配仍未验证明确指代和完整关系

位置：validate-spatial-semantics.js:44–64。tail 允许任意关系接 it，也允许 and + 介词；qualifiedSubject/positioned 只证明出现了用途前缀或位置词，不能证明 it 有先行对象。

- equipment near it：pass；完成器 ready、模型回调 0。没有明确位置或用途，it 无上下文指代。
- reception equipment of it：pass。
- reception counter and with it：pass，残缺并列关系被当作完整描述。
- Logo and equipment near it：剥离 Logo 后保留 equipment near it，pass，unresolved=0。

这里即便正则覆盖全文，仍是语义证据不足。基准也会放行这些输入；E1F 用新语法替换宽松兜底后没有消除该漏洞。不能把“已锚定首尾”推导为“完整命题已成立”。

### F3 — P1：其它功能字段与 sceneProgram 的未知项未形成阻断

位置：separate-space-semantics.js:154–159；validate-spatial-semantics.js:97、150、189–199。非 mustBeVisible 字段仍可能仅凭来源类别获得 functional/architectural；非品牌项即使 kind 返回 unresolved，也直接 retained，未加入 unresolved。最终门禁不覆盖 sceneProgram。

在充分性完整的合成 Packet 中只替换一个条目，保留其它原始条目：

| 字段 | 替换条目 | 实际结果 |
| --- | --- | --- |
| functionalNetwork | 员工尚未操作设备 | ready，0 模型调用，unresolvedFields=[] |
| functionalRelationships | staff operating equipment and enjoying cosmic essence | ready，0 模型调用，unresolvedFields=[] |
| sceneProgram | If staff operating equipment | ready，0 模型调用，unresolvedFields=[] |

三个反例在基准也存在。E1F 的“重新校验所有保留项”没有为这些输入提供实际完整命题保护。sceneProgram 的证据标记 separation_only 是准确的范围提示，但完成器仍可能把整个 Packet 判成 ready。

### F4 — P2：正常商业用途与关系出现新增误阻断

位置：separate-space-semantics.js:62–105 的封闭活动/位置规则，及 validate-spatial-semantics.js:40–79 的关系识别。以下命题是明确的可见经营活动或明确位置关系，不含隐喻、条件、否定或未知尾句。同一输入基准 pass，E1F block：

| 命题 | ff1f076 | 28a42491 |
| --- | --- | --- |
| staff operating equipment and serving customers | pass | block |
| 顾客在入口查看菜单 | pass | block |
| 员工在柜台为顾客办理入住 | pass | block |
| 工作人员使用收银机收款 | pass | block |
| Customers paying at the checkout counter | pass | block |
| 餐桌位于就餐区 | pass | block |
| 取餐台位于点餐区旁 | pass | block |
| Menu at the service counter | pass | block |

这些是本轮 8 项真正新增回归。例：paying 已支持，但 checkout counter 不在位置规则里；有确定位置的中文桌/取餐台描述缺少关系语法；普通动作并列也被整体拒绝。修复时必须保持未知尾句阻断，不能恢复任意子串许可或改掉原/新测试期待来制造通过。

## 2. 四文件独立审查

| 文件（相对 packages/visual-workflow/src） | 结论 | 逐项依据 |
| --- | --- | --- |
| generation-runtime/space/semantic/separate-space-semantics.js | BLOCK | E1E 否定/未知尾句已改善；但 F3 来源兜底仍误授权，F4 正常活动新增误阻断。 |
| generation-runtime/space/semantic/validate-spatial-semantics.js | BLOCK | F1 条件作用域丢失，F2 无先行对象的 it 和残缺关系通过，F3 未覆盖其它保留未知项，F4 位置描述误阻断。 |
| analysis-decisions/analysis-completion-orchestrator.js | PASS | 仅就本次控制流改动：生产回调组合的纯校验先于可选结构化修复；本地失败与已报告 unresolved 会阻断，最终充分性不会覆盖失败。语义 validator 假 pass 仍会得到 ready，整体验收因此 BLOCK；兼容风险见下节。 |
| runtime/pipeline-service.js | PASS | 仅就本次 evidence 接线：克隆 Packet、保留事实/锁定路径，传递 changes/unresolved/evidence；生产唯一完成器调用提供两项必要回调。它依赖前两文件，不构成正式分析批准。 |

[完整性与四文件 SHA256](integrity-review.json) 对照了实际 Git blob 与磁盘字节。E1G 期间四文件均保持审核提交原样，不存在审核中暗修。

## 3. 调用关系、兼容路径与成本

调用关系以实际源代码核对：

1. service.js:180–185 的公共 operation 先执行 verifyImplementation 和 baselineGuard。当前漂移使正式公共入口在调用前失败，本轮没有替换或绕过它。
2. pipeline-service.js:121 起检查素材、Logo 锁定、输出语言并读取独立配置/凭据。较早的 DCD 和 UVU 在完成器之前，UVU 解析重试上限仍为 3；这些历史路径未改。
3. pipeline-service.js:323、338–352 调用独立完成器并提供 validateFinalPacket 和 repairFinalPacketDeterministically。包内扫描只有这一处生产完成器调用；同名的策划/共享模块是不同实现，未作为复用入口。
4. analysis-completion-orchestrator.js:101–149 先做迁移/充分性与来源评估，再做纯空间语义检查；161–236 的可选结构化批次前再次检查；277–313 最终再检查；321 起复核充分性。
5. pipeline-service.js:464–486 拒绝 requires_confirmation/failed，其余成功结果才写 executionDataStatus=ready。因 F1–F3 可令完成器误报 ready，后续接线不能独立补救这些语义问题。
6. 生图编译还有 generation/compile.js:157 和 space/compiler.js:326 的 gate。独立空间模式固定为 r8_6_golden；旧无 generationBasis 输入会跳过外层 gate，但内部编译仍有 gate。标准路径不能修复 gate 本身对 F2/F3 的误放行；本轮没有启动生图。

生产唯一完成器调用有纯语义回调；因此“提前于可选结构化修复”在该调用组合下有证据，**并非早于所有模型请求**：DCD/UVU 可能已消耗请求。MAX_REPAIR_ATTEMPTS 仍为 2 次结构修复轮次，不等于全流程两次请求。两次请求上限来自显式注入的实验 guard；它不是本轮新增的全局生产额度。没有扩大任何额度，也没有读取真实 Key。

兼容路径：完成器 280–311 在缺少 deterministic 回调时仍可调用 repairInvalidFinalPacket。独立假回调把 staff not operating equipment 换成 staff operating equipment 后得到 ready，模型回调 1。该行为在基准也存在；当前生产调用者不会进入此缺回调分支，所以不把它虚报为已证实的公共入口绕过。但不能声称所有旧调用方式都遵守“不靠模型补证据”的策略。后续若保留该 API，必须明确调用契约或使缺少必要校验的空间调用失败；这不是本轮自动修改权限。

## 4. DISPATCH_LIMIT 争议：A 与 B 必须分开

新增两个离线组合测试使用现有 guard、临时合成项目和两次注入响应，再接完成器或主动第三次调用；没有跳过公共完整性去伪造正式入口成功。

| 情况 | 已发生假发送 | 完成器模型调用 | 第三次尝试记录 | 结果 |
| --- | --- | --- | --- | --- |
| A：纯语义失败 | 2 | 0 | 无 blockedAttempts | 完成器 failed，账本 terminated |
| B：另一路径主动尝试第三次结构修复 | 2 | 不适用 | DISPATCH_LIMIT | 请求未发送，账本 terminated |

A 在基准会尝试一次可选语义修复并被预算拦截；E1F 改成根本不尝试，这是预期改善。旧 integration.test.ts 中“formal spatial semantic repair…”强制检查 DISPATCH_LIMIT，混合了 A 与 B 的断言目的。建议后续经人工确认后，A 明确断言纯语义失败、不 ready、完成器零新增调用、实际发送不超过两次；B 单独保留第三次尝试必须被拦截且发送数仍为两次。不能仅删除旧断言，也不能删除/削弱 B 预算保护。

当前原集成测试未修改；它们仍先被清单漂移挡住，5/6 失败。上述 A/B 组合证据不能替代将来完整性同步后的正式公共入口重测。

## 5. 不可变性、追溯与来源状态

所有新语义探针都比较输入摘要、重复运行完整输出；六个完成器反例也核对原 Packet 和 projectFacts 未变。正常分离保留 changes、原片段、分类证据；但 F1 表明“轨迹存在”不代表“轨迹合法”。

已识别的 staff not operating equipment 会 failed，0 模型调用，分离 runtime artifact 中 unresolved 非空。返回的 unresolvedFields 仍为空，因为该集合来自结构充分性问题；调用者若只展示该数组会漏掉语义原因。这是诊断输出限制，原始 sidecar 未丢失，不能将它说成整个 unresolved 已完整丢失。

行业来源状态 unknown 的独立测试保持 unknown 和 requires_confirmation，事实与输入不变。语义肯定性没有提升该状态。但字符串内部的“未确认”仍被 F1 丢失，所以来源保护不能作普遍安全结论。

历史 Packet 复验通过：13 个归档产物、7 个归档报告摘要匹配；六处分离，unresolved=0，原始功能动线、菜单、座位、取餐和就餐信息保持；源 Packet SHA256 a226ddddbd0e21c648fed3d6a4d0fd91d092eafbe3f03c66687298003e8050d3。候选模型/网络均为 0，源 Packet 和真实项目状态不变。[历史回放证据](historical-replay.json) 中的 OFFLINE_CANDIDATE_PASS 只属于离线分离，不是模型分析或空间生成质量通过。

## 6. 验证记录及失败归属

| 检查 | 本轮结果 |
| --- | --- |
| E1E 原 19 项 | 19/19 符合预期，原错误 Logo/happiness ready 已变 failed |
| E1F 原 159 项定向 | 159/159 PASS |
| E1F 原 69 项跨行业 | 69/69 PASS |
| 新增独立检查 | 46：23 PASS / 23 FAIL |
| 同一独立检查对照 ff1f076 | 46：20 PASS / 26 FAIL |
| 原 E1F 工作流套件，不混入新增审核测试 | 370：360 PASS / 10 FAIL，与 E1F 一致 |
| 双请求 guard + transport | 46/46 PASS |
| repo:verify | FAIL：合同通过后完整性漂移阻断 |
| current-flows | FAIL：引擎 2/2，历史 E1E JSON 告警导致 Golden 边界中断 |
| Golden 离线场景 | 5/5 PASS，零 Provider，未刷新 |

新增测试与原工作流分开运行，是为了保留可比的 370 项基数；所有新增失败都单独报告，没有排除后宣称全绿。命令、退出码、时长、日志路径与 SHA256 见 [test-results.json](test-results.json)。E1G 未重新运行根 npm test；引用的 E1F 历史记录显示审核实现与 ff1f076 均为 1697/1701，同样四项失败（两个历史仓库文件政策问题、两个 E1E 报告文本触发的 Golden 扫描告警）。本轮重跑 current-flows 仍仅命中原 E1E 报告，未改该历史报告或扫描规则。

原十项工作流失败逐项保持：

| # | 原用例 | 本轮状态 |
| --- | --- | --- |
| 1 | read-only existing report RPC supplies suggestions for missing directions without creating any decision files | 完整性入口阻断；仍 FAIL |
| 2 | public operations verify the approved implementation before registration, compilation, generation and Logo composition | 完整性入口阻断；仍 FAIL |
| 3 | baseline lock prevents input/model/code drift and old tasks; other projects remain independent, zero network | 完整性入口阻断；仍 FAIL |
| 4 | guarded public web operations save, confirm, compile, generate, reopen and invalidate on an analysis request | 完整性入口阻断；仍 FAIL |
| 5 | explicit details save persists identity, retains artifacts and requires new analysis/confirmation without calling models | 完整性入口阻断；仍 FAIL |
| 6 | formal create/import/analyze via injected provider succeeds with exactly two fake HTTP responses | 完整性入口阻断；仍 FAIL |
| 7 | formal UVU parse path does not retry after invalid JSON | 完整性入口阻断；仍 FAIL |
| 8 | formal spatial semantic repair is blocked; existing semantic gate still fails | 完整性入口阻断；仍 FAIL |
| 9 | formal structured decision repair catches errors but cannot obtain a third dispatch | 完整性入口阻断；仍 FAIL |
| 10 | formal report validation is not bypassed by two-call budget logic | 完整性入口阻断；仍 FAIL |

前五项直接命中 VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED；正式假响应组的第一项外层为 ANALYSIS_STOPPED，其余四项在假发送次数（实际 0）断言失败。没有把这些完整性失败计为 E1G 新生产回归。真正新增的生产回归是 F4 的八项正常描述，其余 15 项新审核失败在基准也存在。

审核测试自身有一次公开纠偏：初版把“staff operating equipment; lotus represents happiness”预期成 block，实际上分号明确分开活动与品牌表达，后者可安全迁入品牌层。最终预期为分离后 pass；初版两次原始结果、摘要和理由都保存在 test-results.json 对应记录。这里只纠正本轮新审核用例的语义判断，未更改 E1E/E1F 的原断言，也未修改生产来消除失败。最终 BLOCK 不受该纠偏影响。

## 7. 完整性与冻结核对

清单更新条目：0。implementation-integrity.json 的基准、审核提交、当前磁盘 SHA256 都为 85947e556d9467837f7583c106f5f7fec10f65207ed9b2c31b410ae7c2f13bec。恰有原有五项漂移：本轮审查四文件，加 E1D 修改、E1F 未动的 space-generation-core.js；[integrity-review.json](integrity-review.json) 逐项列出记录值、基准值及审核实际值。verifyImplementation 未关闭、替换或降低。

审核开始时的 3011 个已跟踪文件逐文件摘要，完成时全部相同；额外复核原项目、隔离项目、账本、LIVE、输入冻结、P7B、历史知识、Prompt、合同配置及 Golden 等 13 个受保护根，均与保留的历史摘要一致。详见 [preservation.json](preservation.json)。历史 E1C/D/E/F、原素材、E0、B1、Seedream 配置、策划与迁移实现均未改动。

## 8. 最小后续修复范围（未实施）

1. 在独立语义分离器中保留条件、否定、未确认对并列命题的作用域；只有已证明独立的品牌分句才可迁出。无法证明时整句 unresolved，不得制造肯定活动。
2. 在可见性关系校验中验证对象与位置/用途的完整关系，拒绝无先行对象的 it 和残缺 and with 结构。不能仅以关键词或字符串覆盖率代替证据。
3. 在同一语义模块对 functionalNetwork、functionalRelationships、sceneProgram 的保留未知片段给出明确阻断；来源字段不能自动授予功能事实权限。保留原值和诊断，不通过模型补造事实。
4. 以 F4 的正常输入及它们的条件/否定/品牌尾句成对回归，补足通用商业关系与动作并列语法；不增加项目专用规则或放松未知尾句保护。

优先生产范围仅为两个 semantic 文件；完成器仅在需要补齐诊断或明确兼容契约时另作最小审查，pipeline 接线无需为了这些反例改写。修复后重新独立审核，再由人工决定 E1H。**当前结论 BLOCK：停止，不实施上述修复，不进行完整性同步或正式运行。**
