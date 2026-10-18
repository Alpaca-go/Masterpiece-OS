// Offline request feasibility only. This module is not imported by production.
// No execute method, credential store, network client or runtime route is exposed.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { createMultiModelImageAdapter } from '../src/image-adapter/multi-model.js';

export const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
export async function loadReviewReferences({ root, manifest, projectId, basis, selectedIds }) {
  if (manifest.projectId !== projectId || manifest.status !== 'confirmed' || !manifest.sourceDocumentSha256) throw new Error('REFERENCE_AUTHORITY_INVALID');
  if (!Array.isArray(selectedIds) || new Set(selectedIds).size !== selectedIds.length) throw new Error('REFERENCE_SELECTION_INVALID');
  if (basis === 'standard') {
    if (selectedIds.length) throw new Error('STANDARD_REFERENCE_FORBIDDEN');
    return [];
  }
  if (basis !== 'art_direction_reference' || selectedIds.length < 1 || selectedIds.length > 10) throw new Error('REFERENCE_ROUTE_INVALID');
  const realRoot = await fs.realpath(root);
  const references = [];
  for (const id of selectedIds) {
    const matches = manifest.images.filter(item => item.id === id);
    if (matches.length !== 1) throw new Error('REFERENCE_REGISTRATION_INVALID');
    const asset = matches[0];
    if (asset.role !== 'approved_art_direction_reference' || asset.projectId !== projectId) throw new Error('REFERENCE_ROLE_OR_PROJECT_INVALID');
    if (typeof asset.path !== 'string' || path.isAbsolute(asset.path) || asset.path.includes('\\') || asset.path.split('/').some(part => !part || part === '.' || part === '..' || part.includes(':'))) throw new Error('REFERENCE_PATH_INVALID');
    let current = realRoot;
    for (const component of asset.path.split('/')) {
      current = path.join(current, component);
      if ((await fs.lstat(current)).isSymbolicLink()) throw new Error('REFERENCE_SYMLINK_FORBIDDEN');
    }
    const real = await fs.realpath(current);
    if (!real.startsWith(realRoot + path.sep) || !(await fs.stat(real)).isFile()) throw new Error('REFERENCE_PATH_INVALID');
    const size = (await fs.stat(real)).size;
    if (!size || size > 30 * 1024 * 1024 || size !== asset.size_bytes) throw new Error('REFERENCE_SIZE_INVALID');
    const bytes = await fs.readFile(real);
    if (sha256(bytes) !== asset.sha256) throw new Error('REFERENCE_DIGEST_MISMATCH');
    const info = await sharp(bytes, { limitInputPixels: 36_000_000 }).metadata();
    const mimeType = ({ jpeg: 'image/jpeg', png: 'image/png' })[info.format];
    const extension = path.extname(real).toLowerCase();
    if (!mimeType || mimeType !== asset.mimeType || (info.format === 'png' ? extension !== '.png' : !['.jpg', '.jpeg'].includes(extension))) throw new Error('REFERENCE_FORMAT_INVALID');
    if (info.width <= 14 || info.height <= 14 || info.width / info.height < 1/16 || info.width / info.height > 16 || (info.pages || 1) !== 1) throw new Error('REFERENCE_DIMENSIONS_INVALID');
    // Decode the entire file as well as inspecting its header.
    await sharp(bytes, { limitInputPixels: 36_000_000 }).raw().toBuffer();
    references.push({ id, name: path.basename(real), mimeType, data: bytes.toString('base64'), sha256: asset.sha256, width: info.width, height: info.height, role: asset.role, projectId });
  }
  return references;
}

export async function previewArtDirectionRequest(options) {
  const references = await loadReviewReferences(options);
  const adapter = createMultiModelImageAdapter({
    adapterId: 'seedream-5.0-pro', modelId: options.model,
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', apiKey: 'OFFLINE_PLACEHOLDER'
  });
  const request = adapter.compileRequest({ prompt: options.prompt, negativeRules: [], aspectRatio: '16:9', imageSize: '2K', outputCount: 1, references });
  // Verify the actual body, not a trace-only reference count.
  const images = request.body.image || [];
  if (images.length !== references.length) throw new Error('REQUEST_REFERENCE_COUNT_MISMATCH');
  const evidence = references.map((item, index) => {
    if (images[index] !== `data:${item.mimeType};base64,${item.data}` || sha256(Buffer.from(images[index].split(',')[1], 'base64')) !== item.sha256) throw new Error('REQUEST_REFERENCE_BYTES_MISMATCH');
    const { data, ...metadata } = item;
    return { ...metadata, requestField: `image[${index}]`, decodedPayloadSha256: item.sha256 };
  });
  // Never return an Authorization header, even the placeholder.
  return { method: request.method, url: request.url, bodyKind: request.bodyKind, body: request.body,
    evidence: { status: 'offline_adapter_preview_only', productionRouteAvailable: false, modelCalls: 0,
      basis: options.basis, inputImageCount: images.length, references: evidence, requestBodySha256: sha256(JSON.stringify(request.body)) } };
}
