import { randomUUID } from 'node:crypto';
import type {
  NegativeSignal,
  ReferenceAttribute,
  ReferenceSelection,
  ReferenceSelectionState,
} from './creative-research/contracts.ts';
import { REFERENCE_ATTRIBUTES } from './creative-research/contracts.ts';
import type {
  CreativeResearchSessionRepository,
  ReferenceResearchRepository,
} from './creative-research/ports.ts';
import { creativeResearchSelectionError } from './creative-research-selection-errors.ts';

export interface SetReferenceSelectionInput {
  sessionId: string;
  referenceId: string;
  state: ReferenceSelectionState;
  selectedAttributes: ReferenceAttribute[];
  designerNote?: string;
  rejectionReason?: string;
}

export interface CreativeResearchSelectionService {
  listSelections(sessionId: string): Promise<ReferenceSelection[]>;
  listNegativeSignals(sessionId: string): Promise<NegativeSignal[]>;
  setReferenceSelection(input: SetReferenceSelectionInput): Promise<{
    selection: ReferenceSelection;
    negativeSignal?: NegativeSignal;
  }>;
}

function requireId(value: string, label: string): string {
  const normalized = String(value || '').trim();
  if (!normalized) throw creativeResearchSelectionError('CREATIVE_RESEARCH_SELECTION_NOT_FOUND', `${label} 不能为空`);
  return normalized;
}

function normalizeAttributes(values: ReferenceAttribute[]): ReferenceAttribute[] {
  if (!Array.isArray(values)) {
    throw creativeResearchSelectionError('CREATIVE_RESEARCH_SELECTION_STORE_FAILED', 'selectedAttributes 必须是数组');
  }
  const allowed = new Set<string>(REFERENCE_ATTRIBUTES);
  const normalized = [...new Set(values)];
  if (normalized.some((value) => !allowed.has(value))) {
    throw creativeResearchSelectionError('CREATIVE_RESEARCH_SELECTION_STORE_FAILED', 'selectedAttributes 包含未知属性');
  }
  return normalized;
}

export function activeRejectionSignals(
  selections: ReferenceSelection[],
  signals: NegativeSignal[],
): NegativeSignal[] {
  const rejected = new Set(selections
    .filter((selection) => selection.state === 'REJECTED')
    .map((selection) => selection.referenceId));
  return signals.filter((signal) => signal.type === 'REJECT_REFERENCE'
    && signal.scope === 'REFERENCE'
    && Boolean(signal.sourceReferenceId)
    && rejected.has(signal.sourceReferenceId!));
}

export function createCreativeResearchSelectionService(options: {
  references: ReferenceResearchRepository;
  // R7: optional session repository — when provided, COMPLETED sessions become
  // read-only for selection mutations. Older hosts (R1–R6 tests) may omit it.
  sessions?: CreativeResearchSessionRepository;
  now?: () => string;
  createId?: () => string;
}): CreativeResearchSelectionService {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;
  const locks = new Map<string, Promise<unknown>>();
  const serialize = async <T>(key: string, operation: () => Promise<T>): Promise<T> => {
    const previous = locks.get(key) || Promise.resolve();
    const current = previous.catch(() => undefined).then(operation);
    locks.set(key, current);
    try { return await current; } finally { if (locks.get(key) === current) locks.delete(key); }
  };
  const assertSessionWritable = async (sessionId: string): Promise<void> => {
    if (!options.sessions) return;
    const session = await options.sessions.get(sessionId);
    if (session?.status === 'COMPLETED') {
      throw creativeResearchSelectionError('CREATIVE_RESEARCH_SELECTION_SESSION_COMPLETED', 'Session 已完成，选择记录只读');
    }
  };

  const service: CreativeResearchSelectionService = {
    listSelections: (sessionId) => options.references.listSelections(requireId(sessionId, 'Session ID')),
    listNegativeSignals: (sessionId) => options.references.listNegativeSignals(requireId(sessionId, 'Session ID')),
    async setReferenceSelection(input) {
      const sessionId = requireId(input.sessionId, 'Session ID');
      const referenceId = requireId(input.referenceId, 'Reference ID');
      return serialize(`${sessionId}:${referenceId}`, async () => {
        await assertSessionWritable(sessionId);
        const reference = await options.references.getReference(sessionId, referenceId);
        if (!reference) {
          throw creativeResearchSelectionError(
            'CREATIVE_RESEARCH_SELECTION_REFERENCE_NOT_FOUND',
            `Reference 不存在或不属于当前 Session：${referenceId}`,
          );
        }
        const previous = (await options.references.listSelections(sessionId))
          .find((selection) => selection.referenceId === referenceId);
        const timestamp = now();
        const state = input.state;
        if (!['NONE', 'SELECTED', 'REJECTED'].includes(state)) {
          throw creativeResearchSelectionError('CREATIVE_RESEARCH_SELECTION_STORE_FAILED', 'Selection state 无效');
        }
        const selection: ReferenceSelection = {
          sessionId,
          referenceId,
          state,
          selectedAttributes: state === 'SELECTED' ? normalizeAttributes(input.selectedAttributes) : [],
          ...(state === 'SELECTED' && input.designerNote?.trim() ? { designerNote: input.designerNote.trim() } : {}),
          actor: 'DESIGNER',
          createdAt: previous?.createdAt || timestamp,
          updatedAt: timestamp,
        };
        const saved = await options.references.saveSelection(selection);
        if (state !== 'REJECTED') return { selection: saved };
        const negativeSignal: NegativeSignal = {
          id: createId(),
          sessionId,
          type: 'REJECT_REFERENCE',
          scope: 'REFERENCE',
          sourceReferenceId: referenceId,
          ...(input.rejectionReason?.trim() ? { reason: input.rejectionReason.trim() } : {}),
          actor: 'DESIGNER',
          createdAt: timestamp,
        };
        return {
          selection: saved,
          negativeSignal: await options.references.saveNegativeSignal(negativeSignal),
        };
      });
    },
  };
  return Object.freeze(service);
}
