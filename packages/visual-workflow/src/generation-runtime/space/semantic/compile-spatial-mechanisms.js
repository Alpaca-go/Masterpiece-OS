import { auditMechanismSources } from "./mechanism-provenance.js";
import { SEMANTIC_CLASS } from "./separate-space-semantics.js";
import { rewriteArchitectureSemantics } from "./rewrite-architecture-semantics.js";
function compileSpatialMechanisms(packet) {
  const audit = auditMechanismSources(packet);
  const architectureSemantics = [];
  const brandMotifSemantics = [];
  const colorAccentSemantics = [];
  const functionalSemantics = [];
  const decorativeIdentitySemantics = [];
  let colorGeometryCouplingRisk = false;
  for (const r of audit.records) {
    if (r.classification === SEMANTIC_CLASS.ARCHITECTURAL || r.classification === SEMANTIC_CLASS.AMBIGUOUS && r.includedInArchitecturePrompt) {
      architectureSemantics.push({
        text: r.normalizedText || r.sourceRawText,
        sourceField: r.sourceField,
        sourcePath: r.sourcePath,
        classification: r.classification,
        strip: r.strip,
        compiledAction: r.compiledAction,
        mechanismId: r.id
      });
      if (r.motifHits.length) {
        brandMotifSemantics.push({
          text: r.sourceRawText,
          stripped: r.strip,
          motifHits: r.motifHits,
          sourceField: r.sourceField,
          mechanismId: r.id
        });
      }
    } else if (r.classification === SEMANTIC_CLASS.BRAND_MOTIF || r.classification === SEMANTIC_CLASS.DECORATIVE_OBJECT && r.sourceField === "signatureSpatialMechanism") {
      brandMotifSemantics.push({
        text: r.sourceRawText,
        motifHits: r.motifHits,
        sourceField: r.sourceField,
        mechanismId: r.id
      });
    } else if (r.classification === SEMANTIC_CLASS.COLOR_ACCENT) {
      colorAccentSemantics.push({
        text: r.sourceRawText,
        colorHits: r.colorHits,
        sourceField: r.sourceField,
        mechanismId: r.id
      });
    } else if (r.classification === SEMANTIC_CLASS.COLOR_GEOMETRY) {
      colorGeometryCouplingRisk = true;
      brandMotifSemantics.push({
        text: r.sourceRawText,
        colorHits: r.colorHits,
        reason: "color_geometry_coupling",
        sourceField: r.sourceField,
        mechanismId: r.id
      });
    } else if (r.classification === SEMANTIC_CLASS.DECORATIVE_IDENTITY) {
      decorativeIdentitySemantics.push({
        text: r.sourceRawText,
        sourceField: r.sourceField,
        mechanismId: r.id
      });
    } else {
      functionalSemantics.push({
        text: r.sourceRawText,
        sourceField: r.sourceField,
        mechanismId: r.id
      });
    }
  }
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const m of architectureSemantics) {
    const k = m.text.toLocaleLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    deduped.push(m);
  }
  const rewrite = rewriteArchitectureSemantics(deduped);
  return {
    architectureSemantics: deduped,
    architectureActions: rewrite.actions,
    architectureStrategy: rewrite.strategy,
    architectureForm: rewrite.form,
    architectureOrganization: rewrite.organization,
    architectureRewrite: {
      items: rewrite.items,
      stats: rewrite.stats
    },
    brandMotifSemantics,
    colorAccentSemantics,
    functionalSemantics,
    decorativeIdentitySemantics,
    mechanisms: deduped,
    // alias
    brandMechanisms: brandMotifSemantics,
    colorGeometryCouplingRisk,
    provenance: audit
  };
}
function compileRawPhrases(items) {
  const fakePacket = {
    mediaTranslations: {
      spatial: {
        signatureSpatialMechanism: items.map((i) => typeof i === "string" ? i : i.text).filter(Boolean)
      }
    }
  };
  const out = compileSpatialMechanisms(fakePacket);
  return {
    architectural: out.architectureSemantics,
    actions: out.architectureActions,
    brand: out.brandMotifSemantics
  };
}
const COMPILE_SPATIAL_MECHANISMS_VERSION = "1.1.0";
export {
  COMPILE_SPATIAL_MECHANISMS_VERSION,
  compileRawPhrases,
  compileSpatialMechanisms
};
