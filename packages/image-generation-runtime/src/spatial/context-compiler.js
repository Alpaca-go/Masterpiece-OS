import { assertSpatialSchema, validateSpatialFoundation } from './schemas.js';

const PROTECTED_PATHS = Object.freeze({
  architecture: 'architectureAesthetic',
  spatialScale: 'spatialScale',
  functionalZoning: 'functionalZoning',
  circulation: 'circulation',
  atmosphereCore: 'atmosphereIntent',
  cameraRole: 'cameraIntent.role',
});

const ANCHOR_DIMENSION_PATHS = Object.freeze({
  architecturalLanguage: 'architectureAesthetic',
  spatialScale: 'spatialScale',
  functionalLayout: 'functionalZoning',
  composition: 'cameraIntent',
});

function cleanList(...values) {
  return [...new Set(values.flat(Infinity)
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean))];
}

function getPath(object, path) {
  return path.split('.').reduce((value, key) => value?.[key], object);
}

function sameValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function summarizeObject(value) {
  if (!value || typeof value !== 'object') return cleanList(value).join(', ');
  return Object.entries(value)
    .filter(([, item]) => item !== undefined && item !== null && item !== '')
    .map(([key, item]) => `${key}=${Array.isArray(item) ? item.join('/') : typeof item === 'object' ? JSON.stringify(item) : item}`)
    .join('; ');
}

function recordObjectProvenance(provenance, object, source, mergeMode, prefix = '') {
  for (const [key, value] of Object.entries(object || {})) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      recordObjectProvenance(provenance, value, source, mergeMode, field);
    } else {
      provenance.push({ field, value, source, mergeMode, overriddenBy: null });
    }
  }
}

function lockedFoundationPaths(foundation) {
  return Object.entries(foundation.preservation || {})
    .filter(([, mode]) => mode === 'lock')
    .map(([key]) => PROTECTED_PATHS[key])
    .filter(Boolean);
}

export function assertProtectedFieldsUnchanged(originalFoundation, compiledFoundation) {
  const changed = lockedFoundationPaths(originalFoundation).filter((path) =>
    !sameValue(getPath(originalFoundation, path), getPath(compiledFoundation, path)));
  if (changed.length) {
    throw Object.assign(new Error(`Protected Spatial Foundation fields changed: ${changed.join(', ')}`), {
      code: 'SPATIAL_FOUNDATION_OVERRIDDEN',
      changed,
    });
  }
  return true;
}

export function resolveAnchorInfluence({ anchorSignals = {}, manifest, foundation }) {
  const accepted = {};
  const conflicts = [];
  const provenance = [];
  const protectedPaths = new Set([
    ...lockedFoundationPaths(foundation),
    ...(manifest?.forbiddenOverrides || []).map((path) =>
      path.replace(/^spatialFoundation\./u, '')),
  ]);
  for (const [dimension, value] of Object.entries(anchorSignals || {})) {
    const cap = manifest?.influenceCaps?.[dimension] ?? 0;
    const targetPath = ANCHOR_DIMENSION_PATHS[dimension] || `anchorCalibration.${dimension}`;
    const protectedByLock = [...protectedPaths].some((path) =>
      targetPath === path || targetPath.startsWith(`${path}.`) || path.startsWith(`${targetPath}.`));
    if (cap <= 0 || protectedByLock) {
      conflicts.push({
        field: targetPath,
        attemptedValue: value,
        attemptedSource: 'golden_anchor',
        result: 'rejected',
        reason: cap <= 0 ? 'influence_cap_zero' : 'protected_by_lock',
      });
      continue;
    }
    accepted[dimension] = { value, influenceCap: cap };
    provenance.push({
      field: `anchorCalibration.${dimension}`,
      value,
      source: 'golden_anchor',
      mergeMode: 'suggest',
      influenceCap: cap,
      overriddenBy: null,
    });
  }
  return { accepted, conflicts, provenance };
}

export function compileSpatialContext(input = {}) {
  const foundation = assertSpatialSchema(validateSpatialFoundation({
    spaceType: input.task?.sceneRole || input.task?.subtype || 'overview',
    ...input.spatialFoundation,
  }));
  const originalFoundation = structuredClone(foundation);
  const projectCanon = input.projectCanon || null;
  const verticalArchetype = input.verticalArchetype || null;
  const anchor = resolveAnchorInfluence({
    anchorSignals: input.anchorSignals,
    manifest: input.anchorManifest,
    foundation,
  });
  const provenance = [];
  recordObjectProvenance(provenance, input.task || {}, 'current_task', 'lock', 'task');
  recordObjectProvenance(provenance, foundation, 'spatial_foundation', 'lock', 'spatialFoundation');
  recordObjectProvenance(provenance, projectCanon?.lockedAssets, 'project_canon:locked_assets', 'lock', 'lockedAssets');
  recordObjectProvenance(provenance, projectCanon, 'project_visual_canon', 'constrain', 'projectCanon');
  recordObjectProvenance(provenance, verticalArchetype, `vertical_archetype:${verticalArchetype?.id || 'none'}`, 'bias', 'verticalArchetype');
  provenance.push(...anchor.provenance);

  const foundationSummary = cleanList(
    foundation.architectureAesthetic && `architecture ${summarizeObject(foundation.architectureAesthetic)}`,
    foundation.spatialScale && `scale ${summarizeObject(foundation.spatialScale)}`,
    foundation.functionalZoning && `zoning ${summarizeObject(foundation.functionalZoning)}`,
    foundation.circulation && `circulation ${summarizeObject(foundation.circulation)}`,
    foundation.cameraIntent && `camera ${summarizeObject(foundation.cameraIntent)}`,
  );
  const canonSummary = projectCanon ? cleanList(
    `palette ${summarizeObject(projectCanon.projectPalette)}`,
    `signature motifs ${(projectCanon.signatureMotifs || []).join(', ')}`,
    `material accents ${(projectCanon.projectMaterialAccents || []).join(', ')}`,
    `rules ${summarizeObject(projectCanon.projectRules)}`,
  ) : [];
  const archetypeSummary = verticalArchetype ? cleanList(
    `atmosphere ${summarizeObject(verticalArchetype.atmosphereAxes)}`,
    `materials ${summarizeObject(verticalArchetype.materialBehavior)}`,
    `lighting ${summarizeObject(verticalArchetype.lightingBehavior)}`,
    `brand integration ${summarizeObject(verticalArchetype.brandIntegrationStrategy)}`,
  ) : [];
  const anchorSummary = Object.entries(anchor.accepted).map(([dimension, item]) =>
    `${dimension} (cap ${item.influenceCap}): ${summarizeObject(item.value)}`);
  if (Object.keys(anchor.accepted).length) {
    anchorSummary.push('The reference calibrates only authorized material, lighting, brand integration and decorative restraint. Do not inherit room size, ceiling height, spatial depth, functional layout, compact reception scale or composition. Preserve the locked large-space intention.');
  }

  const promptSections = cleanList(
    input.structureReferences?.length && `[SOURCE SPACE STRUCTURE REFERENCE]\n${input.structureReferences.map((item, index) =>
      `Reference ${index + 1} preserves only room envelope, spatial scale, ceiling height, depth, apertures, functional zoning, circulation, camera view and major fixture positions from ${item.assetId}. It has zero authority over material palette, ceiling design, lighting style, brand wall, decorative language or medical tone.`).join('\n')}`,
    foundationSummary.length && `[SPATIAL FOUNDATION — DO NOT OVERRIDE]\n${foundationSummary.join('\n')}`,
    projectCanon?.lockedAssets && `[LOCKED BRAND ASSETS]\n${summarizeObject(projectCanon.lockedAssets)}`,
    canonSummary.length && `[PROJECT VISUAL CANON]\n${canonSummary.join('\n')}`,
    archetypeSummary.length && `[VERTICAL ARCHETYPE BIAS]\n${archetypeSummary.join('\n')}`,
    anchorSummary.length && `[ANCHOR CALIBRATION]\n${anchorSummary.join('\n')}`,
    input.projectExclusions?.generationExclusions?.length
      && `[NEGATIVE / RISK GUARDS]\n${input.projectExclusions.generationExclusions.join('; ')}`,
    '[OUTPUT CONTRACT]\nPhotorealistic, buildable, proposal-ready spatial rendering.',
  );
  assertProtectedFieldsUnchanged(originalFoundation, foundation);
  return {
    schemaVersion: '1.0',
    foundation,
    foundationSnapshot: originalFoundation,
    projectCanon,
    verticalArchetype,
    anchorCalibration: anchor.accepted,
    selectedAnchors: (input.selectedAnchors?.anchors || []).map((item) => ({
      id: item.id,
      assetId: item.assetId,
      projectId: item.projectId,
      version: item.version,
      file: item.file,
      sha256: item.sha256,
      allowedRoles: item.allowedRoles,
      deniedRoles: item.deniedRoles,
      projectRelativePath: item.projectRelativePath,
    })),
    structureReferences: (input.structureReferences || []).map((item) => ({
      assetId: item.assetId,
      sourceAssetId: item.sourceAssetId,
      projectRelativePath: item.projectRelativePath,
      sha256: item.sha256,
      preprocessing: item.preprocessing,
      responsibility: 'structure_only',
    })),
    conflicts: anchor.conflicts,
    provenance,
    promptSections,
    negativeRules: cleanList(input.projectExclusions?.generationExclusions),
  };
}
