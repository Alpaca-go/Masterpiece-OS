import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveWebRpcChannel,
  WEB_RPC_CHANNEL_OVERRIDES
} from '../../apps/web/src/web-api.ts';

const EXPECTED_SHORT_CHAIN_CHANNELS = Object.freeze({
  'imageGeneration.compileShortChain': 'image-generation:short-chain-compile',
  'imageGeneration.getShortChainOptions': 'image-generation:short-chain-options',
  'imageGeneration.startShortChain': 'image-generation:short-chain-start',
  'imageGeneration.startValidatedShortChain': 'image-generation:short-chain-start-validated',
  'imageGeneration.getShortChainSession': 'image-generation:short-chain-session',
  'imageGeneration.confirmShortChainDirection': 'image-generation:short-chain-confirm-direction',
  'imageGeneration.confirmShortChainGeneratedOutput': 'image-generation:short-chain-confirm-generated-output',
  'imageGeneration.revokeShortChainGeneratedOutput': 'image-generation:short-chain-revoke-generated-output',
  'imageGeneration.getShortChainConfirmedGeneratedOutputs': 'image-generation:short-chain-confirmed-generated-outputs',
  'imageGeneration.continueShortChainSameType': 'image-generation:short-chain-continue-same-type',
  'imageGeneration.saveShortChainProjectPromptAsset': 'image-generation:short-chain-save-prompt-asset',
  'imageGeneration.postCompositeShortChainLogo': 'image-generation:short-chain-post-composite-logo',
  'projectContext.getShortChain': 'project-context:get-generation',
  'projectContext.rebuildShortChain': 'project-context:rebuild-generation',
  'projectContext.getGenerationReadiness': 'project-context:generation-readiness'
});

test('Web API maps the complete Short-Chain method family to semantic operation channels', () => {
  assert.deepEqual(WEB_RPC_CHANNEL_OVERRIDES, EXPECTED_SHORT_CHAIN_CHANNELS);
  for (const [key, channel] of Object.entries(EXPECTED_SHORT_CHAIN_CHANNELS)) {
    const [namespace, method] = key.split('.');
    assert.equal(resolveWebRpcChannel(namespace!, method!), channel);
  }
});

test('Web API retains convention-based mapping for ordinary operation methods', () => {
  assert.equal(resolveWebRpcChannel('settings', 'saveProfile'), 'settings:save-profile');
  assert.equal(resolveWebRpcChannel('imageGeneration', 'getCapabilities'), 'image-generation:get-capabilities');
  assert.equal(resolveWebRpcChannel('creativeSession', 'getWorkspace'), 'creative-session:get-workspace');
});
