import crypto from 'node:crypto';
import path from 'node:path';

export const VISUAL_MEMORY_COMPILER_VERSION = 'visual-memory-1.0.0';

const ROLES = new Set([
  'keep_reference',
  'style_reference',
  'ignore_reference',
  'anchor_reference',
]);

function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function relative(value) {
  const normalized = text(value).replaceAll('\\', '/').replace(/^\.?\//u, '');
  if (!normalized || path.posix.isAbsolute(normalized) || /^[a-z]:\//iu.test(normalized)
    || normalized.split('/').includes('..')) {
    throw Object.assign(new Error('Visual Memory 资产路径必须是项目内相对路径。'), {
      code: 'VISUAL_MEMORY_PATH_INVALID',
    });
  }
  return normalized;
}

function projectAssetPath(value) {
  const normalized = relative(value);
  return normalized.startsWith('input/') ? normalized : `input/${normalized}`;
}

function stableId(input) {
  const digest = crypto.createHash('sha256').update(JSON.stringify({
    projectId: input.projectId,
    visualGeneratedAt: input.visualContext?.generatedAt,
    understandingGeneratedAt: input.understanding?.generatedAt,
    directionId: input.creativeDirection?.id,
    directionVersion: input.creativeDirection?.version,
  })).digest('hex').slice(0, 20);
  return `visual-memory-${digest}`;
}

function roleForUsage(usage) {
  if (usage === 'identity_reference' || usage === 'structure_reference') return 'keep_reference';
  if (usage === 'exclude') return 'ignore_reference';
  return 'style_reference';
}

function scoreForUsage(usage, locked) {
  if (locked) return 100;
  if (usage === 'identity_reference') return 95;
  if (usage === 'structure_reference') return 90;
  if (usage === 'reading_only') return 55;
  return 0;
}

export function compileVisualMemory(input, now = new Date().toISOString()) {
  const projectId = text(input?.projectId);
  const visual = input?.visualContext;
  const understanding = input?.understanding;
  const direction = input?.creativeDirection;
  if (!projectId || !visual || !understanding || !direction) {
    throw Object.assign(new Error('Visual Memory 缺少视觉分析、Creative Understanding 或 Creative Direction。'), {
      code: 'VISUAL_MEMORY_SOURCE_MISSING',
    });
  }

  const assets = Array.isArray(input.assets) ? input.assets : [];
  const lockedAssets = Array.isArray(input.lockedAssets) ? input.lockedAssets : [];
  const readingById = new Map((understanding.assetReadingSummary ?? [])
    .map((item) => [text(item.assetId), item]));
  const lockedBySourceId = new Map(lockedAssets
    .filter((item) => text(item.sourceAssetId))
    .map((item) => [text(item.sourceAssetId), item]));

  const candidates = assets
    .filter((asset) => /^image\//iu.test(text(asset.mimeType)) && text(asset.status || 'ready') === 'ready')
    .map((asset) => {
      const assetId = text(asset.id);
      const reading = readingById.get(assetId);
      const locked = lockedBySourceId.get(assetId);
      const usage = reading?.recommendedUsage || (locked ? 'identity_reference' : 'reading_only');
      return {
        asset_id: assetId,
        source_kind: 'original_asset',
        source_path: projectAssetPath(asset.relativePath),
        role: roleForUsage(usage),
        rationale: text(reading?.summary)
          || text(locked?.rule)
          || '保留在完整资产分类中，等待 Reference Selection Engine 进行任务级筛选。',
        signals: unique([
          usage,
          locked?.type,
          ...(understanding.valuableAssets ?? []).filter((value) =>
            text(reading?.summary).includes(text(value))),
        ]),
        score: scoreForUsage(usage, Boolean(locked)),
      };
    });

  const memory = {
    schema_version: '1.0',
    id: stableId(input),
    project_id: projectId,
    brand_core: {
      industry: text(visual.identity?.industry || understanding.projectIdentity?.industry) || '待确认',
      positioning: text(direction.brandReposition || direction.projectTransformation),
      mood: unique(direction.visualKeywords),
      core_temperament: unique([direction.visualWorld, direction.creativeConcept, direction.primaryConcept]),
    },
    locked_assets: lockedAssets.map((asset) => ({
      locked_asset_id: text(asset.id),
      type: asset.type,
      name: text(asset.name),
      rule: text(asset.rule),
      ...(text(asset.sourceAssetId) ? { source_asset_id: text(asset.sourceAssetId) } : {}),
    })),
    visual_dna: {
      colors: unique([
        ...(visual.currentVisualSystem?.primaryColors ?? []),
        ...(visual.currentVisualSystem?.supportingColors ?? []),
        direction.colorStrategy,
      ]),
      materials: unique([
        ...(visual.currentVisualSystem?.materialSignals ?? []),
        direction.materialStrategy,
      ]),
      photography: unique([
        ...(visual.currentVisualSystem?.photographySignals ?? []),
        direction.photographyStrategy,
      ]),
      composition: unique([direction.compositionStrategy, direction.spaceStrategy]),
      graphic_language: unique([
        ...(visual.currentVisualSystem?.graphicAssets ?? []),
        direction.visualMechanism,
        direction.primaryConcept,
      ]),
    },
    visual_problems: unique([
      ...(visual.evaluation?.visualProblems ?? []),
      ...(understanding.currentProblems ?? []),
      ...(understanding.oldPatternsToAvoid ?? []),
      ...(direction.oldVisualProblems ?? []),
    ]),
    visual_opportunities: unique([
      ...(understanding.upgradePrinciples ?? []),
      direction.designStrategy,
      direction.visualWorld,
      direction.visualMechanism,
      direction.materialStrategy,
      direction.spaceStrategy,
      direction.packagingStrategy,
      direction.posterStrategy,
    ]),
    reference_strategy: {
      pack_size: { min: 5, max: 8 },
      provider_reference_limit: 2,
      candidates,
    },
    generation_rules: {
      preserve: unique([
        ...lockedAssets.map((asset) => asset.rule),
        ...(direction.keepAssets ?? []),
        ...(direction.thingsToKeep ?? []),
      ]),
      transform: unique([
        ...(direction.transformAssets ?? []),
        direction.designStrategy,
        direction.visualMechanism,
      ]),
      avoid: unique([
        ...(direction.removeAssets ?? []),
        ...(direction.thingsToRemove ?? []),
        ...(direction.generationRules ?? []),
        ...(understanding.oldPatternsToAvoid ?? []),
      ]),
    },
    source: {
      visual_context_generated_at: text(visual.generatedAt),
      creative_understanding_generated_at: text(understanding.generatedAt),
      creative_direction_id: text(direction.id),
      creative_direction_version: text(direction.version),
      compiler_version: VISUAL_MEMORY_COMPILER_VERSION,
    },
    generated_at: now,
  };
  return validateVisualMemory(memory);
}

function stringArray(value, field, allowEmpty = true) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)
    || value.some((item) => !text(item))) {
    throw Object.assign(new Error(`Visual Memory ${field} 必须是有效字符串数组。`), {
      code: 'VISUAL_MEMORY_INVALID',
    });
  }
}

export function validateVisualMemory(memory) {
  if (!memory || memory.schema_version !== '1.0' || !text(memory.id) || !text(memory.project_id)) {
    throw Object.assign(new Error('Visual Memory 基础字段无效。'), { code: 'VISUAL_MEMORY_INVALID' });
  }
  if (!text(memory.brand_core?.industry) || !text(memory.brand_core?.positioning)) {
    throw Object.assign(new Error('Visual Memory brand_core 不完整。'), { code: 'VISUAL_MEMORY_INVALID' });
  }
  for (const field of ['mood', 'core_temperament']) stringArray(memory.brand_core[field], `brand_core.${field}`);
  for (const field of ['colors', 'materials', 'photography', 'composition', 'graphic_language']) {
    stringArray(memory.visual_dna?.[field], `visual_dna.${field}`);
  }
  stringArray(memory.visual_problems, 'visual_problems');
  stringArray(memory.visual_opportunities, 'visual_opportunities');
  for (const field of ['preserve', 'transform', 'avoid']) {
    stringArray(memory.generation_rules?.[field], `generation_rules.${field}`);
  }
  if (memory.reference_strategy?.pack_size?.min !== 5
    || memory.reference_strategy?.pack_size?.max !== 8
    || memory.reference_strategy?.provider_reference_limit !== 2
    || !Array.isArray(memory.reference_strategy?.candidates)) {
    throw Object.assign(new Error('Visual Memory reference_strategy 无效。'), {
      code: 'VISUAL_MEMORY_INVALID',
    });
  }
  const candidateIds = new Set();
  for (const candidate of memory.reference_strategy.candidates) {
    if (!text(candidate.asset_id) || candidateIds.has(candidate.asset_id)
      || !ROLES.has(candidate.role) || !text(candidate.rationale)
      || !Number.isFinite(candidate.score) || candidate.score < 0 || candidate.score > 100) {
      throw Object.assign(new Error('Visual Memory Reference Candidate 无效或重复。'), {
        code: 'VISUAL_MEMORY_INVALID',
      });
    }
    candidateIds.add(candidate.asset_id);
    relative(candidate.source_path);
    stringArray(candidate.signals, 'reference_strategy.candidates.signals');
  }
  if (!text(memory.source?.visual_context_generated_at)
    || !text(memory.source?.creative_understanding_generated_at)
    || !text(memory.source?.creative_direction_id)
    || !text(memory.source?.creative_direction_version)
    || memory.source?.compiler_version !== VISUAL_MEMORY_COMPILER_VERSION
    || !text(memory.generated_at)) {
    throw Object.assign(new Error('Visual Memory source 不完整。'), { code: 'VISUAL_MEMORY_INVALID' });
  }
  return memory;
}
