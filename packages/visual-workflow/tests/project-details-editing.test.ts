import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {businessFixture} from './art-direction-business-fixture.ts';
import {createVisualWorkflow} from '../src/service.js';
import {createProjectDesignDirectionStore} from '../src/project-design-direction.js';

test('explicit details save persists identity, retains artifacts and requires new analysis/confirmation without calling models',async t=>{
  const f=await businessFixture(t,'Hospitality');
  const store=createProjectDesignDirectionStore(f.projects);
  const form=JSON.parse(await fs.readFile(new URL('./design-direction-form.json',import.meta.url),'utf8'));
  const draft=await store.saveDraft(f.project.id,{...form,expectedRecordSha256:null});
  const confirmed=await store.confirm(f.project.id,{confirmedByUser:true,expectedRecordSha256:draft.recordSha256});
  const direction=path.join(f.paths.root,'project-context/design-direction.json');const beforeDirection=await fs.readFile(direction);
  const packet=path.join(f.paths.root,'project-context/visual-decision-packet.json');const beforePacket=await fs.readFile(packet);
  const report=path.join(f.paths.outputs,'old-report.md');await fs.writeFile(report,'Historical report');
  const before=await f.projects.update(f.project.id,{lastReportFilename:'old-report.md'});
  const workflow=createVisualWorkflow({root:f.root,fetchImpl:()=>{throw new Error('NETWORK_FORBIDDEN');}});
  const updated=await workflow.operations['visual-workflow:update-project']({},f.project.id,{projectName:'Manual project name',industry:'Restaurant',expectedUpdatedAt:before.updatedAt,id:crypto.randomUUID(),assets:[]});
  assert.equal(updated.projectName,'Manual project name');assert.equal(updated.brandName,'Manual project name');assert.equal(updated.industry,'Restaurant');
  assert.equal(updated.id,f.project.id);assert.deepEqual(updated.assets,before.assets);assert.equal(updated.projectNameSource,'user_input');
  assert.equal(updated.status,'ready');assert.equal(updated.visualContextVNextStatus,'missing');
  assert.equal((await f.projects.get(f.project.id)).projectName,'Manual project name');
  assert.equal(await fs.readFile(report,'utf8'),'Historical report');assert.deepEqual(await fs.readFile(packet),beforePacket);
  const reopened=await store.get(f.project.id);assert.equal(reopened.status,'needs_reconfirmation');assert.equal(reopened.recordSha256,confirmed.recordSha256);assert.deepEqual(await fs.readFile(direction),beforeDirection);
  const unchanged=await f.projects.updateDetails(f.project.id,{projectName:updated.projectName,industry:updated.industry,expectedUpdatedAt:updated.updatedAt});assert.deepEqual(unchanged,updated);
  assert.equal(f.requests.length,0);assert.equal(f.validations.length,0);
});
test('details editing rejects invalid values, stale saves, another project and active analysis without changing stored data',async t=>{
  const f=await businessFixture(t);const before=await f.projects.get(f.project.id);const input={projectName:'New name',industry:'New industry',expectedUpdatedAt:before.updatedAt};
  for(const bad of [{projectName:''},{industry:' '},{projectName:'x'.repeat(201)},{projectName:[]},{expectedUpdatedAt:'stale'}])await assert.rejects(f.projects.updateDetails(f.project.id,{...input,...bad}));
  await assert.rejects(f.projects.updateDetails(crypto.randomUUID(),input));
  assert.deepEqual(await f.projects.get(f.project.id),before);
  const running=await f.projects.update(f.project.id,{status:'running'});
  await assert.rejects(f.projects.updateDetails(f.project.id,{...input,expectedUpdatedAt:running.updatedAt}),/分析期间/);
  assert.deepEqual(await f.projects.get(f.project.id),running);
});
