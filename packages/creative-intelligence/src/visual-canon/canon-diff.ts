/**
 * Canon Diff.
 *
 * CI-8 Step 37-38: deterministic diff between two VisualCanon instances.
 *
 * Purpose:
 *   - detect changes when user changes selection
 *   - support revision history
 *   - signal downstream that recompile is needed
 *
 * No production recompile in CI-8.
 */

import type { VisualCanon, VisualCanonDiff } from './contracts.ts';

function canonRuleIds(canon: VisualCanon): Set<string> {
  const ids = new Set<string>();
  for (const rule of [canon.colorRelationship, canon.materialRelationship, canon.compositionLogic,
    canon.typographyBehavior, canon.graphicBehavior, canon.imageBehavior]) {
    if (rule) ids.add(rule.id);
  }
  return ids;
}

function dnaIds(canon: VisualCanon): Set<string> {
  const ids = new Set<string>();
  for (const list of [canon.visualDNA.structuralDNA, canon.visualDNA.identityDNA,
    canon.visualDNA.rhythmDNA, canon.visualDNA.hierarchyDNA, canon.visualDNA.relationDNA,
    canon.visualDNA.colorDNA ?? [], canon.visualDNA.materialDNA ?? [], canon.visualDNA.graphicDNA ?? []]) {
    for (const elem of list) ids.add(elem.id);
  }
  return ids;
}

function grammarIds(canon: VisualCanon): Set<string> {
  const ids = new Set<string>();
  for (const list of [canon.visualGrammar.compositionRules, canon.visualGrammar.hierarchyRules,
    canon.visualGrammar.repetitionRules, canon.visualGrammar.transformationRules,
    canon.visualGrammar.assetUsageRules, canon.visualGrammar.crossMediaAdaptationRules,
    canon.visualGrammar.forbiddenCombinations]) {
    for (const r of list) ids.add(r.id);
  }
  return ids;
}

export function diffCanon(oldCanon: VisualCanon, newCanon: VisualCanon): VisualCanonDiff {
  const oldRuleIds = canonRuleIds(oldCanon);
  const newRuleIds = canonRuleIds(newCanon);

  const oldDnaIds = dnaIds(oldCanon);
  const newDnaIds = dnaIds(newCanon);

  const oldGrammarIds = grammarIds(oldCanon);
  const newGrammarIds = grammarIds(newCanon);

  const addedRules: string[] = [...newRuleIds].filter((id) => !oldRuleIds.has(id));
  const removedRules: string[] = [...oldRuleIds].filter((id) => !newRuleIds.has(id));
  // For changedRules, we approximate by intersecting and letting caller verify
  // (true content diff would require deep comparison; for now we report
  // overlap + add/remove)
  const intersect = [...oldRuleIds].filter((id) => newRuleIds.has(id));
  const changedRules: string[] = intersect.filter((id) => {
    const oldRule = [oldCanon.colorRelationship, oldCanon.materialRelationship, oldCanon.compositionLogic,
      oldCanon.typographyBehavior, oldCanon.graphicBehavior, oldCanon.imageBehavior]
      .find((r) => r && r.id === id);
    const newRule = [newCanon.colorRelationship, newCanon.materialRelationship, newCanon.compositionLogic,
      newCanon.typographyBehavior, newCanon.graphicBehavior, newCanon.imageBehavior]
      .find((r) => r && r.id === id);
    if (!oldRule || !newRule) return false;
    return oldRule.statement !== newRule.statement
      || oldRule.invariantLevel !== newRule.invariantLevel;
  });

  const changedDNA = [...newDnaIds].filter((id) => !oldDnaIds.has(id))
    .concat([...oldDnaIds].filter((id) => !newDnaIds.has(id)));
  const changedGrammar = [...newGrammarIds].filter((id) => !oldGrammarIds.has(id))
    .concat([...oldGrammarIds].filter((id) => !newGrammarIds.has(id)));

  const directionChanged = oldCanon.selectedDirectionId !== newCanon.selectedDirectionId
    || oldCanon.selectionRevision !== newCanon.selectionRevision
    || oldCanon.directionFamily !== newCanon.directionFamily;

  return {
    changedDirection: directionChanged,
    addedRules,
    removedRules,
    changedRules,
    changedDNA,
    changedGrammar,
    invalidatedDownstreamArtifacts: directionChanged ? ['visual-canon', 'anchor-contract'] : [],
    requiresRecompile: directionChanged || addedRules.length > 0 || removedRules.length > 0,
  };
}

/**
 * Canon version: stable identifier derived from selection revision
 * and Direction fingerprint.
 */
export function canonVersion(canon: VisualCanon): string {
  return `v${canon.selectionRevision}-${canon.trace.directionFingerprint.slice(0, 16)}`;
}
