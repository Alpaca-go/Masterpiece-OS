/**
 * CI-W1C.7.4 — Planning Source Registration.
 *
 * Helper that reads a registered planning brief from the project
 * store, parses it via the existing text extraction (PDF/DOCX/MD/TXT),
 * and prepares a `prepareDocumentSet` chunking result.
 *
 * NO model call. NO raw binary in project.json. The brief file
 * itself is stored on disk under `<projectDir>/planning-briefs/`.
 *
 * Spec rules (PART C / PART D):
 *  - Stable source id
 *  - Filename
 *  - Relative storage path
 *  - Source type
 *  - Content hash
 *  - Registered-at
 *  - NO raw binary / base64 in project.json
 */

import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const PLANNING_BRIEF_SUPPORTED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.md',
  '.markdown',
  '.txt'
]);

/**
 * Canonical record for a registered planning brief.
 * This is what `project.planningBriefFiles[]` contains.
 */
export interface PlanningBriefRecord {
  /** Stable id: `planning-brief:<projectId>:<contentHash[:16]>` */
  sourceId: string;
  /** Sanitized filename. */
  filename: string;
  /** File extension (e.g., ".md"). */
  extension: string;
  /** Relative path from project root. */
  relativePath: string;
  /** Always `planning_document` for this record. */
  sourceType: 'planning_document';
  /** SHA-256 of the brief's full text (LF-normalized). */
  contentHash: string;
  /** Character count of the brief text. */
  characterCount: number;
  /** ISO 8601 registration timestamp. */
  registeredAt: string;
}

/**
 * Throw if the filename does not have a planning-brief-supported extension.
 */
export function assertPlanningBriefFilename(filename: string): void {
  const ext = path.extname(filename).toLowerCase();
  if (!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `PLANNING-BRIEF-UNSUPPORTED-EXT: ${ext}. Supported: ${[...PLANNING_BRIEF_SUPPORTED_EXTENSIONS].join(', ')}`
    );
  }
}

/**
 * Compute the stable source id for a planning brief.
 */
export function buildPlanningBriefSourceId(projectId: string, contentHash: string): string {
  return `planning-brief:${projectId}:${contentHash.slice(0, 16)}`;
}

/**
 * SHA-256 of the full text (LF-normalized) of a planning brief.
 */
export function planningBriefContentHash(rawText: string): string {
  const normalized = String(rawText || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}

/**
 * Read a planning brief file from disk and return its raw text.
 *
 * File format handling is DELEGATED to the existing
 * `runtime-core/src/application/document-processing.ts` text extraction
 * (which already supports PDF/DOCX/MD/TXT). This function is the
 * thin wrapper that the planning-strategic-evidence module calls.
 *
 * @param absolutePath absolute path to the planning brief file
 * @returns the decoded raw text + the file extension
 */
export async function readPlanningBriefFile(absolutePath: string): Promise<{
  rawText: string;
  extension: string;
  parseWarnings?: string[];
}> {
  const extension = path.extname(absolutePath).toLowerCase();
  if (!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`PLANNING-BRIEF-UNSUPPORTED-EXT: ${extension}`);
  }
  // Defer to runtime-core's document-processing for actual text extraction.
  // We import it lazily to avoid a hard cycle between creative-intelligence
  // and runtime-core at module-load time.
  const documentProcessing = await import(
    /* @vite-ignore */ '../../../runtime-core/src/application/document-processing.ts' as string
  ).catch(() => null);

  if (documentProcessing && typeof documentProcessing.parseStrategyDocument === 'function') {
    const parsed = await documentProcessing.parseStrategyDocument(absolutePath);
    return {
      rawText: parsed.rawText,
      extension,
      parseWarnings: parsed.parseWarnings
    };
  }
  // Fallback: read the file directly. Used by test paths where
  // runtime-core may not be reachable.
  const buffer = await readFile(absolutePath);
  // Handle UTF-8 with optional BOM; otherwise treat as UTF-8.
  const text = buffer.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))
    ? buffer.subarray(3).toString('utf8')
    : buffer.toString('utf8');
  return { rawText: text, extension };
}

/**
 * Build a PlanningBriefRecord from a filename + rawText + projectId +
 * relativePath. Does NOT touch disk. Used by the registration path.
 */
export function buildPlanningBriefRecord(input: {
  projectId: string;
  filename: string;
  relativePath: string;
  rawText: string;
  registeredAt: string;
}): PlanningBriefRecord {
  const extension = path.extname(input.filename).toLowerCase();
  assertPlanningBriefFilename(input.filename);
  const contentHash = planningBriefContentHash(input.rawText);
  return {
    sourceId: buildPlanningBriefSourceId(input.projectId, contentHash),
    filename: input.filename,
    extension,
    relativePath: input.relativePath,
    sourceType: 'planning_document',
    contentHash,
    characterCount: input.rawText.length,
    registeredAt: input.registeredAt
  };
}
