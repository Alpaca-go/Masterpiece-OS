// Pure offline assembly. No execute(), transport, user store or confirmation API.
import assert from 'node:assert/strict';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../../src/image-adapter/multi-model.js';
import {makeFinalDesignFixture,model} from './ftt-final-design-fixture.ts';
import {sha256} from './ftt-fidelity-fixture.ts';
export function compileFinalDesign() {
  const fixture=makeFinalDesignFixture(),before=JSON.stringify(fixture);
  const adapter=createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:model,baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'});
  const rows=fixture.variants.map(variant=>{
    const groups=Object.fromEntries(['A','B'].map(group=>{
      const packet=variant[group],compiled=compileShortChainGeneration({projectContext:{visualDecisionPacket:packet},
        task:structuredClone(variant.task),model,now:'2026-10-25T00:00:00.000Z'});
      const formalPrompt=compiled.compiledPrompt.finalPrompt;
      const provider=adapter.compileRequest({prompt:formalPrompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
      assert.equal('image' in provider,false);assert.equal(compiled.compiledPrompt.userConfirmedVisualDecision,null);
      return [group,{inputSha256:sha256(JSON.stringify(packet)),formalPrompt,formalSha256:sha256(formalPrompt),
        providerBody:provider,providerSha256:sha256(provider.prompt),task:compiled.taskContract,sourceMap:compiled.compiledPrompt.sourceMap,
        trace:compiled.compiledPrompt.trace,route:compiled.compiledPrompt.trace.spaceGeneration.routeIntegrity,
        preflight:compiled.compiledPrompt.preflightReport}];
    }));
    assert.deepEqual(groups.A.task,groups.B.task);
    assert.deepEqual({...groups.A.providerBody,prompt:null},{...groups.B.providerBody,prompt:null});
    const formal=groups.B.formalPrompt;
    const patches=[
      {id:'project-task-quality-wording',category:'quality_wording_optional_neutralization',
        before:'Generate a single premium-grade space image for',after:'Generate a single commercial architectural image for',
        reason:'仅建议中性化质量措辞，不把 premium 当作消费层级或已证明污染'},
      {id:'project-context-operations',category:'generic_positive_context_project_replacement',
        before:'Use project decisions and the current user instruction. Artistic focus may coexist with practical reception, waiting, access and privacy requirements; examples cannot replace either dimension.',
        after:variant.scene.subtype==='dining'?'Use this project’s warm, lively neighborhood eatery direction. Food preparation, service and dining remain readable within this authorized dining scene.':
          variant.scene.subtype==='entrance'?'Use this project’s approachable entrance direction. Preserve threshold access and the dining access boundary; other program interiors remain off frame.':
          'Use this project’s street-facing storefront direction. Preserve the facade and threshold; interior window visibility remains unapproved.',
        reason:'用项目与镜头职责替换通用接待/等候语境；不新增室内权限'},
      {id:'project-optional-gallery-cue',category:'optional_positive_style_risk',
        before:'Keep buildable junctions, readable circulation and human scale. Complex curves, restrained geometry, strong color and gallery-like character remain available when supported by project intent. No industry-wide aesthetic is imposed.',
        after:'Keep buildable junctions, readable circulation and human scale. Follow this project’s warm, lively, approachable Sichuan neighborhood eatery direction without importing a gallery, minimalist cafe or upscale dining style.',
        reason:'只在实验建议稿中移除未被本项目选择的可选风格先验；不改正式模板或其他项目'}
    ];
    let advisory=formal;
    for(const patch of patches) {
      assert.equal(advisory.split(patch.before).length-1,1,patch.id);
      advisory=advisory.replace(patch.before,patch.after);
    }
    assert.ok(advisory.includes('- High-end architectural visualization, photoreal, physically based materials.'));
    assert.ok(advisory.includes('no generic AI clinic look'));
    return {scene:variant.scene,controls:{generationBasis:'standard',model,adapter:'seedream-5.0-pro',imageSize:'2K',aspectRatio:'16:9',count:1,referenceImages:0,logoUsageMode:'post_composite'},
      ...groups,advisory:{status:'unapproved_experimental_text_proposal_not_official_compiler_output',text:advisory,sha256:sha256(advisory),patches,
        providerRequest:null,requiresSeparateReviewAndFormalRouteBeforeExecution:true}};
  });
  assert.equal(JSON.stringify(fixture),before);
  return {fixture,rows,counters:{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0,referenceInputs:0},
    scope:'RKS-02D offline designer-review material; not an actual Run, confirmed B1 record or knowledge promotion'};
}
