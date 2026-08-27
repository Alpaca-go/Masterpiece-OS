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
  return value.replace(/\s+/gu, ' ').trim().slice(0, 1200);
}

function evidenceForDocument(document: NormalizedDocument, sourceDocumentId: string, now: string): DesignBriefEvidence[] {
  return document.sections.flatMap((section, index) => {
    const excerpt = normalizeExcerpt(section.content);
    if (!excerpt) return [];
    const locator = section.page
      ? { kind: 'DOCUMENT_PAGE' as const, value: `page:${section.page}` }
      : section.heading
        ? { kind: 'DOCUMENT_SECTION' as const, value: section.heading }
        : { kind: 'DOCUMENT_RANGE' as const, value: `section:${index + 1};characters:1-${section.content.length}` };
    return [{
      id: evidenceId(sourceDocumentId, `${locator.kind}:${locator.value}`, excerpt),
      sourceDocumentId,
      normalizedSourceId: document.id,
      locator,
      excerpt,
      createdAt: now,
    }];
  });
}

function conflictWarnings(evidence: DesignBriefEvidence[]): string[] {
  const bySection = new Map<string, DesignBriefEvidence[]>();
  for (const item of evidence) {
    if (item.locator.kind !== 'DOCUMENT_SECTION') continue;
    const key = item.locator.value.replace(/\s+/gu, '').toLocaleLowerCase();
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
