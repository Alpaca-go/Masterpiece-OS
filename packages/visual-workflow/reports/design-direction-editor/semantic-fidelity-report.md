# 自然语言编辑语义保真定点修复

基准：`81eaca1429608e2246cc6fe5d0133c3cdf1f46c7`。本轮仅离线修复；四张作品继续作为离线人工质量校准，目标始终是 `standard`、零参考图。未改动原九州项目、历史图片、Golden、冻结 Prompt 或人工质量状态。

## 转换缺陷与修复

| 输入内容 | 原风险 | 定点修复后的权威字段 |
| --- | --- | --- |
| 主色、辅色、点缀及表面范围 | 整段描述落入主色，自动授予大面积权限 | 每色独立保存名称、配色角色、职责、表面边界及用户显式选择的空间范围，分别进入 `colorBehavior.primary/secondary/accent` |
| 含糊配色或旧自由文字 | 通过默认值猜测覆盖范围 | 可保存草稿，列出需补充内容；没有明确范围、名称混有整段配色关系、或点缀与大面积权限冲突时禁止确认及生图 |
| 材料光学与禁用行为 | 全部塞进名称，`behavior` 为空 | 名称、透射/反射/层叠等行为、空间职责和禁用行为分开进入 `materialLanguage[].material/behavior/brandRole/forbidden` |
| 功能节点 | 与关系文字复制混用 | `sceneProgram` 独立保存区域节点 |
| 通行连接 | 与节点复制混用 | `functionalNetwork` 独立保存连接与通达关系 |
| 跨区域运营与隐私 | 与节点复制混用 | `functionalRelationships` 保留原句；沿用既有当前镜头/跨区域边界投影 |
| 可见设施 | 与场景节点混用 | `mustBeVisible` 独立保存本镜头设施 |
| 构图与主次关系 | 没有对应执行字段 | 用户确认的 `compositionRequirements` 进入正式 Composition 块，且记录字段来源；未提供该字段的项目 Prompt 不变 |

保留现有项目方向面板和自然语言编辑，不新增模型调用或独立页面。颜色与材料用可添加的分项行，功能关系分开填写；不要求用户手写 JSON。历史完整确认记录可按已有结构回填；旧编辑结果缺失范围或光学语义时提示重新确认，不自动提升权限。

## 新测试入口与逐字段证据

[自然语言输入样本](./natural-language-input.json)仅包含文本框和下拉选择的测试输入，不是预构造确认对象。[实际差异](./code-changes.diff)包括新的正式网页测试工具 `tests/capture-design-direction-editor.mjs`：打开独立九州副本的空编辑器，逐个填写真实 React 控件、保存并确认，经实际 Node Host 和公共业务服务编译与生成。

该工具不注入 `confirmation` JSON，并捕获[浏览器真实 RPC 请求](./web-input-requests.json)证明这一点。它先保留一个未明确范围的点缀色，验证网页要求补充且不发送模型请求，再在控件中明确范围后生成。[网页执行证据](./browser-evidence.json)记录了空编辑器、含糊范围阻断、确认后生成、Host 重启后保留、编辑保存新草稿后再次阻断的实际状态。正式模型传输仅由离线替身记录请求和返回合成图，不证明视觉质量。

34 项映射全部通过，见[逐字段保真报告](./field-fidelity.md)及[机器证据](./field-fidelity.json)。[确认记录](./confirmed-direction.json)、[有效 Packet](./effective-packet.json)中的颜色及材料逐字段精确相等；[完整正式 Prompt](./formal-prompt.txt)与[实际 Provider 请求](./provider-request.json)保留颜色职责/表面、光学行为、禁用表现、功能关系和构图要求。英文已有投影可改变大小写，原关系必须完整留在 Packet；最终 Prompt 检查两端可见关系及隐私边界，不借逐字比较强迫改变既有跨区投影。来源为用户确认而非模型提案，构图块源映射明确指向 `compositionRequirements`。实际请求没有 `image` 字段。

开发期两项保真/阻断测试及正式网页端到端通过。限定摘要更新后，完整离线门禁重新执行，[24 项命令全部通过](./gate-results.json)，含独立包 100/100、根测试 1701/1701、Runtime 应用层 1294/1294、独立 Web typecheck、Web 构建、Golden、空间 Golden 边界、56 项隔离守卫和浏览器 Smoke。保留了原四图公共操作测试；没有删测试、放宽守卫或更新 Golden。

对其他医美、餐饮、酒店三个测试项目，从 `81eaca1` 只读重建正式编译器与适配器，与当前拥有业务服务捕获的实际标准请求逐项比较，三者请求体均完全一致，参考图均为 0，见[基准请求回归](./standard-industry-regression.json)。生产代码没有导入或读取这些测试数据，普通自然语言样本存放在所属测试目录，不读取 Golden/评估资产。

## 限定完整性申请

[本轮摘要申请](./integrity-update-request.json)只替换实际改动的 5 项既有记录：`project-design-direction.js`、独立空间 `source-adapter.js` 和 `compiler.js`、网页面板及其 API 类型。构图编译新增内容仅在已确认的项目明确提供时执行；默认项目不触发。未增加摘要记录，未改变其他业务实现。

用户已明确批准这 5 项；源码逐项一致后仅更新对应摘要，未添加记录。见[摘要应用审计](./integrity-update-audit.json)及[作用域证明](./scope-proof.json)。最终 implementationDigest 为 `8e8469e022ed1e2e01bdad208e5e75b9126d35afb46e3ac96e212aaa8c6e6f81`。正式公共操作仍执行完整性检查，没有测试豁免。原九州项目仅被读取并复制到独立测试目录；所有新增确认、历史及生图运行都写入副本。

剩余限制：旧编辑记录若缺失明确范围、材料行为或独立功能关系，会要求重新确认；不会尝试用文本猜测或模型补齐。未给出的材料构造、工法、面积比例继续未知。网页与逐字段验证证明的是语义和工程链路，实际建筑艺术品质仍须未来获批真实标准生图后人工验收。

本轮真实调用 0，无合并或发布，不宣布视觉质量恢复。
