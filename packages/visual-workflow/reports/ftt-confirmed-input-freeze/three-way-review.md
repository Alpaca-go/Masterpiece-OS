# 三方字段差异与指纹迁移

A 为 E0 未确认输入；B 为 02E1 已有的最小内存确认诊断；C 应为合法项目确认后的正式服务编译，本轮 C **不可得**。JSON 逐字段列出 150 行，C 每一行都标记 unavailable / not_comparable，不能据此声称三方完整通过。

| 比较项 | A → B | C 状态 |
| --- | --- | --- |
| 社区四川小馆定位、红砖、暖木、赤陶色地面、浅抹灰、假设自然光 | 完全相同，无新增设计研发 | 未编译，不能比较 |
| 五项厨师 / 热气 / 顾客 / 柜台 / 木桌椅要求与全店网络 | 完全相同，无增删 | 未编译，不能比较 |
| 品牌、材料、照明、配色原值及负面规则 | 完全相同 | 未编译，不能比较 |
| projectId、dining、three_quarter_wide、模型与固定参数 | 完全相同；诊断沿用 E0 逻辑 ID | 实际项目身份与分析来源未进入正式编译，待审 |
| provenance.createdFrom | 附加历史授权证据引用 | expected_authority_transition；不替代真实项目确认记录 |
| provenance.sourceFingerprint | 因确认对象绑定而变化 | 真实绑定分析指纹、确认记录 ID 与 SHA 仍未获得 |
| provenance.userConfirmedFields / userConfirmationId / userConfirmationSource | 从无到有 | 正常确认来源转换；诊断标识不可用于正式执行 |
| 配色执行权威与建筑说明句 | proposal_only → user_confirmed_design_intent；明确设计意图并保留未验证施工事实边界 | 正式服务结果仍需逐字核查 |
| gallery-like、premium-grade、reception/waiting | A、B 都保留，已知未处理风险；high-end 渲染语境与负向防污染规则也不变 | 不私改模板；未来 C 需再次核对 |

A/B 实际源码重放与四个已知 Prompt SHA 全部一致。剔除 provenance 后，Effective Packet 深度相等；正式 Prompt 差异仅涉及既有模板的确认权威表达，精确补丁保留在 [02E1 原始证据](../ftt-first-image-test/formal-confirmation-difference.patch)。未观察到 A/B 未解释的新设计句、经营行为、材料或负面要求。

C 未建立，因此不能声称当前用户项目的旧分析与 E0 无冲突，也不能假定 B 就是 saveDraft → confirm → capture 的输出。合法项目确认时产生的 ID、分析指纹、记录摘要、来源及可能的模板字段变化必须单独解释。任何超出 E0 的新增要求或未知来源变化均阻塞；只有正常来源转换可分类为 expected_authority_transition。
