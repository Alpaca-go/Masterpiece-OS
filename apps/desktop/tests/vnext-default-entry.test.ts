import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Stage 4 makes short-chain the only production path; legacy removed from UI', async () => {
  const [appSource, settingsSource, settingsUiSource] = await Promise.all([
    fs.readFile(new URL('../src/renderer/src/App.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/main/settings-store.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/renderer/src/components/SettingsPanel.tsx', import.meta.url), 'utf8'),
  ]);
  // Short chain is the default pipeline mode.
  assert.match(settingsSource, /imageGenerationPipelineMode:\s*'vnext'/u);
  // App.tsx mounts only the vnext/short-chain workspace for creative-session.
  assert.match(appSource, /<VNextGenerationWorkspace/u);
  assert.doesNotMatch(appSource, /<CreativeSessionWorkspace/u);
  // App.tsx no longer branches on pipeline mode for routing.
  assert.doesNotMatch(appSource, /imageGenerationPipelineMode\s*!==\s*['"]legacy['"]/u);
  // Settings UI no longer exposes the legacy toggle; legacy code is kept
  // for old project reads only (not user-selectable).
  assert.doesNotMatch(settingsUiSource, /vNext 短链路（默认）/u);
  assert.doesNotMatch(settingsUiSource, /Legacy 旧链路（回滚）/u);
  assert.match(settingsUiSource, /短链路/);
});
