// Provider Adapter (Packaging serialization boundary) — P2-E Final.
//
// Capability boundary:
//   Canonical Compiled Packaging Prompt (from compiler.js)
//   + Packaging Provider Capability (from provider-capability.js)
//   + PackagingTranslation (P2-A; for the authoritative reference
//     surface + providerHints surface)
//     -> deterministic provider-ready payload
//
// This module is the ONLY place in the Packaging pipeline that
// flattens the canonical 14-block topology into a provider-facing
// payload. It is provider-agnostic: it does not branch on a specific
// provider / model / protocol. The actual network call lives in
// the existing image-generation-runtime + image-provider-* adapter
// surface (Shared Generation Core); P2-G integrates that runtime
// with the Packaging pipeline.
//
// Data-closure contract (P2-E Finalization Delta, items 1, 2, 3):
//
//   - payload.references is sourced from
//     translation.referencePolicy.references verbatim. Every entry
//     preserves { assetId, role, source }. The adapter NEVER infers
//     references from the compiled prompt text.
//
//   - payload.promptSourceMap is the compiled.sourceMap object
//     preserved verbatim. The adapter does NOT re-shape it.
//
//   - payload.hints is sourced from translation.providerHints
//     verbatim. The adapter does NOT infer hints from the compiled
//     prompt text or any other surface.
//
//   - The adapter is read-only on the three inputs. It does not
//     mutate the compiled, capability, or translation shapes.
//
// Consistency gate (P2-E Finalization Delta, item 6):
//
//   capability.referenceCount must equal
//   translation.referencePolicy.references.length. A drift
//   surfaces as PROVIDER_CAPABILITY_MISMATCH.
//
// Determinism contract (P2-E Finalization Delta, item 7):
//
//   Same (compiled, capability, translation) -> deepEqual payload.
//   No timestamp / local path / temp path / UUID / secret in the
//   output shape. payload is Object.freeze'd.
//
// Stop conditions honoured (P2 spec §20 §58 §59):
//   - does not call a model
//   - does not import any Golden project asset
//   - does not invent a second adapter / credential / retry stack
//   - does not re-author the canonical prompt
//   - does not resolve assetId to a local path / URL

import { PACKAGING_PROMPT_BLOCKS } from './compiler.js';
import {
  PROVIDER_CAPABILITY_MISMATCH,
  REFERENCE_UNSUPPORTED,
} from './provider-capability.js';

export const PACKAGING_PROVIDER_ADAPTER_VERSION = '1.0.0';

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  if (value == null) return [];
  if (Array.isArray(value)) return value.slice();
  return [value];
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Flatten a Compiled Packaging Prompt into a deterministic provider
 * prompt string. The 14 blocks are rendered in their canonical
 * order with explicit boundaries (`## A. ...`, `## B. ...`, etc.).
 * No block is dropped, reordered, or rewritten. The function is a
 * pure function of the input — the same compiled representation
 * yields the same string.
 */
export function flattenCompiledPromptToString(compiled) {
  if (!isPlainObject(compiled)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'flatten input is not an object', ['flatten_input_not_object']);
  }
  if (!Array.isArray(compiled.blocks) || compiled.blocks.length === 0) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'compiled.blocks is missing or empty', ['flatten_blocks_empty']);
  }
  if (compiled.blocks.length !== PACKAGING_PROMPT_BLOCKS.length) {
    throw newError(
      PROVIDER_CAPABILITY_MISMATCH,
      `compiled block count ${compiled.blocks.length} does not match the canonical ${PACKAGING_PROMPT_BLOCKS.length}`,
      ['flatten_block_count_mismatch'],
    );
  }
  for (let i = 0; i < compiled.blocks.length; i += 1) {
    if (compiled.blocks[i].id !== PACKAGING_PROMPT_BLOCKS[i][0]) {
      throw newError(
        PROVIDER_CAPABILITY_MISMATCH,
        `block at index ${i} is ${compiled.blocks[i].id}; expected ${PACKAGING_PROMPT_BLOCKS[i][0]}`,
        ['flatten_block_order_violation'],
      );
    }
  }
  const sections = compiled.blocks.map((b) => {
    const lines = asArray(b.items);
    if (lines.length === 0) return `## ${b.title}`;
    return `## ${b.title}\n${lines.join('\n')}`;
  });
  return sections.join('\n\n') + '\n';
}

/**
 * Build a provider-agnostic payload skeleton. The Shared Provider
 * layer (P2-G) is responsible for projecting this skeleton to a
 * specific protocol (Seedream / Gemini / OpenAI / etc.).
 *
 * @param {object} input
 * @param {object} input.compiled    - the output of compilePackagingPrompt
 * @param {object} input.capability  - the result of resolvePackagingProviderCapability
 * @param {object} input.translation - the validated PackagingTranslation (P2-A)
 * @returns {object} payload
 *
 * Throws PROVIDER_CAPABILITY_MISMATCH / REFERENCE_UNSUPPORTED on:
 *   - capability not accepted
 *   - compiled / capability / translation shape drift
 *   - capability.referenceCount != translation.referencePolicy.references.length
 *   - any block boundary / order violation in compiled
 */
export function buildPackagingProviderPayload(input = {}) {
  if (!isPlainObject(input)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'payload input is not an object', ['payload_input_not_object']);
  }
  const compiled = input.compiled;
  const capability = input.capability;
  const translation = input.translation;
  if (!isPlainObject(compiled)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'compiled is not an object', ['compiled_not_object']);
  }
  if (!isPlainObject(capability)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'capability is not an object', ['capability_not_object']);
  }
  if (!isPlainObject(translation)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'translation is not an object', ['translation_not_object']);
  }
  if (!isPlainObject(translation.referencePolicy)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'translation.referencePolicy is not an object', ['reference_policy_not_object']);
  }
  if (!isPlainObject(translation.providerHints)) {
    throw newError(PROVIDER_CAPABILITY_MISMATCH, 'translation.providerHints is not an object', ['provider_hints_not_object']);
  }

  // 1. Capability acceptance gate.
  if (capability.accepted !== true) {
    const code = capability.rejectionCode || PROVIDER_CAPABILITY_MISMATCH;
    const err = newError(
      code,
      capability.rejectionReason || 'capability not accepted',
      Array.isArray(capability.issues) ? capability.issues.slice() : [],
    );
    err.capability = capability;
    throw err;
  }

  // 2. Consistency gate: capability.referenceCount must equal
  //    translation.referencePolicy.references.length. A drift
  //    surfaces as PROVIDER_CAPABILITY_MISMATCH.
  const translationReferences = Array.isArray(translation.referencePolicy.references)
    ? translation.referencePolicy.references
    : [];
  if (capability.referenceCount !== translationReferences.length) {
    throw newError(
      PROVIDER_CAPABILITY_MISMATCH,
      `capability.referenceCount (${capability.referenceCount}) does not match translation.referencePolicy.references.length (${translationReferences.length})`,
      ['reference_count_drift'],
    );
  }

  // 3. Reference closure: from translation.referencePolicy.references
  //    verbatim. Each entry preserves { assetId, role, source }.
  //    The adapter does NOT infer references from the compiled
  //    prompt text; the Translation is the authoritative reference
  //    surface (P2 spec §15 + P2-A referencePolicy output).
  const references = translationReferences.map((r) => ({
    assetId: asString(r.assetId),
    role: asString(r.role),
    source: asString(r.source),
  }));

  // 4. Hints closure: from translation.providerHints verbatim.
  //    The Translation is the only hints authority (P2 spec §9 +
  //    P2-A buildProviderHints single-source rule).
  const hints = {
    aspectRatio: asString(translation.providerHints.aspectRatio),
    imageSize: asString(translation.providerHints.imageSize),
    qualityProfile: asString(translation.providerHints.qualityProfile),
    referenceRolePriority: asArray(translation.providerHints.referenceRolePriority),
    referenceCount: asNumber(translation.providerHints.referenceCount, 0),
  };

  // 5. SourceMap closure: from compiled.sourceMap (object). The
  //    Compiler emits sourceMap as { blockId: source[] }; preserve
  //    the object verbatim.
  const promptSourceMap = isPlainObject(compiled.sourceMap) ? compiled.sourceMap : {};

  // 6. Flatten: deterministic, provider-agnostic prompt string.
  const prompt = flattenCompiledPromptToString(compiled);

  // 7. Block order: from compiled.blockOrder.
  const promptBlockOrder = Array.isArray(compiled.blockOrder) ? compiled.blockOrder : [];

  const payload = {
    schemaVersion: '1.0',
    adapterVersion: PACKAGING_PROVIDER_ADAPTER_VERSION,
    modelId: asString(capability.modelId),
    provider: asString(capability.provider),
    protocol: asString(capability.protocol),
    modelType: asString(capability.modelType),
    packagingSupport: capability.packagingSupport === true,
    referenceSupport: capability.referenceSupport === true,
    maxReferenceImages: capability.maxReferenceImages,
    referenceCount: capability.referenceCount,
    prompt,
    promptSourceMap,
    promptBlockOrder,
    references,
    hints,
  };
  return Object.freeze(payload);
}

function newError(code, message, issues) {
  const err = new Error(`${code}: ${message}`);
  err.code = code;
  err.issues = Array.isArray(issues) ? issues.slice() : [];
  return err;
}

/**
 * Snapshot helper for tests: returns a structural fingerprint of
 * the adapter's canonical fields.
 */
export function getPackagingProviderAdapterFingerprint() {
  return Object.freeze({
    schemaVersion: PACKAGING_PROVIDER_ADAPTER_VERSION,
  });
}
