// RKS-02C.2 offline verification only. This tool never updates a digest or Golden file.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../../../../',import.meta.url));
const report=new URL('../../reports/scene-authority-integrity/',import.meta.url);
const npmCli=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
const npm=name=>[npmCli,'run',name];
const tests=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?tests(path.join(directory,entry.name)):
  /\.test\.(?:js|ts|mjs)$/u.test(entry.name)?[path.relative(root,path.join(directory,entry.name))]:[]);
const core=['scene-authority-repair','visible-requirement-ownership','scene-decision-fidelity','cross-zone-operation-scope'].map(name=>`packages/visual-workflow/tests/${name}.test.ts`);
const jobs=[
  ['scene-authority',['--import','tsx','--test',...core]],
  ['custom-compatibility',['--import','tsx','--test','packages/visual-workflow/tests/methodology/acceptance.test.mjs','packages/visual-workflow/tests/methodology/custom-compatibility.test.ts']],
  ['visual-workflow',['--import','tsx','--test',...tests(path.join(root,'packages/visual-workflow/tests'))]],
  ['current-flows',npm('verify:current-flows')],['repo-verify',npm('repo:verify')],['golden',npm('golden:test')],['guard',npm('repo:guard:test')],
  ['host-typecheck',npm('web-runtime:typecheck')],['web-typecheck',npm('web:typecheck')],
  ['production-boundaries',npm('verify:production-boundaries')],['no-project-specific-rules',npm('verify:no-project-specific-production-rules')],
  ['historical-repository-policy',['--test','tests/repository-policy.test.js']]
];
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
