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
      repairFeedback: 'Return one complete JSON object with a repairs array; do not include prose or Markdown.',
    });
  }
}

function invalid(message: string, repairFeedback = 'Return every requested path exactly once with the value type required by its JSON Schema.'): never {
  throw Object.assign(new Error(message), {
    code: 'REPAIR_RESPONSE_INVALID',
    repairFeedback,
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
  // Match deliverable sufficiency and the generation preflight gate. A
  // one-item network satisfies the generic array schema but cannot complete.
  if (path === 'mediaTranslations.spatial.functionalNetwork') {
    return { ...stringArraySchema, minItems: 3 };
  }
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

function responseSchema(targetFields: string[], evidenceRefs: string[]): Record<string, unknown> {
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
            evidenceRefs: {
              ...stringArraySchema,
              items: { anyOf: [
                { type: 'string', enum: [...new Set(evidenceRefs)] },
                { type: 'integer', enum: evidenceRefs.map((_, index) => index + 1) },
              ] },
            },
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
  previousFailure?: string;
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
  const schema = responseSchema(input.batch.fieldPaths, input.batch.evidenceRefs);
  // Include value shapes in the text too: not every compatible endpoint
  // enforces response_format, and the generic prompt's null is only a placeholder.
  const prompt = `${built.prompt}\n\nJSON Schema（value 必须符合对应 path 的类型，不能使用 null 占位）：\n${JSON.stringify(schema)}${input.previousFailure ? `\n\n上一次校验失败，请修正：\n${input.previousFailure}` : ''}`;
  const raw = await input.model({
    prompt,
    attempt: input.attempt,
    batchId: input.batch.id,
    targetFields: [...input.batch.fieldPaths],
    responseSchema: schema,
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
    // The prompt explicitly numbers this request's evidence. Resolve only
    // those integer indexes; never infer a source from an unknown citation.
    const suppliedRefs = Array.isArray(candidate.evidenceRefs) ? candidate.evidenceRefs : [];
    const evidenceRefs = suppliedRefs.map((ref) => {
      if (typeof ref === 'string') return ref.trim();
      if (typeof ref === 'number' && Number.isInteger(ref) && ref >= 1 && ref <= input.batch.evidenceRefs.length) {
        return input.batch.evidenceRefs[ref - 1];
      }
      return '';
    });
    if (
      !evidenceRefs.length
      || evidenceRefs.some((ref) => !ref || !allowedEvidence.has(ref))
    ) {
      invalid(`Repair field ${path} contains unavailable evidence references.`, 'Use only the evidenceRefs listed in the allowed references; each repair requires at least one.');
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
    promptRedacted: prompt,
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
