import path from 'node:path';
import {inventoryProject} from '../../../src/cli/inventory.js';
import {createAnalysisProjectConfig} from '../../../src/cli/analysis-engine/config/schema.js';
import {prepareVisualAssets} from '../../../src/cli/analysis-engine/preparation/visual-preparation.js';
import {prepareBenchmarks} from '../../../src/cli/analysis-engine/preparation/benchmark-preparation.js';
import {buildDeepCreativeDirectorPrompt} from '../../../src/cli/analysis-engine/creative-director/prompt-builder.js';
import {buildFusionEnhancedTask,analysisFactualConstraints} from '../../../src/runtime/analysis-contract.js';
import {buildUnifiedVisualUnderstandingPrompt} from '../../../src/runtime/unified-visual-understanding.js';
import {isAnalysisSourceAsset} from '../../../src/runtime/project-assets.js';
import {UVU_SYSTEM} from '../two-dispatch-guard/freeze.mjs';

// Read-only intake + local preparation only. Never runs analyze, the pipeline,
// a provider, a report writer, or a synthetic response through the real project.
// Mirrors pipeline-service + bootstrap at the pinned source commit.
export async function buildContexts(project,projectRoot) {
  const rawConfig={version:'5.0',projectName:project.projectName,
    userTask:buildFusionEnhancedTask(project.description,project.projectName),
    brandFacts:{brandName:project.brandName,industry:project.industry,
      detectedBrandName:project.detectedBrandName,detectedIndustry:project.detectedIndustry,
      factConfidence:project.factConfidence,
      factualConstraints:analysisFactualConstraints(project.industry,project.lockedFacts,project.factConfidence.industry),logoAssets:project.logoFiles},
    benchmarkContext:{category:[],creativeExcellence:[]},
    performance:{targetMinutes:10,maximumMinutes:15,maxDetailAssets:5,maxReportCharacters:8000,enablePreparationCache:true},
    overrides:{additionalLockedAssets:[],allowLogoRedesign:false,requiredApplications:[],forbiddenChanges:project.lockedFacts,outputLanguage:project.outputLanguage}};
  const config=createAnalysisProjectConfig(rawConfig,{projectName:path.basename(projectRoot)});
  const inventory=await inventoryProject(path.join(projectRoot,'input'),{
    ignore:['outputs','.runtime','masterpiece-os-output','.masterpiece-os'],
    ignorePaths:[path.join(projectRoot,'outputs'),path.join(projectRoot,'.runtime')]});
  const visualPreparation=await prepareVisualAssets(inventory,config,{
    projectRoot,cacheRoot:path.join(projectRoot,'prepared/visual'),disableCache:false});
  const benchmarkPreparation=await prepareBenchmarks(config,{
    projectRoot,cacheRoot:path.join(projectRoot,'prepared/benchmarks'),disableCache:false});
  const dcd={projectRoot,projectName:path.basename(projectRoot),config,inventory,visualPreparation,benchmarkPreparation};
  dcd.prompt=await buildDeepCreativeDirectorPrompt(dcd);
  // finalProjectName is the existing nonempty projectName. UVU uses the intake
  // snapshot, not running-state fields or any text from the DCD response.
  const promptProject={...project,projectName:project.projectName,brandName:project.brandName || project.projectName};
  const assets=project.assets.filter(a=>isAnalysisSourceAsset(a) && a.status==='ready' && /^image\//iu.test(a.mimeType)).slice(0,30);
  const uvu={maximumDurationMs:900000,prompt:{messages:[{role:'system',content:UVU_SYSTEM},
    {role:'user',content:buildUnifiedVisualUnderstandingPrompt(promptProject,assets.map(a=>a.id))}],
    attachments:assets.map(a=>({assetId:a.id,path:path.join(projectRoot,'input',a.relativePath),
      mediaType:'image',format:path.extname(a.relativePath).slice(1),readable:true}))}};
  return {dcd,uvu,rawConfig,inventory,visualPreparation,benchmarkPreparation};
}
