function runSpaceQualityGate({
  finalPrompt,
  blockIds = [],
  blocksById = {},
  referenceCount = 0,
  hasExplicitReferenceBypass = false
} = {}) {
  const findings = [];
  const add = (code, severity, detail) => findings.push({ code, severity, detail });
  const prompt = String(finalPrompt ?? "");
  if (!prompt.trim()) add("PROMPT_EMPTY", "block", "Final prompt is empty.");
  if (!hasExplicitReferenceBypass && referenceCount < 1) {
    add(
      "SPACE_REFERENCE_MISSING",
      "block",
      "First formal space generation requires at least one core reference (user reference, implicit anchor, or architecture anchor)."
    );
  }
  const requiredArchitectureBlocks = [
    "spatial_intent",
    "architecture_language",
    "architecture_function_bridge",
    "architectural_concept"
  ];
  const missingArchitecture = requiredArchitectureBlocks.filter((id) => !blockIds.includes(id));
  if (missingArchitecture.length) {
    add(
      "ARCHITECTURE_CONTEXT_MISSING",
      "block",
      `Missing building-led blocks: ${missingArchitecture.join(", ")}`
    );
  }
  const archIds = [
    "spatial_intent",
    "architecture_language",
    "architecture_context",
    "architecture_function_bridge",
    "architectural_concept",
    "architecture_dna"
  ];
  const archText = archIds.map((id) => blocksById[id]?.text ?? "").join("");
  const archChars = [...archText.replace(/^#.*$/gmu, "")].length;
  if (archChars < 400) {
    add(
      "SPACE_POSITIVE_ARCHITECTURE_TOO_WEAK",
      "block",
      `Architecture content too thin (${archChars} substantive chars); need building-led mechanism, not decoration.`
    );
  }
  const brandIdx = blockIds.indexOf("brand_translation");
  const conceptIdx = blockIds.indexOf("architectural_concept");
  if (brandIdx >= 0 && conceptIdx >= 0 && brandIdx < conceptIdx) {
    add(
      "ARCHITECTURE_CONTEXT_MISSING",
      "block",
      "Brand translation must appear after architectural concept (architecture-first ordering violated)."
    );
  }
  const negativeText = blocksById.negative_constraints?.text ?? "";
  const negativeChars = [...negativeText].length;
  if (negativeChars > 0 && archChars > 0 && negativeChars > archChars * 0.45) {
    add(
      "SPACE_NEGATIVE_DENSITY_TOO_HIGH",
      "warn",
      `Negative block (${negativeChars} chars) is dense relative to positive architecture (${archChars} chars).`
    );
  }
  return {
    schemaVersion: "1.0",
    status: findings.some((f) => f.severity === "block") ? "blocked" : "pass",
    findings,
    checkedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}
export {
  runSpaceQualityGate
};
