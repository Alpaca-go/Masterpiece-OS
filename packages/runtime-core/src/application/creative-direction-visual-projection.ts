import { createHash } from 'node:crypto';
import type { CreativeDirectionContext, CreativeResearchSession, DirectionBoard } from './creative-research/contracts.ts';
import type { VisualContribution } from './creative-direction-contracts.ts';

export type CreativeDirectionVisualSource = {
  session: CreativeResearchSession;
  board: DirectionBoard | null;
  context: CreativeDirectionContext | null;
};

function unique(values: Array<string | undefined>, max = 16): string[] {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].slice(0, max);
}

export function projectVisualContribution(source: CreativeDirectionVisualSource): VisualContribution {
  const { board, context } = source;
  const visualPrinciples = unique([
    board?.typography,
    board?.layout,
    board?.color,
    board?.graphic,
    board?.material,
    board?.photography,
    ...(board?.designerNotes ?? []),
    ...(context?.designerNotes ?? []),
  ]);
  const negativeSignals = unique((context?.negativeSignals ?? []).map((item) => item.reason || item.value || item.type));
  const fingerprintInput = {
    boardRevision: board?.revision,
    summary: context?.directionSummary ?? board?.summary,
    visualKeywords: context?.visualKeywords ?? board?.visualKeywords ?? [],
    visualPrinciples,
    negativeSignals,
    selectedReferenceIds: context?.selectedReferenceIds ?? board?.referenceIds ?? [],
    selectedReferenceRegionIds: context?.selectedReferenceRegionIds ?? board?.referenceRegionIds ?? [],
  };
  return {
    sourceSessionId: source.session.id,
    sourceRevision: board?.revision ?? context?.directionBoardRevision,
    sourceFingerprint: createHash('sha256').update(JSON.stringify(fingerprintInput)).digest('hex'),
    directionSummary: context?.directionSummary || board?.summary,
    visualKeywords: unique([...(context?.visualKeywords ?? []), ...(board?.visualKeywords ?? [])]),
    visualPrinciples,
    visualTensions: unique(context?.constraints ?? []),
    negativeSignals,
    selectedReferenceSignals: unique(context?.preferredAttributes ?? []),
    warnings: [],
  };
}
