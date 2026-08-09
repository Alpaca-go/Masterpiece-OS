import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = [
  path.join(root, 'apps', 'cli', 'src'),
  path.join(root, 'apps', 'desktop', 'src'),
  path.join(root, 'packages'),
];
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const forbidden = [
  /\bV5_(?:VERSION|PIPELINE_ID|DEFAULTS|OFFICIAL_OUTPUT_FILES)\b/u,
  /\bCREATIVE_READING_PROMPT_VERSION\b/u,
  /\bCREATIVE_DIRECTION_RUNTIME_VERSION\b/u,
  /\bVNEXT_(?:TEMPLATE_REGISTRY_VERSION|TEMPLATE_ROUTER_VERSION|PROMPT_COMPILER_(?:VERSION|ID)|DELIVERABLE_VALIDATOR_(?:VERSION|ID))\b/u,
  /\bSEEDREAM_VNEXT_ADAPTER_(?:VERSION|ID)\b/u,
  /['"]phase9b-recovery-[^'"]+['"]/u,
];

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (extensions.has(path.extname(entry.name))) yield absolute;
  }
}

const violations = [];
for (const scanRoot of scanRoots) {
  if (!fs.existsSync(scanRoot)) continue;
  for (const file of walk(scanRoot)) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of forbidden) {
      if (pattern.test(source)) {
        violations.push(`${path.relative(root, file)} -> ${pattern}`);
      }
    }
  }
}

if (violations.length) {
  console.error('[version-naming] FAIL — obsolete generation labels found in active version identifiers:');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log('[version-naming] PASS — active version identifiers follow the version-domain policy.');
