九州美学｜下一轮建筑语言定向修正执行文档（零参考图质量目标）

版本：v1  适用仓库：`Alpaca-go/Masterpiece-OS`  目标分支：`fix/jiuzhou-architectural-language`  适用对象：Codex / 项目执行者  执行性质：**离线定向修正与审查**  本轮授权：**不授权新的真实生图、不授权收费质量校验、不授权自动重试、不授权主线合并与发布**

---

一、任务目标

本轮定向修正的核心目标不是简单“再做得更好看”，而是：

> **让九州美学项目在标准零参考图生图路径下（`generationBasis: standard`、`referenceAssetIds: []`、请求体无 `image` 字段），依然能够稳定生成接近图2—图4质量的空间效果图。**

也就是说：

- **对比图（图2—图4）只作为人工审查与方向校准依据**- **不能将这些图作为下一轮正式生图的参考图输入**- 修正重点必须落在：  - 项目级设计方向  - 建筑语言  - 功能组织  - 构图关系  - 漂移防护（drift guards）  - Prompt 的正向表达能力

最终要实现的是：**即使没有参考图喂给模型，仍然能凭项目本身的设计方向与标准 Prompt 把图生到对的质量层级。**

---

二、当前问题诊断（基于最新真实生图 vs 图2—图4）

1. 已改善的部分- 比更早版本更开敞，狭长走廊问题有所减弱- 接待、候客、艺术焦点三者基本可辨认- 暖白、乳白、柔光、局部紫色等大方向没有完全跑偏

2. 核心问题最新真实生图仍然没有达到图2—图4的空间质量，主要问题如下：

#### A. 艺术装置仍然被模型理解为“独立中央雕塑”- 形成“普通大厅 + 中央大型花瓣状雕塑”的结果- 没有真正承担建筑分隔、透景、空间引导作用- 遮挡了后方空间递进

#### B. 建筑空间本身仍不够强- 顶面仍偏平、偏普通大厅- 净高感更多依赖取景和留白，而不是空间体量关系- 去掉装置后，背景建筑语言仍然偏通用高端商业空间

#### C. 功能组织尚不够完整- 前台、候客、艺术焦点仍然有“并排陈列”的倾向- 半开放过渡区与后续隐私边界的空间递进不够清楚- 医美接待运营逻辑仍弱于图4

#### D. 艺术形态与材质表现发生漂移- 层片被生成成较厚、较圆、较密的花瓣团簇- 不够轻薄、精密、连续、方向性明确- 紫色从“层片内层局部虹彩”外溢到了软装- 光线偏强直射，削弱原本应有的柔和漫射气质

---

三、下一轮目标方向（综合方案）

本轮采用以下综合方向：

- **以图2的“建筑融合”为核心**- **吸收图3的“装置精致度”**- **吸收图4的“商业功能组织”**

一句话概括为：

> **生成一个由建筑空间、半透明珠光艺术系统、真实接待运营逻辑共同构成的高端医美主接待空间，而不是一个大厅里摆放艺术雕塑的场景。**

---

四、必须达成的设计修正

4.1 建筑—艺术关系：从“摆在空间里”改成“长在空间里”

必须实现主艺术系统必须是：- 与建筑界面连续的半透明层片系统- 可参与顶面边界、竖向界面、候客区围合、透景与空间递进- 与建筑整体共同构成空间，不是独立物件

必须避免禁止出现：- 中央独立完整雕塑- 花束化、贝壳化、羽毛簇团化装置- 一个大装置挡在中间，后方空间被遮住- 以“大件艺术摆件”替代建筑组织

---

4.2 空间结构：建立可读的五段式组织

下一轮必须明确以下空间关系：

1. **前景到达区**     - 清晰通行   - 给出主厅开敞感   - 不能一进门就被大装置堵住

2. **接待服务锚点**     - 接待台清楚可辨认   - 位置稳定、尺度可信   - 是功能锚点，不是主艺术焦点

3. **候客 + 艺术停留区**     - 至少一组成组座椅 + 小桌   - 与主艺术系统建立视觉/位置关系   - 形成“候客 + 停留”的复合体验

4. **半开放过渡区**     - 在画面背景中可读   - 展示主厅向后续空间递进   - 可通过半透明界面、退让、错位来表达

5. **错位隐私边界**     - 暗示后续更私密空间   - 不展示内部   - 不得恢复“前台旁窄长走廊 + 连续门洞”的旧问题

---

4.3 艺术系统：提升精致度，但不回到“装饰摆件”

艺术系统的正确特征- 轻薄- 半透明- 珠光- 精密- 连续- 有方向性- 有层间深度- 有透景能力- 局部内层有弱紫虹彩

必须避免- 圆厚花瓣- 密实不透- 对称图腾感太强- 婚庆装置感- 一坨完整的大雕塑- 平面墙饰化- 简单灯槽化

---

4.4 商业功能组织：吸收图4，但不退化为普通医美大厅

必须实现- 明确看出这是高端医美接待主厅- 接待台、候客区、艺术停留、后续过渡关系都合理- 候客不是角落塞几张椅子- 动线不被艺术系统阻断- 有真实“到达—接待—等候—转场”的服务逻辑

必须避免- 纯艺术展厅感，缺乏商业用途- 普通商业大厅感，缺乏品牌独特性- 功能元素横向平均摆放、互不关联

---

4.5 构图：不要平均摆放，要体现空间递进

推荐- 入口斜向视角- 前景 = 到达 / 通行- 中景 = 接待锚点 + 候客 / 艺术停留- 背景 = 半开放过渡 + 错位边界

禁止- 中央装置居中- 左边前台，右边沙发，三者平均分布- 超广角畸变- 用取景回避空间组织问题

---

4.6 光、色、材料：保留气质，纠正漂移

继续保留- 暖白、乳白为主的低对比背景- 浅暖灰作为辅助接待表面- 品牌紫只作为局部弱点缀- 柔和自然光 + 克制间接光- 安静、明亮、美术馆气质

修正要求- 品牌紫只允许出现在层片内层和少量细部- 不扩散到主要软装表面- 减少强直射和硬阴影- 不依靠灯带、发光描边制造“高级感”

---

五、这轮修正的技术目标：必须服务于“无参考图也能出对图”

本轮最重要的约束如下：

5.1 不允许依赖参考图达成质量即使图2—图4被用来给 Codex 审阅，也必须满足：

- 它们只作为**人工设计对照**- 不得将其加入下一轮正式标准生图请求- 不得走 reference-first 路线- 不得把它们变成 referenceAssetIds- 不得把它们变成带 image 字段的生图请求

5.2 优先修改项目级设计方向，不轻易修改通用编译器优先检查并修正：- `Architecture Language`- `Architecture-Function Bridge`- `Functional & Commercial Requirement`- `Material System`- `Lighting System`- `Composition`- `Concept Drift Guards`

目标是让**项目级设计方向本身足够强**，而不是靠全局系统改造去“兜底”。

5.3 如果项目级修正无法充分表达，再报告，不擅自扩大修改范围只有在确认：- 项目级字段已经无法准确承载需求- 且有明确证据说明通用编译逻辑阻碍表达

才允许提出进一步修正建议，但本轮不授权直接改生产通用编译器。

---

六、Codex 本轮需要完成的输出

本轮完成后，必须提交以下离线成果：

1. **字段级修改前后差异**2. **新的正式 Prompt（完整）**3. **标准业务请求预演结果**4. **项目级修正审查报告**5. **一份明确回答下列 7 项的检查清单：**

检查清单1. 主艺术系统是否已经不再是独立中央雕塑？2. 它是否与建筑界面和空间分区建立了连续关系？3. 五段式空间关系是否在 Prompt 中被明确表达？4. 候客 / 接待 / 过渡 / 隐私边界逻辑是否完整？5. 是否避免了“普通大厅 + 一件艺术品”的方案？6. 色彩、材料、光线是否仍保持原先已认可方向？7. 新方案是否明确支持“零参考图标准生图路径”？

---

七、本轮禁止事项

本轮明确禁止：

- 新的真实生图- 收费质量校验- 自动重试- 重生成- 定向纠正- 合并 `main`- 发布- 更新 Golden- 覆盖正式项目- 将图2—图4作为下一轮正式生图参考图输入

---

八、建议发给 Codex 的文件

如果 Codex **可以直接读取仓库分支**，你不必逐个上传所有 repo 内文件；最推荐的做法是：

A. 必发1. **本执行文档**2. 分支链接：     `https://github.com/Alpaca-go/Masterpiece-OS/tree/fix/jiuzhou-architectural-language`3. 四张图：   - 图1：最新真实生成结果   - 图2—图4：你认可的目标质量图

> 注意：给 Codex 时要明确写明：  > **图2—图4只用于人工审查与方向校准，不授权进入正式生图参考链路。**

---

B. 建议在消息里点名让 Codex 优先查看的仓库文件

#### 核心必看- `packages/visual-workflow/reports/architectural-language/formal-prompt.txt`- `packages/visual-workflow/reports/architectural-language/confirmed-direction.json`- `packages/visual-workflow/reports/architectural-language/development-brief.md`- `packages/visual-workflow/reports/architectural-language/review.md`

#### 最新真实生图结果与评审- `packages/visual-workflow/reports/architectural-language/real-generation/execution-review.md`- `packages/visual-workflow/reports/architectural-language/real-generation/visual-comparison.json`- `packages/visual-workflow/reports/architectural-language/real-generation/execution-summary.json`- `packages/visual-workflow/reports/architectural-language/real-generation/request-comparison.json`

#### 如需看修正来源与差异- `packages/visual-workflow/reports/architectural-language/direction-diff.json`- `packages/visual-workflow/reports/architectural-language/initial-direction.json`- `packages/visual-workflow/reports/architectural-language/natural-language-input.json`- `packages/visual-workflow/reports/architectural-language/task-contract.json`

---

C. 如果 Codex 不能稳定读取仓库文件，再额外发送这些导出的文本优先顺序：1. 本执行文档2. `formal-prompt.txt`3. `execution-review.md`4. `visual-comparison.json`5. `confirmed-direction.json`

---

九、推荐你发给 Codex 的说明话术（可直接复制）

请基于 `fix/jiuzhou-architectural-language` 分支，执行九州美学下一轮建筑语言定向修正。

本轮目标不是继续依赖参考图，而是让项目在 **标准零参考图路径** 下，也能稳定生成接近图2—图4质量的结果。  图1是最新真实生成结果；图2—图4是我认可的目标质量图，但它们**仅用于人工审查和方向校准，不得加入正式生图参考链路**。

请优先阅读我附带的执行文档，以及仓库中以下文件：

- `packages/visual-workflow/reports/architectural-language/formal-prompt.txt`- `packages/visual-workflow/reports/architectural-language/confirmed-direction.json`- `packages/visual-workflow/reports/architectural-language/development-brief.md`- `packages/visual-workflow/reports/architectural-language/review.md`- `packages/visual-workflow/reports/architectural-language/real-generation/execution-review.md`- `packages/visual-workflow/reports/architectural-language/real-generation/visual-comparison.json`

本轮只授权：- 项目级设计方向修正- 离线编译与审查- 预演标准请求

本轮不授权：- 新的真实生图- 收费校验- 自动重试- 主线合并- 发布- Golden 更新

完成后请交付：1. 字段差异  2. 新的正式 Prompt  3. 标准请求预演  4. 审查报告  5. 零参考图质量目标是否被完整支持的结论

---

十、最终判断标准

只有当新的项目级设计方向能够明确保证以下结果时，本轮修正才算方向正确：

- 即使不喂参考图，Prompt 自身也足够强- 模型不会再默认走向“普通大厅 + 中央雕塑”- 建筑—艺术—功能三者形成统一空间系统- 目标质量靠项目设计语言达成，而不是靠临时参考图兜底
