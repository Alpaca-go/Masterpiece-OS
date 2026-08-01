// Architecture Language Block Compiler v1 (Phase 9B)
// 用途: 把 architectureLanguage (Phase 9A.3) 编译为 prompt block 文本.
//       用于 Mode B (Spatial Intelligence Pipeline) 的 architecture_language block.
//
// Phase 9B §5 Provider Test Protocol:
//   Mode A = Previous Pipeline (compileRuntimePrompt, 11/12 块)
//   Mode B = Mode A + spatial_intent block + architecture_language block
//
// 不调 Provider, 不修改 baseline 行为, 不污染生产代码.
//
// 设计 (Phase 9B):
//   - 块结构: 标题 + 5 字段 (spatialPrinciples / architecturalCharacteristics / materialDirection / lightDirection / spatialOrganization)
//   - 紧跟 spatial_intent 块 (Phase 9A.3 链路: spatial intent -> architecture language)
//   - 不指定具体 anchor (Phase 9A.3 §9 Layer Boundary), 只列 high-level direction
//   - 让模型知道: 这次空间用什么样的 high-level architecture language

/**
 * Compile architectureLanguage -> architecture_language block text.
 *
 * @param architectureLanguage  Phase 9A.3 architecture language (5 字段 + optional weight)
 * @returns block text (markdown)
 */
export function compileArchitectureLanguageBlock(architectureLanguage) {
  if (!architectureLanguage || typeof architectureLanguage !== 'object') {
    throw new TypeError('compileArchitectureLanguageBlock: architectureLanguage must be a non-null object');
  }

  const lines = [
    '# Architecture Language (Phase 9A.3: 什么建筑原则支持这种体验)',
    '',
    '> 由 spatial intent 推导出的 high-level architecture language 方向.',
    '> 这一层是"建筑机制先验", 给 architectural_concept / architecture_dna 提供方向.',
    '> 注意: 不指定具体 anchor / 装饰元素 / 参考图 (Phase 9A.3 §9 Layer Boundary).',
    '',
    '**Spatial Principles** (空间原则):',
  ];

  const principles = Array.isArray(architectureLanguage.spatialPrinciples)
    ? architectureLanguage.spatialPrinciples
    : [];
  for (const p of principles) {
    lines.push(`- ${p}`);
  }

  lines.push('');
  lines.push('**Architectural Characteristics** (建筑特征):');
  const chars = Array.isArray(architectureLanguage.architecturalCharacteristics)
    ? architectureLanguage.architecturalCharacteristics
    : [];
  for (const c of chars) {
    lines.push(`- ${c}`);
  }

  lines.push('');
  lines.push('**Material Direction** (材料方向, 高层):');
  const mat = Array.isArray(architectureLanguage.materialDirection)
    ? architectureLanguage.materialDirection
    : [];
  for (const m of mat) {
    lines.push(`- ${m}`);
  }

  lines.push('');
  lines.push('**Light Direction** (光环境逻辑):');
  const lig = Array.isArray(architectureLanguage.lightDirection)
    ? architectureLanguage.lightDirection
    : [];
  for (const l of lig) {
    lines.push(`- ${l}`);
  }

  lines.push('');
  lines.push('**Spatial Organization** (空间组织):');
  const org = Array.isArray(architectureLanguage.spatialOrganization)
    ? architectureLanguage.spatialOrganization
    : [];
  for (const o of org) {
    lines.push(`- ${o}`);
  }

  lines.push('');
  lines.push('**Usage**: 上面 5 个维度是这次空间要遵循的 high-level architecture language 方向. '
    + 'material / lighting 块可以更具体, 但要遵循上面的方向, 不是反过来. '
    + 'architecture function bridge 仍然提供商业功能约束, 这一层不重复其内容.');

  return lines.join('\n') + '\n';
}
