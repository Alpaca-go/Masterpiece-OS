# CI-W1C.7.4-R1 — Project Registration Closure

> **Spec section:** PART B / PART C
> **Date:** 2026-08-20

## Goal

Close the gap between CI-W1C.7.4's helper-only `buildPlanningBriefRecord()` and the
real Masterpiece project mutation path. The mutator must:

- Validate the planning-brief extension
- Reuse the existing `parseStrategyDocument` (no second parser)
- Compute contentHash (LF-normalized SHA-256)
- Compute a stable sourceId
- Persist the file safely under `<projectRoot>/planning-briefs/<hash>.<ext>`
- Update `project.planningBriefFiles[]` additively
- Dedupe by contentHash (idempotent)
- Refuse path traversal / unsupported extensions
- Provide a removal path that drops the on-disk file + metadata row

## Implementation

### `ProjectRecord.planningBriefFiles` (additive)

`packages/runtime-core/src/application-contracts.ts` adds a new additive field
alongside the existing legacy `briefFiles` (visual-context auto-detect). The
field type is a structural subset of the Creative Intelligence
`PlanningBriefRecord` to keep `application-contracts.ts` free of cross-package
runtime imports that would pull creative-intelligence into the apps/web
typecheck graph.

```ts
export interface ProjectPlanningBriefRecord {
  sourceId: string;
  filename: string;
  extension: string;
  relativePath: string;
  sourceType: 'planning_document';
  contentHash: string;
  characterCount: number;
  registeredAt: string;
}

export interface ProjectRecord {
  // ...
  planningBriefFiles?: ProjectPlanningBriefRecord[];
  // ...
}
```

### Mutator surface (project-store.ts)

Three new functions are exposed from `createProjectStore`:

```ts
async function registerPlanningBriefFromPath(input: {
  projectId: string;
  sourcePath: string;
  displayFilename?: string;
}): Promise<ProjectPlanningBriefRecord>;

async function registerPlanningBriefFromBytes(input: {
  projectId: string;
  bytes: Buffer;
  displayFilename: string;
}): Promise<ProjectPlanningBriefRecord>;

async function removePlanningBrief(projectId: string, sourceId: string): Promise<ProjectRecord>;

async function listPlanningBriefs(projectId: string): Promise<ProjectPlanningBriefRecord[]>;
```

### Steps (registerPlanningBriefFromPath)

1. Validate the project exists (`rootForId`).
2. Validate the source file exists + extension is supported
   (`assertPlanningBriefFilename`).
3. Call `parseStrategyDocument` (existing runtime-core parser). Reuse, no
   duplicate parser.
4. Compute `contentHash = planningBriefContentHash(parsed.rawText)` (LF-normalized).
5. Compute `sourceId = buildPlanningBriefSourceId(projectId, contentHash)`.
6. Dedupe: if the project already has a record with this sourceId, return it
   (idempotent).
7. Persist: copy the source file to
   `<projectRoot>/planning-briefs/<contentHash[:16]>.<ext>` (path-traversal
   guard via `assertInside`).
8. Build the record via `buildPlanningBriefRecord` (creative-intelligence
   helper) and append it to `project.planningBriefFiles[]`.
9. Persist the project.
10. Return the record.

### Replacement behavior

Replacement (same filename, different content) is handled naturally: the new
content gets a new sourceId (content-hash-based) and a new on-disk file at the
new hash-named path. The old record stays in the list unless explicitly
removed.

### Removal behavior

`removePlanningBrief(projectId, sourceId)`:
- Looks up the record by sourceId.
- If absent, returns the project unchanged (idempotent).
- Otherwise deletes the on-disk file at `<root>/<relativePath>` and removes
  the metadata row.

## Tests

- `tests/packages/creative-intelligence/ci-7.4-r1/rpr-registration-persistence.test.js`
  covers RPR-01..07 + RPR-06b.

```text
✔ RPR-01: register writes the brief file into planning-briefs/ and returns a PlanningBriefRecord
✔ RPR-02: register updates project.planningBriefFiles metadata
✔ RPR-03: reload preserves the same record (sourceId + contentHash stable)
✔ RPR-04: duplicate same content dedupes (same sourceId returned, no second file)
✔ RPR-05: changed content invalidates identity (new sourceId + new contentHash)
✔ RPR-06: register refuses a non-existent source path with PLANNING-BRIEF-SOURCE-MISSING
✔ RPR-06b: register refuses an unsupported extension
✔ RPR-07: removePlanningBrief deletes the on-disk file + drops the metadata row
```

8 / 8 PASS.

## Acceptance

✅ Real project mutation: file is persisted to `<root>/planning-briefs/`,
metadata is updated, reload preserves the record, dedupe works, replacement
works, removal invalidates derived state.
