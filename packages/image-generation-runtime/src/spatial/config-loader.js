import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  assertSpatialSchema,
  validateAnchorManifest,
  validateProjectVisualCanon,
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

function projectConfigUrl(projectId, file, options = {}) {
  assertSafeId(projectId, 'projectId');
  return new URL(`projects/${projectId}/${file}`, asDirectoryUrl(options.configRoot));
}

export function loadProjectVisualCanon(projectId, options = {}) {
  return assertSpatialSchema(validateProjectVisualCanon(
    readJson(projectConfigUrl(projectId, 'project-visual-canon-v1.json', options)),
  ));
}

export function loadProjectAnchorManifest(projectId, options = {}) {
  return assertSpatialSchema(validateAnchorManifest(
    readJson(projectConfigUrl(projectId, 'anchor-manifest-v1.json', options)),
  ));
}

export function loadProjectGenerationProfile(projectId, options = {}) {
  return readJson(projectConfigUrl(projectId, 'generation-profile-v1.json', options));
}

export function loadProjectExclusions(projectId, options = {}) {
  return readJson(projectConfigUrl(projectId, 'project-exclusions-v1.json', options));
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
