export const OPERATION_REGISTRY_ID = 'shared-operation-registry@1.0.0';

function assertOperationId(operationId) {
  if (typeof operationId !== 'string' || !/^[a-z0-9-]+:[a-z0-9-]+$/u.test(operationId)) {
    throw new Error(`RUNTIME_OPERATION_ID_INVALID:${String(operationId)}`);
  }
}

export function createOperationRegistry() {
  const handlers = new Map();

  function register(operationId, handler) {
    assertOperationId(operationId);
    if (typeof handler !== 'function') throw new Error(`RUNTIME_OPERATION_HANDLER_INVALID:${operationId}`);
    if (handlers.has(operationId)) throw new Error(`RUNTIME_OPERATION_DUPLICATE:${operationId}`);
    handlers.set(operationId, handler);
    return () => handlers.delete(operationId);
  }

  function registerAll(entries) {
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
      throw new Error('RUNTIME_OPERATION_ENTRIES_INVALID');
    }
    const unregister = [];
    try {
      for (const [operationId, handler] of Object.entries(entries)) {
        unregister.push(register(operationId, handler));
      }
    } catch (error) {
      for (const dispose of unregister.reverse()) dispose();
      throw error;
    }
    return () => {
      for (const dispose of unregister.reverse()) dispose();
    };
  }

  async function execute(operationId, args = [], context = {}) {
    assertOperationId(operationId);
    if (!Array.isArray(args)) throw new Error(`RUNTIME_OPERATION_ARGS_INVALID:${operationId}`);
    const handler = handlers.get(operationId);
    if (!handler) throw new Error(`RUNTIME_OPERATION_NOT_FOUND:${operationId}`);
    return handler(context, ...args);
  }

  return Object.freeze({
    id: OPERATION_REGISTRY_ID,
    register,
    registerAll,
    execute,
    has: (operationId) => handlers.has(operationId),
    list: () => Object.freeze([...handlers.keys()].sort()),
    get size() { return handlers.size; },
  });
}

