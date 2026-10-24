// Opt-in evidence writer for synthetic inputs only; no user store or transport.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../src/image-adapter/multi-model.js';

const prior = JSON.parse(fs.readFileSync(new URL('../reports/restaurant-knowledge/RKS-01E-field-lineage.json',import.meta.url),'utf8'));
const packet = structuredAnalysisPacketFixture();
packet.projectFacts.industry.value = 'Restaurant';
packet.mediaTranslations.spatial.spatialConcept = 'Warm neighborhood dining with visible cooking';
packet.mediaTranslations.spatial.mustBeVisible = prior.results[0].fields.map(field=>field.value);
const hash = value=>crypto.createHash('sha256').update(value).digest('hex');
const snapshot = JSON.stringify(packet);
assert.equal(hash(snapshot),prior.packetSha256);
const adapter = createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:'doubao-seedream-5-0-pro-260628',
  baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'});
const provider = prompt=>adapter.compileRequest({prompt,negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
const count = (prompt,text)=>prompt.split(text).length-1;
const fetchBefore = globalThis.fetch;
let networkAttempts = 0;
globalThis.fetch = async()=>{networkAttempts++;throw new Error('NETWORK_FORBIDDEN');};
try {
  const results = prior.results.map(old=>{
    const compiled = compileShortChainGeneration({projectContext:{visualDecisionPacket:packet},task:old.task,
      model:adapter.modelId || 'doubao-seedream-5-0-pro-260628',now:'2026-10-24T00:00:00.000Z'});
    const formal = compiled.compiledPrompt.finalPrompt;
    const bodyBefore = provider(old.finalPrompt), bodyAfter = provider(formal);
    const beforeControls = {...bodyBefore,prompt:null}, afterControls = {...bodyAfter,prompt:null};
    assert.deepEqual(afterControls,beforeControls);
    assert.equal('image' in bodyAfter,false);
    assert.ok(bodyAfter.prompt.endsWith(formal));
    const fields = compiled.compiledPrompt.trace.decisionTrace.visibleRequirements.map((entry,index)=>{
      const expected = old.task.subtype === 'dining' || index < 2;
      assert.equal(entry.finalPromptRetained,expected);
      assert.equal(count(formal,entry.text),expected ? 1 : 0);
      assert.equal(count(bodyAfter.prompt,entry.text),expected ? 1 : 0);
      return {...entry,before:old.fields[index],finalOccurrences:count(formal,entry.text),providerOccurrences:count(bodyAfter.prompt,entry.text)};
    });
    return {id:old.id,task:old.task,
      before:{formalPrompt:old.finalPrompt,formalSha256:hash(old.finalPrompt),providerPromptSha256:hash(bodyBefore.prompt),providerBodySha256:hash(JSON.stringify(bodyBefore))},
      after:{formalPrompt:formal,formalSha256:hash(formal),providerPromptSha256:hash(bodyAfter.prompt),providerBodySha256:hash(JSON.stringify(bodyAfter)),
        sourceMap:compiled.compiledPrompt.sourceMap,resolvedView:compiled.compiledPrompt.trace.spaceGeneration.targetSceneAuthority.viewStrategy},
      providerControls:afterControls,providerBodyKeys:Object.keys(bodyAfter),
      providerPrefix:bodyAfter.prompt.slice(0,bodyAfter.prompt.length-formal.length),fields};
  });
  assert.equal(JSON.stringify(packet),snapshot);
  assert.equal(networkAttempts,0);
  const evidence = {phase:'RKS-01F',baselineCommit:'d6fe1579d24e446fa90c3f8725f5be65822fc51a',
    scope:'Synthetic compilation and pure provider request builder only; not image1 attribution or visual acceptance',
    priorEvidence:'restaurant-knowledge/RKS-01E-field-lineage.json',packetSha256:hash(snapshot),
    counters:{realAnalysis:0,realGeneration:0,realValidation:0,automaticRetries:0,networkAttempts},
    providerPromptReconstruction:'providerPrefix + before/after.formalPrompt; request headers are never saved',results};
  fs.writeFileSync(new URL('../reports/visible-ownership-fix/field-evidence.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({cases:results.length,retained:results.map(row=>row.fields.filter(field=>field.finalPromptRetained).length),networkAttempts}));
} finally {globalThis.fetch=fetchBefore;}
