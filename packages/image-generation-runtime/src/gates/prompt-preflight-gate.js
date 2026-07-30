const CROSS_MEDIA_PATTERNS = [
  /接待台|空间动线|顾客区|入口向内|前中后景空间|天花|墙面|建筑广角|35\s*mm|人物咨询/iu,
  /\breception desk\b|\barchitectural circulation\b|\bceiling structure\b/iu,
];
const DOMAIN_STYLE_PATTERNS = [
  /(?:industry|行业).{0,30}(?:therefore|所以|必须|自动).{0,50}(?:颜色|材质|构图|气质|color|material|composition|style)/iu,
];

function list(value) {
  return [...new Set((Array.isArray(value) ? value : [])
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean))];
}

export function runPromptPreflightGate({
  finalPrompt,
  taskContract,
  projectContract,
  packagingTranslation,
  otherProjectTerms = [],
  goldenFragments = [],
}) {
  const prompt = String(finalPrompt ?? '');
  const findings = [];
  const add = (code, severity, detail) => findings.push({ code, severity, detail });
  if (!prompt.trim()) add('PROMPT_EMPTY', 'block', 'Final prompt is empty.');
  if (!projectContract || projectContract.validation?.status !== 'ready') {
    add('PROJECT_GENERATION_CONTRACT_INSUFFICIENT', 'block', 'Project contract is not ready.');
  }
  if (taskContract?.deliverableFamily === 'packaging') {
    if (!packagingTranslation?.structureStrategy?.length) {
      add('PACKAGING_STRUCTURE_EVIDENCE_MISSING', 'block', 'Packaging structure evidence is missing.');
    }
    for (const pattern of CROSS_MEDIA_PATTERNS) {
      const match = pattern.exec(prompt);
      if (match) add('CROSS_MEDIA_LANGUAGE_LEAK', 'block', match[0]);
    }
  }
  for (const term of list(otherProjectTerms)) {
    if (term && prompt.includes(term)) add('OTHER_PROJECT_SEMANTIC_LEAK', 'block', term);
  }
  for (const fragment of list(goldenFragments)) {
    if (fragment.length >= 12 && prompt.includes(fragment)) add('GOLDEN_CONTENT_LEAK', 'block', fragment.slice(0, 80));
  }
  for (const pattern of DOMAIN_STYLE_PATTERNS) {
    const match = pattern.exec(prompt);
    if (match) add('DOMAIN_STYLE_TEMPLATE_LEAK', 'block', match[0]);
  }
  const lockedValues = list(projectContract?.mustPreserve?.map((item) => item.value));
  for (const value of lockedValues) {
    if (value.length > 1 && !prompt.includes(value)) add('LOCKED_ASSET_OMITTED', 'warn', value);
  }
  return {
    schemaVersion: '1.0',
    status: findings.some((item) => item.severity === 'block') ? 'blocked' : 'pass',
    findings,
    checkedAt: new Date().toISOString(),
  };
}

export function assertPromptPreflight(report) {
  if (report?.status === 'blocked') {
    throw Object.assign(new Error(
      `PROMPT_PREFLIGHT_BLOCKED: ${report.findings.map((item) => item.code).join(', ')}`,
    ), {
      code: report.findings[0]?.code || 'PROMPT_PREFLIGHT_BLOCKED',
      findings: report.findings,
    });
  }
  return report;
}
