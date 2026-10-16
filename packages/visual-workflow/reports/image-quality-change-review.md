# 空间生图候选实现完整差异审查报告

审查状态：待用户批准。仅提交证据，不更新完整性摘要、不修改 Golden、不调用真实模型、不合并或发布，不宣告质量恢复。

审查对象：基点 `5270b00583d976360fd14f0059e2bc3706883875` 到当前工作树的六个生产文件。分支 `fix/visual-workflow-image-quality-regression`。本轮没有修改这六个文件；只增加审查资料并重放已有测试。生产差异共 24 行新增、3 行删除，无文件删除、移动或并行实现。

## 1. 结论与证据边界

六个文件全部位于独立【视觉分析与生图】的 `packages/visual-workflow/src/`。候选修复能证明：必要数据为空时旧状态可误放行；清洗删除必要数据后可误报完成；明确物理装置会丢失品牌层归属或被改写为曲面肌理。它们不能证明全部视觉退化原因已经找到，也不能保证生成图达到人工验收标准。

本地九州美学项目存在实际输入：接待区通过大型抽象羽毛/花瓣艺术装置表达品牌。基点 sanitizer 将其改写为“表面/肌理行为”及层叠曲面；候选保留原句，离线最终 Prompt 与请求体都包含原句。具体对照保存在 [实际项目映射](E:/image-quality-regression-evidence/actual-project-mapping.json)。这条本地证据证明文本映射偏差，尚不证明附件六图与此运行存在一一对应关系。

## 2. 六个生产文件逐项审查

### 2.1 `packages/visual-workflow/src/runtime/visual-decision-packet.js`

- 修改位置：`spatialTranslation` 的 ready 判定与 `missingExecutionFields`。
- 修改前：仅检查概念、结构、材质、光、sceneProgram 与颜色；signatureSpatialMechanism、functionalNetwork、functionalRelationships 即使缺失，也可能生成 ready Packet。
- 修改后：三个字段经既有 strings 规范化后至少有一个有效字符串，才满足初始就绪检查；缺失时明确记录字段路径。
- 目的与质量问题：防止品牌机制与空间关系尚未形成就进入编译。属于数据充分性保护，不直接增强羽毛、紫色或其他品牌主题。
- 证据：同一个旧 Packet 删除 functionalNetwork 并把 functionalRelationships 置空白，基点仍就绪，候选返回 insufficient；新增测试覆盖。
- 风险：这是空间字段级硬要求，没有新增按具体任务/场景决定必填项的机制。虽与独立 sufficiency 的既有必填规则一致，仍可能拒绝只填 structureLanguage、未单列 signatureSpatialMechanism 的合法旧空间。当前普通酒店反例有建筑/动线机制，不能证明所有“无特色装置”旧 Packet 均兼容。signature 仍可为建筑或动线，不要求艺术装置。需人工审查是否接受该兼容收紧。

### 2.2 `packages/visual-workflow/src/analysis-decisions/deliverable-sufficiency.js`

- 修改位置：`satisfies` 的数组计数。
- 修改前：数组 length 达到最小值即可；空白、空对象也能占位。
- 修改后：只计非空字符串及非空普通对象，排除空白字符串、空对象、null、数字和布尔项。
- 目的与质量问题：防止空白占位伪装成空间机制或功能网络，阻止虚假就绪。
- 证据：空白 signature 与三个空白 network 条目在基点通过相应规则，候选产生缺失问题。
- 风险：该工具也供独立工作流内部的包装与公共分析规则使用，影响范围超出仅空间字段；合法非空包装样例通过，但非空对象的内容没有递归验证，含空值的对象仍可能被计数。此修复不构成对套话、矛盾或全部无意义内容的语义验证。

### 2.3 `packages/visual-workflow/src/analysis-decisions/analysis-completion-orchestrator.js`

- 修改位置：语义修复结束后、写最终审计前。
- 修改前：语义修复删除非法功能项后，未重新检查数据充分性；pipeline 随后直接把结果写成 ready。
- 修改后：仅对准备返回 ready/ready_with_warnings 的结果重新运行 sufficiency；仍需修复则返回 failed，保留缺失字段供审计，其余状态按验证结果返回。
- 目的与质量问题：封住“清洗正确却删空数据”的假成功，不用通用文案替代缺失关系。
- 证据：测试注入删除全部 network/relationships 的语义修复器；基点可完成，候选 failed 且 unresolvedFields 包含 network。
- 风险：二次检查不再启动额外修复循环，用户可能需要重新分析；现有错误消息可能只给通用修复失败，详细字段主要在审计中。该编排供独立包内多个交付物使用，末次重验并非仅作用于空间，但不改变模型、Prompt、重试上限或其他业务实现。

### 2.4 `packages/visual-workflow/src/generation-runtime/space/source-adapter.js`

- 修改位置：原始字段检查及功能项清洗后的内容检查。
- 修改前：先信任 Packet 的 hardFactStatus/executionDataStatus；旧 ready 标记可能掩盖缺失项；功能清洗之后的空数组也可能进入编译。
- 修改后：对上述三个原始字段做非空检查；清洗后的 network 与 operationConstraints 也必须非空，缺失时复用既有 SOURCE_INSUFFICIENT 错误与 missing 列表。
- 目的与质量问题：拦住历史上下文、缓存或直接编译跳过初始 Packet 检查的空数据路径。
- 证据：测试覆盖陈旧 ready 标记、空 network、纯装置内容清洗后归零。
- 风险：旧项目可能从“能生成通用空间”变为编译拒绝，需要重新分析。这里检查至少一项，与 sufficiency 要求 network 至少三项不是同一强度；不保证关系描述完整到包含两端、过渡机制与功能结果。内部 continuation/reference 分支也经过此函数，虽然独立公开入口禁止这些模式，仍应避免把候选外推为它们的兼容保证。

### 2.5 `packages/visual-workflow/src/generation-runtime/space/semantic/compile-spatial-mechanisms.js`

- 修改位置：分类为 BRAND_MOTIF 的分支条件。
- 修改前：DECORATIVE_OBJECT 未有单独分支，进入 functionalSemantics；品牌渲染未消费它。
- 修改后：仅来源字段为 signatureSpatialMechanism 的 DECORATIVE_OBJECT 进入 brandMotifSemantics；不进入 architectureSemantics 或 functionalSemantics。
- 目的与质量问题：保留项目明确要求的物理艺术机制，防止装置因分类掉入不被渲染的层而消失。
- 证据：通用半透明珠光薄片装置，在基点不属于品牌层；候选进入品牌层、最终请求包含完整描述。该项是通用合成样例，本地项目实际装置主要来自 brandRoleManifestation，不应混称为同一条实际数据路径。
- 风险：依赖现有词典分类，不能识别全部装置表达；只对 signature 来源生效，其他来源的装置不自动全部转入品牌层。brandMotifSemantics 消费方将接收到此前不在该层的内容，可能影响 Prompt 预算与焦点分配。

### 2.6 `packages/visual-workflow/src/generation-runtime/space/semantic/sanitize-brand-expression.js`

- 修改位置：既有身份/运营/道具/长文/颜色渐变检查之后、hasMotif 规范化之前。
- 修改前：含主题词的艺术装置被转换为表面行为，或作为纯装饰主题删除。
- 修改后：已分类为 DECORATIVE_OBJECT 的条目直接保留原句；之前的 Logo、人员运营、道具、画廊套话、60 字长度和渐变检查仍执行。
- 目的与质量问题：修复实际项目“大型艺术装置”被降级为曲面肌理的确定文本偏差。
- 证据：实际本地项目输入的基点/候选对照；通用装置进入最终编译 Prompt 和配置模型请求体；Logo/渐变反例通过。
- 风险：这是六项中直接改变品牌表达最明显的一项。分支作用于传给 sanitizer 的所有装置条目，不仅 signature 来源；保留强度由原输入决定，可能导致装置过强或材料/颜色偏离。它位于后续 hasMotif 及 containsChromaticColor+hasArch 处理之前，某些非渐变、带色的装置描述可能绕过后段点缀降级；现有梯度反例不能覆盖所有颜色组合。候选没有新增主焦点、尺寸或材料物理性校验，也没有消除模板对“表面行为”的既有一般指令。真实输出与人工验收必须补足这些风险。

## 3. 业务边界与间接影响审查

全部六项属于独立包自有 Packet、分析补全及空间编译，没有新增跨包 import、转导出、动态导入、操作通道、配置同步或全局回退。独立 Web UI 没有修改；`service.js`、image-service、Provider adapter、模型配置、凭据存储也没有修改。

【创意策划】和【视觉迁移】业务源码、Prompt、配置、资产、上下文、完整性记录均无差异。公共 Node 宿主、注册、传输、React 容器、文件系统实现、Sharp 依赖和 lockfile 均无差异；没有增加其调用能力或共享状态写入。

存在的间接影响必须区分：上述缺失判定和末次重验会影响独立工作流内部包装/多交付物；独立 Prompt 变长可能改变独立 Provider 输出，模型行为无法仅靠隔离摘要保证。未发现候选到另两业务的数据或代码传播路径；根测试和隔离反例通过支持这一判断，但未对另两业务另行调用计费 Provider，因此不能作跨服务输出绝对不变的保证。

修改前隔离检查通过。修改后完整隔离命令因六个受保护文件摘要失配而失败；不能写成“隔离整体已通过”。独立边界反例 15/15 通过，记录的失败原因是实现内容漂移，而不是已检测到跨业务引用。

## 4. 修改前后测试及限制

本轮用完全相同的七项测试分别运行候选与基点模块。基点通过仓库外只读 loader 从 Git 获取六个原始模块，未替换工作树、未改摘要、未把历史实现引入生产。

| 验证 | 修改前 | 当前候选 | 说明 |
| --- | --- | --- | --- |
| 同一七项质量回归 | 2 通过 / 5 失败 | 7/7 通过 | [基点日志](E:/image-quality-regression-evidence/review-baseline-spatial-quality.log)、[候选日志](E:/image-quality-regression-evidence/review-candidate-spatial-quality.log) |
| repo:verify | 通过 | 未通过 | 完整性失配，未刷新 |
| npm test | 未单独保存完整基点根测试 | 1701/1701 通过 | 不把历史版本测试数当成本次基点证据 |
| cli:test | 未单独运行 | 40/40 通过 | 既有候选日志 |
| runtime:test | 未单独运行完整基点套件 | 基础 14/14；应用 1292/1294 | 两项独立操作被完整性门禁阻断 |
| verify:current-flows | 包含于修改前 repo:verify，整体通过 | 未通过 | 两项完整性阻断，下游未宣告通过 |
| repo:check | 未单独运行 | 未通过 | 前置完整性门禁停止；不能称完整回归全绿 |
| 双向隔离反例 | 修改前 repo:verify 中通过 | 15/15 通过 | 未修改反例或守卫 |
| web-runtime:test | 宿主目标测试重放同样 256 != 236 | 14/15 | 基点已有计数断言失败，未越界修改 |
| web:build / web:smoke | 未单独保存本次修改前结果 | 均通过 | smoke 0 Provider 调用、0 业务写入 |
| golden:test / space-golden-boundary | 未单独保存本次修改前结果 | 均通过 | 未改 Golden；不代表本次新图获人工认可 |
| diff --check | 工作树初始干净 | 通过 | 本轮复核 |

候选完整测试记录详见 [已有调查报告](./image-quality-investigation.md)；原日志位于 `E:/image-quality-regression-evidence/`。本轮未再次运行全部耗时套件，因为生产候选未变化，新增的是审查资料；重跑同条件七项用例并检查差异，同时重新执行 repo:verify。最新 [门禁日志](E:/image-quality-regression-evidence/review-repo-verify.log) 显示仓库契约通过、Golden 未变，随后仍在 IMPLEMENTATION_CHANGED 处按设计阻断；没有刷新摘要消除失败。

## 5. 原摘要与候选摘要逐项对照

以下均为磁盘文件原始字节的 SHA-256，不做换行或编码归一化。六项原摘要均与 Git 基点字节一致。候选摘要仅供审核，未写入保护记录。

| manifest 内路径 | 原有 SHA-256 | 候选 SHA-256 |
| --- | --- | --- |
| `src/analysis-decisions/analysis-completion-orchestrator.js` | `8395bcbcbb798afc27388258f62f7de3eb7a9936a968c9d8280454d8d57da384` | `9577c3d59c4d8869cb11e563163f49ad9bc324dda05855a32664f891cf1338ae` |
| `src/analysis-decisions/deliverable-sufficiency.js` | `1d2341e13dd383741f677f4bfecb8a49e61d08275f48b13f98f763a68d1e223b` | `b78d8becd3a7ce165bfb6305d9d2ab512f907c6103d6a893b2cfa02996d5a323` |
| `src/generation-runtime/space/semantic/compile-spatial-mechanisms.js` | `dad054ab68dd9b0371878a50092fe2048c27a0c09e70128d016fc69cc420d293` | `5a391a10e91027ba220a1bda5d4adb2dbe898f7b041b8d07ff4841f2ea5f1fc9` |
| `src/generation-runtime/space/semantic/sanitize-brand-expression.js` | `d1b658cd984dc67f1c5a671beaf0d2b7c64d0adccc6fc3eb8f2e320428c56831` | `ea5baf7e09309f3f22d6522b9ab55a8fd8740e7da357f0137494dfce7e7f8bee` |
| `src/generation-runtime/space/source-adapter.js` | `a01f53c819a471f56bd499e826c2ea1e5b2d5a1ace33ece566b49c4e15798643` | `ceb1695be0872cfae9bd706314f367ce396332a4ba32ad46e434fd2b9a3342c1` |
| `src/runtime/visual-decision-packet.js` | `e14a02ff9e83834c07b3673e0ad4b81cab91aabedacf6c2f772a9be40554ee81` | `c2cd5758fa708cc1263bfcbf95c3d51816ac4097d4d35da4e488b26dada3e89a` |

- 原 manifest 文件 SHA-256：`df16991c37f6c1b57404d1b958d164be54efb415dca114bea7574d85ee53c321`。
- 原 manifest 与 HEAD 文件一致：`true`。
- 原 implementationDigest：`4f39fdd70653498e41b483155a3892b48146c85acdfa24ce9a72ffb8653fe47b`。
- 假设仅替换这六项后的 implementationDigest：`3a56ee9273df553f74807322fcc77747b98bcfa6046800a45705a806d198fb30`。
- 该聚合算法与 verifyImplementation 一致：`sha256(JSON.stringify(manifest.files))`。它不是 manifest 文件本身的哈希。
- 受保护 files 条目共 127 项，六项候选变化，其余 121 项保持原值；frontendFiles、Prompt、owner、extractionStatus 及 qualityAcceptance 均不变。
- 当前 qualityAcceptance 仍为 `pending-separate-quality-repair`。测试和报告不在 src/prompts 内，不建议借本次审查扩大保护清单或改其语义。

机器可读清单：[implementation-digest-review.json](./implementation-digest-review.json)。该文件是审核附件，不是替代运行清单。审核通过后若候选字节有任何变化，需要重新对照，不能沿用本次批准。

## 6. 回退方案

当前未改原始项目、历史报告、图片、人工基准或完整性记录，未真实生图，也未改变数据格式或执行数据迁移。生产改动仍是分支上的未提交候选。

若否决候选，先保存本报告、补丁与六项候选摘要，再只恢复本报告列出的六个文件到 `5270b00`；恢复前逐项比对磁盘候选哈希，若发生新的用户修改则停止，不覆盖未知变更。不得 git reset --hard、批量清理项目或恢复其他路径。新增测试与审查资料可保留为证据；原完整性文件无需回写，因为本轮从未修改。

恢复后运行 verify:visual-workflow-isolation 与 repo:verify，核实既有基点行为。若将来批准更新摘要后再回退，必须把六项源码和相应六项原摘要作为一组受控回退，重新执行门禁；保留审查审计，不能仅回退源码后继续使用候选摘要。此处是方案，尚未执行回退。

## 7. 后续批准范围与停留点

用户已批准以现有独立九州美学项目作为测试对象；这不证明它就是六张附件的来源。仅允许读取其输入与分析上下文，未来重生成须使用独立测试记录，不覆盖原项目素材、分析报告、历史生成结果或人工验收基准。仍保持标准生图、独立模型/凭据、参考图零输入；确认 Logo 仍按现有后期合成流程处理。

当前用户尚未批准完整性更新，六项差异也尚未获得实现审查通过。本轮按要求在报告提交后停止，等待明确决定；不会自动更新摘要、调用模型或把程序测试视作视觉验收。

## 附录：六个生产文件完整统一差异

以下为当前 git diff 原文，没有省略任何生产变更。[独立补丁文件](./image-quality-code.diff) 可用于审查与留档。

```diff
diff --git a/packages/visual-workflow/src/analysis-decisions/analysis-completion-orchestrator.js b/packages/visual-workflow/src/analysis-decisions/analysis-completion-orchestrator.js
index 8ab81d3..90183e2 100644
--- a/packages/visual-workflow/src/analysis-decisions/analysis-completion-orchestrator.js
+++ b/packages/visual-workflow/src/analysis-decisions/analysis-completion-orchestrator.js
@@ -265,6 +265,13 @@ async function completeStructuredAnalysis(input) {
       });
     }
   }
+  // Semantic repair can delete unsafe entries. Recheck sufficiency on the
+  // resulting packet rather than trusting the pre-cleanup ready status.
+  if (finalStatus === "ready" || finalStatus === "ready_with_warnings") {
+    const finalSufficiency = evaluateDeliverableSufficiency({ packet, deliverable: input.deliverable, execution });
+    finalIssues = finalSufficiency.issues;
+    finalStatus = finalSufficiency.status === "repairable" ? "failed" : finalSufficiency.status;
+  }
   finalIssues.forEach((issue) => {
     if (issue.severity === "requires_confirmation" || issue.severity === "fatal" || issue.severity === "repairable") {
       accumulator.unresolved.set(issue.path, issue);
diff --git a/packages/visual-workflow/src/analysis-decisions/deliverable-sufficiency.js b/packages/visual-workflow/src/analysis-decisions/deliverable-sufficiency.js
index c4e0c44..0595860 100644
--- a/packages/visual-workflow/src/analysis-decisions/deliverable-sufficiency.js
+++ b/packages/visual-workflow/src/analysis-decisions/deliverable-sufficiency.js
@@ -153,7 +153,7 @@ const DELIVERABLE_RULES = {
 };
 function satisfies(value, rule) {
   if (rule.kind === "array") {
-    return Array.isArray(value) && value.length >= (rule.minimumItems ?? 1);
+    return Array.isArray(value) && value.filter(item => typeof item === "string" ? nonEmptyText(item) : isRecord(item) && Object.keys(item).length > 0).length >= (rule.minimumItems ?? 1);
   }
   if (rule.kind === "object") return isRecord(value);
   return nonEmptyText(value);
diff --git a/packages/visual-workflow/src/generation-runtime/space/semantic/compile-spatial-mechanisms.js b/packages/visual-workflow/src/generation-runtime/space/semantic/compile-spatial-mechanisms.js
index 52940a9..09bf786 100644
--- a/packages/visual-workflow/src/generation-runtime/space/semantic/compile-spatial-mechanisms.js
+++ b/packages/visual-workflow/src/generation-runtime/space/semantic/compile-spatial-mechanisms.js
@@ -29,7 +29,7 @@ function compileSpatialMechanisms(packet) {
           mechanismId: r.id
         });
       }
-    } else if (r.classification === SEMANTIC_CLASS.BRAND_MOTIF) {
+    } else if (r.classification === SEMANTIC_CLASS.BRAND_MOTIF || r.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT && r.sourceField === "signatureSpatialMechanism") {
       brandMotifSemantics.push({
         text: r.sourceRawText,
         motifHits: r.motifHits,
diff --git a/packages/visual-workflow/src/generation-runtime/space/semantic/sanitize-brand-expression.js b/packages/visual-workflow/src/generation-runtime/space/semantic/sanitize-brand-expression.js
index 7670262..3d7e837 100644
--- a/packages/visual-workflow/src/generation-runtime/space/semantic/sanitize-brand-expression.js
+++ b/packages/visual-workflow/src/generation-runtime/space/semantic/sanitize-brand-expression.js
@@ -52,6 +52,11 @@ function sanitizeBrandItem(rawItem) {
     const normalized = hasAccent ? raw : `${raw}\uFF08\u54C1\u724C\u8272\u4EC5\u4F5C\u5C40\u90E8\u70B9\u7F00\uFF0C\u4E0D\u4F5C\u7A7A\u95F4\u51E0\u4F55/\u5927\u9762\u79EF\u6E10\u53D8\uFF09`;
     return { text: normalized, raw, disposition: "normalized", reason: "color_demoted_to_accent", normalized };
   }
+  // Explicit physical installations belong to brand expression. They must
+  // still pass identity, operations, prop, prose and gradient checks above.
+  if (analysis.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT) {
+    return { text: raw, raw, disposition: "kept" };
+  }
   if (hasMotif(raw)) {
     const norm = normalizeArchitectureSemantics(raw, "brandRoleManifestation");
     if (norm.includedInArchitecturePrompt && norm.normalized) {
diff --git a/packages/visual-workflow/src/generation-runtime/space/source-adapter.js b/packages/visual-workflow/src/generation-runtime/space/source-adapter.js
index cdd3b5e..e714bc2 100644
--- a/packages/visual-workflow/src/generation-runtime/space/source-adapter.js
+++ b/packages/visual-workflow/src/generation-runtime/space/source-adapter.js
@@ -92,6 +92,10 @@ function adaptSpaceSource({ packet, taskContract, projectContext }) {
   const rawMustBeVisible = cleanList(spatial.mustBeVisible);
   const { safe: compositionMustBeVisible, brand: brandMustBeVisible } = splitMustBeVisible(rawMustBeVisible);
   const missing = [];
+  // Persisted packets can carry a stale ready flag from before validation.
+  for (const field of ["signatureSpatialMechanism", "functionalNetwork", "functionalRelationships"]) {
+    if (!cleanList(spatial[field]).length) missing.push(`spatial.${field}`);
+  }
   const rawExperienceGoal = firstString(
     spatial.spatialConcept,
     creativeDecision.uniqueUpgradeThesis,
@@ -147,6 +151,8 @@ function adaptSpaceSource({ packet, taskContract, projectContext }) {
   );
   if (!commercialPurpose) missing.push("projectFacts.brandRole | creativeDecision.uniqueUpgradeThesis");
   if (spatialTranslation.length < 1) missing.push("spatial.brandRoleManifestation | functionalNetwork");
+  if (!demoteFunctionalList(rawFunctionalNetwork, "functionalNetwork").length) missing.push("spatial.functionalNetwork (after semantic cleanup)");
+  if (!operationConstraints.length) missing.push("spatial.functionalRelationships (after semantic cleanup)");
   const conceptPrimary = firstString(spatial.spatialConcept, creativeDecision.uniqueUpgradeThesis);
   const conceptPrimaryNormalized = normalizeConceptPrimary(conceptPrimary);
   const architecturalConcept = {
diff --git a/packages/visual-workflow/src/runtime/visual-decision-packet.js b/packages/visual-workflow/src/runtime/visual-decision-packet.js
index a837570..17b6032 100644
--- a/packages/visual-workflow/src/runtime/visual-decision-packet.js
+++ b/packages/visual-workflow/src/runtime/visual-decision-packet.js
@@ -106,7 +106,7 @@ function spatialTranslation(value) {
   const lightingLanguage = lightingBehavior(candidate.lightingLanguage);
   const colors = colorBehavior(candidate.colorBehavior);
   const ready = Boolean(
-    spatialConcept && structureLanguage.length && materialLanguage.length && lightingLanguage.source.length && strings(candidate.sceneProgram).length && [...colors.primary, ...colors.secondary, ...colors.accent].length
+    spatialConcept && structureLanguage.length && materialLanguage.length && lightingLanguage.source.length && strings(candidate.sceneProgram).length && strings(candidate.signatureSpatialMechanism).length && strings(candidate.functionalNetwork).length && strings(candidate.functionalRelationships).length && [...colors.primary, ...colors.secondary, ...colors.accent].length
   );
   return {
     status: ready ? "ready" : "insufficient",
@@ -164,6 +164,9 @@ function missingExecutionFields(packet) {
   if (!spatial.materialLanguage.length) missing.push("mediaTranslations.spatial.materialLanguage");
   if (!spatial.lightingLanguage.source.length) missing.push("mediaTranslations.spatial.lightingLanguage");
   if (!spatial.sceneProgram.length) missing.push("mediaTranslations.spatial.sceneProgram");
+  for (const field of ["signatureSpatialMechanism", "functionalNetwork", "functionalRelationships"]) {
+    if (!strings(spatial[field]).length) missing.push(`mediaTranslations.spatial.${field}`);
+  }
   if (![...spatial.colorBehavior.primary, ...spatial.colorBehavior.secondary, ...spatial.colorBehavior.accent].length) {
     missing.push("mediaTranslations.spatial.colorBehavior");
   }
```
