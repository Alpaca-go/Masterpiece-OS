import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const productionRoots = [
  path.join(root, 'packages', 'image-generation-runtime', 'src'),
  path.join(root, 'apps', 'desktop', 'src', 'main'),
];
const promptRuleFile = /(?:prompt|template|adapter|fallback|unified-visual-understanding)\.(?:js|mjs|ts)$/iu;
const sourceFile = /\.(?:js|mjs|ts)$/iu;
const forbiddenTerms = [
  ['九州美学', /九州美学/iu],
  ['孔雀', /孔雀/iu],
  ['羽毛', /羽毛/iu],
  ['peacock', /\bpeacock\b/iu],
  ['feather', /\bfeather\b/iu],
  ['70/20/10', /70\s*[/:-]\s*20\s*[/:-]\s*10/iu],
  ['珍珠白', /珍珠白/iu],
  ['矿物紫', /矿物紫/iu],
  ['冷银', /冷银/iu],
  ['磨砂玻璃', /磨砂玻璃/iu],
  ['半透明生物结构', /半透明生物(?:结构|组织)/iu],
  ['beauty salon', /\bbeauty\s+salon\b/iu],
  ['treatment bed', /\btreatment\s+beds?\b/iu],
  ['injection', /\binjections?\b/iu],
  ['nursing', /\bnursing\b/iu],
  ['tea space', /\btea\s+space\b/iu],
  ['sales office', /\bsales\s+office\b/iu],
  ['platform', /\bplatform\b|平台/iu],
  ['ecosystem', /\becosystem\b|生态平台/iu],
  ['network', /\bnetwork\b|网络平台/iu],
];
const runtimeGoldenRead = /(?:readFile|readFileSync|createReadStream)[\s\S]{0,180}(?:tests|benchmarks|validation|docs)[/\\][^'"]*golden/iu;

async function filesUnder(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) results.push(...await filesUnder(absolute));
    else if (sourceFile.test(entry.name)) results.push(absolute);
  }
  return results;
}

const violations = [];
for (const productionRoot of productionRoots) {
  for (const filename of await filesUnder(productionRoot)) {
    const body = await fs.readFile(filename, 'utf8');
    const relative = path.relative(root, filename).replaceAll('\\', '/');
    if (promptRuleFile.test(path.basename(filename))) {
      for (const [term, pattern] of forbiddenTerms) {
        const match = pattern.exec(body);
        if (!match) continue;
        violations.push({
          code: ['platform', 'ecosystem', 'network'].includes(term)
            ? 'KEYWORD_BASED_DOMAIN_INFERENCE_FORBIDDEN'
            : 'PROJECT_SPECIFIC_RULE_IN_PRODUCTION',
          file: relative,
          line: body.slice(0, match.index).split(/\r?\n/u).length,
          term,
        });
      }
    }
    const goldenRead = runtimeGoldenRead.exec(body);
    if (goldenRead) {
      violations.push({
        code: 'GOLDEN_RUNTIME_READ_FORBIDDEN',
        file: relative,
        line: body.slice(0, goldenRead.index).split(/\r?\n/u).length,
        term: 'runtime golden path read',
      });
    }
  }
}

const result = {
  status: violations.length ? 'fail' : 'pass',
  violations,
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (violations.length) {
  process.stderr.write('PROJECT_SPECIFIC_RULE_IN_PRODUCTION\n');
  process.exitCode = 1;
}
