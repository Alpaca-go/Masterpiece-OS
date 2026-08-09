// Space Reference Policy (recovery doc §8, §9).
//
// Standard generation is text-only. Reference-First carries only references
// explicitly selected by the user. Implicit and architecture anchors remain
// prompt/session context and never become provider images automatically.
//
// A logo NEVER becomes a core_reference (it stays post_composite). Packaging
// assets never become space references. If nothing is available we fail closed
// with SPACE_REFERENCE_REQUIRED instead of silently generating text-only.
//
// This module is pure (no filesystem/IPC): the caller (vnext-service) supplies
// asset metadata and resolved file paths. It returns the resolved references
// plus a trace object that must be written into the run snapshot.

export const SPACE_REFERENCE_POLICY_VERSION = 'space-reference-policy@2.0.0';

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
 * @param {'standard'|'reference_first'|'continuation'} [args.generationBasis='standard']
 * @param {Array<{assetId:string, role?:string, relativePath:string}>} args.explicitAssets
 *        Assets for the user's explicit referenceAssetIds (already looked up
 *        from sourceAssetRefs by the service).
 * @param {object|null} args.implicitAnchor
 *        { imageId, projectRelativePath } from the session, or null.
 * @param {Array<{anchorId:string, imagePath:string|null}>} args.architectureAnchorImages
 *        Reference images produced by the Phase 9B compiler for selected
 *        anchors (only those with a real on-disk image).
 * @param {string} [args.continuationReferenceSource='confirmed_generated_output']
 *        Reference source label used for continuation references (R11.1).
 * @param {number} [args.maxReferences=2]
 * @returns {{ references: Array<object>, trace: object }}
 */
export function resolveSpaceReferences({
  generationBasis = 'standard',
  explicitAssets = [],
  implicitAnchor = null,
  architectureAnchorImages = [],
  continuationReferenceSource = 'confirmed_generated_output',
  maxReferences = 2,
} = {}) {
  const referenceAssisted = generationBasis === 'reference_first' || generationBasis === 'continuation';
  const trace = {
    referencePolicyVersion: SPACE_REFERENCE_POLICY_VERSION,
    generationBasis,
    referenceMode: referenceAssisted ? 'reference_assisted' : 'text_only',
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

  if (generationBasis === 'standard') {
    trace.providerReferenceCount = 0;
    return { references, trace };
  }

  // Reference-First / Continuation accept only the explicitly bound reference
  // (user-selected, or the confirmed generated output in continuation). R11.1:
  // implicit anchors and architecture anchor images are never auto-attached.
  for (const asset of explicitAssets) {
    if (!isUsableSpaceReference(asset)) continue;
    add({
      id: asset.assetId,
      role: 'core_reference',
      projectRelativePath: `input/${asset.relativePath}`,
    }, generationBasis === 'continuation' ? continuationReferenceSource : 'user_explicit');
  }

  trace.providerReferenceCount = references.length;
  return { references, trace };
}

/**
 * Enforce that a formal first space generation has at least one reference.
 * Throws SPACE_REFERENCE_REQUIRED when none could be resolved.
 */
export function assertSpaceReferenceAvailable(references, { generationBasis = 'standard' } = {}) {
  if (generationBasis === 'standard') {
    if (references?.length) {
      throw Object.assign(new Error('Standard space generation must remain text-only.'), {
        code: 'SPACE_STANDARD_REFERENCE_NOT_ALLOWED',
      });
    }
    return;
  }
  if ((generationBasis === 'reference_first' || generationBasis === 'continuation')
    && (!references || references.length === 0)) {
    throw Object.assign(
      new Error(generationBasis === 'continuation'
        ? 'SPACE_CONTINUATION_REFERENCE_REQUIRED: Continuation requires a confirmed generated output reference.'
        : 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED: Reference-First requires an explicit user-selected reference.'),
      { code: generationBasis === 'continuation' ? 'SPACE_CONTINUATION_REFERENCE_REQUIRED' : 'SPACE_REFERENCE_FIRST_REFERENCE_REQUIRED' },
    );
  }
}
