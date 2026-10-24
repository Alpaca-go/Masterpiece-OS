# RKS-01F · 可见经营行为归属修复候选

日期：2026-10-24（Asia/Shanghai）。分支 `codex/rks-visible-owner-repair`，起点 `d6fe1579d24e446fa90c3f8725f5be65822fc51a`。状态：**纯编译功能验证通过；正式运行仍被受保护完整性记录阻断，待独立审批。** 没有合并、部署、真实模型调用或用户项目写入。

## 结果与最小实现

仅修改独立工作流内三个生产文件：

- `semantic/separate-space-semantics.js`：保留既有身份、装饰、母题、颜色/几何和物件关系的优先规则；仅对 mustBeVisible 的混合来源增加“人物角色 + 具体活动”及“可见物理效果 + 载体/空间关系”的证据识别。覆盖中英文、零售、酒店及普通服务场景，不按行业/品牌触发，不把三个英文样本当白名单。未知、含糊意愿进入 review_required，不再从品牌 fallback 获得执行权。
- `space/source-adapter.js`：未知/身份/颜色几何条目不能因同文进入品牌分支而绕过拒绝；现有 subtype scope 保持不变。投影后优先选已有 functional_requirement / architecture_function_bridge 的真实渲染列表，否则由 composition 执行。去重仍限定在原有候选来源内，但删除重复必须同时证明当前镜头的另一列表实际保留了它，不再用 raw 集合存在代替 owner。无关品牌表达不扩大去重。保留原始索引、分类原因、投影前后、画外/边界子句、owner、去重去向与拒绝原因。
- `space/compiler.js`：functional_requirement 不再声称读取 composition.mustBeVisible；brand_translation 不再声称直接执行 raw 身份列表。composition 映射实际列表及艺术焦点，已确认构图要求仍保留原始源路径和实际字段映射。逐字段审计补实际 renderedBlocks、finalPromptRetained 与原文出现状态。

未改 Shared Compiler、策划/迁移、B1、P7B 策略、确认/指纹逻辑、Provider Adapter、模型/消费/重试配置。没有新生产模块、shot 别名、第三方依赖或第二个业务入口。设计先于实现写入 `design-contract.md`；全部改动可按独立提交审阅。

## 同条件离线对照

`field-evidence.json` 以已提交 RKS-01E 合成 Packet 哈希核验重建输入，复用其六组任务、固定时间、Seedream 5.0 Pro 模型元数据、16:9、零参考图和 currentInstruction。原 Packet 编译前后不变。修复前 Prompt 来自 RKS-01E 的合成证据，不使用历史 Golden 或用户项目请求。修复后的正式 Prompt 走现有 Short Chain；纯 Provider Prompt 由实际 image adapter 的 compileRequest 构建，不调用 execute/fetch，也不保存任何请求头。

| subtype / 有效 view | 修复前 | 修复后 | 合法过滤 |
| --- | --- | --- | --- |
| lobby / public_overview_view | 0/3 | 2/3 | customers dining at tables 仍是画外 |
| lobby / 显式 entrance_view | 0/3 | 2/3 | 同上 |
| lobby / 显式 three_quarter_wide | 0/3 | 2/3 | 同上 |
| dining / 显式 entrance_view | 0/3 | 3/3 | 无 |
| dining / 显式 three_quarter_wide | 0/3 | 3/3 | 无 |
| dining / operational_dining_view | 0/3 | 3/3 | 无 |

chef/steam 在原规则下是 current_shot，现由 composition 唯一执行；dining 的顾客就餐也由 composition 执行。含其他真实功能来源的重复条目保留已有 owner；每条只出现一次。lobby 的 dining 句拒绝原因仍为 foreign_scene_entity。修改 shot 不赋予额外可见性。未知/含糊文本不会因新 fallback 获得硬性经营授权。

证据中每项含修复前状态、修复后分类/投影/owner/去重/拒绝原因及正式和 Provider 文本出现次数。记录完整前后正式 Prompt、纯请求控制字段、body/prompt 摘要和 Provider 前缀，可重建完整 Provider Prompt。对照断言除 prompt 外所有实际 Provider body 字段完全相等；无 image 字段。`operational_dining_view` 仍只是内部结果策略，不新增输入别名。

这些是字段传递与纯请求证据，**不构成视觉质量验收**。规则是有界的确定性关系识别，未识别的语言表达需审查；不声称实现开放自然语言理解。

## 回归与阻塞

完整命令、前后测试名、失败项和历史尝试见 `test-results.json`，原始日志仅保留在 ignored 的 `.codex-smoke/rks-01f/`。

| 检查 | 结果 |
| --- | --- |
| 修复前已有独立工作流 | 150/150 PASS |
| 首批新专项在修复前 | 21/21 FAIL，直接复现丢失和无审计；后续增加边界反例 |
| 最终专项 + scope/fidelity + 原有请求/方向回归 | 59/59 PASS；包含 26 项新增专项 |
| 修复后完整独立工作流 | 171/176 PASS；5 项被未更新的 implementation guard 阻断 |
| `npm run repo:verify` | 在 isolation 步骤 BLOCKED：VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED；没有绕过或自动刷新摘要 |
| `npm run verify:current-flows` | Runtime application 1292/1294；2 项独立工作流 public-operation 测试被同一 guard 阻断 |
| `npm test` | 1699/1701；剩余 2 项为基线已存在的 repository-policy 冲突 |
| Golden | 5/5 PASS，Provider calls=0，auto-updated=NO |
| 其他 repo 子门禁、analysis guards、guard 测试 | 单独执行 PASS，见机器列表；不据此把 repo:verify 改称 PASS |
| Node/Web TypeScript、Web smoke | PASS；smoke Provider calls=0、businessWrites=0 |

5 项独立工作流阻断涉及 B1 report RPC、public art-direction operations、generation baseline lock、public save/confirm/compile/reopen、project-details public operation。它们在业务执行前报 implementation changed，因此不能宣称这些正式入口完成修复后的端到端验证。`current-flows` 的两项阻断为迁入 Logo 角色读取及独立工作流 offline E2E。

根公共测试的两个已有失败由 `tests/repository-policy.test.js` 报告：两个历史 reports 下的 review.md 以及五张已 tracked 的 PNG 不符合其路径规则。机器记录列出基线树中的同一文件，测试本身及这些历史文件未改；不清理历史资产或修改无关政策来消除失败。

保留了首次尝试结果：一次新测试使用具体母题词触发项目规则扫描，改为通用类别例子，扫描器未变；两处实现回归（对无关品牌句扩大去重、已确认 compositionRequirements 源名不兼容）已修复，既有三行业实际 mock 请求 body 比较与方向编辑测试通过。另一个试验性架构去重假设不成立，删除了不必要的生产过滤，并验证已有规则下该活动仍只有一个渲染 owner。没有改 Golden 或期望文件。Document Context 取消轮询用例本轮在完整 Runtime application 中通过，没有通过修改它掩盖上轮波动。

## 不变性、影响面与审批

`protected-change-approval.json` 列出三个源码的旧记录摘要与本轮候选摘要；implementation-integrity 本身未改。另有 54 项受保护/历史文件对起点逐字节哈希相等，包含 B1、方向确认、基线锁、Provider/Seedream adapter、根 lockfile、RKS 分类/知识/方向草案/根因矩阵、P7B 历史记录。实际用户项目与凭据本轮没有读取、调用或写入；本轮业务测试使用临时合成存储，不把它们当用户记录。

影响范围是独立工作流中 mustBeVisible 的分类与新编译审计：standard 及原有 source scope 的 art_direction_reference；reference_first/continuation 的目标程序继续优先，新增纯测试确认不会继承原用餐操作。所有路线可能获得新增 trace/sourceMap 信息；保护记录的审批范围因此是整个独立工作流实现，不能宣称只影响餐饮或只凭旧 Prompt 哈希不变判质量通过。Shared 业务实现不受代码修改。

P7B 的既有运行与历史验收不改、不重新执行。现有三行业未确认方向的标准 mock 请求 body 与已审阅基线逐字节相同；这不替代实际 P7B 项目的新运行验收。B1 及确认/指纹源代码未变，其直接回归通过，但带 implementation guard 的 public 入口仍待摘要审批后的完整重跑。

下一步仅供人工决定：审阅三份源码和字段证据，单独授权完整性记录更新，随后重跑全部门禁和被阻断的 public 入口；两项既有仓库政策冲突另行处理。本轮不批准或实施摘要变更。真实分析、生图、校验、模型自动重试均 **0**。

## 回滚及停止

当前正式入口因 guard 继续拒绝使用未批准实现。修复提交可整体 revert；需要回到研究基线时，在工作树干净的前提下切回 `codex/rks-ftt-seed-knowledge`（上游 `d6fe157`）。没有用户数据迁移或摘要更新需要恢复。不要整分支合并，也不要借回滚恢复被禁止的旧实现。

完成本修复候选后停止，等待人工审核；不发布、不部署、不真实生成冯烫烫、不晋升 RKS 知识、不进入 RKS-02。图 1 的真实 Run 关联继续保持 undetermined，另行补证。
