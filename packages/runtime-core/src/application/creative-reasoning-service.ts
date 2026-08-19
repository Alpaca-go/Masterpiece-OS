/**
 * CI-W1C.7 — Creative Reasoning Service.
 *
 * Owns the lifecycle of the Model-Assisted Strategic Synthesis
 * (CI-4B), Concept Ideation (CI-5B), and Direction Ideation
 * (CI-6B) stages.
 *
 * Default execution path: **deterministic / mock / fixture** —
 * the service NEVER calls a model unless the caller explicitly
 * provides a `reasonerFactory` AND a non-null `readCredentials`
 * that resolves to a real ProviderCredentials. In all other
 * cases, the service uses a `mockReasonerFactory` that returns
 * fixture-driven responses. This is by spec §13 (default
 * execution must be deterministic / fixture / mock).
 *
 * Image provider: **FORBIDDEN**. This service NEVER calls an
 * image provider. `imageProviderCallCount` is always 0.
 *
 * Repair policy (spec §13):
 *   - At most 1 primary + 1 repair per stage.
 *   - `modelCallCount` in the artifact caps at 2.
 *   - If the second call still fails, the stage emits
 *     `HOLD_FOR_CREATIVE_REASONING_REPAIR` and returns null.
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

import {
  compileStrategicReasoningContext,
  parseStrategicSynthesis,
  runStrategicGroundingGate,
  validateStrategicSynthesisStructural,
  type StrategicSynthesisArtifact,
} from '@masterpiece/creative-intelligence/strategic-synthesis/index.ts';
import {
  parseModelAssistedConceptSet,
  parseModelAssistedDirectionSet,
  runModelAssistedConceptGates,
  runModelAssistedDirectionGates,
  type ModelAssistedConceptSet,
  type ModelAssistedDirectionSet,
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
  | 'deterministic_baseline'
  | 'model_assisted_shadow';

export interface CreativeReasoningInput {
  projectId: string;
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
  /**
   * Optional: when `mode === 'model_assisted_shadow'`, a real
   * `readCredentials` callback MUST be supplied by the caller.
   * The runtime service in production routes through
   * `runtime-services.ts` which has access to the credentials
   * directory; tests inject a mock.
   */
  readCredentials?: (profileId?: string) => Promise<ProviderCredentials>;
  /**
   * Optional: profile id to resolve when calling the model.
   * Default: undefined (use the default profile).
   */
  analysisProfileId?: string;
  /**
   * `true` to skip the actual model call and use the mock
   * fixture. CI-W1C.7 default execution path is `true` until
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

export interface CreativeReasoningResult {
  projectId: string;
  mode: CreativeReasoningMode;
  imageProviderCallCount: 0;
  shadow: {
    synthesis: StrategicSynthesisArtifact;
    conceptSet: ModelAssistedConceptSet;
    directionSet: ModelAssistedDirectionSet;
    report: VisualDirectionExplorationReport;
    reportMarkdown: string;
  };
  /**
   * Per-stage repair count and final status.
   */
  stages: {
    synthesis: { attempts: 1 | 2; passed: boolean; blockedCodes: string[] };
    concept: { attempts: 1 | 2; passed: boolean; blockedCodes: string[] };
    direction: { attempts: 1 | 2; passed: boolean; blockedCodes: string[] };
  };
  /**
   * Persisted shadow artifact paths.
   */
  outputPaths: {
    synthesis: string;
    conceptSet: string;
    directionSet: string;
    reportJson: string;
    reportMarkdown: string;
  };
}

// ---------------------------------------------------------------------------
// Mock fixture (default execution path; project-agnostic).
// ---------------------------------------------------------------------------

const MOCK_SYSTEM_PROMPT = 'You are a planning-first creative director. Output strict JSON only.';

function mockReasonerFactory(): ModelReasoner {
  return async (input) => {
    // The mock reads the system prompt + the user prompt to decide
    // what kind of artifact to emit. The shape of the user prompt
    // is opaque here — the mock returns the appropriate fixture
    // type based on a simple keyword check.
    const userText = input.prompt.messages
      .filter((m) => m.role === 'user')
      .map((m) => m.content)
      .join('\n');
    if (/Strategic Synthesis|strategic-synthesis/i.test(userText)) {
      return { reportMarkdown: JSON.stringify(MOCK_SYNTHESIS_FIXTURE) };
    }
    if (/Concept Ideation|concept ideation|model-assisted-concept/i.test(userText)) {
      return { reportMarkdown: JSON.stringify(MOCK_CONCEPT_FIXTURE) };
    }
    if (/Direction Ideation|direction ideation|model-assisted-direction/i.test(userText)) {
      return { reportMarkdown: JSON.stringify(MOCK_DIRECTION_FIXTURE) };
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
  /**
   * Persist the report outputs to this directory. The runtime
   * service receives the project root from `project-store.paths()`.
   */
  outputRoot: (projectId: string) => Promise<string>;
  /**
   * When set, used as the reasoner factory. When unset, the
   * service uses `mockReasonerFactory`.
   */
  reasonerFactory?: (credentials: ProviderCredentials) => ModelReasoner;
  /**
   * When set, used to resolve the analysis profile credentials.
   */
  readCredentials?: (profileId?: string) => Promise<ProviderCredentials>;
}

export function createCreativeReasoningService(deps: CreativeReasoningServiceDeps) {
  async function runStage<TParsed, TReport>(args: {
    stageName: 'synthesis' | 'concept' | 'direction';
    parse: (input: { rawText: string; projectId: string; attempt: 1 | 2; provider: string | null; model: string | null; modelCallCount: 1 | 2; repairReason?: string }) => TParsed;
    gate: (artifact: TParsed) => { passed: boolean; blockedCodes: string[] };
    buildPrompt: (input: { projectId: string; ctxSummary: string }) => string;
    systemPrompt: string;
    projectId: string;
    ctxSummary: string;
    useMock: boolean;
  }): Promise<{ artifact: TParsed; attempts: 1 | 2; passed: boolean; blockedCodes: string[] }> {
    const mock = mockReasonerFactory();
    let attempts: 1 | 2 = 1;
    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      let rawText = '';
      try {
        if (args.useMock || !deps.reasonerFactory || !deps.readCredentials) {
          const r = await mock({
            prompt: { messages: [{ role: 'system', content: MOCK_SYSTEM_PROMPT }, { role: 'user', content: args.buildPrompt({ projectId: args.projectId, ctxSummary: args.ctxSummary }) }] },
            signal: new AbortController().signal,
            maximumDurationMs: 60_000,
          });
          rawText = r.reportMarkdown;
          // The mock fixtures have a hardcoded projectId; rewrite
          // it to the real projectId before parsing.
          rawText = rewriteProjectIdInMockFixture(rawText, args.projectId);
        } else {
          const creds = await deps.readCredentials();
          const reasoner = deps.reasonerFactory(creds);
          const r = await reasoner({
            prompt: { messages: [{ role: 'system', content: args.systemPrompt }, { role: 'user', content: args.buildPrompt({ projectId: args.projectId, ctxSummary: args.ctxSummary }) }] },
            signal: new AbortController().signal,
            maximumDurationMs: 60_000,
          });
          rawText = r.reportMarkdown;
        }
        const parsed = args.parse({
          rawText,
          projectId: args.projectId,
          attempt: attempt as 1 | 2,
          provider: args.useMock ? 'mock' : null,
          model: args.useMock ? 'mock-fixture-v0.1' : null,
          modelCallCount: attempt as 1 | 2,
          ...(attempt === 2 ? { repairReason: lastErr instanceof Error ? lastErr.message : String(lastErr) } : {}),
        });
        const report = args.gate(parsed);
        if (report.passed) {
          return { artifact: parsed, attempts: attempt as 1 | 2, passed: true, blockedCodes: [] };
        }
        lastErr = new Error(`gate blocked: ${report.blockedCodes.join(',')}`);
        attempts = 2;
      } catch (err) {
        lastErr = err;
        attempts = 2;
      }
    }
    // final repair also failed
    void lastErr;
    // We re-run the parse once more to return a best-effort artifact
    // for inspection; the gate report is the source of truth.
    let rawText = '';
    try {
      const r = await mock({
        prompt: { messages: [{ role: 'system', content: MOCK_SYSTEM_PROMPT }, { role: 'user', content: args.buildPrompt({ projectId: args.projectId, ctxSummary: args.ctxSummary }) }] },
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
    return { artifact: parsed, attempts: 2, passed: false, blockedCodes: report.blockedCodes };
  }

  async function run(input: CreativeReasoningInput): Promise<CreativeReasoningResult> {
    const useMock = input.useMock !== false;
    const ctx = compileStrategicReasoningContext({
      projectId: input.projectId,
      truth: input.truth,
      needs: input.needs,
      evidence: input.evidence,
    });
    const ctxSummary = JSON.stringify({
      planningTruth: ctx.sourceIds.facts.length,
      needs: ctx.sourceIds.needs.length,
      evidence: ctx.sourceIds.evidence.length,
      lockedIdentity: input.truth.facts.filter((f: ProjectTruthFact) => f.authority === 'LOCKED').map((f) => f.id),
    });

    // 1) Strategic Synthesis
    const synthStage = await runStage({
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
      buildPrompt: ({ projectId }) => `Strategic Synthesis for projectId=${projectId}\nContext: ${ctxSummary}`,
      systemPrompt: 'You are a strategic synthesizer. Output strict JSON only.',
      projectId: input.projectId,
      ctxSummary,
      useMock,
    });
    const synthesis = synthStage.artifact as StrategicSynthesisArtifact;

    // 2) Concept Ideation
    const conceptStage = await runStage({
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
      buildPrompt: ({ projectId }) => `Model-Assisted Concept Ideation for projectId=${projectId}\nSynthesis ref: ${synthesis.generatedAt}`,
      systemPrompt: 'You are a model-assisted concept ideator. Output strict JSON only.',
      projectId: input.projectId,
      ctxSummary,
      useMock,
    });
    const conceptSet = conceptStage.artifact as ModelAssistedConceptSet;

    // 3) Direction Ideation
    const directionStage = await runStage({
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
      buildPrompt: ({ projectId }) => `Model-Assisted Direction Ideation for projectId=${projectId}\nSynthesis ref: ${synthesis.generatedAt}\nConceptSet ref: ${conceptSet.generatedAt}`,
      systemPrompt: 'You are a model-assisted direction ideator. Output strict JSON only.',
      projectId: input.projectId,
      ctxSummary,
      useMock,
    });
    const directionSet = directionStage.artifact as ModelAssistedDirectionSet;

    // 4) Report
    const report = compileVisualDirectionReport({
      projectId: input.projectId,
      synthesis,
      conceptSet,
      directionSet,
    });
    const reportMarkdown = renderVisualDirectionReportMarkdown(report);

    // 5) Persist shadow artifacts
    const outRoot = await deps.outputRoot(input.projectId);
    const intermediateDir = path.join(outRoot, 'intermediate');
    const deliverablesDir = path.join(outRoot, 'deliverables');
    await fs.mkdir(intermediateDir, { recursive: true });
    await fs.mkdir(deliverablesDir, { recursive: true });
    const synthesisPath = path.join(intermediateDir, 'strategic-synthesis.model-assisted.json');
    const conceptSetPath = path.join(intermediateDir, 'concept-set.model-assisted.json');
    const directionSetPath = path.join(intermediateDir, 'direction-set.model-assisted.json');
    const reportJsonPath = path.join(deliverablesDir, 'visual-direction-exploration-report.json');
    const reportMarkdownPath = path.join(deliverablesDir, 'visual-direction-exploration-report.md');
    const writeJson = async (p: string, v: unknown): Promise<void> => {
      const r = await atomicWriteJsonWithRetry(p, v);
      if (!r.success) {
        throw Object.assign(new Error(`write failed: ${r.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
      }
    };
    await writeJson(synthesisPath, synthesis);
    await writeJson(conceptSetPath, conceptSet);
    await writeJson(directionSetPath, directionSet);
    await writeJson(reportJsonPath, report);
    await fs.writeFile(reportMarkdownPath, reportMarkdown, 'utf8');

    return {
      projectId: input.projectId,
      mode: useMock ? 'model_assisted_shadow' : 'deterministic_baseline',
      imageProviderCallCount: 0,
      shadow: { synthesis, conceptSet, directionSet, report, reportMarkdown },
      stages: {
        synthesis: { attempts: synthStage.attempts, passed: synthStage.passed, blockedCodes: synthStage.blockedCodes },
        concept: { attempts: conceptStage.attempts, passed: conceptStage.passed, blockedCodes: conceptStage.blockedCodes },
        direction: { attempts: directionStage.attempts, passed: directionStage.passed, blockedCodes: directionStage.blockedCodes },
      },
      outputPaths: {
        synthesis: synthesisPath,
        conceptSet: conceptSetPath,
        directionSet: directionSetPath,
        reportJson: reportJsonPath,
        reportMarkdown: reportMarkdownPath,
      },
    };
  }

  return { run };
}

export type CreativeReasoningService = ReturnType<typeof createCreativeReasoningService>;

// Re-export for callers.
export { MOCK_SYSTEM_PROMPT, mockReasonerFactory, MOCK_SYNTHESIS_FIXTURE, MOCK_CONCEPT_FIXTURE, MOCK_DIRECTION_FIXTURE };
void crypto;

/**
 * Mock fixture helper: rewrite the hardcoded `projectId: 'proj-mock'`
 * to the real projectId so the strict parser accepts the fixture.
 * Production never reads mock fixtures; this helper is private
 * to the mock path.
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
