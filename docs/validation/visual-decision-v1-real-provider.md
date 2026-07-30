# Visual Decision v1 九州美学真实 Provider 验收

日期：2026-07-30
用户授权：是（用户要求使用同一 Seedream 验证自动 Prompt）
验证项目：九州美学，27 张原始视觉方案图
基准：`docs/九州美学垂直测试`

## 最终分析结果

- Provider / model：Qwen / `qwen3.6-plus`
- 终态：`completed`
- 模型调用：2（兼容分析 1 次，Unified Visual Understanding 1 次）
- 完整分析耗时：315,847 ms
- 报告：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\outputs\九州美学-视觉方案升级报告-qwen3.6-plus.md`
- Visual Decision Packet：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\project-context\visual-decision-packet.json`
- 报告组成：8 个 Source Fact 标记、11 个 AI Diagnosis 标记、38 个 Creative Proposal 标记
- Packet：Hard Fact `pass`、执行数据 `ready`、空间转译 `ready`

最终 Packet 的关键空间执行数据：

- 四组张力完整：东方雅致、医疗严谨、未来材料、人文温度，并分别带负向边界。
- 色彩行为：暖白/浅灰 70%，珠光浅紫 20%，孔雀紫 10%。
- 材料行为：白/浅灰微水泥或石材、紫色半透明树脂或 U 型玻璃、拉丝古铜/玫瑰金。
- 光线行为：自然光和柔和漫反射；光线穿透半透明树脂；禁止霓虹和彩色氛围灯。
- 场景误读：美容院、公立医院、KTV/夜总会、售楼处。

## 自动 Prompt 结果

- 编译器：vNext Prompt Compiler `3.0.0`
- Prompt 长度：5,420 字符
- 必需区块：12/12
- 真实语义信号：16/16
- Hard Fact / Upgrade Thesis / Brand Translation / Tone Boundary / Color-Material-Lighting / Task Contract 覆盖：全部 100%
- 冲突：0
- Logo 模式：`reference`
- Logo 参考资产：`c0a447ca-4e42-46ab-ac2b-94edf2bc3dde`
- 编译产物：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\image-generation-vnext\compilations\vnext-task-b5205ac2-7404-4057-863e-033232f86cec`

## 最终 Seedream 结果

- Provider / endpoint model：Volcengine / `doubao-seedream-5-0-pro-260628`
- 终态：`succeeded`
- 模型调用：1
- 耗时：94,976 ms
- Run：`cb8a852d-6867-4e32-9f7d-104588672839`
- 图片：`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-f67ac606\image-generation\cb8a852d-6867-4e32-9f7d-104588672839\images\image-01.png`

当时的视觉自查记录如下；根据后续《九州美学空间图验收反馈清单 v1.0》，该结果已于下一轮校准中降级为 `partial_pass`，不得作为最终通过稿：

- 通过：明确属于九州美学，Logo 与中文品牌名清晰。
- 通过：暖白/矿物灰为主体，紫色是重点而不是满铺。
- 通过：羽毛被转译为半透明树脂/玻璃层叠结构，不是写实孔雀或舞台纱幔。
- 通过：入口、前台、等候区和自然动线完整。
- 通过：没有木格栅办公前台、VI 展板、多格拼贴、茶空间、KTV 或售楼处表达。
- 部分通过：已出现东方雅致、医疗专业、未来材料和人文温度，但平台角色、分散式空间转译、紫色权重、Logo 克制程度和空间纵深仍未达到 Golden Prompt 基准。

## 验收中发现并修复的问题

1. “禁止将 Logo 变形”被误判为“禁止 Logo”：收紧 no-Logo 冲突规则。
2. vNext 适配器 ID 覆盖 API Profile 的真实端点模型，导致 404：有 Profile 时由 Profile 决定可调用模型。
3. Unified 提取失败后仍复用旧 Packet 并继续生图：改为失败关闭。
4. VI 品牌紫被直接放大为 60% 空间主色：增加空间色彩角色与比例门。
5. 半透明抽象被降级为纱幔/装饰：增加可建造结构与非装饰化门。
6. 张力和场景风险被合并或漏项：增加四轴张力与四类场景 Schema 槽位及语义覆盖校验。

## 专项反馈回归

修正后的 A/B/Golden 对照、字段差异、残余风险与逐项验收见
[`jiuzhou-space-feedback-v1/abc-comparison.md`](./jiuzhou-space-feedback-v1/abc-comparison.md)。

- B 修正自动：`3e67e719-8683-41b1-ab72-824ee7e1dc76`
- C Golden 原文：`baabcb12-351b-48d5-97c6-a2a305a7d908`
- 两组均使用 `doubao-seedream-5-0-pro-260628` 并到达 `succeeded`。
