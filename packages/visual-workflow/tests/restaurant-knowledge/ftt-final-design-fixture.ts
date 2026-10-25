// RKS-02D author-selected experimental copies. Never imported by production.
import {makeFidelityFixture,operations,sha256} from './ftt-fidelity-fixture.ts';
export const baseline='0326f608e58b11bb687c26d13bb6e412e2cc71bd';
export const model='doubao-seedream-5-0-pro-260628';
export const userDirection={
  positioning:'四川特色小吃 / 跷脚牛肉；社区临街特色小馆；亲民堂食为主，兼顾外带。',
  mood:'市井烟火、温暖、热闹、亲切；明确的品牌特色和真实餐饮经营活动。',
  service:'允许合理的现代设备、高效服务动线和商业卫生要求。',
  wrongDirections:'不重新解释为标准化商场快餐、现代极简咖啡馆或高端精致餐饮。',
  source:'user:RKS-02D.sections1,3,5',authority:'confirmed_design_goal_not_verified_property'
};
export const serviceVisible='service counter with an accessible staff side and customer handoff side in dining area';
export const furnitureVisible='wooden dining table and chairs with accessible service aisle on both sides in dining area';
export const windowGoal='chef preparing food in kitchen visible through storefront glazing';
export const entranceActivity='staff serving customers at entrance';
export const storefrontActivity='staff serving customers at storefront';
export const scenes=[
  {subtype:'dining',shot:'three_quarter_wide',instruction:'Restaurant dining interior; inspect preparation, food, service and dining relationships within the authorized scene. Brand lettering and Logo are post-composited.'},
  {subtype:'entrance',shot:'entrance_view',instruction:'Restaurant entrance and threshold; show the authorized arrival area and access route. Keep other program interiors off frame. Brand lettering and Logo are post-composited.'},
  {subtype:'storefront',shot:'front',instruction:'Restaurant storefront exterior and street-to-threshold relationship only. Keep kitchen and dining interiors off frame pending window-visibility review. Brand lettering and Logo are post-composited.'}
];
export function taskFor(packet:any,scene:any) {
  return {projectId:packet.projectId,taskId:'rks-02d-offline-design-review',deliverableFamily:'space',subtype:scene.subtype,
    shot:scene.shot,shotSource:'user_explicit',generationBasis:'standard',aspectRatio:'16:9',count:1,
    currentInstruction:scene.instruction,referenceAssetIds:[],logoUsageMode:'post_composite'};
}
export function makeFinalDesignFixture() {
  const historical=makeFidelityFixture(),A=structuredClone(historical.A),B=structuredClone(A),deltas:any[]=[];
  const set=(packet:any,path:string,value:any,category:string,evidenceRefs:string[],reason:string,scene='common')=>{
    const parts=path.split('.'),key=parts.pop()!;let node=packet;for(const part of parts) node=node[part];
    deltas.push({scene,path,before:structuredClone(node[key]),after:structuredClone(value),category,evidenceRefs,reason,
      status:category==='A'?'user_design_goal_in_experimental_copy':'proposed_for_human_review_not_confirmed'});
    node[key]=structuredClone(value);
  };
  const goal=[userDirection.source],human=['human_selection:golds[0].reason','human_evaluation:dimensions.materialAndLighting.note'];
  set(B,'projectFacts.brandRole',{value:userDirection.positioning,source:'offline_user_design_goal',status:'proposed',confidence:0},'A',goal,
    '目标覆盖冲突分析提案；不伪造当前物业事实或新的人工确认记录');
  set(B,'creativeDecision.brandRoleStatement',userDirection.positioning+' '+userDirection.mood,'A',goal,'明确本项目目标');
  set(B,'creativeDecision.uniqueUpgradeThesis',userDirection.positioning+' '+userDirection.mood+' '+userDirection.service,'A',goal,'替换现代快餐升级方向，保留效率与卫生');
  set(B,'creativeDecision.upgradeTo',['亲民日常的社区四川小馆','真实制作、服务与就餐关系','清晰品类与品牌识别，文字后期合成'],'A',goal,'不把现代设备推导为极简或商场快餐风格');
  set(B,'creativeDecision.targetWorldview',['地道','亲民','市井烟火','温暖','热闹','亲切'],'A',goal,'用户方向而非人口画像');
  set(B,'creativeDecision.strategicNegatives',['不增加未经证实的非遗或老字号背书','不以标准化商场快餐、极简咖啡馆或高端精致餐饮替代本项目定位','不以昏暗压抑或静态样板间取代真实餐饮经营氛围'],'A',goal,'负向边界仅适用于本项目');
  set(B,'mediaTranslations.spatial.spatialConcept',userDirection.positioning+' '+userDirection.mood,'A',goal,'空间方向不宣称已验证物业');
  set(B,'mediaTranslations.spatial.brandRoleManifestation',['跷脚牛肉与四川小吃的菜品特征','亲切热闹的社区用餐体验','制作、出餐和日常餐具的品牌联系'],'D',goal.concat(human),'项目表达方案；不强制灯笼、脸谱或现场品牌文字');
  set(B,'mediaTranslations.spatial.brandIntegration',['品牌文字和原始标识留待后期合成','菜品、日常餐具与包装的项目识别方向待人工审核'],'D',goal,'保留品牌职责，不制造任何已授权贴字或新的文化背书');
  set(B,'mediaTranslations.spatial.signatureSpatialMechanism',['开放明档与餐桌区域形成可读的制作、服务和就餐关系','服务通行路径清晰可进入，具体布局待物业复核'],'D',human.concat(goal),'历史经营关系的方案化表达；不预设入口厨房、环绕台或格栅构造');
  set(B,'mediaTranslations.spatial.structureLanguage',['开放式布局'],'D',human,'保留明档开放的设计方向，不确认现有开放厨房许可');
  set(B,'mediaTranslations.spatial.functionalNetwork',[A.mediaTranslations.spatial.functionalNetwork[0],'全店外带包装功能依赖；位置与设置方式待确认'],'D',
    ['historical_packet:mediaTranslations.spatial.functionalNetwork',...goal],'保留全店经营链；独立包装区位置从历史提案降为待确认，不强迫同框');
  set(B,'mediaTranslations.spatial.functionalRelationships',['Kitchen preparation connects to service counter; dining tables remain accessible; takeaway handoff keeps a clear route'],'D',
    ['knowledge:rks-observation-5','human_selection:golds[0].reason'],'既有离线经营观察的明确方案假设，不是测量的厨房位置');
  set(B,'mediaTranslations.spatial.peopleBehavior',[],'D',human,'经营活动只由 mustBeVisible 一处输入，避免重复要求');
  set(B,'mediaTranslations.spatial.mustBeVisible',[...operations,serviceVisible,furnitureVisible],'D',human.concat(goal),'为堂食镜头选择可观察要求；木制桌椅及具体同框关系仍待人审');
  set(B,'mediaTranslations.spatial.positiveDifferentiators',['四川特色小吃与跷脚牛肉的品类识别','温暖热闹亲切的社区经营氛围','现代设备和清晰服务动线兼容亲民堂食'],'A',goal,'不将效率或地域转成行业固定审美');
  const colors=structuredClone(A.colorSystem);
  colors.primary[0].role='品牌识别候选色；表面和面积未指定';
  colors.secondary[0].role='品牌信息候选色；不预设室内表面范围';
  colors.accent[0].role='暖色木的材质色候选；表面和面积均未指定';
  colors.accent[1].role='清洁明亮的辅助色候选；范围待审核';
  colors.forbidden=['以整体冷淡空间替代已确认的温暖亲切氛围'];
  set(B,'colorSystem',colors,'D',['historical_packet:colorSystem',...goal],'保留历史识别色名称作提案，撤去面积暗示及未经本轮确认的蓝绿整体禁令；不新增色值或比例');
  set(B,'mediaTranslations.spatial.colorBehavior',colors,'D',['historical_packet:colorSystem',...goal],'实验副本同义配色字段一致；不授予 user_confirmed 空间面积权限');
  const materials=[
    {material:'暖色木（项目视觉方向）',behavior:['呈现暖色木的综合色调；木种、纹理尺度、涂层与光学参数均未指定'],
      brandRole:'项目温暖亲切的材质方向，具体适用表面待设计师确认',forbidden:[]},
    {material:'赤陶（项目视觉方向）',behavior:['呈现暖赤陶的综合色调；制品形态、釉面与光学参数均未指定'],
      brandRole:'本项目历史视觉经验；不意味着墙地整铺或任何构造已确认',forbidden:[]}
  ];
  set(B,'materialSystem',materials,'B',human,'采用验收记载的材质色感，不推定精确工艺；暂不将红砖候选写入核心材料');
  set(B,'mediaTranslations.spatial.materialLanguage',materials,'B',human,'实验副本中的同义材料字段保持一致；不更改生产材料系统');
  const light={source:['温暖的厨房与菜品照明；不指定色温值或灯具型号'],contrast:'整体明亮可读且温暖，菜品与人物不过曝。',
    interactionWithMaterials:['照明呈现暖色木与赤陶的综合色调；反射、透射和光泽参数未指定'],forbidden:['昏暗压抑','以彩色霓虹替代基础照明']};
  set(B,'lightingSystem',light,'B',human,'保留厨房暖光经验，移除未验收的具体色温、射灯与反射要求');
  set(B,'mediaTranslations.spatial.lightingLanguage',light,'B',human,'实验副本同义光照字段一致；自然光结合作为单独待确认选项');
  // Brand palette names remain proposals; neither rank nor a historical source
  // label confers an area ratio or a new user-confirmed surface scope.
  const variants=scenes.map(scene=>{
    const packet=structuredClone(B);
    if(scene.subtype==='entrance') {
      set(packet,'mediaTranslations.spatial.sceneProgram',['入口到达与通行路径','入口局部服务活动'],'D',goal,'实验作者明确筛选当前局部程序，不让无位置的全店短标签取得入口可见权威；完整网络另存依赖',scene.subtype);
      set(packet,'mediaTranslations.spatial.brandRoleManifestation',['温暖亲切的入口服务体验','社区小馆品牌原资产留待后期合成'],'D',goal,'入口品牌表达不夹带厨房和完整堂食活动',scene.subtype);
      set(packet,'mediaTranslations.spatial.positiveDifferentiators',['入口与堂食的通达关系','入口温暖可接近的体验'],'D',goal,'仅保留入口职责和合法边界',scene.subtype);
      set(packet,'mediaTranslations.spatial.mustBeVisible',[entranceActivity],'D',goal,'只准备入口位置明确的活动；局部堂食视线另列待审',scene.subtype);
      set(packet,'mediaTranslations.spatial.functionalRelationships',['Entrance access connects to dining area through a clear threshold route; other dining interiors remain off frame'],'D',goal,'入口与堂食保留边界/通行联系，不取得室内可见权威',scene.subtype);
    }
    if(scene.subtype==='storefront') {
      set(packet,'mediaTranslations.spatial.sceneProgram',['门头与外立面','临街外侧的到达路径'],'D',goal,'实验作者明确外立面程序，完整室内经营节点不作为当前必见清单',scene.subtype);
      set(packet,'mediaTranslations.spatial.brandRoleManifestation',['亲民温暖的外立面体验','外立面品牌原资产留待后期合成'],'D',goal,'品牌资产后期呈现，不带入整店室内活动',scene.subtype);
      set(packet,'mediaTranslations.spatial.positiveDifferentiators',['外立面识别与可进入的到达关系','临街外侧的温暖亲切氛围'],'D',goal,'明确本镜头可审核的目标，玻璃目标另留待审',scene.subtype);
      set(packet,'mediaTranslations.spatial.mustBeVisible',[storefrontActivity,windowGoal],'D',goal,'外立面活动与隔窗目标分别审计，隔窗必须保持待审而非自动放行',scene.subtype);
      set(packet,'mediaTranslations.spatial.functionalRelationships',['Storefront access must not expose kitchen or dining interiors'],'D',goal,'现有权限先保护室内；展示营业氛围的目标保留在待审字段',scene.subtype);
    }
    if(scene.subtype!=='dining') {
      const exteriorLight={source:[scene.subtype==='entrance'?'温暖可读的入口照明；不指定色温、灯具或开窗位置':'立面与门槛照明服务入口识别；不指定色温、灯具或开口参数'],
        contrast:'保持入口识别与空间可读性，不预设街道光照条件。',interactionWithMaterials:['呈现项目暖色材料方向；光学参数未指定'],forbidden:['昏暗压抑']};
      set(packet,'lightingSystem',exteriorLight,'D',goal,'将照明限定为当前镜头，避免以厨房光照要求泄漏室内',scene.subtype);
      set(packet,'mediaTranslations.spatial.lightingLanguage',exteriorLight,'D',goal,'保持同义字段一致',scene.subtype);
    }
    return {scene,A:structuredClone(A),B:packet,task:taskFor(packet,scene)};
  });
  return {baseline,userDirection,originalProjectId:A.projectId,logicalKnowledgeOwner:'feng-tang-tang',actualImage1RunAssociation:'undetermined',
    historical:historical.historical,A,B,deltas,variants,commonChanges:historical.commonChanges,postCompositeChecklist:historical.identityChecklist,
    selectedKnowledge:[{id:'rks-observation-5',status:'project_observation',scope:'project',application:'explicit experiment-only operations hypothesis'},
      {id:'rks-observation-3',status:'candidate',scope:'project',application:'reviewed as source; red brick not in core input; warm wood/terracotta traced independently to human evaluation'}],
    unknowns:{propertyDimensions:'unknown',existingKitchenLocation:'unknown',openKitchenPermission:'unknown',windowVisibility:'review_required',
      naturalLightOpenings:'unknown',materialOptics:'unspecified',dineInRatio:'unknown',actualImage1RunAssociation:'undetermined'},
    inputSha256:{A:sha256(JSON.stringify(A)),B:sha256(JSON.stringify(B))},factualAuthority:'No facts, B1 decisions, quality states or knowledge cards are promoted'};
}
