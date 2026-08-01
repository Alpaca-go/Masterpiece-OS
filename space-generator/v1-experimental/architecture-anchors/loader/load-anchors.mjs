// Architecture Anchor Loader v1 (Phase 8A)
// 用法:
//   import { loadArchitectureAnchors, getAnchorsAsInContextReference } from '.../load-anchors.mjs';
//   const anchors = loadArchitectureAnchors('jiuzhou-aesthetics');
//   const refList = getAnchorsAsInContextReference('jiuzhou-aesthetics', 3);
//
// 不调 Provider, 不污染生产代码.
// Registry source: ../registry.json (Phase 8A 新增).
// Source-of-truth: 各 brand 子目录的 metadata.yaml + architecture-dna-analysis.yaml (Phase 1+2 已存在).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const registryPath = join(__dirname, '..', 'registry.json');

let registryCache = null;

function loadRegistry() {
  if (registryCache) return registryCache;
  if (!existsSync(registryPath)) {
    throw new Error(`Anchor registry not found: ${registryPath}`);
  }
  registryCache = JSON.parse(readFileSync(registryPath, 'utf8'));
  return registryCache;
}

/**
 * Load architecture anchors for a given brand.
 * @param brandKey  e.g. 'jiuzhou-aesthetics'
 * @returns array of {id, role, primaryMechanism, secondaryMechanism, imagePath, weight}
 *          or [] if brand has no anchors
 */
export function loadArchitectureAnchors(brandKey) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('loadArchitectureAnchors: brandKey must be a non-empty string');
  }
  const reg = loadRegistry();
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return [];
  return Array.isArray(brandEntry.anchors) ? brandEntry.anchors : [];
}

/**
 * Get the N highest-weight anchors as a compact in-context reference list.
 * Used by prompt compiler to render an "Architecture Context" block.
 * @param brandKey   e.g. 'jiuzhou-aesthetics'
 * @param maxCount   max number of anchors to return; default registry default (3)
 * @returns array of anchors sorted by weight desc, capped at maxCount
 */
export function getAnchorsAsInContextReference(brandKey, maxCount) {
  const reg = loadRegistry();
  const cap = maxCount ?? reg.inContextPolicy?.maxReferencesPerPrompt ?? 3;
  const anchors = loadArchitectureAnchors(brandKey);
  // Stable sort by weight desc, then by role coverage order if present
  return [...anchors]
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, cap);
}

/**
 * Resolve the absolute filesystem path of an anchor image.
 * Used by real-Provider integration only; prompt text uses mechanism strings.
 * @param brandKey  brand key
 * @param anchorId  anchor id
 * @returns absolute path or null
 */
export function resolveAnchorImagePath(brandKey, anchorId) {
  const reg = loadRegistry();
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return null;
  const anchor = brandEntry.anchors?.find((a) => a.id === anchorId);
  if (!anchor) return null;
  return join(repoRoot, anchor.imagePath);
}

/**
 * List all known brand keys.
 * @returns array of brand keys
 */
export function listBrandKeys() {
  const reg = loadRegistry();
  return Object.keys(reg.brands ?? {});
}
