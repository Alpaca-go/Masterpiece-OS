// P3-B2 — Packaging Workspace RPC operations.
//
// Capability boundary:
//   Thin RPC layer that maps the Web `window.masterpiece.packaging.*`
//   channel to the P3-A frozen Packaging Workspace Application
//   Service (per P3-A freeze report §20/21). The operations layer
//   is the SOLE bridge between the Web client and the Workspace
//   service — the Web feature MUST NOT instantiate the Workspace
//   service locally (P3-A freeze report §3 / §6 / §21).
//
// Stop conditions honoured (P3-A spec §55 + P3-A freeze report
// §20/21):
//   - STOP-P3-A-01: the operations layer does NOT deep-import the
//     P2 frozen packaging internals; the Workspace service is
//     the sole boundary and is the only thing this file touches.
//   - STOP-P3-A-02: the operations layer does NOT construct the
//     Provider payload; the payload is opaque to the Workspace
//     service.
//   - STOP-P3-A-03: the operations layer does NOT read credential
//     secrets; the `readCredentials` adapter is owned by the
//     existing Shared Core credential store. The operations
//     layer receives the credentials ONLY to inject them as the
//     P2 frozen `executePackagingGeneration` deps seam.
//   - STOP-P3-A-04: the operations layer does NOT modify the P2
//     frozen semantic contract.
//   - STOP-P3-A-07: the operations layer delegates stale / state
//     transitions to the Workspace service (which is the sole
//     owner of the canonical state machine).
//   - STOP-P3-A-09: the operations layer does NOT call the
//     Provider network directly; the Workspace service calls the
//     P2 frozen pipeline which is the only Provider entry point.
//
// Public RPC surface (7 channels):
//   packaging:create-session
//   packaging:get-view
//   packaging:update-intent
//   packaging:set-truth-snapshot
//   packaging:prepare-generation
//   packaging:execute-generation
//   packaging:reset-preparation
//
// What the operations layer NEVER returns over RPC:
//   - The raw Workspace service instance.
//   - The raw session (only the frozen UI-safe view).
//   - The preparedResult (only the prepared view summary).
//   - The executionResult (only the execution view summary).
//   - Any Provider request / response body.
//   - Any credential / Authorization / Bearer header.
//   - Any absolute filesystem path.

const PACKAGING_OPERATION_IDS = Object.freeze({
  CREATE_SESSION: 'packaging:create-session',
  GET_VIEW: 'packaging:get-view',
  UPDATE_INTENT: 'packaging:update-intent',
  SET_TRUTH_SNAPSHOT: 'packaging:set-truth-snapshot',
  PREPARE_GENERATION: 'packaging:prepare-generation',
  EXECUTE_GENERATION: 'packaging:execute-generation',
  RESET_PREPARATION: 'packaging:reset-preparation',
});

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function asString(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

// Build the P2 frozen `executePackagingGeneration` deps from the
// canonical credential + settings authorities. The credentials
// NEVER leak to the Web UI — the Web UI only sends
// `providerModelId` + `apiProfileId`; the ops layer resolves the
// matching profile and reads the credential on the user's behalf.
async function buildExecutionDeps({
  service,
  sessionId,
  callerApiProfileId,
  callerProviderModelId,
  readSettings,
  readCredentials,
}) {
  const view = service.getView(sessionId);
  const intent = view && isPlainObject(view.intent) ? view.intent : null;
  const apiProfileId = asString(callerApiProfileId) || (intent ? asString(intent.apiProfileId) : '');
  if (!apiProfileId) {
    const err = new Error(
      'PACKAGING_WORKSPACE_EXECUTE_REJECTED: missing apiProfileId (caller must supply one, or set intent.apiProfileId first)'
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    throw err;
  }
  const settings = await readSettings();
  const profile = (settings?.profiles || []).find((p) => p && p.id === apiProfileId);
  if (!profile) {
    const err = new Error(
      `PACKAGING_WORKSPACE_EXECUTE_REJECTED: apiProfileId not found in current settings: ${apiProfileId}`
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    throw err;
  }
  let credentials;
  try {
    credentials = await readCredentials(apiProfileId);
  } catch (cause) {
    // Re-throw the credential-store failure with the
    // canonical execute-rejected code so the UI's
    // error tile surfaces a recoverable diagnostic.
    const err = new Error(
      `PACKAGING_WORKSPACE_EXECUTE_REJECTED: readCredentials failed: ${cause?.message ?? 'unknown'}`
    );
    err.code = 'PACKAGING_WORKSPACE_EXECUTE_REJECTED';
    err.cause = cause;
    throw err;
  }
  const providerModelId = asString(callerProviderModelId)
    || (intent ? asString(intent.providerModelId) : '')
    || asString(profile.modelId);
  if (!providerModelId) {
    const err = new Error(
      'EXECUTION_PROVIDER_MODEL_REQUIRED: profile has no modelId and caller did not supply providerModelId'
    );
    err.code = 'EXECUTION_PROVIDER_MODEL_REQUIRED';
    throw err;
  }
  // P2 frozen `executePackagingGeneration` deps contract.
  // The Web UI never sees these values; they stay on the
  // runtime side. (P3-A freeze report §10.5 P2 frozen gate.)
  return {
    apiKey: asString(credentials?.apiKey),
    baseUrl: asString(credentials?.baseUrl),
    providerModelId,
    apiProfileId,
    protocol: asString(profile.protocol),
    provider: asString(profile.provider),
    region: asString(credentials?.region),
  };
}

export function createPackagingOperations({
  service,
  readSettings,
  readCredentials,
  resolveTruthSnapshot,
}) {
  if (!service) {
    throw new Error('PACKAGING_OPERATIONS_SERVICE_REQUIRED');
  }
  if (typeof readSettings !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_READ_SETTINGS_REQUIRED');
  }
  if (typeof readCredentials !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_READ_CREDENTIALS_REQUIRED');
  }
  if (typeof resolveTruthSnapshot !== 'function') {
    throw new Error('PACKAGING_OPERATIONS_RESOLVE_TRUTH_SNAPSHOT_REQUIRED');
  }

  function getViewOrThrow(sessionId) {
    if (typeof sessionId !== 'string' || !sessionId) {
      const err = new Error('PACKAGING_OPERATIONS_INVALID_SESSION_ID: sessionId is required');
      err.code = 'PACKAGING_OPERATIONS_INVALID_SESSION_ID';
      throw err;
    }
    return service.getView(sessionId);
  }

  const operations = {
    [PACKAGING_OPERATION_IDS.CREATE_SESSION]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: createSession input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const projectId = asString(input.projectId);
      if (!projectId) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: projectId is required');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      // The Web side MAY supply a truthSnapshot (e.g. when
      // re-opening a project after a Locked-Asset change). The
      // canonical authority is the runtime-side `resolveTruthSnapshot`
      // (which reads the project's Locked-Assets + project-store
      // + analysis context). When the Web side does NOT supply
      // a snapshot, the runtime resolves it. This is the
      // runtime-side authority boundary; the Web side never
      // fabricates Locked Assets.
      let truthSnapshot = isPlainObject(input.truthSnapshot) ? input.truthSnapshot : null;
      if (!truthSnapshot) {
        truthSnapshot = await resolveTruthSnapshot(projectId);
      }
      // P3-A frozen contract: `service.createSession` returns
      // the FROZEN raw session (not the sessionId). The
      // sessionId lives on the session's `sessionId` field.
      // The operations layer is the bridge that maps this
      // internal shape to the safe Web-facing
      // `{ sessionId, view }` envelope. The raw session is
      // NEVER returned to the Web.
      const frozenSession = service.createSession({
        projectId,
        truthSnapshot: truthSnapshot || {},
        initialIntent: isPlainObject(input.initialIntent) ? input.initialIntent : null,
      });
      const sessionId = asString(frozenSession?.sessionId);
      if (!sessionId) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_SESSION: createSession returned no sessionId');
        err.code = 'PACKAGING_OPERATIONS_INVALID_SESSION';
        throw err;
      }
      return Object.freeze({
        sessionId,
        view: service.getView(sessionId),
      });
    },

    [PACKAGING_OPERATION_IDS.GET_VIEW]: async function (_context, sessionId) {
      return Object.freeze(getViewOrThrow(sessionId));
    },

    [PACKAGING_OPERATION_IDS.UPDATE_INTENT]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: updateIntent input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.updateIntent(sessionId, isPlainObject(input.patch) ? input.patch : {});
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.SET_TRUTH_SNAPSHOT]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: setTruthSnapshot input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.setTruthSnapshot(
        sessionId,
        isPlainObject(input.truthSnapshot) ? input.truthSnapshot : {}
      );
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.PREPARE_GENERATION]: async function (_context, sessionId) {
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.prepareGeneration(sessionId);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.EXECUTE_GENERATION]: async function (_context, input) {
      if (!isPlainObject(input)) {
        const err = new Error('PACKAGING_OPERATIONS_INVALID_INPUT: executeGeneration input must be an object');
        err.code = 'PACKAGING_OPERATIONS_INVALID_INPUT';
        throw err;
      }
      const sessionId = asString(input.sessionId);
      getViewOrThrow(sessionId); // fail-closed: unknown session
      const deps = await buildExecutionDeps({
        service,
        sessionId,
        callerApiProfileId: input.apiProfileId,
        callerProviderModelId: input.providerModelId,
        readSettings,
        readCredentials,
      });
      await service.executeGeneration(sessionId, deps);
      return Object.freeze({ view: service.getView(sessionId) });
    },

    [PACKAGING_OPERATION_IDS.RESET_PREPARATION]: async function (_context, sessionId) {
      getViewOrThrow(sessionId); // fail-closed: unknown session
      service.resetPreparation(sessionId);
      return Object.freeze({ view: service.getView(sessionId) });
    },
  };

  return Object.freeze({
    operations: Object.freeze(operations),
    ids: PACKAGING_OPERATION_IDS,
  });
}

export const PACKAGING_OPERATION_VERSION = '1.0.0';
