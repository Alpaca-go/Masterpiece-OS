// P1-6 — Packaging Reference-First Golden Baseline
//
// Reference-First path: Reference Image + Locked Assets + Shot
// Contract → Translation → Compiler → Generation. The path
// MUST compile against the Jiuzhou Golden fixture WITHOUT
// reading the Golden as a production rule (i.e. the
// `compileShortChainGeneration` entry point must accept
// `deliverableFamily: 'packaging'` and a Golden shot contract
// without throwing, and the resulting compiled prompt must be
// 14-block + pass preflight).
//
// This is the offline half of the P1 "Reference-First Golden
// baseline 成立" exit criterion. The live half (real provider)
// is out of P1 scope; P3 / P4 will do the live golden runs.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileShortChainGeneration } from '@masterpiece/image-generation-runtime/generation/index.js';
import {
  PACKAGING_SHOT_CONTRACTS,
} from '@masterpiece/image-generation-contracts';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

function readJson(rel) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

// P0 frozen phase1.js is the analysis-led seed; we use it as a
// generic brand context (NOT the Golden itself) for the
// Reference-First compile path. The Golden fixture supplies
// the shot contract + the visual direction, but the
// compileShortChainGeneration function does not read the
// Golden fixture today (Golden is evaluator input only).
const phase1 = await import('../../tests/fixtures/phase1.js');

function projectContextFor(shotContract) {
  // phase1Context() returns the project context directly. The
  // existing packaging-contract.test.js passes it as-is to
  // compileShortChainGeneration({ projectContext, ... }).
  // The Reference-First path does not need to mutate the
  // projectContext; deliverableFamily is on the task.
  return phase1.phase1Context();
}

function taskFor(shotContract) {
  // P1 shot contracts (PackagingShotContract) map to the
  // existing packaging shot vocab in
  // `packages/image-generation-runtime/src/generation/template-registry.js`:
  //   PKG-HERO-SINGLE  -> 'three_quarter_hero'
  //   PKG-SERIES-GROUP -> 'set_display'
  //   PKG-GIFT-OPEN    -> 'open_box'
  // The shotContract field is the new P1 contractVersion 1.0.0
  // field; the existing `shot` field is what the preflight
  // currently keys on (backward-compatible dispatch; per
  // shot-contracts.md §6).
  return {
    projectId: 'phase1-project',
    deliverableFamily: 'packaging',
    subtype: 'lid_and_base_box',
    shot: shotContract === 'PKG-HERO-SINGLE'  ? 'three_quarter_hero'
         : shotContract === 'PKG-SERIES-GROUP' ? 'set_display'
         : 'open_box',
    shotContract,  // P1 contractVersion 1.0.0 — see image-generation-contracts
    contractVersion: '1.0.0',
    count: 1,
    aspectRatio: '4:3',
    currentInstruction: shotContract === 'PKG-HERO-SINGLE'  ? '生成单一主包装 Hero Render'
                       : shotContract === 'PKG-SERIES-GROUP' ? '生成多 SKU 系列包装统一陈列'
                       : '生成礼盒打开状态与内部结构',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    generationBasis: 'reference_first',
    logoUsageMode: 'post_composite',
  };
}

test('P1 Reference-First compiles PKG-HERO-SINGLE against the Golden shape', () => {
  const result = compileShortChainGeneration({
    projectContext: projectContextFor('PKG-HERO-SINGLE'),
    task: taskFor('PKG-HERO-SINGLE'),
  });
  assert.equal(result.compiledPrompt.blocks.length, 14);
  assert.equal(result.compiledPrompt.preflightReport.status, 'pass');
});

test('P1 Reference-First compiles PKG-SERIES-GROUP against the Golden shape', () => {
  const result = compileShortChainGeneration({
    projectContext: projectContextFor('PKG-SERIES-GROUP'),
    task: taskFor('PKG-SERIES-GROUP'),
  });
  assert.equal(result.compiledPrompt.blocks.length, 14);
  assert.equal(result.compiledPrompt.preflightReport.status, 'pass');
});

test('P1 Reference-First compiles PKG-GIFT-OPEN against the Golden shape', () => {
  const result = compileShortChainGeneration({
    projectContext: projectContextFor('PKG-GIFT-OPEN'),
    task: taskFor('PKG-GIFT-OPEN'),
  });
  assert.equal(result.compiledPrompt.blocks.length, 14);
  assert.equal(result.compiledPrompt.preflightReport.status, 'pass');
});

test('P1 Reference-First all 3 shot contracts reach the SAME 14-block contract', () => {
  // Per the P0 doc: the 14-block schema is the Shared
  // Cross-Target contract; the 3 shot contracts share it.
  for (const shotContract of PACKAGING_SHOT_CONTRACTS) {
    const result = compileShortChainGeneration({
      projectContext: projectContextFor(shotContract),
      task: taskFor(shotContract),
    });
    assert.equal(result.compiledPrompt.blocks.length, 14, `shot ${shotContract} produced ${result.compiledPrompt.blocks.length} blocks, expected 14`);
    assert.equal(result.compiledPrompt.preflightReport.status, 'pass', `shot ${shotContract} preflight not pass`);
  }
});

test('P1 Golden fixture manifest is the integrity source for Reference-First', () => {
  // The Reference-First path does not need to read the Golden
  // fixture today (Golden is evaluator input only). The
  // manifest is the integrity source for the Golden fixture;
  // the Reference-First compile path uses phase1.js as the
  // analysis-led seed. We only check that the manifest exists
  // and is parseable; the SHA-256 integrity test lives in
  // packaging-golden-manifest.test.js.
  const manifest = readJson('tests/fixtures/packaging/jiuzhou/manifest.json');
  assert.equal(manifest.goldenProjectId, 'golden-jiuzhou');
  assert.ok(manifest.files);
  assert.equal(Object.keys(manifest.files).length, 10);
});
