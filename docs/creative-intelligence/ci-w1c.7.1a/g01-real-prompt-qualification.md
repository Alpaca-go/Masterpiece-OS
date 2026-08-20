# CI-W1C.7.1A — G01 九州美学 Real Prompt Qualification

> Date: 2026-08-20
> Phase: CI-W1C.7.1A
> Project: G01 = 九州美学
> ProjectId: `590eadf2-76cb-4042-a034-db93481b06c9`

---

## 1. Project artifact counts

| Field | Value |
|---|---:|
| facts | 17 |
| needs | 5 |
| evidence entries | 4 |
| unique sourceIds | 16 |
| brand.name (project truth) | `九州美学` |
| authority of brand.name fact | `AUTHORITATIVE_PROJECT_METADATA` |

(See `real-project-input-resolution.md` §3 for the source of these
counts.)

---

## 2. Real project-specific content in the prompt

The CI-W1C.7.1 Strategic prompt for G01 contains the following
real project-specific fragments:

| Section | Sample |
|---|---|
| `# LOCKED RULES` | `id=project_record:590eadf2-...:locked.facts value=["原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。", "输出语言固定为简体中文。"]` |
| `# LOCKED RULES` | `id=project_record:590eadf2-...:locked.logo value=true` |
| `# LOCKED RULES` | Locked asset IDs: `4f65f3f8-...`, `755bd372-...`, `brand-name-32fa23e11f42`, `user-lock-1`, `user-lock-2` |
| `# NEED SKELETON` | Need `need:clarification:...:business.model:critical` statement: "Audience/business-model/brand identity must be confirmed before downstream creative direction can be considered firm." |
| `# NEED SKELETON` | Need `need:identity:...:brand.name:critical` statement: "Preserve current brand identity and prevent reinterpretation as another category or brand." |
| `# NEED SKELETON` | Need `need:preservation:...:locked.assets:...:critical` statement: "Locked assets and locked facts must remain unchanged across downstream creative interpretation." |
| `# EVIDENCE` | `id=project:590eadf2-...:brand_name sourceKind=project_record summary=ProjectRecord.brandName` |
| `# SOURCE TRACE IDS` | 16 real source IDs (e.g. `project_record:590eadf2-...:locked.facts`, `visual_understanding_core:590eadf2-...:brand.name`) |

The literal `九州美学` string does NOT appear in the AUTHORITATIVE
PROJECT FACTS section (because the existing
`isAuthoritativePlanning` filter excludes
`AUTHORITATIVE_PROJECT_METADATA` authority), but the brand
identity IS preserved via the locked-facts and preservation needs.

---

## 3. Strategic prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 10319 |
| sectionCount | (count of `^# ` lines, varies) |
| estimatedInputTokens | 3440 |
| qualificationTokensRequired (input + 2 × output) | 11440 |
| contextTokensRequired (input + output) | 7440 |
| budgetStatus | **PASS** |
| inputFingerprint | `655f19133e938b8e9c3dfe46530cba986d6124c36a788e9c871bf55602f74448` |
| promptVersion | `ci-w1c.7.1-strategic-synthesis-v0.2` |

---

## 4. Concept prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 11878 |
| estimatedInputTokens | 3960 |
| qualificationTokensRequired | 11960 |
| contextTokensRequired | 7960 |
| budgetStatus | **PASS** |
| inputFingerprint | `3d5d344e21fbfddd85478e3ce28434599fb8ad67c8f890471340375d2527bffe` |
| promptVersion | `ci-w1c.7.1-model-assisted-concept-v0.2` |

---

## 5. Direction prompt metrics

| Metric | Value |
|---|---:|
| characterCount | 15440 |
| estimatedInputTokens | 5147 |
| qualificationTokensRequired | 13147 |
| contextTokensRequired | 9147 |
| budgetStatus | **PASS** |
| inputFingerprint | `1a768023ce07bd785ad0c663f3d385af162c5f6f5599db750d9cf586823ff768` |
| promptVersion | `ci-w1c.7.1-model-assisted-direction-v0.2` |

The Direction prompt is the largest because it serializes the
full StrategicSynthesisArtifact + full ModelAssistedConceptSet.
It still fits the default qualification budget (16K) with
margin (~2.8K).

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

## 8. Source trace integrity

`ctx.sourceIds.facts` contains 7 ids (the LOCKED-class facts):
- `visual_understanding_core:590eadf2-...:locked.assets:4f65f3f8-...`
- `visual_understanding_core:590eadf2-...:locked.assets:755bd372-...`
- `visual_understanding_core:590eadf2-...:locked.assets:brand-name-32fa23e11f42`
- `visual_understanding_core:590eadf2-...:locked.assets:user-lock-1`
- `visual_understanding_core:590eadf2-...:locked.assets:user-lock-2`
- `project_record:590eadf2-...:locked.facts`
- `project_record:590eadf2-...:locked.logo`

All 7 appear in the `# SOURCE TRACE IDS` section of the prompt.

`ctx.sourceIds.needs` and `ctx.sourceIds.evidence` likewise appear.

---

## 9. Snapshot integrity

| File | Path | generatedAt | inputFingerprint | budgetStatus |
|---|---|---|---|---|
| G01 Strategic | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g01/strategic-synthesis.prompt.json` | recorded | matches | PASS |
| G01 Concept | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g01/concept-ideation.prompt.json` | recorded | matches | PASS |
| G01 Direction | `docs/creative-intelligence/ci-w1c.7.1a/real-project-prompts/g01/direction-ideation.prompt.json` | recorded | matches | PASS |

`generatedAt` is present as snapshot metadata and does NOT affect
the semantic fingerprint (FP-05).
