import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import {syncBuiltinESMExports} from 'node:module';
let attempts=0;
const deny=()=>{attempts++;throw new Error('OFFLINE_SPATIAL_REGRESSION_NETWORK_FORBIDDEN');};
const originalConnect=net.connect;
const originalCreateConnection=net.createConnection;
const localPipe=args=>{
  const name=typeof args[0]==='string'?args[0]:args[0]?.path;
  return typeof name==='string' && /^\\\\[.?]\\pipe\\/u.test(name);
};
globalThis.fetch=deny;
http.request=deny;http.get=deny;https.request=deny;https.get=deny;
// The TS loader uses Windows named pipes for local IPC, never Provider traffic.
net.connect=function(...args){return localPipe(args)?originalConnect.apply(this,args):deny();};
net.createConnection=function(...args){return localPipe(args)?originalCreateConnection.apply(this,args):deny();};
tls.connect=deny;
syncBuiltinESMExports();
export const networkAttempts=()=>attempts;
