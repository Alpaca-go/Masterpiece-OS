import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scanRoots = [
  'apps/cli/bin',
  'apps/cli/src/analysis-engine',
  'apps/web/src',
  'packages/runtime-core/src/application',
  'packages/model-runtime/src',
];
const extensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.css']);

export const NAMING_RULES = Object.freeze([
  {
    category: 'obsolete-version-identifier',
    pattern: /\bV5_(?:VERSION|PIPELINE_ID|DEFAULTS|OFFICIAL_OUTPUT_FILES)\b/u,
  },
  {
    category: 'obsolete-version-identifier',
    pattern: /\bCREATIVE_READING_PROMPT_VERSION\b/u,
  },
  {
    category: 'obsolete-version-identifier',
    pattern: /\bCREATIVE_DIRECTION_RUNTIME_VERSION\b/u,
  },
  {
    category: 'obsolete-version-identifier',
    pattern: /\bVNEXT_(?:TEMPLATE_REGISTRY_VERSION|TEMPLATE_ROUTER_VERSION|PROMPT_COMPILER_(?:VERSION|ID)|DELIVERABLE_VALIDATOR_(?:VERSION|ID))\b/u,
  },
  {
    category: 'obsolete-version-identifier',
    pattern: /\bSEEDREAM_VNEXT_ADAPTER_(?:VERSION|ID)\b/u,
  },
  {
    category: 'historical-stage-runtime-key',
    pattern: /['"]phase9b-recovery-[^'"]+['"]/u,
  },
  {
    category: 'current-product-copy',
    pattern: /Web\s*\/\s*v5|Desktop\s*\/\s*v5|Project Visual Context vNext|Reference-First[（ (]*R11|v5 Logo Locked|v5 Pipeline/iu,
  },
  {
    category: 'new-runtime-id',
    pattern: /r11-cont-/iu,
  },
  {
    category: 'current-internal-symbol',
    pattern: /\b(?:V5ConfigError|createV5ProjectConfig|writeV5RunReport|desktopFactualConstraints|validateDesktopReport|DesktopApi|createWebDesktopApi|desktopProjectId)\b/u,
  },
  {
    category: 'historical-stage-provider-id',
    pattern: /deep-creative-director-provider-v5/u,
  },
  {
    category: 'misleading-desktop-semantics',
    pattern: /Desktop 极简模式|Desktop remains the consumer/iu,
  },
]);

function* walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (extensions.has(path.extname(entry.name))) yield absolute;
  }
}

export function scanVersionNamingSource(source, file = '<source>') {
  const violations = [];
  const lines = String(source).split(/\r?\n/u);
  for (let index = 0; index < lines.length; index += 1) {
    for (const rule of NAMING_RULES) {
      const match = lines[index].match(rule.pattern);
      if (match) {
        violations.push({
          file,
          line: index + 1,
          token: match[0],
          category: rule.category,
        });
      }
    }
  }
  return violations;
}

export function scanCurrentVersionNaming(repositoryRoot = root) {
  const violations = [];
  for (const relativeRoot of scanRoots) {
    const scanRoot = path.join(repositoryRoot, relativeRoot);
    if (!fs.existsSync(scanRoot)) continue;
    for (const file of walk(scanRoot)) {
      violations.push(...scanVersionNamingSource(
        fs.readFileSync(file, 'utf8'),
        path.relative(repositoryRoot, file).replaceAll('\\', '/'),
      ));
    }
  }
  return violations;
}

function main() {
  const violations = scanCurrentVersionNaming();
  if (violations.length) {
    console.error('[version-naming] FAIL — obsolete stage naming found in current product semantics:');
    for (const violation of violations) {
      console.error(`  ${violation.file}:${violation.line} | ${violation.category} | ${violation.token}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('[version-naming] PASS — current product semantics use capability names; compatibility identifiers remain allowed.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
