// Space quality preflight gates (Recovery R5).
//
// These gates run ONLY for the Phase 9B-quality space route. They catch the
// failure modes that produced generic clinic images:
//   - SPACE_REFERENCE_MISSING        : first formal generation with no reference
//   - ARCHITECTURE_CONTEXT_MISSING   : no anchor/user reference establishing building language
//   - SPACE_POSITIVE_ARCHITECTURE_TOO_WEAK : architecture blocks empty/thin
//   - SPACE_NEGATIVE_DENSITY_TOO_HIGH      : negatives outweigh positive (warn only)
//
// The reference count is supplied by the Short-Chain service after it
// resolves references; this module stays pure and offline.

/**
 * @param {object} [input]
 * @param {string} [input.finalPrompt]
 * @param {string[]} [input.blockIds]
 * @param {Record<string, { text?: string }>} [input.blocksById]
 * @param {number} [input.referenceCount]
 * @param {boolean} [input.hasExplicitReferenceBypass]
 */
export function runSpaceQualityGate({
  finalPrompt,
  blockIds = [],
  blocksById = {},
  referenceCount = 0,
  hasExplicitReferenceBypass = false,
} = {}) {
  const findings = [];
  const add = (code, severity, detail) => findings.push({ code, severity, detail });
  const prompt = String(finalPrompt ?? '');

  if (!prompt.trim()) add('PROMPT_EMPTY', 'block', 'Final prompt is empty.');

  // Reference gate: first formal space generation must carry a reference.
  if (!hasExplicitReferenceBypass && referenceCount < 1) {
    add(
      'SPACE_REFERENCE_MISSING',
      'block',
      'First formal space generation requires at least one core reference (user reference, implicit anchor, or architecture anchor).',
    );
  }

  // Architecture hierarchy gates: Phase 9B Mode B must carry the building-led
  // blocks before brand translation.
  const requiredArchitectureBlocks = [
    'spatial_intent',
    'architecture_language',
    'architecture_function_bridge',
    'architectural_concept',
  ];
  const missingArchitecture = requiredArchitectureBlocks.filter((id) => !blockIds.includes(id));
  if (missingArchitecture.length) {
    add(
      'ARCHITECTURE_CONTEXT_MISSING',
      'block',
      `Missing building-led blocks: ${missingArchitecture.join(', ')}`,
    );
  }

  // Positive architecture must be substantive (not just headers).
  const archIds = [
    'spatial_intent',
    'architecture_language',
    'architecture_context',
    'architecture_function_bridge',
    'architectural_concept',
    'architecture_dna',
  ];
  const archText = archIds
    .map((id) => blocksById[id]?.text ?? '')
    .join('');
  const archChars = [...archText.replace(/^#.*$/gmu, '')].length;
  if (archChars < 400) {
    add(
      'SPACE_POSITIVE_ARCHITECTURE_TOO_WEAK',
      'block',
      `Architecture content too thin (${archChars} substantive chars); need building-led mechanism, not decoration.`,
    );
  }

  // Brand must come AFTER architecture.
  const brandIdx = blockIds.indexOf('brand_translation');
  const conceptIdx = blockIds.indexOf('architectural_concept');
  if (brandIdx >= 0 && conceptIdx >= 0 && brandIdx < conceptIdx) {
    add(
      'ARCHITECTURE_CONTEXT_MISSING',
      'block',
      'Brand translation must appear after architectural concept (architecture-first ordering violated).',
    );
  }

  // Negative density: warn only (doc §13.1).
  const negativeText = blocksById.negative_constraints?.text ?? '';
  const negativeChars = [...negativeText].length;
  if (negativeChars > 0 && archChars > 0 && negativeChars > archChars * 0.45) {
    add(
      'SPACE_NEGATIVE_DENSITY_TOO_HIGH',
      'warn',
      `Negative block (${negativeChars} chars) is dense relative to positive architecture (${archChars} chars).`,
    );
  }

  return {
    schemaVersion: '1.0',
    status: findings.some((f) => f.severity === 'block') ? 'blocked' : 'pass',
    findings,
    checkedAt: new Date().toISOString(),
  };
}
