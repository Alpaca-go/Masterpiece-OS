import { CLI_DEFAULTS, CLI_ENGINE_VERSION, CLI_OFFICIAL_OUTPUT_FILES } from "./defaults.js";
class AnalysisConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AnalysisConfigError";
    this.code = code;
  }
}
function strings(value, field) {
  if (value === void 0) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new AnalysisConfigError("CONFIG_INVALID", `${field} \u5FC5\u987B\u662F\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}
function optionalString(value, field, fallback = "") {
  if (value === void 0 || value === null) return fallback;
  if (typeof value !== "string") throw new AnalysisConfigError("CONFIG_INVALID", `${field} \u5FC5\u987B\u662F\u5B57\u7B26\u4E32`);
  return value.trim();
}
function positiveNumber(value, field, fallback) {
  if (value === void 0 || value === null) return fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new AnalysisConfigError("CONFIG_INVALID", `${field} \u5FC5\u987B\u662F\u6B63\u6570`);
  }
  return value;
}
function createAnalysisProjectConfig(raw = {}, options = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new AnalysisConfigError("CONFIG_INVALID", "\u5206\u6790\u9879\u76EE\u914D\u7F6E\u5FC5\u987B\u662F\u5BF9\u8C61");
  }
  const suppliedOverrides = raw.overrides || {};
  const outputLanguage = suppliedOverrides.outputLanguage || raw.outputLanguage || "zh-CN";
  if (!Object.hasOwn(CLI_OFFICIAL_OUTPUT_FILES, outputLanguage)) {
    throw new AnalysisConfigError("CONFIG_INVALID", "outputLanguage \u53EA\u5141\u8BB8 zh-CN \u6216 en");
  }
  const allowLogoRedesign = suppliedOverrides.allowLogoRedesign ?? false;
  if (typeof allowLogoRedesign !== "boolean") {
    throw new AnalysisConfigError("CONFIG_INVALID", "overrides.allowLogoRedesign \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
  }
  const brandFacts = raw.brandFacts || {};
  const projectName = optionalString(raw.projectName, "projectName", options.projectName || "\u672A\u547D\u540D\u9879\u76EE");
  const brandName = optionalString(
    brandFacts.brandName ?? raw.brand?.name,
    "brandFacts.brandName",
    projectName
  );
  const industry = optionalString(brandFacts.industry ?? raw.industry, "brandFacts.industry", "\u5F85\u786E\u8BA4");
  const additionalLockedAssets = strings(suppliedOverrides.additionalLockedAssets, "overrides.additionalLockedAssets");
  const performance = raw.performance || {};
  const benchmarkContext = raw.benchmarkContext || {};
  if (performance.enablePreparationCache !== void 0 && typeof performance.enablePreparationCache !== "boolean") {
    throw new AnalysisConfigError("CONFIG_INVALID", "performance.enablePreparationCache \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
  }
  const targetMinutes = positiveNumber(performance.targetMinutes, "performance.targetMinutes", CLI_DEFAULTS.performance.targetMinutes);
  const maximumMinutes = positiveNumber(performance.maximumMinutes, "performance.maximumMinutes", CLI_DEFAULTS.performance.maximumMinutes);
  const maxDetailAssets = Math.trunc(positiveNumber(performance.maxDetailAssets, "performance.maxDetailAssets", CLI_DEFAULTS.performance.maxDetailAssets));
  const maxReportCharacters = Math.trunc(positiveNumber(performance.maxReportCharacters, "performance.maxReportCharacters", CLI_DEFAULTS.performance.maxReportCharacters));
  if (maximumMinutes < targetMinutes) {
    throw new AnalysisConfigError("CONFIG_INVALID", "performance.maximumMinutes \u4E0D\u5F97\u5C0F\u4E8E targetMinutes");
  }
  if (maxDetailAssets < 1) throw new AnalysisConfigError("CONFIG_INVALID", "performance.maxDetailAssets \u5FC5\u987B\u81F3\u5C11\u4E3A 1");
  if (maxReportCharacters < 6e3) {
    throw new AnalysisConfigError("CONFIG_INVALID", "performance.maxReportCharacters \u4E0D\u5F97\u4F4E\u4E8E 6000");
  }
  return Object.freeze({
    version: CLI_ENGINE_VERSION,
    projectName,
    userTask: optionalString(raw.userTask, "userTask"),
    brandFacts: Object.freeze({
      brandName,
      industry,
      factualConstraints: Object.freeze(strings(brandFacts.factualConstraints, "brandFacts.factualConstraints")),
      logoAssets: Object.freeze(strings(brandFacts.logoAssets, "brandFacts.logoAssets"))
    }),
    benchmarkContext: Object.freeze({
      category: Object.freeze(strings(benchmarkContext.category, "benchmarkContext.category")),
      creativeExcellence: Object.freeze(strings(benchmarkContext.creativeExcellence, "benchmarkContext.creativeExcellence"))
    }),
    performance: Object.freeze({
      targetMinutes,
      maximumMinutes,
      maxDetailAssets,
      maxReportCharacters,
      enablePreparationCache: performance.enablePreparationCache ?? CLI_DEFAULTS.performance.enablePreparationCache
    }),
    overrides: Object.freeze({
      additionalLockedAssets: Object.freeze(additionalLockedAssets),
      allowLogoRedesign,
      requiredApplications: Object.freeze(strings(suppliedOverrides.requiredApplications, "overrides.requiredApplications")),
      forbiddenChanges: Object.freeze(strings(suppliedOverrides.forbiddenChanges, "overrides.forbiddenChanges")),
      outputLanguage
    }),
    runtime: Object.freeze({
      analysisMode: CLI_DEFAULTS.analysisMode,
      creativeAuthority: CLI_DEFAULTS.creativeAuthority,
      lockedVisualAssets: Object.freeze([
        ...allowLogoRedesign ? [] : CLI_DEFAULTS.lockedVisualAssets,
        ...additionalLockedAssets
      ]),
      officialOutputFile: CLI_OFFICIAL_OUTPUT_FILES[outputLanguage],
      useCompilerPipeline: false,
      useCreativeFreedomRecommendation: false,
      useModeRecommendation: false,
      useSeparateRuntimeProtocol: false
    }),
    deepCreativeDirectorResult: raw.deepCreativeDirectorResult ? structuredClone(raw.deepCreativeDirectorResult) : null
  });
}
export {
  AnalysisConfigError,
  createAnalysisProjectConfig
};
