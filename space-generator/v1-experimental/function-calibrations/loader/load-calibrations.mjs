// Function Calibration Loader v1 (Phase 8B.1)
// 用法:
//   import { loadFunctionCalibrations, getCalibrationsAsInContextReference } from '.../load-calibrations.mjs';
//   const calibrations = loadFunctionCalibrations('jiuzhou-aesthetics');
//   const refList = getCalibrationsAsInContextReference('jiuzhou-aesthetics', 2);
//
// 不调 Provider, 不污染生产代码.
// Registry source: ../registry.json (Phase 8B.1 新增).
// Source-of-truth: 各 brand 子目录的 metadata.yaml + function-dna-analysis.yaml (Phase 8B.1 新增).
//
// Phase 8B.1 关键设计:
//   - status=concept_only: 当前 phase 不调真实 Provider, imagePath=null, 不会被 runtime 消费.
//   - 未来 Phase 8B.2+ 真实跑批后, status -> real_image, imagePath 指向 commit 进来的 PNG.
//   - 与 architecture-anchors/loader/load-anchors.mjs 平行存在, 互为镜像.

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
    throw new Error(`Function calibration registry not found: ${registryPath}`);
  }
  registryCache = JSON.parse(readFileSync(registryPath, 'utf8'));
  return registryCache;
}

/**
 * Load function calibrations for a given brand.
 * @param brandKey  e.g. 'jiuzhou-aesthetics'
 * @returns array of {id, role, primaryMechanism, secondaryMechanism, imagePath, imageStatus, weight}
 *          or [] if brand has no calibrations
 */
export function loadFunctionCalibrations(brandKey) {
  if (!brandKey || typeof brandKey !== 'string') {
    throw new TypeError('loadFunctionCalibrations: brandKey must be a non-empty string');
  }
  const reg = loadRegistry();
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return [];
  return Array.isArray(brandEntry.calibrations) ? brandEntry.calibrations : [];
}

/**
 * Get the N highest-weight function calibrations as a compact in-context reference list.
 * Used by prompt compiler to render a "Function Calibration Context" block.
 * @param brandKey   e.g. 'jiuzhou-aesthetics'
 * @param maxCount   max number of calibrations to return; default registry default (2)
 * @returns array of calibrations sorted by weight desc, capped at maxCount
 */
export function getCalibrationsAsInContextReference(brandKey, maxCount) {
  const reg = loadRegistry();
  const cap = maxCount ?? reg.inContextPolicy?.maxReferencesPerPrompt ?? 2;
  const calibrations = loadFunctionCalibrations(brandKey);
  // Stable sort by weight desc
  return [...calibrations]
    .sort((a, b) => (b.weight ?? 1) - (a.weight ?? 1))
    .slice(0, cap);
}

/**
 * Resolve the absolute filesystem path of a calibration image.
 * Returns null when imageStatus='concept_only' (no real image committed yet).
 * @param brandKey        brand key
 * @param calibrationId   calibration id
 * @returns absolute path or null
 */
export function resolveCalibrationImagePath(brandKey, calibrationId) {
  const reg = loadRegistry();
  const repoRoot = join(__dirname, '..', '..', '..', '..');
  const brandEntry = reg.brands?.[brandKey];
  if (!brandEntry) return null;
  const cal = brandEntry.calibrations?.find((c) => c.id === calibrationId);
  if (!cal) return null;
  if (cal.imageStatus !== 'real_image' || !cal.imagePath) return null;
  return join(repoRoot, cal.imagePath);
}

/**
 * List all known brand keys.
 * @returns array of brand keys
 */
export function listBrandKeys() {
  const reg = loadRegistry();
  return Object.keys(reg.brands ?? {});
}
