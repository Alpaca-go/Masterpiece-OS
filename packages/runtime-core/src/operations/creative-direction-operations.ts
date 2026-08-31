import type { CreativeDirectionApplicationService } from '../application/creative-direction-application-service.ts';

export function createCreativeDirectionOperations({ creativeDirection }: { creativeDirection: CreativeDirectionApplicationService }) {
  return Object.freeze({
    'creative-direction:list-sessions': (_context: unknown, projectId?: string) => creativeDirection.listSessions(projectId),
    'creative-direction:create-session': (_context: unknown, input: Parameters<CreativeDirectionApplicationService['createSession']>[0]) => creativeDirection.createSession(input),
    'creative-direction:delete-session': (_context: unknown, id: string) => creativeDirection.deleteSession(id),
    'creative-direction:get-workspace': (_context: unknown, id: string) => creativeDirection.getWorkspace(id),
    'creative-direction:update-context': (_context: unknown, id: string, input: Parameters<CreativeDirectionApplicationService['updateContext']>[1]) => creativeDirection.updateContext(id, input),
    'creative-direction:link-strategy': (_context: unknown, id: string, runId: string | null) => creativeDirection.linkStrategy(id, runId),
    'creative-direction:link-visual-research': (_context: unknown, id: string, sourceId: string | null) => creativeDirection.linkVisualResearch(id, sourceId),
    'creative-direction:synthesize': (_context: unknown, id: string) => creativeDirection.synthesize(id),
    'creative-direction:update-draft': (_context: unknown, id: string, input: Parameters<CreativeDirectionApplicationService['updateDraft']>[1]) => creativeDirection.updateDraft(id, input),
    'creative-direction:finalize': (_context: unknown, id: string, confirm: boolean) => creativeDirection.finalize(id, confirm),
  });
}
