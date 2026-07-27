function list(values) { return (values ?? []).filter(Boolean).map((value) => `- ${value}`).join('\n') || '- None'; }

export function compileCreativeCore({ brief, mode, userIntent = {} }) {
  const task = brief.outputTask ?? {};
  const heading = mode === 'extend' ? 'Extend the current visual system.' : mode === 'upgrade' ? 'Upgrade the visual expression; do not merely extend the legacy design.' : 'Rebuild a new visual direction; legacy visual expression is not a style template.';
  return `## Creative Core\n\n${heading}\n\n### Anchor responsibility\n${task.responsibility ?? userIntent.description ?? ''}\n\n### Preserve\n${list([...(brief.preserve?.identity ?? []), ...(brief.preserve?.structures ?? [])])}\n\n### Must change\n${list(Object.values(brief.mustChange ?? {}).flat())}\n\n### Prohibited carryover\n${list(brief.prohibitedCarryover)}\n\n### New visual anchor\n${brief.newDirection?.visualAnchor ?? ''}\n\n### Scene and composition\n${brief.newDirection?.sceneMechanism ?? ''}\n${list(brief.newDirection?.compositionStrategy)}\n\n### Color, material, and typography\n${list([...(brief.newDirection?.colorRelationship ?? []), ...(brief.newDirection?.materialAndLighting ?? []), ...(brief.newDirection?.typographyRelationship ?? [])])}\n\n### Creative difference target\n${brief.creativeDifferenceTarget?.level ?? ''}: ${brief.creativeDifferenceTarget?.explanation ?? ''}\n`;
}

export function compileFinalPrompt({ deterministicPrompt, creativeCore, brief }) {
  const compiledPromptMarkdown = `${deterministicPrompt.trim()}\n\n${creativeCore.trim()}\n`;
  return {
    compiledPromptMarkdown,
    promptSourceMap: {
      deterministic: { source: 'deterministic constraint compiler' },
      creativeCore: { source: 'GenerationTransformationBrief', mode: brief.mode, fields: ['preserve', 'mustChange', 'prohibitedCarryover', 'newDirection', 'creativeDifferenceTarget', 'outputTask'] },
    },
  };
}
