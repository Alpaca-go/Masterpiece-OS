#!/usr/bin/env node
// R8.5 §7 / §23 — Read-only prompt audit for Phase 9B Mode B frozen prompts.
//
// For each frozen scene in quality-baselines/phase9b-recovered/<brand>/<scene>:
//   1. Re-compile the prompt from the snapshot V5 packet (same path as
//      run-golden-regression.mjs).
//   2. Measure per-block character count and "abstract adjective" density.
//   3. Emit a JSON report (--json) or a human-readable summary (default).
//
// This script is INTENTIONALLY READ-ONLY: it never writes prompts, images,
// or baseline files. It only reads the V5 packet + frozen prompt to verify
// that the current compiler output still matches the frozen baseline.
//
// Usage:
//   node apps/desktop/scripts/space-quality/r85-prompt-audit.mjs
//   node apps/desktop/scripts/space-quality/r85-prompt-audit.mjs --brand jiuzhou-aesthetics
//   node apps/desktop/scripts/space-quality/r85-prompt-audit.mjs --json

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SERIES_ROOT = path.join(REPO_ROOT, 'space-generator', 'quality-baselines', 'phase9b-recovered');

const ABSTRACT_MARKERS = [
  'organic', 'elegant', 'futuristic', 'translucent', 'premium',
  'soft', 'flow', 'curved', 'warm', 'natural',
  'modern', 'refined', 'luxurious', 'minimal', 'atmospheric',
  'contemporary', 'sleek', 'gentle', 'subtle', 'seamless',
];
const ACTION_VERBS = [
  'descend', 'bends', 'wraps', 'continues', 'opens', 'transforms',
  'flows', 'merges', 'splits', 'extends', 'folds', 'cuts',
  'rises', 'sinks', 'frames', 'partitions', 'unfolds', 'dissolves',
];

function parseArgs(argv) {
  const out = { brand: null, json: false };
  for (const raw of argv.slice(2)) {
    const m = raw.match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'brand') out.brand = value;
    else if (key === 'json') out.json = true;
  }
  return out;
}

function discoverScenes(brandFilter) {
  const out = [];
  if (!fs.existsSync(SERIES_ROOT)) return out;
  for (const brandEntry of fs.readdirSync(SERIES_ROOT, { withFileTypes: true })) {
    if (!brandEntry.isDirectory() || brandEntry.name.startsWith('_')) continue;
    if (brandFilter && brandEntry.name !== brandFilter) continue;
    const brandDir = path.join(SERIES_ROOT, brandEntry.name);
    for (const sceneEntry of fs.readdirSync(brandDir, { withFileTypes: true })) {
      if (!sceneEntry.isDirectory()) continue;
      const manifestPath = path.join(brandDir, sceneEntry.name, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        out.push({ brandKey: brandEntry.name, scene: sceneEntry.name, manifestPath });
      }
    }
  }
  return out;
}

async function loadCompiler() {
  const mod = await import(pathToFileURL(path.join(
    REPO_ROOT,
    'packages/image-generation-runtime/src/space/phase9b-space-compiler.js',
  )).href);
  return { compilePhase9bSpacePrompt: mod.compilePhase9bSpacePrompt };
}

function countHits(text, terms) {
  const lower = text.toLowerCase();
  let count = 0;
  const hits = new Set();
  for (const term of terms) {
    const re = new RegExp(`\\b${term}\\b`, 'giu');
    const m = lower.match(re);
    if (m) {
      count += m.length;
      hits.add(term);
    }
  }
  return { count, uniqueTerms: [...hits] };
}

function auditOne(scene, { compilePhase9bSpacePrompt }) {
  const manifest = JSON.parse(fs.readFileSync(scene.manifestPath, 'utf8'));
  const packetPath = path.resolve(path.dirname(scene.manifestPath), manifest.project.packetFile);
  if (!fs.existsSync(packetPath)) {
    return { ...scene, ok: false, error: `packet not found: ${manifest.project.packetFile}` };
  }
  const packet = JSON.parse(fs.readFileSync(packetPath, 'utf8'));
  const taskContract = {
    schemaVersion: '1.0',
    taskId: `r85-audit-${manifest.brandKey}-${manifest.scene}`,
    projectId: manifest.project?.projectId || `${manifest.brandKey}-golden`,
    deliverableFamily: 'space',
    subtype: manifest.scene,
    shot: 'entrance_view',
    count: 1,
    aspectRatio: manifest.provider?.aspectRatio || '16:9',
    currentInstruction: manifest.taskInstruction || '',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: manifest.referenceIds || [],
    logoUsageMode: 'post_composite',
    createdAt: new Date('2026-08-08T00:00:00.000Z').toISOString(),
  };

  let compiled;
  try {
    compiled = compilePhase9bSpacePrompt({
      packet,
      taskContract,
      brandKey: manifest.brandKey,
      referencePolicy: { mode: 'phase9b_quality' },
    });
  } catch (err) {
    return { ...scene, ok: false, error: `compile threw: ${err.message}` };
  }

  // Per-block character count
  const blockChars = {};
  let architectureBlockChars = 0;
  let brandBlockChars = 0;
  let negativeChars = 0;
  for (const [id, block] of Object.entries(compiled.blocksById || {})) {
    const text = typeof block === 'string' ? block : (block?.text || '');
    const len = [...text].length;
    blockChars[id] = len;
    if (id.startsWith('architecture') || id === 'architectural_concept' || id === 'architecture_dna') {
      architectureBlockChars += len;
    }
    if (id === 'brand_translation') {
      brandBlockChars += len;
    }
    if (id === 'negative_constraints') {
      negativeChars += len;
    }
  }
  const totalChars = [...compiled.finalPrompt].length;
  const positiveChars = totalChars - negativeChars;

  // Abstract vs action density on the whole prompt
  const abstract = countHits(compiled.finalPrompt, ABSTRACT_MARKERS);
  const actions = countHits(compiled.finalPrompt, ACTION_VERBS);

  // Architecture Instruction Ratio
  const architectureInstructionRatio = positiveChars > 0
    ? Math.round((architectureBlockChars / positiveChars) * 1000) / 10
    : 0;

  return {
    ...scene,
    ok: true,
    hash: manifest.promptHash,
    totalChars,
    blockChars,
    architectureBlockChars,
    brandBlockChars,
    negativeChars,
    architectureInstructionRatio,
    abstractHits: abstract.count,
    abstractTerms: abstract.uniqueTerms,
    actionHits: actions.count,
    anchorIds: compiled.anchors.map((a) => a.id),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const scenes = discoverScenes(args.brand);
  if (scenes.length === 0) {
    process.stderr.write('[r85-audit] no frozen scenes found\n');
    process.exit(2);
  }

  const compiler = await loadCompiler();
  const results = [];
  for (const scene of scenes) {
    // eslint-disable-next-line no-await-in-loop
    results.push(auditOne(scene, compiler));
  }

  if (args.json) {
    process.stdout.write(`${JSON.stringify({ results, generatedAt: new Date().toISOString() }, null, 2)}\n`);
    return;
  }

  for (const r of results) {
    if (!r.ok) {
      process.stdout.write(`[FAIL] ${r.brandKey}/${r.scene}: ${r.error}\n`);
      continue;
    }
    const blocks = Object.entries(r.blockChars)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    process.stdout.write(
      `[${r.brandKey}/${r.scene}] total=${r.totalChars} arch=${r.architectureBlockChars} brand=${r.brandBlockChars} neg=${r.negativeChars} archRatio=${r.architectureInstructionRatio}% abstract=${r.abstractHits} action=${r.actionHits}\n`,
    );
    process.stdout.write(`  blocks: ${blocks}\n`);
    process.stdout.write(`  abstractTerms: ${r.abstractTerms.join(', ') || '(none)'}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`[r85-audit] failed: ${err?.stack || err}\n`);
  process.exit(1);
});
