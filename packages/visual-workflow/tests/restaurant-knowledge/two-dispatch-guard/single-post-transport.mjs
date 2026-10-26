import https from 'node:https';
import {failure} from './ledger.mjs';

// Native HTTPS has no redirect or retry behavior. Exactly one request/end call.
// requestImpl is solely the offline fake-HTTP seam; live wiring must use the
// default native implementation and requires separate human authorization.
export function createSinglePostTransport(requestImpl=https.request) {
  return (url,options)=>new Promise((resolve,reject)=>{
    if(new URL(url).protocol!=='https:' || options.method!=='POST' || options.redirect!=='error') return reject(failure('TRANSPORT_POLICY_INVALID'));
    if(options.signal?.aborted) return reject(failure('CANCELLED_BEFORE_SEND'));
    let request;
    try {
      request=requestImpl(url,{method:'POST',headers:options.headers,signal:options.signal},response=>{
        const chunks=[];
        response.on('data',chunk=>chunks.push(Buffer.from(chunk)));
        response.on('error',reject);
        response.on('aborted',()=>reject(failure('REQUEST_STATUS_UNKNOWN')));
        response.on('end',()=>resolve({status:response.statusCode,ok:response.statusCode>=200 && response.statusCode<300,
          redirected:false,json:async()=>JSON.parse(Buffer.concat(chunks).toString('utf8'))}));
      });
      request.on('error',reject);
      request.end(options.body);
    } catch(error) {reject(error);}
  });
}
