# CI-W1C.7.3A — Project Truth Planning Coverage

> **Mode**: Zero-API diagnostic phase · **HEAD**: 5159d938
> **Purpose**: Audit how much of the Truth layer is planning-positive vs legacy-positive vs constraint-only. Determine whether the AUTHORITATIVE > VISUAL_SOURCE_FACT resolution suppressed rich visual content from becoming planning content.

## G01 Truth breakdown (17 facts)

| Category | Count | Examples |
|---|---:|---|
| PLANNING_STRATEGIC_SOURCE | 0 | (none authored by human planner) |
| USER_REQUIREMENT | 3 | locked.facts[0], locked.facts[1], locked.logo |
| PROJECT_METADATA (placeholder) | 4 | brand.name (AUTHORITATIVE+VISUAL+PSO 3 carriers), business.industry (AUTHORITATIVE=待确认, 1 row) |
| LOCKED_IDENTITY (constraint) | 7 | locked.assets 5×, locked.facts, locked.logo |
| LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS | 3 | brand.role (VISUAL=高端医疗美容服务提供者, 1 row + 1 PSO), business.industry (VISUAL=医疗美容, 1 row), brand.name (PSO+VISUAL additional rows) |
| UNKNOWN | 2 | business.model=null, product.core_products=null |

**Note**: business.industry has 3 carriers (project_record=待确认, PSO=待确认, visual_understanding_core=医疗美容). All 3 are in Truth as facts. AUTHORITATIVE wins the resolution → `待确认`. The `医疗美容` value is suppressed at the resolution layer but remains in Truth as a fact entry.

## G02 Truth breakdown (16 facts)

| Category | Count | Examples |
|---|---:|---|
| PLANNING_STRATEGIC_SOURCE | 0 | — |
| USER_REQUIREMENT | 3 | locked.facts[0], locked.facts[1], locked.logo |
| PROJECT_METADATA (placeholder) | 4 | brand.name (3 carriers), business.industry (AUTHORITATIVE=待确认) |
| LOCKED_IDENTITY | 6 | locked.assets 4×, locked.facts, locked.logo |
| LEGACY_VISUAL_EVIDENCE / VISUAL_DIAGNOSIS | 3 | brand.role (PSO+VISUAL 2 carriers), business.industry (VISUAL=中医健康管理与诊疗服务) |
| UNKNOWN | 2 | business.model=null, product.core_products=null |

## AUTHORITY resolution analysis

| Fact key | G01 carriers | G02 carriers | Resolution status | AUTHORITATIVE wins? |
|---|---|---|---|:-:|
| brand.name | 3 (UNANIMOUS) | 3 (UNANIMOUS) | RESOLVED | Yes (consensus) |
| brand.role | 2 (UNANIMOUS) | 2 (UNANIMOUS) | RESOLVED | Yes (consensus) |
| business.industry | 3 (CONFLICT) | 3 (CONFLICT) | CONFLICTED | Yes (project_record=待确认 wins) |
| business.model | 1 (UNKNOWN) | 1 (UNKNOWN) | UNKNOWN | n/a |
| product.core_products | 1 (UNKNOWN) | 1 (UNKNOWN) | UNKNOWN | n/a |
| locked.assets | 5/4 (CONFLICTED) | 4/4 (CONFLICTED) | CONFLICTED | Yes (user-lock-2 wins) |
| locked.facts | 1 (SINGLE) | 1 (SINGLE) | RESOLVED | n/a |
| locked.logo | 1 (SINGLE) | 1 (SINGLE) | RESOLVED | n/a |

**All 3 conflict resolutions correctly favor AUTHORITATIVE_PROJECT_METADATA.** This is the design choice: project_record owns business facts, and visual_understanding_core can only confirm but not override.

**Effect on planning-positive content**: the AUTHORITATIVE choice for `business.industry=待确认` (placeholder) suppresses the rich VUC inference (`医疗美容` / `中医健康管理与诊疗服务`) from the resolution. The prompt sees `industry=待确认` and the model defaults to "unknown industry" tension framework.

## Coverage verdict

| Aspect | G01 | G02 |
|---|---|---|
| Planning-positive facts in Truth | 3 USER_REQUIREMENT + 1 PROJECT_METADATA = 4 | 3 USER_REQUIREMENT + 1 PROJECT_METADATA = 4 |
| Planning-positive facts as % of total | 23.5% (4/17) | 25.0% (4/16) |
| Constraint-only facts | 7 LOCKED_IDENTITY = 41.2% | 6 LOCKED_IDENTITY = 37.5% |
| Legacy-positive facts (carrier rows) | ~5 (VUC-inferred brand.role + business.industry visual carrier) | ~5 (similar) |
| Unknown facts | 2 (12%) | 2 (13%) |
| Facts that are both project-specific AND planning-positive (have VALUE not just TYPE) | **0** (all 4 are either placeholders or constraints) | **0** |

**Critical observation**: NONE of the 17/16 Truth facts carry a project-specific planning VALUE that is NOT a placeholder or constraint. The "rich" facts (brand.role=高端医疗美容 / 中医诊疗) are VISUAL_DIAGNOSIS, not PLANNING.

If the user re-specifies business.industry to "医疗美容" or "中医健康管理与诊疗服务" in project.json:
- The conflict would resolve to UNANIMOUS
- The prompt would see a single clean value
- The synthesis would have a richer TENSION driver
- But the value would still be PROJECT_METADATA (user-typed) not PLANNING_STRATEGIC_SOURCE (planner-authored)

## What would make the Truth planning-positive

To get 1+ PLANNING_STRATEGIC_SOURCE fact in Truth, the user would need to:
1. Upload a planning brief (PDF / DOCX / TXT)
2. Have the document parser extract key facts (brand positioning, business strategy, audience, etc.)
3. Have the document-intelligence service assign the facts to PLANNING_STRATEGIC_SOURCE authority tier
4. Have the truth resolution preserve the planning value (not suppress it via AUTHORITATIVE)

The system is designed to support this path (the `document-processing` and `document-context-service` modules exist), but the user has not exercised it. Both G01 and G02 are "first-time uploads of visual assets" without an accompanying planning brief.

## Coverage summary

| Coverage aspect | G01 | G02 | Verdict |
|---|---|---|---|
| PLANNING_STRATEGIC_SOURCE coverage | 0/17 = 0% | 0/16 = 0% | **CRITICAL: zero planning strategy in Truth** |
| USER_REQUIREMENT coverage | 3/17 = 18% | 3/16 = 19% | OK (constraints) |
| PROJECT_METADATA coverage | 1-4/17 = 6-24% | 1-4/16 = 6-25% | OK (placeholders) |
| LOCKED_IDENTITY coverage | 7/17 = 41% | 6/16 = 38% | OK (constraints) |
| UNKNOWN coverage | 2/17 = 12% | 2/16 = 13% | OK (awaiting user) |
| Legacy carrier rows (visual_understanding_core) | 4/17 = 24% | 3/16 = 19% | LEAK (suppressed but present) |
| Planning-positive VALUE facts (not placeholders) | 0/17 = 0% | 0/16 = 0% | **CRITICAL: zero rich planning value** |

## Connection to CI-W1C.7.3

CI-W1C.7.3 measured the 5 generic Need types and found they collapse to identical statements across G01 and G02. The current audit shows that this collapse is EXPECTED because the Truth layer has NO rich planning-positive VALUE to drive differentiated need statements. The Need layer is NOT the cause; it's a SYMPTOM of the upstream absence.

**The TRUE_FIRST_LOSS is PLANNING_SOURCE_NOT_PRESENT in the dataset.** The Need layer's genericization is a SECONDARY EFFECT of the upstream absence.
