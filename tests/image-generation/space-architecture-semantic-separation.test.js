// R9 production semantic separation test.
//
// The production compiler (src/space/semantic) must keep the R8.6-proven
// separation: architectureSemantics / brandMotifSemantics / ambiguousSemantics
// (ambiguous + color-geometry + decorative-identity routed away from
// architecture geometry), deterministic, no LLM, no V5 schema change.
//
// R9 §9: semantic separation must be migrated as-is, not redesigned.
// R9 §10: spatialMechanisms stay compile-time ephemeral IR, deterministic,
// derived from existing architecture-related fields, never via LLM.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compileSpatialMechanisms,
  compileRawPhrases,
  separateSpaceSemantics,
  classifyPhrase,
  SEMANTIC_CLASS,
  COMPILE_SPATIAL_MECHANISMS_VERSION,
} from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/current-verification/source-packets/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

test('R9 semantic separation keeps three streams for JZMX (architecture / brand / ambiguous)', () => {
  const semantic = compileSpatialMechanisms(loadPacket('jiuzhou-aesthetics'));
  assert.ok(Array.isArray(semantic.architectureSemantics), 'architecture stream');
  assert.ok(Array.isArray(semantic.brandMotifSemantics), 'brand motif stream');
  assert.ok(semantic.architectureSemantics.length >= 1, 'architecture populated');
  assert.ok(semantic.brandMotifSemantics.length >= 1, 'brand motif populated (motif lives here, not architecture)');
  // The action-verb IR (which actually renders into the prompt) must not carry
  // literal motif nouns. uniqueUpgradeThesis prose is field-excluded from
  // architecture by the source adapter (MECHANIC_EXCLUDED_FIELDS).
  const irText = [
    ...semantic.architectureStrategy,
    ...semantic.architectureForm,
    ...semantic.architectureOrganization,
  ].join(' ');
  assert.doesNotMatch(irText, /\b(feather|peacock)\b|羽毛|孔雀|翎羽/iu, 'no literal motif in action-verb architecture IR');
});

test('R9 semantic separation routes ambiguous motif+geometry away from architecture geometry', () => {
  const out = compileRawPhrases(['流畅的曲线墙面或隔断，模拟羽毛的层叠与包裹感']);
  assert.ok(out.architectural.length >= 1, 'architectural stream populated');
  // The normalized architectural text must not carry the literal motif noun.
  for (const item of out.architectural) {
    assert.doesNotMatch(String(item.text ?? ''), /羽毛|feather/iu, 'no motif literal in architecture');
  }
});

test('R9 classifyPhrase still returns the frozen SEMANTIC_CLASS vocabulary', () => {
  assert.ok(SEMANTIC_CLASS.BRAND_MOTIF, 'BRAND_MOTIF class');
  assert.ok(SEMANTIC_CLASS.COLOR_GEOMETRY, 'COLOR_GEOMETRY class');
  const analysis = classifyPhrase('孔雀图案作为主墙面', 'signatureSpatialMechanism');
  assert.ok(Array.isArray(analysis.motifHits), 'motifHits present');
});

test('R9 spatial mechanisms version is recorded and deterministic', () => {
  assert.equal(typeof COMPILE_SPATIAL_MECHANISMS_VERSION, 'string');
  const a = compileSpatialMechanisms(loadPacket('jiuzhou-aesthetics'));
  const b = compileSpatialMechanisms(loadPacket('jiuzhou-aesthetics'));
  assert.deepEqual(a.architectureStrategy, b.architectureStrategy, 'deterministic');
  assert.deepEqual(a.brandMotifSemantics, b.brandMotifSemantics, 'deterministic brand');
});

test('R9 separateSpaceSemantics produces the frozen bucket contract', () => {
  // separateSpaceSemantics(items) classifies each raw phrase into the frozen
  // R8.6 buckets (architecture / brand / ambiguous / colorAccent / functional /
  // decorativeIdentity). Assert the API shape is unchanged from R8.6.
  const items = ['连续曲面天花', '半透明层叠介质', '品牌Slogan发光字'];
  const buckets = separateSpaceSemantics(items);
  assert.ok(buckets, 'returns buckets');
  assert.ok(Array.isArray(buckets.architectureSemantics), 'architecture bucket');
  assert.ok(Array.isArray(buckets.brandMotifSemantics), 'brand motif bucket');
  assert.ok(Array.isArray(buckets.ambiguousSemantics), 'ambiguous bucket');
  assert.ok(Array.isArray(buckets.colorAccentSemantics), 'color accent bucket');
  assert.ok(Array.isArray(buckets.functionalSemantics), 'functional bucket');
  assert.ok(Array.isArray(buckets.decorativeIdentitySemantics), 'decorative identity bucket');
  // "品牌Slogan发光字" is decorative identity, never architecture geometry.
  assert.ok(buckets.architectureSemantics.every((r) => !/Slogan|发光字/iu.test(r.text)), 'no in-scene identity in architecture');
});
