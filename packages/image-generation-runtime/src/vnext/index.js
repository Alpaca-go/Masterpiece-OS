// COMPATIBILITY ONLY: temporary package-path alias for consumers of
// @masterpiece/image-generation-runtime/vnext.
// Current implementation lives in ../generation.
// Removal condition: no supported consumer imports the ./vnext subpath.
// Target phase: S7 review.
export * from '../generation/index.js';
