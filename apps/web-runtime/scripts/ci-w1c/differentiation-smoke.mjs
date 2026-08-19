// CI-W1C.4 Resume.1 — Differentiation smoke runner (PART D).
//
// Drives the real CI workflow end-to-end for G01 and G02 using the v2
// evidence-strict briefs, then captures a single differentiation-smoke-evidence.json
// at .codex-smoke/ci-w1c.4-resume/<run-alias>/ for the XD01-XD06 contract tests.
//
// This script is a HARNESS artifact under apps/web-runtime/scripts/ci-w1c/.
// Production code is unchanged. The script chains two drive-ci-workflow.mjs
// invocations (one per project) and post-processes their evidence.json files
// into the differentiation-smoke-evidence.json structure expected by
// tests/packages/creative-intelligence/ci-3/qualification-differentiation-xd.test.js.
//
// Requirements:
//   - real Chrome at C:\Program Files\Google\Chrome\Application\chrome.exe
//   - real Qwen analysis API reachable via apiProfileId (env MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID)
//   - real Seedream image API reachable via apiProfileId (env MASTERPIECE_CI_W1C_IMAGE_PROFILE_ID)
//   - node 20+ with all workspace deps installed
//   - Windows PowerShell (sandbox-friendly)
//
// Output: .codex-smoke/ci-w1c.4-resume/<run-alias>/differentiation-smoke-evidence.json
// Per-run artifacts: .codex-smoke/ci-w1c/<g01-alias>/, .codex-smoke/ci-w1c/<g02-alias>/
// (drive script writes to .codex-smoke/ci-w1c/<alias>/evidence.json)

import fs from 'node:fs/promises';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// scriptDir = <repo>/apps/web-runtime/scripts/ci-w1c (Windows path)
//   -> up 4 levels to reach repo root
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..');
const driveScript = path.join(scriptDir, 'drive-ci-workflow.mjs');

// Sanity check: ensure we land at the repo root
if (!existsSync(path.join(repoRoot, 'package.json'))) {
  throw new Error(`repoRoot resolution failed: ${repoRoot} (no package.json)`);
}
const smokeRoot = path.join(repoRoot, '.codex-smoke', 'ci-w1c.4-resume');
const runAlias = process.env.MASTERPIECE_CI_W1C_RESUME1_RUN_ALIAS
  || `differentiation-smoke-${Date.now()}`;
const outDir = path.join(smokeRoot, runAlias);
await fs.mkdir(outDir, { recursive: true });

const briefG01 = process.env.MASTERPIECE_CI_W1C_BRIEF_G01
  || path.join(repoRoot, '.codex-smoke', 'ci-w1c.4-resume', 'g01-jiuzhou-brief-v2.md');
const briefG02 = process.env.MASTERPIECE_CI_W1C_BRIEF_G02
  || path.join(repoRoot, '.codex-smoke', 'ci-w1c.4-resume', 'g02-yiji-brief-v2.md');

const projectIdG01 = process.env.MASTERPIECE_CI_W1C_PROJECT_ID_G01
  || '590eadf2-76cb-4042-a034-db93481b06c9';
const projectIdG02 = process.env.MASTERPIECE_CI_W1C_PROJECT_ID_G02
  || 'a13d6c09-99f7-4ff9-b499-3b9f8a1df31b';

const analysisProfileId = process.env.MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID;
const imageProfileId = process.env.MASTERPIECE_CI_W1C_IMAGE_PROFILE_ID;
const documentRootG01 = process.env.MASTERPIECE_CI_W1C_DOCUMENT_ROOT_G01
  || path.join(process.env.APPDATA || '', '..', '..', 'Documents', 'Masterpiece OS Data', 'projects', '九州美学-590eadf2');
const documentRootG02 = process.env.MASTERPIECE_CI_W1C_DOCUMENT_ROOT_G02
  || path.join(process.env.APPDATA || '', '..', '..', 'Documents', 'Masterpiece OS Data', 'projects', '一剂良方-a13d6c09');

if (!analysisProfileId || !imageProfileId) {
  console.error('ERROR: MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID and MASTERPIECE_CI_W1C_IMAGE_PROFILE_ID are required');
  process.exit(1);
}

function runDrive(projectId, briefPath, documentRoot, alias) {
  return new Promise((resolve, reject) => {
    console.log(`[smoke] starting drive for ${alias} (projectId=${projectId})`);
    const env = {
      ...process.env,
      MASTERPIECE_CI_W1C_PROJECT_ID: projectId,
      MASTERPIECE_CI_W1C_ANALYSIS_PROFILE_ID: analysisProfileId,
      MASTERPIECE_CI_W1C_IMAGE_PROFILE_ID: imageProfileId,
      MASTERPIECE_CI_W1C_DOCUMENT_ROOT: documentRoot,
      MASTERPIECE_CI_W1C_BRIEF_PATH: briefPath,
      MASTERPIECE_CI_W1C_RUN_ALIAS: alias,
      MASTERPIECE_CI_W1C_DOCUMENT_LIMIT: process.env.MASTERPIECE_CI_W1C_DOCUMENT_LIMIT || '1',
    };
    const child = spawn(process.execPath, [driveScript], {
      cwd: repoRoot, env, stdio: 'inherit',
    });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`drive script failed for ${alias} with exit code ${code}`));
    });
    child.on('error', reject);
  });
}

async function loadEvidence(alias) {
  // The drive script writes evidence.json at .codex-smoke/ci-w1c/<alias>/evidence/evidence.json
  const evidencePath = path.join(repoRoot, '.codex-smoke', 'ci-w1c', alias, 'evidence', 'evidence.json');
  if (!existsSync(evidencePath)) {
    throw new Error(`drive script did not produce evidence at ${evidencePath}`);
  }
  return JSON.parse(await fs.readFile(evidencePath, 'utf8'));
}

function extractDifferentiation(evidence) {
  const ws = evidence.finalWorkspace;
  if (!ws) {
    return { error: 'no finalWorkspace in evidence', evidenceKeys: Object.keys(evidence) };
  }
  const startCheckpoint = evidence.checkpoints?.find((c) => c.label === 'E03');
  const endCheckpoint = evidence.checkpoints?.find((c) => c.label === 'E10');
  const directionSet = ws.directionSet;
  const conceptSet = ws.conceptSet;
  const visualCanon = ws.visualCanon;
  const opportunityMap = ws.opportunityMap;

  // Map directionSet.directions → directions[]
  const directions = (directionSet?.directions || []).map((d) => ({
    id: d.id,
    status: d.status,
    family: d.family,
    thesis: d.thesis,
    visualMechanism: d.visualMechanism,
    thesisSnippet: (d.thesis || '').slice(0, 200),
    mechanismSnippet: (d.visualMechanism || '').slice(0, 200),
  }));

  // Map conceptSet.concepts → concepts[]
  const concepts = (conceptSet?.concepts || []).map((c) => ({
    id: c.id,
    name: c.name,
    title: c.name,
    thesis: c.mechanism || c.thesis,
    mechanism: c.mechanism,
    status: c.status,
  }));

  // Map opportunityMap → opportunities[]
  let opportunities = [];
  if (Array.isArray(opportunityMap)) {
    opportunities = opportunityMap;
  } else if (opportunityMap && Array.isArray(opportunityMap.opportunities)) {
    opportunities = opportunityMap.opportunities;
  } else if (opportunityMap && typeof opportunityMap === 'object') {
    opportunities = Object.values(opportunityMap).flat().filter((o) => o && (o.statement || o.text));
  }

  // needs / insights come from the workspace view
  const needs = (ws.needs || []).map((n) => ({
    id: n.id,
    type: n.type,
    statement: n.statement || n.text,
    whyItMatters: n.whyItMatters,
    status: n.status,
  }));
  const insights = (ws.insights || []).map((i) => ({
    id: i.id,
    type: i.type,
    statement: i.statement || i.text,
    implication: i.implication,
    opportunityHint: i.opportunityHint,
  }));

  const analysisProvider = ws.run?.analysisProviderId || ws.run?.providerId || 'dashscope';
  const analysisModel = ws.run?.analysisModelId || ws.run?.modelId || 'qwen';
  const startAt = startCheckpoint?.at;
  const endAt = endCheckpoint?.at;
  const latencyMs = startAt && endAt ? (new Date(endAt).getTime() - new Date(startAt).getTime()) : 0;

  return {
    ciRunId: evidence.ciRunId,
    sourceRunId: ws.run?.sourceRunId || evidence.ciRunId,
    analysisProvider,
    analysisModel,
    latencyMs,
    canonVersion: visualCanon?.canonVersion,
    canon: visualCanon ? {
      canonVersion: visualCanon.canonVersion,
      dnaRefCount: visualCanon.visualDNA?.requiredElementIds?.length || 0,
      grammarRulesCount: visualCanon.visualGrammar?.compositionRules?.length || 0,
      lockedAssetRules: (visualCanon.lockedAssetRules || []).length,
    } : null,
    needs,
    insights,
    opportunities,
    concepts,
    directions,
    selectedDirectionId: ws.run?.selectedDirectionId,
    selectionRevision: ws.run?.selectionRevision,
    conceptTotalCount: conceptSet?.concepts?.length,
    conceptValidCount: (conceptSet?.concepts || []).filter((c) => c.status !== 'blocked').length,
    conceptBlockedCount: (conceptSet?.concepts || []).filter((c) => c.status === 'blocked').length,
    directionSetCount: directions.length,
    truth: ws.truth ? {
      brandName: ws.truth.lockedAssets?.brand?.name,
      industry: ws.truth.analysisContext?.detectedIndustry,
      brandRole: ws.truth.analysisContext?.detectedBrandRole,
      confidence: ws.truth.analysisContext?.confidence,
    } : null,
  };
}

try {
  const g01Alias = `${runAlias}-g01`;
  const g02Alias = `${runAlias}-g02`;
  // Run G01 first, then G02.
  await runDrive(projectIdG01, briefG01, documentRootG01, g01Alias);
  await runDrive(projectIdG02, briefG02, documentRootG02, g02Alias);
  // Load both evidence files
  const ev01 = await loadEvidence(g01Alias);
  const ev02 = await loadEvidence(g02Alias);
  const g01 = extractDifferentiation(ev01);
  const g02 = extractDifferentiation(ev02);
  const out = {
    runAlias,
    capturedAt: new Date().toISOString(),
    briefs: { g01: briefG01, g02: briefG02 },
    projects: { g01: projectIdG01, g02: projectIdG02 },
    analysisProfileId,
    imageProfileId,
    g01,
    g02,
  };
  const outFile = path.join(outDir, 'differentiation-smoke-evidence.json');
  writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
  console.log(`[smoke] wrote ${outFile}`);
  console.log(`[smoke] g01 directions: ${g01.directions?.length}, g02 directions: ${g02.directions?.length}`);
  console.log(`[smoke] g01 canonVersion: ${g01.canonVersion}, g02 canonVersion: ${g02.canonVersion}`);
} catch (err) {
  console.error('FAILED', err.message, err.stack);
  process.exitCode = 1;
}
