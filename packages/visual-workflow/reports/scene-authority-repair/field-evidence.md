# 逐字段 / 子句可见性证据

原句、原路径、来源别名、子句区间、网络节点与 trace 见 [完整血缘](field-lineage.json)。匹配仅说明文本进入 Prompt，不代表视觉质量。

| 场景 | 源字段 / 原值 | 规范实体 | 目标 / 权威 | 投影 / 处置 | 正式 / Provider 匹配 |
| --- | --- | --- | --- | --- | --- |
| entrance/A | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | mediaTranslations.spatial.positiveDifferentiators[0]: 明档展示（区别于封闭厨房） | 厨房→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | mediaTranslations.spatial.positiveDifferentiators[1]: 暖光环境（区别于冷光快餐） |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.positiveDifferentiators[2]: 红色视觉冲击（区别于普通面馆） |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.spatialTranslation[0]: 明档厨房展示“现做” | 厨房→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.spatialTranslation[1]: 小碗菜陈列台强调“巧搭配” |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.spatialTranslation[2]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.spatialTranslation[3]: 外带包装区独立设置 | 外带包装区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.operationConstraints[0]: 点餐区与明档展示及取餐口相邻 | 点餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.operationConstraints[0]: 形成高效服务动线 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.operationConstraints[0]: 外带包装与堂食视觉统一 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.operationConstraints[0]: 支持多场景消费 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.humanExperience[0]: 门头大字招牌 | 门头→storefront | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.humanExperience[1]: 悬挂灯笼 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.humanExperience[2]: 墙面海报 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.humanExperience[3]: 明档玻璃贴字 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.humanExperience[4]: 餐具/包装统一视觉 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.commercialReality[0]: 明档展示（区别于封闭厨房） | 厨房→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.architectureFunctionBridge.commercialReality[1]: 暖光环境（区别于冷光快餐） |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.architectureFunctionBridge.commercialReality[2]: 红色视觉冲击（区别于普通面馆） |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.brandSanitization.lines[0]: 明档厨房展示“现做” | 厨房→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/A | derived.brandSanitization.lines[1]: 小碗菜陈列台强调“巧搭配” |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.brandSanitization.lines[2]: 悬挂灯笼 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.brandSanitization.lines[3]: 明档玻璃贴字 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | derived.brandSanitization.lines[4]: 餐具/包装统一视觉 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/A | mediaTranslations.spatial.mustBeVisible[0]: 明档内的砂锅/热气 |  | entrance / none | current_shot / review_required | false / false |
| entrance/B | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.positiveDifferentiators[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.positiveDifferentiators[1]: 温暖亲切的社区小馆体验 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | mediaTranslations.spatial.positiveDifferentiators[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.spatialTranslation[0]: 跷脚牛肉和四川小吃的产品识别 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.spatialTranslation[1]: 可读的制作、出餐与就餐关系 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.spatialTranslation[2]: 品牌色与亲切日常体验 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.spatialTranslation[3]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.spatialTranslation[4]: 外带包装区独立设置 | 外带包装区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[0]: 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系 | 厨房→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[0]: 堂食为主 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[0]: 兼顾外带 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[1]: Kitchen preparation connects to service counter | Kitchen→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[1]: dining tables remain accessible | dining→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.architectureFunctionBridge.operationConstraints[1]: takeaway handoff keeps a clear route |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.humanExperience[0]: 品牌识别文字留待后期合成审核 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.humanExperience[1]: 菜品、服务与餐具包装保持项目品牌识别 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.commercialReality[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.commercialReality[1]: 温暖亲切的社区小馆体验 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.architectureFunctionBridge.commercialReality[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | derived.brandSanitization.lines[0]: 跷脚牛肉和四川小吃的产品识别 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[1]: 可读的制作、出餐与就餐关系 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[2]: 品牌色与亲切日常体验 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[3]: 品牌识别文字留待后期合成审核 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[4]: 菜品、服务与餐具包装保持项目品牌识别 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[5]: 跷脚牛肉、四川特色小吃的产品表达 |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance/B | derived.brandSanitization.lines[6]: 制作、出餐与堂食活动关系可读 | 堂食→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | entrance / none | off_frame_dependency / withheld | false / false |
| storefront/A | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | mediaTranslations.spatial.positiveDifferentiators[0]: 明档展示（区别于封闭厨房） | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | mediaTranslations.spatial.positiveDifferentiators[1]: 暖光环境（区别于冷光快餐） |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.positiveDifferentiators[2]: 红色视觉冲击（区别于普通面馆） |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.spatialTranslation[0]: 明档厨房展示“现做” | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.spatialTranslation[1]: 小碗菜陈列台强调“巧搭配” |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.spatialTranslation[2]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.spatialTranslation[3]: 外带包装区独立设置 | 外带包装区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.operationConstraints[0]: 点餐区与明档展示及取餐口相邻 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.operationConstraints[0]: 形成高效服务动线 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.operationConstraints[0]: 外带包装与堂食视觉统一 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.operationConstraints[0]: 支持多场景消费 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.humanExperience[0]: 门头大字招牌 | 门头→storefront | storefront / current_shot | current_shot / rendered | true / true |
| storefront/A | derived.architectureFunctionBridge.humanExperience[1]: 悬挂灯笼 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.humanExperience[2]: 墙面海报 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.humanExperience[3]: 明档玻璃贴字 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.humanExperience[4]: 餐具/包装统一视觉 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.commercialReality[0]: 明档展示（区别于封闭厨房） | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.architectureFunctionBridge.commercialReality[1]: 暖光环境（区别于冷光快餐） |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.architectureFunctionBridge.commercialReality[2]: 红色视觉冲击（区别于普通面馆） |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.brandSanitization.lines[0]: 明档厨房展示“现做” | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/A | derived.brandSanitization.lines[1]: 小碗菜陈列台强调“巧搭配” |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.brandSanitization.lines[2]: 悬挂灯笼 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.brandSanitization.lines[3]: 明档玻璃贴字 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | derived.brandSanitization.lines[4]: 餐具/包装统一视觉 |  | storefront / none | review_required / review_required | false / false |
| storefront/A | mediaTranslations.spatial.mustBeVisible[0]: 明档内的砂锅/热气 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.positiveDifferentiators[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.positiveDifferentiators[1]: 温暖亲切的社区小馆体验 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | mediaTranslations.spatial.positiveDifferentiators[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.spatialTranslation[0]: 跷脚牛肉和四川小吃的产品识别 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.spatialTranslation[1]: 可读的制作、出餐与就餐关系 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.spatialTranslation[2]: 品牌色与亲切日常体验 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.spatialTranslation[3]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.spatialTranslation[4]: 外带包装区独立设置 | 外带包装区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[0]: 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系 | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[0]: 堂食为主 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[0]: 兼顾外带 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[1]: Kitchen preparation connects to service counter | Kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[1]: dining tables remain accessible | dining→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.architectureFunctionBridge.operationConstraints[1]: takeaway handoff keeps a clear route |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.humanExperience[0]: 品牌识别文字留待后期合成审核 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.humanExperience[1]: 菜品、服务与餐具包装保持项目品牌识别 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.commercialReality[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.commercialReality[1]: 温暖亲切的社区小馆体验 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.architectureFunctionBridge.commercialReality[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | derived.brandSanitization.lines[0]: 跷脚牛肉和四川小吃的产品识别 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[1]: 可读的制作、出餐与就餐关系 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[2]: 品牌色与亲切日常体验 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[3]: 品牌识别文字留待后期合成审核 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[4]: 菜品、服务与餐具包装保持项目品牌识别 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[5]: 跷脚牛肉、四川特色小吃的产品表达 |  | storefront / none | review_required / review_required | false / false |
| storefront/B | derived.brandSanitization.lines[6]: 制作、出餐与堂食活动关系可读 | 堂食→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| storefront/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | storefront / none | off_frame_dependency / withheld | false / false |
| dining/A | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | dining / none | off_frame_dependency / withheld | false / false |
| dining/A | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.positiveDifferentiators[0]: 明档展示（区别于封闭厨房） | 厨房→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.positiveDifferentiators[1]: 暖光环境（区别于冷光快餐） |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.positiveDifferentiators[2]: 红色视觉冲击（区别于普通面馆） |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.spatialTranslation[0]: 明档厨房展示“现做” | 厨房→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.spatialTranslation[1]: 小碗菜陈列台强调“巧搭配” |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.spatialTranslation[2]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | dining / none | off_frame_dependency / withheld | false / false |
| dining/A | derived.architectureFunctionBridge.spatialTranslation[3]: 外带包装区独立设置 | 外带包装区→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.operationConstraints[0]: 点餐区与明档展示及取餐口相邻 | 点餐区→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.operationConstraints[0]: 形成高效服务动线 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.operationConstraints[0]: 外带包装与堂食视觉统一 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.operationConstraints[0]: 支持多场景消费 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.humanExperience[0]: 门头大字招牌 | 门头→storefront | dining / none | off_frame_dependency / withheld | false / false |
| dining/A | derived.architectureFunctionBridge.humanExperience[1]: 悬挂灯笼 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.humanExperience[2]: 墙面海报 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.humanExperience[3]: 明档玻璃贴字 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.humanExperience[4]: 餐具/包装统一视觉 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.commercialReality[0]: 明档展示（区别于封闭厨房） | 厨房→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.commercialReality[1]: 暖光环境（区别于冷光快餐） |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.architectureFunctionBridge.commercialReality[2]: 红色视觉冲击（区别于普通面馆） |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.brandSanitization.lines[0]: 明档厨房展示“现做” | 厨房→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.brandSanitization.lines[1]: 小碗菜陈列台强调“巧搭配” |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.brandSanitization.lines[2]: 悬挂灯笼 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.brandSanitization.lines[3]: 明档玻璃贴字 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | derived.brandSanitization.lines[4]: 餐具/包装统一视觉 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/A | mediaTranslations.spatial.mustBeVisible[0]: 明档内的砂锅/热气 |  | dining / none | current_shot / review_required | false / false |
| dining/B | mediaTranslations.spatial.sceneProgram[0]: 点餐 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.sceneProgram[1]: 取餐 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.sceneProgram[2]: 堂食 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.sceneProgram[3]: 外带 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.sceneProgram[4]: 明档展示 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | dining / none | off_frame_dependency / withheld | false / false |
| dining/B | mediaTranslations.spatial.functionalNetwork[1]: 外带包装区独立设置 | 外带包装区→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.positiveDifferentiators[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.positiveDifferentiators[1]: 温暖亲切的社区小馆体验 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.positiveDifferentiators[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.spatialTranslation[0]: 跷脚牛肉和四川小吃的产品识别 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.spatialTranslation[1]: 可读的制作、出餐与就餐关系 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.spatialTranslation[2]: 品牌色与亲切日常体验 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.spatialTranslation[3]: 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区 | 点餐区→dining | dining / none | off_frame_dependency / withheld | false / false |
| dining/B | derived.architectureFunctionBridge.spatialTranslation[4]: 外带包装区独立设置 | 外带包装区→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[0]: 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系 | 厨房→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[0]: 堂食为主 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[0]: 兼顾外带 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[1]: Kitchen preparation connects to service counter | Kitchen→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[1]: dining tables remain accessible | dining→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.operationConstraints[1]: takeaway handoff keeps a clear route |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.humanExperience[0]: 品牌识别文字留待后期合成审核 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.humanExperience[1]: 菜品、服务与餐具包装保持项目品牌识别 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.commercialReality[0]: 跷脚牛肉、四川特色小吃的产品表达 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.commercialReality[1]: 温暖亲切的社区小馆体验 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.architectureFunctionBridge.commercialReality[2]: 制作、出餐与堂食活动关系可读 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[0]: 跷脚牛肉和四川小吃的产品识别 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[1]: 可读的制作、出餐与就餐关系 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[2]: 品牌色与亲切日常体验 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[3]: 品牌识别文字留待后期合成审核 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[4]: 菜品、服务与餐具包装保持项目品牌识别 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[5]: 跷脚牛肉、四川特色小吃的产品表达 |  | dining / current_shot | current_shot / rendered | true / true |
| dining/B | derived.brandSanitization.lines[6]: 制作、出餐与堂食活动关系可读 | 堂食→dining | dining / current_shot | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[0]: chef preparing food in kitchen | kitchen→dining | dining / current_executable_owner | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | dining / current_executable_owner | current_shot / rendered | true / true |
| dining/B | mediaTranslations.spatial.mustBeVisible[2]: customers dining at tables | dining→dining | dining / current_executable_owner | current_shot / rendered | true / true |
| takeaway | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| takeaway | mediaTranslations.spatial.mustBeVisible[0]: 店员在门头室外打包商品 | 门头→storefront | storefront / current_shot | current_shot / rendered | true / true |
| takeaway | mediaTranslations.spatial.mustBeVisible[1]: 厨师在厨房制作食品 | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| takeaway | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| takeaway | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| takeaway | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| takeaway | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| takeaway | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| takeaway | mediaTranslations.spatial.mustBeVisible[0]: 店员在门头室外打包商品 | 门头→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| takeaway | mediaTranslations.spatial.mustBeVisible[1]: 厨师在厨房制作食品 | 厨房→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| fast-casual | mediaTranslations.spatial.mustBeVisible[0]: staff handing food to customers at storefront | storefront→storefront | storefront / current_shot | current_shot / rendered | true / true |
| fast-casual | mediaTranslations.spatial.mustBeVisible[1]: customers dining at tables | dining→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| fast-casual | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| fast-casual | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| fast-casual | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| fast-casual | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| fast-casual | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| fast-casual | mediaTranslations.spatial.mustBeVisible[0]: staff handing food to customers at storefront | storefront→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| fast-casual | mediaTranslations.spatial.mustBeVisible[1]: customers dining at tables | dining→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| coffee | mediaTranslations.spatial.mustBeVisible[0]: 店员在临街外侧递交饮品 | 临街外侧→storefront | storefront / current_shot | current_shot / rendered | true / true |
| coffee | mediaTranslations.spatial.mustBeVisible[1]: 顾客在就餐区用餐 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| coffee | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| coffee | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| coffee | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| coffee | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| coffee | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| coffee | mediaTranslations.spatial.mustBeVisible[0]: 店员在临街外侧递交饮品 | 临街外侧→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| coffee | mediaTranslations.spatial.mustBeVisible[1]: 顾客在就餐区用餐 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | mediaTranslations.spatial.mustBeVisible[0]: staff serving customers at storefront | storefront→storefront | storefront / current_shot | current_shot / rendered | true / true |
| non-sichuan | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| non-sichuan | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| non-sichuan | mediaTranslations.spatial.mustBeVisible[0]: staff serving customers at storefront | storefront→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| non-sichuan | mediaTranslations.spatial.mustBeVisible[1]: steam above dishes in kitchen | kitchen→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| retail | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| retail | mediaTranslations.spatial.mustBeVisible[0]: 店员在门头室外递交商品 | 门头→storefront | storefront / current_shot | current_shot / rendered | true / true |
| retail | mediaTranslations.spatial.mustBeVisible[1]: customers browsing merchandise in retail area | merchandise→retail | storefront / none | off_frame_dependency / withheld | false / false |
| retail | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| retail | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| retail | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| retail | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| retail | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| retail | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| retail | mediaTranslations.spatial.mustBeVisible[0]: 店员在门头室外递交商品 | 门头→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| retail | mediaTranslations.spatial.mustBeVisible[1]: customers browsing merchandise in retail area | merchandise→retail | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | mediaTranslations.spatial.functionalNetwork[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | mediaTranslations.spatial.functionalNetwork[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| hospitality | mediaTranslations.spatial.mustBeVisible[0]: staff greeting visitors at storefront | storefront→storefront | storefront / current_shot | current_shot / rendered | true / true |
| hospitality | mediaTranslations.spatial.mustBeVisible[1]: guests checking in at reception | checkin→reception | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | derived.architectureFunctionBridge.spatialTranslation[0]: 点餐区 → 明档制作区 → 取餐区 → 就餐区 | 点餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | derived.architectureFunctionBridge.spatialTranslation[1]: ordering area -> food preparation area -> pickup area -> dining area | ordering area→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| hospitality | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| hospitality | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| hospitality | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| hospitality | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| hospitality | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| hospitality | mediaTranslations.spatial.mustBeVisible[0]: staff greeting visitors at storefront | storefront→storefront | storefront / current_executable_owner | current_shot / rendered | true / true |
| hospitality | mediaTranslations.spatial.mustBeVisible[1]: guests checking in at reception | checkin→reception | storefront / none | off_frame_dependency / withheld | false / false |
| glass-request | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| glass-request | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| glass-request | mediaTranslations.spatial.functionalNetwork[0]: chef preparing food in kitchen visible through storefront glazing | storefront→storefront, kitchen→dining | storefront / none | review_required / review_required | false / false |
| glass-request | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-request | derived.architectureFunctionBridge.spatialTranslation[0]: chef preparing food in kitchen visible through storefront glazing | storefront→storefront, kitchen→dining | storefront / none | review_required / review_required | false / false |
| glass-request | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| glass-request | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| glass-request | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-request | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| glass-request | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-request | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| glass-negative | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | storefront / none | off_frame_dependency / withheld | false / false |
| glass-negative | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| glass-negative | mediaTranslations.spatial.functionalNetwork[0]: Storefront access must not expose kitchen or dining interiors | Storefront→storefront, kitchen→dining | storefront / current_boundary_only | cross_scene_constraint / rendered | true / true |
| glass-negative | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-negative | derived.architectureFunctionBridge.spatialTranslation[0]: Storefront access must not expose kitchen or dining interiors | Storefront→storefront, kitchen→dining | storefront / current_boundary_only | cross_scene_constraint / rendered | true / true |
| glass-negative | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | storefront / none | off_frame_dependency / withheld | false / false |
| glass-negative | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| glass-negative | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-negative | derived.brandSanitization.lines[0]: identity at arrival |  | storefront / none | review_required / review_required | false / false |
| glass-negative | derived.brandSanitization.lines[1]: Service logic is visible |  | storefront / none | review_required / review_required | false / false |
| glass-negative | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | storefront / none | review_required / review_required | false / false |
| entrance-local | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| entrance-local | mediaTranslations.spatial.functionalNetwork[0]: 店员在入口递交商品 | 入口→entrance | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.architectureFunctionBridge.spatialTranslation[0]: 店员在入口递交商品 | 入口→entrance | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | entrance / current_boundary_only | cross_scene_constraint / rendered | true / true |
| entrance-local | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.brandSanitization.lines[0]: identity at arrival |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.brandSanitization.lines[1]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| entrance-local | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | mediaTranslations.spatial.sceneProgram[0]: 入口到达 | 入口→entrance | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | mediaTranslations.spatial.sceneProgram[1]: 就餐区 | 就餐区→dining | entrance / none | off_frame_dependency / withheld | false / false |
| network-ambiguous | mediaTranslations.spatial.functionalNetwork[0]: 入口 → 无法确定的节点 | 入口→entrance | entrance / none | review_required / review_required | false / false |
| network-ambiguous | mediaTranslations.spatial.positiveDifferentiators[0]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | derived.architectureFunctionBridge.spatialTranslation[0]: 入口 → 无法确定的节点 | 入口→entrance | entrance / none | review_required / review_required | false / false |
| network-ambiguous | derived.architectureFunctionBridge.operationConstraints[0]: 入口连接就餐区的通道保持通畅 | 入口→entrance, 就餐区→dining | entrance / current_boundary_only | cross_scene_constraint / rendered | true / true |
| network-ambiguous | derived.architectureFunctionBridge.humanExperience[0]: identity at arrival |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | derived.architectureFunctionBridge.commercialReality[0]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | derived.brandSanitization.lines[0]: identity at arrival |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | derived.brandSanitization.lines[1]: Service logic is visible |  | entrance / current_shot | current_shot / rendered | true / true |
| network-ambiguous | derived.brandSanitization.lines[2]: Turn service clarity into a spatial and material system |  | entrance / current_shot | current_shot / rendered | true / true |
