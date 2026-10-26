import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const digest = value => crypto.createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value)).digest('hex');
export const failure = code => Object.assign(new Error(code), {code});

// Exclusive one-use claim is NEVER removed, including after success or a crash.
// Synchronous fsync + rename completes reservation before the HTTP boundary.
export function openLedger(root, policy, beforePersist = () => {}) {
  root = path.resolve(root);
  fs.mkdirSync(root, {recursive:true});
  if (fs.lstatSync(root).isSymbolicLink()) throw failure('LEDGER_SYMLINK');
  fs.mkdirSync(path.join(root,'blocked'), {recursive:true});
  if (fs.lstatSync(path.join(root,'blocked')).isSymbolicLink()) throw failure('LEDGER_SYMLINK');
  const claimFile = path.join(root,'claim.json');
  const stateFile = path.join(root,'ledger.json');
  const terminalFile = path.join(root,'terminal.json');
  const base = {sessionId:policy.sessionId,projectId:policy.projectId};
  let stopped = null, expected = null;
  const blockedMemory = [];
  const state = {...base,schemaVersion:'1.0',policySha256:digest(policy),provider:policy.provider,
    model:policy.model,url:policy.url,region:'cn-beijing',kind:'offline_test_or_unapproved_experiment',
    status:'created',requests:[],terminalReason:null};
  function atomic(file, value, label) {
    beforePersist(label);
    const tmp = `${file}.${crypto.randomUUID()}.tmp`;
    const fd = fs.openSync(tmp,'wx',0o600);
    try { fs.writeFileSync(fd,JSON.stringify(value,null,2)+'\n'); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(tmp,file);
  }
  function terminal(reason) {
    stopped ||= reason;
    state.status='terminated'; state.terminalReason=stopped;
    try {
      const fd=fs.openSync(terminalFile,'wx',0o600);
      try {fs.writeFileSync(fd,JSON.stringify({...base,reason:stopped,at:new Date().toISOString()})+'\n');fs.fsyncSync(fd);}
      finally {fs.closeSync(fd);}
    } catch(error) {if(error.code!=='EEXIST') state.persistenceFailure=true;}
  }
  function blocked(reason, detail={}) {
    // Callers provide only fixed codes, ordinals and digests; never raw exceptions/credentials.
    const entry={...base,at:new Date().toISOString(),reason,...detail};
    blockedMemory.push(entry); terminal(reason);
    try {atomic(path.join(root,'blocked',`${crypto.randomUUID()}.json`),entry,'blocked');}
    catch {terminal('LEDGER_WRITE_FAILED');state.persistenceFailure=true;}
    return failure(reason);
  }
  let claim;
  if(!fs.existsSync(claimFile) && fs.readdirSync(root).some(name=>name!=='blocked')) throw blocked('ORPHANED_LEDGER');
  try {
    claim=JSON.stringify({...base,policySha256:digest(policy),pid:process.pid});
    const fd=fs.openSync(claimFile,'wx',0o600);
    try {fs.writeFileSync(fd,claim);fs.fsyncSync(fd);} finally {fs.closeSync(fd);}
  } catch(error) {
    if(error.code==='EEXIST') throw blocked('SESSION_REOPEN_FORBIDDEN');
    terminal('CLAIM_WRITE_FAILED');throw failure('CLAIM_WRITE_FAILED');
  }
  function assertOwned(detail={}) {
    if(stopped || fs.existsSync(terminalFile)) throw blocked(stopped || 'PERSISTENT_TERMINAL_LOCK',detail);
    try {
      if(fs.readFileSync(claimFile,'utf8')!==claim) throw failure('LEDGER_CHANGED');
      if(expected && digest(fs.readFileSync(stateFile))!==expected) throw failure('LEDGER_CHANGED');
    } catch {throw blocked('LEDGER_CHANGED',detail);}
  }
  function save(label) {
    try {
      atomic(stateFile,state,label);
      expected=digest(fs.readFileSync(stateFile));
    } catch {terminal('LEDGER_WRITE_FAILED');throw failure('LEDGER_WRITE_FAILED');}
  }
  save('initialize');
  return {state,assertOwned,save,blocked,terminal,
    isStopped:()=>Boolean(stopped || fs.existsSync(terminalFile)),
    snapshot:()=>structuredClone({...state,blockedAttempts:blockedMemory}),
    root};
}
