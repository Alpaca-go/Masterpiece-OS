// Field-Enriched Prompt Compiler v1.1 + Phase 8B.1
// v1.1 重构按 Space Generator v1.1 Architecture-Brand Fusion §6: 10 块编译顺序.
// Phase 8B.1 扩展: 11 块编译顺序, 新增 architecture_function_bridge.
//
// "空间概念必须优先于品牌表达" (v1.1 §6 末尾).
//
// 块顺序 (v1.1 §6 + Phase 8B.1 §4):
//   task
//   ↓
//   architecture_function_bridge   (Phase 8B.1 新增, 桥接建筑机制与商业功能)
//   ↓
//   architectural_concept          (v1.1 新增, 优先于 brand)
//   ↓
//   architecture_dna
//   ↓
//   brand_translation              (v1.1 翻译层, 替代 v0.1 brand+brandTranslation)
//   ↓
//   functional_requirement         (v1.1 合并 v0.1 function+functional)
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
// Phase 8A 路径 (anchor-aware) 进一步插入 architecture_context 在 task 之后:
//   task
//   ↓
//   architecture_context           (Phase 8A anchor in-context reference)
//   ↓
//   architecture_function_bridge   (Phase 8B.1 bridge)
//   ↓
//   architectural_concept
//   ↓
//   ...
//   (12 块总计)
//
// v0.1 DNA 向后兼容:
//   - 没有 brandTranslationRules -> brand block 走 brandSpaceDna fallback
//   - 没有 ceilingMechanism / facadeMechanism 等 -> architectural_concept 只显示 spatialConcept
//   - 没有 architectureFunctionBridge -> bridge block 走 functionalDna + sceneDefinition fallback
//
// 对比约束: v1.0 §10 maxReportCharacters=8000 (creative-production-runtime 硬约束).
//   Phase 8A: anchor-aware 路径扩展到 12000.
//   Phase 8B.1: baseline 11 块仍 8000 约束 (5019 + bridge ~700 = ~5720, 远低于 8000).

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

function compileArchitectureFunctionBridge(dna) {
  // Phase 8B.1 §3 新增. 在 architecture 机制与 functional 现实之间建立桥接.
  // 优先 dna.architectureFunctionBridge 字段, fallback 到 functionalDna + sceneDefinition.
  const afb = dna.architectureFunctionBridge;
  const lines = [
    '# Architecture-Function Bridge (Phase 8B.1 §3: 建筑机制 -> 商业功能桥接)',
    '',
    '> 建筑语言必须服务于商业现实, 不是反过来. 本块把 architecture 翻译为 functional action,',
    '> 缓解 Phase 8B 暴露的 Architecture Concept Drift (空间变展览馆, 商业运营逻辑被压制).',
    '',
  ];
  if (afb) {
    // Phase 8B.1 路径: 显式 bridge 字段
    if (afb.purpose) {
      lines.push(`**Commercial Purpose**: ${afb.purpose}`);
      lines.push('');
    }
    const spatialTrans = afb.spatialTranslation ?? [];
    if (spatialTrans.length > 0) {
      lines.push('**Spatial Translation (architecture mechanism -> commercial action)**:');
      for (const t of spatialTrans) {
        lines.push(`- ${t}`);
      }
      lines.push('');
    }
    const opCons = afb.operationConstraints ?? [];
    if (opCons.length > 0) {
      lines.push('**Operation Constraints (硬约束, 商业运营必须满足)**:');
      for (const c of opCons) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }
    const humExp = afb.humanExperience ?? [];
    if (humExp.length > 0) {
      lines.push('**Human Experience (用户路径与体验节奏)**:');
      for (const e of humExp) {
        lines.push(`- ${e}`);
      }
      lines.push('');
    }
    const comReal = afb.commercialReality ?? [];
    if (comReal.length > 0) {
      lines.push('**Commercial Reality (防止空间变展览馆)**:');
      for (const r of comReal) {
        lines.push(`- ${r}`);
      }
      lines.push('');
    }
    const driftGuards = afb.conceptDriftGuards ?? [];
    if (driftGuards.length > 0) {
      lines.push('**Concept Drift Guards (Phase 8B.1 §7 fail-closed, 出现必须避开)**:');
      for (const g of driftGuards) {
        lines.push(`- ${g}`);
      }
      lines.push('');
    }
    const boost = typeof afb.weightBoost === 'number' ? afb.weightBoost : 0.25;
    lines.push(`**Bridge Weight Boost**: ${boost} (0=不强调, 1=最强; v1.1 + Phase 8B.1 推荐 0.25)`);
    lines.push('');
    lines.push('**Usage**: 上面列出的 5 个维度 (spatialTranslation / operationConstraints / humanExperience / commercialReality / conceptDriftGuards) 必须被生成图遵守. 建筑语言服从商业现实, 不是反过来.');
  } else {
    // fallback 路径: 没有显式 architectureFunctionBridge, 用 functionalDna + sceneDefinition 推导
    const { functionalDna, sceneDefinition } = dna;
    lines.push('**Fallback Mode (no explicit architectureFunctionBridge field, Phase 8B.1 §3 fallback)**:');
    lines.push('');
    lines.push(`**Operational Realism**: ${functionalDna?.operationalRealism ?? 'n/a'}`);
    if (sceneDefinition?.requiredZones?.length > 0) {
      lines.push(`**Required Zones (must appear in image)**: ${sceneDefinition.requiredZones.join(', ')}`);
    }
    if (functionalDna?.customerFlow) {
      const cf = functionalDna.customerFlow;
      lines.push(`**Customer Flow**: entrance->reception=${cf.entranceToReception ?? 'n/a'} | reception->waiting=${cf.receptionToWaiting ?? 'n/a'} | waiting->consultation=${cf.waitingToConsultation ?? 'n/a'}`);
    }
    if (functionalDna?.medicalComplianceExpression) {
      lines.push(`**Medical Compliance**: visibleButNotHospitalLike=${functionalDna.medicalComplianceExpression.visibleButNotHospitalLike ?? 'n/a'}`);
    }
    lines.push('');
    lines.push('**Usage**: 商业功能约束从 functionalDna + sceneDefinition 推导, 缺省时按 v0.1 baseline 处理. 推荐补充 architectureFunctionBridge 字段以获得 Phase 8B.1 完整桥接效果.');
  }
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

// v1.1 §6 + Phase 8B.1 §4: 11 块编译顺序. architecture_function_bridge 在 architecture 概念之前,
// 作为"先验"约束建筑机制, 让建筑语言必须服务于商业现实.
const BLOCK_FUNCS = [
  ['task', compileTaskDeclaration],
  ['architecture_function_bridge', compileArchitectureFunctionBridge],
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
