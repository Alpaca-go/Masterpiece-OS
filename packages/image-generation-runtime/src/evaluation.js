function text(value) {
  return String(value ?? '').trim();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(text).filter(Boolean))];
}

function dimension(value, label) {
  const score = Number(value?.score);
  const notes = text(value?.notes);
  if (!Number.isInteger(score) || score < 1 || score > 5 || !notes) {
    throw Object.assign(new Error(`${label} 评价必须包含 1-5 分与说明。`), {
      code: 'IMAGE_EVALUATION_INVALID',
    });
  }
  return { score, notes };
}

export function compileImageEvaluation(input) {
  const brandAlignment = dimension(input?.brandAlignment, 'Brand Alignment');
  const visualConsistency = dimension(input?.visualConsistency, 'Visual Consistency');
  const assetUsability = dimension(input?.assetUsability, 'Asset Usability');
  const severity = text(input?.deviationDetection?.severity);
  if (!['none', 'minor', 'major'].includes(severity)) {
    throw Object.assign(new Error('Deviation Detection 严重度无效。'), {
      code: 'IMAGE_EVALUATION_INVALID',
    });
  }
  const findings = unique(input?.deviationDetection?.findings);
  if (severity !== 'none' && !findings.length) {
    throw Object.assign(new Error('发现视觉偏差时必须说明具体偏差。'), {
      code: 'IMAGE_EVALUATION_INVALID',
    });
  }
  const visualCanonId = text(input?.visualCanonId);
  const visualCanonVersion = text(input?.visualCanonVersion);
  if (!visualCanonId || !visualCanonVersion) {
    throw Object.assign(new Error('Image Evaluation 必须绑定 Visual Canon。'), {
      code: 'IMAGE_EVALUATION_INVALID',
    });
  }
  const promptAdjustments = unique([
    ...(brandAlignment.score < 4
      ? [`品牌一致性修正：${brandAlignment.notes}`]
      : []),
    ...(visualConsistency.score < 4
      ? [`视觉系统一致性修正：${visualConsistency.notes}`]
      : []),
    ...(assetUsability.score < 4
      ? [`资产可用性修正：${assetUsability.notes}`]
      : []),
    ...findings.map((finding) => `偏差修正：${finding}`),
  ]);
  const overallScore = Number((
    (brandAlignment.score + visualConsistency.score + assetUsability.score) / 3
  ).toFixed(2));
  return {
    schemaVersion: '1.0',
    brandAlignment,
    visualConsistency,
    assetUsability,
    deviationDetection: { severity, findings },
    overallScore,
    promptAdjustments: promptAdjustments.length
      ? promptAdjustments
      : ['保持当前 Visual Canon、构图、材质、光线与品牌资产关系。'],
    evaluatedAgainst: { visualCanonId, visualCanonVersion },
  };
}

export function compileEvaluationPromptAdjustment(evaluation) {
  if (!evaluation || evaluation.schemaVersion !== '1.0'
    || !Array.isArray(evaluation.promptAdjustments)
    || !evaluation.promptAdjustments.length) {
    throw Object.assign(new Error('缺少可执行的 Image Evaluation。'), {
      code: 'IMAGE_EVALUATION_MISSING',
    });
  }
  return [
    '评价闭环修正要求：',
    ...evaluation.promptAdjustments.map((item, index) => `${index + 1}. ${item}`),
    '未被上述评价指出的 Visual Canon、Locked Assets 与交付物职责必须保持不变。',
  ].join('\n');
}
