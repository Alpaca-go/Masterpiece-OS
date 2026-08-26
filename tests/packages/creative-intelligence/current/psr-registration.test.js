/**
 * CI-W1C.7.4 — Planning Source Registration (PSR-01..06).
 *
 * Covers `planning-source-registration.ts`:
 *   - PLANNING_BRIEF_SUPPORTED_EXTENSIONS
 *   - assertPlanningBriefFilename
 *   - buildPlanningBriefSourceId
 *   - planningBriefContentHash
 *   - buildPlanningBriefRecord
 *
 * Zero-network. Pure data-shape + crypto helpers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import {
  PLANNING_BRIEF_SUPPORTED_EXTENSIONS,
  assertPlanningBriefFilename,
  buildPlanningBriefSourceId,
  buildPlanningBriefRecord,
  planningBriefContentHash
} from '@masterpiece/creative-intelligence/strategic-synthesis';

// ---------------------------------------------------------------------------
// PSR-01..02 — supported extensions
// ---------------------------------------------------------------------------

test('PSR-01: PLANNING_BRIEF_SUPPORTED_EXTENSIONS contains pdf/docx/md/markdown/txt', () => {
  assert.ok(PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.pdf'));
  assert.ok(PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.docx'));
  assert.ok(PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.md'));
  assert.ok(PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.markdown'));
  assert.ok(PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.txt'));
  // NOT supported (must be refused):
  assert.ok(!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.png'));
  assert.ok(!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.jpg'));
  assert.ok(!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has('.zip'));
  assert.ok(!PLANNING_BRIEF_SUPPORTED_EXTENSIONS.has(''));
});

test('PSR-02: assertPlanningBriefFilename accepts supported and refuses unsupported', () => {
  assertPlanningBriefFilename('brief.md');
  assertPlanningBriefFilename('brief.MD'); // case-insensitive
  assertPlanningBriefFilename('strategy.pdf');
  assertPlanningBriefFilename('plan.docx');
  assertPlanningBriefFilename('notes.markdown');
  assertPlanningBriefFilename('notes.txt');
  assert.throws(() => assertPlanningBriefFilename('image.png'), /PLANNING-BRIEF-UNSUPPORTED-EXT/);
  assert.throws(() => assertPlanningBriefFilename('archive.zip'), /PLANNING-BRIEF-UNSUPPORTED-EXT/);
  assert.throws(() => assertPlanningBriefFilename('no-extension'), /PLANNING-BRIEF-UNSUPPORTED-EXT/);
});

// ---------------------------------------------------------------------------
// PSR-03..04 — source id + content hash
// ---------------------------------------------------------------------------

test('PSR-03: buildPlanningBriefSourceId is stable and contains projectId + contentHash slice', () => {
  const id1 = buildPlanningBriefSourceId('proj-A', 'abc123def456');
  const id2 = buildPlanningBriefSourceId('proj-A', 'abc123def456');
  assert.equal(id1, id2);
  assert.ok(id1.startsWith('planning-brief:proj-A:'));
  assert.ok(id1.includes('abc123def456'.slice(0, 16)));
});

test('PSR-04: planningBriefContentHash is LF-normalized SHA-256 of full text', () => {
  const text = 'line1\nline2\nline3';
  // LF-normalized hash (matches createHash('sha256').update(text).digest('hex'))
  const expected = createHash('sha256').update(text).digest('hex');
  assert.equal(planningBriefContentHash(text), expected);
  // CRLF is normalized to LF → same hash
  const textCrlf = 'line1\r\nline2\r\nline3';
  assert.equal(planningBriefContentHash(textCrlf), expected);
  // CR-only is normalized to LF → same hash
  const textCr = 'line1\rline2\rline3';
  assert.equal(planningBriefContentHash(textCr), expected);
  // Different text → different hash
  assert.notEqual(planningBriefContentHash('line1\nline2'), planningBriefContentHash('line1\nline3'));
});

// ---------------------------------------------------------------------------
// PSR-05..06 — buildPlanningBriefRecord
// ---------------------------------------------------------------------------

test('PSR-05: buildPlanningBriefRecord produces a valid record with stable sourceId', () => {
  const rawText = '品牌定位: 可追溯有机生鲜订阅\n行业: 有机生鲜电商\n';
  const record = buildPlanningBriefRecord({
    projectId: 'proj-A',
    filename: 'qualification-planning-a.md',
    relativePath: 'planning-briefs/qualification-planning-a.md',
    rawText,
    registeredAt: '2026-08-20T16:00:00.000Z'
  });
  assert.equal(record.filename, 'qualification-planning-a.md');
  assert.equal(record.extension, '.md');
  assert.equal(record.relativePath, 'planning-briefs/qualification-planning-a.md');
  assert.equal(record.sourceType, 'planning_document');
  assert.equal(record.contentHash, planningBriefContentHash(rawText));
  assert.equal(record.characterCount, rawText.length);
  assert.equal(record.registeredAt, '2026-08-20T16:00:00.000Z');
  assert.ok(record.sourceId.startsWith('planning-brief:proj-A:'));
});

test('PSR-06: buildPlanningBriefRecord refuses unsupported extensions', () => {
  assert.throws(
    () =>
      buildPlanningBriefRecord({
        projectId: 'proj-A',
        filename: 'image.png',
        relativePath: 'planning-briefs/image.png',
        rawText: 'fake',
        registeredAt: '2026-08-20T16:00:00.000Z'
      }),
    /PLANNING-BRIEF-UNSUPPORTED-EXT/
  );
});
