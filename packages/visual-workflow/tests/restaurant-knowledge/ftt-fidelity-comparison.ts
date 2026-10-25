import assert from 'node:assert/strict';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../../src/image-adapter/multi-model.js';
import {analysisDirectionSuggestion} from '../../src/analysis-direction-suggestion.js';
import {makeFidelityFixture,operations,sha256} from './ftt-fidelity-fixture.ts';

export const model='doubao-seedream-5-0-pro-260628';
export const scenes=[
  {subtype:'entrance',shot:'entrance_view',instruction:'Restaurant entrance and threshold; keep other program interiors off frame.'},
  {subtype:'storefront',shot:'front',instruction:'Restaurant storefront exterior only; keep kitchen and dining interiors off frame.'},
  {subtype:'dining',shot:'three_quarter_wide',instruction:'Restaurant dining interior; preserve ordering, cooking, handoff and dining relationships.'}
];
export const counters={realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0};
export function taskFor(packet: any,scene: any) {
  return {projectId:packet.projectId,taskId:'rks-02b-offline-fidelity',deliverableFamily:'space',subtype:scene.subtype,
    shot:scene.shot,shotSource:'user_explicit',generationBasis:'standard',aspectRatio:'16:9',count:1,
    currentInstruction:scene.instruction,referenceAssetIds:[],logoUsageMode:'post_composite'};
}
export function compile(packet: any,task: any) {
  return compileShortChainGeneration({projectContext:{visualDecisionPacket:packet},task,model,now:'2026-10-25T00:00:00.000Z'});
}
export function functionalPollution(packet: any) {
  // Positive operative fields only. Negative guards mentioning clinics are not clinical programs.
  const spatial=packet.mediaTranslations.spatial;
  const fields=['sceneProgram','functionalNetwork','functionalRelationships','mustBeVisible','peopleBehavior'];
  return fields.flatMap(field=>(spatial[field] || []).filter((value: string)=>
    /consultation|consulting|treatment|reception desk|hotel reception|hotel guest|咨询|诊疗|治疗|酒店接待/iu.test(value))
    .map((value: string)=>({path:`mediaTranslations.spatial.${field}`,value,status:'positive_functional_pollution'})));
}
export function auditCompiled(packet: any,result: any,subtype: string) {
  const prompt=result.compiledPrompt.finalPrompt;
  const trace=result.compiledPrompt.trace;
  const sceneScope=trace.decisionTrace.sceneScope;
  const authority=trace.spaceGeneration.targetSceneAuthority;
  const scopeResolved=!!authority?.targetScene && !!authority?.targetProgramId;
  const networkScopeConcerns=sceneScope.filter((row: any)=>subtype!=='dining' &&
    row.sourcePath==='mediaTranslations.spatial.functionalNetwork[0]' && row.sceneScope==='current_shot' && row.text.includes('就餐区'));
  const templateCues=[
    {id:'generic_reception_privacy',text:'practical reception, waiting, access and privacy requirements',meaning:'通用正向语境；不是餐饮功能节点来源'},
    {id:'optional_gallery',text:'gallery-like',meaning:'可选建筑气质可能使社区小馆同质化'},
    {id:'premium_rendering',text:'premium-grade',meaning:'通用高端措辞需由设计师审核其是否挤压亲民定位'}
  ].filter(cue=>prompt.includes(cue.text));
  const visible=trace.decisionTrace.visibleRequirements || [];
  return {subtype,sceneScope,authority,scopeResolved,compilerGate:'compiled_not_semantic_acceptance',
    positiveFunctionalPollution:functionalPollution(packet),templateCues,networkScopeConcerns,
    negativeClinicGuard:{present:prompt.includes('no generic AI clinic look'),polarity:'negative_guard_not_positive_program'},
    behaviors:operations.map(value=>({value,retained:prompt.includes(value),trace:visible.find((row: any)=>row.text===value) || null})),
    rawVisibleRequirements:visible,
    inheritedParameters:{status:'review_required',source:'historical_analysis_proposal_not_human_material_spec',
      lighting:packet.lightingSystem,materials:packet.materialSystem,structureLanguage:packet.mediaTranslations.spatial.structureLanguage},
    actualPropertyAndCustomers:'unknown',visualQuality:'not_evaluated_no_images',
    readyForRealGeneration:false,
    blockers:[...(!scopeResolved?['unresolved_scene_authority']:[]),...(networkScopeConcerns.length?['interior_network_rendered_in_exterior_or_threshold_scope']:[]),'unreviewed_material_and_lighting_parameters',
      'project_candidate_material_behavior_missing','designer_review_pending',...(templateCues.length?['generic_template_cues_require_review']:[])]};
}
export function compareFidelity() {
  const fixture=makeFidelityFixture();
  const before=JSON.stringify(fixture);
  // compileRequest only formats the Provider body; execute is never called.
  const adapter=createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:model,
    baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'});
  const provider=(prompt: string)=>adapter.compileRequest({prompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
  const rows=scenes.map(scene=>{
    const task=taskFor(fixture.A,scene);
    let raw: any;
    try {compile(fixture.historical,task);raw={status:'compiled'};}
    catch(error: any) {raw={status:'blocked',code:error.code || null,message:error.message};}
    const groups=Object.fromEntries(['A','B'].map(group=>{
      const packet=fixture[group as 'A'|'B'];
      const compiled=compile(packet,structuredClone(task));
      assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision,null);
      const prompt=compiled.compiledPrompt.finalPrompt;
      const body=provider(prompt);
      assert.equal('image' in body,false);
      return [group,{inputSha256:sha256(JSON.stringify(packet)),task:structuredClone(task),
        formalPrompt:prompt,providerBody:body,formalSha256:sha256(prompt),providerSha256:sha256(body.prompt),
        sourceMap:compiled.compiledPrompt.sourceMap,trace:compiled.compiledPrompt.trace,
        audit:auditCompiled(packet,compiled,scene.subtype)}];
    }));
    assert.deepEqual(groups.A.task,groups.B.task);
    assert.deepEqual({...groups.A.providerBody,prompt:null},{...groups.B.providerBody,prompt:null});
    return {scene,raw,task,controls:{model,adapter:'seedream-5.0-pro',generationBasis:'standard',aspectRatio:'16:9',imageSize:'2K',
      referenceImages:0,count:1,logoUsageMode:'post_composite'},...groups};
  });
  assert.equal(JSON.stringify(fixture),before);
  return {scope:'Full historical restaurant Packet derived offline comparison, not image1 actual Run or new image-quality acceptance',
    fixture,rows,b1Projection:{A:analysisDirectionSuggestion(fixture.A.projectId,fixture.A,sha256(JSON.stringify(fixture.A))),
      B:analysisDirectionSuggestion(fixture.B.projectId,fixture.B,sha256(JSON.stringify(fixture.B))),
      authority:'Pure projection only; no B1 writes or confirmation'},counters};
}
