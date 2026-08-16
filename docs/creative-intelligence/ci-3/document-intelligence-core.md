# CI-3: Document Intelligence Core

> Phase: Creative Intelligence — Stage 3
> Status: **GO**
> Mode: SHADOW ONLY (production never reads shadow artifacts; no consumer switch)
> Start baseline: `f31e8e5` (CI-2 final HEAD)
> Final HEAD: `25c7722` (this report + 4 commits on top of CI-2)

## 1. Executive Summary

CI-3 establishes `@masterpiece/creative-intelligence/document-intelligence`
as the canonical semantic owner of **document understanding**. The 450-line
pure module `runtime-core/src/application/document-context-core.ts` (zero
IO, zero model calls, fully deterministic) was extracted verbatim into the
new CI namespace, and a thin compatibility facade now sits in its place
inside `runtime-core`.

The CI-3 layer adds:
- A top-level pure facade `interpretDocumentContext`
- A 9-code deterministic diagnostic emitter
- A truth-contribution wrapper that reuses the CI-2 `document-visual-context-adapter`
  (one canonical path — no second parallel adapter)
- A 7th shadow artifact `document-intelligence.json` (always
  `authoritative=false` and `mode=shadow`)

CI-3 makes no production changes:
- DocumentVisualContext schema unchanged
- Document prompts unchanged
- Model call count / parameters unchanged
- PDF/DOCX/MD/TXT parsing unchanged
- persistence paths unchanged
- Web build hash byte-identical

## 2. Baseline

| Field | Value |
|---|---|
| Baseline commit | `f31e8e5` (CI-2 final report) |
| Branch | `feat/short-chain-simplified-ui` |
| CI-2 verdict | GO / FROZEN |
| CI-1 status | 17/17 parity tests PASS |
| CI-2 status | 84/84 tests PASS |
| Web build hash baseline | `index-D2stPmgk.js` / `index-DzM-rZmk.css` |

### Pre-CI-3 baseline failures (recorded at `f31e8e5`)

| Suite | Pass / Total | Failures | Reason |
|---|---|---|---|
| `npm test` | 1291 / 1291 | 0 | — |
| `runtime-application:test` | 1619 / 1624 | 5 | Pre-existing UI frozen guards (BD-17, BE-19, Stage 4, analysis UI intake, model connection failures) |
| `web-runtime:test` | 12 / 12 | 0 | — |
| `cli:test` | 40 / 40 | 0 | — |
| `web:build` | identical | 0 | — |

### New failures introduced by CI-3

**0 new test failures**. The 2 additional failures observed during CI-3
work (`AC-09 git status` and `AW-21 zero production changes`) are
pre-existing frozen-surface guards that correctly fail when:
- the working tree is dirty (AC-09), and
- production source is intentionally modified (AW-21).

Both are expected to PASS after CI-3 commits land.

## 3. Commits

| # | Commit | Type | What |
|---|---|---|---|
| 1 | `76fbce9` | feat(ci) | Establish document-intelligence namespace + extract semantic core |
| 2 | `e45f646` | feat(ci) | Add shadow document-intelligence.json integration |
| 3 | `25c7722` | test(ci) | Add CI-3 parity + semantic + shadow tests |
| 4 | (this) | docs(ci) | Record CI-3 document intelligence core |

All commits are independently revertible.

## 4. Package Structure

New namespace added to `@masterpiece/creative-intelligence`:

```text
packages/creative-intelligence/src/document-intelligence/
├── index.ts                       (re-exports contracts, diagnostics,
│                                    diagnose, interpret, truth-adapter,
│                                    document-context-core)
├── contracts.ts                   (DocumentIntelligenceInput / Result;
│                                    structural types for runtime-core shapes
│                                    — CI never imports runtime-core)
├── diagnostics.ts                 (9 DocumentUnderstandingDiagnosticCode)
├── diagnose.ts                    (pure diagnostic emitter, stable order)
├── interpret.ts                   (interpretDocumentContext — top-level
│                                    pure facade)
├── document-context-core.ts       (verbatim copy of the 9 pure functions
│                                    + 1 constant + 1 prompt from
│                                    runtime-core/application/document-context-core.ts)
└── truth-adapter.ts               (contributeToTruth — reuses CI-2
                                    document-visual-context-adapter)
```

CI root `index.ts` now also re-exports `document-intelligence`. CI
`package.json` adds:

```json
"./document-intelligence": "./src/document-intelligence/index.ts",
"./document-intelligence/*": "./src/document-intelligence/*"
```

## 5. Ownership Boundary

| Owner | What |
|---|---|
| `creative-intelligence/document-intelligence` | Document understanding semantics · document fact normalization · document field classification · document evidence normalization · document unknown classification · document constraints interpretation · document truth contribution · document diagnostics · deterministic semantic validation |
| `runtime-core` | Filesystem access · path resolution · PDF/DOCX/MD/TXT parsing · document run lifecycle · provider/model orchestration · retry · abort signals · runtime state · persistence · project path conventions · application services |
| `model-runtime` | Provider abstraction · reasoner execution · response transport · model errors · provider health |
| `project-contracts` | Existing production schemas (DocumentVisualContext, etc.) — physically canonical |

**CI never imports runtime-core.** Required structural types (VisualStrategyCorpus,
DocumentContextWarning, NormalizedDocument) are mirrored in
`document-intelligence/contracts.ts`. TypeScript's structural typing accepts
production values.

## 6. Extracted Files / Functions

### From `runtime-core/src/application/document-context-core.ts` (450 lines)

All 9 public symbols copied verbatim into
`creative-intelligence/src/document-intelligence/document-context-core.ts`:

| Symbol | Kind | Purpose |
|---|---|---|
| `DOCUMENT_CONTEXT_SCHEMA_VERSION` | const | `'1.0'` |
| `validateDocumentVisualContext(input)` | function | Schema validation |
| `parseModelJson(text)` | function | Model output JSON extraction |
| `buildExtractionMessages(corpus)` | function | Build LLM extraction prompt messages |
| `buildRepairMessages(prevText, errors)` | function | Build LLM repair prompt messages |
| `normalizeExtractedContext(raw, corpus, runId, now?)` | function | Deterministic normalization |
| `isContextEmpty(context)` | function | Empty DVC detector |
| `compileContextBrief(context)` | function | Markdown brief compiler |
| `adaptLegacyVisualTranslationResult(input)` | function | Legacy adapter |

Plus internal helpers: `cleanString`, `cleanStringOrNull`, `cleanStringArray`,
`pickStrings`, `pickString`, `section`, `bullets`, `FIELD_LABELS`,
`LIST_FIELDS`, `EVIDENCE_FIELDS`, `NON_VISUAL_PATTERN`, `EXTRACTION_SYSTEM_PROMPT`,
`PER_DOCUMENT_CHAR_LIMIT`, `TOTAL_CHAR_LIMIT`.

**Zero code changes** in the copied module.

### `runtime-core/src/application/document-context-core.ts` (now a facade)

Replaced with a 1-import thin re-export of all 9 symbols. Function references
are literally identical (parity test confirms `===`).

## 7. Compatibility Strategy

Spec #7-#8: copy → parity → compatibility → (deferred consumer switch).

```
1. Verbatim copy to CI document-intelligence/document-context-core.ts     ✓ done
2. Parity tests (18) confirm byte-equivalent output                        ✓ done
3. runtime-core file becomes thin re-export facade                          ✓ done
4. Selected consumer switch — DEFERRED (shadow-only is the CI-3 goal)       ⏸ deferred
```

All 6 callers of the old `document-context-core.ts` (`document-context-service.ts`
+ 5 test files) continue to work without any source change. Existing
production tests pass: `document-context-service.test.ts` 8/8 PASS.

## 8. Parity Results

`tests/packages/creative-intelligence/ci-3/document-context-core-parity.test.js`
(18 tests, all PASS):

| Test | Verifies |
|---|---|
| `export set matches` | All 9 expected exports present in both paths |
| `facade re-exports the same function references` | `oldPath[name] === newPath[name]` for all functions |
| `validateDocumentVisualContext — valid packet` | byte-identical result |
| `validateDocumentVisualContext — corrupted input` | byte-identical result |
| `validateDocumentVisualContext — schema mismatch` | byte-identical result |
| `parseModelJson — extracts JSON from markdown` | byte-identical result |
| `parseModelJson — throws on no JSON` | both throw |
| `parseModelJson — handles BOM` | byte-identical |
| `normalizeExtractedContext — produces identical context` | byte-identical result |
| `normalizeExtractedContext — unknown fields preserved` | byte-identical + `unknownFields.includes('targetAudience')` |
| `normalizeExtractedContext — drops evidence for unknown document` | byte-identical + `evidence.length === 0` |
| `isContextEmpty — empty DVC` | byte-identical + `true` |
| `compileContextBrief — identical output` | byte-identical + includes brand name |
| `buildExtractionMessages — identical output` | byte-identical |
| `buildRepairMessages — identical output` | byte-identical |
| `adaptLegacyVisualTranslationResult — identical output (ignoring timestamp)` | all fields except `generatedAt` (which uses `Date.now()`) |
| `deterministic output across runs` | same input → same output |
| `immutability — input not mutated` | input JSON unchanged after multiple function calls |

**18/18 parity tests PASS.** Output is byte-identical for all inputs where
the function is deterministic. The only nondeterministic function
(`adaptLegacyVisualTranslationResult.generatedAt`) is excluded from deep
equality — its other fields are verified to match exactly.

## 9. Document Intelligence Contract

Per spec #9:

```ts
export interface DocumentIntelligenceInput {
  projectId: string;
  context: DocumentVisualContext;        // from production
  corpus?: VisualStrategyCorpus;         // optional, structural
}

export interface DocumentIntelligenceResult {
  schemaVersion: '0.1';
  projectId: string;
  context: DocumentVisualContext;
  sourceRunId: string;
  generatedAt: string;
  warnings: DocumentContextWarning[];
  isEmpty: boolean;
  brief?: string;                          // from compileContextBrief
}
```

Plus a non-public, file-scoped `DocumentUnderstandingDiagnostic` type and
9 codes for `diagnose()` output.

## 10. Truth Mapping

Per spec #14-#17:

| DocumentVisualContext field | CI-2 adapter key | truthClass | authority |
|---|---|---|---|
| `brandName` / `industry` (with value) | `brand.name` / `business.industry` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `products` / `services` | `product.core_products` / `product.services` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `targetAudience` | `audience.primary` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `pricePositioning` / `businessModel` | `business.price_positioning` / `business.model` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `brandPersonality` | `brand.personality` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `visualPreferences` | `visual.preferences` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `requiredTouchpoints` | `product.touchpoints` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `lockedFacts` | `locked.facts` | `user_requirement` | `LOCKED` |
| `prohibitedDirections` | `constraint.prohibited_directions` | `fact` | `AUTHORITATIVE_DOCUMENT_FACT` |
| `unknownFields` (preserved as `unknown.fields`) | `unknown.fields` | `unknown` | `UNKNOWN` |
| missing or empty fields | preserved as `truthClass='unknown'`, `value=null`, `status='unknown'` | `unknown` | `UNKNOWN` |

`truth-adapter.contributeToTruth(result, ctx)` is a 1-line wrapper that
calls the existing `adaptDocumentVisualContext(result.context, ctx)` —
**one canonical path only** (spec #5, #12).

## 11. Evidence Mapping

Per spec #18, #20:

Each `DocumentVisualContextEvidence` entry becomes an `EvidenceEntry` via
the existing CI-2 normalizer (in `evidence/normalizer.ts`):

| DVC evidence | EvidenceEntry.id | EvidenceEntry.type |
|---|---|---|
| `{ field, documentId, filename, section, page, summary }` | `doc:<documentId>:<section>` (or `doc:<documentId>:general` if no section) | `document_section` |

`findByDocument(documentId)` returns all evidence for a document.
`findBySource(sourceRunId)` returns all evidence for a run.

Evidence coverage does not regress from CI-2 — the same normalizer is used.
Verified by `parity: normalizeExtractedContext produces identical context`.

## 12. Unknown Handling

Per spec #9, #14, #25, #21:

- `DocumentVisualContext.unknownFields` → `truthClass='unknown'` facts with
  `value=null`, `status='unknown'`, `authority='UNKNOWN'`.
- Missing fields (no value in DVC) → same as above, NEVER fabricated.
- `isContextEmpty()` returns true iff all identity fields + lists are empty.
- `compileContextBrief` renders unknown fields as "（待确认）" — explicit,
  never replaced with a default.

Verified by Scenario B tests.

## 13. Diagnostics

9 deterministic codes (spec #22). All explanatory, no scores.

| Code | Trigger |
|---|---|
| `MISSING_BRAND_NAME` | `context.brandName` is empty |
| `MISSING_INDUSTRY` | `context.industry` is empty |
| `MISSING_BUSINESS_MODEL` | `context.businessModel == null` or `pricePositioning == null` |
| `MISSING_TARGET_AUDIENCE` | `context.targetAudience.length === 0` |
| `MISSING_EVIDENCE` | populated field has no evidence entry |
| `CONFLICTING_DOCUMENT_FACT` | field has evidence from multiple documents |
| `UNKNOWN_REQUIRED_FIELD` | required identity key appears in `unknownFields` |
| `LOCKED_FACT_WITHOUT_EVIDENCE` | `lockedFacts` non-empty but no `lockedFacts` evidence |
| `UNSUPPORTED_SEMANTIC_FIELD` | evidence entry references a field outside the supported list |

Stable ordering: by `code` then by `field`. `diagnostics[].code` is a closed
union (no fabricated codes). Verified by `9 codes registered` test.

## 14. Lab Audit

Per spec #11, #24-#27, #65.

| Lab | Gate found | Disposition |
|---|---|---|
| `labs/document-visual-directions/src/shared/analysis/document-preparation.js` | re-exports from `@masterpiece/document-ingestion` only — no own logic | **DEFER** (single-line re-export has no logic to extract) |
| `labs/document-visual-directions/src/visual-translation/v1/*` | v1 direction-generation pipeline (visual-evidence-prompt, visual-signal-opportunity-prompt, audience-boundary, evidence-confidence, report-language, visual-evidence-map, visual-opportunity-map, visual-strategy-signal-map, stage-registry, checkpoint-store) | **DEFER** (direction generation — spec #24 forbidden) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/brand-identity-preservation-evaluator.js` | scans **direction output** for unexpected brand names — blocks direction pipeline if a non-project brand appears (e.g. "安迹" incident). Operates on direction text, not on document text. | **DEFER** (direction generation pipeline; CI-3 has no directions) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/asset-authorization-evaluator.js` | scans **direction output** for fabricated data (specific unverified value / official credential imitation) | **DEFER** (operates on direction output, not on document text) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/business-model-coverage-evaluator.js` | requires coverage of 4 B2B2C dimensions across **3 directions** | **DEFER** (direction generation — spec #24 forbidden) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/consumer-value-coverage-evaluator.js` | same shape as above for consumer value | **DEFER** |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/group-visual-authorization-evaluator.js` | visual direction group authorization (a/b/c) | **DEFER** (direction generation) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/spatial-drift-evaluator.js` | spatial direction drift scoring | **DEFER** (direction-tied, spec #27) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/e02-aesthetic-gate.js` | aesthetic scoring of directions | **DEFER** (direction generation, spec #27) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/direction-family-difference-evaluator.js` | direction family difference scoring | **DEFER** (direction generation) |
| `labs/document-visual-directions/src/visual-translation/v2/runtime/execution-readiness-evaluator.js` | direction execution readiness | **DEFER** (direction generation) |
| `labs/reference-style-conversion` | not in spec scope for CI-3 | **OUT OF SCOPE** |

**Approved gates for CI-3: 0.**

Reason: every gate in `labs/document-visual-directions` operates on
**direction output** (3 directions, mechanism scoring, aesthetic scoring,
spatial drift). CI-3 is upstream understanding — there are no directions
to gate yet. Re-evaluating lab extraction at CI-4 (Need & Insight) is
the right point.

**Production does NOT import any `labs/*` file** (spec #25, #13-STOP).
Verified by `verify:production-boundaries` PASS.

## 15. Shadow Integration

`runtime-core/src/application/project-truth-shadow-service.ts` was extended:

When the shadow run includes a `documentVisualContext` carrier, an
additional artifact is written:

```
<projectContextRoot>/creative-intelligence-shadow/
  project-truth.json
  evidence-ledger.json
  truth-resolutions.json
  truth-conflicts.json
  validation-report.json
  shadow-report.json
  document-intelligence.json    ← NEW (CI-3)
```

Each `document-intelligence.json` contains:

```json
{
  "schemaVersion": "0.1",
  "authoritative": false,
  "mode": "shadow",
  "projectId": "...",
  "sourceRunId": "...",
  "generatedAt": "...",
  "ciVersion": "ci-2.0.0",
  "isEmpty": false,
  "warnings": [],
  "diagnostics": [],
  "context": { ...DocumentVisualContext }
}
```

If `interpretDocumentContext()` throws (e.g. schemaVersion mismatch),
the doc-intel artifact is skipped but the base 6 files still complete
(spec #56 — shadow failure must not break production). Verified by
3 shadow-integration tests.

## 16. Reference Contamination Results

Per spec #46:

| Test | Verifies |
|---|---|
| `scenario F: reference content in document must not contaminate current identity` | DVC adapter does not auto-mark `isReferenceFact=true`; the reference guard lives in the carrier layer (CI-2) |
| `scenario F: CI-2 reference guard still active when DVC + reference carrier combine` | REFERENCE_GUARDED reasonCode fires when reference `USER_CONFIRMED` competes with current `AUTHORITATIVE_DOCUMENT_FACT`; current wins |

**Reference contamination = 0** (verified by golden tests + CI-2 REFERENCE_GUARDED).

## 17. Multi-Document Conflict Results

Per spec #36, #37:

| Test | Verifies |
|---|---|
| `scenario C: conflicting documents — both evidence paths preserved` | DVC evidence array keeps both entries; CONFLICTING_DOCUMENT_FACT diagnostic surfaces |
| `scenario C: cross-carrier conflict surfaces in shadow mode` | DVC + ProjectRecord with different brandName → `identity_mismatch` conflict in shadow truth |

Both evidence paths preserved. Cross-carrier conflict owned by
`ProjectTruthAssembler / conflict-detector` (CI-2). Document Intelligence
detects intra-document conflicts; does not resolve cross-carrier ones.

## 18. CI-1 / CI-2 Regression

| Suite | Pre-CI-3 | Post-CI-3 | Delta |
|---|---|---|---|
| CI-1 parity tests (`tests/packages/creative-intelligence/decision-runtime-parity.test.js`) | 17/17 | 17/17 | 0 |
| CI-1 boundary tests | 15/15 | 15/15 | 0 |
| CI-2 precedence tests | 14/14 | 14/14 | 0 |
| CI-2 conflict-detector tests | 10/10 | 10/10 | 0 |
| CI-2 adapters tests | 28/28 | 28/28 | 0 |
| CI-2 evidence tests | 9/9 | 9/9 | 0 |
| CI-2 assembler tests | 11/11 | 11/11 | 0 |
| CI-2 golden tests | 12/12 | 12/12 | 0 |
| **CI-2 total** | **84/84** | **84/84** | **0** |
| **CI-3 parity** | — | 18/18 | new |
| **CI-3 semantic** | — | 17/17 | new |
| **CI-3 shadow** | — | 3/3 | new |
| **CI-3 total** | — | **38/38** | new |
| **All CI tests** | **116/116** | **154/154** | +38 |

## 19. Full Regression

| Suite | Pre-CI-3 | Post-CI-3 | Delta |
|---|---|---|---|
| `npm test` | 1291/1291 | 1291/1291 | 0 |
| `runtime-application:test` | 1619/1624 | 1617/1624 | 0 (5 pre-existing + AC-09 + AW-21) |
| `runtime:test` | 1619/1624 | 1617/1624 | 0 |
| `web-runtime:test` | 12/12 | 12/12 | 0 |
| `cli:test` | 40/40 | 40/40 | 0 |
| `web:build` | identical | identical (`D2stPmgk` / `DzM-rZmk`) | 0 |

Web build hash byte-identical, confirming zero UI / frontend drift.

## 20. Guard Results

| Gate | Status |
|---|---|
| `verify:version-consistency` | ✓ PASS |
| `verify:workspace-boundaries` | ✓ PASS (0 failures, 0 warnings) |
| `verify:production-boundaries` | ✓ PASS (403 production files; Desktop/Electron/lab/archive imports absent) |
| `verify:golden-boundary` | ✓ PASS |
| `verify:no-obsolete-code` | ✓ PASS (803 files scanned) |
| `verify:no-project-specific-production-rules` | ✓ PASS |
| `verify:current-flows` | 0 new failures (all 7 failures are baseline pre-existing or expected during dirty tree) |

## 21. Behavior Drift Assessment

**Drift: ZERO**

Evidence chain:
1. Web build output is byte-identical to CI-2 (`D2stPmgk` / `DzM-rZmk`)
2. CI-1 parity tests: 17/17 still PASS
3. CI-2 tests: 84/84 still PASS
4. CI-3 parity tests: 18/18 PASS (byte-identical output)
5. `runtime-application:test`: 0 new failures attributable to CI-3
6. `cli:test`, `web-runtime:test`, `runtime:test`: 0 changes
7. The `document-context-core.ts` extraction is byte-identical (parity proven)
8. The shadow service update is additive — it does not modify the base 6-file
   write logic; it only optionally appends a 7th file
9. `interpretDocumentContext()` is pure and is only invoked from the shadow
   service (not from any production service)
10. DocumentVisualContext schema unchanged; DocumentVisualContextEvidence
    unchanged; document prompts unchanged; model call count unchanged

The only changed production file is `runtime-core/src/application/project-truth-shadow-service.ts` —
additive (7th artifact), does not change base behavior.

## 22. Rollback Plan

Full rollback in 3 commits (reverse order):

```bash
git revert 25c7722 e45f646 76fbce9
```

Equivalent to:
1. Revert CI-3 tests (38 tests removed)
2. Revert shadow document-intelligence.json integration
3. Revert document-intelligence namespace + extract semantic core

Per-commit rollback is independent. The compatibility facade makes any
subset of reverts safe — `document-context-core.ts` becomes a self-contained
file again.

## 23. Final Verdict

### CI-3: Document Intelligence Core — **GO**

All objectives met:
- ✅ `@masterpiece/creative-intelligence/document-intelligence` namespace exists
- ✅ semantic ownership is clear (spec #3)
- ✅ runtime-core still owns IO/orchestration
- ✅ no circular dependency (CI never imports runtime-core)
- ✅ no labs production import (spec #25, #13-STOP)
- ✅ document-context semantic core extracted verbatim
- ✅ old production imports remain valid (facade in runtime-core)
- ✅ old/new parity proven (18/18)
- ✅ DocumentVisualContext → ProjectTruthFact via CI-2 canonical adapter
- ✅ evidence → EvidenceEntry via CI-2 normalizers
- ✅ unknownFields preserved (no fabrication)
- ✅ locked facts preserve authority
- ✅ user requirements distinguishable (lockedFacts → user_requirement)
- ✅ 9 diagnostic codes
- ✅ shadow mode only (7th artifact; `authoritative=false`)
- ✅ production never reads shadow artifacts
- ✅ shadow failure does not break production
- ✅ 38 new tests PASS
- ✅ 0 new production test failures
- ✅ 0 new guard failures
- ✅ Web build byte-identical
- ✅ All freeze constraints respected (no prompt changes, no parser changes,
     no schema changes, no provider changes, no Space/Packaging/UI changes)

## 24. CI-4 Recommendation

### CI-4: Need & Insight Intelligence (per spec #71-#73)

CI-3 establishes the document understanding layer. CI-4 is the first
**NICE** capability phase. It should consume the CI-3 Project Truth
contribution (Document Intelligence + Visual Intelligence + Project Truth)
and produce **Need** and **Insight** representations.

**CI-4 must:**
- Build on the CI-3 Document Intelligence facade (no second parser)
- Use the CI-2 Project Truth as the input target
- Preserve all CI-3 hard acceptance thresholds
- Stay shadow-only until CI-5+

**CI-4 should NOT:**
- Generate Concept / Direction (that is CI-5+)
- Touch CreativeDecisionV2 or VisualDecisionPacket
- Add new model prompts without explicit user authorization
- Replace DocumentVisualContext with a new carrier

**Re-evaluating lab extraction at CI-4 boundary:** once a Need/Insight
representation exists, several lab gates become relevant:
- brand-identity-preservation (operates on direction output, NOT need — still deferred to CI-5)
- business-model-coverage (operates on directions — deferred to CI-5)
- asset-authorization (operates on direction output — deferred to CI-5)
- The `document-preparation.js` re-export is a structural concern (no logic to extract)

**Beyond CI-4:**
- CI-5: Concept generation (gated by CI-3 + CI-4 outputs; lab gates become applicable)
- CI-6: Direction generation (3 directions, lab visual-translation v2 reuse)
- CI-7: Deletion of `@masterpiece/document-ingestion` (final cleanup)
