import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Phase 5 routes Creative Session to vNext by default and retains the legacy rollback', async () => {
  const [appSource, settingsSource, settingsUiSource] = await Promise.all([
    fs.readFile(new URL('../src/renderer/src/App.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/main/settings-store.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/renderer/src/components/SettingsPanel.tsx', import.meta.url), 'utf8'),
  ]);
  assert.match(settingsSource, /imageGenerationPipelineMode:\s*'vnext'/u);
  assert.match(appSource, /settings\.imageGenerationPipelineMode !== 'legacy'/u);
  assert.match(appSource, /<VNextGenerationWorkspace/u);
  assert.match(appSource, /<CreativeSessionWorkspace/u);
  assert.match(settingsUiSource, /vNext 短链路（默认）/u);
  assert.match(settingsUiSource, /Legacy 旧链路（回滚）/u);
});
