# apps/web-runtime — RPC & SSE Protocol

> **Audience**: Anyone deploying `apps/web-runtime/` behind a reverse
> proxy, or extending it with a new operation. The renderer side
> (`apps/web/src/web-api.ts`) and the host side (`apps/web-runtime/src/local-rpc-server.ts`)
> are coupled by this contract.

## Topology

The Web Runtime has two processes connected by HTTP + Server-Sent Events:

```
┌─────────────────────────┐                          ┌──────────────────────────────┐
│  apps/web (Vite)        │                          │  apps/web-runtime (Node)     │
│  ───────────────────    │   POST /_masterpiece/     │  ──────────────────────     │
│  src/web-api.ts  ───POST┼─rpc/<channel>───────────►│  local-rpc-server.ts        │
│                         │                          │       │                      │
│  EventSource ───────────┼─GET /_masterpiece/events─│       ▼                      │
│  /_masterpiece/events   │  (SSE)                   │  operation-registry          │
│                         │◄────────────────────────│  (runtime-core)              │
└─────────────────────────┘                          └──────────────────────────────┘
```

Both URLs are on the **same host:port** as the Vite dev server (or the
production static host). They are **path-prefixed** under
`/_masterpiece/`, so a reverse proxy needs to:

1. Forward `/_masterpiece/rpc/*` to the Node RPC server.
2. Forward `/_masterpiece/events` to the Node RPC server **without
   buffering** (SSE will hang if the proxy buffers responses).
3. Forward all other paths to Vite / static assets.

## HTTP RPC

### Endpoint

```
POST /_masterpiece/rpc/<channel>
Content-Type: application/json

{ "args": [arg0, arg1, ...] }
```

- `<channel>` is URL-encoded; namespaces are kebab-cased from the JS
  method names (see "Channel Naming" below).
- `args` is a JSON array whose elements are positional arguments the
  registered operation expects.

### Responses

```
200, { "result": <opaque> }      — operation returned a value
500, { "error": "<message>" }    — operation threw; message is the
                                   thrown Error's `.message`
403, { "error": "WEB_RPC_ORIGIN_REJECTED" }  — Origin header did not
                                                match allowedOrigin
404, { "error": "WEB_RPC_NOT_FOUND" }        — bad path or method
```

### Body size limits

| Channel cap | Channels |
|---|---|
| 10 MiB (default) | all channels |
| 64 MiB | `projects:import-file-bytes`, `document-context:import-documents` |

If a request body exceeds the cap, the server returns 500 with
`error: "WEB_RPC_BODY_TOO_LARGE"`. The cap is **channel-aware**, not
a global raise.

### Origin enforcement

The server reads `request.headers.origin` and compares it against
`allowedOrigin`. The value comes from:

1. `MASTERPIECE_WEB_ALLOWED_ORIGIN`
2. else `MASTERPIECE_WEB_RENDERER_ORIGIN`
3. else `http://127.0.0.1:5173`

Comma-separated lists are accepted (e.g. when both `127.0.0.1` and
`localhost` need to be allowed in dev). Requests with no `Origin`
header (e.g. server-to-server curl) bypass the check.

## Server-Sent Events

### Endpoint

```
GET /_masterpiece/events
Accept: text/event-stream
```

The server holds the connection open and writes one SSE event per
broadcast:

```
event: <channel>
data: <json payload>

```

The connection is kept alive with a `: keep-alive\n\n` comment every
15 seconds. Clients reconnect on disconnect (the renderer uses
`EventSource`, which handles this automatically).

### Channels emitted

These are the channels the host can broadcast (defined by callers of
`rpcServer.emit(channel, payload)`):

| Channel | Payload shape | Source |
|---|---|---|
| `analysis:progress` | `AnalysisProgress` | `pipeline-service.ts` |
| `document-context:progress` | `DocumentContextProgress` | document-context ops |
| `reference-anchor:progress` | `ReferenceAnchorProgress` | reference-anchor ops |
| `image-generation:run-updated` | `{ runId, status }` | image-generation ops |

## Channel Naming

The renderer derives a channel from `namespace.method` by kebab-casing
each segment:

```
imageGeneration.startValidatedShortChain
  → image-generation:start-validated-short-chain
```

When the auto-derived name would be misleading (semantic mismatch), the
renderer falls back to an explicit override:

```typescript
// apps/web/src/web-api.ts
WEB_RPC_CHANNEL_OVERRIDES = {
  'imageGeneration.startValidatedShortChain':
    'image-generation:short-chain-start-validated',
  'projectContext.getGenerationReadiness':
    'project-context:generation-readiness',
  // ... 13 short-chain overrides + 3 project-context overrides
}
```

If you add a new operation whose derived name feels off, add it to
`WEB_RPC_CHANNEL_OVERRIDES`. **Do not** invent ad-hoc channel names
inside the renderer — the override map is the single source of truth.

## Adding a new operation

1. Register the operation in `apps/web-runtime/src/current-operation-graph.ts`
   via `createCurrentBusinessOperations(...)` (or a sibling graph).
   Each operation is `(args) => Promise<unknown>`.
2. Decide whether the renderer needs a channel override (almost never
   needed; auto-derivation covers most cases).
3. If the operation emits progress, call `rpcServer.emit(channel, payload)`
   from `node-runtime-host.ts`. The four channels listed above are
   the only ones currently emitted.
4. Add a smoke test under `apps/web-runtime/tests/` that exercises the
   new operation through the RPC endpoint, or extend an existing one.

## Common failure modes

| Symptom | Likely cause |
|---|---|
| 403 WEB_RPC_ORIGIN_REJECTED | `MASTERPIECE_WEB_RENDERER_ORIGIN` (or `MASTERPIECE_WEB_ALLOWED_ORIGIN`) is not set to the URL the browser is using. |
| SSE connection stays "pending" forever | reverse proxy is buffering the response. Disable buffering for `/_masterpiece/events`. |
| 500 WEB_RPC_ARGS_REQUIRED | request body is not `{ args: [...] }`. |
| 500 WEB_RPC_BODY_TOO_LARGE | body exceeded the 10 MiB / 64 MiB cap for that channel. |
| RPC hang with no response | the Node host is not running, or the reverse proxy is dropping `/_masterpiece/rpc/*`. |

## Audit references

- `docs/baseline/runtime-reconciliation-2026-08-25.md` (item #6.6)
- `CURRENT_BASELINE.md` §1 (runtime baseline; `web-runtime` is now the
  Primary Runtime backend host)