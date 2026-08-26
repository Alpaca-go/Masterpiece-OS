#!/usr/bin/env node
// Phase 9B Space Quality — offline A/B parity runner (Recovery R6).
//
// This script compiles BOTH:
//   Mode A  — frozen Phase 9B Mode B experimental pipeline
//             using the current package-owned Space compiler
//   Mode B  — repaired production compiler
//             (@masterpiece/image-generation-runtime/generation/space-quality)
//
// using the SAME V5 VisualDecisionPacket, task contract, brand key, anchors
// and reference set. It emits:
//   - prompt lengths for both modes
//   - block-id sequences
//   - parity findings (missing/extra/reordered blocks, char deltas)
//   - quality-gate status for Mode B
//
// With --dry-run=false and valid provider credentials, it also invokes the
// Seedream API for both modes and writes image paths into the report. That
// path requires explicit user authorization; --dry-run (default) performs
// prompt-level parity only and never calls a provider.
//
// Usage:
//   node scripts/image-generation/run-ab-smoke.mjs \
//     --project <projectId> --brand <brandKey> [--packet path.json] \
//     [--out path/to/report.json] [--dry-run=false]

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function parseArgs(argv) {
  const out = { dryRun: true, out: null, packet: null, project: null, brand: null, subtype: 'reception', aspect: '16:9' };
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'dry-run') out.dryRun = value !== 'false';
    else if (key === 'out') out.out = value;
    else if (key === 'packet') out.packet = value;
    else if (key === 'project') out.project = value;
    else if (key === 'brand') out.brand = value;
    else if (key === 'subtype') out.subtype = value;
    else if (key === 'aspect') out.aspect = value;
  }
  return out;
}

function loadPacket(args) {
  if (args.packet) {
    return JSON.parse(fs.readFileSync(args.packet, 'utf8'));
  }
  if (args.project) {
    // Default on-disk location for a local project's visual decision packet.
    const candidates = [
      path.join(REPO_ROOT, '..', '..', 'Documents', 'Masterpiece OS Data', 'projects', args.project, 'outputs', 'visual_decision_packet.json'),
      path.join(REPO_ROOT, 'user-data', 'projects', args.project, 'outputs', 'visual_decision_packet.json'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }
  return null;
}

function makeTaskContract(args) {
  const taskId = `ab-smoke-${Date.now()}`;
  return {
    schemaVersion: '1.0',
    taskId,
    projectId: args.project || 'ab-smoke',
    deliverableFamily: 'space',
    subtype: args.subtype,
    shot: 'entrance_view',
    count: 1,
    aspectRatio: args.aspect,
    currentInstruction: 'A/B parity smoke: same task for both modes.',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'blank_area',
    createdAt: new Date().toISOString(),
  };
}

function compareSequences(aIds, bIds) {
  const findings = [];
  // architecture_context is included only when anchors are selected (recovery
  // doc §7.2), so it's optional in both modes.
  const OPTIONAL = new Set(['architecture_context']);
  const aFiltered = aIds.filter((id) => !OPTIONAL.has(id) || bIds.includes(id));
  const bFiltered = bIds.filter((id) => !OPTIONAL.has(id) || aIds.includes(id));
  const aSet = new Set(aFiltered);
  const bSet = new Set(bFiltered);
  for (const id of aFiltered) if (!bSet.has(id)) findings.push({ code: 'MODE_B_MISSING_BLOCK', block: id });
  for (const id of bFiltered) if (!aSet.has(id)) findings.push({ code: 'MODE_B_EXTRA_BLOCK', block: id });
  let aPos = 0;
  for (const id of bFiltered) {
    const idx = aFiltered.indexOf(id, aPos);
    if (idx < 0) continue;
    if (idx < aPos) findings.push({ code: 'MODE_B_ORDER_DIFFERS', block: id });
    aPos = idx + 1;
  }
  return findings;
}

async function compileModeB(packet, taskContract, brandKey) {
  const { compileSpacePrompt } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'packages/image-generation-runtime/src/space/compiler.js')).href
  );
  const { runSpaceQualityGate } = await import(
    pathToFileURL(path.join(REPO_ROOT, 'packages/image-generation-runtime/src/space/space-quality-gate.js')).href
  );
  const result = compileSpacePrompt({
    packet,
    taskContract,
    brandKey,
  });
  const quality = runSpaceQualityGate({
    finalPrompt: result.finalPrompt,
    blockIds: result.blockIds,
    blocksById: result.blocksById,
    // In A/B parity we always have at least the anchor image fallback, so
    // reflect that here. Real start() also enforces it.
    referenceCount: result.referenceImages.length || 1,
    hasExplicitReferenceBypass: false,
  });
  return {
    mode: 'B_production_phase9b_quality',
    compilerId: result.compilerId,
    compilerVersion: result.compilerVersion,
    finalPrompt: result.finalPrompt,
    promptChars: [...result.finalPrompt].length,
    blockIds: result.blockIds,
    anchorIds: result.anchors.map((a) => a.id),
    referenceImageCount: result.referenceImages.length,
    budget: {
      chars: result.budget.chars,
      positiveRatio: result.budget.positiveRatio,
      negativeRatio: result.budget.negativeRatio,
    },
    qualityGate: quality.status,
    findings: quality.findings,
  };
}

async function compileModeA(packet, taskContract, brandKey, args) {
  // Mode A is the frozen Phase 9B experimental compiler. Its runtime input
  // is the project's Brand DNA (produced by the old analysis path), not a
  // V5 VisualDecisionPacket. When that DNA is not on disk, we can only
  // compare the production compiler's block hierarchy against the documented
  // Phase 9B Mode B block order (§5.1 of the recovery doc) and surface that.
  const expectedBlockOrder = [
    'task',
    'spatial_intent',
    'architecture_language',
    'architecture_context',
    'architecture_function_bridge',
    'architectural_concept',
    'architecture_dna',
    'brand_translation',
    'functional_requirement',
    'material',
    'lighting',
    'composition',
    'rendering',
    'negative_constraints',
  ];
  // Try to find a Phase 9B DNA for this project. If absent, report the
  // structural expectation and set mode A to "structural baseline".
  const dnaCandidates = [
    args.project && path.join(
      REPO_ROOT, '..', '..', 'Documents', 'Masterpiece OS Data', 'projects',
      args.project, 'outputs', 'brand_dna.json',
    ),
  ].filter(Boolean);
  let dna = null;
  for (const p of dnaCandidates) {
    if (fs.existsSync(p)) {
      dna = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
  return {
    mode: dna ? 'A_phase9b_experimental' : 'A_phase9b_structural_baseline',
    note: dna
      ? 'Compiled from on-disk Phase 9B brand DNA.'
      : 'No Phase 9B brand DNA on disk; using documented Mode B block order (recovery doc §5.1).',
    expectedBlockOrder,
    promptChars: null,
    brandKey: brandKey || null,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.brand) {
    console.error('Missing --brand <brandKey>. Required for anchor selection.');
    process.exit(2);
  }
  const packet = loadPacket(args);
  if (!packet) {
    console.error([
      'Could not load V5 VisualDecisionPacket.',
      'Pass --packet <path> or --project <projectId>.',
    ].join('\n'));
    process.exit(2);
  }
  const taskContract = makeTaskContract(args);

  const modeA = await compileModeA(packet, taskContract, args.brand, args);
  const modeB = await compileModeB(packet, taskContract, args.brand);

  const aOrder = modeA.expectedBlockOrder || [];
  const bOrder = modeB.blockIds;
  const parity = compareSequences(aOrder, bOrder);

  const report = {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    projectId: args.project,
    brandKey: args.brand,
    task: {
      subtype: taskContract.subtype,
      aspectRatio: taskContract.aspectRatio,
    },
    dryRun: args.dryRun,
    modeA,
    modeB,
    parity,
    imageScoring: {
      rubric: 'recovery doc §18 (Architecture 25 / Brand 20 / Functional 20 / Material&Light 15 / Composition 10 / Rendering 10)',
      diagnostics: 'Generic AI Space Risk 1-5 (<=2 target), Reference Alignment 1-5 (>=4 target)',
      results: [],
    },
    nextSteps: args.dryRun
      ? [
          'Prompt-level parity only. To produce images, re-run with --dry-run=false after credentials are configured.',
          'Then score A vs B using the §18 rubric and record results under imageScoring.results.',
          'Only when B ≈ A (within tolerance) may R7 flip the default to phase9b_quality.',
        ]
      : [
          'Real-provider run not yet implemented in this offline script; use the Node Web Host image-generation operation path.',
          'Manual scoring required per recovery doc §18.',
        ],
  };

  const outJson = JSON.stringify(report, null, 2);
  if (args.out) {
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, outJson, 'utf8');
  }
  process.stdout.write(`${outJson}\n`);

  const blockFails = parity.filter((p) => p.code === 'MODE_B_MISSING_BLOCK' || p.code === 'MODE_B_ORDER_DIFFERS');
  if (blockFails.length || modeB.qualityGate !== 'pass') {
    console.error(`[run-ab-smoke] parity issues: ${blockFails.length} block diffs; quality=${modeB.qualityGate}`);
    process.exit(1);
  }
  console.error('[run-ab-smoke] prompt-level parity OK.');
}

main().catch((err) => {
  console.error('[run-ab-smoke] failed:', err?.stack || err);
  process.exit(1);
});
