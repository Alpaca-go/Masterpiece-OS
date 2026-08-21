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
  buildRepairMessages,
  parseModelJson,
  validateDocumentVisualContext,
  normalizeExtractedContext,
  type DocumentVisualContext,
  type DocumentRole,
  type NormalizedDocument
} from '@masterpiece/creative-intelligence/document-intelligence/index.ts';

// CI-W1C.7.5-R1 PART C / PART D — planning-specific extraction
// prompt. The CI-3 default `EXTRACTION_SYSTEM_PROMPT` is tuned
// for visual context (brandName / products / brandPersonality
// etc.) and explicitly excludes "non-visual content" like
// market sizing / industry analysis / org structure. For
// PLANNING extraction we want the opposite: the model SHOULD
// surface industry, business model, brand role, competitive
// context, strategic objective, etc. — even when these are
// expressed as narrative prose rather than as `key: value`
// bullets.
//
// This prompt is project-agnostic. It is composed here (in
// runtime-core) and passed to `buildExtractionMessages` indirectly
// by constructing a fresh `NormalisedDocument` whose `sections`
// includes the planning prompt as the document body. The
// validator + normalizer are the same CI-3 primitives, so the
// shape stays `DocumentVisualContext`. The project-agnostic
// guarantee is preserved: no project names, no industry terms,
// no competitor names appear in the prompt.
const PLANNING_EXTRACTION_PROMPT = `You are a PLANNING-DOCUMENT semantic extractor for a brand strategy / business strategy / market research document.

Goal: emit a single JSON object that captures the document's PROJECT-SPECIFIC PLANNING CONTENT. Do NOT extract generic visuals or design tokens — focus on what the document says about the BRAND / BUSINESS / AUDIENCE / STRATEGY.

DO:
- Read the full document carefully.
- Surface the document's stated industry, business model, brand role, target audience, audience problem, brand promise, competitive context, differentiation, strategic / brand / experience / transformation objectives, brand personality / positioning, etc.
- Use the document's own wording where faithful; paraphrase is allowed but must be project-specific.
- For each non-empty field, attach an evidence entry: { "field", "documentId", "filename", "section", "summary" }.
- Mark "unknown" only when the document genuinely has no relevant content. Most planning documents have at least 4-6 fillable fields.

DO NOT:
- Invent facts the document does not state.
- Fill fields with marketing clichés ("trusted partner", "innovative solutions") that do not appear in the document.
- Promote USER_REQUIREMENT / MODEL_INFERENCE / UNKNOWN statements to FACT.

Output JSON shape (use [] for empty arrays, null for empty strings):

{
  "brandName": string,
  "industry": string,
  "products": string[],
  "services": string[],
  "targetAudience": string[],
  "pricePositioning": string | null,
  "businessModel": string | null,
  "brandPersonality": string[],
  "visualPreferences": string[],
  "requiredTouchpoints": string[],
  "lockedFacts": string[],
  "prohibitedDirections": string[],
  "unknownFields": string[],
  "evidence": [{ "field": string, "documentId": string, "filename": string, "section": string, "summary": string }],
  "conflicts": string[]
}

Output only the JSON object. No prose, no markdown, no code fences.`;

// Build a `NormalizedDocument` whose first section is the
// planning-specific prompt (so the model sees the planning
// instructions in the system / user message split) and the
// remaining sections are the source document's chunks. The
// existing CI-3 `buildExtractionMessages` uses `document.rawText`
// directly (not the sections), so this is a thin wrap.
function buildPlanningCorpusWithPrompt(args: {
  sourceId: string;
  filename: string;
  rawText: string;
  documentRole: DocumentRole;
  planningPrompt: string;
}): NormalizedDocument {
  // The model sees only the document's rawText (per
  // buildExtractionMessages). We prepend the planning prompt
  // to the rawText so the model gets the planning instructions
  // as part of the same message body. The `evidence.documentId`
  // the model emits must still equal the planning brief's
  // `sourceId`; we use that as the documentId.
  const body = `${args.planningPrompt}\n\n---\n\n# DOCUMENT\n\n${args.rawText}`;
  return {
    id: args.sourceId,
    filename: args.filename,
    sourceType: 'docx',
    title: args.filename,
    rawText: body,
    characterCount: body.length,
    documentRole: args.documentRole,
    tables: []
  };
}

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
    validationErrors?: string[];
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
  // CI-W1C.7.5-R1 PART C / PART D — the model gets the
  // planning-specific prompt + the source document in one
  // message body. The downstream projection strips the prompt
  // wrapper and only uses the source's `evidence.documentId`
  // to claim the source.
  const planningDoc = buildPlanningCorpusWithPrompt({
    sourceId: sourceDocumentId,
    filename,
    rawText,
    documentRole,
    planningPrompt: PLANNING_EXTRACTION_PROMPT
  });
  const corpus = { documents: [planningDoc] };
  const messages = buildExtractionMessages(corpus as unknown as Parameters<typeof buildExtractionMessages>[0]);
  const inputChars = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);

  // 2. Model call (base attempt).
  const attempts: NarrativePlanningExtractionOutput['attempts'] = [];
  const callModel = async (
    msgs: typeof messages
  ): Promise<{ text: string; latencyMs: number }> => {
    const t0 = Date.now();
    const result = await reasoner({
      prompt: { messages: msgs },
      maximumDurationMs
    });
    return { text: result.reportMarkdown, latencyMs: Date.now() - t0 };
  };

  const validateAndProject = (text: string): Omit<NarrativePlanningExtractionOutput, 'attempts'> => {
    const parsed = parseModelJson(text) as Record<string, unknown>;
    const validation = validateDocumentVisualContext(parsed);
    if (!validation.valid) {
      throw new Error(`NARRATIVE_EXTRACTION_SCHEMA_INVALID: ${validation.errors.join('; ')}`);
    }
    const norm = normalizeExtractedContext(
      parsed,
      corpus as unknown as Parameters<typeof normalizeExtractedContext>[1],
      projectId
    );
    const dvc = norm.context;
    const claims = projectDvcToPlanningClaimsLocal(dvc, sourceDocumentId, documentRole);
    return { claims, dvc };
  };
  const errorMessages = (error: unknown): string[] => {
    const message = error instanceof Error ? error.message : String(error);
    const prefix = 'NARRATIVE_EXTRACTION_SCHEMA_INVALID: ';
    return message.startsWith(prefix)
      ? message.slice(prefix.length).split('; ').filter(Boolean)
      : [message || 'unknown validation error'];
  };

  // Base attempt.
  let previousText = '';
  let validationErrors: string[] = [];
  let baseLatencyMs = 0;
  try {
    const { text, latencyMs } = await callModel(messages);
    baseLatencyMs = latencyMs;
    previousText = text;
    const result = validateAndProject(text);
    attempts.push({
      attempt: 1,
      finishStatus: 'ok',
      outputCharacters: text.length,
      inputCharacters: inputChars,
      latencyMs
    });
    return { ...result, attempts };
  } catch (err) {
    validationErrors = errorMessages(err);
    attempts.push({
      attempt: 1,
      finishStatus: 'repair',
      outputCharacters: previousText.length,
      inputCharacters: inputChars,
      latencyMs: baseLatencyMs,
      validationErrors
    });
  }

  // Repair uses the canonical CI-3 primitive and therefore sees
  // both the previous output and the collected validation errors.
  const repairMessages = buildRepairMessages(previousText, validationErrors) as typeof messages;
  const repairInputCharacters = repairMessages.reduce(
    (sum, message) => sum + (message.content?.length || 0),
    0
  );
  let repairedText = '';
  let repairLatencyMs = 0;
  try {
    const { text, latencyMs } = await callModel(repairMessages);
    repairLatencyMs = latencyMs;
    repairedText = text;
    const result = validateAndProject(text);
    attempts.push({
      attempt: 2,
      repairReason: validationErrors.join('; '),
      finishStatus: 'repair',
      outputCharacters: text.length,
      inputCharacters: repairInputCharacters,
      latencyMs
    });
    return { ...result, attempts };
  } catch (err) {
    const repairErrors = errorMessages(err);
    attempts.push({
      attempt: 2,
      repairReason: validationErrors.join('; '),
      finishStatus: 'failed',
      outputCharacters: repairedText.length,
      inputCharacters: repairInputCharacters,
      latencyMs: repairLatencyMs,
      validationErrors: repairErrors
    });
    throw Object.assign(
      new Error(`NARRATIVE_EXTRACTION_FAILED: ${repairErrors.join('; ')}`),
      { code: 'NARRATIVE_EXTRACTION_FAILED', attempts }
    );
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
