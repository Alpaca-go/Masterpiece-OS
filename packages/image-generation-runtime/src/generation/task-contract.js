import crypto from 'node:crypto';

const FAMILIES = new Set(['space', 'packaging', 'vi', 'poster']);
const RATIOS = new Set(['1:1', '4:3', '3:4', '16:9', '9:16']);
const LOGO_USAGE_MODES = new Set(['reference', 'blank_area', 'post_composite']);

function cleanList(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function createShortChainTaskContract(input, options = {}) {
  const family = String(input?.deliverableFamily ?? '').trim();
  const subtype = String(input?.subtype ?? '').trim();
  const scene = String(input?.scene ?? '').trim();
  const shot = String(input?.shot ?? '').trim();
  const currentInstruction = String(input?.currentInstruction ?? '').trim();
  const requestedReferenceAssetIds = cleanList(input?.referenceAssetIds);
  const rawBasis = input?.generationBasis;
  const generationBasis = rawBasis === 'continuation'
    ? 'continuation'
    : rawBasis === 'reference_first'
      ? 'reference_first'
      : rawBasis === 'standard'
        ? 'standard'
        : requestedReferenceAssetIds.length
          ? 'reference_first'
          : 'standard';
  const continuation = input?.continuation ?? null;
  const count = Number(input?.count ?? 1);
  const aspectRatio = String(input?.aspectRatio ?? '16:9');
  const logoUsageMode = String(input?.logoUsageMode ?? 'blank_area');
  const shotSource = input?.shotSource === 'user_explicit'
    ? 'user_explicit'
    : input?.shotSource === 'target_scene_default'
      ? 'target_scene_default'
      : 'legacy_project_default';
  // r2.0 §4.9: referenceSceneRelation is auxiliary metadata that only makes
  // sense for reference_first. Whitelist to the three documented values;
  // anything else (including absent) falls back to 'unknown' for reference_first
  // and is omitted for standard / continuation. We never throw on this field
  // — it is advisory, not a route-integrity input.
  const referenceSceneRelation = generationBasis === 'reference_first'
    ? (input?.referenceSceneRelation === 'same_scene'
      ? 'same_scene'
      : input?.referenceSceneRelation === 'cross_scene'
        ? 'cross_scene'
        : 'unknown')
    : undefined;
  if (!input?.projectId) throw new Error('projectId is required');
  if (!FAMILIES.has(family)) throw new Error(`Unsupported deliverable family: ${family || '(empty)'}`);
  if (!subtype) throw new Error('subtype is required');
  if (!shot) throw new Error('shot is required');
  if (!currentInstruction) throw new Error('currentInstruction is required');
  if (count !== 1 && count !== 2) throw new Error('count must be 1 or 2');
  if (!RATIOS.has(aspectRatio)) throw new Error(`Unsupported aspect ratio: ${aspectRatio}`);
  if (!LOGO_USAGE_MODES.has(logoUsageMode)) {
    throw new Error(`Unsupported logo usage mode: ${logoUsageMode}`);
  }
  if (family === 'vi' && subtype === 'unspecified') {
    throw new Error('VI generation requires a concrete material subtype');
  }
  const referenceAssetIds = requestedReferenceAssetIds;
  if (family === 'space' && generationBasis === 'standard' && referenceAssetIds.length) {
    throw Object.assign(new Error('Standard space generation cannot include provider references.'), {
      code: 'SPACE_STANDARD_REFERENCE_NOT_ALLOWED',
    });
  }
  if (family === 'space' && generationBasis === 'reference_first' && !referenceAssetIds.length) {
    throw Object.assign(new Error('Reference-First space generation requires an explicit reference.'), {
      code: 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED',
    });
  }
  // R11.1: continuation must carry exactly one confirmed generated output as
  // its source reference and a continuation intent.
  if (family === 'space' && generationBasis === 'continuation') {
    if (!continuation) {
      throw Object.assign(new Error('Continuation space generation requires a continuation intent.'), {
        code: 'SPACE_CONTINUATION_INTENT_REQUIRED',
      });
    }
    if (referenceAssetIds.length !== 1) {
      throw Object.assign(new Error('Continuation requires exactly one confirmed generated output reference.'), {
        code: 'SPACE_CONTINUATION_REFERENCE_REQUIRED',
      });
    }
  }
  return {
    schemaVersion: '1.0',
    taskId: input.taskId || `vnext-task-${crypto.randomUUID()}`,
    projectId: input.projectId,
    deliverableFamily: family,
    subtype,
    ...(scene ? { scene } : {}),
    shot,
    count,
    aspectRatio,
    currentInstruction,
    generationBasis,
    mustInclude: cleanList(input.mustInclude),
    mustAvoid: cleanList(input.mustAvoid),
    referenceAssetIds,
    logoUsageMode,
    ...(continuation ? { continuation } : {}),
    shotSource,
    ...(referenceSceneRelation ? { referenceSceneRelation } : {}),
    createdAt: options.now || new Date().toISOString(),
  };
}

export function validateShortChainTaskContract(task) {
  try {
    createShortChainTaskContract(task, { now: task?.createdAt });
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
