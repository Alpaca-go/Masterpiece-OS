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

  // Extract metadata if present
  const metadata = anchorSignals.__metadata || {};
  const signalSource = metadata.source || 'golden_anchor';

  for (const [dimension, value] of Object.entries(anchorSignals || {})) {
    // Skip metadata field
    if (dimension === '__metadata') continue;

    const cap = manifest?.influenceCaps?.[dimension] ?? 0;
    const targetPath = ANCHOR_DIMENSION_PATHS[dimension] || `anchorCalibration.${dimension}`;
    const protectedByLock = [...protectedPaths].some((path) =>
      targetPath === path || targetPath.startsWith(`${path}.`) || path.startsWith(`${targetPath}.`));
    if (cap <= 0 || protectedByLock) {
      conflicts.push({
        field: targetPath,
        attemptedValue: value,
        attemptedSource: signalSource,
        result: 'rejected',
        reason: cap <= 0 ? 'influence_cap_zero' : 'protected_by_lock',
      });
      continue;
    }
    accepted[dimension] = { value, influenceCap: cap };
    provenance.push({
      field: `anchorCalibration.${dimension}`,
      value,
      source: signalSource,
      mergeMode: 'suggest',
      influenceCap: cap,
      overriddenBy: null,
    });
  }
  return { accepted, conflicts, provenance };
}

/**
 * Convert canon's anchorDerivedSignals into anchor signal format
 * compatible with resolveAnchorInfluence().
 */
function buildAnchorSignalsFromCanonSignals(anchorDerivedSignals) {
  const signals = {};
  if (!anchorDerivedSignals) return signals;

  const dimensionMap = {
    brand_atmosphere: 'brandAtmosphere',
    brand_integration: 'brandIntegration',
    material_and_lighting: 'materialAndLighting',
    color_relationship: 'colorRelationship',
    architectural_skin: 'architecturalSkin',
    decorative_density: 'decorativeDensity',
    reception_expression: 'receptionExpression',
  };

  for (const [key, derivedSignals] of Object.entries(anchorDerivedSignals)) {
    const canonicalKey = dimensionMap[key] || key;
    if (!Array.isArray(derivedSignals) || derivedSignals.length === 0) continue;
    const primarySignal = derivedSignals[0];
    if (!primarySignal?.value) continue;
    // Include the actual aesthetic value in the signal
    signals[canonicalKey] = [`calibrate ${key} = ${primarySignal.value} (source: canon_DNA, originally extracted from anchor)`];
  }

  return signals;
}

export function compileSpatialContext(input = {}) {
  const foundation = assertSpatialSchema(validateSpatialFoundation({
    spaceType: input.task?.sceneRole || input.task?.subtype || 'overview',
    ...input.spatialFoundation,
  }));
  const originalFoundation = structuredClone(foundation);
  const projectCanon = input.projectCanon || null;
  const verticalArchetype = input.verticalArchetype || null;

  // Resolve anchor influence from physical anchor signals
  let anchor = resolveAnchorInfluence({
    anchorSignals: input.anchorSignals,
    manifest: input.anchorManifest,
    foundation,
  });

  // Fallback: if no physical anchor signals were accepted but canon has
  // anchorDerivedSignals, use those as a secondary signal source
  if (Object.keys(anchor.accepted).length === 0 && projectCanon?.anchorDerivedSignals) {
    const canonSignals = buildAnchorSignalsFromCanonSignals(projectCanon.anchorDerivedSignals);
    const canonAnchor = resolveAnchorInfluence({
      anchorSignals: canonSignals,
      manifest: input.anchorManifest,
      foundation,
    });
    if (Object.keys(canonAnchor.accepted).length > 0) {
      anchor = canonAnchor;
      // Mark provenance as canon-derived
      for (const entry of anchor.provenance) {
        entry.source = 'canon_dna_fallback';
      }
    }
  }

  const provenance = [];
  recordObjectProvenance(provenance, input.task || {}, 'current_task', 'lock', 'task');
  recordObjectProvenance(provenance, foundation, 'spatial_foundation', 'lock', 'spatialFoundation');
  recordObjectProvenance(provenance, projectCanon?.lockedAssets, 'project_canon:locked_assets', 'lock', 'lockedAssets');
  recordObjectProvenance(provenance, projectCanon, 'project_visual_canon', 'constrain', 'projectCanon');
  recordObjectProvenance(provenance, verticalArchetype, `vertical_archetype:${verticalArchetype?.id || 'none'}`, 'bias', 'verticalArchetype');
  provenance.push(...anchor.provenance);
  const replacedSourceSkinConflicts = (input.structureReferences || []).flatMap((item) => [
    'materialPalette',
    'ceilingDesignLanguage',
    'lightingStyle',
    'brandWallStyle',
    'decorativeStyle',
    'medicalAestheticTone',
  ].map((field) => ({
    field: `sourceSpaceVisualSkin.${field}`,
    attemptedValue: `inherited_from:${item.sourceAssetId || item.assetId}`,
    attemptedSource: 'source_space_reference',
    result: 'replaced',
    reason: 'structure_reference_has_zero_visual_skin_authority',
    overriddenBy: 'project_visual_canon',
  })));

  const foundationSummary = cleanList(
    foundation.architectureAesthetic && `architecture ${summarizeObject(foundation.architectureAesthetic)}`,
    foundation.spatialScale && `scale ${summarizeObject(foundation.spatialScale)}`,
    foundation.functionalZoning && `zoning ${summarizeObject(foundation.functionalZoning)}`,
    foundation.circulation && `circulation ${summarizeObject(foundation.circulation)}`,
    foundation.cameraIntent && `camera ${summarizeObject(foundation.cameraIntent)}`,
  );
  const canonSummary = projectCanon ? cleanList(
    `core atmosphere ${(projectCanon.coreAtmosphere || []).join(', ')}`,
    `dominant surfaces ${(projectCanon.dominantSurfaces || []).join(', ')}`,
    `architectural skin ${summarizeObject(projectCanon.architecturalSkin)}`,
    `lighting language ${summarizeObject(projectCanon.lightingLanguage)}`,
    `brand integration ${summarizeObject(projectCanon.brandIntegration)}`,
    `decorative system ${summarizeObject(projectCanon.decorativeSystem)}`,
    `reception expression ${summarizeObject(projectCanon.receptionExpression)}`,
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

  const signage = projectCanon?.brandSignageContract;
  const logoScaleSummary = signage ? cleanList(
    `Logo symbol wall-height ratio: minimum ${signage.logoSymbol?.wallHeightRatio?.min}, preferred ${signage.logoSymbol?.wallHeightRatio?.preferred}, hard maximum ${signage.logoSymbol?.wallHeightRatio?.max}.`,
    `Full lockup wall-width ratio: minimum ${signage.fullLockup?.wallWidthRatio?.min}, preferred ${signage.fullLockup?.wallWidthRatio?.preferred}, hard maximum ${signage.fullLockup?.wallWidthRatio?.max}.`,
    `Signage prominence ${signage.prominence}; relief ${signage.reliefDepth?.mode}; halo intensity ${signage.lighting?.haloIntensity}; overexposed edge allowed ${signage.lighting?.allowOverexposedEdge}.`,
    `Forbidden signage behaviours: ${(signage.forbidden || []).join(', ')}.`,
    'The viewer must read spatial quality first and recognize the brand second; the Logo must never become the primary sculpture or dominate the first read.',
  ) : [];

  const promptSections = cleanList(
    `[CURRENT TASK]\nSpace type ${input.task?.sceneRole || input.task?.subtype || foundation.spaceType}; shot ${input.task?.shot || foundation.cameraIntent?.role || 'task_defined'}; aspect ratio ${input.task?.aspectRatio || 'task_defined'}; deliver a formal project rendering.`,
    foundationSummary.length && `[STRUCTURE FOUNDATION — PRESERVE]\n${foundationSummary.join('\n')}${input.structureReferences?.length ? `\nPreserve only room envelope, spatial scale, ceiling height, depth, apertures, functional zoning, circulation, camera view and major fixture positions from: ${input.structureReferences.map((item) => item.assetId).join(', ')}.` : ''}`,
    `[VISUAL SKIN — REPLACE]\nReplace all source-space materials, colours, ceiling expression, lighting style, brand wall, decorative language, logos and generic medical/futuristic tone.${input.structureReferences?.length ? ' The source image has zero visual-skin authority.' : ''}`,
    projectCanon?.lockedAssets && `[LOCKED BRAND ASSETS]\n${summarizeObject(projectCanon.lockedAssets)}`,
    canonSummary.length && `[${projectCanon.promptSectionLabel || `PROJECT VISUAL CANON V${projectCanon.version || 1}`}]\n${canonSummary.join('\n')}`,
    archetypeSummary.length && `[VERTICAL ARCHETYPE BIAS]\n${archetypeSummary.join('\n')}`,
    anchorSummary.length && `[GOLDEN ANCHOR CALIBRATION]\n${anchorSummary.join('\n')}`,
    logoScaleSummary.length && `[LOGO SCALE CONTRACT]\n${logoScaleSummary.join('\n')}`,
    input.projectExclusions?.generationExclusions?.length
      && `[PROJECT NEGATIVE GUARDS]\n${input.projectExclusions.generationExclusions.join('; ')}`,
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
    conflicts: [...anchor.conflicts, ...replacedSourceSkinConflicts],
    provenance,
    promptSections,
    negativeRules: cleanList(input.projectExclusions?.generationExclusions),
  };
}
