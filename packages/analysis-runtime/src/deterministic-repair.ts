import type {
  AnalysisDeliverable,
  DeliverableExecutionContext,
  MissingFieldIssue,
  SystemDefaultResult,
} from './contracts.ts';
import {
  isRecord,
  setValueAtPath,
  valueAtPath,
} from './path-utils.ts';
import { migrateAnalysisPacket } from './schema-migrations.ts';
import { computeSourceFingerprint } from './source-fingerprint.ts';

export function applyDeterministicRepairs(input: {
  packet: unknown;
  issues: MissingFieldIssue[];
  now?: string;
}): {
  packet: Record<string, unknown>;
  repaired: string[];
} {
  const now = input.now ?? new Date().toISOString();
  const migration = migrateAnalysisPacket(input.packet, now);
  const packet = migration.packet;
  const repaired = [...migration.changes];

  for (const issue of input.issues) {
    if (issue.repairStrategy !== 'deterministic') continue;
    if (issue.path === 'schemaVersion') {
      packet.schemaVersion = '1.0';
    } else if (issue.path === 'provenance.generatedAt') {
      setValueAtPath(packet, issue.path, now);
    } else if (issue.path === 'provenance.sourceFingerprint') {
      setValueAtPath(packet, issue.path, computeSourceFingerprint(packet));
    } else {
      continue;
    }
    if (!repaired.includes(issue.path)) repaired.push(issue.path);
  }

  return { packet, repaired };
}

function evidenceBackedDefault(
  value: unknown,
  sourceFingerprint: string,
): {
  value: unknown;
  status: 'system_default';
  confidence: number;
  evidenceRefs: string[];
  generatedBy: 'system_default';
  sourceFingerprint: string;
  schemaVersion: string;
} {
  return {
    value,
    status: 'system_default',
    confidence: 1,
    evidenceRefs: [],
    generatedBy: 'system_default',
    sourceFingerprint,
    schemaVersion: '1.0',
  };
}

export function applySystemDefaults(input: {
  deliverable: AnalysisDeliverable;
  execution?: DeliverableExecutionContext;
  issues: MissingFieldIssue[];
  sourceFingerprint: string;
  projectLanguage?: string;
}): SystemDefaultResult {
  const execution = structuredClone(input.execution ?? {});
  const defaulted: SystemDefaultResult['defaulted'] = {};

  for (const issue of input.issues) {
    if (issue.repairStrategy !== 'system_default') continue;
    if (issue.path === 'execution.camera.focalLength' && input.deliverable === 'space') {
      execution.camera = {
        ...execution.camera,
        focalLength: execution.camera?.focalLength || '24-28mm',
      };
      defaulted[issue.path] = evidenceBackedDefault(
        execution.camera.focalLength,
        input.sourceFingerprint,
      );
    } else if (issue.path === 'execution.outputLanguage') {
      execution.outputLanguage = execution.outputLanguage
        || input.projectLanguage?.trim()
        || 'zh-CN';
      defaulted[issue.path] = evidenceBackedDefault(
        execution.outputLanguage,
        input.sourceFingerprint,
      );
    } else if (issue.path === 'execution.aspectRatio') {
      execution.aspectRatio = execution.aspectRatio
        || (input.deliverable === 'space' ? '16:9' : '3:4');
      defaulted[issue.path] = evidenceBackedDefault(
        execution.aspectRatio,
        input.sourceFingerprint,
      );
    }
  }
  return { execution, defaulted };
}
