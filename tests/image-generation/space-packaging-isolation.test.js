// R9 packaging isolation test.
//
// R9 §17: Space and Packaging must be two independent Generation Compilers.
// R9 §31: Packaging must not be affected by the Space productionization.
//
// This test proves the production Space module (src/space) is a pure space
// compiler — it exposes no packaging branch — and that the deliverable-family
// router in compile.js keeps packaging on the vNext/packaging compiler rather
// than the production Space Compiler.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSpacePrompt } from '@masterpiece/image-generation-runtime/space/index.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadPacket(brand) {
  return JSON.parse(fs.readFileSync(
    path.join(repoRoot, `space-generator/quality-baselines/phase9b-recovered/_packets/${brand}/visual-decision-packet.json`),
    'utf8',
  ));
}

test('R9 production space compiler is packaging-agnostic (space-only)', () => {
  const packet = loadPacket('jiuzhou-aesthetics');
  // Inject packaging media translations; the space compiler must ignore them
  // and still produce a space prompt with the frozen 14-block order.
  const polluted = {
    ...packet,
    mediaTranslations: {
      ...packet.mediaTranslations,
      packaging: {
        lidStructure: '纸浆模塑盒盖',
        boxStructure: '瓦楞纸盒身',
        visualHierarchy: ['品牌标识在盒盖中央'],
        materialFeel: ['哑光质感'],
      },
    },
  };
  const out = compileSpacePrompt({
    packet: polluted,
    taskContract: {
      schemaVersion: '1.0',
      taskId: 'r9-pkg-isolation',
      projectId: 'r9-pkg',
      deliverableFamily: 'space',
      subtype: 'reception',
      shot: 'entrance_view',
      count: 1,
      aspectRatio: '16:9',
      currentInstruction: 'R9 packaging-isolation test.',
      mustInclude: [],
      mustAvoid: [],
      referenceAssetIds: [],
      logoUsageMode: 'post_composite',
      createdAt: '2026-08-08T00:00:00.000Z',
    },
    brandKey: 'jiuzhou-aesthetics',
    anchorMaxCount: 3,
  });
  assert.ok(out.finalPrompt.length > 0, 'space prompt produced');
  // Packaging block ids must not appear in a space prompt.
  assert.ok(!out.blockIds.includes('packaging'), 'no packaging block');
  // The space prompt must not mention packaging structure terms.
  assert.ok(!/盒盖|盒身|瓦楞|纸浆模塑/iu.test(out.finalPrompt), 'no packaging language leaked');
});

test('R9 deliverable-family router keeps packaging on the packaging compiler', async () => {
  // compile.js routes by deliverableFamily: only 'space' may enter the
  // production Space Compiler; packaging/vi/poster go to the vNext compiler.
  const compileSrc = fs.readFileSync(
    path.join(repoRoot, 'packages/image-generation-runtime/src/generation/compile.js'),
    'utf8',
  );
  // The router conditions on deliverableFamily === 'space' before production mode.
  assert.match(compileSrc, /deliverableFamily === 'space'/, 'space route guard present');
  assert.match(compileSrc, /isProductionSpaceMode\(spaceMode\)/, 'production mode gate on space only');
  // Non-space families fall through to compileShortChainPrompt.
  assert.match(compileSrc, /compileShortChainPrompt\(/, 'packaging/other families use the vNext compiler');
});
