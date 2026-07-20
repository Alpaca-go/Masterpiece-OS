// Experimental v2 execution report adapter (doc section 十一).
//
// Produces an INDEPENDENT experimental report
// `visual-directions-execution-report-v2-experimental.md`. It does NOT replace
// the v1.3.3 Decision Report Compiler. It summarises the validated v2
// directions, their Execution Readiness scores, regression-guard results and an
// optional A/B comparison against the conceptual_v1 baseline.

const METRIC_LABELS = {
  industry_recognition_strength: '行业识别强度',
  directly_executable_degree: '可直接执行程度',
  reusable_visual_asset_count: '可复用视觉资产数量',
  flat_design_conversion_ability: '平面设计转化能力',
  real_touchpoint_coverage: '真实触点覆盖',
  brand_exclusivity: '品牌专属性',
  concept_art_risk: '概念稿风险',
  real_estate_drift_risk: '地产/展厅漂移风险',
  abstract_object_dependency: '抽象物体依赖'
};

function metricLine(key, value) {
  const lowerIsBetter = key === 'concept_art_risk' || key === 'real_estate_drift_risk' || key === 'abstract_object_dependency';
  const flag = lowerIsBetter ? (value <= 2 ? '✅' : '⚠️') : (value >= 4 ? '✅' : '⚠️');
  return `- ${METRIC_LABELS[key] || key}：**${value}** ${flag}`;
}

export function compileExecutionDirectionsReportV2({ projectId = 'unknown', compiled, abComparison } = {}) {
  const lines = [];
  lines.push(`# 执行向视觉方向 v2 实验报告（experimental）`);
  lines.push('');
  lines.push(`> 报告版本：` + 'visual-directions-execution-report-v2-experimental');
  lines.push(`> 项目：` + projectId);
  lines.push(`> 生成模式：` + (compiled?.direction_generation_mode || 'execution_oriented_v2'));
  lines.push(`> 整体状态：` + (compiled?.overall_status || 'unknown'));
  lines.push('');

  if (!compiled || !compiled.directions?.length) {
    lines.push('_未提供已编译的 v2 方向。_');
    return lines.join('\n');
  }

  for (const item of compiled.directions) {
    const d = item.direction;
    const r = item.readiness;
    lines.push(`## ${d.direction_id} · ${d.direction_name}`);
    lines.push('');
    lines.push(`**战略构想：** ${d.strategic_idea}`);
    lines.push('');
    lines.push(`**执行就绪：** ${r.execution_status} ｜ 综合就绪分 ${r.readiness_score}/100`);
    lines.push('');
    lines.push('**行业识别层**');
    const layer = d.industry_recognition_layer;
    lines.push(`- 行业视觉对象：${(layer.industry_visual_objects || []).join('、') || '—'}`);
    lines.push(`- 行业数据对象：${(layer.industry_data_objects || []).join('、') || '—'}`);
    lines.push(`- 行业流程对象：${(layer.industry_process_objects || []).join('、') || '—'}`);
    lines.push(`- 真实场景：${(layer.industry_space_and_real_scenes || []).join('、') || '—'}`);
    lines.push(`- 最低行业识别强度：${layer.minimum_industry_recognition_strength}`);
    lines.push('');
    lines.push(`**可复用视觉资产（${d.core_reusable_assets.length}）**`);
    for (const asset of d.core_reusable_assets) {
      lines.push(`- [${asset.asset_type}] ${asset.asset_name}（${asset.asset_id}）：${asset.visual_description}`);
    }
    lines.push('');
    lines.push('**执行就绪指标**');
    for (const [key, value] of Object.entries(r.metrics)) lines.push(metricLine(key, value));
    if (r.failed_criteria.length) {
      lines.push('');
      lines.push(`**未通过标准：**` + r.failed_criteria.map((f) => `${f.metric}(${f.actual})`).join('、'));
    }
    if (r.concept_art_violations.length) {
      lines.push(`**概念稿违规：** ` + r.concept_art_violations.join('、'));
    }
    lines.push('');
    lines.push(`**回归守卫：** 资产权限 ${item.assetAuthorization.ok ? 'OK' : 'FAIL'} ｜ 证据保护 ${item.evidencePreservation.ok ? 'OK' : 'FAIL'} ｜ 受众边界 ${item.audienceBoundaryGuard.ok ? 'OK' : 'FAIL'}`);
    lines.push('');
  }

  if (abComparison) {
    lines.push('## A/B 对比（conceptual_v1 vs execution_oriented_v2）');
    lines.push('');
    lines.push(`- 项目判定：${abComparison.project_verdict}`);
    lines.push(`- 人工偏好：${abComparison.human_preference}`);
    lines.push(`- v2 全部就绪：${abComparison.v2_all_ready}`);
    lines.push(`- 指标改善：${JSON.stringify(abComparison.measurable_criteria)}`);
    lines.push('');
  }

  return lines.join('\n');
}
