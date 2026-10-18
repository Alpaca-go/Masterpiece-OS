import { REFERENCE_BOUNDARY_VERSION } from "../reference-boundary.js";
import { ART_DIRECTION_BOUNDARY } from '../../../art-direction-contract.js';
import { SEEDREAM_MAX_PROMPT_CHARACTERS } from "../../generation/seedream-adapter.js";
const SPACE_PROVIDER_PROMPT_GATE_VERSION = "space-provider-prompt-gate@1.0.0";
const REFERENCE_BOUNDARY_MARKERS = [
  "REFERENCE BOUNDARY",
  "high-priority instruction",
  "Preserve from the reference image",
  "Target scene is authoritative for"
];
function findAny(text, needles) {
  if (!text) return null;
  for (const needle of needles) {
    if (text.includes(needle)) return needle;
  }
  return null;
}
function fail(details, causeCode = "SPACE_PROVIDER_PROMPT_INVALID") {
  throw Object.assign(
    new Error(`${causeCode}: Provider prompt gate B failed closed.`),
    { code: causeCode, providerPromptGateCode: causeCode, details }
  );
}
function assertProviderPromptGateB(input) {
  const checks = {
    nonEmpty: false,
    withinProviderCap: false,
    generationBasisMatches: false,
    targetSceneMarker: false
  };
  const actualPrompt = typeof input?.actualPrompt === "string" ? input.actualPrompt : "";
  const compiledPrompt = typeof input?.compiledPrompt === "string" ? input.compiledPrompt : "";
  const providerCap = Math.max(
    1,
    Number(input?.providerCapability?.prompt?.maxCharacters ?? SEEDREAM_MAX_PROMPT_CHARACTERS)
  );
  const generationBasis = input?.generationBasis ?? input?.taskContract?.generationBasis ?? "standard";
  const targetScene = String(input?.targetScene ?? input?.taskContract?.subtype ?? "").trim();
  const targetSceneLabel = String(input?.targetSceneLabel ?? targetScene).trim();
  const isEdited = Boolean(input?.isEdited);
  checks.nonEmpty = actualPrompt.length > 0;
  if (!checks.nonEmpty) {
    fail({ checks, characterCount: actualPrompt.length, generationBasis, targetScene }, "SPACE_PROVIDER_PROMPT_INVALID");
  }
  const characterCount = [...actualPrompt].length;
  checks.withinProviderCap = characterCount <= providerCap;
  if (!checks.withinProviderCap) {
    fail({
      checks,
      characterCount,
      providerCap,
      generationBasis,
      targetScene
    }, "SPACE_PROVIDER_PROMPT_INVALID");
  }
  if (generationBasis === "standard") {
    const refLabel = findAny(actualPrompt, REFERENCE_BOUNDARY_MARKERS);
    checks.generationBasisMatches = !refLabel;
    if (!checks.generationBasisMatches) {
      fail({
        checks,
        characterCount,
        generationBasis,
        unexpectedReferenceLabel: refLabel
      }, "SPACE_PROVIDER_PROMPT_INVALID");
    }
  } else if (generationBasis === 'art_direction_reference') {
    checks.generationBasisMatches = actualPrompt === compiledPrompt && actualPrompt.includes(ART_DIRECTION_BOUNDARY) && !isEdited;
    if (!checks.generationBasisMatches) fail({checks,generationBasis},'ART_DIRECTION_PROMPT_CHANGED');
  } else if (generationBasis === "reference_first") {
    const boundaryLabel = findAny(actualPrompt, REFERENCE_BOUNDARY_MARKERS);
    checks.generationBasisMatches = Boolean(boundaryLabel);
    if (!checks.generationBasisMatches) {
      fail({
        checks,
        characterCount,
        generationBasis,
        targetScene,
        missingBoundaryLabel: REFERENCE_BOUNDARY_VERSION
      }, "SPACE_PROVIDER_PROMPT_INVALID");
    }
  } else if (generationBasis === "continuation") {
    checks.generationBasisMatches = true;
  } else {
    fail({
      checks,
      characterCount,
      generationBasis,
      targetScene
    }, "SPACE_PROVIDER_PROMPT_INVALID");
  }
  if (generationBasis !== "standard") {
    if (targetScene) {
      const hasSubtype = actualPrompt.includes(targetScene);
      const hasLabel = targetSceneLabel && actualPrompt.includes(targetSceneLabel);
      checks.targetSceneMarker = hasSubtype || hasLabel;
    } else {
      checks.targetSceneMarker = true;
    }
    if (!checks.targetSceneMarker) {
      fail({
        checks,
        characterCount,
        generationBasis,
        targetScene,
        targetSceneLabel
      }, "SPACE_PROVIDER_PROMPT_INVALID");
    }
  } else {
    checks.targetSceneMarker = true;
  }
  return {
    passed: true,
    version: SPACE_PROVIDER_PROMPT_GATE_VERSION,
    isEdited,
    checks,
    characterCount,
    providerCap,
    generationBasis,
    targetScene
  };
}
export {
  SPACE_PROVIDER_PROMPT_GATE_VERSION,
  assertProviderPromptGateB
};
