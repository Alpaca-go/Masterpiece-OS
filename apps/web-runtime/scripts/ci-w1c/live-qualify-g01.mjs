// CI-W1C.7.2-R0 PART F — Live qualification of G01 九州美学
//
// First live API call against the real G01 project. Resolves
// the user's saved API profile (encrypted at rest) and calls
// creative-reasoning-service.run with a real Qwen reasoner
// factory. Stops after G01 (per CI-W1C.7.2 PART G human release
// gate).
//
// Usage:
//   node --experimental-strip-types --no-warnings \
//        apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs \
//        --project G01 --output-root <dir>

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';

import { createOpenAICompatibleTextReasoner } from '@masterpiece/model-runtime/openai-compatible-text-reasoner';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..', '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    project: 'G01',
    outputRoot: path.join(repoRoot, 'docs', 'creative-intelligence', 'ci-w1c.7.2', 'g01-runtime'),
    userDataRoot: process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'masterpiece-os-desktop')
      : (process.platform === 'darwin'
          ? path.join(os.homedir(), 'Library', 'Application Support', 'masterpiece-os-desktop')
          : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'masterpiece-os-desktop')),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') out.project = argv[++i];
    else if (a === '--output-root') out.outputRoot = path.resolve(argv[++i]);
    else if (a === '--user-data-root') out.userDataRoot = path.resolve(argv[++i]);
    else throw new Error(`unknown arg: ${a}`);
  }
  return out;
}

const PROJECT_REGISTRY = {
  G01: { dirName: '九州美学-590eadf2', expectedProjectId: '590eadf2-76cb-4042-a034-db93481b06c9' },
  G02: { dirName: '一剂良方-a13d6c09', expectedProjectId: 'a13d6c09-99f7-4ff9-b499-3b9f8a1df31b' },
};

// ---------------------------------------------------------------------------
// Read credentials from the userData dir (same AES-256-GCM
// scheme as apps/web-runtime/src/node-credential-store.ts).
// We avoid booting the Web Host for this — direct file read
// is faster and lets the script be a one-shot.
// ---------------------------------------------------------------------------

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

async function readCredentials(userDataRoot, profileId) {
  const settingsPath = path.join(userDataRoot, 'settings.json');
  const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
  const profile = settings.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error(`profile not found in settings.json: ${profileId}`);
  if (!profile.isEnabled) throw new Error(`profile is disabled: ${profileId}`);
  const masterKeyPath = path.join(userDataRoot, 'node-credentials', 'master.key');
  const cipherPath = path.join(userDataRoot, 'node-credentials', `${profileId}.bin`);
  const masterKey = await fs.readFile(masterKeyPath);
  if (masterKey.length !== KEY_BYTES) throw new Error('NODE_CREDENTIAL_MASTER_KEY_INVALID');
  const cipher = await fs.readFile(cipherPath);
  if (cipher.length <= IV_BYTES + TAG_BYTES) throw new Error('NODE_CREDENTIAL_PAYLOAD_INVALID');
  const iv = cipher.subarray(0, IV_BYTES);
  const tag = cipher.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const payload = cipher.subarray(IV_BYTES + TAG_BYTES);
  const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
  decipher.setAuthTag(tag);
  const apiKey = Buffer.concat([decipher.update(payload), decipher.final()]).toString('utf8');
  return {
    profileId: profile.id,
    provider: profile.provider,
    protocol: profile.protocol,
    modelType: profile.modelType,
    baseUrl: profile.baseUrl,
    model: profile.modelId,
    apiKey,
  };
}

async function getDefaultProfile(userDataRoot) {
  const settings = JSON.parse(await fs.readFile(path.join(userDataRoot, 'settings.json'), 'utf8'));
  if (!settings.defaultProfileId) throw new Error('No default profile configured');
  return settings.profiles.find((p) => p.id === settings.defaultProfileId);
}

// ---------------------------------------------------------------------------
// Load real project data
// ---------------------------------------------------------------------------

async function loadRealProject(args) {
  const reg = PROJECT_REGISTRY[args.project];
  if (!reg) throw new Error(`unknown project: ${args.project}`);
  // The userData root (settings.json + node-credentials) is at
  // %APPDATA%/masterpiece-os-desktop/. The PROJECT DATA root is
  // a SEPARATE path: settings.json's `defaultDataPath`
  // (defaults to `%APPDATA%/masterpiece-os-desktop/Masterpiece OS
  // Data` but the user may have moved it to `Documents/`).
  const settings = JSON.parse(await fs.readFile(path.join(args.userDataRoot, 'settings.json'), 'utf8'));
  const dataRoot = settings.defaultDataPath;
  if (!dataRoot) throw new Error('settings.json has no defaultDataPath');
  const projectDir = path.join(dataRoot, 'projects', reg.dirName);
  const projectJsonPath = path.join(projectDir, 'project.json');
  const dir = path.join(projectDir, 'project-context', 'creative-intelligence-shadow');
  const [projectRecord, truthDoc, needsDoc, evidenceDoc] = await Promise.all([
    fs.readFile(projectJsonPath, 'utf8').then(JSON.parse).catch(() => null),
    fs.readFile(path.join(dir, 'project-truth.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(dir, 'need-intelligence.json'), 'utf8').then(JSON.parse),
    fs.readFile(path.join(dir, 'evidence-ledger.json'), 'utf8').then(JSON.parse),
  ]);
  if (truthDoc.projectId !== reg.expectedProjectId) {
    throw new Error(`projectId mismatch for ${args.project}: expected=${reg.expectedProjectId} actual=${truthDoc.projectId}`);
  }
  return {
    project: args.project,
    projectId: truthDoc.projectId,
    dataRoot,
    projectDir,
    projectRecord,
    truth: truthDoc,
    needs: needsDoc.needs || [],
    evidence: evidenceDoc,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reg = PROJECT_REGISTRY[args.project];
  console.log(`CI-W1C.7.2-R0 PART F — live qualification of ${args.project}`);
  console.log(`userData: ${args.userDataRoot}`);
  console.log(`outputRoot: ${args.outputRoot}`);
  console.log(`expected projectId: ${reg.expectedProjectId}`);

  // 1. Load real project data
  const real = await loadRealProject(args);
  console.log(`Loaded ${args.project}: projectId=${real.projectId} dataRoot=${real.dataRoot} facts=${real.truth.facts.length} needs=${real.needs.length} evidence=${real.evidence.entries.length}`);

  // 2. Resolve credentials + default profile (no Web Host needed)
  const defaultProfile = await getDefaultProfile(args.userDataRoot);
  const creds = await readCredentials(args.userDataRoot, defaultProfile.id);
  const providerMeta = {
    profileId: creds.profileId,
    provider: creds.provider,
    model: creds.model,
    baseUrl: creds.baseUrl,
    protocol: creds.protocol,
    modelType: creds.modelType,
    hasApiKey: Boolean(creds.apiKey),
  };
  console.log(`Resolved provider: ${JSON.stringify({ ...providerMeta, hasApiKey: true })}`);

  // 3. Build a live Qwen reasoner factory that fits the
  // creative-reasoning-service's ModelReasoner contract.
  const callRecords = [];
  const liveReasoner = createOpenAICompatibleTextReasoner({
    apiKey: creds.apiKey,
    model: creds.model,
    provider: creds.provider,
    baseUrl: creds.baseUrl,
  });
  function reasonerFactory() {
    return async (input) => {
      const t0 = Date.now();
      let result;
      let error = null;
      try {
        result = await liveReasoner(input.prompt.messages, {
          signal: input.signal,
          maximumDurationMs: input.maximumDurationMs || 180_000,
        });
      } catch (e) {
        error = e;
      }
      const latency = Date.now() - t0;
      const record = {
        timestamp: new Date().toISOString(),
        provider: creds.provider,
        model: creds.model,
        latencyMs: latency,
        inputCharacters: input.prompt.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0),
      };
      if (error) {
        record.error = error.message;
        record.errorCode = error.code;
      } else {
        record.finishReason = result.finishReason;
        record.outputCharacters = (result.text || '').length;
        record.usage = result.usage;
      }
      callRecords.push(record);
      if (error) throw error;
      return { reportMarkdown: result.text };
    };
  }
  const readCredentialsFn = async (profileId) => readCredentials(args.userDataRoot, profileId || defaultProfile.id);

  // 4. CI-W1C.7.4-R2 PART G — run the CANONICAL orchestrator.
  //    The script is now a thin caller; it does NOT manually
  //    compose the carriers (project / planning loader / truth /
  //    need / evidence / service.run). Everything is owned by
  //    `runCreativeReasoningForProject`.
  await fs.mkdir(args.outputRoot, { recursive: true });
  const { runCreativeReasoningForProject } = await import(
    pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts')).href
  );

  const startedAt = Date.now();
  let result;
  try {
    result = await runCreativeReasoningForProject(
      {
        projectId: real.projectId,
        analysisProfileId: defaultProfile.id,
        useMock: false,
        reasonerFactory,
        readCredentials: readCredentialsFn
      },
      {
        projectStore: {
          async get(id) {
            return real.projectRecord ?? { id, planningBriefFiles: [] };
          },
          async paths() {
            return { root: real.projectDir, input: '', prepared: '', outputs: '', runtime: '' };
          },
          async remove() {}
        },
        outputRoot: async (projectId) => path.join(args.outputRoot, projectId),
        // The production default loader reads the shadow carriers
        // from `<projectDir>/project-context/creative-intelligence-shadow/`.
        // The live qualifier already has Truth/Need/Evidence in
        // memory (from `loadRealProject`); the orchestrator uses
        // them as the source of record for the reasoning context.
        async loadReasoningContext(_project, _projectRoot) {
          return { truth: real.truth, needs: real.needs, evidence: real.evidence };
        }
      }
    );
  } catch (error) {
    const finishedAt = Date.now();
    await fs.writeFile(path.join(args.outputRoot, `${args.project.toLowerCase()}-live-qualification-error.json`), {
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date(finishedAt).toISOString(),
      durationMs: finishedAt - startedAt,
      project: args.project,
      projectId: real.projectId,
      provider: providerMeta,
      error: error.message,
      stack: error.stack,
      callRecords,
    }, null, 2);
    console.error(`FATAL ${error.message}\n${error.stack || ''}`);
    process.exit(1);
  }

  const finishedAt = Date.now();
  const summary = {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    project: args.project,
    projectId: real.projectId,
    provider: providerMeta,
    mode: result.mode,
    imageProviderCallCount: result.imageProviderCallCount,
    analysisProviderCallCount: callRecords.length,
    callRecords,
    planningEvidence: { loaded: true, source: 'orchestrator', orchestrator: 'runCreativeReasoningForProject' },
    stages: {
      synthesis: {
        status: result.stages.synthesis.status,
        attempts: result.stages.synthesis.attempts,
        passed: result.stages.synthesis.passed,
        blockedCodes: result.stages.synthesis.blockedCodes,
      },
      concept: {
        status: result.stages.concept.status,
        attempts: result.stages.concept.attempts,
        passed: result.stages.concept.passed,
        blockedCodes: result.stages.concept.blockedCodes,
      },
      direction: {
        status: result.stages.direction.status,
        attempts: result.stages.direction.attempts,
        passed: result.stages.direction.passed,
        blockedCodes: result.stages.direction.blockedCodes,
      },
    },
    synthesis: result.shadow.synthesis,
    conceptSet: result.shadow.conceptSet,
    directionSet: result.shadow.directionSet,
    report: result.shadow.report,
    reportMarkdown: result.shadow.reportMarkdown,
    outputPaths: result.outputPaths,
  };
  await fs.writeFile(path.join(args.outputRoot, `${args.project.toLowerCase()}-live-qualification-summary.json`), JSON.stringify(summary, null, 2));
  console.log(`FINISHED mode=${result.mode} analysisCalls=${callRecords.length} imageCalls=${result.imageProviderCallCount}`);
  console.log(`Synthesis: status=${result.stages.synthesis.status} attempts=${result.stages.synthesis.attempts} passed=${result.stages.synthesis.passed}`);
  console.log(`Concept: status=${result.stages.concept.status} attempts=${result.stages.concept.attempts} passed=${result.stages.concept.passed}`);
  console.log(`Direction: status=${result.stages.direction.status} attempts=${result.stages.direction.attempts} passed=${result.stages.direction.passed}`);
}

main().catch((error) => {
  console.error(`FATAL ${error.message}\n${error.stack || ''}`);
  process.exit(1);
});
