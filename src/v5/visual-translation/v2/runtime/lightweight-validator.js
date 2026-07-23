const unique = (values) => [...new Set(values.filter(Boolean))];

export function validateLightweightDirections({ compiled, pipelineCompleteness, benchmarkRetrieval } = {}) {
  const gates = compiled?.gates || {};
  const hardBlocks = [];
  const rewrites = [];
  const warnings = [];

  if (!Array.isArray(compiled?.directions) || compiled.directions.length < 3) hardBlocks.push('DIRECTION_COUNT_INSUFFICIENT');
  if (gates.brand_identity_preservation?.error_code === 'UNEXPECTED_BRAND_IDENTITY'
    || gates.brand_identity_preservation?.brand_name_preserved === false) hardBlocks.push('PROJECT_BRAND_REPLACED');
  if (gates.asset_authorization?.forgery_detected) hardBlocks.push('UNAUTHORIZED_OR_UNGROUNDED_ASSET');

  if (gates.business_model_coverage?.business_model_undercoverage) rewrites.push('BUSINESS_MODEL_MISREAD');
  if (gates.direction_family_difference?.rewrite_required) rewrites.push('DIRECTION_MECHANISMS_TOO_SIMILAR');
  if (gates.execution_example_completeness?.any_blocked || gates.execution_example_completeness?.any_conditional) rewrites.push('EXECUTION_FIELDS_INCOMPLETE');
  if (gates.execution_example_specificity?.template_overuse) rewrites.push('ABSTRACT_OR_TEMPLATE_DRIVEN');

  if (gates.group_visual_authorization?.warning) warnings.push('UNCONFIRMED_RELATIONSHIP_MENTIONED');
  if (gates.direction_touchpoint_risk?.warning) warnings.push('TOUCHPOINT_ADAPTATION_RISK');
  if (benchmarkRetrieval && benchmarkRetrieval.retrieval_status !== 'completed') warnings.push(`BENCHMARK_RETRIEVAL_${String(benchmarkRetrieval.retrieval_status).toUpperCase()}`);
  if (pipelineCompleteness === 'partial') warnings.push('PIPELINE_PARTIAL');
  if (pipelineCompleteness === 'fallback') warnings.push('LEGACY_FALLBACK_USED');

  const hard = unique(hardBlocks);
  const rewrite = unique(rewrites);
  const warning = unique(warnings);
  const status = hard.length ? 'blocked' : rewrite.length ? 'rewrite_required' : warning.length ? 'ready_with_warnings' : 'ready';
  return Object.freeze({
    validator_version: 'lightweight-validator-v1',
    status,
    hard_blocks: Object.freeze(hard),
    rewrite_required: Object.freeze(rewrite),
    warnings: Object.freeze(warning)
  });
}

const clamp5 = (value) => Math.max(1, Math.min(5, Math.round(value)));
const containsSpecificMechanism = (value) => /映射|矩阵|窗口|轨迹|标签|切片|编排|回流|验证|选择|规则|状态/u.test(String(value || ''));

function criticDimensions(item, compiled, assetEvidence) {
  const direction = item.direction || item;
  const examples = direction.execution_examples || [];
  const assets = direction.asset_references || [];
  const projectBrandPreserved = compiled?.gates?.brand_identity_preservation?.brand_name_preserved !== false;
  const familyDifference = Number(compiled?.gates?.direction_family_difference?.difference_score || 0.6);
  const templateOveruse = compiled?.gates?.execution_example_specificity?.template_overuse === true;
  const distinctTouchpoints = new Set(examples.map((example) => example.touchpoint || example.touchpoint_category)).size;
  const mechanismText = [
    direction.strategic_idea, direction.graphic_system?.how_graphics_form,
    direction.selection_mechanism?.visual_mapping_rule, direction.selection_mechanism?.platform_signature
  ].join(' ');
  const brandSignals = [direction.brand_evidence, direction.graphic_system?.brand_fact_mapping]
    .filter(Boolean).length;
  const assetAvailable = Object.entries(assetEvidence || {}).some(([key, value]) => key !== 'unresolved' && Array.isArray(value) && value.length);
  const familyType = direction.family_type || '';
  const businessMechanism = {
    supply_chain_trust: /供应链|验证|交付|温控|追溯|履约/gu,
    product_material_aesthetics: /选择|筛选|矩阵|标准|多品类|组合/gu,
    industry_ecosystem: /角色|交换|回流|编排|协同|状态/gu
  }[familyType] || /平台|业务|服务/gu;
  const businessHits = new Set(mechanismText.match(businessMechanism) || []).size;
  const genericTemplateHits = (mechanismText.match(/通用|节点网络|科技粒子|材质纹理|低透明|左图右文/gu) || []).length;
  const abstractHeroCount = examples.filter((example) => /概念|氛围|能量|未来|生态图|抽象/iu.test(`${example.hero_subject || ''} ${example.industry_content || ''}`)).length;
  const brandBase = clamp5(1 + (projectBrandPreserved ? 1 : 0) + Math.min(2, brandSignals) + (assets.length ? 1 : 0));
  return Object.freeze({
    brand_exclusivity: assetAvailable && assets.length === 0 ? Math.min(3, brandBase) : brandBase,
    business_model_accuracy: clamp5(1 + Math.min(2, businessHits) + (direction.selection_mechanism ? 1 : 0) + (direction.brand_evidence ? 1 : 0)),
    visual_freshness: clamp5(1 + familyDifference * 2 + (containsSpecificMechanism(mechanismText) ? 1 : 0) - genericTemplateHits - (templateOveruse ? 1 : 0)),
    anchor_potential: clamp5(1 + (containsSpecificMechanism(mechanismText) ? 2 : 0) + Math.min(1, (direction.core_reusable_assets || []).filter((asset) => asset.reusable_touchpoints?.length > 1).length) + (assets.length ? 1 : 0)),
    cross_touchpoint_scalability: clamp5(1 + Math.min(2, distinctTouchpoints) + ((direction.core_reusable_assets || []).some((asset) => asset.reusable_touchpoints?.length > 1) ? 1 : 0) + (examples.some((example) => example.responsive_adaptation) ? 1 : 0)),
    touchpoint_realism: clamp5(1 + Math.min(2, distinctTouchpoints) + (examples.every((example) => example.hero_subject && example.communication_goal) ? 1 : 0) + (examples.some((example) => example.industry_content) ? 1 : 0) - abstractHeroCount),
    anti_template_strength: clamp5(2 + ((direction.template_risks || []).length ? 1 : 0) + (!templateOveruse ? 1 : 0) - genericTemplateHits)
  });
}

function dimensionScore(dimensions) {
  return Math.round(Object.values(dimensions).reduce((sum, value) => sum + value, 0) / 35 * 100);
}

function comparativeSignals(item) {
  const direction = item.direction || item;
  const examples = direction.execution_examples || [];
  const text = [
    direction.strategic_idea,
    direction.graphic_system?.how_graphics_form,
    direction.selection_mechanism?.visual_mapping_rule,
    direction.selection_mechanism?.platform_signature,
    ...examples.flatMap((example) => [
      example.hero_subject, example.industry_content, example.communication_goal,
      example.brand_specific_detail, example.information_hierarchy
    ])
  ].filter(Boolean).join(' ');
  const concrete = (text.match(/验证|交付|追溯|履约|温控|选择|筛选|矩阵|窗口|轨迹|标签|交换|回流|编排|协同/gu) || []).length;
  const generic = (text.match(/通用|材质纹理|科技粒子|节点网络|氛围|能量|未来|抽象|微观/gu) || []).length;
  const touchpointReality = examples.filter((example) =>
    example.hero_subject && example.communication_goal
    && (example.industry_content || example.brand_specific_detail)
  ).length;
  const reusable = (direction.core_reusable_assets || [])
    .filter((asset) => (asset.reusable_touchpoints || []).length > 1).length;
  return {
    comparison_quality: concrete * 2 + touchpointReality + reusable - generic * 2,
    template_risk: generic
      ? `检测到 ${generic} 个通用化表达，需防止退化为行业模板。`
      : '未检测到显著通用模板表达，仍需用真实触点复核。',
    anchor_reason: concrete || reusable
      ? `包含 ${concrete} 个具体业务机制信号和 ${reusable} 个跨触点复用资产。`
      : '具体业务机制和跨触点复用证据不足，Anchor 潜力有限。'
  };
}

export function evaluateModelCriticAdvisory(compiled, { benchmarkRetrieval, visualAssetEvidence } = {}) {
  const failedRetrieval = ['failed', 'not_configured'].includes(benchmarkRetrieval?.retrieval_status);
  const assetAvailable = Object.entries(visualAssetEvidence || {}).some(([key, value]) => key !== 'unresolved' && Array.isArray(value) && value.length);
  const directionDrafts = (compiled?.directions || []).map((item, index) => {
    const dimensions = criticDimensions(item, compiled, visualAssetEvidence);
    const rawScore = dimensionScore(dimensions);
    const score = failedRetrieval ? Math.min(69, Math.round(rawScore * 0.69)) : rawScore;
    const weakest = Object.entries(dimensions).sort((a, b) => a[1] - b[1])[0];
    return {
      direction_id: item.direction?.direction_id || item.direction_id || `D${index + 1}`,
      score,
      recommendation: score >= 80 ? 'Recommended' : score >= 60 ? 'Promising With Revision' : 'Weak',
      conclusion: score >= 80 ? '优先保留' : score >= 60 ? '可继续深化' : '需修改',
      dimensions,
      strengths: '评价基于品牌专属性、业务准确性、视觉机制与跨触点能力，不计入结构完整度。',
      problems: weakest ? `${weakest[0]} 是当前最低维度（${weakest[1]}/5）。` : '暂无可比较维度。',
      action: weakest ? `优先提升 ${weakest[0]}，并用真实资产或触点证据复核。` : '补齐方向后重新评估。',
      ...comparativeSignals(item)
    };
  });
  let secondPassRequired = false;
  let secondPassResolved = false;
  const tieGroups = new Map();
  for (const item of directionDrafts) {
    const key = `${item.score}|${JSON.stringify(item.dimensions)}`;
    tieGroups.set(key, [...(tieGroups.get(key) || []), item]);
  }
  for (const group of tieGroups.values()) {
    if (group.length < 2) continue;
    secondPassRequired = true;
    const ranked = [...group].sort((left, right) =>
      right.comparison_quality - left.comparison_quality
      || left.direction_id.localeCompare(right.direction_id)
    );
    if (new Set(ranked.map((item) => item.comparison_quality)).size > 1) {
      secondPassResolved = true;
      ranked.forEach((item, index) => {
        const delta = index === 0 ? 1 : index === ranked.length - 1 ? -1 : 0;
        item.score = Math.max(0, Math.min(failedRetrieval ? 69 : 100, item.score + delta));
        item.second_pass_adjustment = delta;
      });
    } else {
      ranked.forEach((item) => {
        item.second_pass_adjustment = 0;
        item.tie_reason = '逐维比较后，具体机制、模板风险与触点真实性仍无可证差异。';
      });
    }
  }
  const perDirection = directionDrafts.map((item) => Object.freeze(item));
  const scores = perDirection.map((item) => item.score);
  const rawCollectionScore = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const score = failedRetrieval ? Math.min(69, rawCollectionScore) : rawCollectionScore;
  const spread = scores.length ? Math.max(...scores) - Math.min(...scores) : 0;
  const dimensionNames = ['brand_exclusivity', 'business_model_accuracy', 'visual_freshness', 'anchor_potential', 'cross_touchpoint_scalability', 'touchpoint_realism', 'anti_template_strength'];
  const dimensionRankings = dimensionNames.map((dimension) => {
    const ranking = [...perDirection].sort((left, right) =>
      right.dimensions[dimension] - left.dimensions[dimension]
      || right.score - left.score
      || left.direction_id.localeCompare(right.direction_id)
    );
    const values = ranking.map((item) => item.dimensions[dimension]);
    return Object.freeze({
      dimension,
      ranking: Object.freeze(ranking.map((item) => item.direction_id)),
      rationale: new Set(values).size === 1
        ? `本维度同为 ${values[0]}/5，按总体维度风险与方向编号稳定排序，不以该维度单独决策。`
        : `${ranking[0].direction_id} 在该维度得分最高（${values[0]}/5）。`
    });
  });
  const relative = [...perDirection].sort((left, right) =>
    right.score - left.score
    || right.comparison_quality - left.comparison_quality
    || right.dimensions.anchor_potential - left.dimensions.anchor_potential
    || right.dimensions.brand_exclusivity - left.dimensions.brand_exclusivity
    || left.direction_id.localeCompare(right.direction_id)
  );
  const comparativeDirectionResults = relative.map((item, index) => {
    const orderedDimensions = Object.entries(item.dimensions).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    return Object.freeze({
      direction_id: item.direction_id,
      strongest_dimension: orderedDimensions[0]?.[0] || 'not_available',
      weakest_dimension: orderedDimensions.at(-1)?.[0] || 'not_available',
      template_risk: item.template_risk,
      anchor_reason: item.anchor_reason,
      relative_rank: index + 1
    });
  });
  const noAssetUsage = assetAvailable && (compiled?.directions || []).every((item) => !(item.direction || item).asset_references?.length);
  const unresolvedEvidence = compiled?.gates?.asset_authorization?.per_direction?.some((item) =>
    item.detections?.some((detection) => detection.rule_id === 'EVIDENCE_BOUND_VALUE_REQUIRED')
  );
  const criticConfidence = failedRetrieval || noAssetUsage || unresolvedEvidence ? 'low'
    : benchmarkRetrieval?.retrieval_status === 'partial' ? 'medium' : 'high';
  const setLevelCritic = Object.freeze({
    best_direction_id: relative[0]?.direction_id,
    weakest_direction_id: relative.at(-1)?.direction_id,
    dimension_rankings: Object.freeze(dimensionRankings),
    recommendation_confidence: criticConfidence,
    comparative_summary: relative.length
      ? `${relative[0].direction_id}在综合维度与 Anchor 潜力上临时优先；${relative.at(-1).direction_id}当前相对最弱。`
      : '当前没有可比较方向。',
    second_pass_required: secondPassRequired,
    second_pass_resolved: secondPassResolved,
    comparative_direction_results: Object.freeze(comparativeDirectionResults)
  });
  return Object.freeze({
    critic_version: 'design-critic-advisory-v4',
    runtime_effect: 'none',
    structural_readiness_excluded: true,
    collection_score_cap: failedRetrieval ? 69 : null,
    score,
    recommendation: score >= 80 ? 'Recommended' : score >= 60 ? 'Promising With Revision' : 'Weak',
    score_only_recommendation_allowed: spread >= 3,
    ranking_basis: spread < 3 ? 'dimensions_and_risks' : 'dimension_score',
    critic_confidence: criticConfidence,
    second_pass_required: secondPassRequired,
    set_level_critic: setLevelCritic,
    per_direction: Object.freeze(perDirection)
  });
}
