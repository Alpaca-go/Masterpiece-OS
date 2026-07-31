import type {
  RepairFieldPatch,
  RepairPlanBatch,
  StructuredRepairModel,
  StructuredRepairRunResult,
} from './contracts.ts';
import {
  isRecord,
  isMeaningfulValue,
} from './path-utils.ts';
import { buildRepairPrompt } from './repair-prompt-builder.ts';

function parseResponse(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const normalized = value.trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '');
  try {
    return JSON.parse(normalized);
  } catch {
    throw Object.assign(new Error('Repair model returned unparseable JSON.'), {
      code: 'REPAIR_RESPONSE_INVALID',
    });
  }
}

function invalid(message: string): never {
  throw Object.assign(new Error(message), {
    code: 'REPAIR_RESPONSE_INVALID',
  });
}

const stringArraySchema = {
  type: 'array',
  minItems: 1,
  items: { type: 'string', minLength: 1 },
};

function objectSchema(
  properties: Record<string, unknown>,
  required = Object.keys(properties),
): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required,
    properties,
  };
}

function valueSchemaForPath(path: string): Record<string, unknown> {
  if ([
    'creativeDecision.brandRoleStatement',
    'creativeDecision.uniqueUpgradeThesis',
    'mediaTranslations.spatial.spatialConcept',
  ].includes(path)) {
    return { type: 'string', minLength: 1 };
  }
  if (path === 'creativeDecision.toneBoundaries') {
    return {
      type: 'array',
      minItems: 2,
      items: objectSchema({
        target: { type: 'string', minLength: 1 },
        avoid: stringArraySchema,
      }),
    };
  }
  if (path === 'diagnosis.valuableAssets') {
    return {
      type: 'array',
      minItems: 1,
      items: objectSchema({
        target: { type: 'string', minLength: 1 },
        observation: { type: 'string', minLength: 1 },
        whyItMatters: { type: 'string', minLength: 1 },
        evidenceRefs: stringArraySchema,
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      }),
    };
  }
  if (path === 'diagnosis.brandMisreadRisks') {
    return {
      type: 'array',
      minItems: 1,
      items: objectSchema({
        code: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        target: { type: 'string', minLength: 1 },
        observation: { type: 'string', minLength: 1 },
        whyItMatters: { type: 'string', minLength: 1 },
        appliesTo: objectSchema({
          taskFamilies: stringArraySchema,
          subtypes: { type: 'array', items: { type: 'string' } },
          scenes: { type: 'array', items: { type: 'string' } },
        }),
        evidenceRefs: stringArraySchema,
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        status: { type: 'string', enum: ['confirmed', 'probable'] },
      }),
    };
  }
  if (path === 'abstractions') {
    return {
      type: 'array',
      minItems: 1,
      items: objectSchema({
        sourceAsset: { type: 'string', minLength: 1 },
        semanticMeaning: stringArraySchema,
        formalProperties: stringArraySchema,
        rhythmProperties: stringArraySchema,
        materialPotential: stringArraySchema,
        lightingPotential: stringArraySchema,
        forbiddenLiteralUse: stringArraySchema,
        evidenceRefs: stringArraySchema,
        confidence: { type: 'number', minimum: 0, maximum: 1 },
      }),
    };
  }
  if (path === 'mediaTranslations.spatial.materialLanguage') {
    return {
      type: 'array',
      minItems: 1,
      items: objectSchema({
        material: { type: 'string', minLength: 1 },
        behavior: stringArraySchema,
        brandRole: { type: 'string', minLength: 1 },
        forbidden: { type: 'array', items: { type: 'string' } },
      }),
    };
  }
  if (path.startsWith('mediaTranslations.spatial.colorBehavior.')) {
    return {
      type: 'array',
      minItems: 1,
      items: objectSchema({
        name: { type: 'string', minLength: 1 },
        role: { type: 'string', minLength: 1 },
      }),
    };
  }
  return stringArraySchema;
}

function matchesValueSchema(path: string, value: unknown): boolean {
  const schema = valueSchemaForPath(path);
  if (schema.type === 'string') return typeof value === 'string' && value.trim().length > 0;
  if (schema.type !== 'array' || !Array.isArray(value) || value.length < Number(schema.minItems ?? 0)) {
    return false;
  }
  const items = schema.items as Record<string, unknown> | undefined;
  if (items?.type === 'string') {
    return value.every((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (items?.type !== 'object') return true;
  const required = Array.isArray(items.required) ? items.required as string[] : [];
  return value.every((item) => (
    isRecord(item)
    && required.every((key) => {
      const child = item[key];
      if (typeof child === 'string') return child.trim().length > 0;
      if (Array.isArray(child)) return child.length > 0;
      return child !== undefined && child !== null;
    })
  ));
}

function responseSchema(targetFields: string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['repairs'],
    properties: {
      repairs: {
        type: 'array',
        minItems: targetFields.length,
        maxItems: targetFields.length,
        items: {
          oneOf: targetFields.map((path) => objectSchema({
            path: { type: 'string', enum: [path] },
            value: valueSchemaForPath(path),
            status: { type: 'string', enum: ['inferred', 'proposed'] },
            confidence: { type: 'number', minimum: 0, maximum: 1 },
            evidenceRefs: stringArraySchema,
          })),
        },
      },
    },
  };
}

export async function runStructuredRepair(input: {
  batch: RepairPlanBatch;
  packet: unknown;
  attempt: number;
  sourceFingerprint: string;
  model: StructuredRepairModel;
}): Promise<StructuredRepairRunResult> {
  if (!input.batch.evidenceRefs.length) {
    throw Object.assign(new Error('No current-project evidence is available for AI repair.'), {
      code: 'REPAIR_EVIDENCE_UNAVAILABLE',
    });
  }
  const built = buildRepairPrompt({
    batch: input.batch,
    packet: input.packet,
    attempt: input.attempt,
  });
  const raw = await input.model({
    prompt: built.prompt,
    attempt: input.attempt,
    batchId: input.batch.id,
    targetFields: [...input.batch.fieldPaths],
    responseSchema: responseSchema(input.batch.fieldPaths),
  });
  const parsed = parseResponse(raw);
  if (!isRecord(parsed) || !Array.isArray(parsed.repairs)) {
    invalid('Repair response must contain a repairs array.');
  }
  if (parsed.repairs.length !== input.batch.fieldPaths.length) {
    invalid('Repair response must contain every requested field exactly once.');
  }

  const requested = new Set(input.batch.fieldPaths);
  const allowedEvidence = new Set(input.batch.evidenceRefs);
  const seen = new Set<string>();
  const patches: RepairFieldPatch[] = parsed.repairs.map((candidate) => {
    if (!isRecord(candidate)) invalid('Repair entry must be an object.');
    const path = typeof candidate.path === 'string' ? candidate.path.trim() : '';
    if (!requested.has(path) || seen.has(path)) {
      invalid(`Repair response contains an unrequested or duplicate field: ${path || 'missing'}.`);
    }
    seen.add(path);
    const status = candidate.status;
    if (status !== 'inferred' && status !== 'proposed') {
      invalid(`Repair field ${path} has an invalid status.`);
    }
    const confidence = Number(candidate.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      invalid(`Repair field ${path} has an invalid confidence.`);
    }
    const evidenceRefs = Array.isArray(candidate.evidenceRefs)
      ? candidate.evidenceRefs
        .filter((ref): ref is string => typeof ref === 'string')
        .map((ref) => ref.trim())
        .filter(Boolean)
      : [];
    if (
      !evidenceRefs.length
      || evidenceRefs.some((ref) => !allowedEvidence.has(ref))
    ) {
      invalid(`Repair field ${path} contains unavailable evidence references.`);
    }
    if (!isMeaningfulValue(candidate.value)) {
      invalid(`Repair field ${path} contains an empty value.`);
    }
    if (!matchesValueSchema(path, candidate.value)) {
      invalid(`Repair field ${path} has an invalid value shape.`);
    }
    return {
      path,
      value: {
        value: structuredClone(candidate.value),
        status,
        confidence,
        evidenceRefs: [...new Set(evidenceRefs)],
        generatedBy: 'repair_model',
        sourceFingerprint: input.sourceFingerprint,
        schemaVersion: '1.0',
        repairVersion: '1.0',
      },
    };
  });

  return {
    batchId: input.batch.id,
    attempt: input.attempt,
    patches,
    promptRedacted: built.prompt,
    responseRedacted: {
      repairs: patches.map((patch) => ({
        path: patch.path,
        value: structuredClone(patch.value.value),
        status: patch.value.status as 'inferred' | 'proposed',
        confidence: patch.value.confidence,
        evidenceRefs: [...patch.value.evidenceRefs],
      })),
    },
  };
}
