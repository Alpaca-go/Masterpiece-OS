import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createVisualWorkflow } from '../src/service.js';
import { listStylePresets, findStylePreset, scanPromptForDrift } from '../src/knowledge/style-presets.js';
import { STYLE_AXES, createShortChainTaskContract } from '../src/generation-runtime/generation/task-contract.js';

async function withWorkflow(run: (workflow: any, root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'style-presets-'));
  try {
    await run(createVisualWorkflow({ root, emit: () => {} }), root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
}

test('style presets are curated, unique and use only valid axis values', () => {
  const presets = listStylePresets();
  assert.ok(presets.length >= 2);
  const ids = new Set();
  for (const preset of presets) {
    assert.match(preset.id, /^[a-z0-9][a-z0-9-]{1,60}$/);
    assert.ok(!ids.has(preset.id), `duplicate preset id ${preset.id}`);
    ids.add(preset.id);
    assert.equal(preset.status, 'draft');
    assert.ok(preset.label && preset.summary && preset.appliesTo && preset.notFor);
    assert.ok(preset.knowledgeText.length > 0 && preset.knowledgeText.length <= 1200);
    assert.ok(preset.sources.length > 0);
    assert.equal(Object.keys(preset.styleControls).length, Object.keys(STYLE_AXES).length);
    for (const [axis, allowed] of Object.entries(STYLE_AXES)) {
      assert.ok(allowed.includes(preset.styleControls[axis]), `${preset.id}.${axis}=${preset.styleControls[axis]}`);
    }
    assert.ok(preset.antiDrift.length >= 3);
    for (const rule of preset.antiDrift) {
      assert.ok(rule.signal && rule.label && rule.why);
      assert.ok(rule.matches.length > 0);
    }
  }
});

test('style preset list is a copy, not module state', () => {
  const presets = listStylePresets();
  presets[0].styleControls.lighting = 'bright';
  presets[0].antiDrift[0].matches.push('tampered');
  const again = findStylePreset(presets[0].id);
  assert.equal(again.styleControls.lighting, presets[0].id === 'community-street-smoke' ? 'warm_dim' : again.styleControls.lighting);
  assert.ok(!again.antiDrift[0].matches.includes('tampered'));
  assert.equal(findStylePreset('no-such-preset'), null);
  assert.equal(findStylePreset(''), null);
});

test('drift scan flags a positive match and ignores negative instructions', () => {
  const community = findStylePreset('community-street-smoke');
  const clean = scanPromptForDrift('# Space\n- material: red brick and aged timber\n- lighting: warm dim, keep shadow', community);
  assert.equal(clean.ok, true);
  assert.deepEqual(clean.warnings, []);

  const drifted = scanPromptForDrift('# Space\n- walls: white walls with even lighting\n- lighting: cool white 5000k', community);
  assert.equal(drifted.ok, false);
  assert.deepEqual(drifted.warnings.map((item: any) => item.signal).sort(), ['cool-white', 'even-bright', 'white-wall'].sort());
  assert.ok(drifted.warnings.every((item: any) => item.line.length > 0));

  const guarded = scanPromptForDrift('# Negative constraints\n- do not use white walls or cool white lighting\n- avoid a menu wall', community);
  assert.equal(guarded.ok, true, JSON.stringify(guarded.warnings));

  const quick = findStylePreset('mall-quick-service');
  const quickDrift = scanPromptForDrift('- lighting: warm dim, aged wood, red brick', quick);
  assert.equal(quickDrift.ok, false);
  assert.ok(quickDrift.warnings.some((item: any) => item.signal === 'warm-dim'));
});

test('style-presets operation returns the curated anchors and preflight is read-only', async () => {
  await withWorkflow(async (workflow) => {
    const listed = await workflow.operations['visual-workflow:style-presets']({});
    assert.equal(listed.schemaVersion, '1.0');
    assert.ok(Array.isArray(listed.presets) && listed.presets.length >= 2);

    const clean = await workflow.operations['visual-workflow:style-preflight']({}, {
      presetId: 'community-street-smoke',
      prompt: '- material: red brick, aged timber, brass'
    });
    assert.equal(clean.ok, true);
    assert.equal(clean.checkedSignals, listed.presets.find((item: any) => item.id === 'community-street-smoke').antiDrift.length);

    const drifted = await workflow.operations['visual-workflow:style-preflight']({}, {
      presetId: 'community-street-smoke',
      prompt: '- walls: white walls\n- lighting: evenly lit cool white'
    });
    assert.equal(drifted.ok, false);
    assert.ok(drifted.warnings.length >= 2);
    assert.equal(drifted.warnings[0].why.length > 0, true);

    await assert.rejects(() => workflow.operations['visual-workflow:style-preflight']({}, { presetId: 'missing', prompt: 'x' }), /STYLE_PRESET_UNKNOWN/);
    await assert.rejects(() => workflow.operations['visual-workflow:style-preflight']({}, { presetId: 'community-street-smoke', prompt: '   ' }), /STYLE_PREFLIGHT_PROMPT_REQUIRED/);
  });
});

test('applying a preset keeps the prompt unchanged until the task carries styleControls', async () => {
  await withWorkflow(async (workflow) => {
    // The preset module must not mutate task contracts: style controls only
    // enter through an explicit styleControls object on the task input.
    const listed = await workflow.operations['visual-workflow:style-presets']({});
    const preset = listed.presets.find((item: any) => item.id === 'community-street-smoke');
    assert.equal(typeof preset.styleControls, 'object');
    assert.equal('knowledgeContext' in preset, false);
  });
});

const BASE_TASK = {
  projectId: 'b2bc6cf8-fad4-4770-a49b-b6fbee59745b',
  deliverableFamily: 'space',
  subtype: 'dining',
  shot: 'three_quarter_wide',
  currentInstruction: '临街社区店，中央明档',
  aspectRatio: '16:9',
  count: 1,
};

test('selecting a preset records its axes and applies them when no explicit controls', () => {
  const task = createShortChainTaskContract({ ...BASE_TASK, stylePresetId: 'community-street-smoke' });
  assert.equal(task.stylePreset.id, 'community-street-smoke');
  assert.equal(task.stylePreset.label, '社区底商 · 烟火气');
  assert.equal(task.styleControls.lighting, 'warm_dim');
  assert.deepEqual(task.stylePreset.axes, task.styleControls);
});

test('explicit controls override the preset while the preset axes stay for the delta', () => {
  const task = createShortChainTaskContract({
    ...BASE_TASK,
    stylePresetId: 'community-street-smoke',
    styleControls: { lighting: 'bright', density: 'dense' },
  });
  assert.equal(task.styleControls.lighting, 'bright', 'the explicit override wins');
  assert.equal(task.stylePreset.axes.lighting, 'warm_dim', 'the anchor value is kept for statistics');
  assert.equal(task.styleControls.textDensity, 'designer_choice');
});

test('unknown or malformed preset ids fail loudly instead of falling back', () => {
  assert.throws(() => createShortChainTaskContract({ ...BASE_TASK, stylePresetId: 'no-such-preset' }), /STYLE_PRESET_UNKNOWN/);
  assert.throws(() => createShortChainTaskContract({ ...BASE_TASK, stylePresetId: 'Bad Slug' }), /STYLE_PRESET_ID_INVALID/);
});

test('a contract without a preset keeps no preset key, so the baseline body is unchanged', () => {
  const task = createShortChainTaskContract({ ...BASE_TASK, styleControls: { lighting: 'warm_dim' } });
  assert.equal('stylePreset' in task, false);
});

test('the prompt compiler never reads the preset, so the prompt text stays identical', async () => {
  const files = [
    '../src/generation-runtime/space/compiler.js',
    '../src/generation-runtime/generation/compile.js',
    '../src/generation-runtime/space/semantic/compile-spatial-mechanisms.js',
  ];
  for (const relative of files) {
    const body = await fs.readFile(new URL(relative, import.meta.url), 'utf8');
    assert.equal(body.includes('stylePreset'), false, `${relative} must not read stylePreset`);
  }
});
