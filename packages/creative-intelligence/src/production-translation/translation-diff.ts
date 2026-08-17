/**
 * Translation Version + Diff.
 *
 * CI-9 Step 11: deterministic version + diff of MediaTranslationContract
 * based on canonVersion + selectionRevision + directionFingerprint.
 *
 * No model call. Pure set/string equality. Re-running with the same
 * inputs MUST produce the same diff.
 */

import type {
  MediaTranslationContract,
  ProductionTranslationDiff,
  TargetMedia,
} from './contracts.ts';

export function translationVersion(
  contract: MediaTranslationContract,
): string {
  return `${contract.canonVersion}#${contract.media}#0.1`;
}

/**
 * Compute the deterministic diff between two MediaTranslationContracts
 * of the same media. Returns semantic deltas — never recompiles
 * production.
 */
export function diffTranslation(
  previous: MediaTranslationContract,
  current: MediaTranslationContract,
): ProductionTranslationDiff {
  if (previous.media !== current.media) {
    throw new Error(`Cannot diff different media: ${previous.media} vs ${current.media}`);
  }

  const previousDNA = new Set(previous.requiredDNARefs);
  const currentDNA = new Set(current.requiredDNARefs);
  const previousGrammar = new Set(previous.requiredGrammarRefs);
  const currentGrammar = new Set(current.requiredGrammarRefs);
  const previousLocked = new Set(previous.lockedAssetRuleRefs);
  const currentLocked = new Set(current.lockedAssetRuleRefs);

  const addedRequirements: string[] = [];
  const removedRequirements: string[] = [];
  const changedRequirements: string[] = [];

  for (const dna of currentDNA) if (!previousDNA.has(dna)) addedRequirements.push(dna);
  for (const dna of previousDNA) if (!currentDNA.has(dna)) removedRequirements.push(dna);
  for (const g of currentGrammar) if (!previousGrammar.has(g)) addedRequirements.push(g);
  for (const g of previousGrammar) if (!currentGrammar.has(g)) removedRequirements.push(g);
  for (const l of currentLocked) if (!previousLocked.has(l)) addedRequirements.push(l);
  for (const l of previousLocked) if (!currentLocked.has(l)) removedRequirements.push(l);

  // mustPreserve/mayAdapt/mustNotIntroduce as text
  const prevPreserve = new Set(previous.mustPreserve);
  const currPreserve = new Set(current.mustPreserve);
  for (const p of current.mustPreserve) if (!prevPreserve.has(p)) changedRequirements.push(`mustPreserve:+${p}`);
  for (const p of previous.mustPreserve) if (!currPreserve.has(p)) changedRequirements.push(`mustPreserve:-${p}`);
  const prevAdapt = new Set(previous.mayAdapt);
  const currAdapt = new Set(current.mayAdapt);
  for (const a of current.mayAdapt) if (!prevAdapt.has(a)) changedRequirements.push(`mayAdapt:+${a}`);
  for (const a of previous.mayAdapt) if (!currAdapt.has(a)) changedRequirements.push(`mayAdapt:-${a}`);
  const prevMNI = new Set(previous.mustNotIntroduce);
  const currMNI = new Set(current.mustNotIntroduce);
  for (const n of current.mustNotIntroduce) if (!prevMNI.has(n)) changedRequirements.push(`mustNotIntroduce:+${n}`);
  for (const n of previous.mustNotIntroduce) if (!currMNI.has(n)) changedRequirements.push(`mustNotIntroduce:-${n}`);

  const missingHardDNARefs = [...currentDNA].filter((d) => !previousDNA.has(d));
  const missingHardGrammarRefs = [...currentGrammar].filter((g) => !previousGrammar.has(g));

  const canonVersionChanged = previous.canonVersion !== current.canonVersion;

  return {
    media: current.media,
    addedRequirements,
    removedRequirements,
    changedRequirements,
    missingHardDNARefs,
    missingHardGrammarRefs,
    canonVersionChanged,
    requiresRecompile: canonVersionChanged,
  };
}
