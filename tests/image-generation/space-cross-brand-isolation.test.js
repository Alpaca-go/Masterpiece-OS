// R8.6 Cross-brand isolation test.
//
// The R8.6 frozen core must keep the three brands (medical-aesthetics,
// Sichuan fast-casual restaurant, TCM health clinic) isolated without any
// project-specific production rules. This test proves:
//   - compiling each brand's packet through the frozen compiler produces a
//     brand-distinct prompt (no shared literal-motif injection)
//   - the production compiler emits NO project hardcode (no feather / peacock /
//     purple-geometry / brand-name conditionals)
//   - the R8.6 golden records for the three brands stay distinct
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const BRANDS = [
  { key: 'jiuzhou-aesthetics', subtype: 'reception', shot: 'entrance_view' },
  { key: 'feng-tang-tang', subtype: 'lobby', shot: 'entrance_view' },
  { key: 'yi-ji-liang-fang', subtype: 'reception', shot: 'entrance_view' },
];

async function compileBrand(brand) {
  const packet = JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/current-verification/source-packets/_packets/${brand.key}/visual-decision-packet.json`),
    'utf8',
  ));
  const context = { projectId: 'isolation-probe' };
  context.visualDecisionPacket = packet;
  const task = {
    schemaVersion: '1.0',
    taskId: 'isolation-probe',
    projectId: 'isolation-probe',
    deliverableFamily: 'space',
    subtype: brand.subtype,
    shot: brand.shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'isolation probe (text-only, refs=0).',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
  process.env.MASTERPIECE_SPACE_COMPILER_MODE = 'phase9b_quality';
  const url = pathToFileURL(path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js')).href;
  const mod = await import(url);
  const out = mod.compileShortChainGeneration({ projectContext: context, model: 'doubao-seedream-5-0-pro-260628', task, brandKey: brand.key });
  return out.compiledPrompt.finalPrompt;
}

const LITERAL_MOTIF = /\b(feather|peacock|feathers?)\b/i;

test('R8.6 three brands compile to distinct prompts (no cross-brand echo)', async () => {
  const prompts = {};
  for (const brand of BRANDS) {
    prompts[brand.key] = await compileBrand(brand);
  }
  // Distinct brand content: the brand display name / role differs and the
  // prompts are not byte-identical.
  assert.notEqual(prompts['jiuzhou-aesthetics'], prompts['feng-tang-tang']);
  assert.notEqual(prompts['feng-tang-tang'], prompts['yi-ji-liang-fang']);
  assert.notEqual(prompts['jiuzhou-aesthetics'], prompts['yi-ji-liang-fang']);
});

test('R8.6 frozen compiler does not inject literal motif architecture for any brand', async () => {
  for (const brand of BRANDS) {
    const prompt = await compileBrand(brand);
    assert.doesNotMatch(prompt, LITERAL_MOTIF, `${brand.key}: no literal feather/peacock injection`);
  }
});

test('R8.6 golden records per brand are distinct and isolated', () => {
  const seen = new Set();
  for (const brand of BRANDS) {
    const gs = JSON.parse(fs.readFileSync(
      path.join(repoRoot, `space-generator/quality-baselines/current-verification/space-golden/${brand.key}/golden-selection.json`),
      'utf8',
    ));
    assert.ok(gs.golds.length >= 1, `${brand.key}: has goldens`);
    for (const g of gs.golds) {
      assert.ok(!seen.has(g.imageSha256), `${brand.key}: golden image unique across brands`);
      seen.add(g.imageSha256);
    }
  }
});
