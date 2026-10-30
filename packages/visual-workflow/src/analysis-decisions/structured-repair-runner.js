import {
  isRecord,
  isMeaningfulValue
} from "./path-utils.js";
import { buildRepairPrompt } from "./repair-prompt-builder.js";
import { normalizeRepairResponse } from "./repair-response-normalizer.js";
function parseResponse(value) {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/^```(?:json)?\s*/iu, "").replace(/\s*```$/u, "");
  try {
    return JSON.parse(normalized);
  } catch {
    throw Object.assign(new Error("Repair model returned unparseable JSON."), {
      code: "REPAIR_RESPONSE_INVALID",
      repairFeedback: "Return one complete JSON object with a repairs array; do not include prose or Markdown."
    });
  }
}
function invalid(message, repairFeedback = "Return every requested path exactly once with the value type required by its JSON Schema.") {
  throw Object.assign(new Error(message), {
    code: "REPAIR_RESPONSE_INVALID",
    repairFeedback
  });
}
const stringArraySchema = {
  type: "array",
  minItems: 1,
  items: { type: "string", minLength: 1 }
};
function objectSchema(properties, required = Object.keys(properties)) {
  return {
    type: "object",
    additionalProperties: false,
    required,
    properties
  };
}
function valueSchemaForPath(path) {
  if (path === "mediaTranslations.spatial.functionalNetwork") {
    return { ...stringArraySchema, minItems: 3 };
  }
  if ([
    "creativeDecision.brandRoleStatement",
    "creativeDecision.uniqueUpgradeThesis",
    "mediaTranslations.spatial.spatialConcept"
  ].includes(path)) {
    return { type: "string", minLength: 1 };
  }
  if (path === "creativeDecision.toneBoundaries") {
    return {
      type: "array",
      minItems: 2,
      items: objectSchema({
        target: { type: "string", minLength: 1 },
        avoid: stringArraySchema
      })
    };
  }
  if (path === "diagnosis.valuableAssets") {
    return {
      type: "array",
      minItems: 1,
      items: objectSchema({
        target: { type: "string", minLength: 1 },
        observation: { type: "string", minLength: 1 },
        whyItMatters: { type: "string", minLength: 1 },
        evidenceRefs: stringArraySchema,
        confidence: { type: "number", minimum: 0, maximum: 1 }
      })
    };
  }
  if (path === "diagnosis.brandMisreadRisks") {
    return {
      type: "array",
      minItems: 1,
      items: objectSchema({
        code: { type: "string", minLength: 1 },
        description: { type: "string", minLength: 1 },
        target: { type: "string", minLength: 1 },
        observation: { type: "string", minLength: 1 },
        whyItMatters: { type: "string", minLength: 1 },
        appliesTo: objectSchema({
          taskFamilies: stringArraySchema,
          subtypes: { type: "array", items: { type: "string" } },
          scenes: { type: "array", items: { type: "string" } }
        }),
        evidenceRefs: stringArraySchema,
        confidence: { type: "number", minimum: 0, maximum: 1 },
        status: { type: "string", enum: ["confirmed", "probable"] }
      })
    };
  }
  if (path === "abstractions") {
    return {
      type: "array",
      minItems: 1,
      items: objectSchema({
        sourceAsset: { type: "string", minLength: 1 },
        semanticMeaning: stringArraySchema,
        formalProperties: stringArraySchema,
        rhythmProperties: stringArraySchema,
        materialPotential: stringArraySchema,
        lightingPotential: stringArraySchema,
        forbiddenLiteralUse: stringArraySchema,
        evidenceRefs: stringArraySchema,
        confidence: { type: "number", minimum: 0, maximum: 1 }
      })
    };
  }
  if (path === "mediaTranslations.spatial.materialLanguage") {
    return {
      type: "array",
      minItems: 1,
      items: objectSchema({
        material: { type: "string", minLength: 1 },
        behavior: stringArraySchema,
        brandRole: { type: "string", minLength: 1 },
        forbidden: { type: "array", items: { type: "string" } }
      })
    };
  }
  if (path.startsWith("mediaTranslations.spatial.colorBehavior.")) {
    return {
      type: "array",
      minItems: 1,
      items: objectSchema({
        name: { type: "string", minLength: 1 },
        role: { type: "string", minLength: 1 }
      })
    };
  }
  return stringArraySchema;
}
function matchesValueSchema(path, value) {
  const schema = valueSchemaForPath(path);
  if (schema.type === "string") return typeof value === "string" && value.trim().length > 0;
  if (schema.type !== "array" || !Array.isArray(value) || value.length < Number(schema.minItems ?? 0)) {
    return false;
  }
  const items = schema.items;
  if (items?.type === "string") {
    return value.every((item) => typeof item === "string" && item.trim().length > 0);
  }
  if (items?.type !== "object") return true;
  const required = Array.isArray(items.required) ? items.required : [];
  return value.every((item) => isRecord(item) && required.every((key) => {
    const child = item[key];
    if (typeof child === "string") return child.trim().length > 0;
    if (Array.isArray(child)) return child.length > 0;
    return child !== void 0 && child !== null;
  }));
}
function responseSchema(targetFields, evidenceRefs) {
  return {
    type: "object",
    additionalProperties: false,
    required: ["repairs"],
    properties: {
      repairs: {
        type: "array",
        minItems: targetFields.length,
        maxItems: targetFields.length,
        items: {
          oneOf: targetFields.map((path) => objectSchema({
            path: { type: "string", enum: [path] },
            value: valueSchemaForPath(path),
            status: { type: "string", enum: ["inferred", "proposed"] },
            confidence: { type: "number", minimum: 0, maximum: 1 },
            evidenceRefs: {
              ...stringArraySchema,
              items: { anyOf: [
                { type: "string", enum: [...new Set(evidenceRefs)] },
                { type: "integer", enum: evidenceRefs.map((_, index) => index + 1) }
              ] }
            }
          }))
        }
      }
    }
  };
}
async function runStructuredRepair(input) {
  if (!input.batch.evidenceRefs.length) {
    throw Object.assign(new Error("No current-project evidence is available for AI repair."), {
      code: "REPAIR_EVIDENCE_UNAVAILABLE"
    });
  }
  const built = buildRepairPrompt({
    batch: input.batch,
    packet: input.packet,
    attempt: input.attempt
  });
  const schema = responseSchema(input.batch.fieldPaths, input.batch.evidenceRefs);
  const prompt = `${built.prompt}

JSON Schema\uFF08value \u5FC5\u987B\u7B26\u5408\u5BF9\u5E94 path \u7684\u7C7B\u578B\uFF0C\u4E0D\u80FD\u4F7F\u7528 null \u5360\u4F4D\uFF09\uFF1A
${JSON.stringify(schema)}${input.previousFailure ? `

\u4E0A\u4E00\u6B21\u6821\u9A8C\u5931\u8D25\uFF0C\u8BF7\u4FEE\u6B63\uFF1A
${input.previousFailure}` : ""}`;
  const raw = await input.model({
    prompt,
    attempt: input.attempt,
    batchId: input.batch.id,
    targetFields: [...input.batch.fieldPaths],
    responseSchema: schema
  });
  const parsed = normalizeRepairResponse(parseResponse(raw), {
    fieldPaths: input.batch.fieldPaths,
    evidenceRefs: input.batch.evidenceRefs
  });
  if (!isRecord(parsed) || !Array.isArray(parsed.repairs)) {
    invalid("Repair response must contain a repairs array.");
  }
  if (parsed.repairs.length !== input.batch.fieldPaths.length) {
    invalid("Repair response must contain every requested field exactly once.");
  }
  const requested = new Set(input.batch.fieldPaths);
  const allowedEvidence = new Set(input.batch.evidenceRefs);
  const seen = /* @__PURE__ */ new Set();
  const patches = parsed.repairs.map((candidate) => {
    if (!isRecord(candidate)) invalid("Repair entry must be an object.");
    const path = typeof candidate.path === "string" ? candidate.path.trim() : "";
    if (!requested.has(path) || seen.has(path)) {
      invalid(`Repair response contains an unrequested or duplicate field: ${path || "missing"}.`);
    }
    seen.add(path);
    const status = candidate.status;
    if (status !== "inferred" && status !== "proposed") {
      invalid(`Repair field ${path} has an invalid status.`);
    }
    const confidence = Number(candidate.confidence);
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      invalid(`Repair field ${path} has an invalid confidence.`);
    }
    const suppliedRefs = Array.isArray(candidate.evidenceRefs) ? candidate.evidenceRefs : [];
    const evidenceRefs = suppliedRefs.map((ref) => {
      if (typeof ref === "string") return ref.trim();
      if (typeof ref === "number" && Number.isInteger(ref) && ref >= 1 && ref <= input.batch.evidenceRefs.length) {
        return input.batch.evidenceRefs[ref - 1];
      }
      return "";
    });
    if (!evidenceRefs.length || evidenceRefs.some((ref) => !ref || !allowedEvidence.has(ref))) {
      invalid(`Repair field ${path} contains unavailable evidence references.`, "Use only the evidenceRefs listed in the allowed references; each repair requires at least one.");
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
        generatedBy: "repair_model",
        sourceFingerprint: input.sourceFingerprint,
        schemaVersion: "1.0",
        repairVersion: "1.0"
      }
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
        status: patch.value.status,
        confidence: patch.value.confidence,
        evidenceRefs: [...patch.value.evidenceRefs]
      }))
    }
  };
}
export {
  runStructuredRepair
};
