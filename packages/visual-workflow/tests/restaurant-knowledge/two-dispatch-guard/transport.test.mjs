import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createSinglePostTransport} from './single-post-transport.mjs';

for(const status of [200,302,307,429,500]) test(`native one-shot transport: HTTP ${status} causes one request and no redirect/retry`,async()=>{
  let calls=0,ends=0;
  const transport=createSinglePostTransport((_url,options,callback)=>{
    calls++;assert.equal(options.method,'POST');const req=new EventEmitter();
    req.end=body=>{ends++;assert.equal(body,'{}');queueMicrotask(()=>{
      const res=new EventEmitter();res.statusCode=status;res.headers={location:'https://unapproved.invalid/'};
      callback(res);res.emit('data',Buffer.from('{}'));res.emit('end');
    });};return req;
  });
  const result=await transport('https://offline.invalid/',{method:'POST',redirect:'error',body:'{}',headers:{}});
  assert.equal(result.status,status);assert.deepEqual(await result.json(),{});assert.equal(calls,1);assert.equal(ends,1);
});
test('native one-shot transport never retries a connection error',async()=>{
  let calls=0;
  const transport=createSinglePostTransport(()=>{calls++;const req=new EventEmitter();req.end=()=>queueMicrotask(()=>req.emit('error',new Error('simulated reset')));return req;});
  await assert.rejects(transport('https://offline.invalid/',{method:'POST',redirect:'error',body:'{}'}));assert.equal(calls,1);
});
test('native one-shot transport abort before send and redirect-policy drift have zero requests',async()=>{
  let calls=0;const transport=createSinglePostTransport(()=>{calls++;throw new Error('must not send');});
  const c=new AbortController();c.abort();
  await assert.rejects(transport('https://offline.invalid/',{method:'POST',redirect:'error',body:'{}',signal:c.signal}));
  await assert.rejects(transport('https://offline.invalid/',{method:'POST',redirect:'follow',body:'{}'}));assert.equal(calls,0);
});
