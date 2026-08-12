import { CLI_DEFAULTS, CLI_ENGINE_VERSION, CLI_OFFICIAL_OUTPUT_FILES } from './defaults.js';

export class AnalysisConfigError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AnalysisConfigError';
    this.code = code;
  }
}

function strings(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !item.trim())) {
    throw new AnalysisConfigError('CONFIG_INVALID', `${field} 必须是非空字符串数组`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

function optionalString(value, field, fallback = '') {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'string') throw new AnalysisConfigError('CONFIG_INVALID', `${field} 必须是字符串`);
  return value.trim();
}

function positiveNumber(value, field, fallback) {
  if (value === undefined || value === null) return fallback;
  if (!Number.isFinite(value) || value <= 0) {
    throw new AnalysisConfigError('CONFIG_INVALID', `${field} 必须是正数`);
  }
  return value;
}

export function createAnalysisProjectConfig(raw = {}, options = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new AnalysisConfigError('CONFIG_INVALID', '分析项目配置必须是对象');
  }
  const suppliedOverrides = raw.overrides || {};
  const outputLanguage = suppliedOverrides.outputLanguage || raw.outputLanguage || 'zh-CN';
  if (!Object.hasOwn(CLI_OFFICIAL_OUTPUT_FILES, outputLanguage)) {
    throw new AnalysisConfigError('CONFIG_INVALID', 'outputLanguage 只允许 zh-CN 或 en');
  }
  const allowLogoRedesign = suppliedOverrides.allowLogoRedesign ?? false;
  if (typeof allowLogoRedesign !== 'boolean') {
    throw new AnalysisConfigError('CONFIG_INVALID', 'overrides.allowLogoRedesign 必须是布尔值');
  }

  const brandFacts = raw.brandFacts || {};
  const projectName = optionalString(raw.projectName, 'projectName', options.projectName || '未命名项目');
  const brandName = optionalString(
    brandFacts.brandName ?? raw.brand?.name,
    'brandFacts.brandName',
    projectName
  );
  const industry = optionalString(brandFacts.industry ?? raw.industry, 'brandFacts.industry', '待确认');
  const additionalLockedAssets = strings(suppliedOverrides.additionalLockedAssets, 'overrides.additionalLockedAssets');
  const performance = raw.performance || {};
  const benchmarkContext = raw.benchmarkContext || {};
  if (performance.enablePreparationCache !== undefined && typeof performance.enablePreparationCache !== 'boolean') {
    throw new AnalysisConfigError('CONFIG_INVALID', 'performance.enablePreparationCache 必须是布尔值');
  }
  const targetMinutes = positiveNumber(performance.targetMinutes, 'performance.targetMinutes', CLI_DEFAULTS.performance.targetMinutes);
  const maximumMinutes = positiveNumber(performance.maximumMinutes, 'performance.maximumMinutes', CLI_DEFAULTS.performance.maximumMinutes);
  const maxDetailAssets = Math.trunc(positiveNumber(performance.maxDetailAssets, 'performance.maxDetailAssets', CLI_DEFAULTS.performance.maxDetailAssets));
  const maxReportCharacters = Math.trunc(positiveNumber(performance.maxReportCharacters, 'performance.maxReportCharacters', CLI_DEFAULTS.performance.maxReportCharacters));
  if (maximumMinutes < targetMinutes) {
    throw new AnalysisConfigError('CONFIG_INVALID', 'performance.maximumMinutes 不得小于 targetMinutes');
  }
  if (maxDetailAssets < 1) throw new AnalysisConfigError('CONFIG_INVALID', 'performance.maxDetailAssets 必须至少为 1');
  if (maxReportCharacters < 6000) {
    throw new AnalysisConfigError('CONFIG_INVALID', 'performance.maxReportCharacters 不得低于 6000');
  }

  return Object.freeze({
    version: CLI_ENGINE_VERSION,
    projectName,
    userTask: optionalString(raw.userTask, 'userTask'),
    brandFacts: Object.freeze({
      brandName,
      industry,
      factualConstraints: Object.freeze(strings(brandFacts.factualConstraints, 'brandFacts.factualConstraints')),
      logoAssets: Object.freeze(strings(brandFacts.logoAssets, 'brandFacts.logoAssets'))
    }),
    benchmarkContext: Object.freeze({
      category: Object.freeze(strings(benchmarkContext.category, 'benchmarkContext.category')),
      creativeExcellence: Object.freeze(strings(benchmarkContext.creativeExcellence, 'benchmarkContext.creativeExcellence'))
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
      requiredApplications: Object.freeze(strings(suppliedOverrides.requiredApplications, 'overrides.requiredApplications')),
      forbiddenChanges: Object.freeze(strings(suppliedOverrides.forbiddenChanges, 'overrides.forbiddenChanges')),
      outputLanguage
    }),
    runtime: Object.freeze({
      analysisMode: CLI_DEFAULTS.analysisMode,
      creativeAuthority: CLI_DEFAULTS.creativeAuthority,
      lockedVisualAssets: Object.freeze([
        ...(allowLogoRedesign ? [] : CLI_DEFAULTS.lockedVisualAssets),
        ...additionalLockedAssets
      ]),
      officialOutputFile: CLI_OFFICIAL_OUTPUT_FILES[outputLanguage],
      useCompilerPipeline: false,
      useCreativeFreedomRecommendation: false,
      useModeRecommendation: false,
      useSeparateRuntimeProtocol: false
    }),
    deepCreativeDirectorResult: raw.deepCreativeDirectorResult
      ? structuredClone(raw.deepCreativeDirectorResult)
      : null
  });
}
