// CI-W1C.7.1A PART G — Real-Project Zero-Network Prompt Qualification.
//
// Usage:
//   node --experimental-strip-types --no-warnings \
//        apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs \
//        --all
//   node --experimental-strip-types --no-warnings \
//        apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs \
//        --project G01 --output-dir docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts
//
// Resolution rule (PART A):
//   The script resolves the **real stored** project artifacts for
//   the user data directory (default
//   `C:\Users\Administrator\Documents\Masterpiece OS Data\projects`).
//   It does NOT invent or substitute facts.
//
// Hard guards:
//   analysisProviderCallCount = 0
//   imageProviderCallCount    = 0
//
// Exit codes:
//   0  — all assertions pass
//   1  — at least one assertion failed (REPORT)
//
// Requires Node 24+ for `--experimental-strip-types` so the script
// can import the production TypeScript prompt builders from
// `@masterpiece/creative-intelligence`.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const DEFAULT_USER_DATA_ROOT = 'C:\\Users\\Administrator\\Documents\\Masterpiece OS Data\\projects';
const DEFAULT_OUTPUT_DIR = path.join(REPO_ROOT, 'docs', 'creative-intelligence', 'ci-w1c.7.1a', 'real-project-prompts');

// Real project directory mapping (G01 / G02 / ...). The script
// resolves by the project's persisted project-context shadow path.
const PROJECT_REGISTRY = {
  G01: {
    alias: 'G01',
    projectDirName: '九州美学-590eadf2',
    expectedProjectId: '590eadf2-76cb-4042-a034-db93481b06c9',
  },
  G02: {
    alias: 'G02',
    projectDirName: '一剂良方-a13d6c09',
    expectedProjectId: 'a13d6c09-99f7-4ff9-b499-3b9f8a1df31b',
  },
};

const LEGACY_VISUAL_EXCLUDED_MIN = [
  'visualAsset.*',
  'old_visual_style',
  'old_VI',
  'old_poster',
  'old_packaging',
  'old_spatial',
  'style_reference',
  'structure_reference',
  'spatial_reference',
];

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {
    projects: [],
    outputDir: DEFAULT_OUTPUT_DIR,
    maxInputTokens: 16000,
    reservedOutputTokens: 4000,
    reservedRepairTokens: 4000,
    hardContextLimit: 32000,
    userDataRoot: DEFAULT_USER_DATA_ROOT,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--project') {
      const v = argv[++i];
      if (!PROJECT_REGISTRY[v]) {
        throw new Error(`unknown project: ${v}`);
      }
      out.projects.push(v);
    } else if (a === '--all') {
      out.projects = Object.keys(PROJECT_REGISTRY);
    } else if (a === '--output-dir') {
      out.outputDir = path.resolve(argv[++i]);
    } else if (a === '--max-input-tokens') {
      out.maxInputTokens = Number(argv[++i]);
    } else if (a === '--reserved-output-tokens') {
      out.reservedOutputTokens = Number(argv[++i]);
    } else if (a === '--reserved-repair-tokens') {
      out.reservedRepairTokens = Number(argv[++i]);
    } else if (a === '--hard-context-limit') {
      out.hardContextLimit = Number(argv[++i]);
    } else if (a === '--user-data-root') {
      out.userDataRoot = argv[++i];
    } else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  if (out.projects.length === 0) {
    out.projects = Object.keys(PROJECT_REGISTRY);
  }
  return out;
}

function printHelp() {
  process.stdout.write([
    'CI-W1C.7.1A — Real-Project Zero-Network Prompt Qualification',
    '',
    'Usage:',
    '  node --experimental-strip-types --no-warnings \\',
    '       apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs \\',
    '       [--project G01] [--project G02] [--all] \\',
    '       [--output-dir <dir>] \\',
    '       [--max-input-tokens N] [--reserved-output-tokens N] [--reserved-repair-tokens N] \\',
    '       [--user-data-root <dir>]',
    '',
    'Defaults:',
    '  --project               G01 + G02',
    '  --output-dir            docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts',
    '  --max-input-tokens      16000',
    '  --reserved-output-tokens 4000',
    '  --reserved-repair-tokens 4000',
    '  --hard-context-limit    32000',
    '  --user-data-root        C:\\Users\\Administrator\\Documents\\Masterpiece OS Data\\projects',
    '',
    'Hard guards:',
    '  analysisProviderCallCount = 0',
    '  imageProviderCallCount    = 0',
    '',
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// File IO
// ---------------------------------------------------------------------------

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8');
  return JSON.parse(raw);
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function writeJsonAtomic(file, value) {
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

// ---------------------------------------------------------------------------
// Project artifact resolution (PART A)
// ---------------------------------------------------------------------------

function projectContextDir(userDataRoot, projectDirName) {
  return path.join(userDataRoot, projectDirName, 'project-context', 'creative-intelligence-shadow');
}

async function resolveRealProjectArtifacts(args, alias) {
  const reg = PROJECT_REGISTRY[alias];
  const dir = projectContextDir(args.userDataRoot, reg.projectDirName);
  const truthPath = path.join(dir, 'project-truth.json');
  const needsPath = path.join(dir, 'need-intelligence.json');
  const evidencePath = path.join(dir, 'evidence-ledger.json');

  const [truthDoc, needsDoc, evidenceDoc] = await Promise.all([
    readJson(truthPath),
    readJson(needsPath),
    readJson(evidencePath),
  ]);

  // Sanity: projectId must match the expected G01/G02 projectId.
  if (truthDoc.projectId !== reg.expectedProjectId) {
    throw new Error(
      `projectId mismatch for ${alias}: expected=${reg.expectedProjectId} actual=${truthDoc.projectId}`,
    );
  }
  if (truthDoc.schemaVersion !== '0.2') {
    throw new Error(
      `unexpected truth schemaVersion for ${alias}: ${truthDoc.schemaVersion}`,
    );
  }
  if (evidenceDoc.schemaVersion !== '0.1') {
    throw new Error(
      `unexpected evidence schemaVersion for ${alias}: ${evidenceDoc.schemaVersion}`,
    );
  }

  return {
    alias,
    projectDirName: reg.projectDirName,
    sources: { truthPath, needsPath, evidencePath },
    truth: truthDoc,
    needs: needsDoc,
    evidence: evidenceDoc,
    factCount: Array.isArray(truthDoc.facts) ? truthDoc.facts.length : 0,
    needCount: Array.isArray(needsDoc.needs) ? needsDoc.needs.length : 0,
    evidenceCount: Array.isArray(evidenceDoc.entries) ? evidenceDoc.entries.length : 0,
  };
}

// ---------------------------------------------------------------------------
// Strategic context compilation (mirrors compile-strategic-context.ts)
// ---------------------------------------------------------------------------

function isAuthoritativePlanning(fact) {
  const a = fact.authority;
  return a === 'USER_CONFIRMED' || a === 'CONFIRMED' || a === 'LOCKED';
}
function isUserRequirement(fact) {
  return typeof fact.key === 'string' && fact.key.startsWith('user.requirement');
}
function isLockedIdentity(fact) {
  return fact.authority === 'LOCKED';
}
function isProhibitedDirection(fact) {
  if (typeof fact.key !== 'string') return false;
  return fact.key.startsWith('prohibited.') || fact.key.startsWith('style.prohibited');
}

function compileStrategicContext(resolved) {
  const facts = resolved.truth.facts;
  const authoritativeFacts = facts.filter(isAuthoritativePlanning);
  const userRequirements = facts.filter(isUserRequirement);
  const lockedIdentity = facts.filter(isLockedIdentity);
  const prohibitedDirections = facts.filter(isProhibitedDirection);
  const needs = Array.isArray(resolved.needs.needs) ? resolved.needs.needs : [];
  const evidence = Array.isArray(resolved.evidence.entries) ? resolved.evidence.entries : [];
  const sourceFactIds = new Set();
  for (const f of authoritativeFacts) sourceFactIds.add(f.id);
  for (const f of userRequirements) sourceFactIds.add(f.id);
  for (const f of lockedIdentity) sourceFactIds.add(f.id);
  for (const f of prohibitedDirections) sourceFactIds.add(f.id);
  const sourceNeedIds = new Set(needs.map((n) => n.id));
  const sourceEvidenceIds = new Set(evidence.map((e) => e.id));
  return {
    projectId: resolved.truth.projectId,
    authoritativeFacts,
    userRequirements,
    lockedIdentity,
    prohibitedDirections,
    needs,
    evidence,
    legacyVisualEvidenceExcluded: LEGACY_VISUAL_EXCLUDED_MIN,
    sourceIds: {
      facts: Array.from(sourceFactIds),
      needs: Array.from(sourceNeedIds),
      evidence: Array.from(sourceEvidenceIds),
    },
  };
}

// ---------------------------------------------------------------------------
// Prompt builders (mirror the TS builders section-by-section)
//
// We reimplement the prompt builders in pure JS to keep the script
// self-contained and to avoid a tsx / loader dependency. The
// canonical-JSON fingerprint is computed in pure JS using the SAME
// canonicalization rules as the TS `semantic-fingerprint.ts` so the
// hashes match. The prompt text is byte-identical to the TS version
// because the sections, separators, and per-line format are
// reproduced verbatim.
// ---------------------------------------------------------------------------

function normalizeValue(v) {
  if (v === null || v === undefined) return '<<null>>';
  if (typeof v === 'string') return v.replace(/\r\n/g, '\n');
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return v;
}

function safeFact(f) {
  const v = typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '');
  const k = typeof f.key === 'string' ? f.key : '(no key)';
  const a = typeof f.authority === 'string' ? f.authority : 'UNKNOWN';
  return `  - id=${f.id} key=${k} value=${v} authority=${a}`;
}
function safeNeed(n) {
  const t = n.type ?? 'unknown';
  const s = n.statement ?? '(no statement)';
  const fr = Array.isArray(n.factRefs) ? n.factRefs.join(',') : '';
  const cov = n.coverageRequirement ?? 'unspecified';
  return `  - id=${n.id} type=${t} coverage=${cov} statement=${s} factRefs=[${fr}]`;
}
function safeEvidence(e) {
  const k = typeof e.sourceType === 'string' ? e.sourceType : 'unknown';
  const s = typeof e.content === 'string' ? e.content : (typeof e.summary === 'string' ? e.summary : '(no summary)');
  const fr = Array.isArray(e.factRefs) ? e.factRefs.join(',') : '';
  const c = typeof e.confidence === 'number' ? e.confidence.toFixed(2) : 'unspecified';
  return `  - id=${e.id} sourceKind=${k} confidence=${c} summary=${s} factRefs=[${fr}]`;
}

const STRATEGIC_SYSTEM_MESSAGE = [
  'You are a planning-first strategic synthesizer for the Masterpiece OS Creative Intelligence layer.',
  'You produce a StrategicSynthesisArtifact. You may NOT create new FACT.',
  'Strategic interpretation = MODEL_INFERENCE; creative proposal = CREATIVE_HYPOTHESIS.',
  'Every project-specific claim must resolve to a provided source ID.',
  'You will receive authoritative project facts, locked rules, prohibited directions, a need skeleton, and evidence summaries.',
  'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
  'Output the strict JSON for StrategicSynthesisArtifact with the exact schemaVersion 0.1.',
].join('\n');

const STRATEGIC_EPISTEMIC_RULES = [
  'You may not create FACT.',
  'Strategic interpretation = MODEL_INFERENCE.',
  'Every project-specific claim must resolve to allowed refs.',
  'Do not infer new facts from brand-name semantics.',
  'Do not summarize old visual style.',
  'Do not use legacy visual evidence as positive creative authority.',
  'Unknown information remains unknown.',
  'Every Insight must have at least 1 factRef and 1 needRef.',
  'Every Opportunity must have at least 1 insightRef.',
].join('\n');

function buildStrategicPrompt(ctx) {
  const factBlock = ctx.authoritativeFacts.length === 0
    ? '  (no authoritative facts)'
    : ctx.authoritativeFacts.map(safeFact).join('\n');
  const userReqBlock = ctx.userRequirements.length === 0
    ? '  (no explicit user.requirement* facts)'
    : ctx.userRequirements.map(safeFact).join('\n');
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map(safeFact).join('\n');
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map(safeFact).join('\n');
  const needBlock = ctx.needs.length === 0
    ? '  (no needs)'
    : ctx.needs.map(safeNeed).join('\n');
  const evidenceBlock = ctx.evidence.length === 0
    ? '  (no evidence)'
    : ctx.evidence.map(safeEvidence).join('\n');
  const sourceIdsBlock = [
    `  facts: [${ctx.sourceIds.facts.join(', ')}]`,
    `  needs: [${ctx.sourceIds.needs.join(', ')}]`,
    `  evidence: [${ctx.sourceIds.evidence.join(', ')}]`,
  ].join('\n');
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...LEGACY_VISUAL_EXCLUDED_MIN.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# PROJECT',
    `projectId: ${ctx.projectId}`,
    '',
    '# AUTHORITATIVE PROJECT FACTS',
    'Each fact exposes only id, key, value, authority. These are confirmed planning inputs you MAY use as positive creative authority.',
    factBlock,
    '',
    '# USER REQUIREMENTS',
    'Explicit user-stated requirements (separate from generic planning facts). Treat as USER_REQUIREMENT epistemic class.',
    userReqBlock,
    '',
    '# LOCKED RULES',
    'Hard constraints. You MUST NOT propose visual directions that contradict these.',
    lockedBlock,
    '',
    '# PROHIBITED DIRECTIONS',
    'Forbidden as positive creative authority. Treat as constraints.',
    prohibitedBlock,
    '',
    '# NEED SKELETON',
    'Deterministic Need skeleton. Each need has its own id, type, statement, factRefs, coverageRequirement.',
    needBlock,
    '',
    '# EVIDENCE',
    'Evidence summaries supporting the current-project facts. Each item has its own id and sourceKind.',
    evidenceBlock,
    '',
    '# SOURCE TRACE IDS',
    'Every factRef / needRef / evidenceRef you cite MUST appear in these lists. Do not invent IDs.',
    sourceIdsBlock,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# TASK',
    'Produce a StrategicSynthesisArtifact containing:',
    '  0. sourceMap (planningTruth[], userRequirements[], lockedIdentity[], prohibitedDirections[], needs[], evidence[], legacyVisualEvidenceExcluded[])',
    '  1. projectUnderstanding (summary, coreChallenge, transformationGoal, brandRoleInterpretation?, audienceTension?, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs)',
    '  2. tensions (2-5; statement, poleA, poleB, whyItMatters, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs) — every tension must have a one-sentence `statement` summarizing the tension in addition to poleA/poleB',
    '  3. insights (3-6; statement, implication, whyThisProject, epistemicClass=MODEL_INFERENCE, factRefs, needRefs, evidenceRefs)',
    '  4. opportunities (3-5; title, thesis, strategicMechanism, whyThisProject, risk, insightRefs, factRefs) — every opportunity must have a `title` in addition to thesis; opportunities do NOT need an epistemicClass field (per schema); they are derived from the synthesis.',
    '  5. diagnostics (string[]; optional, can be empty)',
    '',
    'sourceMap.legacyVisualEvidenceExcluded MUST be non-empty and MUST contain every one of these tokens (this is an audit-trail requirement, not a suggestion): visualAsset.*, old_visual_style, old_VI, old_poster, old_packaging, old_spatial, style_reference, structure_reference, spatial_reference. Copy them verbatim into the array.',
    '',
    '# OUTPUT JSON SCHEMA',
    'schemaVersion must be exactly "0.1".',
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "MODEL_INFERENCE".',
    'All factRefs / needRefs / evidenceRefs must resolve into the SOURCE TRACE IDS above.',
    '',
    '# REQUIRED SHAPE — every field below MUST appear in the output',
    'Use this exact field set. Do not omit any field; the runtime parser will reject incomplete objects.',
    '',
    'tension = { statement, poleA, poleB, whyItMatters, epistemicClass: "MODEL_INFERENCE", factRefs[], needRefs[], evidenceRefs[] }',
    'insight = { statement, implication, whyThisProject, epistemicClass: "MODEL_INFERENCE", factRefs[], needRefs[], evidenceRefs[] }',
    'opportunity = { title, thesis, strategicMechanism, whyThisProject, risk[], insightRefs[], factRefs[] }',
    '',
    '# EPISTEMIC RULES',
    STRATEGIC_EPISTEMIC_RULES,
  ].join('\n');

  return {
    systemMessage: STRATEGIC_SYSTEM_MESSAGE,
    userMessage,
    characterCount: userMessage.length,
    sectionCount: (userMessage.match(/^# /gm) ?? []).length,
  };
}

function buildConceptPrompt(ctx, synthesis) {
  const synthesisJson = JSON.stringify(synthesis, null, 2);
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const allowedRefs = [
    ...ctx.sourceIds.facts,
    ...((synthesis && Array.isArray(synthesis.opportunities)) ? synthesis.opportunities.flatMap((o) => o.id ? [o.id] : []) : []),
    ...((synthesis && Array.isArray(synthesis.insights)) ? synthesis.insights.flatMap((i) => i.id ? [i.id] : []) : []),
    ...((synthesis && Array.isArray(synthesis.tensions)) ? synthesis.tensions.flatMap((t) => t.id ? [t.id] : []) : []),
  ];
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...LEGACY_VISUAL_EXCLUDED_MIN.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# VALIDATED STRATEGIC SYNTHESIS',
    'The full validated StrategicSynthesisArtifact is below. Use it as the grounding source for your concept candidates.',
    synthesisJson,
    '',
    '# AUTHORITATIVE CONSTRAINTS',
    '## LOCKED RULES',
    'Hard constraints. You MUST NOT propose concepts that contradict these.',
    lockedBlock,
    '',
    '## PROHIBITED DIRECTIONS',
    'Forbidden as positive creative authority.',
    prohibitedBlock,
    '',
    '# ALLOWED SOURCE IDS',
    'You may cite these IDs in opportunityRefs / insightRefs / factRefs / needRefs. Do not invent IDs.',
    `  [${allowedRefs.join(', ')}]`,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# TASK',
    'Produce a ModelAssistedConceptSet containing:',
    '  0. sourceMap (strategicSynthesisRef: string, excludedAuthorities: string[])',
    '  1. candidates (3-5 ModelAssistedConceptCandidate entries; each must contain:',
    '     - id, title, coreProposition, strategicMechanism, whyThisProject, whyNotCategoryCliche',
    '     - centralMetaphor? (optional)',
    '     - translationHypothesis.organizationLogic, .expressionLogic, .possibleVisualBehaviors[]',
    '     - epistemicClass="CREATIVE_HYPOTHESIS"',
    '     - opportunityRefs[], insightRefs[], factRefs[], needRefs[]',
    '     - strengths[], risks[])',
    '  2. diagnostics (string[]; optional, can be empty)',
    '',
    'sourceMap.strategicSynthesisRef MUST be the artifact ID of the Strategic Synthesis above.',
    'sourceMap.excludedAuthorities MUST list every authority excluded from positive creative source (typically: visualAsset.*, old_visual_style, old_VI, old_poster, old_packaging, old_spatial, style_reference, structure_reference, spatial_reference).',
    '',
    '# OUTPUT JSON SCHEMA',
    'schemaVersion must be exactly "0.1".',
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "CREATIVE_HYPOTHESIS".',
    '',
    '# EPISTEMIC RULES',
    [
      'Concept epistemicClass must be exactly "CREATIVE_HYPOTHESIS".',
      'Every opportunityRef / insightRef / factRef / needRef must resolve into the StrategicSynthesisArtifact provided above.',
      'You may not create new FACT.',
      'Locked rules / prohibited directions are constraints, not inspiration.',
      'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
      'Avoid category cliches and template-bank echo.',
      'Each concept must answer a grounded strategic insight / opportunity.',
    ].join('\n'),
  ].join('\n');

  return {
    systemMessage: [
      'You are a planning-first concept ideator for the Masterpiece OS Creative Intelligence layer.',
      'You produce a ModelAssistedConceptSet. Concepts are CREATIVE_HYPOTHESIS, not FACT.',
      'You will receive a validated StrategicSynthesisArtifact and planning constraints.',
      'You MUST NOT use legacy visual evidence as positive creative authority.',
      'Output the strict JSON for ModelAssistedConceptSet with the exact schemaVersion 0.1.',
    ].join('\n'),
    userMessage,
    characterCount: userMessage.length,
    sectionCount: (userMessage.match(/^# /gm) ?? []).length,
  };
}

function buildDirectionPrompt(ctx, synthesis, conceptSet) {
  const synthesisJson = JSON.stringify(synthesis, null, 2);
  const conceptSetJson = JSON.stringify(conceptSet, null, 2);
  const lockedBlock = ctx.lockedIdentity.length === 0
    ? '  (no LOCKED facts)'
    : ctx.lockedIdentity.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const prohibitedBlock = ctx.prohibitedDirections.length === 0
    ? '  (no prohibited.* / style.prohibited facts)'
    : ctx.prohibitedDirections.map((f) => `  - id=${f.id} key=${typeof f.key === 'string' ? f.key : '?'} value=${typeof f.value === 'string' ? f.value : JSON.stringify(f.value ?? '')}`).join('\n');
  const allowedRefs = [
    ...ctx.sourceIds.facts,
    ...((conceptSet && Array.isArray(conceptSet.candidates)) ? conceptSet.candidates.flatMap((c) => c.id ? [c.id] : []) : []),
    ...((synthesis && Array.isArray(synthesis.opportunities)) ? synthesis.opportunities.flatMap((o) => o.id ? [o.id] : []) : []),
    ...((synthesis && Array.isArray(synthesis.insights)) ? synthesis.insights.flatMap((i) => i.id ? [i.id] : []) : []),
  ];
  const excludedBlock = [
    ...ctx.legacyVisualEvidenceExcluded,
    ...LEGACY_VISUAL_EXCLUDED_MIN.filter((t) => !ctx.legacyVisualEvidenceExcluded.includes(t)),
  ].join(', ');

  const userMessage = [
    '# VALIDATED STRATEGIC SYNTHESIS',
    'The full validated StrategicSynthesisArtifact is below. Use it as the grounding source for your direction candidates.',
    synthesisJson,
    '',
    '# VALIDATED CONCEPT SET',
    'The full validated ModelAssistedConceptSet is below. Each Direction must reference at least one conceptRef.',
    conceptSetJson,
    '',
    '# AUTHORITATIVE CONSTRAINTS',
    '## LOCKED RULES',
    lockedBlock,
    '',
    '## PROHIBITED DIRECTIONS',
    prohibitedBlock,
    '',
    '# ALLOWED SOURCE IDS',
    'You may cite these IDs in conceptRefs / opportunityRefs / insightRefs / factRefs.',
    `  [${allowedRefs.join(', ')}]`,
    '',
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
    'These are NOT positive creative authority. Do not use them to propose future visual direction.',
    excludedBlock,
    '',
    '# VISUAL LANGUAGE REQUIREMENTS (MD-11)',
    [
      'visualMechanism must answer these 5 questions:',
      '  1. what is organized?',
      '  2. by what rule?',
      '  3. what changes across touchpoints?',
      '  4. what remains invariant?',
      '  5. why does this answer the strategic problem?',
      'Generic visual phrases are insufficient: "使用简洁现代的视觉语言" / "通过统一的设计系统建立识别度" / "采用高级感配色" / "使用模块化布局".',
    ].join('\n'),
    '',
    '# TASK',
    'Produce a ModelAssistedDirectionSet containing:',
    '  0. sourceMap (strategicSynthesisRef: string, conceptSetRef: string, excludedAuthorities: string[])',
    '  1. directions (3-4 ModelAssistedCreativeDirection entries; each must contain:',
    '     - id, title, directionFamily',
    '     - creativeThesis, visualMechanism, systemHypothesis',
    '     - visualLanguage: compositionLogic, colorRelationship, typographyBehavior, graphicBehavior, imageBehavior, materialRelationship?, motionBehavior?',
    '     - crossMediaBehavior: brandVI?, editorial?, campaignPoster?, packaging?, space?, digitalUI?',
    '     - whyThisProject, differenceFromOtherDirections',
    '     - epistemicClass="CREATIVE_HYPOTHESIS"',
    '     - conceptRefs[], opportunityRefs[], insightRefs[], factRefs[]',
    '     - strengths[], risks[], mustNotBecome[])',
    '  2. diagnostics (string[]; optional, can be empty)',
    '',
    'sourceMap.strategicSynthesisRef MUST be the artifact ID of the Strategic Synthesis above.',
    'sourceMap.conceptSetRef MUST be the artifact ID of the Concept Set above.',
    'sourceMap.excludedAuthorities MUST list every authority excluded from positive creative source (typically: visualAsset.*, old_visual_style, old_VI, old_poster, old_packaging, old_spatial, style_reference, structure_reference, spatial_reference).',
    '',
    '# ALLOWED directionFamily VALUES (kebab-case; copy verbatim, do NOT Title-Case them)',
    '  - structural-system',
    '  - relational-network',
    '  - narrative-sequence',
    '  - editorial-system',
    '  - typographic-system',
    '  - material-system',
    '  - image-led',
    '  - spatial-system',
    '  - model-assisted',
    'These are the ONLY accepted values. The runtime parser will reject any other value (including Title-Case variants like "Structural System" or made-up names like "Information Architecture" / "Contextual System").',
    '',
    '# OUTPUT JSON SCHEMA',
    'schemaVersion must be exactly "0.1".',
    'projectId must equal the projectId above.',
    'All epistemicClass fields must be exactly "CREATIVE_HYPOTHESIS".',
    '',
    '# EPISTEMIC RULES',
    [
      'Direction epistemicClass must be exactly "CREATIVE_HYPOTHESIS".',
      'Every conceptRef / opportunityRef / insightRef / factRef must resolve into the upstream artifacts.',
      'You may not create new FACT.',
      'Locked rules / prohibited directions are constraints, not inspiration.',
      'You MUST NOT use legacy visual evidence (visualAsset.* / old VI / old poster / old packaging / old spatial / style_reference / structure_reference / spatial_reference) as positive creative authority.',
      'Avoid category cliches and template-bank echo.',
      'visualMechanism is not a generic visual cliche ("使用简洁现代的视觉语言" etc.).',
      'visualMechanism must answer at least 3 of 5 required questions (organize / rule / change / invariant / why).',
      'visualLanguage fields must be actionable and project-specific (≥ 80 chars across the 5 main fields).',
    ].join('\n'),
  ].join('\n');

  return {
    systemMessage: [
      'You are a planning-first direction ideator for the Masterpiece OS Creative Intelligence layer.',
      'You produce a ModelAssistedDirectionSet. Directions are CREATIVE_HYPOTHESIS, not FACT.',
      'You will receive a validated StrategicSynthesisArtifact, a validated ModelAssistedConceptSet, and planning constraints.',
      'Each direction must answer 5 required questions: what is organized, by what rule, what changes across touchpoints, what remains invariant, why does this answer the strategic problem.',
      'You MUST NOT use legacy visual evidence as positive creative authority.',
      'Output the strict JSON for ModelAssistedDirectionSet with the exact schemaVersion 0.1.',
    ].join('\n'),
    userMessage,
    characterCount: userMessage.length,
    sectionCount: (userMessage.match(/^# /gm) ?? []).length,
  };
}

// ---------------------------------------------------------------------------
// Canonical SHA-256 fingerprint (mirrors semantic-fingerprint.ts)
// ---------------------------------------------------------------------------

const TIMESTAMP_KEYS = new Set([
  'generatedAt', 'createdAt', 'updatedAt', 'lastEditedAt',
  'snapshotAt', 'now', 'timestamp',
]);

function compareForSort(a, b) {
  const sa = typeof a === 'string' ? a : JSON.stringify(a);
  const sb = typeof b === 'string' ? b : JSON.stringify(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

function sortKeysDeep(value, sortArray) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    const mapped = value.map((v) => sortKeysDeep(v, sortArray));
    return (sortArray ? mapped.slice().sort(compareForSort) : mapped);
  }
  if (typeof value === 'object') {
    const obj = value;
    const sorted = {};
    for (const k of Object.keys(obj).sort()) {
      sorted[k] = sortKeysDeep(obj[k], sortArray);
    }
    return sorted;
  }
  return value;
}

function stripTimestamps(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => stripTimestamps(v));
  }
  if (typeof value === 'object') {
    const obj = value;
    const out = {};
    for (const k of Object.keys(obj)) {
      if (TIMESTAMP_KEYS.has(k)) continue;
      out[k] = stripTimestamps(obj[k]);
    }
    return out;
  }
  return value;
}

function semanticSha256(payload) {
  const canonical = sortKeysDeep(stripTimestamps(payload), true);
  const canonicalJson = JSON.stringify(canonical);
  return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
}

function buildFactsBlockForFingerprint(facts, includeAuthority) {
  return facts.map((f) => {
    const base = {
      id: f.id,
      key: typeof f.key === 'string' ? f.key : '',
      value: normalizeValue(f.value),
    };
    if (includeAuthority) base.authority = f.authority;
    return base;
  });
}

function buildNeedsBlockForFingerprint(needs) {
  return needs.map((n) => ({
    id: n.id,
    type: n.type,
    statement: typeof n.statement === 'string' ? n.statement : '',
    coverage: n.coverageRequirement ?? 'unspecified',
    factRefs: Array.isArray(n.factRefs) ? n.factRefs.slice().sort() : [],
    evidenceRefs: Array.isArray(n.evidenceRefs) ? n.evidenceRefs.slice().sort() : [],
  }));
}

function buildEvidenceBlockForFingerprint(evidence) {
  return evidence.map((e) => {
    const summary = typeof e.content === 'string'
      ? e.content
      : (typeof e.summary === 'string' ? e.summary : '');
    const factRefs = Array.isArray(e.factRefs) ? e.factRefs.slice().sort() : [];
    return {
      id: e.id,
      sourceKind: typeof e.sourceType === 'string' ? e.sourceType : 'unknown',
      summary,
      confidence: typeof e.confidence === 'number' ? e.confidence.toFixed(2) : 'unspecified',
      factRefs,
    };
  });
}

function strategicFingerprint(ctx, promptVersion) {
  const payload = {
    promptVersion,
    projectId: ctx.projectId,
    authoritativeFacts: buildFactsBlockForFingerprint(ctx.authoritativeFacts, true),
    userRequirements: buildFactsBlockForFingerprint(ctx.userRequirements, false),
    lockedIdentity: buildFactsBlockForFingerprint(ctx.lockedIdentity, false),
    prohibitedDirections: buildFactsBlockForFingerprint(ctx.prohibitedDirections, false),
    needs: buildNeedsBlockForFingerprint(ctx.needs),
    evidence: buildEvidenceBlockForFingerprint(ctx.evidence),
    legacyVisualEvidenceExcluded: Array.from(ctx.legacyVisualEvidenceExcluded).slice().sort(),
  };
  return semanticSha256(payload);
}

function conceptFingerprint(ctx, synthesis, promptVersion) {
  const strategic = {
    promptVersion,
    projectId: ctx.projectId,
    authoritativeFacts: buildFactsBlockForFingerprint(ctx.authoritativeFacts, true),
    userRequirements: buildFactsBlockForFingerprint(ctx.userRequirements, false),
    lockedIdentity: buildFactsBlockForFingerprint(ctx.lockedIdentity, false),
    prohibitedDirections: buildFactsBlockForFingerprint(ctx.prohibitedDirections, false),
    needs: buildNeedsBlockForFingerprint(ctx.needs),
    evidence: buildEvidenceBlockForFingerprint(ctx.evidence),
    legacyVisualEvidenceExcluded: Array.from(ctx.legacyVisualEvidenceExcluded).slice().sort(),
  };
  const payload = {
    ...strategic,
    promptVersion,
    projectId: ctx.projectId,
    lockedIdentity: buildFactsBlockForFingerprint(ctx.lockedIdentity, false),
    prohibitedDirections: buildFactsBlockForFingerprint(ctx.prohibitedDirections, false),
    upstreamSynthesisFingerprint: semanticSha256(sortKeysDeep(stripTimestamps(synthesis), true)),
  };
  return semanticSha256(payload);
}

function directionFingerprint(ctx, synthesis, conceptSet, promptVersion) {
  const strategic = {
    promptVersion,
    projectId: ctx.projectId,
    authoritativeFacts: buildFactsBlockForFingerprint(ctx.authoritativeFacts, true),
    userRequirements: buildFactsBlockForFingerprint(ctx.userRequirements, false),
    lockedIdentity: buildFactsBlockForFingerprint(ctx.lockedIdentity, false),
    prohibitedDirections: buildFactsBlockForFingerprint(ctx.prohibitedDirections, false),
    needs: buildNeedsBlockForFingerprint(ctx.needs),
    evidence: buildEvidenceBlockForFingerprint(ctx.evidence),
    legacyVisualEvidenceExcluded: Array.from(ctx.legacyVisualEvidenceExcluded).slice().sort(),
  };
  const payload = {
    ...strategic,
    promptVersion,
    projectId: ctx.projectId,
    lockedIdentity: buildFactsBlockForFingerprint(ctx.lockedIdentity, false),
    prohibitedDirections: buildFactsBlockForFingerprint(ctx.prohibitedDirections, false),
    upstreamSynthesisFingerprint: semanticSha256(sortKeysDeep(stripTimestamps(synthesis), true)),
    upstreamConceptSetFingerprint: semanticSha256(sortKeysDeep(stripTimestamps(conceptSet), true)),
  };
  return semanticSha256(payload);
}

// ---------------------------------------------------------------------------
// Budget gate (PART D)
// ---------------------------------------------------------------------------

function checkBudget(characterCount, budget) {
  const estimatedInputTokens = Math.ceil(characterCount / 3);
  const qualificationTokensRequired =
    estimatedInputTokens + budget.reservedOutputTokens + budget.reservedRepairTokens;
  const contextTokensRequired = estimatedInputTokens + budget.reservedOutputTokens;
  const configuredQualificationBudget =
    budget.configuredQualificationBudget
    ?? (budget.maxInputTokens + budget.reservedOutputTokens + budget.reservedRepairTokens);
  // Gate 1: input cap
  if (estimatedInputTokens > budget.maxInputTokens) {
    return {
      status: 'PROMPT_BUDGET_EXCEEDED',
      estimatedInputTokens,
      configuredQualificationBudget,
      qualificationTokensRequired,
      contextTokensRequired,
      reason: `input cap exceeded: ${estimatedInputTokens} > maxInputTokens=${budget.maxInputTokens}`,
    };
  }
  // Gate 2: total qualification budget
  if (qualificationTokensRequired > configuredQualificationBudget) {
    return {
      status: 'PROMPT_BUDGET_EXCEEDED',
      estimatedInputTokens,
      configuredQualificationBudget,
      qualificationTokensRequired,
      contextTokensRequired,
      reason: `qualification budget exceeded: ${qualificationTokensRequired} > configuredQualificationBudget=${configuredQualificationBudget}`,
    };
  }
  // Gate 3: hard context limit
  if (contextTokensRequired > budget.hardContextLimit) {
    return {
      status: 'PROMPT_BUDGET_EXCEEDED',
      estimatedInputTokens,
      configuredQualificationBudget,
      qualificationTokensRequired,
      contextTokensRequired,
      reason: `hard context limit exceeded: ${contextTokensRequired} > hardContextLimit=${budget.hardContextLimit}`,
    };
  }
  return {
    status: 'PASS',
    estimatedInputTokens,
    configuredQualificationBudget,
    qualificationTokensRequired,
    contextTokensRequired,
  };
}

// ---------------------------------------------------------------------------
// Per-project qualification
// ---------------------------------------------------------------------------

const STRATEGIC_PROMPT_VERSION = 'ci-w1c.7.1-strategic-synthesis-v0.2';
const CONCEPT_PROMPT_VERSION = 'ci-w1c.7.1-model-assisted-concept-v0.2';
const DIRECTION_PROMPT_VERSION = 'ci-w1c.7.1-model-assisted-direction-v0.2';

// A structurally valid deterministic upstream synthesis (only the
// fields the prompt builder actually reads: insights + opportunities
// + tensions). The script never claims this is a real model output;
// it is a fixture for inspecting the prompt wiring.
function makeDeterministicSynthesis(ctx) {
  return {
    schemaVersion: '0.1',
    projectId: ctx.projectId,
    promptVersion: STRATEGIC_PROMPT_VERSION,
    sourceMap: {
      planningTruth: ctx.sourceIds.facts.slice(),
      userRequirements: ctx.userRequirements.map((f) => f.id),
      lockedIdentity: ctx.lockedIdentity.map((f) => f.id),
      prohibitedDirections: ctx.prohibitedDirections.map((f) => f.id),
      needs: ctx.needs.map((n) => n.id),
      evidence: ctx.evidence.map((e) => e.id),
      legacyVisualEvidenceExcluded: Array.from(ctx.legacyVisualEvidenceExcluded),
    },
    projectUnderstanding: {
      summary: 'Planning-only summary derived from the resolved real-project artifacts.',
      coreChallenge: 'See need skeleton.',
      transformationGoal: 'See need skeleton.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: ctx.authoritativeFacts.slice(0, 1).map((f) => f.id),
      needRefs: ctx.needs.slice(0, 1).map((n) => n.id),
      evidenceRefs: ctx.evidence.slice(0, 1).map((e) => e.id),
    },
    tensions: ctx.needs.slice(0, 2).map((n, i) => ({
      id: `synth-tens-${i + 1}`,
      statement: `Tension derived from need ${n.id}`,
      poleA: 'A',
      poleB: 'B',
      whyItMatters: 'See need.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: (n.factRefs || []).slice(0, 1),
      needRefs: [n.id],
      evidenceRefs: (n.evidenceRefs || []).slice(0, 1),
    })),
    insights: ctx.needs.slice(0, 3).map((n, i) => ({
      id: `synth-ins-${i + 1}`,
      statement: `Insight derived from need ${n.id}`,
      implication: 'See need.',
      whyThisProject: 'See need.',
      epistemicClass: 'MODEL_INFERENCE',
      factRefs: (n.factRefs || []).slice(0, 1),
      needRefs: [n.id],
      evidenceRefs: (n.evidenceRefs || []).slice(0, 1),
    })),
    opportunities: ctx.needs.slice(0, 3).map((n, i) => ({
      id: `synth-opp-${i + 1}`,
      title: `Opportunity derived from need ${n.id}`,
      thesis: 'See need.',
      strategicMechanism: 'See need.',
      whyThisProject: 'See need.',
      risk: [],
      insightRefs: [`synth-ins-${i + 1}`],
      factRefs: (n.factRefs || []).slice(0, 1),
    })),
    diagnostics: ['DETERMINISTIC_FIXTURE_FOR_PROMPT_INSPECTION'],
  };
}

function makeDeterministicConceptSet(ctx, synthesis) {
  return {
    schemaVersion: '0.1',
    projectId: ctx.projectId,
    promptVersion: CONCEPT_PROMPT_VERSION,
    sourceMap: {
      strategicSynthesisRef: synthesis.id ?? 'fixture',
      excludedAuthorities: ['visualAsset.*'],
    },
    candidates: synthesis.opportunities.slice(0, 3).map((o, i) => ({
      id: `concept-${i + 1}`,
      title: `Concept derived from ${o.id}`,
      coreProposition: 'See synthesis.',
      strategicMechanism: 'See synthesis.',
      whyThisProject: 'See synthesis.',
      whyNotCategoryCliche: 'See synthesis.',
      translationHypothesis: { organizationLogic: 'x', expressionLogic: 'y', possibleVisualBehaviors: ['z'] },
      epistemicClass: 'CREATIVE_HYPOTHESIS',
      opportunityRefs: [o.id],
      insightRefs: o.insightRefs || [],
      factRefs: o.factRefs || [],
      needRefs: [],
      strengths: ['s'],
      risks: ['r'],
    })),
    diagnostics: ['DETERMINISTIC_FIXTURE_FOR_PROMPT_INSPECTION'],
  };
}

async function qualifyProject(args, alias) {
  const resolved = await resolveRealProjectArtifacts(args, alias);
  const ctx = compileStrategicContext(resolved);
  const budget = {
    maxInputTokens: args.maxInputTokens,
    reservedOutputTokens: args.reservedOutputTokens,
    reservedRepairTokens: args.reservedRepairTokens,
    hardContextLimit: args.hardContextLimit,
  };

  // Stage 1: Strategic
  const strategicPrompt = buildStrategicPrompt(ctx);
  const strategicFingerprint = strategicFingerprintValue(ctx, STRATEGIC_PROMPT_VERSION);
  const strategicBudget = checkBudget(strategicPrompt.characterCount, budget);

  // Stage 2: Concept (uses synthetic valid synthesis for prompt inspection)
  const synthesisFixture = makeDeterministicSynthesis(ctx);
  const conceptPrompt = buildConceptPrompt(ctx, synthesisFixture);
  const conceptFingerprint = conceptFingerprintValue(ctx, synthesisFixture, CONCEPT_PROMPT_VERSION);
  const conceptBudget = checkBudget(conceptPrompt.characterCount, budget);

  // Stage 3: Direction (uses synthetic valid synthesis + ConceptSet for prompt inspection)
  const conceptSetFixture = makeDeterministicConceptSet(ctx, synthesisFixture);
  const directionPrompt = buildDirectionPrompt(ctx, synthesisFixture, conceptSetFixture);
  const directionFingerprint = directionFingerprintValue(ctx, synthesisFixture, conceptSetFixture, DIRECTION_PROMPT_VERSION);
  const directionBudget = checkBudget(directionPrompt.characterCount, budget);

  // Hard guards
  const analysisProviderCallCount = 0;
  const imageProviderCallCount = 0;

  // Real project-specific planning semantics assertions (PART B).
  //
  // The strategic-context compiler (`isAuthoritativePlanning`) only
  // includes facts with authority `USER_CONFIRMED | CONFIRMED |
  // LOCKED`. The real G01/G02 brand-name facts carry authority
  // `AUTHORITATIVE_PROJECT_METADATA`, so the brand-name string
  // itself does not appear in the AUTHORITATIVE PROJECT FACTS
  // section. We therefore assert project-specificity by:
  //
  //   1. Real project-specific locked / planning values appear in
  //      the prompt (e.g. the G01 "原始 Logo" / "简体中文" Chinese
  //      strings from `locked.facts`; the G02 identity-preservation
  //      rules).
  //   2. Real Need statements appear.
  //   3. Real Evidence summaries appear.
  //   4. Real source IDs appear.
  //   5. Legacy visual positive authority is absent.
  //
  // The "real project name" check is informational; it does NOT
  // require the literal brand name to be in the AUTHORITATIVE
  // section (which is the existing compiler's contract).
  const realFactValues = ctx.authoritativeFacts.map((f) => f.value).filter((v) => typeof v === 'string');
  const realProjectNameFact = resolved.truth.facts.find((f) => f.key === 'brand.name' && typeof f.value === 'string');
  const realProjectName = realProjectNameFact ? String(realProjectNameFact.value) : null;
  const realNeedStatements = ctx.needs.map((n) => n.statement);
  const realEvidenceSummaries = ctx.evidence.map((e) => (e.content || e.summary || '')).filter((s) => s.length > 0);
  const realSourceIds = [
    ...ctx.sourceIds.facts,
    ...ctx.sourceIds.needs,
    ...ctx.sourceIds.evidence,
  ];
  const realLegacyExclusion = ctx.legacyVisualEvidenceExcluded.length > 0;

  // Pick a small sample of project-specific fact values to assert
  // are present in the prompt text. For G01 this typically includes
  // the Chinese strings from `locked.facts`. For G02 the
  // `identity-preservation` value or any user-confirmed rule.
  const realProjectSpecificValueSamples = realFactValues
    .filter((v) => v.length > 0)
    .slice(0, 5);

  const realProjectNameInPrompt = realProjectName
    ? strategicPrompt.userMessage.includes(realProjectName)
    : false;
  const realProjectIdInPrompt = strategicPrompt.userMessage.includes(ctx.projectId);
  const realProjectSpecificValuePresent = realProjectSpecificValueSamples.some((v) =>
    strategicPrompt.userMessage.includes(v),
  );
  const realNeedStatementPresent = realNeedStatements.some((s) =>
    strategicPrompt.userMessage.includes(s),
  );
  const realEvidenceSummaryPresent = realEvidenceSummaries.some((s) =>
    strategicPrompt.userMessage.includes(s),
  );
  const realSourceIdPresent = realSourceIds.some((id) =>
    strategicPrompt.userMessage.includes(id),
  );
  const hasOutputSchema = strategicPrompt.userMessage.includes('# OUTPUT JSON SCHEMA');
  const hasEpistemicRules = strategicPrompt.userMessage.includes('# EPISTEMIC RULES');
  const hasLegacyExclusionSection = strategicPrompt.userMessage.includes(
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
  );
  // No positive legacy content. The only place where legacy visual
  // authorities are mentioned is the EXCLUDED section.
  const beforeExclusionSection = strategicPrompt.userMessage.split(
    '# EXCLUDED LEGACY VISUAL AUTHORITIES',
  )[0];
  const positiveLegacyMentions = ['visualAsset.*', 'old_VI', 'old_poster', 'old_packaging', 'old_spatial']
    .filter((term) => beforeExclusionSection.includes(term));

  // Persist snapshot JSONs
  const outDir = path.join(args.outputDir, alias.toLowerCase());
  await ensureDir(outDir);
  const generatedAt = new Date().toISOString();

  await persistSnapshot(path.join(outDir, 'strategic-synthesis.prompt.json'), {
    projectId: ctx.projectId,
    stage: 'synthesis',
    promptVersion: STRATEGIC_PROMPT_VERSION,
    inputFingerprint: strategicFingerprint,
    characterCount: strategicPrompt.characterCount,
    estimatedInputTokens: strategicBudget.estimatedInputTokens,
    qualificationBudget: budget,
    budgetStatus: strategicBudget.status,
    sourceMap: {
      characterCount: strategicPrompt.characterCount,
      sectionCount: strategicPrompt.sectionCount,
      estimatedInputTokens: strategicBudget.estimatedInputTokens,
      qualificationTokensRequired: strategicBudget.qualificationTokensRequired,
      contextTokensRequired: strategicBudget.contextTokensRequired,
    },
    messages: [
      { role: 'system', content: strategicPrompt.systemMessage },
      { role: 'user', content: strategicPrompt.userMessage },
    ],
    size: {
      characterCount: strategicPrompt.characterCount,
      sectionCount: strategicPrompt.sectionCount,
    },
    generatedAt,
  });

  await persistSnapshot(path.join(outDir, 'concept-ideation.prompt.json'), {
    projectId: ctx.projectId,
    stage: 'concept',
    promptVersion: CONCEPT_PROMPT_VERSION,
    inputFingerprint: conceptFingerprint,
    characterCount: conceptPrompt.characterCount,
    estimatedInputTokens: conceptBudget.estimatedInputTokens,
    qualificationBudget: budget,
    budgetStatus: conceptBudget.status,
    sourceMap: {
      characterCount: conceptPrompt.characterCount,
      sectionCount: conceptPrompt.sectionCount,
      estimatedInputTokens: conceptBudget.estimatedInputTokens,
      qualificationTokensRequired: conceptBudget.qualificationTokensRequired,
      contextTokensRequired: conceptBudget.contextTokensRequired,
    },
    messages: [
      { role: 'system', content: conceptPrompt.systemMessage },
      { role: 'user', content: conceptPrompt.userMessage },
    ],
    size: {
      characterCount: conceptPrompt.characterCount,
      sectionCount: conceptPrompt.sectionCount,
    },
    generatedAt,
  });

  await persistSnapshot(path.join(outDir, 'direction-ideation.prompt.json'), {
    projectId: ctx.projectId,
    stage: 'direction',
    promptVersion: DIRECTION_PROMPT_VERSION,
    inputFingerprint: directionFingerprint,
    characterCount: directionPrompt.characterCount,
    estimatedInputTokens: directionBudget.estimatedInputTokens,
    qualificationBudget: budget,
    budgetStatus: directionBudget.status,
    sourceMap: {
      characterCount: directionPrompt.characterCount,
      sectionCount: directionPrompt.sectionCount,
      estimatedInputTokens: directionBudget.estimatedInputTokens,
      qualificationTokensRequired: directionBudget.qualificationTokensRequired,
      contextTokensRequired: directionBudget.contextTokensRequired,
    },
    messages: [
      { role: 'system', content: directionPrompt.systemMessage },
      { role: 'user', content: directionPrompt.userMessage },
    ],
    size: {
      characterCount: directionPrompt.characterCount,
      sectionCount: directionPrompt.sectionCount,
    },
    generatedAt,
  });

  return {
    alias,
    projectId: ctx.projectId,
    realProjectName,
    realProjectNameInPrompt,
    realProjectIdInPrompt,
    realProjectSpecificValuePresent,
    realProjectSpecificValueSamples,
    realNeedStatementPresent,
    realEvidenceSummaryPresent,
    realSourceIdPresent,
    hasOutputSchema,
    hasEpistemicRules,
    hasLegacyExclusionSection,
    positiveLegacyMentions,
    sources: resolved.sources,
    factCount: resolved.factCount,
    needCount: resolved.needCount,
    evidenceCount: resolved.evidenceCount,
    realFactValuesSample: realFactValues.slice(0, 5),
    realNeedStatementsSample: realNeedStatements.slice(0, 3),
    realEvidenceSummariesSample: realEvidenceSummaries.slice(0, 3),
    realSourceIdsCount: realSourceIds.length,
    realLegacyExclusion,
    strategic: {
      characterCount: strategicPrompt.characterCount,
      inputFingerprint: strategicFingerprint,
      budgetStatus: strategicBudget.status,
      estimatedInputTokens: strategicBudget.estimatedInputTokens,
      reason: strategicBudget.reason ?? null,
    },
    concept: {
      characterCount: conceptPrompt.characterCount,
      inputFingerprint: conceptFingerprint,
      budgetStatus: conceptBudget.status,
      estimatedInputTokens: conceptBudget.estimatedInputTokens,
      reason: conceptBudget.reason ?? null,
    },
    direction: {
      characterCount: directionPrompt.characterCount,
      inputFingerprint: directionFingerprint,
      budgetStatus: directionBudget.status,
      estimatedInputTokens: directionBudget.estimatedInputTokens,
      reason: directionBudget.reason ?? null,
    },
    analysisProviderCallCount,
    imageProviderCallCount,
  };
}

// ---------------------------------------------------------------------------
// Fingerprint helpers (separate from local vars to avoid shadowing)
// ---------------------------------------------------------------------------

function strategicFingerprintValue(ctx, promptVersion) {
  return strategicFingerprint(ctx, promptVersion);
}
function conceptFingerprintValue(ctx, synthesis, promptVersion) {
  return conceptFingerprint(ctx, synthesis, promptVersion);
}
function directionFingerprintValue(ctx, synthesis, conceptSet, promptVersion) {
  return directionFingerprint(ctx, synthesis, conceptSet, promptVersion);
}

async function persistSnapshot(file, payload) {
  await writeJsonAtomic(file, payload);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const results = [];
  for (const alias of args.projects) {
    const r = await qualifyProject(args, alias);
    results.push(r);
  }
  const summary = {
    generatedAt: new Date().toISOString(),
    budget: {
      maxInputTokens: args.maxInputTokens,
      reservedOutputTokens: args.reservedOutputTokens,
      reservedRepairTokens: args.reservedRepairTokens,
      hardContextLimit: args.hardContextLimit,
    },
    projects: results.map((r) => ({
      alias: r.alias,
      projectId: r.projectId,
      realProjectName: r.realProjectName,
      realProjectNameInPrompt: r.realProjectNameInPrompt,
      realProjectIdInPrompt: r.realProjectIdInPrompt,
      realProjectSpecificValuePresent: r.realProjectSpecificValuePresent,
      realProjectSpecificValueSamples: r.realProjectSpecificValueSamples,
      realNeedStatementPresent: r.realNeedStatementPresent,
      realEvidenceSummaryPresent: r.realEvidenceSummaryPresent,
      realSourceIdPresent: r.realSourceIdPresent,
      hasOutputSchema: r.hasOutputSchema,
      hasEpistemicRules: r.hasEpistemicRules,
      hasLegacyExclusionSection: r.hasLegacyExclusionSection,
      positiveLegacyMentions: r.positiveLegacyMentions,
      factCount: r.factCount,
      needCount: r.needCount,
      evidenceCount: r.evidenceCount,
      realSourceIdsCount: r.realSourceIdsCount,
      realLegacyExclusion: r.realLegacyExclusion,
      strategic: r.strategic,
      concept: r.concept,
      direction: r.direction,
      analysisProviderCallCount: r.analysisProviderCallCount,
      imageProviderCallCount: r.imageProviderCallCount,
    })),
  };
  const summaryFile = path.join(args.outputDir, 'qualification-summary.json');
  await ensureDir(args.outputDir);
  await writeJsonAtomic(summaryFile, summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`\nWrote snapshots to: ${args.outputDir}\n`);
  process.stdout.write(`Wrote summary:     ${summaryFile}\n`);
}

main().catch((e) => {
  process.stderr.write(`FATAL: ${e.message}\n${e.stack ?? ''}\n`);
  process.exit(1);
});
