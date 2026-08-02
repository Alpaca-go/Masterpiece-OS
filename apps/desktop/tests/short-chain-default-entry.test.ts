import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Short-Chain is the only production path and the retired workspace is absent from UI', async () => {
  const [appSource, settingsSource, settingsUiSource, sharedTypesSource] = await Promise.all([
    fs.readFile(new URL('../src/renderer/src/App.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/main/settings-store.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/renderer/src/components/SettingsPanel.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../src/shared/types.ts', import.meta.url), 'utf8'),
  ]);
  // App.tsx mounts only the short-chain/short-chain workspace for creative-session.
  assert.match(appSource, /<ShortChainGenerationWorkspace/u);
  assert.doesNotMatch(appSource, /<CreativeSessionWorkspace/u);
  // The retired mode is consumed only while reading old settings and is never
  // exposed through public types, written back, or used for routing.
  assert.match(settingsSource, /imageGenerationPipelineMode:\s*_retiredGenerationMode/u);
  assert.doesNotMatch(settingsSource, /settings\.imageGenerationPipelineMode\s*=/u);
  assert.doesNotMatch(sharedTypesSource, /imageGenerationPipelineMode/u);
  // Settings UI no longer exposes the retired toggle.
  assert.doesNotMatch(settingsUiSource, /Short-Chain 短链路（默认）/u);
  assert.doesNotMatch(settingsUiSource, /Legacy 旧链路（回滚）/u);
  assert.match(settingsUiSource, /生成工作台是当前唯一生图路径/u);
});
