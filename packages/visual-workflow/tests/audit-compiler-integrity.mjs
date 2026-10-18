import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

// Explicit review tool, outside production. Never updates acceptance or Golden.
const root=fileURLToPath(new URL('../',import.meta.url));
const repo=path.resolve(root,'../..');
const manifestPath=path.join(root,'implementation-integrity.json');
const reviewPath=path.join(root,'reports/compiler-integrity-review.json');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const allowed=[
  'src/generation-runtime/generation/compile.js',
  'src/generation-runtime/space/architecture-context.js',
  'src/generation-runtime/space/compiler.js',
  'src/generation-runtime/space/scene-projection/target-scene-projection.js',
  'src/generation-runtime/space/semantic/action-verbs.js',
  'src/generation-runtime/space/semantic/compile-spatial-mechanisms.js',
  'src/generation-runtime/space/semantic/resolve-spatial-color-role.js',
  'src/generation-runtime/space/semantic/sanitize-brand-expression.js',
  'src/generation-runtime/space/source-adapter.js'
];
const bytes=fs.readFileSync(manifestPath);
const manifest=JSON.parse(bytes);
const candidate=structuredClone(manifest);
const rows=[];
for(const item of candidate.files) {
  const actual=sha(fs.readFileSync(path.join(root,item.path)));
  if(allowed.includes(item.path)) {
    rows.push({path:item.path,oldSha256:item.sha256,candidateSha256:actual,
      reviewedCommitSha256:sha(execFileSync('git',['show',`3ea00af:packages/visual-workflow/${item.path}`],{cwd:repo}))});
    item.sha256=actual;
  } else assert.equal(actual,item.sha256,`Unreviewed implementation drift: ${item.path}`);
}
assert.equal(rows.length,allowed.length);
for(const item of manifest.frontendFiles ?? []) assert.equal(sha(fs.readFileSync(path.join(repo,item.path))),item.sha256,`Frontend drift: ${item.path}`);
const changed=execFileSync('git',['diff','3b7ed4d','--name-only','--','packages/visual-workflow/src'],{cwd:repo,encoding:'utf8'}).trim().split('\n').map(p=>p.replace('packages/visual-workflow/','')).sort();
assert.deepEqual(changed,[...allowed].sort());
const {files:oldFiles,...oldMetadata}=manifest;
const {files:candidateFiles,...candidateMetadata}=candidate;
assert.deepEqual(candidateMetadata,oldMetadata);
const review={baselineCommit:'3b7ed4d',reviewedCommit:'3ea00af',sourceScopeVerified:true,
  nonCandidateEntriesVerified:manifest.files.length-rows.length,frontendEntriesVerified:manifest.frontendFiles?.length ?? 0,
  oldManifestSha256:sha(bytes),oldImplementationDigest:sha(JSON.stringify(oldFiles)),
  candidateImplementationDigest:sha(JSON.stringify(candidateFiles)),qualityAcceptanceUnchanged:manifest.qualityAcceptance,
  entries:rows,applied:false};
if(process.argv.includes('apply-reviewed')) {
  const saved=JSON.parse(fs.readFileSync(reviewPath));
  assert.equal(saved.oldManifestSha256,review.oldManifestSha256);
  assert.deepEqual(saved.entries,review.entries);
  fs.writeFileSync(manifestPath,JSON.stringify(candidate,null,2)+'\n');
  review.applied=true;
  review.updatedManifestSha256=sha(fs.readFileSync(manifestPath));
}
fs.writeFileSync(reviewPath,JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify(review,null,2));
