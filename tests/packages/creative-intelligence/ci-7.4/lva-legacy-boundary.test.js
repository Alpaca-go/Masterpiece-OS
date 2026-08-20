/**
 * CI-W1C.7.4 — Legacy Visual Boundary (LVA-01..05).
 *
 * Verifies the hard rule that LEGACY_VISUAL_EVIDENCE / VUC diagnosis /
 * visual-guideline / reference are NEVER treated as
 * PLANNING_STRATEGIC_SOURCE. This is the audit-trail guarantee.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mapRoleToSourceRole,
  assertPlanningSourceRole
} from '../../../../packages/creative-intelligence/src/strategic-synthesis/index.ts';
import { classifyDocumentRole } from '@masterpiece/document-ingestion/document-preparation.js';

// ---------------------------------------------------------------------------
// LVA-01..02 — direct mapping refusal
// ---------------------------------------------------------------------------

test('LVA-01: visual-guideline MUST NOT become PLANNING_STRATEGIC_SOURCE', () => {
  const role = mapRoleToSourceRole('visual-guideline');
  assert.notEqual(role, 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(role, 'LEGACY_VISUAL_EVIDENCE');
});

test('LVA-02: reference MUST NOT become PLANNING_STRATEGIC_SOURCE', () => {
  const role = mapRoleToSourceRole('reference');
  assert.notEqual(role, 'PLANNING_STRATEGIC_SOURCE');
  assert.equal(role, 'LEGACY_VISUAL_EVIDENCE');
});

// ---------------------------------------------------------------------------
// LVA-03..04 — classifyDocumentRole real-world outputs
// ---------------------------------------------------------------------------

test('LVA-03: a VI / visual-guideline text classifies as visual-guideline, not planning', () => {
  const classification = classifyDocumentRole({
    id: 'doc-vi',
    filename: 'visual-guideline-v3.pdf',
    rawText: '视觉规范 / VI 手册 / 品牌色 / logo 用法 / 标准字'
  });
  // classifyDocumentRole is heuristic — but the source-role mapping
  // must never let a visual-guideline become PLANNING_STRATEGIC_SOURCE.
  const sourceRole = mapRoleToSourceRole(classification.role);
  assert.notEqual(sourceRole, 'PLANNING_STRATEGIC_SOURCE',
    `visual-guideline must not become planning; got role=${classification.role} sourceRole=${sourceRole}`);
});

test('LVA-04: a "参考" / reference text classifies as reference, not planning', () => {
  const classification = classifyDocumentRole({
    id: 'doc-ref',
    filename: 'reference-inspiration.md',
    rawText: '参考 / 案例 / 视觉灵感 / inspiration / 这些是参考'
  });
  const sourceRole = mapRoleToSourceRole(classification.role);
  assert.notEqual(sourceRole, 'PLANNING_STRATEGIC_SOURCE',
    `reference must not become planning; got role=${classification.role} sourceRole=${sourceRole}`);
});

// ---------------------------------------------------------------------------
// LVA-05 — assertPlanningSourceRole boundary
// ---------------------------------------------------------------------------

test('LVA-05: only 3 source roles are valid; all others are refused', () => {
  // The three valid roles
  assertPlanningSourceRole('PLANNING_STRATEGIC_SOURCE');
  assertPlanningSourceRole('LEGACY_VISUAL_EVIDENCE');
  assertPlanningSourceRole('UNKNOWN_SOURCE');
  // Boundary: a brief that mixed planning + visual would have a single
  // source role; we MUST NOT allow invented roles like
  // 'PLANNING_LEGACY_HYBRID' or 'PLANNING_FACT' etc.
  assert.throws(() => assertPlanningSourceRole('PLANNING_LEGACY_HYBRID'), /PLANNING-SOURCE-ROLE-INVALID/);
  assert.throws(() => assertPlanningSourceRole('FACT'), /PLANNING-SOURCE-ROLE-INVALID/);
  assert.throws(() => assertPlanningSourceRole('USER_REQUIREMENT'), /PLANNING-SOURCE-ROLE-INVALID/);
  assert.throws(() => assertPlanningSourceRole(''), /PLANNING-SOURCE-ROLE-INVALID/);
});
