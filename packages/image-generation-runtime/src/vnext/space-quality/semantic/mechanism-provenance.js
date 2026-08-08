// Mechanism Provenance Trace
//
// R8.5.1 §4 — every spatial mechanism that reaches the Architecture IR must
// carry a provenance record:
//
//   { id, sourceField, sourcePath, sourceRawText, classification,
//     compiledAction, includedInArchitecturePrompt }
//
// This module produces that trace. The `sourcePath` is the dotted V5 path
// (e.g. "mediaTranslations.spatial.signatureSpatialMechanism[0]") and
// `sourceField` is the leaf name. The classification is the SAME scheme used
// by the semantic separator, so the audit can pivot on either signal.
//
// This is intentionally a thin wrapper: callers iterate over the raw V5
// fields, build a `rawMechanism` for each item, and the trace records exactly
// what the compiler saw.

import { classifyPhrase, SEMANTIC_CLASS } from './separate-space-semantics.js';
import { normalizeArchitectureSemantics } from './normalize-architecture-semantics.js';

let _idCounter = 0;
function nextId() {
  _idCounter += 1;
  return `mech-${String(_idCounter).padStart(2, '0')}`;
}

export function resetMechanismIdCounter() {
  _idCounter = 0;
}

/**
 * Build a provenance record for a single raw phrase entering the architecture
 * pipeline.
 *
 * @param {object} input
 * @param {string} input.raw
 * @param {string} input.sourceField       leaf V5 field name
 * @param {string} input.sourcePath        full dotted V5 path
 * @param {string} [input.sourceGroup]     parent path segment, e.g. "mediaTranslations.spatial"
 * @param {string} [input.compiledAction]  what the compiler emitted for this item
 * @returns {object} mechanism record
 */
export function traceMechanism({ raw, sourceField, sourcePath, sourceGroup, compiledAction = '' }) {
  const analysis = classifyPhrase(raw, sourceField);
  const normalized = normalizeArchitectureSemantics(raw, sourceField);
  return {
    id: nextId(),
    sourceField: sourceField || '',
    sourcePath: sourcePath || '',
    sourceGroup: sourceGroup || '',
    sourceRawText: String(raw || '').trim(),
    classification: analysis.classification,
    motifHits: analysis.motifHits,
    colorHits: analysis.colorHits,
    archHits: analysis.archHits,
    propertyHits: analysis.propertyHits,
    metaphor: analysis.metaphor,
    accent: analysis.accent,
    geometryAction: analysis.geometryAction,
    normalizedText: normalized.normalized,
    strip: normalized.stripped,
    compiledAction: compiledAction || normalized.normalized || '',
    includedInArchitecturePrompt: normalized.includedInArchitecturePrompt,
  };
}

/**
 * Audit every spatial field in a V5 packet. Returns a flat list of mechanism
 * records plus a summary of which sources entered Architecture IR.
 */
export function auditMechanismSources(packet) {
  resetMechanismIdCounter();
  const spatial = packet?.mediaTranslations?.spatial || {};
  const projectFacts = packet?.projectFacts || {};
  const creativeDecision = packet?.creativeDecision || {};
  const colorSystem = packet?.colorSystem || {};

  const records = [];

  function pushList(value, field, group) {
    if (!Array.isArray(value)) return;
    for (let i = 0; i < value.length; i += 1) {
      const text = value[i];
      if (typeof text !== 'string' || !text.trim()) continue;
      records.push(traceMechanism({
        raw: text,
        sourceField: field,
        sourcePath: `mediaTranslations.spatial.${field}[${i}]`,
        sourceGroup: 'mediaTranslations.spatial',
      }));
    }
  }

  function pushScalar(value, field, group, path) {
    if (typeof value !== 'string' || !value.trim()) return;
    records.push(traceMechanism({
      raw: value,
      sourceField: field,
      sourcePath: path,
      sourceGroup: group,
    }));
  }

  pushList(spatial.signatureSpatialMechanism, 'signatureSpatialMechanism');
  pushList(spatial.brandRoleManifestation, 'brandRoleManifestation');
  pushList(spatial.brandIntegration, 'brandIntegration');
  pushList(spatial.structureLanguage, 'structureLanguage');
  pushList(spatial.functionalNetwork, 'functionalNetwork');
  pushList(spatial.functionalRelationships, 'functionalRelationships');
  pushList(spatial.sceneProgram, 'sceneProgram');
  pushList(spatial.peopleBehavior, 'peopleBehavior');
  pushList(spatial.mustBeVisible, 'mustBeVisible');
  pushList(spatial.positiveDifferentiators, 'positiveDifferentiators');
  pushScalar(spatial.spatialConcept, 'spatialConcept', 'mediaTranslations.spatial', 'mediaTranslations.spatial.spatialConcept');

  // projectFacts / creativeDecision (treated as top-level provenance)
  if (Array.isArray(creativeDecision.targetWorldview)) {
    for (let i = 0; i < creativeDecision.targetWorldview.length; i += 1) {
      const text = creativeDecision.targetWorldview[i];
      if (typeof text === 'string' && text.trim()) {
        records.push(traceMechanism({
          raw: text,
          sourceField: 'targetWorldview',
          sourcePath: `creativeDecision.targetWorldview[${i}]`,
          sourceGroup: 'creativeDecision',
        }));
      }
    }
  }
  if (typeof creativeDecision.uniqueUpgradeThesis === 'string' && creativeDecision.uniqueUpgradeThesis.trim()) {
    pushScalar(creativeDecision.uniqueUpgradeThesis, 'uniqueUpgradeThesis', 'creativeDecision', 'creativeDecision.uniqueUpgradeThesis');
  }

  if (colorSystem && Array.isArray(colorSystem.primary)) {
    for (let i = 0; i < colorSystem.primary.length; i += 1) {
      const c = colorSystem.primary[i];
      if (c && typeof c === 'object' && typeof c.name === 'string') {
        records.push(traceMechanism({
          raw: `${c.name}${c.role ? ` — ${c.role}` : ''}`,
          sourceField: 'colorSystem.primary',
          sourcePath: `colorSystem.primary[${i}].name`,
          sourceGroup: 'colorSystem',
        }));
      }
    }
  }

  const summary = {
    total: records.length,
    byClassification: {},
    includedInArchitecturePrompt: 0,
    motifCount: 0,
    colorGeometryRisk: 0,
    decorativeIdentityCount: 0,
  };
  for (const r of records) {
    summary.byClassification[r.classification] = (summary.byClassification[r.classification] || 0) + 1;
    if (r.includedInArchitecturePrompt) summary.includedInArchitecturePrompt += 1;
    if (r.motifHits.length > 0) summary.motifCount += 1;
    if (r.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) summary.colorGeometryRisk += 1;
    if (r.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY) summary.decorativeIdentityCount += 1;
  }
  return { records, summary };
}

export const MECHANISM_PROVENANCE_VERSION = '1.0.0';
