import crypto from 'node:crypto';

export const DOCUMENT_ROLE_CLASSIFIER_VERSION = 'document-role-classifier-v2';

export const DOCUMENT_ROLE_TAXONOMY = Object.freeze([
  'visual-guideline',
  'creative-brief',
  'market-research',
  'brand-strategy',
  'product-information',
  'reference',
  'business-plan',
  'mixed-planning',
  'unknown'
]);

const PLANNING_ROLES = new Set([
  'creative-brief',
  'market-research',
  'brand-strategy',
  'product-information',
  'business-plan'
]);

const ROLE_SIGNALS = Object.freeze({
  'visual-guideline': {
    identity: /(?:\bVI\b|视觉(?:规范|指南|系统)|brand[-\s]*guideline|visual[-\s]*guideline)/i,
    body: /(?:Logo\s*使用|标志使用|标准色|辅助色|品牌字体|版式规范|视觉规范)/gi
  },
  'creative-brief': {
    identity: /(?:creative[-\s]*brief|创意简报|创意任务书)/i,
    body: /(?:传播任务|沟通任务|创意目标|创意要求|交付要求|必须呈现)/gi
  },
  'market-research': {
    identity: /(?:市场(?:研究|调研)(?:报告)?|竞品(?:研究|分析)|market[-\s]*research|competitor[-\s]*(?:research|analysis))/i,
    body: /(?:市场规模|行业趋势|数据来源|消费者调研|竞品分析|PEST|SWOT)/gi
  },
  'brand-strategy': {
    identity: /(?:品牌(?:策略|战略|定位|策划)|brand[-\s]*(?:strategy|positioning))/i,
    body: /(?:品牌定位|品牌愿景|品牌使命|价值主张|品牌人格|品牌核心价值|品牌印象)/gi
  },
  'product-information': {
    identity: /(?:产品(?:资料|说明|手册)|product[-\s]*(?:brief|information))/i,
    body: /(?:产品功能|产品参数|产品规格|服务内容|核心服务|产品体系|服务体系)/gi
  },
  reference: {
    identity: /(?:参考(?:资料|案例)|案例集|reference|inspiration)/i,
    body: /(?:参考案例|灵感来源|benchmark|案例借鉴)/gi
  },
  'business-plan': {
    identity: /(?:商业计划书|商业计划|business[-\s]*plan|business[-\s]*proposal)/i,
    weakIdentity: /(?:^|[\s_.()-])BP(?:[\s_.()-]|$)/i,
    body: /(?:商业模式|市场分析|目标客户|推广策略|渠道策略|运营模式|盈利模式|收入来源|融资计划|投资计划|发展规划|扩张战略)/gi
  }
});

const STRATEGIC_DOMAIN_SIGNALS = Object.freeze({
  audience_customer: /(?:目标客户|目标用户|目标受众|消费者|服务对象|客户群体|人群)/i,
  business_model: /(?:商业模式|合作模式|加盟|会员制|平台模式|O2O|OMO)/i,
  strategic_objective: /(?:战略目标|战略定位|发展战略|长期愿景|未来规划|市场制高点)/i,
  competition_differentiation: /(?:竞争|竞品|差异化|独特优势|核心优势|无法复刻|SWOT)/i,
  product_service: /(?:产品|服务|解决方案|核心服务|服务体系|服务板块)/i,
  channel_go_to_market: /(?:推广策略|渠道|营销|用户触达|品牌传播|招商|加盟招募)/i,
  growth_transformation: /(?:增长|扩张|全国|全球|转型|升级|3\s*[~～-]\s*5年|2030)/i,
  funding_finance: /(?:融资|投资计划|资金需求|股份|盈利|利润|收入来源|退出机制)/i
});

function hash(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function naturalBoundary(text, start, maximum) {
  const limit = Math.min(text.length, start + maximum);
  if (limit >= text.length) return text.length;
  const minimum = start + Math.floor(maximum * 0.55);
  const window = text.slice(minimum, limit);
  const patterns = [/\n{2,}/gu, /\n/gu, /[。！？!?；;]/gu, /[，,、]/gu, /\s/gu];
  for (const pattern of patterns) {
    let boundary = -1;
    for (const match of window.matchAll(pattern)) boundary = minimum + match.index + match[0].length;
    if (boundary > start) return boundary;
  }
  return limit;
}

export function splitTextAtNaturalBoundaries(text, maximum = 4000) {
  const value = String(text || '').trim();
  const chunks = [];
  let start = 0;
  while (start < value.length) {
    const end = naturalBoundary(value, start, maximum);
    const chunk = value.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    start = end;
    while (start < value.length && /\s/u.test(value[start])) start += 1;
  }
  return chunks;
}

function countMatches(value, pattern, maximum = 4) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const matches = String(value || '').match(new RegExp(pattern.source, flags));
  return Math.min(matches?.length ?? 0, maximum);
}

function collectHeadings(document) {
  const explicitSections = Array.isArray(document.sectionHeadings) ? document.sectionHeadings : [];
  const parsedSections = Array.isArray(document.sections)
    ? document.sections.map((section) => section?.heading).filter(Boolean)
    : [];
  const explicitTables = Array.isArray(document.tableHeadings) ? document.tableHeadings : [];
  const parsedTables = Array.isArray(document.tables)
    ? document.tables.flatMap((table) => {
        const firstRow = Array.isArray(table?.rows?.[0]) ? table.rows[0] : [];
        return firstRow;
      })
    : [];
  return {
    sectionHeadings: [...explicitSections, ...parsedSections].map(String),
    tableHeadings: [...explicitTables, ...parsedTables].map(String)
  };
}

export function resolvePlanningSourcePolicy(classification) {
  const documentRole = String(classification?.role || 'unknown');
  if (classification?.ambiguity === true || documentRole === 'mixed-planning') {
    return {
      documentRole,
      sourceRole: 'UNKNOWN_SOURCE',
      planningStrategicEvidenceEligible: false,
      eligibilityReasons: ['UNRESOLVED_ROLE_AMBIGUITY']
    };
  }
  if (documentRole === 'business-plan') {
    const strategicDomainCount = Array.isArray(classification?.strategicDomains)
      ? classification.strategicDomains.length
      : 0;
    const eligible = strategicDomainCount >= 4;
    return {
      documentRole,
      sourceRole: 'PLANNING_STRATEGIC_SOURCE',
      planningStrategicEvidenceEligible: eligible,
      eligibilityReasons: eligible
        ? [`STRATEGIC_DOMAIN_COVERAGE_${strategicDomainCount}`]
        : [`INSUFFICIENT_STRATEGIC_DOMAIN_COVERAGE_${strategicDomainCount}_OF_4`]
    };
  }
  if (documentRole === 'creative-brief' || documentRole === 'brand-strategy') {
    return {
      documentRole,
      sourceRole: 'PLANNING_STRATEGIC_SOURCE',
      planningStrategicEvidenceEligible: true,
      eligibilityReasons: ['LEGACY_PLANNING_ROLE_COMPATIBILITY']
    };
  }
  if (documentRole === 'market-research' || documentRole === 'product-information') {
    return {
      documentRole,
      sourceRole: 'PLANNING_STRATEGIC_SOURCE',
      planningStrategicEvidenceEligible: false,
      eligibilityReasons: ['EVIDENCE_ROLE_REQUIRES_EXPLICIT_PLANNING_PROMOTION']
    };
  }
  if (documentRole === 'visual-guideline' || documentRole === 'reference') {
    return {
      documentRole,
      sourceRole: 'LEGACY_VISUAL_EVIDENCE',
      planningStrategicEvidenceEligible: false,
      eligibilityReasons: ['NON_PLANNING_VISUAL_OR_REFERENCE_ROLE']
    };
  }
  return {
    documentRole,
    sourceRole: 'UNKNOWN_SOURCE',
    planningStrategicEvidenceEligible: false,
    eligibilityReasons: ['UNKNOWN_OR_UNSUPPORTED_ROLE']
  };
}

export function classifyDocumentRole(document) {
  const filename = String(document.filename || '');
  const title = String(document.title || '');
  const rawText = String(document.rawText ?? document.content ?? '');
  const boundedBody = rawText.slice(0, 50_000);
  const bodySample = boundedBody.slice(0, 3000);
  const identitySample = bodySample.slice(0, 1200);
  const { sectionHeadings, tableHeadings } = collectHeadings(document);
  const headingText = [...sectionHeadings, ...tableHeadings].join('\n');
  const identityText = `${filename}\n${title}`;
  const scores = Object.fromEntries(Object.keys(ROLE_SIGNALS).map((role) => [role, 0]));
  const signals = [];

  for (const role of Object.keys(ROLE_SIGNALS).sort()) {
    const definition = ROLE_SIGNALS[role];
    if (definition.identity?.test(identityText)) {
      scores[role] += 8;
      signals.push(`${role}:identity`);
    }
    if (definition.weakIdentity?.test(identityText)) {
      scores[role] += 1;
      signals.push(`${role}:weak-identity`);
    }
    if (definition.identity?.test(identitySample)) {
      scores[role] += 4;
      signals.push(`${role}:sample-identity`);
    }
    const headingHits = countMatches(headingText, definition.body, 4);
    const bodyHits = countMatches(bodySample, definition.body, 4);
    if (headingHits) {
      scores[role] += headingHits * 2;
      signals.push(`${role}:heading:${headingHits}`);
    }
    if (bodyHits) {
      scores[role] += bodyHits;
      signals.push(`${role}:body:${bodyHits}`);
    }
  }

  const strategicDomains = Object.entries(STRATEGIC_DOMAIN_SIGNALS)
    .filter(([, pattern]) => pattern.test(boundedBody))
    .map(([domain]) => domain);
  const businessPlanDefinition = ROLE_SIGNALS['business-plan'];
  const hasStrongBusinessPlanIdentity = businessPlanDefinition.identity.test(identityText);
  const hasWeakBusinessPlanIdentity = businessPlanDefinition.weakIdentity.test(identityText);
  const hasBusinessPlanEvidence = hasStrongBusinessPlanIdentity
    || scores['business-plan'] >= 2
    || (hasWeakBusinessPlanIdentity && strategicDomains.length >= 4);
  if (hasBusinessPlanEvidence && strategicDomains.length) {
    scores['business-plan'] += strategicDomains.length * 1.25;
    signals.push(`business-plan:strategic-domains:${strategicDomains.length}`);
  }
  if (hasBusinessPlanEvidence && sectionHeadings.length >= 4) {
    scores['business-plan'] += 1;
    signals.push('business-plan:multi-section-structure');
  }
  if (hasBusinessPlanEvidence && tableHeadings.length >= 2) {
    scores['business-plan'] += 1;
    signals.push('business-plan:table-structure');
  }

  const ranking = Object.entries(scores).sort(([roleA, scoreA], [roleB, scoreB]) => scoreB - scoreA || roleA.localeCompare(roleB));
  const [topRole, topScore] = ranking[0];
  const secondScore = ranking[1]?.[1] ?? 0;
  const tiedTopRoles = ranking.filter(([, score]) => score === topScore && score >= 3).map(([role]) => role);
  let role = topScore >= 3 ? topRole : 'unknown';
  let ambiguity = false;
  if (tiedTopRoles.length > 1) {
    ambiguity = true;
    role = tiedTopRoles.every((candidate) => PLANNING_ROLES.has(candidate)) ? 'mixed-planning' : 'unknown';
  }
  const secondaryRoles = role === 'unknown'
    ? []
    : ranking
        .filter(([candidate, score]) => candidate !== role && score >= 3 && score >= topScore * 0.25)
        .map(([candidate]) => candidate);
  const margin = topScore - secondScore;
  const confidence = role === 'unknown'
    ? 'low'
    : topScore >= 8 && margin >= 3
      ? 'high'
      : topScore >= 4 && margin >= 1
        ? 'medium'
        : 'low';
  const base = {
    role,
    confidence,
    classifierVersion: DOCUMENT_ROLE_CLASSIFIER_VERSION,
    secondaryRoles,
    ambiguity,
    scores,
    signals,
    strategicDomains
  };
  return { ...base, ...resolvePlanningSourcePolicy(base) };
}

export function prepareDocumentSet(input) {
  const sourceDocuments = [];
  const chunks = [];
  const seenChunkHashes = new Set();
  for (const document of input.corpus?.documents || []) {
    const originalFileName = String(document.filename || `${document.id}.txt`);
    const role = document.documentRole
      ? (() => {
          const inferred = classifyDocumentRole(document);
          const explicit = {
            ...inferred,
            role: document.documentRole,
            confidence: 'high',
            ambiguity: false,
            signals: ['explicit-document-role', ...inferred.signals]
          };
          return { ...explicit, ...resolvePlanningSourcePolicy(explicit) };
        })()
      : classifyDocumentRole(document);
    sourceDocuments.push({
      sourceId: document.id,
      originalFileName,
      displayName: originalFileName.replace(/\.[^.]+$/, ''),
      fileType: document.sourceType,
      documentRole: role.role,
      roleConfidence: role.confidence,
      roleClassifierVersion: role.classifierVersion,
      secondaryRoles: role.secondaryRoles,
      roleAmbiguity: role.ambiguity,
      roleScores: role.scores,
      sourceRole: role.sourceRole,
      planningStrategicEvidenceEligible: role.planningStrategicEvidenceEligible,
      eligibilityReasons: role.eligibilityReasons,
      contentHash: hash(document.rawText),
      characterCount: document.characterCount || String(document.rawText || '').length
    });
    const sections = document.sections?.length ? document.sections : [{ content: document.rawText }];
    sections.forEach((section, sectionIndex) => {
      splitTextAtNaturalBoundaries(section.content).forEach((text, partIndex) => {
        const contentHash = hash(text.replace(/\s+/g, ' ').trim());
        if (seenChunkHashes.has(contentHash)) return;
        seenChunkHashes.add(contentHash);
        chunks.push({
          chunkId: `chunk-${hash(`${document.id}:${sectionIndex}:${partIndex}:${contentHash}`).slice(0, 16)}`,
          sourceId: document.id,
          documentRole: role.role,
          sectionPath: [section.heading || `段落 ${sectionIndex + 1}`, ...(partIndex ? [`分段 ${partIndex + 1}`] : [])],
          text,
          contentHash
        });
      });
    });
  }
  if (!sourceDocuments.length || !chunks.length) throw Object.assign(new Error('没有可用于视觉转译的文档内容'), { code: 'BLOCKED_INPUT' });
  const documentSetHash = hash(JSON.stringify({
    sourceDocuments: sourceDocuments.map(({ sourceId, contentHash, documentRole }) => ({ sourceId, contentHash, documentRole })),
    chunks: chunks.map(({ chunkId, sourceId, contentHash }) => ({ chunkId, sourceId, contentHash }))
  }));
  return Object.freeze({
    projectId: input.projectId,
    sourceDocuments,
    chunks,
    documentSetHash,
    preparedAt: new Date().toISOString()
  });
}
