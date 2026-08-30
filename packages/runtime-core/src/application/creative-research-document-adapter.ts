import crypto from 'node:crypto';
import path from 'node:path';
import type { NormalizedDocument } from '../shared/types.ts';
import type { DocumentIntakeAdapter, DocumentIntakeMaterial } from './creative-research/adapter-contracts.ts';
import type { DesignBriefEvidence } from './creative-research/contracts.ts';
import { creativeResearchError } from './creative-research-errors.ts';
import { parseStrategyDocument } from './document-processing.ts';

// Existing repository role authority; this adapter only maps its result into Creative Research intake metadata.
// @ts-ignore JavaScript workspace module intentionally has no declaration file.
import { classifyDocumentRole } from '@masterpiece/document-ingestion/document-preparation.js';

const SUPPORTED_EXTENSIONS = new Set(['.pdf', '.docx', '.md', '.markdown', '.txt']);
const EVIDENCE_CHUNK_CHARACTERS = 1200;
const EVIDENCE_CHUNK_OVERLAP = 120;

export interface CreativeResearchSourceDocument {
  path: string;
  sourceDocumentId?: string;
}

export type CreativeResearchSourceResolver = (
  sourceDocumentId: string,
) => Promise<string | CreativeResearchSourceDocument>;

function evidenceId(sourceDocumentId: string, locator: string, excerpt: string): string {
  return `evidence-${crypto.createHash('sha256').update(`${sourceDocumentId}\0${locator}\0${excerpt}`).digest('hex').slice(0, 24)}`;
}

function normalizeExcerpt(value: string): string {
  return value.replace(/\s+/gu, ' ').trim();
}

function evidenceChunks(value: string): Array<{ excerpt: string; start: number; end: number }> {
  const text = normalizeExcerpt(value);
  if (!text) return [];
  if (text.length <= EVIDENCE_CHUNK_CHARACTERS) {
    return [{ excerpt: text, start: 1, end: text.length }];
  }
  const chunks: Array<{ excerpt: string; start: number; end: number }> = [];
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + EVIDENCE_CHUNK_CHARACTERS, text.length);
    if (endIndex < text.length) {
      const tail = text.slice(startIndex + Math.floor(EVIDENCE_CHUNK_CHARACTERS * 0.7), endIndex);
      const boundary = Math.max(
        tail.lastIndexOf('。'), tail.lastIndexOf('！'), tail.lastIndexOf('？'),
        tail.lastIndexOf('. '), tail.lastIndexOf('! '), tail.lastIndexOf('? '),
        tail.lastIndexOf('；'), tail.lastIndexOf('; '),
      );
      if (boundary >= 0) {
        endIndex = startIndex + Math.floor(EVIDENCE_CHUNK_CHARACTERS * 0.7) + boundary + 1;
      }
    }
    const excerpt = text.slice(startIndex, endIndex).trim();
    if (excerpt) chunks.push({ excerpt, start: startIndex + 1, end: endIndex });
    if (endIndex >= text.length) break;
    startIndex = Math.max(startIndex + 1, endIndex - EVIDENCE_CHUNK_OVERLAP);
  }
  return chunks;
}

function evidenceForDocument(document: NormalizedDocument, sourceDocumentId: string, now: string): DesignBriefEvidence[] {
  return document.sections.flatMap((section, index) => {
    const chunks = evidenceChunks(section.content);
    return chunks.map((chunk) => {
      const characterRange = `characters:${chunk.start}-${chunk.end}`;
      const locator = section.page
        ? { kind: 'DOCUMENT_PAGE' as const, value: chunks.length === 1 ? `page:${section.page}` : `page:${section.page};${characterRange}` }
        : section.heading
          ? { kind: 'DOCUMENT_SECTION' as const, value: chunks.length === 1 ? section.heading : `${section.heading};${characterRange}` }
          : { kind: 'DOCUMENT_RANGE' as const, value: `section:${index + 1};${characterRange}` };
      return {
        id: evidenceId(sourceDocumentId, `${locator.kind}:${locator.value}`, chunk.excerpt),
        sourceDocumentId,
        normalizedSourceId: document.id,
        locator,
        excerpt: chunk.excerpt,
        createdAt: now,
      };
    });
  });
}

function conflictWarnings(evidence: DesignBriefEvidence[]): string[] {
  const bySection = new Map<string, DesignBriefEvidence[]>();
  for (const item of evidence) {
    if (item.locator.kind !== 'DOCUMENT_SECTION') continue;
    const key = item.locator.value
      .replace(/;characters:\d+-\d+$/u, '')
      .replace(/\s+/gu, '')
      .toLocaleLowerCase();
    const items = bySection.get(key) || [];
    items.push(item);
    bySection.set(key, items);
  }
  return [...bySection.entries()].flatMap(([section, items]) => {
    const sources = new Set(items.map((item) => item.sourceDocumentId));
    const values = new Set(items.map((item) => normalizeExcerpt(item.excerpt || '').toLocaleLowerCase()));
    return sources.size > 1 && values.size > 1
      ? [`检测到多文档同名章节内容不一致：${section}；Design Brief 必须保留冲突，不得静默择一。`]
      : [];
  });
}

export function createCreativeResearchDocumentAdapter(options: {
  resolveSource?: CreativeResearchSourceResolver;
  now?: () => string;
} = {}): DocumentIntakeAdapter {
  const resolveSource = options.resolveSource || (async (sourceDocumentId: string) => sourceDocumentId);
  const now = options.now || (() => new Date().toISOString());
  return {
    async readEvidence(input): Promise<DocumentIntakeMaterial> {
      if (!input.sourceDocumentIds.length) {
        throw creativeResearchError('CREATIVE_RESEARCH_DOCUMENT_EMPTY', '请至少提供一个 Creative Research 源文档');
      }
      const documents: NonNullable<DocumentIntakeMaterial['documents']> = [];
      const evidence: DesignBriefEvidence[] = [];
      const warnings: string[] = [];
      for (const requestedId of [...new Set(input.sourceDocumentIds)]) {
        const resolved = await resolveSource(requestedId);
        const source = typeof resolved === 'string' ? { path: resolved } : resolved;
        const filename = path.resolve(source.path);
        const extension = path.extname(filename).toLocaleLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(extension)) {
          throw creativeResearchError(
            'CREATIVE_RESEARCH_DOCUMENT_UNSUPPORTED',
            `Creative Research 暂不支持 ${extension || '无扩展名'} 文档：${path.basename(filename)}`,
            { sourceDocumentId: requestedId, extension },
          );
        }
        let document: NormalizedDocument;
        try {
          document = await parseStrategyDocument(filename);
        } catch (error) {
          throw creativeResearchError(
            /未从文档中提取到有效文本|扫描件/u.test((error as Error).message)
              ? 'CREATIVE_RESEARCH_DOCUMENT_EMPTY'
              : 'CREATIVE_RESEARCH_DOCUMENT_READ_FAILED',
            `读取 Creative Research 文档失败：${(error as Error).message}`,
            { sourceDocumentId: requestedId },
          );
        }
        const sourceDocumentId = source.sourceDocumentId || requestedId;
        const classification = classifyDocumentRole({
          id: sourceDocumentId,
          filename: document.filename,
          title: document.title,
          rawText: document.rawText,
          sections: document.sections,
          tables: document.tables,
        });
        documents.push({
          documentId: sourceDocumentId,
          filename: document.filename,
          sourceType: document.sourceType,
          ...(document.title ? { title: document.title } : {}),
          role: typeof classification?.role === 'string' ? classification.role : 'unknown',
          parseWarnings: [...document.parseWarnings],
        });
        warnings.push(...document.parseWarnings.map((warning) => `${document.filename}: ${warning}`));
        evidence.push(...evidenceForDocument(document, sourceDocumentId, now()));
      }
      if (!evidence.length) {
        throw creativeResearchError('CREATIVE_RESEARCH_DOCUMENT_EMPTY', '源文档没有可用于 Design Brief 的文本证据');
      }
      warnings.push(...conflictWarnings(evidence));
      return {
        projectId: input.projectId,
        sourceDocumentIds: documents.map((document) => document.documentId),
        documents,
        evidence,
        warnings: [...new Set(warnings)],
      };
    },
  };
}
