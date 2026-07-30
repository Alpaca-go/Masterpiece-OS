import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionRoots = ['src', 'packages', 'apps/desktop/src'];
const sourceExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx']);
const promptLikeFile = /(?:prompt|template|compiler|adapter|generation|unified-visual-understanding)/iu;
const projectSpecificTerms = [
  ['九州美学', /九州美学/iu],
  ['孔雀', /孔雀/iu],
  ['羽毛', /羽毛/iu],
  ['peacock', /\bpeacock\b/iu],
  ['feather', /\bfeather\b/iu],
  ['矿物紫', /矿物紫/iu],
  ['珍珠白', /珍珠白/iu],
  ['冷银', /冷银/iu],
  ['半透明生物结构', /半透明生物结构/iu],
  ['70/20/10', /70\s*[/:-]\s*20\s*[/:-]\s*10/iu],
  ['beauty salon', /\bbeauty\s+salon\b/iu],
  ['treatment bed', /\btreatment\s+beds?\b/iu],
  ['injection', /\binjections?\b/iu],
  ['nursing', /\bnursing\b/iu],
  ['tea space', /\btea\s+space\b/iu],
  ['sales office', /\bsales\s+office\b/iu],
];
const keywordStyleInference = [
  /(?:if\s*\([^)]*(?:industry|行业)[^)]*(?:includes|match|test)|(?:industry|行业)[^;\n]{0,80}\.(?:includes|match|test)\()[\s\S]{0,240}(?:color|material|composition|style|tone|palette|颜色|材质|构图|气质)/isu,
  /(?:if\s*\([^)]*(?:platform|ecosystem|network|平台|生态)[^)]*\)|case\s+['"](?:platform|ecosystem|network)['"])[\s\S]{0,240}(?:reception|collaboration|协作|接待|材质|色彩|气质)/isu,
];

function* walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', 'out', 'dist', 'build'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) yield* walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name))) yield absolute;
  }
}

function lineOf(body, index) {
  return body.slice(0, index).split(/\r?\n/u).length;
}

const violations = [];
for (const productionRoot of productionRoots) {
  for (const filename of walk(path.join(root, productionRoot))) {
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    const body = fs.readFileSync(filename, 'utf8');
    for (const [term, pattern] of projectSpecificTerms) {
      const match = pattern.exec(body);
      if (match) violations.push({
        code: 'PROJECT_SPECIFIC_RULE_IN_PRODUCTION',
        file: relative,
        line: lineOf(body, match.index),
        term,
      });
    }
    if (promptLikeFile.test(relative)) {
      for (const pattern of keywordStyleInference) {
        const match = pattern.exec(body);
        if (match) violations.push({
          code: 'KEYWORD_BASED_DOMAIN_STYLE_INFERENCE',
          file: relative,
          line: lineOf(body, match.index),
          term: match[0].slice(0, 160),
        });
      }
    }
  }
}

const result = { status: violations.length ? 'fail' : 'pass', violations };
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (violations.length) process.exitCode = 1;
