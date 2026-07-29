import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  compileCreativeDecision,
  compileCreativeDecisionMarkdown,
  validateCreativeDecision,
} from '../packages/creative-production-runtime/src/creative-decision.js';

function direction() {
  return {
    id: 'direction-1',
    projectId: 'project-1',
    version: '1.0.0',
    brandReposition: 'Move from generic retail to a tactile craft brand.',
    projectTransformation: 'Create a recognizable system across every touchpoint.',
    designStrategy: 'Use a restrained modular grid and one strong material contrast.',
    primaryConcept: 'Material rhythm',
    visualWorld: 'Quiet, tactile and precise.',
    visualMechanism: 'A repeatable cut-and-fold graphic rhythm.',
    oldVisualProblems: ['The current hierarchy is fragmented.'],
    keepAssets: ['Existing logo', 'Product category cues'],
    removeAssets: ['Generic decorative patterns'],
    generationRules: ['Do not reproduce the old layout.'],
    colorStrategy: 'Warm white, charcoal and one copper accent.',
    materialStrategy: 'Uncoated paper, brushed metal and translucent film.',
    compositionStrategy: 'One dominant subject on an asymmetric modular grid.',
    visualKeywords: ['tactile', 'precise'],
    visualDirections: [
      {
        name: 'Material rhythm',
        summary: 'A tactile system led by material contrast.',
        rationale: 'Best balances recognition and a clear commercial upgrade.',
        recommended: true,
      },
      {
        name: 'Graphic pulse',
        summary: 'A more expressive typographic system.',
        rationale: 'Useful for campaign-led executions.',
        recommended: false,
      },
    ],
    generatedAt: '2026-07-29T00:00:00.000Z',
  };
}

test('Creative Decision compiles the required v1 interface from Creative Direction', () => {
  const decision = compileCreativeDecision(direction());
  assert.equal(validateCreativeDecision(decision), decision);
  assert.equal(decision.schema_version, '1.0');
  assert.equal(decision.visual_direction.recommended, 'Material rhythm');
  assert.equal(decision.visual_direction.alternatives.length, 1);
  for (const field of [
    'brand_strategy',
    'visual_direction',
    'keep_assets',
    'avoid_assets',
    'color_system',
    'material_system',
    'composition_rule',
    'generation_goal',
  ]) assert.ok(field in decision);
});

test('Creative Decision report contains every required section', () => {
  const markdown = compileCreativeDecisionMarkdown(direction());
  for (const heading of [
    '## Brand Diagnosis',
    '## Core Upgrade Strategy',
    '## Keep Assets',
    '## Remove Assets',
    '## New Visual DNA',
    '## Visual Direction',
    '## Generation Goal',
  ]) assert.match(markdown, new RegExp(heading));
});

test('Creative Decision JSON schema is closed and exposes the documented interface', () => {
  const schema = JSON.parse(fs.readFileSync(
    new URL('../schemas/creative-production/creative-decision.schema.json', import.meta.url),
    'utf8',
  ));
  assert.equal(schema.additionalProperties, false);
  for (const field of [
    'brand_strategy',
    'visual_direction',
    'keep_assets',
    'avoid_assets',
    'color_system',
    'material_system',
    'composition_rule',
    'generation_goal',
  ]) assert.ok(schema.required.includes(field));
});
