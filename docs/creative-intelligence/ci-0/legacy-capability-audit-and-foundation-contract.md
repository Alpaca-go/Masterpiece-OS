# CI-0: Legacy Capability Audit &amp; Foundation Contract

> Creative Intelligence Module — Phase 0 (Foundation)
> Status: **DRAFT** — CI-0 audit output
> Audit HEAD: `bfea5ace` (feat/short-chain-simplified-ui)
> Production code delta: **0**

---

## 0. Executive Summary

This audit inspects the current Masterpiece-OS repository to establish what legacy capabilities exist around document understanding, creative analysis, visual direction, style modeling, and evidence tracking — and which of those can be reused, extracted, adapted, rewritten, deprecated, or ignored when building a future "Creative Intelligence" (CI) module.

**Verdict: CONDITIONAL GO.**

There is a substantial and well-structured foundation to build on — but the CI concept does not yet have a canonical home in the codebase. Three separate systems (CLI analysis engine, runtime-core analysis pipeline + repair, and labs/document-visual-directions) each handle different parts of what a unified CI module would own. The condition is that CI-1 scope must be narrowly bounded to extracting and reusing proven infrastructure rather than inventing new capabilities.

**Recommended CI-1 scope**: (1) establish `@masterpiece/creative-intelligence` package boundary and dependency contract, (2) migrate `@masterpiece/analysis-runtime` into it as the structural validation & repair core, (3) extract document understanding schemas from `runtime-core/application-contracts.ts` into it, (4) establish Project Truth Model as a first-class concept, (5) establish Evidence Ledger as a first-class concept. Do not add new analysis capabilities in CI-1.

---

## 1. Repository State

| Field | Value |
|---|---|
| Branch | `feat/short-chain-simplified-ui` |
| HEAD | `bfea5acece38721292b01a020be857f729fad35e` |
| Product version | `5.0.0-rc.1` (per `/VERSION`) |
| Working tree | clean (no uncommitted changes at audit time) |
| Package count | 14 internal `@masterpiece/*` packages + 3 labs |
| Relevant packages | `document-ingestion`, `analysis-runtime`, `model-runtime`, `model-registry`, `runtime-core`, `project-contracts`, `image-generation-runtime`, `creative-production-runtime`, `reference-asset-inspector` |
| Relevant labs | `document-visual-directions` (frozen), `reference-style-conversion` (frozen), `infinite-canvas` (unrelated) |

> Evidence: `git branch --show-current`, `git rev-parse HEAD`, `package-lock.json`, `/VERSION`, `packages/*/package.json`, `labs/*/package.json`

---

## 2. Frozen Document-Analysis / Visual-Direction Code

### 2.1 `labs/document-visual-directions` — Frozen Experiment

**Status: FROZEN — experimental, not in production.**

| Attribute | Value |
|---|---|
| Package name | `@masterpiece-labs/document-visual-directions` |
| Version | `0.1.0` |
| Location | `labs/document-visual-directions/` |
| Production imports | **0** — no package under `apps/` or `packages/` references it |
| Build inclusion | Excluded from Web UI / Runtime / build per repository contract |

**What it contains**:
- v1 conceptual visual-translation pipeline (evidence → signal → opportunity → direction)
- v2 execution-oriented direction pipeline (visual-fact-first / retrieval-first → direction generation → gates → report)
- 10+ deterministic gate evaluators (brand identity, business model, consumer value, compliance, aesthetic, spatial drift, asset authorization, etc.)
- Direction contract v2 schema (3 directions × industry recognition layer × reusable assets × composition templates × execution examples)
- A/B runner comparing v1 vs v2
- 3 project fixtures (jiuzhou-meixue, mingjitang, vanke-suwan)
- 6 test files, all offline/deterministic

**Why it's frozen**: README explicitly states "实验功能：不进入正式产品（Electron UI / IPC / 构建 / 打包）". It lives in `@masterpiece-labs/*` namespace, not `@masterpiece/*`.

> Evidence: `labs/document-visual-directions/README.md:1-32`, `labs/document-visual-directions/package.json`, grep for `@masterpiece-labs` across `packages/` and `apps/` → 0 production matches

### 2.2 `labs/reference-style-conversion` — Frozen Experiment

**Status: FROZEN — reference style conversion experiment.**

Not deeply audited for CI-0 because its focus is style format conversion, not creative intelligence. Mentioned for completeness.

> Evidence: `labs/reference-style-conversion/` directory exists as a lab

---

## 3. Runtime Entry Points and Callers

There are **three independent analysis entry points** in the current codebase:

### 3.1 CLI Analysis Engine (one-shot Markdown)

| Attribute | Value |
|---|---|
| Entry point | `runAnalysisPipeline()` |
| File | `apps/cli/src/analysis-engine/bootstrap.js:48` |
| Model calls | **1** (one-shot "Deep Creative Director") |
| Output format | Markdown report (10 sections, Chinese) |
| Callers | CLI `analyze` command (`apps/cli/bin/masterpiece-os.js:72`), `pipeline-service.ts` (runtime-core) |
| Provider abstraction | Injected `reasoner` function from `model-runtime` |
| Structured output? | **No** — output is unstructured Markdown |

The CLI analysis engine is the **simplest path**: one model call, all pre-processing done locally, one Markdown report. It does NOT produce the structured `VisualDecisionPacket` that downstream generation pipelines consume.

> Evidence: `apps/cli/src/analysis-engine/bootstrap.js:48-250`, `apps/cli/src/analysis-engine/creative-director/deep-creative-director.js`

### 3.2 Runtime-Core Analysis Pipeline (structured packet + repair)

| Attribute | Value |
|---|---|
| Entry point | `createPipelineService().start(projectId, ...)` |
| File | `packages/runtime-core/src/application/pipeline-service.ts:416-426` |
| Model calls | Multiple (reasoning + structured repair loop, max 2 repair attempts) |
| Output format | `VisualDecisionPacket` (schema 1.0, structured JSON) + Markdown report |
| Callers | Web Runtime, Short-Chain workspace |
| Provider abstraction | `analysisProviders.createReasoner()` from `model-runtime` |

This is the **production analysis path for structured generation**. It produces `VisualDecisionPacket` which flows into `ProjectVisualContextShortChain`, which feeds both Space and Packaging generation.

The pipeline stages (per `AnalysisStage` enum at `application-contracts.ts:76`):
1. `preparing-assets`
2. `extracting-project-facts`
3. `building-contact-sheet`
4. `building-prompt`
5. `reasoning`
6. `generating-report`
7. `validating-output`
8. `repairing-decisions` (via `@masterpiece/analysis-runtime`)
9. `completed` / `failed` / `cancelled`

> Evidence: `packages/runtime-core/src/application/pipeline-service.ts`, `packages/runtime-core/src/application-contracts.ts:76-90`

### 3.3 Document Context Service (fact extraction from documents)

| Attribute | Value |
|---|---|
| Entry point | `createDocumentContextService().start(paths, profileId)` |
| File | `packages/runtime-core/src/application/document-context-service.ts` |
| Model calls | 1 extraction + max 1 repair |
| Output format | `DocumentVisualContext` (schema 1.0) + Markdown brief |
| Callers | Document analysis workflow (Phase 2) |
| Stages | 6 stages: prep → role index → extraction → normalization → confirmation → brief compiler |

This is a **document→facts** service, not a full creative analysis. It extracts structured facts (brand name, industry, product info, locked facts, etc.) from uploaded documents and produces a human-verifiable brief. It does NOT generate visual directions or creative decisions.

> Evidence: `packages/runtime-core/src/application/document-context-service.ts:190-450`

### 3.4 Caller Map

```
apps/cli/bin/masterpiece-os.js
  └─→ runAnalysisPipeline() [CLI one-shot]
       └─→ Markdown report only

packages/runtime-core/pipeline-service.ts
  ├─→ runAnalysisPipeline() [reasoning step]
  ├─→ completeStructuredAnalysis() [@masterpiece/analysis-runtime]
  ├─→ buildVisualDecisionPacket()
  ├─→ buildProjectVisualContext()
  └─→ ProjectVisualContextShortChain
       ├─→ short-chain-service.ts [Space generation]
       └─→ packaging/workspace-service.js [Packaging generation]

packages/runtime-core/document-context-service.ts
  └─→ DocumentVisualContext [facts only]
       └─→ (feeds into analysis pipeline as additional context)
```

---

## 4. Document Ingestion Audit

### 4.1 Current Architecture

Document ingestion is **split across two packages** with an unclear boundary:

| Package | What it actually does | What its description claims |
|---|---|---|
| `@masterpiece/document-ingestion` | Text splitting, document role classification, document set normalization + chunking | "PDF / DOCX / Markdown / TXT parsing..." (misleading) |
| `@masterpiece/runtime-core` | Actual file parsing: PDF, DOCX, MD, TXT | N/A (part of runtime-core) |

### 4.2 File Format Support

Implemented in `packages/runtime-core/src/application/document-processing.ts`:

| Format | Parser | Dependencies | Tables | Images |
|---|---|---|---|---|
| `.pdf` | `pdfjs-dist` (legacy build) | Dynamic import | No (plain text lines) | No |
| `.docx` | `adm-zip` + regex on `word/document.xml` | `adm-zip` | Yes (basic) | No |
| `.md` / `.markdown` | Built-in heading splitter | None | No (raw text) | N/A |
| `.txt` | Raw text + encoding auto-detect | None | No | N/A |

**Encoding detection for TXT**: UTF-8, UTF-16LE, GB18030 (auto-detected).

> Evidence: `packages/runtime-core/src/application/document-processing.ts:17-123`

### 4.3 Normalized Document Schema

Defined in `packages/runtime-core/src/application-contracts.ts:862-890`:

```typescript
interface NormalizedDocument {
  id: string;
  filename: string;
  mimeType: string;
  sourceType: 'pdf' | 'docx' | 'markdown' | 'text';
  title?: string;
  rawText: string;
  sections: DocumentSection[];   // heading + level + content + page
  tables: DocumentTable[];       // rows[][] + markdown string
  pageCount?: number;
  characterCount: number;
  parseWarnings: string[];
  documentRole?: DocumentRole;
}
```

### 4.4 Document Role Classification

6 roles with regex-based heuristic classification (`packages/document-ingestion/src/document-preparation.js:3-10`):

1. `visual-guideline` — VI / 视觉规范 / brand guideline
2. `creative-brief` — creative brief / 创意简报
3. `market-research` — 市场研究 / 竞品 / market research
4. `brand-strategy` — 品牌策略 / 定位 / brand strategy
5. `product-information` — 产品资料 / product brief
6. `reference` — 参考 / 案例 / reference
7. `unknown` — fallback (low confidence)

### 4.5 Dead Dependency

`sharp` is declared in `packages/document-ingestion/package.json` but **never imported or used**. Likely a leftover from an abandoned image extraction plan.

> Evidence: `grep "sharp" packages/document-ingestion/src/` → 0 matches

### 4.6 Assessment for CI

- **Chunk-level source attribution is good** — each chunk has `sourceId`, `sectionPath`, `contentHash`, `chunkId`
- **Image extraction is missing** — no support for extracting images from PDFs or DOCX
- **Table extraction is basic** — DOCX tables are supported but not PDF or MD tables
- **Package naming mismatch** — `document-ingestion` is misnamed; actual file parsing lives in runtime-core
- **No type declarations** — pure JS package, imported with `// @ts-ignore`

---

## 5. Document Understanding Audit

### 5.1 Current Document Understanding Capability

Document understanding exists at **two levels**:

**Level 1: Document Context Extraction** (production)
- Service: `document-context-service.ts`
- Output: `DocumentVisualContext` (schema 1.0)
- Approach: 1 LLM call + 1 repair pass + deterministic normalization + human confirmation
- Scope: project facts (brand name, industry, products), locked facts, visual direction constraints
- Strength: human-in-the-loop confirmation gate
- Weakness: shallow (1 call), no deep analysis of visual elements

**Level 2: Visual Translation v2** (lab, frozen)
- Service: `labs/document-visual-directions`
- Output: 3 execution-oriented visual directions (v2 schema)
- Approach: Multi-stage pipeline (evidence → signal → opportunity → direction → gates → report)
- Scope: Full visual direction generation with reusable assets, composition templates, execution examples
- Strength: Rich output structure, 10+ gate evaluators, A/B testing framework
- Weakness: Not productionized, JS-only (no TS), no types, isolated from main codebase

### 5.2 Key Finding: The "Understanding Gap"

There is **no production document understanding layer** that sits between "document text extraction" and "creative direction generation". The flow is:

```
Documents → [document-context-service: facts only] → ??? → VisualDecisionPacket
```

The `???` is currently filled by:
- CLI's one-shot Deep Creative Director (unstructured Markdown)
- Runtime-core's pipeline-service (calls CLI then structures via repair)

But there is **no dedicated, reusable document understanding module** that produces structured analysis output as a first-class artifact. The `analysis-runtime` package validates and repairs structured output, but it doesn't *produce* it.

### 5.3 Prompts

- **CLI analysis**: 4 prompt files in `apps/cli/prompts/analysis/` → 1 composite prompt (system + user)
- **Document context extraction**: Prompts in `document-context-core.ts` (runtime-core)
- **Lab v2 directions**: 2 prompt files + retrieval-first prompts in `labs/document-visual-directions/src/visual-translation/v2/prompts/`

All analysis prompts are in **Chinese**.

---

## 6. Evidence / Source Attribution Support

### 6.1 Current State: Distributed, Not Centralized

There is **no "Evidence Ledger" top-level concept** in the codebase. Evidence tracking is distributed across multiple mechanisms:

| Mechanism | Location | Granularity |
|---|---|---|
| `SourcedVisualFact<T>` | `project-contracts:1087` | Fact-level (source + evidenceRefs + confidence + status) |
| `DocumentVisualContextEvidence` | `project-contracts:1522` | Document field-level (field + documentId + section + page + summary) |
| `VisualDiagnosisItemV2.evidenceRefs` | `project-contracts:1139` | Diagnosis item-level |
| `BrandMisreadRiskV2.evidenceRefs` | `project-contracts:1143` | Risk item-level |
| `VisualAbstractionV2.evidenceRefs` | `project-contracts:1229` | Abstraction-level |
| `LockedAsset.evidence` | `project-contracts:426` | Asset-level |
| `repairMetadata.*.evidenceRefs` | `project-contracts:1452` | Field repair-level |
| `sourceFingerprint` | Multiple locations | Whole-document SHA-256 |
| `contentHash` (chunks) | `document-ingestion` | Chunk-level SHA-256 |
| `ContextConflict[]` | `project-contracts:1648` | Merge conflict-level |

### 6.2 Source Fingerprint

`sourceFingerprint` is a SHA-256 hash computed over stable-sorted core fields (excluding volatile fields like `generatedAt`, `updatedAt`, `completedAt`, `repairMetadata`, `validation`).

Implemented in `packages/analysis-runtime/src/source-fingerprint.ts`.

Used for:
- Staleness detection (has the source changed since analysis?)
- Provenance tracking
- Cache keys

### 6.3 Assessment

Strengths:
- Every structured value CAN carry evidence references (it's in the type system)
- Source fingerprint enables staleness detection
- Document-level provenance is well-structured (documentId + section + page)

Weaknesses:
- **No unified Evidence Ledger** — evidence refs are scattered across different types with no common registry
- **No cross-artifact evidence indexing** — can't query "all facts supported by document X, section Y"
- **Evidence refs are optional everywhere** — actual fill rate is unknown and likely low
- **No evidence quality scoring** beyond generic `confidence: number`
- **No evidence visualization / exploration UI** — the data is there but not surfaced

---

## 7. Creative Decision Structures

### 7.1 Multiple Versions, Multiple Locations

Creative decisions exist in **at least 4 schema versions** across the codebase:

| Version | Type | Location | Format | Status |
|---|---|---|---|---|
| v1 snake_case | `CreativeDecision` | `project-contracts:183` | snake_case fields | Legacy |
| v6 camelCase | `CreativeDecision` | `project-contracts:735` | camelCase, brandCoreJudgment / primaryDirection / styleBoundaries | Legacy (Style Profile era) |
| V2 packet | `CreativeDecisionV2` | `project-contracts:1148+` | part of `VisualUnderstandingCore` / `VisualDecisionPacket` | Current (structured analysis) |
| PromptSourceObject | `PromptSourceObject.creativeDecision?` | `project-contracts:1024` | Flat fields for prompt compilation | Current (generation input) |

### 7.2 Current Canonical: CreativeDecisionV2

In `VisualDecisionPacket` → `creativeDecision` (`project-contracts:1148+`):

```typescript
interface CreativeDecisionV2 {
  brandRoleStatement: EvidenceBackedValue<string>;
  uniqueUpgradeThesis: EvidenceBackedValue<string>;
  toneBoundaries: {
    target: EvidenceBackedValue<string>;
    avoid: EvidenceBackedValue<string>[];  // at least 2
  };
  preserveCore?: EvidenceBackedValue<string>;
  upgradeFrom?: EvidenceBackedValue<string>;
  upgradeTo?: EvidenceBackedValue<string>;
  targetWorldview?: EvidenceBackedValue<string>;
  strategicNegatives?: EvidenceBackedValue<string>[];
}
```

Each value carries `EvidenceBackedValue<T>` wrapper:
- `value: T`
- `status: DecisionStatus` (confirmed / source_fact / inferred / proposed / system_default / unknown / conflicted / stale)
- `confidence: number` (0-1)
- `evidenceRefs: string[]`
- `generatedBy: RepairGeneratedBy`
- `sourceFingerprint: string`
- `schemaVersion: string`
- `repairVersion?: number`

### 7.3 VisualDecisionPacket — The Full Structured Output

`VisualDecisionPacket` (`project-contracts:1433+`) is the most complete creative decision artifact:

```
VisualDecisionPacket (schema 1.0)
├── projectFacts          — brandName, industry, brandRole, businessModel, targetAudience
├── lockedAssets          — VisualDecisionLockedAsset[]
├── assetInventory        — 10 categories of visual assets
├── diagnosis             — valuableAssets, brandMisreadRisks, overused/outdated/categoryCliches
├── creativeDecision      — CreativeDecisionV2 (see above)
├── abstractions          — VisualAbstractionV2[] (sourceAsset + semanticMeaning + formal/rhythm/material/lighting properties)
├── mediaTranslations     — PacketV2 { spatial, packaging, poster, vi }
│   ├── spatial           — concept, structureLanguage, materialLanguage, lightingLanguage, colorBehavior, etc.
│   ├── packaging         — productAndCategoryRole, structureStrategy, openingExperience, etc.
│   ├── poster            — (fewer defined fields)
│   └── vi                — (fewer defined fields)
├── colorSystem           — extracted from spatial
├── materialSystem        — extracted from spatial
├── lightingSystem        — extracted from spatial
├── provenance            — generatedAt, sourceFingerprint
├── repairMetadata        — per-field repair audit trail
└── validation            — executionDataStatus + missingExecutionFields
```

> Evidence: `packages/project-contracts/src/index.ts:1433-1480`; schema validation in `packages/analysis-runtime/src/schema-validator.ts`

### 7.4 Assessment

Strengths:
- `VisualDecisionPacket` is a comprehensive, well-structured artifact
- Every value can carry evidence references
- 9 decision statuses capture the full lifecycle from inference to confirmation
- Repair metadata provides full audit trail

Weaknesses:
- **4 versions of "creative decision"** create confusion about what's canonical
- `poster` and `vi` media translations are thin/underspecified (0 deliverable-specific rules in analysis-runtime)
- No unified "Creative Decision" service — the packet is built in `visual-decision-packet.ts` but there's no dedicated module owning it
- Migration between versions is partial (some adapters exist, others are ad-hoc)

---

## 8. Style Profile Structures

### 8.1 Current State

Style Profiles exist in multiple forms but are **not a central concept in the current production pipeline** (Short-Chain era):

| Form | Location | Schema | Role in Current Pipeline |
|---|---|---|---|
| `StyleProfile` (v6) | `project-contracts:580+` | 6.0 | Legacy (Style Profile Engine era) |
| `StyleProfileStatus` | `project-contracts:575` | — | `drafted` / `reviewing` / `approved` / `archived` |
| `ReferenceStyleProfile` | `application-contracts.ts:1153` | — | Reference project style analysis |
| `VisualIdentity` (in ShortChain context) | `project-contracts:928` | 2.0 | Current production — tone + 6 behavior systems |
| `core_reusable_assets` (v2 directions) | `labs/.../direction-contract-v2.js:161` | v2-execution | Lab only — decomposes style into executable components |

### 8.2 Current Production: VisualIdentity (decomposed style)

In `ProjectVisualContextShortChain` (`project-contracts:928`):

```typescript
interface ProjectVisualIdentity {
  tone: string;
  colorBehavior: ColorBehavior;
  graphicBehavior: string;
  materialBehavior: string;
  compositionBehavior: string;
  lightingBehavior: string;
}
```

This is a **flattened, execution-oriented** style representation — not a "style profile" as a creative artifact. It feeds directly into prompt compilation.

### 8.3 Lab v2: Style Decomposed into Executable Components

The lab's v2 direction schema decomposes "style" into:
- `core_reusable_assets[]` — 6 types (graphic, information, photography, layout, etc.)
- `graphic_system` — how graphics form, scale/crop/repeat, brand fact mapping
- `photography_object_system` — real industry objects, subject & background, etc.
- `information_system` — core brand info hierarchy, capability info, data/qualification info, CTA
- `layout_behavior` — subject area, info area, brand area, whitespace, data note, multi-size adaptation
- `material_and_light_support` — material + lighting execution support
- `composition_templates[]` — reusable composition patterns
- `anti_concept_art_constraints[]` — 9 fixed anti-concept-art rules

This decomposition is more sophisticated than the production `VisualIdentity` but exists only in the lab.

> Evidence: `labs/document-visual-directions/src/visual-translation/v2/schemas/direction-contract-v2.js`

### 8.4 Assessment

- **Style Profile as a standalone concept is legacy** — the v6 `StyleProfile` type exists but Short-Chain bypasses it
- **Current production uses decomposed behavioral style** (`VisualIdentity` + `colorBehavior` etc.) embedded in the context
- **Lab has richer style decomposition** but it's trapped in the frozen experiment
- **No style versioning or diffing** in production
- **Style Profile service exists** (`style-profile-service.ts`) but likely serves legacy workflows

---

## 9. Locked Assets Ownership

### 9.1 Current Architecture

Locked assets are defined at the **project level** and flow downward to all consumers. There are multiple representations:

| Representation | Location | Schema | Owner |
|---|---|---|---|
| `LockedAsset` (canonical) | `project-contracts:411+` | 6.0 | `locked-assets-service.ts` |
| `LockedAssetEvidence` (core pack) | `application-contracts.ts:231` | — | `asset-selection-protocol/` |
| `VisualDecisionLockedAsset` (packet) | `project-contracts:1180` | packet 1.0 | analysis pipeline |
| `CurrentProjectVisualPermissions` | `application-contracts.ts:1282` | — | reference-first |
| `lockedAssets` (ShortChain context) | `project-contracts:920` | 2.0 | `project-visual-context-builder.ts` |

### 9.2 Locked Asset Types (10 types)

`LockedAssetType` enum (`project-contracts:397`):
1. `brand_name`
2. `logo`
3. `product_category`
4. `packaging_structure`
5. `packaging_artwork`
6. `product_color`
7. `product_arrangement`
8. `core_symbol`
9. `required_visual_element`
10. `forbidden_reference_content`

Each has `priority` (high/medium/low), `rule` (the lock rule), `allowedChanges`, `forbiddenChanges`, and `evidence`.

### 9.3 Persistence

```
project-root/locked-assets/
├── index.json           # LockedAssetIndex (schema 6.0)
├── items/<id>.json      # Individual LockedAsset
└── thumbnails/          # Asset thumbnails
```

Service: `locked-assets-service.ts` (CRUD + validation + persistence)

### 9.4 Lock Enforcement

Locked assets are enforced at multiple layers:
- **Analysis repair layer**: `evidence-safe-merge.ts` protects locked + confirmed fields from AI overwrite
- **Generation layer**: Space and Packaging compilers check locked assets and enforce them in prompts
- **Reference-First layer**: `ReferenceFirstPermissionMatrix` defines what can cross from reference project
- **Validation gates**: Multiple gate evaluators check asset authorization

### 9.5 Assessment

Strengths:
- 10 well-defined lock types
- Multi-layer enforcement (analysis → generation → reference)
- Evidence-backed locks (each lock can cite its source)
- Proper persistence with atomic writes

Weaknesses:
- **5+ representations** of locked assets at different layers — no single canonical form
- **No unified Locked Asset service that all layers consume** — each layer does its own projection
- **Lock ownership model is implicit** — who can lock what, and under what conditions, is distributed
- **No lock lifecycle** — locks are static; no concept of "locked for phase X, revisitable in phase Y"

---

## 10. Visual Analysis Output Contracts

### 10.1 Primary Output Contracts

| Contract | Schema Version | Producer | Consumer |
|---|---|---|---|
| `VisualDecisionPacket` | 1.0 | `pipeline-service` → `analysis-runtime` | Space generation, `project-visual-context-builder` |
| `ProjectVisualContextShortChain` | 2.0 | `project-visual-context-builder` | Space generation, Packaging generation |
| `DocumentVisualContext` | 1.0 | `document-context-service` | Analysis pipeline enrichment |
| `VisualUnderstandingCore` | 1.0 | Unified visual understanding | Analysis runtime input |
| `AssetSelectionProtocolResult` | `asset-selection-protocol-v1` | `asset-selection-protocol/` | Reference-First, analysis |
| `ResolvedProjectContext` | 1.0 | `context-resolver.ts` | UI display, downstream services |

### 10.2 VisualDecisionPacket — Primary Structured Output

The `VisualDecisionPacket` is the **richest and most production-critical** analysis output. It's validated by `analysis-runtime` with ~28 field repair policies, repaired via AI + deterministic methods, and carries full audit trail.

Deliverable coverage in analysis-runtime:
- **`space`**: ~15 deliverable-specific required fields + spatial semantic validation
- **`packaging`**: 4 deliverable-specific required fields
- **`poster`**: 0 deliverable-specific rules (uses shared rules only)
- **`vi`**: 0 deliverable-specific rules (uses shared rules only)

> Evidence: `packages/analysis-runtime/src/deliverable-sufficiency.ts` (space rules most complete), `packages/analysis-runtime/src/field-repair-policy.ts` (28 total rules)

### 10.3 Migration Path

There is a known migration path from older formats:

```
PromptSourceObject (vNext era)
  ↑ ↓ adapter: visualDecisionPacketToPromptSourceObject()
VisualDecisionPacket (schema 1.0)
  ↑
VisualUnderstandingCore (structured analysis core)
```

The adapter (`visual-decision-packet.ts:278`) converts packet → old format for backward compatibility with persisted contexts.

### 10.4 Assessment

- **VisualDecisionPacket is the strongest candidate** for CI module's primary output contract
- **poster and vi are underspecified** — no deliverable-specific validation or repair rules
- **Migration adapters exist but are partial** — some legacy conversions are ad-hoc
- **No versioning framework** — schema versions are hardcoded strings with no formal migration system beyond `schema-migrations.ts` (which handles 0.x → 1.0)

---

## 11. Model / Runtime / Provider Infrastructure

### 11.1 Architecture

Three layers:

```
┌─────────────────────────────────────────────────┐
│  Strategy Layer                                  │
│  provider-policy.js (runtime-core)               │
│  ─ Default provider, fallback rules, override    │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│  Abstraction Layer                               │
│  @masterpiece/model-runtime                      │
│  ─ Analysis Provider contract                    │
│  ─ Reasoner interface (multimodal + text)        │
│  ─ Response parser (3-level JSON repair)         │
│  ─ Model capabilities                            │
│  ─ Provider health                               │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│  Implementation Layer                            │
│  Qwen Reasoner / Volcengine Reasoner /           │
│  OpenAI-compatible Text Reasoner                 │
│  ─ HTTP clients, error normalization              │
└─────────────────────────────────────────────────┘
```

### 11.2 Providers

| Provider | Model | Protocol | Analysis | Image Gen |
|---|---|---|---|---|
| Volcengine (default) | `doubao-seed-2.1-turbo` | OpenAI-compatible multimodal | Yes | Yes (seedream-5.0-pro) |
| Qwen (alternative) | `qwen3.6-plus` | OpenAI-compatible multimodal | Yes | Yes (wan2.7-image-pro) |
| OpenAI | `gpt-image-2` | OpenAI image generation | No | Yes |
| Google | `nano-banana` | Gemini image generation | No | Yes |

### 11.3 Reasoner Interfaces

**Multimodal analysis reasoner** (for visual analysis):
```
Input:  { prompt: { messages, attachments }, signal, maximumDurationMs, responseSchema }
Output: { runId, provider, model, completedAt, reportMarkdown, benchmarkSources,
          inspectedAssetIds, provenance }
```

**Text streaming reasoner** (for structured repair, creative reading):
```
Input:  { messages, stream, maxOutputTokens, enableThinking, thinkingBudget, signal }
Output: { runId, provider, model, text, finishReason, usage, completedAt }
```

### 11.4 Model Registry

`@masterpiece/model-registry` — static catalog, version 2.0.0, 5 registered models.

**Gap**: `doubao-seed-2.1-turbo` (default analysis model) is NOT in the model registry. It only appears in `provider-policy.js`.

### 11.5 Error Normalization

7 standardized error codes:
`AUTHENTICATION_FAILED`, `TIMEOUT`, `RATE_LIMITED`, `MALFORMED_RESPONSE`, `MODEL_UNAVAILABLE`, `REQUEST_FAILED`

### 11.6 Assessment

Strengths:
- Clean 3-layer architecture (strategy → abstraction → implementation)
- Dual provider design (Qwen + Volcengine symmetric implementations)
- Standardized error codes
- 3-level JSON response repair (fence strip → comma repair → bracket closure)
- Provider health tracking
- Injection-based (no hard dependencies on specific providers)

Weaknesses:
- **Model registry is incomplete** — default analysis model not registered
- **No auto-retry at model-runtime layer** — retry is left to each consumer
- **No shared base class for reasoners** — Qwen and Volcengine are near-duplicate implementations
- **Model capabilities data is sparse** — only qwen3.6-plus has (unverified) cap data

---

## 12. Persistence Audit

### 12.1 Project Directory Structure

```
projects/<name>-<uuid8>/
├── project.json                    # ProjectRecord (master index)
├── input/assets/                   # Raw assets (uuid.ext, sha256-deduped)
├── generation-references/          # Reference images for generation
├── prepared/                       # Preprocessing intermediates (cache-invalidable)
├── outputs/                        # Reports, visual context, etc.
├── runtime/                        # Run-time state, telemetry
├── project-context/                # Short-Chain visual context (schema 2.0)
│   ├── visual-context-short-chain-*.json
│   ├── visual-decision-packet.json
│   ├── analysis-repair-audit.json
│   └── history/                    # Packet history (initial, repaired-01, repaired-02)
├── session.json                    # CreativeSession
├── logs/creative-session.ndjson    # Session event log
├── locked-assets/                  # Locked asset store
│   ├── index.json
│   ├── items/<id>.json
│   └── thumbnails/
└── image-generation/<runId>/       # Image generation runs
    ├── run.json
    ├── task.json
    ├── images/
    └── thumbnails/
```

### 12.2 Key Persistence Mechanisms

| Mechanism | Implementation | Location |
|---|---|---|
| Atomic JSON writes | `atomicWriteJsonWithRetry` | `runtime-core/.../runtime/atomic-write.ts` |
| Event logging | ndjson append (`appendRuntimeEvent`) | runtime-core |
| Write coordination | `RunWriteCoordinator` (queue) | runtime-core |
| Asset deduplication | SHA-256 content hash | `project-store.ts` |
| Path safety | `assertInside` boundary check | multiple files |
| Run ID validation | Regex: `repair-run-[uuid]` | `analysis-repair-store.ts` |

### 12.3 Checkpoint Model for Analysis

Checkpoints are artifact-based, not state-machine based:
- Analysis pipeline: `.runtime/run-report.json` + cached intermediate files
- Document context: `document-runs/<runId>/intermediate/*.json`
- Analysis repair: `project-context/history/` + `dataRoot/runtime/repair-sessions/<runId>/`
- Resume: by checking existence of intermediate files, not by restoring a state machine

### 12.4 Assessment

Strengths:
- Well-structured project directory layout
- Atomic writes everywhere (no half-written state)
- SHA-256 asset deduplication
- Path safety checks
- Repair history (initial + 2 attempts + final + audit)

Weaknesses:
- **No unified checkpoint/state machine framework** — each service rolls its own
- **No event sourcing** — event logs exist but aren't the source of truth
- **No migration framework for persisted entities** — each service handles versioning ad-hoc
- **Analysis runs not indexed at project level** — you have to scan `runtime/` directories

---

## 13. Current Space Input Boundary

### 13.1 Data Flow

```
ProjectVisualContextShortChain (schema 2.0)
  ├── brandCore (name, industry, brandRole, audience)
  ├── lockedAssets
  ├── visualIdentity (tone + 6 behavior systems)
  ├── styleBoundaries
  ├── promptSourceObject (legacy format, optional)
  ├── visualDecisionPacket  ← **PRIMARY INPUT**
  └── packagingTranslations (not used by Space)
         ↓
short-chain-service.compile()
         ↓
compileShortChainGeneration()
         ↓
compileSpacePrompt()
  consumes:
  ├── VisualDecisionPacket (REQUIRED)
  ├── taskContract (deliverableFamily, subtype, shot, etc.)
  ├── projectContext
  ├── brandKey
  └── referenceImages (optional)
```

### 13.2 Hard Dependencies

`adaptSpaceSource()` (`packages/image-generation-runtime/src/space/source-adapter.js:88`) is **fail-closed** — it requires:
- `packet.mediaTranslations.spatial` — spatial concept, worldview, mechanisms, etc.
- `packet.projectFacts` — brand name, industry, brand role
- `packet.creativeDecision` — strategic direction
- `packet.colorSystem`, `materialSystem`, `lightingSystem`
- `compileSpatialMechanisms(packet)` — semantic action-verb IR pipeline

If `packet.validation.executionDataStatus !== 'ready'`, generation fails.

### 13.3 Gaps

1. **VisualDecisionPacket is a hard requirement** — no packet, no Space generation
2. **Spatial semantic IR depends on analysis quality** — bad analysis → degraded semantic IR → degraded prompt
3. **Architecture anchor selection depends on brand key** — brand misidentification → wrong anchors
4. **3-tier logo fallback** (packet → promptSourceObject → context) can be inconsistent

---

## 14. Current Packaging Input Boundary

### 14.1 Data Flow

```
ProjectVisualContextShortChain
  ├── lockedAssets
  ├── packagingTranslations
  │   ├── analysis_led
  │   └── reference_first
  ├── projectIdentity
  └── visualIdentity
         ↓
Packaging Workspace (workspace-service.js)
  ├── truthSnapshot (lockedAssets, analysisContext, projectIdentity, projectVisualContext)
  └── intent (generationMode, shotContract, referenceAssignments, providerModelId, etc.)
         ↓
projectIntentToTranslationInput()
         ↓
createPackagingTranslation(input)
         ↓
compilePackagingPrompt(translation)  [14-block topology]
```

### 14.2 Translation Input Schema

```
target: 'packaging'
modelId
generationMode: analysis_led | reference_first
shotContract: { id }
lockedAssets
structure: { formFactor, structuralFeatures }
visualDirection: { summary }
referencePolicy: { enabled, required, references }
providerCapability
userConstraints
negativeConstraints
projectIdentity
analysisContext
provenance
```

### 14.3 Gaps

1. **Truth surface comes from caller** — Workspace service doesn't build it itself; caller-side error propagates
2. **Dual translation producers** — `analysis_led` and `reference_first` are independent slots; merge rules are complex
3. **Structure info split** — `formFactor` from lockedAssets, `structuralFeatures` from projectVisualContext
4. **visualDirection is just a summary string** — no structured decomposition (color, motif, material separate)
5. **projectIdentity / analysisContext have no schema validation** at the Workspace boundary

---

## 15. Legacy Capability Matrix

Classification key:
- **REUSE** — use as-is, no change needed
- **EXTRACT** — move into CI module from current location, minimal change
- **ADAPT** — modify substantially for CI, but build on existing code
- **REWRITE** — existing code is not suitable; write fresh for CI
- **DEPRECATE** — existing code stays where it is; CI doesn't use it
- **IGNORE** — existing code is unrelated to CI or already dead

### 15.1 Document Ingestion

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| PDF parsing (pdfjs-dist) | `runtime-core/document-processing.ts` | EXTRACT | Production-proven, should move to CI-owned document ingestion |
| DOCX parsing (adm-zip + regex) | `runtime-core/document-processing.ts` | ADAPT | Works but fragile; should be upgraded to proper XML parsing |
| Markdown parsing | `runtime-core/document-processing.ts` | REUSE | Simple and correct |
| TXT parsing + encoding detect | `runtime-core/document-processing.ts` | REUSE | Good coverage (UTF-8, UTF-16LE, GB18030) |
| Document role classification | `document-ingestion/document-preparation.js` | EXTRACT | Useful heuristic, should be part of CI ingestion |
| Text splitting at natural boundaries | `document-ingestion/document-preparation.js` | REUSE | Simple utility, well-tested |
| Document set normalization + chunking | `document-ingestion/document-preparation.js` | ADAPT | Good foundation but untested; needs TS and better chunk strategy |
| Image extraction from documents | — | REWRITE | Not implemented at all; CI will need it |
| Table extraction (PDF) | — | REWRITE | Not implemented; DOCX tables only |
| `sharp` (declared but unused) | `document-ingestion/package.json` | DEPRECATE | Dead dependency |

### 15.2 Document Understanding

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| Document context extraction (facts only) | `runtime-core/document-context-service.ts` | ADAPT | Production-proven but limited scope; should become CI's "fact extraction" layer |
| Document context core (prompts + normalization) | `runtime-core/document-context-core.ts` | EXTRACT | Pure logic, no IO; perfect for extraction |
| One-shot Deep Creative Director (Markdown) | `apps/cli/src/analysis-engine/` | DEPRECATE | Unstructured output; CI needs structured data; keep for CLI but don't adopt |
| Visual translation v1 (conceptual directions) | `labs/document-visual-directions/v1/` | IGNORE | Frozen legacy, superseded by v2 |
| Visual translation v2 (execution directions) | `labs/document-visual-directions/v2/` | ADAPT | Rich output structure + gates are valuable, but JS→TS rewrite needed |
| Retrieval-first / Visual Fact First | `labs/document-visual-directions/v2/` | ADAPT | Innovative approach; worth adapting for CI's fact grounding |
| 10+ gate evaluators | `labs/document-visual-directions/v2/runtime/` | EXTRACT | Pure function evaluators; high value, low migration cost |
| Direction contract v2 schema | `labs/document-visual-directions/v2/schemas/` | ADAPT | Good structure but needs TS + align with VisualDecisionPacket |
| A/B runner | `labs/document-visual-directions/` | IGNORE | Testing infrastructure, not a CI capability |
| Benchmark retrieval | `labs/document-visual-directions/v2/visual-fact-first/` | ADAPT | Useful for grounding but needs proper data source |

### 15.3 Creative Decisions

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| `VisualDecisionPacket` (schema 1.0) | `project-contracts` | EXTRACT | Canonical structured output; move under CI ownership |
| `VisualUnderstandingCore` | `project-contracts` | EXTRACT | Core analysis structure; move to CI |
| Creative Decision v1 (snake_case) | `project-contracts:183` | DEPRECATE | Legacy, superseded |
| Creative Decision v6 (camelCase) | `project-contracts:735` | DEPRECATE | Legacy, Style Profile era |
| `PromptSourceObject.creativeDecision` | `project-contracts:1024` | DEPRECATE | Legacy adapter format |
| `creativeDecision` in VisualDecisionPacket | `project-contracts:1148+` | REUSE | Current canonical decision structure |
| Diagnosis (valuableAssets, misreadRisks, etc.) | VisualDecisionPacket.diagnosis | REUSE | Rich diagnostic structure |
| `mediaTranslations.spatial` | VisualDecisionPacket | REUSE | Comprehensive spatial translation |
| `mediaTranslations.packaging` | VisualDecisionPacket | ADAPT | Exists but thin; needs expansion |
| `mediaTranslations.poster` | VisualDecisionPacket | REWRITE | Underspecified (0 deliverable-specific rules) |
| `mediaTranslations.vi` | VisualDecisionPacket | REWRITE | Underspecified (0 deliverable-specific rules) |
| `abstractions` (VisualAbstractionV2[]) | VisualDecisionPacket | REUSE | Valuable concept, well-structured |

### 15.4 Evidence & Provenance

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| `EvidenceBackedValue<T>` pattern | `analysis-runtime/contracts.ts` | EXTRACT | Excellent pattern; should be CI's core value wrapper |
| `sourceFingerprint` (SHA-256) | `analysis-runtime/source-fingerprint.ts` | REUSE | Simple, effective |
| Chunk-level `evidenceRefs` + `contentHash` | `document-ingestion` | REUSE | Good granularity |
| Document field-level evidence | `DocumentVisualContextEvidence` | REUSE | Good document→fact mapping |
| Repair metadata (per-field audit) | `VisualDecisionPacket.repairMetadata` | REUSE | Complete audit trail |
| Context conflict tracking | `ContextConflict[]` | REUSE | Good merge tracking |
| Unified Evidence Ledger | — (does not exist) | REWRITE | Needed but not present; greenfield |
| Cross-artifact evidence indexing | — (does not exist) | REWRITE | Needed but not present; greenfield |

### 15.5 Style Profiles

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| StyleProfile (v6, legacy) | `project-contracts` | DEPRECATE | Legacy concept; not used in Short-Chain pipeline |
| `VisualIdentity` (ShortChain decomposed) | `ProjectVisualContextShortChain` | REUSE | Current production; execution-oriented |
| v2 decomposable style (reusable assets + systems) | `labs/.../direction-contract-v2.js` | ADAPT | Richer than production; worth extracting as CI style model |
| `ReferenceStyleProfile` | `application-contracts.ts:1153` | ADAPT | Good reference analysis structure; needs TS cleanup |
| Style Carrier concept | `application-contracts.ts:329-445` | EXTRACT | Valuable abstraction for style propagation |
| Style Profile service | `style-profile-service.ts` | DEPRECATE | Legacy workflow; keep but don't extend |

### 15.6 Locked Assets

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| LockedAsset type (10 types, schema 6.0) | `project-contracts:397-450` | EXTRACT | Well-defined; should be CI-owned |
| Locked asset CRUD service | `locked-assets-service.ts` | EXTRACT | Production-proven |
| Evidence-safe merge (lock protection) | `analysis-runtime/evidence-safe-merge.ts` | EXTRACT | Critical for AI safety; should be CI core |
| Asset selection protocol | `runtime-core/asset-selection-protocol/` | ADAPT | Rich protocol; needs CI module home |
| Reference-First permission matrix | `application-contracts.ts:1246` | ADAPT | Good permission model; needs generalization |
| Multi-layer lock enforcement | Distributed | REWRITE (unify) | Currently 5+ representations; needs unification |

### 15.7 Analysis Runtime

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| Schema validation | `analysis-runtime/schema-validator.ts` | REUSE | Robust, well-tested |
| Schema migration (0.x → 1.0) | `analysis-runtime/schema-migrations.ts` | ADAPT | Good pattern; needs expansion for future versions |
| Deliverable sufficiency evaluation | `analysis-runtime/deliverable-sufficiency.ts` | REUSE | Strong for space/packaging; expand for poster/vi |
| Field repair policy (28 rules) | `analysis-runtime/field-repair-policy.ts` | REUSE | Comprehensive |
| Missing field classifier | `analysis-runtime/missing-field-classifier.ts` | REUSE | Good severity/strategy mapping |
| Repair planner | `analysis-runtime/repair-planner.ts` | REUSE | Well-structured |
| Deterministic repair | `analysis-runtime/deterministic-repair.ts` | REUSE | Pure function, well-tested |
| AI repair (prompt + runner) | `analysis-runtime/structured-repair-runner.ts` | REUSE | Production-proven |
| Evidence-safe merge | `analysis-runtime/evidence-safe-merge.ts` | REUSE | Critical safety mechanism |
| Conflict resolver | `analysis-runtime/conflict-resolver.ts` | REUSE | Valuable utility |
| Repair audit | `analysis-runtime/repair-audit.ts` | REUSE | Complete audit trail |
| Clarification builder | `analysis-runtime/clarification-builder.ts` | REUSE | Human-in-the-loop interface |
| Orchestrator (main loop) | `analysis-runtime/analysis-completion-orchestrator.ts` | REUSE | Well-structured pipeline |
| Core facade | `analysis-runtime/core/visual-analysis-core.ts` | REUSE | Clean V5 standard entry |

### 15.8 Model Runtime

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| Analysis Provider contract | `model-runtime/analysis-provider.js` | REUSE | Clean abstraction |
| Provider registry | `model-runtime/analysis-provider-registry.js` | REUSE | Simple, extensible |
| Qwen reasoner | `model-runtime/qwen-reasoner.js` | DEPRECATE (keep as-is) | Don't move to CI; it belongs to model runtime |
| Volcengine reasoner | `model-runtime/volcengine-reasoner.js` | DEPRECATE (keep as-is) | Don't move to CI |
| Response parser (3-level JSON repair) | `model-runtime/response-parser.js` | REUSE | Robust; CI will need it |
| Model capabilities | `model-runtime/model-capabilities.js` | ADAPT | Good pattern but sparse data; expand |
| Provider health | `model-runtime/provider-health.js` | DEPRECATE (keep as-is) | Infrastructure, not CI |
| Model registry | `packages/model-registry/` | ADAPT | Good concept but incomplete; CI should help expand |

**Summary of the model runtime layer**: CI should **consume** the model runtime (through the provider contract) but not own provider implementations. The response parser and capabilities utilities are the only pieces to extract.

### 15.9 Persistence & Infrastructure

| Capability | Current Location | Classification | Rationale |
|---|---|---|---|
| Atomic JSON writes | `runtime-core/.../atomic-write.ts` | DEPRECATE (keep) | Infrastructure, not CI |
| Project store (ProjectRecord) | `runtime-core/project-store.ts` | DEPRECATE (keep) | Project persistence is project infrastructure |
| Analysis repair store | `runtime-core/analysis-repair-store.ts` | ADAPT | Extractable; move to CI with interface cleanup |
| Document context run store | `runtime-core/document-context-service.ts` | ADAPT | Part of the service; moves with it |
| Checkpoint / resume pattern | Distributed | REWRITE (unify) | Each service rolls its own; CI needs unified checkpoint framework |

---

## 16. Recommended CI Module Boundary

### 16.1 Proposed Package

```
@masterpiece/creative-intelligence
```

**Home**: `packages/creative-intelligence/`

### 16.2 What CI Owns

The Creative Intelligence module owns the **understanding and decision layer** between raw inputs (documents, images, assets) and execution (generation, rendering).

```
                     ┌──────────────────────────────┐
                     │  Creative Intelligence (CI)  │
                     │  @masterpiece/creative-      │
                     │  intelligence                │
                     └───────────────┬──────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
  Document Intelligence     Creative Decisions         Evidence & Locking
  ─────────────────────     ────────────────────     ─────────────────────
  • Ingestion (PDF/DOCX/MD/TXT)
  • Fact extraction         • CreativeDecisionV2      • Evidence Ledger
  • Document understanding  • VisualDecisionPacket    • Locked Assets
  • Style modeling          • Media translations      • Asset selection
  • Benchmark grounding     • Abstractions            • Permission matrix
  • Schema validation       • Style profiles          • Safe merge
  • Repair & self-heal      • Direction generation    • Conflict resolution
```

### 16.3 What CI Does NOT Own

- **Model providers / HTTP clients** → stays in `@masterpiece/model-runtime`
- **Image generation** → stays in `@masterpiece/image-generation-runtime`
- **Project persistence / store** → stays in `runtime-core`
- **Workspace / UI / IPC** → stays in `apps/` and `runtime-core` application layer
- **Packaging / Space generation services** → stay in `runtime-core` application layer
- **CLI commands** → stays in `apps/cli`

### 16.4 Public API Surface (proposed)

```typescript
// Document Intelligence
import { ingestDocument, extractFacts, classifyDocumentRole } from '@masterpiece/creative-intelligence/document-intelligence';

// Creative Decisions
import { completeStructuredAnalysis, validateCreativeDecision } from '@masterpiece/creative-intelligence/decisions';
import { type VisualDecisionPacket, type CreativeDecisionV2 } from '@masterpiece/creative-intelligence/decisions/schema';

// Evidence & Locking
import { EvidenceLedger, type EvidenceBackedValue } from '@masterpiece/creative-intelligence/evidence';
import { LockedAssetService, type LockedAsset } from '@masterpiece/creative-intelligence/locking';

// Style
import { buildStyleProfile, decomposeStyle } from '@masterpiece/creative-intelligence/style';
```

---

## 17. Allowed Dependency Directions

### 17.1 Dependency Graph (proposed)

```
apps/* (CLI, Web, Web-Runtime)
  │
  ▼
runtime-core (application services)
  │
  ├──────────────────────────┐
  ▼                          ▼
creative-intelligence     image-generation-runtime
  │                          │
  ├─ document-ingestion      └─ prompt compilation, gates
  ├─ decisions (analysis-runtime migrated in)
  ├─ evidence
  ├─ style
  └─ locking
  │
  ▼
model-runtime (provider abstraction)   project-contracts (shared types)
  │
  ▼
model-registry (static catalog)
```

### 17.2 Rules

1. **CI depends on** `model-runtime`, `project-contracts` (re-exported types), and shared utility packages
2. **CI does NOT depend on** `runtime-core`, `image-generation-runtime`, or any `apps/*`
3. **`runtime-core` depends on** CI (for analysis, decisions, evidence)
4. **`image-generation-runtime` does NOT depend on** CI — it receives structured data through `ProjectVisualContextShortChain` (no direct dependency)
5. **`apps/cli` depends on** CI for structured analysis (replacing current direct model calls for analysis)
6. **No circular dependencies** — CI is above model-runtime, below runtime-core

### 17.3 Type Ownership

- Types currently in `project-contracts` that are CI-owned: should be re-exported from CI, not moved (to avoid breaking existing imports immediately)
- Long-term: `project-contracts` becomes a thin re-export layer, with canonical definitions in their owning packages

---

## 18. Project Truth Model Gaps

### 18.1 Current State

There is **no unified "Project Truth Model"** concept. Facts are distributed:

| Fact Type | Carrier | Authority |
|---|---|---|
| Project identity (name, brand, industry) | `ProjectRecord` (project.json) | User input + detection |
| Extracted project facts | `DocumentVisualContext` | Document analysis + user confirmation |
| Sourced visual facts | `VisualUnderstandingCore.projectFacts` | Structured analysis |
| Prompt-ready facts | `PromptSourceObject.projectFacts` | Derived from analysis |
| Normalized project facts | `NormalizedProjectFacts` | Reference style capsule |
| Resolved project context | `ResolvedProjectContext` | Merge of visual + document context |
| Core pack | `CurrentProjectCorePack` | Asset selection protocol |
| Current project profile | `CurrentProjectProfile` | Reference-first reconstruction |

**8 different fact carriers**, each with slightly different field sets, authority models, and schema versions.

### 18.2 Specific Gaps

1. **No single source of truth** — which facts are authoritative? The answer depends on context
2. **No fact lifecycle** — facts don't have a defined lifecycle from "detected" → "verified" → "confirmed" → "locked"
3. **No conflict resolution framework** — when visual analysis says "brand role is X" and document analysis says "brand role is Y", who wins? The `ContextConflict` type tracks conflicts but doesn't resolve them
4. **No fact quality scoring** beyond generic `confidence: number` — what does 0.8 mean?
5. **No fact lineage** — can't trace a fact from its original source through all transformations to final output
6. **No unified fact schema** — each carrier has its own field names and structures
7. **Human confirmation is ad-hoc** — document context has a confirmation stage, but other fact sources don't

### 18.3 CI Opportunity

The CI module is the natural home for a **unified Project Truth Model**:

- CI ingests raw inputs (documents, images, user input)
- CI extracts and validates facts
- CI maintains fact provenance and lineage
- CI resolves conflicts (with human-in-the-loop)
- Downstream consumers (generation, UI, reports) read from CI's truth model

---

## 19. Evidence Ledger Gaps

### 19.1 Current State

Evidence tracking is **distributed and optional**:
- Every value *can* carry `evidenceRefs`, but most don't (fill rate is unknown)
- Evidence refs are just string IDs — no unified evidence store
- No cross-artifact evidence querying ("show me all claims supported by document X")
- No evidence quality assessment framework

### 19.2 Specific Gaps

1. **No Evidence Ledger entity** — evidence refs are just string arrays, not references to a real entity
2. **No evidence types** — all evidence is treated the same (document section vs. image vs. user confirmation vs. model inference)
3. **No evidence strength scoring** — `confidence` is on the value, not on the evidence itself
4. **No evidence aggregation** — multiple weak pieces of evidence don't combine into stronger confidence
5. **No evidence visualization** — can't show the user "here's what this decision is based on"
6. **No evidence versioning** — when source material changes, evidence tracking doesn't cascade
7. **No evidence decay** — stale evidence doesn't get flagged (only whole-source fingerprint)

### 19.3 CI Opportunity

CI should introduce an **Evidence Ledger** as a first-class concept:

```
EvidenceLedger {
  entries: EvidenceEntry[]    // indexed, queryable
  claim(value) → evidence[]   // reverse lookup
  evidence(id) → claims[]     // forward lookup
  strength(evidence[]) → score // aggregation
}

EvidenceEntry {
  id: string
  type: 'document_section' | 'image_region' | 'user_input' | 'locked_asset' | 'model_inference' | 'external_reference'
  source: { documentId?, assetId?, page?, section?, region?, userId? }
  content: string             // excerpt or description
  timestamp: string
  strength: number            // inherent reliability of this evidence type
  citations: number           // how many claims cite this evidence
}
```

---

## 20. Creative Decision V2 Migration Requirements

### 20.1 Current State

Multiple decision formats coexist:
- v1 snake_case → legacy
- v6 camelCase → legacy (Style Profile era)
- V2 packet format → current production
- PromptSourceObject format → legacy (generation input)

### 20.2 Migration Requirements for CI

1. **Canonical format**: `CreativeDecisionV2` inside `VisualDecisionPacket` is the canonical CI decision format
2. **Backward compatibility**: CI must provide adapters for all existing formats
3. **Migration path**: All legacy formats must be convertible → V2; V2 → legacy conversion is optional (for backward compatibility only)
4. **Schema versioning**: CI must establish a formal schema versioning and migration framework (current `schema-migrations.ts` is a good start but only handles 0.x→1.0)
5. **Forward compatibility**: New decision fields must be additive; breaking changes require major version bump and migration tool
6. **Auditability**: Every migrated decision must carry `migrationFrom: 'v1' | 'v6' | 'promptSourceObject'` metadata
7. **Decision status lifecycle**: Formalize the 9 statuses (`confirmed`, `source_fact`, `inferred`, `proposed`, `system_default`, `unknown`, `conflicted`, `stale`) as a state machine with defined transitions
8. **Deliverable parity**: `poster` and `vi` media translations need to reach the same richness as `spatial`

---

## 21. Recommended CI-1 Implementation Scope

**CI-1: Foundation & Extract**

The first CI phase should be narrow and low-risk — extract existing capabilities into the new module without adding new functionality.

### 21.1 In Scope

1. **Create `@masterpiece/creative-intelligence` package**
   - TypeScript, ESM, standard `@masterpiece/*` package pattern
   - Private: true, version: 0.0.0
   - Sub-path exports: `./document-intelligence`, `./decisions`, `./evidence`, `./style`, `./locking`

2. **Migrate `@masterpiece/analysis-runtime` into CI as `./decisions`**
   - Move all 17 modules (schema validator, repair policy, orchestrator, etc.)
   - Keep all existing exports working (re-export from old path for backward compatibility)
   - 0 functional changes
   - Add CI-specific facade entry point

3. **Extract document context core into CI as `./document-intelligence`**
   - Move `document-context-core.ts` (pure logic, prompts, normalization)
   - Keep service layer (IO, persistence) in runtime-core
   - Move `document-processing.ts` from runtime-core to CI
   - Move `document-preparation.js` from document-ingestion to CI (convert to TS)
   - Delete `@masterpiece/document-ingestion` package (its contents moved, `sharp` dep removed)

4. **Establish Evidence Ledger skeleton**
   - Define `EvidenceEntry` type
   - Define `EvidenceLedger` interface
   - Provide basic in-memory implementation
   - Wire up existing `evidenceRefs` patterns to use the ledger
   - No database/persistence in CI-1

5. **Unify type definitions for core CI concepts**
   - `VisualDecisionPacket` — canonical definition in CI (re-exported from project-contracts)
   - `CreativeDecisionV2` — canonical in CI
   - `EvidenceBackedValue<T>` — canonical in CI
   - `LockedAsset` — canonical in CI (moved from project-contracts)
   - Add `ProjectTruthModel` interface — defines the unified fact surface
   - Keep `project-contracts` as re-export layer to avoid breaking consumers

6. **Tests**
   - All existing analysis-runtime tests continue to pass
   - New tests for evidence ledger
   - Migration tests (old → new format)

### 21.2 Out of Scope (for CI-1)

- ❌ New analysis capabilities (no new prompts, no new models)
- ❌ Document understanding improvement (current capabilities move as-is)
- ❌ Style profile overhaul (defer to CI-2 or later)
- ❌ Creative direction generation (defer)
- ❌ Benchmark retrieval system (defer)
- ❌ UI changes (zero UI impact)
- ❌ Workspace changes (zero workspace impact)
- ❌ Generation runtime changes (zero generation impact)
- ❌ Provider additions or changes
- ❌ Persistence framework overhaul (keep current patterns)
- ❌ Poster/VI deliverable expansion (defer)

### 21.3 Why This Scope

- **Low risk**: all code is proven in production; we're moving it, not changing it
- **Clear boundary**: establishes the CI module without inventing new capabilities
- **Backward compatible**: all existing consumers continue to work via re-exports
- **Foundation for future phases**: CI-2+ can build on the established module
- **Production code delta is mechanical**: moves + re-exports, no logic changes

---

## 22. Verdict

### CONDITIONAL GO

**Rationale:**

The repository has substantial, production-proven infrastructure that a Creative Intelligence module can build on. The `analysis-runtime` package alone is a mature validation and self-healing system with 14+ test files covering every major module. Document ingestion works for 4 formats. The VisualDecisionPacket is a comprehensive structured output contract. Evidence tracking exists at the value level.

However:

1. **The CI concept does not yet exist as a coherent module** — capabilities are scattered across 6+ packages and 1 lab
2. **There are 8 different fact carriers** with no unified Project Truth Model
3. **Evidence Ledger is a gap** — the pattern exists but there's no ledger entity
4. **poster and vi deliverables are underspecified** in the analysis runtime
5. **Style profile concept is in transition** — legacy v6 profiles vs. current decomposed VisualIdentity vs. lab v2 decomposition

**Conditions for GO:**

1. CI-1 scope MUST be narrow (extract + establish boundary, no new capabilities)
2. All existing tests MUST continue to pass
3. Backward compatibility MUST be maintained (re-exports from old paths)
4. Zero production behavior change in CI-1
5. Visual analysis behavior, generation runtime, and UI remain unchanged

### Recommended CI-1 Summary

| Aspect | Value |
|---|---|
| **Phase name** | CI-1: Foundation & Extract |
| **Primary deliverable** | `@masterpiece/creative-intelligence` package |
| **Scope** | Extract analysis-runtime + document core + type unification + evidence ledger skeleton |
| **Risk level** | Low (all code is production-proven; mechanical moves) |
| **Functional change** | Zero — only structural / ownership change |
| **Estimated package size** | ~30 source files (17 from analysis-runtime + ~8 from document processing + ~5 new) |
| **Consumer impact** | Zero — re-exports maintain backward compatibility |
| **Production code delta** | Mechanical moves + re-exports; no logic changes |
| **Test impact** | All existing tests pass (file path updates only) |
| **Blocked on** | Nothing — can proceed immediately |

---

## 23. Evidence Index

| Claim | Primary Evidence |
|---|---|
| 3 analysis entry points (CLI, pipeline, doc-context) | `apps/cli/src/analysis-engine/bootstrap.js`, `packages/runtime-core/src/application/pipeline-service.ts`, `packages/runtime-core/src/application/document-context-service.ts` |
| labs/document-visual-directions is frozen, not in production | README, package.json, grep for `@masterpiece-labs` in packages/ → 0 |
| VisualDecisionPacket is the canonical structured output | `packages/project-contracts/src/index.ts:1433`, `packages/analysis-runtime/src/schema-validator.ts` |
| 8 fact carriers, no unified truth model | ProjectRecord, DocumentVisualContext, VisualUnderstandingCore, PromptSourceObject, NormalizedProjectFacts, ResolvedProjectContext, CurrentProjectCorePack, CurrentProjectProfile |
| Evidence tracking is distributed, no ledger | Grep for "evidence ledger" → 0 matches; evidenceRefs in 8+ different types |
| analysis-runtime has 14 test files, 17 modules | `tests/runtime-application/` directory, `packages/analysis-runtime/src/` directory |
| Document parsing is in runtime-core, not in document-ingestion | `packages/runtime-core/src/application/document-processing.ts`; `packages/document-ingestion/src/` contains only role classification and text splitting |
| `sharp` is a dead dependency in document-ingestion | Grep for "sharp" in `packages/document-ingestion/src/` → 0 matches |
| Space generation hard-depends on VisualDecisionPacket | `packages/image-generation-runtime/src/space/source-adapter.js:88` |
| Packaging has dual translation producers (analysis_led + reference_first) | `packages/runtime-core/src/application/packaging/workspace-service.js:230` |
| 4+ creative decision version schemas exist | `project-contracts:183` (v1), `project-contracts:735` (v6), `project-contracts:1148+` (V2 packet), `project-contracts:1024` (PromptSourceObject) |
| No unified Evidence Ledger entity exists | Grep "evidence.?ledger" across whole repo → 0 matches |
| Provider policy designates Volcengine as default + Qwen as alternative | `packages/runtime-core/src/application/provider-policy.js` |
| 7 standardized provider error codes | `packages/model-runtime/src/analysis-provider.js:38-49` |
| Model registry has 5 models but lacks default analysis model | `packages/model-registry/src/index.js`; `doubao-seed-2.1-turbo` only in provider-policy |
| 10 LockedAsset types, schema 6.0 | `packages/project-contracts/src/index.ts:397-450` |
| Locked asset service with CRUD + persistence | `packages/runtime-core/src/application/locked-assets-service.ts` |
| Evidence-safe merge protects locked + confirmed fields | `packages/analysis-runtime/src/evidence-safe-merge.ts:27` |
| 6 document roles with regex classification | `packages/document-ingestion/src/document-preparation.js:3-10` |
| 10+ deterministic gate evaluators in lab v2 | `labs/document-visual-directions/src/visual-translation/v2/runtime/` (brand-identity-preservation, business-model-coverage, consumer-value-coverage, compliance-weight, e02-aesthetic-gate, etc.) |
| Asset Selection Protocol with near-dup detection | `packages/runtime-core/src/application/asset-selection-protocol/index.ts` |
| Style Carrier concept (8 categories) | `packages/runtime-core/src/application-contracts.ts:329-445` |
| 3 response parser repair levels | `packages/model-runtime/src/response-parser.js` |
| Atomic write + path safety across persistence | `packages/runtime-core/src/application/runtime/atomic-write.ts` + `assertInside` pattern |
| `projectTruth` does not exist as a concept | Grep "projectTruth" across whole repo → 0 matches |

---

## 24. Methodology &amp; Limitations

### 24.1 Methodology

This audit was conducted by:
1. Recording exact repository state (branch, HEAD, working tree)
2. Systematic exploration of all 14 `@masterpiece/*` packages and 3 labs
3. Reading source code, types, package manifests, and test files
4. Tracing call paths and data flow between modules
5. Cross-referencing claims against multiple sources
6. Classifying each capability using the REUSE/EXTRACT/ADAPT/REWRITE/DEPRECATE/IGNORE framework

### 24.2 Limitations

1. **Dynamic behavior not verified** — this is a static code audit; runtime behavior is inferred from source
2. **Test coverage is assumed from file presence** — individual test assertions were not audited in depth
3. **Lab code was audited at the architecture level** — detailed internal logic of v2 gate evaluators was not exhaustively reviewed
4. **Chinese comments in some files are garbled** (GBK→UTF-8 encoding issue in `application-contracts.ts`) — type names and field structures are unaffected, but documentation comments may be misread
5. **Historical context from git was not deeply reviewed** — conclusions about "legacy" status are based on code structure and naming, not full git history analysis
6. **Golden cases and evaluation assets were not reviewed** — they are in `evaluation/` and production-boundary separated

### 24.3 UNVERIFIED Claims

The following conclusions are marked **UNVERIFIED** and should be validated before CI-1 planning:

| Claim | Why Unverified | How to Validate |
|---|---|---|
| fill rate of `evidenceRefs` in real analysis output | Static audit can't count actual refs in production data | Run real analysis, count evidenceRefs in output |
| Poster/VI deliverable rules are truly zero | The deliverable-sufficiency file was read but the full rule matrix was not exhaustively verified | Run `npm run runtime:test` with focused test |
| `sharp` is completely dead in document-ingestion | Grep found 0 src/ imports, but it might be used dynamically | Check bundle or runtime import |
| Full set of 8 fact carriers | Survey was based on type exploration; runtime-only carriers might be missed | Trace all code paths that write project facts |
| Analysis runtime module count (17 modules) | Based on directory listing; some utility files might be miscounted | Verify against index.ts exports |

---

## 25. End of Audit

**Audit complete.** Production code delta: **0**. New document: 1 file at `docs/creative-intelligence/ci-0/legacy-capability-audit-and-foundation-contract.md`.

Next step (if approved): CI-1 — Foundation & Extract. Create `@masterpiece/creative-intelligence` package, migrate `analysis-runtime`, extract document intelligence core, establish evidence ledger skeleton, and unify core types.
