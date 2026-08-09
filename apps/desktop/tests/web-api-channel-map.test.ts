import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveWebRpcChannel,
  WEB_RPC_CHANNEL_OVERRIDES
} from '../src/renderer/src/web-api.ts';

const EXPECTED_VNEXT_CHANNELS = Object.freeze({
  'imageGeneration.compileVNext': 'image-generation:vnext-compile',
  'imageGeneration.getVNextOptions': 'image-generation:vnext-options',
  'imageGeneration.startVNext': 'image-generation:vnext-start',
  'imageGeneration.startValidatedVNext': 'image-generation:vnext-start-validated',
  'imageGeneration.getVNextSession': 'image-generation:vnext-session',
  'imageGeneration.confirmVNextDirection': 'image-generation:vnext-confirm-direction',
  'imageGeneration.confirmVNextGeneratedOutput': 'image-generation:vnext-confirm-generated-output',
  'imageGeneration.revokeVNextGeneratedOutput': 'image-generation:vnext-revoke-generated-output',
  'imageGeneration.getVNextConfirmedGeneratedOutputs': 'image-generation:vnext-confirmed-generated-outputs',
  'imageGeneration.continueVNextSameType': 'image-generation:vnext-continue-same-type',
  'imageGeneration.saveVNextProjectPromptAsset': 'image-generation:vnext-save-prompt-asset',
  'imageGeneration.postCompositeVNextLogo': 'image-generation:vnext-post-composite-logo',
  'projectContext.getVNext': 'project-context:get-vnext',
  'projectContext.rebuildVNext': 'project-context:rebuild-vnext'
});

test('Web API maps the complete vNext method family to the registered Desktop IPC channels', () => {
  assert.deepEqual(WEB_RPC_CHANNEL_OVERRIDES, EXPECTED_VNEXT_CHANNELS);
  for (const [key, channel] of Object.entries(EXPECTED_VNEXT_CHANNELS)) {
    const [namespace, method] = key.split('.');
    assert.equal(resolveWebRpcChannel(namespace!, method!), channel);
  }
});

test('Web API retains convention-based mapping for ordinary Desktop methods', () => {
  assert.equal(resolveWebRpcChannel('settings', 'saveProfile'), 'settings:save-profile');
  assert.equal(resolveWebRpcChannel('imageGeneration', 'getCapabilities'), 'image-generation:get-capabilities');
  assert.equal(resolveWebRpcChannel('creativeSession', 'getWorkspace'), 'creative-session:get-workspace');
});
