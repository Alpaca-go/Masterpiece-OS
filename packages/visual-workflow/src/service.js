import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConfiguration, readJson, writeJson, inside } from './configuration.js';
import { createProjectStore } from './project-store.js';
import { createImageService } from './image-service.js';
import { createPipelineService } from './runtime/pipeline-service.js';
import { createShortChainGenerationService } from './runtime/image-generation/short-chain-service.js';
import { createDeliverableValidatorService } from './runtime/image-generation/deliverable-validator-service.js';
import { validateProjectVisualContext, migrateProjectVisualContext } from './runtime/project-visual-context-builder.js';
import { verifyImplementation } from './integrity.js';
import { createArtDirectionStore } from './art-direction-store.js';
import { assertArtDirectionModel } from './art-direction-contract.js';
import { createProjectDesignDirectionStore } from './project-design-direction.js';

// This is the only production composition root for this bounded workflow.
// Other product domains receive neither its services nor its storage paths.
export function createVisualWorkflow(options) {
  const root = path.resolve(options.root);
  const configuration = createConfiguration(root);
  const projects = createProjectStore(path.join(root, 'data'));
  const artDirection = createArtDirectionStore(projects);
  const designDirection = createProjectDesignDirectionStore(projects);
  const emit = options.emit || (() => {});
  const pipeline = createPipelineService(projects, configuration.readCredentials, configuration.get,
    progress => emit('visual-workflow:analysis-progress', progress),
    { resolvePromptRoot: () => fileURLToPath(new URL('../prompts/analysis/', import.meta.url)) }, options.analysisProviders);
  const context = {
    async getShortChain(id) {
      const project = await projects.get(id);
      if (project.status !== 'completed' || project.visualContextVNextStatus !== 'ready') throw new Error('请先完成此独立项目的视觉分析');
      const paths = await projects.paths(id);
      const value = await readJson(path.join(paths.root, 'project-context/project-visual-context.vnext.json'));
      const validation = validateProjectVisualContext(value);
      if (!validation.valid || value.projectId !== id) throw new Error('独立项目分析上下文无效，请重新分析');
      return migrateProjectVisualContext(value);
    },
    async rebuildShortChain() { throw new Error('独立工作流不从其他功能重建上下文，请重新分析本项目'); },
  };
  const images = createImageService(root, projects, configuration, emit, options.fetchImpl);
  const validator = createDeliverableValidatorService(projects, () => images, configuration.get, configuration.readCredentials, context, options.validationReasoner);
  const generation = createShortChainGenerationService(projects, context, () => images, () => validator);
  async function compile(input) {
    const art = input.task.generationBasis === 'art_direction_reference';
    if (!art && (input.task.generationBasis && input.task.generationBasis !== 'standard' || input.task.referenceAssetIds?.length || input.task.continuation) || art && input.task.continuation) throw new Error('VISUAL_WORKFLOW_STANDARD_ONLY');
    if (!art && input.task.deliverableFamily==='space' && Object.hasOwn(input,'designDirectionExpectedRecordSha256')) {
      const current=await designDirection.get(input.projectId);
      if (current.recordSha256!==input.designDirectionExpectedRecordSha256) throw new Error('PROJECT_DESIGN_DIRECTION_EDIT_CONFLICT');
    }
    const settings = await configuration.get();
    const credential = await configuration.readCredentials(settings.imageProfileId);
    if (credential.modelType !== 'image_generation') throw new Error('请先选择独立生图模型');
    if (art) {
      assertArtDirectionModel(credential.model,credential.protocol);
      return generation.compile({projectId:input.projectId,model:credential.model,task:input.task});
    }
    return generation.compile({ projectId: input.projectId, model: credential.model, task: { ...input.task, generationBasis: 'standard', referenceAssetIds: [], continuation: undefined } });
  }
  async function start(input) {
    const settings = await configuration.get();
    return generation.startValidated({ projectId: input.projectId, taskId: input.taskId, apiProfileId: settings.imageProfileId, validatorProfileId: settings.analysisProfileId });
  }
  async function importConfiguration() {
    if (!options.readExistingSettings || !options.readExistingCredentials) throw new Error('没有可复制的已有模型配置');
    if ((await configuration.get()).profiles.length) throw new Error('已存在独立配置，请在独立设置中修改；不会覆盖');
    const existing = await options.readExistingSettings();
    const importedIds = new Map();
    for (const profile of existing.profiles) {
      if (!profile.isEnabled || !profile.hasApiKey || !['analysis', 'image_generation'].includes(profile.modelType)) continue;
      const credentials = await options.readExistingCredentials(profile.id);
      const copied = await configuration.saveProfile({ ...profile, id: undefined, apiKey: credentials.apiKey });
      importedIds.set(profile.id,copied.profiles.at(-1).id);
    }
    const eligible=existing.profiles.filter(profile=>importedIds.has(profile.id));
    const analysis=eligible.find(profile=>profile.modelType==='analysis' && profile.isDefault) || eligible.find(profile=>profile.modelType==='analysis');
    const image=eligible.find(profile=>profile.modelType==='image_generation' && profile.isDefault) || eligible.find(profile=>profile.modelType==='image_generation');
    return configuration.select({analysisProfileId:analysis?importedIds.get(analysis.id):undefined,imageProfileId:image?importedIds.get(image.id):undefined});
  }
  async function importProject(id) {
    if (!options.readExistingProject) throw new Error('没有可迁入的项目');
    if (pipeline.isActive(id)) throw new Error('分析期间不能迁入项目');
    if (await projects.get(id).catch(() => null)) throw new Error('该项目已经迁入，不会覆盖现有结果');
    const { project, root: sourceRoot } = await options.readExistingProject(id);
    if (project.id !== id || project.status === 'running') throw new Error('源项目尚未就绪');
    const targetRoot = projects.projectRoot(id);
    const stagingRoot = inside(path.dirname(targetRoot), `.import-${id}-${crypto.randomUUID()}`);
    // Copy only the analysis intake/results. Planning decisions, migration
    // capsules, shared prompt assets and generation sessions never cross in.
    const assets = (project.assets || []).filter(asset => !asset.usage || asset.usage === 'analysis_source');
    const allowedOutputs = [project.lastReportFilename, project.visualContextFilename].filter(Boolean);
    const contextNames = ['visual-decision-packet.json', 'analysis-repair-audit.json', 'project-visual-context.vnext.json'];
    const sourceReal = await fs.realpath(sourceRoot);
    async function copy(relative, required = false) {
      const source = inside(sourceRoot, relative);
      const stat = await fs.lstat(source).catch(error => { if (error.code === 'ENOENT' && !required) return null; throw error; });
      if (!stat) return;
      if (!stat.isFile() || stat.isSymbolicLink() || !(await fs.realpath(source)).startsWith(sourceReal + path.sep)) throw new Error('VISUAL_WORKFLOW_IMPORT_PATH_INVALID');
      const target = inside(stagingRoot, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
    }
    try {
      for (const directory of ['input/assets', 'prepared', 'outputs', 'runtime', 'project-context']) await fs.mkdir(path.join(stagingRoot, directory), { recursive: true });
      for (const asset of assets) await copy(`input/${asset.relativePath}`, true);
      for (const name of allowedOutputs) { if (name !== path.basename(name)) throw new Error('VISUAL_WORKFLOW_IMPORT_PATH_INVALID'); await copy(`outputs/${name}`, true); }
      for (const name of contextNames) await copy(`project-context/${name}`);
      const settings = await configuration.get();
      const analysisFields = ['id', 'projectName', 'detectedProjectName', 'projectNameSource', 'projectNameConfidence', 'brandName', 'industry', 'detectedBrandName', 'detectedIndustry', 'factConfidence', 'description', 'logoLocked', 'logoFiles', 'briefFiles', 'lockedFacts', 'outputLanguage', 'analysisProfile', 'status', 'createdAt', 'lastRunAt', 'lastDurationMs', 'lastReportFilename', 'lastError', 'provider', 'model', 'visualContextFilename', 'visualContextStatus', 'visualContextSchemaVersion', 'visualContextLastBuiltAt', 'visualContextVNextFilename', 'visualContextVNextStatus', 'visualContextVNextVersion', 'visualContextVNextLastBuiltAt'];
      const copied = { ...Object.fromEntries(analysisFields.filter(field => project[field] !== undefined).map(field => [field, project[field]])), workflowOwner: 'visual-workflow', assets, assetCount: assets.length, imageCount: assets.filter(asset => asset.mimeType.startsWith('image/')).length, planningBriefFiles: [], apiProfileId: settings.analysisProfileId, importedFromProjectId: id, importedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      await writeJson(path.join(stagingRoot, 'project.json'), copied);
      await writeJson(path.join(stagingRoot, 'migration.json'), { workflowOwner: 'visual-workflow', copiedAt: copied.importedAt, synchronization: 'none', sourceProjectId: id });
      await fs.rename(stagingRoot, targetRoot);
      return copied;
    } catch (error) {
      // Keep an incomplete copy invisible; never delete a source project.
      if (stagingRoot.startsWith(path.resolve(root) + path.sep)) await fs.rm(stagingRoot, { force: true, recursive: true }).catch(() => {});
      throw error;
    }
  }
  async function report(id) {
    const project = await projects.get(id);
    if (!project.lastReportFilename) return null;
    if (project.lastReportFilename !== path.basename(project.lastReportFilename)) throw new Error('VISUAL_WORKFLOW_PATH_INVALID');
    return fs.readFile(path.join((await projects.paths(id)).outputs, project.lastReportFilename), 'utf8');
  }
  const handlers = {
    'visual-workflow:settings': () => configuration.get(),
    'visual-workflow:options': () => generation.listOptions(),
    'visual-workflow:save-profile': (_context, input) => configuration.saveProfile(input),
    'visual-workflow:select-profiles': (_context, input) => configuration.select(input),
    'visual-workflow:import-configuration': () => importConfiguration(),
    'visual-workflow:list-projects': async () => Promise.all((await projects.list()).map(pipeline.reconcileOrphanedProject)),
    'visual-workflow:create-project': (_context, input) => projects.create(input),
    'visual-workflow:import-files': (_context, id, files) => {
      if (files?.purpose === 'project_design_direction') {
        if (files.action === 'save_draft') return designDirection.saveDraft(id,files);
        if (files.action === 'confirm') return designDirection.confirm(id,files);
        throw new Error('PROJECT_DESIGN_DIRECTION_ACTION_INVALID');
      }
      return files?.purpose === 'art_direction' ? artDirection.register({...files,projectId:id}) : projects.importFiles(id, files);
    },
    'visual-workflow:select-logo': async (_context, id, assetId) => {
      const project = await projects.get(id);
      if (pipeline.isActive(id)) throw new Error('分析期间不能修改 Logo');
      const asset = project.assets.find(item => item.id === assetId && item.mimeType.startsWith('image/'));
      if (!asset) throw new Error('请选择本项目已导入的 Logo 图片');
      return projects.update(id, { assets: project.assets.map(item => ({ ...item, role: item.id === assetId ? 'logo' : 'visual' })), logoFiles: [asset.relativePath], visualContextStatus: 'missing', visualContextVNextStatus: 'missing', status: 'ready' });
    },
    'visual-workflow:import-project': (_context, id) => importProject(id),
    'visual-workflow:analyze': async (_context, id, force = true) => {
      if (pipeline.isActive(id)) throw new Error('分析已在进行中');
      const settings = await configuration.get();
      await designDirection.markForReview(id);
      return pipeline.start(id, force, settings.analysisProfileId);
    },
    'visual-workflow:cancel-analysis': (_context, id) => pipeline.cancel(id),
    'visual-workflow:report': (_context, id, purpose) => purpose === 'project_design_direction' ? designDirection.get(id) : report(id),
    'visual-workflow:compile': (_context, input) => compile(input),
    'visual-workflow:generate': (_context, input) => start(input),
    'visual-workflow:runs': (_context, id) => images.listRuns(id),
    'visual-workflow:image': (_context, runId, imageId) => images.imageData(runId, imageId),
    'visual-workflow:cancel-generation': (_context, id) => images.cancel(id),
    'visual-workflow:logo-source': (_context, id, assetId) => images.logoSource(id,assetId),
    'visual-workflow:post-composite-logo': async (_context, input) => {
      const audit=await generation.postCompositeLogo(input);
      const directory=await images.runRoot(input.runId);
      const output=inside(directory,path.relative(directory,audit.outputPath));
      return {audit,dataUrl:`data:image/png;base64,${(await fs.readFile(output)).toString('base64')}`};
    },
  };
  // A changed feature implementation blocks only this feature, rather than
  // taking down planning/migration or silently accepting a changed baseline.
  let verified;
  const operations = Object.freeze(Object.fromEntries(Object.entries(handlers).map(([channel, handler]) => [channel, async (...args) => {
    verified ||= verifyImplementation();
    const implementation = await verified;
    const result = await handler(...args);
    if ((channel === 'visual-workflow:analyze' || channel === 'visual-workflow:compile') && result) {
      const directory = result.artifactDirectory || (await projects.paths(args[1])).runtime;
      await writeJson(path.join(directory, 'workflow-implementation.json'), implementation);
    }
    if (channel === 'visual-workflow:generate' && result) {
      for (const run of [result.initialRun,result.correctionRun].filter(Boolean)) await writeJson(path.join(await images.runRoot(run.runId),'workflow-implementation.json'),implementation);
    }
    return result;
  }])));
  return Object.freeze({ operations, configuration, projects, pipeline, compile, images, importProject, importConfiguration });
}
