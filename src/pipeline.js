import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inventoryProject } from './inventory.js';
import { analyzeBenchmarks, buildBrandLock, buildGapAnalysis, buildImagePlan, buildPriorities } from './analyze.js';
import { buildCreativeReasoning } from './creative-reasoning.js';
import { analyzeKnowledge, buildKnowledgeCandidates, loadApprovedRules } from './knowledge-analysis.js';
import { buildActionItems, buildDesignReview } from './design-review.js';
import { buildGrowthAnalysis, loadReviewHistory, reviewRecordId, saveReviewHistory } from './growth-engine.js';
import { renderAll } from './report.js';
import { readJson } from './utils.js';

const DEFAULT_APPROVED_KNOWLEDGE = fileURLToPath(new URL('../knowledge/approved/', import.meta.url));
const DEFAULT_REVIEW_HISTORY = fileURLToPath(new URL('../history/reviews/', import.meta.url));

export function normalizeMode(value = 'fast') {
  const mode = String(value || 'fast').toLowerCase();
  if (!['fast', 'review', 'research'].includes(mode)) throw new Error(`未知分析模式：${value}；可选 fast、review、research`);
  return mode;
}

export async function runPipeline(input, options = {}) {
  const startedAt = Date.now();
  const mode = normalizeMode(options.mode);
  const root = path.resolve(input);
  const configPath = options.config ? path.resolve(options.config) : path.join(root, 'design-factory.json');
  const config = await readJson(configPath, {});
  const output = path.resolve(options.output || path.join(root, options.outputName || 'outputs'));
  const inventory = await inventoryProject(root, {
    ignore: [options.outputName || 'outputs', 'design-factory-output'],
    ignorePaths: [output]
  });
  const brandLock = buildBrandLock(inventory, config);
  const benchmarks = await analyzeBenchmarks(inventory, brandLock, config, options);
  const creativeReasoning = buildCreativeReasoning(inventory, brandLock, benchmarks, config);
  const gaps = buildGapAnalysis(inventory, benchmarks, config);
  const imagePlan = buildImagePlan(gaps, brandLock, config);
  const priorities = buildPriorities(brandLock, gaps);
  const result = { version: '3.0.0', mode, generatedAt: new Date().toISOString(), configPath, config, inventory, brandLock, benchmarks, creativeReasoning, gaps, imagePlan, priorities };
  if (mode === 'fast') {
    result.durationMs = Date.now() - startedAt;
    const files = await renderAll(result, output, { debug: Boolean(options.debug), mode });
    result.outputFiles = files;
    result.durationMs = Date.now() - startedAt;
    return { result, output };
  }
  const knowledgeApprovedPath = options.knowledgeDir
    ? path.resolve(options.knowledgeDir)
    : config.knowledgeApprovedPath
      ? path.resolve(root, config.knowledgeApprovedPath)
      : DEFAULT_APPROVED_KNOWLEDGE;
  const knowledgeCandidates = buildKnowledgeCandidates(result, config);
  const approvedRules = await loadApprovedRules(knowledgeApprovedPath);
  const knowledgeAnalysis = analyzeKnowledge(knowledgeCandidates, approvedRules, brandLock.brandName);
  Object.assign(result, { knowledgeApprovedPath, knowledgeCandidates, knowledgeAnalysis });
  const designReview = buildDesignReview(result, config);
  result.designReview = designReview;
  const historyDir = path.resolve(options.historyDir || DEFAULT_REVIEW_HISTORY);
  const recordId = reviewRecordId(brandLock.brandName, result.generatedAt);
  const history = await loadReviewHistory(historyDir, recordId);
  const growth = buildGrowthAnalysis(designReview, history);
  Object.assign(result, {
    growth,
    actionItems: buildActionItems(result, growth),
    history: { directory: historyDir, recordId, priorRecordCount: history.records.length, warnings: history.warnings }
  });
  result.durationMs = Date.now() - startedAt;
  const files = await renderAll(result, output, { debug: Boolean(options.debug), mode });
  result.outputFiles = files;
  await saveReviewHistory(result, historyDir);
  result.durationMs = Date.now() - startedAt;
  return { result, output };
}
