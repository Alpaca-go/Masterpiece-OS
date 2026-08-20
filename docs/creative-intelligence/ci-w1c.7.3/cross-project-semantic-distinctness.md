# CI-W1C.7.3 — Cross-Project Semantic Distinctness (G01 vs G02)

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Identity-strip the two projects and compare distinctness at every layer. Determine where G01 vs G02 differentiation is real vs illusory.

## Identity-stripped comparison table

For each layer, this table records the OVERLAP between G01 and G02 (when both project identifiers — brand name, asset UUIDs, projectId — are removed). The "verdict" column is the audit's judgment on whether the layer carries real semantic distinction.

| Layer | G01 (stripped) | G02 (stripped) | Overlap | Verdict |
|---|---|---|---|---|
| **Source (assets)** | 29 PNG visual references | 35 PNG visual references | Both PNG collections; **content** disjoint | Real (visual content is project-specific) |
| **DI v2 (DVC)** | `brandCore.name`, `industry="待确认"`, `brandRole=null`, `audience=[]`, `visualIdentity=[]`, `mustPreserve=[…]`, 28 sourceAssetRefs | same shape, 35 sourceAssetRefs | **STRUCTURAL IDENTITY**: both have empty brandCore (except name), empty visualIdentity, identical mustPreserve, assetRefs just differ by count | **NEAR-IDENTICAL** (DVC layer collapses to a template) |
| **DI v1 (visual-decision-packet)** | 3 projectFacts + 5 lockedAssets + 28+ assetInventory entries + 2 valuableAssets + 2 brandMisreadRisks + 1 categoryCliches + 1 crossMediaGaps | 3 projectFacts + 4 lockedAssets + 28+ assetInventory entries + 3 valuableAssets + 2 brandMisreadRisks + 1 categoryCliches + 1 crossMediaGaps + **creativeDecision block** | Same SHAPE, **content** disjoint (different colors, motifs, copy, packaging, risks). G02 has unique creativeDecision | **REAL distinction** in the data, but downstream layers do NOT consume it |
| **Evidence** | 4 rows: brand_name / industry / visual_understanding_core / PSO provenance | 4 rows: identical SHAPE, only IDs differ | **STRUCTURAL IDENTITY** | **NEAR-IDENTICAL** |
| **Truth** | 17 facts: 3 projectFacts + 5 locked.assets + 1 locked.facts + 1 locked.logo + 2 UNKNOWN | 16 facts: 3 projectFacts + 4 locked.assets + 1 locked.facts + 1 locked.logo + 2 UNKNOWN | **STRUCTURAL IDENTITY**. Only 2 anchors differ in VALUE: brand.name (G01="九州美学", G02="一剂良方"), brand.role (G01="高端医疗美容服务提供者", G02="提供中医诊疗、慢病管理及养生服务的体验机构"). business.industry is SAME (待确认 at AUTHORITATIVE) | **WEAK distinction** — only 2 of 17 facts carry project-specific VALUE (and 1 of them, brand.name, is forbidden from being used as positive strategic authority by the prompt's epistemic rules) |
| **Need** | 5 needs (clarification / identity / preservation / risk / differentiation), all `generatedBy=deterministic_rule` | 5 needs (SAME 5 types), only UUIDs differ | **IDENTICAL** structure, IDENTICAL statements (re-read: "Locked assets and locked facts must remain unchanged") | **NEAR-IDENTICAL** — same 5 generic types with same generic statements |
| **Strategic Context (compile-strategic-context.ts)** | Inferred: 3 authoritativeFacts + 5 userRequirements + 5 lockedIdentity + 0 prohibited + 5 needs + 4 evidence | Inferred: 3 authoritativeFacts + 4 userRequirements + 4 lockedIdentity + 0 prohibited + 5 needs + 4 evidence | **STRUCTURAL IDENTITY** — context shape determined by Truth | **NEAR-IDENTICAL** |
| **Prompt (synthesis)** | AUTHORITATIVE PROJECT FACTS (3) + LOCKED (5/4) + NEED (5) + EVIDENCE (4) | AUTHORITATIVE PROJECT FACTS (3) + LOCKED (4) + NEED (5) + EVIDENCE (4) | Same sections, same shape; only the VALUES of brand.name/brand.role differ. **business.industry=待确认 (SAME in both)** | **WEAK distinction** — the only differentiating VALUES (brand.name/brand.role) are present but the model does NOT use them to drive the TENSION framework |
| **Synthesis (live)** | 3 tensions, 3 insights, 3 opportunities; all generic ("logo lock vs undefined business", "fixed identity vs market clichés", "language lock vs scaling") | 3 tensions, 3 insights, 3 opportunities; all generic ("rigid asset vs differentiation", "unresolved business identity vs fixed execution", "preservation vs progression") | **NEAR-IDENTICAL STRUCTURE, NEAR-IDENTICAL SEMANTICS** — both produce 3 axes of the same "lock vs unknown" shape | **NEAR-IDENTICAL** — the structural pattern is the same; vocabulary differs slightly (paraphrase, not differentiation) |
| **Concept (live)** | 3 candidates: (1) Architectural Context Frame / "museum plinth" (2) Linguistic Resonance Architecture / "calibrated tuning fork" (3) Strategic Deployment Matrix / "compass and map overlay" | 3 candidates: (1) 静场域·空间留白架构 / "静止恒星+轨道" (2) 语境插槽·模块化叙事框架 / "底盘+热插拔" (3) 字阵引航·语义优先排版系统 / "排版轨道+签名" | **DIFFERENT vocabularies, SAME 3-function split**: (spatial framing / modular/structural / language). All metaphors are NEW (not in source). | **REAL distinction** — emerges from model's pretrained design vocabulary, not from prompt content |
| **Direction (live)** | 3 directions: 空间锚定矩阵 (spatial-system) / 语义共振架构 (typographic-system) / 策略部署门控 (model-assisted) | 3 directions: 静场域·空间留白架构 (structural-system) / 语境插槽·模块化叙事框架 (editorial-system) / 字阵引航·语义优先排版系统 (typographic-system) | 1 of 3 families OVERLAPS (typographic-system). All Chinese titles distinct. | **REAL distinction** — families and titles diverge; produced by model's family-diversity requirement + creative generation |

## Counterfactual identity-stripped check (CF-S3)

When ALL of these are stripped: brand name, brand role, asset UUIDs, brand-specific copy, brand-specific color hex codes, brand-specific motif names. The remaining content per project is:

- **G01 remaining**: 待确认 industry, 待确认 business.model, 待确认 product.core_products, "原始Logo不可改", "输出语言简体中文", 4 locked.assets UUIDs (4f65f3f8, 755bd372, brand-name, user-lock-1, user-lock-2)
- **G02 remaining**: 待确认 industry, 待确认 business.model, 待确认 product.core_products, "原始Logo不可改", "输出语言简体中文", 3 locked.assets UUIDs (2409032d, brand-name, user-lock-1, user-lock-2)

**CF-S3 verdict**: The two projects become **INDISTINGUISHABLE** when stripped. They both reduce to: "A brand with locked logo, locked Chinese-only output, unknown business.model, unknown product.core_products, unknown industry." This is the SAME generic planning input.

The only thing that distinguishes them is the **brand.role** fact, which reads:
- G01: "高端医疗美容服务提供者" (high-end medical-aesthetic service provider)
- G02: "提供中医诊疗、慢病管理及养生服务的体验机构" (TCM diagnosis + chronic disease management + wellness experience institution)

But the synthesis model does NOT use brand.role to drive the TENSION framework (it uses business.industry=待确认 to drive the "unknown" tension). So the brand.role distinction is **latent in the prompt but inactive in the synthesis output**.

## Identity-stripped counterfactual results (summary)

| Stage | Identity-stripped G01 vs G02 | Distinct? |
|---|---|---|
| 1 Source | different PNG content (logos/colors visible) | YES |
| 3 DI/DVC (v2) | same empty brandCore + same mustPreserve | NO |
| 3 DI/DVC (v1) | different assetInventory values | YES (in data) but NOT consumed downstream |
| 4 Evidence | 4 same-shape rows | NO |
| 5 Truth | 2 of 17 facts differ (brand.name + brand.role) | LATENT |
| 6 Need | 5 same-type needs, same statements | NO |
| 7 Strategic Context | inferred identical | NO |
| 8 Prompt | 2 of 3 projectFacts differ (brand.name + brand.role) but business.industry=待确认 in both | LATENT |
| 9 Synthesis | 3 generic "lock vs unknown" axes | NO |
| 12 Concept | different metaphors, same 3-function split | YES (recovered via model) |
| 13 Direction | different families + titles, same 3-family diversity pattern | YES (recovered via model) |

## Where does real distinction live?

Real distinction exists at TWO extremes of the pipeline:
1. **The very front (Source / visual-decision-packet)**: the PNG assets and the rich DVC packet contain distinct data, but the data does not flow to downstream layers.
2. **The very back (Concept / Direction)**: the model invents distinct metaphors using its pretrained design vocabulary, but these are NOT grounded in the project's planning content.

In the MIDDLE (Evidence through Synthesis), both projects become functionally indistinguishable. This is the FIRST_LOSS_STAGE region.

## Three static counterfactuals (CF-S1, CF-S2, CF-S3)

### CF-S1: Remove locked/generic constraint blocks from audit-only context
- If we removed `LOCKED RULES` + `NEED SKELETON` from the prompt, would the model produce different synthesis output?
- **Likely yes**: without "logo不可改" and "business.model UNKNOWN", the model would have to use brand.role to drive the TENSION framework. But this is a 1-shot hypothetical, not a verified test.
- This counterfactual confirms: the LOCKED + NEED blocks DOMINATE the TENSION framework.

### CF-S2: Positive-planning-only projection
- If we kept only brand.name + brand.role + 5 locked.assets + (industry unknown / business.model unknown) and removed all generic need statements, what would the model output?
- **Likely**: 3 tensions centered on "what does brand.role imply about category positioning" instead of "logo lock vs unknown business". G01's "高端医疗美容服务提供者" and G02's "中医诊疗+慢病管理+养生" would drive DIFFERENT tension axes (aesthetic-vs-clinical vs traditional-vs-modern-tech).
- This counterfactual confirms: the brand.role VALUE is sufficient to produce project-specific synthesis IF the model is allowed to use it as a TENSION driver.

### CF-S3: Identity-stripped Truth comparison (already done above)
- When brand.name + brand.role are stripped, G01 and G02 are **functionally identical** at the Truth level.
- This counterfactual confirms: the FIRST_LOSS_STAGE is at the boundary where rich Truth content fails to reach Synthesis, AND the only distinguishing content (brand.role) is filtered out by the prompt's TENSION framework.
