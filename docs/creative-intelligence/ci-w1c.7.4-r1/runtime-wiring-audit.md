# CI-W1C.7.4-R1 — Runtime Wiring Audit

> **Spec section:** PART D / PART E
> **Date:** 2026-08-20

## Goal

Close the production-runtime wiring gap:
1. The production path must NOT require the test/user to manually inject
   `planningStrategicEvidence` into `compileStrategicReasoningContext`.
2. The runtime caller (`apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs`,
   and any future production caller) must auto-load the planning evidence from
   the project.

## Implementation

### 1. New: `packages/runtime-core/src/application/planning-strategic-evidence-loader.ts`

Thin production wrapper around the Creative Intelligence artifact builder.

```ts
export async function loadPlanningStrategicEvidenceForProject(
  store: Pick<ProjectStore, 'get' | 'paths'>,
  projectId: string
): Promise<PlanningStrategicEvidenceArtifact | null>;

export async function loadPlanningStrategicEvidenceFromContext(
  ctx: { project: ProjectRecord; projectRoot: string }
): Promise<PlanningStrategicEvidenceArtifact | null>;
```

The loader:
- Resolves the project root via the project store.
- Reads `project.planningBriefFiles[]`.
- Hands the briefs to `buildPlanningStrategicEvidenceArtifact`.
- Returns the artifact, or `null` if no briefs are registered.

Hard rules (PART D / PART H):
- FAIL CLOSED on missing files (`PLANNING-BRIEF-MISSING`).
- FAIL CLOSED on content-hash mismatch
  (`PLANNING-BRIEF-CONTENT-HASH-MISMATCH`).
- FAIL CLOSED on parse failure
  (`PLANNING-BRIEF-PARSE-FAILED`, `PLANNING-PARSER-UNAVAILABLE`).
- If no briefs registered, return `null` (no artifact, no fabrication).
- NEVER re-derive the canonical claim payload.

### 2. Modified: `creative-reasoning-service.ts`

Two changes:
1. `CreativeReasoningInput.planningStrategicEvidence?: PlanningStrategicClaim[]`
   is added.
2. `compileStrategicReasoningContext` calls in `run` and `buildStagePrompt`
   forward the cached `planningStrategicEvidence` (defaulted to `[]`).

```ts
export interface CreativeReasoningInput {
  // ...
  planningStrategicEvidence?: PlanningStrategicClaim[];
}

deps._lastPlanningEvidence = input.planningStrategicEvidence ?? [];

// In run:
const synthesisCtx = compileStrategicReasoningContext({
  projectId: input.projectId,
  truth: input.truth,
  needs: input.needs,
  evidence: input.evidence,
  planningStrategicEvidence: input.planningStrategicEvidence ?? []
});

// In buildStagePrompt:
const ctx = compileStrategicReasoningContext({
  projectId: args.projectId,
  truth: deps._lastTruth!,
  needs: deps._lastNeeds!,
  evidence: deps._lastEvidence!,
  planningStrategicEvidence: deps._lastPlanningEvidence ?? []
});
```

### 3. Modified: `apps/web-runtime/scripts/ci-w1c/live-qualify-g01.mjs`

The live qualifier now:
1. Reads `project.json` to obtain the `ProjectRecord` (which carries
   `planningBriefFiles`).
2. Calls `loadPlanningStrategicEvidenceFromContext` with the project record +
   project root.
3. Passes `artifact.claims` to `service.run({ planningStrategicEvidence })`.

```js
if (real.projectRecord && Array.isArray(real.projectRecord.planningBriefFiles) && real.projectRecord.planningBriefFiles.length > 0) {
  const { loadPlanningStrategicEvidenceFromContext } = await import(
    pathToFileURL(path.join(repoRoot, 'packages/runtime-core/src/application/planning-strategic-evidence-loader.ts')).href
  );
  const artifact = await loadPlanningStrategicEvidenceFromContext({
    project: real.projectRecord,
    projectRoot: real.projectDir
  });
  planningClaims = artifact.claims;
  // ...
}
// ...
result = await service.run({
  // ...
  planningStrategicEvidence: planningClaims
});
```

The script does NOT hand-construct `planningStrategicEvidence`. The claims
are derived from `project.planningBriefFiles[]`.

## Tests

- `tests/packages/creative-intelligence/ci-7.4-r1/rrw-runtime-wiring.test.js`
  covers RRW-01..07.

```text
✔ RRW-01: production loader reads project.planningBriefFiles and returns a non-null artifact
✔ RRW-02: loader forwards to buildPlanningStrategicEvidenceArtifact (claim keys are valid)
✔ RRW-03: creative-reasoning service accepts planningStrategicEvidence and forwards to compileStrategicReasoningContext
✔ RRW-04: a project without planning briefs returns null from the loader; compileStrategicReasoningContext handles empty
✔ RRW-05: loader fails closed on content-hash mismatch
✔ RRW-06: loader fails closed when the on-disk file is missing
✔ RRW-07: production caller (loader → service) does not require manually-constructed planning claims
```

7 / 7 PASS.

## Acceptance

✅ Production runtime auto-loads planning evidence. No manual claim injection.
No fake claims. Compiled context includes the planning section when briefs
are registered; empty array (and no PLANNING STRATEGIC EVIDENCE section
content) when not.
