// Compatibility re-export shim (R9 Productionization).
//
// The production Space Generator module now lives at
// packages/image-generation-runtime/src/space/ (R9 formalization of the
// Phase 9B-quality compiler). This shim preserves the historical
// `vnext/space-quality` import path so existing tests, scripts and the
// desktop service keep working unchanged. New code should import from
// `@masterpiece/image-generation-runtime/space/index.js` (or the package
// index) instead.
export * from '../../space/index.js';
