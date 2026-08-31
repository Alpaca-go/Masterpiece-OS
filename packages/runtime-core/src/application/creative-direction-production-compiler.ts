import type {
  CreativeDirectionSession,
  CreativeDirectionWorkspace,
  FinalCreativeDirection,
} from './creative-direction-contracts.ts';

export interface CreativeDirectionProductionCompileResult {
  visualCanonId: string;
  anchorContractId: string;
  spaceTranslationId?: string;
  packagingTranslationId?: string;
}

export interface CreativeDirectionProductionCompiler {
  compile(input: {
    session: CreativeDirectionSession;
    context: CreativeDirectionWorkspace['context'];
    finalDirection: FinalCreativeDirection;
  }): Promise<CreativeDirectionProductionCompileResult>;
}

function requiredId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error(`Creative Direction production compiler returned an invalid ${field}`) as Error & { code?: string };
    error.code = 'PRODUCTION_COMPILE_RESULT_INVALID';
    throw error;
  }
  return value.trim();
}

function optionalId(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requiredId(value, field);
}

export function validateCreativeDirectionProductionCompileResult(value: unknown): CreativeDirectionProductionCompileResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    const error = new Error('Creative Direction production compiler returned no result') as Error & { code?: string };
    error.code = 'PRODUCTION_COMPILE_RESULT_INVALID';
    throw error;
  }
  const record = value as Record<string, unknown>;
  return {
    visualCanonId: requiredId(record.visualCanonId, 'visualCanonId'),
    anchorContractId: requiredId(record.anchorContractId, 'anchorContractId'),
    spaceTranslationId: optionalId(record.spaceTranslationId, 'spaceTranslationId'),
    packagingTranslationId: optionalId(record.packagingTranslationId, 'packagingTranslationId'),
  };
}
