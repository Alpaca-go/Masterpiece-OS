// Production Chain Anchor Fallback Smoke Test
// 使用生产链路验证当物理 Anchor 文件缺失时，anchorDerivedSignals fallback 是否生效
// 需要环境变量:
//   SEEDREAM_API_KEY = API Key（如果未设置，将使用硬编码的测试 Key）
//   SEEDREAM_BASE_URL = API Base URL (默认 https://ark.cn-beijing.volces.com/api/v3)
//   SEEDREAM_MODEL_ID = Model ID (默认 doubao-seedream-5-0-pro-260628)
//   OUTPUT_DIR = 输出目录 (默认 ./docs/reference/anchor-fallback-test)

import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
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

// 环境变量
const apiKey = process.env.SEEDREAM_API_KEY || '<SEEDREAM_API_KEY_REDACTED>';
const baseUrl = process.env.SEEDREAM_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const modelId = process.env.SEEDREAM_MODEL_ID || 'doubao-seedream-5-0-pro-260628';
const outputDir = process.env.OUTPUT_DIR || path.join(repoRoot, 'docs', 'reference', 'anchor-fallback-test');
const anchorImagePath = process.env.ANCHOR_IMAGE_PATH || path.join(repoRoot, 'space-generator', 'v1-experimental', 'architecture-anchors', 'jiuzhou-aesthetics', 'JZMX-ARCH-01.png');

if (!apiKey) {
  console.error('错误: 未找到 API Key');
  process.exit(1);
}

// 创建输出目录
mkdirSync(outputDir, { recursive: true });

console.log('=== Production Chain Anchor Fallback Smoke Test ===\n');
console.log(`Project Canon: ${canonPath}`);
console.log(`Anchor Image: ${anchorImagePath}`);
console.log(`Output Dir: ${outputDir}`);

// ========== Step 1: 模拟 anchor 选择（物理文件缺失场景）==========
console.log('\n--- Step 1: 模拟 anchor 选择（物理文件缺失）---');

const mockSelectionMissing = {
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

// 生成 fallback 信号
const fallbackSignals = anchorSignalsFromSelection(mockSelectionMissing, projectCanon);
console.log('Fallback signals metadata:', fallbackSignals.__metadata);
console.log('Source:', fallbackSignals.__metadata?.source);
console.log('Physical anchor used:', fallbackSignals.__metadata?.physicalAnchorUsed);
console.log('Canon fallback used:', fallbackSignals.__metadata?.canonFallbackUsed);

// ========== Step 2: 使用生产链路编译 prompt ==========
console.log('\n--- Step 2: 使用生产链路编译 prompt ---');

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

// 生成最终 prompt
const finalPrompt = compiledContext.promptSections.join('\n\n');
console.log(`Prompt 长度: ${finalPrompt.length} 字符`);
console.log(`Prompt sections: ${compiledContext.promptSections.length} 个块`);
console.log(`Provenance 条目: ${compiledContext.provenance?.length || 0}`);

// 检查 provenance 中是否有 fallback 标记
const hasFallbackProvenance = compiledContext.provenance?.some(p => p.source === 'canon_dna_fallback');
console.log(`包含 canon_dna_fallback provenance: ${hasFallbackProvenance}`);

// 保存 prompt
const promptPath = path.join(outputDir, 'anchor-fallback-prompt.md');
writeFileSync(promptPath, finalPrompt, 'utf-8');
console.log(`Prompt 已保存: ${promptPath}`);

// ========== Step 3: 调用 Seedream API 生成图片 ==========
console.log('\n--- Step 3: 调用 Seedream API 生成图片 ---');

async function callSeedreamApi(prompt, referenceImagePath) {
  const images = [];
  
  // 如果提供了参考图片，则读取并转换为 base64
  if (referenceImagePath && existsSync(referenceImagePath)) {
    console.log(`读取参考图片: ${referenceImagePath}`);
    const imageData = readFileSync(referenceImagePath);
    const base64Data = imageData.toString('base64');
    const dataUri = `data:image/png;base64,${base64Data}`;
    images.push(dataUri);
  }

  const requestBody = {
    model: modelId,
    prompt: prompt,
    ...(images.length ? { image: images } : {}),
    size: '2K',
    response_format: 'b64_json',
    watermark: false,
  };

  const endpoint = `${baseUrl}/images/generations`;
  console.log(`请求端点: ${endpoint}`);
  console.log(`模型: ${modelId}`);
  console.log(`参考图片数量: ${images.length}`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API 请求失败: ${response.status} ${errorText}`);
  }

  const responseData = await response.json();
  return responseData;
}

async function saveGeneratedImage(responseData, outputPath) {
  if (!responseData?.data?.length) {
    throw new Error('API 响应中没有图片数据');
  }

  const imageData = responseData.data[0];
  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    writeFileSync(outputPath, buffer);
    return buffer.length;
  } else if (imageData.url) {
    const imageResponse = await fetch(imageData.url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    writeFileSync(outputPath, imageBuffer);
    return imageBuffer.length;
  }

  throw new Error('无法解析图片数据');
}

// 测试 1: 仅使用 anchor fallback（不传参考图片）
console.log('\n--- Test 1: 仅使用 anchor fallback（不传参考图片）---');
const test1OutputPath = path.join(outputDir, 'anchor-fallback-only.jpg');
try {
  const startTime1 = Date.now();
  const response1 = await callSeedreamApi(finalPrompt, null);
  const imageSize1 = await saveGeneratedImage(response1, test1OutputPath);
  const duration1 = (Date.now() - startTime1) / 1000;
  console.log(`Test 1 完成: ${imageSize1} bytes, 耗时 ${duration1.toFixed(1)}s`);
  console.log(`图片已保存: ${test1OutputPath}`);
} catch (error) {
  console.error(`Test 1 失败: ${error.message}`);
}

// 测试 2: 使用 anchor fallback + 参考图片
console.log('\n--- Test 2: 使用 anchor fallback + 参考图片 ---');
const test2OutputPath = path.join(outputDir, 'anchor-fallback-with-reference.jpg');
try {
  const startTime2 = Date.now();
  const response2 = await callSeedreamApi(finalPrompt, anchorImagePath);
  const imageSize2 = await saveGeneratedImage(response2, test2OutputPath);
  const duration2 = (Date.now() - startTime2) / 1000;
  console.log(`Test 2 完成: ${imageSize2} bytes, 耗时 ${duration2.toFixed(1)}s`);
  console.log(`图片已保存: ${test2OutputPath}`);
} catch (error) {
  console.error(`Test 2 失败: ${error.message}`);
}

// ========== Step 4: 验证生成的图片是否包含 anchor 美学特征 ==========
console.log('\n--- Step 4: 验证报告 ---');

const verificationReport = {
  timestamp: new Date().toISOString(),
  productionChain: true,
  anchorFallback: {
    physicalFileMissing: true,
    source: fallbackSignals.__metadata?.source,
    dimensions: Object.keys(fallbackSignals).filter(k => k !== '__metadata'),
  },
  promptCompilation: {
    provider: 'compileSpatialContext',
    hasFallbackProvenance,
    promptLength: finalPrompt.length,
    sectionCount: compiledContext.promptSections.length,
  },
  tests: []
};

// 检查生成的图片
for (const test of [
  { name: 'anchor-fallback-only', path: test1OutputPath },
  { name: 'anchor-fallback-with-reference', path: test2OutputPath },
]) {
  if (existsSync(test.path)) {
    const fileStats = statSync(test.path);
    verificationReport.tests.push({
      name: test.name,
      status: 'succeeded',
      fileSize: fileStats.size,
    });
    console.log(`✓ ${test.name}: ${fileStats.size} bytes`);
  } else {
    verificationReport.tests.push({
      name: test.name,
      status: 'failed',
      fileSize: 0,
    });
    console.log(`✗ ${test.name}: 文件不存在`);
  }
}

// 保存验证报告
const reportPath = path.join(outputDir, 'anchor-fallback-verification-report.json');
writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2), 'utf-8');
console.log(`\n验证报告已保存: ${reportPath}`);

console.log('\n=== Production Chain Anchor Fallback Smoke Test Complete ===');
console.log('\n请人工检查生成的图片，验证是否还原了 anchor image 的美学特征：');
console.log('  1. 珍珠白连续性墙面');
console.log('  2. 柔和间接暖光 + 微妙淡紫色点缀');
console.log('  3. 柔和曲线与集成曲率');
console.log('  4. 低调、克制的装饰密度');
