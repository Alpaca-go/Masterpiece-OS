// P3-B2 — Packaging Workspace RPC client adapter.
//
// This module is a thin RPC client that talks to the runtime-side
// Packaging Workspace service via `window.masterpiece.packaging.*`.
// It is the SOLE bridge between the Web UI and the frozen P3-A
// Workspace application service (per P3-A freeze report §20/21).
//
// Hard prohibitions (P3-A freeze report §20/21 + this file's
// P3-B2 contract):
//   - The Web UI does NOT call `createPackagingWorkspaceService`.
//     The Workspace service lives on the runtime side and is
//     owned by `runtime-core/src/application/runtime-services.ts`.
//   - The Web UI does NOT inject test stubs. There is no
//     `if (RPC available) use RPC else fall back to local fake
//     service` dual-path; production is RPC-only.
//   - The Web UI does NOT hold raw session / preparedResult /
//     executionResult / Provider payload / credential / absolute
//     path. The RPC responses carry the frozen UI-safe view
//     model only.
//   - The Web UI does NOT read or write Locked Assets / truth
//     snapshot authority directly. Locked Assets are populated
//     by the runtime-side `Locked-Assets-Service` during
//     `createSession` (truth surface is resolved on the
//     runtime side; the Web side only sends the safe canonical
//     truth snapshot projection if it has one).
//   - The Web UI does NOT call `setTruthSnapshot` from a
//     fabricated truth surface. Callers may refresh the
//     snapshot, but the canonical truth authority is the
//     runtime-side `project-store` + `Locked-Assets-Service`
//     chain. The adapter does NOT auto-build a demo seed.
//
// P3-B1 stub removal: this file used to instantiate the
// Workspace service in-process and inject throwing stubs for
// `preparePackagingGeneration` / `executePackagingGeneration`.
// Both are gone. P3-B2 production path is RPC-only.

import type {
  PackagingWorkspaceView,
  PackagingCreateSessionInput,
  PackagingCreateSessionResult,
  PackagingUpdateIntentInput,
  PackagingSetTruthSnapshotInput,
  PackagingExecutionInput,
  PackagingSessionMutationResult,
} from '@masterpiece/runtime-core/application-contracts.ts';

interface PackagingRuntimeApi {
  createSession(input: PackagingCreateSessionInput): Promise<PackagingCreateSessionResult>;
  getView(sessionId: string): Promise<PackagingWorkspaceView>;
  updateIntent(input: PackagingUpdateIntentInput): Promise<PackagingSessionMutationResult>;
  setTruthSnapshot(input: PackagingSetTruthSnapshotInput): Promise<PackagingSessionMutationResult>;
  prepareGeneration(sessionId: string): Promise<PackagingSessionMutationResult>;
  executeGeneration(input: PackagingExecutionInput): Promise<PackagingSessionMutationResult>;
  resetPreparation(sessionId: string): Promise<PackagingSessionMutationResult>;
}

function resolvePackagingApi(): PackagingRuntimeApi {
  if (typeof window === 'undefined' || !window.masterpiece) {
    throw new Error(
      'PACKAGING_RPC_UNAVAILABLE: window.masterpiece is not loaded. ' +
      'The Packaging Workspace requires the Shared Runtime RPC bridge.'
    );
  }
  const candidate = (window.masterpiece as unknown as { packaging?: PackagingRuntimeApi }).packaging;
  if (!candidate) {
    throw new Error(
      'PACKAGING_RPC_UNAVAILABLE: window.masterpiece.packaging namespace ' +
      'is not registered. The runtime may be running a build that predates P3-B2.'
    );
  }
  return candidate;
}

export interface PackagingClientSession {
  sessionId: string;
  view: PackagingWorkspaceView;
}

/**
 * Create a Packaging Workspace session via RPC and return the
 * session id + initial view. The runtime side resolves the
 * truth surface (Locked Assets + analysis context + project
 * identity) from the canonical authorities; the Web side does
 * not fabricate a truth seed.
 *
 * `input.truthSnapshot` is OPTIONAL. When supplied by the
 * caller, the runtime applies it via the canonical `setTruthSnapshot`
 * path (which goes through the P3-A fail-closed state machine).
 * When omitted, the runtime uses the canonical Locked-Assets
 * projection for the project — i.e. the same surface the
 * project page sees.
 */
export async function createPackagingSession(
  input: PackagingCreateSessionInput
): Promise<PackagingClientSession> {
  const api = resolvePackagingApi();
  if (!input || typeof input.projectId !== 'string' || !input.projectId) {
    throw new Error('PACKAGING_RPC_INVALID_INPUT: projectId is required');
  }
  const result = await api.createSession({
    projectId: input.projectId,
    truthSnapshot: input.truthSnapshot ?? null,
    initialIntent: input.initialIntent ?? null,
  });
  return { sessionId: result.sessionId, view: result.view };
}

export async function getPackagingView(sessionId: string): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  return api.getView(sessionId);
}

export async function updatePackagingIntent(
  sessionId: string,
  patch: Record<string, unknown>
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.updateIntent({ sessionId, patch });
  return result.view;
}

export async function setPackagingTruthSnapshot(
  sessionId: string,
  truthSnapshot: Record<string, unknown>
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.setTruthSnapshot({ sessionId, truthSnapshot });
  return result.view;
}

export async function preparePackagingGeneration(
  sessionId: string
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.prepareGeneration(sessionId);
  return result.view;
}

export async function executePackagingGeneration(
  input: PackagingExecutionInput
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.executeGeneration(input);
  return result.view;
}

export async function resetPackagingPreparation(
  sessionId: string
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.resetPreparation(sessionId);
  return result.view;
}

/**
 * Test-only: detect whether the packaging namespace is wired on
 * `window.masterpiece`. Production code should not need this
 * helper (calls fail loudly via `resolvePackagingApi`), but it
 * is useful in dev / smoke checks.
 */
export function isPackagingRuntimeAvailable(): boolean {
  if (typeof window === 'undefined' || !window.masterpiece) return false;
  return Boolean((window.masterpiece as unknown as { packaging?: unknown }).packaging);
}
