# 九州美学正向空间机制缺失审计

## 结论

`jiuzhou-space-safe-generic-clinic-partial` 已登记。该结果通过了结构性安全回归，但仍是暖白极简诊所/办公室式表达。

首次缺失发生在 **Spatial Translation / Project-Specific Generation Contract 的正向空间机制结构**：旧制品已有品牌角色、升级命题、气质边界、色材光、功能关系、场景程序和禁止项，但没有命名一个可被直接画出、可跨节点连续追踪、并且必须在单张图中可见的核心组织机制。功能关系只是并列描述，无法约束模型把平台网络转成明确的空间形态。

本次没有增加任何负面词，没有修改已有隔离、Logo、包装或跨项目门禁。

## 新增通用结构

- `brandRoleManifestation`
- `signatureSpatialMechanism`
- `functionalNetwork`
- `sceneProgram`
- `positiveDifferentiators`
- `mustBeVisible`

字段由项目持久化的 `user-confirmed-visual-decision.json` 提供。公共 Parser、Contract Compiler、Prompt Compiler 和 Gate 只识别通用字段，不包含九州名称、项目 ID 或医美行业答案。

## Dry-run 四项回答

### 空间唯一机制是什么

一条可连续追踪的**双层半透明柔性服务脊带**。它从入口上方的压缩门廊开始，在展示接待区加宽并下沉，在咨询过渡区分成前后错位的双层透光界面，最终在系统服务节点重新汇合。

### 它如何组织服务节点

脊带的四种空间状态与服务阶段一一对应：

- 压缩：入口识别和路径聚焦。
- 展开、下沉：旗舰展示与接待分流。
- 双层错位：咨询入口和私密梯度。
- 汇合：专业咨询向内部系统服务的连续端点。

### 平台角色如何被看见

单一视角必须同时交代入口识别、旗舰展示、接待分流、咨询过渡和深处的系统服务连接。接待不是孤立前台，而是连接展示、等候、咨询和工作人员路径的网络节点。

### 不看 Logo 为什么仍属于本项目

项目识别来自同一条服务脊带在多个节点发生的“压缩—展开—分层—汇合”变化，以及它把展示、接待、咨询和系统服务组织成一条可读取的全链服务网络。Logo 仍由后合成处理，不承担空间辨识任务。

## 新旧差异

- 旧 Spatial Translation：六项新增字段均缺失；已有 `functionalRelationships` 和 `sceneProgram` 不能指定唯一可见形态。
- 新 Spatial Translation：完整记录角色显现、核心机制、功能网络、四段程序、正向差异和五项可见证据。
- 旧 Prompt：6,613 字符，无独立正向机制块。
- 新 Prompt：7,253 字符，`positive_spatial_mechanism` 位于气质边界和所有项目负面规则之前。
- 同类字段在 Prompt 中合并为六行，结构化制品保持完整，避免重复展开超过 Provider 字符上限。

字段级差异见 `spatial-mechanism-diff.json`，Prompt 行级差异见 `final-prompt.diff`。

## Gate

- `POSITIVE_SPATIAL_MECHANISM_MISSING`
- `BRAND_ROLE_NOT_SPATIALLY_MANIFESTED`
- `FLAGSHIP_PROGRAM_TOO_GENERIC`
- `NEGATIVE_RULES_OUTWEIGH_POSITIVE_MECHANISM`

九州空间 dry-run：四项均通过，Preflight `pass`，0 findings。Logo 为 `post_composite`，Provider references 为 0。

## 覆盖件存储与来源

覆盖件位于项目数据目录：

`C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-a7a56ed7\project-context\user-confirmed-visual-decision.json`

其状态为 `confirmed`，适用范围为 `space`，来源记录为用户确认任务文档。该文件不在 Git 仓库中，不随生产代码发布。生产代码只按 schema、projectId、status 和 deliverable scope 校验外部项目数据；没有项目 ID 分支或项目专属 Fixture。

## Smoke Test

全部离线门禁通过后调用一次，未随机重试：

- Provider / model：Volcengine / `doubao-seedream-5-0-pro-260628`
- Compilation：`vnext-task-a2ff29ee-01fa-4a2f-900f-3c1edaa542b5`
- Run：`ee5cfaa8-7996-459c-9721-60a0b2bbaf22`
- 模型调用：1
- 时长：101,898 ms
- 图像：`image-generation/ee5cfaa8-7996-459c-9721-60a0b2bbaf22/images/image-01.png`
- Gate：0 error / 0 warning

视觉检查：

- 双层半透明柔性服务脊带成为画面主导结构，从入口跨越接待中心并继续进入后方空间。
- 脊带在接待节点加宽下沉，形成明确分流中心；在后方以多层透明界面组织咨询和服务深度。
- 左侧展示界面、中央接待、后方咨询工位与深处服务端点可以在单一视角中读取。
- Logo 未由模型生成，正视留白仍可后合成。
- 未出现孔雀、羽毛、金色装饰、大 Logo 墙或紫色灯带。
- 结果仍使用克制暖中性色，但不再仅靠色材与气质成立；正向结构机制已形成无 Logo 识别。

结论：**通过本轮“正向空间机制”Smoke 验收。**
