import crypto from 'node:crypto';

export const VISUAL_CONCEPT_TYPES = Object.freeze([
  'space',
  'packaging',
  'product_scene',
  'graphic',
  'material',
]);
export const VISUAL_EXPLORATION_MIN_CONCEPTS = 4;
export const VISUAL_EXPLORATION_MAX_CONCEPTS = 6;

const CONCEPT_DEFINITIONS = Object.freeze({
  space: {
    title: 'Space Concept',
    objective: '探索空间结构、动线、陈列、尺度与留白关系。',
    outputType: 'interior_scene',
    aspectRatio: '16:9',
  },
  packaging: {
    title: 'Packaging Concept',
    objective: '探索包装体量、材质、工艺与货架识别关系，不生成可交付文字版式。',
    outputType: 'packaging_render',
    aspectRatio: '4:5',
  },
  product_scene: {
    title: 'Product Scene Concept',
    objective: '探索产品、环境、道具、光线与使用情境之间的叙事关系。',
    outputType: 'brand_poster',
    aspectRatio: '4:5',
  },
  graphic: {
    title: 'Graphic Concept',
    objective: '探索图形节奏、色块关系、信息层级与品牌气质，不继承任何既有文字排版。',
    outputType: 'brand_poster',
    aspectRatio: '4:5',
  },
  material: {
    title: 'Material Concept',
    objective: '探索核心材质、表面处理、工艺细节与摄影氛围。',
    outputType: 'packaging_render',
    aspectRatio: '1:1',
  },
});

function text(value) {
  return String(value ?? '').trim();
}

function conceptTypeAt(index) {
  const sequence = ['space', 'packaging', 'product_scene', 'graphic', 'material', 'product_scene'];
  return sequence[index];
}

export function createVisualExploration(input, now = new Date().toISOString()) {
  const projectId = text(input?.projectId);
  const direction = input?.creativeDirection;
  const style = input?.styleProfile;
  const conceptCount = Number(input?.conceptCount ?? 5);
  if (!projectId || direction?.status !== 'ready' || style?.status !== 'confirmed') {
    throw Object.assign(new Error('Visual Exploration 需要 ready Creative Direction 与 confirmed Style Profile。'), {
      code: 'VISUAL_EXPLORATION_CONTEXT_INVALID',
    });
  }
  if (!Number.isInteger(conceptCount)
    || conceptCount < VISUAL_EXPLORATION_MIN_CONCEPTS
    || conceptCount > VISUAL_EXPLORATION_MAX_CONCEPTS) {
    throw Object.assign(new Error('Visual Exploration 必须包含 4–6 个 Concept Image。'), {
      code: 'VISUAL_EXPLORATION_COUNT_INVALID',
    });
  }
  const id = text(input.id) || `visual-exploration-${crypto.randomUUID()}`;
  const concepts = Array.from({ length: conceptCount }, (_, index) => {
    const type = conceptTypeAt(index);
    const definition = CONCEPT_DEFINITIONS[type];
    return {
      id: `concept-${crypto.randomUUID()}`,
      index: index + 1,
      type,
      title: conceptCount === 6 && index === 5
        ? `${definition.title} · Alternative`
        : definition.title,
      objective: definition.objective,
      outputType: definition.outputType,
      aspectRatio: definition.aspectRatio,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    };
  });
  return validateVisualExploration({
    schemaVersion: '1.0',
    id,
    projectId,
    creativeDirectionId: direction.id,
    creativeDirectionVersion: direction.version,
    styleProfileId: style.id,
    styleProfileVersion: style.version,
    status: 'planned',
    conceptCount,
    concepts,
    createdAt: now,
    updatedAt: now,
  });
}

export function updateVisualExplorationConcept(
  exploration,
  conceptId,
  update,
  now = new Date().toISOString(),
) {
  validateVisualExploration(exploration);
  const concept = exploration.concepts.find((item) => item.id === conceptId);
  if (!concept) {
    throw Object.assign(new Error('Visual Concept 不存在。'), {
      code: 'VISUAL_CONCEPT_MISSING',
    });
  }
  const concepts = exploration.concepts.map((item) => item.id === conceptId
    ? {
        ...item,
        ...update,
        id: item.id,
        index: item.index,
        type: item.type,
        updatedAt: now,
      }
    : item);
  const generatedCount = concepts.filter((item) => item.status === 'generated').length;
  const failedCount = concepts.filter((item) => item.status === 'failed').length;
  const activeCount = concepts.filter((item) => item.status === 'generating').length;
  const preparedCount = concepts.filter((item) => item.status === 'prepared').length;
  const status = activeCount ? 'generating'
    : generatedCount === concepts.length ? 'ready'
      : generatedCount >= VISUAL_EXPLORATION_MIN_CONCEPTS ? 'partially_ready'
        : failedCount && failedCount + generatedCount === concepts.length ? 'failed'
          : preparedCount ? 'prepared'
            : exploration.status;
  return validateVisualExploration({
    ...exploration,
    concepts,
    status,
    updatedAt: now,
  });
}

export function selectVisualExplorationConcept(
  exploration,
  conceptId,
  rationale,
  now = new Date().toISOString(),
) {
  validateVisualExploration(exploration);
  if (!['ready', 'partially_ready', 'selected'].includes(exploration.status)
    || exploration.concepts.filter((item) => item.status === 'generated').length
      < VISUAL_EXPLORATION_MIN_CONCEPTS) {
    throw Object.assign(new Error('Designer Selection 前必须至少有 4 个可比较的 Concept Image。'), {
      code: 'VISUAL_EXPLORATION_NOT_SELECTABLE',
    });
  }
  const selected = exploration.concepts.find((item) => item.id === conceptId);
  const reason = text(rationale);
  if (!selected || selected.status !== 'generated') {
    throw Object.assign(new Error('只能选择已生成的 Visual Concept。'), {
      code: 'VISUAL_CONCEPT_NOT_SELECTABLE',
    });
  }
  if (!reason) {
    throw Object.assign(new Error('Designer Selection 必须记录选择理由。'), {
      code: 'VISUAL_SELECTION_RATIONALE_REQUIRED',
    });
  }
  return validateVisualExploration({
    ...exploration,
    status: 'selected',
    selectedConceptId: selected.id,
    selection: {
      conceptId: selected.id,
      rationale: reason,
      selectedBy: 'designer',
      selectedAt: now,
    },
    concepts: exploration.concepts.map((concept) => ({
      ...concept,
      selectionStatus: concept.id === selected.id ? 'selected' : 'not_selected',
      updatedAt: now,
    })),
    updatedAt: now,
  });
}

export function validateVisualExploration(exploration) {
  if (!exploration || exploration.schemaVersion !== '1.0'
    || !text(exploration.id) || !text(exploration.projectId)
    || !text(exploration.creativeDirectionId) || !text(exploration.creativeDirectionVersion)
    || !text(exploration.styleProfileId) || !text(exploration.styleProfileVersion)
    || !['planned', 'generating', 'prepared', 'ready', 'partially_ready', 'selected', 'failed'].includes(
      exploration.status,
    )
    || !Number.isInteger(exploration.conceptCount)
    || exploration.conceptCount < VISUAL_EXPLORATION_MIN_CONCEPTS
    || exploration.conceptCount > VISUAL_EXPLORATION_MAX_CONCEPTS
    || !Array.isArray(exploration.concepts)
    || exploration.concepts.length !== exploration.conceptCount) {
    throw Object.assign(new Error('Visual Exploration 基础结构无效。'), {
      code: 'VISUAL_EXPLORATION_INVALID',
    });
  }
  const ids = new Set();
  exploration.concepts.forEach((concept, index) => {
    if (!text(concept.id) || ids.has(concept.id)
      || concept.index !== index + 1
      || !VISUAL_CONCEPT_TYPES.includes(concept.type)
      || !text(concept.title) || !text(concept.objective)
      || !['interior_scene', 'packaging_render', 'brand_poster'].includes(concept.outputType)
      || !['16:9', '4:5', '1:1'].includes(concept.aspectRatio)
      || !['planned', 'generating', 'prepared', 'generated', 'failed'].includes(concept.status)
      || (concept.selectionStatus
        && !['selected', 'not_selected'].includes(concept.selectionStatus))
      || (concept.status === 'generated' && (!text(concept.generationRunId) || !text(concept.imagePath)))
      || (concept.status === 'failed' && !text(concept.errorMessage))) {
      throw Object.assign(new Error('Visual Concept 结构或状态无效。'), {
        code: 'VISUAL_EXPLORATION_INVALID',
      });
    }
    ids.add(concept.id);
  });
  if (exploration.status === 'selected') {
    const selected = exploration.concepts.filter((item) => item.selectionStatus === 'selected');
    if (selected.length !== 1
      || exploration.selectedConceptId !== selected[0].id
      || exploration.selection?.conceptId !== selected[0].id
      || exploration.selection?.selectedBy !== 'designer'
      || !text(exploration.selection?.rationale)
      || !text(exploration.selection?.selectedAt)) {
      throw Object.assign(new Error('Designer Selection 记录无效。'), {
        code: 'VISUAL_EXPLORATION_INVALID',
      });
    }
  }
  return exploration;
}
