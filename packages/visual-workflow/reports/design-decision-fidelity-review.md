# 设计决策保真编译修复：第一批审查材料

状态：第一批离线实施完成，**总门禁未通过，待用户审查**。第二批尚未开始。基于 `fix/visual-workflow-image-quality-regression` 的 `3b7ed4d55b80fbb6320b391d71f97d3fb4a289e0`，代码保留为工作区差异。真实 Provider 调用为 0；未合并、发布或声明人工视觉质量通过。未修改完整性摘要、历史 Packet、报告、Golden、人工质量基准或兼容标识。

## 实际代码

[完整代码差异，含新增通用测试及离线取证工具](./design-decision-fidelity-code.diff)。生产修改严格限定在独立包的六个既有文件：

| 文件（均位于 src/generation-runtime/space/） | 第一批修改 |
|---|---|
| semantic/resolve-spatial-color-role.js | 颜色名及品牌主次不再推定室内面积角色；中英文背景一致；保留显式 spatialUsage；多范围未分配时显式待决 |
| semantic/action-verbs.js | 正式文本转换保留原句对象；flow/layer/light 等信号不再自动扩写曲墙、几何天花或灯槽；显式复杂曲线原句保留 |
| semantic/compile-spatial-mechanisms.js | 排除色名、世界观等来源后才派生动作；功能动线保留在功能层；避免图案规范化新造的几何词反过来授权建筑动作 |
| semantic/sanitize-brand-expression.js | 去除按色名强制降为点缀的覆盖；保留材料 behavior、brandRole 和光学交互；身份文字保护继续生效 |
| source-adapter.js | 增加仅存在于编译结果的 decisionTrace，记录来源路径、输入、派生动作及未决范围；不回写 Packet 或新增必填持久化字段 |
| compiler.js | 正式渲染色彩角色、原始作用、承载对象、已有比例及未知比例；把来源追踪附入编译 trace |

新增代码文件和标识使用语义名称；没有生产品牌特判、固定形态、珠光配方、暖白比例或行业强制风格。未修改分析 Prompt、创意策划、视觉迁移、公共宿主或 Web 业务代码。

## 正式编译器完整 Prompt

下列两份都是同一个历史项目、同一个任务的完整编译输出，**修改后不是人工整理的提案**：

| 输出 | 字符数（Unicode code points） | SHA-256 |
|---|---:|---|
| [修改前完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-implementation/before/prompt.txt) | 8733 | `9494e7cf932217af59d3aaa45a9d74781d4f5365682dd2fae8069bac807a5f5d` |
| [修改后完整 Prompt](E:/image-quality-regression-evidence/design-fidelity-implementation/after/prompt.txt) | 8889 | `88ffba59aae4ea0bfdae8d294903191c7bcfef563ca61f42f88df428de2a3323` |

[完整逐行 Prompt 差异](E:/image-quality-regression-evidence/design-fidelity-implementation/prompt.diff)。修改前重新编译与历史实际请求逐字一致；修改后同时通过 `compileSpacePrompt` 和正式 `compileShortChainGeneration` 路由编译，输出逐字一致。两者均未执行 Provider 请求。

变化区块仅为 spatial_intent、architecture_language、architectural_concept、architecture_dna、新增 color、material。architecture_context、architecture_function_bridge、composition、functional_requirement 逐字不变。字符增减不作为视觉质量证据。

## 来源分层及九州美学检查

[修改前完整来源与层结果](E:/image-quality-regression-evidence/design-fidelity-implementation/before/trace.json)、[修改后来源、动作、层结果及正式路由一致性](E:/image-quality-regression-evidence/design-fidelity-implementation/after/trace.json)、[项目和保护文件未变证明](E:/image-quality-regression-evidence/design-fidelity-implementation/review-proof.json)。这些是本地审查证据，不是确定性测试依赖。

- **用户确认**：“艺术展馆式高端医美”来自本次用户审查指令。没有把它偷偷写入历史任务、Packet 或素材事实。本次同输入对照也没有注入这项补充，以免混淆代码变化与输入变化。
- **素材事实**：原审计记录视觉方案中的 cosmetic medicine；继续引用原审计及资产索引，不重新假定其证明具体室内材料或构造。
- **模型提案**：历史 Packet 的配色、材料作用、装置建议和运营关系。编译 trace 保守标为 model_proposal，不因 ready/confirmed 等历史字段推定用户批准了所有设计。
- **系统推导**：颜色角色解析、来源过滤和对象保留，记录原路径和机制 ID，标为 system_inference；不是新增素材事实。
- **未知**：准确空间面积分配、装置安装方式和尺度、未提供的光学参数。没有从历史人工验收图片补入珠光、薄片厚度或暖白配比。

实际结果：White/Light Grey 的“背景色”进入 dominant_field；Peacock Violet 的重点墙面、软装等混合用途原文保留并标为多范围待分配，未强制压成小件，也未擅定全空间占比；Metallic 的点缀进入 local_accent。原有材料“透光、渐变、光滑”和装饰/隔断作用保留。没有推导出珠光工艺。

接待台、候客、咨询、隐私、治疗及恢复等运营信息保持。已有大型艺术装置提案也保持。但当前 Prompt 仍有反画廊标题、全院节点要求在一图可读、核心装置未入构图焦点，以及强制 Architecture Context 权威。它们属于第二批，尚未修复。因此**本批尚不能判定艺术展馆定位与运营功能的冲突已解决**。

## 回归与真实失败

完整日志目录：[离线验证证据](E:/image-quality-regression-evidence/design-fidelity-implementation)。`repo:check` 在前置失败后会短路；下表中的后续检查已另行执行，没有将“未运行”记成通过。

| 检查 | 结果 |
|---|---|
| 新增通用保真测试 | 17/17 PASS；颜色变形、双语、多范围、光学、对象作用域、功能隔离、图案不造几何、复杂曲线、多行业、输入不变 |
| 包内全部现有与新增测试 + 独立工作流集成测试 | 41/45 PASS，4 FAIL，详见下方 |
| npm test | 1701/1701 PASS |
| cli:test | 40/40 PASS |
| runtime:test | Runtime Core 14/14 PASS；应用层 1291/1294 PASS，3 FAIL |
| web-runtime:test | 14/15 PASS；宿主 channel count 实际 256、预期 236，与已审核方案记录的既有问题一致 |
| web:smoke | PASS，0 Provider calls、0 business writes；仅宿主/路由 smoke，不代表修改后的独立业务通过 |
| web:build / web-runtime:typecheck | PASS |
| repo:guard:test（含双向隔离反例） | 56/56 PASS |
| golden:test | 5 项 PASS，0 Provider calls、未更新 Golden；既有视觉标签不代表本次新图获人工通过 |
| repo:verify / repo:check | FAIL；Repository Contract PASS，随后隔离检查因未更新的 implementation-integrity 摘要拦截 |
| verify:current-flows | FAIL；应用层同样的 3 项失败，后续 typecheck 已独立补跑 |
| 版本、命名、workspace、obsolete、production、tracked-assets、project-specific、golden-boundary、analysis-guards | 均独立执行 PASS |
| git diff --check | PASS |

四项失败原样保留：

1. `installation preservation retains identity and gradient guards`：旧断言要求渐变被统一标成 color_demoted_to_accent，与本批取消色名自动限制的行为冲突。身份文字保护仍由新增测试验证。**没有修改此断言**。
2. `completed analysis supplies migrated Logo roles without overriding a new intake selection`：执行分析前由完整性摘要拦截，不是已观测到 Logo 角色行为错误。
3. `owned standard compilation ignores global mode flags and preserves extracted prompt/payload bytes`：旧测试要求独立实现与原提取实现保持逐字一致；本批有意改变编译输出，因此失败。没有修改包外测试或共享实现。
4. `offline E2E: owned import, analysis, report and image request complete without shared settings or real providers`：同样被完整性摘要拦截。没有绕过验证器或构造替代摘要。

`verify:visual-workflow-isolation` 最终报告只剩 `VISUAL_WORKFLOW_IMPLEMENTATION_CHANGED: src/generation-runtime/space/compiler.js`；没有静态跨业务依赖违规。完整隔离门禁仍须记为 FAIL，不能把反例测试通过等同于总门禁通过。

## 风险和审查边界

1. 当前颜色角色使用有限双语词汇解析；多用途可能合法并存，待决标记表示尚未分配范围，不表示原方案必然自相矛盾。未实现任意语言的全量约束求解。
2. 移除默认点缀限制允许有依据的强色空间，也可能暴露原 Packet 过强或含混的建议。未知比例仍交由后续决策，不保证模型自动采用合适比例。
3. 材料光学现在完整传递，不能证明物理真实性或最终图执行正确；保留原提案也保留其不足。材料范围与颜色之间没有擅自做无依据的同义映射。
4. 对象原句保留在既有 strategy/form/organization 容器中，重复与层级仍待第二批。不能用重复频次或信号命中宣告视觉保真。
5. 通用测试覆盖医美、酒店和餐饮，未伪装成用户提到的其他真实项目验收。九州美学只是本地离线项目证据，不进入生产规则或确定性测试依赖。
6. 总门禁和独立业务 E2E 当前未通过。完整性摘要等待用户在两个批次审查后单独授权；此处不能发布、宣称可上线或作视觉质量冻结。

停在第一批审查点；在第一批审查完成前不开展核心艺术装置构图层级、场景功能投影、Architecture Context 选择和权限修改。
