#!/usr/bin/env node
/**
 * Lab: reference-style-conversion
 * 实验性参考风格转译（原 src/reference-translation）。
 * 本 Lab 与正式产品完全隔离：不进入 Electron UI / IPC / 打包。
 *
 * 用法:
 *   node labs/reference-style-conversion/bin/run.mjs \
 *     --visual-analysis <visual-analysis.json> \
 *     --project-context <project-context.json> \
 *     --output <profile.json> [--preference <text>] [--force]
 */
import { runReferenceTranslation } from '../src/run-reference-translation.js';

function parse(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (key === '--force') {
      options.force = true;
      continue;
    }
    if (!['--visual-analysis', '--project-context', '--output', '--preference'].includes(key)) {
      throw new Error(`未知参数：${key}`);
    }
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`${key} 缺少参数值`);
    options[{
      '--visual-analysis': 'visualAnalysisPath',
      '--project-context': 'projectContextPath',
      '--output': 'outputPath',
      '--preference': 'preference'
    }[key]] = value;
  }
  return options;
}

try {
  const result = await runReferenceTranslation(parse(process.argv.slice(2)));
  console.log(`Reference Translation：${result.run.cache_hit ? '复用缓存' : '已完成'}`);
  console.log(`输出：${result.outputPath}`);
  console.log(`运行记录：${result.runPath}`);
  console.log(`参考完整度：${result.profile.referenceIdentity.completeness}`);
  console.log(`转译矩阵：${result.profile.projectTranslationMatrix.length} 项`);
} catch (error) {
  console.error(`Reference Translation 失败：${error.message}`);
  process.exitCode = 1;
}
