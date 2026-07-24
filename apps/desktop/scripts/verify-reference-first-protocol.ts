import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanProtocolHardcodes } from '../src/main/reference-first/protocol/hardcode-scan.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const protocolRoot = path.join(root, 'src', 'main', 'reference-first', 'protocol');
const vocabularyPath = path.join(
  root,
  'tests',
  'fixtures',
  'reference-first',
  'protocol-hardcode-vocabulary.json'
);

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : entry.name.endsWith('.ts') ? [target] : [];
  }));
  return nested.flat();
}

const vocabulary = JSON.parse(await fs.readFile(vocabularyPath, 'utf8'));
const files = await sourceFiles(protocolRoot);
const failures: Array<{ file: string; matches: ReturnType<typeof scanProtocolHardcodes> }> = [];

for (const file of files) {
  const result = scanProtocolHardcodes(await fs.readFile(file, 'utf8'), vocabulary);
  if (!result.passed) failures.push({ file: path.relative(root, file), matches: result });
}

if (failures.length) {
  console.error(JSON.stringify({ passed: false, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ passed: true, scannedFiles: files.length }, null, 2));
}
