# CI-R0 Legacy Capability Audit

Status: **AUDIT COMPLETE — PRODUCTION CODE DELTA 0**  
Branch: `codex/creative-intelligence-r0-audit`  
Base HEAD: `ce0e6f7f`  
Audit date: 2026-08-27

## 1. Scope and evidence rule

CI-R0 is an audit-only stage. No production runtime, UI, provider, schema,
Packaging, Space, Reference First, Prompt, or Golden file is changed. Findings
are based on current imports, service construction, operation registration,
current Web invocation, persistence code, tests, and current authority files.
Historical names and `ARCHIVED.md` filenames are not treated as verdicts.

The machine authority is `config/repository-contract/current-authorities.json`.
The current production chain is:

```text
apps/web
  -> apps/web/src/web-api.ts
  -> apps/web-runtime/src/current-operation-graph.ts
  -> packages/runtime-core/src/operations/*
  -> packages/runtime-core/src/application/*
  -> shared capability/provider packages
```

`CURRENT_BASELINE.md` sections 2–9 and
`docs/baseline/baseline-files-manifest.md` still contain removed Desktop and
old versioned paths. They are useful historical/frozen-baseline evidence but
are not reliable current-path maps. This drift is a governance follow-up; it is
not corrected inside CI-R0.

## 2. Capability inventory

| Capability | Current path | Production consumer / reachability | State | Recommendation |
|---|---|---|---|---|
| Document parsing | `packages/runtime-core/src/application/document-processing.ts` | `document-context-service.ts`; Project planning-brief registration; runtime tests | CURRENT | REUSE through an adapter |
| Document role/corpus preparation | `packages/document-ingestion/src/document-preparation.js` | Document Context, Creative Reasoning, CI strategic synthesis | CURRENT | REUSE |
| Document Context | `packages/runtime-core/src/application/document-context-service.ts` | Runtime services → `document-context:*` operations → current Web and current CI | CURRENT AUTHORITY | KEEP_FROZEN; call through an adapter |
| Project persistence | `packages/runtime-core/src/application/project-store.ts` | Runtime services → project operations → Web | CURRENT | KEEP_FROZEN |
| Project Context | `project-context-service.ts`, `context-resolver.ts`, `context-integration-service.ts` | Reference Anchor, Short Chain, Packaging handoff | CURRENT | KEEP_FROZEN |
| Project asset persistence | `project-store.ts` (`ProjectAsset`, `persistBufferAsset`) | Upload, browser-byte import, analysis and generation references | CURRENT | KEEP_FROZEN; reuse one asset authority |
| Reference First | `reference-first-reconstruction.ts`, `reference-first/protocol/*` | Reference Anchor and image-generation/Space integration | CURRENT AUTHORITY | KEEP_FROZEN |
| Reference Anchor | `reference-anchor-service.ts` | `reference-anchor:*` RPC and current `ReferenceAnchorWorkspace` | CURRENT | ADAPT for local/user reference intake only |
| Creative Intelligence pure capabilities | `packages/creative-intelligence/src/*` | Direct imports from Runtime Core; analysis-runtime compatibility facades; current tests | CURRENT DEPENDENCY | ADAPT selected pure capabilities |
| Creative Intelligence application flow | `creative-intelligence-application-service.ts` | Runtime services → `creative-intelligence:*` RPC → current Web workspace | CURRENT PRODUCT FLOW | KEEP_FROZEN during migration; do not extend as V1 domain |
| Creative Intelligence Web UI | `CreativeIntelligenceWorkspace.tsx`, `apps/web/src/ciworkspace/*` | Routed from current `App.tsx` | CURRENT UI | ADAPT visual patterns; do not grow the monolith |
| Creative Production Runtime | `packages/creative-production-runtime/src/*` | Many Runtime Core application services and current tests | CURRENT DEPENDENCY | KEEP_FROZEN |
| Creative Session | `creative-session-service.ts`, `creative-production-runtime/src/session.js` | `creative-session:*` operations and Creative Production | CURRENT PERSISTED CONTRACT | KEEP_FROZEN; not a Creative Research Session |
| Anchor Candidate (production) | `anchor-candidate-service.ts`, `anchor-generation-service.ts` | Creative Production operations | CURRENT | ADAPT through application boundary |
| Anchor Production (current CI) | `anchor-production-service.ts`, CI package `anchor-production/*` | Current CI RPC and image-generation adapter | CURRENT | KEEP_FROZEN until V1 handoff is proven |
| Provider registry | `packages/model-registry/src/index.js` | Node settings/profile validation and Runtime Core | CURRENT AUTHORITY | REUSE; never create a second registry |
| LLM/Vision provider runtime | `packages/model-runtime/src/*` | Visual Analysis, Document Context, CI reasoning | CURRENT | REUSE through existing credentials/profile boundary |
| Image generation | image-generation service plus registered adapters | Short Chain, Creative Production and Anchor Production | CURRENT | KEEP_FROZEN; V1 AI exploration calls it through an adapter |
| Web Runtime file/RPC | `current-operation-graph.ts`, `node-native-operations.ts` | Browser document/visual import, files, settings, long-running services | CURRENT AUTHORITY | REUSE and extend later with a semantic CI-R1 namespace |
| Packaging | current Packaging application/core/compiler paths | Current Packaging UI/runtime | CURRENT FROZEN | KEEP_FROZEN; read-only handoff |
| Space | `packages/image-generation-runtime/src/space` | Current generation routes and Golden | CURRENT FROZEN | KEEP_FROZEN; read-only handoff |
| Historical CI phase docs | removed `docs/creative-intelligence/ci-*`, recoverable before `d980a78e` | No current runtime consumer | HISTORICAL | DO_NOT_USE as current architecture |

## 3. Runtime consumer findings

### 3.1 Current Creative Intelligence is live

`packages/runtime-core/src/application/runtime-services.ts` constructs
`createCreativeIntelligenceApplicationService`, supplies the current Document
Context bridge and Anchor Production service, and exposes the result in the
frozen service graph. `apps/web-runtime/src/current-operation-graph.ts` merges
`createCreativeIntelligenceOperations`. The current Web workspace calls
`window.masterpiece.creativeIntelligence` through the generic Web RPC proxy.

Therefore the current CI package, application service, RPC and UI are not dead
or historical. Their internal workflow is nevertheless not the proposed V1
workflow and should not become the foundation by incremental extension.

### 3.2 Old document analysis has production consumers

The current CI `start()` method delegates document intake to Runtime Services.
Runtime Services calls `documentContext.start()`, waits for
`awaiting_confirmation`, reads the extracted `DocumentVisualContext`, and
returns it to CI. Document Context is also directly exposed through
`document-context:*` operations and current Web UI.

Verdict: **YES — production consumer exists. KEEP_FROZEN + ADAPTER.**

### 3.3 Creative Production Runtime is active

`@masterpiece/creative-production-runtime` is imported by current Runtime Core
services for sessions, directions, style profiles, locked assets, visual
memory, reference packs, anchor candidates, canons, generation prompts,
series, revisions, and formal production. Those services are registered as
`creative-session:*`, `creative-production:*`, and `visual-memory:*`
operations. Dedicated package and runtime-application tests exercise them.

Verdict: **ACTIVE / NOT ARCHIVED / KEEP_FROZEN.**

## 4. Document and file pipeline

| Format | Parser | Output | Error behavior | Readiness |
|---|---|---|---|---|
| PDF | `pdfjs-dist` text extraction by page | `NormalizedDocument` with page sections and warnings | Fails if unreadable or no text; scanned/visual-only pages warn and all-scanned PDFs fail | Production-ready for text PDFs; no OCR |
| DOCX | `adm-zip` reads `word/document.xml` | headings, paragraphs, lists, tables, raw text | Fails closed for invalid ZIP, missing XML, or empty text | Production-ready for text-centric DOCX |
| Markdown | UTF-8/UTF-16/GB18030-aware text reader | heading sections and raw text | Empty text fails | Production-ready |
| TXT | same text decoder | one text section | Empty text fails; uncertain encoding warns | Production-ready |
| PPT/PPTX | none | none | rejected as unsupported by both browser import and parser | **NEW_CAPABILITY_REQUIRED** |

Document Context copies inputs into
`<defaultDataPath>/document-runs/<runId>/input`, persists normalized corpus and
confirmed/extracted context under `intermediate`, writes `runtime/run.json` and
events, and emits the JSON context plus Markdown brief under `outputs`. It has
explicit repair, confirmation, resume, cancellation, orphan reconciliation,
path-bound deletion, and fail-closed write behavior.

Browser document upload is staged by `current-operation-graph.ts` under the
host intake directory with 30-file and 32 MiB-per-file limits. It accepts only
PDF, DOCX, Markdown and TXT. The V1 Design Brief should reuse the parser and
intake transport but own a new semantic contract.

## 5. Persistence map

```text
defaultDataPath/
├─ projects/<project>/
│  ├─ project.json
│  ├─ input/assets/
│  ├─ generation-references/
│  ├─ prepared/
│  ├─ outputs/
│  └─ runtime/
├─ document-runs/<runId>/
│  ├─ input/
│  ├─ intermediate/
│  ├─ outputs/
│  └─ runtime/run.json + events
└─ creative-intelligence-runs/<runId>/
   ├─ runtime/run.json
   ├─ runtime/selection.json
   ├─ runtime/selection-history.json
   ├─ intermediate/*
   └─ anchor-production/*
```

`CreativeSession` is project-scoped production state with schema `6.0`; it
stores entity references, decisions, messages, workflow history, and
generation run IDs. It intentionally does not store final prompts. It is not a
safe semantic alias for a research session: the V1 research lifecycle needs
search queries, external-source provenance, selection negatives, board state,
and preference evidence.

## 6. Reference First reuse boundary

Reference First already provides explicit reference selection, role and
authenticity decisions, dedupe/fingerprints, task-specific subsets, style
carrier ranking, contamination controls, human preference/avoidance, approval,
and generation handoff. The project asset authority persists local user
references with SHA-256, project binding, MIME/extension limits, and
`generation_reference` usage.

It does not model remote search results, source URL, publisher, license,
attribution, query, rank, fetch time, or selected image regions. It also has a
strict generation-oriented policy whose semantics must not be changed to fit
research discovery.

Mapping to V1 sources:

| V1 source | Existing support | Decision |
|---|---|---|
| `USER_REFERENCE` | Strong local upload, persistence and explicit selection | ADAPT |
| `AI_EXPLORATION` | Existing image generation and run persistence | ADAPT behind frozen generation service |
| `WEB_REFERENCE` | No search/fetch/provenance domain | NEW_CAPABILITY_REQUIRED |

## 7. Provider/model decision

The current model registry distinguishes `analysis`, `image_generation`, and
`video_generation`, and validates protocol compatibility. Analysis uses the
`openai-chat-multimodal` boundary; registered image protocols include OpenAI,
Gemini, Seedream and legacy-compatible Wan. Node settings own profile
persistence and the Node credential store owns encrypted API keys/environment
overrides.

V1 LLM, Vision and AI exploration must use these authorities. A second model
registry, credential store, or direct provider call in the Web renderer is
prohibited.

## 8. Real search capability decision

```text
REAL WEB SEARCH:  NO
REAL IMAGE SEARCH: NO
OVERALL:          NO
```

Repository-wide production search found no search gateway, search provider,
SERP client, remote reference fetcher, result provenance contract, or search
history. `webSearchCalls` exists only as a runtime-trace metric field and test
fixture. Model endpoints are LLM/image-generation endpoints, not search.

Required future boundary: **`ReferenceSearchGateway`**. It must return source
metadata and assets; an LLM response must never be treated as proof of a real
search result.

## 9. Historical documentation classification

| Material | Classification | Reason |
|---|---|---|
| Current Repository Map / Namespace Dictionary / machine authorities | CURRENT | Current semantic paths and owners |
| Compatibility registry and persisted legacy adapters | COMPATIBILITY | Active readers/identifiers with removal conditions |
| S0 registry under `docs/repository-stabilization/history` | HISTORICAL | Explicit dated snapshot |
| Removed `docs/creative-intelligence/ci-*` families | HISTORICAL | Recorded in cleanup manifest; recoverable through Git |
| Historical phase plans as implementation authority | OBSOLETE | Must not drive current architecture |

No current README, Repository Map, Namespace Dictionary, or authority JSON
links an old Creative Intelligence phase document as the current source.

## 10. Protected boundaries

- Do not change Document Context schema/prompt/repair behavior while adapting it.
- Do not mutate Project Asset identity, path containment, hashing or usage rules.
- Do not weaken Reference First explicit-only, authenticity, contamination,
  target-scene, or approval behavior.
- Do not let V1 write Packaging or Space internal contracts; hand off through
  current application authorities.
- Do not create Web-side filesystem/provider authority.
- Do not update Golden assets or compatibility identifiers to fit V1.
- Do not remove current CI or Creative Production until migration gates in the
  deprecation plan are satisfied.

Detailed classification, model gaps, integration design and readiness are in
the sibling CI-R0 documents.
