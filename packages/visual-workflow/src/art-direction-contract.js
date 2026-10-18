import crypto from 'node:crypto';
import { ART_DIRECTION_MODELS, SEEDREAM_MAX_REFERENCE_IMAGES } from './image-adapter/reference-capability.js';

export const ART_DIRECTION_BOUNDARY = 'ART DIRECTION REFERENCE BOUNDARY';
export const ART_DIRECTION_SOURCE = 'approved_art_direction_explicit';
export const ART_DIRECTION_ROLE = 'approved_art_direction_reference';
export const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export function artDirectionError(code) { return Object.assign(new Error(code), { code }); }
export function assertArtDirectionModel(model, protocol = 'seedream-image') {
  if (protocol !== 'seedream-image' || !ART_DIRECTION_MODELS.includes(model)) throw artDirectionError('ART_DIRECTION_MODEL_UNSUPPORTED');
}
export function assertArtDirectionSnapshot(snapshot, projectId, ids) {
  if (!snapshot || snapshot.projectId !== projectId || snapshot.authorization?.status !== 'confirmed' || !snapshot.authorization.source || !/^[a-f0-9]{64}$/u.test(snapshot.authorization.sourceDocumentSha256 || '') || !/^[a-f0-9]{64}$/u.test(snapshot.confirmationSha256 || '')) throw artDirectionError('ART_DIRECTION_AUTHORIZATION_INVALID');
  assertArtDirectionModel(snapshot.model);
  const assets = snapshot.assets;
  if (!Array.isArray(assets) || !assets.length || assets.length > SEEDREAM_MAX_REFERENCE_IMAGES || !Array.isArray(ids) || ids.length !== assets.length || new Set(ids).size !== ids.length || new Set(assets.map(item => item.sha256)).size !== assets.length) throw artDirectionError('ART_DIRECTION_SELECTION_INVALID');
  for (const [index, asset] of assets.entries()) {
    if (!Number.isSafeInteger(asset.sizeBytes) || asset.sizeBytes <= 0 || asset.sizeBytes > 30 * 1024 * 1024) throw artDirectionError('ART_DIRECTION_SIZE_INVALID');
    if (asset.id !== ids[index] || asset.projectId !== projectId || asset.role !== ART_DIRECTION_ROLE || asset.authorizationStatus !== 'confirmed' || !['architectural_form','spatial_integration','material_optics','spatial_atmosphere'].includes(asset.responsibility) || typeof asset.direction !== 'string' || !asset.direction.trim() || asset.direction.length > 1500 || !/^[a-f0-9]{64}$/u.test(asset.sha256 || '') || !['image/png','image/jpeg','image/webp'].includes(asset.mimeType)) throw artDirectionError('ART_DIRECTION_ASSET_INVALID');
  }
  const { snapshotSha256, ...content } = snapshot;
  if (snapshotSha256 !== digest(content)) throw artDirectionError('ART_DIRECTION_SNAPSHOT_INVALID');
  return snapshot;
}
export function renderArtDirectionBoundary(task) {
  const snapshot = assertArtDirectionSnapshot(task.artDirection, task.projectId, task.referenceAssetIds);
  return [ART_DIRECTION_BOUNDARY,
    `Target scene: ${task.subtype}. The current user-confirmed project direction is authoritative.`,
    'Use the following explicitly selected images only for their assigned attributes, in this exact input order:',
    ...snapshot.assets.map((asset, index) => `Image ${index + 1}: ${asset.responsibility}; ${asset.direction}.`),
    'Transfer the assigned architectural and optical attributes, not a collage or exact layout. Keep one primary artistic system and the requested functional program, circulation and privacy.',
    'Do not copy visible logos, brand text, signage or watermarks. Identity remains post-composite. Rejected comparisons and identity assets are not positive references.',
    'Unprovided dimensions, material manufacture and mounting remain unknown. No reference weight, strength or role-control parameter is assumed.'
  ].join('\n');
}
export function artDirectionReferencePolicy(task, count, mode, sources) {
  assertArtDirectionSnapshot(task.artDirection,task.projectId,task.referenceAssetIds);
  return count === task.referenceAssetIds.length && mode === 'reference_assisted' && sources?.length === count && sources.every(source => source === ART_DIRECTION_SOURCE);
}
