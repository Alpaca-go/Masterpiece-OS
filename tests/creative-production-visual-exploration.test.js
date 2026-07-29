import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createVisualExploration,
  updateVisualExplorationConcept,
  validateVisualExploration,
} from '../packages/creative-production-runtime/src/visual-exploration.js';

const direction = {
  id: 'direction-1',
  version: '1.0.0',
  status: 'ready',
};
const style = {
  id: 'style-1',
  version: '1.0.0',
  status: 'confirmed',
};

test('Visual Exploration creates 4–6 diverse concept directions before Canon', () => {
  const exploration = createVisualExploration({
    projectId: 'project-1',
    creativeDirection: direction,
    styleProfile: style,
    conceptCount: 5,
  }, '2026-07-29T00:00:00.000Z');
  assert.equal(validateVisualExploration(exploration), exploration);
  assert.equal(exploration.concepts.length, 5);
  assert.deepEqual(exploration.concepts.map((item) => item.type), [
    'space',
    'packaging',
    'product_scene',
    'graphic',
    'material',
  ]);
  assert.ok(exploration.concepts.every((item) => item.status === 'planned'));
  assert.equal(Object.hasOwn(exploration, 'visualCanonId'), false);
});

test('Visual Exploration reaches ready only after four or more generated concepts', () => {
  let exploration = createVisualExploration({
    projectId: 'project-1',
    creativeDirection: direction,
    styleProfile: style,
    conceptCount: 4,
  });
  for (const concept of exploration.concepts) {
    exploration = updateVisualExplorationConcept(exploration, concept.id, {
      status: 'generated',
      generationRunId: `run-${concept.index}`,
      imagePath: `image-generation/run-${concept.index}/images/image.png`,
    });
  }
  assert.equal(exploration.status, 'ready');
  assert.throws(
    () => createVisualExploration({
      projectId: 'project-1',
      creativeDirection: direction,
      styleProfile: style,
      conceptCount: 3,
    }),
    (error) => error.code === 'VISUAL_EXPLORATION_COUNT_INVALID',
  );
});

test('Visual Exploration schema is closed and defines the five concept types', () => {
  const schema = JSON.parse(fs.readFileSync(
    path.resolve('schemas/creative-production/visual-exploration.schema.json'),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.concepts.minItems, 4);
  assert.equal(schema.properties.concepts.maxItems, 6);
  assert.deepEqual(schema.properties.concepts.items.properties.type.enum, [
    'space',
    'packaging',
    'product_scene',
    'graphic',
    'material',
  ]);
});
