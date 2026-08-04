// Anchor Fallback Verification Script
// 验证当物理 Anchor 文件缺失时，是否能从 project-visual-canon 的 anchorDerivedSignals 中 fallback
// 这是一个离线验证脚本，不调用真实 Provider

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// 加载 anchor-loader 和 context-compiler
const anchorLoaderPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/anchor-loader.js');
const contextCompilerPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/context-compiler.js');

const { anchorSignalsFromSelection, buildAnchorSignalsFromCanon } = await import(`file://${anchorLoaderPath.replace(/\\/g, '/')}`);
const { compileSpatialContext, resolveAnchorInfluence } = await import(`file://${contextCompilerPath.replace(/\\/g, '/')}`);

// 加载 project-visual-canon
const canonPath = path.join(repoRoot, 'packages/image-generation-runtime/config/spatial/projects/jiuzhou-aesthetics/project-visual-canon-v2.json');
const projectCanon = JSON.parse(readFileSync(canonPath, 'utf-8'));

console.log('=== Anchor Fallback Verification ===\n');
console.log(`Project Canon version: ${projectCanon.version}`);
console.log(`Has anchorDerivedSignals: ${!!projectCanon.anchorDerivedSignals}`);
console.log(`Dimensions in anchorDerivedSignals: ${Object.keys(projectCanon.anchorDerivedSignals || {}).join(', ')}\n`);

// 模拟 anchor 选择（物理文件缺失场景）
const mockSelectionWithMissingFiles = {
  projectId: 'jiuzhou-aesthetics',
  spaceType: 'reception',
  anchors: [
    {
      id: 'JZMX-SGR-02-Reception',
      name: 'JZMX-SGR-02-Reception',
      role: 'reception',
      version: 1,
      projectId: 'jiuzhou-aesthetics',
      applicableSpaceTypes: ['reception', 'lobby', 'large_lobby'],
      allowedRoles: ['brand_atmosphere', 'brand_integration', 'material_and_lighting', 'color_relationship', 'architectural_skin', 'decorative_density', 'reception_expression'],
      deniedRoles: [],
      influenceCaps: {
        brand_atmosphere: 0.95,
        brand_integration: 0.95,
        material_and_lighting: 0.9,
        color_relationship: 0.85,
        architectural_skin: 0.75,
        decorative_density: 0.8,
        reception_expression: 0.85,
      },
      fileMissing: true, // 模拟物理文件缺失
    },
  ],
  fileMissing: true,
  fileMissingCount: 1,
};

// 模拟 anchor 选择（有物理文件场景）
const mockSelectionWithFiles = {
  projectId: 'jiuzhou-aesthetics',
  spaceType: 'reception',
  anchors: [
    {
      id: 'JZMX-SGR-02-Reception',
      name: 'JZMX-SGR-02-Reception',
      role: 'reception',
      version: 1,
      projectId: 'jiuzhou-aesthetics',
      applicableSpaceTypes: ['reception', 'lobby', 'large_lobby'],
      allowedRoles: ['brand_atmosphere', 'brand_integration', 'material_and_lighting', 'color_relationship', 'architectural_skin', 'decorative_density', 'reception_expression'],
      deniedRoles: [],
      influenceCaps: {
        brand_atmosphere: 0.95,
        brand_integration: 0.95,
        material_and_lighting: 0.9,
        color_relationship: 0.85,
        architectural_skin: 0.75,
        decorative_density: 0.8,
        reception_expression: 0.85,
      },
      fileMissing: false, // 有物理文件
    },
  ],
  fileMissing: false,
  fileMissingCount: 0,
};

// 测试 1: 物理文件缺失，使用 canon fallback
console.log('--- Test 1: Physical file missing → Canon fallback ---');
const signalsFromMissing = anchorSignalsFromSelection(mockSelectionWithMissingFiles, projectCanon);
console.log('Signals keys:', Object.keys(signalsFromMissing).filter(k => k !== '__metadata').join(', '));
console.log('Metadata:', signalsFromMissing.__metadata);
console.log('Expected source: canon_dna_fallback');
console.log('Actual source:', signalsFromMissing.__metadata?.source);
console.log('Test 1 PASSED:', signalsFromMissing.__metadata?.source === 'canon_dna_fallback');

// 测试 2: 有物理文件，使用 golden anchor
console.log('\n--- Test 2: Physical file exists → Golden anchor ---');
const signalsFromFiles = anchorSignalsFromSelection(mockSelectionWithFiles, projectCanon);
console.log('Signals keys:', Object.keys(signalsFromFiles).filter(k => k !== '__metadata').join(', '));
console.log('Metadata:', signalsFromFiles.__metadata);
console.log('Expected source: golden_anchor');
console.log('Actual source:', signalsFromFiles.__metadata?.source);
console.log('Test 2 PASSED:', signalsFromFiles.__metadata?.source === 'golden_anchor');

// 测试 3: 验证 fallback 信号是否包含正确的美学信息
console.log('\n--- Test 3: Verify fallback signals contain correct aesthetics ---');
const expectedDimensions = [
  'brandAtmosphere',
  'brandIntegration',
  'materialAndLighting',
  'colorRelationship',
  'architecturalSkin',
  'decorativeDensity',
  'receptionExpression',
];
const actualDimensions = Object.keys(signalsFromMissing).filter(k => k !== '__metadata');
const allDimensionsPresent = expectedDimensions.every(d => actualDimensions.includes(d));
console.log('Expected dimensions:', expectedDimensions.join(', '));
console.log('Actual dimensions:', actualDimensions.join(', '));
console.log('All dimensions present:', allDimensionsPresent);

// 检查具体的信号值
for (const [dim, values] of Object.entries(signalsFromMissing)) {
  if (dim === '__metadata') continue;
  console.log(`  ${dim}: ${values[0]?.substring(0, 80)}...`);
}
console.log('Test 3 PASSED:', allDimensionsPresent);

// 测试 4: 验证 resolveAnchorInfluence 正确处理 fallback 信号
console.log('\n--- Test 4: Verify resolveAnchorInfluence with fallback signals ---');
const mockManifest = {
  projectId: 'jiuzhou-aesthetics',
  influenceCaps: {
    brandAtmosphere: 0.95,
    brandIntegration: 0.95,
    materialAndLighting: 0.9,
    colorRelationship: 0.85,
    architecturalSkin: 0.75,
    decorativeDensity: 0.8,
    receptionExpression: 0.85,
  },
  forbiddenOverrides: [],
};

const mockFoundation = {
  preservation: {},
};

const influenceResult = resolveAnchorInfluence({
  anchorSignals: signalsFromMissing,
  manifest: mockManifest,
  foundation: mockFoundation,
});

console.log('Accepted dimensions:', Object.keys(influenceResult.accepted).join(', '));
console.log('Conflicts:', influenceResult.conflicts.length);
console.log('Provenance entries:', influenceResult.provenance.length);

// 检查 provenance 中的 source 是否正确
const provenanceSources = [...new Set(influenceResult.provenance.map(p => p.source))];
console.log('Provenance sources:', provenanceSources);
console.log('Expected: canon_dna_fallback');
console.log('Test 4 PASSED:', provenanceSources.includes('canon_dna_fallback'));

// 测试 5: 验证 buildAnchorSignalsFromCanon 辅助函数
console.log('\n--- Test 5: Verify buildAnchorSignalsFromCanon ---');
const canonSignals = buildAnchorSignalsFromCanon(projectCanon);
console.log('Canon signals keys:', Object.keys(canonSignals).join(', '));
console.log('Test 5 PASSED:', Object.keys(canonSignals).length > 0);

// 测试 6: 验证 compileSpatialContext 在 fallback 场景下的行为
console.log('\n--- Test 6: Verify compileSpatialContext with fallback ---');
const mockTask = {
  sceneRole: 'reception',
  subtype: 'reception',
  referenceAssetIds: [],
};

const mockSpatialFoundation = {
  atmosphereIntent: 'test',
  architectureAesthetic: 'test',
  spatialScale: 'test',
  functionalZoning: 'test',
  cameraIntent: { role: 'test' },
};

const compiledContext = compileSpatialContext({
  task: mockTask,
  spatialFoundation: mockSpatialFoundation,
  projectCanon,
  anchorSignals: signalsFromMissing,
  anchorManifest: mockManifest,
});

console.log('Compiled context keys:', Object.keys(compiledContext).join(', '));
if (compiledContext.provenance) {
  console.log('Provenance:', JSON.stringify(compiledContext.provenance.slice(0, 3)));
}
console.log('Test 6 PASSED:', !!compiledContext);

// 总结
console.log('\n=== Summary ===');
const allTestsPassed = 
  signalsFromMissing.__metadata?.source === 'canon_dna_fallback' &&
  signalsFromFiles.__metadata?.source === 'golden_anchor' &&
  allDimensionsPresent &&
  provenanceSources.includes('canon_dna_fallback') &&
  Object.keys(canonSignals).length > 0 &&
  !!compiledContext;

console.log('All tests PASSED:', allTestsPassed);
console.log('\n=== Anchor Fallback Verification Complete ===');

process.exit(allTestsPassed ? 0 : 1);
