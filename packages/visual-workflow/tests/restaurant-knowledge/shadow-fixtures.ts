import fs from 'node:fs';
import crypto from 'node:crypto';
import {structuredAnalysisPacketFixture} from '../../../../tests/runtime-application/analysis-runtime-fixtures.ts';
const read = (name: string) => JSON.parse(fs.readFileSync(new URL(name,import.meta.url),'utf8'));
export const resources = {...read('../../offline/restaurant-knowledge/shadow-rules.json'),
  dictionary:read('../../offline/restaurant-knowledge/rks-tag-dictionary.json'),archetypes:read('../../offline/restaurant-knowledge/rks-archetypes.json'),
  knowledge:read('../../reports/restaurant-knowledge/rks-candidate-knowledge.json')};
export const originalCases = read('./cases.json');
export const priorProposal = read('../../reports/restaurant-knowledge/ftt-direction-proposal.json');
export const historicalPath = '../../../../space-generator/quality-baselines/current-verification/source-packets/_packets/feng-tang-tang/visual-decision-packet.json';
export const historicalBytes = fs.readFileSync(new URL(historicalPath,import.meta.url));
export const historicalPacket = JSON.parse(historicalBytes.toString('utf8'));
export const historicalSha256 = crypto.createHash('sha256').update(historicalBytes).digest('hex');

export function fttInput() {
  const projectId = 'feng-tang-tang';
  const tags = {cuisine_product:['四川小吃','跷脚牛肉'],business_format:['社区特色小馆'],location_context:['临街'],
    service_model:['堂食为主','兼顾外带'],brand_positioning:['亲民实惠','地方特色'],
    experiential_mood:['市井烟火'],cultural_context:['四川地域']};
  const directions = {
    spatialConcept:'四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民堂食、兼顾外带；四川地域特色与市井烟火气。',
    functionalRelationships:'厨房、顾客、餐桌与服务活动之间保持合理关系。'
  };
  const packet = structuredClone(historicalPacket);
  packet.projectId = projectId; // Explicit fixture-only alias; original stays immutable.
  return {projectId,analysisFingerprint:crypto.createHash('sha256').update(JSON.stringify(packet)).digest('hex'),documents:[
    {id:'goals',projectId,sourceType:'user_confirmed_design_goal',verification:'confirmed_by_user',
      evidenceRef:'user:RKS-02A.fixed-positioning',data:{tags,directions}},
    {id:'materials',projectId,sourceType:'rks_candidate',verification:'unverified',evidenceRef:'ftt-direction-proposal.fields.materials',
      knowledgeIds:['rks-observation-3'],data:{note:priorProposal.fields.materials}},
    {id:'operations',projectId,sourceType:'historical_human_acceptance',verification:'reviewed_historical',
      evidenceRef:'human_selection:golds[0].reason:offline-authored-observable-translation',knowledgeIds:['rks-observation-5'],
      data:{visible:['chef preparing food','steam above dishes','customers dining at tables'],
        relationships:['Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route']}}
  ],
    initialBindings:Object.entries(tags).flatMap(([dimension,values])=>values.map((_,index)=>({id:`goal:${dimension}:${index}`,documentId:'goals',path:['tags',dimension,index],dimension}))),
    directionBindings:Object.keys(directions).map(field=>({documentId:'goals',path:['directions',field],field})),
    knowledgeBindings:[{knowledgeId:'rks-observation-3',documentId:'materials',path:['note'],field:'materialLanguage'},
      {knowledgeId:'rks-observation-5',documentId:'operations',path:['visible'],field:'visibleRequirements'},
      {knowledgeId:'rks-observation-5',documentId:'operations',path:['relationships'],field:'functionalRelationships'}],
    packet,packetEvidenceRef:`historical_packet_fixture:${historicalSha256}`,analysisBindings:[
      {id:'analysis:upgrade',dimension:'business_format',path:['creativeDecision','uniqueUpgradeThesis'],reviewedMapping:{projectId,
        status:'reviewed_offline',expectedValue:historicalPacket.creativeDecision.uniqueUpgradeThesis,
        tag:'fast_casual_upgrade_proposal',evidenceRef:'offline-review:RKS02A.positioning-shift'}},
      {id:'analysis:spatial-concept',dimension:'visual_style',path:['mediaTranslations','spatial','spatialConcept']},
      {id:'analysis:dine-in',dimension:'service_model',path:['mediaTranslations','spatial','sceneProgram',2]},
      {id:'analysis:takeaway',dimension:'service_model',path:['mediaTranslations','spatial','sceneProgram',3]},
      {id:'analysis:relationships',dimension:'spatial_mechanism',path:['mediaTranslations','spatial','functionalRelationships',0]},
      {id:'analysis:brand-role',dimension:'brand_positioning',path:['projectFacts','brandRole','value']},
      {id:'analysis:value-position',dimension:'brand_positioning',path:['creativeDecision','targetWorldview',1],reviewedMapping:{projectId,
        status:'reviewed_offline',expectedValue:'实惠',tag:'approachable_value',evidenceRef:'offline-review:RKS02A.value-position'}},
      {id:'analysis:mood',dimension:'experiential_mood',path:['creativeDecision','toneBoundaries',0,'target']}
    ],
    fixtureProvenance:{kind:'historical_packet_copy_with_explicit_project_alias',originalProjectId:historicalPacket.projectId,
      actualImage1RunAssociation:'undetermined',goals:'Structured transcription of fixed user targets, not original property/customer facts',
      operationTranslation:'Offline authored observability hypotheses from the prior direction proposal/historical review; not user-confirmed project fields'}
  };
}

export function caseInput(fixture: any) {
  const projectId = fixture.projectId;
  const documents: any[] = [], initialBindings: any[] = [], analysisBindings: any[] = [];
  const packet: any = {projectId,annotations:{}};
  for (const value of fixture.claims) {
    if (value.sourceType === 'analysis_proposal') {
      packet.annotations[value.id] = value.tag;
      analysisBindings.push({id:value.id,dimension:value.dimension,path:['annotations',value.id]});
    } else {
      documents.push({id:value.id,projectId,sourceType:value.sourceType,
        verification:value.sourceType==='source_fact' ? 'verified_source' : 'confirmed_by_user',evidenceRef:value.evidenceRefs[0],data:{value:value.tag}});
      initialBindings.push({id:value.id,documentId:value.id,path:['value'],dimension:value.dimension});
    }
  }
  return {projectId,documents,initialBindings,analysisBindings,packet,packetEvidenceRef:`synthetic:${projectId}`,audit:fixture.audit || {},
    directionBindings:fixture.claims.filter((value: any)=>value.dimension==='visual_style' && value.sourceType==='user_confirmed_design_goal')
      .map((value: any)=>({documentId:value.id,path:['value'],field:'spatialConcept'})),knowledgeBindings:[]};
}

export function syntheticCompilePacket() {
  const packet = structuredAnalysisPacketFixture();
  packet.projectId = 'feng-tang-tang';
  packet.projectFacts.industry.value = 'Restaurant';
  packet.creativeDecision.uniqueUpgradeThesis = historicalPacket.creativeDecision.uniqueUpgradeThesis;
  packet.mediaTranslations.spatial.spatialConcept = historicalPacket.mediaTranslations.spatial.spatialConcept;
  packet.materialSystem = structuredClone(historicalPacket.materialSystem);
  packet.lightingSystem = structuredClone(historicalPacket.lightingSystem);
  packet.mediaTranslations.spatial.materialLanguage = structuredClone(historicalPacket.mediaTranslations.spatial.materialLanguage);
  packet.mediaTranslations.spatial.lightingLanguage = structuredClone(historicalPacket.mediaTranslations.spatial.lightingLanguage);
  return packet;
}
