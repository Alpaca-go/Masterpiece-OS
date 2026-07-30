import type {
  SourcedVisualFact,
  VisualDecisionPacket,
  VisualDiagnosisItemV2,
} from '../../../../packages/project-contracts/src/index.ts';

function bullets(values: string[], empty = '[Unknown] 暂无可靠证据'): string {
  return values.length ? values.map((item) => `- ${item}`).join('\n') : `- ${empty}`;
}

function fact(label: string, value: SourcedVisualFact<unknown>): string {
  const tag = value.source === 'user_input'
    ? '[User Confirmed]'
    : value.source === 'model_inference'
      ? value.status === 'unknown' ? '[Unknown]' : '[AI Diagnosis]'
      : '[Source Fact]';
  return `- ${tag} ${label}：${Array.isArray(value.value) ? value.value.join('、') : String(value.value)}（${value.status} / ${value.confidence.toFixed(2)}；证据：${value.evidenceRefs.join('、') || '无'}）`;
}

function diagnosis(values: VisualDiagnosisItemV2[]): string[] {
  return values.map((item) =>
    `[AI Diagnosis] ${item.target}：${item.observation}；影响：${item.whyItMatters}；证据：${item.evidenceRefs.join('、') || '无'}；置信度：${item.confidence.toFixed(2)}`);
}

function materials(packet: VisualDecisionPacket): string[] {
  return packet.materialSystem.map((item) =>
    `[Creative Proposal] ${item.material}：${item.behavior.join('、')}；品牌作用：${item.brandRole}${item.forbidden.length ? `；避免：${item.forbidden.join('、')}` : ''}`);
}

function colors(packet: VisualDecisionPacket): string[] {
  const render = (label: string, values: typeof packet.colorSystem.primary) =>
    values.map((item) => `[Creative Proposal] ${label} ${item.name}${item.ratio == null ? '' : ` ${item.ratio}%`}：${item.role}`);
  return [
    ...render('主色', packet.colorSystem.primary),
    ...render('辅助色', packet.colorSystem.secondary),
    ...render('强调色', packet.colorSystem.accent),
    ...packet.colorSystem.forbidden.map((item) => `[Creative Proposal] 色彩禁止：${item}`),
  ];
}

export function compileVisualDecisionReport(
  packet: VisualDecisionPacket,
  options: { title?: string } = {},
): string {
  const spatial = packet.mediaTranslations.spatial;
  const creative = packet.creativeDecision;
  const title = options.title || `${packet.projectFacts.brandName.value}视觉方案升级报告`;
  return `# ${title}

> 本报告由 Visual Decision Packet ${packet.schemaVersion} 确定性渲染。分析报告与生图执行数据来自同一份统一视觉理解。

## 0. 项目事实与置信度

${fact('品牌名称', packet.projectFacts.brandName)}
${fact('行业', packet.projectFacts.industry)}
${fact('品牌业务角色', packet.projectFacts.brandRole)}
- ${packet.validation.hardFactStatus === 'pass' ? '[Source Fact]' : '[Unknown]'} Hard Fact Gate：${packet.validation.hardFactStatus}
${packet.validation.message ? `- [Unknown] ${packet.validation.message}` : ''}

## 1. 原方案真实品牌资产

${bullets(packet.lockedAssets.map((item) => `[${item.lockSource === 'user_confirmed' ? 'User Confirmed' : 'Source Fact'}] ${item.type}：${item.value}；证据：${item.evidenceRefs.join('、') || '无'}`))}

## 2. 有价值的视觉记忆

${bullets(diagnosis(packet.diagnosis.valuableAssets))}

## 3. 过度、过时和行业俗套

${bullets([
    ...diagnosis(packet.diagnosis.overusedExpressions),
    ...diagnosis(packet.diagnosis.outdatedExpressions),
    ...diagnosis(packet.diagnosis.categoryCliches),
  ])}

## 4. 品牌误读风险

${bullets(diagnosis(packet.diagnosis.brandMisreadRisks))}

## 5. 唯一视觉升级命题

- [AI Diagnosis] 品牌角色：${creative.brandRoleStatement || '未形成'}
- [Creative Proposal] 从：${creative.upgradeFrom.join('、') || '未形成'}
- [Creative Proposal] 保留：${creative.preserveCore.join('、') || '未形成'}
- [Creative Proposal] 升级为：${creative.upgradeTo.join('、') || '未形成'}
- [Creative Proposal] ${creative.uniqueUpgradeThesis || '尚未形成唯一升级命题'}

## 6. 正向气质与反向边界

${bullets(creative.toneBoundaries.map((item) => `[Creative Proposal] ${item.target}；避免：${item.avoid.join('、') || '未定义'}`))}

## 7. 原资产抽象分析

${bullets(packet.abstractions.map((item) => `[AI Diagnosis] ${item.sourceAsset}
  - 语义：${item.semanticMeaning.join('、')}
  - 形式：${item.formalProperties.join('、')}
  - 节奏：${item.rhythmProperties.join('、')}
  - 材料潜力：${item.materialPotential.join('、')}
  - 光线潜力：${item.lightingPotential.join('、')}
  - 禁止字面复制：${item.forbiddenLiteralUse.join('、')}
  - 证据：${item.evidenceRefs.join('、') || '无'}；置信度：${item.confidence.toFixed(2)}`))}

## 8. 包装转译

- [Unknown] 本轮仅保留接口，未形成正式包装结论。

## 9. 海报转译

- [Unknown] 本轮仅保留接口，未形成正式海报结论。

## 10. 空间转译

- [Creative Proposal] 空间概念：${spatial.spatialConcept || '数据不足'}
${bullets(spatial.structureLanguage.map((item) => `[Creative Proposal] 结构：${item}`))}
${bullets(spatial.brandIntegration.map((item) => `[Creative Proposal] 品牌融合：${item}`))}
${bullets(spatial.functionalRelationships.map((item) => `[Creative Proposal] 功能关系：${item}`))}
${bullets(spatial.sceneProgram.map((item) => `[Creative Proposal] 场景程序：${item}`))}
${bullets(spatial.peopleBehavior.map((item) => `[Creative Proposal] 人物行为：${item}`))}
${bullets(packet.diagnosis.brandMisreadRisks.map((item) =>
    `[AI Diagnosis] 误读风险 ${item.code}（${item.status}）：${item.description}`))}

## 11. VI 转译

- [Unknown] 本轮仅保留接口，未形成正式 VI 结论。

## 12. 色彩、材料、光线行为

### 色彩

${bullets(colors(packet))}

### 材料

${bullets(materials(packet))}

### 光线

- [Creative Proposal] 光源：${packet.lightingSystem.source.join('、') || '数据不足'}
- [Creative Proposal] 对比：${packet.lightingSystem.contrast || '数据不足'}
${bullets(packet.lightingSystem.interactionWithMaterials.map((item) => `[Creative Proposal] 材料交互：${item}`))}
${bullets(packet.lightingSystem.forbidden.map((item) => `[Creative Proposal] 光线禁止：${item}`))}

## 13. Locked / Confirmed / Proposed / Unknown

- [Source Fact] 与 [User Confirmed] 才可进入 Locked Assets。
- [AI Diagnosis] 是有证据的专业判断，不等于用户锁定事实。
- [Creative Proposal] 是升级建议，除非用户确认，否则不得自动 Locked。
- [Unknown] 保持未知或进入探索模式，禁止用模型推断静默补齐。

## 14. 生图执行摘要

- Packet：${packet.validation.executionDataStatus}
- 正式升级模式：${packet.validation.mode}
- 世界观：${creative.targetWorldview.join('、') || '数据不足'}
- 空间结构：${spatial.structureLanguage.join('、') || '数据不足'}
- 项目专属禁止：${[
    ...packet.diagnosis.brandMisreadRisks
      .filter((item) => item.status === 'confirmed')
      .map((item) => item.description),
  ].filter((item, index, values) => values.indexOf(item) === index).join('、') || '数据不足'}
`;
}
