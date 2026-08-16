// ShortChainTypes — shared types for the Short-Chain sub-components.
//
// Phase 5.9: extracting sub-components required Family to be
// importable from outside the monolith. Moving the type alias here
// (rather than re-deriving it inside each sub-component) keeps
// a single source of truth and matches the rest of the codebase's
// type-import convention.

import type { ShortChainTaskContract } from '@masterpiece/runtime-core/application-contracts.ts';

export type Family = ShortChainTaskContract['deliverableFamily'];
