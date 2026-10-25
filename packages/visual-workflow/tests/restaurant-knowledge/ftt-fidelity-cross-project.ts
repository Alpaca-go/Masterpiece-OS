import fs from 'node:fs';
import {runRestaurantShadowPipeline} from '../../offline/restaurant-knowledge/index.js';
const read=(path: string)=>JSON.parse(fs.readFileSync(new URL(path,import.meta.url),'utf8'));
const resources={...read('../../offline/restaurant-knowledge/shadow-rules.json'),
  dictionary:read('../../offline/restaurant-knowledge/rks-tag-dictionary.json'),archetypes:read('../../offline/restaurant-knowledge/rks-archetypes.json'),
  knowledge:read('../../reports/restaurant-knowledge/rks-candidate-knowledge.json')};
export const cases=read('./cases.json');
export const nonSichuanCase=structuredClone(cases[4]);
nonSichuanCase.projectId='non-sichuan-restaurant';
nonSichuanCase.label='非四川日本料理餐厅（菜系无字典映射时保持未知）';
for(const claim of nonSichuanCase.claims) {
  claim.projectId=nonSichuanCase.projectId;claim.appliesTo=[nonSichuanCase.projectId];
  claim.evidenceRefs=[`synthetic:${nonSichuanCase.projectId}:${claim.id}`];
  if(claim.dimension==='cuisine_product') claim.tag='日本料理';
}
export function runCase(fixture: any) {
  const projectId=fixture.projectId,documents: any[]=[],initialBindings: any[]=[],analysisBindings: any[]=[];
  const packet: any={projectId,annotations:{}};
  for(const claim of fixture.claims) {
    if(claim.sourceType==='analysis_proposal') {
      packet.annotations[claim.id]=claim.tag;
      analysisBindings.push({id:claim.id,dimension:claim.dimension,path:['annotations',claim.id]});
    } else {
      documents.push({id:claim.id,projectId,sourceType:claim.sourceType,
        verification:claim.sourceType==='source_fact'?'verified_source':'confirmed_by_user',evidenceRef:claim.evidenceRefs[0],data:{value:claim.tag}});
      initialBindings.push({id:claim.id,documentId:claim.id,path:['value'],dimension:claim.dimension});
    }
  }
  // Attempt explicit foreign adoption as well as ordinary classification: must be withheld.
  documents.push({id:'foreign-ftt',projectId,sourceType:'rks_candidate',verification:'unverified',
    evidenceRef:'foreign-adoption-negative-test',knowledgeIds:['rks-observation-3','rks-observation-5'],
    data:{materials:'红砖、暖木、赤陶',operations:'chef preparing food in kitchen'}});
  return runRestaurantShadowPipeline({projectId,documents,initialBindings,analysisBindings,packet,
    packetEvidenceRef:`synthetic:${projectId}`,audit:fixture.audit || {},
    directionBindings:fixture.claims.filter((claim: any)=>claim.dimension==='visual_style' && claim.sourceType==='user_confirmed_design_goal')
      .map((claim: any)=>({documentId:claim.id,path:['value'],field:'spatialConcept'})),
    knowledgeBindings:[{knowledgeId:'rks-observation-3',documentId:'foreign-ftt',path:['materials'],field:'materialLanguage'},
      {knowledgeId:'rks-observation-5',documentId:'foreign-ftt',path:['operations'],field:'visibleRequirements'}]},resources);
}
