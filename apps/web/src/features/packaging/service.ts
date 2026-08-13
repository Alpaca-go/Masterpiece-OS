// P3-B1 — Packaging Workspace UI Shell (in-process service adapter).
//
// This module wires the P3-B1 UI shell to the P3-A public barrel
// (`@masterpiece/runtime-core`). P3-B1 is a UI SHELL ONLY:
//   - No real RPC binding (`window.masterpiece.packaging.*` is not
//     added in this commit — that is the P3-B2 sub-step).
//   - No prepare / execute wired to the real P2 generation pipeline.
//     `preparePackagingGeneration` / `executePackagingGeneration`
//     are injected as throwing stubs so any accidental call from
//     the shell produces a clear diagnostic instead of a silent
//     network call.
//   - The shell calls `createSession` once and re-reads `getView`
//     on every state transition. This is the only path the UI
//     uses; the shell NEVER reads the raw session / preparedResult
//     / executionResult (P3-A freeze report §13, §21).
//
// Architectural boundary (P3-A freeze report §20/21):
//   - The UI is the consumer; `@masterpiece/runtime-core` is the
//     sole authority. No deep-import of
//     `packages/image-generation-runtime/...`.
//   - No second state / stale / reference / precedence / locked-
//     asset authority is introduced here. The shell delegates to
//     the frozen P3-A view model.
//   - The truth snapshot used in P3-B1 is a local seed only —
//     the real upstream truth surface (Locked-Assets-Service +
//     project store) will be supplied by the P3-B2 RPC binding.

import {
  createPackagingWorkspaceService,
} from '@masterpiece/runtime-core';

export type PackagingShellService = ReturnType<typeof createPackagingWorkspaceService>;

export interface PackagingShellSession {
  service: PackagingShellService;
  sessionId: string;
}

const NOOP_STUB = () => {
  throw new Error(
    'P3-B1: real prepare/execute is not bound. ' +
    'The Packaging Workspace UI shell only renders the view model. ' +
    'The real RPC binding lands in a follow-up P3-B sub-step.'
  );
};

function buildSeedTruthSnapshot(): Record<string, unknown> {
  // A minimal Locked-Asset seed (matches the 7 canonical fields
  // described in P3-A freeze report §12). The shape is consumed
  // by `projectLockedAssetsForView` which strips non-canonical
  // keys defensively, so the exact field values can be safely
  // empty in P3-B1.
  return {
    lockedAssets: {
      brand: { name: '', locked: true },
      logo: { present: false, usageMode: 'reserved', locked: true },
      productIdentity: { name: '', locked: true },
      category: { name: '', locked: true },
      structure: { formFactor: '', locked: true },
      mandatoryCopy: { items: [], locked: true },
      confirmedComponents: { items: [], locked: true },
    },
    analysisContext: {
      detectedIndustry: '',
      detectedProjectName: '',
      confidence: 0,
    },
    projectIdentity: {
      projectId: '',
      projectName: '',
    },
  };
}

export function createPackagingShellSession(
  overrides: Partial<{
    projectId: string;
    sessionIdFactory: () => string;
    now: () => string;
  }> = {}
): PackagingShellSession {
  const projectId = overrides.projectId || 'pkg-shell-demo-project';
  const service = createPackagingWorkspaceService({
    preparePackagingGeneration: NOOP_STUB as never,
    executePackagingGeneration: NOOP_STUB as never,
    newSessionId: overrides.sessionIdFactory,
    now: overrides.now,
  });
  const sessionId = service.createSession({
    projectId,
    truthSnapshot: buildSeedTruthSnapshot(),
  });
  return { service, sessionId };
}
