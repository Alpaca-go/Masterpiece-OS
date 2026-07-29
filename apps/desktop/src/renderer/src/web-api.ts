import type { DesktopApi } from '../../shared/types';

type ProgressCallback = (payload: unknown) => void;

const namespaces = new Map<string, unknown>();
const subscriptions = new Map<string, Set<ProgressCallback>>();
let eventSource: EventSource | null = null;

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Desktop preload methods normally map to IPC channels by kebab-casing the
 * namespace and method. Keep the exceptions explicit here instead of trying to
 * infer semantic channel aliases such as `compileVNext -> vnext-compile`.
 */
export const WEB_RPC_CHANNEL_OVERRIDES: Readonly<Record<string, string>> = Object.freeze({
  'imageGeneration.compileVNext': 'image-generation:vnext-compile',
  'imageGeneration.getVNextOptions': 'image-generation:vnext-options',
  'imageGeneration.startVNext': 'image-generation:vnext-start',
  'imageGeneration.startValidatedVNext': 'image-generation:vnext-start-validated',
  'imageGeneration.getVNextSession': 'image-generation:vnext-session',
  'imageGeneration.confirmVNextDirection': 'image-generation:vnext-confirm-direction',
  'imageGeneration.continueVNextSameType': 'image-generation:vnext-continue-same-type',
  'imageGeneration.saveVNextProjectPromptAsset': 'image-generation:vnext-save-prompt-asset',
  'projectContext.getVNext': 'project-context:get-vnext',
  'projectContext.rebuildVNext': 'project-context:rebuild-vnext'
});

export function resolveWebRpcChannel(namespace: string, method: string): string {
  return WEB_RPC_CHANNEL_OVERRIDES[`${namespace}.${method}`]
    ?? `${kebab(namespace)}:${kebab(method)}`;
}

function ensureEventSource(): EventSource {
  if (eventSource) return eventSource;
  eventSource = new EventSource('/_masterpiece/events');
  for (const channel of subscriptions.keys()) attachEventListener(channel);
  return eventSource;
}

function attachEventListener(channel: string): void {
  const source = eventSource;
  if (!source) return;
  source.addEventListener(channel, (event) => {
    const payload = JSON.parse((event as MessageEvent<string>).data) as unknown;
    for (const callback of subscriptions.get(channel) ?? []) callback(payload);
  });
}

function subscribe(channel: string, callback: ProgressCallback): () => void {
  let callbacks = subscriptions.get(channel);
  if (!callbacks) {
    callbacks = new Set();
    subscriptions.set(channel, callbacks);
    ensureEventSource();
    attachEventListener(channel);
  }
  callbacks.add(callback);
  return () => callbacks?.delete(callback);
}

async function invoke(channel: string, args: unknown[]): Promise<unknown> {
  const response = await fetch(`/_masterpiece/rpc/${encodeURIComponent(channel)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ args })
  });
  const body = await response.json() as { result?: unknown; error?: string };
  if (!response.ok) throw new Error(body.error || `网页后台请求失败（HTTP ${response.status}）`);
  return body.result;
}

function eventChannel(namespace: string, method: string): string | null {
  if (method === 'onProgress') return `${kebab(namespace)}:progress`;
  if (namespace === 'imageGeneration' && method === 'onRunUpdated') {
    return 'image-generation:run-updated';
  }
  return null;
}

function namespaceProxy(namespace: string): unknown {
  const cached = namespaces.get(namespace);
  if (cached) return cached;
  const proxy = new Proxy({}, {
    get(_target, property) {
      const method = String(property);
      if (namespace === 'files' && method === 'getPathForFile') {
        return () => '';
      }
      const progressEvent = eventChannel(namespace, method);
      if (progressEvent) {
        return (callback: ProgressCallback) => subscribe(progressEvent, callback);
      }
      const channel = resolveWebRpcChannel(namespace, method);
      return (...args: unknown[]) => invoke(channel, args);
    }
  });
  namespaces.set(namespace, proxy);
  return proxy;
}

export function createWebDesktopApi(): DesktopApi {
  return new Proxy({}, {
    get(_target, property) {
      return namespaceProxy(String(property));
    }
  }) as DesktopApi;
}
