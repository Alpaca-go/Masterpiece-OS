// r2.0 §4.10 / B-2: Product Policy for space reference handling.
//
// This module is the seam where the BUSINESS rule for "how many reference
// images are allowed per generation basis" lives. It is intentionally
// separated from the Adapter Capability (which describes what the model
// can accept) so each can evolve independently:
//
//   effectiveMaxReferences = min(productPolicy, adapterCapability)
//
// The current values are the documented baseline. They are NOT a permanent
// business constant. Bumping any value here is a deliberate product
// decision; bumping the adapter capability requires end-to-end verification
// of the higher reference count on the target model.
//
// Phase F (evidence + similarity audit) and any future feature flags land
// here. Until then, this module is small and pure.

export const PRODUCT_POLICY_VERSION = 'space-product-policy@1.0.0';

/**
 * Per-generationBasis upper bound on the number of reference images the
 * Product allows. Adapter Capability can further lower the bound; Product
 * Policy never raises it.
 */
export const PRODUCT_POLICY_DEFAULT_MAX_REFERENCES = Object.freeze({
  // Standard generation is text-only. Any reference here would silently
  // change the Standard contract.
  standard: 0,
  // Reference-First: the user uploaded a reference. Two is the current
  // UX ceiling; an explicit single-reference UX is possible but not in
  // the current workspace. Bump together with a UX review.
  reference_first: 2,
  // Continuation: exactly one confirmed generated output is the source.
  // This is enforced by the task contract and the route gate; the policy
  // value of 1 documents the intent.
  continuation: 1,
});

/**
 * @param {string} generationBasis
 * @returns {number} the Product Policy upper bound, or 0 for unknown basis
 */
export function resolveProductPolicyMaxReferences(generationBasis) {
  const value = PRODUCT_POLICY_DEFAULT_MAX_REFERENCES[generationBasis];
  return typeof value === 'number' ? value : 0;
}

/**
 * Combine Product Policy with the live Adapter Capability to produce the
 * effective upper bound the caller should use. Missing capability is
 * treated as zero, which makes a missing capability declaration a
 * fail-closed decision (we never pass more than the adapter explicitly
 * declares it can accept).
 *
 * @param {object} input
 * @param {string} input.generationBasis
 * @param {object|null|undefined} input.adapterCapability
 *        ShortChainAdapterCapability shape, or null when the adapter did not
 *        declare one. Unknown adapters get a 0 bound.
 * @returns {{
 *   effectiveMax: number,
 *   productPolicyMax: number,
 *   adapterCapabilityMax: number,
 *   adapterStrengthControlSupported: boolean,
 *   adapterRoleControlSupported: boolean,
 *   source: 'product_policy' | 'adapter_capability' | 'min_intersection'
 * }}
 */
export function resolveEffectiveMaxReferences({ generationBasis, adapterCapability } = {}) {
  const productPolicyMax = resolveProductPolicyMaxReferences(generationBasis);
  const adapterMax = adapterCapability?.reference?.maxReferenceImages;
  const adapterCapabilityMax = typeof adapterMax === 'number' ? adapterMax : 0;
  const effectiveMax = Math.min(productPolicyMax, adapterCapabilityMax);
  let source;
  if (productPolicyMax === 0 && adapterCapabilityMax === 0) source = 'product_policy';
  else if (productPolicyMax < adapterCapabilityMax) source = 'product_policy';
  else if (adapterCapabilityMax < productPolicyMax) source = 'adapter_capability';
  else source = 'min_intersection';
  return {
    effectiveMax,
    productPolicyMax,
    adapterCapabilityMax,
    adapterStrengthControlSupported: Boolean(
      adapterCapability?.reference?.referenceStrengthControl?.supported,
    ),
    adapterRoleControlSupported: Boolean(
      adapterCapability?.reference?.referenceRoleControl?.supported,
    ),
    source,
  };
}
