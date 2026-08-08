#!/usr/bin/env node
// Collect run metadata from a real-provider output directory and print a
// manifest fragment (provider, model, size, promptHash, anchor ids, run id).
//
// Usage:
//   node apps/desktop/scripts/space-quality/collect-run-metadata.mjs \
//     --run-dir <dir containing prompt.md, run.json, ...>
//
// The fragment is printed to stdout; merge it into the scene's manifest.json.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const out = { runDir: null };
  const map = { 'run-dir': 'runDir' };
  for (let i = 0; i < argv.length; i += 1) {
    const m = argv[i].match(/^--([\w-]+)(?:=(.*))?$/u);
    if (!m) continue;
    const key = map[m[1]];
    if (!key) continue;
    out[key] = m[2] !== undefined ? m[2] : argv[++i];
  }
  return out;
}

function readJson(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.runDir) {
    process.stderr.write('Usage: collect-run-metadata.mjs --run-dir <dir>\n');
    process.exit(2);
  }
  const dir = path.resolve(args.runDir);
  const prompt = fs.existsSync(path.join(dir, 'prompt.md'))
    ? fs.readFileSync(path.join(dir, 'prompt.md'), 'utf8')
    : '';
  const run = readJson(path.join(dir, 'run.json')) || {};
  const refTrace = readJson(path.join(dir, 'reference-trace.json')) || {};

  const fragment = {
    promptHash: prompt ? sha256(prompt) : null,
    promptChars: prompt ? [...prompt].length : 0,
    output: {
      runId: run.runId || run.id || null,
      promptFile: 'prompt.md',
      providerPayloadFile: fs.existsSync(path.join(dir, 'provider-payload.json')) ? 'provider-payload.json' : null,
      referenceTraceFile: fs.existsSync(path.join(dir, 'reference-trace.json')) ? 'reference-trace.json' : null,
      runFile: 'run.json',
      imageFile: fs.existsSync(path.join(dir, 'output.png')) ? 'output.png' : null,
      imageSha256: null,
    },
    referenceIds: refTrace.referenceIds || [],
    architectureAnchorIds: refTrace.architectureAnchorIds || [],
    provider: {
      provider: run.provider || null,
      model: run.model || null,
      profileId: run.profileId || null,
      size: run.size || null,
      aspectRatio: run.aspectRatio || null,
    },
  };

  process.stdout.write(`${JSON.stringify(fragment, null, 2)}\n`);
}

main();
