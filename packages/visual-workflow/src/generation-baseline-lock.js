import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {readJson, inside, assertId} from './configuration.js';

const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const mutations = new Set(['analyze','update-project','import-files','select-logo','import-project']);
const fail = detail => {throw new Error(`GENERATION_BASELINE_LOCKED: ${detail}`);};

// Opt-in project locks are local workflow data, never global design rules.
export function createGenerationBaselineGuard(root, projects) {
  let initial;
  return async function guard(channel, args, implementation) {
    const input=args[0];
    const id=typeof input==='string'?input:input?.projectId;
    if (!id || !channel.startsWith('visual-workflow:')) return;
    const filename=path.join(root,'generation-baseline-locks.json');
    initial ||= readJson(filename,null);
    const policy=await initial;
    if (!policy) {
      if (await readJson(path.join(projects.projectRoot(id),'generation-baseline-required.json'),null)) fail('required baseline policy is missing');
      return;
    }
    // A lock removed or changed while this host is running must not unlock it.
    if (JSON.stringify(await readJson(filename,null))!==JSON.stringify(policy)) fail('baseline policy changed; restart only after review');
    if (policy.schemaVersion!=='1.0' || !Array.isArray(policy.projects)) fail('invalid policy');
    const lock=policy.projects.find(item=>item.projectId===id);
    if (!lock) {
      if (await readJson(path.join(projects.projectRoot(id),'generation-baseline-required.json'),null)) fail('required project lock is missing');
      return;
    }
    if (mutations.has(channel.slice('visual-workflow:'.length))) fail('已验收项目输入已冻结，请先在隔离副本验收变更');
    if (!['visual-workflow:compile','visual-workflow:generate'].includes(channel)) return;
    if (!lock.files?.length || !lock.recordSha256 || !lock.analysisFingerprint || !lock.profileSha256 || !lock.implementationDigest) fail('incomplete policy');
    if (implementation.implementationDigest!==lock.implementationDigest) fail('implementation changed');
    const projectRoot=projects.projectRoot(id);
    for (const file of lock.files) {
      const target=inside(projectRoot,file.path);
      let current=projectRoot;
      for (const segment of path.relative(projectRoot,target).split(path.sep)) {
        current=path.join(current,segment);
        if ((await fs.lstat(current)).isSymbolicLink()) fail('symlink in pinned input');
      }
      if (sha(await fs.readFile(target))!==file.sha256) fail(`input changed: ${file.path}`);
    }
    const settings=await readJson(path.join(root,'settings.json'));
    const profile=settings.profiles?.find(item=>item.id===settings.imageProfileId);
    if (!profile || sha(JSON.stringify(profile))!==lock.profileSha256) fail('image model configuration changed');
    if (channel==='visual-workflow:compile') {
      if (input.task?.deliverableFamily!=='space' || input.task?.generationBasis && input.task.generationBasis!=='standard' || input.task?.referenceAssetIds?.length || input.task?.continuation) fail('only standard space generation without references is accepted');
    } else {
      if (!/^vnext-task-[a-f0-9-]{36}$/u.test(input.taskId || '')) fail('invalid compilation');
      assertId(input.taskId.slice('vnext-task-'.length));
      const snapshot=await readJson(path.join(projectRoot,'image-generation-vnext/compilations',input.taskId,'project-design-direction.json'),null);
      if (snapshot?.projectId!==id || snapshot?.recordSha256!==lock.recordSha256 || snapshot?.analysisFingerprint!==lock.analysisFingerprint) fail('旧任务未使用已验收方向，请重新编译');
    }
  };
}
