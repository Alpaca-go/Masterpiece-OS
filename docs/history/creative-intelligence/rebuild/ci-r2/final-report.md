# CI-R2 Final Report

Branch: `codex/creative-intelligence-r2-design-brief-pipeline`

Base: `f42dfdbec9d9dd3cc5917a12be7747208140ef5d`

## Scope

CI-R2 implements the bounded Document-to-Design-Brief pipeline for Creative
Research. Real PDF, DOCX, Markdown and text documents are normalized through
the current parser, converted into traceable evidence, synthesized through the
current profile/credential/model authority, normalized deterministically and
persisted as immutable Design Brief revisions.

CI-R2 deliberately stops before real reference search, Search Provider
integration, Direction Board generation, Web UI, RPC registration and current
consumer migration. PPT/PPTX and OCR remain unsupported and fail explicitly.

## Production Delta

- `creative-research-document-adapter.ts` reuses the current document parser
  and role classifier, preserves source document identity and emits locators,
  bounded excerpts, parse warnings and multi-document conflict warnings.
- `creative-research-analysis-adapter.ts` resolves credentials through a host
  callback and reuses the current OpenAI-compatible text reasoner. It performs
  one primary structured call and no more than one repair call.
- `creative-research-design-brief-core.ts` owns the narrow JSON prompt,
  fail-closed parsing, evidence validation, deduplication and deterministic
  collection caps.
- `creative-research-store.ts` persists only Creative Research sessions and
  Design Brief revisions below
  `<defaultDataPath>/creative-research/<sessionId>/`. Writes are atomic,
  path-contained and event-recorded. Revision files use an exclusive lock and
  are never overwritten.
- `creative-research-design-brief-service.ts` exposes exactly
  `createSession`, `prepareDesignBrief`, `getSession`, `getDesignBrief`,
  `updateDesignBrief` and `listBriefRevisions`.
- `creative-research-errors.ts` defines the R2 fail-closed error taxonomy.

## R1 Contract Evolution

The isolated R1 domain foundation remains provider-, filesystem- and
host-neutral. It received only backward-compatible optional fields needed by
the concrete R2 pipeline:

- document intake metadata and warnings;
- field-level evidence references;
- search keyword suggestions;
- Design Brief warnings;
- model profile and optional linked Project Brief input.

`DesignBrief.fieldEvidence` can reference only evidence already stored on the
brief. Designer overrides remove the affected document-derived field mapping
and add an explicit designer-authored warning. AI keyword content keeps
`source: AI`; new or content-modified keywords receive a new identity with
`source: DESIGNER`.

## Deterministic Bounds

| Collection | Maximum |
|---|---:|
| Scenarios | 8 |
| Core messages | 8 |
| Constraints | 16 |
| Concept keywords | 12 |
| Visual keywords | 12 |
| Search keyword suggestions | 24 |

All factual fields with content require valid supplied evidence IDs. Invented
or missing evidence fails with `CREATIVE_RESEARCH_MODEL_OUTPUT_INVALID`.
Multi-document same-section disagreements are preserved as warnings rather
than silently resolved.

## Persistence Layout

```text
<defaultDataPath>/creative-research/<sessionId>/
├── runtime/
│   ├── session.json
│   └── events.jsonl
└── briefs/
    ├── 0001.json
    ├── 0002.json
    └── ...
```

The Runtime Asset manifest now classifies `session.json` as a generated
runtime artifact. Session state remains `INTAKE` throughout CI-R2.

## Tests Added

Six R2 tests cover:

- real PDF, DOCX, Markdown and text parsing;
- multi-document evidence identity and locator traceability;
- unsupported and empty document failures;
- conflict warning preservation;
- deterministic caps, invalid evidence and factual field-evidence gates;
- one primary model call plus at most one repair;
- persisted session and immutable monotonic brief revisions;
- AI/designer keyword provenance and designer field override provenance;
- write failure without false success.

Combined R1/R2 targeted result: `PASS — 20/20`.

The six new R2 tests also pass inside the complete Runtime Application suite.

## Repository Regression

| Command | Result |
|---|---|
| R1/R2 targeted tests | PASS, 20/20 |
| isolated R2 TypeScript check | PASS |
| `npm test` | PASS, 1674/1674 |
| `npm run cli:test` | PASS, 40/40 |
| `npm run web-runtime:test` | PASS, 15/15 |
| `npm run web:build` | PASS |
| `npm run golden:test` | PASS; Provider calls 0; no auto-update |
| version consistency and naming | PASS |
| workspace boundary | PASS |
| production boundary | PASS; 589 production files checked |
| tracked Runtime assets | PASS |
| project-rule and Golden boundaries | PASS |
| `npm run verify:current-flows` | R2 passes; aggregate stops on the same two baseline Web assertions |
| `npm run repo:verify` | All gates through `verify:current-flows` pass; stops on the same baseline assertions |
| `npm run web:smoke` | Existing operation-count drift: host reports 180, smoke expects 155 |

The first root test run exposed that the new generated `session.json` filename
was not yet classified by the frozen Runtime Asset guard. CI-R2 added that
generated-artifact declaration, reran the guard successfully, and reran the
root suite to 1674/1674.

## Pre-existing Repository Failures

The following were recorded at the R2 base commit before production changes
and remain unchanged:

1. `analysis UI contains intake actions and a free-form API Profile provider`
2. `analysis API selection is controlled by App and survives settings navigation`
3. Web Smoke expects 155 operations while the current Node Host reports 180.

CI-R2 changes no Web source, operation graph, smoke script or affected
architecture assertion.

The repository-wide `web-runtime:typecheck` also reports existing errors in
Creative Intelligence and adjacent current modules. An isolated check of all
new R2 TypeScript files passes, and no repository-wide diagnostic references an
R2 file. The full gate normally reaches this typecheck only after the earlier
known Runtime Application assertions are green.

## Provider / Release Smoke

No real-provider call was made. CI-R2 testing is offline and uses injected
reasoners. This work does not publish a release; the repository contract still
requires a separate user-authorized real-provider end-to-end run before a
release that includes this prompt/request-shape change.

## Protected Boundaries

- No Search Provider, remote reference download or fabricated Web result.
- No UI, RPC or current operation registration.
- No Direction Board, reference selection or image generation behavior.
- No Packaging, Space, Reference First, Golden or evaluation import.
- No change to the current Document Context schema or persisted run format.
- No Desktop/Electron adapter.

## CI-R3 Readiness

```text
CONDITIONAL GO — real reference search gateway and research orchestration only
```

The Document-to-Design-Brief boundary is implemented and covered. CI-R3 may
consume enabled, provenance-tagged keyword suggestions and add a real search
gateway behind the R1 port. It must preserve query/provider/source provenance,
must not let an LLM fabricate search results, and must not absorb the unrelated
Web governance failures listed above.
