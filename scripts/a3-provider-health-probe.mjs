#!/usr/bin/env node
// A3-F Provider Health Probe (manual / opt-in)
//
// Per A3 spec §21: health probes are NEVER in `repo:verify` or
// default CI. This script is a manual / opt-in entry point.
//
// Usage:
//   node scripts/a3-provider-health-probe.mjs                 # probe default (volcengine)
//   node scripts/a3-provider-health-probe.mjs --provider qwen
//   node scripts/a3-provider-health-probe.mjs --provider volcengine --all
//   node scripts/a3-provider-health-probe.mjs --list          # read cached state only
//   node scripts/a3-provider-health-probe.mjs --clear         # clear cache
//
// The probe does a single minimal chat-completion request (max_tokens=1)
// to verify the provider's auth + endpoint round-trip. Result is
// recorded via `setProviderHealth(...)` (process-local cache).
// Run with --print to see the cache state after the probe.

import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { getCurrentProviderPolicy } from '@masterpiece/runtime-core/application/provider-policy.js';
import {
  getProviderHealth,
  setProviderHealth,
  clearProviderHealth,
  listProviderHealth,
} from '@masterpiece/model-runtime/provider-health.js';
import { createQwenReasoner } from '@masterpiece/model-runtime/qwen-reasoner.js';
import { createVolcengineReasoner } from '@masterpiece/model-runtime/volcengine-reasoner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(args) {
  const options = { provider: null, list: false, clear: false, all: false, print: true };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--provider') options.provider = String(args[++i] || '').trim().toLowerCase();
    else if (arg === '--list') options.list = true;
    else if (arg === '--clear') options.clear = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--no-print') options.print = false;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/a3-provider-health-probe.mjs [options]

Options:
  --provider <id>   Probe a specific provider (volcengine | qwen). Default = policy.default.provider
  --all             Probe all registered providers (default + alternative)
  --list            Read cached state only (no network call)
  --clear           Clear all cached health state
  --no-print        Do not print the cache state after the probe`);
      process.exit(0);
    } else {
      throw new Error(`未知选项：${arg}`);
    }
  }
  return options;
}

function resolveTargetProviderIds(options) {
  if (options.all) {
    const policy = getCurrentProviderPolicy();
    return [policy.default.provider, ...policy.alternative.map((entry) => entry.provider)];
  }
  if (options.provider) return [options.provider];
  return [getCurrentProviderPolicy().default.provider];
}

function envKeyFor(providerId) {
  if (providerId === 'qwen') return 'QWEN_API_KEY';
  if (providerId === 'volcengine') return 'VOLCENGINE_API_KEY';
  return null;
}

async function probeProvider(providerId) {
  const apiKeyEnv = envKeyFor(providerId);
  if (!apiKeyEnv || !process.env[apiKeyEnv]) {
    setProviderHealth(providerId, 'unavailable', { error: `${apiKeyEnv || 'API_KEY'} not set in environment` });
    return getProviderHealth(providerId);
  }

  const started = performance.now();
  try {
    let reasoner;
    if (providerId === 'qwen') reasoner = createQwenReasoner({ environment: process.env });
    else if (providerId === 'volcengine') reasoner = createVolcengineReasoner({ environment: process.env });
    else throw new Error(`Unsupported provider: ${providerId}`);

    // Minimal round-trip: 1-char text prompt, no images, no schema.
    // If the provider's auth + endpoint are healthy, this returns
    // a canonical result with runId; we don't read the body.
    await reasoner({
      prompt: {
        messages: [
          { role: 'system', content: 'ping' },
          { role: 'user', content: '.' },
        ],
        attachments: [],
      },
      maximumDurationMs: 60_000,
    });
    const elapsed = performance.now() - started;
    setProviderHealth(providerId, 'available', { checkedAt: new Date().toISOString() });
    const cached = getProviderHealth(providerId);
    return Object.freeze({ ...cached, probeMs: Number(elapsed.toFixed(3)) });
  } catch (error) {
    const elapsed = performance.now() - started;
    setProviderHealth(providerId, 'unavailable', { error: String(error?.message || error) });
    const cached = getProviderHealth(providerId);
    return Object.freeze({ ...cached, probeMs: Number(elapsed.toFixed(3)) });
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.clear) {
    listProviderHealth().forEach((entry) => clearProviderHealth(entry.provider));
    console.log(JSON.stringify({ event: 'PROVIDER_HEALTH_CLEARED' }, null, 2));
    return;
  }
  if (options.list) {
    console.log(JSON.stringify({ event: 'PROVIDER_HEALTH_LIST', entries: listProviderHealth() }, null, 2));
    return;
  }
  const targetIds = resolveTargetProviderIds(options);
  const results = [];
  for (const id of targetIds) {
    const result = await probeProvider(id);
    results.push(result);
  }
  if (options.print) {
    console.log(JSON.stringify({ event: 'PROVIDER_HEALTH_PROBE', results }, null, 2));
  }
}

main().catch((error) => {
  console.error(`错误：${error.message}`);
  if (process.env.DEBUG) console.error(error.stack);
  process.exitCode = 1;
});
