import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveWebRpcChannel,
  WEB_RPC_CHANNEL_OVERRIDES
} from '../src/renderer/src/web-api.ts';

const EXPECTED_SHORT_CHAIN_CHANNELS = Object.freeze({
  'imageGeneration.compileShortChain': 'image-generation:short-chain-compile',
  'imageGeneration.getShortChainOptions': 'image-generation:short-chain-options',
  'imageGeneration.startShortChain': 'image-generation:short-chain-start',
  'imageGeneration.startValidatedShortChain': 'image-generation:short-chain-start-validated',
  'imageGeneration.getShortChainSession': 'image-generation:short-chain-session',
  'imageGeneration.confirmShortChainDirection': 'image-generation:short-chain-confirm-direction',
  'imageGeneration.continueShortChainSameType': 'image-generation:short-chain-continue-same-type',
  'imageGeneration.saveShortChainProjectPromptAsset': 'image-generation:short-chain-save-prompt-asset',
  'imageGeneration.postCompositeShortChainLogo': 'image-generation:short-chain-post-composite-logo',
  'imageGeneration.postCompositeShortChainLockedAssets': 'image-generation:short-chain-post-composite-locked-assets',
  'projectContext.getShortChain': 'project-context:get-short-chain',
  'projectContext.rebuildShortChain': 'project-context:rebuild-short-chain'
});

test('Web API maps the complete Short-Chain method family to the registered Desktop IPC channels', () => {
  assert.deepEqual(WEB_RPC_CHANNEL_OVERRIDES, EXPECTED_SHORT_CHAIN_CHANNELS);
  for (const [key, channel] of Object.entries(EXPECTED_SHORT_CHAIN_CHANNELS)) {
    const [namespace, method] = key.split('.');
    assert.equal(resolveWebRpcChannel(namespace!, method!), channel);
  }
});

test('Web API retains convention-based mapping for ordinary Desktop methods', () => {
  assert.equal(resolveWebRpcChannel('settings', 'saveProfile'), 'settings:save-profile');
  assert.equal(resolveWebRpcChannel('imageGeneration', 'getCapabilities'), 'image-generation:get-capabilities');
  assert.equal(resolveWebRpcChannel('creativeSession', 'getWorkspace'), 'creative-session:get-workspace');
});
