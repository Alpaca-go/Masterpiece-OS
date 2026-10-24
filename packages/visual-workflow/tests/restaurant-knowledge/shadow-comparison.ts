// Synthetic comparison harness only. Never used by the shadow module or runtime.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {runRestaurantShadowPipeline} from '../../offline/restaurant-knowledge/index.js';
import {analysisDirectionSuggestion} from '../../src/analysis-direction-suggestion.js';
import {compileShortChainGeneration} from '../../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../../src/image-adapter/multi-model.js';
import {resources,fttInput,syntheticCompilePacket,historicalPacket,historicalSha256} from './shadow-fixtures.ts';
const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
const values = (value: string) => value.split('\n').filter(Boolean);
const occurrences = (prompt: string,value: string) => prompt.split(value).length-1;

export function compareShadowDirections() {
  const base=syntheticCompilePacket();
  const fingerprint=hash(JSON.stringify(base));
  const input=fttInput();input.packet=base;input.analysisFingerprint=fingerprint;
  input.packetEvidenceRef=`synthetic_common_packet:${fingerprint}`;
  const shadow=runRestaurantShadowPipeline(input,resources);
  const aB1=analysisDirectionSuggestion(base.projectId,base,fingerprint);
  assert.equal(shadow.b1Draft.analysisFingerprint,aB1.analysisFingerprint);
  const proposed=structuredClone(base);
  const original=JSON.stringify(base);
  proposed.mediaTranslations.spatial.spatialConcept=shadow.b1Draft.fields.spatialConcept;
  const goalRelationships=values(shadow.b1Draft.fields.functionalRelationships);
  const hypothesis=(field: string) => {
    const candidate=shadow.candidateSuggestions.find((item: any)=>item.field===field && item.knowledgeId==='rks-observation-5');
    assert(candidate);return candidate;
  };
  // Explicit offline scenario adoption, NOT pipeline auto-application, user
  // confirmation, or knowledge promotion. Material candidates stay unapplied.
  proposed.mediaTranslations.spatial.functionalRelationships=[...goalRelationships,...values(hypothesis('functionalRelationships').value)];
  proposed.mediaTranslations.spatial.mustBeVisible=values(hypothesis('visibleRequirements').value);
  const model='doubao-seedream-5-0-pro-260628';
  const adapter=createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:model,baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'});
  const provider=(prompt: string) => adapter.compileRequest({prompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
  const rows=[];
  for(const subtype of ['lobby','dining']) for(const explicitWide of [false,true]) {
    const task={projectId:base.projectId,taskId:'shadow-synthetic-compare',deliverableFamily:'space',subtype,
      shot:explicitWide ? 'three_quarter_wide' : 'entrance_view',...(explicitWide ? {shotSource:'user_explicit'} : {}),
      generationBasis:'standard',count:1,aspectRatio:'16:9',referenceAssetIds:[],logoUsageMode:'post_composite',
      currentInstruction:'Show the supplied project direction within the current scene boundary.'};
    const compile=(packet: any) => compileShortChainGeneration({projectContext:{visualDecisionPacket:packet},task,model,now:'2026-10-24T00:00:00.000Z'});
    const a=compile(base),b=compile(proposed);
    const providerA=provider(a.compiledPrompt.finalPrompt),providerB=provider(b.compiledPrompt.finalPrompt);
    assert.deepEqual({...providerA,prompt:null},{...providerB,prompt:null});
    assert.equal('image' in providerB,false);
    assert.equal(b.compiledPrompt.userConfirmedVisualDecision,null);
    const fields=proposed.mediaTranslations.spatial.mustBeVisible.map((value: string,index: number)=>{
      const expected=subtype==='dining' || index<2;
      assert.equal(b.compiledPrompt.finalPrompt.includes(value),expected);
      assert.equal(providerB.prompt.includes(value),expected);
      assert.equal(occurrences(b.compiledPrompt.finalPrompt,value),expected ? 1 : 0);
      return {value,source:'project-scoped historical observation, offline-authored visible hypothesis',
        aRetained:a.compiledPrompt.finalPrompt.includes(value),bRetained:expected,providerBRetained:providerB.prompt.includes(value),
        ownerAudit:b.compiledPrompt.trace.decisionTrace.visibleRequirements[index]};
    });
    assert.equal(b.compiledPrompt.finalPrompt.includes(shadow.b1Draft.fields.spatialConcept),true);
    rows.push({task,controls:{model,aspectRatio:'16:9',imageSize:'2K',referenceImages:0,confirmation:null},
      A:{formalPrompt:a.compiledPrompt.finalPrompt,promptSha256:hash(a.compiledPrompt.finalPrompt),providerSha256:hash(providerA.prompt),sourceMap:a.compiledPrompt.sourceMap},
      B:{formalPrompt:b.compiledPrompt.finalPrompt,promptSha256:hash(b.compiledPrompt.finalPrompt),providerSha256:hash(providerB.prompt),sourceMap:b.compiledPrompt.sourceMap},
      providerPrefix:providerB.prompt.slice(0,-b.compiledPrompt.finalPrompt.length),providerControls:{...providerB,prompt:null},fields,
      sceneScope:b.compiledPrompt.trace.decisionTrace.sceneScope,
      evaluation:{projectGoalInB:true,regionalIdentityFromUserGoal:true,cookingObservationConditional:true,
        materialsApplied:false,materialsReason:'Project candidates lack reviewed compiler-ready material behavior; existing analysis proposals retained in both controls',
        unverifiedPropertyOrCustomersAdded:false,visualQualityAccepted:false}});
  }
  assert.equal(JSON.stringify(base),original);
  assert.deepEqual(proposed.materialSystem,base.materialSystem);
  assert.deepEqual(proposed.lightingSystem,base.lightingSystem);
  return {scope:'Synthetic A/B using one common input; never image1 reconstruction or real-provider acceptance',
    sourceProvenance:{historicalSha256,commonPacketSha256:fingerprint,
      copiedFromHistorical:['creativeDecision.uniqueUpgradeThesis','mediaTranslations.spatial.spatialConcept','materialSystem','lightingSystem',
        'mediaTranslations.spatial.materialLanguage','mediaTranslations.spatial.lightingLanguage'],
      remainingFields:'Generic structured test fixture; original historical Packet is neither rewritten nor presented as this complete input'},
    historicalB1Projection:{scope:'Static projection of historical Packet only; not actual B1 state for image1',
      result:analysisDirectionSuggestion(historicalPacket.projectId,historicalPacket,historicalSha256)},
    A:{b1Draft:aB1},B:{b1Draft:shadow.b1Draft,scenarioAdoption:{kind:'explicit_unconfirmed_offline_hypothesis',knowledgeId:'rks-observation-5',
      fields:['visibleRequirements','functionalRelationships'],materialsAdopted:false}},rows,
    limitations:['Original analysis proposal remains in source for review; no Packet or confirmed direction rewritten',
      'Historical B1 already contains warm/open spatial intentions; only explicitly reviewed positioning shift is flagged',
      'Materials, scene visibility and all candidate hypotheses require future human review'],
    counters:{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0}};
}
