import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export interface LocalRpcServerOptions {
  host?: string;
  port?: number;
  allowedOrigin: string | string[];
  invoke(channel: string, args: unknown[]): Promise<unknown>;
  creativeResearchDataPath?: string;
}

export interface LocalRpcServer {
  url: string;
  emit(channel: string, payload: unknown): void;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;
// P3-D3.6A/6B — the Web Asset Upload channel carries raw base64
// of up to 8 MiB of image bytes (≈10.7 MiB base64 + JSON wrapper).
// Only these channels get a 64 MiB cap; all other RPC channels keep
// the general 10 MiB limit. Channel-aware, not a global raise.
const UPLOAD_CHANNELS = new Set([
  'projects:import-file-bytes',
  'projects:create-from-browser-files',
  'projects:import-browser-files',
  'document-context:import-documents',
  'creative-research:import-curated-references',
]);
const UPLOAD_BODY_BYTES = 64 * 1024 * 1024;

function bodyCapFor(channel: string): number {
  return UPLOAD_CHANNELS.has(channel) ? UPLOAD_BODY_BYTES : MAX_BODY_BYTES;
}

// P3-D3.6A/6B — exported for the body-cap contract guard
// (tests verify the channel-aware selector without allocating
// multi-MiB payloads).
export function resolveBodyCap(channel: string): number {
  return bodyCapFor(channel);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage, cap: number): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > cap) throw new Error('WEB_RPC_BODY_TOO_LARGE');
    chunks.push(buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export async function startLocalRpcServer(options: LocalRpcServerOptions): Promise<LocalRpcServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4317;
  const eventClients = new Set<ServerResponse>();
  const server = http.createServer(async (request, response) => {
    const origin = request.headers.origin;
    if (origin) {
      const allowed = Array.isArray(options.allowedOrigin)
        ? options.allowedOrigin
        : [options.allowedOrigin];
      if (!allowed.includes(origin)) {
        sendJson(response, 403, { error: 'WEB_RPC_ORIGIN_REJECTED' });
        return;
      }
    }
    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);
    if (request.method === 'GET' && requestUrl.pathname === '/_masterpiece/health') {
      sendJson(response, 200, { ok: true, mode: 'web', host: 'node', timestamp: new Date().toISOString() });
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/_masterpiece/events') {
      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      response.write(': connected\n\n');
      eventClients.add(response);
      request.once('close', () => eventClients.delete(response));
      return;
    }
    const imageMatch = /^\/_masterpiece\/creative-research\/([A-Za-z0-9._-]+)\/references\/([A-Za-z0-9._-]+)\/image\.webp$/u.exec(requestUrl.pathname);
    if (request.method === 'GET' && imageMatch && options.creativeResearchDataPath) {
      const root = path.join(path.resolve(options.creativeResearchDataPath), 'creative-research');
      const filename = path.resolve(root, imageMatch[1]!, 'assets', 'references', imageMatch[2]!, 'image.webp');
      if (!filename.startsWith(`${root}${path.sep}`)) { sendJson(response, 404, { error: 'WEB_RPC_NOT_FOUND' }); return; }
      const stream = fs.createReadStream(filename);
      stream.once('error', () => { if (!response.headersSent) sendJson(response, 404, { error: 'REFERENCE_IMAGE_NOT_FOUND' }); else response.destroy(); });
      stream.once('open', () => {
        response.writeHead(200, { 'content-type': 'image/webp', 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
        stream.pipe(response);
      });
      return;
    }
    const curatedImageMatch = /^\/_masterpiece\/creative-research\/([A-Za-z0-9._-]+)\/curated-references\/([A-Za-z0-9._-]+)\/image$/u.exec(requestUrl.pathname);
    if (request.method === 'GET' && curatedImageMatch && options.creativeResearchDataPath) {
      const root = path.join(path.resolve(options.creativeResearchDataPath), 'creative-research');
      const referenceRoot = path.resolve(root, curatedImageMatch[1]!, 'curated-references', curatedImageMatch[2]!);
      if (!referenceRoot.startsWith(`${root}${path.sep}`)) { sendJson(response, 404, { error: 'WEB_RPC_NOT_FOUND' }); return; }
      const entry = (await fs.promises.readdir(referenceRoot).catch(() => []))
        .find((name) => /^original\.(?:jpe?g|png|webp)$/iu.test(name));
      if (!entry) { sendJson(response, 404, { error: 'CURATED_REFERENCE_IMAGE_NOT_FOUND' }); return; }
      const filename = path.join(referenceRoot, entry);
      const extension = path.extname(entry).toLowerCase();
      const contentType = extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
      const stream = fs.createReadStream(filename);
      stream.once('error', () => { if (!response.headersSent) sendJson(response, 404, { error: 'CURATED_REFERENCE_IMAGE_NOT_FOUND' }); else response.destroy(); });
      stream.once('open', () => {
        response.writeHead(200, { 'content-type': contentType, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' });
        stream.pipe(response);
      });
      return;
    }
    const match = /^\/_masterpiece\/rpc\/([^/]+)$/u.exec(requestUrl.pathname);
    if (request.method !== 'POST' || !match) {
      sendJson(response, 404, { error: 'WEB_RPC_NOT_FOUND' });
      return;
    }
    try {
      const channel = decodeURIComponent(match[1]!);
      const body = await readJsonBody(request, bodyCapFor(channel)) as { args?: unknown[] };
      if (!Array.isArray(body.args)) throw new Error('WEB_RPC_ARGS_REQUIRED');
      const result = await options.invoke(channel, body.args);
      sendJson(response, 200, { result });
    } catch (error) {
      sendJson(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
  const address = server.address();
  const actualPort = typeof address === 'object' && address ? address.port : port;
  const keepAlive = setInterval(() => {
    for (const client of eventClients) client.write(': keep-alive\n\n');
  }, 15_000);
  keepAlive.unref();
  return Object.freeze({
    url: `http://${host}:${actualPort}`,
    emit(channel: string, payload: unknown): void {
      const frame = `event: ${channel}\ndata: ${JSON.stringify(payload)}\n\n`;
      for (const client of eventClients) client.write(frame);
    },
    close: () => new Promise<void>((resolve, reject) => {
      clearInterval(keepAlive);
      for (const client of eventClients) client.end();
      eventClients.clear();
      server.close((error) => error ? reject(error) : resolve());
    }),
  });
}
