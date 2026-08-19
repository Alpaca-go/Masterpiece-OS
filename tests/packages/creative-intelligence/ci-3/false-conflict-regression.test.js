/**
 * Document Intelligence — False Conflict Regression (FC01-FC04)
 *
 * Spec: §32-§33 Required Conflict / False-Conflict Regression
 *
 *   FC01: real Logo lock conflict → block
 *     project: 原始 Logo 不允许修改
 *     document: Logo 必须替换为新的红色图标
 *     Expected: locked_value_violation → CRITICAL_CONFLICT_DEPENDENCY
 *
 *   FC02: real brand identity mismatch → block
 *     project: brand.name = "BrandA"
 *     document: brand.name = "BrandB"
 *     Expected: identity_mismatch (correct gate behavior)
 *
 *   FC03: creative preference mismatch → no LOCKED conflict
 *     project: locked.facts = ["原始 Logo 不允许修改"]
 *     document: visualPreferences = ["希望尝试不同的 Logo"] (creative preference)
 *     Expected: no locked_value_violation
 *
 *   FC04: creative hypothesis variation → no LOCKED conflict
 *     project: locked.facts = ["原始 Logo 不允许修改"]
 *     document: visualPreferences = ["可以探索一些新的视觉方向"] (creative hypothesis)
 *     Expected: no locked_value_violation
 *
 * Frozen surfaces: conflict-detector and concept-gates are FROZEN.
 * This test only exercises the production conflict detector to verify
 * the gate still works correctly. The fixture inputs match what the
 * Document Intelligence extraction would produce under the new prompt.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import { detectConflicts } from '@masterpiece/creative-intelligence/truth/conflict-detector.ts';
import { PROJECT_TRUTH_KEYS } from '@masterpiece/creative-intelligence/truth/key-registry.ts';

function fact(key, value, opts = {}) {
  return {
    id: opts.id ?? `${opts.sourceType ?? 's'}:${key}:${JSON.stringify(value)}`,
    key,
    value,
    truthClass: opts.truthClass ?? 'fact',
    status: opts.status ?? 'observed',
    authority: opts.authority ?? 'AUTHORITATIVE_PROJECT_METADATA',
    sourceType: opts.sourceType ?? 'project_record',
    sourceId: opts.sourceId ?? 'src',
    evidenceRefs: [],
    isReferenceFact: opts.isReferenceFact ?? false,
  };
}

// =====================================================================
// FC01: real Logo lock conflict → block
// =====================================================================

test('FC01: real Logo lock conflict → locked_value_violation', () => {
  // project.json: 原始 Logo 不允许修改 (LOCKED)
  const projectLocked = fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['原始 Logo 不允许修改'], {
    id: 'project_record:p1:locked.facts',
    authority: 'LOCKED',
    sourceType: 'project_record',
  });
  // document: Logo 必须替换为新的红色图标 (LOCKED, contradicting the project)
  const documentLocked = fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['Logo 必须替换为新的红色图标'], {
    id: 'document_visual_context:d1:locked.facts',
    authority: 'LOCKED',
    sourceType: 'document_visual_context',
  });
  const conflicts = detectConflicts({ facts: [projectLocked, documentLocked] });
  const lockedViolations = conflicts.filter((c) => c.type === 'locked_value_violation');
  assert.ok(lockedViolations.length > 0,
    'FC01: real lock conflict MUST raise locked_value_violation');
  assert.equal(lockedViolations[0].key, PROJECT_TRUTH_KEYS.LOCKED_FACTS);
});

// =====================================================================
// FC02: real brand identity mismatch → block (identity_mismatch)
// =====================================================================

test('FC02: real brand identity mismatch → identity_mismatch', () => {
  const projectBrand = fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'BrandA', {
    id: 'project_record:p1:brand.name',
    sourceType: 'project_record',
  });
  const documentBrand = fact(PROJECT_TRUTH_KEYS.BRAND_NAME, 'BrandB', {
    id: 'document_visual_context:d1:brand.name',
    sourceType: 'document_visual_context',
  });
  const conflicts = detectConflicts({ facts: [projectBrand, documentBrand] });
  const identity = conflicts.find((c) => c.type === 'identity_mismatch');
  assert.ok(identity, 'FC02: brand.name mismatch MUST raise identity_mismatch');
  assert.equal(identity.key, PROJECT_TRUTH_KEYS.BRAND_NAME);
});

// =====================================================================
// FC03: creative preference mismatch → no LOCKED conflict
// =====================================================================

test('FC03: creative preference in visualPreferences → no locked_value_violation', () => {
  // project: real LOCKED
  const projectLocked = fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['原始 Logo 不允许修改'], {
    id: 'project_record:p1:locked.facts',
    authority: 'LOCKED',
    sourceType: 'project_record',
  });
  // document: creative preference in visualPreferences (NOT lockedFacts)
  const documentVisualPref = fact(PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES, ['希望尝试不同的 Logo'], {
    id: 'document_visual_context:d1:visualPreferences',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document_visual_context',
  });
  const conflicts = detectConflicts({ facts: [projectLocked, documentVisualPref] });
  const lockedViolations = conflicts.filter((c) => c.type === 'locked_value_violation');
  assert.equal(lockedViolations.length, 0,
    `FC03: creative preference in visualPreferences must NOT raise locked_value_violation; got ${JSON.stringify(lockedViolations)}`);
  // The visualPreferences fact should not conflict with the project locked fact
  // because they're on different keys.
});

// =====================================================================
// FC04: creative hypothesis variation → no LOCKED conflict
// =====================================================================

test('FC04: creative hypothesis in visualPreferences → no locked_value_violation', () => {
  const projectLocked = fact(PROJECT_TRUTH_KEYS.LOCKED_FACTS, ['原始 Logo 不允许修改'], {
    id: 'project_record:p1:locked.facts',
    authority: 'LOCKED',
    sourceType: 'project_record',
  });
  const documentVisualPref = fact(PROJECT_TRUTH_KEYS.VISUAL_PREFERENCES, ['可以探索一些新的视觉方向'], {
    id: 'document_visual_context:d1:visualPreferences',
    authority: 'AUTHORITATIVE_DOCUMENT_FACT',
    sourceType: 'document_visual_context',
  });
  const conflicts = detectConflicts({ facts: [projectLocked, documentVisualPref] });
  const lockedViolations = conflicts.filter((c) => c.type === 'locked_value_violation');
  assert.equal(lockedViolations.length, 0,
    `FC04: creative hypothesis in visualPreferences must NOT raise locked_value_violation; got ${JSON.stringify(lockedViolations)}`);
});
