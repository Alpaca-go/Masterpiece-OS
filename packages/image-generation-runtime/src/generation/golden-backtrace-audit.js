function normalize(value) {
  return String(value ?? '').toLocaleLowerCase().replace(/\s+/gu, ' ');
}

function containsSignals(haystack, item) {
  const source = normalize(haystack);
  const groups = Array.isArray(item.matchGroups) && item.matchGroups.length
    ? item.matchGroups
    : [[item.goldenContent]];
  return groups.every((group) => {
    const signals = Array.isArray(group) ? group : [group];
    return signals.some((signal) => source.includes(normalize(signal)));
  });
}

function packetStageText(packet) {
  return {
    source_extraction: JSON.stringify(packet?.projectFacts ?? {}),
    diagnosis: JSON.stringify(packet?.diagnosis ?? {}),
    creative_decision: JSON.stringify(packet?.creativeDecision ?? {}),
    abstraction: JSON.stringify(packet?.abstractions ?? {}),
    media_translation: JSON.stringify(packet?.mediaTranslations ?? {}),
    packet_mapping: JSON.stringify(packet ?? {}),
  };
}

const STAGE_ORDER = [
  'source_extraction',
  'diagnosis',
  'creative_decision',
  'abstraction',
  'media_translation',
  'packet_mapping',
  'prompt_compiler',
];

function expectedStage(contentType) {
  return {
    source_fact: 'source_extraction',
    diagnosis: 'diagnosis',
    creative_decision: 'creative_decision',
    visual_abstraction: 'abstraction',
    media_translation: 'media_translation',
    task_template: 'prompt_compiler',
    model_adapter: 'prompt_compiler',
  }[contentType] || 'packet_mapping';
}

export function generateGoldenBacktraceAudit({
  items,
  currentAnalysis = '',
  packet = null,
  finalPrompt = '',
}) {
  const stageText = packetStageText(packet);
  const evaluatedItems = items.map((sourceItem) => {
    const item = structuredClone(sourceItem);
    const currentAnalysisFound = containsSignals(currentAnalysis, item);
    const decisionPacketFound = containsSignals(JSON.stringify(packet ?? {}), item);
    const finalPromptFound = containsSignals(finalPrompt, item);
    let firstFailureStage;
    if (!finalPromptFound) {
      const start = STAGE_ORDER.indexOf(expectedStage(item.contentType));
      firstFailureStage = STAGE_ORDER
        .slice(Math.max(0, start))
        .find((stage) => stage === 'prompt_compiler'
          ? !finalPromptFound
          : !containsSignals(stageText[stage] ?? JSON.stringify(packet ?? {}), item));
    }
    return {
      ...item,
      currentAnalysisFound,
      decisionPacketFound,
      finalPromptFound,
      ...(firstFailureStage ? { firstFailureStage } : {}),
    };
  });
  const group = (predicate) => evaluatedItems.filter(predicate);
  const ratio = (values, predicate) =>
    values.length ? Number((values.filter(predicate).length / values.length).toFixed(4)) : 1;
  const types = [...new Set(evaluatedItems.map((item) => item.contentType))];
  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    summary: {
      itemCount: evaluatedItems.length,
      currentAnalysisCoverage: ratio(evaluatedItems, (item) => item.currentAnalysisFound),
      decisionPacketCoverage: ratio(evaluatedItems, (item) => item.decisionPacketFound),
      finalPromptCoverage: ratio(evaluatedItems, (item) => item.finalPromptFound),
      conflictCount: Number(packet?.validation?.conflicts?.length ?? 0),
      byContentType: Object.fromEntries(types.map((type) => {
        const values = group((item) => item.contentType === type);
        return [type, {
          itemCount: values.length,
          packetCoverage: ratio(values, (item) => item.decisionPacketFound),
          promptCoverage: ratio(values, (item) => item.finalPromptFound),
        }];
      })),
    },
    items: evaluatedItems,
  };
}

export function renderGoldenBacktraceAuditMarkdown(audit) {
  const percent = (value) => `${Math.round(Number(value) * 100)}%`;
  const lines = [
    '# Golden Prompt Backtrace Audit',
    '',
    `- 原子项：${audit.summary.itemCount}`,
    `- 当前报告覆盖：${percent(audit.summary.currentAnalysisCoverage)}`,
    `- Decision Packet 覆盖：${percent(audit.summary.decisionPacketCoverage)}`,
    `- 最终 Prompt 覆盖：${percent(audit.summary.finalPromptCoverage)}`,
    `- 冲突数：${audit.summary.conflictCount}`,
    '',
    '| ID | Golden 原子信息 | Packet | Prompt | 首次失败节点 |',
    '|---|---|---:|---:|---|',
    ...audit.items.map((item) =>
      `| ${item.id} | ${String(item.goldenContent).replace(/\|/gu, '\\|')} | ${item.decisionPacketFound ? '✓' : '✗'} | ${item.finalPromptFound ? '✓' : '✗'} | ${item.firstFailureStage ?? '—'} |`),
    '',
  ];
  return lines.join('\n');
}
