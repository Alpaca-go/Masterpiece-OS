import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createReferencePackService } from '../src/main/reference-pack-service.ts';

test('Reference Pack service creates locked/style/exclude/anchor folders and copies only selected files', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'masterpiece-reference-pack-'));
  await fs.mkdir(path.join(root, 'input'), { recursive: true });
  const candidates = [];
  for (let index = 0; index < 10; index += 1) {
    const filename = `asset-${index}.png`;
    await fs.writeFile(path.join(root, 'input', filename), `asset-${index}`);
    candidates.push({
      asset_id: `asset-${index}`,
      source_kind: 'original_asset',
      source_path: `input/${filename}`,
      role: index === 0 ? 'keep_reference' : index >= 8 ? 'ignore_reference' : 'style_reference',
      rationale: index >= 8 ? '旧版错误' : '有效候选',
      signals: [index === 0 ? 'identity_reference' : 'reading_only'],
      score: index === 0 ? 95 : 55,
    });
  }
  const memory = {
    schema_version: '1.0',
    id: 'visual-memory-1',
    project_id: 'p1',
    brand_core: { industry: '餐饮', positioning: '现代餐饮', mood: [], core_temperament: [] },
    locked_assets: [],
    visual_dna: { colors: [], materials: [], photography: [], composition: [], graphic_language: [] },
    visual_problems: [],
    visual_opportunities: [],
    reference_strategy: {
      pack_size: { min: 3, max: 5 },
      provider_reference_limit: 2,
      candidates,
    },
    generation_rules: { preserve: [], transform: [], avoid: [] },
    source: {
      visual_context_generated_at: '2026-07-28T00:00:00.000Z',
      creative_understanding_generated_at: '2026-07-28T00:01:00.000Z',
      creative_direction_id: 'd1',
      creative_direction_version: '1.0.0',
      compiler_version: 'visual-memory-1.0.0',
    },
    generated_at: '2026-07-28T00:02:00.000Z',
  };
  const service = createReferencePackService(
    { paths: async () => ({ root }) } as never,
    { get: async () => memory } as never,
    { getActive: async () => null } as never,
  );
  const pack = await service.build('p1');
  assert.equal(pack.items.length, 5);
  for (const folder of ['locked', 'style', 'exclude', 'anchor']) {
    assert.ok(await fs.stat(path.join(root, 'visual-memory', 'reference-pack', folder)));
  }
  assert.ok(await fs.stat(path.join(root, 'visual-memory', 'reference-pack', 'reference-pack.json')));
  assert.equal((await fs.readdir(path.join(root, 'visual-memory', 'reference-pack', 'exclude'))).length, 1);
});
