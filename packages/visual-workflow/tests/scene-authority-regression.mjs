// Opt-in offline regression report. No guard bypass, digest refresh or Golden mutation.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const reports=new URL('../reports/scene-authority-repair/',import.meta.url);
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
function tests(directory) {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?tests(path.join(directory,entry.name)):
    /\.test\.(?:js|ts|mjs)$/u.test(entry.name)?[path.relative(root,path.join(directory,entry.name))]:[]);
}
const npm=name=>[npmCli,'run',name];
const jobs=[
  ['targeted',['--import','tsx','--test',...['scene-authority-repair','visible-requirement-ownership','scene-decision-fidelity','cross-zone-operation-scope'].map(name=>`packages/visual-workflow/tests/${name}.test.ts`)]],
  ['workflow',['--import','tsx','--test',...tests(path.join(root,'packages/visual-workflow/tests'))]],
  ['repo-verify',npm('repo:verify')],['golden',npm('golden:test')],['current-flows',npm('verify:current-flows')],
  ['guard',npm('repo:guard:test')],['host-typecheck',npm('web-runtime:typecheck')],['web-typecheck',npm('web:typecheck')],
  ...['version-consistency','version-naming','workspace-boundaries','no-obsolete-code','production-boundaries','tracked-runtime-assets',
    'no-project-specific-production-rules','golden-boundary','analysis-guards'].map(name=>[name,npm(`verify:${name}`)])
];
const results=[];
for(const [name,args] of jobs) {
  const log=`logs/final-${name}.txt`,fd=fs.openSync(new URL(log,reports),'w'),start=Date.now();
  const result=spawnSync(process.execPath,args,{cwd:root,stdio:['ignore',fd,fd]});fs.closeSync(fd);
  if(result.error) throw result.error;
  const body=fs.readFileSync(new URL(log,reports),'utf8');
  const countGroups=Object.fromEntries(['tests','pass','fail','skipped'].map(key=>[key,[...body.matchAll(new RegExp(`(?:ℹ|#) ${key} (\\d+)`,'gu'))].map(match=>Number(match[1]))]));
  results.push({name,command:args[0]===npmCli?`npm run ${args[2]}`:`node ${args.join(' ')}`,exitCode:result.status,durationMs:Date.now()-start,
    countGroups,log,sha256:crypto.createHash('sha256').update(body).digest('hex')});
  fs.writeFileSync(new URL('regression-results.json',reports),JSON.stringify(results,null,2)+'\n');
  console.log(`${name}: exit ${result.status}; ${countGroups.pass.join('+') || '-'} pass / ${countGroups.fail.join('+') || '-'} fail`);
}
