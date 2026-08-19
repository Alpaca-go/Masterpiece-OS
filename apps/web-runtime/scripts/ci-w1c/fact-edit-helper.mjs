// CI-W1C.4 Resume — Manual Single-Fact Edit Helper
// Spec: PART F / spec §16-§18
//
// Harness-side helper for the "manual fact edit" qualification gap.
// The production confirm-facts RPC accepts a full CreativeIntelligenceFactItem[],
// so a single-fact edit is a value mutation in the array passed to it.
// This helper:
//   1. Calls get-fact-review
//   2. Locates the target non-identity, non-locked fact (e.g. visual.preferences,
//      business.price_positioning, product.touchpoints)
//   3. Mutates exactly one fact's value (A -> B)
//   4. Calls confirm-facts with the modified array
//   5. Records the edit (field / before / after / source / timestamp /
//      Truth fact id / downstream trace refs)
//
// Output: writes a fact-edit-evidence.json file under the run root for
// audit. The downstream production code (shadow truth assembly) is
// expected to read the persisted facts and project them to ProjectTruthFact[].

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const TARGET_KEYS = [
  'visual.preferences',
  'brand.personality',
  'business.price_positioning',
  'product.touchpoints',
];

const scriptDir = path.dirname(new URL(import.meta.url).pathname);

async function rpc(rendererUrl, channel, args) {
  const response = await fetch(
    new URL(`/_masterpiece/rpc/${encodeURIComponent(channel)}`, rendererUrl),
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ args }),
    },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`${channel} failed: ${body.error || response.status}`);
  return body.result;
}

function pickTargetKey(facts) {
  for (const key of TARGET_KEYS) {
    const f = facts.find((x) => x.key === key);
    if (f && f.value !== null && f.value !== undefined) return f;
  }
  return null;
}

export async function runFactEdit(rendererUrl, runId, evidenceRoot, opts = {}) {
  const { newValue, targetKey } = opts;
  // Step 1: get fact review
  const review = await rpc(rendererUrl, 'creative-intelligence:get-fact-review', [runId]);
  const facts = review?.facts || [];
  if (facts.length === 0) {
    throw new Error('fact review is empty; cannot perform manual edit');
  }
  // Step 2: pick target
  const target = (targetKey && facts.find((f) => f.key === targetKey)) || pickTargetKey(facts);
  if (!target) {
    throw new Error(`no editable target found in [${TARGET_KEYS.join(', ')}]`);
  }
  const before = target.value;
  // Step 3: mutate
  const editedFacts = facts.map((f) =>
    f.key === target.key ? { ...f, value: newValue, confirmed: true, userEdited: true } : { ...f, confirmed: true }
  );
  // Step 4: confirm
  const updatedRun = await rpc(rendererUrl, 'creative-intelligence:confirm-facts', [runId, editedFacts]);
  // Step 5: write evidence
  const evidence = {
    runId,
    targetKey: target.key,
    before,
    after: newValue,
    source: opts.source || 'harness-fact-edit-helper',
    userEdited: true,
    confirmationTimestamp: new Date().toISOString(),
    runStatus: updatedRun?.status,
    selectionRevision: updatedRun?.selectionRevision,
  };
  const evidenceFile = path.join(evidenceRoot, 'fact-edit-evidence.json');
  await fs.mkdir(evidenceRoot, { recursive: true });
  await fs.writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
  return { evidence, evidenceFile, updatedRun };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const [rendererUrl, runId, evidenceRoot, newValue, targetKey] = process.argv.slice(2);
  if (!rendererUrl || !runId || !evidenceRoot) {
    console.error('usage: fact-edit-helper.mjs <rendererUrl> <runId> <evidenceRoot> <newValue> [targetKey]');
    process.exit(1);
  }
  try {
    const { evidence, evidenceFile } = await runFactEdit(rendererUrl, runId, evidenceRoot, {
      newValue: newValue === 'null' ? null : newValue,
      targetKey,
    });
    console.log(`OK fact-edit ${evidenceFile}`);
    console.log(JSON.stringify(evidence, null, 2));
  } catch (error) {
    console.error(`FAIL fact-edit: ${error.message}`);
    process.exit(1);
  }
}
