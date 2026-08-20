# CI-W1C.7.3 — First-Loss-Stage Decision

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Choose exactly ONE primary FIRST_LOSS_STAGE from the 11 candidates, with confidence + reversibility + 3 supporting points.

## Primary verdict

> **FIRST_LOSS_STAGE = `NEED_DERIVATION_GENERICIZATION`**
> **CONFIDENCE: high**
> **REVERSIBILITY: easy**

### 3 supporting points

1. **Identity-stripped, G01 and G02 produce LITERALLY identical Need sets.** All 5 need statements in `need-intelligence.json` (clarification / identity / preservation / risk / differentiation) are word-for-word identical when brand-name and asset-UUID references are stripped. Two projects with distinct brand.role ("高端医疗美容服务提供者" vs "中医诊疗、慢病管理及养生服务的体验机构") and distinct business.industry VISUAL inference ("医疗美容" vs "中医健康管理与诊疗服务") produce the SAME 5 needs with the SAME generic statements.

2. **The collapse is structural, not data-driven.** Each need is `generatedBy: "deterministic_rule"`. The need generation logic keys on the SHAPE of the Truth (which keys exist, which are unknown, which are locked) — not on the VALUES. Two projects with the same Truth shape will produce the same 5 needs. The brand.role VALUE, the locked.assets UUIDs, the business.industry visual inference — all are referenced in `factRefs[]` but NEVER quoted in the need statement text.

3. **The need layer is the BOUNDARY at which 2-of-17 distinct Truth content becomes 0-of-5 distinct Need statement text.** Truth has 17/16 facts; 2 of them differ in VALUE between G01 and G02 (brand.name VALUE, brand.role VALUE). The 5 need statements contain ZERO of these distinguishing VALUES. The 13 anchors that survived the Evidence layer (v1 DVC entries) and the 2 that survived into Truth (locked.assets UUIDs) are LOST in the need statement text.

## Confidence: high

| Reason | Evidence |
|---|---|
| Identity-stripped comparison is direct | Diff of `need-intelligence.json` between G01 and G02 (after stripping UUIDs and brand-name refs) yields 0 byte differences in the `statement` field |
| Audit traces the causal chain | v1 DVC (30+ project-specific entries) → Evidence (4 generic rows) → Truth (3 positive facts) → Need (5 generic statements) → Synthesis (generic "lock vs unknown" tensions) |
| Counterfactual: rich Truth would not help | CF-S2 shows that if need statements were VALUE-bearing, the prompt would have different TENSION drivers. The need layer is the bottleneck. |
| Both projects show the same pattern | G01 and G02 are structurally identical at the Need layer despite distinct Truth content. The collapse is project-agnostic. |

## Reversibility: easy

The fix is a **localized change to the need-generation logic** (e.g., in `packages/creative-intelligence/src/need-intelligence/`):
- For each need, the statement text should include the actual VALUE of the most-relevant fact (e.g., for the `identity` need, append "(e.g., 高端医疗美容服务提供者)" or rewrite as "Preserve the brand identity anchored to 高端医疗美容服务提供者 and prevent reinterpretation as another category or brand.").
- This would propagate through the prompt (Need section is high-salience) and give the model a TENSION driver.
- Cost: ~50-200 lines of code + tests. Schema unchanged.

## Strong secondary candidates (in priority order)

### SECONDARY 1: `PROMPT_SALIENCE_COLLAPSE`
- **Why it qualifies**: The prompt has 5 high-salience natural-language need statements and 3 low-salience sparse fact values. The model's attention is dominated by the needs.
- **Why it's secondary**: PROMPT_SALIENCE_COLLAPSE is a SYMPTOM of NEED_DERIVATION_GENERICIZATION. If the needs were VALUE-bearing, the salience would be different.
- **Fix**: reorder prompt sections OR add inline VALUE highlighting to facts. Cost: prompt-builder refactor.

### SECONDARY 2: `PROJECT_TRUTH_COMPRESSION`
- **Why it qualifies**: The Truth layer has only 3 positive facts. business.industry=待确认 (AUTHORITATIVE choice) suppresses the rich visual inference (医疗美容 / 中医健康管理). business.model UNKNOWN. product.core_products UNKNOWN. 70%+ of facts are LOCKED/UNKNOWN.
- **Why it's secondary**: This is BY DESIGN — the system correctly propagates the user's actual planning state. The user has not confirmed business.model or business.industry. The fix requires USER input, not a code change.
- **Fix**: depends on user providing more project data.

### TERTIARY: `EVIDENCE_CONTRIBUTION_LOSS`
- **Why it qualifies**: The v1 DVC's 30+ asset entries (logos, colors, motifs, copy, risks) never become evidence-ledger rows. Evidence is a 4-row generic table.
- **Why it's tertiary**: The evidence layer is a PROVENANCE LOG, not the source of truth for synthesis. The prompt reads from Truth, not from Evidence. Even if Evidence were richer, it wouldn't reach the prompt without going through Truth first.
- **Fix**: low priority — evidence is an audit trail, not a strategic input.

## Candidates EXCLUDED with reason

| Candidate | Excluded because |
|---|---|
| `SOURCE_INSUFFICIENT` | v1 DVC has 30+ project-specific entries; Source layer is rich. |
| `DOCUMENT_PARSE_LOSS` | parsing works correctly (visual-decision-packet.json is well-formed). |
| `DOCUMENT_INTELLIGENCE_LOSS` | DI produces rich v1 DVC with all 30+ entries. |
| `DVC_SCHEMA_COMPRESSION` | v1 DVC schema is rich; spec warned against assuming schema expansion. |
| `STRATEGIC_CONTEXT_FILTER_LOSS` | the filter is doing what it's told — passing Truth content to the prompt. The Truth content is what gets filtered down to the prompt's 3 facts. |
| `MODEL_SYNTHESIS_COLLAPSE` | model is responding correctly to the prompt. If the prompt had different content, the model would produce different output. Model is not the cause. |
| `NO_MATERIAL_FIRST_LOSS` | there is clear, material loss: 13 anchors lost at one transition, 2 anchors lost at another, and the synthesis output is generic. |

## Recommended narrow next repair phase (CI-W1C.7.4 candidate)

> **DO NOT** attempt the fix in this audit. Recommend the narrowest possible follow-up phase.

**Candidate CI-W1C.7.4 — Need Value-Bearing Rewrite**
- Scope: change the need-generation logic in `packages/creative-intelligence/src/need-intelligence/` to embed the most-relevant fact VALUE in each need statement.
- Cost: ~50-200 LOC + 5-10 tests.
- Acceptance: re-run the offline prompt qualification harness (`apps/web-runtime/scripts/ci-w1c/real-project-prompt-qualification.mjs --all`) and confirm G01/G02 synthesis prompts have DIFFERENT need statement text.
- Out of scope: any change to Truth, v1 DVC, Evidence, or Synthesis prompt structure.

Alternative narrower phase (if 7.4 is too large): **CI-W1C.7.4-mini — Identity-Need Value Embed Only**: change ONLY the `identity` need statement to include brand.role VALUE. Test on G01/G02. If synthesis still generic, proceed to 7.4. If synthesis becomes project-specific, scale to all 5 needs.

## Bookkeeping note (PART S)

**PRIMARY** = `NEED_DERIVATION_GENERICIZATION`
**SECONDARY** = `PROMPT_SALIENCE_COLLAPSE` + `PROJECT_TRUTH_COMPRESSION`
**Implementation HEAD** = `c058316c442e3554c49a91a468533d5d426e5768` (CI-W1C.7.2 READY)
**Documentation Tip** = this audit's commit (does NOT introduce a new Implementation HEAD; docs-only)
**API cost since 7.2 docs commit**: 0 (this audit is zero-API)
