# dining / three_quarter_wide 修复前后离线对照

相同历史派生输入和任务；不是用户实际 Run 或视觉验收。

## A 修复前

正式 SHA256: 01b0c55a2af330aa73b7aa62db743ac123d914b8a2cf3bd316345970f2036c91；Provider SHA256: 8b8bcab796c65dfe73ba2f241bdcafeb152f4088d18394631d10c5f2d2279d10

场景权威：

```json
{
  "targetScene": "dining",
  "targetProgramId": "dining",
  "functionalBlockSource": "source_shot_scope",
  "architectureBridgeSource": "source_shot_scope",
  "operationConstraintsSource": "source_shot_scope",
  "viewStrategySource": "user_explicit",
  "viewStrategy": "three_quarter_wide",
  "shotSource": "user_explicit",
  "gate": "pass",
  "gateVersion": "space-target-scene-authority@1.1.0",
  "authorityGate": {
    "status": "pass",
    "checkedBlocks": [
      "functional_requirement",
      "architecture_function_bridge",
      "operation_constraints",
      "must_be_visible",
      "lighting",
      "composition",
      "brand_role_manifestation"
    ]
  }
}
```

正式 Prompt：

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
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
- 点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费

**Human Experience (path + rhythm)**:
- 门头大字招牌
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
- 明档厨房展示“现做”
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 明档展示（区别于封闭厨房）
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

Provider Prompt：

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
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
- 点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费

**Human Experience (path + rhythm)**:
- 门头大字招牌
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
- 明档厨房展示“现做”
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 明档展示（区别于封闭厨房）
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

## A 修复后

正式 SHA256: 2e5eb6a7065964c929482be92a0349b7343af956da11cdf61a58ddfc9b217452；Provider SHA256: b106dccca275f29e9a778a3c9c5ef0b091adf78adb6dff70fa9f8a8612b0e5ce

场景权威：

```json
{
  "targetScene": "dining",
  "targetProgramId": "dining",
  "functionalBlockSource": "source_shot_scope",
  "architectureBridgeSource": "source_shot_scope",
  "operationConstraintsSource": "source_shot_scope",
  "viewStrategySource": "user_explicit",
  "viewStrategy": "three_quarter_wide",
  "shotSource": "user_explicit",
  "gate": "pass",
  "gateVersion": "space-target-scene-authority@1.1.0",
  "authorityGate": {
    "status": "pass",
    "checkedBlocks": [
      "functional_requirement",
      "architecture_function_bridge",
      "operation_constraints",
      "must_be_visible",
      "lighting",
      "composition",
      "brand_role_manifestation"
    ]
  }
}
```

正式 Prompt：

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
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
- 点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费

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
- 明档厨房展示“现做”
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 明档展示（区别于封闭厨房）
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

Provider Prompt：

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
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
- 点餐区与明档展示及取餐口相邻，形成高效服务动线；外带包装与堂食视觉统一，支持多场景消费

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
- 明档厨房展示“现做”
- 小碗菜陈列台强调“巧搭配”
- 悬挂灯笼
- 明档玻璃贴字
- 餐具/包装统一视觉

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 明档展示（区别于封闭厨房）
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

## B 修复前

正式 SHA256: 7419d65947707e7bb86399af94cc41779499123b61af79f47c4c2b3d0b2a184e；Provider SHA256: 2e737a799d23319380de42bb2ce0ea50718b62fc1dcabde6e0cc80a16f56c5e1

场景权威：

```json
{
  "targetScene": "dining",
  "targetProgramId": "dining",
  "functionalBlockSource": "source_shot_scope",
  "architectureBridgeSource": "source_shot_scope",
  "operationConstraintsSource": "source_shot_scope",
  "viewStrategySource": "user_explicit",
  "viewStrategy": "three_quarter_wide",
  "shotSource": "user_explicit",
  "gate": "pass",
  "gateVersion": "space-target-scene-authority@1.1.0",
  "authorityGate": {
    "status": "pass",
    "checkedBlocks": [
      "functional_requirement",
      "architecture_function_bridge",
      "operation_constraints",
      "must_be_visible",
      "lighting",
      "composition",
      "brand_role_manifestation"
    ]
  }
}
```

正式 Prompt：

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。 四川地域特色、市井烟火气；温暖、亲切、日常的社区小馆。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系；堂食为主，兼顾外带。
- Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route

**Human Experience (path + rhythm)**:
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

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
- 跷脚牛肉和四川小吃的产品识别
- 可读的制作、出餐与就餐关系
- 品牌色与亲切日常体验
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 跷脚牛肉、四川特色小吃的产品表达
- 温暖亲切的社区小馆体验
- 制作、出餐与堂食活动关系可读

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
  brand role: 历史分析中的品牌红载体提案；具体载体待项目审核
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
- chef preparing food in kitchen
- steam above dishes in kitchen
- customers dining at tables
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

Provider Prompt：

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。 四川地域特色、市井烟火气；温暖、亲切、日常的社区小馆。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系；堂食为主，兼顾外带。
- Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route

**Human Experience (path + rhythm)**:
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

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
- 跷脚牛肉和四川小吃的产品识别
- 可读的制作、出餐与就餐关系
- 品牌色与亲切日常体验
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 点餐区 -> 明档制作区 -> 取餐区 -> 就餐区
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 跷脚牛肉、四川特色小吃的产品表达
- 温暖亲切的社区小馆体验
- 制作、出餐与堂食活动关系可读

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
  brand role: 历史分析中的品牌红载体提案；具体载体待项目审核
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
- chef preparing food in kitchen
- steam above dishes in kitchen
- customers dining at tables
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

## B 修复后

正式 SHA256: 1569a2f77ecf0e5f8966e54a087b82d84861a921bf8222dcb1cff03b3af5dd3f；Provider SHA256: c4882394f11bd66807fc193b892a90975cf2fe56bb94bc039f300496fc55a3c1

场景权威：

```json
{
  "targetScene": "dining",
  "targetProgramId": "dining",
  "functionalBlockSource": "source_shot_scope",
  "architectureBridgeSource": "source_shot_scope",
  "operationConstraintsSource": "source_shot_scope",
  "viewStrategySource": "user_explicit",
  "viewStrategy": "three_quarter_wide",
  "shotSource": "user_explicit",
  "gate": "pass",
  "gateVersion": "space-target-scene-authority@1.1.0",
  "authorityGate": {
    "status": "pass",
    "checkedBlocks": [
      "functional_requirement",
      "architecture_function_bridge",
      "operation_constraints",
      "must_be_visible",
      "lighting",
      "composition",
      "brand_role_manifestation"
    ]
  }
}
```

正式 Prompt：

```text
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。 四川地域特色、市井烟火气；温暖、亲切、日常的社区小馆。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系；堂食为主，兼顾外带。
- Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route

**Human Experience (path + rhythm)**:
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

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
- 跷脚牛肉和四川小吃的产品识别
- 可读的制作、出餐与就餐关系
- 品牌色与亲切日常体验
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 跷脚牛肉、四川特色小吃的产品表达
- 温暖亲切的社区小馆体验
- 制作、出餐与堂食活动关系可读

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
  brand role: 历史分析中的品牌红载体提案；具体载体待项目审核
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
- chef preparing food in kitchen
- steam above dishes in kitchen
- customers dining at tables
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

Provider Prompt：

```text
生成一张完整、可商用的品牌视觉图片。
准确执行已确认的品牌规则、中文商业设计语境与交付物职责。
Output aspect ratio: 16:9. Generate exactly one image.
# Task

Generate a single premium-grade space image for **冯烫烫** (餐饮/川菜小吃/跷脚牛肉专门店).
Scene: `dining` / three_quarter_wide.
Task: Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.
Aspect ratio: 16:9.

# Spatial Intent

> The experience goal and spatial strategy set the tone before any building mechanism.

**Experience Goal**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。 四川地域特色、市井烟火气；温暖、亲切、日常的社区小馆。

**Spatial Strategy**: source-scoped decisions are stated once in Architecture Language.

# Architecture Language

> Preserve the supplied subjects, carriers and action scopes. These are project proposals; do not add walls, ceilings or lighting hardware from generic action words.

**Source-scoped architectural decisions (each stated once)**:
- 开放式布局
- 木质格栅（半通透）

# Architecture Context

No optional architecture examples have been selected for this request. Brand name and industry do not grant example authority.
Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.
Do not infer construction details from historical accepted images or from an industry's customary appearance. Preserve explicitly requested complex architecture without importing unrelated scene mechanisms.

# Architecture-Function Bridge

> Artistic character and commercial operations are simultaneous requirements. Industry constrains use, access and privacy; it does not dictate an architectural style.

**Commercial Purpose**: 四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。

**Spatial Translation (architecture → commercial action)**:
Current-shot nodes and relationships are stated in Functional & Commercial Requirement.

**Operation Constraints (hard, must hold)**:
- 点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系；堂食为主，兼顾外带。
- Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route

**Human Experience (path + rhythm)**:
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

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
- 跷脚牛肉和四川小吃的产品识别
- 可读的制作、出餐与就餐关系
- 品牌色与亲切日常体验
- 品牌识别文字留待后期合成审核
- 菜品、服务与餐具包装保持项目品牌识别

# Functional & Commercial Requirement

**Current-shot Program Nodes (source-scoped; other areas remain off frame)**:
- 点餐
- 取餐
- 堂食
- 外带
- 明档展示

**Functional Network**:
- 外带包装区独立设置

**Visible hierarchy**: see Composition; an artistic focus does not replace operational facilities.

**Positive Differentiators**:
- 跷脚牛肉、四川特色小吃的产品表达
- 温暖亲切的社区小馆体验
- 制作、出餐与堂食活动关系可读

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
  brand role: 历史分析中的品牌红载体提案；具体载体待项目审核
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
- chef preparing food in kitchen
- steam above dishes in kitchen
- customers dining at tables
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
