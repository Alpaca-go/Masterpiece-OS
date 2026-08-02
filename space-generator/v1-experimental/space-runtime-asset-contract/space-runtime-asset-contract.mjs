// Space-Runtime Asset Contract — Phase 9C.2 v2 §6/§8 + V5 production parity.
//
// 用途: 给 space-runtime compileSpaceRuntime 输出配上 v5 image-generation runtime 等价
//       的 asset contract (locked assets / locked facts / references / vnext-style
//       snapshot + sourceMap). 让 smoke 跟 production v5 真实行为对齐.
//
// 背景: 之前 smoke 直接用 startCompiledCreativeTask 传空 references + 自定义 snapshot,
//       绕开了 V3 sourceBundle loader + vnext service 的 locked-asset detection.
//       本模块把以下 production 行为封装成可复用的 helper:
//
//       1. Logo / locked asset 检测 (跟 createFileContextLoader / vnext-service
//          同样的逻辑):
//          - project.json.logoFiles → identity_reference (current_project_logo)
//          - project.json.lockedFacts → lockedFacts
//          - project.json.logoLocked flag (默认 true)
//
//       2. Architecture anchor (JZMX-ARCH-01 等) → structure_reference
//          (per vnext-service line 396 role mapping)
//
//       3. brand DNA 约束 → lockedAssetIds (asset concept) + lockedFacts (约束文本):
//          - brandSpaceDna.literalAssetUsage keys (logoVisibility / frogIPUsage 等)
//            视为 literal asset constraints
//          - negativeConstraints.prohibit (字符串数组) 直接当 lockedFacts
//          - variationControl.preserve 视为 structural locks
//
//       4. vnext-style snapshot 形状 (per vnext-service.ts line 417-424):
//          { schemaVersion: 'space-runtime-1.0', projectContextVersion, taskContract,
//            route, trace, implicitAnchor }
//
//       5. vnext-style sourceMap 形状 (per vnext-service.ts line 425-431):
//          { pipelineMode: 'space-runtime', taskId, contextFingerprint,
//            templateVersions, implicitAnchorRunId }
//
// 跟 production V3 sourceBundle 区别:
//   - V3 sourceBundle 用 service.start() + createGenerationSourceLoader
//   - 本模块走 startCompiledCreativeTask (跟 vnext-service 同样的 entry)
//   - V3 的 references 是动态从 project.json 扫的; 本模块也支持 (logo 列表)
//   - space-runtime 编译出的 prompt 直接用作 compiledPrompt (跟 vnext 同样)
//
// 不调真实 Provider, 不修改 baseline 行为, 不污染生产代码.

import crypto from 'node:crypto';

const SCHEMA_VERSION = 'space-runtime-1.0';
const PIPELINE_MODE = 'space-runtime';
const PROJECT_CONTEXT_VERSION = 'space-runtime-v1';
const MAX_REFERENCES = 2; // service.ts:676 强制上限

/**
 * Detect locked logo asset ids from a project.json record.
 * Per vnext-service line 373-379 (lockedLogoAssetIds set) + context-loader line 110.
 *
 * Priority:
 *   1. project.logoFiles (string[] of file names) — match against project.assets[].originalName
 *   2. project.assets[].role === 'logo' (if any) — fallback
 *   3. project.assets[].originalName pattern (contains "logo") — last fallback
 * Returns array of asset ids (string[]).
 */
function detectLogoAssetIds(projectJson) {
  if (!projectJson || !Array.isArray(projectJson.assets)) return [];
  const logoFileNames = Array.isArray(projectJson.logoFiles) ? projectJson.logoFiles : [];
  const matched = new Set();

  // 1. logoFiles match (production v1 path)
  for (const logoName of logoFileNames) {
    const normalized = String(logoName).toLowerCase();
    const match = projectJson.assets.find((a) => {
      if (!a || a.status !== 'ready') return false;
      const orig = String(a.originalName || '').toLowerCase();
      return orig === normalized || orig.endsWith(`/${normalized}`) || orig.endsWith(`\\${normalized}`);
    });
    if (match?.id) matched.add(match.id);
  }
  if (matched.size > 0) return [...matched];

  // 2. asset.role === 'logo'
  for (const a of projectJson.assets) {
    if (a && a.role === 'logo' && a.status === 'ready' && a.id) matched.add(a.id);
  }
  if (matched.size > 0) return [...matched];

  // 3. originalName contains "logo" (last-resort heuristic; logs warn at call site)
  for (const a of projectJson.assets) {
    if (a && a.status === 'ready' && a.id && /logo/i.test(String(a.originalName || ''))) matched.add(a.id);
  }
  return [...matched];
}

/**
 * Detect structure anchor assets (architecture reference like JZMX-ARCH-01).
 *
 * Heuristic: asset.originalName matches /ARCH|anchor|reference|结构|参考|架构/ AND
 * asset has 'structure' / 'anchor' / 'arch' role hint, OR has been explicitly
 * marked via project.stagedStructureAnchors (smoke-only field).
 *
 * Returns array of { id, originalName, relativePath } entries.
 */
function detectStructureAnchors(projectJson) {
  if (!projectJson || !Array.isArray(projectJson.assets)) return [];
  // 0. explicit staged list (smoke-only override)
  const staged = Array.isArray(projectJson.stagedStructureAnchors)
    ? projectJson.stagedStructureAnchors
    : [];
  if (staged.length > 0) {
    return staged
      .map((id) => projectJson.assets.find((a) => a.id === id))
      .filter((a) => a && a.status === 'ready')
      .map((a) => ({ id: a.id, originalName: a.originalName, relativePath: a.relativePath }));
  }
  // 1. role hint
  for (const a of projectJson.assets) {
    if (!a || a.status !== 'ready') continue;
    if (a.role === 'architecture' || a.role === 'structure_anchor' || a.role === 'anchor') {
      return [{ id: a.id, originalName: a.originalName, relativePath: a.relativePath }];
    }
  }
  // 2. name pattern
  for (const a of projectJson.assets) {
    if (!a || a.status !== 'ready') continue;
    if (/ARCH|anchor|结构|参考|架构/i.test(String(a.originalName || ''))) {
      return [{ id: a.id, originalName: a.originalName, relativePath: a.relativePath }];
    }
  }
  return [];
}

/**
 * Detect asset constraints from brand DNA.
 * - brandSpaceDna.literalAssetUsage keys → literal asset constraint tokens
 * - negativeConstraints.prohibit → hard prohibition constraints (text)
 * - variationControl.preserve → structural locks (must-not-change)
 */
function detectBrandDnaConstraints(brandDna) {
  if (!brandDna) return { literalAssetTokens: [], prohibitions: [], preserveTokens: [] };
  const literalAssetUsage = brandDna?.brandSpaceDna?.literalAssetUsage ?? {};
  const literalAssetTokens = Object.keys(literalAssetUsage).filter(
    (k) => ['high', 'medium', 'required', 'mandatory'].includes(String(literalAssetUsage[k]).toLowerCase()),
  );
  const prohibitions = Array.isArray(brandDna?.negativeConstraints?.prohibit)
    ? brandDna.negativeConstraints.prohibit
    : [];
  const preserveTokens = Array.isArray(brandDna?.variationControl?.preserve)
    ? brandDna.variationControl.preserve
    : [];
  return { literalAssetTokens, prohibitions, preserveTokens };
}

/**
 * Compose locked facts: combine project.json.lockedFacts with brand DNA prohibitions.
 * - Always preserves order; dedupes case-insensitively.
 */
function composeLockedFacts(projectJson, brandDnaConstraints) {
  const facts = [];
  if (Array.isArray(projectJson?.lockedFacts)) facts.push(...projectJson.lockedFacts);
  if (Array.isArray(projectJson?.lockedFacts) === false && projectJson?.logoLocked !== false) {
    // Per project-store.ts:49 default logoLocked=true, no explicit lockedFacts → seed baseline
    facts.push('原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。');
    facts.push('输出语言固定为简体中文。');
  }
  facts.push(...brandDnaConstraints.prohibitions);
  const seen = new Set();
  const out = [];
  for (const f of facts) {
    const k = String(f).trim().toLowerCase();
    if (k && !seen.has(k)) { seen.add(k); out.push(String(f).trim()); }
  }
  return out;
}

/**
 * Compose locked asset ids: project.json logo asset ids + DNA literal asset tokens.
 * - Returns { logoAssetIds, structuralAssetIds, all }.
 */
function composeLockedAssetIds(projectJson, brandDnaConstraints, structureAnchors) {
  const logoAssetIds = detectLogoAssetIds(projectJson);
  const structuralAssetIds = structureAnchors.map((a) => a.id);
  // DNA literal asset tokens are textual, not asset ids; we encode them as
  // synthetic tokens like 'dna:logoVisibility' so the snapshot has a
  // machine-readable signal without inventing fake asset ids.
  const dnaTokens = brandDnaConstraints.literalAssetTokens.map((t) => `dna:${t}`);
  return {
    logoAssetIds,
    structuralAssetIds,
    dnaTokens,
    all: [...logoAssetIds, ...structuralAssetIds, ...dnaTokens],
  };
}

/**
 * Build reference list (capped at MAX_REFERENCES=2 per service.ts:676).
 *
 * Priority:
 *   1. logo asset (if any) → identity_reference (production vnext line 396-397)
 *   2. structure anchor (if any) → structure_reference (production vnext line 398-399)
 *   3. core reference (smoke-staged) → core_reference (production vnext line 399-400)
 *
 * Returns: [{ id, role, projectRelativePath, includeReason }]
 */
function buildReferences({ logoAssetIds, structureAnchors, projectJson, hasStagedReference, stagedReference }) {
  const refs = [];
  // 1. logo reference
  if (logoAssetIds.length > 0 && projectJson?.assets) {
    const logoId = logoAssetIds[0];
    const asset = projectJson.assets.find((a) => a.id === logoId);
    if (asset?.relativePath) {
      refs.push({
        id: asset.id,
        role: 'identity_reference',
        projectRelativePath: `input/${String(asset.relativePath).replaceAll('\\', '/')}`,
        includeReason: '当前项目锁定 Logo（品牌身份，必须在画面中正确呈现）',
      });
    }
  }
  // 2. structure anchor reference
  if (structureAnchors.length > 0) {
    const sa = structureAnchors[0];
    refs.push({
      id: sa.id,
      role: 'structure_reference',
      projectRelativePath: `input/${String(sa.relativePath).replaceAll('\\', '/')}`,
      includeReason: '当前项目空间结构参考（建筑/平面/造型 reference，不得迁移参考品牌身份）',
    });
  }
  // 3. staged reference (smoke-only, e.g. JZMX-ARCH-01-reference.png outside project.json)
  if (hasStagedReference && stagedReference) {
    refs.push({
      id: stagedReference.id,
      role: stagedReference.role || 'core_reference',
      projectRelativePath: stagedReference.projectRelativePath,
      includeReason: stagedReference.includeReason || 'Smoke 阶段手动 staged 的结构/空间参考',
    });
  }
  return refs.slice(0, MAX_REFERENCES);
}

/**
 * Build vnext-style snapshot (per vnext-service.ts line 417-424).
 * - schemaVersion: 'space-runtime-1.0'
 * - projectContextVersion: 'space-runtime-v1' (constant for v1-experimental)
 * - taskContract: minimal { taskId, deliverableFamily, subtype, shot, aspectRatio, ... }
 * - route: { templateVersions: { ... } }
 * - trace: { sourceFingerprint, contextFingerprint, ... }
 * - implicitAnchor: null (space-runtime has no implicit anchor registry)
 * - lockedAssetIds / lockedFacts: production-equivalent constraint surface
 */
function buildSnapshot({
  taskId,
  compiled,
  lockedAssetIds,
  lockedFacts,
  references,
  brandKey,
  industry,
  strategy,
}) {
  const taskContract = {
    taskId,
    deliverableFamily: 'interior_concept',
    subtype: 'reception',
    shot: 'wide',
    aspectRatio: '16:9',
    count: 1,
    referenceAssetIds: references.map((r) => r.id),
    logoUsageMode: lockedAssetIds.logoAssetIds.length > 0 ? 'embedded' : 'reference_only',
  };
  const route = {
    templateVersions: {
      'space-runtime': compiled.runtimePath || 'spatial_intelligence_9a2_9a3_9b1_9b2_8a_8b1_sip_9c1_space_role',
      'spatial-intent-presets': 'v1.0',
      'brand-identity-validation': '9C.0.5-v2.0.0',
      'spatial-strategy-selector': '9C.2-v2',
    },
  };
  const trace = {
    sourceFingerprint: crypto.createHash('sha256')
      .update(`${brandKey}|${industry}|${compiled.runtimePath ?? ''}|${compiled.blockCount ?? 0}|${compiled.characterCount ?? 0}`)
      .digest('hex')
      .slice(0, 16),
    contextFingerprint: crypto.createHash('sha256')
      .update(JSON.stringify({ brandKey, strategy: strategy?.selectedStrategy, axisScores: strategy?.axisScores }))
      .digest('hex')
      .slice(0, 16),
    compiledAt: new Date().toISOString(),
    blockCount: compiled.blockCount ?? 0,
    characterCount: compiled.characterCount ?? 0,
    mode: compiled.mode ?? 'unknown',
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    projectContextVersion: PROJECT_CONTEXT_VERSION,
    taskContract,
    route,
    trace,
    implicitAnchor: null,
    lockedAssetIds: lockedAssetIds.all,
    lockedFacts,
    brandKey,
    industry,
    strategy: strategy?.selectedStrategy ?? 'unknown',
    axisScores: strategy?.axisScores ?? null,
    gateStatus: strategy?.gateStatus ?? null,
    gateRiskLevel: strategy?.gateRiskLevel ?? null,
  };
}

/**
 * Build vnext-style sourceMap (per vnext-service.ts line 425-431).
 * - pipelineMode: 'space-runtime' (NOT 'vnext' — per project-rule, vnext 字样保留给 VNext runtime)
 * - taskId, contextFingerprint, templateVersions, implicitAnchorRunId
 */
function buildSourceMap({ taskId, snapshot }) {
  return {
    pipelineMode: PIPELINE_MODE,
    taskId,
    contextFingerprint: snapshot.trace.contextFingerprint,
    templateVersions: snapshot.route.templateVersions,
    implicitAnchorRunId: null,
    brandKey: snapshot.brandKey,
    selectedStrategy: snapshot.strategy,
    confidence: snapshot.gateStatus ? 'see-task-snapshot' : null,
    spaceType: snapshot.taskContract.subtype,
    outputResponsibility: 'complete_interior_scene',
  };
}

/**
 * Build a complete asset contract for a space-runtime smoke run.
 *
 * @param {Object} input
 * @param {Object} input.projectJson      - desktop project record (from projects.get())
 * @param {Object} input.brandDna         - brand DNA (from loadBrandDna().dna)
 * @param {Object} input.compiled         - space-runtime compileSpaceRuntime result
 * @param {Object} input.strategy         - selectSpatialStrategy result
 * @param {boolean} [input.hasStagedReference] - whether a smoke-staged reference exists
 * @param {Object} [input.stagedReference] - { id, role, projectRelativePath, includeReason }
 * @param {string} [input.dataPath]       - desktop dataPath (for path resolution)
 * @returns {{
 *   references: Array,
 *   lockedAssetIds: { logoAssetIds, structuralAssetIds, dnaTokens, all },
 *   lockedFacts: string[],
 *   snapshot: object,
 *   sourceMap: object,
 *   detection: { logoSource: string, structureSource: string, logoCount: number, structureCount: number }
 * }}
 */
export function buildAssetContract({
  projectJson,
  brandDna,
  compiled,
  strategy,
  hasStagedReference = false,
  stagedReference = null,
  dataPath = null,
} = {}) {
  // 1. Detect structure anchors from project.json
  const structureAnchors = detectStructureAnchors(projectJson);

  // 2. Detect brand DNA constraints
  const dnaConstraints = detectBrandDnaConstraints(brandDna);

  // 3. Compose locked asset ids + locked facts
  const lockedAssetIds = composeLockedAssetIds(projectJson, dnaConstraints, structureAnchors);
  const lockedFacts = composeLockedFacts(projectJson, dnaConstraints);

  // 4. Build references
  const references = buildReferences({
    logoAssetIds: lockedAssetIds.logoAssetIds,
    structureAnchors,
    projectJson,
    hasStagedReference,
    stagedReference,
  });

  // 5. Build snapshot + sourceMap
  const taskId = `srt-${crypto.randomUUID().slice(0, 8)}`;
  const industry = brandDna?.project?.industry ?? projectJson?.industry ?? '?';
  const snapshot = buildSnapshot({
    taskId,
    compiled,
    lockedAssetIds,
    lockedFacts,
    references,
    brandKey: projectJson?.brandKey ?? brandDna?.project?.brandName ?? 'unknown',
    industry,
    strategy,
  });
  const sourceMap = buildSourceMap({ taskId, snapshot });

  // 6. Detection metadata for run.json
  const detection = {
    logoSource: lockedAssetIds.logoAssetIds.length > 0
      ? (projectJson?.logoFiles?.length > 0 ? 'project.logoFiles' : (projectJson?.assets?.some((a) => a.role === 'logo') ? 'asset.role' : 'name-heuristic'))
      : 'none',
    structureSource: structureAnchors.length > 0
      ? (projectJson?.stagedStructureAnchors?.length > 0 ? 'project.stagedStructureAnchors' : (structureAnchors[0]?.role ? 'asset.role' : 'name-heuristic'))
      : 'none',
    logoCount: lockedAssetIds.logoAssetIds.length,
    structureCount: structureAnchors.length,
    literalAssetTokenCount: dnaConstraints.literalAssetTokens.length,
    prohibitionCount: dnaConstraints.prohibitions.length,
  };

  return {
    references,
    lockedAssetIds,
    lockedFacts,
    snapshot,
    sourceMap,
    detection,
  };
}

export {
  SCHEMA_VERSION,
  PIPELINE_MODE,
  PROJECT_CONTEXT_VERSION,
  detectLogoAssetIds,
  detectStructureAnchors,
  detectBrandDnaConstraints,
  composeLockedFacts,
  composeLockedAssetIds,
  buildReferences,
  buildSnapshot,
  buildSourceMap,
};
