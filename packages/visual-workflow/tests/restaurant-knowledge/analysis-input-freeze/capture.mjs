import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createQwenReasoner} from '../../../src/model-runtime/qwen-reasoner.js';
import {freezeStage} from '../two-dispatch-guard/freeze.mjs';
import {digest,failure} from '../two-dispatch-guard/ledger.mjs';

// Independent second intercept of the ORIGINAL encoder proves the actual JPEG
// bytes, not a reimplementation of its resize/compress algorithm.
export async function captureStage(context,configuration,uploadRoot) {
  const pin=await freezeStage(context,configuration);
  let result;
  const reasoner=createQwenReasoner({...configuration,apiKey:'offline-capture-placeholder',client:async request=>{
    if(digest(JSON.stringify(request.body))!==pin.bodySha256) throw failure('ENCODER_NOT_REPRODUCIBLE');
    const uploads=[];
    const items=request.body.messages[1].content.filter(i=>i.type==='image_url');
    if(items.length!==pin.attachments.length) throw failure('ATTACHMENT_OMITTED');
    for(const [index,item] of items.entries()) {
      const prefix='data:image/jpeg;base64,';
      if(!item.image_url.url.startsWith(prefix)) throw failure('UPLOAD_ENCODING_CHANGED');
      const bytes=Buffer.from(item.image_url.url.slice(prefix.length),'base64');
      const sha256=digest(bytes);
      const meta=await sharp(bytes).metadata();
      if(uploadRoot) {
        await fs.mkdir(uploadRoot,{recursive:true});
        await fs.writeFile(path.join(uploadRoot,sha256+'.jpg'),bytes);
      }
      uploads.push({ordinal:index+1,assetId:pin.attachments[index].assetId,
        sourcePath:pin.attachments[index].path,sourceSha256:pin.attachments[index].sha256,
        uploadSha256:sha256,bytes:bytes.length,mimeType:'image/jpeg',width:meta.width,height:meta.height,
        localProofFile:uploadRoot?path.join(uploadRoot,sha256+'.jpg'):null,
        approximateVisualTokens:Math.ceil(meta.width/32)*Math.ceil(meta.height/32)+2});
    }
    const parameters=Object.fromEntries(Object.entries(request.body).filter(([key])=>key!=='messages'));
    result={...pin,encodedMessagesSha256:digest(request.body.messages),bodyBytes:Buffer.byteLength(JSON.stringify(request.body)),
      requestParameters:parameters,omittedParameters:['enable_thinking','max_tokens','thinking_budget','temperature','top_p','response_format','tools','enable_search'],
      messages:context.prompt.messages,uploads,
      encodedTextUtf8Bytes:request.body.messages.reduce((sum,m)=>sum+(typeof m.content==='string'?Buffer.byteLength(m.content):m.content.filter(i=>i.type==='text').reduce((n,i)=>n+Buffer.byteLength(i.text),0)),0),
      bodyProjection:{...request.body,messages:request.body.messages.map(m=>({...m,content:typeof m.content==='string'?m.content:m.content.map(i=>i.type==='image_url'?{type:'image_url',image_url:{url:'[JPEG bytes: see ordered uploads]'}}:i)}))}};
    throw failure('OFFLINE_CAPTURE_ONLY');
  }});
  await reasoner(context).catch(error=>{if(!result)throw error;});
  if(!result) throw failure('CAPTURE_MISSING');
  return result;
}
