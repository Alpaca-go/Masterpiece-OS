# CI-W1C.7.5-R1 — Existing CI Document Intelligence Capability Audit

> PART B — Read-only audit.
> Answers the spec PART B §8 questions.
> Drives the Goal A (Hybrid Planning Extraction) design.

## 0. Source

The CI-3 / Document Intelligence module lives at
`packages/creative-intelligence/src/document-intelligence/`
(7 files, 44,924 bytes total).

```
3008  contracts.ts               (type contracts; mirrors runtime-core shapes)
4998  diagnose.ts                (document intake diagnosis)
 985  diagnostics.ts             (codes + helpers)
30434 document-context-core.ts   (the core: prompt + parse + validate + normalize)
 925  index.ts                   (re-exports)
2310  interpret.ts               (interpretation entry-point)
1962  truth-adapter.ts           (DVC → Truth adapter)
```

Module-level invariant from `index.ts:2-3`:

> "Document Intelligence namespace. Spec #2-#5: pure semantic
> owner of document understanding. CI never imports
> runtime-core; structural types are mirrored in contracts.ts."

So CI is the **owner** of document-understanding semantics.
This is the layer R1 must extend, not bypass.

## 1. What already exists (spec §8 audit questions)

### Q1. What normalized document artifact already exists?

**`VisualStrategyCorpus`** (in `document-intelligence/contracts.ts:60-64`):

```ts
export interface VisualStrategyCorpus {
  documents: NormalizedDocument[];
  sourceIndex: VisualStrategyCorpusSourceIndexEntry[];
}
```

`NormalizedDocument` carries `id`, `filename`, `sourceType`
(pdf / docx / markdown / text), `title`, `rawText`,
`characterCount`, `pageCount`, `documentRole`, `tables[]`.

`documentRole` is one of: `brand-strategy` /
`creative-brief` / `visual-guideline` /
`product-information` / `market-research` / `reference` /
`unknown`. The G01 doc was classified as `brand-strategy`
(downstream of `document-ingestion/document-preparation.js:classifyDocumentRole`).

The same `NormalizedDocument` is also re-defined in
`runtime-core/src/application/document-processing.ts`
(mirrored per the spec #9 structural-type rule). Both
shapes are identical.

### Q2. What model-assisted extraction capability already exists?

**`buildExtractionMessages(corpus)`** in
`document-context-core.ts:345-366` builds the prompt
messages for the model call. The system prompt
(`EXTRACTION_SYSTEM_PROMPT`, lines 200-340) is a large
Chinese instruction prompt that asks the model to emit a
single JSON object with 16 fields:

```
brandName
industry
products[]
services[]
targetAudience[]
pricePositioning (string | null)
businessModel (string | null)
brandPersonality[]
visualPreferences[]
requiredTouchpoints[]
lockedFacts[]
prohibitedDirections[]
unknownFields[]
evidence[]    (DocumentVisualContextEvidence[])
conflicts[]   (string[])
```

The system prompt already has hard project-agnostic rules:

- "只输出一个 JSON 对象" / "严禁编造" / "忽略与视觉设计无关的内容" / etc.
- Routes `LOCKED` only when strong lock signals are present
  ("必须", "不得", "禁止", "locked") — softer cues go to
  `visualPreferences` / `requiredTouchpoints`.
- Routes "禁止 X" patterns to `prohibitedDirections`.
- Forbids fabricating facts; routes unknown to `unknownFields`.

`buildRepairMessages(previousText, errors)` (lines 368-376)
builds the repair-attempt message given the previous text
and a list of validation errors.

So CI-3 already has a **complete model-assisted document
extraction primitive** that:

- Accepts a multi-doc corpus
- Produces a prompt
- Validates the model output
- Normalizes the result deterministically
- Has a repair path

What R1 needs to add is NOT a new extraction primitive.
It needs an **adapter / projection** that:

1. Builds a single-doc `VisualStrategyCorpus` from the
   registered planning brief (using the already-parsed
   `NormalizedDocument` from `parseStrategyDocument`).
2. Calls the existing primitive (or runs a thin
   orchestrator that already calls it).
3. Projects the model's `DocumentVisualContext` output
   into `PlanningStrategicClaim[]` with the
   `PLANNING_CLAIM_KEYS` semantic types
   (industry / brand_role / business_model / target_audience
   / audience_problem / brand_promise / competitive_context
   / differentiation_logic / strategic_objective /
   experience_objective / transformation_objective /
   touchpoint_priority / brand_personality /
   communication_task / product_service / brand_positioning).
4. Preserves `sourceDocumentId` and `chunkRefs` from the
   `evidence[]` entries.

### Q3. What provider/runtime abstraction does CI-3 use?

CI-3 is **provider-agnostic** and **model-agnostic**. It
defines `Array<{ role: string; content: string }>` as
the message contract. The actual provider call (Qwen /
Dashscope / mock / fixture) is the caller's responsibility
— typically the orchestrator (`creative-reasoning-service`).

This is exactly the seam R1 should use: the **orchestrator
wires the model call**; **CI-3 owns the prompt / parser /
validator / normalizer**.

The current `creative-reasoning-service.ts` already has the
canonical `reasonerFactory` injection point. R1 only needs
to:

1. Add a new stage `narrative-extraction` (or equivalent)
   that runs BEFORE the existing `synthesis` stage.
2. The new stage uses `buildExtractionMessages` +
   `parseModelJson` + `validateDocumentVisualContext` +
   `normalizeExtractedContext`.
3. The new stage emits a list of `PlanningStrategicClaim`
   that the existing `compile-strategic-context` can
   consume.

This is consistent with the spec PART C "Important
boundary":

> "Model-assisted narrative extraction belongs to CI
> Document Intelligence, not to
> `buildPlanningStrategicEvidenceArtifact()` as an ad-hoc
> second reasoning engine."

### Q4. What evidence/claim contracts already exist?

**`DocumentVisualContextEvidence`** (from
`@masterpiece/project-contracts/index.ts`, re-exported in
`document-intelligence/contracts.ts:102`):

```ts
{ field, documentId, filename, section, summary }
```

The model emits this per non-empty field. Each entry is
deterministically validated by
`normalizeExtractedContext` to ensure `documentId ∈
corpus.documents[].id` and `filename` matches.

This is the **traceability primitive** the planning claims
need. R1's adapter projects each `evidence[]` entry into a
`PlanningStrategicClaim`:

```ts
{
  claimId:     buildClaimId(sourceDocumentId, semanticType, valueHash),
  key:         semanticType,           // ∈ PLANNING_CLAIM_KEYS
  value:       evidence.summary,        // the model's paraphrase
  epistemicClass: classifier(value, line, documentRole),
  confidence:  defaultConfidence,       // per-key default
  sourceDocumentId: evidence.documentId,
  chunkRefs:   [evidence.section],     // or resolve to chunkId if possible
  ...  // (additional fields)
}
```

The existing `planning-strategic-evidence.ts` already
defines the `PlanningStrategicClaim` shape; the
`buildClaimId` helper already exists. So the adapter is a
mechanical projection.

### Q5. Can narrative claims be represented without a new parallel schema?

**YES.** `PlanningStrategicClaim` is the canonical schema.
R1 must NOT add a parallel "narrative claim" type. The
adapter emits `PlanningStrategicClaim[]` directly.

The existing schema's `epistemicClass` is
`PlanningEpistemicClass = 'FACT' | 'USER_REQUIREMENT' |
'MODEL_INFERENCE' | 'UNKNOWN'`. The `epistemic-classifier`
in `strategic-synthesis/epistemic-classifier.ts` is pure
regex over value + line text; the adapter reuses it for
each projected claim.

### Q6. Where does deterministic fact extraction currently stop?

Currently `buildPlanningStrategicEvidenceArtifact` /
`extractClaimsFromChunk` uses 16 `EXTRACT_PATTERNS` that
match `key: value` single-line patterns (e.g. `/^\s*(?:品牌定位|
brand\s*positioning|positioning)\s*[:：]\s*(.+?)\s*$/imu`).
The patterns are limited to:

- Single-line `key: value` (no multi-line)
- Specific Chinese or English key labels (e.g. `品牌定位`,
  `brand positioning`)
- 16 hardcoded semantic keys

The 10,737-char G01 doc has 0 matches. The R1 narrative
path plugs this gap by:

- Running the model on the full chunk set
- Letting the model emit the broad `DocumentVisualContext`
  (16 fields, semantically aligned)
- Projecting back to `PlanningStrategicClaim` with the
  `PLANNING_CLAIM_KEYS` semantic types (also 16 keys)

So R1 effectively gives the same final surface (16-key
claim set) but via two paths (structured / narrative) with
a coverage-diagnostic switch.

### Q7. How are `sourceDocumentId` / `chunkRefs` preserved?

- `sourceDocumentId`: built by `buildSourceDocumentId`
  (`<projectId>:<sourceRole>:<originalFileName>:<contentHash[:16]>`).
  This is the same identity used by the structured path.
- `chunkRefs`: the existing extractor pushes the matched
  chunk's `chunkId`. The narrative path needs to map the
  model's `evidence.section` / `evidence.summary` back to a
  chunkId. R1 must:
  - Either include `chunkId` in the `DocumentVisualContextEvidence`
    projection (extending it minimally and safely — the
    evidence shape comes from production, R1 should NOT
    add fields there)
  - Or use `documentId` + heuristic chunk-boundary search
    (find which chunk contains the summary's first 30 chars
    — deterministic, but loose)
  - R1's chosen approach: use `documentId` + chunk-search
    by `summary.slice(0, 80)` substring match. Falls back
    to `[]` (no chunkRef) if no match; the planning-intake
    gate PI-03 then blocks the claim.

## 2. Reuse plan (spec PART C §9 reuse-first rule)

| Need | Reuse | New |
|---|---|---|
| Document parsing | `parseStrategyDocument` (runtime-core) | — |
| Corpus build | `VisualStrategyCorpus` (CI) | thin single-doc adapter |
| Extraction prompt | `buildExtractionMessages` (CI) | — |
| Extraction call | `creative-reasoning-service` reasonerFactory seam (runtime) | new `narrative-extraction` stage + carrier |
| Model output parse | `parseModelJson` (CI) | — |
| Schema validation | `validateDocumentVisualContext` (CI) | — |
| Normalization | `normalizeExtractedContext` (CI) | — |
| Repair messages | `buildRepairMessages` (CI) | — |
| Claim projection | `buildClaimId` (CI) + `classifyPlanningClaimEpistemicClass` (CI) | new thin adapter `documentContextToPlanningClaims` |
| Coverage diagnostic | (none) | new `StructuredExtractionCoverage` + heuristic switch |
| Merge / dedupe | existing structured path dedupe (by key+value+sourceDocumentId) | same dedupe extended to mixed path |
| Intake gate | (none) | new `runPlanningIntakeGate` (PI-01..05) |

**No new "planning LLM service".** No new parallel claim
schema. The narrative path is a **second input** to the
existing `buildPlanningStrategicEvidenceArtifact` (or a
replacement of its extraction step, with the merge logic
also living in CI's deterministic layer).

## 3. R1 Goal A target pipeline

```
registered planning brief (1 doc)
  → parseStrategyDocument                    [runtime-core, existing]
  → NormalizedDocument (rawText 10,737 chars)
  → VisualStrategyCorpus (1 doc)              [new thin adapter]
  → structured extraction (existing EXTRACT_PATTERNS)
  → claims_v1 (N=0 for G01 narrative doc)
  → StructuredExtractionCoverage diagnostic   [new]
  → if insufficient:
        model-assisted extraction:
          buildExtractionMessages(corpus)      [CI-3, existing]
          → model call                          [orchestrator seam]
          → parseModelJson                      [CI-3, existing]
          → validateDocumentVisualContext       [CI-3, existing]
          → normalizeExtractedContext           [CI-3, existing]
        DocumentVisualContext (DVC)
        → DVC → PlanningStrategicClaim[]        [new adapter]
        claims_v2 (DVC-derived, M claims)
  → merge claims_v1 + claims_v2                [new merge / dedupe]
  → epistemic validation (per claim)           [CI existing classifier]
  → PlanningStrategicEvidenceArtifact          [existing]
  → PlanningIntakeGate                         [new, PART G]
  → if PASS:
        Strategic synthesis
        Concept
        Direction
```

The narrative path's model call is **1 base + 1 repair**,
using the same `profile-9eb57f7e-...` (dashscope +
qwen3.6-plus) profile as the existing Strategic / Concept
/ Direction calls. Total G01 Attempt 2 budget: 1 narrative
extraction + 1 Strategic + 1 Concept + 1 Direction = 4 text
calls base; 8 worst case (2+2+2+2).

## 4. Carry-over (decisions that are NOT R1)

- The G01 doc text remains exactly as-is. R1 does not
  preprocess, summarize, or rewrite the source.
- No project-specific extraction rules for 九州美学 /
  医美 / 九州通 / specific competitor names.
- Existing `extractClaimsFromChunk` (regex) is preserved
  for the structured fast path.
- The structured fast path is used whenever
  `StructuredExtractionCoverage` reports "sufficient"; the
  narrative path is only invoked when structured is
  insufficient.
- R1 does not move the `DocumentVisualContext` shape or
  alter its production validator.
- R1 does not touch `Need`, `Concept`, `Direction`,
  `Image`, `Space`, `Packaging`, `Consumers`, or
  `Direction Report Productization`.

## 5. Open questions for the design

These do not block PART B (audit) but matter for the
implementation phase:

1. Where does the new `narrative-extraction` stage live in
   the orchestrator? Options: (a) inside
   `creative-reasoning-service` as a new stage before
   `synthesis`; (b) as a separate stage in a new
   `narrative-planning-extraction-service.ts` invoked by
   the orchestrator. R1's pick: (a) — keeps the orchestrator
   as the single entry point.
2. Does the narrative extraction require a separate
   qualification budget, or share with synthesis? R1's
   pick: separate (1 base + 1 repair = 2 calls, 32k tokens,
   documented in the orchestrator's existing
   `qualificationBudget`).
3. What input fingerprint keys the narrative extraction?
   R1's pick: `parseStrategyDocument` content hash (already
   computed) + `prepareDocumentSet` documentSetHash (already
   computed). The output is `PlanningStrategicEvidenceArtifact.planningEvidenceFingerprint`.

These are decisions for the implementation commit; this
audit is read-only.
