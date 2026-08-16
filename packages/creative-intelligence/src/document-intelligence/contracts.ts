/**
 * Document Intelligence contracts.
 *
 * Spec #9: structural types compatible with production shapes.
 *         No imports from runtime-core; project-contracts is allowed.
 *
 * Production types referenced:
 *   - DocumentVisualContext          (from @masterpiece/project-contracts)
 *   - VisualStrategyCorpus           (from @masterpiece/runtime-core/application-contracts)
 *   - DocumentContextWarning         (from @masterpiece/runtime-core/application-contracts)
 *   - NormalizedDocument             (from @masterpiece/runtime-core/application-contracts)
 *
 * All runtime-core types are mirrored as CI-local structural interfaces so
 * CI never needs to import runtime-core. The shapes are identical and
 * TypeScript's structural typing accepts the production values.
 */

import type { DocumentVisualContext, DocumentVisualContextEvidence } from '@masterpiece/project-contracts/index.ts';

// ── Mirrored structural types (runtime-core shapes) ──

export type DocumentRole =
  | 'brand-strategy'
  | 'creative-brief'
  | 'visual-guideline'
  | 'product-information'
  | 'market-research'
  | 'reference'
  | 'unknown';

export interface DocumentTable {
  /** Markdown representation. */
  markdown: string;
  /** Optional caption. */
  caption?: string;
  /** Optional location. */
  pageNumber?: number;
}

export interface NormalizedDocument {
  id: string;
  filename: string;
  sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
  title?: string;
  rawText: string;
  characterCount: number;
  pageCount?: number;
  documentRole?: DocumentRole;
  tables: DocumentTable[];
}

export interface VisualStrategyCorpusSourceIndexEntry {
  documentId: string;
  filename: string;
  sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
  characterCount: number;
  pageCount?: number;
  documentRole?: DocumentRole;
}

export interface VisualStrategyCorpus {
  documents: NormalizedDocument[];
  sourceIndex: VisualStrategyCorpusSourceIndexEntry[];
}

export interface DocumentContextWarning {
  code: string;
  message: string;
  field?: string;
}

// ── Public CI-owned types (spec #9) ──

/**
 * Document Intelligence input. Accepts the production DocumentVisualContext
 * structurally (CI-2 already covered DVC via the truth-adapter).
 */
export interface DocumentIntelligenceInput {
  projectId: string;
  context: DocumentVisualContext;
  corpus?: VisualStrategyCorpus;
}

/**
 * Document Intelligence output. Spec #9: pure result surface.
 */
export interface DocumentIntelligenceResult {
  schemaVersion: '0.1';
  projectId: string;
  context: DocumentVisualContext;
  sourceRunId: string;
  generatedAt: string;
  warnings: DocumentContextWarning[];
  /** True iff the input DVC has no brand / industry / products / etc. */
  isEmpty: boolean;
  /** CI-3 extension: optional brief string from compileContextBrief. */
  brief?: string;
}

// ── CI-3 re-exports of the production types we mirror ──

export type { DocumentVisualContext, DocumentVisualContextEvidence };
