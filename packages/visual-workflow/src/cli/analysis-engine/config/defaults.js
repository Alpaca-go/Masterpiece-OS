const CLI_ENGINE_VERSION = "cli-engine@5.0.0";
const CLI_PIPELINE_ID = "deep-creative-director";
const CLI_OFFICIAL_OUTPUT_FILES = Object.freeze({
  "zh-CN": "\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A.md",
  en: "Creative-Upgrade-Brief.md"
});
const CLI_DEFAULTS = Object.freeze({
  analysisMode: "deep",
  creativeAuthority: "maximum",
  lockedVisualAssets: Object.freeze(["logo"]),
  officialOutputFiles: Object.freeze(["\u89C6\u89C9\u65B9\u6848\u5347\u7EA7\u62A5\u544A.md"]),
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
    maxReportCharacters: 8e3,
    enablePreparationCache: true
  })
});
export {
  CLI_DEFAULTS,
  CLI_ENGINE_VERSION,
  CLI_OFFICIAL_OUTPUT_FILES,
  CLI_PIPELINE_ID
};
