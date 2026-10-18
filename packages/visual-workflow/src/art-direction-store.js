import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { inside, readJson, writeJson } from './configuration.js';
import { applyUserConfirmedVisualDecision } from './generation-runtime/generation/user-confirmed-visual-decision.js';
import { ART_DIRECTION_ROLE, digest, artDirectionError, assertArtDirectionModel, assertArtDirectionSnapshot } from './art-direction-contract.js';
import { SEEDREAM_MAX_REFERENCE_IMAGES } from './image-adapter/reference-capability.js';

const registryPath = 'project-context/art-direction/references.json';
const confirmationPath = 'project-context/user-confirmed-visual-decision.json';
async function safeFile(root, relative) {
  if ((await fs.lstat(root)).isSymbolicLink()) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
  if (typeof relative !== 'string' || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
  const realRoot = await fs.realpath(root);
  let file = realRoot;
  for (const part of relative.split('/')) {
    file = path.join(file, part);
    if ((await fs.lstat(file)).isSymbolicLink()) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
  }
  const real = await fs.realpath(file);
  if (!real.startsWith(realRoot + path.sep) || !(await fs.stat(real)).isFile()) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
  return real;
}
async function inspect(bytes, mimeType) {
  if (!bytes.length || bytes.length > 30 * 1024 * 1024) throw artDirectionError('ART_DIRECTION_SIZE_INVALID');
  const info = await sharp(bytes, { limitInputPixels: 36_000_000 }).metadata();
  if (({png:'image/png',jpeg:'image/jpeg',webp:'image/webp'})[info.format] !== mimeType || (info.pages || 1) !== 1) throw artDirectionError('ART_DIRECTION_TYPE_INVALID');
  if (info.width <= 14 || info.height <= 14 || info.width / info.height < 1/16 || info.width / info.height > 16) throw artDirectionError('ART_DIRECTION_DIMENSIONS_INVALID');
  await sharp(bytes, { limitInputPixels: 36_000_000 }).raw().toBuffer();
  return {width:info.width,height:info.height};
}
async function safeDirectory(root, relative) {
  if ((await fs.lstat(root)).isSymbolicLink()) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
  let directory = await fs.realpath(root);
  for (const component of relative.split('/')) {
    directory = path.join(directory,component);
    const stat = await fs.lstat(directory).catch(error=>{if(error.code==='ENOENT') return null;throw error;});
    if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
    if (!stat) await fs.mkdir(directory);
  }
  return directory;
}
export function createArtDirectionStore(projects) {
  async function register(input) {
    const project = await projects.get(input.projectId);
    if (project.status === 'running') throw artDirectionError('ART_DIRECTION_PROJECT_BUSY');
    const root = (await projects.paths(input.projectId)).root;
    const authorization = input.authorization;
    if (authorization?.projectId && authorization.projectId !== input.projectId) throw artDirectionError('ART_DIRECTION_PROJECT_MISMATCH');
    if (authorization?.status !== 'confirmed' || !authorization.source || !/^[a-f0-9]{64}$/u.test(authorization.sourceDocumentSha256 || '')) throw artDirectionError('ART_DIRECTION_AUTHORIZATION_INVALID');
    if (!Array.isArray(input.images) || !input.images.length || input.images.length > SEEDREAM_MAX_REFERENCE_IMAGES) throw artDirectionError('ART_DIRECTION_SELECTION_INVALID');
    const packet = await readJson(await safeFile(root,'project-context/visual-decision-packet.json'));
    if (packet.projectId !== input.projectId) throw artDirectionError('ART_DIRECTION_PROJECT_MISMATCH');
    applyUserConfirmedVisualDecision(packet,input.confirmation,input.projectId,'space');
    if (!input.confirmation || input.confirmation.appliesTo?.deliverableFamilies?.join(',') !== 'space') throw artDirectionError('ART_DIRECTION_CONFIRMATION_REQUIRED');
    // Validate the whole batch before creating any asset or changing a directive.
    const seen = new Set();
    const prepared = [];
    const logoHashes = new Set((project.assets || []).filter(item => item.role === 'logo' || packet.lockedAssets?.some(locked => locked.type === 'logo' && locked.assetId === item.id)).map(item => item.sha256));
    for (const image of input.images) {
      if (image.projectId && image.projectId !== input.projectId) throw artDirectionError('ART_DIRECTION_PROJECT_MISMATCH');
      if (image.role !== ART_DIRECTION_ROLE || image.authorizationStatus !== 'confirmed' || !['architectural_form','spatial_integration','material_optics','spatial_atmosphere'].includes(image.responsibility) || !String(image.direction || '').trim() || image.direction.length > 1500) throw artDirectionError('ART_DIRECTION_ASSET_INVALID');
      if (typeof image.content !== 'string' || image.content.length > 42 * 1024 * 1024) throw artDirectionError('ART_DIRECTION_UPLOAD_INVALID');
      const bytes = Buffer.from(image.content,'base64');
      // Canonical round-trip validation is linear even for multi-megabyte images.
      if (bytes.toString('base64') !== image.content) throw artDirectionError('ART_DIRECTION_UPLOAD_INVALID');
      if (bytes.length !== image.sizeBytes || digest(bytes) !== image.sha256 || seen.has(image.sha256) || logoHashes.has(image.sha256)) throw artDirectionError('ART_DIRECTION_DIGEST_OR_DUPLICATE_INVALID');
      seen.add(image.sha256);
      const dimensions = await inspect(bytes,image.mimeType);
      const extension = ({'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp'})[image.mimeType];
      if (!extension || !((image.mimeType === 'image/jpeg' ? ['.jpg','.jpeg'] : [extension]).includes(path.extname(image.name || '').toLowerCase()))) throw artDirectionError('ART_DIRECTION_TYPE_INVALID');
      const id = crypto.randomUUID();
      prepared.push({bytes,asset:{id,originalName:path.basename(image.name),projectId:input.projectId,role:ART_DIRECTION_ROLE,authorizationStatus:'confirmed',responsibility:image.responsibility,direction:image.direction.trim(),sha256:image.sha256,mimeType:image.mimeType,sizeBytes:bytes.length,...dimensions,relativePath:`project-context/art-direction/assets/${id}${extension}`}});
    }
    // An explicit registration replaces the selection registry, never historical files.
    // Old image files remain recoverable; an existing compilation becomes stale.
    await safeDirectory(root,'project-context/art-direction/assets');
    for (const relative of [registryPath,confirmationPath]) {
      const stat = await fs.lstat(inside(root,relative)).catch(error=>{if(error.code==='ENOENT') return null;throw error;});
      if (stat && (stat.isSymbolicLink() || !stat.isFile())) throw artDirectionError('ART_DIRECTION_PATH_INVALID');
    }
    for (const item of prepared) await fs.writeFile(inside(root,item.asset.relativePath),item.bytes,{flag:'wx'});
    const registry = {projectId:input.projectId,authorization:{status:'confirmed',source:authorization.source,sourceDocumentSha256:authorization.sourceDocumentSha256},confirmationSha256:digest(input.confirmation),assets:prepared.map(item => item.asset)};
    await writeJson(inside(root,registryPath),registry);
    await writeJson(inside(root,confirmationPath),input.confirmation);
    return registry;
  }
  async function capture(projectId, ids, model) {
    assertArtDirectionModel(model);
    const root = (await projects.paths(projectId)).root;
    const registry = await readJson(await safeFile(root,registryPath));
    const confirmation = await readJson(await safeFile(root,confirmationPath));
    if (registry.projectId !== projectId || confirmation.projectId !== projectId || confirmation.status !== 'confirmed' || digest(confirmation) !== registry.confirmationSha256) throw artDirectionError('ART_DIRECTION_CONFIRMATION_STALE');
    if (!Array.isArray(ids) || !ids.length || ids.length > SEEDREAM_MAX_REFERENCE_IMAGES || new Set(ids).size !== ids.length) throw artDirectionError('ART_DIRECTION_SELECTION_INVALID');
    const assets = ids.map(id => {
      const matches = registry.assets.filter(asset => asset.id === id);
      if (matches.length !== 1) throw artDirectionError('ART_DIRECTION_REFERENCE_MISSING');
      return matches[0];
    });
    const content = {projectId,model,authorization:registry.authorization,confirmationSha256:registry.confirmationSha256,registrySha256:digest(registry),assets};
    const snapshot = {...content,snapshotSha256:digest(content)};
    assertArtDirectionSnapshot(snapshot,projectId,ids);
    const references = [];
    const project = await projects.get(projectId);
    const logoHashes = new Set((project.assets || []).filter(item=>item.role==='logo').map(item=>item.sha256));
    for (const asset of assets) {
      if (!asset.relativePath.startsWith('project-context/art-direction/assets/') || logoHashes.has(asset.sha256)) throw artDirectionError('ART_DIRECTION_ASSET_INVALID');
      const file = await safeFile(root,asset.relativePath);
      if (!({'image/png':['.png'],'image/jpeg':['.jpg','.jpeg'],'image/webp':['.webp']})[asset.mimeType]?.includes(path.extname(file).toLowerCase())) throw artDirectionError('ART_DIRECTION_TYPE_INVALID');
      if ((await fs.stat(file)).size !== asset.sizeBytes) throw artDirectionError('ART_DIRECTION_SIZE_INVALID');
      const bytes = await fs.readFile(file);
      if (digest(bytes) !== asset.sha256) throw artDirectionError('ART_DIRECTION_ASSET_CHANGED');
      const dimensions = await inspect(bytes,asset.mimeType);
      if (dimensions.width !== asset.width || dimensions.height !== asset.height) throw artDirectionError('ART_DIRECTION_DIMENSIONS_INVALID');
      references.push({...asset,data:bytes.toString('base64'),name:path.basename(file)});
    }
    return {snapshot,references,confirmation};
  }
  async function resolve(snapshot, projectId, model) {
    assertArtDirectionSnapshot(snapshot,projectId,snapshot?.assets?.map(item=>item.id));
    if (model !== snapshot.model) throw artDirectionError('ART_DIRECTION_MODEL_CHANGED');
    const current = await capture(projectId,snapshot.assets.map(item=>item.id),model);
    if (current.snapshot.snapshotSha256 !== snapshot.snapshotSha256) throw artDirectionError('ART_DIRECTION_SNAPSHOT_STALE');
    return current;
  }
  return {register,capture,resolve};
}
