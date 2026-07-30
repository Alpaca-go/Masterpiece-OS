# 九州美学空间图 A/B/Golden 回归验收

> v1.1 更新：B 组状态已确认为 `pass_with_residual_risk`，人物行为、平台关系、真实 Logo 后合成和三次稳定性抽样已完成。最终 `production_pass` 见 [v1.1 收尾验收](../jiuzhou-space-feedback-v1.1/production-pass.md)。本文保留为 A/B/Golden 历史对照，不再代表当前最终状态。

日期：2026-07-30
专项依据：《九州美学空间图验收反馈清单 v1.0》
统一图像 Provider / Model：Volcengine / `doubao-seedream-5-0-pro-260628`

## 结论

- A 继续冻结为 `partial_pass`，不得作为最终稿。
- B 的自动 Prompt 已通过 `PROMPT_PROJECT_SPECIFICITY_INSUFFICIENT` 项目专属性门禁，并显著修正 A 的巨型装置、紫色过重、门头 Logo、平面门面构图和材料行为不足。
- B 图像验收为 `pass_with_residual_risk`：10 项本轮图像标准中 9 项通过；“全链生态平台”已进入 Project Identity、任务契约和复合功能，但单张图没有人物服务行为，平台协同仍主要依靠等候、接待、咨询路径和后方服务节点暗示。
- 本次 C 虽使用 Golden Prompt 原文，仍随机收敛为单一巨型羽毛装置，证明 Golden Prompt 是质量上限参考而不是逐次必然通过；本轮不能用 C 的随机失败降低 B 的验收标准。
- 未把 Golden Prompt 原文写入生产分析或编译代码。生产门禁只在当前证据或 TaskContract 明确为全链、生态、平台型空间时启用；餐饮和节庆反过拟合用例继续通过。

## 可复核产物

### A：修正前自动 Prompt

- Prompt task：`vnext-task-b5205ac2-7404-4057-863e-033232f86cec`
- Prompt 长度：5,421 字符
- Prompt：[compiled-prompt.md](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation-vnext/compilations/vnext-task-b5205ac2-7404-4057-863e-033232f86cec/compiled-prompt.md>)
- Image run：`cb8a852d-6867-4e32-9f7d-104588672839`
- Image：[image-01.png](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/cb8a852d-6867-4e32-9f7d-104588672839/images/image-01.png>)
- 冻结记录：[baseline-a-partial-pass.json](./baseline-a-partial-pass.json)

### B：修正后自动 Prompt

- Prompt task：`vnext-task-fde9fd7b-30b3-4e9f-8ea3-91cca168bc5c`
- Prompt 长度：6,836 个 Unicode 字符（PowerShell 文件读取含末尾换行为 6,837）
- Prompt：[compiled-prompt.md](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation-vnext/compilations/vnext-task-fde9fd7b-30b3-4e9f-8ea3-91cca168bc5c/compiled-prompt.md>)
- Image run：`3e67e719-8683-41b1-ab72-824ee7e1dc76`
- Image：[image-01.png](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/3e67e719-8683-41b1-ab72-824ee7e1dc76/images/image-01.png>)
- Qwen 分析：`qwen3.6-plus`，2 次模型调用，终态 `completed`，完整重分析约 382.4 秒
- Seedream：1 次模型调用，终态 `succeeded`，约 54.7 秒
- Composition：7 Source Fact、11 AI Diagnosis、43 Creative Proposal、1 个完整抽象、Spatial `ready`
- Compiler：12/12 必需区块、0 缺失、0 冲突、16/16 冒烟信号

### C：Golden Prompt 原文

- Prompt：[jiuzhou-space-golden-prompt.md](<E:/Masterpiece-OS/docs/九州美学垂直测试/jiuzhou-space-golden-prompt.md>)
- Prompt 长度：1,595 个 Unicode 字符
- Image run：`baabcb12-351b-48d5-97c6-a2a305a7d908`
- Image：[image-01.png](<C:/Users/Administrator/Documents/Masterpiece OS Data/projects/九州美学-f67ac606/image-generation/baabcb12-351b-48d5-97c6-a2a305a7d908/images/image-01.png>)
- Seedream：1 次模型调用，终态 `succeeded`，约 79.5 秒
- 输入保持原文，只附加与 B 相同的已确认 Logo 资产 `c0a447ca-4e42-46ab-ac2b-94edf2bc3dde`，未经过生产编译器改写。

## 字段差异

| 字段 | A 修正前 | B 修正后 |
|---|---|---|
| Project Identity | 高端医美机构语义为主 | TaskContract 与 Project Identity 明确锁定“高端医美全链生态平台、旗舰复合体验、非单一消费门店” |
| Upgrade Thesis | 高级、克制与羽毛抽象存在，但平台升级因果弱 | 把机构式门店升级为专业可信、系统协同、长期价值的复合平台空间 |
| Brand Translation | 主要集中为右侧单体羽毛装置 | 分散进入半透明隔断、墙体/展示界面、天花曲线、光线过滤与动线节奏 |
| Color Behavior | 紫色形成大面积高权重主体 | 70% 浅灰白/珠光白，20% 半透明/浅银灰，10% 低权重 Peacock Violet；强调色不进入主辅色 |
| Logo Behavior | 顶部中央门头式主招牌 | 单个、小面积、后方内部识别节点；禁止顶部中央、入口门头与最大视觉中心 |
| Scene Storytelling | 入口正视、门面展示，纵深弱 | 35mm、视平线、入口 45° 三分之四视角；前景等候，中景分区/展示，背景接待/服务，连续动线 |
| Material Behavior | 半透明紫色装饰玻璃为主 | 半透明树脂/亚克力、低铁磨砂玻璃、浅色珠光漫反射表面、拉丝冷银节点；含厚度、接缝、收边和透射 |
| Lighting Behavior | 氛围照明主导 | 自然侧光、低对比漫反射、穿过半透明材料形成边缘亮度和纵深 |
| Strict Negatives | 美容院/医院等排除不完整 | 明确覆盖美容院、医院/诊所、茶空间/会所、生活方式零售、售楼处，以及巨型羽毛与门头 Logo |
| Compiler Gate | 通用完整性可通过 | 平台型空间缺任一关键项即抛出 `PROMPT_PROJECT_SPECIFICITY_INSUFFICIENT`，不调用图像模型 |

## A/B/C 验收表

| 维度 | A 当前自动 | B 修正自动 | C Golden 本次 |
|---|---:|---:|---:|
| 成果物命中 | pass | pass | pass |
| 项目身份 | partial_pass | pass | pass |
| 平台品牌角色 | fail | partial_pass | partial_pass |
| 羽毛空间转译 | fail | pass | fail |
| 色彩比例 | fail | pass | partial_pass |
| 材料科技感 | partial_pass | pass | pass |
| Logo 克制程度 | fail | pass | partial_pass |
| 空间纵深 | partial_pass | pass | pass |
| 医疗专业感 | partial_pass | pass | pass |
| 东方生命美学 | partial_pass | pass | pass |
| 模板化痕迹 | partial_pass | pass | partial_pass |

## 本轮 10 项图像标准

| 标准 | B | 证据 |
|---|---:|---|
| 明确属于九州美学 | pass | 后方小面积真实 Logo，空间曲线语言可独立识别 |
| 高端医美全链生态平台旗舰空间 | partial_pass | 复合节点与纵深成立；缺少人物咨询/展示行为的显性证据 |
| 不像美容院、医院、茶空间、办公前台或生活方式零售 | pass | 无门头广告、无茶/木格栅、无零售陈列、无临床器械 |
| 珍珠白、暖灰和矿物灰为主体 | pass | 主体为白灰与中性半透明材料 |
| 紫色为低饱和局部点缀 | pass | 仅 Logo 与少量软装点缀 |
| 羽毛分散进入空间结构 | pass | 天花、两侧透光界面、接待结构共同承担，不是独立单体 |
| 半透明材料具有真实结构和光线行为 | pass | 可见框架、厚度、边缘、透射与层叠光影 |
| Logo 正确且克制 | pass | 单个、后方、面积小于空间结构，非门头 |
| 前景、中景、背景和动线完整 | pass | 前景等候座椅，中景透光分区，背景接待，通路连续 |
| 接近 Golden 品牌气质但不逐像素复制 | pass | 白灰、透光、生长曲线、精密节点成立，且没有复制 Golden 构图 |

## 仍缺失内容与后续边界

生产链路本轮要求的字段、编译门禁和错误码均已补齐。剩余是单张随机图的表现风险：B 没有出现人物，导致咨询、展示、品牌沟通和平台协同关系不够显性。当前 Prompt 已明确要求至少两类复合功能，继续硬编码人物数量或照搬 Golden 场景会把通用空间编译器变成九州模板，因此本轮不以项目特例污染生产代码。后续如产品需要“每次均能证明复合服务行为”，应作为独立的生成后视觉验收/候选筛选能力设计，而不是继续扩写本次 Prompt。
