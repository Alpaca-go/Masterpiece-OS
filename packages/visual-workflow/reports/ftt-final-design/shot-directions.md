# 三个镜头的离线生成方向

共同控制：Seedream 5.0 Pro（`doubao-seedream-5-0-pro-260628`）、standard、16:9、2K、1 张、显式镜头、零参考图、Logo post_composite。A/B 同镜头的 task 逐字相同，模型/参数相同；区别在公开列账的实验 Packet 字段。A 仅作历史诊断对照，不自动推荐执行其错误定位或未审参数。

## 1. dining / three_quarter_wide · 优先

**状态：等待人工确认与模型授权。** 离线核心输入完整；这不等于实际模型调用已获准，不能由编译成功推断视觉效果更好。此镜头不受 storefront 窗口问题连带阻断。

方向：温暖、热闹、亲切的社区四川小馆，用开放明档、厨师制作、食物热气、服务柜台、木质桌椅和桌边顾客形成可读经营关系。服务与顾客侧、通道可进入，人尺度由相互关系表达；不沿用旧 booth 网格及厘米尺寸，不指定客群画像和人数。现代设备与清洁可读的工作面可以并存，不推成商场快餐或精致酒店餐厅。

本轮五类可观察输入：

| 源句 | 来源/边界 | 离线结果 |
| --- | --- | --- |
| `chef preparing food in kitchen` | 历史人审经营经验的离线作者表达，具体厨房仍为方案 | current_shot，唯一 composition owner |
| `steam above dishes in kitchen` | 厨房暖光/热气经验，不是实测烟汽量 | current_shot，唯一 composition owner |
| `customers dining at tables` | 历史顾客/就餐关系，不规定画像或人数 | current_shot，唯一 composition owner |
| `service counter with an accessible staff side and customer handoff side in dining area` | 经营观察与用户服务目标的具体方案假设 | current_shot，唯一 composition owner |
| `wooden dining table and chairs with accessible service aisle on both sides in dining area` | 木质家具/人尺度的待确认表达，无尺寸及数量承诺 | current_shot，唯一 composition owner |

桌椅源句在作者草拟时曾用复数简写，现有分类器未取得执行职责。作者改写为明确的 table 与双侧 access 关系，并公开记录在 [authoring-normalization.json](authoring-normalization.json)；没有改分类器、既有测试或生产字段。

原始点餐→制作→取餐→就餐全局链在 trace 中作为依赖保存，不作为全部同框要求。外带包装的位置与设置方式待物业确认，也不成为堂食画面的额外必备设备。已具备核心经营可见要求、定性材料/光感和品牌后期合成职责；参数缺证处明确未指定，不为完整性而伪造。

人审重点：是否看得出跷脚牛肉/四川小吃品类而非普通咖啡馆；制作、服务、就餐是否相互合理；暖木/赤陶与暖光是否适合当前项目；人尺度与活动密度是否亲切自然；是否保留卫生与可进入通行；是否需要修改通用模板措辞。没有新图，以上均为未来验收标准。

完整 A/B 与 B*： [prompts-dining.md](prompts-dining.md)。

## 2. entrance / entrance_view · 条件方案

状态：入口局部方案待人工审核；局部堂食内景可见范围尚未授权。没有将完整经营网络强行推进入口。

方向：社区临街小馆的门槛、进入路径与局部营业感，温暖、可接近，保留通向堂食区的联系。当前可执行的作者假设为 `staff serving customers at entrance`，不把迎接/服务活动扩展成酒店前台和候客程序。

`Entrance access connects to dining area through a clear threshold route` 保留为当前边界/通行关系；`other dining interiors remain off frame` 保留限制。厨师、厨房热气、桌边顾客未列为此镜头必须出现。局部堂食展示目标需要设计师明确实际视线与来源，不能把“连接堂食”当作获得完整堂食内景渲染权威。

实验作者把本镜头 sceneProgram 明确选为“入口到达与通行路径、入口局部服务活动”。原全局短标签没有位置证据，不能只因未命中 foreign 词就照单要求显示。原完整程序和网络仍在 A、差异账本及 B 的依赖来源中保留；这不是 Compiler 自动理解全局节点，也不是修改生产投影规则。

材质/照明只准备入口适用的暖色方向，未用厨房重点照明跨镜头要求室内厨房出现。实际开口、门槛条件、局部可见范围及入口活动仍待人审。

完整 A/B 与 B*： [prompts-entrance.md](prompts-entrance.md)。

## 3. storefront / front · 不具备完整许可

状态：**未获得完整生图许可，window visibility 为 review_required。** 显式 storefront/front/user_explicit 权威可解析，但这只验证外立面目标，不能代替窗口权限。

方向：街道—门面—门槛的可辨识关系，品牌原标识、品类和 Slogan 后期合成。当前源句 `staff serving customers at storefront` 是外侧活动的方案假设；不编造具体街道尺寸、物业、雨棚或玻璃分格。

保留用户“通过临街玻璃展示营业氛围”的设计目标。其具体实验映射 `chef preparing food in kitchen visible through storefront glazing` 被现有机制标记 review_required，owner/outputText 为空，不进入正式或 Provider Prompt；原句与来源留在 trace。不能手工搬入 currentInstruction、B* 或 Provider payload 来绕过这一结果。

仍需审核：实际观察点、玻璃/开口绑定、允许可见的局部内容、遮挡、室内隐私、外立面材料适用性及标识资产。未解决前不假造玻璃正例通过，不修改 Compiler。该问题只阻塞此镜头的完整目标，不阻塞堂食单镜头的人审和另行授权。

本镜头 sceneProgram 明确选择“门头与外立面、临街外侧的到达路径”，品牌表达和差异化文本也限制在外侧职责；不以无位置的点餐、取餐、外带短标签要求画面显示完整室内程序。

完整 A/B 与 B*： [prompts-storefront.md](prompts-storefront.md)。
