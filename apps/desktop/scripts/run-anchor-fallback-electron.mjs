// Electron-based smoke test for anchor fallback with real API
// Run from apps/desktop directory: node scripts/run-anchor-fallback-electron.mjs

import electron from 'electron';
const { app, safeStorage } = electron;
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROFILE_ID = 'profile-0d48c72e-1288-436f-a450-c84c5b8298ca';
const OUTPUT_DIR = 'E:\\Masterpiece-OS\\docs\\reference\\anchor-fallback-test';
const ANCHOR_IMAGE_PATH = 'E:\\Masterpiece-OS\\space-generator\\v1-experimental\\architecture-anchors\\jiuzhou-aesthetics\\JZMX-ARCH-01.png';

// 初始化 Electron 环境
app.setPath('userData', path.resolve(process.env.APPDATA || '', 'masterpiece-os-desktop'));
app.setAppPath(path.resolve(process.cwd()));

// 加载生产链路模块
const repoRoot = path.resolve(__dirname, '..', '..');
const anchorLoaderPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/anchor-loader.js');
const contextCompilerPath = path.join(repoRoot, 'packages/image-generation-runtime/src/spatial/context-compiler.js');
const canonPath = path.join(repoRoot, 'packages/image-generation-runtime/config/spatial/projects/jiuzhou-aesthetics/project-visual-canon-v2.json');

const { anchorSignalsFromSelection } = await import(`file://${anchorLoaderPath.replace(/\\/g, '/')}`);
const { compileSpatialContext } = await import(`file://${contextCompilerPath.replace(/\\/g, '/')}`);

// 加载 project-visual-canon
const projectCanon = JSON.parse(fs.readFileSync(canonPath, 'utf-8'));

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callSeedreamApi(apiKey, prompt, referenceImages = []) {
  const baseUrl = 'https://ark.cn-beijing.volces.com/api/v3';
  const modelId = 'doubao-seedream-5-0-pro-260628';

  const requestBody = {
    model: modelId,
    prompt: prompt,
    ...(referenceImages.length ? { image: referenceImages } : {}),
    size: '2K',
    response_format: 'b64_json',
    watermark: false,
  };

  const endpoint = `${baseUrl}/images/generations`;
  console.log(`请求端点: ${endpoint}`);
  console.log(`模型: ${modelId}`);
  console.log(`参考图片数量: ${referenceImages.length}`);

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

  return response.json();
}

async function saveGeneratedImage(responseData, outputPath) {
  if (!responseData?.data?.length) {
    throw new Error('API 响应中没有图片数据');
  }

  const imageData = responseData.data[0];
  if (imageData.b64_json) {
    const buffer = Buffer.from(imageData.b64_json, 'base64');
    fs.writeFileSync(outputPath, buffer);
    return buffer.length;
  } else if (imageData.url) {
    const imageResponse = await fetch(imageData.url);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    fs.writeFileSync(outputPath, imageBuffer);
    return imageBuffer.length;
  }

  throw new Error('无法解析图片数据');
}

async function main() {
  try {
    // Step 0: 解密 API Key
    console.log('--- Step 0: 解密 Seedream API Key ---');
    
    // 检查加密是否可用
    if (!await safeStorage.isAsyncEncryptionAvailable()) {
      console.error('系统安全凭据服务不可用');
      process.exit(1);
    }
    
    const credentialsDir = path.join(app.getPath('userData'), 'credentials');
    const credentialPath = path.join(credentialsDir, `${PROFILE_ID}.bin`);
    
    if (!fs.existsSync(credentialPath)) {
      console.error(`凭据文件不存在: ${credentialPath}`);
      process.exit(1);
    }

    const encrypted = await fsPromises.readFile(credentialPath);
    const decrypted = await safeStorage.decryptStringAsync(encrypted);
    const apiKey = decrypted.result;
    
    if (!apiKey) {
      console.error('API Key 解密失败');
      process.exit(1);
    }
    
    console.log(`API Key 解密成功 (长度: ${apiKey.length})`);

    // 创建输出目录
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log('\n=== Production Chain Anchor Fallback Smoke Test (Electron) ===\n');

    // ========== Step 1: 模拟 anchor 选择（物理文件缺失场景）==========
    console.log('\n--- Step 1: 模拟 anchor 选择（物理文件缺失）---');

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
      fileMissing: true,
      fileMissingCount: 1,
    };

    const fallbackSignals = anchorSignalsFromSelection(mockSelectionMissing, projectCanon);
    console.log('Fallback signals metadata:', fallbackSignals.__metadata);
    console.log('Source:', fallbackSignals.__metadata?.source);

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

    const finalPrompt = compiledContext.promptSections.join('\n\n');
    console.log(`Prompt 长度: ${finalPrompt.length} 字符`);
    console.log(`Prompt sections: ${compiledContext.promptSections.length} 个块`);

    // 保存 prompt
    const promptPath = path.join(OUTPUT_DIR, 'anchor-fallback-prompt.md');
    fs.writeFileSync(promptPath, finalPrompt, 'utf-8');
    console.log(`Prompt 已保存: ${promptPath}`);

    // ========== Step 3: 测试 1 - 仅使用 anchor fallback ==========
    console.log('\n--- Step 3: Test 1 - 仅使用 anchor fallback ---');
    
    const test1OutputPath = path.join(OUTPUT_DIR, 'anchor-fallback-only.jpg');
    try {
      const startTime1 = Date.now();
      const response1 = await callSeedreamApi(apiKey, finalPrompt, []);
      const imageSize1 = await saveGeneratedImage(response1, test1OutputPath);
      const duration1 = (Date.now() - startTime1) / 1000;
      console.log(`Test 1 完成: ${imageSize1} bytes, 耗时 ${duration1.toFixed(1)}s`);
      console.log(`图片已保存: ${test1OutputPath}`);
    } catch (error) {
      console.error(`Test 1 失败: ${error.message}`);
    }

    // 等待 2 秒再进行下一个请求，避免速率限制
    await sleep(2000);

    // ========== Step 4: 测试 2 - 使用 anchor fallback + 参考图片 ==========
    console.log('\n--- Step 4: Test 2 - 使用 anchor fallback + 参考图片 ---');
    
    const test2OutputPath = path.join(OUTPUT_DIR, 'anchor-fallback-with-reference.jpg');
    try {
      // 读取参考图片并转换为 base64
      const referenceImageData = fs.readFileSync(ANCHOR_IMAGE_PATH);
      const referenceBase64 = referenceImageData.toString('base64');
      const referenceDataUri = `data:image/png;base64,${referenceBase64}`;
      
      const startTime2 = Date.now();
      const response2 = await callSeedreamApi(apiKey, finalPrompt, [referenceDataUri]);
      const imageSize2 = await saveGeneratedImage(response2, test2OutputPath);
      const duration2 = (Date.now() - startTime2) / 1000;
      console.log(`Test 2 完成: ${imageSize2} bytes, 耗时 ${duration2.toFixed(1)}s`);
      console.log(`图片已保存: ${test2OutputPath}`);
    } catch (error) {
      console.error(`Test 2 失败: ${error.message}`);
    }

    // ========== Step 5: 生成验证报告 ==========
    console.log('\n--- Step 5: 生成验证报告 ---');

    const verificationReport = {
      timestamp: new Date().toISOString(),
      productionChain: true,
      anchorFallback: {
        physicalFileMissing: true,
        source: fallbackSignals.__metadata?.source,
        physicalAnchorUsed: fallbackSignals.__metadata?.physicalAnchorUsed,
        canonFallbackUsed: fallbackSignals.__metadata?.canonFallbackUsed,
        dimensions: Object.keys(fallbackSignals).filter(k => k !== '__metadata'),
      },
      promptCompilation: {
        provider: 'compileSpatialContext',
        promptLength: finalPrompt.length,
        sectionCount: compiledContext.promptSections.length,
      },
      tests: [],
    };

    for (const test of [
      { name: 'anchor-fallback-only', path: test1OutputPath },
      { name: 'anchor-fallback-with-reference', path: test2OutputPath },
    ]) {
      if (fs.existsSync(test.path)) {
        const fileStats = fs.statSync(test.path);
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

    const reportPath = path.join(OUTPUT_DIR, 'anchor-fallback-smoke-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(verificationReport, null, 2), 'utf-8');
    console.log(`\n验证报告已保存: ${reportPath}`);

    console.log('\n=== Production Chain Anchor Fallback Smoke Test Complete ===');
    console.log('\n请人工检查生成的图片，验证是否还原了 anchor image 的美学特征：');
    console.log('  1. 珍珠白连续性墙面');
    console.log('  2. 柔和间接暖光 + 微妙淡紫色点缀');
    console.log('  3. 柔和曲线与集成曲率');
    console.log('  4. 低调、克制的装饰密度');

  } catch (error) {
    console.error('烟雾测试失败:', error.message);
    console.error(error.stack);
  }
}

main();
