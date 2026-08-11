import path from 'node:path';
import type { VisualStrategyCorpus } from '../shared/types.ts';

function safeProjectName(value: string): string {
  const name = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/[. ]+$/g, '').slice(0, 80);
  if (!name) throw new Error('请输入项目名称');
  return name;
}

function documentProjectCandidate(value: string): string | null {
  const stem = path.basename(String(value || '')).replace(/\.[^.]+$/u, '')
    .replace(/^\d{1,3}[-_.、\s]+/u, '')
    .replace(/(?:[-_.\s]*v?\d+(?:\.\d+)+(?:\s*\(\d+\))?|\(\d+\))$/iu, '')
    .trim();
  const descriptor = /(?:[-—_·\s]*)(?:品牌(?:市场调研|重塑|定位|策略|战略|策划)?|市场(?:研究|调研)|调研报告|视觉(?:方案|策略|规范|指南|系统|转译)|包装设计|创意简报|策略方案|定位提案|提案|方案|报告)/u;
  const marker = stem.search(descriptor);
  const candidate = (marker > 0 ? stem.slice(0, marker) : marker === 0 ? '' : stem)
    .replace(/^[“”"'《》【】\[\]()（）\s]+|[“”"'《》【】\[\]()（）\s]+$/gu, '')
    .replace(/[-—_·\s]+$/u, '')
    .trim();
  if (candidate.length < 2 || candidate.length > 48 || /^(?:品牌|项目|文档|策略|方案|报告)$/u.test(candidate)) return null;
  return candidate;
}

export function deriveDocumentProjectName(corpus: VisualStrategyCorpus): string {
  for (const document of corpus.documents) {
    const firstLine = document.rawText.split(/\r?\n/u).map((line) => line.trim()).find(Boolean) || '';
    for (const value of [document.title, firstLine, document.filename]) {
      const candidate = documentProjectCandidate(value || '');
      if (candidate) return safeProjectName(candidate);
    }
  }
  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  return `文档视觉转译-${stamp}`;
}
