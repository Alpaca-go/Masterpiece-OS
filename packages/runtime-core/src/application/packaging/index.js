// P3-A2 — Packaging Workspace Application Layer (public surface).
//
// This module re-exports the public API of the P3-A2 Packaging
// Workspace Application Layer. Consumers (the future P3-B UI,
// P3-A architecture guards, and external tests) should import
// from this surface only.
//
// Capability boundary:
//   - The Workspace layer is the SOLE owner of the
//     P3 Packaging Workspace Application API (5 functions:
//     createSession / updateIntent / prepareGeneration /
//     executeGeneration / resetPreparation + getView).
//   - The Workspace layer is NOT the owner of the P2 frozen
//     packaging semantic modules. P3-A spec §43 forbids the
//     UI from deep-importing them; this barrel makes that
//     possible by exposing the Workspace layer's own API
//     surface.

export {
  PACKAGING_WORKSPACE_SERVICE_VERSION,
  PACKAGING_WORKSPACE_STATUS,
  PACKAGING_WORKSPACE_STATUS_LABELS,
  PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION,
  PACKAGING_WORKSPACE_VIEW_MODEL_VERSION,
  PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION,
  PACKAGING_GENERATION_SERVICE_VERSION,
  PACKAGING_GENERATION_MODES,
  PACKAGING_SHOT_CONTRACT_IDS,
  PACKAGING_REFERENCE_ROLES,
  STALE_REASON,
  createPackagingWorkspaceService,
  validateReferenceAssignment,
  projectReferenceAssignmentsToPolicy,
  projectLockedAssetsForView,
  computeLockedAssetsFingerprint,
  projectPackagingWorkspaceView,
  getPackagingGenerationServiceFingerprint,
} from './workspace-service.js';

export {
  PACKAGING_WORKSPACE_INTENT_VERSION,
  PACKAGING_WORKSPACE_INTENT_FIELDS,
  createDefaultPackagingIntent,
  validatePackagingIntent,
  packagingIntentsEqual,
  computeTruthFingerprint,
  detectStaleChange,
} from './intent-schema.js';

export {
  PACKAGING_WORKSPACE_STATE_MACHINE_VERSION,
  createInitialSessionState,
  transitionSession,
  isExecuteAllowed,
  isIntentEditAllowed,
  isPrepareAllowed,
  isResetAllowed,
  getPackagingWorkspaceStateMachineFingerprint,
} from './workspace-state.js';

export {
  PACKAGING_WORKSPACE_STALE_TRACKER_VERSION,
  computeStale,
  getPackagingStaleTrackerFingerprint,
} from './stale-tracker.js';

export {
  PACKAGING_WORKSPACE_REFERENCE_ASSIGNMENTS_VERSION as _REF_VERSION_DUP,
  getPackagingWorkspaceReferenceAssignmentsFingerprint,
  projectReferenceAssignmentForView,
} from './reference-assignments.js';

export {
  PACKAGING_WORKSPACE_LOCK_ASSETS_PROJECTION_VERSION as _LOCK_VERSION_DUP,
  getPackagingWorkspaceLockedAssetsProjectionFingerprint,
} from './lock-assets-projection.js';

export {
  PACKAGING_WORKSPACE_VIEW_MODEL_VERSION as _VIEW_VERSION_DUP,
  getPackagingWorkspaceViewModelFingerprint,
} from './view-model.js';
