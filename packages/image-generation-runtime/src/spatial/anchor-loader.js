import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_ASSET_ROOT_URL = new URL('../../../../', import.meta.url);
const LARGE_SPACE_ALLOWED_ROLES = new Set([
  'brand_integration',
  'material_and_lighting',
  'architectural_skin',
  'decorative_density',
]);

export class CrossProjectAnchorAccessError extends Error {
  constructor(currentProjectId, anchorProjectId) {
    super(`Project ${currentProjectId} cannot load anchors owned by ${anchorProjectId}.`);
    this.name = 'CrossProjectAnchorAccessError';
    this.code = 'CROSS_PROJECT_ANCHOR_ACCESS';
    this.currentProjectId = currentProjectId;
    this.anchorProjectId = anchorProjectId;
  }
}

function asDirectoryUrl(value) {
  if (!value) return DEFAULT_ASSET_ROOT_URL;
  if (value instanceof URL) return value;
  const resolved = path.resolve(value);
  return new URL(`${pathToFileURL(resolved).href.replace(/\/$/u, '')}/`);
}

function normalizeSpaceType(spaceType) {
  const value = String(spaceType || '').trim().toLowerCase();
  if (value === 'large lobby') return 'large_lobby';
  return value || 'overview';
}

function assertProjectAccess({ currentProjectId, manifest, referenceProjectId, allowCrossProjectReference }) {
  if (manifest.projectId === currentProjectId) return;
  const explicitlyAuthorized = allowCrossProjectReference === true
    && referenceProjectId === manifest.projectId;
  if (!explicitlyAuthorized) throw new CrossProjectAnchorAccessError(currentProjectId, manifest.projectId);
}

export function resolveAnchorFile(anchor, options = {}) {
  return fileURLToPath(new URL(anchor.file.replace(/\\/gu, '/'), asDirectoryUrl(options.assetRoot)));
}

export function verifyAnchorAsset(anchor, options = {}) {
  const file = resolveAnchorFile(anchor, options);
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (anchor.sha256 && sha256 !== anchor.sha256) {
    throw Object.assign(new Error(`Anchor checksum mismatch: ${anchor.id}`), {
      code: 'ANCHOR_CHECKSUM_MISMATCH',
      anchorId: anchor.id,
      expected: anchor.sha256,
      actual: sha256,
    });
  }
  return { file, sha256, size: bytes.length };
}

function candidateIds(spaceType) {
  if (spaceType === 'storefront' || spaceType === 'entrance') return ['JZMX-SGR-01-Exterior'];
  if (spaceType === 'reception' || spaceType === 'lobby' || spaceType === 'large_lobby') {
    return ['JZMX-SGR-02-Reception'];
  }
  return [];
}

export function selectProjectAnchors(input) {
  const spaceType = normalizeSpaceType(input.spaceType);
  assertProjectAccess(input);
  const requestedIds = input.requestedAnchorIds?.length
    ? [...new Set(input.requestedAnchorIds)]
    : candidateIds(spaceType);
  const selected = requestedIds.map((id) => {
    const candidates = input.manifest.anchors
      .filter((anchor) => anchor.id === id)
      .sort((left, right) => (right.version || 0) - (left.version || 0));
    const anchor = candidates[0];
    if (!anchor) {
      throw Object.assign(new Error(`Unknown project Anchor: ${id}`), {
        code: 'PROJECT_ANCHOR_NOT_FOUND',
        anchorId: id,
      });
    }
    if (anchor.projectId && anchor.projectId !== input.manifest.projectId) {
      throw new CrossProjectAnchorAccessError(input.manifest.projectId, anchor.projectId);
    }
    if (!anchor.applicableSpaceTypes.includes(spaceType)) {
      throw Object.assign(new Error(`Anchor ${id} does not apply to ${spaceType}.`), {
        code: 'ANCHOR_SPACE_TYPE_MISMATCH',
        anchorId: id,
        spaceType,
      });
    }
    const largeSpace = spaceType === 'large_lobby';
    const allowedRoles = largeSpace
      ? anchor.roles.filter((role) => LARGE_SPACE_ALLOWED_ROLES.has(role))
      : [...anchor.roles];
    return {
      ...anchor,
      allowedRoles,
      deniedRoles: largeSpace
        ? ['spatial_scale', 'functional_layout', 'composition', 'reception_expression']
        : ['spatial_scale'],
      influenceCaps: {
        ...input.manifest.influenceCaps,
        spatialScale: 0,
        ...(largeSpace ? { functionalLayout: 0, composition: 0 } : {}),
      },
    };
  });
  return { projectId: input.currentProjectId, spaceType, anchors: selected };
}

export function loadProjectAnchors(input) {
  const selection = selectProjectAnchors(input);
  return {
    ...selection,
    anchors: selection.anchors.map((anchor) => ({
      ...anchor,
      asset: verifyAnchorAsset(anchor, input),
    })),
  };
}

export function anchorSignalsFromSelection(selection) {
  const signals = {};
  const roleToDimension = {
    brand_atmosphere: 'brandAtmosphere',
    brand_integration: 'brandIntegration',
    material_and_lighting: 'materialAndLighting',
    color_relationship: 'colorRelationship',
    architectural_skin: 'architecturalSkin',
    decorative_density: 'decorativeDensity',
    reception_expression: 'receptionExpression',
  };
  for (const anchor of selection?.anchors || []) {
    for (const role of anchor.allowedRoles || []) {
      const dimension = roleToDimension[role];
      if (!dimension) continue;
      signals[dimension] ||= [];
      signals[dimension].push(`calibrate ${role} from ${anchor.id}`);
    }
  }
  return signals;
}
