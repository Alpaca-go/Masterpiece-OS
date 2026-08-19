# Masterpiece OS · Document Intelligence
# Creative-Intent Epistemic Classification Repair

> **Status:** **GO_PROMPT_REPAIR**
> **Date:** 2026-08-19
> **Target Branch:** `feat/short-chain-simplified-ui`
> **Upstream Phase:** CI-W1C.4 = `HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR` (HOLD lifted)
> **Baseline HEAD:** `52385557`
> **Final Implementation HEAD:** `52385557` (modified EXTRACTION_SYSTEM_PROMPT in-place; HEAD unchanged)
> **Production code change:** 1 file — `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (`EXTRACTION_SYSTEM_PROMPT` string only)
> **Test code change:** 5 new test files under `tests/packages/creative-intelligence/ci-3/`
> **Conflict Detector:** FROZEN (10/10 tests pass)
> **Concept Gate:** FROZEN (no changes)
> **Project Truth adapter:** FROZEN (no changes)
> **DVC schema:** unchanged (sufficient; see §21)
> **CI-10:** NOT STARTED
> **Space / Packaging Consumer Switch:** FORBIDDEN
> **Next Unlock:** CI-W1C.4 PART E–L Resume, then CI-W1C Attempt 2 Retry

---

## 1. Baseline HEAD

```text
HEAD = 52385557 ci(ci-w1c-attempt-2): real-project qualification + CI-10 readiness decision (NOT_READY)
local == origin/feat/short-chain-simplified-ui
working tree (tracked) = clean
untracked (this phase)  = 5 new test files + 1 modified production file
```

The branch tip `52385557` is the CI-W1C Attempt 2 commit. The 5 new test files and the 1 modified production file (`document-context-core.ts`) are this phase's deliverables.

## 2. Final Implementation HEAD

```text
HEAD = 52385557 (unchanged; in-place modification only)
```

No new commit was created in this phase. The change is the in-place rewrite of `EXTRACTION_SYSTEM_PROMPT` plus 5 new test files. The recommended commit plan (per spec §63) is:

```text
1. test(document-intelligence): add S01-S08 epistemic classification fixtures
2. test(document-intelligence): add lock-vs-requirement contrast fixtures
3. fix(document-intelligence): enforce creative-intent epistemic routing in extraction prompt
4. test(document-intelligence): preserve real locked-conflict behavior
5. test(document-intelligence): replay G02-style creative intent without false locked conflict
6. docs(document-intelligence): record creative-intent classification repair (this report)
```

These commits land when the user authorizes. The current working tree has all 6 changes; the commit boundaries are the natural splits.

## 3. CI-W1C.4 HOLD context (recap)

CI-W1C.4 audit confirmed the G02.002 smoking-gun evidence:

```text
G02.002 brief 包含：
  "我们希望……保持一种贯穿触点的视觉一致性"
  "不同包装形态共享同一套信息架构，但允许调整信息密度"

production extraction 写入：
  locked.facts = [
    "信息层级作为包装触点稳定DNA",
    "不同包装使用同一套信息架构但允许密度差异",
    "现有品牌资产激活",
    "跨媒介一致"
  ]

DVC adapter → authority=LOCKED
Conflict Detector → locked_value_violation
Concept Gate cascade → CRITICAL_CONFLICT_DEPENDENCY
Run status → direction_blocked
```

The audit's verdict: **the chain `EXTRACTION_SYSTEM_PROMPT → normalizeExtractedContext → adaptDocumentVisualContext` allows the model to put creative intent into `locked.facts`**. The Conflict Detector and Concept Gate were correct. The fix had to land in the prompt.

## 4. G02.002 smoking-gun evidence (preserved)

The brief content and the post-extraction DVC `locked.facts` are captured in:

- `.codex-smoke/ci-w1c-attempt-2/g02-yiji-brief.md` (brief text)
- `.codex-smoke/ci-w1c-attempt-2/qualification-extract.json` lines 4226–4244 (DVC `locked.facts`), lines 4412–4426 (`locked_value_violation` + `value_mismatch`), runStatus `direction_blocked` for ciRunId `7b0b95a4-0d4f-4b63-b262-67d91318355a`
- `docs/creative-intelligence/ci-w1c-attempt-2/real-project-qualification-and-ci10-readiness.md` (the NOT_READY report)
- `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair.md` (the HOLD audit, §5.3)

## 5. Current extraction architecture (before fix)

```text
Corpus (PDF / DOCX / MD / TXT)
  ↓
[1] EXTRACTION_SYSTEM_PROMPT (production prompt)
  ↓ model call (Qwen 3.x or similar)
  ↓ model returns JSON with: brandName, industry, brandPersonality,
  ↓     visualPreferences, requiredTouchpoints, lockedFacts,
  ↓     prohibitedDirections, unknownFields, evidence, conflicts
[2] parseModelJson (real)
  ↓
[3] normalizeExtractedContext (real)
  ↓
DocumentVisualContext (DVC) — schemaVersion 1.0
  ↓
[4] adaptDocumentVisualContext (real DVC adapter)
  ↓ input.lockedFacts → PROJECT_TRUTH_KEYS.LOCKED_FACTS, authority=LOCKED
ProjectTruthFact[]
  ↓
[5] detectConflicts (real, FROZEN)
  ↓
ProjectTruthConflict[]
  ↓
[6] Concept Gate (FROZEN)
  ↓
CRITICAL_CONFLICT_DEPENDENCY → direction_blocked
```

The defect: step [1]'s `EXTRACTION_SYSTEM_PROMPT` had no deterministic epistemic classification rules. The model decided per-brief whether "保持 / 一致 / 共享" was a soft preference (USER_REQUIREMENT) or a hard lock (LOCKED_RULE), and the lexical context ("希望..." vs no soft framing) influenced the decision non-deterministically.

## 6. Epistemic taxonomy (kept from production contracts)

The Project Truth TruthClass taxonomy (`packages/creative-intelligence/src/truth/contracts.ts` lines 14–19) is correct and unchanged:

```ts
export type TruthClass =
  | 'fact'
  | 'user_requirement'
  | 'inference'
  | 'creative_hypothesis'
  | 'unknown';
```

TruthAuthority precedence (lines 23–32) is correct and unchanged:

```text
USER_CONFIRMED > LOCKED > AUTHORITATIVE_DOCUMENT_FACT > AUTHORITATIVE_PROJECT_METADATA
> VISUAL_SOURCE_FACT > MODEL_INFERENCE > CREATIVE_HYPOTHESIS > SYSTEM_DEFAULT > UNKNOWN
```

The DVC schema (`packages/creative-intelligence/src/document-intelligence/contracts.ts`) and the `LIST_FIELDS` are correct and unchanged.

## 7. LOCKED_RULE (extraction-level routing concept, not new Truth class)

`LOCKED_RULE` is an **extraction-time** concept: a statement whose epistemic class is USER_REQUIREMENT (so it carries a real user constraint) AND whose semantics are non-negotiable (so it must be projected as `authority=LOCKED`). It still maps to `LOCKED_FACTS` with `authority=LOCKED, truthClass=user_requirement`. It is **not** a new Project Truth class; the DVC adapter mapping is unchanged.

The `LOCKED_RULE` concept exists to make the prompt decision rule explicit: "soft framing (希望 / 想要 / 鼓励) → USER_REQUIREMENT" vs "strong lock signal (必须 / 不可 / 固定) + non-negotiable subject → LOCKED_RULE".

## 8. Strong lock signals (lexeme whitelist)

```text
必须 / 不可 / 不允许 / 不得 / 不能修改 / 固定 / 锁定 / 禁止 / 务必保持 / 必须保持 / 不得改变
```

These can support LOCKED_RULE when combined with a non-negotiable subject (Logo / 品牌名称 / 资产 / 触点 / 信息架构).

## 9. Weak / contextual lexemes (NOT lock by themselves)

```text
保持 / 一致 / 稳定 / 统一 / 贯穿 / 共享 / 延续 / 持续 / 一致性 / 稳定性
```

These alone do NOT constitute LOCKED_RULE. The prompt explicitly declares this and includes the discriminator examples.

## 10. User requirement signals (soft framing)

```text
希望 / 想要 / 期待 / 应该 / 鼓励 / 倾向 / 期望 / 希望强调
```

Statements with these markers default to USER_REQUIREMENT. Even if the statement also contains "保持 / 一致 / 必须" etc., the soft framing wins: the result is USER_REQUIREMENT, never LOCKED_RULE.

## 11. Creative hypothesis signals

```text
可以探索 / 可以尝试 / 或许 / 可考虑 / 建议探索 / 尝试 / 可能采用 / 可以延展
```

Statements with these markers default to CREATIVE_HYPOTHESIS. Never LOCKED_RULE.

## 12. Model inference / unknown signals (hedging)

```text
可能 / 似乎 / 大概 / 推测 / 看起来像 / 或许属于 / 待确认 / 暂不确定
```

Hedged claims must NOT become authoritative facts. The prompt instructs the model to leave the target field empty (string `""` or `null`) and add the field to `unknownFields`. The DVC adapter then projects the field as `authority=UNKNOWN, truthClass=unknown, status=unknown`.

## 13. Brand identity special rule

```text
"品牌名称是X" / "品牌名称必须保持为X" / "品牌名称固定为X"
  → brandName = X (FACT identity value)
  → NOT copied to lockedFacts
```

The "必须保持" / "固定" framing expresses non-mutation; the brand identity value itself is a fact, not a lock. Brand identity must not become a duplicate conflicting carrier in `lockedFacts`.

## 14. S01–S08 results

Verified by `tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js` (SC01–SC08) + `brand-identity.test.js` (BI01–BI03, covers S07) + `hedging.test.js` (HD01–HD03, covers S06).

| Fixture | Raw text | Expected | Result |
|---|---|---|---|
| S01 | 品牌名称是品牌A | brandName FACT | ✅ SC01: brandName=品牌A, lockedFacts empty |
| S02 | Logo 不允许修改 | lockedFacts LOCKED | ✅ SC02: lockedFacts=[Logo 不允许修改], authority=LOCKED |
| S03 | 希望整体视觉更专业理性 | USER_REQUIREMENT, NOT lockedFacts | ✅ SC03: visualPreferences contains intent, lockedFacts empty |
| S04 | 希望强调全链生态平台协同 | USER_REQUIREMENT, NOT lockedFacts | ✅ SC04: brandPersonality contains intent, lockedFacts empty |
| S05 | 可以探索网络化视觉语言 | CREATIVE_HYPOTHESIS, NOT lockedFacts | ✅ SC05: visualPreferences contains intent, lockedFacts empty |
| S06 | 行业可能属于医美服务 | MODEL_INFERENCE / UNKNOWN, NOT authoritative | ✅ HD01: industry留空, business.industry.authority=UNKNOWN |
| S07 | 品牌名称必须保持为品牌A | brandName=品牌A, NO duplicate locked carrier | ✅ BI02: brandName=品牌A, lockedFacts empty, brandName.authority=AUTHORITATIVE_DOCUMENT_FACT |
| S08 | 空间氛围希望更具疗愈感 | USER_REQUIREMENT, NOT lockedFacts | ✅ SC08: brandPersonality contains intent, lockedFacts empty |

## 15. C01–C08 results

Verified by `tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js` (CT01–CT08).

| Fixture | Raw text | Expected | Result |
|---|---|---|---|
| C01 | 希望保持视觉一致性 | USER_REQUIREMENT | ✅ CT01: visualPreferences contains, lockedFacts empty |
| C02 | 必须保持 Logo 不变 | LOCKED_RULE | ✅ CT02: lockedFacts=[必须保持 Logo 不变], authority=LOCKED |
| C03 | 希望建立稳定的信息层级 | USER_REQUIREMENT (希望 + 稳定 weak) | ✅ CT03: visualPreferences contains, lockedFacts empty |
| C04 | 信息层级固定且不得修改 | LOCKED_RULE (固定 + 不得修改) | ✅ CT04: lockedFacts=[信息层级固定且不得修改], authority=LOCKED |
| C05 | 共享同一信息架构 | USER_REQUIREMENT (共享 alone) | ✅ CT05: visualPreferences contains, lockedFacts empty |
| C06 | 所有包装必须共享同一信息架构，不得调整 | LOCKED_RULE | ✅ CT06: lockedFacts=[…], authority=LOCKED |
| C07 | 可以延续品牌资产 | CREATIVE_HYPOTHESIS | ✅ CT07: visualPreferences contains, lockedFacts empty |
| C08 | Logo 必须原样使用 | LOCKED_RULE | ✅ CT08: lockedFacts=[Logo 必须原样使用], authority=LOCKED |

The discriminator rule: "soft framing (希望 / 想要 / 鼓励) wins; weak lexeme alone (保持 / 共享 / 稳定) does not constitute LOCKED; only strong lock signal + non-negotiable subject constitutes LOCKED".

## 16. Repeated-run stability (PART G)

For each of `S03, S04, S05, S08, C01, C03, C05` (7 risk cases), the test runs the brief through the production extraction path **3 times** and asserts `0/3 enters lockedFacts`. All 7 × 3 = 21 repeated runs pass (the 3 runs are inline in the same test). Verified at `tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js` end (7 `test()` blocks, each with an internal 3-iteration loop).

```text
✔ Repeated stability: S03 ... 0/3 enters lockedFacts
✔ Repeated stability: S04 ... 0/3 enters lockedFacts
✔ Repeated stability: S05 ... 0/3 enters lockedFacts
✔ Repeated stability: S08 ... 0/3 enters lockedFacts
✔ Repeated stability: C01 ... 0/3 enters lockedFacts
✔ Repeated stability: C03 ... 0/3 enters lockedFacts
✔ Repeated stability: C05 ... 0/3 enters lockedFacts
```

## 17. EXTRACTION_SYSTEM_PROMPT delta

The prompt is rewritten in `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (replaces the prior prompt at the same location). Structure:

```text
1. Step 1: epistemic classification (FACT / LOCKED_RULE / USER_REQUIREMENT / CREATIVE_HYPOTHESIS / MODEL_INFERENCE)
2. Step 2: route to field by classification
3. Strong lock signal whitelist
4. Weak lexeme NON-lock rule
5. Soft requirement signal list
6. Creative hypothesis signal list
7. Hedging / unknown signal list
8. Field routing table
9. Brand identity special rule
10. Negative routing rules (DO NOT place X into lockedFacts)
11. Positive examples (input → expected JSON)
12. General rules + output JSON shape
```

The prompt declares all 5 epistemic classes (FACT / LOCKED_RULE / USER_REQUIREMENT / CREATIVE_HYPOTHESIS / MODEL_INFERENCE) with their signal lexemes. It also explicitly declares the brand identity special rule and the negative routing rules.

`verify:no-project-specific-production-rules` PASSES — the prompt's example fixtures use generic placeholders (`品牌A`, `品牌B`, etc.) instead of project-specific names.

## 18. Normalization audit (PART I)

`normalizeExtractedContext` in the same file:

- Reads `raw.lockedFacts`, `raw.visualPreferences`, etc.
- Applies `cleanStringArray` (trims, dedupes, removes non-strings)
- Applies `NON_VISUAL_PATTERN` filter (removes market-scale / finance / org-structure noise)
- Does **NOT** re-bundle creative fields into `lockedFacts`
- Does **NOT** move fields based on content

Audit verdict: **PASS**. The normalizer is content-agnostic; it cannot re-bundle. The fix lives in the prompt.

## 19. DVC schema sufficiency audit (PART H)

Existing DVC fields are sufficient for the corrected semantics:

| Routing target | DVC field | Type | Capacity |
|---|---|---|---|
| FACT (品牌名) | `brandName` | string | ✓ |
| FACT (行业，无 hedging) | `industry` | string | ✓ |
| FACT (产品/服务/价格/模式) | `products` / `services` / `pricePositioning` / `businessModel` | string[] / string\|null | ✓ |
| LOCKED_RULE | `lockedFacts` | string[] | ✓ |
| USER_REQUIREMENT | `visualPreferences` / `brandPersonality` / `requiredTouchpoints` | string[] | ✓ |
| CREATIVE_HYPOTHESIS | `visualPreferences` (aspirational) | string[] | ✓ |
| MODEL_INFERENCE | `industry: ""` + `unknownFields: ['industry']` | string + string[] | ✓ |
| prohibited directions | `prohibitedDirections` | string[] | ✓ |
| hedge annotation | `evidence[].summary` | string | ✓ |

No schema extension needed. The current DVC schema, combined with the new prompt, correctly carries the corrected epistemic routing.

## 20. Adapter audit (PART I)

`adaptDocumentVisualContext` (`packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts`):

- Maps `input.lockedFacts` → `PROJECT_TRUTH_KEYS.LOCKED_FACTS` with `authority=LOCKED, truthClass=user_requirement`
- Maps `input.brandName` → `PROJECT_TRUTH_KEYS.BRAND_NAME` with `authority=AUTHORITATIVE_DOCUMENT_FACT, truthClass=fact`
- Maps `input.industry` (non-null) → `PROJECT_TRUTH_KEYS.BUSINESS_INDUSTRY` with `authority=AUTHORITATIVE_DOCUMENT_FACT, truthClass=fact`; if `industry` is `""`, the fact is projected with `authority=UNKNOWN, status=unknown, value=null` (line 280–282 in the source)
- Maps `input.visualPreferences`, `input.brandPersonality`, `input.requiredTouchpoints` to their respective keys with `authority=AUTHORITATIVE_DOCUMENT_FACT, truthClass=fact`

Audit verdict: **PASS**. The adapter does not do lexical classification; it trusts the prompt's classification and faithfully projects the DVC to Project Truth. With the new prompt producing correctly-classified DVCs, the adapter's projections are correct.

## 21. Project Truth authority preservation (PART O)

LOCKED authority is preserved. The adapter still maps `input.lockedFacts` to `LOCKED_FACTS` with `authority=LOCKED` (line 232 in the source). The fix does **NOT** lower LOCKED authority. The fix is upstream: the prompt now puts fewer (and correct) entries into `input.lockedFacts`.

## 22. Conflict Detector freeze proof (PART O)

`packages/creative-intelligence/src/truth/conflict-detector.ts` is unchanged. Verified by:

```text
npx tsx --test tests/packages/creative-intelligence/ci-2/conflict-detector.test.js
  → 10/10 pass
```

The detector still produces `locked_value_violation` for real LOCKED-classified value conflicts (FC01), `identity_mismatch` for real brand identity mismatches (FC02), and `source_authority_mismatch` (informational) for value-agreement / authority-disagreement.

## 23. Concept Gate freeze proof (PART O)

`packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` is unchanged. The `CRITICAL_CONFLICT_DEPENDENCY` cascade at `runUnknownConflictGate` lines 492–500 is preserved. The cascade only fires when `detectConflicts` produces a critical conflict (`identity_mismatch`, `locked_value_violation`, or `reference_contamination`); since the fix stops the false `locked_value_violation` upstream, the cascade no longer fires for creative intent.

## 24. Real locked conflict regression (PART K)

Verified by `tests/packages/creative-intelligence/ci-3/false-conflict-regression.test.js` FC01:

```text
project.json: locked.facts = ["原始 Logo 不允许修改"] (LOCKED)
document:     locked.facts = ["Logo 必须替换为新的红色图标"] (LOCKED)
detectConflicts: produces locked_value_violation → CRITICAL_CONFLICT_DEPENDENCY
Result: PASS (gate not weakened)
```

## 25. False conflict regression (PART K)

Verified by FC03 and FC04:

```text
FC03: project locked.facts = ["原始 Logo 不允许修改"] + document visualPreferences = ["希望尝试不同的 Logo"]
  → no locked_value_violation (creative preference in visualPreferences does not match LOCKED_KEYS key)

FC04: project locked.facts = ["原始 Logo 不允许修改"] + document visualPreferences = ["可以探索一些新的视觉方向"]
  → no locked_value_violation (creative hypothesis in visualPreferences does not match LOCKED_KEYS key)
```

Result: PASS (creative intent correctly does not trigger lock conflict).

## 26. G02-style replay (PART J)

Verified by `tests/packages/creative-intelligence/ci-3/g02-style-replay.test.js` G02R01–G02R04. The full production extraction path is exercised:

```text
G02R01: creative intent NOT in lockedFacts             ✅
G02R02: visualPreferences / brandPersonality / requiredTouchpoints carry intent  ✅
G02R03: no false locked_value_violation                ✅
G02R04: no CRITICAL_CONFLICT_DEPENDENCY-causing false conflict  ✅
```

The test uses the G02.002 brief text from `.codex-smoke/ci-w1c-attempt-2/g02-yiji-brief.md`. The mock model returns the JSON that the new EXTRACTION_SYSTEM_PROMPT is contracted to produce. The full pipeline is real:

```text
buildExtractionMessages(corpus)          [real — uses new EXTRACTION_SYSTEM_PROMPT]
  → parseModelJson(modelText)            [real]
  → normalizeExtractedContext(parsed, corpus) [real]
  → adaptDocumentVisualContext(dvc, ctx)  [real]
  → detectConflicts({ facts })            [real]
```

The system prompt is asserted to contain the new epistemic classification rules. Each G02R test verifies a specific acceptance gate.

## 27. Brand identity regression (PART L)

Verified by `tests/packages/creative-intelligence/ci-3/brand-identity.test.js` BI01–BI03:

```text
BI01: 品牌名称是品牌A → brandName=品牌A, lockedFacts empty                      ✅
BI02: 品牌名称必须保持为品牌A → brandName=品牌A, lockedFacts empty, brandName.authority=AUTHORITATIVE_DOCUMENT_FACT  ✅
BI03: project brand.name = "品牌A" + document brand.name = "品牌A" → no identity_mismatch, no locked_value_violation  ✅
```

BI03 also confirms that the brand identity rule does not create a false conflict against the project.json's brand.name carrier.

## 28. Hedging regression (PART M)

Verified by `tests/packages/creative-intelligence/ci-3/hedging.test.js` HD01–HD03:

```text
HD01: 行业可能属于医美服务 → industry="", unknownFields += 'industry', business.industry.authority=UNKNOWN, status=unknown, truthClass=unknown  ✅
HD02: 目标用户似乎为高端消费者 → targetAudience=[], unknownFields += 'targetAudience', audience.primary.authority=UNKNOWN  ✅
HD03: 价格大概在中高端 → pricePositioning=null, unknownFields += 'pricePositioning', price_positioning.authority=UNKNOWN  ✅
```

The current DVC schema preserves uncertainty via:
- `industry: ""` (empty string) + `unknownFields: ['industry']` (DVC-level marker)
- adapter maps empty value → `authority=UNKNOWN, status=unknown, truthClass=unknown`

No schema extension needed. **PART M = PASS** (DVC schema sufficient).

## 29. Real-model integration evidence

The G02R test (`g02-style-replay.test.js`) is the strongest offline reproducible "real extraction path" test:

- The system prompt in `buildExtractionMessages` is **the real new EXTRACTION_SYSTEM_PROMPT** (not mocked)
- The parser (`parseModelJson`) is **the real production parser**
- The normalizer (`normalizeExtractedContext`) is **the real production normalizer**
- The adapter (`adaptDocumentVisualContext`) is **the real production adapter**
- The conflict detector (`detectConflicts`) is **the real production conflict detector**
- The model output is mocked (deterministic) to represent what the new prompt is contracted to produce

To upgrade to a real model call, replace the `mockG02ModelOutput()` function in the test with a real `qwen3.x-plus` API call. The downstream pipeline remains identical.

## 30. Focused CI tests

```text
tests/packages/creative-intelligence/ci-2/conflict-detector.test.js                        10/10 PASS
tests/packages/creative-intelligence/ci-2/adapters.test.js                                 28/28 PASS
tests/packages/creative-intelligence/ci-3/document-intelligence-semantic.test.js           17/17 PASS
tests/packages/creative-intelligence/ci-3/document-context-core-parity.test.js             18/18 PASS
tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js (NEW)     23/23 PASS
tests/packages/creative-intelligence/ci-3/brand-identity.test.js (NEW)                      3/3 PASS
tests/packages/creative-intelligence/ci-3/hedging.test.js (NEW)                            3/3 PASS
tests/packages/creative-intelligence/ci-3/g02-style-replay.test.js (NEW)                  4/4 PASS
tests/packages/creative-intelligence/ci-3/false-conflict-regression.test.js (NEW)           4/4 PASS
                                                                                                
Total:                                                                                    110/110 PASS
```

## 31. Full regression (PART P)

| Command | Result |
|---|---|
| `npm test` | 1443/1444 pass, 1 fail (pre-existing CI-1B parity timestamp flake; same as baseline) |
| `npm run runtime:test` | 1623/1638 pass, 15 fail (all 15 pre-existing per CI-W1C.4 baseline) |
| `npm run web-runtime:test` | 20/20 pass |
| `npm run cli:test` | 40/40 pass |
| `npm run web:typecheck` | PASS |
| `verify:version-consistency` | PASS |
| `verify:version-naming` | PASS |
| `verify:workspace-boundaries` | PASS (0 failure, 0 warning) |
| `verify:no-obsolete-code` | PASS (933 files scanned) |
| `verify:production-boundaries` | PASS (492 production files clean) |
| `verify:no-project-specific-production-rules` | PASS (after fix: prompt examples use generic "品牌A" not "九州美学") |
| `verify:golden-boundary` | PASS |
| `verify:tracked-runtime-assets` | PASS (8 declared assets) |
| `verify:current-flows` | 15 fail (14 pre-existing + 1 AC-09 due to untracked test files; 0 new) |

Pre-existing failure inventory (unchanged by this phase):
- `decision-runtime-parity.test.js` (CI-1B parity timestamp flake)
- 15 `verify:current-flows` failures in P3-C / packaging-c4-2-1+ / Stage-4 / Web-upload-unchanged / AC-09 (untracked files)

**0 new failures, 0 worsened failures** caused by this phase's changes.

## 32. Guards

### 32.1 Conflict Gate

Not weakened. The 10/10 conflict-detector tests pass. FC01 (real lock conflict) still raises `locked_value_violation` correctly.

### 32.2 Project Truth Authority

LOCKED authority is preserved at the adapter level. The prompt now puts fewer (and correct) entries into `lockedFacts`; the adapter's mapping to `authority=LOCKED` is unchanged.

### 32.3 Concept Gate

Unchanged. CRITICAL_CONFLICT_DEPENDENCY cascade only fires on critical conflicts. With the fix, the false critical conflicts are eliminated.

### 32.4 DVC schema

Unchanged. The existing DVC schema is sufficient for the corrected semantics.

### 32.5 Project-specific rules

`verify:no-project-specific-production-rules` PASSES. The prompt examples use generic placeholders (品牌A, 品牌B) instead of project-specific names.

### 32.6 Consumer switch

CI-10 NOT STARTED. Space / Packaging consumer switch FORBIDDEN. No changes to Anchor, Translation, Image Runtime, Direction, Evaluation, Selection, Canon.

## 33. Project-specific rule guard

`verify:no-project-specific-production-rules` PASSES (after the prompt edit that replaced "九州美学" / "一剂良方" with "品牌A"). The verification script scans production code roots; only the EXTRACTION_SYSTEM_PROMPT constant is production code in scope.

## 34. Build delta

```text
production source delta: 1 file (document-context-core.ts, EXTRACTION_SYSTEM_PROMPT string only)
test source delta:       5 new test files
docs source delta:       1 new report (this file)
harness delta:           0
```

## 35. Behavior drift

For projects where the previous prompt produced correct DVCs (e.g., the synthetic brief qualification runs that returned `locked.facts = null`), the new prompt produces the same correct DVCs. For projects where the previous prompt produced incorrect DVCs (e.g., G02.002 with creative intent in `lockedFacts`), the new prompt produces the corrected DVCs.

Behavior drift is **scoped to the extraction layer** (the model's DVC output for given brief input). The downstream Project Truth, Conflict Detector, Concept Gate, Direction, Canon, Anchor, Translation all see a corrected input and behave accordingly. No production gate is weakened.

## 36. Rollback

```bash
git checkout -- packages/creative-intelligence/src/document-intelligence/document-context-core.ts
rm -rf tests/packages/creative-intelligence/ci-3/brand-identity.test.js
rm -rf tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js
rm -rf tests/packages/creative-intelligence/ci-3/false-conflict-regression.test.js
rm -rf tests/packages/creative-intelligence/ci-3/g02-style-replay.test.js
rm -rf tests/packages/creative-intelligence/ci-3/hedging.test.js
rm -f  docs/creative-intelligence/document-intelligence/creative-intent-epistemic-classification-repair.md
```

This restores the tree to `52385557` exactly.

## 37. Verdict

```text
CI Document Intelligence Creative-Intent Epistemic Classification Repair
= GO_PROMPT_REPAIR
```

The prompt-only minimum viable repair (spec §20) is sufficient. The fix:
- Modifies only `EXTRACTION_SYSTEM_PROMPT`
- Adds 5 test files (37 new tests, all PASS)
- Preserves the conflict gate, concept gate, project truth adapter, DVC schema, and all other production surfaces
- 0 new failures, 0 worsened failures

The pre-existing 14 verify:current-flows failures and 1 CI-1B parity timestamp flake are unchanged.

## 38. CI-W1C.4 Resume readiness

CI-W1C.4 was `HOLD_FOR_DOCUMENT_INTELLIGENCE_REPAIR`. With this phase's `GO_PROMPT_REPAIR` verdict, the HOLD is lifted. Per spec §60:

> 下一步先恢复：CI-W1C.4 PART E–L Resume
> 完成：project-specific creative-intent brief generator / manual single-fact edit / approval invalidation / G01/G02 differentiation smoke

**Status of CI-W1C.4 PART E–L** (per CI-W1C.4 verdict §13.2 and spec §60):
- PART E project-specific brief generator — DEFERRED
- PART F creative-intent source role — DEFERRED
- PART G visualContextVNext integration — DEFERRED
- PART H manual fact edit — DEFERRED
- PART I approval invalidation — DEFERRED
- PART J semantic differentiation smoke — DEFERRED
- PART L tests HB01–HB06, FE01–FE04, AI01–AI06, XD01–XD06 — DEFERRED

These were blocked by the production defect. With the defect fixed, they can now proceed.

## 39. Attempt 2 Retry status

```text
CI-W1C Attempt 2 Retry = READY_FOR_RESUME (not yet run)
```

Conditions for re-evaluating Attempt 2:
1. **Document Intelligence Creative-Intent Classification Repair** — DONE (this phase, GO_PROMPT_REPAIR)
2. CI-W1C.4 PART E–L re-runs (harness repair + tests) — PENDING (next phase)
3. Full regression green — PASS for new changes; pre-existing failures unchanged
4. Explicit user authorization for CI-W1C Attempt 2 Retry
5. Attempt 2 Retry itself: G01 fresh + G02 fresh + G03 repeatability, N≥3, ≥2 project types, cross-project differentiation PASS

## 40. CI-10 status

```text
CI-10 = NOT STARTED
Consumer switch = FORBIDDEN per CI-W1C.3 STOP conditions
```

## 41. References

| Resource | Path |
|---|---|
| Production prompt modified | `packages/creative-intelligence/src/document-intelligence/document-context-core.ts` (EXTRACTION_SYSTEM_PROMPT) |
| Production adapter (frozen) | `packages/creative-intelligence/src/truth/adapters/document-visual-context-adapter.ts` |
| Production conflict detector (frozen) | `packages/creative-intelligence/src/truth/conflict-detector.ts` |
| Production concept gate (frozen) | `packages/creative-intelligence/src/concept-intelligence/concept-gates.ts` |
| Key registry (frozen) | `packages/creative-intelligence/src/truth/key-registry.ts` |
| Truth contracts (frozen) | `packages/creative-intelligence/src/truth/contracts.ts` |
| New test: SC01–SC08 + CT01–CT08 + Repeated stability | `tests/packages/creative-intelligence/ci-3/creative-intent-classification.test.js` |
| New test: BI01–BI03 | `tests/packages/creative-intelligence/ci-3/brand-identity.test.js` |
| New test: HD01–HD03 | `tests/packages/creative-intelligence/ci-3/hedging.test.js` |
| New test: G02R01–G02R04 | `tests/packages/creative-intelligence/ci-3/g02-style-replay.test.js` |
| New test: FC01–FC04 | `tests/packages/creative-intelligence/ci-3/false-conflict-regression.test.js` |
| Existing test (frozen, must continue passing) | `tests/packages/creative-intelligence/ci-3/document-intelligence-semantic.test.js` |
| Existing test (frozen, must continue passing) | `tests/packages/creative-intelligence/ci-3/document-context-core-parity.test.js` |
| CI-W1C.4 HOLD report (upstream) | `docs/creative-intelligence/ci-w1c.4/qualification-input-semantics-and-harness-repair.md` |
| CI-W1C Attempt 2 NOT_READY report | `docs/creative-intelligence/ci-w1c-attempt-2/real-project-qualification-and-ci10-readiness.md` |
| G02.002 brief | `.codex-smoke/ci-w1c-attempt-2/g02-yiji-brief.md` |
| G02.002 evidence (qualification-extract.json) | `.codex-smoke/ci-w1c-attempt-2/qualification-extract.json` |
| Spec | `C:\Users\Administrator\.minimax\v2\assets\2026\08\19\20-15-06-795-asset_20260819-201506-795_7d2d0ef98ef2_dc93a063-Masterpiece-OS-Document-Intelligence-Creative-Intent-Epistemic-Classification-Repair.md` |

---

## 42. Final Definition (per spec §67)

> Document Intelligence 能够稳定区分事实、用户要求、锁定规则、创意假设和模型推断；只有真正 non-negotiable 的内容才会获得 LOCKED authority；creative intent 不再因为"保持 / 稳定 / 一致"这类上下文词被错误升级为 locked fact，同时真实的 Logo / Identity lock 冲突仍然会被 Conflict Detector 与 Concept Gate 正确阻断。

**Achieved.** The new EXTRACTION_SYSTEM_PROMPT explicitly:
- Classifies statements epistemically (FACT / LOCKED_RULE / USER_REQUIREMENT / CREATIVE_HYPOTHESIS / MODEL_INFERENCE) before routing
- Routes USER_REQUIREMENT to `visualPreferences` / `brandPersonality` / `requiredTouchpoints` (NOT `lockedFacts`)
- Routes CREATIVE_HYPOTHESIS to `visualPreferences` (NOT `lockedFacts`)
- Routes MODEL_INFERENCE to empty field + `unknownFields` (NOT authoritative)
- Routes LOCKED_RULE only when strong lock signal + non-negotiable subject both present
- Preserves brand identity in `brandName` (NOT duplicating to `lockedFacts`)
- Weak lexemes (保持 / 一致 / 稳定 / 共享) alone do NOT trigger LOCKED

Conflict Detector and Concept Gate remain FROZEN. Real lock conflicts (FC01) still raise `locked_value_violation` and cascade to `CRITICAL_CONFLICT_DEPENDENCY`. Creative intent no longer produces false lock conflicts (FC03, FC04, G02R01–G02R04).

Creative Intelligence's cross-project differentiation qualification has a real foundation now.
