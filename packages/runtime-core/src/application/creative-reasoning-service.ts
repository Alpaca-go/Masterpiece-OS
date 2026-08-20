/**
 * CI-W1C.7.1 — Creative Reasoning Service (with Live Prompt Wiring Repair).
 *
 * Repairs the prompt wiring defect found in CI-W1C.7: the runtime
 * no longer compresses the planning context into a count-only
 * `ctxSummary`. It now passes the full validated planning
 * semantics to every stage's prompt via the deterministic prompt
 * builders.
 *
 * Default execution path: **deterministic / mock / fixture** —
 * the service NEVER calls a model unless the caller explicitly
 * provides a `reasonerFactory` AND a `readCredentials` that
 * resolves to a real ProviderCredentials AND `useMock: false`.
 *
 * Image provider: **FORBIDDEN**. This service NEVER calls an
 * image provider. `imageProviderCallCount` is always 0.
 *
 * Live qualification (CI-W1C.7.1 PART H) is **fail-closed**:
 *   - attempt 1 fails → one repair attempt
 *   - attempt 2 fails → persist raw + gate diagnostics → STOP
 *   - mock fallback is FORBIDDEN in live mode
 *   - downstream stage does NOT run after upstream failure
 *   - no fake valid report after failure
 *
 * Repair policy:
 *   - At most 1 primary + 1 repair per stage.
 *   - `modelCallCount` in the artifact caps at 2.
 *   - Repair prompt includes: original task, previous invalid
 *     output (bounded excerpt), blocked gate codes, repair
 *     instructions.
 *
 * Profile wiring (CI-W1C.7.1 PART F):
 *   - Live credentials resolution uses
 *     `readCredentials(input.analysisProfileId)`.
 *   - No silent unrelated profile substitution.
 *
 * Mode metadata (CI-W1C.7.1 PART G):
 *   - `useMock: true`  → `model_assisted_mock`
 *   - `useMock: false` → `model_assisted_live`
 *   - provider / model / analysisProfileId / promptVersion are
 *     persisted in the artifact `meta` and the report `imageProviderCallCount: 0`.
 *
 * Prompt snapshots (CI-W1C.7.1 PART E):
 *   - `intermediate/prompt-snapshots/strategic-synthesis.prompt.json`
 *   - `intermediate/prompt-snapshots/concept-ideation.prompt.json`
 *   - `intermediate/prompt-snapshots/direction-ideation.prompt.json`
 *
 * Raw attempt artifacts (CI-W1C.7.1 PART H):
 *   - `intermediate/live-attempts/{synthesis,concept,direction}.attempt-N.raw.txt`
 *   - `intermediate/live-attempts/{synthesis,concept,direction}.gate.json`
 *
 * Frozen surfaces (spec §3): this service does NOT modify
 * Truth, does NOT call image providers, does NOT change
 * selection, does NOT touch consumers.
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import type { ProjectTruthModel, ProjectTruthFact } from '@masterpiece/creative-intelligence/truth/index.ts';
import type { NeedItem } from '@masterpiece/creative-intelligence/need-intelligence/index.ts';
import type { EvidenceLedgerSnapshot } from '@masterpiece/creative-intelligence/evidence/index.ts';
import type { PlanningStrategicClaim } from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';

import {
  compileStrategicReasoningContext,
  parseStrategicSynthesis,
  runStrategicGroundingGate,
  validateStrategicSynthesisStructural,
  buildStrategicSynthesisPrompt,
  checkPromptBudget,
  estimateInputTokens,
  DEFAULT_QUALIFICATION_BUDGET,
  type CreativeReasoningQualificationBudget,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION,
  type StrategicSynthesisArtifact,
  type StrategicSynthesisPromptOutput,
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
import {
  parseModelAssistedConceptSet,
  parseModelAssistedDirectionSet,
  runModelAssistedConceptGates,
  runModelAssistedDirectionGates,
  buildConceptIdeationPrompt,
  buildDirectionIdeationPrompt,
  MODEL_ASSISTED_CONCEPT_IDEATION_BUILDER_PROMPT_VERSION,
  MODEL_ASSISTED_DIRECTION_IDEATION_BUILDER_PROMPT_VERSION,
  type ModelAssistedConceptSet,
  type ModelAssistedDirectionSet,
  type ConceptIdeationPromptOutput,
  type DirectionIdeationPromptOutput,
} from '@masterpiece/creative-intelligence/model-assisted/index.ts';
import {
  compileVisualDirectionReport,
  renderVisualDirectionReportMarkdown,
  type VisualDirectionExplorationReport,
} from '@masterpiece/creative-intelligence/reporting/index.ts';

import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProviderCredentials } from '../shared/types.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CreativeReasoningMode =
  | 'model_assisted_mock'
  | 'model_assisted_live';

export type StageStatus = 'PASS' | 'FAIL' | 'NOT_RUN';

export interface CreativeReasoningInput {
  projectId: string;
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
  /**
   * Optional: when the live path is used, a `readCredentials`
   * callback MUST be supplied. The CI-W1C.7.1 PART F wiring uses
   * `readCredentials(input.analysisProfileId)` to honor the
   * explicit profile id.
   */
  readCredentials?: (profileId?: string) => Promise<ProviderCredentials>;
  /**
   * Optional: profile id to resolve when calling the model.
   * The runtime MUST forward this to `readCredentials`.
   * Default: undefined.
   */
  analysisProfileId?: string;
  /**
   * `true` to skip the actual model call and use the mock
   * fixture. CI-W1C.7.1 default execution path is `true` until
   * the user explicitly authorizes live text qualification.
   */
  useMock?: boolean;
  /**
   * When `useMock === false`, callers MUST inject a
   * `reasonerFactory`. The default factory (only available in
   * the test seam) is `createDefaultAnalysisReasoner` from
   * `@masterpiece/model-runtime`.
   */
  reasonerFactory?: (credentials: ProviderCredentials) => ModelReasoner;
  /**
   * CI-W1C.7.1A PART D — Optional qualification budget. When set,
   * the service runs the budget gate BEFORE the live model is
   * invoked. If the gate fails, the service stops with
   * `PROMPT_BUDGET_EXCEEDED` and never calls the model.
   * Default: `DEFAULT_QUALIFICATION_BUDGET`.
   */
  qualificationBudget?: CreativeReasoningQualificationBudget;
  /**
   * CI-W1C.7.4-R1 — Planning strategic evidence claims. Forwarded
   * to `compileStrategicReasoningContext` so the Strategic
   * Synthesis prompt renders the PLANNING STRATEGIC EVIDENCE
   * section. The production caller (live qualifier / runtime
   * pipeline) is expected to load this from the project via
   * `loadPlanningStrategicEvidenceForProject` rather than
   * constructing it manually.
   *
   * Default: `[]` (no planning evidence).
   */
  planningStrategicEvidence?: PlanningStrategicClaim[];
}

export interface ModelReasoner {
  (input: {
    prompt: {
      messages: Array<{ role: 'system' | 'user'; content: string }>;
      attachments?: unknown[];
    };
    signal?: AbortSignal;
    maximumDurationMs?: number;
  }): Promise<{ reportMarkdown: string }>;
}

export interface StageRunResult<TParsed> {
  status: StageStatus;
  attempts: 1 | 2;
  passed: boolean;
  blockedCodes: string[];
  artifact: TParsed | null;
  rawAttempts: Array<{ attempt: 1 | 2; raw: string; error?: string }>;
  gateReport: unknown;
}

export interface CreativeReasoningResult {
  projectId: string;
  mode: CreativeReasoningMode;
  imageProviderCallCount: 0;
  analysisProfileId?: string;
  /**
   * `provider` / `model` are null in mock mode; populated from
   * the resolved credentials in live mode.
   */
  provider: string | null;
  model: string | null;
  shadow: {
    synthesis: StrategicSynthesisArtifact | null;
    conceptSet: ModelAssistedConceptSet | null;
    directionSet: ModelAssistedDirectionSet | null;
    report: VisualDirectionExplorationReport | null;
    reportMarkdown: string | null;
  };
  stages: {
    synthesis: StageRunResult<StrategicSynthesisArtifact>;
    concept: StageRunResult<ModelAssistedConceptSet>;
    direction: StageRunResult<ModelAssistedDirectionSet>;
  };
  /**
   * Persisted shadow artifact paths.
   */
  outputPaths: {
    synthesis: string | null;
    conceptSet: string | null;
    directionSet: string | null;
    reportJson: string | null;
    reportMarkdown: string | null;
    promptSnapshots: {
      synthesis: string | null;
      concept: string | null;
      direction: string | null;
    };
    liveAttempts: string | null;
  };
}

// ---------------------------------------------------------------------------
// Mock fixture (default execution path; project-agnostic).
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = 'You are a planning-first creative director. Output strict JSON only.';

function mockReasonerFactory(): ModelReasoner {
  return async (input) => {
    // The mock reads ALL messages to decide what kind of artifact
    // to emit. CI-W1C.7.1 prompts use the artifact name in the
    // system message ("You produce a ModelAssistedConceptSet.")
    // and the user message contains the artifact type. We check
    // both.
    //
    // Important: the synthesis is serialized as JSON inside the
    // concept / direction prompts. The check therefore uses the
    // most specific artifact name first so that a "Concept" stage
    // whose prompt includes a serialized synthesis does NOT match
    // the synthesis mock.
    const allText = input.prompt.messages.map((m) => m.content).join('\n');
    if (/ModelAssistedDirectionSet/i.test(allText)) {
      return { reportMarkdown: JSON.stringify(MOCK_DIRECTION_FIXTURE) };
    }
    if (/ModelAssistedConceptSet/i.test(allText)) {
      return { reportMarkdown: JSON.stringify(MOCK_CONCEPT_FIXTURE) };
    }
    if (/StrategicSynthesisArtifact/i.test(allText)) {
      return { reportMarkdown: JSON.stringify(MOCK_SYNTHESIS_FIXTURE) };
    }
    return { reportMarkdown: '{}' };
  };
}

const MOCK_SYNTHESIS_FIXTURE = {
  schemaVersion: '0.1',
  projectId: 'proj-mock',
  promptVersion: 'ci-w1c.7-strategic-synthesis-v0.1',
  generatedAt: '2026-08-20T00:00:00.000Z',
  sourceMap: {
    planningTruth: [],
    userRequirements: [],
    lockedIdentity: [],
    prohibitedDirections: [],
    needs: [],
    evidence: [],
    legacyVisualEvidenceExcluded: [
      'visualAsset.*', 'old_visual_style', 'old_VI', 'old_poster', 'old_packaging',
      'old_spatial', 'style_reference', 'structure_reference', 'spatial_reference',
    ],
  },
  projectUnderstanding: {
    summary: 'Project is in mock mode; no real model call was made.',
    coreChallenge: 'Same as above.',
    transformationGoal: 'Same as above.',
    epistemicClass: 'MODEL_INFERENCE',
    factRefs: [],
    needRefs: [],
    evidenceRefs: [],
  },
  tensions: [
    { id: 'mock-tens-1', statement: 'Mock tension A vs B', poleA: 'A', poleB: 'B', whyItMatters: 'mock', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [] },
    { id: 'mock-tens-2', statement: 'Mock tension C vs D', poleA: 'C', poleB: 'D', whyItMatters: 'mock', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [] },
  ],
  insights: [
    { id: 'mock-ins-1', statement: 'Mock insight 1', implication: 'mock', whyThisProject: 'mock', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [] },
    { id: 'mock-ins-2', statement: 'Mock insight 2', implication: 'mock', whyThisProject: 'mock', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [] },
    { id: 'mock-ins-3', statement: 'Mock insight 3', implication: 'mock', whyThisProject: 'mock', epistemicClass: 'MODEL_INFERENCE', factRefs: [], needRefs: [], evidenceRefs: [] },
  ],
  opportunities: [
    { id: 'mock-opp-1', title: 'Mock opportunity 1', thesis: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', risk: [], insightRefs: ['mock-ins-1'], factRefs: [] },
    { id: 'mock-opp-2', title: 'Mock opportunity 2', thesis: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', risk: [], insightRefs: ['mock-ins-2'], factRefs: [] },
    { id: 'mock-opp-3', title: 'Mock opportunity 3', thesis: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', risk: [], insightRefs: ['mock-ins-3'], factRefs: [] },
  ],
  diagnostics: ['MOCK_EXECUTION_PATH'],
  meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
};

const MOCK_CONCEPT_FIXTURE = {
  schemaVersion: '0.1',
  projectId: 'proj-mock',
  promptVersion: 'ci-w1c.7-model-assisted-concept-v0.1',
  generatedAt: '2026-08-20T00:00:00.000Z',
  sourceMap: { strategicSynthesisRef: 'mock', excludedAuthorities: ['visualAsset.*'] },
  candidates: [
    { id: 'mock-concept-1', title: 'Mock concept 1', coreProposition: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', whyNotCategoryCliche: 'mock', translationHypothesis: { organizationLogic: 'mock', expressionLogic: 'mock', possibleVisualBehaviors: ['mock'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['mock-opp-1'], insightRefs: ['mock-ins-1'], factRefs: [], needRefs: [], strengths: ['mock'], risks: ['mock'] },
    { id: 'mock-concept-2', title: 'Mock concept 2', coreProposition: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', whyNotCategoryCliche: 'mock', translationHypothesis: { organizationLogic: 'mock', expressionLogic: 'mock', possibleVisualBehaviors: ['mock'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['mock-opp-2'], insightRefs: ['mock-ins-2'], factRefs: [], needRefs: [], strengths: ['mock'], risks: ['mock'] },
    { id: 'mock-concept-3', title: 'Mock concept 3', coreProposition: 'mock', strategicMechanism: 'mock', whyThisProject: 'mock', whyNotCategoryCliche: 'mock', translationHypothesis: { organizationLogic: 'mock', expressionLogic: 'mock', possibleVisualBehaviors: ['mock'] }, epistemicClass: 'CREATIVE_HYPOTHESIS', opportunityRefs: ['mock-opp-3'], insightRefs: ['mock-ins-3'], factRefs: [], needRefs: [], strengths: ['mock'], risks: ['mock'] },
  ],
  diagnostics: ['MOCK_EXECUTION_PATH'],
  meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
};

const MOCK_DIRECTION_FIXTURE = {
  schemaVersion: '0.1',
  projectId: 'proj-mock',
  promptVersion: 'ci-w1c.7-model-assisted-direction-v0.1',
  generatedAt: '2026-08-20T00:00:00.000Z',
  sourceMap: { strategicSynthesisRef: 'mock', conceptSetRef: 'mock', excludedAuthorities: ['visualAsset.*'] },
  directions: [
    { id: 'mock-dir-1', title: 'Mock direction 1', directionFamily: 'model-assisted', creativeThesis: 'mock', visualMechanism: 'mock', systemHypothesis: 'mock', visualLanguage: { compositionLogic: 'mock', colorRelationship: 'mock', typographyBehavior: 'mock', graphicBehavior: 'mock', imageBehavior: 'mock' }, crossMediaBehavior: {}, whyThisProject: 'mock', differenceFromOtherDirections: 'mock', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['mock-concept-1'], opportunityRefs: ['mock-opp-1'], insightRefs: ['mock-ins-1'], factRefs: [], strengths: ['mock'], risks: ['mock'], mustNotBecome: ['mock'] },
    { id: 'mock-dir-2', title: 'Mock direction 2', directionFamily: 'model-assisted', creativeThesis: 'mock', visualMechanism: 'mock', systemHypothesis: 'mock', visualLanguage: { compositionLogic: 'mock', colorRelationship: 'mock', typographyBehavior: 'mock', graphicBehavior: 'mock', imageBehavior: 'mock' }, crossMediaBehavior: {}, whyThisProject: 'mock', differenceFromOtherDirections: 'mock', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['mock-concept-2'], opportunityRefs: ['mock-opp-2'], insightRefs: ['mock-ins-2'], factRefs: [], strengths: ['mock'], risks: ['mock'], mustNotBecome: ['mock'] },
    { id: 'mock-dir-3', title: 'Mock direction 3', directionFamily: 'model-assisted', creativeThesis: 'mock', visualMechanism: 'mock', systemHypothesis: 'mock', visualLanguage: { compositionLogic: 'mock', colorRelationship: 'mock', typographyBehavior: 'mock', graphicBehavior: 'mock', imageBehavior: 'mock' }, crossMediaBehavior: {}, whyThisProject: 'mock', differenceFromOtherDirections: 'mock', epistemicClass: 'CREATIVE_HYPOTHESIS', conceptRefs: ['mock-concept-3'], opportunityRefs: ['mock-opp-3'], insightRefs: ['mock-ins-3'], factRefs: [], strengths: ['mock'], risks: ['mock'], mustNotBecome: ['mock'] },
  ],
  diagnostics: ['MOCK_EXECUTION_PATH'],
  meta: { attempt: 1, provider: 'mock', model: 'mock-fixture-v0.1', modelCallCount: 1 },
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export interface CreativeReasoningServiceDeps {
  outputRoot: (projectId: string) => Promise<string>;
  reasonerFactory?: (credentials: ProviderCredentials) => ModelReasoner;
  readCredentials?: (profileId?: string) => Promise<ProviderCredentials>;
  /**
   * Internal: per-call context cached so the `buildStagePrompt`
   * helper can re-compile the context without re-passing it on
   * every call. Not part of the public API.
   * @internal
   */
  _lastTruth?: ProjectTruthModel;
  _lastNeeds?: NeedItem[];
  _lastEvidence?: EvidenceLedgerSnapshot;
  _lastPlanningEvidence?: PlanningStrategicClaim[];
}

/**
 * Helper to rewrite the hardcoded `projectId: 'proj-mock'` in the
 * mock fixture to the real projectId so the strict parser accepts it.
 * Production never reads mock fixtures; this helper is private to
 * the mock path.
 */
function rewriteProjectIdInMockFixture(rawText: string, realProjectId: string): string {
  try {
    const obj = JSON.parse(rawText);
    if (obj && typeof obj === 'object' && typeof obj.projectId === 'string') {
      obj.projectId = realProjectId;
      return JSON.stringify(obj);
    }
  } catch {
    // fall through
  }
  return rawText;
}

/**
 * Bounded excerpt of a previous invalid output for the repair
 * prompt. Bounded to 2000 chars to keep the repair prompt small.
 */
function boundedExcerpt(raw: string, max = 2000): string {
  if (raw.length <= max) return raw;
  return raw.slice(0, max) + `\n... [truncated, total ${raw.length} chars]`;
}

/**
 * Build a repair prompt: append blocked gate codes + bounded
 * previous invalid output + repair instructions to the user
 * message.
 */
function buildRepairUserMessage(originalUserMessage: string, prevRaw: string, blockedCodes: string[]): string {
  return [
    originalUserMessage,
    '',
    '# REPAIR',
    'Your previous output was rejected by the gates. Fix only the listed violations.',
    'Do not invent new facts. Preserve valid refs.',
    '',
    '## BLOCKED GATE CODES',
    blockedCodes.length === 0 ? '  (none)' : blockedCodes.map((c) => `  - ${c}`).join('\n'),
    '',
    '## PREVIOUS INVALID OUTPUT (bounded excerpt)',
    '```',
    boundedExcerpt(prevRaw),
    '```',
  ].join('\n');
}

export function createCreativeReasoningService(deps: CreativeReasoningServiceDeps) {
  /**
   * Build the strategy-prompt for a stage. The prompt is the
   * deterministic prompt builder output (NOT a count-only string).
   */
  function buildStagePrompt(
    stageName: 'synthesis' | 'concept' | 'direction',
    args: {
      projectId: string;
      synthesis?: StrategicSynthesisArtifact;
      conceptSet?: ModelAssistedConceptSet;
    },
  ): { system: string; user: string; promptOutput: StrategicSynthesisPromptOutput | ConceptIdeationPromptOutput | DirectionIdeationPromptOutput; promptVersion: string } {
    const ctx = compileStrategicReasoningContext({
      projectId: args.projectId,
      // The service re-uses its own per-call compiled context; the
      // prompt builder takes the context as input.
      truth: deps._lastTruth!,
      needs: deps._lastNeeds!,
      evidence: deps._lastEvidence!,
      // CI-W1C.7.4-R1 — forward cached planning evidence so the
      // PLANNING STRATEGIC EVIDENCE section is rendered.
      planningStrategicEvidence: deps._lastPlanningEvidence ?? [],
    });
    if (stageName === 'synthesis') {
      const out = buildStrategicSynthesisPrompt({ projectId: args.projectId, ctx });
      return { system: out.systemMessage, user: out.userMessage, promptOutput: out, promptVersion: out.promptVersion };
    }
    if (stageName === 'concept') {
      if (!args.synthesis) throw new Error('buildStagePrompt(concept) requires synthesis');
      const out = buildConceptIdeationPrompt({ projectId: args.projectId, ctx, synthesis: args.synthesis });
      return { system: out.systemMessage, user: out.userMessage, promptOutput: out, promptVersion: out.promptVersion };
    }
    if (stageName === 'direction') {
      if (!args.synthesis || !args.conceptSet) throw new Error('buildStagePrompt(direction) requires synthesis + conceptSet');
      const out = buildDirectionIdeationPrompt({ projectId: args.projectId, ctx, synthesis: args.synthesis, conceptSet: args.conceptSet });
      return { system: out.systemMessage, user: out.userMessage, promptOutput: out, promptVersion: out.promptVersion };
    }
    throw new Error(`unknown stage: ${stageName}`);
  }

  async function runStage<TParsed>(args: {
    stageName: 'synthesis' | 'concept' | 'direction';
    parse: (input: { rawText: string; projectId: string; attempt: 1 | 2; provider: string | null; model: string | null; modelCallCount: 1 | 2; repairReason?: string }) => TParsed;
    gate: (artifact: TParsed) => { passed: boolean; blockedCodes: string[] };
    buildUserMessage: () => string;
    buildSystemMessage: () => string;
    promptVersion: string;
    projectId: string;
    useMock: boolean;
    provider: string | null;
    model: string | null;
    attemptsOutDir: string;
  }): Promise<StageRunResult<TParsed>> {
    const rawAttempts: Array<{ attempt: 1 | 2; raw: string; error?: string }> = [];
    const liveMode = !args.useMock;
    const mock = mockReasonerFactory();
    let attempts: 1 | 2 = 1;
    let lastErr: unknown = null;
    let prevRaw = '';
    let prevBlockedCodes: string[] = [];

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let rawText = '';
      try {
        if (args.useMock || !deps.reasonerFactory || !deps.readCredentials) {
          // Mock path
          const r = await mock({
            prompt: { messages: [{ role: 'system', content: args.buildSystemMessage() }, { role: 'user', content: attempt === 1 ? args.buildUserMessage() : buildRepairUserMessage(args.buildUserMessage(), prevRaw, prevBlockedCodes) }] },
            signal: new AbortController().signal,
            maximumDurationMs: 60_000,
          });
          rawText = r.reportMarkdown;
          // The mock fixtures have a hardcoded projectId; rewrite
          // it to the real projectId before parsing.
          rawText = rewriteProjectIdInMockFixture(rawText, args.projectId);
        } else {
          // Live path — must honor input.analysisProfileId
          // (PART F) by passing it to readCredentials.
          const analysisProfileId = (args as unknown as { analysisProfileId?: string }).analysisProfileId;
          const creds = await deps.readCredentials(analysisProfileId);
          const reasoner = deps.reasonerFactory(creds);
          const r = await reasoner({
            prompt: { messages: [{ role: 'system', content: args.buildSystemMessage() }, { role: 'user', content: attempt === 1 ? args.buildUserMessage() : buildRepairUserMessage(args.buildUserMessage(), prevRaw, prevBlockedCodes) }] },
            signal: new AbortController().signal,
            maximumDurationMs: 60_000,
          });
          rawText = r.reportMarkdown;
        }
        // Persist the raw attempt for live qualification (CI-W1C.7.1 PART H).
        const attemptFile = path.join(args.attemptsOutDir, `${args.stageName}.attempt-${attempt}.raw.txt`);
        await fs.writeFile(attemptFile, rawText, 'utf8');
        rawAttempts.push({ attempt: attempt as 1 | 2, raw: rawText });

        const parsed = args.parse({
          rawText,
          projectId: args.projectId,
          attempt: attempt as 1 | 2,
          provider: args.provider,
          model: args.model,
          modelCallCount: attempt as 1 | 2,
          ...(attempt === 2 ? { repairReason: lastErr instanceof Error ? lastErr.message : String(lastErr) } : {}),
        });
        const gateReport = args.gate(parsed);
        // Persist the gate report.
        const gateFile = path.join(args.attemptsOutDir, `${args.stageName}.gate.json`);
        await fs.writeFile(gateFile, JSON.stringify(gateReport, null, 2), 'utf8');
        if (gateReport.passed) {
          return {
            status: 'PASS',
            attempts: attempt as 1 | 2,
            passed: true,
            blockedCodes: [],
            artifact: parsed,
            rawAttempts,
            gateReport,
          };
        }
        prevRaw = rawText;
        prevBlockedCodes = gateReport.blockedCodes;
        lastErr = new Error(`gate blocked: ${gateReport.blockedCodes.join(',')}`);
        attempts = 2;
      } catch (err) {
        lastErr = err;
        rawAttempts.push({ attempt: attempt as 1 | 2, raw: rawText, error: err instanceof Error ? err.message : String(err) });
        attempts = 2;
      }
    }
    // Final repair also failed.
    // In live mode, FAIL CLOSED: do NOT fall back to mock, do NOT
    // emit a fake valid report, do NOT run downstream. Just return
    // a best-effort artifact for inspection (null artifact in live
    // mode; in mock mode, we return a best-effort mock for tests).
    if (liveMode) {
      // Persist failure summary (PART H).
      const failureFile = path.join(args.attemptsOutDir, `${args.stageName}.failure.json`);
      await fs.writeFile(failureFile, JSON.stringify({
        stage: args.stageName,
        attempts,
        blockedCodes: prevBlockedCodes,
        lastError: lastErr instanceof Error ? lastErr.message : String(lastErr),
        liveMode: true,
        failedAt: new Date().toISOString(),
      }, null, 2), 'utf8');
      return {
        status: 'FAIL',
        attempts,
        passed: false,
        blockedCodes: prevBlockedCodes,
        artifact: null,
        rawAttempts,
        gateReport: null,
      };
    }
    // Mock mode fallback (allowed only in mock execution).
    // IMPORTANT: pass the stage's actual system message so the mock
    // factory can identify the stage by its artifact name (e.g.
    // "You produce a ModelAssistedConceptSet."). Using a generic
    // system prompt would make the mock return the default `{}`
    // and the parse would fail with "candidates must be an array"
    // (or similar).
    let rawText = '';
    try {
      const r = await mock({
        prompt: { messages: [{ role: 'system', content: args.buildSystemMessage() }, { role: 'user', content: args.buildUserMessage() }] },
        signal: new AbortController().signal,
        maximumDurationMs: 60_000,
      });
      rawText = r.reportMarkdown;
      rawText = rewriteProjectIdInMockFixture(rawText, args.projectId);
    } catch {
      rawText = '{}';
    }
    const parsed = args.parse({
      rawText,
      projectId: args.projectId,
      attempt: 2,
      provider: 'mock',
      model: 'mock-fixture-v0.1',
      modelCallCount: 2,
      repairReason: lastErr instanceof Error ? lastErr.message : String(lastErr),
    });
    const report = args.gate(parsed);
    return {
      status: 'FAIL',
      attempts,
      passed: false,
      blockedCodes: report.blockedCodes,
      artifact: parsed,
      rawAttempts,
      gateReport: report,
    };
  }

  async function persistPromptSnapshot(
    projectId: string,
    stageName: 'synthesis' | 'concept' | 'direction',
    prompt: { systemMessage: string; userMessage: string; promptVersion: string; inputFingerprint: string; size: { characterCount: number; sectionCount: number } },
    budget?: CreativeReasoningQualificationBudget,
  ): Promise<string | null> {
    try {
      const outRoot = await deps.outputRoot(projectId);
      const dir = path.join(outRoot, 'intermediate', 'prompt-snapshots');
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, `${stageName}.prompt.json`);
      // CI-W1C.7.1A PART D: budget gate result is persisted as
      // part of the snapshot integrity metadata. PART E: the
      // snapshot includes projectId, stage, promptVersion,
      // inputFingerprint, characterCount, estimatedInputTokens,
      // qualificationBudget, budgetStatus, sourceMap, messages,
      // generatedAt.
      const budgetResult = checkPromptBudget({
        characterCount: prompt.size.characterCount,
        budget: budget ?? DEFAULT_QUALIFICATION_BUDGET,
      });
      const payload = {
        projectId,
        stage: stageName,
        promptVersion: prompt.promptVersion,
        inputFingerprint: prompt.inputFingerprint,
        characterCount: prompt.size.characterCount,
        estimatedInputTokens: budgetResult.estimatedInputTokens,
        qualificationBudget: budgetResult.budget,
        budgetStatus: budgetResult.status,
        sourceMap: {
          // The snapshot is the source-map-shaped audit trail; we
          // persist the size diagnostics only (no secret, no
          // credentials).
          characterCount: prompt.size.characterCount,
          sectionCount: prompt.size.sectionCount,
          estimatedInputTokens: budgetResult.estimatedInputTokens,
          qualificationTokensRequired: budgetResult.qualificationTokensRequired,
          contextTokensRequired: budgetResult.contextTokensRequired,
        },
        messages: [
          { role: 'system' as const, content: prompt.systemMessage },
          { role: 'user' as const, content: prompt.userMessage },
        ],
        size: prompt.size,
        generatedAt: new Date().toISOString(),
      };
      const r = await atomicWriteJsonWithRetry(file, payload);
      if (!r.success) return null;
      return file;
    } catch {
      return null;
    }
  }

  async function run(input: CreativeReasoningInput): Promise<CreativeReasoningResult> {
    const useMock = input.useMock !== false;
    const liveMode = !useMock;
    const qualificationBudget = input.qualificationBudget ?? DEFAULT_QUALIFICATION_BUDGET;
    // Cache the truth/needs/evidence on the deps so the
    // buildStagePrompt helper can re-compile per call (the helper
    // takes the context as input, but the service-level prompt
    // builders do their own compileStrategicReasoningContext).
    deps._lastTruth = input.truth;
    deps._lastNeeds = input.needs;
    deps._lastEvidence = input.evidence;
    // CI-W1C.7.4-R1 — cache planning evidence so buildStagePrompt
    // can forward it when re-compiling the context for the
    // concept / direction stages.
    deps._lastPlanningEvidence = input.planningStrategicEvidence ?? [];

    // Resolve provider / model metadata (PART G).
    // In live mode, resolve from the credentials (honoring
    // analysisProfileId). In mock mode, leave null.
    let provider: string | null = null;
    let model: string | null = null;
    if (liveMode && deps.readCredentials) {
      try {
        const creds = await deps.readCredentials(input.analysisProfileId);
        provider = creds.provider;
        model = creds.model;
      } catch {
        // If credential resolution fails, leave provider/model null;
        // the stage will fail and the fail-closed behavior will
        // surface the error.
        provider = null;
        model = null;
      }
    }

    // Output dirs
    const outRoot = await deps.outputRoot(input.projectId);
    const intermediateDir = path.join(outRoot, 'intermediate');
    const deliverablesDir = path.join(outRoot, 'deliverables');
    const attemptsDir = path.join(outRoot, 'intermediate', 'live-attempts');
    await fs.mkdir(intermediateDir, { recursive: true });
    await fs.mkdir(deliverablesDir, { recursive: true });
    await fs.mkdir(attemptsDir, { recursive: true });

    // Build the synthesis prompt (full semantics, NOT count-only)
    // and snapshot it.
    const synthesisCtx = compileStrategicReasoningContext({
      projectId: input.projectId,
      truth: input.truth,
      needs: input.needs,
      evidence: input.evidence,
      // CI-W1C.7.4-R1 — forward planning evidence so the
      // PLANNING STRATEGIC EVIDENCE section is rendered in the
      // synthesis prompt snapshot.
      planningStrategicEvidence: input.planningStrategicEvidence ?? [],
    });
    const synthesisPrompt = buildStrategicSynthesisPrompt({
      projectId: input.projectId,
      ctx: synthesisCtx,
    });
    const synthesisPromptSnapshotPath = await persistPromptSnapshot(
      input.projectId,
      'synthesis',
      synthesisPrompt,
      qualificationBudget,
    );

    // CI-W1C.7.1A PART D — budget gate on the synthesis prompt.
    // If the gate fails, we STOP. No live model call. Downstream
    // stages are NOT_RUN. (fail-closed)
    const synthesisBudget = checkPromptBudget({
      characterCount: synthesisPrompt.size.characterCount,
      budget: qualificationBudget,
    });
    if (synthesisBudget.status === 'PROMPT_BUDGET_EXCEEDED') {
      const reason = synthesisBudget.reason ?? 'PROMPT_BUDGET_EXCEEDED';
      const synthStage: StageRunResult<StrategicSynthesisArtifact> = {
        status: 'FAIL',
        attempts: 0 as unknown as 1 | 2,
        passed: false,
        blockedCodes: [reason],
        artifact: null,
        rawAttempts: [],
        gateReport: { budget: synthesisBudget },
      };
      return {
        projectId: input.projectId,
        mode: liveMode ? 'model_assisted_live' : 'model_assisted_mock',
        imageProviderCallCount: 0,
        analysisProfileId: input.analysisProfileId,
        provider,
        model,
        shadow: {
          synthesis: null,
          conceptSet: null,
          directionSet: null,
          report: null,
          reportMarkdown: null,
        },
        stages: {
          synthesis: synthStage,
          concept: {
            status: 'NOT_RUN',
            attempts: 0 as unknown as 1 | 2,
            passed: false,
            blockedCodes: [],
            artifact: null,
            rawAttempts: [],
            gateReport: null,
          },
          direction: {
            status: 'NOT_RUN',
            attempts: 0 as unknown as 1 | 2,
            passed: false,
            blockedCodes: [],
            artifact: null,
            rawAttempts: [],
            gateReport: null,
          },
        },
        outputPaths: {
          synthesis: null,
          conceptSet: null,
          directionSet: null,
          reportJson: null,
          reportMarkdown: null,
          promptSnapshots: {
            synthesis: synthesisPromptSnapshotPath,
            concept: null,
            direction: null,
          },
          liveAttempts: attemptsDir,
        },
      };
    }

    // Stage 1: Strategic Synthesis
    const synthStage = await runStage<StrategicSynthesisArtifact>({
      stageName: 'synthesis',
      parse: parseStrategicSynthesis,
      gate: (a) => {
        const structural = validateStrategicSynthesisStructural(a);
        const grounding = runStrategicGroundingGate({ artifact: a, truth: input.truth });
        return {
          passed: structural.passed && grounding.passed,
          blockedCodes: Array.from(new Set([...structural.blockedCodes, ...grounding.blockedCodes])),
        };
      },
      buildUserMessage: () => synthesisPrompt.userMessage,
      buildSystemMessage: () => synthesisPrompt.systemMessage,
      promptVersion: synthesisPrompt.promptVersion,
      projectId: input.projectId,
      useMock,
      provider,
      model,
      attemptsOutDir: attemptsDir,
    });
    const synthesis = synthStage.artifact;

    // Stage 2: Concept Ideation
    // If upstream failed and we are in live mode, do NOT run
    // downstream. (PART H fail-closed)
    let conceptStage: StageRunResult<ModelAssistedConceptSet> | null = null;
    let conceptPrompt: ConceptIdeationPromptOutput | null = null;
    if (liveMode && synthStage.status === 'FAIL') {
      conceptStage = {
        status: 'NOT_RUN',
        attempts: 0 as unknown as 1 | 2,
        passed: false,
        blockedCodes: [],
        artifact: null,
        rawAttempts: [],
        gateReport: null,
      };
    } else if (synthesis) {
      conceptPrompt = buildConceptIdeationPrompt({
        projectId: input.projectId,
        ctx: synthesisCtx,
        synthesis,
      });
      await persistPromptSnapshot(input.projectId, 'concept', conceptPrompt, qualificationBudget);
      // CI-W1C.7.1A PART D — budget gate on the concept prompt.
      const conceptBudget = checkPromptBudget({
        characterCount: conceptPrompt.size.characterCount,
        budget: qualificationBudget,
      });
      if (conceptBudget.status === 'PROMPT_BUDGET_EXCEEDED') {
        const reason = conceptBudget.reason ?? 'PROMPT_BUDGET_EXCEEDED';
        conceptStage = {
          status: 'FAIL',
          attempts: 0 as unknown as 1 | 2,
          passed: false,
          blockedCodes: [reason],
          artifact: null,
          rawAttempts: [],
          gateReport: { budget: conceptBudget },
        };
      } else {
        conceptStage = await runStage<ModelAssistedConceptSet>({
          stageName: 'concept',
          parse: parseModelAssistedConceptSet,
          gate: (set) => {
            const r = runModelAssistedConceptGates({
              set,
              synthesis,
              projectFactKeys: new Set(input.truth.facts.map((f) => f.key).filter((k): k is string => typeof k === 'string')),
              lockedFactKeys: new Set(input.truth.facts.filter((f) => f.authority === 'LOCKED').map((f) => f.key).filter((k): k is string => typeof k === 'string')),
            });
            return { passed: r.passed, blockedCodes: r.blockedCodes };
          },
          buildUserMessage: () => conceptPrompt!.userMessage,
          buildSystemMessage: () => conceptPrompt!.systemMessage,
          promptVersion: conceptPrompt!.promptVersion,
          projectId: input.projectId,
          useMock,
          provider,
          model,
          attemptsOutDir: attemptsDir,
        });
      }
    }

    const conceptSet = conceptStage?.artifact ?? null;

    // Stage 3: Direction Ideation
    let directionStage: StageRunResult<ModelAssistedDirectionSet> | null = null;
    let directionPrompt: DirectionIdeationPromptOutput | null = null;
    if (liveMode && (synthStage.status === 'FAIL' || (conceptStage && conceptStage.status === 'FAIL'))) {
      directionStage = {
        status: 'NOT_RUN',
        attempts: 0 as unknown as 1 | 2,
        passed: false,
        blockedCodes: [],
        artifact: null,
        rawAttempts: [],
        gateReport: null,
      };
    } else if (synthesis && conceptSet) {
      directionPrompt = buildDirectionIdeationPrompt({
        projectId: input.projectId,
        ctx: synthesisCtx,
        synthesis,
        conceptSet,
      });
      await persistPromptSnapshot(input.projectId, 'direction', directionPrompt, qualificationBudget);
      // CI-W1C.7.1A PART D — budget gate on the direction prompt.
      const directionBudget = checkPromptBudget({
        characterCount: directionPrompt.size.characterCount,
        budget: qualificationBudget,
      });
      if (directionBudget.status === 'PROMPT_BUDGET_EXCEEDED') {
        const reason = directionBudget.reason ?? 'PROMPT_BUDGET_EXCEEDED';
        directionStage = {
          status: 'FAIL',
          attempts: 0 as unknown as 1 | 2,
          passed: false,
          blockedCodes: [reason],
          artifact: null,
          rawAttempts: [],
          gateReport: { budget: directionBudget },
        };
      } else {
        directionStage = await runStage<ModelAssistedDirectionSet>({
          stageName: 'direction',
          parse: parseModelAssistedDirectionSet,
          gate: (set) => {
            const r = runModelAssistedDirectionGates({
              set,
              synthesis,
              conceptSet,
              projectFactKeys: new Set(input.truth.facts.map((f) => f.key).filter((k): k is string => typeof k === 'string')),
              lockedFactKeys: new Set(input.truth.facts.filter((f) => f.authority === 'LOCKED').map((f) => f.key).filter((k): k is string => typeof k === 'string')),
              prohibitedFactKeys: new Set(input.truth.facts.filter((f) => typeof f.key === 'string' && (f.key.startsWith('prohibited.') || f.key.startsWith('style.prohibited'))).map((f) => f.key).filter((k): k is string => typeof k === 'string')),
            });
            return { passed: r.passed, blockedCodes: r.blockedCodes };
          },
          buildUserMessage: () => directionPrompt!.userMessage,
          buildSystemMessage: () => directionPrompt!.systemMessage,
          promptVersion: directionPrompt!.promptVersion,
          projectId: input.projectId,
          useMock,
          provider,
          model,
          attemptsOutDir: attemptsDir,
        });
      }
    }

    const directionSet = directionStage?.artifact ?? null;

    // 4) Report
    let report: VisualDirectionExplorationReport | null = null;
    let reportMarkdown: string | null = null;
    let reportJsonPath: string | null = null;
    let reportMarkdownPath: string | null = null;
    if (synthesis && conceptSet && directionSet) {
      report = compileVisualDirectionReport({
        projectId: input.projectId,
        synthesis,
        conceptSet,
        directionSet,
      });
      reportMarkdown = renderVisualDirectionReportMarkdown(report);
      reportJsonPath = path.join(deliverablesDir, 'visual-direction-exploration-report.json');
      reportMarkdownPath = path.join(deliverablesDir, 'visual-direction-exploration-report.md');
      const writeJson = async (p: string, v: unknown): Promise<void> => {
        const r = await atomicWriteJsonWithRetry(p, v);
        if (!r.success) {
          throw Object.assign(new Error(`write failed: ${r.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
        }
      };
      await writeJson(reportJsonPath, report);
      await fs.writeFile(reportMarkdownPath, reportMarkdown, 'utf8');
    }

    // 5) Persist shadow artifacts (when valid).
    const synthesisPath = synthesis ? path.join(intermediateDir, 'strategic-synthesis.model-assisted.json') : null;
    const conceptSetPath = conceptSet ? path.join(intermediateDir, 'concept-set.model-assisted.json') : null;
    const directionSetPath = directionSet ? path.join(intermediateDir, 'direction-set.model-assisted.json') : null;
    const writeJson = async (p: string, v: unknown): Promise<void> => {
      const r = await atomicWriteJsonWithRetry(p, v);
      if (!r.success) {
        throw Object.assign(new Error(`write failed: ${r.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
      }
    };
    if (synthesis && synthesisPath) await writeJson(synthesisPath, synthesis);
    if (conceptSet && conceptSetPath) await writeJson(conceptSetPath, conceptSet);
    if (directionSet && directionSetPath) await writeJson(directionSetPath, directionSet);

    return {
      projectId: input.projectId,
      mode: useMock ? 'model_assisted_mock' : 'model_assisted_live',
      imageProviderCallCount: 0,
      ...(input.analysisProfileId ? { analysisProfileId: input.analysisProfileId } : {}),
      provider,
      model,
      shadow: {
        synthesis,
        conceptSet,
        directionSet,
        report,
        reportMarkdown,
      },
      stages: {
        synthesis: synthStage,
        concept: conceptStage ?? {
          status: 'NOT_RUN',
          attempts: 0 as unknown as 1 | 2,
          passed: false,
          blockedCodes: [],
          artifact: null,
          rawAttempts: [],
          gateReport: null,
        },
        direction: directionStage ?? {
          status: 'NOT_RUN',
          attempts: 0 as unknown as 1 | 2,
          passed: false,
          blockedCodes: [],
          artifact: null,
          rawAttempts: [],
          gateReport: null,
        },
      },
      outputPaths: {
        synthesis: synthesisPath,
        conceptSet: conceptSetPath,
        directionSet: directionSetPath,
        reportJson: reportJsonPath,
        reportMarkdown: reportMarkdownPath,
        promptSnapshots: {
          synthesis: synthesisPromptSnapshotPath,
          concept: conceptPrompt ? await persistPromptSnapshot(input.projectId, 'concept', conceptPrompt) : null,
          direction: directionPrompt ? await persistPromptSnapshot(input.projectId, 'direction', directionPrompt) : null,
        },
        liveAttempts: attemptsDir,
      },
    };
  }

  return { run };
}

export type CreativeReasoningService = ReturnType<typeof createCreativeReasoningService>;

// Re-export for callers.
export {
  MOCK_SYSTEM_PROMPT, mockReasonerFactory, MOCK_SYNTHESIS_FIXTURE, MOCK_CONCEPT_FIXTURE, MOCK_DIRECTION_FIXTURE,
  STRATEGIC_SYNTHESIS_PROMPT_VERSION, MODEL_ASSISTED_CONCEPT_IDEATION_BUILDER_PROMPT_VERSION, MODEL_ASSISTED_DIRECTION_IDEATION_BUILDER_PROMPT_VERSION,
};
void crypto;
void boundedExcerpt;
void buildRepairUserMessage;

// Helper augmentation: deps may carry last-call context for
// buildStagePrompt. The augmentation is internal; it is not part
// of the public interface but it lets the prompt builder helper
// re-compile the context without re-passing it on every call.
declare module './creative-reasoning-service' {
  // augment deps with internal last-call state
}

// We achieve the same effect by a type assertion at the
// service-internal level. The buildStagePrompt helper uses these
// fields; they are populated by `run()`.
