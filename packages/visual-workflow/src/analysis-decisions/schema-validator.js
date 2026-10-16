import {
  isRecord,
  nonEmptyText,
  valueAtPath
} from "./path-utils.js";
function issue(path, code, kind, message) {
  return { path, code, kind, message };
}
function requireText(packet, path, code, issues) {
  if (!nonEmptyText(valueAtPath(packet, path))) {
    issues.push(issue(path, code, "missing", `${path} is required.`));
  }
}
function requireKnownFact(packet, path, code, issues) {
  const value = valueAtPath(packet, path);
  if (!nonEmptyText(value) || String(value).trim().toLowerCase() === "unknown") {
    issues.push(issue(path, code, "missing", `${path} requires a confirmed source fact.`));
  }
}
function requireArray(packet, path, code, issues) {
  if (!Array.isArray(valueAtPath(packet, path))) {
    issues.push(issue(path, code, "invalid", `${path} must be an array.`));
  }
}
function validateAnalysisPacketSchema(packet) {
  if (!isRecord(packet)) {
    return [
      issue(
        "$",
        "PROJECT_CONTEXT_CORRUPTED",
        "invalid",
        "Structured analysis packet must be an object."
      )
    ];
  }
  const issues = [];
  requireText(packet, "schemaVersion", "SCHEMA_VERSION_MISSING", issues);
  if (nonEmptyText(packet.schemaVersion) && packet.schemaVersion !== "1.0") {
    issues.push(issue(
      "schemaVersion",
      "SCHEMA_MIGRATION_REQUIRED",
      "invalid",
      `Unsupported structured analysis schema version: ${packet.schemaVersion}.`
    ));
  }
  requireText(packet, "projectId", "PROJECT_ID_MISSING", issues);
  requireKnownFact(packet, "projectFacts.brandName.value", "BRAND_NAME_MISSING", issues);
  requireKnownFact(packet, "projectFacts.industry.value", "INDUSTRY_MISSING", issues);
  requireKnownFact(packet, "projectFacts.brandRole.value", "BRAND_ROLE_FACT_MISSING", issues);
  requireArray(packet, "lockedAssets", "LOCKED_ASSETS_INVALID", issues);
  requireArray(packet, "diagnosis.brandMisreadRisks", "BRAND_MISREAD_RISKS_INVALID", issues);
  requireArray(packet, "creativeDecision.toneBoundaries", "TONE_BOUNDARIES_INVALID", issues);
  requireArray(packet, "abstractions", "VISUAL_ABSTRACTIONS_INVALID", issues);
  requireText(packet, "provenance.generatedAt", "GENERATED_AT_MISSING", issues);
  requireText(packet, "provenance.sourceFingerprint", "SOURCE_FINGERPRINT_MISSING", issues);
  const boundaries = valueAtPath(packet, "creativeDecision.toneBoundaries");
  if (Array.isArray(boundaries) && (boundaries.length < 2 || boundaries.some((boundary) => !isRecord(boundary) || !nonEmptyText(boundary.target) || !Array.isArray(boundary.avoid) || boundary.avoid.length === 0 || !boundary.avoid.some(nonEmptyText)))) {
    issues.push(issue(
      "creativeDecision.toneBoundaries",
      "TONE_BOUNDARIES_MISSING",
      "missing",
      "At least two actionable tone boundaries are required."
    ));
  }
  return issues;
}
export {
  validateAnalysisPacketSchema
};
