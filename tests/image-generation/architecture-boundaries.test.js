// Image Generation V1 — Phase 0 架构边界测试。
// 依赖方向（开发文档 §4.2）：
//   project-contracts / image-generation-contracts / model-runtime / runtime-core
//     ← image-generation-runtime
//     ← image-provider-dashscope
//     ← apps/desktop/src/main/image-generation
//     ← renderer IPC client
// 禁止：
//   image-generation-runtime → Electron
//   packages → apps/desktop
//   apps/desktop → labs
//   image-provider-dashscope → renderer
//   renderer → 云模型 API
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function collectSourceFiles(root, extensions) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const pending = [root];
  while (pending.length) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (extensions.some((ext) => entry.name.endsWith(ext))) files.push(fullPath);
    }
  }
  return files;
}

function assertNoPattern(files, pattern, label) {
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(content, pattern, `${label}: ${path.relative(repoRoot, file)}`);
  }
}

const CODE_EXT = ['.js', '.mjs', '.ts', '.tsx'];

test('image-generation packages never depend on Electron', () => {
  const files = [
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-contracts'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-adapter'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-runtime'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-provider-dashscope'), CODE_EXT)
  ];
  assertNoPattern(files, /from ['"]electron['"]|require\(['"]electron['"]\)/u, 'package 不得依赖 Electron');
});

test('image-generation packages never depend on apps/desktop or labs', () => {
  const files = [
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-contracts'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-adapter'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-generation-runtime'), CODE_EXT),
    ...collectSourceFiles(path.join(repoRoot, 'packages', 'image-provider-dashscope'), CODE_EXT)
  ];
  assertNoPattern(files, /apps\/desktop|labs\//u, 'package 不得依赖 apps/desktop 或 labs');
});

test('image-provider-dashscope never touches renderer', () => {
  const files = collectSourceFiles(path.join(repoRoot, 'packages', 'image-provider-dashscope'), CODE_EXT);
  assertNoPattern(files, /renderer/iu, 'provider 不得接触 renderer');
});

test('desktop image-generation renderer never calls provider endpoints or holds credentials', () => {
  const files = collectSourceFiles(
    path.join(repoRoot, 'apps', 'desktop', 'src', 'renderer', 'src', 'features', 'image-generation'),
    CODE_EXT
  );
  assertNoPattern(files, /dashscope[-.]?(intl\.)?aliyuncs\.com/iu, 'renderer 不得直接访问 Provider Endpoint');
  assertNoPattern(files, /Authorization|apiKey|api_key/u, 'renderer 不得接触鉴权信息');
  assertNoPattern(files, /require\(['"]node:|from ['"]node:/u, 'renderer 不得直接使用 Node API');
});

test('desktop main image-generation never imports labs', () => {
  const files = collectSourceFiles(path.join(repoRoot, 'apps', 'desktop', 'src', 'main', 'image-generation'), CODE_EXT);
  assertNoPattern(files, /['"](\.\.\/)+labs\/|['"]labs\//u, 'desktop 不得依赖 labs');
});
