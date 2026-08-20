# CI-W1C.7.3 — Strategic Prompt Salience Audit

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Audit whether the PROMPT SECTIONS are sequenced and weighted such that positive project-specific content drives the TENSION framework. The spec calls this "audit Prompt SALIENCE, not only presence."

## Prompt section order (synthesis prompt)

Per `build-strategic-synthesis-prompt.ts` (read in audit), the userMessage is:

1. `# PROJECT` (projectId)
2. `# AUTHORITATIVE PROJECT FACTS` (3 facts each — brand.name, brand.role, business.industry)
3. `# USER REQUIREMENTS` (1 fact each — locked.facts)
4. `# LOCKED RULES` (5/4 facts — locked.assets)
5. `# PROHIBITED DIRECTIONS` (empty)
6. `# NEED SKELETON` (5 generic needs, with statements)
7. `# EVIDENCE` (4 generic rows)
8. `# SOURCE TRACE IDS` (lists)
9. `# EXCLUDED LEGACY VISUAL AUTHORITIES`
10. `# TASK` (instructions to produce tensions/insights/opportunities)
11. `# ID ASSIGNMENT`
12. `# OUTPUT JSON SCHEMA`
13. `# REQUIRED SHAPE`
14. `# EPISTEMIC RULES`

## Salience ranking analysis

The model's "attention budget" is finite. Sections listed LATER may receive less attention. Sections that are PROMINENT (large, concrete, repeated) get more weight.

| Section | Lines | Concrete content? | Salience rank |
|---|---:|---|:-:|
| #1 PROJECT | 1 | just projectId | LOW |
| #2 AUTHORITATIVE PROJECT FACTS | 3 | YES (brand.name, brand.role, business.industry values) | HIGH (but small) |
| #3 USER REQUIREMENTS | 1 | 1 fact (locked.facts) | MEDIUM |
| #4 LOCKED RULES | 5/4 | YES (UUIDs only) | MEDIUM |
| #5 PROHIBITED DIRECTIONS | 0/0 | (empty) | NONE |
| #6 NEED SKELETON | 5 | YES (5 generic statements) | **HIGH** (5 statements, explicit) |
| #7 EVIDENCE | 4 | empty content + provenance | LOW |
| #8 SOURCE TRACE IDS | 3 | (lists) | LOW |
| #9 EXCLUDED LEGACY | 1 | token list | LOW |
| #10 TASK | 8 | instructions | MEDIUM |
| #11 ID ASSIGNMENT | 6 | rules | LOW |
| #12 OUTPUT JSON SCHEMA | 3 | field names | LOW |
| #13 REQUIRED SHAPE | 3 | field structure | LOW |
| #14 EPISTEMIC RULES | 9 | rules | MEDIUM |

## Salience asymmetry: Need (5 statements) vs Facts (3 values)

**The Need skeleton has 5 explicit statements** (one per need), each ~1 sentence long. The model reads:
- "Audience/business-model/brand identity must be confirmed before downstream creative direction can be considered firm." → 业务未明需先确认
- "Preserve current brand identity and prevent reinterpretation as another category or brand." → 保持品牌身份
- "Locked assets and locked facts must remain unchanged across downstream creative interpretation." → 锁定资产不可改
- "Resolve or explicitly preserve ambiguity around identity / business model before direction generation." → 解决身份模糊
- "Differentiate from generic category expression so the brand does not blend with industry clichés." → 差异化反类目

**The AUTHORITATIVE PROJECT FACTS section has only 3 values**:
- `id=project_record:...:brand.name key=brand.name value=九州美学 authority=AUTHORITATIVE_PROJECT_METADATA`
- `id=visual_understanding_core:...:brand.role key=brand.role value=高端医疗美容服务提供者 authority=VISUAL_SOURCE_FACT`
- `id=project_record:...:business.industry key=business.industry value=待确认（基于现有素材推断） authority=AUTHORITATIVE_PROJECT_METADATA`

The 3 facts are formatted as `id=... key=... value=... authority=...` — a more technical/sparse format. The 5 needs are formatted as natural-language statements.

**Salience asymmetry confirmed**: the Need section has 5 high-salience natural-language statements; the Facts section has 3 low-salience sparse-format values. The model is more likely to anchor on the Need statements.

## Where does brand.role land in the prompt?

The brand.role fact (G01="高端医疗美容服务提供者", G02="提供中医诊疗、慢病管理及养生服务的体验机构") appears in:
- `#2 AUTHORITATIVE PROJECT FACTS` as `value=高端医疗美容服务提供者` (sparse format)
- `#6 NEED SKELETON` as `identity.factRefs=[...brand.role]` and `risk.factRefs=[...brand.role]` and `differentiation.factRefs=[...brand.role]` (UUID references)
- `#8 SOURCE TRACE IDS` as `facts: [..., project_record:...:brand.role, ...]` (UUID)

**The brand.role VALUE is visible ONCE in the prompt (in #2), in sparse format.** The model would have to read carefully to extract the value. Meanwhile, the 5 need statements (which are 5 SEPARATE natural-language sentences) are MORE visible.

**Salience collapse verdict**: the model attends to the 5 need statements MORE than to the 3 fact values. The model defaults to "lock vs unknown" tension framework because the need statements explicitly call out that combination.

## Counterfactual: what if facts came BEFORE needs, with values highlighted?

If the prompt were reordered:
1. AUTHORITATIVE PROJECT FACTS (with VALUE prominently shown, e.g., "**Business industry is 待确认**" or "**Brand role is 高端医疗美容服务提供者**")
2. LOCKED RULES
3. EVIDENCE
4. NEED SKELETON (after the model has already anchored on the positive facts)
5. TASK

The model would more likely anchor on the positive brand.role VALUE and use it to drive the TENSION framework.

But this is a **counterfactual** — the audit cannot prove the model would behave differently without re-running the synthesis. The audit records the OBSERVED asymmetry: need statements outnumber and out-format the fact values.

## Hard rule check (spec PART J)

The spec says: "Audit Prompt SALIENCE, not only presence."

**Findings**:
- 3 fact values are present in sparse format (`id=... key=... value=... authority=...`).
- 5 need statements are present in natural-language format.
- The model is more likely to anchor on the 5 needs.
- The brand.role VALUE is buried in 1 of the 3 facts, with the brand.name (forbidden as positive authority per epistemic rules) being more prominent.
- The TENSION framework output (3 "lock vs unknown" axes) is consistent with the need statements, not the fact values.

**This is `PROMPT_SALIENCE_COLLAPSE`**: positive project-specific content (brand.role) is present in the prompt but is not salient enough to drive the TENSION framework.

## Is this the primary first-loss?

The audit identifies PROMPT_SALIENCE_COLLAPSE as a STRONG candidate. But it is not the SOLE cause:
- Truth layer's business.industry=待确认 (placeholder) also drives the "unknown" tension
- Need layer's 5 generic statements also drive the "lock vs unknown" framework
- v1 DVC's 30+ project-specific entries are entirely absent from the prompt

The combination of:
1. Truth compresses positive content to a placeholder
2. Need strips VALUE and keeps only TYPE
3. Prompt positions Need statements more prominently than Fact values
4. v1 DVC's rich content never reaches the prompt

…produces the observed first-loss. The strongest single label is `PROMPT_SALIENCE_COLLAPSE` (the prompt's structure causes positive content to be ignored).

See `first-loss-stage-decision.md` for the final verdict.
