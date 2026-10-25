// RKS-02B test-only experiment. No runtime entry point, transport or project writes.
import fs from 'node:fs';
import crypto from 'node:crypto';
export const sha256 = (bytes: any) => crypto.createHash('sha256').update(bytes).digest('hex');
export const readRepo = (relative: string) => fs.readFileSync(new URL('../../../../' + relative, import.meta.url));
export const sourcePaths = {
  packet:'space-generator/quality-baselines/current-verification/source-packets/_packets/feng-tang-tang/visual-decision-packet.json',
  selection:'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/golden-selection.json',
  evaluation:'space-generator/quality-baselines/current-verification/space-golden/feng-tang-tang/final-dining-1/evaluation.json',
  historicalPrompt:'space-generator/quality-baselines/current-verification/production-acceptance/feng-tang-tang/standard/compiled-prompt.md',
  proposal:'packages/visual-workflow/reports/restaurant-knowledge/ftt-direction-proposal.json',
  knowledge:'packages/visual-workflow/reports/restaurant-knowledge/rks-candidate-knowledge.json'
};
export const sources = Object.fromEntries(Object.entries(sourcePaths).map(([id,path]) => [id,{path,sha256:sha256(readRepo(path))}]));
const knowledge=JSON.parse(readRepo(sourcePaths.knowledge).toString('utf8'));
const selectProjectKnowledge=(id: string,use: string) => {
  const record=knowledge.find((row: any)=>row.knowledgeId===id);
  if (!record || record.scope!=='project' || !['candidate','project_observation'].includes(record.status) ||
      !record.sourceProjects.includes('feng-tang-tang')) throw new Error('FTT_PROJECT_KNOWLEDGE_SELECTION_INVALID');
  return {id,use,scope:record.scope,lifecycle:record.status,sourceProjects:record.sourceProjects,
    evidenceRefs:record.evidenceRefs,knowledgeStateChanged:false};
};
export function freeze(value: any): any {
  if (value && typeof value==='object') {Object.values(value).forEach(freeze);Object.freeze(value);} return value;
}
export const historicalBytes = fs.readFileSync(new URL('./ftt-historical-packet.json',import.meta.url));
export const historical = freeze(JSON.parse(historicalBytes.toString('utf8')));
export const goals = freeze({
  positioning:'四川特色小吃、跷脚牛肉；社区临街特色小馆，亲民实惠；堂食为主、兼顾外带。',
  mood:'四川地域特色、市井烟火气；温暖、亲切、日常的社区小馆。',
  relationships:'点餐、厨房制作、出餐、桌边就餐与服务活动保持合理联系；堂食为主，兼顾外带。',
  source:'user:RKS-02A.fixed-positioning+RKS-02B.confirmed-positioning',
  assertion:'design_goal_not_existing_property_or_customer_fact'
});
export const operations = freeze([
  'chef preparing food in kitchen',
  'steam above dishes in kitchen',
  'customers dining at tables'
]);
export const unknownFacts = freeze({
  propertyDimensions:'unknown',existingKitchenLocation:'unknown',customerDemographics:'unknown',
  actualDineInTakeawayRatio:'unknown',actualOpenKitchenPermission:'unknown',
  redBrickBehavior:'unknown',terracottaBehavior:'unknown',newWarmWoodBehavior:'unknown',
  actualImage1RunAssociation:'undetermined'
});
export function makeFidelityFixture() {
  const A=structuredClone(historical);
  const spatial=A.mediaTranslations.spatial;
  // Shared, exact-index intake adaptation. The raw Packet remains blocked evidence.
  const commonChanges=[{path:'mediaTranslations.spatial.mustBeVisible',before:structuredClone(spatial.mustBeVisible),
    after:[spatial.mustBeVisible[2]],reason:'Identity text belongs to post-composite checklist; raw hard visibility is rejected by the existing semantic gate',
    movedToPostComposite:[0,1,3].map(index=>({sourceIndex:index,value:spatial.mustBeVisible[index]}))}];
  spatial.mustBeVisible=structuredClone(commonChanges[0].after);
  const B=structuredClone(A);
  const deltas: any[]=[];
  const set=(path: string,value: any,evidence: string,reason: string) => {
    const parts=path.split('.');const key=parts.pop()!;
    let node=B;for(const part of parts) node=node[part];
    deltas.push({path,before:structuredClone(node[key]),after:structuredClone(value),evidence,reason,
      status:'unconfirmed_offline_direction_scenario'});node[key]=structuredClone(value);
  };
  set('projectFacts.brandRole',{value:goals.positioning,source:'offline_user_goal_projection',confidence:0,status:'proposed'},goals.source,
    'Override the analysis-proposed fast-food role in this experimental copy; no project fact is confirmed');
  set('creativeDecision.brandRoleStatement',goals.positioning,goals.source,'Keep the product and neighborhood positioning explicit');
  set('creativeDecision.uniqueUpgradeThesis',goals.positioning+' '+goals.mood,goals.source,'Review the historical modern-fast-food upgrade against the confirmed goal');
  set('creativeDecision.upgradeTo',['亲民堂食的社区四川特色小馆','清晰的产品与品牌识别','温暖、亲切、市井烟火的空间体验'],goals.source,'Direction only; no fixed architectural style');
  set('mediaTranslations.spatial.spatialConcept',goals.positioning+' '+goals.mood,goals.source,'Use the explicit user goal');
  set('mediaTranslations.spatial.functionalRelationships',[goals.relationships,
    'Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route'],
    'user:RKS-02B+knowledge:rks-observation-5+selection:golds[0].reason','Project-only observable relationship hypothesis, subject to property and shot review');
  set('mediaTranslations.spatial.mustBeVisible',operations,'knowledge:rks-observation-5+selection:golds[0].reason',
    'Explicit offline English observable translations; not lossless translations of the original single pot/steam field');
  set('mediaTranslations.spatial.brandRoleManifestation',['跷脚牛肉和四川小吃的产品识别','可读的制作、出餐与就餐关系','品牌色与亲切日常体验'],goals.source,
    'Do not mandate lanterns or an existing open kitchen as a property fact');
  set('mediaTranslations.spatial.brandIntegration',['品牌识别文字留待后期合成审核','菜品、服务与餐具包装保持项目品牌识别'],goals.source,
    'Remove mandatory lantern, poster and glass lettering proposals; identity uses post-composite mode');
  set('mediaTranslations.spatial.signatureSpatialMechanism',['点餐、厨房制作与出餐之间关系清晰','堂食与服务活动之间联系合理','外带与堂食的通行关系需结合物业审核'],goals.source,
    'No unconfirmed entrance-kitchen placement, circular counter or lighting array');
  set('mediaTranslations.spatial.structureLanguage',['开放式布局','木质格栅（半通透）'],
    'packet:mediaTranslations.spatial.structureLanguage','Retain inherited analysis proposals for review, remove lantern/pot geometry mandate');
  set('mediaTranslations.spatial.positiveDifferentiators',['跷脚牛肉、四川特色小吃的产品表达','温暖亲切的社区小馆体验','制作、出餐与堂食活动关系可读'],goals.source,
    'No cuisine-to-red-decor or fast-service-to-minimalism rule');
  set('materialSystem.1.brandRole','历史分析中的品牌红载体提案；具体载体待项目审核',
    'packet:materialSystem[1]+user:RKS-02B','Remove signage/lantern mandate; keep material names and physical behaviors unchanged');
  set('mediaTranslations.spatial.materialLanguage.1.brandRole',B.materialSystem[1].brandRole,
    'packet:materialSystem[1]+user:RKS-02B','Keep the duplicated analysis material proposal consistent');
  return {kind:'historical_restaurant_packet_derived_offline_AB',historical,A,B,commonChanges,deltas,goals,unknownFacts,
    identityChecklist:commonChanges[0].movedToPostComposite,
    selectedKnowledge:[selectProjectKnowledge('rks-observation-5','explicit project-only operating hypothesis'),
      selectProjectKnowledge('rks-observation-3','selected for independent review; material execution withheld')],
    factualAuthority:'No new user project facts, confirmation record or actual Run attribution',
    sourceSha256:sha256(historicalBytes)};
}
