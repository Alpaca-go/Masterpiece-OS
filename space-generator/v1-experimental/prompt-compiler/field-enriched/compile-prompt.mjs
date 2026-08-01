// Field-Enriched Prompt Compiler v1.1
// 重构按 Space Generator v1.1 Architecture-Brand Fusion §6: 10 块编译顺序.
// "空间概念必须优先于品牌表达" (v1.1 §6 末尾).
//
// 块顺序 (v1.1 §6):
//   task
//   ↓
//   architectural_concept   (v1.1 新增, 优先于 brand)
//   ↓
//   architecture_dna
//   ↓
//   brand_translation      (v1.1 翻译层, 替代 v0.1 brand+brandTranslation)
//   ↓
//   functional_requirement (v1.1 合并 v0.1 function+functional)
//   ↓
//   material
//   ↓
//   lighting
//   ↓
//   composition
//   ↓
//   rendering
//   ↓
//   negative_constraints
//
// v0.1 DNA 向后兼容:
//   - 没有 brandTranslationRules -> brand block 走 brandSpaceDna fallback
//   - 没有 ceilingMechanism / facadeMechanism 等 -> architectural_concept 只显示 spatialConcept
//
// 对比约束: v1.0 §10 maxReportCharacters=8000 (creative-production-runtime 硬约束).

function compileTaskDeclaration(dna) {
  const { project, sceneDefinition } = dna;
  return `# Task

Generate a single premium-grade space image for **${project.brandName}** (${project.category}).
Scene: \`${sceneDefinition.sceneType}\` (${sceneDefinition.sceneSubtype ?? 'unspecified subtype'}).
Context: ${sceneDefinition.commercialContext} | Scale: ${sceneDefinition.scale}.
`;
}

function compileArchitecturalConcept(dna) {
  // v1.1 §6 新增. "空间概念必须优先于品牌表达".
  // 用 architectureDna 的 spatialConcept + 4 个 v1.1 mechanism 字段 (如果有).
  const { architectureDna } = dna;
  const lines = [
    '# Architectural Concept (空间概念优先于品牌表达, v1.1 §6)',
    '',
    `**Primary Spatial Concept**: ${architectureDna.spatialConcept?.primary ?? 'n/a'}`,
  ];
  if (architectureDna.spatialConcept?.secondary) {
    lines.push(`**Secondary**: ${architectureDna.spatialConcept.secondary}`);
  }
  // v1.1 新字段: 4 个 mechanism, 缺则不显示
  if (architectureDna.ceilingMechanism) {
    lines.push('', `**Ceiling Mechanism**: ${architectureDna.ceilingMechanism}`);
  }
  if (architectureDna.facadeMechanism) {
    lines.push(`**Facade Mechanism**: ${architectureDna.facadeMechanism}`);
  }
  if (architectureDna.partitionMechanism) {
    lines.push(`**Partition Mechanism**: ${architectureDna.partitionMechanism}`);
  }
  if (architectureDna.furnitureFormGrammar) {
    lines.push(`**Furniture Form Grammar**: ${architectureDna.furnitureFormGrammar}`);
  }
  lines.push('', '空间概念 / 建筑机制 必须先于 品牌元素 被建立. 品牌附着在建筑语言之上, 不是反过来.');
  return lines.join('\n') + '\n';
}

function compileArchitectureDna(dna) {
  const { architectureDna } = dna;
  const cont = architectureDna.spatialContinuity;
  const bl = architectureDna.boundaryLanguage;
  const circ = architectureDna.circulation;
  return `# Architecture DNA

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

**Boundary Hardness**: ${architectureDna.boundaryHardness}
**Statement Strength**: ${architectureDna.statementStrength}
`;
}

function compileBrandTranslation(dna) {
  // v1.1 §5 翻译层. 优先 brandTranslationRules, fallback 到 v0.1 brandSpaceDna.
  const { project, brandSpaceDna, brandTranslationRules } = dna;
  const lines = ['# Brand Translation (v1.1 §5 翻译层, 品牌不是装饰)'];
  lines.push('');
  lines.push(`**Brand**: ${project.brandName}`);
  lines.push(`**Industry**: ${project.industry}`);
  lines.push(`**Audience**: ${(project.audience ?? []).join(', ') || 'not specified'}`);

  if (brandTranslationRules) {
    // v1.1 翻译层
    lines.push('', '**Brand Spirit → Space Mechanism** (v1.1 §5 默认对应):');
    const spirit = brandTranslationRules.spiritToSpaceMechanism ?? {};
    for (const k of ['scientific', 'elegant', 'healing', 'futuristic', 'premium']) {
      if (spirit[k]) {
        lines.push(`- ${k}: ${spirit[k]}`);
      }
    }
    const grammar = brandTranslationRules.grammarToSpaceMechanism ?? {};
    const grammarKeys = ['organicGrowth', 'visualLightness', 'controlledGlow', 'refinedOrder', 'decorativeDensity'];
    if (grammarKeys.some((k) => grammar[k])) {
      lines.push('', '**Brand Grammar → Space Language**:');
      for (const k of grammarKeys) {
        if (grammar[k]) {
          lines.push(`- ${k}: ${grammar[k]}`);
        }
      }
    }
    const motifRules = brandTranslationRules.motifToSpaceMechanism ?? [];
    if (motifRules.length > 0) {
      lines.push('', '**Motif → Space Mechanism** (v1.0 §34 规则一/五: motif 表达为机制, 不放字面物):');
      for (const r of motifRules) {
        const forb = r.literalAssetForbidden ? ' [字面资产禁止]' : '';
        lines.push(`- ${r.motif}: ${r.mechanism}${forb}`);
      }
    }
    if (typeof brandTranslationRules.translationStrength === 'number') {
      lines.push('', `**Translation Strength**: ${brandTranslationRules.translationStrength} (0=不应用, 1=严格执行, v1.1 推荐 0.7)`);
    }
  } else if (brandSpaceDna) {
    // v0.1 fallback: brand spirit 5 维 + grammar + motif family + literal asset
    lines.push('', '**Brand Spirit (high-weight >= 0.7)**:');
    const highSpirit = Object.entries(brandSpaceDna.brandSpirit ?? {})
      .filter(([, v]) => typeof v === 'number' && v >= 0.7)
      .map(([k]) => `- ${k} (weight >= 0.7)`)
      .join('\n');
    lines.push(highSpirit || '- (no spirit weight above 0.7)');

    lines.push('', '**Brand Grammar**:');
    for (const [k, v] of Object.entries(brandSpaceDna.brandGrammar ?? {})) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push('', `**Motif Family (all optional, no required literal)**: ${(brandSpaceDna.motifFamily ?? []).join(', ')}`);
    lines.push('', '**Literal Asset Usage**:');
    const lau = brandSpaceDna.literalAssetUsage ?? {};
    lines.push(`- Logo visibility: ${lau.logoVisibility}`);
    lines.push(`- Direct peacock: ${lau.directPeacockUsage}`);
    lines.push(`- Flower sculpture: ${lau.flowerSculptureUsage}`);
    lines.push(`- Crystal object: ${lau.crystalObjectUsage}`);
    if (typeof brandSpaceDna.injectionStrength === 'number') {
      lines.push('', `**Injection Strength**: ${brandSpaceDna.injectionStrength} (0 = no injection, 1 = all literal assets)`);
    }
  }
  return lines.join('\n') + '\n';
}

function compileFunctionalRequirement(dna) {
  // v1.1 §6 合并 v0.1 function + functional.
  const { sceneDefinition, functionalDna } = dna;
  const comp = functionalDna.medicalComplianceExpression;
  const lines = [
    '# Functional & Commercial Requirement (v1.1 §6 合并 v0.1 function+functional)',
    '',
    '**Required Zones**: ' + ((sceneDefinition.requiredZones ?? []).join(', ') || 'n/a'),
    '**Optional Zones**: ' + ((sceneDefinition.optionalZones ?? []).join(', ') || 'none'),
    '**Operational Realism**: ' + (functionalDna.operationalRealism ?? 'n/a'),
  ];
  if (functionalDna.customerFlow) {
    lines.push('');
    lines.push('**Customer Flow**:');
    lines.push(`- Entrance \u2192 Reception: ${functionalDna.customerFlow.entranceToReception ?? 'n/a'}`);
    lines.push(`- Reception \u2192 Waiting: ${functionalDna.customerFlow.receptionToWaiting ?? 'n/a'}`);
    lines.push(`- Waiting \u2192 Consultation: ${functionalDna.customerFlow.waitingToConsultation ?? 'n/a'}`);
  }
  if (functionalDna.privacy) {
    lines.push('');
    lines.push('**Privacy Zones**:');
    lines.push(`- Public: ${functionalDna.privacy.publicZone ?? 'n/a'}`);
    lines.push(`- Semi-private: ${functionalDna.privacy.semiPrivateZone ?? 'n/a'}`);
    lines.push(`- Treatment: ${functionalDna.privacy.treatmentZone ?? 'n/a'}`);
  }
  if (functionalDna.furnitureRequirements) {
    const fr = functionalDna.furnitureRequirements;
    const flags = [
      fr.ergonomic ? 'ergonomic' : null,
      fr.commercialGrade ? 'commercial-grade' : null,
      fr.accessible ? 'accessible' : null,
    ].filter(Boolean);
    lines.push('');
    lines.push('**Furniture**: ' + (flags.join(' ') || 'n/a'));
  }
  if (comp) {
    lines.push('');
    lines.push('**Medical Compliance**:');
    lines.push(`- Visible but not hospital-like: ${comp.visibleButNotHospitalLike ?? 'n/a'}`);
  }
  return lines.join('\n') + '\n';
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

// v1.1 §6: 10 块编译顺序. 空间概念优先于品牌表达.
const BLOCK_FUNCS = [
  ['task', compileTaskDeclaration],
  ['architectural_concept', compileArchitecturalConcept],
  ['architecture_dna', compileArchitectureDna],
  ['brand_translation', compileBrandTranslation],
  ['functional_requirement', compileFunctionalRequirement],
  ['material', compileMaterialSystem],
  ['lighting', compileLightingSystem],
  ['composition', compileComposition],
  ['rendering', compileRendering],
  ['negative_constraints', compileNegativeConstraints],
];

/**
 * Compile a Field-Enriched prompt from a DNA instance.
 * @param dna  Space DNA instance (Phase 2 schema, v0.1 or v1.1)
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
