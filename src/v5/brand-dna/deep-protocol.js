import crypto from 'node:crypto';
import { parseBrandDnaResponse } from './response-parser.js';
import { validateBrandDna } from './schema.js';
import {
  BRAND_DNA_PROTOCOL,
  BRAND_DNA_QUALITY_GATE,
  REASONING_QUALITY_TIERS
} from './protocol-config.js';
import { buildEvidenceExtractionPrompt } from './prompts/evidence-extractor.js';
import {
  buildFactNormalizationPrompt,
  buildFactReconciliationPrompt
} from './prompts/fact-normalizer.js';
import { buildStrategicModelPrompt } from './prompts/strategy-reconstructor.js';
import { buildStrategicCriticPrompt } from './prompts/strategic-critic.js';
import { buildDnaSynthesisPrompt } from './prompts/dna-synthesizer.js';
import { buildCreativeThesisPrompt } from './prompts/creative-thesis-selector.js';
import { buildVisualTranslationPrompt } from './prompts/visual-translator.js';
import { buildImageTaskPrompt } from './prompts/image-spec-compiler.js';
import {
  buildAuditPrompt,
  buildTargetedRepairPrompt
} from './prompts/quality-auditor.js';
import { DEFAULT_INDUSTRY_RULES } from './prompts/industry-rules/default.js';
import {
  arrayValue,
  enumValue,
  numberValue,
  objectValue,
  stringArray,
  stringValue,
  validateBrandDnaCoreContract,
  validateEvidenceItemContract,
  validateImageSystemContract,
  validateImageTasksContract,
  validateStrategicModelContract,
  validateVisualTranslationContract
} from './runtime-contracts.js';

export class BrandDnaQualityGateError extends Error {
  constructor(audit) {
    super(`品牌 DNA 质量闸门未通过：${(audit.hardFailures || []).join('；') || `总分 ${audit.totalScore}`}`);
    this.name = 'BrandDnaQualityGateError';
    this.code = 'FAILED_QUALITY_GATE';
    this.audit = audit;
  }
}

export class BrandDnaSchemaError extends Error {
  constructor(stage, error) {
    super(`${stage} 结构化输出校验失败：${error.message}`);
    this.name = 'BrandDnaSchemaError';
    this.code = 'FAILED_SCHEMA';
    this.stage = stage;
    this.cause = error;
  }
}

function stableId(prefix, value) {
  return `${prefix}-${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16)}`;
}

const EVIDENCE_BATCH_MAX_ITEMS = 2;
const EVIDENCE_BATCH_MAX_CHARACTERS = 8_000;
const EVIDENCE_RETRY_MIN_CHUNK_CHARACTERS = 800;
const EVIDENCE_RETRY_MAX_DEPTH = 6;

function splitContent(content, maximum = 4_000) {
  if (content.length <= maximum) return [content];
  const paragraphs = content.split(/\n{2,}/);
  const chunks = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maximum) {
      chunks.push(current);
      current = '';
    }
    if (paragraph.length <= maximum) {
      current += `${current ? '\n\n' : ''}${paragraph}`;
      continue;
    }
    if (current) {
      chunks.push(current);
      current = '';
    }
    for (let offset = 0; offset < paragraph.length; offset += maximum) {
      chunks.push(paragraph.slice(offset, offset + maximum));
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildDocumentChunks(corpus) {
  const chunks = [];
  for (const document of corpus.documents || []) {
    const sections = document.sections?.length ? document.sections : [{ content: document.rawText }];
    sections.forEach((section, sectionIndex) => {
      const sectionContent = String(section.content || '').trim();
      if (!sectionContent) return;
      splitContent(sectionContent).forEach((content, partIndex) => {
        const sourceId = document.id;
        chunks.push({
          sourceId,
          chunkId: stableId('chunk', `${sourceId}:${sectionIndex}:${partIndex}:${section.heading || ''}:${content}`),
          filename: document.filename,
          documentTitle: document.title || document.filename,
          sectionPath: [
            ...(section.heading ? [section.heading] : [`段落 ${sectionIndex + 1}`]),
            ...(partIndex ? [`分段 ${partIndex + 1}`] : [])
          ],
          page: section.page,
          content,
          sourceType: /\|.+\|/.test(content) ? 'table' : 'paragraph',
          confidence: 1
        });
      });
    });
  }
  if (!chunks.length) throw new Error('文档准备阶段未生成有效语义片段');
  return chunks;
}

function partition(items, maximumItems, maximumCharacters = Infinity) {
  const batches = [];
  let current = [];
  let characters = 0;
  for (const item of items) {
    const size = JSON.stringify(item).length;
    if (current.length && (current.length >= maximumItems || characters + size > maximumCharacters)) {
      batches.push(current);
      current = [];
      characters = 0;
    }
    current.push(item);
    characters += size;
  }
  if (current.length) batches.push(current);
  return batches;
}

function evidenceBatchCharacters(batch) {
  return batch.reduce((total, item) => total + JSON.stringify(item).length, 0);
}

function splitChunkForEvidenceRetry(chunk) {
  const content = String(chunk?.content || '');
  if (content.length < EVIDENCE_RETRY_MIN_CHUNK_CHARACTERS * 2) return null;
  const midpoint = Math.floor(content.length / 2);
  const lower = Math.floor(content.length * 0.35);
  const upper = Math.ceil(content.length * 0.65);
  const newlineAfter = content.indexOf('\n', midpoint);
  const newlineBefore = content.lastIndexOf('\n', midpoint);
  const splitAt = newlineAfter >= lower && newlineAfter <= upper
    ? newlineAfter
    : newlineBefore >= lower && newlineBefore <= upper
      ? newlineBefore
      : midpoint;
  const parts = [content.slice(0, splitAt), content.slice(splitAt)].map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return parts.map((part, index) => ({
    ...chunk,
    chunkId: stableId('chunk', `${chunk.chunkId}:adaptive:${index}:${part}`),
    sectionPath: [...(chunk.sectionPath || []), `自动拆分 ${index + 1}/2`],
    content: part
  }));
}

function divideEvidenceBatch(batch) {
  if (batch.length > 1) {
    const midpoint = Math.ceil(batch.length / 2);
    return [batch.slice(0, midpoint), batch.slice(midpoint)];
  }
  const chunks = splitChunkForEvidenceRetry(batch[0]);
  return chunks ? chunks.map((chunk) => [chunk]) : null;
}

function isAdaptiveEvidenceError(error) {
  if (!error) return false;
  if (error.code === 'OUTPUT_TRUNCATED' || error.code === 'FAILED_SCHEMA') return true;
  if (isAdaptiveEvidenceError(error.cause)) return true;
  return /输出.*(?:长度|上限|截断)|finish.reason.*length|JSON.*(?:解析|parse)/i.test(String(error.message || ''));
}

function assertArray(value, label, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum) throw new Error(`${label} 必须至少包含 ${minimum} 项`);
  return value;
}

function assertString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} 不能为空`);
  return value.trim();
}

function uniqueIds(items, label) {
  const ids = new Set();
  for (const item of items) {
    const id = assertString(item?.id, `${label}.id`);
    if (ids.has(id)) throw new Error(`${label} 包含重复 ID：${id}`);
    ids.add(id);
  }
  return ids;
}

function validateEvidence(output, chunks) {
  const items = assertArray(output?.atomicEvidence, 'atomicEvidence', 1);
  uniqueIds(items, 'atomicEvidence');
  const chunkIds = new Set(chunks.map((chunk) => chunk.chunkId));
  return items.map((item, index) => validateEvidenceItemContract(
    item,
    `atomicEvidence[${index}]`,
    chunkIds
  ));
}

function canonicalizeEvidence(items, offset) {
  return items.map((item, index) => ({
    ...item,
    id: `evidence-${String(offset + index + 1).padStart(4, '0')}`
  }));
}

function validateFacts(output, evidenceIds) {
  const items = assertArray(output?.normalizedFacts, 'normalizedFacts', 1);
  uniqueIds(items, 'normalizedFacts');
  return items.map((value, index) => {
    const path = `normalizedFacts[${index}]`;
    const item = objectValue(value, path);
    const status = enumValue(item.status, ['confirmed', 'inferred', 'conflicting', 'missing'], `${path}.status`);
    const refs = stringArray(item.evidenceIds, `${path}.evidenceIds`, { min: status === 'missing' ? 0 : 1 });
    if (refs.some((id) => !evidenceIds.has(id))) throw new Error(`${path}.evidenceIds 引用了不存在的证据`);
    return {
      id: stringValue(item.id, `${path}.id`),
      statement: stringValue(item.statement, `${path}.statement`),
      status,
      evidenceIds: refs,
      confidence: numberValue(item.confidence, `${path}.confidence`, { min: 0, max: 1 }),
      reasoningSummary: stringValue(item.reasoningSummary, `${path}.reasoningSummary`)
    };
  });
}

function canonicalizeFacts(items) {
  return items.map((item, index) => ({ ...item, id: `fact-${String(index + 1).padStart(4, '0')}` }));
}

function validateStrategicModel(output, evidenceIds) {
  return validateStrategicModelContract(output?.strategicModel, evidenceIds);
}

function validateIssues(output, evidenceIds) {
  const items = assertArray(output?.strategicIssues, 'strategicIssues', 1);
  uniqueIds(items, 'strategicIssues');
  return items.map((value, index) => {
    const path = `strategicIssues[${index}]`;
    const item = objectValue(value, path);
    const refs = stringArray(item.evidenceIds, `${path}.evidenceIds`);
    if (refs.some((id) => !evidenceIds.has(id))) throw new Error(`${path}.evidenceIds 包含未知证据`);
    return {
      id: stringValue(item.id, `${path}.id`),
      severity: enumValue(item.severity, ['critical', 'major', 'minor'], `${path}.severity`),
      issue: stringValue(item.issue, `${path}.issue`),
      evidenceIds: refs,
      consequence: stringValue(item.consequence, `${path}.consequence`),
      recommendation: stringValue(item.recommendation, `${path}.recommendation`),
      recommendationStatus: enumValue(item.recommendationStatus, ['suggested'], `${path}.recommendationStatus`)
    };
  });
}

function validateDnaStage(output) {
  return validateBrandDnaCoreContract(output?.brandDna);
}

function validateThesis(output, geneIds) {
  const value = objectValue(output?.creativeThesisDecision, 'creativeThesisDecision');
  const selected = objectValue(value.selected, 'creativeThesisDecision.selected');
  const basis = stringArray(selected.dnaBasis, 'creativeThesisDecision.selected.dnaBasis', { min: 1 });
  if (basis.some((id) => !geneIds.has(id))) throw new Error('创意命题引用了不存在的 DNA 基因');
  const rejectedCandidateSummaries = arrayValue(
    value.rejectedCandidateSummaries,
    'creativeThesisDecision.rejectedCandidateSummaries',
    { min: 2 }
  ).map((candidate, index) => ({
    reason: stringValue(
      objectValue(candidate, `creativeThesisDecision.rejectedCandidateSummaries[${index}]`).reason,
      `creativeThesisDecision.rejectedCandidateSummaries[${index}].reason`
    )
  }));
  return {
    selected: {
      statement: stringValue(selected.statement, 'creativeThesisDecision.selected.statement'),
      dnaBasis: basis,
      visualPotential: stringValue(selected.visualPotential, 'creativeThesisDecision.selected.visualPotential')
    },
    rejectedCandidateSummaries,
    decisionScore: numberValue(value.decisionScore, 'creativeThesisDecision.decisionScore', { min: 0, max: 100 })
  };
}

function validateVisual(output, geneIds) {
  return {
    translation: validateVisualTranslationContract(output?.visualTranslation, geneIds),
    system: validateImageSystemContract(output?.imageSystem)
  };
}

function completeSafeImageTaskDefaults(tasks, imageSystem) {
  if (!Array.isArray(tasks)) return tasks;
  return tasks.map((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const task = structuredClone(value);
    if (!Array.isArray(task.consistencyWithPreviousTasks) || !task.consistencyWithPreviousTasks.length) {
      task.consistencyWithPreviousTasks = index === 0
        ? [`首张任务负责建立 ${imageSystem.systemId} 的全局视觉锚点`, ...imageSystem.consistencyRules]
        : [...imageSystem.consistencyRules];
    }
    if (!Array.isArray(task.intentionalDifferenceFromPreviousTasks) || !task.intentionalDifferenceFromPreviousTasks.length) {
      task.intentionalDifferenceFromPreviousTasks = [index === 0
        ? '首张任务建立母题，不与前序图片比较'
        : `第 ${index + 1} 张任务必须承担区别于前序图片的独立验证职责`];
    }
    if (!Array.isArray(task.lockedAssetInstructions) || !task.lockedAssetInstructions.length) {
      task.lockedAssetInstructions = imageSystem.knownAssets.length
        ? imageSystem.knownAssets.map((asset) => `仅按已确认状态使用：${asset}`)
        : ['未提供可锁定资产，不得自行生成或仿造正式品牌资产'];
    }
    return task;
  });
}

function validateTasks(output, imageSystem, geneIds) {
  return validateImageTasksContract(
    completeSafeImageTaskDefaults(output?.imageTasks, imageSystem),
    imageSystem,
    geneIds
  );
}

function validateAudit(output) {
  const audit = objectValue(output?.qualityAudit, 'qualityAudit');
  const dimensions = objectValue(audit.dimensionScores, 'qualityAudit.dimensionScores');
  if (typeof audit.passed !== 'boolean') throw new Error('qualityAudit.passed 必须是布尔值');
  const dimensionScores = {};
  for (const key of [
    'evidence', 'strategy', 'diagnosis', 'brandDna', 'creativeThesis',
    'visualTranslation', 'imageExecution', 'reusability'
  ]) {
    dimensionScores[key] = numberValue(dimensions[key], `qualityAudit.dimensionScores.${key}`, { min: 0, max: 100 });
  }
  return {
    passed: audit.passed,
    totalScore: numberValue(audit.totalScore, 'qualityAudit.totalScore', { min: 0, max: 100 }),
    dimensionScores,
    hardFailures: stringArray(audit.hardFailures, 'qualityAudit.hardFailures'),
    repairInstructions: stringArray(audit.repairInstructions, 'qualityAudit.repairInstructions')
  };
}

function stageRepairMessages(prompt, invalidOutput, error) {
  return [
    prompt[0],
    {
      role: 'user',
      content: `${prompt[1].content}

上一次输出未通过本阶段 Schema 校验：${error.message}
无效输出：${String(invalidOutput).slice(0, 40_000)}

请只返回修复后的完整 JSON。`
    }
  ];
}

function reasoningOptions(stageName, repairing = false) {
  if (repairing) return { enableThinking: false };
  const budgets = {
    'dna-synthesis': 4_096,
    'creative-thesis-decision': 2_048,
    'targeted-repair': 2_048
  };
  return budgets[stageName]
    ? { enableThinking: true, thinkingBudget: budgets[stageName] }
    : { enableThinking: false };
}

async function runStructuredStage(reasoner, prompt, validator, signal, trace, stageName) {
  let response = await reasoner(prompt, { signal, ...reasoningOptions(stageName) });
  try {
    const parsed = parseBrandDnaResponse(response.text);
    return { value: validator(parsed), response, retryCount: 0 };
  } catch (firstError) {
    try {
      response = await reasoner(stageRepairMessages(prompt, response.text, firstError), {
        signal,
        ...reasoningOptions(stageName, true)
      });
      const parsed = parseBrandDnaResponse(response.text);
      const value = validator(parsed);
      trace.push({ stage: stageName, schemaRepair: true, runId: response.runId });
      return { value, response, retryCount: 1 };
    } catch (secondError) {
      throw new BrandDnaSchemaError(stageName, secondError);
    }
  }
}

function evidenceReferences(atomicEvidence, chunks) {
  const chunksById = new Map(chunks.map((chunk) => [chunk.chunkId, chunk]));
  return new Map(atomicEvidence.map((evidence) => [
    evidence.id,
    evidence.sourceRefs.map((ref) => {
      const chunk = chunksById.get(ref.chunkId);
      return {
        documentId: ref.sourceId,
        filename: chunk?.filename || chunk?.documentTitle || ref.sourceId,
        section: chunk?.sectionPath?.join(' / '),
        page: chunk?.page,
        excerpt: ref.excerpt
      };
    })
  ]));
}

function hydrateEvidence(value, references) {
  if (Array.isArray(value)) {
    value.forEach((item) => hydrateEvidence(item, references));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.evidenceIds) && (!Array.isArray(value.evidence) || !value.evidence.length)) {
    value.evidence = value.evidenceIds.flatMap((id) => references.get(id) || []);
  }
  Object.values(value).forEach((item) => hydrateEvidence(item, references));
}

function validateKnownEvidenceReferences(value, knownEvidenceIds, path = 'brandDna') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => validateKnownEvidenceReferences(item, knownEvidenceIds, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value.evidenceIds) && value.evidenceIds.some((id) => !knownEvidenceIds.has(id))) {
    throw new Error(`${path}.evidenceIds 包含未知证据`);
  }
  for (const [key, item] of Object.entries(value)) {
    validateKnownEvidenceReferences(item, knownEvidenceIds, `${path}.${key}`);
  }
}

function assembleCorePackage(brandDna, atomicEvidence, chunks) {
  const core = structuredClone(brandDna);
  const knownEvidenceIds = new Set(atomicEvidence.map((item) => item.id));
  validateKnownEvidenceReferences(core, knownEvidenceIds);
  hydrateEvidence(core, evidenceReferences(atomicEvidence, chunks));
  return core;
}

function assemblePackage(parts, atomicEvidence, chunks) {
  const brandDna = structuredClone(parts.brandDna);
  brandDna.creativeTranslation = {
    ...parts.visualTranslation.creativeTranslation,
    creativeThesis: parts.creativeThesisDecision.selected.statement,
    mappings: parts.visualTranslation.mappings,
    generationPlan: parts.imageTasks
  };
  brandDna.imageSystem = parts.imageSystem;
  hydrateEvidence(brandDna, evidenceReferences(atomicEvidence, chunks));
  const knownEvidenceIds = atomicEvidence.map((item) => item.id);
  return {
    brandDna: validateBrandDna(brandDna, { requireEvidenceIds: true, knownEvidenceIds }),
    creativeThesisDecision: parts.creativeThesisDecision,
    visualTranslation: parts.visualTranslation,
    imageSystem: parts.imageSystem,
    imageTasks: parts.imageTasks
  };
}

export function validateImageTaskStandard(imageSystem, imageTasks) {
  const failures = [];
  if (!imageSystem?.systemId) failures.push('没有全局视觉系统 ID');
  if (!imageSystem?.anchorVisual) failures.push('没有全局视觉锚点');
  if (!imageSystem?.lockedFacts?.length) failures.push('没有 Locked Facts');
  if (!imageSystem?.globalProhibitions?.length) failures.push('没有 Negative Constraints');
  if (!imageSystem?.logoPolicy) failures.push('没有 Logo Policy');
  if (!imageSystem?.textPolicy) failures.push('没有 Text Policy');
  if (!imageSystem?.consistencyRules?.length) failures.push('没有跨图片一致性规则');
  if (new Set(imageTasks.map((task) => task.role)).size === 1) failures.push('所有图片职责相同');
  for (const task of imageTasks) {
    if (!task.subject) failures.push(`${task.id} 无法判断图片主体`);
    if (!task.composition || !task.lighting) failures.push(`${task.id} 无法判断构图和光线`);
    if (!task.logoPolicy || !task.textPolicy) failures.push(`${task.id} 缺少 Logo 或文字政策`);
    if (!task.consistencyWithPreviousTasks?.length) failures.push(`${task.id} 未说明与全局视觉锚点的一致性`);
    if (String(task.finalPrompt || '').length < 120) failures.push(`${task.id} finalPrompt 上下文不足`);
    if (/重新设计.{0,8}logo|重绘.{0,8}logo/i.test(task.finalPrompt || '')) failures.push(`${task.id} 要求重新设计已有 Logo`);
  }
  return failures;
}

export function applyQualityGate(audit, localHardFailures = []) {
  const dimensions = audit.dimensionScores || {};
  const hardFailures = [...new Set([...(audit.hardFailures || []), ...localHardFailures])];
  const passed = Boolean(
    audit.passed
    && audit.totalScore >= BRAND_DNA_QUALITY_GATE.minTotalScore
    && Number(dimensions.evidence) >= BRAND_DNA_QUALITY_GATE.minEvidenceScore
    && Number(dimensions.strategy) >= BRAND_DNA_QUALITY_GATE.minStrategyScore
    && Number(dimensions.imageExecution) >= BRAND_DNA_QUALITY_GATE.minImageExecutionScore
    && hardFailures.length === 0
  );
  return { ...audit, passed, hardFailures };
}

export async function runBrandDnaDeepProtocol(input) {
  const qualityTier = REASONING_QUALITY_TIERS.includes(input.qualityTier)
    ? input.qualityTier
    : 'experimental';
  if (qualityTier === 'unsupported') {
    throw Object.assign(new Error('当前模型被标记为不支持 Brand DNA Deep Analysis'), {
      code: 'UNSUPPORTED_MODEL_TIER'
    });
  }
  const chunks = buildDocumentChunks(input.corpus);
  const trace = [];
  let schemaRetryCount = 0;
  let resumeOpen = true;
  const resumeStages = input.resumeStages && typeof input.resumeStages === 'object'
    ? input.resumeStages
    : {};
  const takeResume = (stageName, validator) => {
    if (!resumeOpen || !Object.prototype.hasOwnProperty.call(resumeStages, stageName)) {
      resumeOpen = false;
      return { found: false };
    }
    try {
      const value = validator(structuredClone(resumeStages[stageName]));
      trace.push({ stage: stageName, resumed: true });
      return { found: true, value };
    } catch (error) {
      resumeOpen = false;
      trace.push({ stage: stageName, resumeInvalid: true, reason: error.message });
      return { found: false };
    }
  };
  const checkpoint = async (stageName, value) => {
    await input.onCheckpoint?.(stageName, structuredClone(value));
  };
  const run = async (stageName, prompt, validator) => {
    if (input.abortSignal?.aborted) throw new DOMException('用户主动取消', 'AbortError');
    const startedAt = Date.now();
    const result = await runStructuredStage(input.reasoner, prompt, validator, input.abortSignal, trace, stageName);
    schemaRetryCount += result.retryCount;
    trace.push({
      stage: stageName,
      runId: result.response.runId,
      provider: result.response.provider,
      model: result.response.model,
      durationMs: Date.now() - startedAt
    });
    return result.value;
  };
  const runCached = async (stageName, prompt, validator, resumeValidator = validator) => {
    const resumed = takeResume(stageName, resumeValidator);
    if (resumed.found) return resumed.value;
    const value = await run(stageName, prompt, validator);
    await checkpoint(stageName, value);
    return value;
  };

  input.onProtocolProgress?.('extracting-project-facts', '正在分段提取原子证据');
  let atomicEvidence = [];
  let evidenceChunks = [];
  const resumedEvidence = takeResume('atomic-evidence', (saved) => {
    const savedChunks = assertArray(saved?.chunks, 'atomic-evidence.chunks', 1);
    const savedEvidence = validateEvidence({ atomicEvidence: saved?.atomicEvidence }, savedChunks);
    return { chunks: savedChunks, atomicEvidence: savedEvidence };
  });
  if (resumedEvidence.found) {
    atomicEvidence = resumedEvidence.value.atomicEvidence;
    evidenceChunks = resumedEvidence.value.chunks;
  }
  const initialEvidenceBatches = partition(
    chunks,
    EVIDENCE_BATCH_MAX_ITEMS,
    EVIDENCE_BATCH_MAX_CHARACTERS
  );
  const extractEvidenceBatch = async (batch, depth = 0) => {
    try {
      const items = await run(
        'atomic-evidence',
        buildEvidenceExtractionPrompt(batch),
        (output) => validateEvidence(output, batch)
      );
      return { items, chunks: batch };
    } catch (error) {
      const divided = depth < EVIDENCE_RETRY_MAX_DEPTH && isAdaptiveEvidenceError(error)
        ? divideEvidenceBatch(batch)
        : null;
      if (!divided) throw error;
      trace.push({
        stage: 'atomic-evidence',
        adaptiveSplit: true,
        depth: depth + 1,
        reason: error.code || error.message,
        inputItems: batch.length,
        inputCharacters: evidenceBatchCharacters(batch)
      });
      input.onProtocolProgress?.(
        'extracting-project-facts',
        `证据输出过长，已自动拆分当前批次（第 ${depth + 1} 级）`
      );
      const results = [];
      for (const childBatch of divided) {
        results.push(await extractEvidenceBatch(childBatch, depth + 1));
      }
      return {
        items: results.flatMap((result) => result.items),
        chunks: results.flatMap((result) => result.chunks)
      };
    }
  };
  if (!resumedEvidence.found) {
    const extractedBatches = [];
    for (let offset = 0; offset < initialEvidenceBatches.length; offset += 2) {
      const group = initialEvidenceBatches.slice(offset, offset + 2);
      input.onProtocolProgress?.(
        'extracting-project-facts',
        `正在并行提取原子证据（批次 ${offset + 1}～${offset + group.length}/${initialEvidenceBatches.length}）`
      );
      extractedBatches.push(...await Promise.all(group.map((batch) => extractEvidenceBatch(batch))));
    }
    for (const extracted of extractedBatches) {
      evidenceChunks.push(...extracted.chunks);
      atomicEvidence.push(...canonicalizeEvidence(extracted.items, atomicEvidence.length));
    }
    await checkpoint('atomic-evidence', { chunks: evidenceChunks, atomicEvidence });
  }
  const evidenceIds = new Set(atomicEvidence.map((item) => item.id));

  let normalizedFacts;
  const resumedFacts = takeResume('normalized-facts', (saved) =>
    validateFacts({ normalizedFacts: saved }, evidenceIds)
  );
  if (resumedFacts.found) {
    normalizedFacts = resumedFacts.value;
  } else {
    normalizedFacts = [];
    const evidenceBatches = partition(atomicEvidence, 80, 70_000);
    for (const batch of evidenceBatches) {
      normalizedFacts.push(...await run(
        'normalized-facts',
        buildFactNormalizationPrompt(batch),
        (output) => validateFacts(output, evidenceIds)
      ));
    }
    if (evidenceBatches.length > 1) {
      normalizedFacts = await run(
        'fact-reconciliation',
        buildFactReconciliationPrompt(normalizedFacts),
        (output) => validateFacts(output, evidenceIds)
      );
    }
    normalizedFacts = canonicalizeFacts(normalizedFacts);
    await checkpoint('normalized-facts', normalizedFacts);
  }

  input.onProtocolProgress?.('building-brand-dna', '正在重建品牌战略模型');
  const strategicModel = await runCached(
    'strategic-model',
    buildStrategicModelPrompt(normalizedFacts, atomicEvidence, DEFAULT_INDUSTRY_RULES),
    (output) => validateStrategicModel(output, evidenceIds),
    (saved) => validateStrategicModel({ strategicModel: saved }, evidenceIds)
  );
  input.onProtocolProgress?.('diagnosing-strategy', '正在执行批判性战略诊断');
  const strategicIssues = await runCached(
    'strategic-critic',
    buildStrategicCriticPrompt(strategicModel, normalizedFacts, DEFAULT_INDUSTRY_RULES),
    (output) => validateIssues(output, evidenceIds),
    (saved) => validateIssues({ strategicIssues: saved }, evidenceIds)
  );

  input.onProtocolProgress?.('building-brand-dna', '正在合成七类品牌 DNA');
  let brandDna = await runCached(
    'dna-synthesis',
    buildDnaSynthesisPrompt({ atomicEvidence, normalizedFacts, strategicModel, strategicIssues }),
    validateDnaStage,
    (saved) => validateDnaStage({ brandDna: saved })
  );
  let geneIds = new Set(brandDna.genes.map((gene) => gene.id));
  if (geneIds.has('') || geneIds.size !== brandDna.genes.length) throw new BrandDnaSchemaError('dna-synthesis', new Error('DNA 基因 ID 缺失或重复'));
  const coreBrandDna = assembleCorePackage(brandDna, atomicEvidence, evidenceChunks);
  await input.onCoreComplete?.({
    brandDna: coreBrandDna,
    atomicEvidence,
    normalizedFacts,
    strategicModel,
    strategicIssues
  });

  input.onProtocolProgress?.('translating-creative-direction', '正在比较候选并选择唯一创意命题');
  let creativeThesisDecision = await runCached(
    'creative-thesis-decision',
    buildCreativeThesisPrompt(brandDna, strategicIssues),
    (output) => validateThesis(output, geneIds),
    (saved) => validateThesis({ creativeThesisDecision: saved }, geneIds)
  );
  const visual = await runCached(
    'visual-causal-translation',
    buildVisualTranslationPrompt(brandDna, creativeThesisDecision),
    (output) => validateVisual(output, geneIds),
    (saved) => validateVisual({
      visualTranslation: saved?.translation,
      imageSystem: saved?.system
    }, geneIds)
  );
  let visualTranslation = visual.translation;
  let imageSystem = visual.system;

  input.onProtocolProgress?.('planning-generation-tasks', '正在编译 GPT Image Task Standard');
  let imageTasks = await runCached(
    'gpt-image-task-compiler',
    buildImageTaskPrompt({ brandDna, creativeThesisDecision, visualTranslation, imageSystem }, DEFAULT_INDUSTRY_RULES),
    (output) => validateTasks(output, imageSystem, geneIds),
    (saved) => validateTasks({ imageTasks: saved }, imageSystem, geneIds)
  );

  let packageToAudit = assemblePackage(
    { brandDna, creativeThesisDecision, visualTranslation, imageSystem, imageTasks },
    atomicEvidence,
    evidenceChunks
  );
  input.onProtocolProgress?.('validating-output', '正在执行独立质量审计与评分');
  let qualityAudit = await run('quality-auditor', buildAuditPrompt(packageToAudit), validateAudit);
  qualityAudit = applyQualityGate(qualityAudit, validateImageTaskStandard(imageSystem, imageTasks));
  let qualityRepairCount = 0;

  if (!qualityAudit.passed) {
    qualityRepairCount = 1;
    const repaired = await run(
      'targeted-repair',
      buildTargetedRepairPrompt(packageToAudit, qualityAudit),
      (output) => {
        if (!output?.brandDna || !output?.creativeThesisDecision || !output?.visualTranslation || !output?.imageSystem) {
          throw new Error('定向修复输出不完整');
        }
        const repairedBrandDna = validateDnaStage({ brandDna: output.brandDna });
        const repairedGeneIds = new Set(repairedBrandDna.genes.map((gene) => gene.id));
        const repairedThesis = validateThesis({ creativeThesisDecision: output.creativeThesisDecision }, repairedGeneIds);
        const repairedVisual = validateVisual({
          visualTranslation: output.visualTranslation,
          imageSystem: output.imageSystem
        }, repairedGeneIds);
        const repairedTasks = validateTasks(
          { imageTasks: output.imageTasks },
          repairedVisual.system,
          repairedGeneIds
        );
        return {
          brandDna: repairedBrandDna,
          creativeThesisDecision: repairedThesis,
          visualTranslation: repairedVisual.translation,
          imageSystem: repairedVisual.system,
          imageTasks: repairedTasks
        };
      }
    );
    brandDna = repaired.brandDna;
    geneIds = new Set(brandDna.genes.map((gene) => gene.id));
    creativeThesisDecision = repaired.creativeThesisDecision;
    visualTranslation = repaired.visualTranslation;
    imageSystem = repaired.imageSystem;
    imageTasks = repaired.imageTasks;
    await checkpoint('dna-synthesis', brandDna);
    await checkpoint('creative-thesis-decision', creativeThesisDecision);
    await checkpoint('visual-causal-translation', {
      translation: visualTranslation,
      system: imageSystem
    });
    await checkpoint('gpt-image-task-compiler', imageTasks);
    packageToAudit = assemblePackage(
      { brandDna, creativeThesisDecision, visualTranslation, imageSystem, imageTasks },
      atomicEvidence,
      evidenceChunks
    );
    qualityAudit = await run('quality-auditor-recheck', buildAuditPrompt(packageToAudit), validateAudit);
    qualityAudit = applyQualityGate(qualityAudit, validateImageTaskStandard(imageSystem, imageTasks));
  }

  if (!qualityAudit.passed) throw new BrandDnaQualityGateError(qualityAudit);
  return {
    ...packageToAudit,
    qualityAudit,
    qualityTier,
    deepBenchmarkPassed: qualityTier === 'benchmark',
    metadata: {
      ...BRAND_DNA_PROTOCOL,
      qualityTier,
      qualityScore: qualityAudit.totalScore,
      generatedAt: new Date().toISOString()
    },
    intermediates: {
      chunks: evidenceChunks,
      atomicEvidence,
      normalizedFacts,
      strategicModel,
      strategicIssues,
      creativeThesisDecision,
      visualTranslation,
      imageSystem,
      imageTasks,
      qualityAudit,
      trace
    },
    schemaRetryCount,
    qualityRepairCount,
    provider: trace.find((entry) => entry.provider)?.provider,
    modelId: [...trace].reverse().find((entry) => entry.model)?.model
  };
}
