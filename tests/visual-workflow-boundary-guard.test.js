import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { checkWorkflowSource } from '../scripts/lib/visual-workflow-boundaries.mjs';

const root=path.resolve('boundary-fixture');
const backend='packages/visual-workflow/src/quality.js';
const frontend='apps/web/src/features/visual-workflow/quality.tsx';
const foreign='packages/runtime-core/src/application/quality.ts';
for (const syntax of [
  `import x from '@masterpiece/model-runtime/qwen-reasoner.js'`,
  `export {x} from '@masterpiece/model-runtime/qwen-reasoner.js'`,
  `import('@masterpiece/model-runtime/qwen-reasoner.js')`,
  `require('@masterpiece/model-runtime/qwen-reasoner.js')`,
  'import(`@masterpiece/model-runtime/qwen-reasoner.js`)',
  `import x from '../../runtime-core/src/application/quality.ts'`,
  `import(modulePath)`,
]) test(`isolated quality repair cannot depend on another business implementation: ${syntax}`,()=>{
  assert.ok(checkWorkflowSource(root,backend,syntax).length);
});
for (const syntax of [
  `import x from '@masterpiece/visual-workflow/service.js'`,
  `export * from '../../../visual-workflow/src/service.js'`,
  `import('../../../visual-workflow/src/service.js')`,
  `require('../../../visual-workflow/src/service.js')`,
  `rpc('visual-workflow:compile')`,
]) test(`planning/migration cannot consume isolated quality implementation: ${syntax}`,()=>{
  assert.ok(checkWorkflowSource(root,foreign,syntax).length);
});
test('owned UI cannot escape via re-export, dynamic import or shared bridge',()=>{
  for (const syntax of [`export * from '../../shared.ts'`,`import('../../shared.ts')`,`window['masterpiece'].generate()`]) assert.ok(checkWorkflowSource(root,frontend,syntax).length);
});
test('global configuration cannot enter through bracket environment access',()=>{
  assert.ok(checkWorkflowSource(root,backend,`process['env'].MODEL`).length);
});
test('owned relative modules and approved infrastructure remain usable',()=>{
  assert.deepEqual(checkWorkflowSource(root,backend,`import x from './compiler.js'; import sharp from 'sharp'; import fs from 'node:fs';`),[]);
  assert.deepEqual(checkWorkflowSource(root,frontend,`import {useState} from 'react'; import './visual-workflow.css';`),[]);
});
