import fs from 'node:fs/promises';
import path from 'node:path';
import { buildCreativeIntelligenceShadow } from '@masterpiece/creative-intelligence-runtime';
import type { DocumentVisualContext, ProjectVisualContext, ProjectVisualContextShortChain } from '../shared/types.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';
import type { ProjectStore } from './project-store.ts';
import type { ProjectContextService } from './project-context-service.ts';
import type { DocumentContextService } from './document-context-service.ts';

export const CREATIVE_INTELLIGENCE_V2_DIRECTORY = 'creative-intelligence-v2';
export const CREATIVE_INTELLIGENCE_SHADOW_FILENAME = 'shadow-output.json';
export const EVIDENCE_LEDGER_FILENAME = 'evidence-ledger.json';
export const PROJECT_TRUTH_MODEL_FILENAME = 'project-truth-model.json';

export interface CreativeIntelligenceShadowServiceDeps {
  projects: ProjectStore;
  projectContext: ProjectContextService;
  documentContext: DocumentContextService;
  getDocumentContextLink(projectId: string): Promise<{ documentContextRunId: string } | null>;
}

export class CreativeIntelligenceShadowError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'CreativeIntelligenceShadowError';
    this.code = code;
  }
}

export function createCreativeIntelligenceShadowService(deps: CreativeIntelligenceShadowServiceDeps) {
  async function outputDirectory(projectId: string): Promise<string> {
    const paths = await deps.projects.paths(projectId);
    return path.join(paths.root, CREATIVE_INTELLIGENCE_V2_DIRECTORY);
  }

  async function readVisualContext(projectId: string): Promise<ProjectVisualContextShortChain | ProjectVisualContext | null> {
    return deps.projectContext.getShortChain(projectId).catch(
      () => deps.projectContext.get(projectId).catch(() => null)
    );
  }

  async function readDocumentContext(projectId: string): Promise<{
    context: DocumentVisualContext | null;
    confirmed: boolean;
  }> {
    const link = await deps.getDocumentContextLink(projectId);
    if (!link) return { context: null, confirmed: false };
    const run = await deps.documentContext.getRun(link.documentContextRunId).catch(() => null);
    const context = await deps.documentContext.getExtracted(link.documentContextRunId).catch(() => null);
    return {
      context,
      confirmed: Boolean(run && ['compiling', 'completed'].includes(run.status))
    };
  }

  async function writeArtifact(target: string, value: unknown): Promise<void> {
    const result = await atomicWriteJsonWithRetry(target, value);
    if (!result.success) {
      throw new CreativeIntelligenceShadowError(
        'CREATIVE_INTELLIGENCE_SHADOW_WRITE_FAILED',
        `Shadow artifact write failed (${path.basename(target)}): ${result.errorMessage}`
      );
    }
  }

  async function build(projectId: string) {
    await deps.projects.get(projectId);
    const visualContext = await readVisualContext(projectId);
    const document = await readDocumentContext(projectId);
    if (!visualContext && !document.context) {
      throw new CreativeIntelligenceShadowError(
        'CREATIVE_INTELLIGENCE_SOURCE_MISSING',
        'Creative Intelligence Shadow Mode requires Project Visual Context or a linked Document Context'
      );
    }
    const output = buildCreativeIntelligenceShadow({
      projectId,
      visualContext,
      documentContext: document.context,
      documentConfirmed: document.confirmed
    });
    const directory = await outputDirectory(projectId);
    await writeArtifact(path.join(directory, EVIDENCE_LEDGER_FILENAME), output.artifacts.evidenceLedger);
    await writeArtifact(path.join(directory, PROJECT_TRUTH_MODEL_FILENAME), output.artifacts.projectTruthModel);
    // Manifest is committed last, so readers never observe a manifest for partially-written artifacts.
    await writeArtifact(path.join(directory, CREATIVE_INTELLIGENCE_SHADOW_FILENAME), output);
    return output;
  }

  async function get(projectId: string) {
    const target = path.join(await outputDirectory(projectId), CREATIVE_INTELLIGENCE_SHADOW_FILENAME);
    const output = JSON.parse(await fs.readFile(target, 'utf8'));
    if (output?.schemaVersion !== '1.0' || output?.status !== 'shadow_only' || output?.projectId !== projectId) {
      throw new CreativeIntelligenceShadowError(
        'CREATIVE_INTELLIGENCE_SHADOW_INVALID',
        'Persisted Creative Intelligence shadow output is invalid'
      );
    }
    return output;
  }

  return { build, get, outputDirectory };
}

export type CreativeIntelligenceShadowService = ReturnType<typeof createCreativeIntelligenceShadowService>;
