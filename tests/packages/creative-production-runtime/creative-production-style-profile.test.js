import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  compileStyleProfile,
  nextStyleProfileVersion,
  validateStyleProfile,
} from '@masterpiece/creative-production-runtime/style-profile.js';

function transformation(projectId, visualAnchor) {
  return {
    schemaVersion: '1.0',
    projectId,
    runId: `run-${projectId}`,
    newDirection: {
      visualAnchor,
      sceneMechanism: '以清晰主体和克制背景建立统一识别',
      compositionStrategy: ['单一主焦点', '保留呼吸区'],
      colorRelationship: ['主色占比稳定，强调色小面积出现'],
      materialAndLighting: ['自然材质，柔和侧光'],
      typographyRelationship: ['标题与正文建立明确层级'],
      informationHierarchy: ['品牌优先，产品信息第二'],
    },
    preserve: { identity: ['品牌名与 Logo'], visualAssets: [], structures: [] },
    mustChange: {
      composition: ['消除平均排布'],
      graphicLanguage: ['建立可延展图形节奏'],
      hierarchy: ['强化主次'],
      material: ['避免廉价塑料感'],
      photography: ['统一摄影角度'],
    },
    prohibitedCarryover: ['参考品牌 Logo', '参考品牌专属纹样'],
    warnings: [],
    generatedAt: '2026-07-28T00:00:00.000Z',
  };
}

for (const [projectId, anchor] of [
  ['jiuzhou-meixue', '东方美学与现代专业感并置'],
  ['feng-tang-tang', '温暖烟火气与克制秩序并存'],
  ['illustration-demo', '轻盈叙事插画与模块化图形语言'],
]) {
  test(`Style Profile deterministic compiler: ${projectId}`, () => {
    const input = { creativeDecision: transformation(projectId, anchor), id: `style-${projectId}`, version: '1.0.0' };
    const first = compileStyleProfile(input, '2026-07-28T01:00:00.000Z');
    const second = compileStyleProfile(input, '2026-07-28T01:00:00.000Z');
    assert.deepEqual(first, second);
    assert.equal(first.projectId, projectId);
    assert.match(first.styleEssence.visualPositioning, new RegExp(anchor));
    assert.ok(first.promptComponents.required.length > 0);
    assert.doesNotThrow(() => validateStyleProfile(first));
  });
}

test('Style Profile validation rejects positive/forbidden conflicts', () => {
  const profile = compileStyleProfile({
    creativeDecision: transformation('p', '统一视觉方向'),
    version: '1.0.0',
  });
  assert.throws(
    () => validateStyleProfile({
      ...profile,
      forbiddenVariations: [...profile.forbiddenVariations, profile.promptComponents.required[0]],
    }),
    (error) => error.code === 'STYLE_PROFILE_INVALID',
  );
});

test('Style Profile semantic versions advance predictably and schema is closed', () => {
  assert.equal(nextStyleProfileVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(nextStyleProfileVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(nextStyleProfileVersion('1.2.3', 'major'), '2.0.0');
  const schema = JSON.parse(fs.readFileSync(
    path.resolve('schemas/creative-production/style-profile.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.version.pattern, '^[0-9]+\\.[0-9]+\\.[0-9]+$');
});
