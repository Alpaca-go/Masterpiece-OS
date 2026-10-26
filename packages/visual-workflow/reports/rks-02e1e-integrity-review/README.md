# RKS-02E1E · 实现完整性复核与受控同步决策

**结论：审核不通过；完整性同步未执行；不可记为“代码集成候选，可提交人工合并审核”。**

本轮发现可见性载体兜底误放行、品牌母题保护回退及设备操作证据的否定/尾句漏洞。原有 10 项完整工作流失败全部仍存在。真实项目没有被分析、验证、生成或改写，不能据此宣布 completed / ready。

基准分支：`fix/rks-spatial-semantic-separation`。本地 HEAD 与 `git ls-remote` 查得的远程提交均为 `de0df03a4ef40dc6e7fbd5ba3d2152d5fbf87743`。E1D 原始基线为父提交 `2302aa9fd39af0cee613e98f1e1a54cdd94b741e`。本轮新增本报告目录及测试目录内的独立审查探针；没有修改生产文件、原测试、Prompt、Golden、历史报告、完整性记录或授权。

## 1. 五个生产文件审核

已读取仓库规则、基线锁与独立工作流 AGENTS；独立提取实际 [Git diff](production-diff.patch)，按 Git blob 和磁盘原始字节计算 SHA256，并逐项对照 E1D 的历史 `code-changes.json`。五项完全一致；完整性清单也恰有这五项漂移，没有额外漂移。

| 文件（相对独立工作流 src） | 审核结论 | 依据与限制 |
| --- | --- | --- |
| `analysis-decisions/analysis-completion-orchestrator.js` | 有范围限制，不能整体批准 | 确定性空间分离先于可选空间模型修复，异常会 block，之后重新检查充分性。但此前仍有结构化充分性模型修复循环；不能声称早于所有可选模型修复。错误的 gate pass 还能传播为 ready。 |
| `generation-runtime/core/space-generation-core.js` | 局部通过 | 仅在独立包 Core 边界导出分离函数，没有策划/迁移导入。 |
| `generation-runtime/space/semantic/separate-space-semantics.js` | 不通过 | 收银词法修正、纯品牌系统归属合理；新增设备操作规则把“没有/不会/尚未操作”判成正向操作，且仅验证句首、忽略不明尾句。 |
| `generation-runtime/space/semantic/validate-spatial-semantics.js` | 不通过 | 改回真实字段入口方向正确，但载体兜底接受任意含设备/桌等词的 ambiguous 句，包括装饰母题；分离函数再次使用该兜底，能把原本 block 的混合句转成 pass。 |
| `runtime/pipeline-service.js` | 接线局部通过，整体受阻 | 分离在克隆 Packet 的 spatial 内执行；未改事实、来源、Locked Assets、模型配置、Provider 或项目路径。依赖的语义判断尚不合格，不能批准投入正式调用。 |

### 阻断发现 A：载体关键词不等于有效可见性证据（P1）

位置：`validate-spatial-semantics.js:37–43, 52–53, 90–91`。

`explicitVisibleCarrier` 的未锚定名词匹配让 `equipment conveying happiness`、`砂锅传递幸福感`、`设备自动治愈顾客`、`在设备旁员工畅想未来` 全部通过，即便分类器仍报告 `ambiguous / unresolved_visible_requirement`。需要区分单纯、明确的载体名词短语与附带未经证实活动/效果的命题，不能靠无限增加否定词黑名单处理。

更严重的是 `petal curved counter`、`lotus layered table`、`花瓣曲线桌`：分类器检测到母题和建筑词，仍为 ambiguous，但新分支直接跳过阻断。**这三例在 E1D 前为 block，E1D 后为 pass，是可复现的保护回退。** 该分支没有限定为无 motif、无 metaphor 的 unresolved 类别。

`Logo and equipment conveying happiness` 原句 block，分离后只保留 `equipment conveying happiness`，Logo 迁入品牌层，随后 gate pass。用合成、内存 Packet 调用真实完成器得到 **ready，模型调用 0**，输入 Packet 未变。此处 ready 仅是漏洞复现输出，绝非真实项目状态或验收结果。其他载体反例在旧 gate 中也可能通过：旧实现把 mustBeVisible 映射为 functionalNetwork；报告没有将所有旧问题都误记为新回归。

### 阻断发现 B：设备操作证据没有覆盖完整命题（P1）

位置：`separate-space-semantics.js:63–70`。

`员工没有使用设备`、`员工不会操作设备`、`员工尚未操作设备` 均被新增规则判为 `functional / visible_device_operation`。通配片段吞掉了否定/未发生标记。`staff operating equipment and enjoying cosmic essence`、`员工操作设备并畅想未来` 也被整句授予功能权限，因为匹配在设备名处结束。旧分类器对这些例子是 ambiguous；旧 gate 的字段回退已可能放行，但新增正向证据仍不成立，不能作为本轮审核合格依据。

### 顺序限制 C：只先于空间模型修复

位置：`analysis-completion-orchestrator.js:164, 240–256`。

当 Packet 同时缺少 materialLanguage 且包含可分离的品牌混合动线时，实际序列为两次只抛错的 `structured-model-stub`，没有执行空间分离，终态 failed。空间分离仅在充分性已 ready 后运行。若“先于可选模型修复”包括结构化修复，本要求尚未满足；如果仅指空间修复，局部顺序成立。未进行任何真实模型调用。

### 已验证的保护与不能推导的结论

- 生产差异仅五文件，均位于独立工作流。没有改策划、迁移、宿主、路由、依赖、根 lockfile、共享 Prompt/Compiler/Provider。
- 分离保持原文片段与原位置前缀，没有生成新的功能区、设备、尺寸或经营活动；既有 Packet 内容仍只是提案，不能升级为已确认项目事实。问题是接受了不充分或不安全的语句。
- 既有测试中的不可分离 Logo 混合句、未知项、纯品牌字段、信息不足与本地异常继续阻断；不能由这些测试推广为所有歧义均被阻断。
- P7B、B1、餐饮影子、独立知识资产及历史报告保持不变；既有建筑语言、跨行业和 Shared Core 回归通过。但 A 已显示语义保护回退，不能宣称所有已批准建筑语言规则都完全不受影响，也不能由哈希不变推导画面质量通过。

全部 19 条审查探针、13 条不符合预期、基线分类对照、合成 ready 复现与顺序跟踪见 [review-probes.json](review-probes.json)。以下脚本预期以 exit 1 报告当前缺陷，不是修改原测试期望：

```powershell
node --import tsx packages/visual-workflow/tests/restaurant-knowledge/spatial-semantics/integrity-review-probes.mjs
```

## 2. 完整性记录受控同步决策

用户授权以“代码审核通过”为前提。该前提未满足，因此没有同步任何条目，也没有试更新后回滚、修改其他副本清单以绕过正式集成测试、关闭或降低 `verifyImplementation`。

实际变更条目：**0**。下表清单“更新后”均与“更新前”相同；候选摘要仅用于审查，未写入清单。完整原始比对见 [integrity-comparison.json](integrity-comparison.json)。

| 文件 | 清单更新前 SHA256（亦为原始 Git 基线） | 已审核候选的实际 SHA256 | 清单更新后 |
| --- | --- | --- | --- |
| analysis-completion-orchestrator.js | `9577c3d59c4d8869cb11e563163f49ad9bc324dda05855a32664f891cf1338ae` | `c7fc32dcd43de228d4f3e42c22908796a36d4c700733fa72062c466fd8dea51b` | 原值，未更新 |
| space-generation-core.js | `56b85e5b2719da1860cf2f4f1ae9dff4ebcf9af34c8460380fd56e8dc67c1c9a` | `4dd49955c536f676916cf1a99c0b09ba498f5ed7bc49608e8e8339dbac8cd7d5` | 原值，未更新 |
| separate-space-semantics.js | `9867c041bd560bd968575deb9261f25494603b116e9a7e7ea39c15daeaf799a2` | `fe21c12b6206e7e2a341dce430fbfadec11819b57a60f928513196c3d699a117` | 原值，未更新 |
| validate-spatial-semantics.js | `ab7b12cdbc4cb9a67b71001e0be38bd4abfaa46b960dcd65558916ab49728288` | `15e0376c81d71bba784cd066934b73cc7eba21480f0a3a61e5e31e4ecb00401e` | 原值，未更新 |
| pipeline-service.js | `f8a4fe7344a6c08ce2567277856203cbb88849a264fa5c277051bc6177fb8147` | `84fee2b4f1a352f029f3b03e9f6b4bc97cb486452bc96b78d30d8e35bf04febb` | 原值，未更新 |

清单文件本身更新前后 SHA256 均为 `85947e556d9467837f7583c106f5f7fec10f65207ed9b2c31b410ae7c2f13bec`。未部分批准其余三文件，以免把局部接线审查当成整体实现许可。

## 3. 全量离线回归

所有 Node 测试进程通过 `NODE_OPTIONS` 继承现有 network-off 预加载器：禁止 fetch、HTTP、HTTPS、TLS、TCP，仅允许 Windows TS loader 本地命名管道。测试自己注入的假 Provider 不属于真实请求。没有读取用户凭据、运行 LIVE 入口、请求新收费授权或启动模型验证。各套件有重叠，不累计为独立用例总数。

| 检查 | 结果 |
| --- | --- |
| E1D 针对性与可见性/场景边界 | 117/117 PASS |
| 跨行业、建筑语言、历史影子摘要 | 69/69 PASS |
| 完整 visual-workflow | **329 PASS / 10 FAIL，共 339** |
| 双请求 guard + transport | 独立复测 **46/46 PASS**；首次并行运行 45/46，见下文 |
| 正式双假响应集成 | **1 PASS / 5 FAIL，共 6** |
| Shared Core 语义/路由保护 | 19/19 PASS |
| `verify:current-flows` | **FAIL**：引擎 2/2；Runtime 1292/1294，2 项完整性阻断；后续 typecheck 未由该组合命令运行，已单独补跑 |
| `repo:verify` | **FAIL**：Repository Contract PASS；独立工作流完整性入口 FAIL，组合命令在此停止 |
| 根 `npm test` | **1699 PASS / 2 FAIL，共 1701** |
| 独立基准工作区 `npm test` | **1699 PASS / 同样 2 FAIL，共 1701** |
| `golden:test` | 5/5 场景 PASS，Provider calls=0，auto-updated=NO；历史人工验收标签不代表本轮新验收 |
| Node Host / Web typecheck | PASS / PASS |
| `repo:guard:test` | 56/56 PASS |
| `verify:analysis-guards` | PASS |
| 因 repo 短路而单独补跑的版本、命名、包边界、过时代码、生产边界、运行资产、项目专用规则、Golden 边界 | 最终均 PASS |
| 历史 Packet 只读回放 | 归档摘要核对通过；6 处分离；OFFLINE_CANDIDATE_PASS；模型/网络请求 0，不是正式分析通过 |
| 本轮额外审查探针 | **13/19 不符合预期；合成完成器错误 ready** |

每次执行的命令、退出码、计数、时长（适用时）、完整日志绝对路径及 SHA256 保存在 [regression-results.json](regression-results.json)。原始完整日志保留在仓库 ignored 的 `.codex-smoke/rks-02e1e/`，没有用精简报告代替失败证据。

### 原有 10 项失败逐项状态

| # | 原失败用例 | 本轮状态与根因 |
| --- | --- | --- |
| 1 | 只读已有报告 RPC 提供建议 | 未恢复：完整性拒绝，未进入 handler |
| 2 | 公共操作注册/编译/生成/Logo 前验证实现 | 未恢复：五文件摘要未同步，首个错误指向 orchestrator |
| 3 | baseline lock 防输入/模型/代码漂移及旧任务 | 未恢复：期望 BASELINE_LOCKED，但更早触发 IMPLEMENTATION_CHANGED |
| 4 | guarded public web operations 完整操作链 | 未恢复：完整性入口拒绝 |
| 5 | explicit details save 保留身份与产物 | 未恢复：完整性入口拒绝 |
| 6 | 正式分析恰好两次假 HTTP 成功 | 未恢复：ANALYSIS_STOPPED；未到成功状态和调用计数断言 |
| 7 | UVU 无效 JSON 不重试 | 未恢复：假调用实际 0，期望 2，尚未到解析边界 |
| 8 | 空间语义修复不能取得第三次调用 | 未恢复：假调用实际 0，期望 2，尚未到语义修复边界 |
| 9 | 结构化决策修复异常不能取得第三次调用 | 未恢复：假调用实际 0，期望 2，尚未到修复边界 |
| 10 | 两次预算不能绕过报告校验 | 未恢复：假调用实际 0，期望 1，尚未到报告校验边界 |

完整测试名与逐项匹配见 JSON 的 `failureMatrix`。公共操作先 await `verifyImplementation()`，再调用 baselineGuard/handler；guard 外层把没有 code 的完整性异常包装成 `ANALYSIS_STOPPED`。因此这些失败不能解释为预算保护已通过，也不能拿 guard/transport 单测通过替代正式集成验证。唯一通过的集成例是未分析项目资格/方向确认仍拒绝、假调用 0。

### 额外失败与复测记录

1. 首次 guard/transport 与基准根测试同时运行，30ms 超时用例发现请求预登记数 0 而期望 1。guard client 在登记前 await `checkInput`，且该阶段已处于 deadline 内，负载导致登记前超时是与代码路径一致的推断，未添加时序追踪证明因果。独立复测及完整工作流中的该用例通过；保留原日志，未修改超时或断言。时序脆弱性仍需后续评估。
2. 独立工作区首次并行根测试多出 secret-safety 子进程 60 秒超时（1698/1701）；串行完整重跑为 1699/1701，只剩两项策略失败。没有发现凭据违规，也未更改 guard。
3. 临时基准 worktree 最初放在 `.codex-smoke` 下，版本检查递归发现它的第二份 lockfile。将整个审核 worktree 迁到仓库外后复测 PASS。未删除 lockfile、调整检查规则或更改用户工作区；原失败日志保留。
4. 审查探针最初位于 reports 目录，隔离检查将其识别为测试边界外的业务代码消费者。已把探针移入本包现有 spatial-semantics 测试目录并修正相对导入，未改隔离规则。最终 repo 仅剩原有完整性漂移；保留移动前后的日志。

## 4. 根级两项失败基准对照

独立 worktree 以 detached HEAD 固定 `de0df03a`，使用既有第三方依赖、独立指向基准源码的 workspace 包链接，无安装/下载。完整 npm test 与主工作区完全相同：1699 通过、两项失败。随后在该独立 worktree 切到 E1D 前 `2302aa9f` 只运行原始 `tests/repository-policy.test.js`，同样 0/2；再恢复 de0。没有切换或重置主工作区分支。

| 失败 | 冲突文件 | 判定 |
| --- | --- | --- |
| 仓库不包含项目源文件或项目交付物 | `reports/art-medical-identity/review.md`、`reports/local-spatial-boundaries/review.md`（均在独立工作流内） | 旧基线已有，命中固定禁止文件名 |
| 栅格图片只能处于允许目录 | art-medical-identity、local-spatial-boundaries、p7-spatial-layout-contract、p7a-prompt-budget、spatial-balance 报告目录内五张 PNG | 旧基线已有，均不属于测试列出的允许根目录 |

策略测试及七个对象在 2302 与 de0 的 Git 字节 SHA256 全部相同，见 [root-baseline-comparison.json](root-baseline-comparison.json)。本轮不删除/迁移历史报告，也不放宽测试允许目录。保留审核 worktree：`E:/Masterpiece-OS-RKS-02E1E-Baseline-de0`；创建及迁移路径在 JSON 中记录。

## 5. 冻结保护、未解决风险与下一阶段

[preservation.json](preservation.json) 记录 13 个保护根目录/文件的前后树摘要，全部不变，包括原项目、隔离项目、历史账本、LIVE 归档、输入冻结、P7B、RKS Shadow、知识资产、E1D 历史报告、Prompt、合同元数据与 Golden。历史回放另按原 manifest 验证归档文件 SHA256。无真实 Provider/模型验证/生图，无项目状态改写，无账本重置，无素材或设计方向变更，无提交、推送、合并、部署、发布。

下一阶段建议：

1. 在独立工作流内修复 A/B：载体许可必须覆盖完整短语且拒绝 motif/metaphor；设备动作必须是完整、肯定且已发生/可见的命题。把本报告反例纳入正式回归，不能改变原测试期望来消除失败。
2. 明确语义分离与结构化修复的顺序要求；若要求先于所有可选模型修复，调整编排并验证缺字段与混合语义同时出现的情况。
3. 修复后重新独立审核五文件实际 diff 和 SHA256；仅在审核通过时按显式授权同步准确条目，再重跑完整离线测试，尤其恢复两次假响应正式集成的调用数、终态及异常边界。禁止用临时清单替换绕过门禁。
4. 历史报告命名/图片策略冲突需单独的人工作出保留与治理决定；本轮保留两项失败。即使上述代码修复完成，根级闸门尚未全绿时仍不能宣布全部通过。

**本轮状态：REVIEW_BLOCKED / INTEGRITY_SYNC_WITHHELD。完成审核与离线证据交付后停止，等待人工审核。**
