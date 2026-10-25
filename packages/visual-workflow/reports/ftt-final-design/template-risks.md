# 通用 Prompt 文字风险审核与实验建议

本轮正式 Compiler、Prompt 资产、完整性摘要均未修改。A/B 的“正式 Prompt”是冻结 Compiler 原样输出。另有 **B*** 人工审阅建议副本，只有文本建议意义，不是可直接发送的正式请求，不继承正式 sourceMap/路由指纹的许可。

| 文本与位置 | 分类 | 本项目判断 | 建议 |
| --- | --- | --- | --- |
| Architecture DNA 中 `gallery-like` | 有来源支持时可选的正向风格候选，并非无条件强制 | 当前项目未选择画廊气质，通用可选先验可能干扰社区小馆；没有图片证据证明已造成污染 | B* 仅替换该整句为本项目温暖热闹亲切方向；不改其他项目，不删除来源中真正选择的艺术表达 |
| Task 中 `premium-grade` | 主要为输出完成度要求，也有消费气质歧义 | 不能据一个词判定高端餐饮；仍可做中性对照 | B* 可选改为 commercial architectural；这是措辞建议，不是已证明的质量修复 |
| Rendering 中 `High-end architectural visualization, photoreal, physically based materials` | 技术渲染质量描述 | 不等于高端精致餐饮的正向经营程序 | 本轮 B* 仍保留，保持曝光、白平衡、材质与阴影可读要求 |
| Architecture Context 中 `practical reception, waiting, access and privacy requirements` | 通用正向语境，混合了功能与边界词 | 接待/等候可能带来不必要场景暗示，但这不是餐饮 Packet 已含酒店/咨询功能的证据 | B* 按 dining、entrance、storefront 各自职责替换；access/privacy 合法边界继续保留，不全局删隐私 |
| Architecture-Function Bridge 中 `Industry constrains use, access and privacy` | 通用使用/边界说明 | 可以服务正常通行、经营与隐私，不自动构成咨询室 | 保留；实际正向功能仍来自项目和场景投影 |
| `no generic AI clinic look` 等 Prohibited 条目 | 合理负向防污染 | 不应当作正向诊所节点，不能仅据 clinic 一词判定跨行业功能 | 保留；不添加任何临床业务到本项目 |
| `physically credible`、`buildable junctions`、受控透视、不过曝 | 技术质量目标 | 不能取代材料规格/物业验证，也不直接规定消费层级 | 保留，不据此填造反射率、构造或尺寸 |
| 历史入口即厨房、全店同框、环绕台、灯笼、菜单/Logo贴字 | 项目旧正向提案/旧渲染要求 | 有些经营目标合理，但位置、同框或文字权威不成立 | 本轮 B 在输入副本重整与分镜头，不通过改 Compiler 或直接覆盖 Provider payload 放行 |

三镜头的 B* 建议均使用明确的句级白名单替换，旧句必须恰好匹配一次；改前/改后/理由及各稿摘要见 [template-advisory-patches.json](template-advisory-patches.json)，完整稿见各镜头 Prompt 文档。保留技术质量与负向身份保护，避免“一键删高端/接待”等粗暴规则。

若设计师选择 B*，未来需先解决正式可执行路径及相应审批，重新核对最终 Prompt/sourceMap/指纹；不能把已格式化的 B Provider body 手工换成 B* 后绕过门禁。本轮没有为 B* 构造 Provider 请求。词频、文本长度和测试通过均不证明视觉同质化或质量改善。
