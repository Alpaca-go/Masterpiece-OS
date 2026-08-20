# CI-W1C.7.3 — Synthesis Source Utilization Audit

> **Mode**: Zero-API static audit · **HEAD**: `c058316c442e3554c49a91a468533d5d426e5768`
> **Purpose**: Audit whether the live synthesis model output uses the project-specific content from the prompt, or whether it defaults to a generic "lock vs unknown" framework. The spec calls this "audit Synthesis source utilization" and allows the `MODEL_SYNTHESIS_COLLAPSE` verdict ONLY if Truth distinct + Prompt distinct/balanced + refs available but model still ignores project-specific content.

## Live synthesis output — G01 (3 tensions, 3 insights, 3 opportunities)

### Tensions (identity-stripped)

| # | Pole A | Pole B | Project-specific? |
|---|---|---|---|
| tension-i0 | "Unalterable visual identity" | "Undefined strategic positioning" | NO (generic "lock vs unknown") |
| tension-i1 | "Fixed brand identity" | "Evolving market clichés" | NO (generic "fixed vs market") |
| tension-i2 | "Fixed linguistic output" | "Global or multi-demographic scaling" | NO (generic "language vs scaling") |

### Insights (identity-stripped)

| # | Statement | Project-specific? |
|---|---|---|
| insight-i0 | "Rigid asset preservation forces strategic clarity in messaging rather than visual exploration." | NO (generic "preservation forces clarity") |
| insight-i1 | "Mandating simplified Chinese output establishes a direct cultural and communicative boundary for all downstream creative work." | NO (generic "language constraint") |
| insight-i2 | "The unresolved business model creates a strategic gap that must be filled by explicit brand role definition rather than visual adaptation." | PARTIAL (mentions "explicit brand role definition" but doesn't say what the role is) |

### Opportunities (identity-stripped)

| # | Title | Project-specific? |
|---|---|---|
| opp-i0 | "Contextual Framework Engine" | NO (generic title) |
| opp-i1 | "Linguistic-First Positioning" | NO (generic title) |
| opp-i2 | "Identity Clarification Protocol" | NO (generic title) |

## Live synthesis output — G02 (3 tensions, 3 insights, 3 opportunities)

### Tensions (identity-stripped)

| # | Pole A | Pole B | Project-specific? |
|---|---|---|---|
| tension-0 | "Strict adherence to unmodified logo and locked asset parameters" | "Requirement to avoid generic industry clichés and establish unique market positioning" | NO (generic "lock vs differentiation") |
| tension-1 | "Unconfirmed audience, industry, and business model context" | "Locked visual parameters and mandatory Simplified Chinese output" | NO (generic "unknown vs fixed") |
| tension-2 | "Absolute prohibition on altering, reinterpreting, or replacing core marks" | "Strategic expectation for brand progression and modern relevance" | NO (generic "preservation vs progression") |

### Insights (identity-stripped)

| # | Statement | Project-specific? |
|---|---|---|
| insight-0 | "When visual anchors are immutable, strategic differentiation must shift from form to positioning architecture." | NO (generic "immutable → positioning") |
| insight-1 | "Unresolved business model ambiguity requires a modular, assumption-light creative framework." | NO (generic "unknown → modular") |
| insight-2 | "Language constraint and asset rigidity dictate a precision-first communication strategy." | NO (generic "language+rigidity → precision") |

### Opportunities (identity-stripped)

| # | Title | Project-specific? |
|---|---|---|
| opp-i0 | "Contextual Framing Systems" | NO (generic) |
| opp-i1 | "Modular Positioning Frameworks" | NO (generic) |
| opp-i2 | "Precision-Led Linguistic Anchoring" | NO (generic) |

## G01 vs G02 synthesis output — identity-stripped comparison

| Layer | G01 pattern | G02 pattern | Different? |
|---|---|---|---|
| tension axis 1 | "Logo lock vs undefined business" | "Asset lock vs differentiation need" | NO (paraphrase) |
| tension axis 2 | "Fixed identity vs market clichés" | "Unknown context vs fixed execution" | NO (paraphrase) |
| tension axis 3 | "Language lock vs scaling" | "Preservation vs progression" | NO (paraphrase) |
| insight axis 1 | "Preservation forces messaging clarity" | "Immutable → positioning architecture" | NO (paraphrase) |
| insight axis 2 | "Language constraint" | "Unknown → modular framework" | NO (paraphrase) |
| insight axis 3 | "Unresolved business model" | "Language+rigidity → precision" | NO (paraphrase) |
| opportunity axis 1 | "Contextual Framework Engine" | "Contextual Framing Systems" | NO (paraphrase) |
| opportunity axis 2 | "Linguistic-First Positioning" | "Modular Positioning Frameworks" | NO (paraphrase) |
| opportunity axis 3 | "Identity Clarification Protocol" | "Precision-Led Linguistic Anchoring" | NO (paraphrase) |

**All 9 axes (3 tensions + 3 insights + 3 opportunities) are paraphrases of the SAME 3-function structure**: (lock vs unknown) / (fixed vs context) / (language vs scaling). The two projects produce NEAR-IDENTICAL synthesis outputs when brand names are stripped.

## Why is the synthesis output generic?

**Hypothesis 1 (Truth+Need cause)**: The prompt's NEED section has 5 generic statements that explicitly call out "lock vs unknown" patterns. The model anchors on these.

**Hypothesis 2 (Prompt salience cause)**: The AUTHORITATIVE PROJECT FACTS section has 3 sparse values, while NEED has 5 prominent natural-language statements. The model attends to the NEED more.

**Hypothesis 3 (DVC content unreachable cause)**: The v1 DVC's 30+ project-specific entries (color hex codes, motif names, copy strings, risk descriptions) never reach the prompt. The model has no source for the rich brand.role VALUE to use as TENSION driver.

**Hypothesis 4 (brand.role is in prompt but model doesn't elevate it)**: The brand.role VALUE is technically in the prompt (in #2 AUTHORITATIVE PROJECT FACTS, sparse format). The model COULD use it, but doesn't, because the NEED section's 5 generic statements dominate attention.

All 4 hypotheses point to the same conclusion: **the synthesis model is not given enough project-specific positive content to drive a project-specific TENSION framework**.

## MODEL_SYNTHESIS_COLLAPSE verdict

The spec says: "MODEL_SYNTHESIS_COLLAPSE is allowed only if: Truth distinct + Prompt distinct/balanced + refs available but model still ignores project-specific content."

- Is Truth distinct? YES (2 of 17 facts differ, including brand.role VALUE).
- Is Prompt distinct/balanced? PARTIAL — the prompt has 2 brand.role values that differ (G01="高端医疗美容服务提供者" vs G02="中医诊疗..."), but the prompt's NEED section is identical generic for both projects.
- Are refs available? YES (brand.role is in the prompt's AUTHORITATIVE PROJECT FACTS section).
- Does the model ignore project-specific content? YES — the synthesis output is generic.

**Counter-argument**: The prompt IS balanced (it has 3 facts + 5 needs + 5 locked rules). The brand.role is in the prompt. The model has refs. So technically the model could have used brand.role to drive a project-specific TENSION. But it didn't.

**Verdict**: This is **`MODEL_SYNTHESIS_COLLAPSE` only WEAKLY.** The model is not the primary culprit; the prompt structure (which puts need statements more prominently than fact values) is the primary cause. The model's behavior is consistent with the prompt's signal.

The PRIMARY first-loss is upstream of the model: the prompt's salience filter (or the Need layer's genericization) causes the model to default to a generic framework.

## Hard rule check (spec PART K)

The spec says: "Audit Synthesis source utilization. MODEL_SYNTHESIS_COLLAPSE is allowed only if: Truth distinct + Prompt distinct/balanced + refs available but model still ignores project-specific content."

**Answer**: The 3 conditions are PARTIALLY met. The model does ignore project-specific content. But the prompt is NOT fully balanced (Need section is more salient than Facts section). So `MODEL_SYNTHESIS_COLLAPSE` is not the cleanest label.

The cleanest label is **`PROMPT_SALIENCE_COLLAPSE`** or **`NEED_DERIVATION_GENERICIZATION`** (the upstream causes that the model is responding to).

See `first-loss-stage-decision.md`.
