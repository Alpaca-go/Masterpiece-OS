# CI-W1C.7.4 — Fixture A Ingestion Report

> **Fixture**: `tests/fixtures/planning-briefs/qualification-planning-a.md`
> **Project ID**: `qualification-fixture-A`
> **Status**: PASS

## 1. Fixture identity

This is a **TEST FIXTURE**, not real G01 / G02 data. It is a synthetic
brand-strategy brief for a B2C organic-grocery subscription service
in China. The first 1200 chars of the file's raw text classify as
`brand-strategy` (matches `品牌(?:策略|战略|定位|策划)|brand\s*(?:strategy|positioning)`).

## 2. Pre-conditions

- File extension `.md` is in `PLANNING_BRIEF_SUPPORTED_EXTENSIONS`.
- File is read via the existing `readPlanningBriefFile` →
  `parseStrategyDocument` → `parseTextDocument` path.
- Text is LF-normalized via `planningBriefContentHash` before the
  record is built (so the hash matches what the builder will see).

## 3. Ingestion steps

| Step | Result |
|---|---|
| Read file via `readPlanningBriefFile` | OK (rawText trimmed) |
| Compute content hash | `bd554fe09ffad24dcdcf3584306acf166f4425808a5fe19db25856f3a6cb7edf` |
| Build `PlanningBriefRecord` | OK |
| Classify role | `brand-strategy` (medium) |
| Map to `sourceRole` | `PLANNING_STRATEGIC_SOURCE` |
| Defensive skip check | (skipped — planning role) |
| `prepareDocumentSet` | 1 chunk (text < 4000 chars) |
| `documentSetHash` | `fd17a4a3150330816fa7f95ea4be9941572d0ec00252d2a138a6e815a01da739` |
| `extractClaimsFromChunk` | 13 claims extracted |

## 4. Extracted claims (13)

| Key | Value (truncated) | Confidence | Epistemic class |
|---|---|:-:|:-:|
| `industry` | 有机生鲜电商 | 0.8 | FACT |
| `brand_positioning` | 城市级有机生鲜订阅服务的可信供应链品牌… | 0.7 | FACT |
| `brand_role` | 订阅型供应链运营方 | 0.7 | FACT |
| `business_model` | 会员制周配 + 产地直采冷链 | 0.7 | FACT |
| `product_service` | 有机蔬菜 + 当季水果 + 半成品净菜… | 0.7 | FACT |
| `target_audience` | 一线及新一线城市，30-45 岁… | 0.7 | FACT |
| `audience_problem` | 工作日无暇采购… | 0.6 | FACT |
| `brand_promise` | 每一份蔬菜可追溯到地块与采摘日期… | 0.6 | FACT |
| `competitive_context` | 盒马、叮咚买菜主打 30 分钟即时生鲜… | 0.6 | FACT |
| `differentiation_logic` | 不是更快的生鲜，而是更可被审计的生鲜 | 0.6 | FACT |
| `communication_task` | 建立「可被第三方审计的有机生鲜」第一联想… | 0.6 | FACT |
| `strategic_objective` | 12 个月内…35% | 0.7 | FACT |
| `experience_objective` | 在产品端首次打开 App 时… | 0.6 | FACT |

All 13 claims have `epistemicClass: 'FACT'`. Of those:

- 2 are eligible for Truth promotion (`industry` → `business.industry`,
  `brand_role` → `brand.role`).
- 11 stay in `EVIDENCE_ONLY` (no Truth key mapping in the
  CI-W1C.7.4 minimal registry).

## 5. Artifact fingerprint

```
planningEvidenceFingerprint: f6847acf6e19d573e805f0aaa3a5b74ec3df5e7249af89f87a02b1a55f1a4d50
documentSetHash:           fd17a4a3150330816fa7f95ea4be9941572d0ec00252d2a138a6e815a01da739
```

Both are 64-character lowercase hex SHA-256. The artifact schema is
`ci-w1c.7.4`. The strategic input fingerprint is sensitive to every
claim's value + epistemic class (verified by `PSC-07`, `PSC-08`,
`PFP-04`).

## 6. Tests covering this fixture

| Test | Verifies |
|---|---|
| `PDI-09` | end-to-end buildPlanningStrategicEvidenceArtifact with a real fixture |
| `PFP-01..05` | hash determinism, sourceId stability, fingerprint sensitivity |

All pass.
