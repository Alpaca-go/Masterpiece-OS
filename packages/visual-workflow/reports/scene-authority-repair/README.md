# RKS-02C 场景权威与功能网络修复候选

完成日期：2026-10-25（Asia/Shanghai）。起点为 `codex/rks-ftt-direction-fidelity` / `949a838d0fbdb70f27d600e6a93c4545f8751e12`；候选位于 `codex/rks-scene-authority-repair`。当前状态：**离线修复候选完成，等待人工审核；完整回归未全绿，不具备发布条件。**

仅修改独立工作流内三个生产文件；真实分析、生图、模型校验、自动重试、参考图均为 0。没有读取或写入用户真实项目，没有合并、部署或发布。测试中的临时项目和模拟请求不属于真实用户执行。

## 根因与修复

1. `storefront` 已有公开 subtype / `front` 模板，但不在目标功能程序映射中。source adapter 没有设置目标程序、视图和来源；标准路线仍继续投影，未知场景的源句又被直接透传。编译 trace 因而显示未解析目标、`legacy_project_default` 和通过门禁。现在新增通用外立面权威，以既有场景字段保留 `storefront/front/user_explicit`；没有把 front 改名为入口或堂食。外立面默认镜头为 `exterior_front_view`。无法映射的显式 subtype 编译直接抛出 `SPACE_TARGET_SCENE_AUTHORITY_UNRESOLVED`。
2. 作用域词汇原来只有 `dining/kitchen/餐厅/厨房/堂食`，未识别中文点餐区、明档制作区、取餐区、就餐区。完整网络也未区分逻辑依赖与可见性，所以整句落入 `current_shot`。现在为中英文网络保留原句、节点、规范场景、子句范围和源路径；明确的全局序列进入依赖证据，不要求当前镜头全部呈现。无法安全拆分的网络保持待审。
3. 原标准路线对 `unresolved` 使用原文回退。现在有目标场景的标准请求只投影 `currentShotText`；无法定位的外立面活动和缺少权限的室内玻璃视线保持待审，不能凭可分类取得 owner。真实网络没有从 Packet 删除，输入字节/对象不变。
4. 按经营关系容器直接授予边界会把其他室内关系句误当作当前约束。修复保留有具体本地关系的边界，以及合法的隐私/画外约束；纯厨房活动或厨房到堂食的关系不会继承相邻入口句的可见性。项目负向防漂移要求保留全局作用，不因提及室外而被误删。

这仍是确定性文本规则，不是通用自然语言理解或视觉质量证明。没有推定真实物业、厨房许可、经营比例和顾客情况。

## 生产 diff 与影响范围

精确差异见 [candidate.diff](candidate.diff)，旧/新完整 SHA256 和全部 133 个完整性记录的核对结果见 [审批单](protected-change-approval.json)。

| 文件（均在本包 `src/generation-runtime/space/` 内） | 必要原因 | 回归影响 |
| --- | --- | --- |
| `continuation/target-functional-programs.js` | 原提案文件之外的必要权威入口：增加 storefront 程序和默认视图；不复制场景实现 | 所有既有程序、显式/默认镜头、公开 subtype/shot 组合；标准、参考和 continuation 的映射消费 |
| `scene-projection/target-scene-projection.js` | 实际拥有源句作用域；扩充通用场景词汇、逻辑网络与待审分类、子句/节点审计 | 外立面/入口/堂食、中英文、其他商业场景、隐私边界及未知源句 |
| `source-adapter.js` | 阻断未知目标和 unresolved 透传；执行列表、原路径别名、visible owner 与去重一致 | visible owner、艺术/建筑分支、B1 投影、P7B、公开操作完整性和包内全部回归 |

没有必要修改 `separate-space-semantics.js` 或 `compiler.js`，也没有修改 Prompt 模板、Provider、存储、公共宿主、依赖、lockfile、策划/迁移业务或 Golden。新增审计属性只在编译 trace 中存在，没有引入持久化 schema。

## 三镜头的前后结果

相同 A/B 输入、相同 task、Seedream 5.0 Pro、standard、16:9、2K、1 张、零参考图、post_composite，纯离线组装。报告工具断言前后输入 SHA256 与任务一致，并核对最终正式/Provider Prompt 的 SHA256。

| 镜头 | 修复前 | 修复后 |
| --- | --- | --- |
| storefront / front | targetScene / targetProgramId 缺失，viewStrategy=null，显式来源丢失；三条室内行为 unresolved 仍输出 | storefront 程序、front、user_explicit 可审计；厨房制作、热气、桌边顾客为依赖，不渲染 |
| entrance / entrance_view | 三条英文室内活动已过滤，但中文完整网络仍为当前镜头 | 中文完整网络为依赖；原句和节点保留；有明确入口位置的递交活动仍可见 |
| dining / three_quarter_wide | 三条经营行为可见 | 经营行为仍保留，每条只有一个实际执行 owner；中英文重复输入也去重；全局链不会自动扩大可见要求 |

完整对照： [外立面](prompts-storefront.md)、[入口](prompts-entrance.md)、[堂食](prompts-dining.md)。正式/Provider 的字节可能不同，因为既有适配器添加请求前缀；未通过修改 Provider 来求一致。匹配按实际源输出核对，而非仅比较长度。

原始证据：[before.json](before.json)、[after.json](after.json)，包含正式/Provider Prompt、trace 和 sourceMap。字段证据：[逐字段表](field-evidence.md)、[完整血缘](field-lineage.json)，共 359 条字段/子句记录（包含重复来源审计，不能作为独立实体数量）。跨项目和玻璃案例见 [补充证据](supplementary-evidence.json)。`after-initial.json` 与 `after-pre-compatibility.json` 仅保留开发中间态；审核以 `after.json` 为准。

## 场景契约审计与尚未解决的范围

[场景清单](scene-contract-audit.json) 枚举全部 10 个公开空间 subtype 与 5 个 shot 的组合及三种镜头来源。相机表达不授予室内权限。既有合法程序还包含 retail/display/private_room；其底层商业场景正例单独验证，不冒称它们都有公开模板。

`exhibition`、`interior_panorama`、`counter` 虽有公开模板，却没有权威程序，现在明确阻断。`custom` 也不能只靠历史 `unresolved` 回退继续编译；缺少现成显式目标程序时阻断。上述是可见的兼容性影响，需独立审核，未偷偷补默认程序或改现有测试期待值。

现有契约无法安全表示隔窗室内可见权限。本次不把玻璃正例伪造为通过，也不永久禁止所有室内可见需求；保留待审原句与独立[接口方案](interface-proposal.md)。外立面室外经营活动、入口位置明确的活动和允许的堂食活动均有受控正例。受控隐私反例保留负向边界，未变成室内渲染要求。

不带 subtype 的底层语义检查保留已有兼容行为；正式任务入口原本要求非空 subtype，不能借此绕过未知场景拒绝。自定义映射、窗口权限以及更广泛的语义拆分都不在本轮擅自扩展。

## 验证结果

完整命令、退出码、耗时、日志 SHA256 见 [regression-results.json](regression-results.json)，逐项失败分类见 [failure-audit.json](failure-audit.json)。结果存在重叠，不能把测试数量相加。

| 验证 | 结果 |
| --- | --- |
| 修改前全部 visual-workflow | 211/211 通过，日志 `logs/baseline-workflow.txt` |
| 最终定向（新增 28 项 + visible owner / scene decision / cross-zone） | 82/82 通过 |
| 最终全部 visual-workflow（含餐饮、B1、P7B） | 230/239 通过；5 项因未审批完整性阻断，4 项历史 custom 编译预期与 fail-closed 冲突；整体 FAIL |
| repo:verify | Repository Contract 通过；在 visual-workflow 完整性守卫处退出 1；没有刷新摘要 |
| verify:current-flows | 文档准备 2/2，Runtime 1292/1294；2 项独立工作流公开入口因同一完整性守卫拒绝；整体 FAIL |
| repo:guard:test | 56/56 通过 |
| Golden | 5/5，Provider 调用 0，自动更新 NO；不能把 NOT_READY/历史人工接受误称为本次新质量验收 |
| Node Host + Web typecheck | 分别通过；因 current-flows 提前退出而额外独立运行 |
| 版本、命名、包边界、废弃代码、生产边界、tracked assets、项目特判、Golden 边界、analysis guards | 全部独立执行通过 |
| 根历史 repository-policy | 修改前可复现 0/2；原有交付文件及栅格图位置冲突，未清理或放宽政策；没有运行完整根 npm test |

完整性守卫首先报告 `src/generation-runtime/space/continuation/target-functional-programs.js`。它提前退出，不会逐一枚举其余差异；审批单独立列出全部三个不匹配。公开编译、分析、保存、生成等守卫仍有效。P7B 测试先完成直接基线保护检查，随后在公开组合入口被更早的完整性校验拒绝，不能宣称整个公开链路回归通过。

开发中曾出现隐私边界、无 subtype 底层检查、负向 guard 被误删等失败，均通过源码修正；初始日志保留，没有修改现有测试期待值。最终残留失败仅为上表两类，四项 custom 兼容性仍未解决，不能以分类记录冒充通过。

## 审查与下一步

- [x] 两个已知问题在指定起点复现，保存三镜头基线。
- [x] 最小候选仅触及独立工作流三个文件，完整 diff 和旧/新 SHA256 已提供。
- [x] 中文/英文网络、入口局部经营、堂食 owner 去重、跨项目外立面正反例、未知场景拒绝、负向边界均有测试。
- [x] `implementation-integrity.json`、受保护 Prompt 摘要、Golden、qualityAcceptance、项目知识状态均未修改。
- [ ] 人工审核三个文件的候选摘要和语义影响；本轮没有批准或应用摘要更新。
- [ ] 决定未知公开场景及 custom 的后续契约；当前四个历史测试仍失败。
- [ ] 独立评审隔窗可见接口；当前只提供待审案例与提案。
- [ ] 后续经授权再处理模板和材料[审核清单](design-review-todos.md)，再决定真实 A/B；不得据本次文本结果确认视觉质量。

本次在隔离分支停止。没有启动应用写入真实项目，没有真实 Provider 调用，没有更改任何验收状态。后续人工批准和门禁恢复之前不得发布；本候选不代表图 1 实际根因确认。
