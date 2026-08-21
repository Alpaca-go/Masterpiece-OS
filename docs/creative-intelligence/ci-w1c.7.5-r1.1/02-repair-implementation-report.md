# CI-W1C.7.5-R1.1 Repair Implementation Report

## Implemented repairs

### ESM projection

`document-context-to-planning-claims.ts` now uses the standard ESM import:

```ts
import { createHash } from 'node:crypto';
```

The projection is executed by NPE-11 under the real ESM module loader.

### Canonical structured coverage

`runCreativeReasoningForProject()` now calls the existing `computeStructuredExtractionCoverage()` with:

- structured claims for the selected planning source;
- the real `prepareDocumentSet()` chunks;
- the actual parsed planning-brief raw text.

The duplicated orchestrator threshold was removed. Consequently `characterCount`, `semanticTypeCount`, and `sourceChunkCoverage` all participate through the canonical function.

### Narrative-required fail-closed behavior

When canonical structured coverage is insufficient:

- missing narrative reasoner dependencies fail before Strategic with `Strategic=NOT_RUN`;
- base and repair failure throws `PLANNING_NARRATIVE_EXTRACTION_FAILED ... Strategic=NOT_RUN`;
- the insufficient structured artifact is never used as a silent continuation.

### Canonical repair primitive

`narrative-planning-extraction-runner.ts` imports and calls CI-3 `buildRepairMessages(previousText, validationErrors)`. Attempt metadata records attempt number, repair reason, finish status, input/output characters, latency, and validation errors. Final failure exposes the attempt records on the canonical error object.

### Hybrid merge contract

The implementation and comments now agree:

- exact `claimId` collision: structured wins;
- same key + Unicode-NFC/trim-normalized value + source document: higher confidence wins;
- equal confidence: structured wins;
- different content: both retained;
- unknown narrative source document: dropped.

No case folding, fuzzy matching, embeddings, or semantic similarity was introduced.

### Qualification script truthfulness

The script now states that it may call `loadPlanningStrategicEvidenceForProject()` only for the pre-call intake audit. Live reasoning closure remains `runCreativeReasoningForProject()`. A source-boundary comment forbids deriving or scanning the planning brief parent directory. The script was not run.

## Deferred by contract

- Canonical DVC evidence-to-chunk-id remapping.
- Multi-document narrative extraction.
- Any live qualification or image work.
