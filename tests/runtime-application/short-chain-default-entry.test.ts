import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

test('Stage 4 makes short-chain the only production path; legacy removed from UI', async () => {
  const [appSource, settingsSource, settingsUiSource, localSettingsSource, pageSource, generationHookSource, gallerySource, mainSource, tokensSource] = await Promise.all([
    fs.readFile(new URL('../../apps/web/src/App.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web-runtime/src/node-settings-store.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/components/SettingsPanel.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/components/settings/LocalSection.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/pages/ShortChainPage.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/features/short-chain/hooks/useShortChainGeneration.ts', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/features/short-chain/OutputGallery.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/main.tsx', import.meta.url), 'utf8'),
    fs.readFile(new URL('../../apps/web/src/styles/tokens.css', import.meta.url), 'utf8'),
  ]);
  // Short chain is the default pipeline mode.
  assert.match(settingsSource, /imageGenerationPipelineMode:\s*'vnext'/u);
  // App.tsx mounts only the vnext/short-chain workspace for creative-session.
  assert.match(appSource, /<ShortChainPage/u);
  assert.doesNotMatch(appSource, /<CreativeSessionWorkspace/u);
  // App.tsx no longer branches on pipeline mode for routing.
  assert.doesNotMatch(appSource, /imageGenerationPipelineMode\s*!==\s*['"]legacy['"]/u);
  // Settings UI no longer exposes the legacy toggle; legacy code is kept
  // for old project reads only (not user-selectable).
  assert.doesNotMatch(settingsUiSource, /vNext 短链路（默认）/u);
  assert.doesNotMatch(settingsUiSource, /Legacy 旧链路（回滚）/u);
  assert.match(localSettingsSource, /短链路/);

  // The sole production page must preserve the real one-click generation path.
  assert.match(pageSource, /brief\.compile\(project\.id, null\)/u);
  assert.match(pageSource, /gen\.startValidated\(project\.id, compiled, apiProfileId\)/u);
  assert.match(pageSource, /onGenerate=\{\(\) => void handleGenerate\(\)\}/u);
  assert.match(appSource, /apiProfileId=\{selectedImageProfile\?\.id \|\| ''\}/u);
  assert.match(generationHookSource, /startValidatedShortChain\(\{[\s\S]*?apiProfileId,/u);
  assert.doesNotMatch(generationHookSource, /apiProfileId:\s*''/u);

  // Production UI must not fabricate project output history.
  assert.doesNotMatch(gallerySource, /useMockGallery|mock-1|placeholder = 'data:image/u);

  // The stylesheet split has one page-rules authority and no cyclic aliases.
  assert.match(mainSource, /import '\.\/styles\/pages\.css'/u);
  assert.doesNotMatch(mainSource, /import '\.\/styles\.css'/u);
  assert.doesNotMatch(tokensSource, /--([\w-]+):\s*var\(--\1\)/u);
});
