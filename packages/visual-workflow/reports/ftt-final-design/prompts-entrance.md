# entrance / entrance_view：RKS-02D 完整文本对照

A 是公开后期合成适配后的历史分析对照，不是可直接生图的原始 Packet；B 是待确认实验方向。两者任务、模型和 Provider 参数相同。没有真实请求。

```json
{
  "controls": {
    "generationBasis": "standard",
    "model": "doubao-seedream-5-0-pro-260628",
    "adapter": "seedream-5.0-pro",
    "imageSize": "2K",
    "aspectRatio": "16:9",
    "count": 1,
    "referenceImages": 0,
    "logoUsageMode": "post_composite"
  },
  "task": {
    "schemaVersion": "1.0",
    "taskId": "rks-02d-offline-design-review",
    "projectId": "dca9b7d4-f233-46ff-b4df-44a890f13c4f",
    "deliverableFamily": "space",
    "subtype": "entrance",
    "shot": "entrance_view",
    "count": 1,
    "aspectRatio": "16:9",
    "currentInstruction": "Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.",
    "generationBasis": "standard",
    "mustInclude": [],
    "mustAvoid": [],
    "referenceAssetIds": [],
    "logoUsageMode": "post_composite",
    "shotSource": "user_explicit",
    "createdAt": "2026-10-25T00:00:00.000Z"
  },
  "providerBodyExceptPrompt": {
    "model": "doubao-seedream-5-0-pro-260628",
    "prompt": "see below",
    "size": "2K",
    "response_format": "b64_json",
    "watermark": false
  },
  "readiness": {
    "offlineInputStatus": "conditional_entrance_boundary_only",
    "displayStatus": "入口局部方案待人工审核；局部堂食视线未授权",
    "humanConfirmed": false,
    "modelAuthorized": false,
    "readyToInvoke": false,
    "visualQuality": "not_evaluated",
    "sceneBlockers": [
      "partial_dining_interior_visibility_not_authorized"
    ],
    "pendingHumanDecisions": [
      "qualitative material and palette direction",
      "open-kitchen layout as a design proposal, not an existing-property fact",
      "raw B versus advisory B* text",
      "actual model-call budget and authorization"
    ],
    "otherScenesDoNotBlockThisScene": true
  }
}
```

## A：正式 Compiler 输出

SHA256: 822884bb3a426cc209ffad1516d3301fc55a91627df18b9b663558db5b784771

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `entrance` / entrance_view.
Task: Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 热气腾腾的川味小馆：明亮、温暖、开放、强调食物制作过程。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）
- 暖光环境（区别于冷光快餐）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 提供高性价比、地道川味（以跷脚牛肉为主）的快餐与小吃服务，强调“巧搭配”与“小碗实惠”

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 形成高效服务动线; 支持多场景消费

**Human Experience (path + rhythm)**:
- 悬挂灯笼
- 墙面海报
- 明档玻璃贴字
- 餐具/包装统一视觉

**Commercial Reality (compatible with project artistic character)**:
Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.

**Concept Drift Guards (must avoid)**:
- 避免过度强调“非遗”导致显得老旧
- 避免英文过大喧宾夺主
- 避免使用通用牛剪影替代产品实拍
- 避免空间设计过于暗调压抑

**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:
- No additional cross-zone relationship is established by the supplied sources.

Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas.

# Architectural Concept

Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.
User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression.

# Architecture DNA

**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.
Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed.

# Brand Translation

> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.
> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.
**Brand**: 冯烫烫 | **Industry**: 餐饮/川菜小吃/跷脚牛肉专门店
**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.
**Brand Role Manifestation in Space**:
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 外带
- 明档展示

**Functional Network**:


**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 暖光环境（区别于冷光快餐）
- 红色视觉冲击（区别于普通面馆）

# Spatial Color Roles

Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.
Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.
Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage.
- 品牌红 | palette: primary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 视觉焦点，品牌识别，激发食欲
  area ratio: unknown
- 品牌黑 | palette: secondary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 文字信息，稳重视觉，对比红色
  area ratio: unknown
- 木色 | palette: accent | proposed spatial scope: dominant_field | execution authority: proposal_only
  role: 空间基调，温暖自然
  area ratio: unknown
- 白色 | palette: accent | proposed spatial scope: dominant_field | execution authority: proposal_only
  role: 背景，清洁感，衬托食物
  area ratio: unknown

# Material System

- **浅色木材**: 温暖触感；自然纹理
  brand role: 营造亲切、自然的就餐氛围，平衡红色的热烈
  avoid: 深色沉重木材；高光烤漆木
- **红色金属/塑料**: 高反射（金属）；哑光（塑料）
  brand role: 品牌色载体，用于招牌、装饰件、灯笼
  avoid: 暗红色；粉紅色
- **浅色石材/瓷砖**: 耐用；易清洁；漫反射
  brand role: 地面和墙面基础，提供明亮背景
  avoid: 深色大理石；复杂花纹砖

# Lighting System

**Primary Strategy**: 暖黄光（3000K-3500K）、重点照明（射灯）
**Contrast**: 整体明亮，食物区域高亮，形成视觉焦点。
**Light / Material Behavior**:
- 暖光打在木材上显温馨
- 射灯照亮砂锅食物，强调热气和色泽
**Lighting Prohibitions**:
- 冷白光
- 昏暗灯光
- 彩色霓虹灯（除Logo外）

# Composition & Photography

**Output Ratio**: 16:9
**Project Artistic Focus (separate from operational facilities)**:
- No artistic installation is required by the supplied sources.
Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.
**Operational Elements (remain usable alongside the artistic focus)**:
**Positive Differentiators**:
Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.
Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.

# Rendering Requirements

- High-end architectural visualization, photoreal, physically based materials.
- Balanced exposure, accurate white balance, readable texture and shadow detail.
- No blown highlights; clean, resolved, professionally finished.

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene
- no generic AI clinic look, no stock-photo medical aesthetic template
- 深色沉重木材
- 高光烤漆木
- 暗红色
- 粉紅色
- 深色大理石
- 复杂花纹砖
- 冷白光
- 昏暗灯光
- 彩色霓虹灯（除Logo外）
- 大面积冷色调（蓝/绿）
- 杂乱色彩
```

## A：离线 Provider Prompt

SHA256: d74e9089179e97d034a4dc596dd33c4e983d8399be74fcead0378f3f213e813c。只格式化请求，没有调用 transport。

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `entrance` / entrance_view.
Task: Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 热气腾腾的川味小馆：明亮、温暖、开放、强调食物制作过程。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）
- 暖光环境（区别于冷光快餐）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 提供高性价比、地道川味（以跷脚牛肉为主）的快餐与小吃服务，强调“巧搭配”与“小碗实惠”

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 形成高效服务动线; 支持多场景消费

**Human Experience (path + rhythm)**:
- 悬挂灯笼
- 墙面海报
- 明档玻璃贴字
- 餐具/包装统一视觉

**Commercial Reality (compatible with project artistic character)**:
Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.

**Concept Drift Guards (must avoid)**:
- 避免过度强调“非遗”导致显得老旧
- 避免英文过大喧宾夺主
- 避免使用通用牛剪影替代产品实拍
- 避免空间设计过于暗调压抑

**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:
- No additional cross-zone relationship is established by the supplied sources.

Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas.

# Architectural Concept

Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.
User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression.

# Architecture DNA

**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.
Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed.

# Brand Translation

> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.
> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.
**Brand**: 冯烫烫 | **Industry**: 餐饮/川菜小吃/跷脚牛肉专门店
**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.
**Brand Role Manifestation in Space**:
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 外带
- 明档展示

**Functional Network**:


**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 暖光环境（区别于冷光快餐）
- 红色视觉冲击（区别于普通面馆）

# Spatial Color Roles

Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.
Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.
Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage.
- 品牌红 | palette: primary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 视觉焦点，品牌识别，激发食欲
  area ratio: unknown
- 品牌黑 | palette: secondary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 文字信息，稳重视觉，对比红色
  area ratio: unknown
- 木色 | palette: accent | proposed spatial scope: dominant_field | execution authority: proposal_only
  role: 空间基调，温暖自然
  area ratio: unknown
- 白色 | palette: accent | proposed spatial scope: dominant_field | execution authority: proposal_only
  role: 背景，清洁感，衬托食物
  area ratio: unknown

# Material System

- **浅色木材**: 温暖触感；自然纹理
  brand role: 营造亲切、自然的就餐氛围，平衡红色的热烈
  avoid: 深色沉重木材；高光烤漆木
- **红色金属/塑料**: 高反射（金属）；哑光（塑料）
  brand role: 品牌色载体，用于招牌、装饰件、灯笼
  avoid: 暗红色；粉紅色
- **浅色石材/瓷砖**: 耐用；易清洁；漫反射
  brand role: 地面和墙面基础，提供明亮背景
  avoid: 深色大理石；复杂花纹砖

# Lighting System

**Primary Strategy**: 暖黄光（3000K-3500K）、重点照明（射灯）
**Contrast**: 整体明亮，食物区域高亮，形成视觉焦点。
**Light / Material Behavior**:
- 暖光打在木材上显温馨
- 射灯照亮砂锅食物，强调热气和色泽
**Lighting Prohibitions**:
- 冷白光
- 昏暗灯光
- 彩色霓虹灯（除Logo外）

# Composition & Photography

**Output Ratio**: 16:9
**Project Artistic Focus (separate from operational facilities)**:
- No artistic installation is required by the supplied sources.
Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.
**Operational Elements (remain usable alongside the artistic focus)**:
**Positive Differentiators**:
Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.
Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.

# Rendering Requirements

- High-end architectural visualization, photoreal, physically based materials.
- Balanced exposure, accurate white balance, readable texture and shadow detail.
- No blown highlights; clean, resolved, professionally finished.

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene
- no generic AI clinic look, no stock-photo medical aesthetic template
- 深色沉重木材
- 高光烤漆木
- 暗红色
- 粉紅色
- 深色大理石
- 复杂花纹砖
- 冷白光
- 昏暗灯光
- 彩色霓虹灯（除Logo外）
- 大面积冷色调（蓝/绿）
- 杂乱色彩
```

## B：正式 Compiler 输出

SHA256: 6fa5168cd127cf378bf4f5a04659e8bc803c9dab3d405a1dfa18538c31288017

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `entrance` / entrance_view.
Task: Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。 市井烟火、温暖、热闹、亲切；明确的品牌特色和真实餐饮经营活动。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:


**Human Experience (path + rhythm)**:
- 菜品、日常餐具与包装的项目识别方向待人工审核

**Commercial Reality (compatible with project artistic character)**:
Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.

**Concept Drift Guards (must avoid)**:
- 不增加未经证实的非遗或老字号背书
- 不以标准化商场快餐、极简咖啡馆或高端精致餐饮替代本项目定位
- 不以昏暗压抑或静态样板间取代真实餐饮经营氛围

**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:
- 入口与堂食的通达关系
- Entrance access connects to dining area through a clear threshold route
- other dining interiors remain off frame

Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas.

# Architectural Concept

Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.
User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression.

# Architecture DNA

**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.
Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed.

# Brand Translation

> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.
> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.
**Brand**: 冯烫烫 | **Industry**: 餐饮/川菜小吃/跷脚牛肉专门店
**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.
**Brand Role Manifestation in Space**:
- 菜品、日常餐具与包装的项目识别方向待人工审核
- 温暖亲切的入口服务体验
- 社区小馆品牌原资产留待后期合成

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 入口到达与通行路径
- 入口局部服务活动

**Functional Network**:
- 位置与设置方式待确认

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 入口温暖可接近的体验

# Spatial Color Roles

Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.
Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.
Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage.
- 品牌红 | palette: primary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌识别候选色；表面和面积未指定
  area ratio: unknown
- 品牌黑 | palette: secondary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌信息候选色；不预设室内表面范围
  area ratio: unknown
- 木色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 暖色木的材质色候选；表面和面积均未指定
  area ratio: unknown
- 白色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 清洁明亮的辅助色候选；范围待审核
  area ratio: unknown

# Material System

- **暖色木（项目视觉方向）**: 呈现暖色木的综合色调；木种、纹理尺度、涂层与光学参数均未指定
  brand role: 项目温暖亲切的材质方向，具体适用表面待设计师确认
- **赤陶（项目视觉方向）**: 呈现暖赤陶的综合色调；制品形态、釉面与光学参数均未指定
  brand role: 本项目历史视觉经验；不意味着墙地整铺或任何构造已确认

# Lighting System

**Primary Strategy**: 温暖可读的入口照明；不指定色温、灯具或开窗位置
**Contrast**: 保持入口识别与空间可读性，不预设街道光照条件。
**Light / Material Behavior**:
- 呈现项目暖色材料方向；光学参数未指定
**Lighting Prohibitions**:
- 昏暗压抑

# Composition & Photography

**Output Ratio**: 16:9
**Project Artistic Focus (separate from operational facilities)**:
- No artistic installation is required by the supplied sources.
Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.
**Operational Elements (remain usable alongside the artistic focus)**:
- staff serving customers at entrance
**Positive Differentiators**:
Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.
Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.

# Rendering Requirements

- High-end architectural visualization, photoreal, physically based materials.
- Balanced exposure, accurate white balance, readable texture and shadow detail.
- No blown highlights; clean, resolved, professionally finished.

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene
- no generic AI clinic look, no stock-photo medical aesthetic template
- 昏暗压抑
- 以整体冷淡空间替代已确认的温暖亲切氛围
```

## B：离线 Provider Prompt

SHA256: cf2992c0f8ba48a4420b06e2253c4662e15f77b40e2ca23b8da0184ff867772e。只格式化请求，没有调用 transport。

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `entrance` / entrance_view.
Task: Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。 市井烟火、温暖、热闹、亲切；明确的品牌特色和真实餐饮经营活动。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:


**Human Experience (path + rhythm)**:
- 菜品、日常餐具与包装的项目识别方向待人工审核

**Commercial Reality (compatible with project artistic character)**:
Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.

**Concept Drift Guards (must avoid)**:
- 不增加未经证实的非遗或老字号背书
- 不以标准化商场快餐、极简咖啡馆或高端精致餐饮替代本项目定位
- 不以昏暗压抑或静态样板间取代真实餐饮经营氛围

**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:
- 入口与堂食的通达关系
- Entrance access connects to dining area through a clear threshold route
- other dining interiors remain off frame

Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas.

# Architectural Concept

Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.
User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression.

# Architecture DNA

**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.
Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed.

# Brand Translation

> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.
> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.
**Brand**: 冯烫烫 | **Industry**: 餐饮/川菜小吃/跷脚牛肉专门店
**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.
**Brand Role Manifestation in Space**:
- 菜品、日常餐具与包装的项目识别方向待人工审核
- 温暖亲切的入口服务体验
- 社区小馆品牌原资产留待后期合成

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 入口到达与通行路径
- 入口局部服务活动

**Functional Network**:
- 位置与设置方式待确认

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 入口温暖可接近的体验

# Spatial Color Roles

Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.
Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.
Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage.
- 品牌红 | palette: primary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌识别候选色；表面和面积未指定
  area ratio: unknown
- 品牌黑 | palette: secondary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌信息候选色；不预设室内表面范围
  area ratio: unknown
- 木色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 暖色木的材质色候选；表面和面积均未指定
  area ratio: unknown
- 白色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 清洁明亮的辅助色候选；范围待审核
  area ratio: unknown

# Material System

- **暖色木（项目视觉方向）**: 呈现暖色木的综合色调；木种、纹理尺度、涂层与光学参数均未指定
  brand role: 项目温暖亲切的材质方向，具体适用表面待设计师确认
- **赤陶（项目视觉方向）**: 呈现暖赤陶的综合色调；制品形态、釉面与光学参数均未指定
  brand role: 本项目历史视觉经验；不意味着墙地整铺或任何构造已确认

# Lighting System

**Primary Strategy**: 温暖可读的入口照明；不指定色温、灯具或开窗位置
**Contrast**: 保持入口识别与空间可读性，不预设街道光照条件。
**Light / Material Behavior**:
- 呈现项目暖色材料方向；光学参数未指定
**Lighting Prohibitions**:
- 昏暗压抑

# Composition & Photography

**Output Ratio**: 16:9
**Project Artistic Focus (separate from operational facilities)**:
- No artistic installation is required by the supplied sources.
Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.
**Operational Elements (remain usable alongside the artistic focus)**:
- staff serving customers at entrance
**Positive Differentiators**:
Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.
Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.

# Rendering Requirements

- High-end architectural visualization, photoreal, physically based materials.
- Balanced exposure, accurate white balance, readable texture and shadow detail.
- No blown highlights; clean, resolved, professionally finished.

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene
- no generic AI clinic look, no stock-photo medical aesthetic template
- 昏暗压抑
- 以整体冷淡空间替代已确认的温暖亲切氛围
```

## B*：仅实验副本的人工审阅建议稿

这是正式 B 输出的建议修订副本，不是 Compiler 输出、已确认 Prompt 或获准 Provider 请求。SHA256: 5cf74c89b98dbc9073367572466cfb049647859f5b1b260fd03052ad8dd01bf2。正式路由及指纹需在未来执行前另行复核。

```text
# Task

Generate a single commercial architectural image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `entrance` / entrance_view.
Task: Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。 市井烟火、温暖、热闹、亲切；明确的品牌特色和真实餐饮经营活动。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use this project’s approachable entrance direction. Preserve threshold access and the dining access boundary; other program interiors remain off frame.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:


**Human Experience (path + rhythm)**:
- 菜品、日常餐具与包装的项目识别方向待人工审核

**Commercial Reality (compatible with project artistic character)**:
Preserve the supplied differentiators in Functional & Commercial Requirement together with the artistic focus in Composition.

**Concept Drift Guards (must avoid)**:
- 不增加未经证实的非遗或老字号背书
- 不以标准化商场快餐、极简咖啡馆或高端精致餐饮替代本项目定位
- 不以昏暗压抑或静态样板间取代真实餐饮经营氛围

**Cross-zone operational constraints (current-shot boundary only; other interiors remain off frame)**:
- 入口与堂食的通达关系
- Entrance access connects to dining area through a clear threshold route
- other dining interiors remain off frame

Off-frame program dependencies are retained in the source trace. Preserve access and privacy boundaries without exposing the interiors of other program areas.

# Architectural Concept

Use the experience goal in Spatial Intent and the source-scoped decisions in Architecture Language together with the artistic hierarchy in Composition.
User instructions take priority over model proposals and optional examples. Do not make a generic building template displace the project's artistic expression.

# Architecture DNA

**Decision relationships**: Architecture Language owns architectural actions; Spatial Color Roles owns color scope; Material System owns optical behavior; Composition owns focal hierarchy.
Keep buildable junctions, readable circulation and human scale. Follow this project’s warm, lively, approachable Sichuan neighborhood eatery direction without importing a gallery, minimalist cafe or upscale dining style.

# Brand Translation

> Preserve project identity and artistic expression together with the functional program. The artistic focus is stated in Composition.
> Brand identity (logo, wordmark, signage text) is composited AFTER generation; do NOT render it in-scene.
**Brand**: 冯烫烫 | **Industry**: 餐饮/川菜小吃/跷脚牛肉专门店
**Brand Role**: see the Commercial Purpose in Architecture-Function Bridge.
**Brand Role Manifestation in Space**:
- 菜品、日常餐具与包装的项目识别方向待人工审核
- 温暖亲切的入口服务体验
- 社区小馆品牌原资产留待后期合成

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 入口到达与通行路径
- 入口局部服务活动

**Functional Network**:
- 位置与设置方式待确认

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 入口温暖可接近的体验

# Spatial Color Roles

Palette identity rank does not determine interior area. Entries below are existing model proposals, not user-confirmed facts.
Proposed scopes and ratios retain their source meaning for review. Do not execute an unconfirmed dominant field or area allocation as a mandatory instruction. Area authority remains pending unless explicitly supplied by the current user instruction; that instruction takes priority.
Unknown ratios stay unknown. Neither a color name, a palette rank, a gradient nor a proposed role independently authorizes geometry or whole-room color coverage.
- 品牌红 | palette: primary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌识别候选色；表面和面积未指定
  area ratio: unknown
- 品牌黑 | palette: secondary | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 品牌信息候选色；不预设室内表面范围
  area ratio: unknown
- 木色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 暖色木的材质色候选；表面和面积均未指定
  area ratio: unknown
- 白色 | palette: accent | proposed spatial scope: unspecified | execution authority: proposal_only
  role: 清洁明亮的辅助色候选；范围待审核
  area ratio: unknown

# Material System

- **暖色木（项目视觉方向）**: 呈现暖色木的综合色调；木种、纹理尺度、涂层与光学参数均未指定
  brand role: 项目温暖亲切的材质方向，具体适用表面待设计师确认
- **赤陶（项目视觉方向）**: 呈现暖赤陶的综合色调；制品形态、釉面与光学参数均未指定
  brand role: 本项目历史视觉经验；不意味着墙地整铺或任何构造已确认

# Lighting System

**Primary Strategy**: 温暖可读的入口照明；不指定色温、灯具或开窗位置
**Contrast**: 保持入口识别与空间可读性，不预设街道光照条件。
**Light / Material Behavior**:
- 呈现项目暖色材料方向；光学参数未指定
**Lighting Prohibitions**:
- 昏暗压抑

# Composition & Photography

**Output Ratio**: 16:9
**Project Artistic Focus (separate from operational facilities)**:
- No artistic installation is required by the supplied sources.
Do not demote a supplied core artwork to background texture. Its mounting, dimensions and optical construction remain unspecified unless supplied; do not invent them.
**Operational Elements (remain usable alongside the artistic focus)**:
- staff serving customers at entrance
**Positive Differentiators**:
Use the differentiators in Functional & Commercial Requirement without repeating them as additional demands.
Use a credible commercial architectural camera: controlled perspective, depth, hierarchy and human scale.

# Rendering Requirements

- High-end architectural visualization, photoreal, physically based materials.
- Balanced exposure, accurate white balance, readable texture and shadow detail.
- No blown highlights; clean, resolved, professionally finished.

# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
- no rendered brand name, wordmark, logotype, signage text, or illuminated letters in the scene
- no generic AI clinic look, no stock-photo medical aesthetic template
- 昏暗压抑
- 以整体冷淡空间替代已确认的温暖亲切氛围
```
