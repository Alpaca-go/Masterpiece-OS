// Field-Enriched Prompt Compiler v0.1
// v1.0 §22 13 步编译顺序, v0.1 暂做 11 块 (Phase 5 不接 variation control)
// v0.1 输出 markdown, 不真调 Provider; v1-baseline prompt 作对照组.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------- 11 字段块 (v1.0 §22 不含 variation_control) ----------

function compileTaskDeclaration(dna) {
  const { sceneDefinition, project } = dna;
  return `# Task

Generate a single premium-grade space image for **${project.brandName}** (${project.category}).
Scene: \`${sceneDefinition.sceneType}\` (${sceneDefinition.sceneSubtype ?? 'generic'}).
Context: ${sceneDefinition.commercialContext ?? 'unspecified'} | Scale: ${sceneDefinition.scale ?? 'unspecified'}.
`;
}

function compileBrandPositioning(dna) {
  const { project, brandSpaceDna } = dna;
  const spirit = brandSpaceDna.brandSpirit;
  const posLines = (project.brandPositioning ?? []).map((p) => `- ${p}`).join('\n') || '- (no explicit positioning; defaulting to high-end)';
  const spiritLines = Object.entries(spirit)
    .filter(([, v]) => typeof v === 'number' && v >= 0.7)
    .map(([k]) => `- ${k} (weight >= 0.7)`)
    .join('\n');
  return `# Brand & Industry Positioning

**Brand**: ${project.brandName}
**Industry**: ${project.industry}
**Audience**: ${(project.audience ?? []).join(', ') || 'not specified'}

**Brand Positioning**:
${posLines}

**Brand Spirit (high-weight >= 0.7)**:
${spiritLines || '- (no spirit weight above 0.7)'}
`;
}

function compileSpaceFunction(dna) {
  const { sceneDefinition, functionalDna } = dna;
  return `# Space Function

**Required Zones**: ${(sceneDefinition.requiredZones ?? []).join(', ')}
**Optional Zones**: ${(sceneDefinition.optionalZones ?? []).join(', ') || 'none'}
**Operational Realism**: ${functionalDna.operationalRealism}
**Customer Flow**:
- Entrance \u2192 Reception: ${functionalDna.customerFlow?.entranceToReception ?? 'n/a'}
- Reception \u2192 Waiting: ${functionalDna.customerFlow?.receptionToWaiting ?? 'n/a'}
- Waiting \u2192 Consultation: ${functionalDna.customerFlow?.waitingToConsultation ?? 'n/a'}

**Privacy Zones**:
- Public: ${functionalDna.privacy?.publicZone ?? 'n/a'}
- Semi-private: ${functionalDna.privacy?.semiPrivateZone ?? 'n/a'}
- Treatment: ${functionalDna.privacy?.treatmentZone ?? 'n/a'}

**Furniture**: ${(functionalDna.furnitureRequirements?.ergonomic ? 'ergonomic ' : '')}${(functionalDna.furnitureRequirements?.commercialGrade ? 'commercial-grade ' : '')}${(functionalDna.furnitureRequirements?.accessible ? 'accessible' : '')}
`;
}

function compileCoreConcept(dna) {
  const { architectureDna } = dna;
  return `# Core Spatial Concept

**Primary**: ${architectureDna.spatialConcept?.primary}
**Secondary**: ${architectureDna.spatialConcept?.secondary ?? '(none)'}

**Boundary Hardness**: ${architectureDna.boundaryHardness}
**Statement Strength**: ${architectureDna.statementStrength}
`;
}

function compileArchitectureLanguage(dna) {
  const { architectureDna } = dna;
  const cont = architectureDna.spatialContinuity;
  const bl = architectureDna.boundaryLanguage;
  const circ = architectureDna.circulation;
  return `# Architecture Language

**Geometry**:
- Dominant: ${(architectureDna.geometry?.dominant ?? []).join(', ') || 'n/a'}
- Limited: ${(architectureDna.geometry?.limited ?? []).join(', ') || 'n/a'}

**Spatial Continuity**:
- Wall \u2194 Ceiling: ${cont?.wallToCeiling ?? 'n/a'}
- Floor \u2194 Furniture: ${cont?.floorToFurniture ?? 'n/a'}
- Room \u2194 Room: ${cont?.roomToRoom ?? 'n/a'}

**Boundary Language**:
- Hardness: ${bl?.hardness ?? 'n/a'} | Transparency: ${bl?.transparency ?? 'n/a'} | Enclosure: ${bl?.enclosure ?? 'n/a'}

**Circulation**: type=${circ?.type ?? 'n/a'} | visibility=${circ?.visibility ?? 'n/a'} | rhythm=${circ?.rhythm ?? 'n/a'}
`;
}

function compileMaterialSystem(dna) {
  const { materialDna } = dna;
  return `# Material System

**Material Count Limit**: ${materialDna.materialCountLimit} (v1.0 \u00a716 hard constraint: 5 for medical_aesthetics)

**Primary Materials**: ${(materialDna.primaryMaterials ?? []).join(', ')}
**Secondary Materials**: ${(materialDna.secondaryMaterials ?? []).join(', ') || 'none'}
**Accent Materials**: ${(materialDna.accentMaterials ?? []).join(', ') || 'none'}

**Finish**: gloss=${materialDna.finish?.glossLevel ?? 'n/a'} | reflectivity=${materialDna.finish?.reflectivity ?? 'n/a'} | tactile=${materialDna.finish?.tactileQuality ?? 'n/a'}
`;
}

function compileLightingSystem(dna) {
  const { lightingDna } = dna;
  return `# Lighting System

**Primary Strategy**: ${lightingDna.primaryStrategy}

**Ambient**: softness=${lightingDna.ambient?.softness ?? 'n/a'} | brightness=${lightingDna.ambient?.brightness ?? 'n/a'} | contrast=${lightingDna.ambient?.contrast ?? 'n/a'}

**Integrated Light**:
- Ceiling cove: ${lightingDna.integratedLight?.ceilingCove ?? 'n/a'}
- Wall edge: ${lightingDna.integratedLight?.wallEdge ?? 'n/a'}
- Furniture base: ${lightingDna.integratedLight?.furnitureBase ?? 'n/a'}

**Brand Light**: hueFamily=${(lightingDna.brandLight?.hueFamily ?? []).join(',')} | saturation=${lightingDna.brandLight?.saturation ?? 'n/a'} | areaRatio=${lightingDna.brandLight?.areaRatio ?? 'n/a'}

**Spotlight Usage**: ${lightingDna.spotlightUsage}
**Decorative Fixture Visibility**: ${lightingDna.decorativeFixtureVisibility}
**Architectural Glow**: ${lightingDna.architecturalGlow}
`;
}

function compileBrandTranslation(dna) {
  const { brandSpaceDna } = dna;
  return `# Brand Translation

**Brand Spirit**:
${Object.entries(brandSpaceDna.brandSpirit)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}

**Brand Grammar**:
${Object.entries(brandSpaceDna.brandGrammar ?? {})
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n')}

**Motif Family (all optional, no required literal)**: ${(brandSpaceDna.motifFamily ?? []).join(', ')}

**Literal Asset Usage**:
- Logo visibility: ${brandSpaceDna.literalAssetUsage?.logoVisibility}
- Direct peacock: ${brandSpaceDna.literalAssetUsage?.directPeacockUsage}
- Flower sculpture: ${brandSpaceDna.literalAssetUsage?.flowerSculptureUsage}
- Crystal object: ${brandSpaceDna.literalAssetUsage?.crystalObjectUsage}

**Injection Strength**: ${brandSpaceDna.injectionStrength} (0 = no injection, 1 = all literal assets)
`;
}

function compileFunctionalRealism(dna) {
  const { functionalDna } = dna;
  const comp = functionalDna.medicalComplianceExpression;
  return `# Functional & Commercial Realism

**Operational Realism**: ${functionalDna.operationalRealism}

**Medical Compliance**:
- Visible but not hospital-like: ${comp?.visibleButNotHospitalLike ?? 'n/a'}

**Furniture**:
- Ergonomic: ${functionalDna.furnitureRequirements?.ergonomic}
- Commercial-grade: ${functionalDna.furnitureRequirements?.commercialGrade}
- Accessible: ${functionalDna.furnitureRequirements?.accessible}
`;
}

function compileComposition(dna) {
  const { compositionDna } = dna;
  return `# Composition & Photography

**Focal Hierarchy**:
- Primary: ${compositionDna.focalHierarchy?.primary}
- Secondary: ${compositionDna.focalHierarchy?.secondary}
- Tertiary: ${compositionDna.focalHierarchy?.tertiary}

**Visual Balance**: symmetry=${compositionDna.visualBalance?.symmetry ?? 'n/a'} | negativeSpace=${compositionDna.visualBalance?.negativeSpace ?? 'n/a'} | density=${compositionDna.visualBalance?.density ?? 'n/a'}

**Camera**: lens=${compositionDna.camera?.lens} | height=${compositionDna.camera?.height} | distortion=${compositionDna.camera?.distortion}

**Framing**: depthLayers=${compositionDna.framing?.depthLayers} | foregroundUsage=${compositionDna.framing?.foregroundUsage} | clearEntryView=${compositionDna.framing?.clearEntryView}
`;
}

function compileRendering(dna) {
  const { renderingDna } = dna;
  return `# Rendering Requirements

**Realism**: ${renderingDna.realism}
**Visual Finish**: ${renderingDna.visualFinish}
**Exposure**: ${renderingDna.exposure}
**White Balance**: ${renderingDna.whiteBalance}
**Shadow**: ${renderingDna.shadow}
**Texture Visibility**: ${renderingDna.textureVisibility}
**People**: amount=${renderingDna.people?.amount} | motionBlur=${renderingDna.people?.motionBlur}
**Cleanliness**: ${renderingDna.cleanliness}
**Post-Processing**: ${renderingDna.postProcessing}
`;
}

function compileNegativeConstraints(dna) {
  const { negativeConstraints } = dna;
  return `# Prohibited (fail-closed)

The following MUST NOT appear in the generated image:
${(negativeConstraints.prohibit ?? []).map((p) => `- ${p}`).join('\n')}
`;
}

const BLOCK_FUNCS = [
  ['task', compileTaskDeclaration],
  ['brand', compileBrandPositioning],
  ['function', compileSpaceFunction],
  ['concept', compileCoreConcept],
  ['architecture', compileArchitectureLanguage],
  ['material', compileMaterialSystem],
  ['lighting', compileLightingSystem],
  ['brandTranslation', compileBrandTranslation],
  ['functional', compileFunctionalRealism],
  ['composition', compileComposition],
  ['rendering', compileRendering],
  ['negative', compileNegativeConstraints],
];

/**
 * Compile a Field-Enriched prompt from a DNA instance.
 * @param dna  Space DNA instance (Phase 2 schema)
 * @returns   { markdown, blockCount, characterCount, blocks }
 */
export function compileFieldEnrichedPrompt(dna) {
  if (!dna || typeof dna !== 'object') {
    throw new TypeError('compileFieldEnrichedPrompt: dna must be a non-null object');
  }
  const blocks = BLOCK_FUNCS.map(([id, fn]) => ({ id, text: fn(dna) }));
  const markdown = blocks.map((b) => b.text).join('\n');
  return {
    markdown,
    blockCount: blocks.length,
    characterCount: markdown.length,
    blocks,
  };
}

// ---------- CLI ----------
if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error('Usage: node compile-prompt.mjs <dna.json> <output.md>');
    process.exit(1);
  }
  const [dnaPath, outPath] = args;
  const dna = JSON.parse(readFileSync(dnaPath, 'utf8'));
  const result = compileFieldEnrichedPrompt(dna);
  writeFileSync(outPath, result.markdown);
  console.log(`prompt written to ${outPath}`);
  console.log(`blocks: ${result.blockCount}, characters: ${result.characterCount}`);
}
