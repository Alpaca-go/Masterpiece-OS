import http, { type IncomingMessage, type ServerResponse } from 'node:http';

export interface WebRpcServerOptions {
  host?: string;
  port?: number;
  allowedOrigin: string;
  invoke(channel: string, args: unknown[]): Promise<unknown>;
}

export interface WebRpcServer {
  url: string;
  emit(channel: string, payload: unknown): void;
  close(): Promise<void>;
}

const MAX_BODY_BYTES = 10 * 1024 * 1024;

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

function requestOriginAllowed(request: IncomingMessage, allowedOrigin: string): boolean {
  const origin = request.headers.origin;
  return !origin || origin === allowedOrigin;
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
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function startWebRpcServer(options: WebRpcServerOptions): Promise<WebRpcServer> {
  const host = options.host ?? '127.0.0.1';
  const port = options.port ?? 4317;
  const eventClients = new Set<ServerResponse>();

  const server = http.createServer(async (request, response) => {
    if (!requestOriginAllowed(request, options.allowedOrigin)) {
      sendJson(response, 403, { error: 'WEB_RPC_ORIGIN_REJECTED' });
      return;
    }

    const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? `${host}:${port}`}`);
    if (request.method === 'GET' && requestUrl.pathname === '/_masterpiece/health') {
      sendJson(response, 200, { ok: true, mode: 'web', timestamp: new Date().toISOString() });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/_masterpiece/events') {
      response.writeHead(200, {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive',
        'x-accel-buffering': 'no'
      });
      response.write(': connected\n\n');
      eventClients.add(response);
      request.once('close', () => eventClients.delete(response));
      return;
    }

    const match = /^\/_masterpiece\/rpc\/([^/]+)$/.exec(requestUrl.pathname);
    if (request.method !== 'POST' || !match) {
      sendJson(response, 404, { error: 'WEB_RPC_NOT_FOUND' });
      return;
    }

    try {
      const body = await readJsonBody(request) as { args?: unknown[] };
      if (!Array.isArray(body.args)) throw new Error('WEB_RPC_ARGS_REQUIRED');
      const channel = decodeURIComponent(match[1]!);
      const result = await options.invoke(channel, body.args);
      sendJson(response, 200, { result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(response, 500, { error: message });
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

  const emit = (channel: string, payload: unknown): void => {
    const frame = `event: ${channel}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const client of eventClients) client.write(frame);
  };
  const keepAlive = setInterval(() => {
    for (const client of eventClients) client.write(': keep-alive\n\n');
  }, 15_000);
  keepAlive.unref();

  return {
    url: `http://${host}:${actualPort}`,
    emit,
    close: () => new Promise<void>((resolve, reject) => {
      clearInterval(keepAlive);
      for (const client of eventClients) client.end();
      eventClients.clear();
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
