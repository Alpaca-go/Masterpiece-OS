// R10 final — frozen spatial semantic boundary test.
//
// Guards the R10.4 semantic boundary freeze (R10 §12): the functional layer
// (zones/circulation/privacy/operation/sequence/service relationship) must
// stay distinct from the brand motif layer. mustBeVisible only describes real
// operational entities; logo/wordmark/icon/motif/color-gradient/totem must not
// re-enter functional conditions. The frozen production compiler must keep
// architecture-before-brand and the negatives block last.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileSpacePrompt,
  separateSpaceSemantics,
} from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRANDS = ['jiuzhou-aesthetics', 'feng-tang-tang', 'yi-ji-liang-fang'];

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

function buildTask(subtype, shot) {
  return {
    schemaVersion: '1.0',
    taskId: 'r10-final-semantic',
    projectId: 'r10-final-semantic',
    deliverableFamily: 'space',
    subtype,
    shot,
    count: 1,
    aspectRatio: '16:9',
    currentInstruction: 'R10 final semantic boundary test.',
    mustInclude: [],
    mustAvoid: [],
    referenceAssetIds: [],
    logoUsageMode: 'post_composite',
    createdAt: '2026-08-08T00:00:00.000Z',
  };
}

test('R10 semantic boundary: no logo/icon/motif/gradient leaks into functional blocks', () => {
  // Drift guards legitimately mention motif as a NEGATIVE ("禁止直接使用写实
  // 孔雀照片") — that is protective, not functional leakage. So we assert only
  // the POSITIVE functional sections (spatial translation / operation /
  // human experience / commercial reality) carry no brand-identity or
  // literal-motif content. Block headers ("Architecture-Function Bridge")
  // legitimately contain "Function".
  const motif = /\b(peacock|feather)\b|孔雀|羽毛|纹样|图腾/iu;
  for (const brand of BRANDS) {
    const out = compileSpacePrompt({
      packet: loadPacket(brand),
      taskContract: buildTask('reception', 'entrance_view'),
      projectContext: { projectId: 'r10-final-semantic' },
      brandKey: brand,
      anchorMaxCount: 3,
    });
    for (const id of ['architecture_function_bridge', 'functional_requirement']) {
      const text = out.blocksById[id]?.text ?? '';
      // Drop the Concept Drift Guards section (protective negatives).
      const positive = text.split('**Concept Drift Guards')[0];
      assert.doesNotMatch(positive, motif, `${brand}/${id}: no literal motif in positive functional content`);
      assert.doesNotMatch(positive, /\b(logo|wordmark)\b|Slogan|发光字|标识/iu, `${brand}/${id}: no in-scene identity in positive functional content`);
    }
    // Architecture before brand + negatives last.
    assert.ok(out.blockIds.indexOf('brand_translation') > out.blockIds.indexOf('architecture_dna'), `${brand}: arch before brand`);
    assert.equal(out.blockIds[out.blockIds.length - 1], 'negative_constraints', `${brand}: negatives last`);
  }
});

test('R10 semantic boundary: separateSpaceSemantics keeps functional vs brand buckets', () => {
  const buckets = separateSpaceSemantics([
    '接待区与候诊区之间的 1.5m 动线',
    '入口→接待：短走廊缓冲',
    '品牌Slogan发光字',
    '孔雀图案作为主墙面',
  ]);
  // Spatial/functional phrases land in the architecture bucket (the classifier
  // treats circulation/transition as architectural — correct), identity/motif
  // phrases must NOT land there.
  const positive = [...buckets.architectureSemantics, ...buckets.functionalSemantics];
  assert.ok(positive.length >= 2, 'spatial/functional phrases separated');
  for (const item of positive) {
    assert.doesNotMatch(String(item.text ?? ''), /Slogan|孔雀|logo|图案|发光字/iu, 'no identity/motif in positive buckets');
  }
  // The identity/motif phrases are routed to the decorative/ambiguous buckets.
  assert.ok(buckets.decorativeIdentitySemantics.length + buckets.ambiguousSemantics.length >= 2, 'identity/motif routed away');
});

test('R10 route-baseline semantic freeze excludes identity/motif from functional layer', () => {
  const b = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'space-generator/quality-baselines/r10-final/route-baseline.json'),
    'utf8',
  ));
  const excluded = b.semanticBoundaryFreeze.excludedFromFunctionalLayer;
  for (const term of ['logo', 'wordmark', 'peacock', 'feather', 'pattern', 'color gradient', 'decorative totem']) {
    assert.ok(excluded.includes(term), `route-baseline excludes ${term}`);
  }
});
