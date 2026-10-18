import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { compileSpacePrompt } from '../src/generation-runtime/space/compiler.js';
import { compileShortChainGeneration } from '../src/generation-runtime/generation/compile.js';

// Local review tool only. Inputs are read-only; no provider or image adapter.
globalThis.fetch = async () => { throw new Error('OFFLINE_REVIEW_NETWORK_FORBIDDEN'); };
const [project, compilationEvidence, output, reviewInstruction] = process.argv.slice(2);
if (!project || !compilationEvidence || !output) throw new Error('Usage: capture-design-fidelity.mjs PROJECT COMPILATION_EVIDENCE OUTPUT');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
async function inventory(root) {
  const entries = [];
  async function walk(dir) {
    for (const item of await fs.readdir(dir, {withFileTypes:true})) {
      const target = path.join(dir,item.name);
      if (item.isSymbolicLink()) throw new Error('Review inputs must not contain symlinks');
      if (item.isDirectory()) await walk(target);
      else entries.push({path:path.relative(root,target), sha256:hash(await fs.readFile(target))});
    }
  }
  await walk(root);
  return entries.sort((a,b)=>a.path.localeCompare(b.path));
}
const before = await inventory(project);
const packetBytes = await fs.readFile(path.join(project,'project-context/visual-decision-packet.json'));
const contextBytes = await fs.readFile(path.join(project,'project-context/project-visual-context.vnext.json'));
const evidenceBytes = await fs.readFile(compilationEvidence);
const packet = JSON.parse(packetBytes);
const projectContext = JSON.parse(contextBytes);
const {taskContract} = JSON.parse(evidenceBytes);
// Optional review-only task copy. The historical task and Packet stay read-only.
if (reviewInstruction) taskContract.currentInstruction = reviewInstruction;
const input = {packet, projectContext, taskContract};
const inputSnapshot = JSON.stringify(input);
const compiled = compileSpacePrompt(input);
const routed = compileShortChainGeneration({projectContext, task:taskContract, model:'offline-review-model'});
assert.equal(routed.compiledPrompt.finalPrompt,compiled.finalPrompt);
assert.equal(JSON.stringify(input),inputSnapshot);
assert.deepEqual(await inventory(project),before);
await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'prompt.txt'),compiled.finalPrompt);
await fs.writeFile(path.join(output,'trace.json'),JSON.stringify({
  providerCalls:0, originalProjectUnchanged:true, inputMutation:false, officialRouteParity:true,
  packetSha256:hash(packetBytes), contextSha256:hash(contextBytes), taskEvidenceSha256:hash(evidenceBytes),
  promptSha256:hash(compiled.finalPrompt), promptCharacters:[...compiled.finalPrompt].length,
  inputPaths:{project,compilationEvidence}, sourceInventory:before,
  evidencePolicy:{packet:'Existing model analysis/proposal; readiness does not imply user confirmation',
    userConfirmed:'Art-exhibition character supplied in current review request; not injected into the historical Packet',
    materialFacts:'See original audit asset index; no image observations promoted to Packet facts',
    unknown:'Area allocation, installation dimensions/mounting and unprovided optical parameters remain unknown'},
  taskContract, trace:compiled.trace, layers:compiled.layers, blocks:compiled.blocks
  ,reviewInstruction:reviewInstruction ? {evidenceClass:'user_confirmed',text:reviewInstruction,scope:'in_memory_review_task_only'} : null
},null,2)+'\n');
console.log(JSON.stringify({promptSha256:hash(compiled.finalPrompt),promptCharacters:[...compiled.finalPrompt].length,providerCalls:0}));
