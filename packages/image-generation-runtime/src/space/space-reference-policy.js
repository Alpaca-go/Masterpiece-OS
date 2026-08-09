// Space Reference Policy (recovery doc §8, §9).
//
// First formal space generation MUST carry at least one non-logo core
// reference. Resolution priority:
//   1. User explicit reference (uploaded/selected in the workbench)
//   2. Implicit anchor / project anchor image (a previously confirmed result)
//   3. Selected architecture anchor image from the built-in registry
//
// A logo NEVER becomes a core_reference (it stays post_composite). Packaging
// assets never become space references. If nothing is available we fail closed
// with SPACE_REFERENCE_REQUIRED instead of silently generating text-only.
//
// This module is pure (no filesystem/IPC): the caller (vnext-service) supplies
// asset metadata and resolved file paths. It returns the resolved references
// plus a trace object that must be written into the run snapshot.

export const SPACE_REFERENCE_POLICY_VERSION = 'space-reference-policy@1.0.0';

const NON_REFERENCE_ROLES = new Set(['logo', 'package_structure', 'dieline', 'icon']);

function isUsableSpaceReference(asset) {
  if (!asset) return false;
  if (NON_REFERENCE_ROLES.has(asset.role)) return false;
  if (typeof asset.relativePath === 'string' && /\.(pdf)$/iu.test(asset.relativePath)) return false;
  return true;
}

/**
 * Resolve the reference(s) to attach to a first space generation.
 *
 * @param {object} args
 * @param {Array<{assetId:string, role?:string, relativePath:string}>} args.explicitAssets
 *        Assets for the user's explicit referenceAssetIds (already looked up
 *        from sourceAssetRefs by the service).
 * @param {object|null} args.implicitAnchor
 *        { imageId, projectRelativePath } from the session, or null.
 * @param {Array<{anchorId:string, imagePath:string|null}>} args.architectureAnchorImages
 *        Reference images produced by the Phase 9B compiler for selected
 *        anchors (only those with a real on-disk image).
 * @param {number} [args.maxReferences=2]
 * @returns {{ references: Array<object>, trace: object }}
 */
export function resolveSpaceReferences({
  explicitAssets = [],
  implicitAnchor = null,
  architectureAnchorImages = [],
  maxReferences = 2,
} = {}) {
  const trace = {
    referencePolicyVersion: SPACE_REFERENCE_POLICY_VERSION,
    explicitAssetIds: explicitAssets.map((a) => a.assetId),
    implicitAnchorId: implicitAnchor?.imageId ?? null,
    architectureAnchorIds: architectureAnchorImages.map((a) => a.anchorId),
    providerReferences: [],
  };

  const references = [];
  const add = (ref, source) => {
    if (references.length >= maxReferences) return;
    if (references.some((r) => r.id === ref.id)) return;
    references.push({ ...ref, source });
    trace.providerReferences.push({
      id: ref.id,
      role: ref.role,
      source,
      projectRelativePath: ref.projectRelativePath,
    });
  };

  // Priority 1: user explicit references.
  for (const asset of explicitAssets) {
    if (!isUsableSpaceReference(asset)) continue;
    add({
      id: asset.assetId,
      role: 'core_reference',
      projectRelativePath: `input/${asset.relativePath}`,
    }, 'user_explicit');
  }

  // Priority 2: implicit anchor (previously confirmed result).
  if (implicitAnchor && references.length < maxReferences) {
    add({
      id: implicitAnchor.imageId,
      role: 'core_reference',
      projectRelativePath: implicitAnchor.projectRelativePath,
    }, 'implicit_anchor');
  }

  // Priority 3: built-in architecture anchor images.
  for (const img of architectureAnchorImages) {
    if (!img.imagePath || references.length >= maxReferences) break;
    add({
      id: img.anchorId,
      role: 'core_reference',
      projectRelativePath: img.imagePath,
    }, 'architecture_anchor');
  }

  trace.providerReferenceCount = references.length;
  return { references, trace };
}

/**
 * Enforce that a formal first space generation has at least one reference.
 * Throws SPACE_REFERENCE_REQUIRED when none could be resolved.
 */
export function assertSpaceReferenceAvailable(references, { bypass = false } = {}) {
  if (bypass) return;
  if (!references || references.length === 0) {
    throw Object.assign(
      new Error('SPACE_REFERENCE_REQUIRED: first formal space generation requires a core reference (user reference, implicit anchor, or architecture anchor).'),
      { code: 'SPACE_REFERENCE_REQUIRED' },
    );
  }
}
