import type {
  CreativeDirectionSourceCoverage,
  FinalCreativeDirection,
  SharedProjectContext,
  StrategyContribution,
  VisualContribution,
} from './creative-direction-contracts.ts';
import { buildCreativeDirectionSourceFingerprint } from './creative-direction-source-fingerprint.ts';
import {
  toCreativeDirectionSynthesisInput,
  validateCreativeDirectionSynthesisOutput,
  type CreativeDirectionSynthesisAdapter,
} from './creative-direction-synthesis-adapter.ts';

function unique(values: Array<string | undefined>, max = 8): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].slice(0, max);
}

export async function synthesizeCreativeDirection(input: {
  sessionId: string;
  projectName: string;
  context: SharedProjectContext;
  strategy: StrategyContribution | null;
  visual: VisualContribution | null;
  previous: FinalCreativeDirection | null;
  id: string;
  timestamp: string;
  adapter?: CreativeDirectionSynthesisAdapter;
}): Promise<FinalCreativeDirection> {
  const { strategy, visual, context, previous } = input;
  if (!strategy && !visual) throw new Error('CREATIVE_DIRECTION_SOURCE_NOT_READY');
  const lockedFacts = context.facts.filter((fact) => fact.key === 'lockedFact').map((fact) => `不得违背：${fact.value}`);
  const conflicts: string[] = [];
  const strategyCorpus = unique([strategy?.proposition, ...(strategy?.strategicIntent ?? []), ...(strategy?.brandPrinciples ?? [])], 20).join(' ').toLowerCase();
  const visualCorpus = unique([visual?.directionSummary, ...(visual?.visualKeywords ?? []), ...(visual?.visualPrinciples ?? [])], 20).join(' ').toLowerCase();
  if (/(trust|professional|可信|专业|清晰|information)/u.test(strategyCorpus) && /(extreme|minimal|极简|留白)/u.test(visualCorpus)) {
    conflicts.push('保留克制与留白，但信息层级和关键事实的可读性优先。');
  }
  const sourceCoverage: CreativeDirectionSourceCoverage = {
    strategy: strategy ? 'USED' : 'NOT_READY',
    visualResearch: visual ? 'USED' : 'NOT_READY',
    contextRevision: context.revision,
  };
  const fallback: FinalCreativeDirection = {
    schemaVersion: 'final-creative-direction-v0.2',
    id: previous?.id || input.id,
    sessionId: input.sessionId,
    revision: (previous?.revision || 0) + 1,
    status: 'DRAFT',
    stale: false,
    title: strategy?.directionTitle || visual?.directionTitle || previous?.title || `${input.projectName} 创意方向`,
    proposition: strategy?.proposition || visual?.directionSummary || context.facts.find((fact) => fact.key === 'description')?.value || previous?.proposition || '围绕已确认项目事实建立一致的创意表达。',
    strategicPrinciples: unique([...(strategy?.brandPrinciples ?? []), ...(strategy?.strategicIntent ?? []), ...(strategy?.decisionRationales ?? [])], 6),
    visualPrinciples: visual ? unique([...(visual.visualPrinciples ?? []), ...(visual.visualKeywords ?? [])], 8) : [],
    negativeConstraints: unique([...lockedFacts, ...(visual?.negativeSignals ?? [])], 8),
    risks: unique([...(strategy?.warnings ?? []), ...(visual?.warnings ?? []), ...conflicts.map((item) => `策略与视觉张力：${item}`)], 8),
    conflictResolutions: conflicts,
    rationale: unique([...(strategy?.decisionRationales ?? []), ...(strategy?.opportunityStatements ?? [])], 8),
    evidence: unique(context.facts.map((fact) => `共享事实：${fact.value}`), 16),
    sourceCoverage,
    sourceFingerprint: buildCreativeDirectionSourceFingerprint({ contextRevision: context.revision, strategy, visual }),
    createdAt: previous?.createdAt || input.timestamp,
    updatedAt: input.timestamp,
  };
  if (!input.adapter) return fallback;
  try {
    const synthesized = validateCreativeDirectionSynthesisOutput(await input.adapter.synthesize(toCreativeDirectionSynthesisInput({
      projectName: input.projectName,
      context,
      strategy,
      visual,
    })));
    return {
      ...fallback,
      ...synthesized,
      visualPrinciples: visual ? synthesized.visualPrinciples : [],
    };
  } catch {
    return fallback;
  }
}
