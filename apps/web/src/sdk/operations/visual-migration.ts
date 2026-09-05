import type {
  PrepareVisualMigrationTaskInput,
  VisualMigrationProductStateV1,
} from '@masterpiece/runtime-core/application-contracts.ts';

export type VisualMigrationProductInvoke = (channel: string, args: unknown[]) => Promise<unknown>;

export interface VisualMigrationProductSdk {
  getState(input: { projectId: string; creativeSessionId?: string; runId?: string }): Promise<VisualMigrationProductStateV1>;
  prepareReference(input: { projectId: string; creativeSessionId: string; referenceAnchorRunId: string }): Promise<VisualMigrationProductStateV1>;
  prepareTask(input: PrepareVisualMigrationTaskInput): Promise<VisualMigrationProductStateV1>;
  startGeneration(input: { projectId: string; creativeSessionId: string; policyId: string; apiProfileId?: string }): Promise<VisualMigrationProductStateV1>;
  auditGeneration(input: { projectId: string; runId: string; auditProfileId?: string }): Promise<VisualMigrationProductStateV1>;
  executeCorrection(input: { projectId: string; runId: string; auditId: string; apiProfileId?: string }): Promise<VisualMigrationProductStateV1>;
}

export function createVisualMigrationProductSdk(invoke: VisualMigrationProductInvoke): VisualMigrationProductSdk {
  const call = (method: string, input: unknown) => invoke(`visual-migration-product:${method}`, [input]) as Promise<VisualMigrationProductStateV1>;
  return Object.freeze({
    getState: (input: Parameters<VisualMigrationProductSdk['getState']>[0]) => call('get-state', input),
    prepareReference: (input: Parameters<VisualMigrationProductSdk['prepareReference']>[0]) => call('prepare-reference', input),
    prepareTask: (input: Parameters<VisualMigrationProductSdk['prepareTask']>[0]) => call('prepare-task', input),
    startGeneration: (input: Parameters<VisualMigrationProductSdk['startGeneration']>[0]) => call('start-generation', input),
    auditGeneration: (input: Parameters<VisualMigrationProductSdk['auditGeneration']>[0]) => call('audit-generation', input),
    executeCorrection: (input: Parameters<VisualMigrationProductSdk['executeCorrection']>[0]) => call('execute-correction', input),
  }) as VisualMigrationProductSdk;
}
