import { sanitizeFilenamePart } from './analysis-contract.ts';

export function buildBrandDnaReportFilename(projectName: string, model: string): string {
  return `${sanitizeFilenamePart(projectName)}-品牌DNA与创意转译报告-${sanitizeFilenamePart(model)}.md`;
}

export function buildBrandDnaCoreReportFilename(projectName: string, model: string): string {
  return `${sanitizeFilenamePart(projectName)}-品牌DNA核心分析报告-${sanitizeFilenamePart(model)}.md`;
}
