export const PRESERVATION_MODES = Object.freeze([
  'lock',
  'constrain',
  'bias',
  'suggest',
  'exclude',
]);

const PRESERVATION_MODE_SET = new Set(PRESERVATION_MODES);
const FOUNDATION_DEFAULTS = Object.freeze({
  architecture: 'constrain',
  spatialScale: 'lock',
  functionalZoning: 'lock',
  circulation: 'lock',
  atmosphereCore: 'constrain',
  cameraRole: 'constrain',
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function requireString(value, path, issues) {
  if (typeof value !== 'string' || !value.trim()) addIssue(issues, path, 'must be a non-empty string');
}

function requireVersion(value, path, issues) {
  if (!Number.isInteger(value) || value < 1) addIssue(issues, path, 'must be a positive integer');
}

function validatePreservationMode(value, path, issues) {
  if (!PRESERVATION_MODE_SET.has(value)) {
    addIssue(issues, path, `must be one of: ${PRESERVATION_MODES.join(', ')}`);
  }
}

function finish(schema, value, issues) {
  return { schema, valid: issues.length === 0, value, issues };
}

export function migrateSpatialFoundation(input = {}) {
  const source = isObject(input) ? structuredClone(input) : {};
  const preservation = isObject(source.preservation) ? source.preservation : {};
  source.version = Number.isInteger(source.version) ? source.version : 1;
  source.preservation = { ...FOUNDATION_DEFAULTS, ...preservation };
  source.spatialScale = isObject(source.spatialScale) ? source.spatialScale : {};
  source.spatialScale.preservation = source.spatialScale.preservation
    || source.preservation.spatialScale
    || 'lock';
  return source;
}

export function validateSpatialFoundation(input) {
  const value = migrateSpatialFoundation(input);
  const issues = [];
  requireVersion(value.version, 'version', issues);
  requireString(value.spaceType, 'spaceType', issues);
  for (const [key, mode] of Object.entries(value.preservation)) {
    validatePreservationMode(mode, `preservation.${key}`, issues);
  }
  validatePreservationMode(value.spatialScale.preservation, 'spatialScale.preservation', issues);
  if (value.spatialScale.preservation !== 'lock') {
    addIssue(issues, 'spatialScale.preservation', 'must default to and remain lock');
  }
  return finish('SpatialFoundation', value, issues);
}

export function validateVerticalSpatialArchetype(input) {
  const value = isObject(input) ? structuredClone(input) : {};
  const issues = [];
  requireString(value.id, 'id', issues);
  requireVersion(value.version, 'version', issues);
  if (!Array.isArray(value.applicableThemes) || value.applicableThemes.length === 0) {
    addIssue(issues, 'applicableThemes', 'must contain at least one theme');
  }
  if (!isObject(value.antiClonePolicy)) addIssue(issues, 'antiClonePolicy', 'must be an object');
  if (value.antiClonePolicy?.inheritSemanticsNotSignatures !== true) {
    addIssue(issues, 'antiClonePolicy.inheritSemanticsNotSignatures', 'must be true');
  }
  return finish('VerticalSpatialArchetype', value, issues);
}

export function validateProjectVisualCanon(input) {
  const value = isObject(input) ? structuredClone(input) : {};
  const issues = [];
  requireString(value.projectId, 'projectId', issues);
  requireVersion(value.version, 'version', issues);
  if (!isObject(value.lockedAssets)) addIssue(issues, 'lockedAssets', 'must be an object');
  if (!isObject(value.projectRules)) addIssue(issues, 'projectRules', 'must be an object');
  return finish('ProjectVisualCanon', value, issues);
}

export function validateAnchorManifest(input) {
  const value = isObject(input) ? structuredClone(input) : {};
  const issues = [];
  requireString(value.projectId, 'projectId', issues);
  requireVersion(value.version, 'version', issues);
  if (!Array.isArray(value.anchors) || value.anchors.length === 0) {
    addIssue(issues, 'anchors', 'must contain at least one anchor');
  }
  for (const [index, anchor] of (value.anchors || []).entries()) {
    requireString(anchor?.id, `anchors.${index}.id`, issues);
    requireString(anchor?.file, `anchors.${index}.file`, issues);
    if (anchor?.projectId && anchor.projectId !== value.projectId) {
      addIssue(issues, `anchors.${index}.projectId`, 'must match manifest projectId');
    }
    if (!Array.isArray(anchor?.applicableSpaceTypes) || anchor.applicableSpaceTypes.length === 0) {
      addIssue(issues, `anchors.${index}.applicableSpaceTypes`, 'must contain at least one space type');
    }
    if (!Array.isArray(anchor?.roles) || anchor.roles.length === 0) {
      addIssue(issues, `anchors.${index}.roles`, 'must contain at least one role');
    }
  }
  if (!isObject(value.influenceCaps)) addIssue(issues, 'influenceCaps', 'must be an object');
  for (const [dimension, cap] of Object.entries(value.influenceCaps || {})) {
    if (typeof cap !== 'number' || cap < 0 || cap > 1) {
      addIssue(issues, `influenceCaps.${dimension}`, 'must be a number from 0 to 1');
    }
  }
  if (value.influenceCaps?.spatialScale !== 0) {
    addIssue(issues, 'influenceCaps.spatialScale', 'must be exactly 0');
  }
  return finish('AnchorManifest', value, issues);
}

export function validateSpatialEvaluationProfile(input) {
  const value = isObject(input) ? structuredClone(input) : {};
  const issues = [];
  requireString(value.id, 'id', issues);
  requireVersion(value.version, 'version', issues);
  if (!['global', 'project'].includes(value.scope)) addIssue(issues, 'scope', 'must be global or project');
  if (value.scope === 'project') requireString(value.projectId, 'projectId', issues);
  if (!Array.isArray(value.dimensions) || value.dimensions.length === 0) {
    addIssue(issues, 'dimensions', 'must contain at least one dimension');
  }
  return finish('SpatialEvaluationProfile', value, issues);
}

export function assertSpatialSchema(result) {
  if (result.valid) return result.value;
  const detail = result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
  throw Object.assign(new Error(`${result.schema} validation failed: ${detail}`), {
    code: 'SPATIAL_SCHEMA_INVALID',
    schema: result.schema,
    issues: result.issues,
  });
}

