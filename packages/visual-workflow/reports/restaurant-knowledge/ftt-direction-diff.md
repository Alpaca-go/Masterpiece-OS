# 冯烫烫离线修正差异

状态：proposed_offline。比较基线是历史证据摘录，不是图 1 实际方向。

- **retain / service**：点餐、取餐、堂食、外带、明档展示 → 堂食为主，兼顾外带；保留高效点餐、现代设备、卫生与合理动线。。来源 historical_packet:mediaTranslations.spatial.sceneProgram；效率机制可保留，不推导整体极简快餐风格。 未来验证：实际项目运营需求及厨房服务关系复核。
- **correct / positioning**：从传统川菜馆升级为现代川味小吃快餐 → 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠。。来源 historical_packet:creativeDecision.uniqueUpgradeThesis；以方案确认目标为准；历史提案不得覆盖设计目标。 未来验证：人审社区小馆定位与品牌识别。
- **correct / materials**：历史验收认可暖木、赤陶及厨房暖光 → 项目级候选：红砖、暖木、赤陶与暖光；不是四川餐饮通用模板。。来源 human_evaluation:dimensions.materialAndLighting；恢复项目级经验；红砖来自方案及历史 Prompt，并非新图验收。 未来验证：同镜头材质、光照及经营密度人工审查。
- **remove / mandatoryCulturalSymbols**：悬挂灯笼等历史 Prompt 条目 → 不继承为必备装饰，不生成全局禁用条款。来源 historical_prompt:Human Experience；地域性不等于必需特定符号。 未来验证：审查符号是否有项目证据且未喧宾夺主。
- **correct / relationships**：历史验收认可开放厨房、服务、顾客等关系 → 明档厨房—厨师实际处理食材—可见热气与菜品—服务柜台—顾客桌边就餐；主通道可进入。。来源 human_selection:golds[0].reason；将经营真实性转换成可观察条件，仍需镜头验证。 未来验证：检查厨师、食物、餐桌、顾客与可进入主通道。
- **unknown / shot**：缺失 → 待补证。来源 actual_run:shot；图 1 实际镜头不可确认。 未来验证：补足实际 subtype、shot 与画面身份。
- **unknown / propertyDimensions**：缺失 → 待补证。来源 actual_run:property；目标店型不是实测物业；不编造面积尺寸。 未来验证：取得真实物业条件。

镜头未选择：入口视角检查街面识别与营业纵深；堂食视角检查厨房—顾客—餐桌。不得将两个镜头目标强行合并。
