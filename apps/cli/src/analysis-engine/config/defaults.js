export const CLI_ENGINE_VERSION = 'cli-engine@5.0.0';
export const CLI_PIPELINE_ID = 'deep-creative-director';
export const CLI_OFFICIAL_OUTPUT_FILES = Object.freeze({
  'zh-CN': '视觉方案升级报告.md',
  en: 'Creative-Upgrade-Brief.md'
});

export const CLI_DEFAULTS = Object.freeze({
  analysisMode: 'deep',
  creativeAuthority: 'maximum',
  lockedVisualAssets: Object.freeze(['logo']),
  officialOutputFiles: Object.freeze(['视觉方案升级报告.md']),
  useCompilerPipeline: false,
  useCreativeFreedomRecommendation: false,
  useModeRecommendation: false,
  useSeparateRuntimeProtocol: false,
  benchmark: Object.freeze({
    categoryTarget: 2,
    creativeExcellenceTarget: 2,
    maxTotal: 6
  }),
  recommendedAssetCount: Object.freeze({
    min: 6,
    idealMin: 8,
    idealMax: 15
  }),
  performance: Object.freeze({
    targetMinutes: 10,
    maximumMinutes: 15,
    maxDetailAssets: 5,
    maxReportCharacters: 8000,
    enablePreparationCache: true
  })
});
