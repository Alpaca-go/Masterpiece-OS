# CI-W1C.7.4-R2 — Project-Level Orchestration Contract

> **Spec section:** PART F
> **Date:** 2026-08-20

## Goal

Add a canonical runtime-application entrypoint that owns ALL IO +
orchestration for a project-level reasoning run. The
`CreativeReasoningService` must NOT read project.json or
project-store directly — runtime/application owns the lifecycle.

## Implementation

`packages/runtime-core/src/application/run-creative-reasoning-for-project.ts`

Exports:

```ts
// Function form (used by tests + custom callers).
export async function runCreativeReasoningForProject(
  input: RunCreativeReasoningForProjectInput,
  deps: RunCreativeReasoningForProjectDeps
): Promise<CreativeReasoningResult>;

// Factory form (production callers).
export function createRunCreativeReasoningForProject(deps: {
  projectStore: ...;
  outputRoot: (projectId: string) => Promise<string>;
  loadReasoningContext?: ...;
}): (input: RunCreativeReasoningForProjectInput) => Promise<CreativeReasoningResult>;

// Default production shadow-carrier loader.
export async function defaultLoadReasoningContext(
  project: ProjectRecord,
  projectRoot: string
): Promise<{
  truth: ProjectTruthModel;
  needs: NeedItem[];
  evidence: EvidenceLedgerSnapshot;
}>;

// Re-exports for unit tests + custom orchestrators.
export { loadPlanningStrategicEvidenceForProject, loadPlanningStrategicEvidenceFromContext };
```

## Input / Deps Surface

```ts
export interface RunCreativeReasoningForProjectInput {
  projectId: string;
  analysisProfileId?: string;
  useMock?: boolean;
  reasonerFactory?: ...;
  readCredentials?: ...;
  qualificationBudget?: ...;
}

export interface RunCreativeReasoningForProjectDeps {
  projectStore: Pick<ProjectStore, 'get' | 'paths' | 'remove'>;
  outputRoot: (projectId: string) => Promise<string>;
  loadReasoningContext: (
    project: ProjectRecord,
    projectRoot: string
  ) => Promise<{
    truth: ProjectTruthModel;
    needs: NeedItem[];
    evidence: EvidenceLedgerSnapshot;
  }>;
}
```

## Flow

1. `projectStore.get(projectId)` — load Project record.
2. `projectStore.paths(projectId)` — resolve projectRoot.
3. `deps.loadReasoningContext(project, projectRoot)` — load the
   three shadow carriers. The default loader reads from
   `<projectRoot>/project-context/creative-intelligence-shadow/`.
4. `loadPlanningStrategicEvidenceForProject(projectStore, projectId)` —
   load PlanningStrategicEvidence (R1 loader).
5. Construct `CreativeReasoningService` from
   `createCreativeReasoningService({ outputRoot })`.
6. Call `service.run({ projectId, truth, needs, evidence,
   planningStrategicEvidence, useMock, ... })`.
7. Return the service result.

The orchestrator never asks the test/user to construct any
carrier. The `planningStrategicEvidence` parameter exists in
`CreativeReasoningInput` (R1) but is ALWAYS derived by the
orchestrator — never hand-built.

## Why a `loadReasoningContext` callback?

The orchestrator's contract is:
- "Take a projectId, hand back a CreativeReasoningResult."

But "what is Truth / Need / Evidence" varies:
- Production: read from `<projectRoot>/project-context/creative-intelligence-shadow/`.
- Tests: read from a synthetic in-memory carrier.
- Future web-runtime bridge: read from the web's own project-state
  API.

The callback is the seam. Production uses `defaultLoadReasoningContext`;
tests inject their own. The orchestrator never duplicates IO logic.

## Why NOT call the service from the application service?

The existing `creative-intelligence-application-service.ts` runs the
full CI-4 / CI-5 / CI-6 pipeline (Truth assembly, DVC adaptation,
visual-evidence merging, etc.). It is **not** a strategic-synthesis
orchestrator — it has a different responsibility.

R2's `runCreativeReasoningForProject` is a separate, narrow
orchestrator specifically for the strategic-synthesis stage. It
can be reused by the application service in a future phase if
needed (without re-introducing the CI-4..6 / DVC / visual-evidence
chain).

## Tests

`tests/packages/creative-intelligence/ci-7.4-r2/orc-orchestration.test.js`
covers:

- ORC-01..03: orchestrator loads Project / Truth/Need/Evidence /
  PlanningStrategicEvidence via the injected deps.
- ORC-04..05: orchestrator forwards to the service + returns the result.
- ORC-06: the public signature has NO `planningStrategicEvidence` field
  — the orchestrator derives it from the loader.
- ORC-09: defaultLoadReasoningContext reads from the shadow dir.

8 / 8 PASS.
