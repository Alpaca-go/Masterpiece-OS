import type { CreativeIntelligenceWorkspaceView } from '../application-contracts.ts';
import type { StrategyContribution } from './creative-direction-contracts.ts';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : null;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => text(item)).filter((item): item is string => Boolean(item)))];
}

function namedStatements(value: unknown, fields: string[]): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const source = record(item);
    if (!source) return [];
    for (const field of fields) {
      const result = text(source[field]);
      if (result) return [result];
    }
    return [];
  });
}

export function projectStrategyContribution(source: CreativeIntelligenceWorkspaceView): StrategyContribution {
  const snapshot = record(source.selectedDirectionSnapshot);
  const direction = record(snapshot?.direction) ?? snapshot;
  const evaluation = record(record(snapshot?.evaluationSnapshot)?.evaluation);
  const recommendation = record(record(snapshot?.evaluationSnapshot)?.recommendation);

  return {
    sourceRunId: source.run.id,
    sourceRevision: typeof source.run.selectionRevision === 'number' ? source.run.selectionRevision : undefined,
    sourceFingerprint: text(snapshot?.directionFingerprint),
    directionTitle: text(direction?.title),
    proposition: text(direction?.thesis) ?? text(direction?.proposition),
    strategicIntent: textList(direction?.strengths),
    opportunityStatements: namedStatements(source.opportunityMap && record(source.opportunityMap)?.opportunities, ['thesis', 'title', 'strategicMechanism']),
    audienceNeeds: namedStatements(source.needs, ['statement', 'need', 'description']),
    brandPrinciples: [text(direction?.systemHypothesis), ...textList(direction?.strengths)].filter((item): item is string => Boolean(item)),
    decisionRationales: [text(evaluation?.rationale), text(recommendation?.rationale)].filter((item): item is string => Boolean(item)),
    warnings: [...new Set([...source.warnings.map((item) => String(item).trim()).filter(Boolean), ...textList(direction?.risks)])],
  };
}
