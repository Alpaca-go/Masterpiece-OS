/**
 * Narrative Planning Extraction Runner.
 *
 * Runtime Core owns model invocation, one repair attempt, timing,
 * and fail-closed orchestration. Creative Intelligence owns the
 * Planning raw contract, prompt, validation, normalization, and
 * deterministic PlanningStrategicClaim projection.
 */

import {
  DEFAULT_CREATIVE_REASONING_TIMEOUTS,
  type ModelAttemptKind,
  type ModelReasoner
} from './creative-reasoning-service.ts';
import { classifyProviderFailure, semanticFailure } from '@masterpiece/model-runtime/provider-failure-taxonomy.js';
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
  requestTimeoutMs?: number;
}

export interface NarrativePlanningExtractionAttempt {
  attempt: 1 | 2 | 3;
  attemptKind: ModelAttemptKind;
  repairReason?: string;
  finishStatus: 'ok' | 'transport_retry' | 'repair' | 'failed';
  outputCharacters: number;
  inputCharacters: number;
  latencyMs: number;
  validationErrors?: string[];
  failureClass?: string;
}

export interface NarrativePlanningExtractionOutput {
  claims: PlanningStrategicClaim[];
  /** Validated and deterministically normalized semantic audit copy. */
  extraction: PlanningSemanticExtractionResult;
  attempts: NarrativePlanningExtractionAttempt[];
  providerAttempts: number;
  transportRetries: number;
  semanticRepairAttempts: number;
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
  const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_CREATIVE_REASONING_TIMEOUTS.planningNarrativeMs;
  const sourceDocument: PlanningExtractionSourceDocument = {
    documentId: input.sourceDocumentId,
    filename: input.filename,
    documentRole: input.documentRole,
    rawText: input.rawText
  };
  const baseMessages = buildPlanningExtractionMessages(sourceDocument);
  const attempts: NarrativePlanningExtractionAttempt[] = [];

  const callModel = async (
    messages: PlanningExtractionMessage[],
    attemptKind: ModelAttemptKind
  ): Promise<{ text: string; latencyMs: number }> => {
    const startedAt = Date.now();
    const result = await input.reasoner({
      prompt: { messages },
      requestTimeoutMs,
      attemptKind
    });
    return { text: result.reportMarkdown, latencyMs: Date.now() - startedAt };
  };

  const validateNormalizeProject = (
    text: string
  ): Omit<NarrativePlanningExtractionOutput, 'attempts'> => {
    let parsed: unknown;
    try {
      parsed = parseModelJson(text);
    } catch (error) {
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { code: 'SEMANTIC_PARSE_FAILURE' });
    }
    const validation = validatePlanningSemanticExtractionResult(parsed);
    if (!validation.valid) {
      throw Object.assign(
        new Error(`NARRATIVE_EXTRACTION_SCHEMA_INVALID: ${validation.errors.join('; ')}`),
        { code: 'SEMANTIC_GATE_FAILURE' }
      );
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
  let previousErrors: string[] = [];
  let providerAttempts = 0;
  let transportRetries = 0;
  let semanticRepairAttempts = 0;
  let attemptKind: ModelAttemptKind = 'BASE';
  let terminalErrors: string[] = [];

  while (providerAttempts < 3) {
    providerAttempts += 1;
    const attempt = providerAttempts as 1 | 2 | 3;
    if (attemptKind === 'SEMANTIC_REPAIR' && previousText === '') {
      terminalErrors = ['semantic repair requires a previous raw response'];
      break;
    }
    const messages = attemptKind === 'SEMANTIC_REPAIR'
      ? buildPlanningRepairMessages({ sourceDocument, previousText, errors: previousErrors })
      : baseMessages;
    let text = '';
    let latencyMs = 0;
    try {
      const response = await callModel(messages, attemptKind);
      text = response.text;
      latencyMs = response.latencyMs;
    } catch (error) {
      const failure = classifyProviderFailure(error);
      terminalErrors = errorMessages(error);
      const willRetryTransport = attemptKind === 'BASE' && failure.retryable && transportRetries === 0;
      attempts.push({
        attempt,
        attemptKind,
        finishStatus: willRetryTransport ? 'transport_retry' : 'failed',
        outputCharacters: 0,
        inputCharacters: messageCharacters(messages),
        latencyMs,
        validationErrors: terminalErrors,
        failureClass: failure.failureClass
      });
      if (willRetryTransport) {
        transportRetries = 1;
        attemptKind = 'TRANSPORT_RETRY';
        continue;
      }
      break;
    }

    try {
      const result = validateNormalizeProject(text);
      attempts.push({
        attempt,
        attemptKind,
        finishStatus: attemptKind === 'SEMANTIC_REPAIR' ? 'repair' : 'ok',
        outputCharacters: text.length,
        inputCharacters: messageCharacters(messages),
        latencyMs
      });
      return { ...result, attempts, providerAttempts, transportRetries, semanticRepairAttempts };
    } catch (error) {
      const failure = error && typeof error === 'object' && (error as { code?: string }).code === 'SEMANTIC_PARSE_FAILURE'
        ? semanticFailure('parse')
        : semanticFailure('gate');
      previousText = text;
      previousErrors = errorMessages(error);
      terminalErrors = previousErrors;
      const canRepair = semanticRepairAttempts === 0 && previousText !== '';
      attempts.push({
        attempt,
        attemptKind,
        finishStatus: canRepair ? 'repair' : 'failed',
        outputCharacters: text.length,
        inputCharacters: messageCharacters(messages),
        latencyMs,
        validationErrors: previousErrors,
        failureClass: failure.failureClass
      });
      if (canRepair) {
        semanticRepairAttempts = 1;
        attemptKind = 'SEMANTIC_REPAIR';
        continue;
      }
      break;
    }
  }

  throw Object.assign(
    new Error(`NARRATIVE_EXTRACTION_FAILED: ${terminalErrors.join('; ') || 'unknown failure'}`),
    {
      code: 'NARRATIVE_EXTRACTION_FAILED',
      attempts,
      providerAttempts,
      transportRetries,
      semanticRepairAttempts
    }
  );
}
