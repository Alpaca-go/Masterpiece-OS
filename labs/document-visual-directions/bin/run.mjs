#!/usr/bin/env node
/**
 * Lab: document-visual-directions
 * 实验性文档→视觉方向生成（visual-translation v2 execution-oriented）。
 * 本 Lab 与正式产品完全隔离：不进入 Electron UI / IPC / 打包。
 *
 * 用法:
 *   node labs/document-visual-directions/bin/run.mjs --input <input.json> [--out <dir>]
 *
 * input.json 需要提供 runVisualTranslationV2 的输入字段（projectId、corpus、
 * lockedFacts、lockedAssets、provider、modelId 等）。reasoner 需在编程方式
 * 调用时注入；CLI 模式仅支持离线字段校验与 dry-run 报告编译。
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const LAB_ROOT = path.resolve(HERE, '..');
const DEFAULT_OUT = path.resolve(LAB_ROOT, '..', '..', '.lab-data', 'document-visual-directions');

function parseArgs(argv) {
  const args = { out: DEFAULT_OUT };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--input') args.input = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

const args = parseArgs(process.argv);
if (args.help || !args.input) {
  console.log('用法: node labs/document-visual-directions/bin/run.mjs --input <input.json> [--out <dir>]');
  console.log('实验产物输出到 .lab-data/document-visual-directions/（默认）。');
  process.exit(args.help ? 0 : 1);
}

const { runVisualTranslationV2 } = await import('../src/visual-translation/v2/runtime/run-visual-translation-v2.js');

const input = JSON.parse(readFileSync(path.resolve(args.input), 'utf8'));
const outDir = path.resolve(args.out);
mkdirSync(outDir, { recursive: true });

const startedAt = new Date().toISOString();
try {
  const result = await runVisualTranslationV2({
    ...input,
    onProgress: (p) => console.log('[progress]', typeof p === 'string' ? p : JSON.stringify(p)),
  });
  const outFile = path.join(outDir, `run-${Date.now()}.json`);
  writeFileSync(outFile, JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), result }, null, 2));
  console.log('完成，产物:', outFile);
} catch (error) {
  const failFile = path.join(outDir, `run-${Date.now()}-failed.json`);
  writeFileSync(failFile, JSON.stringify({ startedAt, error: String(error && error.message || error) }, null, 2));
  console.error('运行失败:', error && error.message || error);
  console.error('失败记录:', failFile);
  process.exit(1);
}
