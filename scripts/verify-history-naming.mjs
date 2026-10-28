#!/usr/bin/env node
// Keeps phase/release numbers out of the current tree.
//
// Historical phase documents live under docs/history/ (index: docs/history/INDEX.md).
// docs/archive/ is the older freeze/archive area. Everything else in docs/ must use
// semantic or date-based names, so version numbers stop piling up in the working tree.
import { execFileSync } from 'node:child_process';

const PHASE = /(?:^|[/_-])(S\d+(?:\.\d+)?[A-Z]?|M\d+[A-Z]?|P\d+[A-Z]?|R\d+(?:\.\d+)?|phase\d+)(?=$|[/_.-])/i;
const ALLOWED_PREFIXES = ['docs/history/', 'docs/archive/'];

let files = [];
try {
  files = execFileSync('git', ['ls-files', 'docs'], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
} catch (error) {
  console.error('[history-naming] unable to list docs/ (is git available?)');
  console.error(error.message);
  process.exit(1);
}

const violations = files.filter(
  (file) => !ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix)) && PHASE.test(file)
);

if (violations.length) {
  console.error('[history-naming] FAIL — phase/release numbers outside docs/history/:');
  for (const file of violations) console.error(`  ${file}`);
  console.error('');
  console.error('Move historical documents under docs/history/ (and link them from');
  console.error('docs/history/INDEX.md). Use semantic or date-based names for current docs.');
  process.exit(1);
}

console.log(
  `[history-naming] PASS — ${files.length} docs paths checked; phase/release numbers only under docs/history/ or docs/archive/.`
);
