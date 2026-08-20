# CI-W1C.7.3 — Source Inventory (13 stages × 2 projects)

> **Branch**: `feat/short-chain-simplified-ui` · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Mode**: Zero-API static audit. No model calls. No image calls.
> **Scope**: Every persisted layer from raw project files to live model output, for **G01 九州美学** and **G02 一剂良方**.

The 13 stages enumerated below are taken verbatim from the user spec
(`Source → Parsed → DI/DVC → Evidence → Truth → Need → Strategic Context → Prompt → Synthesis → Insight → Opportunity → Concept → Direction`).

| # | Stage | What it is | Where it lives |
|---|---|---|---|
| 1 | Source | Original project inputs (raw assets, project.json, locked facts) | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\<projectId>\` |
| 2 | Parsed | `project.json` parsed into project_record | runtime in CI-W1C.6; not persisted as a separate file |
| 3 | DI/DVC | Document Intelligence (visual_understanding_core) + Document Visual Context | `project-context\project-visual-context.vnext.json` (v2.0 DVC) + `project-context\visual-decision-packet.json` (v1.0 visual decision packet, embedded) |
| 4 | Evidence | Per-fact evidence ledger | `project-context\creative-intelligence-shadow\evidence-ledger.json` (schema 0.1) |
| 5 | Truth | Authoritative fact table with conflicts + resolutions | `project-context\creative-intelligence-shadow\project-truth.json` (schema 0.2) |
| 6 | Need | Deterministic needs (clarification / identity / preservation / risk / differentiation) | `project-context\creative-intelligence-shadow\need-intelligence.json` (schema 0.1) |
| 7 | Strategic Context | Compiled prompt-input context (`compile-strategic-context.ts`) | NOT persisted to disk for the LIVE run; lives only in the runtime call chain |
| 8 | Prompt | The model-bound prompt actually sent | `docs\creative-intelligence\ci-w1c.7.2\{g01,g02}-runtime\<projectId>\intermediate\prompt-snapshots\{synthesis,concept,direction}.prompt.json` |
| 9 | Synthesis | Live synthesis model output (tensions + insights + opportunities) | `docs\creative-intelligence\ci-w1c.7.2\{g01,g02}-runtime\<projectId>\intermediate\live-attempts\synthesis.attempt-1.raw.txt` |
| 10 | Insight | Live insight model output | embedded inside `synthesis.attempt-1.raw.txt` (NOT a separate call) |
| 11 | Opportunity | Live opportunity model output | embedded inside `synthesis.attempt-1.raw.txt` (NOT a separate call) |
| 12 | Concept | Live concept ideation model output | `docs\creative-intelligence\ci-w1c.7.2\{g01,g02}-runtime\<projectId>\intermediate\live-attempts\concept.attempt-1.raw.txt` |
| 13 | Direction | Live direction ideation model output | `docs\creative-intelligence\ci-w1c.7.2\{g01,g02}-runtime\<projectId>\intermediate\live-attempts\direction.attempt-1.raw.txt` |

> **NOTE on Insight / Opportunity**: per the CI-W1C.7.1 prompt contracts, the **synthesis** call returns a single `StrategicSynthesisArtifact` containing `tensions[] + insights[] + opportunities[]` in one model call. The audit therefore treats Insight and Opportunity as two **named slices** of the same live JSON, not as separate model calls. The shadow `insight-intelligence.json` / `opportunity-map.json` files are produced by a `deterministic_rule` for shadow mode only and do NOT participate in the live pipeline.

---

## Stage-by-stage file inventory

### G01 — 九州美学 (projectId 590eadf2-76cb-4042-a034-db93481b06c9)

| Stage | File | Bytes | Lines | Key contents (one-line summary) |
|---|---:|---:|---:|---|
| 1 Source | `九州美学-590eadf2\input\assets\*` (29 PNG) | n/a | — | 29 visual reference assets (logos / posters / materials) referenced by `project-visual-context.vnext.json` |
| 1 Source | `九州美学-590eadf2\project.json` | (n/a — not directly read in audit; schema is the Masterpiece project record containing `brandName`, `industry`, `lockedFacts[]`, `lockedLogo`) |
| 1 Source | `九州美学-590eadf2\image-generation\*` (8 generations × ~12 files) | n/a | — | OUT OF SCOPE — produced by image model, not Creative Intelligence pipeline |
| 2 Parsed | (not persisted) | — | — | `compile-strategic-context.ts` reads `project.json` directly; no separate parse artefact |
| 3 DI/DVC | `九州美学-590eadf2\project-context\project-visual-context.vnext.json` | 57865 | 1242 | v2.0 DVC: `brandCore.name="九州美学"`, `industry="待确认"`, `brandRole=null`, `audience=[]`, `visualIdentity=[]` (all empty), `mustPreserve=["原始Logo不可改","输出语言简体中文"]`, 28 `sourceAssetRefs[]` (every asset referenced) |
| 3 DI/DVC | `九州美学-590eadf2\project-context\visual-decision-packet.json` | 35677 | 645+ | v1.0 visual decision packet: 3 `projectFacts` (brandName=九州美学, industry=医疗美容, brandRole=高端医疗美容服务提供者), 5 `lockedAssets[]`, 28+ entries in `assetInventory.{logoAssets,colorAssets,typographyAssets,graphicMotifs,imageryAssets,layoutPatterns,materialCues,packagingStructures,spatialCues,copyAssets}`, `diagnosis` with 2 valuableAssets, 1 overusedExpressions, 1 outdatedExpressions, 1 weakSystemAreas, 1 categoryCliches, 2 brandMisreadRisks (MR001=传统美容院, MR002=奢侈品), 1 crossMediaGaps |
| 4 Evidence | `九州美学-590eadf2\project-context\creative-intelligence-shadow\evidence-ledger.json` | 1685 | 45 | 4 entries: 1 brand_name fact, 1 industry fact, 1 visual_understanding_core provenance, 1 PSO provenance — NO `evidenceRefs` for any positive content (no asset-id evidence) |
| 5 Truth | `九州美学-590eadf2\project-context\creative-intelligence-shadow\project-truth.json` | 18884 | 450 | 17 facts: brand.name=九州美学 (3 carriers, UNANIMOUS), brand.role=高端医疗美容服务提供者 (2 carriers, UNANIMOUS), business.industry=待确认 (AUTHORITATIVE) vs 医疗美容 (VISUAL) — **CONFLICTED**, business.model=null UNKNOWN, product.core_products=null UNKNOWN, locked.assets 5× (4f65f3f8 logo, 755bd372 字体, brand-name, user-lock-1 Logo Locked, user-lock-2 输出语言), locked.facts=LOCKED, locked.logo=true LOCKED |
| 6 Need | `九州美学-590eadf2\project-context\creative-intelligence-shadow\need-intelligence.json` | 7062 | 134 | 5 needs, all `generatedBy=deterministic_rule`: (1) clarification:business.model (blocked, priority 3), (2) identity:brand.name+brand.role (required, priority 3), (3) preservation:locked.assets+locked.facts+locked.logo (required, priority 3), (4) risk:brand.name+brand.role+business.industry (blocked, priority 3), (5) differentiation:brand.role+business.industry (important, priority 2) |
| 7 Strategic Context | (not persisted) | — | — | `packages/creative-intelligence/src/strategic-synthesis/compile-strategic-context.ts` returns `{authoritativeFacts, userRequirements, lockedIdentity, prohibitedDirections, needs, evidence, sourceIds, legacyVisualEvidenceExcluded}`. CI-W1C.7.1A test asserts it accepts `evidence.entries` and `evidence.items` |
| 8 Prompt | `D:\Masterpiece-OS\docs\creative-intelligence\ci-w1c.7.2\g01-runtime\…\intermediate\prompt-snapshots\synthesis.prompt.json` | 14041 | 1 (JSON) | Full synthesis prompt: AUTHORITATIVE PROJECT FACTS, USER REQUIREMENTS, LOCKED RULES, PROHIBITED DIRECTIONS, NEED SKELETON, EVIDENCE, SOURCE TRACE IDS, EXCLUDED LEGACY VISUAL AUTHORITIES, TASK (tensions 2-5, insights 3-6, opps 3-5), ID ASSIGNMENT, OUTPUT JSON SCHEMA, REQUIRED SHAPE, EPISTEMIC RULES |
| 8 Prompt | `…\prompt-snapshots\concept.prompt.json` | 11878 | 1 (JSON) | Full concept ideation prompt: sourceMap (strategicSynthesisRef, excludedAuthorities), candidates[] (3) with title/coreProposition/strategicMechanism/whyThisProject/whyNotCategoryCliche/centralMetaphor/translationHypothesis/epistemicClass=CREATIVE_HYPOTHESIS/opportunityRefs/insightRefs/factRefs/needRefs/strengths/risks |
| 8 Prompt | `…\prompt-snapshots\direction.prompt.json` | 15440 | 1 (JSON) | Full direction prompt: sourceMap (strategicSynthesisRef, conceptSetRef, excludedAuthorities), directions[] (3) with id, title, directionFamily, creativeThesis, visualMechanism, systemHypothesis, visualLanguage{compositionLogic, colorRelationship, typographyBehavior, graphicBehavior, imageBehavior, motionBehavior}, crossMediaBehavior, whyThisProject, differenceFromOtherDirections, epistemicClass=CREATIVE_HYPOTHESIS, conceptRefs, opportunityRefs, insightRefs, factRefs, strengths, risks, mustNotBecome |
| 9 Synthesis | `…\live-attempts\synthesis.attempt-1.raw.txt` | (≈14k chars) | 241 | 1 model call: projectUnderstanding (summary, coreChallenge="Maintaining absolute visual and linguistic rigidity while preventing brand dilution or misalignment in an undefined market context", transformationGoal, brandRoleInterpretation, audienceTension), 3 tensions (tension-i0=logo vs business.model, tension-i1=fixed identity vs market clichés, tension-i2=language vs scaling), 3 insights (insight-i0=preservation forces messaging clarity, insight-i1=language constraint, insight-i2=unresolved business model), 3 opportunities (Contextual Framework Engine / Linguistic-First Positioning / Identity Clarification Protocol) |
| 10 Insight | (slice of synthesis.raw.txt `insights[]`) | — | 75 | 3 insights — see Stage 9 |
| 11 Opportunity | (slice of synthesis.raw.txt `opportunities[]`) | — | 75 | 3 opportunities — see Stage 9 |
| 12 Concept | `…\live-attempts\concept.attempt-1.raw.txt` | (≈8k chars) | 145 | 3 candidates: (1) **Architectural Context Frame** (centralMetaphor="museum plinth for a protected artifact"), (2) **Linguistic Resonance Architecture** (centralMetaphor="calibrated tuning fork"), (3) **Strategic Deployment Matrix** (centralMetaphor="compass and map overlay") |
| 13 Direction | `…\live-attempts\direction.attempt-1.raw.txt` | (≈14k chars) | 182 | 3 directions: (1) **空间锚定矩阵** (directionFamily=spatial-system), (2) **语义共振架构** (directionFamily=typographic-system), (3) **策略部署门控** (directionFamily=model-assisted) — all Chinese creativeThesis, full visualLanguage block, crossMediaBehavior, etc. |

### G02 — 一剂良方 (projectId a13d6c09-99f7-4ff9-b499-3b9f8a1df31b)

| Stage | File | Bytes | Lines | Key contents (one-line summary) |
|---|---:|---:|---:|---|
| 1 Source | `一剂良方-a13d6c09\input\assets\*` (35 PNG) | n/a | — | 35 visual reference assets (logos / VI / packaging / spatial / 摄影) referenced by `project-visual-context.vnext.json` |
| 1 Source | `一剂良方-a13d6c09\project.json` | n/a | — | project record: brandName, industry, lockedFacts[], lockedLogo |
| 1 Source | `一剂良方-a13d6c09\image-generation\*` | n/a | — | OUT OF SCOPE |
| 2 Parsed | (not persisted) | — | — | — |
| 3 DI/DVC | `一剂良方-a13d6c09\project-context\project-visual-context.vnext.json` | 58678 | 1260+ | v2.0 DVC: `brandCore.name="一剂良方"`, `industry="待确认"`, `brandRole=null`, `audience=[]`, `visualIdentity=[]` (all empty), `mustPreserve=["原始Logo不可改","输出语言简体中文"]`, 35 `sourceAssetRefs[]` |
| 3 DI/DVC | `一剂良方-a13d6c09\project-context\visual-decision-packet.json` | 34732 | 700+ | v1.0 visual decision packet: 3 `projectFacts` (brandName=一剂良方, industry=中医健康管理与诊疗服务, brandRole=提供中医诊疗、慢病管理及养生服务的体验机构), 4 `lockedAssets[]`, full `assetInventory` (logo, color, typography, motif, imagery, layout, material, packaging, spatial, copy), `creativeDecision` block with `brandRoleStatement`, `upgradeFrom`, `preserveCore`, `upgradeTo`, `uniqueUpgradeThesis`, `targetWorldview`, `toneBoundaries[]` |
| 4 Evidence | `一剂良方-a13d6c09\project-context\creative-intelligence-shadow\evidence-ledger.json` | 1685 | 45 | 4 entries — same SHAPE as G01 (4 rows). NO `evidenceRefs` for any positive content (no asset-id evidence) |
| 5 Truth | `一剂良方-a13d6c09\project-context\creative-intelligence-shadow\project-truth.json` | 17765 | 432 | 16 facts: brand.name=一剂良方 (3 carriers, UNANIMOUS), brand.role=提供中医诊疗、慢病管理及养生服务的体验机构 (2 carriers, UNANIMOUS), business.industry=待确认 (AUTHORITATIVE) vs 中医健康管理与诊疗服务 (VISUAL) — **CONFLICTED**, business.model=null UNKNOWN, product.core_products=null UNKNOWN, locked.assets 4×, locked.facts=LOCKED, locked.logo=true LOCKED |
| 6 Need | `一剂良方-a13d6c09\project-context\creative-intelligence-shadow\need-intelligence.json` | 6937 | 132 | 5 needs — **IDENTICAL SHAPE** to G01 (clarification/identity/preservation/risk/differentiation), only the brand-name/role/asset IDs differ |
| 7 Strategic Context | (not persisted) | — | — | — |
| 8 Prompt | `D:\Masterpiece-OS\docs\creative-intelligence\ci-w1c.7.2\g02-runtime\…\intermediate\prompt-snapshots\synthesis.prompt.json` | (size TBD; structurally identical to G01 prompt with projectId/UUID swap) |
| 8 Prompt | `…\prompt-snapshots\concept.prompt.json` | (structurally identical to G01) |
| 8 Prompt | `…\prompt-snapshots\direction.prompt.json` | (structurally identical to G01) |
| 9 Synthesis | `…\live-attempts\synthesis.attempt-1.raw.txt` | (≈12k chars) | 238 | 1 model call: projectUnderstanding (summary, coreChallenge="Developing strategic differentiation and contextual relevance without modifying, interpreting, or altering any locked visual or identity assets", transformationGoal, brandRoleInterpretation, audienceTension), 3 tensions (rigid asset vs differentiation, unresolved business identity vs fixed execution, preservation vs progression), 3 insights (visual anchors immutable→positioning architecture, business.model ambiguity→modular framework, language+asset rigidity→precision communication), 3 opportunities (Contextual Framing Systems / Modular Positioning Frameworks / Precision-Led Linguistic Anchoring) |
| 10 Insight | (slice of synthesis.raw.txt `insights[]`) | — | 50 | 3 insights — see Stage 9 |
| 11 Opportunity | (slice of synthesis.raw.txt `opportunities[]`) | — | 50 | 3 opportunities — see Stage 9 |
| 12 Concept | `…\live-attempts\concept.attempt-1.raw.txt` | (≈5k chars) | 147 | 3 candidates: (1) **静场域·空间留白架构** (centralMetaphor="静止的恒星与可塑的轨道空间"), (2) **语境插槽·模块化叙事框架** (centralMetaphor="标准化底盘与可热插拔的业务模块"), (3) **字阵引航·语义优先排版系统** (centralMetaphor="精密排版轨道与终点签名") |
| 13 Direction | `…\live-attempts\direction.attempt-1.raw.txt` | (≈8k chars) | 132 | 3 directions: (1) **静场域·空间留白架构** (directionFamily=structural-system), (2) **语境插槽·模块化叙事框架** (directionFamily=editorial-system), (3) **字阵引航·语义优先排版系统** (directionFamily=typographic-system) |

---

## Cross-stage size table (summary)

| Stage | G01 size | G02 size | Δ | Notes |
|---|---:|---:|---:|---|
| 1 Source (assets) | 29 PNGs | 35 PNGs | +6 | G02 has 6 more visual references (more VI pages) |
| 3 DI/DVC (v2 DVC) | 57865 | 58678 | +813 | G02 slightly larger DVC (more assets) |
| 3 DI/DVC (v1 visual-decision-packet) | 35677 | 34732 | −945 | G01 has 5 lockedAssets vs G02's 4; G01 larger |
| 4 Evidence | 1685 | 1685 | 0 | IDENTICAL (4 entries each) |
| 5 Truth | 18884 | 17765 | −1119 | G01 has 17 facts vs G02's 16 (G01 has 5 locked.assets entries vs G02's 4) |
| 6 Need | 7062 | 6937 | −125 | same 5 needs; minor diff in UUIDs only |
| 7 Strategic Context | (runtime) | (runtime) | — | same shape |
| 8 Prompt (synthesis) | 14041 | (size TBD) | — | size scales with fact/need/evidence count |
| 8 Prompt (concept) | 11878 | (size TBD) | — | scales with # of opportunities |
| 8 Prompt (direction) | 15440 | (size TBD) | — | scales with # of concepts |
| 9 Synthesis (live) | ≈14k | ≈12k | — | both ~12-14k |
| 12 Concept (live) | ≈8k | ≈5k | — | both ~5-8k |
| 13 Direction (live) | ≈14k | ≈8k | — | G01 has more crossMediaBehavior detail |

---

## Initial observations (will be expanded in PART D ledgers)

1. **G01 has 1 more locked.assets entry** than G02 (G01=5, G02=4). G01 also has 1 more `project-truth` fact (17 vs 16). Net: G01 has slightly richer locked-state, but the 5 G01 vs 4 G02 difference is structural (G01 has both 主标志 logo AND 定制字体 logo as separate locked assets, G02 has 1 logo).
2. **Evidence layer is identical-size** (1685 bytes / 4 entries each). Neither project has asset-id evidence for any positive fact — evidence-ledger only carries the brand_name, industry, visual_understanding_core, and PSO provenance rows.
3. **Truth layer has the SAME conflict structure** in both projects: business.industry conflicts between AUTHORITATIVE=待确认 and VISUAL=project-specific industry. Same 2 UNKNOWNs (business.model, product.core_products).
4. **Need layer is structurally identical** (5 generic need types with UUID-keyed variation). Same priority distribution (3× priority-3, 1× priority-2, 1× priority-3 blocked).
5. **The first place where G01 vs G02 diverge in the live pipeline is the **projectUnderstanding.coreChallenge** string** (Stage 9). G01 names "rigidity+brand dilution" while G02 names "differentiation+relevance" — these are paraphrases of the SAME structural problem.
6. **Concept metaphors diverge (Stage 12)**: G01 uses 博物馆基座 / 校准音叉 / 罗盘+地图, G02 uses 静止恒星+轨道 / 标准化底盘+热插拔 / 精密排版轨道. Different vocabularies, same 3-function split.
7. **Direction families diverge (Stage 13)**: G01 uses `spatial-system / typographic-system / model-assisted`; G02 uses `structural-system / editorial-system / typographic-system`. Only `typographic-system` overlaps. Title pairs (Chinese) are also distinct.
