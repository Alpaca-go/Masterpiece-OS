import { randomUUID } from 'node:crypto';
import type {
  NegativeSignal,
  ReferenceAttribute,
  ReferenceSelection,
  ReferenceSelectionState,
} from './creative-research/contracts.ts';
import { REFERENCE_ATTRIBUTES } from './creative-research/contracts.ts';
import type { ReferenceResearchRepository } from './creative-research/ports.ts';
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

  return Object.freeze({
    listSelections: (sessionId) => options.references.listSelections(requireId(sessionId, 'Session ID')),
    listNegativeSignals: (sessionId) => options.references.listNegativeSignals(requireId(sessionId, 'Session ID')),
    async setReferenceSelection(input) {
      const sessionId = requireId(input.sessionId, 'Session ID');
      const referenceId = requireId(input.referenceId, 'Reference ID');
      return serialize(`${sessionId}:${referenceId}`, async () => {
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
  });
}
