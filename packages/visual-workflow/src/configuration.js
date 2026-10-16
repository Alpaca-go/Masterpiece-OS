import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWriteJsonWithRetry } from './runtime/runtime/atomic-write.js';

export async function readJson(file, fallback) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' && fallback !== undefined) return fallback; throw error; }
}
export async function writeJson(file, value) {
  const result = await atomicWriteJsonWithRetry(file, value);
  if (!result.success) throw new Error('独立视觉工作流写入失败');
}
export function assertId(id) {
  if (!/^[a-f0-9-]{36}$/iu.test(String(id))) throw new Error('VISUAL_WORKFLOW_ID_INVALID');
  return id;
}
export function inside(root, relative) {
  const result = path.resolve(root, relative);
  if (result !== path.resolve(root) && !result.startsWith(path.resolve(root) + path.sep)) throw new Error('VISUAL_WORKFLOW_PATH_INVALID');
  return result;
}

export function createConfiguration(root) {
  const filename = path.join(root, 'settings.json');
  const credentialsRoot = path.join(root, 'credentials');
  const defaults = () => ({ profiles: [], analysisProfileId: null, imageProfileId: null, cacheEnabled: true });
  let mutation = Promise.resolve();
  const serial = (action) => { const next = mutation.then(action); mutation = next.catch(() => {}); return next; };
  async function key() {
    const file = path.join(credentialsRoot, 'master.key');
    await fs.mkdir(credentialsRoot, { recursive: true });
    await fs.writeFile(file, crypto.randomBytes(32), { flag: 'wx', mode: 0o600 }).catch(error => { if (error.code !== 'EEXIST') throw error; });
    const bytes = await fs.readFile(file);
    if (bytes.length !== 32) throw new Error('VISUAL_WORKFLOW_CREDENTIAL_KEY_INVALID');
    return bytes;
  }
  async function secret(id, value) {
    assertId(id);
    const file = path.join(credentialsRoot, `${id}.bin`);
    if (value !== undefined) {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', await key(), iv);
      const bytes = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
      await fs.writeFile(file, Buffer.concat([iv, cipher.getAuthTag(), bytes]), { mode: 0o600 });
      return;
    }
    const bytes = await fs.readFile(file);
    const decipher = crypto.createDecipheriv('aes-256-gcm', await key(), bytes.subarray(0, 12));
    decipher.setAuthTag(bytes.subarray(12, 28));
    return Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8');
  }
  async function get() {
    const settings = await readJson(filename, defaults());
    return { ...settings, defaultDataPath: path.join(root, 'data'), logLevel: 'info', defaultProfileId: settings.analysisProfileId,
      profiles: settings.profiles.map(profile => ({ ...profile, isDefault: profile.id === settings.analysisProfileId, hasApiKey: true, isEnabled: true })) };
  }
  async function saveProfile(input) {
    return serial(async () => {
      if (!['analysis', 'image_generation'].includes(input.modelType)) throw new Error('请选择分析或生图模型类型');
      const url = new URL(input.baseUrl);
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('Base URL 无效');
      if (!String(input.modelId || '').trim()) throw new Error('Model ID 不能为空');
      const settings = await readJson(filename, defaults());
      const id = input.id ? assertId(input.id) : crypto.randomUUID();
      if (input.id && !settings.profiles.some(item => item.id === id)) throw new Error('独立模型配置不存在');
      if (input.apiKey) await secret(id, input.apiKey.trim());
      else await secret(id);
      const profile = { id, name: String(input.name || input.modelId), provider: String(input.provider || 'openai-compatible'), modelId: input.modelId.trim(), baseUrl: url.toString().replace(/\/$/u, ''), modelType: input.modelType, protocol: input.protocol || (input.modelType === 'analysis' ? 'openai-chat-multimodal' : 'seedream-image') };
      settings.profiles = [...settings.profiles.filter(item => item.id !== id), profile];
      settings[input.modelType === 'analysis' ? 'analysisProfileId' : 'imageProfileId'] = id;
      await writeJson(filename, settings);
      return get();
    });
  }
  async function select(input) {
    return serial(async () => {
      const settings = await readJson(filename, defaults());
      for (const [field, type] of [['analysisProfileId', 'analysis'], ['imageProfileId', 'image_generation']]) {
        if (input[field] !== undefined) {
          if (!settings.profiles.some(p => p.id === input[field] && p.modelType === type)) throw new Error('独立模型配置类型不匹配');
          settings[field] = input[field];
        }
      }
      if (input.cacheEnabled !== undefined) settings.cacheEnabled = input.cacheEnabled === true;
      await writeJson(filename, settings);
      return get();
    });
  }
  async function readCredentials(id) {
    const settings = await get();
    const profile = settings.profiles.find(p => p.id === (id || settings.analysisProfileId));
    if (!profile) throw new Error('请先配置独立视觉工作流的模型');
    return { ...profile, profileId: profile.id, model: profile.modelId, apiKey: await secret(profile.id) };
  }
  return { get, saveProfile, select, readCredentials };
}
