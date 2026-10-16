function isAnalysisSourceAsset(asset) {
  return asset.usage !== "generation_reference";
}
export {
  isAnalysisSourceAsset
};
