# 设计决策保真度：离线 Prompt 前后审查

状态：只读研究与审查提案。没有改生产编译器，没有真实模型调用，没有编辑原 Packet，也没有把历史验收图送作 Provider 参考。

## 对照文件

- [修改前：实际发送的8733字符 Prompt](E:/image-quality-regression-evidence/design-fidelity-audit/prompt-before.txt)
- [修改后提案：6217字符审查稿](E:/image-quality-regression-evidence/design-fidelity-audit/prompt-proposal.txt)
- [完整逐行差异](E:/image-quality-regression-evidence/design-fidelity-audit/prompt-review.diff)
- [来源、摘要和未决项](E:/image-quality-regression-evidence/design-fidelity-audit/prompt-review-metadata.json)
- [只去掉 Architecture Context 的离线消融文本](E:/image-quality-regression-evidence/design-fidelity-audit/prompt-without-anchor-context.txt)

修改前由原有正式纯编译函数复现，与最新实际请求内的最终 Prompt 逐字一致，SHA-256：`9494e7cf932217af59d3aaa45a9d74781d4f5365682dd2fae8069bac807a5f5d`。

“修改后”是为审查拟议行为而**人工整理的渲染提案**，不是已经修改过的 compiler 输出，也不是语义一致性测试已通过的生产 Prompt。其开头明确 REVIEW DRAFT ONLY，含未决冲突；禁止直接送给 Provider。SHA-256：`54d477dcf35b1802832617c58569f751c13f3cba3df30a9e275269620caa1461`。字符减少本身不证明质量提高。

## 改动的来源分层

已有 Packet 仍提供：品牌色名称及空间用途建议、材料名与短行为、大型艺术装置提案、接待/隐私功能、运营关系。本次用户新增的艺术展馆气质单独标为 user-confirmed positioning；没有假装它早就在旧 Packet 里。

历史图观察到的暖白比例、珠光光学表现、薄片层厚与准确落位没有写成已确认素材事实，也没有写成通用规则。提案明确指出当前 Packet 不能支持这些实施细节。它展示“如何把已知决策传达清楚，以及如何暴露未知”，不是手工编出一份必然逼近历史作品的答案。

## 关键差异摘录

| 原有实际文本/输出 | 审查提案 | 意图与边界 |
|---|---|---|
| Commercial Reality (do not turn the space into a gallery) | Commercial functionality and artistic character are simultaneous requirements | 移除与用户定位冲突的默认风格禁令；不取消诊疗、隐私或运营 |
| The spatial concept must be consistent with these mechanisms, never conflicting | User-confirmed intent and locked assets outrank optional architecture examples | 项目先于可选锚点；提案禁用自动品牌名先验，不改 registry |
| 品牌附着建筑、顶面承担主要姿态 | No inferred ceiling gesture has authority to displace the project focal hierarchy | 不因天花词自动指定全局主角；仍保留项目确实提出的天花建议 |
| layers.color 未渲染 | 完整列出现有 primary/secondary/accent 的 role，并标明墙面角色与小件限制冲突、比例未知 | 不设固定紫色阈值；颜色角色不能只靠材料名暗示 |
| 品牌句和全院功能重复多次 | 色彩角色、项目意图、功能关系各自集中表达 | 不把主题出现频率当作目标 |
| 大型装置原句在品牌段；构图清单只有前台/隐私隔断 | 把已有大型装置提案和“艺术/建筑/材料/体验整体关系”放入主次要求；安装方式仍未决 | 保障视觉核心可达，但不擅自规定落地、吊装或墙装 |
| “curve/layer/flow”扩为固定墙顶形态 | 保留原有主语和对象，并声明动线流动不独立授权曲墙、光影层叠不独立授权几何天花 | 纠正语义作用域，不统一消灭复杂建筑 |
| 所有程序节点必须在一张图中可读 | 接待镜头显示接待、候客、动线、隐私；全院运营关系作为画外组织条件保留 | 不为表现行业而暴露治疗区域；不是删除商业功能 |
| 有色材料 role 被覆盖为 accent-only | 材料原始作用与光学词独立保留，色彩范围冲突另列 | 不让颜色过滤擦掉材料行为；不存在的珠光参数保持未知 |

## 未决项与后续

当前资料缺少确定的色彩空间分配、装置安装/尺度、材质光学机制等实施关系。本次用户已明确艺术展馆定位，但不能据此自动填写这些参数。后续应在授权后的独立项目分析/决策流程中明确它们，不能用行业模板、历史图像或手工填入所有项目的默认值替代。

仅去锚点的消融文本为7594字符，其他块完全相同。该离线结果说明单改 Architecture Context 不足以修复色彩角色、动作扩写和焦点缺失；没有真实生成来验证去锚点后的视觉质量，本报告也不暗示已经验证。

代码改动范围、通用反例和验证门禁见 [修改方案](./design-fidelity-change-proposal.md)。实际审计结论见 [根因证据](./design-fidelity-root-cause-audit.md)。按用户要求，在这些审查材料完成后才申请实施授权；当前所有源码、完整性摘要与 Golden 保持本轮起点状态。
