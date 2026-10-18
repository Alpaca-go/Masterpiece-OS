import { SEEDREAM_MAX_REFERENCE_IMAGES } from '../../image-adapter/reference-capability.js';
const PRODUCT_POLICY_VERSION = "space-product-policy@1.0.0";
const PRODUCT_POLICY_DEFAULT_MAX_REFERENCES = Object.freeze({
  // Standard generation is text-only. Any reference here would silently
  // change the Standard contract.
  standard: 0,
  art_direction_reference: SEEDREAM_MAX_REFERENCE_IMAGES,
  // Reference-First: the user uploaded a reference. Two is the current
  // UX ceiling; an explicit single-reference UX is possible but not in
  // the current workspace. Bump together with a UX review.
  reference_first: 2,
  // Continuation: exactly one confirmed generated output is the source.
  // This is enforced by the task contract and the route gate; the policy
  // value of 1 documents the intent.
  continuation: 1
});
function resolveProductPolicyMaxReferences(generationBasis) {
  const value = PRODUCT_POLICY_DEFAULT_MAX_REFERENCES[generationBasis];
  return typeof value === "number" ? value : 0;
}
function resolveEffectiveMaxReferences({ generationBasis, adapterCapability } = {}) {
  const productPolicyMax = resolveProductPolicyMaxReferences(generationBasis);
  const adapterMax = adapterCapability?.reference?.maxReferenceImages;
  const adapterCapabilityMax = typeof adapterMax === "number" ? adapterMax : 0;
  const effectiveMax = Math.min(productPolicyMax, adapterCapabilityMax);
  let source;
  if (productPolicyMax === 0 && adapterCapabilityMax === 0) source = "product_policy";
  else if (productPolicyMax < adapterCapabilityMax) source = "product_policy";
  else if (adapterCapabilityMax < productPolicyMax) source = "adapter_capability";
  else source = "min_intersection";
  return {
    effectiveMax,
    productPolicyMax,
    adapterCapabilityMax,
    adapterStrengthControlSupported: Boolean(
      adapterCapability?.reference?.referenceStrengthControl?.supported
    ),
    adapterRoleControlSupported: Boolean(
      adapterCapability?.reference?.referenceRoleControl?.supported
    ),
    source
  };
}
export {
  PRODUCT_POLICY_DEFAULT_MAX_REFERENCES,
  PRODUCT_POLICY_VERSION,
  resolveEffectiveMaxReferences,
  resolveProductPolicyMaxReferences
};
