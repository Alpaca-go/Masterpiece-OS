// Browser-safe Packaging values for renderer consumers.
//
// Keep this module deliberately narrow: importing the runtime-core root barrel
// also evaluates Node-only checkpoint and generation branches. The canonical
// role vocabulary remains owned by the frozen P2 Reference Policy; this seam
// only re-exports that single authority for browser code.
export {
  PACKAGING_REFERENCE_ROLES,
} from '@masterpiece/image-generation-runtime/packaging/reference-policy.js';
