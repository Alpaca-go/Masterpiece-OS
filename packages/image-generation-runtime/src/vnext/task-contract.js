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

export function createVNextTaskContract(input, options = {}) {
  const family = String(input?.deliverableFamily ?? '').trim();
  const subtype = String(input?.subtype ?? '').trim();
  const scene = String(input?.scene ?? '').trim();
  const shot = String(input?.shot ?? '').trim();
  const currentInstruction = String(input?.currentInstruction ?? '').trim();
  const requestedReferenceAssetIds = cleanList(input?.referenceAssetIds);
  const generationBasis = input?.generationBasis === 'reference_first'
    ? 'reference_first'
    : input?.generationBasis === 'standard'
      ? 'standard'
      : requestedReferenceAssetIds.length
        ? 'reference_first'
        : 'standard';
  const count = Number(input?.count ?? 1);
  const aspectRatio = String(input?.aspectRatio ?? '16:9');
  const logoUsageMode = String(input?.logoUsageMode ?? 'blank_area');
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
    createdAt: options.now || new Date().toISOString(),
  };
}

export function validateVNextTaskContract(task) {
  try {
    createVNextTaskContract(task, { now: task?.createdAt });
    return { valid: true, errors: [] };
  } catch (error) {
    return { valid: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
}
