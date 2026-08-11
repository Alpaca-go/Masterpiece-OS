// COMPATIBILITY_ONLY: Reference Asset Resolver ownership moved to the shared
// image-generation runtime in S4. New production code must import the shared
// capability path directly. This adapter remains for legacy Desktop imports
// until S5/S6.
export * from '@masterpiece/image-generation-runtime/reference-engine/reference-asset-resolver.ts';
