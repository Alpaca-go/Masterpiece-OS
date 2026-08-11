import http, { type IncomingMessage, type ServerResponse } from 'node:http';

export interface LocalRpcServerOptions {
  host?: string;
  port?: number;
  allowedOrigin: string;
  invoke(channel: string, args: unknown[]): Promise<unknown>;
}

export interface LocalRpcServer {
  url: string;
  emit(channel: string, payload: unknown): void;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_BODY_BYTES) throw new Error('WEB_RPC_BODY_TOO_LARGE');
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
    if (origin && origin !== options.allowedOrigin) {
      sendJson(response, 403, { error: 'WEB_RPC_ORIGIN_REJECTED' });
      return;
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
    const match = /^\/_masterpiece\/rpc\/([^/]+)$/u.exec(requestUrl.pathname);
    if (request.method !== 'POST' || !match) {
      sendJson(response, 404, { error: 'WEB_RPC_NOT_FOUND' });
      return;
    }
    try {
      const body = await readJsonBody(request) as { args?: unknown[] };
      if (!Array.isArray(body.args)) throw new Error('WEB_RPC_ARGS_REQUIRED');
      const result = await options.invoke(decodeURIComponent(match[1]!), body.args);
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
