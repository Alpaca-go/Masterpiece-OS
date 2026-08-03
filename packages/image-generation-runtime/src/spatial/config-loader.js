import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertSpatialSchema,
  validateAnchorManifest,
  validateProjectVisualCanon,
  validateSpatialEvaluationProfile,
} from './schemas.js';

const DEFAULT_CONFIG_ROOT_URL = new URL('../../config/spatial/', import.meta.url);
const SAFE_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

function assertSafeId(value, label) {
  if (!SAFE_ID.test(value)) {
    throw Object.assign(new Error(`${label} must be a lowercase kebab-case identifier.`), {
      code: 'SPATIAL_CONFIG_ID_INVALID',
    });
  }
}

function asDirectoryUrl(value) {
  if (!value) return DEFAULT_CONFIG_ROOT_URL;
  if (value instanceof URL) return value;
  const resolved = path.resolve(value);
  return new URL(`${pathToFileURL(resolved).href.replace(/\/$/u, '')}/`);
}

function readJson(url) {
  return JSON.parse(fs.readFileSync(fileURLToPath(url), 'utf8'));
}

function readLatestProjectJson(projectId, basename, options = {}) {
  for (const version of [2, 1]) {
    const url = projectConfigUrl(projectId, `${basename}-v${version}.json`, options);
    if (fs.existsSync(fileURLToPath(url))) return readJson(url);
  }
  throw Object.assign(new Error(`Missing spatial project config: ${basename}`), {
    code: 'ENOENT',
  });
}

function projectConfigUrl(projectId, file, options = {}) {
  assertSafeId(projectId, 'projectId');
  return new URL(`projects/${projectId}/${file}`, asDirectoryUrl(options.configRoot));
}

export function loadProjectVisualCanon(projectId, options = {}) {
  return assertSpatialSchema(validateProjectVisualCanon(
    readLatestProjectJson(projectId, 'project-visual-canon', options),
  ));
}

export function loadProjectAnchorManifest(projectId, options = {}) {
  return assertSpatialSchema(validateAnchorManifest(
    readJson(projectConfigUrl(projectId, 'anchor-manifest-v1.json', options)),
  ));
}

export function loadProjectGenerationProfile(projectId, options = {}) {
  return readLatestProjectJson(projectId, 'generation-profile', options);
}

export function loadProjectExclusions(projectId, options = {}) {
  return readLatestProjectJson(projectId, 'project-exclusions', options);
}

export function isVerticalSpatialArchetypeEnabled(bundle) {
  const explicit = bundle?.generationProfile?.verticalSpatialArchetype?.enabled;
  if (typeof explicit === 'boolean') return explicit;
  return Boolean(bundle?.generationProfile?.verticalArchetypeId);
}

export function loadGlobalSpaceEvaluationProfile(options = {}) {
  const profile = readJson(new URL(
    'evaluators/global-space-quality-v1.json',
    asDirectoryUrl(options.configRoot),
  ));
  return assertSpatialSchema(validateSpatialEvaluationProfile(profile));
}

export function loadProjectSpaceEvaluationProfile(projectId, options = {}) {
  assertSafeId(projectId, 'projectId');
  let profile;
  for (const version of [2, 1]) {
    const url = new URL(
      `evaluators/${projectId}-acceptance-v${version}.json`,
      asDirectoryUrl(options.configRoot),
    );
    if (fs.existsSync(fileURLToPath(url))) {
      profile = readJson(url);
      break;
    }
  }
  if (!profile) throw Object.assign(new Error(`Missing project evaluator: ${projectId}`), {
    code: 'ENOENT',
  });
  const validated = assertSpatialSchema(validateSpatialEvaluationProfile(profile));
  if (validated.projectId !== projectId) {
    throw Object.assign(new Error('Project evaluation profile belongs to another project.'), {
      code: 'CROSS_PROJECT_EVALUATION_PROFILE',
    });
  }
  return validated;
}

export function collectProjectSignatureTerms(canon) {
  return [
    ...Object.values(canon.lockedAssets || {}).flat(Infinity),
    ...(canon.projectPalette?.accent || []),
    ...(canon.signatureMotifs || []),
    ...(canon.projectMaterialAccents || []),
  ].filter((value) => typeof value === 'string' && value.trim());
}

export function loadSpatialProjectBundle(projectId, options = {}) {
  const projectCanon = loadProjectVisualCanon(projectId, options);
  return {
    projectId,
    projectCanon,
    anchorManifest: loadProjectAnchorManifest(projectId, options),
    generationProfile: loadProjectGenerationProfile(projectId, options),
    projectExclusions: loadProjectExclusions(projectId, options),
    projectSignatureTerms: collectProjectSignatureTerms(projectCanon),
  };
}
