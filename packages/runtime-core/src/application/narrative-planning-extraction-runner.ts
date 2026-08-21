/**
 * Narrative Planning Extraction Runner.
 *
 * Runtime Core owns model invocation, one repair attempt, timing,
 * and fail-closed orchestration. Creative Intelligence owns the
 * Planning raw contract, prompt, validation, normalization, and
 * deterministic PlanningStrategicClaim projection.
 */

import type { ModelReasoner } from './creative-reasoning-service.ts';
import { parseModelJson } from '@masterpiece/creative-intelligence/document-intelligence/index.ts';
import type { DocumentRole } from '@masterpiece/creative-intelligence/document-intelligence/index.ts';
import {
  buildPlanningExtractionMessages,
  buildPlanningRepairMessages,
  normalizePlanningSemanticExtractionResult,
  projectPlanningExtractionToClaims,
  validatePlanningSemanticExtractionResult,
  type PlanningExtractionMessage,
  type PlanningExtractionSourceDocument,
  type PlanningSemanticExtractionResult,
  type PlanningStrategicClaim
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';

export interface NarrativePlanningExtractionInput {
  projectId: string;
  sourceDocumentId: string;
  /** The full raw text of the explicitly registered planning brief. */
  rawText: string;
  documentRole: DocumentRole;
  filename: string;
  reasoner: ModelReasoner;
  maximumDurationMs?: number;
}

export interface NarrativePlanningExtractionAttempt {
  attempt: 1 | 2;
  repairReason?: string;
  finishStatus: 'ok' | 'repair' | 'failed';
  outputCharacters: number;
  inputCharacters: number;
  latencyMs: number;
  validationErrors?: string[];
}

export interface NarrativePlanningExtractionOutput {
  claims: PlanningStrategicClaim[];
  /** Validated and deterministically normalized semantic audit copy. */
  extraction: PlanningSemanticExtractionResult;
  attempts: NarrativePlanningExtractionAttempt[];
}

function messageCharacters(messages: readonly PlanningExtractionMessage[]): number {
  return messages.reduce((sum, message) => sum + message.content.length, 0);
}

function errorMessages(error: unknown): string[] {
  const message = error instanceof Error ? error.message : String(error);
  const prefix = 'NARRATIVE_EXTRACTION_SCHEMA_INVALID: ';
  return message.startsWith(prefix)
    ? message.slice(prefix.length).split('; ').filter(Boolean)
    : [message || 'unknown validation error'];
}

export async function runNarrativePlanningExtraction(
  input: NarrativePlanningExtractionInput
): Promise<NarrativePlanningExtractionOutput> {
  const maximumDurationMs = input.maximumDurationMs ?? 180_000;
  const sourceDocument: PlanningExtractionSourceDocument = {
    documentId: input.sourceDocumentId,
    filename: input.filename,
    documentRole: input.documentRole,
    rawText: input.rawText
  };
  const baseMessages = buildPlanningExtractionMessages(sourceDocument);
  const attempts: NarrativePlanningExtractionAttempt[] = [];

  const callModel = async (
    messages: PlanningExtractionMessage[]
  ): Promise<{ text: string; latencyMs: number }> => {
    const startedAt = Date.now();
    const result = await input.reasoner({
      prompt: { messages },
      maximumDurationMs
    });
    return { text: result.reportMarkdown, latencyMs: Date.now() - startedAt };
  };

  const validateNormalizeProject = (
    text: string
  ): Omit<NarrativePlanningExtractionOutput, 'attempts'> => {
    const parsed = parseModelJson(text);
    const validation = validatePlanningSemanticExtractionResult(parsed);
    if (!validation.valid) {
      throw new Error(`NARRATIVE_EXTRACTION_SCHEMA_INVALID: ${validation.errors.join('; ')}`);
    }
    const extraction = normalizePlanningSemanticExtractionResult(
      parsed as unknown as PlanningSemanticExtractionResult
    );
    const claims = projectPlanningExtractionToClaims({
      extraction,
      sourceDocumentId: input.sourceDocumentId,
      documentRole: input.documentRole
    });
    return { claims, extraction };
  };

  let previousText = '';
  let baseErrors: string[] = [];
  let baseLatencyMs = 0;
  try {
    const { text, latencyMs } = await callModel(baseMessages);
    previousText = text;
    baseLatencyMs = latencyMs;
    const result = validateNormalizeProject(text);
    attempts.push({
      attempt: 1,
      finishStatus: 'ok',
      outputCharacters: text.length,
      inputCharacters: messageCharacters(baseMessages),
      latencyMs
    });
    return { ...result, attempts };
  } catch (error) {
    baseErrors = errorMessages(error);
    attempts.push({
      attempt: 1,
      finishStatus: 'repair',
      outputCharacters: previousText.length,
      inputCharacters: messageCharacters(baseMessages),
      latencyMs: baseLatencyMs,
      validationErrors: baseErrors
    });
  }

  const repairMessages = buildPlanningRepairMessages({
    sourceDocument,
    previousText,
    errors: baseErrors
  });
  let repairedText = '';
  let repairLatencyMs = 0;
  try {
    const { text, latencyMs } = await callModel(repairMessages);
    repairedText = text;
    repairLatencyMs = latencyMs;
    const result = validateNormalizeProject(text);
    attempts.push({
      attempt: 2,
      repairReason: baseErrors.join('; '),
      finishStatus: 'repair',
      outputCharacters: text.length,
      inputCharacters: messageCharacters(repairMessages),
      latencyMs
    });
    return { ...result, attempts };
  } catch (error) {
    const repairErrors = errorMessages(error);
    attempts.push({
      attempt: 2,
      repairReason: baseErrors.join('; '),
      finishStatus: 'failed',
      outputCharacters: repairedText.length,
      inputCharacters: messageCharacters(repairMessages),
      latencyMs: repairLatencyMs,
      validationErrors: repairErrors
    });
    throw Object.assign(
      new Error(`NARRATIVE_EXTRACTION_FAILED: ${repairErrors.join('; ')}`),
      { code: 'NARRATIVE_EXTRACTION_FAILED', attempts }
    );
  }
}
