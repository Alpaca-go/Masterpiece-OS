/**
 * CI-W1C.7 — Visual Direction Exploration Report markdown renderer.
 *
 * Pure function. No IO, no model call.
 *
 * Output structure (spec §11):
 *   01 项目理解
 *   02 关键洞察
 *   03 Opportunity Territories
 *   04 Creative Concepts
 *   05 Visual Direction Explorations
 *   06 System Recommendation
 *
 * The recommendation section **does not** change selection. The
 * user must still explicitly select a direction.
 */

import type { VisualDirectionExplorationReport } from './contracts.ts';

function mdEscape(s: string): string {
  // escape pipe + backslash + newlines for table cell use; otherwise
  // pass through (we mostly use paragraphs).
  return s.replace(/\\/g, '\\\\').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function line(s: string): string {
  return s.endsWith('\n') ? s : `${s}\n`;
}

export function renderVisualDirectionReportMarkdown(report: VisualDirectionExplorationReport): string {
  const out: string[] = [];
  out.push(line(`# Visual Direction Exploration Report`));
  out.push(line(''));
  out.push(line(`> 项目 ID: \`${report.projectId}\``));
  out.push(line(`> Generated: ${report.generatedAt}`));
  out.push(line(`> Image provider call count: **${report.imageProviderCallCount}**`));
  out.push(line(`> ${report.selectionFrozenNotice}`));
  out.push(line(''));

  // 01 项目理解
  out.push(line('## 01 项目理解'));
  const pu = report.projectUnderstanding;
  out.push(line(`**Summary**: ${pu.summary}`));
  out.push(line(''));
  out.push(line(`**核心战略问题**: ${pu.coreChallenge}`));
  out.push(line(''));
  out.push(line(`**转变目标**: ${pu.transformationGoal}`));
  if (pu.brandRoleInterpretation) {
    out.push(line(''));
    out.push(line(`**品牌角色解释**: ${pu.brandRoleInterpretation}`));
  }
  if (pu.audienceTension) {
    out.push(line(''));
    out.push(line(`**受众 / 品牌 tension**: ${pu.audienceTension}`));
  }
  out.push(line(''));
  out.push(line(`**依据**: factRefs=[${pu.factRefs.join(', ')}]; needRefs=[${pu.needRefs.join(', ')}]; evidenceRefs=[${pu.evidenceRefs.join(', ')}]`));
  out.push(line(''));

  // 02 关键洞察
  out.push(line('## 02 关键洞察'));
  for (const i of report.insights) {
    out.push(line(`### ${i.id}`));
    out.push(line(`- **Insight**: ${i.statement}`));
    out.push(line(`- **Implication**: ${i.implication}`));
    out.push(line(`- **Why this project**: ${i.whyThisProject}`));
    out.push(line(`- **Trace**: factRefs=[${i.factRefs.join(', ')}]; needRefs=[${i.needRefs.join(', ')}]; evidenceRefs=[${i.evidenceRefs.join(', ')}]`));
    out.push(line(''));
  }

  // 03 Opportunity Territories
  out.push(line('## 03 Opportunity Territories'));
  for (const o of report.opportunities) {
    out.push(line(`### ${o.title}`));
    out.push(line(`- **Thesis**: ${o.thesis}`));
    out.push(line(`- **Strategic mechanism**: ${o.strategicMechanism}`));
    out.push(line(`- **Why this project**: ${o.whyThisProject}`));
    if (o.risk.length > 0) {
      out.push(line(`- **Risk**: ${o.risk.map((r) => r).join('; ')}`));
    }
    out.push(line(`- **Trace**: insightRefs=[${o.insightRefs.join(', ')}]; factRefs=[${o.factRefs.join(', ')}]`));
    out.push(line(''));
  }

  // 04 Creative Concepts
  out.push(line('## 04 Creative Concepts'));
  for (const c of report.concepts) {
    out.push(line(`### ${c.title}`));
    out.push(line(`- **Core proposition**: ${c.coreProposition}`));
    out.push(line(`- **Strategic mechanism**: ${c.strategicMechanism}`));
    if (c.centralMetaphor) {
      out.push(line(`- **Central metaphor**: ${c.centralMetaphor}`));
    }
    out.push(line(`- **Why not category cliche**: ${c.whyNotCategoryCliche}`));
    out.push(line(`- **Translation — organization**: ${c.translationHypothesis.organizationLogic}`));
    out.push(line(`- **Translation — expression**: ${c.translationHypothesis.expressionLogic}`));
    if (c.translationHypothesis.possibleVisualBehaviors.length > 0) {
      out.push(line(`- **Possible visual behaviors**:`));
      for (const v of c.translationHypothesis.possibleVisualBehaviors) {
        out.push(line(`  - ${v}`));
      }
    }
    out.push(line(`- **Trace**: opportunityRefs=[${c.opportunityRefs.join(', ')}]; insightRefs=[${c.insightRefs.join(', ')}]; factRefs=[${c.factRefs.join(', ')}]`));
    if (c.strengths.length > 0) {
      out.push(line(`- **Strengths**: ${c.strengths.join('; ')}`));
    }
    if (c.risks.length > 0) {
      out.push(line(`- **Risks**: ${c.risks.join('; ')}`));
    }
    out.push(line(''));
  }

  // 05 Visual Direction Explorations
  out.push(line('## 05 Visual Direction Explorations'));
  for (const d of report.directions) {
    out.push(line(`### ${d.title}`));
    out.push(line(`**Direction family**: ${d.directionFamily}`));
    out.push(line(''));
    out.push(line(`- **Creative thesis**: ${d.creativeThesis}`));
    out.push(line(`- **Visual mechanism**: ${d.visualMechanism}`));
    out.push(line(`- **System hypothesis**: ${d.systemHypothesis}`));
    out.push(line(''));
    out.push(line(`- **Composition logic**: ${d.visualLanguage.compositionLogic}`));
    out.push(line(`- **Color relationship**: ${d.visualLanguage.colorRelationship}`));
    out.push(line(`- **Typography behavior**: ${d.visualLanguage.typographyBehavior}`));
    out.push(line(`- **Graphic behavior**: ${d.visualLanguage.graphicBehavior}`));
    out.push(line(`- **Image behavior**: ${d.visualLanguage.imageBehavior}`));
    if (d.visualLanguage.materialRelationship) {
      out.push(line(`- **Material relationship**: ${d.visualLanguage.materialRelationship}`));
    }
    if (d.visualLanguage.motionBehavior) {
      out.push(line(`- **Motion behavior**: ${d.visualLanguage.motionBehavior}`));
    }
    out.push(line(''));
    const cm = d.crossMediaBehavior;
    if (cm.brandVI) out.push(line(`- **Brand VI**: ${cm.brandVI}`));
    if (cm.editorial) out.push(line(`- **Editorial**: ${cm.editorial}`));
    if (cm.campaignPoster) out.push(line(`- **Campaign poster**: ${cm.campaignPoster}`));
    if (cm.packaging) out.push(line(`- **Packaging**: ${cm.packaging}`));
    if (cm.space) out.push(line(`- **Space**: ${cm.space}`));
    if (cm.digitalUI) out.push(line(`- **Digital UI**: ${cm.digitalUI}`));
    out.push(line(''));
    out.push(line(`- **Why this project**: ${d.whyThisProject}`));
    out.push(line(`- **Difference from other directions**: ${d.differenceFromOtherDirections}`));
    if (d.strengths.length > 0) {
      out.push(line(`- **Strengths**: ${d.strengths.join('; ')}`));
    }
    if (d.risks.length > 0) {
      out.push(line(`- **Risks**: ${d.risks.join('; ')}`));
    }
    if (d.mustNotBecome.length > 0) {
      out.push(line(`- **Must not become**: ${d.mustNotBecome.map((m) => mdEscape(m)).join('; ')}`));
    }
    out.push(line(`- **Trace**: conceptRefs=[${d.conceptRefs.join(', ')}]; opportunityRefs=[${d.opportunityRefs.join(', ')}]; insightRefs=[${d.insightRefs.join(', ')}]; factRefs=[${d.factRefs.join(', ')}]`));
    out.push(line(''));
  }

  // 06 System Recommendation
  out.push(line('## 06 System Recommendation'));
  out.push(line(`> **${report.selectionFrozenNotice}**`));
  out.push(line(''));
  out.push(line(`**Advisory recommendation**: ${report.recommendation.recommendedDirectionTitle} (\`${report.recommendation.recommendedDirectionId}\`)`));
  out.push(line(''));
  out.push(line(`**Rationale**: ${report.recommendation.rationale}`));
  out.push(line(''));
  out.push(line(`> The recommendation is **advisory only**. The user must explicitly select a direction. Selection does not auto-promote from recommendation.`));
  out.push(line(''));

  return out.join('');
}
