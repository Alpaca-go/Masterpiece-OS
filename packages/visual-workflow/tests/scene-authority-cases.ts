import {structuredAnalysisPacketFixture} from '../../../tests/runtime-application/analysis-runtime-fixtures.ts';
import {compileShortChainGeneration} from '../src/generation-runtime/generation/compile.js';
import {createMultiModelImageAdapter} from '../src/image-adapter/multi-model.js';

export const networkZh='点餐区 → 明档制作区 → 取餐区 → 就餐区';
export const networkEn='ordering area -> food preparation area -> pickup area -> dining area';
export const behaviors=['chef preparing food in kitchen','steam above dishes in kitchen','customers dining at tables'];
export function sceneInput(subtype='entrance',visible=behaviors,network=[networkZh,networkEn]) {
  const packet=structuredAnalysisPacketFixture();
  packet.projectFacts.brandName.value='Offline service project';
  packet.projectFacts.industry.value='Independent commercial service';
  const spatial=packet.mediaTranslations.spatial;
  spatial.sceneProgram=['入口到达','就餐区'];
  spatial.functionalNetwork=network;
  spatial.functionalRelationships=['入口连接就餐区的通道保持通畅'];
  spatial.peopleBehavior=[];
  spatial.brandRoleManifestation=[];
  spatial.mustBeVisible=visible;
  const task={projectId:packet.projectId,deliverableFamily:'space',subtype,
    shot:subtype==='storefront'?'front':subtype==='dining'?'three_quarter_wide':'entrance_view',shotSource:'user_explicit',
    generationBasis:'standard',referenceAssetIds:[],logoUsageMode:'post_composite',aspectRatio:'16:9',count:1,
    currentInstruction:'Show the selected scene using only its authorized activities.'};
  return {packet,task};
}
export function compileScene(input:ReturnType<typeof sceneInput>) {
  const compiled=compileShortChainGeneration({projectContext:{visualDecisionPacket:input.packet},task:input.task,
    model:'doubao-seedream-5-0-pro-260628',now:'2026-10-25T00:00:00.000Z'});
  const provider=createMultiModelImageAdapter({adapterId:'seedream-5.0-pro',modelId:compiled.payload.model,
    baseUrl:'https://example.invalid/v3',apiKey:'OFFLINE_PLACEHOLDER'}).compileRequest({prompt:compiled.compiledPrompt.finalPrompt,
    negativeRules:[],aspectRatio:'16:9',imageSize:'2K',outputCount:1,references:[]}).body;
  return {compiled,provider};
}
export const crossProjects=[
  {id:'takeaway',industry:'临街外带档口',local:'店员在门头室外打包商品',interior:'厨师在厨房制作食品'},
  {id:'fast-casual',industry:'现代连锁快餐',local:'staff handing food to customers at storefront',interior:'customers dining at tables'},
  {id:'coffee',industry:'社区咖啡馆',local:'店员在临街外侧递交饮品',interior:'顾客在就餐区用餐'},
  {id:'non-sichuan',industry:'日本料理餐厅',local:'staff serving customers at storefront',interior:'steam above dishes in kitchen'},
  {id:'retail',industry:'零售商店',local:'店员在门头室外递交商品',interior:'customers browsing merchandise in retail area'},
  {id:'hospitality',industry:'旅宿服务',local:'staff greeting visitors at storefront',interior:'guests checking in at reception'}
];
