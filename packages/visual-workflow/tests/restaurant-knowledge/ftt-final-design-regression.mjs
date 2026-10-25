// Offline review verification. Never updates production, integrity or Golden files.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const report=new URL('../../reports/ftt-final-design/',import.meta.url);
fs.mkdirSync(new URL('logs/',report),{recursive:true});
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const npm=name=>[npmCli,'run',name];
const tests=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?tests(path.join(directory,entry.name)):
  /\.test\.(?:js|ts|mjs)$/u.test(entry.name)?[path.relative(root,path.join(directory,entry.name))]:[]);
const jobs=[['design-review',['--import','tsx','--test','packages/visual-workflow/tests/restaurant-knowledge/ftt-final-design.test.ts']],
  ['visual-workflow',['--import','tsx','--test',...tests(path.join(root,'packages/visual-workflow/tests'))]],
  ['repo-verify',npm('repo:verify')],['golden',npm('golden:test')],['historical-policy',['--test','tests/repository-policy.test.js']]];
const results=[];
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
for(const [name,args] of jobs) {
  const start=Date.now(),result=spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:50*1024*1024});
  if(result.error) throw result.error;
  const raw=(result.stdout||'')+(result.stderr||''),body=raw.replace(/\r\n/gu,'\n').replace(/[\t ]+$/gmu,'').replace(/\n*$/u,'\n');
  const log=`logs/${name}.txt`;fs.writeFileSync(new URL(log,report),body);
  const countGroups=Object.fromEntries(['tests','pass','fail','skipped'].map(key=>[key,[...body.matchAll(new RegExp(`(?:ℹ|#) ${key} (\\d+)`,'gu'))].map(match=>Number(match[1]))]));
  results.push({name,command:args[0]===npmCli?`npm run ${args[2]}`:`node ${args.join(' ')}`,exitCode:result.status,durationMs:Date.now()-start,
    countGroups,log,sha256:sha(body),rawSha256:sha(raw),normalization:'CRLF to LF; trailing horizontal whitespace removed; one terminal newline'});
  fs.writeFileSync(new URL('regression-results.json',report),JSON.stringify(results,null,2)+'\n');
  console.log(`${name}: exit ${result.status}; ${countGroups.pass.join('+')||'-'} pass / ${countGroups.fail.join('+')||'-'} fail`);
}
