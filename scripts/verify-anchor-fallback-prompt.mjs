// Production Chain Anchor Fallback Smoke Test (Offline - Prompt Only)
// 使用生产链路验证当物理 Anchor 文件缺失时，anchorDerivedSignals fallback 是否生效
// 仅生成 prompt，不调用 Provider API

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// 加载生产链路模块
const anchorLoaderPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/anchor-loader.js');
const contextCompilerPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/context-compiler.js');

const { anchorSignalsFromSelection } = await import(`file://${anchorLoaderPath.replace(/\\/g, '/')}`);
const { compileSpatialContext } = await import(`file://${contextCompilerPath.replace(/\\/g, '/')}`);

// 加载 project-visual-canon
const canonPath = path.join(repoRoot, 'packages/image-generation-runtime/config/spatial/projects/jiuzhou-aesthetics/project-visual-canon-v2.json');
const projectCanon = JSON.parse(readFileSync(canonPath, 'utf-8'));

// 输出目录
const outputDir = path.join(repoRoot, 'docs', 'reference', 'anchor-fallback-test');
mkdirSync(outputDir, { recursive: true });

console.log('=== Production Chain Anchor Fallback Smoke Test (Offline) ===\n');

// ========== 测试 1: 物理文件缺失场景 ==========
console.log('--- Test 1: 物理文件缺失 → Canon Fallback ---');

const mockSelectionMissing = {
  projectId: 'jiuzhou-aesthetics',
  spaceType: 'reception',
  anchors: [
    {
      id: 'JZMX-SGR-02-Reception',
      role: 'reception',
      applicableSpaceTypes: ['reception', 'lobby'],
      allowedRoles: ['brand_atmosphere', 'brand_integration', 'material_and_lighting', 'color_relationship', 'architectural_skin', 'decorative_density', 'reception_expression'],
      influenceCaps: {
        brand_atmosphere: 0.95,
        brand_integration: 0.95,
        material_and_lighting: 0.9,
        color_relationship: 0.85,
        architectural_skin: 0.75,
        decorative_density: 0.8,
        reception_expression: 0.85,
      },
      fileMissing: true,
    },
  ],
};

const fallbackSignals = anchorSignalsFromSelection(mockSelectionMissing, projectCanon);
console.log('Metadata:', fallbackSignals.__metadata);
console.log('Source:', fallbackSignals.__metadata?.source);
console.log('Expected: canon_dna_fallback');
console.log('Test 1 PASSED:', fallbackSignals.__metadata?.source === 'canon_dna_fallback');

// ========== 测试 2: 编译 prompt ==========
console.log('\n--- Test 2: 编译包含 fallback 信号的 prompt ---');

const mockTask = {
  sceneRole: 'reception',
  subtype: 'reception',
  aspectRatio: '16:9',
  referenceAssetIds: [],
  shot: 'human_eye_level',
};

const mockSpatialFoundation = {
  spaceType: 'reception',
  atmosphereIntent: 'serene warm_professional refined_feminine low_noise',
  architectureAesthetic: 'soft_continuous_curves, pearl_white_surfaces, minimal_ornament',
  spatialScale: 'medium, flagship_clinic_reception',
  functionalZoning: 'reception_desk, waiting_area, brand_wall, consultation_guidance',
  circulation: 'guided_flow, open_visibility',
  cameraIntent: { role: 'human_eye_level', lens: '35mm_to_50mm' },
};

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

const compiledContext = compileSpatialContext({
  task: mockTask,
  spatialFoundation: mockSpatialFoundation,
  projectCanon,
  anchorSignals: fallbackSignals,
  anchorManifest: mockManifest,
});

const finalPrompt = compiledContext.promptSections.join('\n\n');
console.log('Prompt 长度:', finalPrompt.length, '字符');
console.log('Prompt sections:', compiledContext.promptSections.length, '个块');

// 检查 provenance 中是否有 fallback 标记
const hasFallbackProvenance = compiledContext.provenance?.some(p => p.source === 'canon_dna_fallback');
console.log('包含 canon_dna_fallback provenance:', hasFallbackProvenance);
console.log('Test 2 PASSED:', hasFallbackProvenance);

// ========== 测试 3: 检查 prompt 内容是否包含 anchor 美学特征 ==========
console.log('\n--- Test 3: 检查 prompt 中的 anchor 美学特征 ---');

const aestheticChecks = [
  { keyword: 'pearl_white', label: '珍珠白表面' },
  { keyword: 'warm_professional', label: '温暖专业气质' },
  { keyword: 'low_noise', label: '低噪音环境' },
  { keyword: 'soft_indirect_warm_neutral', label: '柔和间接暖光' },
  { keyword: 'lavender', label: '淡紫色点缀' },
  { keyword: 'soft_and_integrated', label: '柔和集成曲率' },
  { keyword: 'minimal_ornament', label: '极简装饰' },
  { keyword: 'controlled', label: '受控装饰密度' },
];

const results = [];
for (const check of aestheticChecks) {
  const found = finalPrompt.toLowerCase().includes(check.keyword.toLowerCase());
  results.push({ keyword: check.keyword, label: check.label, found });
  console.log(`  ${check.label} (${check.keyword}): ${found ? '✓ 找到' : '✗ 未找到'}`);
}

const allAestheticFound = results.every(r => r.found);
console.log('Test 3 PASSED:', allAestheticFound);

// ========== 测试 4: 验证 GOLDEN ANCHOR CALIBRATION 包含实际美学值 ==========
console.log('\n--- Test 4: 验证 GOLDEN ANCHOR CALIBRATION 包含实际美学值 ---');

// 从 project-visual-canon 加载的 anchorDerivedSignals 中提取预期值
const expectedAestheticValues = {
  brand_atmosphere: 'serene warm_professional refined_feminine low_noise',
  brand_integration: 'architecturally_integrated controlled_logo wall_mounted_subtle_relief',
  material_and_lighting: 'pearl_white_continuous_walls soft_indirect_warm_neutral gentle_accent_lavender',
  color_relationship: 'pearl_white_dominant mineral_lavender_accent graphite_text silver_metal',
  architectural_skin: 'soft_and_integrated curvature low_visual_joints low_ornament minimal_metal_lines',
  decorative_density: 'controlled restrained feather_petals_small_scale sparse_crystals decoration_must_not_dominate',
  reception_expression: 'soft_continuous_service_interface pale_mineral_matte_front_desk warm_but_not_hotel_like',
};

const goldenAnchorSection = compiledContext.promptSections.find(s => s.includes('[GOLDEN ANCHOR CALIBRATION]'));
const hasActualValues = goldenAnchorSection && 
  Object.entries(expectedAestheticValues).every(([key, expectedValue]) => 
    goldenAnchorSection.includes(expectedValue.replace(/_/g, ' ').substring(0, 20))
  );

console.log('GOLDEN ANCHOR CALIBRATION section exists:', !!goldenAnchorSection);

// 检查每个维度是否包含实际美学值
const valueChecks = [];
for (const [key, expectedValue] of Object.entries(expectedAestheticValues)) {
  const found = goldenAnchorSection && goldenAnchorSection.includes(expectedValue);
  valueChecks.push({ key, expectedValue, found });
  console.log(`  ${key}: ${found ? '✓ 包含实际美学值' : '✗ 仅包含校准指令'}`);
}

const allValuesIncluded = valueChecks.every(c => c.found);
console.log('Test 4 PASSED:', allValuesIncluded);

// ========== 测试 5: 检查 promptSections 结构 ==========
console.log('\n--- Test 5: 检查 promptSections 结构 ---');

const sectionSummary = [];
for (const section of compiledContext.promptSections) {
  const firstLine = section.split('\n')[0].substring(0, 60);
  sectionSummary.push(firstLine);
}
console.log('Prompt sections:');
for (const summary of sectionSummary) {
  console.log(`  - ${summary}`);
}

// ========== 保存结果 ==========
console.log('\n--- 保存结果 ---');

// 保存 prompt
const promptPath = path.join(outputDir, 'anchor-fallback-prompt.md');
writeFileSync(promptPath, finalPrompt, 'utf-8');
console.log('Prompt 已保存:', promptPath);

// 保存验证报告
const verificationReport = {
  timestamp: new Date().toISOString(),
  testType: 'production_chain_anchor_fallback',
  anchorFallback: {
    physicalFileMissing: true,
    source: fallbackSignals.__metadata?.source,
    physicalAnchorUsed: fallbackSignals.__metadata?.physicalAnchorUsed,
    canonFallbackUsed: fallbackSignals.__metadata?.canonFallbackUsed,
    dimensions: Object.keys(fallbackSignals).filter(k => k !== '__metadata'),
  },
  promptCompilation: {
    provider: 'compileSpatialContext',
    hasFallbackProvenance,
    promptLength: finalPrompt.length,
    sectionCount: compiledContext.promptSections.length,
  },
  aestheticVerification: results,
  allAestheticFound,
  provenanceSummary: compiledContext.provenance?.map(p => p.source).filter((v, i, a) => a.indexOf(v) === i) || [],
};

const reportPath = path.join(outputDir, 'anchor-fallback-verification-report.json');
writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2), 'utf-8');
console.log('验证报告已保存:', reportPath);

// ========== 总结 ==========
console.log('\n=== Summary ===');
const allTestsPassed = 
  fallbackSignals.__metadata?.source === 'canon_dna_fallback' &&
  hasFallbackProvenance &&
  allAestheticFound &&
  allValuesIncluded;

console.log('Test 1 (Fallback source):', fallbackSignals.__metadata?.source === 'canon_dna_fallback' ? '✓ PASS' : '✗ FAIL');
console.log('Test 2 (Fallback provenance):', hasFallbackProvenance ? '✓ PASS' : '✗ FAIL');
console.log('Test 3 (Aesthetic features):', allAestheticFound ? '✓ PASS' : '✗ FAIL');
console.log('Test 4 (Actual values in GOLDEN ANCHOR):', allValuesIncluded ? '✓ PASS' : '✗ FAIL');
console.log('\nAll tests:', allTestsPassed ? '✓ PASSED' : '✗ FAILED');

if (allTestsPassed) {
  console.log('\n=== Anchor Fallback 机制验证成功 ===');
  console.log('生产链路的 anchor fallback 逻辑可以正确工作：');
  console.log('  1. 当物理 Anchor 文件缺失时，系统从 project-visual-canon 的 anchorDerivedSignals 中 fallback');
  console.log('  2. Fallback 信号被正确注入到 compileSpatialContext 中');
  console.log('  3. 生成的 prompt 包含所有 7 个维度的美学特征');
  console.log('\n下一步: 运行完整的烟雾测试 (需要 API Key)');
  console.log('  $env:SEEDREAM_API_KEY = "your-api-key"; node scripts/run-anchor-fallback-smoke.mjs');
} else {
  console.log('\n=== 部分测试失败 ===');
  process.exit(1);
}
