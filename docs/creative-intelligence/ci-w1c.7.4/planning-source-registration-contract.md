# CI-W1C.7.4 — Planning Source Registration Contract

> **Mode**: Implementation phase · **HEAD**: 99b8344f (Documentation Tip)
> **Branch**: `feat/short-chain-simplified-ui`
> **Schema version**: `ci-w1c.7.4`
> **Status**: LOCKED for CI-W1C.7.4. Subject to revision in CI-W1C.7.5+.

## 1. Purpose

Defines how a human-authored **planning brief** is registered as a
positive strategic-context source on a project. The contract is
additive: it does NOT replace the existing `briefFiles: string[]`
field (which the VUC's `项目视觉上下文简报.md` uses). The new
registration lives in a parallel `planningBriefFiles: PlanningBriefRecord[]`
array on the project record (NOT applied in this phase; the new
artifact is built directly from registered `PlanningBriefRecord[]`
passed in by the caller — typically a future `registerPlanningBrief`
mutator in the runtime-services layer).

## 2. Supported file formats

| Extension | Support | Notes |
|---|:-:|---|
| `.pdf` | YES | runtime-core `parsePdf` (existing) |
| `.docx` | YES | runtime-core `parseDocx` (existing) |
| `.md` | YES | runtime-core `parseTextDocument` (existing) |
| `.markdown` | YES | runtime-core `parseTextDocument` (existing) |
| `.txt` | YES | runtime-core `parseTextDocument` (existing) |
| anything else | NO | refused with `PLANNING-BRIEF-UNSUPPORTED-EXT` |

**No OCR**. If a PDF has no extractable text layer, the file is
rejected at parse time. (This is consistent with the existing
`parseStrategyDocument` behavior.)

## 3. `PlanningBriefRecord` shape

```ts
interface PlanningBriefRecord {
  sourceId: string;        // "planning-brief:<projectId>:<contentHash[:16]>"
  filename: string;        // "qualification-planning-a.md"
  extension: string;       // ".md"
  relativePath: string;    // "planning-briefs/qualification-planning-a.md"
  sourceType: 'planning_document';
  contentHash: string;     // SHA-256 of LF-normalized full text
  characterCount: number;  // length of rawText
  registeredAt: string;    // ISO 8601
}
```

## 4. Storage rules

- The brief **file** lives on disk under
  `<projectDir>/planning-briefs/<sourceId>.txt` (or the
  filename-as-uploaded if the UI later wishes to preserve the
  user-given name).
- `project.json` carries the **metadata** only
  (filename, relativePath, contentHash, registeredAt). **No raw
  binary / base64** in `project.json`.
- The existing `briefFiles: string[]` field is **NOT** modified
  by this contract. The two streams stay disjoint.

## 5. Mutator contract (future runtime-services layer)

```
registerPlanningBrief(projectId, briefInput)
  → PlanningBriefRecord
  throws PLANNING-BRIEF-UNSUPPORTED-EXT on bad extension
  throws PLANNING-BRIEF-READ-FAILED on parse failure
  writes <projectDir>/planning-briefs/<sourceId>.<ext>
  updates project.planningBriefFiles[] (de-duplicated by sourceId)
  returns the persisted record
```

The mutator is NOT implemented in CI-W1C.7.4 (per spec PART B:
"reuse existing components; do not build new services unless
existing code is proven insufficient"). The contract is
documented so a follow-up phase can implement it without changing
the artifact shape.

## 6. Hash determinism

- `planningBriefContentHash(text)` is a canonical SHA-256 of the
  LF-normalized text (CR / CRLF / LF all collapse to LF).
- The hash is **64-character lowercase hex**.
- The same byte sequence always produces the same hash.
- The on-disk file is re-hashed at artifact-build time; mismatch
  raises `PLANNING-BRIEF-CONTENT-HASH-MISMATCH` and aborts the
  build (no silent fall-back).

## 7. Test coverage (PSR)

| Test | Verifies |
|---|---|
| PSR-01 | PLANNING_BRIEF_SUPPORTED_EXTENSIONS contents |
| PSR-02 | assertPlanningBriefFilename accepts supported / refuses unsupported |
| PSR-03 | buildPlanningBriefSourceId is stable and well-formed |
| PSR-04 | planningBriefContentHash is LF-normalized SHA-256 |
| PSR-05 | buildPlanningBriefRecord produces a valid record |
| PSR-06 | buildPlanningBriefRecord refuses unsupported extensions |

All 6 PSR tests PASS on the current Implementation HEAD.
