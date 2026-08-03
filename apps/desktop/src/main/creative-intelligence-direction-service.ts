import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildCreativeDirectionGenerationRequest,
  buildDecisionTrace,
  compileCreativeDecisionV2,
  confirmUserDirectionDecision,
  createUserDirectionDecision,
  evaluateCreativeDirections,
  normalizeCreativeDirectionSet,
  parseCreativeDirectionResponseV2,
  validateDirectionDiversity
} from '@masterpiece/creative-intelligence-runtime';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { ProviderCredentials } from './settings-store.ts';
import type { CreativeIntelligenceShadowService } from './creative-intelligence-shadow-service.ts';

export const CREATIVE_DIRECTION_SET_FILENAME = 'creative-direction-set.json';
export const DIRECTION_VALIDATION_FILENAME = 'direction-validation.json';
export const DIRECTION_EVALUATION_FILENAME = 'direction-evaluation.json';
export const USER_DIRECTION_DECISION_FILENAME = 'user-direction-decision.json';
export const CREATIVE_DECISION_V2_FILENAME = 'creative-decision-v2.json';
export const DECISION_TRACE_FILENAME = 'decision-trace.json';
export const DIRECTION_GENERATION_MANIFEST_FILENAME = 'direction-generation.json';

type CredentialsReader = (profileId?: string) => Promise<ProviderCredentials>;
type ReasonerFactory = typeof createQwenReasoner;

export interface CreativeIntelligenceDirectionServiceDeps {
  projects: ProjectStore;
  shadow: CreativeIntelligenceShadowService;
  readCredentials: CredentialsReader;
  reasonerFactory?: ReasonerFactory;
}

async function readJson<T>(filename: string): Promise<T> {
  return JSON.parse(await fs.readFile(filename, 'utf8')) as T;
}

async function writeJson(filename: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(filename, value);
  if (!result.success) throw Object.assign(new Error(`Creative Intelligence artifact write failed: ${result.errorMessage}`), { code: 'STATE_PERSIST_FAILED' });
}

export function createCreativeIntelligenceDirectionService(deps: CreativeIntelligenceDirectionServiceDeps) {
  const reasonerFactory = deps.reasonerFactory || createQwenReasoner;

  async function directory(projectId: string): Promise<string> {
    return deps.shadow.outputDirectory(projectId);
  }

  async function getAnalysis(projectId: string) {
    return deps.shadow.get(projectId).catch(() => deps.shadow.build(projectId));
  }

  async function generate(projectId: string, input: { apiProfileId?: string; requestedMode?: string } = {}) {
    const [project, analysis] = await Promise.all([deps.projects.get(projectId), getAnalysis(projectId)]);
    const request = buildCreativeDirectionGenerationRequest({
      projectTruthModel: analysis.artifacts.projectTruthModel,
      categoryOpportunityMap: analysis.artifacts.categoryOpportunityMap,
      requestedMode: input.requestedMode
    });
    const credentials = await deps.readCredentials(input.apiProfileId || project.apiProfileId || undefined);
    const reasoner = reasonerFactory({ apiKey: credentials.apiKey, model: credentials.model, baseUrl: credentials.baseUrl });
    let modelCallCount = 0;
    let lastError: unknown;
    let directionSet: any;
    let directionValidation: any;
    let directionEvaluation: any;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await reasoner({
        prompt: {
          messages: [
            { role: 'system', content: request.systemPrompt },
            {
              role: 'user',
              content: attempt === 1
                ? request.userPrompt
                : `${request.userPrompt}\n\nPrevious output failed validation: ${lastError instanceof Error ? lastError.message : String(lastError)}. Return one corrected complete JSON object.`
            }
          ],
          attachments: []
        },
        signal: new AbortController().signal,
        maximumDurationMs: 10 * 60_000
      });
      modelCallCount += 1;
      try {
        const parsed = parseCreativeDirectionResponseV2(response.reportMarkdown);
        directionSet = normalizeCreativeDirectionSet(parsed, {
          projectTruthModel: analysis.artifacts.projectTruthModel,
          categoryOpportunityMap: analysis.artifacts.categoryOpportunityMap,
          inputFingerprint: request.inputFingerprint,
          requestedMode: input.requestedMode
        });
        directionValidation = validateDirectionDiversity(directionSet);
        if (directionValidation.status !== 'passed') {
          throw Object.assign(new Error('Generated directions differ only by surface variation'), { code: 'DIRECTION_VARIATION_ONLY' });
        }
        directionEvaluation = evaluateCreativeDirections(directionSet, parsed.conceptScores);
        break;
      } catch (error) {
        lastError = error;
      }
    }
    if (!directionSet || !directionValidation || directionValidation.status !== 'passed' || !directionEvaluation) {
      throw Object.assign(new Error(`Creative Direction generation failed validation: ${lastError instanceof Error ? lastError.message : String(lastError)}`), {
        code: (lastError as { code?: string })?.code || 'CREATIVE_DIRECTION_V2_INVALID'
      });
    }
    const root = await directory(projectId);
    await writeJson(path.join(root, CREATIVE_DIRECTION_SET_FILENAME), directionSet);
    await writeJson(path.join(root, DIRECTION_VALIDATION_FILENAME), directionValidation);
    await writeJson(path.join(root, DIRECTION_EVALUATION_FILENAME), directionEvaluation);
    await writeJson(path.join(root, DIRECTION_GENERATION_MANIFEST_FILENAME), {
      schemaVersion: '1.0', projectId, inputFingerprint: request.inputFingerprint,
      provider: credentials.provider, model: credentials.model, modelCallCount,
      status: 'awaiting_user_decision', generatedAt: new Date().toISOString()
    });
    return { directionSet, directionValidation, directionEvaluation, modelCallCount };
  }

  async function getDirectionArtifacts(projectId: string) {
    const root = await directory(projectId);
    const [directionSet, directionValidation, directionEvaluation] = await Promise.all([
      readJson<any>(path.join(root, CREATIVE_DIRECTION_SET_FILENAME)),
      readJson<any>(path.join(root, DIRECTION_VALIDATION_FILENAME)),
      readJson<any>(path.join(root, DIRECTION_EVALUATION_FILENAME))
    ]);
    return { directionSet, directionValidation, directionEvaluation };
  }

  async function saveDraft(projectId: string, input: Record<string, unknown>) {
    const { directionSet } = await getDirectionArtifacts(projectId);
    const draft = createUserDirectionDecision(directionSet, input);
    await writeJson(path.join(await directory(projectId), USER_DIRECTION_DECISION_FILENAME), draft);
    return draft;
  }

  async function confirm(projectId: string, input: Record<string, unknown>) {
    const [analysis, artifacts] = await Promise.all([getAnalysis(projectId), getDirectionArtifacts(projectId)]);
    const draft = createUserDirectionDecision(artifacts.directionSet, input);
    const userDecision = confirmUserDirectionDecision(artifacts.directionSet, draft);
    const creativeDecision = compileCreativeDecisionV2({
      ...artifacts, userDecision,
      projectTruthModel: analysis.artifacts.projectTruthModel,
      categoryOpportunityMap: analysis.artifacts.categoryOpportunityMap
    });
    const decisionTrace = buildDecisionTrace({
      evidenceLedger: analysis.artifacts.evidenceLedger,
      categoryOpportunityMap: analysis.artifacts.categoryOpportunityMap,
      directionSet: artifacts.directionSet,
      userDecision,
      creativeDecision
    });
    const root = await directory(projectId);
    await writeJson(path.join(root, USER_DIRECTION_DECISION_FILENAME), userDecision);
    await writeJson(path.join(root, CREATIVE_DECISION_V2_FILENAME), creativeDecision);
    await writeJson(path.join(root, DECISION_TRACE_FILENAME), decisionTrace);
    return { userDecision, creativeDecision, decisionTrace };
  }

  async function getDecision(projectId: string) {
    const root = await directory(projectId);
    const [userDecision, creativeDecision, decisionTrace] = await Promise.all([
      readJson<any>(path.join(root, USER_DIRECTION_DECISION_FILENAME)).catch(() => null),
      readJson<any>(path.join(root, CREATIVE_DECISION_V2_FILENAME)).catch(() => null),
      readJson<any>(path.join(root, DECISION_TRACE_FILENAME)).catch(() => null)
    ]);
    return { userDecision, creativeDecision, decisionTrace };
  }

  return { generate, getDirectionArtifacts, saveDraft, confirm, getDecision };
}

export type CreativeIntelligenceDirectionService = ReturnType<typeof createCreativeIntelligenceDirectionService>;
