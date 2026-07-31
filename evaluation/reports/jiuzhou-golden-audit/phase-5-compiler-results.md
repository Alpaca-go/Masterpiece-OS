# Phase 5 — Prompt Compiler / Conflict / Coverage 自查

## 输入

- `VisualDecisionPacket`（正式主源）。
- 当前 `TaskContract`。
- Family/Subtype/Shot 模板。
- 可选项目 Prompt Asset 和模型适配器规则。

## 输出

- 固定 12 区块的最终 Prompt。
- 每区块 `sourceMap`。
- Golden Coverage 对应的完整性结果。
- Prompt/请求指纹与编译器版本。

## 字段映射

- Project Identity ← `projectFacts`。
- Upgrade Thesis ← `uniqueUpgradeThesis + upgradeFrom + preserveCore + upgradeTo`。
- Tone Boundaries ← `creativeDecision.toneBoundaries`。
- Brand Translation ← `abstractions + mediaTranslations.spatial`。
- Color/Material/Lighting ← Packet 对应系统。
- Strict Negatives ← Task + Diagnosis + Spatial Risks + Template + Model Rules。

## 门禁

- Packet Hard Fact 或执行数据不足：`PROMPT_SOURCE_INSUFFICIENT`。
- 当前媒介只有接口、没有完整转译：`PROMPT_SOURCE_INSUFFICIENT`。
- 保留项与禁止项、Logo 与 no-Logo、文字任务与全局禁字、低饱和系统与高饱和任务冲突：`PROMPT_CONFLICT`。
- 正式 Packet 模式禁止通用色彩/材料/光线占位句。
- Packet 存在时不再读取旧 Prompt Source 或旧 Visual Identity 的项目语义。

## Golden Prompt 覆盖

- Hard Fact Coverage = 100%。
- Upgrade Thesis Coverage = 100%。
- Brand Translation Coverage = 100%。
- Tone Boundary Coverage = 100%。
- Color/Material/Lighting Coverage = 100%。
- Task Contract Coverage = 100%。
- Conflict Count = 0（通过时）。

## Backtrace 输出

- `generateGoldenBacktraceAudit` 自动计算当前报告、Decision Packet 和最终 Prompt 覆盖率，并定位首次失败节点。
- `renderGoldenBacktraceAuditMarkdown` 输出可读审计表；原始对象可直接保存为 JSON。

## 仍缺失项

- 九州真实 Pipeline、Seedream 生图和跨项目防过拟合。

## 单元测试

- Packet 直读且不受污染的旧 Context/Prompt Source 影响。
- 12 区块包含九州事实、命题、羽毛抽象、空间色材光和项目禁止项。
- Logo、文字、高饱和冲突均阻断。
- 未实现媒介不能进入正式生成。
- Backtrace JSON/Markdown 覆盖率和首次失败节点可稳定生成。
- Root 测试：303/303 通过。
