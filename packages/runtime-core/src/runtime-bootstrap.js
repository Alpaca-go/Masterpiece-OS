import { createOperationRegistry } from './operation-registry.js';

export const SHARED_RUNTIME_ID = 'shared-runtime@1.0.0';

export function createSharedRuntime(options = {}) {
  const registry = options.registry ?? createOperationRegistry();
  const disposers = [];
  let state = 'created';

  function registerOperations(entries) {
    if (state === 'disposed') throw new Error('SHARED_RUNTIME_DISPOSED');
    const unregister = registry.registerAll(entries);
    disposers.push(unregister);
    return unregister;
  }

  async function start() {
    if (state === 'disposed') throw new Error('SHARED_RUNTIME_DISPOSED');
    if (state === 'started') return;
    await options.onStart?.({ registry });
    state = 'started';
  }

  async function dispose() {
    if (state === 'disposed') return;
    for (const unregister of disposers.splice(0).reverse()) unregister();
    await options.onDispose?.();
    state = 'disposed';
  }

  return Object.freeze({
    id: SHARED_RUNTIME_ID,
    registry,
    registerOperations,
    start,
    dispose,
    get state() { return state; },
  });
}

