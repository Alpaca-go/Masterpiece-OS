# CI-W1C.7.1A — G02 一剂良方 Real Prompt Qualification

> Date: 2026-08-20
> Phase: CI-W1C.7.1A
> Project: G02 = 一剂良方
> ProjectId: `a13d6c09-99f7-4ff9-b499-3b9f8a1df31b`

---

## 1. Project artifact counts

| Field | Value |
|---|---:|
| facts | 16 |
| needs | 5 |
| evidence entries | 4 |
| unique sourceIds | 15 |
| brand.name (project truth) | `一剂良方` |
| authority of brand.name fact | `AUTHORITATIVE_PROJECT_METADATA` |

(See `real-project-input-resolution.md` §3 for the source of these
counts.)

---

## 2. Real project-specific content in the prompt

The CI-W1C.7.1 Strategic prompt for G02 contains the following
real project-specific fragments:

| Section | Sample |
|---|---|
| `# LOCKED RULES` | `id=project_record:a13d6c09-...:locked.facts value=[...]` (project-specific locked-facts array) |
| `# LOCKED RULES` | `id=project_record:a13d6c09-...:locked.logo value=true` |
| `# LOCKED RULES` | Locked asset IDs: `2409032d-af08-4a34-a5bf-10d0ede9a35e`, `brand-name-a29bc2c550f3`, `user-lock-1`, `user-lock-2` |
| `# NEED SKELETON` | Need `need:clarification:...:business.model:critical` statement: "Audience/business-model/brand identity must be confirmed before downstream creative direction can be considered firm." |
| `# NEED SKELETON` | Need `need:identity:...:brand.name:critical` statement: "Preserve current brand identity and prevent reinterpretation as another category or brand." |
| `# NEED SKELETON` | Need `need:preservation:...:locked.assets:...:critical` statement: "Locked assets and locked facts must remain unchanged across downstream creative interpretation." |
| `# EVIDENCE` | `id=project:a13d6c09-...:brand_name sourceKind=project_record summary=ProjectRecord.brandName` |
| `# SOURCE TRACE IDS` | 15 real source IDs |

---

## 3. Strategic prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 9692 |
| estimatedInputTokens | 3231 |
| qualificationTokensRequired | 11231 |
| contextTokensRequired | 7231 |
| budgetStatus | **PASS** |
| inputFingerprint | `52182d5cab793ed5d63f8ad94e10db2b7caa0bab9183f67cda9de5c4fd860e9e` |
| promptVersion | `ci-w1c.7.1-strategic-synthesis-v0.2` |

---

## 4. Concept prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 11335 |
| estimatedInputTokens | 3779 |
| qualificationTokensRequired | 11779 |
| contextTokensRequired | 7779 |
| budgetStatus | **PASS** |
| inputFingerprint | `a9d88c3a19bf24899ded657abde0a6fbd3f8ae173a025aeb429ac3d1ff621663` |
| promptVersion | `ci-w1c.7.1-model-assisted-concept-v0.2` |

---

## 5. Direction prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 14897 |
| estimatedInputTokens | 4966 |
| qualificationTokensRequired | 12966 |
| contextTokensRequired | 8966 |
| budgetStatus | **PASS** |
| inputFingerprint | `58bb7592eb68bc8c6fb5fa4db05831a028198f6b898a448880f604c1d8b7a159` |
| promptVersion | `ci-w1c.7.1-model-assisted-direction-v0.2` |

---

## 6. Section presence audit

| Section | Present |
|---|---|
| `# PROJECT` | ✓ |
| `# AUTHORITATIVE PROJECT FACTS` | ✓ |
| `# USER REQUIREMENTS` | ✓ |
| `# LOCKED RULES` | ✓ |
| `# PROHIBITED DIRECTIONS` | ✓ |
| `# NEED SKELETON` | ✓ |
| `# EVIDENCE` | ✓ |
| `# SOURCE TRACE IDS` | ✓ |
| `# EXCLUDED LEGACY VISUAL AUTHORITIES` | ✓ |
| `# TASK` | ✓ |
| `# OUTPUT JSON SCHEMA` | ✓ |
| `# EPISTEMIC RULES` | ✓ |

All 12 required sections present.

---

## 7. Positive legacy content audit

The Strategic prompt mentions legacy visual evidence ONLY inside
the `# EXCLUDED LEGACY VISUAL AUTHORITIES` section. Before that
section, the search terms `visualAsset.*`, `old_VI`, `old_poster`,
`old_packaging`, `old_spatial` do NOT appear.

```
positiveLegacyMentions: []  (empty)
```

PASS.

---

## 8. Cross-project prompt difference

Comparing G01 and G02 Strategic prompts after stripping the
projectId:

| Field | Same? | Reason |
|---|---|---|
| AUTHORITATIVE PROJECT FACTS section | **Different** | Different locked-asset IDs and locked.facts values |
| USER REQUIREMENTS section | Different | Different user.requirement* facts |
| NEED SKELETON section | Different | Different need IDs and statements |
| EVIDENCE section | Different | Different evidence IDs and summaries |
| SOURCE TRACE IDS section | Different | 16 IDs for G01 vs 15 IDs for G02 |
| Locked asset IDs (e.g. `4f65f3f8-…` vs `2409032d-…`) | Different | Real per-project UUIDs |

Difference is **not** caused by projectId / timestamps / counts /
hashes alone — the prompts carry distinct real project semantics.

---

## 9. Snapshot integrity

| File | Path | generatedAt | inputFingerprint | budgetStatus |
|---|---|---|---|---|
| G02 Strategic | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g02/strategic-synthesis.prompt.json` | recorded | matches | PASS |
| G02 Concept | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g02/concept-ideation.prompt.json` | recorded | matches | PASS |
| G02 Direction | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g02/direction-ideation.prompt.json` | recorded | matches | PASS |
