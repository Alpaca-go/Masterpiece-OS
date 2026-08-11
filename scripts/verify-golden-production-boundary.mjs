import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['src', 'packages', 'apps/cli/src', 'apps/web/src', 'apps/web-runtime/src'];
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.yml', '.yaml']);
const forbiddenPath = /(?:evaluation[/\\](?:golden-cases|anti-cases|hidden-cases)|tests[/\\](?:fixtures|evaluation)|fixtures[/\\]|manual-smoke[/\\])/iu;
const runtimeImport = /(?:from\s+|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu;
const runtimeRead = /(?:readFile|readFileSync|createReadStream|readdir|readdirSync|glob|load)[\s\S]{0,240}(?:golden-cases|anti-cases|hidden-cases|fixtures|manual-smoke)/giu;
const fallback = /(?:fallback|default)[\s\S]{0,160}(?:goldenPrompt|golden_prompt|golden-cases)/giu;
const vectorIndex = /(?:vector|embedding|index)[\s\S]{0,160}(?:goldenPrompt|golden_prompt|golden-cases)/giu;

function* walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'out', 'dist', 'build'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (extensions.has(path.extname(entry.name))) yield absolute;
  }
}

function lineOf(body, index) {
  return body.slice(0, index).split(/\r?\n/u).length;
}

const violations = [];
for (const scanRoot of roots) {
  for (const filename of walk(path.join(root, scanRoot))) {
    const body = fs.readFileSync(filename, 'utf8');
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    for (const match of body.matchAll(runtimeImport)) {
      if (forbiddenPath.test(match[1])) violations.push({
        code: 'GOLDEN_RUNTIME_IMPORT_FORBIDDEN',
        file: relative,
        line: lineOf(body, match.index),
      });
    }
    for (const [code, pattern] of [
      ['GOLDEN_RUNTIME_READ_FORBIDDEN', runtimeRead],
      ['GOLDEN_FALLBACK_FORBIDDEN', fallback],
      ['GOLDEN_VECTOR_INDEX_FORBIDDEN', vectorIndex],
    ]) {
      for (const match of body.matchAll(pattern)) violations.push({
        code,
        file: relative,
        line: lineOf(body, match.index),
      });
    }
  }
}
process.stdout.write(`${JSON.stringify({
  status: violations.length ? 'fail' : 'pass',
  violations,
}, null, 2)}\n`);
if (violations.length) process.exitCode = 1;
