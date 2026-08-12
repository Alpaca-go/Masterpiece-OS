#!/usr/bin/env node
// scripts/run-packaging-golden-baseline.mjs
//
// Packaging V1 / P1 / D2 — Real Golden Baseline Output scaffolding.
//
// This script does NOT call a real provider. It scaffolds the
// run directory and writes the prompt artefact, then the
// human curator performs the actual image generation through
// the standard Masterpiece image-generation runtime (CLI /
// Web / future Packaging UI) and drops the output file in the
// run directory. Finally, `--finalize` records the run manifest
// (Golden Project / Shot Contract / Generation Mode / Anchor
// IDs / Golden Prompt ID+version / Provider / Model /
// Approval status / Rubric result / Known limitations).
//
// Why the script does not call a provider directly:
// - The Golden Baseline Output must be produced through the
//   same path the future Packaging Compiler will use; that
//   path is the Masterpiece image-generation runtime, not
//   a one-off script.
// - The Golden Anchor selection is a human curation step
//   (the human picks which reference image to upload); the
//   script cannot make that decision.
// - Real provider calls are cost-sensitive and stay opt-in.
//   This script keeps the opt-in boundary at the existing
//   runtime entry points, not here.
//
// USAGE
//
//   # 1) List planned runs (no side effects):
//   node scripts/run-packaging-golden-baseline.mjs --list
//
//   # 2) Scaffold a run dir + write prompt.txt:
//   node scripts/run-packaging-golden-baseline.mjs --scaffold --shot hero    --run 1
//   node scripts/run-packaging-golden-baseline.mjs --scaffold --shot series  --run 1
//   node scripts/run-packaging-golden-baseline.mjs --scaffold --shot open    --run 1
//
//   # 3) The human curator runs the real image gen through
//   #    Masterpiece's image-generation runtime (CLI / Web /
//   #    future Packaging workspace) using the prompt body in
//   #    the run dir's prompt.txt, and drops the output as
//   #    `output.png` in the same run dir.
//
//   # 4) Finalize the manifest (after the human reviews):
//   node scripts/run-packaging-golden-baseline.mjs --finalize --shot hero   --run 1 \
//       --provider volcengine --model doubao-seed-2.1-turbo \
//       --anchor-ids anchor-hero-rf-01 \
//       --approval approved
//
// SAFETY
//
// - Fails closed on unknown --shot.
// - Fails closed if the Golden Prompt file is missing or
//   unparseable.
// - --scaffold refuses to overwrite an existing run-N/ unless
//   --force is passed.
// - --finalize refuses to write a manifest if output.png is
//   missing.
// - The script never imports any file under
//   tests/fixtures/packaging/jiuzhou/ from production code.
//   The script itself reads the Golden Prompts directly
//   (file path is hard-coded here) and lives in scripts/,
//   not in packages/ or apps/.
//
// This script was added at Packaging P1 / D2. It is P1
// frozen — adding new shots, anchors, or providers is a
// P1.x re-evaluation event.

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const GOLDEN_ROOT = path.join(
  REPO_ROOT,
  'tests',
  'fixtures',
  'packaging',
  'jiuzhou',
);
const PROMPTS_DIR = path.join(GOLDEN_ROOT, 'prompts');
const OUTPUTS_DIR = path.join(GOLDEN_ROOT, 'baseline-outputs');

const SUPPORTED_SHOTS = ['hero', 'series', 'open'];
const SUPPORTED_PROVIDERS = ['qwen', 'volcengine'];
const SUPPORTED_APPROVALS = ['pending', 'approved', 'rejected'];
const APPROVAL_RUBRIC_FIELDS = [
  'brandFidelity',
  'structureFidelity',
  'visualDirectionFidelity',
  'compositionQuality',
  'materialQuality',
  'referenceFidelity',
  'seriesConsistency',
  'overall',
];

function printHelp() {
  console.log(`run-packaging-golden-baseline.mjs — Packaging P1 / D2 scaffold + finalize

USAGE
  node scripts/run-packaging-golden-baseline.mjs --scaffold  --shot <hero|series|open> --run <N>
  node scripts/run-packaging-golden-baseline.mjs --finalize   --shot <hero|series|open> --run <N> \\
       --provider <qwen|volcengine> --model <model-id> [--anchor-ids <id,id,...>] \\
       [--approval <pending|approved|rejected>] [--rubric <json-string>] [--limitations <text>]
  node scripts/run-run-packaging-golden-baseline.mjs --list
`);
}

function parseArgs(argv) {
  const out = {
    list: false,
    scaffold: false,
    finalize: false,
    shot: null,
    run: 1,
    provider: null,
    model: null,
    anchorIds: [],
    approval: 'pending',
    rubric: null,
    limitations: '',
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') { out.list = true; continue; }
    if (a === '--scaffold') { out.scaffold = true; continue; }
    if (a === '--finalize') { out.finalize = true; continue; }
    if (a === '--shot') { out.shot = argv[++i]; continue; }
    if (a === '--run') { out.run = Number.parseInt(argv[++i], 10); continue; }
    if (a === '--provider') { out.provider = argv[++i]; continue; }
    if (a === '--model') { out.model = argv[++i]; continue; }
    if (a === '--anchor-ids') { out.anchorIds = argv[++i].split(',').map((s) => s.trim()).filter(Boolean); continue; }
    if (a === '--approval') { out.approval = argv[++i]; continue; }
    if (a === '--rubric') { out.rubric = JSON.parse(argv[++i]); continue; }
    if (a === '--limitations') { out.limitations = argv[++i]; continue; }
    if (a === '--force') { out.force = true; continue; }
    if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
    throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function readPromptFile(shot) {
  const promptFile = path.join(PROMPTS_DIR, `${shot}.md`);
  if (!fs.existsSync(promptFile)) {
    throw new Error(`Golden Prompt file not found: ${promptFile}`);
  }
  const raw = fs.readFileSync(promptFile, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    throw new Error(`Golden Prompt ${shot}.md has no YAML front-matter`);
  }
  const fm = fmMatch[1];
  const body = fmMatch[2];
  const meta = {};
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    meta[m[1]] = v;
  }
  if (!meta.goldenPromptId || !meta.shotContract || !meta.generationMode) {
    throw new Error(`Golden Prompt ${shot}.md missing required front-matter fields (goldenPromptId, shotContract, generationMode)`);
  }
  const codeMatch = body.match(/```text\n([\s\S]*?)\n```/);
  if (!codeMatch) {
    throw new Error(`Golden Prompt ${shot}.md has no \`\`\`text fenced prompt body`);
  }
  return { promptFile, meta, promptBody: codeMatch[1].trim() };
}

function listPlanned() {
  console.log('Planned P1 / D2 baseline runs:');
  for (const shot of SUPPORTED_SHOTS) {
    const promptFile = path.join(PROMPTS_DIR, `${shot}.md`);
    if (!fs.existsSync(promptFile)) {
      console.log(`  ${shot.padEnd(7)} : ${promptFile} MISSING`);
      continue;
    }
    console.log(`  ${shot.padEnd(7)} : ${path.relative(REPO_ROOT, promptFile)}`);
  }
  console.log(`\nOutput root: ${path.relative(REPO_ROOT, OUTPUTS_DIR)}/`);
  console.log('\nNo provider call has been made. To run:');
  console.log('  1. --scaffold --shot <name> --run 1   (writes prompt.txt)');
  console.log('  2. human curator runs image gen through Masterpiece runtime');
  console.log('  3. drop output.png into the run dir');
  console.log('  4. --finalize --shot <name> --run 1 --provider ... --model ... --approval approved');
}

function buildRunDir(shot, goldenPromptId, run) {
  return path.join(OUTPUTS_DIR, shot, goldenPromptId, `run-${run}`);
}

function scaffold(args) {
  if (!args.shot) throw new Error('--shot is required for --scaffold');
  if (!SUPPORTED_SHOTS.includes(args.shot)) {
    throw new Error(`Unknown --shot ${args.shot}; expected one of ${SUPPORTED_SHOTS.join(', ')}`);
  }
  if (!Number.isInteger(args.run) || args.run < 1) {
    throw new Error(`--run must be a positive integer (got ${args.run})`);
  }
  const { promptFile, meta, promptBody } = readPromptFile(args.shot);
  const runDir = buildRunDir(args.shot, meta.goldenPromptId, args.run);
  if (fs.existsSync(runDir)) {
    if (!args.force) {
      throw new Error(`Run dir already exists: ${runDir}\nPass --force to overwrite, or pick a different --run number.`);
    }
    fs.rmSync(runDir, { recursive: true, force: true });
  }
  fs.mkdirSync(runDir, { recursive: true });
  const promptTxt = path.join(runDir, 'prompt.txt');
  fs.writeFileSync(promptTxt, promptBody + '\n', 'utf8');
  console.log(`[p1-d2] scaffolded ${path.relative(REPO_ROOT, runDir)}/`);
  console.log(`[p1-d2]   - prompt.txt written (${promptBody.length} bytes)`);
  console.log(`[p1-d2]   - prompt source: ${path.relative(REPO_ROOT, promptFile)}`);
  console.log(`[p1-d2]   - goldenPromptId = ${meta.goldenPromptId} v${meta.version}`);
  console.log(`[p1-d2]   - generationMode = ${meta.generationMode}`);
  console.log('[p1-d2] Next: run the actual image gen through Masterpiece runtime, then drop output.png + --finalize.');
}

function finalize(args) {
  if (!args.shot) throw new Error('--shot is required for --finalize');
  if (!SUPPORTED_SHOTS.includes(args.shot)) {
    throw new Error(`Unknown --shot ${args.shot}; expected one of ${SUPPORTED_SHOTS.join(', ')}`);
  }
  if (!Number.isInteger(args.run) || args.run < 1) {
    throw new Error(`--run must be a positive integer (got ${args.run})`);
  }
  if (!args.provider) throw new Error('--provider is required for --finalize');
  if (!SUPPORTED_PROVIDERS.includes(args.provider)) {
    throw new Error(`Unknown --provider ${args.provider}; expected one of ${SUPPORTED_PROVIDERS.join(', ')}`);
  }
  if (!args.model) throw new Error('--model is required for --finalize');
  if (!SUPPORTED_APPROVALS.includes(args.approval)) {
    throw new Error(`Unknown --approval ${args.approval}; expected one of ${SUPPORTED_APPROVALS.join(', ')}`);
  }
  const { promptFile, meta } = readPromptFile(args.shot);
  const runDir = buildRunDir(args.shot, meta.goldenPromptId, args.run);
  if (!fs.existsSync(runDir)) {
    throw new Error(`Run dir not found: ${runDir}\nDid you run --scaffold first?`);
  }
  const outputPng = path.join(runDir, 'output.png');
  if (!fs.existsSync(outputPng)) {
    throw new Error(`output.png not found in ${runDir}\nThe human curator must drop the image-gen output here before --finalize.`);
  }
  const promptTxt = path.join(runDir, 'prompt.txt');
  if (!fs.existsSync(promptTxt)) {
    throw new Error(`prompt.txt not found in ${runDir}\nDid --scaffold complete?`);
  }
  // Rubric: optional JSON. If present, validate the fields.
  let rubric = args.rubric;
  if (rubric) {
    for (const k of APPROVAL_RUBRIC_FIELDS) {
      if (!(k in rubric)) {
        throw new Error(`--rubric missing field "${k}" (required: ${APPROVAL_RUBRIC_FIELDS.join(', ')})`);
      }
    }
  } else {
    rubric = null;
  }

  const runFinalizedAt = new Date().toISOString();
  const manifest = {
    schemaVersion: '1.0',
    manifestVersion: '1.0.0',
    goldenProject: 'jiuzhou',
    goldenProjectId: 'golden-jiuzhou',
    shotContract: meta.shotContract,
    generationMode: meta.generationMode,
    goldenAnchorIds: args.anchorIds,
    goldenPrompt: {
      id: meta.goldenPromptId,
      version: meta.version,
      file: path.relative(REPO_ROOT, promptFile),
    },
    provider: args.provider,
    model: args.model,
    runNumber: args.run,
    runFinalizedAt,
    outputPath: path.relative(REPO_ROOT, outputPng),
    humanApprovalStatus: args.approval,
    acceptanceRubricResult: rubric,
    knownLimitations: args.limitations,
  };
  const manifestFile = path.join(runDir, 'manifest.json');
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`[p1-d2] finalized ${path.relative(REPO_ROOT, runDir)}/manifest.json`);
  console.log(`[p1-d2]   - approval = ${args.approval}`);
  console.log(`[p1-d2]   - provider = ${args.provider}`);
  console.log(`[p1-d2]   - model    = ${args.model}`);
  console.log(`[p1-d2]   - anchors  = ${args.anchorIds.join(', ') || '(none)'}`);
  if (rubric) {
    console.log(`[p1-d2]   - rubric.overall = ${rubric.overall}`);
  }
}

function main() {
  const args = parseArgs(process.argv);
  if (args.list) return listPlanned();
  if (args.scaffold && args.finalize) {
    throw new Error('Pass --scaffold OR --finalize, not both.');
  }
  if (!args.scaffold && !args.finalize) {
    printHelp();
    throw new Error('Pass --scaffold, --finalize, or --list.');
  }
  if (args.scaffold) return scaffold(args);
  if (args.finalize) return finalize(args);
}

try {
  main();
} catch (e) {
  console.error(`[p1-d2] ${e.message}`);
  process.exit(1);
}
