# RKS-02E1D · 空间语义失败离线诊断与最小修正

**结论：真实历史 Packet 的离线候选回放通过；尚不具备正式运行验收资格。** 源项目仍为 `failed / missing`，原 LIVE 账本仍为 `terminated`、两次请求。没有重新分析、模型派发、生图、方向确认或状态改写。

开发分支：`fix/rks-spatial-semantic-separation`，从 `codex/rks-ftt-two-dispatch-guard` 的 `2302aa9fd39af0cee613e98f1e1a54cdd94b741e` 建立。没有清理或覆盖已有本地文件，未提交、推送、合并、部署或发布。

## 1. 先验证归档，再读取和回放

修改前逐字节验证 LIVE 归档的 **7 份报告、13 份实际产物**，包括本任务要求的五类文件：

| 文件 | 已核对的 SHA256 |
| --- | --- |
| `visual-decision-packet.json` | `a226ddddbd0e21c648fed3d6a4d0fd91d092eafbe3f03c66687298003e8050d3` |
| `视觉方案升级报告.md` | `6d2d0da96ed7e2192891f0f28223ec443e46a54128be71fff154a747503f2d76` |
| `analysis-repair-audit.json` | `e8d7ca081a2883e8f6d3a308a5d3d0ccc06ec7509b9fc7c2ce88d725863da084` |
| `spatial-semantic-validation.initial.json` | `413fa4ede0e38cd885535dfd6fed2a0e290e1ddb372e57d0d0960baf6c2f5fb3` |
| `failure-diagnosis.json` | `aab41692f4b91654f0c33d4e3d8de0f6acbb639824aa5331ba465567e299d98a` |

依据为原 [LIVE artifact manifest](../ftt-live-analysis/artifact-manifest.json) 和 [报告校验表](../ftt-live-analysis/report-checksums.json)，未刷新它们。完成修改后再次核对 9 个保护对象的完整树/文件摘要：原用户项目、隔离项目、固定账本、LIVE 报告、E1C 冻结报告、P7B 报告、RKS Shadow 报告、独立知识资产和 `implementation-integrity.json` 全部不变。详见 [archive-and-preservation-proof.json](archive-and-preservation-proof.json)。

本轮未读取任何真实凭据；测试预加载器拒绝 HTTP、HTTPS、TLS 和 TCP 连接。只允许 TypeScript 加载器需要的 Windows 本地命名管道 IPC。测试注入的假 client 只处理临时合成项目，不是 Provider 派发，也没有进入真实项目。

## 2. 根因 A–E：原始字段、依据与复现

完整逐字段原文和分类命中在 [field-replay.json](field-replay.json)：覆盖 functionalNetwork、functionalRelationships、mustBeVisible、sceneProgram、brandRoleManifestation、peopleBehavior；修改前实际清理复现在 [old-cleanup-reproduction.json](old-cleanup-reproduction.json)。这些记录来自已验证的真实 Packet，不以错误代码代替字段检查。

### A. 模型有没有真正的空间功能内容？

**有。** 原始服务序列包含进入、查看菜单、点餐、等候、取餐、就餐、离开。另两条 functionalNetwork 原文是：

> 员工动线：厨房→出餐口→清洁区，与顾客动线最小交叉
>
> 外带动线：点餐→等候→取餐→离开，与堂食区域部分分离

functionalRelationships 五项原文包括入口与点餐直接连接、点餐与等候相邻、等候与就餐分隔、厨房与出餐口连接及部分可见、外带与堂食分离。候选保持五项逐字不变。

sceneProgram 已列菜单、点餐台、等候座位、就餐桌椅、厨房部分开放和外带取餐/包装。DCD 报告另有厨师舀汤、食客、餐桌照明和空间材质建议，证明输出并非完全没有经营内容；本修正没有把 DCD 文字自动补进 UVU Packet。

这些内容仍属于模型提案，不是物业实测或新用户确认。自助点餐机、清洁区等沿用现有 Packet 提案来源，不能据此声明原素材已证实其存在。场地尺寸、设备规格、消防条件、预算仍未知；候选没有补造它们，也没有新增 peopleBehavior（原来是空数组）。

### B. 有没有功能与品牌信息混在同一条目？

**有，且不限于两条报错。**

| 原字段原文 | 功能成分 | 品牌成分 |
| --- | --- | --- |
| functionalNetwork[0]：`顾客进入→品牌标识吸引→菜单查看→点餐→等候→取餐→就餐→离开` | 完整服务先后顺序 | `品牌标识吸引` |
| mustBeVisible[0]：`入口处的品牌标识和菜单` | 入口处的菜单 | 入口处的品牌标识 |
| sceneProgram[0]：`品牌入口：标识、菜单、吸引力` | 原入口标签下的菜单 | 标识、吸引力 |
| sceneProgram[2]：`等候区：座位、品牌影像、取餐提示` | 座位、取餐提示 | 品牌影像 |
| sceneProgram[3]：`就餐区：桌椅、照明、品牌元素` | 桌椅、照明 | 品牌元素 |

### C. 分类器有没有过度判定 mixed 为 decorative_identity？

旧分类先检测 `identityRe` 中的“标识”等词，优先级高于空间词、动作词和来源字段。因此 functionalNetwork[0] 命中 `标识`，mustBeVisible[0] 也命中 `标识`，两条整体都变成 `decorative_identity`。命中详情包含 motifHits、archHits、propertyHits 等，均保存在逐字段回放中。

整体拒绝让品牌标识获得功能权限是必要保护；问题是后续只把整句当作污染项，缺少按明确分隔符保留真实功能片段的步骤。候选**仍拒绝未分离的原混合句**，不提高功能词优先级来放行整句。只在箭头/并列分隔及明确位置前缀足以支持分离时处理；无法分离、存在未知片段或缺少剩余功能证据时保持阻断。

另有两个可复现的词法问题：旧实现把“收银机”中的单字“银”当色彩；“品牌色彩系统的层次化应用”没有实际颜色名，却因“层/层次”被当成 architectural。候选分别限制该词法碰撞并将纯品牌系统描述归回品牌语义，没有为其授予功能或结构权限。

### D. mustBeVisible 是否走错分类入口？

**是。** 旧 gate 明确将 `mustBeVisible` 映射为 `functionalNetwork` 再调用 classifyPhrase，绕过专用的人员活动、可见物理效果和未知可见要求规则。

例如 `unresolved rendezvous` 在 functionalNetwork 的来源回退中是 functional；按 mustBeVisible 应为 ambiguous / unresolved_visible_requirement。`文字招牌与标语` 的专用身份保护也只在 mustBeVisible 路径触发。候选使用真实字段入口，未知/假设/否定活动及纯装饰继续阻断。

兼容边界单独处理：已经明确给出的 `arrival point`、`service point`、`Waiting area seating`、咨询桌/座位/设备、明档内砂锅等载体可供分析校验使用，**不改变渲染器既有分类或让它们自动生成建筑细节**。这样保持既有非餐饮请求和历史影子 Prompt 摘要，不靠修改 Golden 达成兼容。

### E. 为什么既有确定性清理没能无模型解决？

1. 原通用充分性校验只发现焦距和画幅默认值，未把两条空间语义污染交给前置确定性步骤。
2. 空间门禁阻断后，`repairInvalidFinalPacket` 先 `await baseReasoner(...)`。该 await 在只捕获 JSON 解析错误的 try 之外；两次额度已用完时，监护器抛 `DISPATCH_LIMIT`，直接退出回调。
3. `sanitizeSpatialSemanticsDeterministically` 放在模型循环之后。发送前抛错不会走到它，orchestrator 最终保留失败。真实 audit 的修复 modelCallCount=1 是接口尝试，不是第三次网络请求。
4. 离线强制运行旧清理也不是可靠解决：它先按 finding 索引把整个混合项设为 null，再调用 normalizer，客户服务主路径和入口菜单会一起丢失。复现中 gate 虽变 pass，却丢掉这两项；品牌色彩层次句还可继续混在可见字段。单纯删除报错行不满足本任务。

## 3. 最小修正及修正前后

只修改 5 个独立工作流生产文件，约百余行增量。实际 diff 是 [code-changes.patch](code-changes.patch)，逐文件前后摘要是 [code-changes.json](code-changes.json)。

| 文件 | 实际修改 |
| --- | --- |
| [separate-space-semantics.js](../../src/generation-runtime/space/semantic/separate-space-semantics.js) | 增加有明确设备的员工操作证据、菜单载体证据及否定保护；修正收银词法碰撞与纯品牌系统分类 |
| [validate-spatial-semantics.js](../../src/generation-runtime/space/semantic/validate-spatial-semantics.js) | 使用 mustBeVisible 自身入口；明确载体兼容；纯函数按原文分隔符分离功能/品牌，返回变更与未解决项 |
| [space-generation-core.js](../../src/generation-runtime/core/space-generation-core.js) | 通过独立功能的现有 Core 边界导出分离能力 |
| [pipeline-service.js](../../src/runtime/pipeline-service.js) | 接入确定性回调，只在克隆 Packet 的 spatial 中分离，不改项目事实、Locked Assets、设计来源或模型参数 |
| [analysis-completion-orchestrator.js](../../src/analysis-decisions/analysis-completion-orchestrator.js) | 在可选模型修复之前运行确定性步骤并重新校验、保存变更证据；本地异常停止；失败后也记录剩余充分性缺失，不把 failed 改为 ready |

| 原项 | 候选保留的功能层 | 保留到品牌表达层 |
| --- | --- | --- |
| 顾客进入→品牌标识吸引→菜单查看→点餐→等候→取餐→就餐→离开 | 顾客进入→菜单查看→点餐→等候→取餐→就餐→离开 | 品牌标识吸引 |
| 入口处的品牌标识和菜单 | 入口处的菜单 | 入口处的品牌标识 |
| 品牌色彩系统的层次化应用 | 不授予功能可见权限；其他四项可见证据保留 | 原句完整保留 |
| 品牌入口：标识、菜单、吸引力 | 品牌入口：菜单 | 品牌入口：标识；品牌入口：吸引力 |
| 等候区：座位、品牌影像、取餐提示 | 等候区：座位；等候区：取餐提示 | 等候区：品牌影像 |
| 就餐区：桌椅、照明、品牌元素 | 就餐区：桌椅；就餐区：照明 | 就餐区：品牌元素 |

位置前缀仅复用原文已明确提供的部分；箭头只保留原有服务顺序，不增加节点或声称新的物理邻接。品牌层迁入不等于允许渲染 Logo，原有 post_composite 和品牌/装饰保护继续有效。

纯品牌字段不能被清空来换取通过；`Logo吸引顾客点餐`、未知愿景等不可安全分离的表达保持原句与失败。候选不增加任何未给出的区域、设备、活动或尺寸。相同输入重复分离结果不变，原 Packet 对象与磁盘文件不变。

## 4. 离线回放与回归

使用 [replay.mjs](../../tests/restaurant-knowledge/spatial-semantics/replay.mjs) 显式读取归档 manifest，先查 SHA256，再在内存装载基准 Git 分类器/门禁/编排进行对照；不会调用正式 analyze、查找凭据或自动发现本地项目。历史修复拒绝仅用抛错模拟，不提供假模型结果，更不把它写进真实项目。

```powershell
node packages/visual-workflow/tests/restaurant-knowledge/spatial-semantics/replay.mjs packages/visual-workflow/reports/ftt-live-analysis/artifact-manifest.json .codex-smoke/rks-02e1d/review-replay
```

实际回放：旧实现 `failed`；候选在内存中完成 **6 处可追溯分离**，空间门禁 pass，完成器 ready，**modelCallCount=0 / 网络调用=0**。只能记为 `OFFLINE_CANDIDATE_PASS`。候选 Packet 留在 ignored 的 `.codex-smoke/rks-02e1d/final-replay/offline-candidate-packet.json`，没有写回项目。

新增 [separation.test.ts](../../tests/restaurant-knowledge/spatial-semantics/separation.test.ts) 使用带真实源 SHA256 的固定字段摘录；普通单元测试不依赖机器本地项目。反例包括混合字段、原位前缀、员工/顾客活动、设备操作、纯品牌、未知/否定/愿望、不可分离语句、信息不足、重复处理、本地异常和跨行业保护。

| 检查 | 最终结果 |
| --- | --- |
| 针对性＋可见性/场景边界回归 | **117/117 PASS** |
| 非餐饮请求字节一致＋既有餐饮影子摘要＋新反例 | **69/69 PASS** |
| Shared Core 既有空间语义/路由保护 | **19/19 PASS** |
| 冻结双请求监护器及原生单次传输 | **46/46 PASS**；未改监护器或限制 |
| 仓库 guard 反例 | **56/56 PASS** |
| Golden | **5/5 场景 PASS**；Provider calls=0；Golden auto-updated=NO |
| Node Host / Web typecheck | **PASS / PASS** |
| 独立工作流完整测试 | **329 PASS / 10 FAIL，共 339** |
| `repo:verify` | **FAIL**：实现摘要与冻结记录不一致 |
| `verify:current-flows` | 引擎 2/2；Runtime **1292 PASS / 2 FAIL**，均为同一完整性入口阻断；未通过完整闸门 |
| 根 `npm test` | **1699 PASS / 2 FAIL，共 1701**；失败为已有仓库交付物/栅格资产策略，本轮未修改其指向文件 |

这些套件有重叠，不能相加宣称独立通过总数。完整工作流剩余 10 项位于生产完整性依赖的公共入口及其监护集成测试；其中后者被外层转成 ANALYSIS_STOPPED/调用数不符，不能算通过。完整性记录未获本轮独立更新，按仓库约定保留失败，未绕过 verifyImplementation。测试详情和失败清单在 [regression-results.json](regression-results.json)。

精简套件日志保存在 [logs/](logs/)；完整工作流、current-flows、根契约的原始失败日志保留在 ignored 本地目录，绝对路径和 SHA256 均在 regression-results。最初迭代日志亦保留，没有覆盖原 LIVE 证据。

## 5. 风险、未解决项与下一轮验收

- **仅可进入离线代码和字段人工审阅，不能进入正式运行/生图验收。** `repo:verify`、current-flows 未过，完整回归不能宣称全绿。
- 源码变化会使旧 `implementation-integrity.json` 拒绝公共操作，这是保留的生产保护。按“不得自动刷新 Prompt/Golden/完整性记录以消除失败”的约定，本轮不改该记录。若人工接受候选，仍需单独审阅实现摘要更新及其回归，不复用已耗尽的 LIVE 会话。
- 语义分离依赖明确原文边界与有限正向证据，不是通用自然语言理解器。含歧义、隐喻、否定、未知片段或没有剩余功能证据时保留失败，不应自动补齐。
- 既有显式载体的分析许可与渲染器执行所有权分开保留；本轮没有把所有 ambiguous 可见项升级为强制画面要求。历史 Prompt 摘要一致不等于画面质量已验收。
- 模型输出中的色彩、材质、设备和开窗等仍有提案/假设边界；不能用新 Packet 覆盖 E0 社区四川小馆、亲民堂食、市井烟火气、开放明档、项目材质候选和照明假设。
- P7B、B1 数据、原始十图、输入冻结、知识验证状态、模型/Seedream 5.0 Pro、Provider adapter、Prompt 和双请求账本均未更改。策划/迁移、公共宿主、路由、依赖及根 lockfile 未改动。

**完成后停止，等待人工审核。原 RKS-02E1C-LIVE 保持正式失败，不补跑，不发起新的分析或生图。**
