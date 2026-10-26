import fs from 'node:fs/promises';
import path from 'node:path';
import {createQwenReasoner} from '../../../src/model-runtime/qwen-reasoner.js';
import {digest,failure} from './ledger.mjs';

export const UVU_SYSTEM='你是 Unified Visual Understanding 引擎。只基于 ProjectRecord 与原始视觉附件返回严格 JSON，不读取或复述分析报告。';
export function stageOf(context) {
  if(context.responseSchema || context.responseSchemaName || context.structuredOutputMode) throw failure('REPAIR_FORBIDDEN');
  if(context.config && context.inventory && context.projectRoot && context.prompt?.contractVersion==='5.0.0') return 'DCD';
  if(context.prompt?.messages?.[0]?.role==='system' && context.prompt.messages[0].content===UVU_SYSTEM) return 'UVU';
  throw failure('UNKNOWN_STAGE');
}
export async function attachmentRecords(context) {
  const rows=[];
  for(const a of context.prompt.attachments || []) {
    if(!a.readable || a.mediaType!=='image') throw failure('ATTACHMENT_UNREADABLE');
    const real=await fs.realpath(a.path);
    if(path.resolve(real)!==path.resolve(a.path) || (await fs.lstat(a.path)).isSymbolicLink()) throw failure('ATTACHMENT_SYMLINK');
    rows.push({assetId:a.assetId,path:real,sha256:digest(await fs.readFile(real))});
  }
  if(!rows.length) throw failure('ATTACHMENTS_MISSING');
  return rows;
}
export async function intakeDigest(projectFile) {
  const p=JSON.parse(await fs.readFile(projectFile,'utf8'));
  return digest(Object.fromEntries(['id','workflowOwner','projectName','brandName','industry','description','logoLocked','logoFiles','lockedFacts','outputLanguage','assets'].map(k=>[k,p[k]])));
}
export async function contextPin(context) {
  return {stage:stageOf(context),messagesSha256:digest(context.prompt.messages),attachments:await attachmentRecords(context)};
}
// Uses the unmodified provider's encoder with an intercept-only client. It throws
// before HTTP and never returns a fake model result, creates a Run or writes a project.
export async function freezeStage(context, configuration) {
  const pin=await contextPin(context);
  let captured;
  const reasoner=createQwenReasoner({model:configuration.model,baseUrl:configuration.baseUrl,
    apiKey:'offline-capture-placeholder',client:async request=>{
      captured={url:request.url,bodySha256:digest(JSON.stringify(request.body))};
      throw failure('OFFLINE_CAPTURE_ONLY');
    }});
  await reasoner(context).catch(error=>{if(!captured)throw error;});
  if(!captured) throw failure('CAPTURE_MISSING');
  return {...pin,...captured};
}
