// RKS-02E0: explicit offline artifact writer. No dispatch, confirmation or model API.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../../src/image-adapter/multi-model.js';
import {createProjectStore} from '../../src/project-store.js';
import {createProjectDesignDirectionStore,designDirectionFields} from '../../src/project-design-direction.js';
import {verifyImplementation} from '../../src/integrity.js';

const baseline='3ed8c669dd7002fd3209cb7c51d788c0c041ea47';
const branch='codex/rks-ftt-first-image-preflight';
const model='doubao-seedream-5-0-pro-260628';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const dir=path.join(root,'packages/visual-workflow/reports/ftt-first-image-preflight');
const prior='packages/visual-workflow/reports/ftt-final-design/';
const hash=(value:any)=>crypto.createHash('sha256').update(value).digest('hex');
const read=(file:string)=>fs.readFile(path.join(root,file));
const load=async(file:string)=>JSON.parse((await read(file)).toString('utf8'));
const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:30*1024*1024}).trim();
assert.equal(git('rev-parse','HEAD'),baseline);
assert.equal(git('branch','--show-current'),branch);
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw new Error('OFFLINE_NETWORK_FORBIDDEN');};
const implementation=await verifyImplementation();
const oldInputs=await load(prior+'experimental-inputs.json');
const oldEvidence=(await load(prior+'compiled-evidence.json')).rows.find((row:any)=>row.scene.subtype==='dining');
const old=oldInputs.BByScene.dining;
assert.equal(hash(JSON.stringify(old.packet)),oldEvidence.B.inputSha256);
const packet=structuredClone(old.packet);
// Logical experiment identity only; never the real project store or an actual Run.
packet.projectId='e002e000-2026-4000-8000-000000000001';
const spatial=packet.mediaTranslations.spatial;
const proposal='RKS-02E0 待人工签署的项目设计方案；不是已验证物业事实';
const materials=[
  {material:'红砖（待签署视觉候选）',behavior:['红砖综合色调与质朴表面；无特殊光学效果要求，砖规格、砌法与工程参数未指定'],brandRole:'拟与暖色木质构件共同组织堂食和服务空间；具体分布待人工签署',forbidden:[]},
  {material:'暖色木质构件与木质桌椅（待签署视觉候选）',behavior:['温暖木色与可读的木质感；无特殊光学效果要求，木种、构件尺寸、涂层及光学参数未指定'],brandRole:'拟用于空间组织与人尺度家具，保持服务通行；具体部位待人工签署',forbidden:[]},
  {material:'赤陶色地面（待签署视觉候选）',behavior:['温暖赤陶综合色调；无特殊光学效果要求，地面制品类型、规格、釉面与工程参数未指定'],brandRole:'拟作为堂食地面色调，与浅色抹灰墙面共同建立质朴基调；不是现有地面事实',forbidden:[]},
  {material:'浅色抹灰墙面（待签署视觉候选）',behavior:['浅色质朴抹灰视觉；无特殊光学效果要求，配方、厚度、性能与光学参数未指定'],brandRole:'拟作为墙面背景以保持明亮和亲切；不是现有墙体事实',forbidden:[]}
];
packet.materialSystem=structuredClone(materials);spatial.materialLanguage=structuredClone(materials);
spatial.structureLanguage=['开放式布局','红砖与暖色木质构件共同组织空间；具体位置和构造待人工签署，不推定现有建筑条件'];
const light={source:[
  '温暖人工照明服务明档、菜品、餐桌及通行；不指定色温数值或灯具型号',
  '自然光结合为本轮待签署设计假设；当前没有已核实的采光来源，不指定开窗位置、形状、朝向或尺寸'
],contrast:'温暖、明亮可读，菜品和人物不过曝；不刻意昏暗或拥挤。',
  interactionWithMaterials:['呈现红砖、暖木、赤陶色地面及浅色抹灰墙面的综合色调；反射、透射、光泽等工程参数未指定'],
  forbidden:['昏暗压抑','以彩色霓虹替代基础照明','将假设自然光描述成已验证物业事实']};
packet.lightingSystem=structuredClone(light);spatial.lightingLanguage=structuredClone(light);
const color=(name:string,role:string,surfaceApplicability:string,spatialUsage:string)=>({name,role,surfaceApplicability,spatialUsage});
const colors={
  primary:[color(old.packet.colorSystem.primary[0].name,'品牌识别候选，原始标识及文字后期合成','可移动品牌载体的局部；具体载体待签署','local_accent')],
  secondary:[
    color(old.packet.colorSystem.secondary[0].name,'品牌信息的局部细节候选','品牌载体细节；文字及 Logo 后期合成','detail_trim'),
    color('暖木色','温暖亲切的材质色候选','拟用木质构件与桌椅','secondary_surface'),
    color('砖红色','质朴空间组织候选','拟用红砖的局部表面；具体分布待签署','secondary_surface'),
    color('赤陶色','温暖地面色候选','拟用堂食地面；不确认实际制品','secondary_surface'),
    color('浅抹灰色','明亮质朴的墙面背景候选','拟用抹灰墙面；不确认现有墙体','secondary_surface')
  ],accent:[],forbidden:structuredClone(old.packet.colorSystem.forbidden)
};
packet.colorSystem=structuredClone(colors);spatial.colorBehavior=structuredClone(colors);
// Keep operating network and the five authorized observable requirements unchanged.
assert.deepEqual(spatial.functionalNetwork,old.packet.mediaTranslations.spatial.functionalNetwork);
assert.deepEqual(spatial.mustBeVisible,old.packet.mediaTranslations.spatial.mustBeVisible);
const task={...structuredClone(old.task),projectId:packet.projectId,taskId:'rks-02e0-first-image-offline-candidate',
  currentInstruction:[
    '四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带；市井烟火、温暖、热闹、亲切。',
    proposal+'。红砖与暖色木质构件共同组织空间，赤陶色地面与浅色抹灰墙面形成温暖质朴的基调。',
    '温暖人工照明结合自然光；自然光仅为待签署方案假设，无已核实采光来源，不创造具体开窗位置或建筑尺寸。',
    '开放明档、厨师制作、食物热气、服务柜台、顾客和餐桌形成合理经营联系；保留现代厨房设备、清洁条件、高效服务动线与人尺度。',
    '亲切热闹且有生活气息，不刻意拥挤、昏暗或脏乱；不转向商场标准化快餐、现代极简咖啡馆、高端精致餐饮或画廊式整体视觉。',
    '只呈现 dining / three_quarter_wide 的授权经营活动；全店外带依赖不强制同框。品牌文字及 Logo 均 post_composite，参考图为零。',
    '所有新增材料应用部位和采光均待人工签署，不是 confirmed；不创造材料工程参数或未经证实的品牌文化。'
  ].join('\n'),
  mustAvoid:['标准化商场快餐的整体视觉','现代极简咖啡馆、高端精致餐饮或画廊式整体视觉','刻意拥挤、昏暗或脏乱','未经证实的精确建筑尺寸、开窗位置、材料工程参数或品牌文化']};
assert.equal(task.generationBasis,'standard');assert.equal(task.shotSource,'user_explicit');
assert.equal(task.subtype,'dining');assert.equal(task.shot,'three_quarter_wide');
assert.equal(task.aspectRatio,'16:9');assert.equal(task.count,1);assert.equal(task.logoUsageMode,'post_composite');
assert.deepEqual(task.referenceAssetIds,[]);
assert.deepEqual(packet.provenance,old.packet.provenance);
assert.ok(!packet.provenance?.userConfirmedFields?.length);

const compile=(p:any,t:any)=>compileShortChainGeneration({projectContext:{visualDecisionPacket:p},task:t,model,now:'2026-10-25T00:00:00.000Z'});
const oldCompiled=compile(old.packet,old.task);
assert.equal(hash(oldCompiled.compiledPrompt.finalPrompt),oldEvidence.B.formalSha256);
const inputBefore=JSON.stringify({packet,task});
const compiled=compile(packet,task),formal=compiled.compiledPrompt.finalPrompt;
assert.equal(JSON.stringify({packet,task}),inputBefore);
assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision,null);
assert.equal(compiled.taskContract.shotSource,'user_explicit');
assert.equal(compiled.compiledPrompt.trace.spaceGeneration.routeIntegrity.status,'pass');
assert.equal(compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority.gate,'pass');
assert.equal(compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority.viewStrategySource,'user_explicit');
assert.equal(compiled.compiledPrompt.trace.spaceGeneration.spatialSemanticReport.status,'pass');
assert.equal(compiled.compiledPrompt.preflightReport.status,'pass');
for(const phrase of spatial.mustBeVisible) assert.equal(formal.split(phrase).length-1,1,phrase);
for(const phrase of [task.currentInstruction,...materials.map(m=>m.material),...light.source]) assert.ok(formal.includes(phrase),phrase);
const adapter=createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:model,baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'});
const body=adapter.compileRequest({prompt:formal,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
assert.ok(body.prompt.endsWith(formal));assert.equal('image' in body,false);
const patches=(await load(prior+'template-advisory-patches.json')).scenes.find((s:any)=>s.scene==='dining').patches;
for(const patch of patches) assert.equal(formal.split(patch.before).length-1,1,patch.id);

// Exercise the real draft API in a disposable store, with no forged confirmation.
const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'rks-ftt-e0-'));
let draft:any;
try {
  const projects=createProjectStore(path.join(temporary,'data'));
  const project=await projects.create({projectName:'冯烫烫 RKS-02E0 离线草案验证',industry:'四川特色小吃 / 跷脚牛肉',description:proposal});
  const projectPaths=await projects.paths(project.id);
  await fs.writeFile(path.join(projectPaths.root,'project-context/visual-decision-packet.json'),JSON.stringify({...packet,projectId:project.id}));
  const fields=designDirectionFields({spatialTranslation:spatial,creativeDecision:packet.creativeDecision,reviewTask:{mustAvoid:task.mustAvoid}});
  const store=createProjectDesignDirectionStore(projects);
  const saved=await store.saveDraft(project.id,{fields,sourceStatement:proposal+'；项目级视觉候选，来自本轮用户任务与历史文本验收；没有新的人工确认、分析或模型运行。',expectedRecordSha256:null});
  assert.equal(saved.status,'draft');assert.equal(saved.confirmation,null);assert.equal(saved.confirmedAt,null);
  assert.deepEqual(saved.validationIssues,[]);
  await assert.rejects(store.capture(project.id),/PROJECT_DESIGN_DIRECTION_RECONFIRM_REQUIRED/);
  const persistedRecord=JSON.parse(await fs.readFile(path.join(projectPaths.root,'project-context/design-direction.json'),'utf8'));
  assert.equal(hash(JSON.stringify(persistedRecord)),saved.recordSha256);
  draft={...saved,persistedRecord,probeProjectRecord:project,executionCapture:'blocked: PROJECT_DESIGN_DIRECTION_RECONFIRM_REQUIRED',
    probeProjectId:project.id,probeOnly:true,canonicalCandidateProjectId:packet.projectId,
    fieldsSource:'Explicit proposed design fields supplied to saveDraft; not AI suggestions promoted to confirmation',
    noConfirmMethodCalled:true,projectStatus:project.status,realUserStoreAccessed:false};
} finally {
  const target=path.resolve(temporary),tempRoot=path.resolve(os.tmpdir());
  assert.equal(path.dirname(target),tempRoot);assert.ok(path.basename(target).startsWith('rks-ftt-e0-'));
  await fs.rm(target,{recursive:true,force:true});
}

const deltas:any[]=[];
function diff(before:any,after:any,prefix:string) {
  if(JSON.stringify(before)===JSON.stringify(after)) return;
  if(before && after && !Array.isArray(before) && !Array.isArray(after) && typeof before==='object' && typeof after==='object') {
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])) diff(before[key],after[key],`${prefix}.${key}`);
  } else deltas.push({path:prefix,before:before??null,after:after??null,
    kind:/projectId|taskId/.test(prefix)?'experiment_identity_only':'unsigned_project_design_proposal',humanConfirmed:false,
    source:'user:RKS-02E0.sections2-4; historical text acceptance supports warm wood/terracotta/kitchen light only'});
}
diff(old.packet,packet,'packet');diff(old.task,task,'task');
const sourceIndex=await load(prior+'source-index.json');
const sourcePaths=[...sourceIndex.sources.map((s:any)=>s.path),prior+'experimental-inputs.json',prior+'compiled-evidence.json',prior+'template-advisory-patches.json',prior+'source-index.json',
  'packages/visual-workflow/src/project-design-direction.js','packages/visual-workflow/src/generation-runtime/space/compiler.js','packages/visual-workflow/implementation-integrity.json'];
const sources=await Promise.all(sourcePaths.map(async(file:string)=>{const bytes=await read(file);assert.equal(hash(bytes),hash(execFileSync('git',['show',`${baseline}:${file}`],{cwd:root,maxBuffer:30*1024*1024})));return {path:file,sha256:hash(bytes),unchangedFromBaseline:true};}));
const protectedRoots=[...((await load(prior+'scope-and-readiness.json')).protectedRoots),prior,'packages/visual-workflow/tests/restaurant-knowledge/ftt-final-design-fixture.ts','packages/visual-workflow/src/project-design-direction.js'];
assert.equal(git('diff',baseline,'--',...protectedRoots),'');
assert.equal(networkAttempts,0);
await fs.mkdir(dir,{recursive:true});
const json=async(name:string,value:any)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2)+'\n');
const text=async(name:string,value:string)=>fs.writeFile(path.join(dir,name),value.trim()+'\n');
await json('candidate-input.json',{scope:'offline proposed Packet and task, NOT confirmed B1; NOT executable authorization',baseline,projectAssociation:{originalHistoricalProjectId:oldInputs.originalProjectId,logicalKnowledgeOwner:'feng-tang-tang',isolatedCandidateProjectId:packet.projectId,currentUserProjectAssociation:null,actualImage1RunAssociation:'undetermined'},proposalStatus:'awaiting_human_signature',packet,task});
await json('project-direction-draft.json',{...draft,temporaryStoreRemoved:true,canonicalTaskInstruction:task.currentInstruction,
  instructionBoundary:'saveDraft stores spatial fields; currentInstruction and mustAvoid remain task inputs. No draft-to-confirmed substitution was performed.'});
await json('exact-design-diff.json',{baseline,comparison:'RKS-02D original formal B dining to E0 candidate',deltas,unchanged:{operatingNetwork:true,fiveVisibleRequirements:true,userExplicitShot:true,modelAndControls:true,formalCompilerAndTemplates:true},
  originalB:{packetSha256:oldEvidence.B.inputSha256,formalSha256:oldEvidence.B.formalSha256,providerSha256:oldEvidence.B.providerSha256}});
// Prompt hashes are UTF-8 exact strings, with NO extra newline. They are evidence, not a protected baseline update.
await fs.writeFile(path.join(dir,'formal-prompt.txt'),formal);
await fs.writeFile(path.join(dir,'provider-prompt.txt'),body.prompt);
await json('provider-request-preview.json',{status:'pure_adapter_compile_preview_not_dispatched',body});
await json('unapplied-template-diff.json',{applied:false,officialCompilerOutput:false,protectedSource:'packages/visual-workflow/src/generation-runtime/space/compiler.js',
  protectedSourceSha256:sources.find(s=>s.path.endsWith('space/compiler.js'))?.sha256,approval:'Separate template change review and digest authorization would be required; none requested or applied in E0',patches});
await json('source-and-scope.json',{baseline,branch,sources,protectedRoots,protectedDiff:[],implementation,
  manifestSha256:hash(await read('packages/visual-workflow/implementation-integrity.json')),
  historicalAcceptance:sourceIndex.historicalAcceptance,knowledge:{mode:'offline_shadow_only',card3:'candidate/project',card5:'project_observation/project',validatedCasesUnchanged:true,actualImage1RunAssociation:'undetermined'},
  authority:{confirmedDesignGoal:'user:RKS-02D positioning preserved by RKS-02E0',unsignedDesignProposal:proposal,redBrickAndDaylight:'project design proposals, NOT verified facts',inheritedProvenance:'historical analysis only, NOT new analysis',newUserConfirmedFields:[],
    compilerProposalLabel:'The unchanged compiler labels unconfirmed colors as model_proposal / existing model proposals. E0 colors are author-entered unsigned proposals; this legacy fallback label is NOT evidence of a new model call.',
    draftSourceKind:'The existing saveDraft API emits user_design_decision for the source kind, including drafts. The authoritative status is draft and confirmation is null; that enum is NOT a human signature.'}});
const record={baseline,branch,scope:'single dining candidate input freeze, NOT production dispatch readiness',
  status:'等待人工签署与单独模型费用授权',formalCompileStatus:'official_compiler_output_from_offline_proposed_packet_and_legal_task_inputs',
  projectDirectionStatus:'draft; capture blocked; not confirmed; no B1 apply/confirm',
  controls:{modelDisplay:'Seedream 5.0 Pro',model,adapterId:'seedream-5.0-pro',generationBasis:'standard',scene:'dining',shot:'three_quarter_wide',shotSource:'user_explicit',aspectRatio:'16:9',imageSize:'2K',count:1,references:0,logoUsageMode:'post_composite'},
  authority:{sourceMap:compiled.compiledPrompt.sourceMap,trace:compiled.compiledPrompt.trace,preflight:compiled.compiledPrompt.preflightReport},
  hashes:{algorithm:'SHA256',jsonRule:'compact JSON.stringify for semantic input hashes; exact UTF-8 file bytes for files and prompt hashes',
    packet:hash(JSON.stringify(packet)),taskInput:hash(JSON.stringify(task)),taskContract:hash(JSON.stringify(compiled.taskContract)),
    effectivePacket:hash(JSON.stringify(compiled.compiledPrompt.effectiveVisualDecisionPacket)),formalPrompt:hash(formal),providerPrompt:hash(body.prompt),providerBody:hash(JSON.stringify(body)),
    inputFingerprint:hash(JSON.stringify({packet,task,model,imageSize:'2K',referenceInputs:0})),originalBFormal:oldEvidence.B.formalSha256,originalBProvider:oldEvidence.B.providerSha256},
  taskContract:compiled.taskContract,userConfirmedVisualDecision:compiled.compiledPrompt.userConfirmedVisualDecision,
  permission:{humanSignature:null,modelAuthorization:null,feeAuthorization:null,readyToInvoke:false,diningSceneReviewBlockers:[],businessBlockers:['unsigned project design direction','separate model and fee authorization absent','real isolated project binding and service recompile required after signature'],otherScenesDoNotBlockDining:true},
  execution:{realAnalysis:0,realGeneration:0,modelValidation:0,automaticRetries:0,referenceImageInputs:0,networkAttempts,providerExecuteCalls:0},
  limitations:['Direct official compiler output does not certify a confirmed B1/service execution path','Exact B* template replacements remain unapplied','No visual quality assessment performed','Future project binding or confirmation changes fingerprints: regenerate and review before dispatch']};
await json('freeze-record.json',record);
await text('README.md',`# 冯烫烫首张测试图：一页设计说明\n\n状态：**候选输入已离线冻结，等待人工签署与单独模型费用授权**。本轮真实分析、生图、模型校验、自动重试及参考图输入均为 0。\n\n目标是社区临街的四川特色小吃 / 跷脚牛肉小馆，亲民堂食为主、兼顾外带，市井烟火、温暖、热闹、亲切。允许现代厨房设备、清洁条件与高效服务动线。\n\n本轮待签署方案：红砖与暖色木质构件共同组织空间；赤陶色地面与浅色抹灰墙面建立温暖质朴基调；温暖人工照明结合**假设自然光**。这些材料部位和采光是设计候选，均不是已验证物业事实；没有指定建筑尺寸、开窗位置或工程光学参数。\n\n唯一候选为 dining / three_quarter_wide。开放明档、厨师制作、食物热气、服务柜台、顾客与木质餐桌椅形成可读的经营联系，保持人尺度与通行，不刻意拥挤、昏暗或脏乱。全店外带功能保留为依赖，不强制同框。品牌文字与 Logo 后期合成。\n\n固定 Seedream 5.0 Pro、standard、16:9、2K、1 张、0 参考图、post_composite。不向商场标准化快餐、极简咖啡馆、高端精致餐饮或画廊式整体视觉转向。\n\n正式状态：候选 Packet 与合法 task.currentInstruction / mustAvoid 已经过**现有正式 Compiler 的纯离线编译**，未经手工替换，Provider 文本由现有 Adapter 纯 compileRequest 生成，未发送。项目设计方向 API 仅保存隔离临时草案，capture 明确拒绝未确认状态。因此这不是已确认 B1 或可执行生图许可。\n\n- [与原 B 精确差异](exact-design-diff.md) / [逐字段原值与新值](exact-design-diff.json)\n- [正式候选 Prompt](formal-prompt.txt) / [Provider Prompt](provider-prompt.txt) / [请求预览](provider-request-preview.json)\n- [输入、权限与摘要](freeze-record.json) / [项目草案与拦截证据](project-direction-draft.json)\n- [来源与不变范围](source-and-scope.json) / [未应用建议](uncompiled-suggestions.md)\n- [人工审核与调用检查表](authorization-checklist.md)\n\n本次编译与门禁结果不证明视觉质量改善。历史图 1 实际 Run 关联继续为 undetermined，RKS 仍为离线 Shadow，知识卡状态不变。`);
const cell=(v:any)=>JSON.stringify(v).replaceAll('|',' / ').replaceAll('\n',' ');
await text('exact-design-diff.md',`# RKS-02D 原正式 B → RKS-02E0 候选\n\n原 B 重新编译的 SHA256 与 02D 记录逐字一致；对照不使用 B* 冒充原 B。完整字段差异见 JSON，所有新增设计均未签署。\n\n| 设计项 | 原 B | E0 候选 |\n| --- | --- | --- |\n| 材料与部位 | 暖色木、赤陶，部位未指定；无红砖核心要求 | 红砖与暖木组织空间；赤陶色地面、浅色抹灰墙面，部位待签署 |\n| 光照 | 厨房与菜品暖光；自然光不在核心 B | 温暖人工光 + 明确标注为假设的自然光，无开窗位置 |\n| 配色 | 红黑木白候选，无空间范围 | 品牌红黑局部载体与细节；暖木、砖红、赤陶、浅抹灰按拟用表面分工，无色值或比例授权 |\n| 经营与家具 | 五项可见要求及全店功能网络 | 完全保留；补充清洁、现代设备、人尺度及不过度拥挤的当前任务要求 |\n| 风格约束 | Packet 已有社区小馆定位；task 为通用英文要求 | 合法 task 输入明确定位、材料、假设、禁止错误整体风格与文化捏造 |\n| 编译模板 | 通用正式模板 | 完全不变，B* 的三处模板替换均未应用 |\n| 身份 | 历史 Packet 项目 ID / 02D task ID | 独立离线候选 ID / E0 task ID；不是用户项目 |\n\n| 路径 | 原值 | 候选值 |\n| --- | --- | --- |\n${deltas.map(d=>`| ${d.path} | ${cell(d.before)} | ${cell(d.after)} |`).join('\n')}\n\n原 B 正式 Prompt SHA256：${record.hashes.originalBFormal}。候选正式 Prompt SHA256：${record.hashes.formalPrompt}。这些摘要只用于本轮输入审计，不更新 Prompt 基线或质量验收。`);
await text('uncompiled-suggestions.md',`# 未应用的 B* 模板替换\n\n项目材料、照明、经营与风格限制已通过离线候选 Packet 及合法当前任务字段进入正式编译。下列精确文本替换**未进入正式编译**；它们需要修改受保护 space/compiler.js，不能靠人工改 Provider payload 实现。逐项原文、目标文与源码摘要见 [独立差异](unapplied-template-diff.json)。\n\n1. premium-grade → commercial architectural：中性化质量措辞；当前仍保留原正式句。\n2. reception / waiting / access / privacy 通用上下文 → 本项目制作、服务、堂食上下文：当前仍保留原句；当前任务另行限定本项目空间，未删除其他合理边界。\n3. 可选 gallery-like 等模板句 → 温暖四川社区小馆句：原正式句仍存在，但当前项目任务明确不采用画廊式整体视觉。无法保证模型会优先遵循哪处语境，需人工接受该剩余风险或另行审批模板修订。\n\nHigh-end architectural visualization / photoreal / physically based materials 属渲染质量语境，保留；no generic AI clinic look 为负向防污染规则，保留。\n\n本轮没有输出拼接后的新 B* 并声称其为 Compiler 结果，也没有为 B* 生成 Provider 请求。独立差异仅为今后审批材料。半通透格栅、射灯及反射数值、精确尺寸和开窗位置没有进入候选，原因是缺少项目确认与物业证据；不作为事实补齐。`);
await text('authorization-checklist.md',`# 人工审核与真实生图授权检查表\n\n当前全部未勾选；没有授权记录。审阅对象是 freeze-record.json 中的输入指纹和正式 / Provider Prompt 摘要。\n\n- [ ] 签署社区四川小馆定位与堂食镜头目标，理解无新的视觉质量验收。\n- [ ] 签署红砖、暖木、赤陶色地面与浅抹灰墙面的方案角色；确认它们不是现有物业事实。\n- [ ] 签署自然光为无已核实采光来源的设计假设；若不接受，先修订并重新冻结。\n- [ ] 审核五项经营可见要求、现代设备、清洁通行与人尺度；明档实施条件仍需物业与经营复核。\n- [ ] 审核品牌局部色彩分工、后期标识方案，以及原正式模板中残留的通用风格句风险。\n- [ ] 在真正隔离实验项目中导入 / 绑定来源并保存 draft；通过现有流程由用户亲自确认，不能伪造 confirmed 或沿用探针项目摘要。\n- [ ] 确认后由正式服务重新编译，核对有效 Packet、task、sourceMap、场景权限及 Provider Prompt；项目 ID / 确认状态变化会改变指纹，须重新记录并审阅。\n- [ ] 单独授权 Seedream 5.0 Pro 真实调用及费用：standard、dining / three_quarter_wide、16:9、2K、数量 1、参考图 0、Logo post_composite。当前授权与金额上限均为空。\n- [ ] 调用前核对独立配置与凭证归属、实现完整性、输入未变、无自动重试，并明确模型校验是否另行授权；不能从生图授权推导分析或校验授权。\n- [ ] 真实结果到达后单独人工评图、记录实际 Run 与费用；不按 Prompt 长度、关键词或测试通过率宣称质量改善。\n\n停止点：上述签署与费用授权尚不存在，本轮不执行模型，不创建实际 Run。dining 无需等待 storefront 隔窗权限；本轮也不处理其他镜头或三个未映射公开场景。`);
// Byte-level inventory for the candidate documents; freeze-record itself is covered here.
const artifactNames=(await fs.readdir(dir)).filter(n=>!['artifact-sha256.json','validation.json','validation.md','logs'].includes(n)).sort();
await json('artifact-sha256.json',{algorithm:'SHA256 exact file bytes',files:await Promise.all(artifactNames.map(async name=>({path:name,sha256:hash(await fs.readFile(path.join(dir,name)))})))});
console.log(JSON.stringify({status:record.status,formalSha256:record.hashes.formalPrompt,providerSha256:record.hashes.providerPrompt,
  draftStatus:draft.status,draftIssues:draft.validationIssues,networkAttempts,artifacts:artifactNames.length,implementation},null,2));
