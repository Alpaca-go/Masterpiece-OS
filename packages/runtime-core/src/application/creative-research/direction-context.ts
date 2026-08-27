import {
  REFERENCE_ATTRIBUTES,
  type CreativeDirectionContext,
  type CreativeResearchSession,
  type DesignBrief,
  type DirectionBoard,
  type NegativeSignal,
  type ReferenceAttribute,
  type ReferenceRegion,
  type ReferenceSelection,
} from './contracts.ts';
import {
  assertDesignBrief,
  assertJsonSerializable,
  assertNegativeSignal,
  assertReferenceRegion,
  assertReferenceSelection,
} from './evidence.ts';

const CONTEXT_KEYS = [
  'sessionId',
  'projectId',
  'briefRevision',
  'directionBoardRevision',
  'projectBrief',
  'constraints',
  'visualKeywords',
  'selectedReferenceIds',
  'selectedReferenceRegionIds',
  'preferredAttributes',
  'negativeSignals',
  'designerNotes',
  'directionSummary',
  'provenance',
  'createdAt',
] as const;

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim()))];
}

function assertNoPrivateDownstreamKeys(value: unknown, path = 'creativeDirectionContext'): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoPrivateDownstreamKeys(item, `${path}[${index}]`));
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    if (/packaging|space|prompt|visualGrammar/iu.test(key)) {
      throw new Error(`CreativeDirectionContext must not contain downstream private schema at ${path}.${key}`);
    }
    assertNoPrivateDownstreamKeys(item, `${path}.${key}`);
  }
}

export function assertDirectionBoardEvidence(
  board: DirectionBoard,
  selections: ReferenceSelection[],
): void {
  if (!board.id || !board.sessionId) throw new Error('DirectionBoard identity is required');
  if (!Number.isInteger(board.revision) || board.revision < 1) throw new Error('DirectionBoard revision must be a positive integer');
  if (!board.summary.trim()) throw new Error('DirectionBoard summary is required');
  if (!Number.isFinite(Date.parse(board.createdAt)) || !Number.isFinite(Date.parse(board.updatedAt))) {
    throw new Error('DirectionBoard timestamps must be ISO 8601 strings');
  }
  for (const selection of selections) assertReferenceSelection(selection);
  const selectedIds = new Set(
    selections
      .filter((selection) => selection.state === 'SELECTED' && selection.actor === 'DESIGNER')
      .map((selection) => selection.referenceId),
  );
  if (!board.referenceIds.length) throw new Error('DirectionBoard requires a designer-selected reference');
  const unselected = board.referenceIds.filter((id) => !selectedIds.has(id));
  if (unselected.length) throw new Error(`DirectionBoard references are not designer-selected: ${unselected.join(', ')}`);
  assertJsonSerializable(board, 'directionBoard');
}

export interface CompileCreativeDirectionContextInput {
  session: CreativeResearchSession;
  brief: DesignBrief;
  directionBoard: DirectionBoard;
  selections: ReferenceSelection[];
  regions: ReferenceRegion[];
  negativeSignals: NegativeSignal[];
  createdAt: string;
}

export function compileCreativeDirectionContext(
  input: CompileCreativeDirectionContextInput,
): CreativeDirectionContext {
  const { session, brief, directionBoard, selections, regions, negativeSignals } = input;
  assertDesignBrief(brief);
  assertDirectionBoardEvidence(directionBoard, selections);
  if (brief.sessionId !== session.id || directionBoard.sessionId !== session.id) {
    throw new Error('direction handoff inputs must preserve session identity');
  }
  if (selections.some((selection) => selection.sessionId !== session.id)
    || regions.some((region) => region.sessionId !== session.id)
    || negativeSignals.some((signal) => signal.sessionId !== session.id)) {
    throw new Error('direction evidence must preserve session identity');
  }
  if (session.activeDesignBriefId !== brief.id) throw new Error('direction handoff requires the active DesignBrief');
  if (session.activeDirectionBoardId !== directionBoard.id) throw new Error('direction handoff requires the active DirectionBoard');

  const selectedById = new Map(
    selections
      .filter((selection) => selection.state === 'SELECTED')
      .map((selection) => [selection.referenceId, selection]),
  );
  const selectedReferenceIds = directionBoard.referenceIds.filter((id) => selectedById.has(id));
  const regionById = new Map(regions.map((region) => {
    assertReferenceRegion(region);
    return [region.id, region];
  }));
  const selectedReferenceRegionIds = directionBoard.referenceRegionIds.filter((id) => {
    const region = regionById.get(id);
    return Boolean(region && selectedById.has(region.referenceId));
  });
  if (selectedReferenceRegionIds.length !== directionBoard.referenceRegionIds.length) {
    throw new Error('DirectionBoard regions must belong to designer-selected references');
  }

  const signalById = new Map(negativeSignals.map((signal) => {
    assertNegativeSignal(signal);
    if (signal.sessionId !== session.id) throw new Error('negative signal must belong to session');
    return [signal.id, signal];
  }));
  const selectedSignals = directionBoard.negativeSignalIds.map((id) => {
    const signal = signalById.get(id);
    if (!signal) throw new Error(`DirectionBoard negative signal is missing: ${id}`);
    return signal;
  });

  const attributes = new Set<ReferenceAttribute>();
  for (const id of selectedReferenceIds) {
    for (const attribute of selectedById.get(id)?.selectedAttributes ?? []) attributes.add(attribute);
  }
  for (const id of selectedReferenceRegionIds) {
    for (const attribute of regionById.get(id)?.selectedAttributes ?? []) attributes.add(attribute);
  }

  const context: CreativeDirectionContext = {
    sessionId: session.id,
    projectId: session.projectId,
    briefRevision: brief.revision,
    directionBoardRevision: directionBoard.revision,
    projectBrief: `${brief.projectSummary}\n\n${brief.designTask}`,
    constraints: [...brief.constraints],
    visualKeywords: unique([...brief.visualKeywords, ...directionBoard.visualKeywords]),
    selectedReferenceIds,
    selectedReferenceRegionIds,
    preferredAttributes: REFERENCE_ATTRIBUTES.filter((attribute) => attributes.has(attribute)),
    negativeSignals: selectedSignals.map((signal) => ({
      id: signal.id,
      type: signal.type,
      scope: signal.scope,
      ...(signal.value ? { value: signal.value } : {}),
      ...(signal.reason ? { reason: signal.reason } : {}),
    })),
    designerNotes: unique([
      ...brief.designerNotes,
      ...selectedReferenceIds.flatMap((id) => selectedById.get(id)?.designerNote ?? []),
      ...selectedReferenceRegionIds.flatMap((id) => regionById.get(id)?.designerNote ?? []),
      ...directionBoard.designerNotes,
    ]),
    directionSummary: directionBoard.summary,
    provenance: {
      designBriefId: brief.id,
      directionBoardId: directionBoard.id,
      sourceDocumentIds: [...session.sourceDocumentIds],
      referenceIds: [...selectedReferenceIds],
      referenceRegionIds: [...selectedReferenceRegionIds],
      negativeSignalIds: selectedSignals.map((signal) => signal.id),
    },
    createdAt: input.createdAt,
  };
  assertCreativeDirectionContextBoundary(context);
  return context;
}

export function assertCreativeDirectionContextBoundary(context: CreativeDirectionContext): void {
  const keys = Object.keys(context);
  const unexpected = keys.filter((key) => !(CONTEXT_KEYS as readonly string[]).includes(key));
  if (unexpected.length) throw new Error(`CreativeDirectionContext contains private downstream fields: ${unexpected.join(', ')}`);
  if (!context.sessionId || !context.projectId) throw new Error('CreativeDirectionContext identity is required');
  if (!Number.isInteger(context.briefRevision) || context.briefRevision < 1) {
    throw new Error('CreativeDirectionContext briefRevision must be a positive integer');
  }
  if (!Number.isInteger(context.directionBoardRevision) || context.directionBoardRevision < 1) {
    throw new Error('CreativeDirectionContext directionBoardRevision must be a positive integer');
  }
  if (!context.projectBrief.trim() || !context.directionSummary.trim()) {
    throw new Error('CreativeDirectionContext brief and direction summary are required');
  }
  if (!context.selectedReferenceIds.length) {
    throw new Error('CreativeDirectionContext requires a designer-selected reference');
  }
  if (JSON.stringify(context.provenance.referenceIds) !== JSON.stringify(context.selectedReferenceIds)
    || JSON.stringify(context.provenance.referenceRegionIds) !== JSON.stringify(context.selectedReferenceRegionIds)
    || JSON.stringify(context.provenance.negativeSignalIds) !== JSON.stringify(context.negativeSignals.map((signal) => signal.id))) {
    throw new Error('CreativeDirectionContext provenance must match selected evidence');
  }
  if (!Number.isFinite(Date.parse(context.createdAt))) throw new Error('CreativeDirectionContext.createdAt must be an ISO 8601 string');
  assertNoPrivateDownstreamKeys(context);
  assertJsonSerializable(context, 'creativeDirectionContext');
}

export function serializeCreativeDirectionContext(context: CreativeDirectionContext): string {
  assertCreativeDirectionContextBoundary(context);
  return JSON.stringify(context);
}
