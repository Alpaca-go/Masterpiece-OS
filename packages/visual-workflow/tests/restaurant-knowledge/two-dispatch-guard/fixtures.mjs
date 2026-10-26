import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import {createProjectStore} from '../../../src/project-store.js';
import {freezeStage,intakeDigest,UVU_SYSTEM} from './freeze.mjs';
import {digest} from './ledger.mjs';
export const configuration={provider:'dashscope',model:'qwen3.6-plus',protocol:'openai-chat-multimodal',
  baseUrl:'https://offline-test.cn-beijing.maas.aliyuncs.com/compatible-mode/v1',apiKey:'OFFLINE_NOT_A_CREDENTIAL'};
export const costBasis={currency:'CNY',reviewedAt:'2026-10-25',sourceUrl:'https://help.aliyun.com/zh/model-studio/qwen3-6-plus',
  meaning:'published list-price estimate, not invoice or absolute spend cap; output includes thinking',
  tiers:[{maxInputTokens:256000,inputPerMillion:2,outputPerMillion:12},{maxInputTokens:1000000,inputPerMillion:8,outputPerMillion:48}]};
export const reply=(content='offline response',patch={})=>({id:'fake-request-1',model:configuration.model,
  choices:[{finish_reason:'stop',message:{content}}],usage:{prompt_tokens:100,completion_tokens:200,total_tokens:300},...patch});
export const response=value=>new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});
export async function fixture(t) {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'two-dispatch-offline-'));
  t.after(async()=>{
    if(!path.resolve(root).startsWith(path.resolve(os.tmpdir())+path.sep)) throw new Error('CLEANUP_SCOPE');
    await fs.rm(root,{recursive:true,force:true});
  });
  const projects=createProjectStore(path.join(root,'data'));
  let project=await projects.create({projectName:'Offline test studio',industry:'Retail',description:'Synthetic test data only'});
  const bytes=await sharp({create:{width:64,height:64,channels:3,background:'#ddd'}}).png().toBuffer();
  project=await projects.importFiles(project.id,[{name:'sample.png',size:bytes.length,content:bytes.toString('base64')}]);
  const projectRoot=projects.projectRoot(project.id);
  const attachment={assetId:project.assets[0].id,path:path.join(projectRoot,'input',project.assets[0].relativePath),readable:true,mediaType:'image'};
  const dcd={projectRoot,config:{},inventory:{},maximumDurationMs:1000,
    prompt:{contractVersion:'5.0.0',messages:[{role:'system',content:'DCD offline test'},{role:'user',content:'Inspect the synthetic picture'}],attachments:[attachment]}};
  const uvu={maximumDurationMs:1000,prompt:{messages:[{role:'system',content:UVU_SYSTEM},{role:'user',content:JSON.stringify({projectId:project.id})}],attachments:[attachment]}};
  const policy={sessionId:crypto.randomUUID(),projectId:project.id,provider:configuration.provider,model:configuration.model,
    ledgerRoot:path.join(root,'call-budget'),
    protocol:configuration.protocol,url:configuration.baseUrl+'/chat/completions',maxDispatches:2,concurrency:1,retries:0,
    projectFile:path.join(projectRoot,'project.json'),intakeSha256:await intakeDigest(path.join(projectRoot,'project.json')),
    materials:[{path:attachment.path,sha256:digest(bytes)}],stages:[await freezeStage(dcd,configuration),await freezeStage(uvu,configuration)],costBasis};
  return {root,scopeRoot:path.join(root,'call-budget'),project,projects,projectRoot,attachment,dcd,uvu,policy};
}
