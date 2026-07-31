#!/usr/bin/env node
// scripts/audit-orphan-trees.mjs
// Audits the top-level dirs that the consolidation did not move yet.
// Prints tracked / untracked / gitignored counts per dir plus the
// individual file paths so we can decide what to do.

import { execSync } from 'node:child_process';

const DIRS = [
  'examples',
  'knowledge',
  'rules',
  'standards',
  'skills',
  'help',
  'ui-redesign',
  'prompt-templates',
  'history',
  'projects',
  '.workbuddy',
];

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (err) {
    return '';
  }
}

for (const d of DIRS) {
  const tracked = sh(`git ls-files ${d}`).split('\n').filter(Boolean);
  const untracked = sh(`git ls-files --others --exclude-standard ${d}`).split('\n').filter(Boolean);
  const ignored = sh(`git ls-files --others --ignored --exclude-standard ${d}`).split('\n').filter(Boolean);
  const section = [
    `## ${d}/`,
    ``,
    `- tracked:   ${tracked.length}`,
    `- untracked: ${untracked.length}`,
    `- ignored:   ${ignored.length}`,
  ];
  if (tracked.length) {
    section.push('', '### tracked', '');
    for (const f of tracked) section.push(`- ${f}`);
  }
  if (untracked.length) {
    section.push('', '### untracked (not ignored)', '');
    for (const f of untracked) section.push(`- ${f}`);
  }
  if (ignored.length) {
    section.push('', '### gitignored', '');
    for (const f of ignored.slice(0, 20)) section.push(`- ${f}`);
    if (ignored.length > 20) section.push(`- ... (${ignored.length - 20} more)`);
  }
  process.stdout.write(section.join('\n') + '\n\n');
}
