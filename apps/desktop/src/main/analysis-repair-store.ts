import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AnalysisCompletionPersistence,
  AnalysisRepairAudit,
} from '@masterpiece/analysis-runtime/index.ts';
import { atomicWriteJsonWithRetry } from './runtime/atomic-write.ts';

const RUNTIME_FILENAMES = new Set([
  'initial-validation.json',
  'repair-plan.json',
  'repair-prompt.redacted.md',
  'repair-response.redacted.json',
  'merge-report.json',
  'final-validation.json',
]);

function assertInside(root: string, target: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  if (
    resolvedTarget !== resolvedRoot
    && !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw Object.assign(new Error('Repair artifact path escaped its storage root.'), {
      code: 'PROJECT_CONTEXT_WRITE_FAILED',
    });
  }
  return resolvedTarget;
}

async function writeJson(target: string, value: unknown): Promise<void> {
  const result = await atomicWriteJsonWithRetry(target, value);
  if (!result.success) {
    throw Object.assign(new Error(result.errorMessage || 'Repair artifact write failed.'), {
      code: 'PROJECT_CONTEXT_WRITE_FAILED',
    });
  }
}

export function createAnalysisRepairStore(input: {
  projectRoot: string;
  dataRoot: string;
  runId: string;
}): AnalysisCompletionPersistence & {
  paths: {
    projectContext: string;
    history: string;
    runtime: string;
  };
} {
  if (!/^repair-run-[a-f0-9-]{36}$/iu.test(input.runId)) {
    throw Object.assign(new Error('Invalid analysis repair run id.'), {
      code: 'PROJECT_CONTEXT_WRITE_FAILED',
    });
  }
  const projectContext = assertInside(
    input.projectRoot,
    path.join(input.projectRoot, 'project-context'),
  );
  const history = assertInside(projectContext, path.join(projectContext, 'history'));
  const runtime = assertInside(
    input.dataRoot,
    path.join(input.dataRoot, 'runtime', 'repair-sessions', input.runId),
  );

  return {
    paths: { projectContext, history, runtime },
    saveInitial: (packet) => writeJson(
      path.join(history, 'visual-decision-packet.initial.json'),
      packet,
    ),
    saveAttempt: (attempt, packet) => {
      if (!Number.isInteger(attempt) || attempt < 1 || attempt > 2) {
        throw Object.assign(new Error('Invalid repair history attempt.'), {
          code: 'PROJECT_CONTEXT_WRITE_FAILED',
        });
      }
      return writeJson(
        path.join(
          history,
          `visual-decision-packet.repaired-${String(attempt).padStart(2, '0')}.json`,
        ),
        packet,
      );
    },
    saveFinal: (packet) => writeJson(
      path.join(projectContext, 'visual-decision-packet.json'),
      packet,
    ),
    saveAudit: (audit: AnalysisRepairAudit) => writeJson(
      path.join(projectContext, 'analysis-repair-audit.json'),
      audit,
    ),
    saveRuntimeArtifact: async (filename, value) => {
      if (!RUNTIME_FILENAMES.has(filename)) {
        throw Object.assign(new Error('Unsupported repair runtime artifact.'), {
          code: 'PROJECT_CONTEXT_WRITE_FAILED',
        });
      }
      const target = assertInside(runtime, path.join(runtime, filename));
      if (filename.endsWith('.md')) {
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, String(value), 'utf8');
        return;
      }
      await writeJson(target, value);
    },
  };
}
