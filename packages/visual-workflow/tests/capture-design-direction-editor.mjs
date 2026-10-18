import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import WebSocket from 'ws';
import sharp from 'sharp';
import {createVisualWorkflow} from '../src/service.js';
import {digest} from '../src/art-direction-contract.js';
import {verifyImplementation} from '../src/integrity.js';
import {assertEditorSemanticFidelity} from './design-direction-editor-evidence.mjs';

const [source,outputArgument]=process.argv.slice(2);
const output=path.resolve(outputArgument);await fs.mkdir(output);
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=(name,value)=>fs.writeFile(path.join(output,name),JSON.stringify(value,null,2)+'\n');
const form=JSON.parse(await fs.readFile(new URL('./design-direction-form.json',import.meta.url),'utf8'));
const webRequests=[];
const nativeFetch=globalThis.fetch;
const images=[];const validations=[];
const responseBytes=await sharp({create:{width:320,height:180,channels:3,background:'white'}}).png().toBuffer();
const evidence={detectedFamily:'space',detectedSubtype:'reception',visibleEvidence:['Synthetic offline browser transport output; not visual acceptance'],missingRequiredItems:[],forbiddenItemsFound:[],lockedAssetViolations:[],brandMatch:'matched',brandToneMatch:'matched',sceneCompleteness:'complete',logoTextStatus:'absent',qualityIssues:[]};
globalThis.fetch=async (url,input)=>{
  const target=new URL(url);
  if(target.hostname==='image.example.invalid') {
    assert.equal(images.length,0);assert.equal(input.method,'POST');
    const body=JSON.parse(input.body);assert.equal('image' in body,false);images.push({url:String(url),method:input.method,body});
    return new Response(JSON.stringify({data:[{b64_json:responseBytes.toString('base64')}]}),{status:200});
  }
  if(target.hostname==='validator.example.invalid') {
    assert.equal(validations.length,0);validations.push({url:String(url),body:JSON.parse(input.body)});
    return new Response(JSON.stringify({id:'offline-browser-validation',model:'qwen3.6-plus',choices:[{message:{content:JSON.stringify(evidence)}}]}),{status:200});
  }
  if(target.hostname==='127.0.0.1'||target.hostname==='localhost')return nativeFetch(url,input);
  throw new Error('REAL_PROVIDER_NETWORK_FORBIDDEN');
};
async function inventory(root){const items=[];async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){assert(!item.isSymbolicLink());const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else items.push({path:path.relative(root,file),sha256:digest(await fs.readFile(file))});}}await walk(root);return items.sort((a,b)=>a.path.localeCompare(b.path));}
const original=await inventory(source);const project=await read(path.join(source,'project.json'));
const userData=path.join(output,'user-data');process.env.MASTERPIECE_USER_DATA_DIR=userData;
const workflowRoot=path.join(userData,'visual-workflow');const clone=path.join(workflowRoot,'data/projects',project.id);
await fs.mkdir(clone,{recursive:true});await fs.copyFile(path.join(source,'project.json'),path.join(clone,'project.json'));
for(const name of ['input','project-context'])await fs.cp(path.join(source,name),path.join(clone,name),{recursive:true,errorOnExist:true,force:false});
for(const name of ['outputs','runtime','prepared'])await fs.mkdir(path.join(clone,name),{recursive:true});
if(project.lastReportFilename)await fs.copyFile(path.join(source,'outputs',project.lastReportFilename),path.join(clone,'outputs',project.lastReportFilename));
const setup=createVisualWorkflow({root:workflowRoot});
await setup.operations['visual-workflow:save-profile']({}, {name:'Offline browser image',provider:'volcengine',protocol:'seedream-image',modelId:'doubao-seedream-5-0-pro-260628',modelType:'image_generation',baseUrl:'https://image.example.invalid/v3',apiKey:'OFFLINE_FIXTURE_ONLY'});
await setup.operations['visual-workflow:save-profile']({}, {name:'Offline browser validator',provider:'dashscope',protocol:'openai-chat-multimodal',modelId:'qwen3.6-plus',modelType:'analysis',baseUrl:'https://validator.example.invalid/v1',apiKey:'OFFLINE_FIXTURE_ONLY'});
// No confirmation JSON or design direction is injected here. The browser fills
// the real editor's natural-language controls and saves through its normal RPC.
const {startNodeRuntimeHost}=await import('../../../apps/web-runtime/src/node-runtime-host.ts');
// The existing application shell opens model settings on a completely empty
// install. Give only the isolated shell a separate, unusable fixture profile;
// the workflow must continue using its own two profiles, never this one.
const shellSettings=await import('../../../apps/web-runtime/src/node-settings-store.ts');
await shellSettings.saveApiProfile({displayName:'Unrelated shell fixture',provider:'dashscope',protocol:'openai-chat-multimodal',modelType:'analysis',modelId:'qwen3.6-plus',baseUrl:'https://unrelated.example.invalid/v1',apiKey:'OFFLINE_SHELL_ONLY'});
async function freePort(){return new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});}
const hostPort=await freePort(),webPort=await freePort(),debugPort=await freePort();
const origin=`http://127.0.0.1:${webPort}`;let host=await startNodeRuntimeHost({port:hostPort,host:'127.0.0.1',allowedOrigin:origin});
let renderer,chrome,cdp;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(action,label,timeout=30000){const end=Date.now()+timeout;let last;while(Date.now()<end){try{const value=await action();if(value)return value;}catch(error){last=error;}await delay(200);}throw new Error(`${label}: ${last?.message||'timeout'}`);}
async function connect(url){const socket=new WebSocket(url);await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject);});let index=0;const pending=new Map();socket.on('message',raw=>{const data=JSON.parse(raw);if(data.method==='Network.requestWillBeSent'&&data.params.request.method==='POST'&&data.params.request.url.includes('/_masterpiece/rpc/visual-workflow'))webRequests.push({url:data.params.request.url,body:JSON.parse(data.params.request.postData)});if(data.id&&pending.has(data.id)){const item=pending.get(data.id);pending.delete(data.id);data.error?item.reject(new Error(JSON.stringify(data.error))):item.resolve(data.result);}});return {call:(method,params={})=>new Promise((resolve,reject)=>{const id=++index;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));}),close:()=>socket.close()};}
async function evaluate(expression){const result=await cdp.call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
async function body(){return evaluate('document.body.innerText');}
async function click(text){await evaluate(`(()=>{const element=[...document.querySelectorAll('button,summary')].find(item=>item.textContent.trim()===${JSON.stringify(text)});if(!element||element.disabled)throw Error('Control unavailable: '+${JSON.stringify(text)});element.click();return true;})()`);}
async function screenshot(name){const result=await cdp.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await fs.writeFile(path.join(output,name),Buffer.from(result.data,'base64'));}
async function fill(selector,value){await evaluate(`(()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)throw Error('Missing control: '+${JSON.stringify(selector)});const prototype=element.tagName==='SELECT'?HTMLSelectElement.prototype:element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event(element.tagName==='SELECT'?'change':'input',{bubbles:true}));return true;})()`);}
const states=[];
function stop(child){if(child&&child.exitCode===null){spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});child.kill();}}
try {
  renderer=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','apps/web/vite.config.mjs','--host','127.0.0.1','--port',String(webPort)],{env:{...process.env,MASTERPIECE_WEB_RPC_URL:host.url},windowsHide:true,stdio:['ignore','pipe','pipe']});
  let rendererLog='';renderer.stdout.on('data',data=>rendererLog+=data);renderer.stderr.on('data',data=>rendererLog+=data);
  await until(async()=>{const response=await nativeFetch(origin);return response.ok;},'renderer');
  const page=`${origin}/#/visual-workflow?import=${project.id}`;
  chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-sandbox','--disable-gpu','--disable-extensions','--disable-background-networking','--disable-component-update','--disable-sync','--no-first-run','--no-default-browser-check','--no-pings',`--user-data-dir=${path.join(output,'chrome-data')}`,`--remote-debugging-port=${debugPort}`,'--window-size=1440,1200',page],{windowsHide:true,stdio:'ignore'});
  const target=await until(async()=>{const response=await nativeFetch(`http://127.0.0.1:${debugPort}/json/list`);return (await response.json()).find(item=>item.type==='page'&&item.url.startsWith(origin));},'browser target');
  cdp=await connect(target.webSocketDebuggerUrl);await cdp.call('Page.enable');await cdp.call('Network.enable');
  await until(async()=>{const text=await body();return text.includes('项目设计方向')&&text.includes('未设置，当前使用分析建议');},'empty project direction');
  states.push({stage:'opened_empty_editor',status:'missing'});
  await click('查看、编辑并确认设计方向');
  await fill('section[aria-label="项目设计方向"] label textarea',form.sourceStatement);
  for(const [key,value] of Object.entries(form.fields))if(typeof value==='string')await fill(`[data-design-field="${key}"]`,value);
  for(const [index,entry] of form.fields.colorEntries.entries()) {
    await click('添加颜色');for(const [key,value] of Object.entries(entry))await fill(`[data-design-color="${index}"] [data-color-field="${key}"]`,value);
  }
  for(const [index,entry] of form.fields.materialEntries.entries()) {
    await click('添加材料');for(const [key,value] of Object.entries(entry))await fill(`[data-design-material="${index}"] [data-material-field="${key}"]`,value);
  }
  // An ambiguous accent remains a draft and cannot be confirmed or sent.
  await fill('[data-design-color="2"] [data-color-field="spatialUsage"]','');
  await click('保存设计方向草稿');
  await until(async()=>(await body()).includes('请明确空间作用范围'),'ambiguous scope clarification');
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(item=>item.textContent.trim()==='确认设计方向生效').disabled`),true);
  assert.equal(images.length,0);assert.equal(validations.length,0);
  states.push({stage:'ambiguous_accent',status:'draft',modelDispatchBlocked:true});
  await fill('[data-design-color="2"] [data-color-field="spatialUsage"]',form.fields.colorEntries[2].spatialUsage);
  await click('保存设计方向草稿');
  await until(async()=>{const text=await body();return text.includes('草稿，尚未确认生效')&&!text.includes('以下关系尚待补充确认');},'semantics saved');
  await evaluate(`document.querySelector('section[aria-label="项目设计方向"] input[type="checkbox"]').click()`);
  await click('确认设计方向生效');
  await until(async()=>(await body()).includes('已确认，将用于标准空间生图'),'confirmation');
  states.push({stage:'confirmed_in_browser',status:'confirmed'});
  await click('4. 智能生图');
  await click('智能生成');
  await until(async()=>images.length===1&&validations.length===1&&(await body()).includes('校验通过'),'actual web business generation');
  const confirmed=await setup.operations['visual-workflow:report']({},project.id,'project_design_direction');
  await screenshot('confirmed-standard-generation.png');
  const compileRuns=await setup.operations['visual-workflow:runs']({},project.id);assert.equal(compileRuns.length,1);
  const runRoot=await setup.images.runRoot(compileRuns[0].runId);
  const snapshot=await read(path.join(runRoot,'source-context-snapshot.json'));
  const compilation=await read(path.join(clone,'image-generation-vnext/compilations',snapshot.taskContract.taskId,'compiled-prompt.json'));
  const formalPrompt=await fs.readFile(path.join(runRoot,'compiled-prompt.txt'),'utf8');
  const fidelity=assertEditorSemanticFidelity(form.fields,confirmed.confirmation,compilation.effectiveVisualDecisionPacket,formalPrompt,images[0].body);
  assert(compilation.sourceMap.composition.includes('mediaTranslations.spatial.compositionRequirements'));
  const imports=webRequests.filter(item=>decodeURIComponent(item.url).endsWith('visual-workflow:import-files'));
  assert(imports.length>=3);for(const item of imports)assert.equal(Object.hasOwn(item.body.args[1],'confirmation'),false);
  assert.equal(snapshot.taskContract.generationBasis,'standard');assert.deepEqual(snapshot.taskContract.referenceAssetIds,[]);
  const stamp=await read(path.join(runRoot,'workflow-implementation.json'));assert.deepEqual(stamp,await verifyImplementation());
  const metadata=await read(path.join(runRoot,'request-metadata.json'));assert.equal(metadata.referenceCount,0);assert.equal(metadata.aspectRatio,'16:9');
  assert.equal(metadata.designDirection.confirmationSha256,digest(confirmed.confirmation));
  await host.close();host=await startNodeRuntimeHost({port:hostPort,host:'127.0.0.1',allowedOrigin:origin});
  await cdp.call('Page.reload');
  await until(async()=>(await body()).includes('已确认，将用于标准空间生图'),'restarted host persisted confirmation');
  states.push({stage:'host_restart_and_browser_reload',status:'confirmed'});
  await click('查看、编辑并确认设计方向');
  await evaluate(`(()=>{const textarea=[...document.querySelectorAll('section[aria-label="项目设计方向"] label')].find(item=>item.textContent.includes('决策来源与确认依据')).querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(textarea,textarea.value+' / Browser draft edit');textarea.dispatchEvent(new Event('input',{bubbles:true}));return true;})()`);
  await until(async()=>(await body()).includes('有未保存修改'),'unsaved status');
  await click('保存设计方向草稿');
  await until(async()=>{const text=await body();return text.includes('草稿，尚未确认生效')&&!text.includes('有未保存修改');},'saved draft');
  await click('4. 智能生图');
  assert.equal(await evaluate(`[...document.querySelectorAll('button')].find(item=>item.textContent.trim()==='智能生成').disabled`),true);
  await screenshot('draft-blocks-standard-generation.png');
  await cdp.call('Page.reload');
  await until(async()=>(await body()).includes('草稿，尚未确认生效'),'draft persisted after reopening');
  states.push({stage:'edit_save_and_reopen',status:'draft',standardGenerationBlocked:true});
  assert.equal(images.length,1);assert.equal(validations.length,1);assert.deepEqual(await inventory(source),original);
  await write('provider-request.json',images[0]);await write('validator-request.json',validations[0]);
  await write('natural-language-input.json',form);await write('web-input-requests.json',imports);await write('field-fidelity.json',fidelity);
  await write('confirmed-direction.json',confirmed);await write('effective-packet.json',compilation.effectiveVisualDecisionPacket);await write('compiler-trace.json',compilation.trace);
  await fs.writeFile(path.join(output,'formal-prompt.txt'),formalPrompt);await fs.writeFile(path.join(output,'provider-prompt.txt'),images[0].body.prompt);
  await write('request-metadata.json',metadata);await write('public-operation-stamp.json',stamp);
  await write('browser-result.json',{status:'PASS',realProviderCalls:0,recordedMockImageRequests:images.length,recordedMockValidationRequests:validations.length,automaticRegenerations:0,
    actualNodeHost:true,actualReactRenderer:true,publicIntegrityVerified:true,naturalLanguageEnteredInBrowser:true,noConfirmationJsonInjected:true,fieldFidelityRows:fidelity.rows.length,
    imageReferenceFieldPresent:false,referenceImages:0,sourceProjectUnchanged:true,testCopy:clone,states,
    implementationDigest:stamp.implementationDigest,promptSha256:digest(images[0].body.prompt),runRoot,providerParameters:{model:images[0].body.model,size:images[0].body.size,fields:Object.keys(images[0].body)},humanQualityAcceptance:'pending'});
  await fs.writeFile(path.join(output,'renderer.log'),rendererLog);
  console.log(JSON.stringify({status:'PASS',realProviderCalls:0,referenceImages:0,publicIntegrityVerified:true,states}));
} catch(error) {
  await write('failure.json',{message:error.message,body:cdp?await body().catch(()=>null):null});
  if(cdp)await screenshot('failure.png').catch(()=>{});
  throw error;
} finally {cdp?.close();stop(chrome);stop(renderer);await host.close();}
