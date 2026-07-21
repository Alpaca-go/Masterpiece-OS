// Experimental v2 execution report adapter (doc section 九 / 十一).
//
// Produces an INDEPENDENT experimental report
// `visual-directions-execution-report-v2-experimental.md`. It does NOT replace
// the v1.3.3 Decision Report Compiler.
//
// v2.1 report structure (doc section 九): the Gate 总览 (整体执行许可 + 阻断原因)
// is placed at the TOP of the report. Each direction then shows, in order:
// 战略构想 → 方向家族 → 品牌身份 → 业务模型覆盖 → 行业识别 → 可复用视觉资产 →
// 三个执行触点 → 消费者价值 → 权重分布 → 内容就绪度 → 执行许可 → 阻断原因 →
// 资产权限与伪造风险. A direction that is content-complete but not permitted
// never shows a perfect readiness score (capped at 59).

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

const PERMISSION_LABEL = {
  allowed: '允许执行 ✅',
  conditional: '条件执行 ⚠️',
  blocked: '阻断 ❌'
};

const OVERALL_STATUS_LABEL = {
  ready: 'Ready',
  ready_with_warnings: 'Ready With Warnings',
  rewrite_required: 'Rewrite Required',
  blocked: 'Blocked'
};

function metricLine(key, value) {
  const lowerIsBetter = key === 'concept_art_risk' || key === 'real_estate_drift_risk' || key === 'abstract_object_dependency';
  const flag = lowerIsBetter ? (value <= 2 ? '✅' : '⚠️') : (value >= 4 ? '✅' : '⚠️');
  return `- ${METRIC_LABELS[key] || key}：**${value}** ${flag}`;
}

function familyLabel(direction) {
  if (direction.family_type) return direction.family_type;
  if (direction.direction_family) return `Direction Family ${direction.direction_family}`;
  return '未声明';
}

export function compileExecutionDirectionsReportV2({ projectId = 'unknown', compiled, abComparison } = {}) {
  const lines = [];
  lines.push(`# 执行向视觉方向 v2.1.4.1 实验报告（experimental）`);
  lines.push('');
  lines.push(`> 报告版本：visual-directions-execution-report-v2.1.4.1-experimental`);
  lines.push(`> 协议：visual-translation-v2-execution`);
  lines.push(`> 项目：${projectId}`);
  lines.push(`> 生成模式：${compiled?.direction_generation_mode || 'execution_oriented_v2'}`);
  if (compiled?.overall_status) {
    lines.push(`> 整体状态：${OVERALL_STATUS_LABEL[compiled.overall_status] || compiled.overall_status}`);
  }
  if (compiled?.execution_permission_status) {
    lines.push(`> 整体执行许可：**${PERMISSION_LABEL[compiled.execution_permission_status] || compiled.execution_permission_status}**`);
  }
  lines.push('');

  if (!compiled || !compiled.directions?.length) {
    lines.push('_未提供已编译的 v2 方向。_');
    return lines.join('\n');
  }

  const gates = compiled.gates || {};

  // ── Gate 总览（doc section 九：必须放在报告顶部）──
  lines.push('---');
  lines.push('## Gate 总览');
  lines.push('');
  lines.push(`> 整体执行许可：**${PERMISSION_LABEL[compiled.execution_permission_status] || compiled.execution_permission_status}**`);
  lines.push(`> 整体状态：**${OVERALL_STATUS_LABEL[compiled.overall_status] || compiled.overall_status}**`);
  // v2.1.4.1 — graded issue display (doc §七).
  const blockingReasons = compiled.blocking_reasons || [];
  const rewriteReasons = blockingReasons.filter((r) => r.startsWith('e02_') || r.startsWith('execution_example_') || r.startsWith('compliance_') || r.startsWith('direction_family_') || r.startsWith('industry_') || r.startsWith('spatial_') || r.startsWith('consumer_') || r === 'set_missing_consumer_value' || r === 'business_model_undercoverage');
  const blockReasons = blockingReasons.filter((r) => !rewriteReasons.includes(r));
  if (blockReasons.length) {
    lines.push('> **阻断原因：**');
    for (const reason of blockReasons) lines.push(`> - 🔴 ${reason}`);
  }
  if (rewriteReasons.length) {
    lines.push('> **重写原因：**');
    for (const reason of rewriteReasons) lines.push(`> - 🟠 ${reason}`);
  }
  const conditionalIssues = [];
  if (gates.e02_aesthetic_gate?.brand_exclusivity_status === 'conditional') conditionalIssues.push(`brand_exclusivity(E02=${gates.e02_aesthetic_gate.brand_exclusivity_score})`);
  if (conditionalIssues.length) {
    lines.push('> **条件问题：**');
    for (const issue of conditionalIssues) lines.push(`> - 🟡 ${issue}`);
  }
  // v2.1.4 — info-level notes (non-blocking).
  if (compiled.info_issues?.length) {
    lines.push(`> ℹ️ 非阻断提示：`);
    for (const issue of compiled.info_issues) lines.push(`> - ${issue}`);
  }
  lines.push('');

  // ── Per-direction detail (doc section 九 order) ──
  for (const item of compiled.directions) {
    const d = item.direction;
    const r = item.readiness;

    // v2.1.1 (P0) — a direction that failed schema validation is reported as a
    // blocked entry with its validation_error (field path + message).
    if (item.validation_error) {
      lines.push(`## ${d.direction_id} · ${d.direction_name}`);
      lines.push('');
      lines.push(`**执行许可：** ${PERMISSION_LABEL[item.execution_permission_status] || item.execution_permission_status}`);
      lines.push(`**阻断原因：** Schema 校验失败（${item.validation_error.code}）`);
      lines.push(`- 字段路径：${item.validation_error.path || '（未提供）'}`);
      lines.push(`- 错误信息：${item.validation_error.message}`);
      if (item.validation_error.issues?.length) {
        for (const issue of item.validation_error.issues) lines.push(`- 明细：${issue}`);
      }
      lines.push('');
      continue;
    }

    const cv = gates.consumer_value_coverage?.per_direction?.find((c) => c.direction_id === d.direction_id);
    const weights = d.compliance_weights || {};
    const fam = d.direction_family ? ` ｜ 方向家族 ${d.direction_family}` : '';

    lines.push(`## ${d.direction_id} · ${d.direction_name}`);
    lines.push('');
    lines.push(`**战略构想：** ${d.strategic_idea}`);
    lines.push(`**方向家族：** ${familyLabel(d)}`);
    lines.push(`**品牌身份：** ${gates.brand_identity_preservation?.brand_identity_preserved ? '保留 ✅' : '污染 ❌'}${fam}`);
    lines.push('');

    // 业务模型覆盖
    const bmc = gates.business_model_coverage?.per_direction?.find((c) => c.direction_id === d.direction_id);
    if (bmc) {
      lines.push(`**业务模型覆盖：** 已覆盖 ${bmc.covered_dimension_count}/4 维（上游${bmc.b2b_coverage ? '✓' : '✗'} 平台${bmc.platform_role_coverage ? '✓' : '✗'} 机构${bmc.industry_ecosystem_coverage ? '✓' : '✗'} 消费者${bmc.consumer_value_coverage ? '✓' : '✗'}）`);
    }
    lines.push('');

    // 行业识别层
    lines.push('**行业识别层**');
    const layer = d.industry_recognition_layer;
    lines.push(`- 行业视觉对象：${(layer.industry_visual_objects || []).join('、') || '—'}`);
    lines.push(`- 行业数据对象：${(layer.industry_data_objects || []).join('、') || '—'}`);
    lines.push(`- 行业流程对象：${(layer.industry_process_objects || []).join('、') || '—'}`);
    lines.push(`- 真实场景：${(layer.industry_space_and_real_scenes || []).join('、') || '—'}`);
    lines.push(`- 最低行业识别强度：${layer.minimum_industry_recognition_strength}`);
    lines.push('');

    // 可复用视觉资产
    lines.push(`**可复用视觉资产（${d.core_reusable_assets.length}）**`);
    for (const asset of d.core_reusable_assets) {
      lines.push(`- [${asset.asset_type}] ${asset.asset_name}（${asset.asset_id}）：${asset.visual_description}`);
    }
    lines.push('');

    // 三个执行触点
    const dirEec = gates.execution_example_completeness?.per_direction?.find((p) => p.direction_id === d.direction_id);
    const exampleStatusLabel = dirEec ? (dirEec.blocked ? '缺失' : (dirEec.conditional ? '部分完整' : (dirEec.warning ? '基本完整' : '完整'))) : '';
    lines.push(`**三个执行触点**${exampleStatusLabel ? '（' + exampleStatusLabel + '）' : ''}`);
    for (const ex of d.execution_examples) {
      const exEec = dirEec?.examples?.find((e) => e.touchpoint === ex.touchpoint);
      lines.push(`- [${ex.touchpoint_category}] ${ex.touchpoint || ''} ｜ 主体：${ex.subject} ｜ 行业识别：${ex.industry_recognition_source}`);
      // v2.1.2 — full execution-example display (doc §六).
      if (ex.audience) lines.push(`  - 受众：${ex.audience}`);
      if (ex.communication_goal) lines.push(`  - 传播目标：${ex.communication_goal}`);
      if (ex.hero_subject) lines.push(`  - 主体：${ex.hero_subject}`);
      if (ex.hero_subject_position || ex.hero_subject_scale) lines.push(`  - 主体位置与尺度：${ex.hero_subject_position || ''}${ex.hero_subject_scale ? ' / ' + ex.hero_subject_scale : ''}`);
      if (ex.supporting_subjects) lines.push(`  - 辅助对象：${ex.supporting_subjects}`);
      if (ex.graphic_overlay) lines.push(`  - 图形叠加：${ex.graphic_overlay}`);
      if (ex.information_zone) lines.push(`  - 信息区域：${ex.information_zone}`);
      if (ex.information_hierarchy) lines.push(`  - 信息层级：${ex.information_hierarchy}`);
      if (ex.brand_zone) lines.push(`  - 品牌区域：${ex.brand_zone}`);
      if (ex.whitespace_behavior) lines.push(`  - 留白逻辑：${ex.whitespace_behavior}`);
      if (ex.canvas_ratio || ex.photography_ratio || ex.graphic_ratio || ex.information_ratio) {
        lines.push(`  - 比例：画布 ${ex.canvas_ratio || '—'} ｜ 摄影 ${ex.photography_ratio || '—'} ｜ 图形 ${ex.graphic_ratio || '—'} ｜ 信息 ${ex.information_ratio || '—'}`);
      }
      if (ex.responsive_adaptation) lines.push(`  - 横竖版适配：${ex.responsive_adaptation}`);
      if (ex.brand_specific_detail) lines.push(`  - 品牌专属资产：${ex.brand_specific_detail}`);
      // downstream consumer value (per-example)
      const dcv = ex.downstream_consumer_value;
      if (dcv && dcv.present) {
        const parts = [`  - 消费者价值：覆盖(${dcv.consumer_value_role || '—'})`];
        if (dcv.value_statement) parts.push(`价值陈述：${dcv.value_statement}`);
        if (dcv.visual_expression) parts.push(`视觉表达：${dcv.visual_expression}`);
        lines.push(parts.join(' ｜ '));
      } else if (dcv && dcv.value_statement) {
        lines.push(`  - 消费者价值：${dcv.value_statement}`);
      }
      if (ex.prohibited_content || ex.anti_concept_art_rule) {
        lines.push(`  - 禁止内容：${ex.prohibited_content || ex.anti_concept_art_rule || ''}`);
      }
      // v2.1.3 — flag incomplete fields using critical/required/optional tiers.
      if (exEec) {
        if (exEec.critical_missing.length > 0) lines.push(`  - ❌ Critical 缺失：${exEec.critical_missing.join('、')}`);
        if (exEec.required_missing.length > 0) lines.push(`  - ⚠️ Required 缺失：${exEec.required_missing.join('、')}`);
        if (exEec.optional_missing.length > 0) lines.push(`  - ℹ️ Optional 缺失：${exEec.optional_missing.join('、')}`);
      }
    }
    lines.push('');

    // 消费者价值
    lines.push('**消费者价值（下游）**');
    if (cv && cv.present) {
      lines.push(`- 覆盖：是 ｜ 角色：${cv.consumer_value_role}`);
      if (cv.value_statement) lines.push(`- 价值陈述：${cv.value_statement}`);
      if (cv.visual_expression) lines.push(`- 视觉表达：${cv.visual_expression}`);
      if (cv.touchpoints?.length) lines.push(`- 触点：${cv.touchpoints.join('、')}`);
    } else if (d.downstream_consumer_value && d.downstream_consumer_value.value_statement) {
      lines.push(`- 价值陈述：${d.downstream_consumer_value.value_statement}`);
    } else {
      lines.push('- 覆盖：未显式声明（由文本推断）');
    }
    lines.push('');

    // 权重分布
    lines.push('**权重分布**');
    if (Object.keys(weights).length) {
      lines.push(`- 合规 ${weights.compliance_weight} ｜ 供应链 ${weights.supply_chain_weight} ｜ 产品材料 ${weights.product_material_weight} ｜ 生态 ${weights.ecosystem_weight} ｜ 品牌美学 ${weights.brand_aesthetic_weight} ｜ 消费者 ${weights.consumer_value_weight}`);
    } else {
      lines.push('- （模型未显式提供，由关键词密度推导）');
    }
    lines.push('');

    // 内容就绪度 + 执行许可（v2.1.4.1 — explicit cap explanation, doc §3.3）
    const expl = item.readiness.content_readiness_explanation;
    if (expl) {
      lines.push(`**内容就绪度：** ${expl.final_score}/100`);
      lines.push(`- 原始内容分：${expl.raw_score}`);
      if (expl.quality_cap !== expl.raw_score) {
        lines.push(`- 质量上限：${expl.quality_cap}（${expl.quality_cap_reasons.join('；')}）`);
      }
      if (expl.permission_cap !== null && expl.permission_cap !== expl.quality_cap) {
        lines.push(`- 执行许可上限：${expl.permission_cap}（${expl.permission_cap_reasons.join('；')}）`);
      }
      lines.push(`- 最终显示分：${expl.final_score}`);
    } else {
      lines.push(`**内容就绪度：** ${item.content_readiness_score}/100${item.execution_permission_status === 'blocked' ? '（已封顶 59，因执行许可为阻断）' : ''}`);
    }
    // v2.1.1 (doc section 五) — explainable Content Readiness breakdown (legacy).
    const br = item.readiness.content_readiness_breakdown;
    if (br) {
      lines.push(`**Content Readiness 明细：** raw=${br.raw} → 封顶 ${item.content_readiness_score}${br.caps.length ? `（${br.caps.join('，')}）` : ''}`);
      lines.push(`- 维度权重：行业识别 ${br.weights.industry_recognition} / 可直接执行 ${br.weights.direct_executability} / 可复用资产 ${br.weights.reusable_asset_quality} / 平面转化 ${br.weights.graphic_translation} / 触点覆盖 ${br.weights.touchpoint_coverage} / 品牌专属 ${br.weights.brand_exclusivity}`);
    }
    lines.push(`**执行许可：** ${PERMISSION_LABEL[item.execution_permission_status] || item.execution_permission_status}`);
    if (item.execution_permission_status !== 'allowed') {
      const reasons = compiled.blocking_reasons.filter((rc) => rc.includes(d.direction_id));
      if (reasons.length) lines.push(`**阻断原因：** ${reasons.join('、')}`);
    }
    lines.push('');

    // 执行就绪指标
    lines.push('**执行就绪指标**');
    for (const [key, value] of Object.entries(r.metrics)) lines.push(metricLine(key, value));
    if (r.failed_criteria.length) {
      lines.push(`**未通过标准：**` + r.failed_criteria.map((f) => `${f.metric}(${f.actual})`).join('、'));
    }
    if (r.concept_art_violations.length) {
      lines.push(`**概念稿违规：** ` + r.concept_art_violations.join('、'));
    }
    lines.push(`**回归守卫：** 资产权限 ${item.assetAuthorization.ok ? 'OK' : 'FAIL'} ｜ 证据保护 ${item.evidencePreservation.ok ? 'OK' : 'FAIL'} ｜ 受众边界 ${item.audienceBoundaryGuard.ok ? 'OK' : 'FAIL'}`);
    if (item.readiness.score_capped) lines.push(`**就绪分已封顶：** 59（存在未通过 Gate 或硬指标）`);
    lines.push('');

    // 资产权限与伪造风险（explainable, doc section 七 / v2.1.2 风险折叠）
    const aa = gates.asset_authorization?.per_direction?.find((p) => p.direction_id === d.direction_id);
    if (aa) {
      const blocked = aa.detections?.filter((x) => x.risk_level === 'blocked') || [];
      const warnings = aa.detections?.filter((x) => x.risk_level === 'warning') || [];
      // v2.1.2 — noise reduction: only show blocked + top-5 high-confidence warnings
      // in the main report; remaining warnings are folded.
      const topWarnings = warnings.filter((w) => w.confidence >= 0.7).slice(0, 5);
      const folded = warnings.filter((w) => !topWarnings.includes(w));
      if (blocked.length || topWarnings.length || folded.length) {
        lines.push('**资产权限与伪造风险**');
        for (const det of blocked) {
          lines.push(`- [阻断] 方向 ${det.direction_id} ｜ 字段 ${det.field_path} ｜ 检测「${det.detected_text}」｜ 风险类型 ${det.detection_type}（${det.rule_id}）`);
          lines.push(`  - 建议：${det.suggested_rewrite}`);
        }
        for (const det of topWarnings) {
          lines.push(`- [提示] 方向 ${det.direction_id} ｜ 字段 ${det.field_path} ｜ 检测「${det.detected_text}」｜ 风险类型 ${det.detection_type}（${det.rule_id}）`);
          lines.push(`  - 建议：${det.suggested_rewrite}`);
        }
        if (folded.length) {
          lines.push(`- （另有 ${folded.length} 条低置信/结构提示已折叠，可展开查看）`);
        }
        lines.push('');
      } else {
        lines.push('**资产权限与伪造风险：** 未检测到伪造资质/注册证/数据/责任人。');
        lines.push('');
      }
    }
  }

  // ── 专项修复 Gate 明细（doc section 13 评估顺序）──
  lines.push('---');
  lines.push('## 专项修复 Gate 明细');
  lines.push('');

  const bip = gates.brand_identity_preservation;
  if (bip) {
    lines.push(`### 1. 品牌身份保护 ${bip.brand_identity_preserved ? '✅' : '❌'}`);
    lines.push(`- 品牌名保留：${bip.brand_name_preserved ? '是' : '否'} ｜ 角色保留：${bip.brand_role_preserved ? '是' : '否'} ｜ 核心命题保留：${bip.strategic_thesis_preserved ? '是' : '否'} ｜ 行业身份未被简化：${bip.industry_identity_preserved ? '是' : '否'}`);
    if (bip.contamination_detected) {
      // v2.1.2 — distinguish hard-block vs warning detections.
      const hardBlocks = bip.contamination_sources.filter((s) => !s.possible_false_positive);
      const warnings = bip.contamination_sources.filter((s) => s.possible_false_positive);
      for (const s of hardBlocks) {
        lines.push(`- ❌ Hard Block 方向 ${s.direction_id}：非项目品牌 ${s.unexpected_brand_names?.join('/') || s.reason}`);
      }
      for (const s of warnings) {
        lines.push(`- ⚠️ 警告 方向 ${s.direction_id}：疑似非项目品牌 ${s.unexpected_brand_names?.join('/') || s.reason}（建议人工复核）`);
      }
    }
    lines.push('');
  }

  const bmc = gates.business_model_coverage;
  if (bmc) {
    lines.push(`### 2. 业务模型覆盖 ${bmc.business_model_undercoverage ? '❌ 需重写' : '✅'}`);
    for (const item of bmc.per_direction) {
      lines.push(`- ${item.direction_id}：已覆盖 ${item.covered_dimension_count}/4 维（上游${item.b2b_coverage ? '✓' : '✗'} 平台${item.platform_role_coverage ? '✓' : '✗'} 机构${item.industry_ecosystem_coverage ? '✓' : '✗'} 消费者${item.consumer_value_coverage ? '✓' : '✗'}）`);
    }
    lines.push(`- 三方向整体是否覆盖全部 4 维：${bmc.all_four_dimensions_covered ? '是' : '否'}`);
    lines.push('');
  }

  const cvg = gates.consumer_value_coverage;
  if (cvg) {
    lines.push(`### 3. 消费者价值覆盖 ${cvg.set_missing_consumer_value ? '❌ 阻断' : '✅'}`);
    lines.push(`- 显式覆盖消费者价值的方向数：${cvg.explicit_consumer_count}/3 ｜ Primary/Strong Secondary：${cvg.primary_or_strong_secondary_count}`);
    for (const item of cvg.per_direction) {
      lines.push(`- ${item.direction_id}：覆盖 ${item.present ? '是' : '否'} ｜ 角色 ${item.consumer_value_role}`);
    }
    lines.push('');
  }

  // v2.1.1 (doc section 七) — Consumer Role / Weight consistency.
  const cwcons = gates.consumer_weight_consistency;
  if (cwcons) {
    lines.push(`### 3b. 消费者角色 / 权重一致性 ${cwcons.rewrite_required ? '❌ 需重写' : '✅'}`);
    for (const item of cwcons.per_direction) {
      lines.push(`- ${item.direction_id}：角色 ${item.consumer_value_role} ｜ 权重 ${item.consumer_value_weight} ｜ 一致：${item.consistent ? '是' : '否'}${item.present_none_conflict ? ' ｜ ⚠️ present=true 且 role=none' : ''}`);
    }
    lines.push('');
  }

  const dfd = gates.direction_family_difference;
  if (dfd) {
    lines.push(`### 4. 方向家族差异 ${dfd.rewrite_required ? '❌ 需重写' : '✅'}`);
    const pairs = dfd.pairwise_similarity || {};
    for (const [pair, sim] of Object.entries(pairs)) {
      lines.push(`- ${pair} 综合相似度：${sim}${sim > 0.72 ? ' ⚠️ 超阈值(rewrite_required)' : sim > 0.55 ? ' ⚠️ 高重叠警告' : sim > 0.35 ? ' 部分重叠' : ' 差异清楚'}`);
    }
    // v2.1.1 (doc section 九) — multi-dimensional detail.
    const details = dfd.pairwise_details || {};
    for (const [pair, det] of Object.entries(details)) {
      lines.push(`  - ${pair} 多维：战略 ${det.strategic_entry_similarity} | 行业对象 ${det.industry_object_similarity} | 资产 ${det.reusable_asset_similarity} | 摄影 ${det.photography_subject_similarity} | 版式 ${det.layout_similarity} | 触点 ${det.touchpoint_similarity} | 受众 ${det.audience_similarity} | 语义 ${det.semantic_similarity} | 家族声明 ${det.declared_family_similarity}`);
    }
    if (dfd.declared_families_distinct === false) lines.push(`- ⚠️ 声明的 direction_family 未区分（需 A/B/C 不同）`);
    lines.push('');
  }

  const cwc = gates.compliance_weight_control;
  if (cwc) {
    lines.push(`### 5. 合规权重控制 ${cwc.rewrite_required ? '❌ 需重写' : '✅'}`);
    lines.push(`- 合规为 Primary 的方向数：${cwc.primary_compliance_direction_count}（上限 1）｜ 合规过重：${cwc.compliance_overweight ? '是' : '否'}`);
    for (const item of cwc.per_direction) {
      lines.push(`- ${item.direction_id}：合规 ${item.compliance_weight} 供应链 ${item.supply_chain_weight} 产品材料 ${item.product_material_weight} 生态 ${item.ecosystem_weight} 品牌美学 ${item.brand_aesthetic_weight} 消费者 ${item.consumer_value_weight}`);
    }
    lines.push('');
  }

  const e02 = gates.e02_aesthetic_gate;
  if (e02) {
    // v2.1.4 — product material direction missing (doc §八).
    if (e02.product_material_direction_missing) {
      lines.push(`### 6. E02 产品材料美学 Gate ❌ 产品材料方向缺失`);
      lines.push(`- E02 产品材料方向：缺失`);
      if (e02.semantic_candidate) {
        lines.push(`- 候选方向 ${e02.semantic_candidate.direction_id} 未通过身份确认`);
        lines.push(`  - 候选原因：${e02.semantic_candidate.reason}`);
        lines.push(`  - 不满足原因：${e02.semantic_candidate.fail_reason}`);
      } else {
        lines.push(`- 未检测到任何语义候选方向`);
      }
      lines.push('');
    } else {
      const e02StatusLabel = e02.rewrite_required ? '❌ 需重写' : (e02.positive_quality_status === 'conditional' ? '⚠️ 条件通过' : (e02.positive_quality_status === 'pass_with_warning' ? '✅ 通过（有 Warning）' : '✅'));
      lines.push(`### 6. E02 产品材料美学 Gate ${e02StatusLabel}`);
      if (e02.evaluated_direction_id) {
        lines.push(`- 评估方向：${e02.evaluated_direction_id} ｜ 品牌美学 ${e02.brand_aesthetic_weight} 消费者 ${e02.consumer_value_weight} 产品材料 ${e02.product_material_weight}`);
        // v2.1.4.1 — weight sum validation (doc §3.1).
        if (e02.weight_sum_invalid) {
          lines.push(`- ❌ 权重总和无效：${e02.weight_sum_check?.original_total?.toFixed(2)}（要求：1.00 ± 0.01）`);
          if (e02.weight_sum_check?.normalized_preview) {
            lines.push(`  - 归一化结果仅供参考，不参与正式通过判断`);
          }
        } else if (e02.weight_sum_check?.original_total !== null) {
          lines.push(`- 权重总和：${e02.weight_sum_check.original_total.toFixed(2)} ✅`);
        }
        lines.push(`- 权重达标：${e02.weight_pass ? '是' : '否'} ｜ 内容达标：${e02.content_pass ? '是' : '否'} ｜ 退化检查：${e02.degradation_pass ? '通过' : '未通过'}`);
        // v2.1.4.1 — brand exclusivity status (doc §3.4).
        if (e02.brand_exclusivity_status !== undefined) {
          const beStatus = e02.brand_exclusivity_status === 'pass' ? '通过' : e02.brand_exclusivity_status === 'conditional' ? 'Conditional' : '需重写';
          const beImpact = e02.brand_exclusivity_status === 'conditional' ? '，影响：内容就绪度上限 79' : '';
          lines.push(`- 品牌专属性：${e02.brand_exclusivity_score}/5，状态：${beStatus}${beImpact}`);
        }
        // v2.1.2 — multi-dimensional degradation scores (doc §五).
        if (e02.lab_scene_dominance !== undefined) {
          lines.push(`- 退化多维评分：实验室场景主导 ${e02.lab_scene_dominance}/5 ｜ 科学信息主导 ${e02.scientific_info_dominance}/5 ｜ 产品呈现力 ${e02.product_presentation_strength}/5 ｜ 品牌美学力 ${e02.brand_aesthetic_strength}/5 ｜ 消费者价值力 ${e02.consumer_value_strength}/5 ｜ 执行多样性 ${e02.execution_variety}/5`);
        }
        if (e02.degradation_risk_warning) lines.push(`- ⚠️ 退化风险警告：实验室场景存在但品牌美学/消费者价值充足，不阻断但建议优化`);
        // v2.1.3 — positive quality display (doc §五).
        if (e02.positive_quality_status !== undefined) {
          const pqLabel = e02.positive_quality_status === 'pass' ? '通过' : e02.positive_quality_status === 'pass_with_warning' ? 'Pass With Warning' : e02.positive_quality_status === 'conditional' ? '条件通过' : '需重写';
          lines.push(`- 正向质量检查：${pqLabel}`);
          if (e02.positive_quality_dimensions) {
            const pq = e02.positive_quality_dimensions;
            lines.push(`  - 产品呈现力 ${pq.product_presentation_strength}/5 ｜ 品牌美学力 ${pq.brand_aesthetic_strength}/5 ｜ 消费者价值力 ${pq.consumer_value_strength}/5 ｜ 执行多样性 ${pq.execution_variety}/5 ｜ 材质专属性 ${pq.material_specificity}/5 ｜ 品牌专属性 ${pq.brand_exclusivity}/5`);
          }
          if (e02.positive_quality_failing_dimensions?.length) {
            lines.push(`  - 未达项：${e02.positive_quality_failing_dimensions.map((f) => `${f} ${e02.positive_quality_dimensions[f]}/5`).join('、')}`);
          }
        }
      }
      lines.push('');
    }
  }

  // v2.1.3 (doc section 六) — E03 Spatial Drift with warning status.
  const sd = gates.spatial_drift;
  if (sd) {
    const sdLabel = sd.spatial_drift_status === 'blocked' ? '❌ 需重写' : (sd.spatial_drift_status === 'warning' ? '⚠️ 通过但有 Warning' : '✅');
    lines.push(`### 9. E03 空间漂移检测 ${sdLabel}`);
    lines.push(`- 空间漂移状态：${sd.spatial_drift_status === 'pass' ? '通过' : sd.spatial_drift_status === 'warning' ? '通过但有 Warning' : '阻断'}`);
    lines.push(`- 建筑作为视觉主体：${sd.architecture_as_primary_subject} ｜ 展厅空间依赖：${sd.exhibition_space_dependency} ｜ 地产视觉语言：${sd.real_estate_visual_language} ｜ 室内设计依赖：${sd.interior_design_dependency}`);
    lines.push(`- 平面设计可转化性：${sd.flat_design_translatability}/5 ｜ 信息设计存在：${sd.information_design_presence}`);
    if (sd.spatial_drift_status === 'warning') {
      lines.push(`- ⚠️ 空间对象只能作为局部证据，不得成为主视觉主体，不得生成展厅、地产或门店世界观，协同关系必须通过平面图形与信息系统表达。`);
    }
    lines.push('');
  }

  const irc = gates.industry_recognition_coverage;
  if (irc) {
    lines.push(`### 7. 行业识别分类 ${irc.rewrite_required ? '❌ 需重写' : '✅'}`);
    const sc = irc.set_coverage || {};
    lines.push(`- 整体是否覆盖前 5 类：${irc.all_required_categories_covered ? '是' : '否'}（regulatory${sc.regulatory_objects ? '✓' : '✗'} supply${sc.supply_chain_objects ? '✓' : '✗'} product${sc.product_material_objects ? '✓' : '✗'} institution${sc.institution_service_objects ? '✓' : '✗'} consumer${sc.consumer_value_objects ? '✓' : '✗'}）`);
    lines.push('');
  }

  const aa = gates.asset_authorization;
  if (aa) {
    const totalBlocked = aa.per_direction?.reduce((sum, item) => sum + (item.detections || []).filter((x) => x.risk_level === 'blocked').length, 0) || 0;
    const totalWarnings = aa.per_direction?.reduce((sum, item) => sum + (item.detections || []).filter((x) => x.risk_level === 'warning').length, 0) || 0;
    lines.push(`### 8. 资产权限与伪造风险 ${aa.forgery_detected ? '❌ 阻断' : '✅'}`);
    if (aa.forgery_detected) {
      for (const item of aa.per_direction) {
        if (!item.ok) for (const det of (item.detections || []).filter((x) => x.risk_level === 'blocked')) {
          lines.push(`- ${det.direction_id} 字段 ${det.field_path}：「${det.detected_text}」(${det.rule_id})`);
        }
      }
    } else {
      lines.push(`- ${totalBlocked} 阻断 ｜ ${totalWarnings} 条低置信结构提示${totalWarnings > 0 ? '（已折叠）' : ''}`);
    }
    lines.push('');
  }

  // v2.1.1 (doc section 八) — Asset ID global uniqueness.
  const aiu = gates.asset_id_uniqueness;
  if (aiu) {
    lines.push(`### 8b. Asset ID 全局唯一 ${aiu.duplicate_detected ? '❌ 阻断' : '✅'}`);
    if (aiu.duplicate_detected) {
      for (const dup of aiu.duplicates) lines.push(`- 重复 ID \`${dup.asset_id}\`：${dup.direction_ids.join(' / ')}`);
    } else {
      lines.push('- 所有可复用资产 ID 在三个方向间全局唯一。');
    }
    lines.push('');
  }

  // v2.1.4 (doc section 四 / 九) — Execution Example Completeness Gate.
  const eec = gates.execution_example_completeness;
  if (eec) {
    const eecLabel = eec.any_blocked ? '❌ 阻断' : (eec.any_conditional ? '⚠️ 条件通过' : (eec.any_warning ? '✅（有警告）' : '✅'));
    lines.push(`### 8c. Execution Example 完整性 ${eecLabel}`);
    lines.push(`- 触点覆盖率：${eec.touchpoint_coverage_score}（${eec.touchpoint_count} 个不同触点 / ${eec.total_examples} 个示例）`);
    lines.push(`- 字段完整度：${eec.field_completeness}`);

    // v2.1.4 — collapse repeated details in degenerate reports (doc §九).
    for (const item of eec.per_direction) {
      const exampleStatus = item.blocked ? '缺失' : (item.conditional ? '部分完整' : (item.warning ? '基本完整（有警告）' : '完整'));
      lines.push(`- ${item.direction_id}：${exampleStatus}（${item.example_count} 个示例）`);

      // Summarize common missing fields across examples
      const commonCritical = new Set();
      const commonRequired = new Set();
      const commonOptional = new Set();
      let firstEx = true;
      for (const ex of item.examples) {
        if (firstEx) {
          for (const f of ex.critical_missing) commonCritical.add(f);
          for (const f of ex.required_missing) commonRequired.add(f);
          for (const f of ex.optional_missing) commonOptional.add(f);
          firstEx = false;
        } else {
          for (const f of [...commonCritical]) if (!ex.critical_missing.includes(f)) commonCritical.delete(f);
          for (const f of [...commonRequired]) if (!ex.required_missing.includes(f)) commonRequired.delete(f);
          for (const f of [...commonOptional]) if (!ex.optional_missing.includes(f)) commonOptional.delete(f);
        }
      }

      if (commonCritical.size) {
        lines.push(`  - ❌ 共同缺失 Critical：${[...commonCritical].join('、')}`);
      }
      if (commonRequired.size) {
        lines.push(`  - ⚠️ 共同缺失 Required：${[...commonRequired].join('、')}`);
      }
      if (commonOptional.size) {
        lines.push(`  - ℹ️ 共同缺失 Optional：${[...commonOptional].join('、')}`);
      }

      // Show per-example details only when not all examples share the same missing fields
      const allSame = item.examples.every((ex) =>
        ex.critical_missing.length === item.examples[0].critical_missing.length &&
        ex.critical_missing.every((f) => item.examples[0].critical_missing.includes(f)) &&
        ex.required_missing.length === item.examples[0].required_missing.length &&
        ex.required_missing.every((f) => item.examples[0].required_missing.includes(f))
      );

      if (!allSame) {
        for (const ex of item.examples) {
          if (ex.critical_missing.length > 0) lines.push(`  - [${ex.touchpoint}] Critical 缺失：${ex.critical_missing.join('、')}`);
          if (ex.required_missing.length > 0) lines.push(`  - [${ex.touchpoint}] Required 缺失：${ex.required_missing.join('、')}`);
          if (ex.optional_missing.length > 0) lines.push(`  - [${ex.touchpoint}] Optional 缺失：${ex.optional_missing.join('、')}`);
        }
      }
    }
    lines.push('');
  }

  // v2.1.4 — Execution Example Specificity (doc §六).
  const ees = gates.execution_example_specificity;
  if (ees) {
    const eesLabel = ees.template_overuse ? '⚠️ 模板过度复用（Conditional）' : (ees.template_warning ? 'ℹ️ 轻度重复（Warning）' : '✅ 差异清楚');
    lines.push(`### 8d. Execution Example 特异性 ${eesLabel}`);
    lines.push(`- 特异性评分：${ees.specificity_score} ｜ 多样性评分：${ees.diversity_score}`);
    // v2.1.4.1 — split overlap metrics (doc §3.5).
    lines.push(`- 跨方向重叠：精确匹配 ${ees.exact_match_overlap} ｜ 语义相似 ${ees.semantic_overlap} ｜ 结构模式 ${ees.structural_pattern_overlap} ｜ 综合 ${ees.cross_direction_template_overlap}`);
    for (const item of ees.per_direction) {
      lines.push(`- ${item.direction_id}：方向内重叠 综合 ${item.within_direction_template_overlap} ｜ 精确 ${item.exact_match_overlap} ｜ 语义 ${item.semantic_overlap} ｜ 结构 ${item.structural_pattern_overlap}`);
      // Show repeated fields with ratio > 0
      const repeated = Object.entries(item.repeated_field_ratios).filter(([, v]) => v > 0);
      if (repeated.length) {
        lines.push(`  - 重复字段：${repeated.map(([k, v]) => `${k}(${Math.round(v * 100)}%)`).join('、')}`);
      }
    }
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
