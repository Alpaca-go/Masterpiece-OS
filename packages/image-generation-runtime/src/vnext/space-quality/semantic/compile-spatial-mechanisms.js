// compile-spatial-mechanisms
//
// R8.5.1 §14 — the new compiler pipeline:
//
//   raw V5 spatial fields
//     → separate-space-semantics
//     → normalize-architecture-semantics (strip motif, preserve spatial property)
//     → derive-spatial-mechanisms  (this module: assemble architecture IR + brand IR)
//     → rewrite-architecture-semantics (R8.5 redirected: prop → English action verbs)
//     → phase9b-space-compiler consumes `architectureActions` as the
//       sole architecture mechanism input rendered as action-verb bullets;
//       brand motifs go to Brand Translation
//
// This module is the integration point. It does not call the model, does not
// read a V5 schema, and does not write any persisted IR. Its output is the
// semantic IR consumed by the Phase 9B production compiler.

import { auditMechanismSources } from './mechanism-provenance.js';
import { SEMANTIC_CLASS } from './separate-space-semantics.js';
import { normalizeArchitectureSemantics } from './normalize-architecture-semantics.js';
import { rewriteArchitectureSemantics } from './rewrite-architecture-semantics.js';

/**
 * Build the architecture / brand split IR from a V5 packet.
 * @param {object} packet V5 VisualDecisionPacket
 * @returns {{
 *   architectureSemantics: object[],
 *   architectureActions: string[],
 *   architectureRewrite: object,
 *   brandMotifSemantics: object[],
 *   colorAccentSemantics: object[],
 *   functionalSemantics: object[],
 *   decorativeIdentitySemantics: object[],
 *   mechanisms: object[],   // alias of architectureSemantics (legacy-friendly)
 *   brandMechanisms: object[],
 *   colorGeometryCouplingRisk: boolean,
 *   provenance: object,
 * }}
 */
export function compileSpatialMechanisms(packet) {
  const audit = auditMechanismSources(packet);

  const architectureSemantics = [];
  const brandMotifSemantics = [];
  const colorAccentSemantics = [];
  const functionalSemantics = [];
  const decorativeIdentitySemantics = [];
  let colorGeometryCouplingRisk = false;

  for (const r of audit.records) {
    if (r.classification === SEMANTIC_CLASS.ARCHITECTURAL
        || (r.classification === SEMANTIC_CLASS.AMBIGUOUS && r.includedInArchitecturePrompt)) {
      architectureSemantics.push({
        text: r.normalizedText || r.sourceRawText,
        sourceField: r.sourceField,
        sourcePath: r.sourcePath,
        classification: r.classification,
        strip: r.strip,
        compiledAction: r.compiledAction,
        mechanismId: r.id,
      });
      if (r.motifHits.length) {
        brandMotifSemantics.push({
          text: r.sourceRawText,
          stripped: r.strip,
          motifHits: r.motifHits,
          sourceField: r.sourceField,
          mechanismId: r.id,
        });
      }
    } else if (r.classification === SEMANTIC_CLASS.BRAND_MOTIF) {
      brandMotifSemantics.push({
        text: r.sourceRawText,
        motifHits: r.motifHits,
        sourceField: r.sourceField,
        mechanismId: r.id,
      });
    } else if (r.classification === SEMANTIC_CLASS.COLOR_ACCENT) {
      colorAccentSemantics.push({
        text: r.sourceRawText,
        colorHits: r.colorHits,
        sourceField: r.sourceField,
        mechanismId: r.id,
      });
    } else if (r.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
      colorGeometryCouplingRisk = true;
      // Color-geometry MUST NOT become an architecture action. The spatial
      // path it qualified (if any) is already captured in normalize().
      brandMotifSemantics.push({
        text: r.sourceRawText,
        colorHits: r.colorHits,
        reason: 'color_geometry_coupling',
        sourceField: r.sourceField,
        mechanismId: r.id,
      });
    } else if (r.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY) {
      decorativeIdentitySemantics.push({
        text: r.sourceRawText,
        sourceField: r.sourceField,
        mechanismId: r.id,
      });
    } else {
      functionalSemantics.push({
        text: r.sourceRawText,
        sourceField: r.sourceField,
        mechanismId: r.id,
      });
    }
  }

  // Dedupe architectureSemantics by lowercased text.
  const seen = new Set();
  const deduped = [];
  for (const m of architectureSemantics) {
    const k = m.text.toLocaleLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(m);
  }

  // R8.5 redirected: rewrite each surviving architecture semantic (already
  // motif-stripped) into short English construction language partitioned
  // into three registers (strategy / form / organization), matching the
  // P9B-B high-water-mark prompt structure. Global dedupe happens inside
  // the rewriter so one V5 sentence cannot produce the same phrase more
  // than once, regardless of how many blocks render it.
  const rewrite = rewriteArchitectureSemantics(deduped);

  return {
    architectureSemantics: deduped,
    architectureActions: rewrite.actions,
    architectureStrategy: rewrite.strategy,
    architectureForm: rewrite.form,
    architectureOrganization: rewrite.organization,
    architectureRewrite: {
      items: rewrite.items,
      stats: rewrite.stats,
    },
    brandMotifSemantics,
    colorAccentSemantics,
    functionalSemantics,
    decorativeIdentitySemantics,
    mechanisms: deduped, // alias
    brandMechanisms: brandMotifSemantics,
    colorGeometryCouplingRisk,
    provenance: audit,
  };
}

/**
 * Convenience: re-derive a list of raw phrases (e.g. a V5 signature-mechanism
 * list) into { architectural: [], brand: [] } using the same compiler rules
 * but without a full V5 packet. Used by tests.
 */
export function compileRawPhrases(items) {
  const fakePacket = {
    mediaTranslations: {
      spatial: {
        signatureSpatialMechanism: items.map((i) => (typeof i === 'string' ? i : i.text)).filter(Boolean),
      },
    },
  };
  const out = compileSpatialMechanisms(fakePacket);
  return {
    architectural: out.architectureSemantics,
    actions: out.architectureActions,
    brand: out.brandMotifSemantics,
  };
}

export const COMPILE_SPATIAL_MECHANISMS_VERSION = '1.1.0';
