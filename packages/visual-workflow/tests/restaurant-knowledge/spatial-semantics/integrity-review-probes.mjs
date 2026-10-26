// Read-only synthetic audit probes. No public analyze operation, project store,
// credential discovery, Provider, image generation or baseline refresh.
import './network-off.mjs';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL,fileURLToPath} from 'node:url';
import path from 'node:path';
import {classifyPhrase} from '../../../src/generation-runtime/space/semantic/separate-space-semantics.js';
import {validateSpatialSemantics,separateSpatialFunctionalSemantics} from '../../../src/generation-runtime/space/semantic/validate-spatial-semantics.js';
import {completeStructuredAnalysis} from '../../../src/analysis-decisions/analysis-completion-orchestrator.js';
import {structuredAnalysisPacketFixture} from '../../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const base='2302aa9fd39af0cee613e98f1e1a54cdd94b741e';
async function historical(relative,replacements={}) {
 const p='packages/visual-workflow/src/'+relative;
 let source=execFileSync('git',['show',base+':'+p],{cwd:root,encoding:'utf8'});
 source=source.replace(/from\s+(['"])(\.{1,2}\/[^'"]+)\1/gu,(_m,_q,r)=>'from '+JSON.stringify(replacements[r]||new URL(r,pathToFileURL(path.join(root,p))).href));
 return 'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
}
const beforeClassifierURL=await historical('generation-runtime/space/semantic/separate-space-semantics.js');
const beforeClassifier=await import(beforeClassifierURL);
const beforeGate=await import(await historical('generation-runtime/space/semantic/validate-spatial-semantics.js',{'./separate-space-semantics.js':beforeClassifierURL}));
const cases=[
 ['equipment conveying happiness','block'],['砂锅传递幸福感','block'],['设备自动治愈顾客','block'],
 ['在设备旁员工畅想未来','block'],['petal curved counter','block'],['lotus layered table','block'],['花瓣曲线桌','block'],
 ['Logo and equipment conveying happiness','block'],
 ['staff operating equipment and enjoying cosmic essence','block'],['员工操作设备并畅想未来','block'],
 ['员工没有使用设备','block'],['员工不会操作设备','block'],['员工尚未操作设备','block'],
 ['staff operating equipment','pass'],['Waiting area seating','pass'],['入口处的菜单','pass'],
 ['Logo吸引顾客点餐','block'],['staff not operating equipment','block'],['unresolved rendezvous','block']
];
const rows=cases.map(([text,expected])=>{
 const spatial={mustBeVisible:[text]};const split=separateSpatialFunctionalSemantics(spatial);
 const gate=validateSpatialSemantics(spatial),after=validateSpatialSemantics(split.spatial);
 return {text,expected,baselineClassification:beforeClassifier.classifyPhrase(text,'mustBeVisible'),baselineGate:beforeGate.validateSpatialSemantics(spatial).status,classification:classifyPhrase(text,'mustBeVisible'),gate:gate.status,afterSeparationGate:after.status,requirementMet:after.status===expected,split};
});
const packet=structuredAnalysisPacketFixture();packet.mediaTranslations.spatial.mustBeVisible=['Logo and equipment conveying happiness'];
const original=JSON.stringify(packet);let modelCalls=0;const events=[];
const completion=await completeStructuredAnalysis({packet,deliverable:'space',execution:{outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}},
 validateFinalPacket:p=>validateSpatialSemantics(p.mediaTranslations.spatial),
 repairFinalPacketDeterministically:({packet:p})=>{events.push('deterministic');const s=separateSpatialFunctionalSemantics(p.mediaTranslations.spatial),next=structuredClone(p);next.mediaTranslations.spatial=s.spatial;return {packet:next,changes:s.changes,unresolved:s.unresolved};},
 repairInvalidFinalPacket:async()=>{events.push('optional-semantic-model');modelCalls++;throw Error('MODEL_FORBIDDEN');},
 model:async()=>{events.push('structured-model');modelCalls++;throw Error('MODEL_FORBIDDEN');}});
const insufficientPacket=structuredAnalysisPacketFixture();
insufficientPacket.mediaTranslations.spatial.materialLanguage=[];
insufficientPacket.mediaTranslations.spatial.functionalNetwork=['顾客进入→品牌标识→点餐→离开'];
const insufficientEvents=[];
const insufficient=await completeStructuredAnalysis({packet:insufficientPacket,deliverable:'space',execution:{outputLanguage:'zh-CN',aspectRatio:'16:9',camera:{focalLength:'35mm'}},
 validateFinalPacket:p=>validateSpatialSemantics(p.mediaTranslations.spatial),
 repairFinalPacketDeterministically:({packet:p})=>{insufficientEvents.push('deterministic-semantic');return {packet:p};},
 repairInvalidFinalPacket:async()=>{insufficientEvents.push('optional-semantic-model');throw Error('MODEL_FORBIDDEN');},
 model:async()=>{insufficientEvents.push('structured-model-stub');throw Error('MODEL_FORBIDDEN');}});
const result={base,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),rows,
 unsafeCompletion:{status:completion.status,expected:'failed',requirementMet:!['ready','ready_with_warnings'].includes(completion.status),events,modelCalls,mustBeVisible:completion.packet.mediaTranslations.spatial.mustBeVisible,inputUnchanged:JSON.stringify(packet)===original},
 orderingScope:{status:insufficient.status,events:insufficientEvents,note:'Deterministic spatial separation precedes only optional spatial repair, not the earlier structured sufficiency-repair loop. These model callbacks only throw; no Provider.'},
 note:'Observed defects, not passing acceptance tests. Synthetic in-memory packet only; no real project status changed.'};
if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({cases:rows.length,requirementsFailed:rows.filter(r=>!r.requirementMet).length,unsafeCompletion:result.unsafeCompletion},null,2));
process.exitCode=rows.every(r=>r.requirementMet)&&result.unsafeCompletion.requirementMet?0:1;
