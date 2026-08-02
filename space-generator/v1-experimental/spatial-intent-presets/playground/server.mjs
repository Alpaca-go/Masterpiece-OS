// Spatial Intent Presets Playground — Static server.
// 用途: 在浏览器里查看 4 个 preset + 5 brand DNA × 4 preset 的 spatial_intent_preset block 差异.
// 不接 production UI, 纯实验模块可视化. text-level only, no Provider.

import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, resolve } from 'node:path';
import {
  compileSpatialIntentPresetBlock,
  loadPreset,
  listAvailablePresets,
  SUPPORTED_PRESETS,
  PRESET_INTENTS,
} from '../compile-spatial-intent-preset-prompt.mjs';
import { loadBrandDna } from '../../space-runtime/data-contract.mjs';
import { compileSpaceRuntime } from '../../space-runtime/compile-space-runtime.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const playgroundDir = __dirname;
const repoRoot = resolve(playgroundDir, '..', '..', '..', '..', '..');
const moduleRoot = resolve(playgroundDir, '..');

const PORT = Number(process.env.SPATIAL_INTENT_PRESETS_PLAYGROUND_PORT ?? 5275);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const BRAND_KEYS = [
  'jiuzhou-aesthetics',
  'feng-tang-tang',
  'yi-ji-liang-fang',
  'wa-ye',
  'jin-xiu',
];

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': type });
  res.end(body);
}

async function compilePresetBlock(brandKey, preset) {
  let industry = null;
  try {
    const dna = await loadBrandDna(brandKey);
    industry = dna.dna?.project?.industry ?? null;
  } catch {
    // brand dna 未找到也不致命,industry 留空
  }
  const block = compileSpatialIntentPresetBlock(preset, { brandKey, industry });
  return {
    blockId: block.blockId,
    blockTitle: block.blockTitle,
    content: block.content,
    characterCount: block.characterCount,
    spatialIntentPreset: block.spatialIntentPreset,
  };
}

async function compileFullPrompt(brandKey, preset) {
  const r = compileSpaceRuntime(brandKey, { preset });
  return {
    brandKey: r.brandKey,
    preset,
    blockCount: r.blockCount,
    characterCount: r.characterCount,
    runtimePath: r.runtimePath,
    moduleVersions: r.moduleVersions,
    blocks: r.blocks.map((b) => ({ id: b.id, title: b.title, charCount: b.text.length, text: b.text })),
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  // API: GET /api/presets
  if (url.pathname === '/api/presets' && req.method === 'GET') {
    return sendJson(res, 200, {
      supported: SUPPORTED_PRESETS,
      intents: PRESET_INTENTS,
      details: SUPPORTED_PRESETS.map((p) => {
        const d = loadPreset(p);
        return {
          preset: p,
          label: d.label,
          intent: d.intent,
          runtimeTendency: d.runtimeTendency,
        };
      }),
    });
  }

  // API: GET /api/brands
  if (url.pathname === '/api/brands' && req.method === 'GET') {
    const brands = [];
    for (const key of BRAND_KEYS) {
      try {
        const d = await loadBrandDna(key);
        const project = d.dna?.project ?? {};
        const industry = project.industry ?? null;
        const brandName = project.brandName ?? project.projectName ?? key;
        brands.push({ key, brandName, industry });
      } catch (err) {
        brands.push({ key, brandName: key, industry: null, error: err.message });
      }
    }
    return sendJson(res, 200, { brands });
  }

  // API: GET /api/preset-block?brand=<key>&preset=<preset>
  if (url.pathname === '/api/preset-block' && req.method === 'GET') {
    const brandKey = url.searchParams.get('brand');
    const preset = url.searchParams.get('preset');
    if (!brandKey || !preset) {
      return sendJson(res, 400, { error: 'brand and preset are required' });
    }
    if (!BRAND_KEYS.includes(brandKey)) {
      return sendJson(res, 400, { error: `unknown brand: ${brandKey}` });
    }
    if (!SUPPORTED_PRESETS.includes(preset)) {
      return sendJson(res, 400, { error: `unknown preset: ${preset}` });
    }
    try {
      const block = await compilePresetBlock(brandKey, preset);
      return sendJson(res, 200, block);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // API: GET /api/compile?brand=<key>&preset=<preset>
  if (url.pathname === '/api/compile' && req.method === 'GET') {
    const brandKey = url.searchParams.get('brand');
    const preset = url.searchParams.get('preset');
    if (!brandKey || !preset) {
      return sendJson(res, 400, { error: 'brand and preset are required' });
    }
    if (!BRAND_KEYS.includes(brandKey)) {
      return sendJson(res, 400, { error: `unknown brand: ${brandKey}` });
    }
    if (!SUPPORTED_PRESETS.includes(preset)) {
      return sendJson(res, 400, { error: `unknown preset: ${preset}` });
    }
    try {
      const result = await compileFullPrompt(brandKey, preset);
      return sendJson(res, 200, result);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Static file serving under playground/ + node_modules (for vite-style relative ESM resolution not needed, we hand-write paths)
  if (url.pathname === '/' || url.pathname === '/index.html') {
    return serveStatic(res, join(playgroundDir, 'index.html'));
  }
  if (url.pathname.startsWith('/playground/')) {
    const safe = url.pathname.replace(/^\/playground\//, '');
    return serveStatic(res, join(playgroundDir, safe));
  }

  // Fallback: 404
  return sendText(res, 404, 'Not found');
});

async function serveStatic(res, filePath) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return sendText(res, 404, 'Not found');
    const ext = extname(filePath).toLowerCase();
    const type = MIME[ext] ?? 'application/octet-stream';
    const body = await readFile(filePath);
    res.writeHead(200, { 'content-type': type });
    res.end(body);
  } catch {
    return sendText(res, 404, 'Not found');
  }
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[spatial-intent-presets playground] http://127.0.0.1:${PORT}`);
  console.log(`  /              index.html`);
  console.log(`  /api/presets   list 4 preset details`);
  console.log(`  /api/brands    list 5 brand DNA summary`);
  console.log(`  /api/preset-block?brand=<key>&preset=<p>   single preset emphasis block`);
  console.log(`  /api/compile?brand=<key>&preset=<p>         full compileSpaceRuntime prompt`);
});
