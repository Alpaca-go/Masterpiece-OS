// Explicit offline runner; never changes integrity records or Golden evidence.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const report=new URL('../../reports/scene-authority-compatibility/',import.meta.url);
const phase=process.argv[2];
if(!['baseline','final'].includes(phase)) throw new Error('Expected baseline or final');
fs.mkdirSync(new URL('logs/',report),{recursive:true});
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const npm=name=>[npmCli,'run',name];
const tests=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?tests(path.join(directory,entry.name)):
  /\.test\.(?:js|ts|mjs)$/u.test(entry.name)?[path.relative(root,path.join(directory,entry.name))]:[]);
const core=['scene-authority-repair','visible-requirement-ownership','scene-decision-fidelity','cross-zone-operation-scope'].map(name=>`packages/visual-workflow/tests/${name}.test.ts`);
const jobs=[['methodology',['--import','tsx','--test','packages/visual-workflow/tests/methodology/acceptance.test.mjs']],
  ['scene-core',['--import','tsx','--test',...core]],['repository-policy',['--test','tests/repository-policy.test.js']]];
if(phase==='final') jobs.push(
  ['custom-contract',['--import','tsx','--test','packages/visual-workflow/tests/methodology/custom-compatibility.test.ts']],
  ['workflow',['--import','tsx','--test',...tests(path.join(root,'packages/visual-workflow/tests'))]],
  ['current-flows',npm('verify:current-flows')],['golden',npm('golden:test')],['repo-verify',npm('repo:verify')],
  ['guard',npm('repo:guard:test')],['host-typecheck',npm('web-runtime:typecheck')],['web-typecheck',npm('web:typecheck')],
  ...['version-consistency','version-naming','workspace-boundaries','no-obsolete-code','production-boundaries','tracked-runtime-assets',
    'no-project-specific-production-rules','golden-boundary','analysis-guards'].map(name=>[name,npm(`verify:${name}`)]));
const results=[];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [name,args] of jobs) {
  const start=Date.now(),result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:50*1024*1024});
  if(result.error) throw result.error;
  const raw=(result.stdout||'')+(result.stderr||'');
  const log=`logs/${phase}-${name}.txt`,body=raw.replace(/\r\n/gu,'\n').replace(/[\t ]+$/gmu,'').replace(/\n*$/u,'\n');
  fs.writeFileSync(new URL(log,report),body);
  const countGroups=Object.fromEntries(['tests','pass','fail','skipped'].map(key=>[key,[...body.matchAll(new RegExp(`(?:ℹ|#) ${key} (\\d+)`,'gu'))].map(match=>Number(match[1]))]));
  results.push({name,command:args[0]===npmCli?`npm run ${args[2]}`:`node ${args.join(' ')}`,exitCode:result.status,durationMs:Date.now()-start,
    log,sha256:sha(body),rawSha256:sha(raw),normalization:'CRLF to LF; trailing horizontal whitespace removed; one terminal newline',countGroups});
  fs.writeFileSync(new URL(`${phase}-results.json`,report),JSON.stringify(results,null,2)+'\n');
  console.log(`${phase}/${name}: exit ${result.status}; ${countGroups.pass.join('+')||'-'} pass / ${countGroups.fail.join('+')||'-'} fail`);
}
