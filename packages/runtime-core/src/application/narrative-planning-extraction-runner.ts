/**
 * CI-W1C.7.5-R1 — Narrative Planning Extraction Runner.
 *
 * Orchestrates the model-assisted narrative extraction path
 * (per spec PART C + PART D + PART E). Reuses the existing CI
 * Document Intelligence extraction primitive
 * (`buildExtractionMessages`, `parseModelJson`,
 * `validateDocumentVisualContext`, `normalizeExtractedContext`)
 * — does NOT introduce a parallel extraction service.
 *
 * Per spec PART C §3 boundary:
 *   - The prompt / parse / validate / normalize all live in
 *     CI-3 (`document-intelligence`).
 *   - The model call lives in runtime-core (orchestrator seam).
 *   - The projection to `PlanningStrategicClaim[]` lives in
 *     strategic-synthesis (deterministic, project-agnostic).
 *
 * Flow:
 *   planning brief rawText
 *     → VisualStrategyCorpus (single-doc)
 *     → buildExtractionMessages (CI-3)
 *     → modelReasoner(input)  (orchestrator seam)
 *     → parseModelJson (CI-3)
 *     → validateDocumentVisualContext (CI-3)
 *     → normalizeExtractedContext (CI-3)
 *     → projectDocumentContextToPlanningClaims (R1 adapter)
 *     → PlanningStrategicClaim[] (plus the raw DVC for audit)
 *
 * Repair policy (spec PART E §20):
 *   - max 1 repair attempt
 *   - repair triggers: invalid JSON, schema failure, missing
 *     required fields, illegal epistemic class, missing
 *     source trace
 *   - on repair success: use the repaired output
 *   - on repair failure: throw `NARRATIVE_EXTRACTION_FAILED`
 *     (the caller is the planning intake gate; Strategic
 *     must NOT run after this)
 */

import type { ModelReasoner } from './creative-reasoning-service.ts';
import type { PlanningStrategicClaim } from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
import {
  buildExtractionMessages,
  parseModelJson,
  validateDocumentVisualContext,
  normalizeExtractedContext,
  type DocumentVisualContext,
  type DocumentRole,
  type NormalizedDocument
} from '@masterpiece/creative-intelligence/document-intelligence/index.ts';

export interface NarrativePlanningExtractionInput {
  projectId: string;
  sourceDocumentId: string;
  /** The full raw text of the planning brief. */
  rawText: string;
  /** Document role classifier output (e.g. `brand-strategy`). */
  documentRole: DocumentRole;
  /** Brief filename (used for the DVC's evidence.filename field). */
  filename: string;
  /** The reasoner factory output (or a direct reasoner). */
  reasoner: ModelReasoner;
  /** Maximum time per model call. Defaults to 180s. */
  maximumDurationMs?: number;
}

export interface NarrativePlanningExtractionOutput {
  /** The projected planning claims (deduped within the projection). */
  claims: PlanningStrategicClaim[];
  /** The validated, normalized DVC (audit copy). */
  dvc: DocumentVisualContext;
  /** Per-attempt metadata for spec PART E. */
  attempts: Array<{
    attempt: 1 | 2;
    repairReason?: string;
    finishStatus: 'ok' | 'repair' | 'failed';
    outputCharacters: number;
    inputCharacters: number;
    latencyMs: number;
  }>;
}

/**
 * Build a single-doc `NormalizedDocument` for the planning brief
 * (used as the corpus input for `buildExtractionMessages`).
 *
 * The `id` is the planning brief's `sourceId` (preserves
 * downstream identity). The `rawText` is passed as-is.
 */
function buildSingleDocCorpus(args: {
  projectId: string;
  sourceId: string;
  rawText: string;
  filename: string;
  documentRole: DocumentRole;
}): { documents: NormalizedDocument[] } {
  const doc: NormalizedDocument = {
    id: args.sourceId,
    filename: args.filename,
    sourceType: 'docx',  // planning briefs are uploaded as .md/.docx/.pdf/.txt; docx is the most common
    title: args.filename,
    rawText: args.rawText,
    characterCount: args.rawText.length,
    documentRole: args.documentRole,
    tables: []
  };
  // The CI-3 VisualStrategyCorpus type uses `documents` and
  // `sourceIndex`; for a single-doc corpus we omit sourceIndex
  // (CI-3 fills it).
  return { documents: [doc] };
}

export async function runNarrativePlanningExtraction(
  input: NarrativePlanningExtractionInput
): Promise<NarrativePlanningExtractionOutput> {
  const { reasoner, rawText, documentRole, filename, sourceDocumentId, projectId } = input;
  const maximumDurationMs = input.maximumDurationMs ?? 180_000;

  // 1. Build the corpus + extraction prompt.
  const corpus = buildSingleDocCorpus({
    projectId,
    sourceId: sourceDocumentId,
    rawText,
    filename,
    documentRole
  });
  const messages = buildExtractionMessages(corpus as unknown as Parameters<typeof buildExtractionMessages>[0]);
  const inputChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

  // 2. Model call (base attempt).
  const attempts: NarrativePlanningExtractionOutput['attempts'] = [];
  const callModel = async (
    msgs: typeof messages,
    repairReason?: string
  ): Promise<{ text: string; latencyMs: number }> => {
    const t0 = Date.now();
    const result = await reasoner({
      prompt: { messages: msgs },
      maximumDurationMs
    });
    return { text: result.reportMarkdown, latencyMs: Date.now() - t0 };
  };

  // Base attempt.
  let lastError: string | undefined;
  try {
    const { text, latencyMs } = await callModel(messages);
    attempts.push({
      attempt: 1,
      finishStatus: 'ok',
      outputCharacters: text.length,
      inputCharacters: inputChars,
      latencyMs
    });
    return finalize(text, attempts);
  } catch (err) {
    lastError = (err as Error).message;
  }

  // Repair attempt.
  const repairMessages = [
    messages[0],
    {
      role: 'user' as const,
      content: `你上一次的输出无法通过校验。请只输出修复后的完整 JSON 对象，不要输出其它内容。\n\n错误：${lastError}\n\n上一次输出已省略。`
    }
  ];
  try {
    const { text, latencyMs } = await callModel(repairMessages, lastError);
    attempts.push({
      attempt: 2,
      repairReason: lastError,
      finishStatus: 'repair',
      outputCharacters: text.length,
      inputCharacters: repairMessages.reduce((sum, m) => sum + (m.content?.length || 0), 0),
      latencyMs
    });
    return finalize(text, attempts);
  } catch (err) {
    attempts.push({
      attempt: 2,
      repairReason: lastError,
      finishStatus: 'failed',
      outputCharacters: 0,
      inputCharacters: 0,
      latencyMs: 0
    });
    throw new Error(
      `NARRATIVE_EXTRACTION_FAILED: ${(err as Error).message ?? lastError ?? 'unknown'}`
    );
  }

  function finalize(
    text: string,
    attemptRecords: NarrativePlanningExtractionOutput['attempts']
  ): NarrativePlanningExtractionOutput {
    // Parse → validate → normalize.
    const parsed = parseModelJson(text) as Record<string, unknown>;
    const validation = validateDocumentVisualContext(parsed);
    if (!validation.valid) {
      const err = new Error(
        `NARRATIVE_EXTRACTION_SCHEMA_INVALID: ${validation.errors.join('; ')}`
      );
      attemptRecords[attemptRecords.length - 1].finishStatus = 'failed';
      throw err;
    }
    const norm = normalizeExtractedContext(
      parsed,
      corpus as unknown as Parameters<typeof normalizeExtractedContext>[1],
      projectId
    );
    const dvc = norm.context;
    // Project to planning claims.
    const claims = projectDvcToPlanningClaimsLocal(dvc, sourceDocumentId, documentRole);
    return { claims, dvc, attempts: attemptRecords };
  }
}

// Local import of the projection to avoid a top-level cycle
// (this file is in runtime-core; the projection is in CI-3
// /strategic-synthesis). We use the runtime import path that
// the orchestrator already uses.
import { projectDocumentContextToPlanningClaims } from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
function projectDvcToPlanningClaimsLocal(
  dvc: DocumentVisualContext,
  sourceDocumentId: string,
  documentRole: DocumentRole
): PlanningStrategicClaim[] {
  return projectDocumentContextToPlanningClaims({
    dvc: dvc as unknown as Parameters<typeof projectDocumentContextToPlanningClaims>[0]['dvc'],
    sourceDocumentId,
    documentRole
  });
}
