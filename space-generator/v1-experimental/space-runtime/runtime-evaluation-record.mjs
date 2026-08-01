// Runtime Evaluation Record v1 (Phase 9C §10)
// 用途: Phase 9C §10 Runtime Evaluation Record, 追踪每个模块对生成结果的影响.
//       保存到 run.json (跟 Phase 9B.1/9B.2 smoke runner 一样 desensitized).
//
// Phase 9C §10 字段:
//   run.json
//   ├── brandDNA version
//   ├── spatialIntent version
//   ├── architecture version
//   ├── realityConstraint version
//   ├── prompt version
//   └── provider result
//
// Phase 9C §13 Traceability:
//   每次生成可追踪 Intent / Architecture / Reality / Prompt.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Phase 9C §10 Runtime Evaluation Record schema.
 *
 * @typedef {Object} RuntimeEvaluationRecord
 * @property {string} schemaVersion - '1.0'
 * @property {string} phase - '9C'
 * @property {string} brandKey
 * @property {string} projectId (optional, for real provider runs)
 * @property {string} generatedAt - ISO 8601 timestamp
 * @property {Object} moduleVersions - per-module version tracking
 * @property {string} moduleVersions.brandDna - e.g. 'v0.1.1' / 'v0.3'
 * @property {string} moduleVersions.spatialIntent - '9A.2'
 * @property {string} moduleVersions.architectureBridge - '9A.3'
 * @property {string} moduleVersions.architectureAnchor - '8A'
 * @property {string} moduleVersions.architectureFunctionBridge - '8B.1'
 * @property {string} moduleVersions.spatialReality - '9B.1'
 * @property {string} moduleVersions.architecturePreservation - '9B.2'
 * @property {string} moduleVersions.promptCompiler - runtime path identifier
 * @property {Object} compiledStrategy - Phase 9C §8 output: compiledSpaceStrategy
 * @property {Object} prompt - Phase 9C §8 output: compiledPrompt metadata
 * @property {string} prompt.markdown
 * @property {number} prompt.blockCount
 * @property {number} prompt.characterCount
 * @property {string[]} prompt.blockOrder
 * @property {Object} validationContext - Phase 9C §8 output: validationContext
 * @property {string} validationContext.brandKey
 * @property {string} validationContext.promptVersion
 * @property {string} validationContext.runtimePath
 * @property {Object} [provider] - Phase 9C §10 provider result (only in real provider runs)
 * @property {string} provider.status
 * @property {string} provider.runId
 * @property {number} provider.durationMs
 * @property {number} provider.imageBytes
 * @property {string} provider.size
 */

export const EVALUATION_RECORD_SCHEMA_VERSION = '1.0';
export const EVALUATION_RECORD_PHASE = '9C';

/**
 * Build a Runtime Evaluation Record from compiled runtime prompt + module versions.
 *
 * @param runtimeResult  Result from compileSpaceRuntime (markdown, blocks, etc.)
 * @param options        { brandKey, projectId, moduleVersions, provider }
 * @returns RuntimeEvaluationRecord
 */
export function buildRuntimeEvaluationRecord(runtimeResult, options = {}) {
  if (!runtimeResult || typeof runtimeResult !== 'object') {
    throw new TypeError('buildRuntimeEvaluationRecord: runtimeResult must be a non-null object');
  }
  if (!options.brandKey) {
    throw new TypeError('buildRuntimeEvaluationRecord: options.brandKey is required');
  }

  const mv = options.moduleVersions || {};

  return {
    schemaVersion: EVALUATION_RECORD_SCHEMA_VERSION,
    phase: EVALUATION_RECORD_PHASE,
    brandKey: options.brandKey,
    projectId: options.projectId || null,
    generatedAt: new Date().toISOString(),
    moduleVersions: {
      brandDna: mv.brandDna || 'unknown',
      spatialIntent: mv.spatialIntent || '9A.2',
      architectureBridge: mv.architectureBridge || '9A.3',
      architectureAnchor: mv.architectureAnchor || '8A',
      architectureFunctionBridge: mv.architectureFunctionBridge || '8B.1',
      spatialReality: mv.spatialReality || '9B.1',
      architecturePreservation: mv.architecturePreservation || '9B.2',
      promptCompiler: runtimeResult.runtimePath || 'unknown',
    },
    compiledStrategy: {
      experienceGoal: runtimeResult.compiledSpatialIntent?.experienceGoal || null,
      spatialStrategy: runtimeResult.compiledSpatialIntent?.spatialStrategy || [],
      architecturalCharacteristics: runtimeResult.architectureLanguage?.architecturalCharacteristics || [],
      materialDirection: runtimeResult.architectureLanguage?.materialDirection || [],
      lightDirection: runtimeResult.architectureLanguage?.lightDirection || [],
      spatialOrganization: runtimeResult.architectureLanguage?.spatialOrganization || [],
      weight: runtimeResult.architectureLanguage?.weight || 0.25,
    },
    prompt: {
      markdown: runtimeResult.markdown,
      blockCount: runtimeResult.blockCount,
      characterCount: runtimeResult.characterCount,
      blockOrder: (runtimeResult.blocks || []).map((b) => b.id),
    },
    validationContext: {
      brandKey: options.brandKey,
      promptVersion: `phase-9c-runtime-${(runtimeResult.runtimePath || 'unknown').replace(/[^a-z0-9-]/gi, '-')}-1.0.0`,
      runtimePath: runtimeResult.runtimePath,
    },
    provider: options.provider || null,
  };
}
