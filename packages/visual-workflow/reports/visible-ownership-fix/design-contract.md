# RKS-01F · 可见要求的执行归属契约

起点 `d6fe1579d24e446fa90c3f8725f5be65822fc51a`；修复分支 `codex/rks-visible-owner-repair`。仅修复独立视觉工作流的合成编译缺陷，不证明图 1 的实际根因，也不接入 RKS 知识。

1. `mustBeVisible` 是混合来源，不能把字段整体当作品牌或功能。沿用 identity、装饰物、母题、颜色/几何、明确建筑与物件关系的优先规则。只在该字段增加跨行业的可见经营证据：人物角色与具体活动的组合，或物理效果与明确可见载体/空间关系的组合。中英文规则均有反例；未知、否定/含糊意愿不凭 fallback 获得功能 authority。
2. 没有具体证据的 mustBeVisible 短句进入 review_required，不成为硬性经营要求。已有建筑、颜色、品牌及艺术归属继续有效，不把颜色/母题中的人物词当作经营授权。分类器不推断项目行业、菜系、审美、施工或额外可见性。
3. 标准路径先经既有 subtype scope 投影，再决定 owner。现有规则允许当前镜头的 chef/steam 原句，但 lobby 下的 dining 句仍为画外；仅改变 shot 不能绕过 subtype 边界。未知 subtype 继续沿用现有 unresolved scope，审计明示其状态，不新增场景或 shot 别名。
4. 使用既有 renderer：优先保留已在 functional_requirement 或 architecture_function_bridge 中实际渲染的同文要求，否则由 composition.mustBeVisible 执行。仅针对可见条目消除多处执行；品牌去重仅检查投影后真正执行的列表，不检查原始集合。艺术项仍由 composition.artisticFocus 负责，Logo/文字身份继续后合成。
5. reference_first/continuation 继续由目标场景程序决定功能，不将标准路径修复变成对原项目要求的隐式兜底。art_direction_reference 继续使用原有 source scope 和确认/模型/参考资产门禁。所有确认、指纹、权限和 stale 逻辑保持不变。
6. 每项保留原始 sourcePath/text、分类和理由、路由、scope 与投影后文本、唯一 owner/字段、去重去向和拒绝原因。Compiler 附实际渲染 block 与最终文本保留状态；sourceMap 只声明 renderer 真正读取的字段。审计不等于视觉验收。

先运行专项失败测试，保留修复前输出；然后实现最小修复和离线 payload 对照。历史 Golden、已提交 Prompt 哈希及 implementation-integrity 不变。行为变化引发的保护差异将单列审批，不绕过 guard。
