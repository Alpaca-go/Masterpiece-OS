import type { VisualMigrationProductService } from '../application/visual-migration-product-service.ts';
import { assertVisualMigrationProductBrowserInput } from '../application/visual-migration-product-contract.ts';

export function createVisualMigrationProductOperations({ service }: { service: VisualMigrationProductService }) {
  const call = <TInput, TResult>(handler: (input: TInput) => TResult, input: TInput): TResult => {
    assertVisualMigrationProductBrowserInput(input);
    return handler(input);
  };
  return Object.freeze({
    'visual-migration-product:get-state': (_context: unknown, input: Parameters<VisualMigrationProductService['getState']>[0]) => call(service.getState, input),
    'visual-migration-product:prepare-reference': (_context: unknown, input: Parameters<VisualMigrationProductService['prepareReference']>[0]) => call(service.prepareReference, input),
    'visual-migration-product:prepare-task': (_context: unknown, input: Parameters<VisualMigrationProductService['prepareTask']>[0]) => call(service.prepareTask, input),
    'visual-migration-product:start-generation': (_context: unknown, input: Parameters<VisualMigrationProductService['startGeneration']>[0]) => call(service.startGeneration, input),
    'visual-migration-product:audit-generation': (_context: unknown, input: Parameters<VisualMigrationProductService['auditGeneration']>[0]) => call(service.auditGeneration, input),
    'visual-migration-product:execute-correction': (_context: unknown, input: Parameters<VisualMigrationProductService['executeCorrection']>[0]) => call(service.executeCorrection, input),
  });
}
