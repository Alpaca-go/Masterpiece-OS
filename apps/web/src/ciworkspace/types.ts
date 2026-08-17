// CI-W1B: Web-side type re-exports + view-model projections.
//
// The Web side NEVER imports from @masterpiece/creative-intelligence.
// It only imports the structural types from @masterpiece/runtime-core
// application-contracts (which the CI package re-exports to runtime
// via the same `as` interface the existing document-context chain uses).
//
// This file is a thin type re-export module that:
//   1. Brings the CI runtime contracts into the Web component tree as
//      a single named entry point (so review is easier).
//   2. Defines the Web-only view-model projections used by the
//      controller and component (Stage, RunLifecycle, etc).
//
// No value imports from the CI package are allowed. The runtime
// side carries the CI semantic types.

import type {
  CreativeIntelligenceRun as CiRun,
  CreativeIntelligenceRunStatus as CiRunStatus,
  CreativeIntelligenceWorkspaceView as CiWorkspaceView,
  CreativeIntelligenceFactReview as CiFactReview,
  CreativeIntelligenceFactItem as CiFactItem,
  CreativeIntelligenceProgress as CiProgress,
  StartCreativeIntelligenceInput as CiStartInput,
  SelectDirectionActionInput as CiSelectAction
} from '@masterpiece/runtime-core/application-contracts.ts';

export type Run = CiRun;
export type RunStatus = CiRunStatus;
export type WorkspaceView = CiWorkspaceView;
export type FactReview = CiFactReview;
export type FactItem = CiFactItem;
export type Progress = CiProgress;
export type StartInput = CiStartInput;
export type SelectAction = CiSelectAction;

// ---------------------------------------------------------------------------
// Stage Rail — 9 stages the workspace surfaces (Spec §4).
// The run.status value is mapped to the active stage by the controller.
// ---------------------------------------------------------------------------

export const STAGES = [
  { id: '01-input', label: 'Input', hint: '文档 + API profile' },
  { id: '02-facts', label: 'Facts', hint: '人工确认 (Checkpoint A)' },
  { id: '03-understanding', label: 'Understanding', hint: 'Truth / Need / Insight / Opportunity' },
  { id: '04-concepts', label: 'Concepts', hint: '战略概念候选' },
  { id: '05-directions', label: 'Directions', hint: '视觉方向候选' },
  { id: '06-evaluation', label: 'Evaluation', hint: '10 维评估 + 排名 + 推荐' },
  { id: '07-selection', label: 'Selection', hint: '人工选择 (Checkpoint B)' },
  { id: '08-canon', label: 'Canon', hint: 'Visual Canon + Anchor Contract' },
  { id: '09-translation', label: 'Translation', hint: 'Space + Packaging 翻译合同' }
] as const;

export type StageId = typeof STAGES[number]['id'];

// ---------------------------------------------------------------------------
// Run lifecycle — view-layer representation of the run for the list panel.
// The `selectable` and `resumable` flags are derived by the controller
// from run.status; the Web side does NOT compute them from raw state.
// ---------------------------------------------------------------------------

export interface RunLifecycle {
  run: Run;
  resumable: boolean;
  cancellable: boolean;
  removable: boolean;
  completable: boolean;
  activeStage: StageId;
  stageLabel: string;
}

// ---------------------------------------------------------------------------
// Selection UI state — view-layer only. `selectionProposal` represents an
// in-flight user action that has NOT yet been sent to the runtime; the
// component is required to confirm with a dialog before dispatch.
// ---------------------------------------------------------------------------

export type SelectionBlockedReason =
  | 'direction-blocked'
  | 'direction-not-found'
  | 'no-direction-set'
  | 'recommendation-auto-select';

export interface SelectionAvailability {
  selectable: boolean;
  reason: SelectionBlockedReason | null;
  isRecommended: boolean;
  isAlreadySelected: boolean;
  isBlocked: boolean;
}

export interface SelectionProposal {
  directionId: string;
  directionTitle: string;
  recommended: boolean;
  isRevision: boolean;
  previousDirectionId: string | null;
  newRevision: number;
  requiresConfirmation: boolean;
}

// ---------------------------------------------------------------------------
// Fact review state — view-layer mirror of the server-side fact review.
// The user's per-fact action lives here; the Web component never edits
// the server-side record until `confirmFacts` is called.
// ---------------------------------------------------------------------------

export type LocalFactAction = 'confirm' | 'edit' | 'remove' | 'unknown';

export interface LocalFactRow {
  field: string;
  value: unknown;
  authority: string;
  sourceRef: string | null;
  evidenceRefs: string[];
  userAction: LocalFactAction;
  editedValue: unknown;
  hasEdited: boolean;
}

// ---------------------------------------------------------------------------
// Direction referenceable concept IDs — derived view model for the
// P0 UI regression. The controller computes the set of concept ids
// that the user is allowed to "link" a Direction to; blocked Concepts
// are never part of this set. The component must never construct the
// reverse mapping on its own.
// ---------------------------------------------------------------------------

export interface ConceptReferenceability {
  referenceableConceptIds: Set<string>;
  blockedConceptIds: Set<string>;
  blockedDirectionIds: Set<string>;
}

// ---------------------------------------------------------------------------
// Trace step — single step in the unified Trace Drawer.
// Direction → Concept → Opportunity → Insight → Need → Fact → Evidence.
// All step kinds are flattened to one shape for stacking.
// ---------------------------------------------------------------------------

export type TraceStepKind = 'direction' | 'concept' | 'opportunity' | 'insight' | 'need' | 'fact' | 'evidence';

export interface TraceStep {
  kind: TraceStepKind;
  id: string;
  label: string;
  detail: string;
  status: 'valid' | 'provisional' | 'blocked' | 'unknown';
  refs: string[];
}
