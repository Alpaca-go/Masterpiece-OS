// P3-B2/B3 — Packaging Workspace RPC client adapter.
//
// This module is a thin RPC client that talks to the runtime-side
// Packaging Workspace service via `window.masterpiece.packaging.*`.
// It is the SOLE bridge between the Web UI and the frozen P3-A
// Workspace application service (per P3-A freeze report §20/21).
//
// P3-B3 tightening: `setPackagingTruthSnapshot` is a refresh
// request that takes ONLY the sessionId. The runtime resolves
// the truth surface from the canonical authority
// (Locked-Assets-Service + project store + analysis context).
// The Web caller is NOT allowed to inject an arbitrary
// truthSnapshot — that would be cross-project truth authority override.
// See the P3-B3 contract (§11 + §12).
//
// Hard prohibitions (P3-A freeze report §20/21 + this file's
// P3-B3 contract):
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
//   - The Web UI does NOT send an arbitrary `truthSnapshot` to
//     `setPackagingTruthSnapshot`. The runtime resolves the
//     truth from the upstream authority; the Web only requests
//     a refresh of the session's bound project.
//   - The Web UI does NOT bypass the canonical role vocabulary
//     (PACKAGING_REFERENCE_ROLES) with a second role enum.
//   - The Web UI does NOT implement Reference precedence /
//     priority / winsOver. The P2 frozen authority is the
//     sole owner.

import type {
  PackagingWorkspaceView,
  PackagingCreateSessionInput,
  PackagingCreateSessionResult,
  PackagingUpdateIntentInput,
  PackagingSetTruthSnapshotInput,
  PackagingExecutionInput,
  PackagingSessionMutationResult,
  PackagingArtifactPreviewInput,
  PackagingArtifactPreviewResult,
} from '@masterpiece/runtime-core/application-contracts.ts';

interface PackagingRuntimeApi {
  createSession(input: PackagingCreateSessionInput): Promise<PackagingCreateSessionResult>;
  getView(sessionId: string): Promise<PackagingWorkspaceView>;
  updateIntent(input: PackagingUpdateIntentInput): Promise<PackagingSessionMutationResult>;
  setTruthSnapshot(input: PackagingSetTruthSnapshotInput): Promise<PackagingSessionMutationResult>;
  prepareGeneration(sessionId: string): Promise<PackagingSessionMutationResult>;
  executeGeneration(input: PackagingExecutionInput): Promise<PackagingSessionMutationResult>;
  resetPreparation(sessionId: string): Promise<PackagingSessionMutationResult>;
  getArtifactPreview(input: PackagingArtifactPreviewInput): Promise<PackagingArtifactPreviewResult>;
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
 * caller, the runtime applies it via the canonical
 * `setTruthSnapshot` path (which goes through the P3-A
 * fail-closed state machine). When omitted, the runtime uses
 * the canonical Locked-Assets projection for the project —
 * i.e. the same surface the project page sees.
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

/**
 * P3-B3 refresh request: the runtime re-resolves the truth
 * surface from the canonical authority (Locked-Assets-Service
 * + project store + analysis context) that owns the session's
 * projectId. The Web caller MUST NOT supply a truthSnapshot
 * payload — the runtime operations layer rejects it with
 * `PACKAGING_OPERATIONS_TRUTH_AUTHORITY_VIOLATION`.
 */
export async function refreshPackagingTruth(
  sessionId: string
): Promise<PackagingWorkspaceView> {
  const api = resolvePackagingApi();
  const result = await api.setTruthSnapshot({ sessionId });
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
 * P3-B5: identity-validated artifact preview read.
 *
 * The runtime enforces that:
 *   - `runId` equals the session's `view.execution.runId`.
 *   - `imageId` matches the canonical `image-NN` pattern.
 *   - the persisted artifact exists on disk; otherwise
 *     `result.preview` is `null` and the Web feature falls
 *     back to a placeholder.
 *
 * The Web feature MUST NOT call this RPC without a valid
 * `sessionId` (the runtime rejects unknown sessions
 * fail-closed). The RPC never returns an absolute path,
 * a Buffer, or a credential.
 */
export async function getPackagingArtifactPreview(
  input: PackagingArtifactPreviewInput
): Promise<PackagingArtifactPreviewResult> {
  const api = resolvePackagingApi();
  return api.getArtifactPreview(input);
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
