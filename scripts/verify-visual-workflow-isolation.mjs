import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyImplementation } from '../packages/visual-workflow/src/integrity.js';
import { checkWorkflowSource } from './lib/visual-workflow-boundaries.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const owned = 'packages/visual-workflow/';
const frontend = 'apps/web/src/features/visual-workflow/';
function* files(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules','dist','out','build'].includes(item.name)) continue;
    const file = path.join(directory,item.name);
    if (item.isDirectory()) yield* files(file);
    else if (/\.(?:js|mjs|ts|tsx)$/u.test(item.name)) yield file;
  }
}
const violations = [];
for (const directory of ['apps', 'packages']) for (const file of files(path.join(root,directory))) {
  const relative = path.relative(root,file).replaceAll('\\','/');
  if (relative.includes('/tests/')) continue;
  const body = fs.readFileSync(file,'utf8');
  violations.push(...checkWorkflowSource(root, relative, body));
}
const manifest = JSON.parse(fs.readFileSync(path.join(root,owned,'implementation-integrity.json'),'utf8'));
for (const item of manifest.frontendFiles || []) {
  if (!item.path.startsWith(frontend)) violations.push('frontend integrity path escaped its owner');
  else if (crypto.createHash('sha256').update(fs.readFileSync(path.join(root,item.path))).digest('hex') !== item.sha256) violations.push(`${item.path}: workflow UI changed without updating its explicit implementation record`);
}
const listed = new Set(manifest.files.map(item => item.path));
function* allOwnedFiles(directory) {
  for (const item of fs.readdirSync(directory,{withFileTypes:true})) {
    const file=path.join(directory,item.name);
    if (item.isDirectory()) yield* allOwnedFiles(file);
    else yield file;
  }
}
for (const directory of ['src','prompts']) for (const file of allOwnedFiles(path.join(root,owned,directory))) {
  const relative=path.relative(path.join(root,owned),file).replaceAll('\\','/');
  if (!listed.has(relative)) violations.push(`${relative}: owned implementation/asset/prompt omitted from integrity record`);
}
const uiListed=new Set((manifest.frontendFiles || []).map(item=>item.path));
for (const file of allOwnedFiles(path.join(root,frontend))) {
  const relative=path.relative(root,file).replaceAll('\\','/');
  if (!uiListed.has(relative)) violations.push(`${relative}: workflow UI omitted from integrity record`);
}
const dependencies=JSON.parse(fs.readFileSync(path.join(root,owned,'package.json'),'utf8')).dependencies;
if (Object.keys(dependencies || {}).some(name=>name!=='sharp') || !/^\d+\.\d+\.\d+$/u.test(dependencies?.sharp || '')) violations.push('workflow dependencies must remain explicitly pinned infrastructure, without shared business packages');
try { await verifyImplementation(path.join(root,owned)); } catch (error) { violations.push(error.message); }
if (violations.length) { console.error(JSON.stringify({status:'fail',violations},null,2)); process.exitCode=1; }
else console.log('[visual-workflow-isolation] PASS — owned code, prompts, UI and ingress boundary verified; no provider calls.');
