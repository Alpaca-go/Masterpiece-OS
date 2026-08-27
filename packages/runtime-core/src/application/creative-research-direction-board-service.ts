import { randomUUID } from 'node:crypto';
import type {
  CreativeResearchSession,
  DesignBrief,
  DirectionBoard,
  NegativeSignal,
  PreferenceInsight,
  ReferenceAttribute,
  ReferenceRegion,
  ReferenceSelection,
} from './creative-research/contracts.ts';
import { REFERENCE_ATTRIBUTES } from './creative-research/contracts.ts';
import { assertDirectionBoardEvidence } from './creative-research/direction-context.ts';
import type {
  DirectionBoardRepository,
  PreferenceEvidenceRepository,
  ReferenceResearchRepository,
} from './creative-research/ports.ts';
import { activeRejectionSignals } from './creative-research-selection-service.ts';
import { creativeResearchDirectionError } from './creative-research-direction-errors.ts';

export const DIRECTION_BOARD_UPDATE_FIELDS = [
  'summary',
  'visualKeywords',
  'typography',
  'layout',
  'color',
  'graphic',
  'material',
  'photography',
  'referenceIds',
  'referenceRegionIds',
  'negativeSignalIds',
  'designerNotes',
] as const;

export type DirectionBoardUpdateField = typeof DIRECTION_BOARD_UPDATE_FIELDS[number];
export type DirectionBoardUpdateInput = Partial<Pick<DirectionBoard, DirectionBoardUpdateField>>;
export type DirectionBoardDraft = Omit<DirectionBoard, 'id' | 'revision' | 'createdAt' | 'updatedAt'>;

export interface DirectionDraftInput {
  sessionId: string;
  brief: DesignBrief;
  selections: ReferenceSelection[];
  regions?: ReferenceRegion[];
  negativeSignals: NegativeSignal[];
  preferenceInsights: PreferenceInsight[];
}

export interface CreativeResearchDirectionBoardService {
  buildInitialDraft(input: DirectionDraftInput): DirectionBoardDraft;
  buildReentryDraft(input: DirectionDraftInput & { previousBoard: DirectionBoard }): DirectionBoardDraft;
  saveRevision(input: { session: CreativeResearchSession; update: DirectionBoardUpdateInput }): Promise<DirectionBoard>;
}

const SECTION_FIELDS = ['typography', 'layout', 'color', 'graphic', 'material', 'photography'] as const;
type DirectionSectionField = typeof SECTION_FIELDS[number];

const SECTION_BY_CATEGORY: Partial<Record<ReferenceAttribute, DirectionSectionField>> = {
  TYPOGRAPHY: 'typography',
  LAYOUT: 'layout',
  COLOR: 'color',
  GRAPHIC: 'graphic',
  MATERIAL: 'material',
  PHOTOGRAPHY: 'photography',
};

const ATTRIBUTE_LABELS: Record<ReferenceAttribute, string> = {
  TYPOGRAPHY: '字体排印',
  LAYOUT: '版式',
  COLOR: '色彩',
  GRAPHIC: '图形',
  MATERIAL: '材质',
  PHOTOGRAPHY: '摄影',
  IMAGE_TREATMENT: '图像处理',
  APPLICATION: '应用',
  ATMOSPHERE: '氛围',
};

function selectedSelections(selections: ReferenceSelection[]): ReferenceSelection[] {
  return selections
    .filter((selection) => selection.state === 'SELECTED' && selection.actor === 'DESIGNER')
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.referenceId.localeCompare(right.referenceId));
}

function insightText(insight: PreferenceInsight): string {
  return (insight.designerOverride ?? insight.summary).trim();
}

function finalizedInsights(insights: PreferenceInsight[]): PreferenceInsight[] {
  return insights
    .filter((insight) => insight.status === 'FINALIZED' && insightText(insight))
    .sort((left, right) => REFERENCE_ATTRIBUTES.indexOf(left.category) - REFERENCE_ATTRIBUTES.indexOf(right.category)
      || left.createdAt.localeCompare(right.createdAt)
      || left.id.localeCompare(right.id));
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function fallbackSummary(brief: DesignBrief, selected: ReferenceSelection[]): string {
  const keywords = dedupe(brief.visualKeywords);
  const attributes = REFERENCE_ATTRIBUTES.filter((attribute) => selected.some((selection) => selection.selectedAttributes.includes(attribute)));
  const focus = keywords.length ? keywords.join('、') : '待进一步明确';
  const emphasis = attributes.length ? attributes.map((attribute) => ATTRIBUTE_LABELS[attribute]).join('、') : '整体视觉气质';
  return `当前方向集中在：${focus}；重点参考${emphasis}。`;
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function pickBoardUpdate(update: DirectionBoardUpdateInput): DirectionBoardUpdateInput {
  if (!update || typeof update !== 'object' || Array.isArray(update)) {
    throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board 更新内容无效');
  }
  const picked: DirectionBoardUpdateInput = {};
  for (const field of DIRECTION_BOARD_UPDATE_FIELDS) {
    if (!hasOwn(update, field)) continue;
    const value = update[field];
    if (field === 'summary') {
      if (typeof value !== 'string' || !value.trim()) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board summary 不能为空');
      }
      picked.summary = value;
    } else if (SECTION_FIELDS.includes(field as DirectionSectionField)) {
      if (value !== undefined && typeof value !== 'string') {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board ${field} 必须是字符串`);
      }
      (picked as Record<string, unknown>)[field] = value;
    } else {
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board ${field} 必须是字符串数组`);
      }
      (picked as Record<string, unknown>)[field] = value;
    }
  }
  return picked;
}

export function createCreativeResearchDirectionBoardService(options: {
  references: ReferenceResearchRepository;
  insights: PreferenceEvidenceRepository;
  boards: DirectionBoardRepository;
  now?: () => string;
  createId?: () => string;
}): CreativeResearchDirectionBoardService {
  const now = options.now || (() => new Date().toISOString());
  const createId = options.createId || randomUUID;

  return Object.freeze({
    buildInitialDraft(input: DirectionDraftInput) {
      const selected = selectedSelections(input.selections);
      const finalized = finalizedInsights(input.preferenceInsights);
      const sections: Partial<Pick<DirectionBoard, DirectionSectionField>> = {};
      for (const insight of finalized) {
        const field = SECTION_BY_CATEGORY[insight.category];
        if (!field) continue;
        sections[field] = sections[field] ? `${sections[field]}；${insightText(insight)}` : insightText(insight);
      }
      return {
        sessionId: input.sessionId,
        summary: finalized.length ? finalized.map(insightText).join('；') : fallbackSummary(input.brief, selected),
        visualKeywords: [...input.brief.visualKeywords],
        ...sections,
        referenceIds: selected.map((selection) => selection.referenceId),
        referenceRegionIds: [],
        negativeSignalIds: activeRejectionSignals(input.selections, input.negativeSignals).map((signal) => signal.id),
        designerNotes: dedupe([
          ...input.brief.designerNotes,
          ...selected.flatMap((selection) => selection.designerNote ? [selection.designerNote] : []),
        ]),
      };
    },
    buildReentryDraft(input: DirectionDraftInput & { previousBoard: DirectionBoard }) {
      const previous = input.previousBoard;
      const selectedIds = new Set(selectedSelections(input.selections).map((selection) => selection.referenceId));
      const referenceIds = previous.referenceIds.filter((id) => selectedIds.has(id));
      const retained = new Set(referenceIds);
      const regionById = new Map((input.regions ?? []).map((region) => [region.id, region]));
      const referenceRegionIds = previous.referenceRegionIds.filter((id) => {
        const region = regionById.get(id);
        return Boolean(region && retained.has(region.referenceId));
      });
      const sections: Partial<Pick<DirectionBoard, DirectionSectionField>> = {};
      for (const field of SECTION_FIELDS) {
        if (previous[field] !== undefined) sections[field] = previous[field];
      }
      return {
        sessionId: input.sessionId,
        summary: previous.summary,
        visualKeywords: [...previous.visualKeywords],
        ...sections,
        referenceIds,
        referenceRegionIds,
        negativeSignalIds: activeRejectionSignals(input.selections, input.negativeSignals).map((signal) => signal.id),
        designerNotes: [...previous.designerNotes],
      };
    },
    async saveRevision(input: { session: CreativeResearchSession; update: DirectionBoardUpdateInput }) {
      const sessionId = input.session.id;
      const current = await options.boards.getCurrent(sessionId);
      if (!current) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_BOARD_NOT_FOUND', '当前 Session 尚未创建 Direction Board');
      }
      const update = pickBoardUpdate(input.update);
      const timestamp = now();
      const next: DirectionBoard = {
        ...current,
        ...update,
        id: createId(),
        sessionId,
        revision: current.revision + 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const [selections, regions, signals] = await Promise.all([
        options.references.listSelections(sessionId),
        options.references.listRegions(sessionId),
        options.references.listNegativeSignals(sessionId),
      ]);
      const selectedIds = new Set(selections
        .filter((selection) => selection.sessionId === sessionId && selection.state === 'SELECTED' && selection.actor === 'DESIGNER')
        .map((selection) => selection.referenceId));
      if (!next.referenceIds.length) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', 'Direction Board 至少需要保留一个设计师已选参考');
      }
      const unselected = next.referenceIds.filter((id) => !selectedIds.has(id));
      if (unselected.length) {
        throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board 引用了未选中的参考：${unselected.join(', ')}`);
      }
      const regionById = new Map(regions.filter((region) => region.sessionId === sessionId).map((region) => [region.id, region]));
      const referenceIdSet = new Set(next.referenceIds);
      for (const regionId of next.referenceRegionIds) {
        const region = regionById.get(regionId);
        if (!region) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board 引用了不存在的区域：${regionId}`);
        }
        if (!referenceIdSet.has(region.referenceId)) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board 区域 ${regionId} 不属于已选参考`);
        }
      }
      const signalById = new Map(signals.filter((signal) => signal.sessionId === sessionId).map((signal) => [signal.id, signal]));
      const rejectedIds = new Set(selections.filter((selection) => selection.state === 'REJECTED').map((selection) => selection.referenceId));
      for (const signalId of next.negativeSignalIds) {
        const signal = signalById.get(signalId);
        if (!signal) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board 引用了不存在的负向信号：${signalId}`);
        }
        if (signal.type === 'REJECT_REFERENCE' && !(signal.sourceReferenceId && rejectedIds.has(signal.sourceReferenceId))) {
          throw creativeResearchDirectionError('CREATIVE_RESEARCH_DIRECTION_VALIDATION_FAILED', `Direction Board 负向信号 ${signalId} 对应的参考当前未被拒绝`);
        }
      }
      assertDirectionBoardEvidence(next, selections);
      return options.boards.saveRevision(next);
    },
  });
}
