// Explicit test-only report writer. Reads repository historical fixtures, never local user projects.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {verifyImplementation} from '../../src/integrity.js';
import {compareFidelity,counters} from './ftt-fidelity-comparison.ts';
import {sources,sourcePaths,readRepo,sha256,historicalBytes} from './ftt-fidelity-fixture.ts';
import {cases,runCase,nonSichuanCase} from './ftt-fidelity-cross-project.ts';
const baseline='3b02af4859eecb189b593b11bc81ab27cf6c3228';
const directory=new URL('../../reports/restaurant-fidelity/',import.meta.url);
const json=(name: string,value: any)=>fs.writeFileSync(new URL(name,directory),JSON.stringify(value,null,2)+'\n');
const md=(name: string,value: string)=>fs.writeFileSync(new URL(name,directory),value.trim()+'\n');
const previousFetch=globalThis.fetch;let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw new Error('RKS02B_NETWORK_FORBIDDEN');};
try {
  const result=compareFidelity(),fixture=result.fixture;
  assert.equal(sha256(historicalBytes),sources.packet.sha256);
  assert.equal(sources.packet.sha256,'e3564d51888661989eeb16de8923992a4e1148268e7f55e7427c4c70e6fb613c');
  const protectedRoots=['packages/visual-workflow/src','packages/visual-workflow/prompts','packages/visual-workflow/implementation-integrity.json',
    'apps/web/src/features/visual-workflow','packages/visual-workflow/offline','packages/visual-workflow/reports/restaurant-knowledge',
    'packages/visual-workflow/reports/restaurant-shadow','packages/visual-workflow/reports/p7b-single-generation',
    'golden','evaluation','space-generator','config/repository-contract'];
  assert.equal(execFileSync('git',['diff',baseline,'--name-only','--',...protectedRoots],{encoding:'utf8'}).trim(),'');
  const manifest=JSON.parse(readRepo('packages/visual-workflow/implementation-integrity.json').toString('utf8'));
  const protectedPaths=[...manifest.files.map((entry: any)=>`packages/visual-workflow/${entry.path}`),
    'packages/visual-workflow/implementation-integrity.json',...Object.values(sourcePaths),
    'packages/visual-workflow/offline/restaurant-knowledge/index.js'];
  const protection=[...new Set(protectedPaths)].map(path=>{
    const actual=readRepo(path),original=execFileSync('git',['show',`${baseline}:${path}`],{maxBuffer:20e6});
    assert.deepEqual(actual,original,`PROTECTED_CHANGE: ${path}`);
    return {path,sha256:sha256(actual),unchangedFromBaseline:true};
  });
  const implementation=await verifyImplementation();
  fs.mkdirSync(directory,{recursive:true});
  json('fixture-provenance.json',{baseline,sources,copy:{path:'packages/visual-workflow/tests/restaurant-knowledge/ftt-historical-packet.json',
    sha256:sha256(historicalBytes),byteIdentical:true,authority:'historical_analysis_fixture_not_image1_run'},
    originalProjectId:fixture.historical.projectId,logicalKnowledgeOwner:'feng-tang-tang',actualImage1RunAssociation:'undetermined',
    sourceLanes:{repositoryHistoricalPacket:'analysis proposals; original labels preserved in raw copy, not independently reverified facts',
      userGoals:fixture.goals,historicalHumanReview:'selection/evaluation only for their historical image, not this experiment',
      projectKnowledge:'candidate/project_observation; explicitly selected for experimental review only'},unknownFacts:fixture.unknownFacts,
    commonChanges:fixture.commonChanges,directionDeltas:fixture.deltas,identityChecklist:fixture.identityChecklist,
    A:fixture.A,B:fixture.B,b1Projection:result.b1Projection});
  json('compiled-evidence.json',{scope:result.scope,counters,rows:result.rows.map(row=>({
    scene:row.scene,task:row.task,controls:row.controls,raw:row.raw,
    A:{inputSha256:row.A.inputSha256,formalSha256:row.A.formalSha256,providerSha256:row.A.providerSha256,
      sourceMap:row.A.sourceMap,audit:row.A.audit},
    B:{inputSha256:row.B.inputSha256,formalSha256:row.B.formalSha256,providerSha256:row.B.providerSha256,
      sourceMap:row.B.sourceMap,audit:row.B.audit}
  }))});
  const cross=cases.map((fixture: any)=>({projectId:fixture.projectId,label:fixture.label,result:runCase(fixture)}));
  json('cross-project-results.json',{scope:'Six unchanged RKS-01/02A cases, with explicit attempted foreign FTT material/operation adoption',cases:cross,
    supplementalNonSichuan:{fixture:nonSichuanCase,result:runCase(nonSichuanCase)}});
  const perScene=[];
  for(const row of result.rows) {
    const name=`prompts-${row.scene.subtype}.md`;
    md(name,`# ${row.scene.subtype}：完整离线 A/B Prompt\n\n这是历史餐饮 Packet 派生实验，不是图 1 实际请求。A/B 均使用以下完全相同的任务与 Provider 控制。\n\n\`\`\`json\n${JSON.stringify({task:row.task,controls:row.controls,providerBodyExceptPrompt:{...row.A.providerBody,prompt:'see full Provider Prompt below'}},null,2)}\n\`\`\`\n\n## A：现有分析方向 · 正式 Prompt\n\n\`\`\`text\n${row.A.formalPrompt}\n\`\`\`\n\n## B：确认目标与显式项目假设 · 正式 Prompt\n\n\`\`\`text\n${row.B.formalPrompt}\n\`\`\`\n\n## A：完整 Provider Prompt\n\n\`\`\`text\n${row.A.providerBody.prompt}\n\`\`\`\n\n## B：完整 Provider Prompt\n\n\`\`\`text\n${row.B.providerBody.prompt}\n\`\`\``);
    perScene.push(`- [${row.scene.subtype} / ${row.scene.shot}](${name})`);
  }
  const behaviorRows=result.rows.flatMap(row=>row.B.audit.behaviors.map(field=>
    `| ${row.scene.subtype} | ${field.value} | ${field.trace?.sceneProjection?.sceneScope} | ${field.retained?'保留':'不渲染'} | ${field.trace?.reason} |`)).join('\n');
  md('AB-review.md',`# RKS-02B 冯烫烫完整方向对照\n\nB 的项目定位与用户目标一致性有离线字段证据，但 A、B 均未达到真实生图前输入验收条件。编译成功不等于场景正确或视觉质量通过。本次没有新图、没有质量分数。\n\n## 输入与控制\n\n冻结起点：\`${baseline}\`。全量历史 Packet 的字节副本、SHA256、A/B 输入和每项差异见 [来源与输入账本](fixture-provenance.json)。主样本不使用 Example Brand、咨询接待 Fixture 或 RKS-02A 的通用编译样本。\n\n原始 Packet 在三个镜头均被现有语义门禁拒绝：\`ANALYSIS_SPATIAL_SEMANTICS_INVALID\`。为了比较方向，A/B 共同将原 mustBeVisible 的第 0、1、3 项品牌文字转至后期合成人工清单，仅保留第 2 项“明档内的砂锅/热气”。这是一项公开的共同实验适配，不能称为原始 Packet 可直接生成。B 的经营行为英文句是另行登记的项目观察假设，不是假称原中文字段已被无损保留。\n\n每个镜头内 A/B 的完整任务逐字相同：Seedream 5.0 Pro、standard、16:9、2K、1 张、零参考图、post_composite；相同 subtype、shot、shotSource 和指令。三个镜头之间只采用预先登记的视角表达；没有按组改镜头、提供参考图或改测试项目。\n\n${perScene.join('\n')}\n\n## 设计方向审核矩阵\n\n| 审核维度 | A：保留历史分析 | B：离线方向副本 | 结论与证据边界 |\n| --- | --- | --- | --- |\n| 产品与业态 | 行业字段确为川菜小吃/跷脚牛肉，但 Commercial Purpose 仍为“快餐与小吃服务” | Commercial Purpose 明示社区临街特色小馆，亲民、堂食为主兼外带 | B 定位对齐；不是现有经营比例的事实确认 |\n| 制作、服务、顾客、餐桌 | 原 Packet 已有点餐→明档制作→取餐→就餐、外带包装，绝非咨询中心结构 | 保留相同功能节点与网络，另显式选用历史经营观察的制作/热气/桌边就餐假设 | 合理关系的目标存在；物业与开放厨房条件仍 unknown |\n| 空间气质 | 原分析本来已有温暖、开放、热气、烟火气；不能把 A 描绘为完全冷淡 | 强化社区、温暖、亲切、市井日常；不再强制灯笼/入口厨房/环绕台 | B 方向更清楚，未证明图像更好 |\n| 品牌与文化 | 冯烫烫、跷脚牛肉与四川小吃来自历史资料；灯笼是分析提案 | 品牌/地域目标来自用户，保留产品识别；文字后期合成待审 | 未授权虚构非遗、老字号、地域装饰符号或消费者故事 |\n| 材料、光、色 | 浅木、红金属/塑料、浅石材/瓷砖；3000–3500K/射灯等均是历史分析提案 | 材料名称及行为、光照参数、色彩体系与 A 相同；只登记去除材料品牌用途中的招牌/灯笼强制关系 | 红砖/暖木/赤陶候选独立审核，缺少新材质行为不能执行 |\n| 镜头作用域 | 原中文砂锅/热气无可执行 owner；入口仍把含就餐区的完整网络投为当前镜头 | 堂食经营行为可执行；入口三条经营行为均因 off-frame 过滤；外立面未解析却保留室内活动 | 场景级阻塞，不允许以保留数量宣称 B 优胜 |\n| 跨行业污染 | 正向功能节点未见咨询/酒店接待；通用模板有 reception/waiting/privacy 语境 | 同样存在通用语境、可选 gallery-like 与 premium/high-end 气质 | 区分正向功能污染、通用措辞偏向、negative clinic guard；后者不是临床功能 |\n| 未确认推断 | 明档、材质光学、格栅和厨房关系均是历史提案，非已验证物业事实 | 新增内容是目标/显式实验假设；没有新增客群、尺寸、物业事实或材质技术参数 | 实际布局、客群、开放厨房许可、材质行为仍 unknown/review_required |\n\n## 经营行为字段\n\n以下只验证文本归属和镜头投影，不评分视觉质量。完整 sourceMap、投影、owner 与最终保留状态见 [编译证据](compiled-evidence.json)。A 的“明档内的砂锅/热气”三次均为 unresolved_visible_requirement，未进入正式 Prompt。B 的三句使用项目级历史观察的明确英文表达。\n\n| 镜头 | B 源值 | 场景投影 | 正式及 Provider Prompt | 原因 |\n| --- | --- | --- | --- | --- |\n${behaviorRows}\n\n## 仍存在的错误方向和阻塞\n\nA 仍有快餐升级的 Commercial Purpose、强制灯笼和明档文字贴图方向；共同后期适配并未清除 A 的其他文字载体提案。B 没有把这些提案当作餐饮必备要素，但正式模板仍有 reception/waiting/privacy、gallery-like、premium/high-end 等措辞，需要独立审核其风格影响。它们不构成已证明的咨询室或酒店功能节点。\n\nstorefront 的 targetScene/targetProgramId 缺失、viewStrategy 为 null，用户显式 front 被 trace 记为 legacy_project_default，门禁却 pass；三个室内行为全部以 unresolved 投影进入最终 Prompt。入口已正确过滤英文人物行为，但历史“点餐区 -> 明档制作区 -> 取餐区 -> 就餐区”仍被视作 current_shot。不能仅验证 subtype/shot 或三句英文就宣称场景保真。详见 [独立变更提案](protected-change-proposal.md)。\n\nB 沿用的半通透木格栅、金属高反射、塑料哑光、3000–3500K、射灯等来源是 AI 历史分析，并未得到本轮材料验收。暖木/赤陶的历史验收也不能替它们确认参数。候选红砖/赤陶未写入材料系统。\n\n## 未使用知识与同质化风险\n\nrks-observation-3 仅显式选中作项目审核，缺可执行材质行为，材料应用保持 withheld。rks-observation-5 只在 B 中作为待审经营观察假设选用，未晋升。其余知识没有被本轮新增应用；RKS-02A 分类/冲突规则和知识状态不变。\n\n不要由川菜/亲民/社区/高效出餐推定红砖、灯笼、复古或极简；不要把历史单图材料验收扩大为行业规则；通用 gallery/high-end 模板也可能将不同品牌推向同一空间气质。现代连锁川味快餐保留现代高效方向，外带档口无需完整堂食区。六类反例含显式跨项目知识注入拒绝结果见 [跨项目记录](cross-project-results.json)。\n\n当前结论：B 的定位字段对齐已得到离线验证，完整生成输入仍需解决场景边界、模板措辞和未审核材料参数；真实生图前验收为未通过，等待设计师审核。`);
  md('knowledge-review.md',`# 冯烫烫项目知识应用审核\n\n所有记录维持 candidate / project_observation；validatedCases 与人工验收状态未修改。以下为实验选择与来源审查，不是知识晋升。\n\n| 内容 | 独立来源 | 本轮应用 | 尚缺依据 |\n| --- | --- | --- | --- |\n| 厨师制作、热气、桌边就餐 | historical golden-selection 的人工理由与 final-dining-1/evaluation 的运营真实记录；rks-observation-5 | B 显式项目观察假设；含 in kitchen 的英文句由本轮离线作者写出；不是原 Packet 逐字字段 | 当前物业、开放厨房许可、真实视线、空间尺度与人工审核 |\n| 红砖 | 既有项目修正草案、历史 compiled Prompt | rks-observation-3 选中审核，未写入 materialSystem | 该人工 materialAndLighting.note 未提红砖；缺材质行为与当前适用性，不能宣称等同人工通过 |\n| 暖木、赤陶 | 历史 evaluation: dimensions.materialAndLighting.note“人工验收：暖色木/赤陶 + 厨房暖光。” | 项目候选审核，未增添材质行为 | 木/陶具体表面、反射和构造均未知；历史画面验收不确认新输入规格 |\n| 暖光 | 同上人工说明；原 Packet lightingSystem 另有 AI 具体参数 | B 温暖氛围目标明确；实验保留与 A 相同的历史参数 | 历史人审没有授权 3000–3500K、射灯、照度或光学技术值；保留值标为 review_required |\n| 浅木/红金属塑料/浅石材瓷砖及格栅 | 原 Packet materialSystem / structureLanguage | A/B 共有的未确认分析提案；B 只去掉品牌用途中的强制灯笼招牌 | 不代表用户已选用；不可借此称项目材料方向完整 |\n\n来源文件与字节 SHA256 见 [fixture-provenance.json](fixture-provenance.json)。来源中已有的历史分数与通过状态没有迁移到本轮实验。原始品牌资料和用户目标独立列账；“堂食为主”是确认目标，真实营业比例 unknown；“社区临街”是目标业态，真实物业 unknown；四川地域是设计目标，不能推出特定民俗、装饰或消费者画像。\n\n下一步由设计师先决定材料是否选用及其行为是否有足够证据；无法确定继续 unknown。不得用新增技术参数填补这一缺口。`);
  md('human-checklist.md',`# 生图前人工验收清单\n\n状态：未验收，不具备正式真实生图条件。本文件不创建用户确认记录。建议逐镜头审核三个完整 A/B 正式 Prompt 和 Provider Prompt，不能以关键词出现次数或长度作质量结论。\n\n- [ ] 确认社区四川特色小馆、跷脚牛肉/特色小吃、亲民堂食为主兼外带均为当前目标。\n- [ ] 审核 A 的现代快餐提案与 B 的社区小馆方向，决定哪些方向可采用，哪些仍需修改。\n- [ ] 明确厨房、点餐、出餐、服务、餐桌与通行的实际关系；物业尺寸/开放厨房许可无法确定则保持 unknown。\n- [ ] 核查入口的室内完整功能网络泄漏、storefront 未解析却保留室内经营行为的问题，要求独立受保护变更审批后回归。\n- [ ] 堂食镜头审核厨师/热气/顾客行为是否合理；历史观察不代表当前执行结果已验收。\n- [ ] 审核正向通用 reception/waiting/privacy、gallery-like、premium/high-end 措辞，区分模板偏向与实际跨行业节点。\n- [ ] 审核品牌文字、Logo、跷脚牛肉品类及 Slogan 的后期合成清单；不要要求模型直接渲染文字，也不要把灯笼/非遗当作四川必备。\n- [ ] 单独决定红砖/暖木/赤陶是否适用，补充有依据的材质行为后再考虑可执行输入，缺失时保持 unknown。\n- [ ] 审核原分析格栅、反射参数与具体色温/射灯提案；不得以历史暖光人审替代这些参数的审批。\n- [ ] 检查所有未确认资料、非四川项目防污染、外带业态无需完整堂食区及现代连锁可保留现代风格。\n- [ ] 对每个镜头的正式与 Provider Prompt 人工签署结论，并另行授权真实生图试验；本轮不签署、不调用。\n\n现阶段只能确认离线来源与编译路径可审计，不能确认视觉质量。模型分析、生图、模型校验、自动重试均 0；图 1 实际 Run 关联继续 undetermined。`);
  md('protected-change-proposal.md',`# 独立生产变更申请草案（本轮未实施）\n\n## 场景作用域与显式镜头权威\n\n离线证据 confirmed：storefront/front 在纯编译中没有 targetScene/targetProgramId，viewStrategy=null，shotSource=legacy_project_default，authority gate 却 pass。B 的厨房制作、厨房热气、桌边顾客三句 sceneProjection=unresolved，仍由 composition 输出。入口/entrance_view 会过滤这三句，但中文“点餐区 -> 明档制作区 -> 取餐区 -> 就餐区”仍为 current_shot。详情及 sourceMap 见 compiled-evidence.json；这些是合成/历史派生请求，不是图 1 根因。\n\n建议独立审批后审查 src/generation-runtime/space/semantic/separate-space-semantics.js 的场景/中文功能识别、source-adapter.js 的目标场景映射、compiler.js 的场景权威及 unresolved 可见要求处置。路径是待调查影响范围，不表示三文件一定都需修改。外立面未识别应 fail closed 或有明确 exterior 程序；必须保留显式 front 及其来源。未知可见要求不能因可分类就获得当前镜头可见权威。中文网络中的就餐/制作应按来源子句保留为项目依赖或镜头外关系，不能把全项目网络画进入口。不要以改 shot、全局删厨房/顾客或 FTT 品牌特判绕过。\n\n验证范围：storefront/entrance/dining 与其他所有支持场景；中英文关系、显式/默认镜头、未知场景、跨行业功能、visible owner、Provider Prompt、完整独立流程与公共入口回归。若实现受保护，提交准确差异、候选 SHA256 与独立完整性审批；不得本轮更新摘要或 Golden。\n\n## 通用气质与文案\n\n离线证据 confirmed：A/B 都含 reception/waiting/privacy、gallery-like、premium/high-end 通用措辞；是否导致图像同质化仍 undetermined。建议独立审查包内 space Prompt 模板与 architecture-context 构造器，让功能和艺术方向来自项目授权，避免任何行业固定风格规则。负向 no generic AI clinic look 不是正向诊所节点，不能仅据单词误判。\n\n## 历史输入规范\n\n原始品牌硬可见文字被 gate 拒绝是现有行为，不建议放宽以允许 Logo/文字直接生成。需未来明确 post-composite 输入契约及可见砂锅/热气表达的人工确认映射，不自动改写历史 Packet。\n\n本轮仅提交提案，生产实现、Prompt、完整性摘要、Golden、配置与历史验收记录均未改动。当前已完成允许的离线实验；受保护修复与真实生图继续等待独立审核。`);
  assert.equal(networkAttempts,0);
  json('evidence-index.json',{phase:'RKS-02B',baseline,scope:result.scope,sources,implementation,
    protectedRoots,protectedDiff:[],protectedFiles:protection,protectedFileCount:protection.length,
    zeroTransport:{...counters,networkAttempts},productionIntegration:false,userProjectsRead:false,userProjectsWritten:false,
    credentialsRead:false,knowledgePromoted:false,qualityAccepted:false,readyForRealGeneration:false,
    actualImage1RunAssociation:'undetermined',crossProjectCases:cross.length,pairedScenes:result.rows.length});
  console.log(JSON.stringify({phase:'RKS-02B',pairedScenes:result.rows.length,crossProjectCases:cross.length,
    protectedFiles:protection.length,networkAttempts,readyForRealGeneration:false}));
} finally {globalThis.fetch=previousFetch;}
