# CI-W1C.7.4 — Existing Document Capability Audit

> **Mode**: Implementation phase · **HEAD**: 99b8344f
> **Branch**: `feat/short-chain-simplified-ui`
> **Purpose**: Inventory what the repository ALREADY has for document ingestion / role classification / source preparation / project brief registration. Identify what is REUSABLE and what is NOT.

## 1. Document ingestion package

**Location**: `packages/document-ingestion/`

**Exports** (from `src/document-preparation.js`):

| Function | Purpose | Reuse for CI-W1C.7.4 |
|---|---|:-:|
| `prepareDocumentSet(input)` | Takes a corpus with `documents[]`, classifies each, splits into chunks, returns frozen `{projectId, sourceDocuments, chunks, documentSetHash, preparedAt}` | YES — call from `planning-strategic-evidence.ts` |
| `classifyDocumentRole(document)` | Returns `{role, confidence}` based on filename + title + first 1200 chars of rawText | YES — used to derive `sourceRole` |
| `splitTextAtNaturalBoundaries(text, maximum=4000)` | Chinese-aware chunker | YES (internal to `prepareDocumentSet`) |

**Role rules** (built into `classifyDocumentRole`):
- `visual-guideline` (VI / 视觉规范 / visual guideline)
- `creative-brief` (creative brief / 创意简报)
- `market-research` (市场研究 / 竞品 / market research / competitor)
- `brand-strategy` (品牌策略 / 品牌定位 / brand strategy / positioning)
- `product-information` (产品资料 / product brief / information)
- `reference` (参考 / reference / inspiration)
- `unknown` (default)

**Spec mapping** (PART D):
- `creative-brief` / `brand-strategy` / `market-research` / `product-information` → `sourceRole = PLANNING_STRATEGIC_SOURCE`
- `visual-guideline` / `reference` → MUST NOT become PLANNING_STRATEGIC_SOURCE
- `unknown` → `sourceRole = UNKNOWN_SOURCE`

**Supported file formats**: `.pdf` / `.docx` / `.md` / `.markdown` / `.txt` (via `document-processing.ts` text extraction; PDF/DOCX/MD/TXT already supported).

**NO OCR** is supported (spec forbids adding OCR).

## 2. Project record schema

**Location**: `packages/runtime-core/src/application-contracts.ts`

Existing fields:
- `briefFiles: string[]` (line 583) — already declared as `string[]`. Currently used by `document-context-service` for the VUC visual-context brief.
- `briefFilename?: string | null` (lines 965, 1855) — used by `DocumentContextRun`.

**Decision**: REUSE `briefFiles: string[]` as the canonical planning source registration. Add a parallel `planningBriefFiles: Array<{sourceId, filename, relativePath, sourceType, contentHash, registeredAt}>` if a richer shape is needed (does NOT replace `briefFiles`).

**Why two fields**: `briefFiles: string[]` is reserved for the VUC's `项目视觉上下文简报.md` (visual context brief). The new `planningBriefFiles` array carries PLANNING_STRATEGIC_SOURCE content (brand-strategy, creative-brief, etc.). This keeps the two streams disjoint.

## 3. Project store mutation path

**Location**: `packages/runtime-core/src/application/project-store.ts`

**Existing pattern** (for asset persistence):
- `persistAsset(projectId, assetData)` writes a single asset + updates `project.json`
- `ImportFileBytesInput` accepts `file: {name, base64, mimeType}` over JSON RPC
- `UPLOAD_IMAGE_EXTENSIONS = {.png, .jpg, .jpeg, .webp}` (image-only; planning briefs NOT in this set)
- `assertInside(filename)` is a safety check used everywhere

**For CI-W1C.7.4**: add a parallel `persistPlanningBrief(projectId, briefData)` that:
- Accepts `{filename, relativePath, contentHash, registeredAt, sourceType}`
- Validates file extension is in {.pdf, .docx, .md, .markdown, .txt}
- Writes the brief file to `<projectDir>/planning-briefs/<sourceId>.txt` (or similar)
- Updates the `planningBriefFiles` array in `project.json`
- Returns the persisted record (so the caller can verify)

**NO raw binary/base64 in project.json** (per spec). Only metadata (filename, relativePath, contentHash).

## 4. Project mutation: existing project-store mutators

**Location**: `packages/runtime-core/src/application/project-store.ts` (no briefFiles mutator)

Currently `briefFiles` is computed/derived from `analysisItems` (in `application-contracts.ts` line 750-768), not user-set. To allow user registration of planning briefs, add a new mutator in the runtime-services or in a new `project-briefs-service.ts` module.

**Recommended**: a new `project-briefs-service.ts` that:
- `registerPlanningBrief(projectId, briefInput)` → persists the file + returns `PlanningBriefRecord`
- `listPlanningBriefs(projectId)` → returns `PlanningBriefRecord[]`
- `loadPlanningBriefContent(projectId, sourceId)` → reads file, returns rawText (for ingestion)
- `removePlanningBrief(projectId, sourceId)` → deletes file + removes from array

This service uses the existing `project-store.ts` write path (no manual JSON edits).

## 5. CI-3 document-intelligence contracts

**Location**: `packages/creative-intelligence/src/document-intelligence/contracts.ts` (3008 bytes)

Contains CI-3 contracts. Let me check its exports.

**Output**: a single `DocumentIntelligenceArtifact` shape exists. Per spec, we should NOT duplicate this domain model; we should add a new `PlanningStrategicEvidenceArtifact` (PART F) that is a sibling artifact, not a child of CI-3.

**Spec quote**: "Reuse CI-3 document-intelligence if it already has an equivalent artifact. Prefer adapter/projection over duplicate domain model."

Since CI-3's `DocumentIntelligenceArtifact` carries visual-context claims (color, motif, copy), and our planning brief carries business claims (positioning, audience), the two are NOT equivalent. We add a NEW artifact type: `PlanningStrategicEvidenceArtifact`.

## 6. Strategic reasoning context

**Location**: `packages/creative-intelligence/src/strategic-synthesis/compile-strategic-context.ts`

Existing `StrategicReasoningContext`:
```typescript
{
  projectId, promptVersion, generatedAt,
  authoritativeFacts, userRequirements, lockedIdentity, prohibitedDirections,
  needs, evidence, legacyVisualEvidenceExcluded,
  sourceIds: {facts, needs, evidence}
}
```

**For CI-W1C.7.4**: ADD a new field `planningStrategicEvidence: PlanningStrategicClaim[]` to this context. Update the prompt builder (`build-strategic-synthesis-prompt.ts`) to include a `=== PLANNING STRATEGIC EVIDENCE ===` section.

This is "carrier wiring", NOT "prompt reasoning redesign" (per spec PART I).

## 7. Truth schema

**Location**: `packages/creative-intelligence/src/truth/contracts.ts`

Existing `TruthAuthority` includes:
- `AUTHORITATIVE_DOCUMENT_FACT` (which is what planning brief promoted facts should use)

Existing `SourceType` does NOT include `planning_document`. We will need to add it to the SourceType enum (additive change).

**Spec quote**: "Do NOT add authority=PLANNING_STRATEGIC_SOURCE by default. Source role and Truth authority are separate."

So we will:
- Add `SourceType.planning_document` (additive)
- Use existing `TruthAuthority.AUTHORITATIVE_DOCUMENT_FACT` for promoted planning brief facts (no new authority)

## 8. Evidence schema

**Location**: `packages/creative-intelligence/src/evidence/contracts.ts`

Existing `EvidenceType` includes `document_section`. We can add a new `EvidenceType.planning_brief` if we want planning brief chunks in evidence-ledger.

**For CI-W1C.7.4**: We add `planning_brief` as a new EvidenceType for source traceability, distinct from `document_section` (which is VUC-derived).

## 9. What we REUSE

| Component | Reused? | How |
|---|:-:|---|
| `@masterpiece/document-ingestion/document-preparation.js` `prepareDocumentSet` | YES | Call from planning-strategic-evidence.ts to produce chunks + documentSetHash |
| `@masterpiece/document-ingestion/document-preparation.js` `classifyDocumentRole` | YES | Call to derive sourceRole from brief content |
| `@masterpiece/document-ingestion/document-preparation.js` `splitTextAtNaturalBoundaries` | YES | (internal) chunking |
| `application-contracts.ts` `briefFiles: string[]` | NO (parallel) | Used by VUC; we add `planningBriefFiles: PlanningBriefRecord[]` |
| `runtime-core` `document-processing.ts` text extraction | YES | For `.pdf/.docx/.md/.txt` parsing |
| `runtime-core` `assertInside(filename)` | YES | Path safety in brief persistence |
| `TruthAuthority.AUTHORITATIVE_DOCUMENT_FACT` | YES | For promoted planning brief claims |
| `SourceType` (add `planning_document`) | YES (additive) | New sourceType for planning brief claims |
| `EvidenceType` (add `planning_brief`) | YES (additive) | New evidence type |
| `StrategicReasoningContext` (add `planningStrategicEvidence`) | YES (additive) | New field |
| `semantic-fingerprint.ts` `semanticSha256` | YES | For planning evidence fingerprint |
| `createHash('sha256')` from `node:crypto` | YES | For contentHash |

## 10. What we DO NOT build (per spec)

- planning-doc-parser-v2 ❌
- new ingestion stack ❌
- new context service ❌
- OCR ❌
- rewriting `document-processing.ts` ❌
- rewriting `compile-strategic-context.ts` (we ADD a field, not rewrite) ❌
- rewriting `build-strategic-synthesis-prompt.ts` (we ADD a section, not redesign) ❌
- rewriting `truth/contracts.ts` (we ADD SourceType variant, not rewrite) ❌

## 11. What we DO build (additive only)

| New file | Purpose |
|---|---|
| `packages/creative-intelligence/src/strategic-synthesis/planning-source-registration.ts` | Project-brief registration helper (uses project-store) |
| `packages/creative-intelligence/src/strategic-synthesis/planning-strategic-evidence.ts` | Build PlanningStrategicEvidenceArtifact from registered briefs |
| `packages/creative-intelligence/src/strategic-synthesis/planning-source-integration.ts` | Route claims to Truth / USER_REQUIREMENT / inference (PART G + H) |
| `packages/creative-intelligence/src/strategic-synthesis/planning-source-fingerprint.ts` | Canonical SHA-256 fingerprint of planning evidence |
| Modified: `compile-strategic-context.ts` | Add `planningStrategicEvidence` field |
| Modified: `build-strategic-synthesis-prompt.ts` | Add `=== PLANNING STRATEGIC EVIDENCE ===` section |
| Modified: `semantic-fingerprint.ts` | Include planning evidence in input fingerprint |
| Modified: `truth/contracts.ts` | Add `SourceType.planning_document` |
| Modified: `evidence/contracts.ts` | Add `EvidenceType.planning_brief` |
| Modified: `runtime-core/src/application/project-store.ts` (or new `project-briefs-service.ts`) | `registerPlanningBrief` / `listPlanningBriefs` mutators |

## 12. Hard rule check (spec PART B)

> "Reuse existing components. DO NOT build: planning-doc-parser-v2, new ingestion stack, new context service, unless existing code is proven insufficient."

✓ Audit shows existing code is sufficient. We reuse `prepareDocumentSet`, `classifyDocumentRole`, `document-processing.ts`, `assertInside`. We add only ADAPTIVE code (new fields, new modules that wire into existing paths).

> "Do not store raw binary/base64 in project.json."

✓ We store metadata (filename, relativePath, contentHash) only. The actual file content is on disk.

> "A minimal qualification registration script is allowed, but it MUST call the same production service."

✓ The fixture registration script will call `registerPlanningBrief` from the same service that the UI would call.
