# 语义作用域与商业行为识别修复记录

**结论：BLOCK。停止本轮实现；不得进入 E1H 或完整性同步，不提交为合格候选。**

修复基准：`ff3851af5acf43b80d8291abe912fa661f55534b`。原生产基准：`28a42491a91036c5da8bedc163c3e2683a95fa8c`。本地分支：`fix/rks-semantic-scope-and-operations`。

开始时工作区干净，随后创建修复分支。仅改两个指定生产文件，新增独立测试及本目录；原测试断言、E1C/D/E/F/G 证据、Prompt、Golden、配置及完整性清单均未改。修复尚未达到“历史回归不下降”。用户随后明确授权“提交”，因此本提交仅保存 BLOCK 修复快照及证据，供人工检查；不表示修复验收通过，也不授权 push、合并、部署或发布。

已知 E1G 反例和八条商业命题已经修正，但扩大完整命题保护后出现正常编译回退。不能用局部测试通过代替全链路验收，也不能把下述离线 ready 当成真实项目状态。

## 1. 两文件改动及四类根因

实际生产差异见 [production-diff.patch](production-diff.patch)：134 行新增、39 行删除；没有修改完成器、pipeline、space-generation-core 或其他生产文件。

| 缺陷 | 原因 | 当前变化与证据 |
| --- | --- | --- |
| F1 条件作用域丢失 | 先分品牌，再单独验证功能残句，丢失整个并列命题上的条件/否定/未知范围 | 在原句进入分离前检查 scope；无法确定独立性时保留原句及 unresolved。Only if / If / Unless / 如果 / 只有 / 未确认 / 尚未确认及混合语言不再被拆成肯定事实。 |
| F2 残缺指代 | 全句正则允许任意关系接 it，以及残缺并列介词 | 移除通用 it 目标。仅保留局部已解析界面/柜台先行对象的限定关系及既有完整 circulation 限定语；it/this/that 不能独立提供位置。 |
| F3 未知功能项 | functional/architectural 来源分类被当成许可，sceneProgram 未进入最终 gate | 六个字段都进入完整命题检查；增加 invalid_field_shape、invalid_semantic_unit、原文、字段路径和原因。分类标签不再兜底授权。旧 normalizer 不再从未知关系中挑出有效子句丢弃其余部分。 |
| F4 商业动作误拦截 | 封闭的单动作、位置与关系语法不支持普通组合 | 动作与对象可组合，但每个并列谓词均须完整；增加菜单查看、办理入住、收款、结账位置以及中文物件位置关系。无项目/品牌专用白名单。 |

`separate-space-semantics.js:61` 的 scope 识别只提供否决，不赋予事实权限；`:75` 的动作规则只判断所给命题是否完整肯定，不判断其是否真实发生。

`validate-spatial-semantics.js:98` 定义字段证据，`:142` 统一校验六个字段，`:183` 保留分离轨迹，`:228` 阻断含未完成动作的品牌尾句，`:274` 与 `:310` 保留旧归一化入口的未知/条件内容。既有装饰降级函数和调用者仍有历史上下文限制，不能声称所有编译入口都已完成安全验收。

新增测试首次还发现两个二次分离漏洞：`staff operating equipment and serving customers并象征品牌未来`、`staff cleaning equipment and serving drinks并象征品牌未来`。后半句被品牌分类器命中但缺少独立主体，原实现会移走它而保留前半动作。当前对待迁移的品牌片段增加动作/载体混合否决，两条均保留原文并阻断。初次 156/158 记录没有覆盖或删除。

### 修改前后

| 输入/情形 | 基准 | 当前 |
| --- | --- | --- |
| Only if Logo and staff operating equipment | 分离为无条件动作，完成器 ready | 原句保留、unresolved、failed，0 模型回调 |
| 未确认Logo和员工操作设备 | ready | failed，原句保留 |
| equipment near it / reception equipment of it | pass | block |
| reception counter and with it / Logo and equipment near it | pass 或分离后 pass | block，残句不得补造位置 |
| functionalNetwork 中员工尚未操作设备 | ready | failed |
| functionalRelationships 中 staff operating equipment and enjoying cosmic essence | ready | failed |
| sceneProgram 中 If staff operating equipment | ready | failed |
| 明确分隔的 Logo; staff operating equipment | 可安全分离 | 仍可分离，品牌进入 brandRoleManifestation，来源确认状态不变 |

八条 F4 原命题当前全部 pass：staff operating equipment and serving customers；顾客在入口查看菜单；员工在柜台为顾客办理入住；工作人员使用收银机收款；Customers paying at the checkout counter；餐桌位于就餐区；取餐台位于点餐区旁；Menu at the service counter。每条附加条件、否定、未知谓词、混合语言品牌隐喻后均 block。新增测试还组合了零售扫描、接待付款、支付终端、等候座椅等通用正例。

## 2. 测试结果与基准对照

测试矩阵使用禁止 fetch/http/https/tls/tcp 的 Node 环境，并移除凭据相关环境变量；仅允许 TS 加载器本地 Windows 命名管道。补充诊断仅做本地读取/纯编译，并加载同一网络阻断模块，不调用凭据服务。假 Provider、假响应和本地合成图片仅用于原测试，不发生实际分析、生图、模型验证或收费。

独立对照工作区：`E:/Masterpiece-OS-Semantic-Scope-Baseline-Offline`，detached HEAD 为修复基准。外部依赖复用本地安装，`@masterpiece/*` 联接指向基准自己的包，避免对照误加载修复实现；没有 npm install 或远程获取。

| 检查 | 修复结果 | ff3851af 基准/说明 |
| --- | --- | --- |
| E1G 原独立审核 | 46/46 | 原基准 23/46；本次完整基准工作流复现这 23 项失败 |
| 本轮新增 | 158/158 | 新增测试，未更改历史断言；初次 2 个漏洞已按原断言修复 |
| E1E 原探针 | 19/19，错误 ready 例为 failed | [逐条结果](e1e-probes.json) |
| E1F 原定向 | 147/159，12 FAIL | 159/159 |
| E1F 原跨行业文件组 | 展开 43：36 PASS / 7 FAIL | 69/69；其中 2 个文件初始化失败，28 个原测试未展开，不能记作通过 |
| 完整 visual-workflow，含所有审核/新增测试 | 548：498 PASS / 50 FAIL | 416：383 PASS / 33 FAIL |
| 双请求 guard + transport | 独立复验 46/46 | 完整基准工作流中也通过；首次单独组为 45/46，见下文 |
| Golden | 5/5，Provider calls=0，未刷新 | G-04 NOT_APPLICABLE、G-05 NOT_READY 的既有语义保持 |
| repo:verify | FAIL | 合同通过后被冻结完整性漂移挡住；后续串联检查未运行 |
| current-flows | FAIL | 引擎 2/2 后命中历史 E1E 报告 Golden 边界告警；不能宣称完整 current-flows 通过 |
| repo:guard:test | 56/56 | 离线仓库反例检查 |
| 项目专用生产规则检查 | PASS | 没有项目专用规则新增 |
| Web Host / Web typecheck | 均 PASS | 单独执行，未借用 current-flows 的中断结果 |
| 根 npm test | 1697/1701，4 FAIL | 独立基准也为 1697/1701，同样四项失败 |

[test-results.json](test-results.json) 记录命令参数、执行目录、退出码、时长、日志绝对路径与 SHA256；[test-cases.json](test-cases.json) 列出每项结果及失败栈。完整原始日志保留在本地 `.codex-smoke/rks-semantic-scope/final/`。早期迭代日志也保留，未用最终成功覆盖失败证据。

针对性检查发现历史断言冲突后，没有宣称其全绿。之后完整工作流作为 BLOCK 范围诊断执行一次，未在每次微调后重跑全仓库。

### 原有与新增失败

[failure-attribution.json](failure-attribution.json) 逐项列出完整工作流 50 项失败、基准状态、归属、错误栈，以及 28 项未执行原测试。另见 [FAILURES.md](FAILURES.md) 便于逐项复核的索引。

- **10 项基准已有完整性阻断**：只读报告 RPC、公共 operation 完整性、baseline lock、Web 完整工作流、项目详情保存，以及 5 个正式假响应分析集成测试。这十项全部保留为 FAIL，未豁免。
- **5 项保护收紧导致的旧断言冲突**：sceneProgram 的 Logo 混合句原始 gate 被期待 pass；一个混合动线未知节点用例；三个 unsafe networks 用例。当前要求原文保留并阻断，与旧测试继续产出 review-only 编译结果的期待不同。没有修改这些期待，计入失败而非通过。
- **35 项新增回归或混合文件初始化阻断**：正常商业/建筑关系、原生目标程序、B1/既有方向编译与跨行业纯编译受到影响。这些不能被解释为“安全变严格所以可以忽略”。两个文件初始化错误同时包含本应阻断的待确认内容与未被识别的合法关系，不能把文件内 28 项原测试算成已经验证。

E1F 定向的 12 项失败由上述 5 项断言冲突和以下 7 项回退组成：厨房与入口混合关系；两项中文视线关系；外立面隐私禁止条款；off-frame 运营禁止条款；reference-first 目标程序；continuation 目标程序。

已定位的具体根因见 [failure-diagnostics.json](failure-diagnostics.json)：

1. 功能字段的受限语法未覆盖既有复杂建筑陈述，例如带 Reception: 场景前缀、员工/访客两侧用途、隐私边界及长并列关系。直接可见性建筑条款的 E1F 全句测试已恢复，但功能网络和关系中的同类语义仍误阻断。
2. 设计约束中的否定（如 `Storefront access must not expose kitchen or dining interiors`、`enter the consultation unit without a lobby hierarchy`）被通用 scope 否决。它们不是“经营活动未发生”的描述，需要按字段契约区分。
3. 投影产生的目标程序句（如 `consultation is primary`、`seating supports 1-to-1 / 1-to-2`、半私密边界和咨询内部动线）未被完整字段语法覆盖。没有修改目标程序来迁就校验。
4. 普通中文关系 `展示界面连接比较工作台，服务通道位于两侧` 及 `takeaway handoff keeps a clear route` 被误阻断，分别影响 custom preview 和 B1 shadow。
5. 历史适配器会把长句转换成局部段落；例如 FTT 中产生 `形成高效服务动线; 支持多场景消费`。不能给这种缺少对象的结果直接补发权限。原句、上下文与投影之间的契约尚需处理。

根级四项均在本轮基准复现：两个 Golden 边界测试命中历史 `rks-02e1e-integrity-review/regression-results.json:2`；两个仓库政策测试分别涉及既有 review.md 与五张既有 PNG。没有清理或改写它们。报告生成后重新扫描 Golden 边界，仍只有该历史 JSON 命中，无本轮新增命中。

guard 首次失败是 `timeout with late successful response keeps unknown status and never refunds`，30ms 超时用例在根级测试同时运行时请求记录仍为 0；同组其余 45 项通过。并发测试结束后独立复验 46 项全部通过，完整工作流中该用例也通过。代码、guard 和原断言未动；这是已复现的一次时序不稳定，不能仅凭复验通过声称根因已彻底消除。

## 3. 历史 Packet 与来源状态

[historical-replay.json](historical-replay.json) 验证 13 个归档产物、7 个归档报告摘要；原六处分离成功，unresolved=0，重复分离的历史定向测试通过。原始动线、菜单、座位、取餐、就餐内容保留，候选模型回调与网络调用为 0。

原 Packet SHA256：`a226ddddbd0e21c648fed3d6a4d0fd91d092eafbe3f03c66687298003e8050d3`。[source-state-preservation.json](source-state-preservation.json) 额外比较回放输出：projectFacts、provenance、userConfirmedFields 均与原输入相同。整个原始 Packet 文件未变，真实项目、账本和 LIVE 状态未变。

OFFLINE_CANDIDATE_PASS / ready 仅是这一次本地 Packet 分离回放的状态，不代表本轮整体通过，不代表历史项目完成或生成质量合格。

新增六字段完成器测试为每个字段同时提供一个合法项和一个未知/条件项，确认仍 failed、模型回调为 0，原文保留，sidecar 中可定位 field、original、reason 与 evidence.validation=block。已有 `unresolvedFields` 主要反映结构充分性；语义失败原因在 `spatial-semantic-validation.repaired.json`，不能只看前者判断没有问题。

## 4. 顺序、额度和兼容路径

生产控制流未改：公共 operation 先 verifyImplementation/baselineGuard；pipeline 检查素材、独立凭据与配置，并可能先完成 DCD/UVU；完成器进行迁移、来源/结构充分性检查，再调用确定性空间校验与分离，之后才可能进入可选结构化模型修复，最后重新校验语义和充分性。它早于完成器中的可选模型修复，**不早于所有 DCD/UVU 请求**。

E1F 原顺序及本地异常测试继续通过。E1G 的 A/B 区分继续通过：A 在两次假响应之后遇纯语义失败时不尝试第三次；B 其他路径主动尝试第三次时仍 DISPATCH_LIMIT，实际假发送仍为两次。实验 guard 仍须显式注入，不把它描述为新增加的全局生产额度。请求次数、重试规则均未改。

正式公共入口的五项假响应分析集成测试仍被完整性挡住：第一项 ANALYSIS_STOPPED，其余四项在实际假发送 0 的断言处失败。A/B 组合测试不能替代将来合法同步后的正式入口回归，也未删除旧集成测试中关于 DISPATCH_LIMIT 的断言。

**独立兼容风险**：完成器缺少 deterministic 回调时，仍可能调用旧 repairInvalidFinalPacket 并将修改后的 Packet 返回 ready；E1G 对此的 PASS 只是行为刻画，不是安全验收。当前唯一生产完成器调用提供所需回调，不能据此批准其他旧调用方式。独立 compiler 的旧输入/投影路径也有只保留 review trace 的行为，本轮没有改三个受限调用文件，不主张所有入口已具备等价保护。

## 5. 冻结与 SHA256

开始时保存全部 3020 个原跟踪文件摘要；结束时仅以下两个获准生产文件变化，其他 3018 个全部相同。新增文件另列，不计入原文件不变数量。[protected-files.json](protected-files.json) 提供每个文件的前后值，[protected-roots.json](protected-roots.json) 核对 13 个历史保护根全部一致。

| 文件尾名 | 修改前 SHA256 | 修改后 SHA256 |
| --- | --- | --- |
| separate-space-semantics.js | 7e9fba30bb8425b61b3a193a20a545b102b37086e13f7872fc14a8931f704e74 | e8615c0cc49176769cc39f9b9393767b318b9de1b28a65e2fce20b869fb2bed0 |
| validate-spatial-semantics.js | 482efec843a0cdb113c3914fe051fcea1e5a768ec437517636a2ed089c18e81f | ff084eedfeb19d4ae177788fccc2f792cea41ed80cad6d02ab1af1a3dc162932 |

完整性清单前后 SHA256 均为 `85947e556d9467837f7583c106f5f7fec10f65207ed9b2c31b410ae7c2f13bec`，更新条目 0。仍有原五个条目漂移，其中这两个条目的实际摘要因本轮修复进一步改变；不能用“漂移仍为五项”宣称无代码变化。[integrity-review.json](integrity-review.json) 列出清单值、基准 Git blob 值、修改前与修改后磁盘值。verifyImplementation 本身完全未改。

无原项目写入、无历史账本重置、无原素材/E0/P7B/B1/Seedream 修改、无 Prompt/Golden 刷新、无真实凭据读取或收费请求。本地临时测试项目和合成输出不属于真实项目交付。

## 6. 剩余阻断与后续最小范围

**BLOCK：不可作为修复完成提交，不可进入 E1H。** 按用户追加的提交指令，将当前 BLOCK 工作保存在本地修复分支；等待人工决定后续修复，不扩展范围或进入 E1H。

下一步应先为“肯定经营事实”“设计约束/隐私禁止条款”“完整建筑关系”“未知命题”建立明确的字段语义区别，恢复上文定位的合法关系，而不是加入项目白名单或任意载体词兜底。复核旧适配器切分/投影后的片段能否保留原命题与上下文；若必须改 source-adapter/compiler 接线，应单独记录必要性和影响范围。

五项旧断言冲突需要人工确认契约迁移，不能由本轮修改原断言获取通过。35 项新增或混合阻断必须逐项解决、28 项未展开测试必须真实运行；正式两次响应入口的十项既有阻断仍单独列账。在这些问题解决前不启动重新独立审核的通过流程，更不以离线结果批准正式分析、生图、清单同步或发布。

环境记录：一次删除本轮新建依赖联接的命令被自动审批以 blocked by policy 拒绝，未执行。该工作区保留；之后在全新 Offline 基准工作区添加依赖联接，未覆盖或清理任何用户工作文件。
