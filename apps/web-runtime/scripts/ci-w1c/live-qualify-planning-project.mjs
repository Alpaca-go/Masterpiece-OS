// CI-W1C.7.5 — Real Planning-Document Live Text Qualification
// (PART R — Allowed thin qualification script.)
//
// The live reasoning closure uses only the canonical project-level
// orchestrator: runCreativeReasoningForProject(). Before the live run,
// this qualification script may call
// loadPlanningStrategicEvidenceForProject() solely to export the
// pre-call planning intake audit artifact. That result is never used
// to construct the Strategic prompt or bypass the orchestrator.
//
// The script does not manually call compileStrategicReasoningContext
// or buildStrategicSynthesisPrompt, and it never calls image generation.
//
// Usage:
//   node --experimental-strip-types --no-warnings \
//        apps/web-runtime/scripts/ci-w1c/live-qualify-planning-project.mjs \
//        --project G01 \
//        --planning-brief-path <abs path to .md/.docx/.txt/.pdf> \
//        --output-root <dir> \
//        --user-data-root <dir containing settings.json + node-credentials/>
//
//   --register-only       : only register the planning brief + export
//                           g01-planning-intake.{json,md}; do not call the
//                           orchestrator. Used for the PART D preflight
//                           human claim audit before the live model call.

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const webRuntimeRoot = path.resolve(scriptDir, '..', '..');
const repoRoot = path.resolve(webRuntimeRoot, '..', '..');

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    project: 'G01',
    planningBriefPath: '',
    outputRoot: path.join(repoRoot, 'docs', 'creative-intelligence', 'ci-w1c.7.5'),
    userDataRoot: process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'masterpiece-os-desktop')
      : (process.platform === 'darwin'
          ? path.join(os.homedir(), 'Library', 'Application Support', 'masterpiece-os-desktop')
          : path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'masterpiece-os-desktop')),
    registerOnly: false,
    analysisProfileId: ''
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') out.project = argv[++i];
    else if (a === '--planning-brief-path') out.planningBriefPath = path.resolve(argv[++i]);
    else if (a === '--output-root') out.outputRoot = path.resolve(argv[++i]);
    else if (a === '--user-data-root') out.userDataRoot = path.resolve(argv[++i]);
    else if (a === '--register-only') out.registerOnly = true;
    else if (a === '--analysis-profile-id') out.analysisProfileId = argv[++i];
    else throw new Error(`unknown arg: ${a}`);
  }
  if (!out.planningBriefPath) {
    throw new Error('--planning-brief-path is required');
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
// ---------------------------------------------------------------------------

const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

async function readSettings(userDataRoot) {
  const settingsPath = path.join(userDataRoot, 'settings.json');
  return JSON.parse(await fs.readFile(settingsPath, 'utf8'));
}

async function readCredentials(userDataRoot, profileId) {
  const settings = await readSettings(userDataRoot);
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reg = PROJECT_REGISTRY[args.project];
  if (!reg) throw new Error(`unknown project: ${args.project}`);
  console.log(`CI-W1C.7.5 — real planning qualification of ${args.project}`);
  console.log(`  planning brief: ${args.planningBriefPath}`);
  console.log(`  userData: ${args.userDataRoot}`);
  console.log(`  outputRoot: ${args.outputRoot}`);
  console.log(`  expected projectId: ${reg.expectedProjectId}`);
  console.log(`  registerOnly: ${args.registerOnly}`);

  // 1) Resolve settings + profile.
  const settings = await readSettings(args.userDataRoot);
  const dataRoot = settings.defaultDataPath;
  if (!dataRoot) throw new Error('settings.json has no defaultDataPath');
  const profileId = args.analysisProfileId || settings.defaultProfileId;
  if (!profileId) throw new Error('No default profile configured and --analysis-profile-id not given');
  const profile = settings.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error(`profile not found: ${profileId}`);

  // 2) Build a real project-store against the user's dataRoot.
  const projectStoreUrl = pathToFileURL(
    path.join(repoRoot, 'packages/runtime-core/src/application/project-store.ts')
  ).href;
  const { createProjectStore } = await import(projectStoreUrl);
  const readSettingsForStore = async () => settings;
  const projectStore = createProjectStore(readSettingsForStore);

  // 3) Load project record + locate by directory name.
  const projectDir = path.join(dataRoot, 'projects', reg.dirName);
  const projectJsonPath = path.join(projectDir, 'project.json');
  let projectRecord;
  try {
    projectRecord = JSON.parse(await fs.readFile(projectJsonPath, 'utf8'));
  } catch (e) {
    throw new Error(`failed to read project.json at ${projectJsonPath}: ${e.message}`);
  }
  const projectId = projectRecord.id;
  if (projectId !== reg.expectedProjectId) {
    throw new Error(`projectId mismatch: expected=${reg.expectedProjectId} actual=${projectId}`);
  }
  console.log(`  resolved projectId=${projectId}`);
  console.log(`  profile: ${profile.id} provider=${profile.provider} model=${profile.modelId} baseUrl=${profile.baseUrl}`);

  // 4) Register the explicitly supplied planning brief via the
  // canonical path. Never derive planningBriefPath from its parent
  // directory and never scan siblings of planningBriefPath.
  await fs.mkdir(args.outputRoot, { recursive: true });
  const record = await projectStore.registerPlanningBriefFromPath({
    projectId,
    sourcePath: args.planningBriefPath,
    displayFilename: path.basename(args.planningBriefPath)
  });
  console.log(`  registered planning-brief: sourceId=${record.sourceId}`);
  console.log(`  contentHash=${record.contentHash.slice(0, 16)}...  relativePath=${record.relativePath}`);
  console.log(`  characterCount=${record.characterCount}  documentRole=${record.documentRole}`);

  // 5) Export the planning intake (canonical artifact) BEFORE any model call.
  const planningArtifactModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/runtime-core/src/application/planning-strategic-evidence-loader.ts')
  ).href);
  const planningArtifact = await planningArtifactModule.loadPlanningStrategicEvidenceForProject(projectStore, projectId);
  const intakeJson = {
    project: args.project,
    projectId,
    profile: { id: profile.id, provider: profile.provider, model: profile.modelId },
    planningBriefRegistration: {
      sourceId: record.sourceId,
      filename: record.filename,
      relativePath: record.relativePath,
      contentHash: record.contentHash,
      documentSetHash: record.documentSetHash,
      planningEvidenceFingerprint: record.planningEvidenceFingerprint,
      characterCount: record.characterCount,
      documentRole: record.documentRole,
      registeredAt: record.registeredAt
    },
    planningClaims: planningArtifact?.claims ?? [],
    exportedAt: new Date().toISOString()
  };
  await fs.writeFile(
    path.join(args.outputRoot, `${args.project.toLowerCase()}-planning-intake.json`),
    JSON.stringify(intakeJson, null, 2),
    'utf8'
  );
  // Companion .md
  const intakeMd = [
    `# ${args.project} Planning Intake`,
    ``,
    `> Exported BEFORE any model call (CI-W1C.7.5 PART D).`,
    ``,
    `## Source`,
    `- file: \`${record.filename}\``,
    `- sourceId: \`${record.sourceId}\``,
    `- relativePath: \`${record.relativePath}\``,
    `- contentHash: \`${record.contentHash}\``,
    `- documentSetHash: \`${record.documentSetHash ?? ''}\``,
    `- planningEvidenceFingerprint: \`${record.planningEvidenceFingerprint ?? ''}\``,
    `- characterCount: ${record.characterCount}`,
    `- documentRole: ${record.documentRole}`,
    ``,
    `## Claims (${(planningArtifact?.claims ?? []).length})`,
    ``,
    `| claimId | key | value | epistemicClass | confidence |`,
    `|---|---|---|---|---|`,
    ...(planningArtifact?.claims ?? []).map((c) => `| \`${c.claimId}\` | \`${c.key}\` | ${(c.value || '').replace(/\|/g, '\\|').slice(0, 120)} | ${c.epistemicClass} | ${c.confidence ?? ''} |`)
  ].join('\n');
  await fs.writeFile(
    path.join(args.outputRoot, `${args.project.toLowerCase()}-planning-intake.md`),
    intakeMd,
    'utf8'
  );
  console.log(`  exported: ${args.project.toLowerCase()}-planning-intake.{json,md} (${(planningArtifact?.claims ?? []).length} claims)`);

  if (args.registerOnly) {
    console.log('  registerOnly: stopping before live model call.');
    return;
  }

  // 6) Live reasoner factory (canonical, no manual prompts).
  const creds = await readCredentials(args.userDataRoot, profile.id);
  const providerMeta = {
    profileId: creds.profileId,
    provider: creds.provider,
    model: creds.model,
    baseUrl: creds.baseUrl,
    protocol: creds.protocol,
    modelType: creds.modelType,
    hasApiKey: Boolean(creds.apiKey),
  };
  const liveReasonerModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/model-runtime/src/openai-compatible-text-reasoner.js')
  ).href);
  const liveReasoner = liveReasonerModule.createOpenAICompatibleTextReasoner({
    apiKey: creds.apiKey,
    model: creds.model,
    provider: creds.provider,
    baseUrl: creds.baseUrl,
  });
  const callRecords = [];
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
  const readCredentialsFn = async (profileId) => readCredentials(args.userDataRoot, profileId || profile.id);

  // 7) Load real Truth / Need / Evidence from the shadow carriers.
  const shadowDir = path.join(projectDir, 'project-context', 'creative-intelligence-shadow');
  const truthDoc = JSON.parse(await fs.readFile(path.join(shadowDir, 'project-truth.json'), 'utf8'));
  const needsDoc = JSON.parse(await fs.readFile(path.join(shadowDir, 'need-intelligence.json'), 'utf8'));
  const evidenceDoc = JSON.parse(await fs.readFile(path.join(shadowDir, 'evidence-ledger.json'), 'utf8'));
  console.log(`  shadow: facts=${truthDoc.facts?.length ?? 0} needs=${needsDoc.needs?.length ?? 0} evidence=${evidenceDoc.entries?.length ?? 0}`);

  // 8) Run canonical orchestrator.
  const orchestratorUrl = pathToFileURL(
    path.join(repoRoot, 'packages/runtime-core/src/application/run-creative-reasoning-for-project.ts')
  ).href;
  const { runCreativeReasoningForProject } = await import(orchestratorUrl);

  const outputRootForProject = path.join(args.outputRoot, args.project);
  await fs.mkdir(outputRootForProject, { recursive: true });

  const startedAt = Date.now();
  let result;
  try {
    result = await runCreativeReasoningForProject(
      {
        projectId,
        analysisProfileId: profile.id,
        useMock: false,
        reasonerFactory,
        readCredentials: readCredentialsFn,
        qualificationBudget: {
          maxInputTokens: 32000,
          reservedOutputTokens: 4000,
          maxTotalInputTokens: 60000
        }
      },
      {
        projectStore,
        outputRoot: async (id) => path.join(outputRootForProject, 'out', id),
        async loadReasoningContext(_project, _projectRoot) {
          return { truth: truthDoc, needs: needsDoc.needs || [], evidence: evidenceDoc };
        }
      }
    );
  } catch (error) {
    const finishedAt = Date.now();
    await fs.writeFile(
      path.join(args.outputRoot, `${args.project.toLowerCase()}-live-qualification-error.json`),
      JSON.stringify({
        startedAt: new Date(startedAt).toISOString(),
        finishedAt: new Date(finishedAt).toISOString(),
        durationMs: finishedAt - startedAt,
        project: args.project,
        projectId,
        provider: providerMeta,
        error: error.message,
        stack: error.stack,
        callRecords,
        planningIntake: { sourceId: record.sourceId, claimCount: (planningArtifact?.claims ?? []).length }
      }, null, 2),
      'utf8'
    );
    console.error(`FATAL ${error.message}\n${error.stack || ''}`);
    process.exit(1);
  }

  const finishedAt = Date.now();
  const summary = {
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    project: args.project,
    projectId,
    provider: providerMeta,
    planningBriefRegistration: {
      sourceId: record.sourceId,
      filename: record.filename,
      contentHash: record.contentHash,
      characterCount: record.characterCount,
      documentRole: record.documentRole
    },
    mode: result.mode,
    imageProviderCallCount: result.imageProviderCallCount,
    analysisProviderCallCount: callRecords.length,
    callRecords,
    planningEvidence: { loaded: true, source: 'orchestrator', orchestrator: 'runCreativeReasoningForProject', claimCount: (planningArtifact?.claims ?? []).length },
    stages: {
      synthesis: { status: result.stages.synthesis.status, attempts: result.stages.synthesis.attempts, passed: result.stages.synthesis.passed, blockedCodes: result.stages.synthesis.blockedCodes },
      concept: { status: result.stages.concept.status, attempts: result.stages.concept.attempts, passed: result.stages.concept.passed, blockedCodes: result.stages.concept.blockedCodes },
      direction: { status: result.stages.direction.status, attempts: result.stages.direction.attempts, passed: result.stages.direction.passed, blockedCodes: result.stages.direction.blockedCodes }
    },
    synthesis: result.shadow.synthesis,
    conceptSet: result.shadow.conceptSet,
    directionSet: result.shadow.directionSet,
    report: result.shadow.report,
    reportMarkdown: result.shadow.reportMarkdown,
    outputPaths: result.outputPaths,
  };
  await fs.writeFile(
    path.join(args.outputRoot, `${args.project.toLowerCase()}-live-qualification-summary.json`),
    JSON.stringify(summary, null, 2),
    'utf8'
  );
  console.log(`FINISHED mode=${result.mode} analysisCalls=${callRecords.length} imageCalls=${result.imageProviderCallCount}`);
  console.log(`Synthesis: status=${result.stages.synthesis.status} attempts=${result.stages.synthesis.attempts} passed=${result.stages.synthesis.passed}`);
  console.log(`Concept: status=${result.stages.concept.status} attempts=${result.stages.concept.attempts} passed=${result.stages.concept.passed}`);
  console.log(`Direction: status=${result.stages.direction.status} attempts=${result.stages.direction.attempts} passed=${result.stages.direction.passed}`);
}

main().catch((error) => {
  console.error(`FATAL ${error.message}\n${error.stack || ''}`);
  process.exit(1);
});
