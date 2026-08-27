import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CREATIVE_RESEARCH_ADAPTER_NAMES,
  CREATIVE_RESEARCH_PORT_NAMES,
} from '@masterpiece/runtime-core/application/creative-research/index.ts';
import { classifyCreativeResearchImport } from '../../scripts/verify-production-boundaries.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const foundationRoot = path.join(root, 'packages', 'runtime-core', 'src', 'application', 'creative-research');

test('Creative Research declares the bounded repository, search and authority adapter surfaces', () => {
  assert.deepEqual(CREATIVE_RESEARCH_PORT_NAMES, [
    'CreativeResearchSessionRepository',
    'DesignBriefRepository',
    'SearchHistoryRepository',
    'ReferenceResearchRepository',
    'PreferenceEvidenceRepository',
    'DirectionBoardRepository',
    'ReferenceSearchGateway',
  ]);
  assert.deepEqual(CREATIVE_RESEARCH_ADAPTER_NAMES, [
    'DocumentIntakeAdapter',
    'ProjectBriefLinkAdapter',
    'AnalysisModelAdapter',
    'UserReferenceAdapter',
    'WebReferenceImportAdapter',
    'ExplorationGenerationAdapter',
    'ReferenceFirstHandoffAdapter',
  ]);
});

test('existing production boundary guard isolates Creative Research from external runtimes', () => {
  const source = path.join(foundationRoot, 'ports.ts');
  assert.equal(classifyCreativeResearchImport(source, './contracts.ts'), null);
  assert.equal(classifyCreativeResearchImport(source, '@masterpiece/image-generation-runtime/space/compiler'), 'external runtime or provider dependency');
  assert.equal(classifyCreativeResearchImport(source, '../packaging/workspace-service.js'), 'dependency outside Creative Research foundation');
  assert.equal(classifyCreativeResearchImport(source, 'node:fs'), 'external runtime or provider dependency');
});

test('foundation contains no provider implementation, network call or filesystem persistence', () => {
  const files = fs.readdirSync(foundationRoot).filter((name) => /\.(?:ts|js)$/u.test(name));
  const source = files.map((name) => fs.readFileSync(path.join(foundationRoot, name), 'utf8')).join('\n');
  assert.doesNotMatch(source, /\bfetch\s*\(/u);
  assert.doesNotMatch(source, /\b(?:google|bing|pinterest|behance)\.(?:com|cn)\b/iu);
  assert.doesNotMatch(source, /from\s+['"](?:node:)?fs(?:\/promises)?['"]/u);
  assert.doesNotMatch(source, /packages[\\/]image-generation-runtime|application[\\/]packaging|apps[\\/]web|apps[\\/]desktop/iu);
});
