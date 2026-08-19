// CI-W1C Attempt 2 — qualification extract. Spawns the Web Host
// and pulls the full finalWorkspace for both G01 and G02 via
// the canonical creative-intelligence:get-workspace RPC. Writes
// a per-run JSON evidence file under .codex-smoke/ci-w1c/.

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..', '..', '..');
const tsx = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const userDataDir = process.env.APPDATA + '\\masterpiece-os-desktop';
const port = 5439;

const env = {
  ...process.env,
  MASTERPIECE_USER_DATA_DIR: userDataDir,
  MASTERPIECE_WEB_RPC_PORT: String(port),
  MASTERPIECE_WEB_ALLOWED_ORIGIN: 'http://127.0.0.1:9999',
  MASTERPIECE_WEB_OPEN_PATH: '0',
};

const runs = [
  { alias: 'g01-jiuzhou-aesthetics-qualification-001', ciRunId: 'dae20fa8-5e2e-4689-8f9e-6313fbf03652' },
  { alias: 'g02-yiji-liangfang-qualification-001', ciRunId: 'd9041c66-4424-45e7-b694-217f6d00a51b' },
  { alias: 'g01-jiuzhou-aesthetics-qualification-002', ciRunId: 'e96d8180-7eb3-4ffa-8aff-56d9a6f807a1', blocked: true },
  { alias: 'g02-yiji-liangfang-qualification-002', ciRunId: '7b0b95a4-0d4f-4b63-b262-67d91318355a', blocked: true },
  { alias: 'g03-jiuzhou-aesthetics-repeatability-002', ciRunId: '03c8e354-1853-4632-9bd8-d8546d8271cb' },
];

async function rpc(channel, args) {
  const r = await fetch(`http://127.0.0.1:${port}/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ args }),
  });
  return await r.json();
}

const hostProc = spawn(process.execPath, [tsx, path.join(repoRoot, 'apps', 'web-runtime', 'src', 'main.ts')], { cwd: repoRoot, env, stdio: ['ignore', 'pipe', 'pipe'] });
hostProc.stdout.on('data', () => {});  // suppress
hostProc.stderr.on('data', () => {});

try {
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('host not ready 30s')), 30_000);
    hostProc.stdout.on('data', (chunk) => {
      if (chunk.toString('utf8').includes('NODE_WEB_HOST_READY')) { clearTimeout(t); resolve(); }
    });
  });
  console.log('HOST_READY');

  const result = { startedAt: new Date().toISOString(), runs: {} };
  for (const run of runs) {
    console.log(`EXTRACTING ${run.alias} (${run.ciRunId})`);
    const w = await rpc('creative-intelligence:get-workspace', [run.ciRunId]);
    const ws = w.result || w;
    console.log(`  keys: ${Object.keys(ws).join(', ')}`);
    const ap = ws.anchorProduction;
    result.runs[run.alias] = {
      ciRunId: run.ciRunId,
      runStatus: ws.run?.status,
      selectedDirectionId: ws.run?.selectedDirectionId,
      selectionRevision: ws.run?.selectionRevision,
      canonVersion: ws.visualCanon?.canonVersion,
      directionSetCount: ws.directionSet?.directions?.length,
      recommendedDirectionId: ws.evaluation?.recommendedDirectionId,
      recommendationsMatch: ws.run?.selectedDirectionId === ws.evaluation?.recommendedDirectionId,
      anchorRunStatus: ap?.run?.status,
      candidateCount: ap?.candidates?.length,
      approvedCandidateId: ap?.approvedAnchor?.candidateId,
      approvalRevision: ap?.approvedAnchor?.approvalRevision,
      approvalHistoryCount: ap?.approvalHistory?.length,
      dnaRefCount: ws.visualCanon?.visualDNA?.requiredElementIds?.length,
      grammarRulesCount: ws.visualCanon?.visualGrammar?.compositionRules?.length,
      spaceMustPreserve: ws.productionTranslation?.space?.mustPreserve?.length,
      spaceMustNotIntroduce: ws.productionTranslation?.space?.mustNotIntroduce?.length,
      packagingMustPreserve: ws.productionTranslation?.packaging?.mustPreserve?.length,
      packagingMustNotIntroduce: ws.productionTranslation?.packaging?.mustNotIntroduce?.length,
      spaceVersion: ws.productionTranslation?.space?.translationVersion,
      packagingVersion: ws.productionTranslation?.packaging?.translationVersion,
      analysisModel: ws.run?.analysisModelId,
      imageProvider: ap?.run?.providerId,
      imageModel: ap?.run?.modelId,
      imageApiProfileId: ap?.run?.apiProfileId,
      conceptTotalCount: ws.conceptSet?.concepts?.length,
      conceptValidCount: ws.conceptSet?.concepts?.filter((c) => c.status !== 'blocked').length,
      conceptBlockedCount: ws.conceptSet?.concepts?.filter((c) => c.status === 'blocked').length,
      // Save the full directionSet for comparison
      directions: (ws.directionSet?.directions || []).map((d) => ({
        id: d.id,
        status: d.status,
        family: d.family,
        thesis: d.thesis,
        visualMechanism: d.visualMechanism,
        thesisSnippet: (d.thesis || '').slice(0, 100),
        mechanismSnippet: (d.visualMechanism || '').slice(0, 100),
      })),
      // Save DNA/grammar names
      dnaNames: (ws.visualCanon?.visualDNA?.requiredElementIds || []),
      grammarNames: (ws.visualCanon?.visualGrammar?.compositionRules || []).map((r) => r.id),
      lockedAssetRules: (ws.visualCanon?.lockedAssetRules || []).length,
      // Truth
      truthBrand: ws.truth?.lockedAssets?.brand?.name,
      truthIndustry: ws.truth?.analysisContext?.detectedIndustry,
      truthConfidence: ws.truth?.analysisContext?.confidence,
      truth: ws.truth,
      evidence: ws.evidence,
      needs: ws.needs,
      insights: ws.insights,
      opportunityMap: ws.opportunityMap,
      recommendation: ws.recommendation,
      selection: ws.selection,
      selectedDirectionSnapshot: ws.selectedDirectionSnapshot,
      evaluation: ws.evaluation,
      run: ws.run,
      // raw for diff
      conceptSetConcepts: (ws.conceptSet?.concepts || []).map((c) => ({
        id: c.id, name: c.name, status: c.status, mechanism: c.mechanism,
        opportunityRef: c.opportunityRef,
      })),
    };
  }
  const out = path.join(repoRoot, '.codex-smoke', 'ci-w1c-attempt-2', 'qualification-extract.json');
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`WROTE ${out}`);
} catch (err) {
  console.error('FAILED', err.message);
  process.exitCode = 1;
} finally {
  try { hostProc.kill('SIGKILL'); } catch {}
  await sleep(500);
  process.exit(process.exitCode || 0);
}
