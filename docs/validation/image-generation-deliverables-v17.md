# Image Generation Deliverables V17 Validation

Date: 2026-07-27  
Mode: offline deterministic golden validation

## Scenarios

| Scenario | Source preset | Deliverable | Expected result |
| --- | --- | --- | --- |
| 冯烫烫店内空间 | `visual_analysis` | `interior_scene` | Complete interior scene; VI flat-lays remain analysis-only |
| 冯烫烫 VI 对照 | `visual_analysis` | `vi_application` | Menu/apron/application materials remain permitted |
| 店面门头 | `visual_analysis` | `storefront_scene` | Complete facade, entrance, signage, street relationship |
| 包装渲染 | `visual_analysis` | `packaging_render` | Physical packaging structure is required and selected |

## Verified invariants

- Source preset and deliverable are independent V3 fields.
- Deliverable and current user intent are the first Prompt priorities.
- Interior generation selects at most one identity reference and prefers spatial references.
- Menu flat-lays and apron mockups are not sent to the Provider for an interior scene.
- The VI control group proves that application materials are not globally prohibited.
- Storefront and packaging use their own requirements and negative rules.
- Compile fingerprints become stale after source, intent, deliverable, reference-plan, or Prompt changes.
- Formal V3 start requires the confirmed compile run and recomputes its fingerprint before Provider submission.
- V2 retry migrates to V3 while using the persisted source snapshot.

## Regression evidence

- `npm test`: 158/158 passed.
- `npm run desktop:test`: 151/151 passed.
- `npm run desktop:build`: TypeScript and production bundles passed.
- `npm run verify:current-flows`: passed offline without external API calls.
- Provider adapter, image download, resume, retry, V1/V2 compatibility, four legacy source presets, and Desktop IPC/service tests remain in the image-generation suite.
- The golden fixture and tests are fully offline and never call a model API.

No Desktop executable was packaged or delivered in this phase.
