# RKS-02E1F · 语义证据边界定向修复

**状态：定向修复已提交供独立人工审核；完整性同步与正式运行继续阻断。不是全闸门通过，不是项目 completed / ready。**

基准：Alpaca-go/Masterpiece-OS 的 fix/rks-spatial-semantic-separation，ff1f076dfada89268393b6624d5294b4254506a3。开发分支：fix/rks-semantic-evidence-boundaries。没有合并、部署或发布。

## 生产变更与 P1 行为对照

本轮只改独立工作流的四个生产文件，新增一份测试和本报告目录。原有测试期望、冻结 Prompt、Golden、Seedream 配置、verifyImplementation 和完整性清单均未修改。真实 diff 见 [production-diff.patch](production-diff.patch)，四文件基准 Git blob 与当前文件 SHA256 见 [production-hashes.json](production-hashes.json)。E1D 第五个文件 space-generation-core.js 本轮没有改动。

| 文件 | 修复与审查范围 |
| --- | --- |
| separate-space-semantics.js | 经营活动、设备操作、物理效果与载体关系改为完整单元匹配；否定、未发生和未知尾句不获正向证据。明确对象用途与位置关系保留，不依据对象数量推断其正确性。 |
| validate-spatial-semantics.js | 删除任意载体子串放行；完整用途/位置短语及有界空间关系语法才可通过。母题、颜色、隐喻、身份与装饰分类不能借此兜底。品牌分离后的所有保留门禁字段重新校验；保留 unresolved 和分类证据，不丢弃失败余项。 |
| analysis-completion-orchestrator.js | 在结构/来源/充分性评估后、可选结构化模型修复前执行纯空间检查与分离；每个模型批次前再检查，最终再检查。未解决项或本地异常立即失败，禁止借模型补造证据；最终充分性不能把失败提升为 ready。 |
| pipeline-service.js | 仅增加分离证据传递；在克隆 Packet 的 spatial 内应用分离，保留事实、来源、锁定资产与模型配置。 |

载体漏洞：equipment conveying happiness、带母题的桌/柜台等由错误 pass 改为 block。设备操作漏洞：否定、不会、尚未及肯定片段后的未知尾句由错误 functional/pass 改为 block。原有明确经营行为仍通过。

混合字段：Logo and equipment conveying happiness 原来剥离 Logo 后变为 ready；本轮保持 failed，保留原句和未解决原因，模型回调 0，输入 Packet 未变。正常六处分离仍可执行。完整语义通过只说明命题类型合适，**不是用户确认或现场事实证明**。追踪项明确 semanticOnly=true、sourceConfirmation=unchanged，缺失行业事实/材料证据不会被补造。

## E1E 的 19 条阻断探针

19/19 符合原审查预期；修复前有 13 条不符合预期。表中“修复后”为原句门禁 / 分离后门禁。原审计文件未改。

| # | 原始命题 | 修复前 | 修复后 | 原预期 |
| --- | --- | --- | --- | --- |
| 1 | equipment conveying happiness | pass | block / block | block |
| 2 | 砂锅传递幸福感 | pass | block / block | block |
| 3 | 设备自动治愈顾客 | pass | block / block | block |
| 4 | 在设备旁员工畅想未来 | pass | block / block | block |
| 5 | petal curved counter | pass | block / block | block |
| 6 | lotus layered table | pass | block / block | block |
| 7 | 花瓣曲线桌 | pass | block / block | block |
| 8 | Logo and equipment conveying happiness | block | block / block | block |
| 9 | staff operating equipment and enjoying cosmic essence | pass | block / block | block |
| 10 | 员工操作设备并畅想未来 | pass | block / block | block |
| 11 | 员工没有使用设备 | pass | block / block | block |
| 12 | 员工不会操作设备 | pass | block / block | block |
| 13 | 员工尚未操作设备 | pass | block / block | block |
| 14 | staff operating equipment | pass | pass / pass | pass |
| 15 | Waiting area seating | pass | pass / pass | pass |
| 16 | 入口处的菜单 | pass | pass / pass | pass |
| 17 | Logo吸引顾客点餐 | block | block / block | block |
| 18 | staff not operating equipment | block | block / block | block |
| 19 | unresolved rendezvous | block | block / block | block |

详见 [probe-comparison.json](probe-comparison.json)，包含分类、分离片段及未解决项。旧探针脚本中的 orderingScope.note 是 E1E 固定描述，不代表当前顺序；本报告记录实际事件，新测试单独验证可成功分离后再进入结构化修复的顺序。

## 历史 Packet 只读回放

核验 13 个归档产物及 7 个归档报告；输入 Packet SHA256 为 a226ddddbd0e21c648fed3d6a4d0fd91d092eafbe3f03c66687298003e8050d3。仍为六处显式分离，unresolved=0；原始功能动线、菜单、座位、取餐、就餐信息保留，原始 Packet 不变。候选回放 OFFLINE_CANDIDATE_PASS；候选模型与网络调用均为 0。

历史回放中的 before 是既有脚本的拒绝模型回调演示，不能解读成真实调用或当前候选调用。历史场景没有重新执行 LIVE 会话。明细见 [historical-replay.json](historical-replay.json)。

## 实际执行顺序与成本边界

正式生产接线顺序是：公共完整性校验、配置/凭据和输入准备 → 原有 DCD/UVU 分析与报告/结构解析 → Packet 迁移及来源/充分性评估 → 纯空间语义检查、分离、重新校验 → 必要时的确定性结构修复/默认值与可选结构化模型修复（每批次前再检查空间语义）→ 最终语义和充分性校验。

纯语义检查发生在 Packet 存在且足以检查之后，不能提前到 DCD/UVU 之前；它不能替代结构、凭据或缺失证据检查。语义失败/本地异常时完成器的新增可选模型调用为 0，但若正式入口将来通过，较早的 DCD/UVU 仍可能已经消耗请求。没有扩大请求额度；MAX_REPAIR_ATTEMPTS 仍为 2，双请求 guard 的额度和 transport 规则未动。

生产接线提供 deterministic 回调后，未解决语义直接失败，不再调用可选空间模型修复。未提供该回调的旧调用者仍保留旧兼容路径，因此不能宣称所有可能调用者都保证先做纯语义检查。生产中的旧空间修复回调定义仍在，但本接线不会为未解决语义调用它。以上是代码与离线调用证据，非正式入口成功证明。

## 离线验证

全程使用网络原语阻断器，测试进程仅使用注入的假 Provider 或抛错回调。未读取或使用真实凭据，未请求真实模型/生图/收费服务。套件相互重叠，不累计用例总数。

| 套件 | 结果 |
| --- | --- |
| 针对性、完整命题负例、结构顺序与本地异常、方法论 | 159/159 PASS |
| E1E 审查探针 | 19/19 符合预期 |
| 历史 Packet 回放 | 六处分离；零候选模型/网络调用 |
| 跨行业、既有建筑语言、历史影子 | 69/69 PASS |
| 完整 visual-workflow | 370 项：360 PASS / 10 FAIL |
| 双请求 guard + transport | 46/46 PASS |
| 正式双假响应集成（包含在完整工作流内） | 6 项：1 PASS / 5 FAIL；完整性入口阻断 |
| verify:current-flows | FAIL：引擎 2/2；Golden 边界命中基准已有历史报告，组合命令中断 |
| 单独补跑 Runtime 应用测试 | 1294 项：1292 PASS / 2 FAIL，均为独立工作流完整性阻断 |
| repo:verify | FAIL：Repository Contract PASS，随后完整性漂移阻断 |
| 根 npm test | 1701 项：1697 PASS / 4 FAIL |
| 独立 ff1f076 基准根 npm test | 1701 项：1697 PASS / 相同 4 FAIL |
| Golden 场景 | 5/5 PASS；零 Provider 调用，未刷新 |
| Node Host / Web typecheck | PASS / PASS |
| 仓库 guard 反例测试 | 56/56 PASS |
| 项目专用生产规则检查 | PASS |

首轮完整工作流为 335/369，额外 24 项失败来自新规则过度阻断完整空间关系；针对性补充完整关系识别并检查未知尾句后，24 项全部恢复。原测试期望未变。第二轮 356/370 的四项方法论失败也已按完整对象关系定位并修复，最终只余原始十项。命令、退出码、计数、时长、完整日志位置及 SHA256 见 [regression-results.json](regression-results.json)。日志在 ignored 的 .codex-smoke/rks-02e1f，不包含真实 Provider 原始响应。

### 原有十项失败逐项状态

| # | 用例 | 状态 |
| --- | --- | --- |
| 1 | read-only existing report RPC supplies suggestions for missing directions without creating any decision files | FAIL：完整性入口阻断，未恢复 |
| 2 | public operations verify the approved implementation before registration, compilation, generation and Logo composition | FAIL：完整性入口阻断，未恢复 |
| 3 | baseline lock prevents input/model/code drift and old tasks; other projects remain independent, zero network | FAIL：完整性入口阻断，未恢复 |
| 4 | guarded public web operations save, confirm, compile, generate, reopen and invalidate on an analysis request | FAIL：完整性入口阻断，未恢复 |
| 5 | explicit details save persists identity, retains artifacts and requires new analysis/confirmation without calling models | FAIL：完整性入口阻断，未恢复 |
| 6 | formal create/import/analyze via injected provider succeeds with exactly two fake HTTP responses | FAIL：完整性入口阻断，未恢复 |
| 7 | formal UVU parse path does not retry after invalid JSON | FAIL：完整性入口阻断，未恢复 |
| 8 | formal spatial semantic repair is blocked; existing semantic gate still fails | FAIL：完整性入口阻断，未恢复 |
| 9 | formal structured decision repair catches errors but cannot obtain a third dispatch | FAIL：完整性入口阻断，未恢复 |
| 10 | formal report validation is not bypassed by two-call budget logic | FAIL：完整性入口阻断，未恢复 |

首个正式集成用例的外层错误为 ANALYSIS_STOPPED，其余四项在假发送次数断言失败（实际 0，原期望 1 或 2）。根因均为 verifyImplementation 在发送前拒绝漂移。不能据此宣布“两次响应正式分析通过”或异常边界已经端到端验证。

另有一个需下一阶段明确审查的既有断言：formal spatial semantic repair… 要求出现 DISPATCH_LIMIT 阻断的第三次尝试。本轮设计是在纯语义失败时根本不尝试第三次模型调用；清单同步后此旧断言可能与新节省请求的行为冲突。此轮保留原测试期望，不提前改绿；下一阶段须在独立审查确认契约后处理，并再次验证实际发送次数、状态及异常边界。

### 根级失败的独立基准对照

E:/Masterpiece-OS-RKS-02E1F-Baseline-ff1 是 ff1f076 的独立 detached 工作区，保留供复核。根测试的四个失败与当前分支逐项相同：

1. 两项 repository-policy 仍分别命中历史的两个 review.md 和五个 PNG，与 E1E 已确认问题相同。
2. Golden production boundary gate passes the repository，以及 P2-I Group H — existing Golden boundary verifiers remain PASS，均命中 E1E regression-results.json 第二行的纯审计文字。扫描器对 JSON 原文的宽泛模式把该文字当作读取评估资产；独立基准同样复现。这两项在 E1E 报告提交之后出现，因此不能继续沿用先前仅“两项失败”的数字。

本轮没有改历史报告，也没有降低扫描器规则；这四项不是 E1F 生产改动引入的差异。

## 冻结保护、完整性与剩余风险

完整性清单更新条目为 0；清单 SHA256 始终为 85947e556d9467837f7583c106f5f7fec10f65207ed9b2c31b410ae7c2f13bec。E1D 的五项清单漂移仍保留，四项本轮继续变更，Core 导出本轮不变。verifyImplementation 未绕过、替换或禁用。

以 E1E 已保存的逐文件摘要为比较锚点，复核原项目、隔离项目、账本、LIVE 产物、输入冻结、P7B、餐饮影子、离线知识、Prompt、合同配置、Golden 等 13 个根目录/文件，均未变化；E1E 八个审计文件与基准 Git blob 一致。见 [preservation.json](preservation.json)。这不是新捕获的 E1F 开始前快照。Git 变更范围未触及 E1C/D/E 历史记录、原素材、E0、B1、策划或迁移实现。

仍需独立审核的风险：完整语义规则是保守的有界语言子集，不能证明所有自然语言命题正确，未覆盖的表达会阻断；既有非可见性字段的来源分类不等同于完整自然语言事实验证。本轮不会把语法肯定句提升为来源已证实事实，也不会解析新行业知识或补出设备、尺寸、活动。复杂关系规则的覆盖范围需继续用独立反例审核，不能从当前探针全过推广为普遍语义安全。正式公共入口的成功路径尚被完整性冻结挡住；目前没有生成质量验收证据。

下一阶段先独立审核四文件 diff、完整命题规则和失败即阻断的顺序；审核批准后才考虑另行受控完整性同步，再跑正式双假响应集成与全部闸门，并单独处理基准历史报告扫描问题。当前不进行同步或正式运行。提交后停止，等待人工审核。
