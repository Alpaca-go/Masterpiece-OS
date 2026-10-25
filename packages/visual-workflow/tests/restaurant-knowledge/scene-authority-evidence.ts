// Offline evidence only. Never writes user projects or calls a provider.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {compareFidelity} from './ftt-fidelity-comparison.ts';
import {sha256,readRepo} from './ftt-fidelity-fixture.ts';

const phase=process.argv[2];
assert.ok(['before','after'].includes(phase));
const directory=new URL('../../reports/scene-authority-repair/',import.meta.url);
const output=new URL(`${phase}.json`,directory);
assert.ok(!fs.existsSync(output),'Evidence snapshots must not be overwritten');
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
const historical=JSON.parse(readRepo('packages/visual-workflow/reports/restaurant-fidelity/compiled-evidence.json').toString('utf8'));
assert.equal(historical.rows.length,3);
const comparison=compareFidelity();
const rows=comparison.rows.map(row=>({scene:row.scene,task:row.task,controls:row.controls,
  groups:Object.fromEntries(['A','B'].map(group=>{
    const result=row[group as 'A'|'B'];
    return [group,{inputSha256:result.inputSha256,formalSha256:result.formalSha256,providerSha256:result.providerSha256,
      formalPrompt:result.formalPrompt,providerPrompt:result.providerBody.prompt,sourceMap:result.sourceMap,
      trace:result.trace,audit:result.audit}];
  }))}));
if(phase==='before') {
  const exterior=rows.find(row=>row.scene.subtype==='storefront')!.groups.B;
  assert.equal(exterior.audit.scopeResolved,false);
  assert.equal(exterior.audit.authority.shotSource,'legacy_project_default');
  assert.ok(exterior.audit.behaviors.every((entry:any)=>entry.retained && entry.trace.sceneProjection.sceneScope==='unresolved'));
  assert.equal(rows.find(row=>row.scene.subtype==='entrance')!.groups.B.audit.networkScopeConcerns.length,1);
}
assert.equal(networkAttempts,0);
fs.mkdirSync(directory,{recursive:true});
fs.writeFileSync(output,JSON.stringify({phase,baseline:'949a838d0fbdb70f27d600e6a93c4545f8751e12',
  historicalEvidenceSha256:sha256(JSON.stringify(historical)),counters:{...comparison.counters,networkAttempts,referenceImages:0},rows},null,2)+'\n');
console.log(`${phase}: ${rows.length} paired scenes; zero transport; evidence saved`);
