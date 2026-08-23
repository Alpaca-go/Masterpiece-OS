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
// The script never builds or substitutes a model prompt and never calls
// image generation. After the production run it may compile the same
// Strategic context solely to replay parser/gate audit evidence against
// the exact production SOURCE TRACE IDS.
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
//   --strategic-only      : ask canonical production orchestration to stop after
//                           Strategic Synthesis; Concept / Direction remain NOT_RUN.

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
    strategicOnly: false,
    analysisProfileId: '',
    timeoutMs: 0,
    expectedProvider: '',
    expectedModel: ''
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') out.project = argv[++i];
    else if (a === '--planning-brief-path') out.planningBriefPath = path.resolve(argv[++i]);
    else if (a === '--output-root') out.outputRoot = path.resolve(argv[++i]);
    else if (a === '--user-data-root') out.userDataRoot = path.resolve(argv[++i]);
    else if (a === '--register-only') out.registerOnly = true;
    else if (a === '--strategic-only') out.strategicOnly = true;
    else if (a === '--analysis-profile-id') out.analysisProfileId = argv[++i];
    else if (a === '--timeout-ms') out.timeoutMs = Number(argv[++i]);
    else if (a === '--expected-provider') out.expectedProvider = argv[++i];
    else if (a === '--expected-model') out.expectedModel = argv[++i];
    else throw new Error(`unknown arg: ${a}`);
  }
  if (!out.planningBriefPath) {
    throw new Error('--planning-brief-path is required');
  }
  if (out.timeoutMs && (!Number.isInteger(out.timeoutMs) || out.timeoutMs <= 0)) {
    throw new Error('--timeout-ms must be a positive integer');
  }
  return out;
}

const PROJECT_REGISTRY = {
  G01: {
    dirName: '九州美学-590eadf2',
    expectedProjectId: '590eadf2-76cb-4042-a034-db93481b06c9',
    qualificationAnchorKeys: [
      'industry', 'brand_role', 'business_model', 'target_audience',
      'audience_problem', 'brand_promise', 'competitive_context',
      'differentiation_logic', 'strategic_objective', 'brand_positioning',
      'brand_personality', 'transformation_objective'
    ]
  },
  G02: {
    dirName: '一剂良方-a13d6c09',
    expectedProjectId: 'a13d6c09-99f7-4ff9-b499-3b9f8a1df31b',
    qualificationAnchorKeys: []
  },
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
  console.log(`  strategicOnly: ${args.strategicOnly}`);

  // 1) Resolve settings + profile.
  const settings = await readSettings(args.userDataRoot);
  const dataRoot = settings.defaultDataPath;
  if (!dataRoot) throw new Error('settings.json has no defaultDataPath');
  const profileId = args.analysisProfileId || settings.defaultProfileId;
  if (!profileId) throw new Error('No default profile configured and --analysis-profile-id not given');
  const profile = settings.profiles.find((p) => p.id === profileId);
  if (!profile) throw new Error(`profile not found: ${profileId}`);
  if (args.expectedProvider && profile.provider !== args.expectedProvider) {
    throw new Error(`AUTHORIZED_PROVIDER_MISMATCH: expected=${args.expectedProvider} actual=${profile.provider}`);
  }
  if (args.expectedModel && profile.modelId !== args.expectedModel) {
    throw new Error(`AUTHORIZED_MODEL_MISMATCH: expected=${args.expectedModel} actual=${profile.modelId}`);
  }

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
  const sourceSha256 = crypto.createHash('sha256')
    .update(await fs.readFile(args.planningBriefPath))
    .digest('hex')
    .toUpperCase();

  // 5) Export the planning intake (canonical artifact) BEFORE any model call.
  const planningArtifactModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/runtime-core/src/application/planning-strategic-evidence-loader.ts')
  ).href);
  const planningArtifact = await planningArtifactModule.loadPlanningStrategicEvidenceForProject(projectStore, projectId);
  const strategicModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/creative-intelligence/src/strategic-synthesis/index.ts')
  ).href);
  const documentIntelligenceModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/creative-intelligence/src/document-intelligence/index.ts')
  ).href);
  const documentPreparationModule = await import(pathToFileURL(
    path.join(repoRoot, 'packages/document-ingestion/src/document-preparation.js')
  ).href);
  const registeredBrief = await strategicModule.readPlanningBriefFile(path.join(projectDir, record.relativePath));
  const structuredSourceDocument = planningArtifact?.sourceDocuments?.find((source) => source.filename === record.filename);
  const documentRole = structuredSourceDocument?.documentRole ?? record.documentRole;
  const sourceRole = strategicModule.mapRoleToSourceRole(documentRole);
  const sourceDocumentId = strategicModule.buildSourceDocumentId(
    projectId,
    sourceRole,
    record.filename,
    record.contentHash
  );
  const preparedDocumentSet = documentPreparationModule.prepareDocumentSet({
    projectId,
    corpus: {
      documents: [{
        id: record.sourceId,
        filename: record.filename,
        sourceType: 'planning_document',
        rawText: registeredBrief.rawText,
        characterCount: registeredBrief.rawText.length,
        documentRole,
        sections: [{ heading: '全文', content: registeredBrief.rawText }]
      }]
    }
  });
  const structuredCoverage = strategicModule.computeStructuredExtractionCoverage({
    claims: (planningArtifact?.claims ?? []).filter((claim) => claim.sourceDocumentId === sourceDocumentId),
    chunks: preparedDocumentSet.chunks,
    rawText: registeredBrief.rawText
  });
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
    structuredCoverage,
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
    `- structuredCoverage: ${structuredCoverage.sufficient ? 'sufficient' : 'insufficient'} (${structuredCoverage.reason})`,
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
  const rawOutputs = [];
  const scopeBlockedStages = [];
  const classifyStage = (messages) => {
    const text = messages.map((message) => message.content || '').join('\n');
    if (/Planning Semantic Extraction engine/i.test(text)) return 'planning_narrative';
    if (/ModelAssistedDirectionSet/i.test(text)) return 'direction';
    if (/ModelAssistedConceptSet/i.test(text)) return 'concept';
    if (/StrategicSynthesisArtifact/i.test(text)) return 'strategic_synthesis';
    return 'unknown';
  };
  function reasonerFactory() {
    return async (input) => {
      const stage = classifyStage(input.prompt.messages);
      if (args.strategicOnly && (stage === 'concept' || stage === 'direction')) {
        scopeBlockedStages.push({ stage, timestamp: new Date().toISOString() });
        const boundaryError = new Error(`G01_QUALIFICATION_UNEXPECTED_STAGE_${stage.toUpperCase()}`);
        boundaryError.code = 'G01_QUALIFICATION_UNEXPECTED_STAGE';
        throw boundaryError;
      }
      if (stage === 'unknown') {
        throw new Error('G01_QUALIFICATION_UNKNOWN_MODEL_STAGE');
      }
      const t0 = Date.now();
      let result;
      let error = null;
      try {
        result = await liveReasoner(input.prompt.messages, {
          signal: input.signal,
          requestTimeoutMs: input.requestTimeoutMs,
        });
      } catch (e) {
        error = e;
      }
      const latency = Date.now() - t0;
      const record = {
        timestamp: new Date().toISOString(),
        stage,
        attemptKind: input.attemptKind || 'BASE',
        provider: creds.provider,
        model: creds.model,
        latencyMs: latency,
        success: !error,
        inputCharacters: input.prompt.messages.reduce((sum, m) => sum + (m.content?.length || 0), 0),
      };
      if (error) {
        const failure = liveReasonerModule.classifyProviderFailure(error);
        record.error = error.message;
        record.errorCode = failure.errorCode;
        record.causeCode = failure.causeCode;
        record.failureClass = failure.failureClass;
        record.retryable = failure.retryable;
        record.responseHeadersReceived = failure.responseHeadersReceived;
      } else {
        record.responseHeadersReceived = true;
        record.finishReason = result.finishReason;
        record.outputCharacters = (result.text || '').length;
        record.usage = result.usage;
        rawOutputs.push({ stage, attempt: rawOutputs.filter((entry) => entry.stage === stage).length + 1, text: result.text });
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
        ...(args.strategicOnly ? { stopAfter: 'synthesis' } : {}),
        analysisProfileId: profile.id,
        useMock: false,
        reasonerFactory,
        readCredentials: readCredentialsFn,
        qualificationBudget: {
          maxInputTokens: 32000,
          reservedOutputTokens: 4000,
          maxTotalInputTokens: 60000
        },
        ...(args.timeoutMs ? {
          qualificationTimeouts: {
            planningNarrativeMs: args.timeoutMs,
            strategicSynthesisMs: args.timeoutMs
          }
        } : {})
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
        rawOutputs,
        scopeBlockedStages,
        structuredCoverage,
        planningIntake: { sourceId: record.sourceId, claimCount: (planningArtifact?.claims ?? []).length }
      }, null, 2),
      'utf8'
    );
    console.error(`FATAL ${error.message}\n${error.stack || ''}`);
    process.exit(1);
  }

  const finishedAt = Date.now();
  let normalizedPlanningExtraction = null;
  let narrativeClaims = [];
  const narrativeValidationAttempts = [];
  for (const output of rawOutputs.filter((entry) => entry.stage === 'planning_narrative')) {
    try {
      const parsed = documentIntelligenceModule.parseModelJson(output.text);
      const validation = strategicModule.validatePlanningSemanticExtractionResult(parsed);
      narrativeValidationAttempts.push({ attempt: output.attempt, valid: validation.valid, errors: validation.errors });
      if (!validation.valid) continue;
      normalizedPlanningExtraction = strategicModule.normalizePlanningSemanticExtractionResult(parsed);
      narrativeClaims = strategicModule.projectPlanningExtractionToClaims({
        extraction: normalizedPlanningExtraction,
        sourceDocumentId,
        documentRole
      });
      break;
    } catch (error) {
      narrativeValidationAttempts.push({ attempt: output.attempt, valid: false, errors: [error.message] });
    }
  }
  const finalPlanningArtifact = narrativeClaims.length > 0
    ? await planningArtifactModule.loadPlanningStrategicEvidenceForProject(projectStore, projectId, { narrativeClaims })
    : planningArtifact;
  const synthesisAuditContext = strategicModule.compileStrategicReasoningContext({
    projectId,
    truth: truthDoc,
    needs: needsDoc.needs || [],
    evidence: evidenceDoc,
    planningStrategicEvidence: finalPlanningArtifact?.claims ?? []
  });
  const strategicAttemptAudits = [];
  for (const output of rawOutputs.filter((entry) => entry.stage === 'strategic_synthesis')) {
    try {
      const artifact = strategicModule.parseStrategicSynthesis({
        rawText: output.text,
        projectId,
        attempt: output.attempt,
        provider: creds.provider,
        model: creds.model,
        modelCallCount: output.attempt
      });
      const structural = strategicModule.validateStrategicSynthesisStructural(artifact);
      const grounding = strategicModule.runStrategicGroundingGate({
        artifact,
        truth: truthDoc,
        needs: needsDoc.needs || [],
        evidence: evidenceDoc,
        planningClaims: finalPlanningArtifact?.claims ?? [],
        allowedSourceIds: synthesisAuditContext.sourceIds
      });
      strategicAttemptAudits.push({
        attempt: output.attempt,
        parsed: true,
        blockedCodes: Array.from(new Set([...structural.blockedCodes, ...grounding.blockedCodes])),
        structuralBlockedCodes: structural.blockedCodes,
        groundingBlockedCodes: grounding.blockedCodes,
        sourceMap: artifact.sourceMap
      });
    } catch (error) {
      strategicAttemptAudits.push({
        attempt: output.attempt,
        parsed: false,
        blockedCodes: [error.code || 'PARSE_FAILED'],
        parseError: error.code || error.name || 'PARSE_FAILED'
      });
    }
  }
  const acceptedSynthesis = result.shadow.synthesis;
  const planningClaims = finalPlanningArtifact?.claims ?? [];
  const sourceTextByKey = normalizedPlanningExtraction
    ? Object.fromEntries(normalizedPlanningExtraction.claims.map((claim) => [
        claim.key,
        strategicModule.collectPlanningSourceSectionText(
          registeredBrief.rawText,
          claim.evidence.map((entry) => entry.section).filter(Boolean)
        )
      ]))
    : {};
  const planningEpistemicAudit = normalizedPlanningExtraction
    ? strategicModule.buildPlanningEpistemicAudit({
        extraction: normalizedPlanningExtraction,
        finalClaims: planningClaims,
        documentRole,
        sourceTextByKey
      })
    : [];
  const anchorClaimIds = planningClaims
    .filter((claim) => reg.qualificationAnchorKeys.includes(claim.key))
    .map((claim) => claim.claimId);
  const strategicUsage = acceptedSynthesis
    ? strategicModule.auditStrategicPlanningUsage({
        artifact: acceptedSynthesis,
        allowedPlanningClaimIds: synthesisAuditContext.sourceIds.planningClaims,
        anchorClaimIds
      })
    : {
        projectUnderstanding: { planningClaimRefs: [] },
        tensions: [],
        insights: [],
        opportunities: [],
        usedPlanningClaimIds: [],
        usedPlanningClaimCount: 0,
        totalPlanningClaimRefOccurrences: 0,
        uncitedPlanningClaimIds: [...synthesisAuditContext.sourceIds.planningClaims],
        directAnchorTraceCoverage: {
          evaluatedAnchorClaimIds: anchorClaimIds,
          citedAnchorClaimIds: [],
          uncitedAnchorClaimIds: anchorClaimIds,
          citedCount: 0,
          totalCount: anchorClaimIds.length,
          ratio: anchorClaimIds.length === 0 ? 1 : 0
        }
      };
  const redactedEvidenceV2 = {
    schemaVersion: strategicModule.QUALIFICATION_EVIDENCE_V2_1_SCHEMA_VERSION,
    sourceHashes: {
      sha256: sourceSha256,
      registeredContentHash: record.contentHash
    },
    callLedger: callRecords.map((call) => ({
      stage: call.stage,
      attemptKind: call.attemptKind,
      provider: call.provider,
      model: call.model,
      latencyMs: call.latencyMs,
      success: call.success,
      responseHeadersReceived: call.responseHeadersReceived,
      errorCode: call.errorCode || null,
      causeCode: call.causeCode || null,
      failureClass: call.failureClass || null,
      retryable: typeof call.retryable === 'boolean' ? call.retryable : null,
      ...(call.finishReason ? { finishReason: call.finishReason } : {}),
      ...(call.usage ? { usage: call.usage } : {})
    })),
    planningClaims: planningClaims.map((claim) => ({
        claimId: claim.claimId,
        key: claim.key,
        epistemicClass: claim.epistemicClass,
        sourceDocumentId: claim.sourceDocumentId,
        chunkRefs: claim.chunkRefs ?? []
    })),
    planningEpistemicAudit,
    allowedSourceSets: {
      facts: synthesisAuditContext.sourceIds.facts,
      needs: synthesisAuditContext.sourceIds.needs,
      evidence: synthesisAuditContext.sourceIds.evidence,
      planningClaims: synthesisAuditContext.sourceIds.planningClaims
    },
    artifactMirrorSets: {
      planningTruth: acceptedSynthesis?.sourceMap?.planningTruth ?? [],
      needs: acceptedSynthesis?.sourceMap?.needs ?? [],
      evidence: acceptedSynthesis?.sourceMap?.evidence ?? [],
      planningClaims: acceptedSynthesis?.sourceMap?.planningClaims ?? []
    },
    blockedCodes: {
      accepted: result.stages.synthesis.blockedCodes,
      attempts: strategicAttemptAudits.map((attempt) => ({
        attempt: attempt.attempt,
        blockedCodes: attempt.blockedCodes
      }))
    },
    stageStatuses: {
      synthesis: { status: result.stages.synthesis.status, attempts: result.stages.synthesis.attempts, providerAttempts: result.stages.synthesis.providerAttempts, transportRetries: result.stages.synthesis.transportRetries, semanticRepairAttempts: result.stages.synthesis.semanticRepairAttempts },
      concept: { status: result.stages.concept.status, attempts: result.stages.concept.attempts, providerAttempts: result.stages.concept.providerAttempts, transportRetries: result.stages.concept.transportRetries, semanticRepairAttempts: result.stages.concept.semanticRepairAttempts },
      direction: { status: result.stages.direction.status, attempts: result.stages.direction.attempts, providerAttempts: result.stages.direction.providerAttempts, transportRetries: result.stages.direction.transportRetries, semanticRepairAttempts: result.stages.direction.semanticRepairAttempts }
    },
    strategicUsage
  };
  const evidenceValidation = strategicModule.validateRedactedQualificationEvidenceV2(redactedEvidenceV2);
  if (!evidenceValidation.valid) {
    throw new Error(`QUALIFICATION_EVIDENCE_V2_INVALID: ${evidenceValidation.errors.join('; ')}`);
  }
  await fs.writeFile(
    path.join(args.outputRoot, `${args.project.toLowerCase()}-qualification-evidence.v2.runtime-redacted.json`),
    JSON.stringify(redactedEvidenceV2, null, 2),
    'utf8'
  );
  const runtimeAudit = {
    project: args.project,
    projectId,
    sourceDocumentId,
    structuredClaimCount: planningArtifact?.claims?.length ?? 0,
    structuredCoverage,
    narrativeRequired: !structuredCoverage.sufficient,
    narrativeValidationAttempts,
    normalizedPlanningExtraction,
    narrativeClaims,
    finalPlanningArtifact,
    synthesisAuditContext: { sourceIds: synthesisAuditContext.sourceIds },
    strategicAttemptAudits,
    rawOutputs,
    callRecords,
    scopeBlockedStages,
    productionOrchestrator: 'runCreativeReasoningForProject',
    imageProviderCallCount: result.imageProviderCallCount
  };
  await fs.writeFile(
    path.join(args.outputRoot, `${args.project.toLowerCase()}-planning-runtime-audit.json`),
    JSON.stringify(runtimeAudit, null, 2),
    'utf8'
  );
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
    scopeBlockedStages,
    strategicOnly: args.strategicOnly,
    planningEvidence: {
      loaded: true,
      source: 'orchestrator',
      orchestrator: 'runCreativeReasoningForProject',
      structuredClaimCount: planningArtifact?.claims?.length ?? 0,
      structuredCoverage,
      finalClaimCount: finalPlanningArtifact?.claims?.length ?? 0
    },
    qualificationFailureVerdict: strategicModule.classifyStrategicQualificationFailure({ stage: result.stages.synthesis, callLedger: callRecords }),
    stages: {
      synthesis: { status: result.stages.synthesis.status, attempts: result.stages.synthesis.attempts, providerAttempts: result.stages.synthesis.providerAttempts, transportRetries: result.stages.synthesis.transportRetries, semanticRepairAttempts: result.stages.synthesis.semanticRepairAttempts, passed: result.stages.synthesis.passed, failureClass: result.stages.synthesis.failureClass, blockedCodes: result.stages.synthesis.blockedCodes },
      concept: { status: result.stages.concept.status, attempts: result.stages.concept.attempts, providerAttempts: result.stages.concept.providerAttempts, transportRetries: result.stages.concept.transportRetries, semanticRepairAttempts: result.stages.concept.semanticRepairAttempts, passed: result.stages.concept.passed, failureClass: result.stages.concept.failureClass, blockedCodes: result.stages.concept.blockedCodes },
      direction: { status: result.stages.direction.status, attempts: result.stages.direction.attempts, providerAttempts: result.stages.direction.providerAttempts, transportRetries: result.stages.direction.transportRetries, semanticRepairAttempts: result.stages.direction.semanticRepairAttempts, passed: result.stages.direction.passed, failureClass: result.stages.direction.failureClass, blockedCodes: result.stages.direction.blockedCodes }
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
