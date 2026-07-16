import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createProjectStore } from '../src/main/project-store.ts';
import type { PublicSettings } from '../src/shared/types.ts';

const ONE_PIXEL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

test('folder intake creates fixed metadata, imports assets, and detects Logo without credentials', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-desktop-intake-'));
  try {
    const source = path.join(temporary, '九州医美视觉方案');
    const data = path.join(temporary, 'data');
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, '九州美学-品牌Logo.png'), ONE_PIXEL_PNG);
    const settings: PublicSettings = {
      provider: 'qwen',
      baseUrl: 'https://example.invalid/compatible-mode/v1',
      model: 'qwen3-vl-plus',
      hasApiKey: true,
      defaultDataPath: data,
      cacheEnabled: true,
      logLevel: 'info',
      connectionStatus: 'untested'
    };
    const store = createProjectStore(async () => settings);
    const project = await store.create({ sourcePaths: [source] });
    const summary = await store.scan(project.id);
    const paths = await store.paths(project.id);
    const stored = await fs.readFile(path.join(paths.root, 'project.json'), 'utf8');

    assert.equal(project.projectName, '九州医美视觉方案');
    assert.equal(project.projectNameSource, 'uploaded-folder-name');
    assert.equal(project.logoLocked, true);
    assert.equal(project.outputLanguage, 'zh-CN');
    assert.equal(project.analysisProfile, 'fusion-enhanced');
    assert.equal(summary.imageCount, 1);
    assert.equal(summary.logoDetected, true);
    assert.match(project.detectedIndustry, /医学美学/);
    assert.doesNotMatch(stored, /apiKey|encryptedApiKey/i);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
