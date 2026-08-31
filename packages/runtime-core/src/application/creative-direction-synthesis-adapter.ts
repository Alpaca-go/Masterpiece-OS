import type {
  SharedProjectFact,
  StrategyContribution,
  VisualContribution,
} from './creative-direction-contracts.ts';

export interface CreativeDirectionSynthesisInput {
  project: {
    projectName: string;
  };
  context: {
    revision: number;
    facts: SharedProjectFact[];
  };
  strategy: Omit<StrategyContribution, 'sourceRunId' | 'sourceRevision' | 'sourceFingerprint'> | null;
  visual: Omit<VisualContribution, 'sourceSessionId' | 'sourceRevision' | 'sourceFingerprint'> | null;
}

export interface CreativeDirectionSynthesisOutput {
  title: string;
  proposition: string;
  strategicPrinciples: string[];
  visualPrinciples: string[];
  negativeConstraints: string[];
  risks: string[];
  conflictResolutions: string[];
  rationale: string[];
}

export interface CreativeDirectionSynthesisAdapter {
  synthesize(input: CreativeDirectionSynthesisInput): Promise<unknown>;
}

const outputFields = new Set([
  'title',
  'proposition',
  'strategicPrinciples',
  'visualPrinciples',
  'negativeConstraints',
  'risks',
  'conflictResolutions',
  'rationale',
]);

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`CREATIVE_DIRECTION_SYNTHESIS_OUTPUT_INVALID: ${field}`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))].slice(0, 16);
}

export function validateCreativeDirectionSynthesisOutput(value: unknown): CreativeDirectionSynthesisOutput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CREATIVE_DIRECTION_SYNTHESIS_OUTPUT_INVALID');
  }
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !outputFields.has(key))) {
    throw new Error('CREATIVE_DIRECTION_SYNTHESIS_OUTPUT_INVALID: unknown field');
  }
  if (typeof record.title !== 'string' || !record.title.trim() || typeof record.proposition !== 'string' || !record.proposition.trim()) {
    throw new Error('CREATIVE_DIRECTION_SYNTHESIS_OUTPUT_INVALID: title or proposition');
  }
  return {
    title: record.title.trim(),
    proposition: record.proposition.trim(),
    strategicPrinciples: stringList(record.strategicPrinciples, 'strategicPrinciples'),
    visualPrinciples: stringList(record.visualPrinciples, 'visualPrinciples'),
    negativeConstraints: stringList(record.negativeConstraints, 'negativeConstraints'),
    risks: stringList(record.risks, 'risks'),
    conflictResolutions: stringList(record.conflictResolutions, 'conflictResolutions'),
    rationale: stringList(record.rationale, 'rationale'),
  };
}

export function toCreativeDirectionSynthesisInput(input: {
  projectName: string;
  context: CreativeDirectionSynthesisInput['context'];
  strategy: StrategyContribution | null;
  visual: VisualContribution | null;
}): CreativeDirectionSynthesisInput {
  const { strategy, visual } = input;
  return {
    project: { projectName: input.projectName },
    context: input.context,
    strategy: strategy ? {
      directionTitle: strategy.directionTitle,
      proposition: strategy.proposition,
      strategicIntent: strategy.strategicIntent,
      opportunityStatements: strategy.opportunityStatements,
      audienceNeeds: strategy.audienceNeeds,
      brandPrinciples: strategy.brandPrinciples,
      decisionRationales: strategy.decisionRationales,
      warnings: strategy.warnings,
    } : null,
    visual: visual ? {
      directionTitle: visual.directionTitle,
      directionSummary: visual.directionSummary,
      visualKeywords: visual.visualKeywords,
      visualPrinciples: visual.visualPrinciples,
      visualTensions: visual.visualTensions,
      negativeSignals: visual.negativeSignals,
      selectedReferenceSignals: visual.selectedReferenceSignals,
      warnings: visual.warnings,
    } : null,
  };
}
