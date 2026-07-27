import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { compileCreativeCore, compileFinalPrompt } from '../../packages/image-generation-runtime/src/prompt/index.js';

function brief(mode) {
  return { mode, outputTask: { responsibility: 'Establish the first anchor image.' }, preserve: { identity: ['Brand identity'], structures: ['Package silhouette'] }, mustChange: { composition: ['Change composition'] }, prohibitedCarryover: mode === 'extend' ? [] : ['Do not reuse the legacy collage'], newDirection: { visualAnchor: 'A new hero scene', sceneMechanism: 'Layered depth', compositionStrategy: ['Hero-first'], colorRelationship: ['Warm / neutral'], materialAndLighting: ['Soft light'], typographyRelationship: [] }, creativeDifferenceTarget: { level: mode === 'extend' ? 'low' : mode === 'upgrade' ? 'medium' : 'high', explanation: 'Intentional difference.' } };
}

for (const mode of ['extend', 'upgrade', 'rebuild']) {
  test(`${mode} creative core preserves its distinct transformation instruction`, async () => {
    const source = brief(mode);
    const core = compileCreativeCore({ brief: source, mode });
    const final = compileFinalPrompt({ deterministicPrompt: '## Deterministic constraints\n- Logo locked', creativeCore: core, brief: source });
    const snapshot = await readFile(fileURLToPath(new URL(`./prompt-snapshots/${mode}-final-prompt.md`, import.meta.url)), 'utf8');
    for (const line of snapshot.replace(/\r\n/g, '\n').trim().split('\n')) assert.ok(final.compiledPromptMarkdown.includes(line), line);
    assert.equal(final.promptSourceMap.creativeCore.mode, mode);
    assert.ok(final.compiledPromptMarkdown.indexOf('## Deterministic constraints') < final.compiledPromptMarkdown.indexOf('## Creative Core'));
  });
}
