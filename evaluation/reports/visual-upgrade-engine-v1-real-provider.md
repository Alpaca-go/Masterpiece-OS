# Visual Upgrade Generation Engine v1 — Real Provider Validation

Validation date: 2026-07-28  
Branch: `feature/visual-upgrade-engine-v1`  
Authorization: the user authorized real Provider testing in this task thread.  
Credentials: not recorded.

## Provider and pipeline

- Creative Director: `qwen / qwen3.6-plus`
- Image Provider: `dashscope / wan2.7-image-pro`
- Pipeline: Visual Analysis → Creative Direction → Generation Blueprint → Image Provider
- Every accepted image run persisted `visual-analysis.json`, `creative-direction.json`,
  `generation-blueprint.json`, and `generation-result.json`.
- The final prompt contained the approved Creative Direction, Generation Blueprint,
  task-specific hard gate, and fixed anti-copy rules.

## Creative Direction acceptance

| Project | Direction | Model calls | Duration | Old problems | New direction | Visual world | Score |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 冯烫烫 | `creative-direction-2708734a-9b7f-465f-b9a0-5ad86b3ce781@1.2.0` | 1 | 74,692 ms | 5/5 | 5/5 | 5/5 | 5/5 |
| 九州美学 | `creative-direction-2a35d41f-37a5-4de7-84dd-98c9e08ee09e@1.0.0` | 1 | 97,331 ms | 5/5 | 5/5 | 5/5 | 5/5 |

九州美学的首次 Creative Reading 输出曾被旧校验器误判，因为合法规则“基于 Logo
曲线开发辅助图形”包含 `Logo` 字样。修复后使用同一真实原始响应重新校验通过；只有明确允许
修改、重绘、拆解、替换或变形身份资产的规则才会阻断。

## Final image acceptance

Scores are manual visual review of the actual downloaded image. Dimensions:
anti-copy / new direction / commercial finish / brand positioning.

| Project | Deliverable | Run ID | Ratio | References | Duration | Status | Scores |
| --- | --- | --- | --- | ---: | ---: | --- | --- |
| 冯烫烫 | Interior space | `0339f3a2-ec64-499b-a7bc-0ae5e597d0c8` | 16:9 | 0 | 20,248 ms | succeeded | 4 / 4 / 5 / 4 |
| 冯烫烫 | Packaging | `e5e33d32-9a97-45aa-81b0-ca2893066e18` | 1:1 | 0 | 13,823 ms | succeeded | 4 / 4 / 5 / 4 |
| 冯烫烫 | Brand poster | `58b36d03-9591-4213-84a9-6cc052050d46` | 4:5 | 0 | 11,563 ms | succeeded | 4 / 4 / 4 / 4 |
| 九州美学 | Interior space | `bebeb26f-2257-46c4-ac12-2ba36697329f` | 16:9 | 0 | 11,357 ms | succeeded | 4 / 4 / 5 / 4 |
| 九州美学 | Packaging | `50fcd5f1-5bc9-47b1-813e-b78b62d5fa1b` | 1:1 | 0 | 12,434 ms | succeeded | 4 / 4 / 5 / 4 |
| 九州美学 | Brand poster | `b8257ae9-67cb-4fb1-af17-09b173d42e2a` | 4:5 | 0 | 13,064 ms | succeeded | 4 / 4 / 4 / 4 |

The accepted spatial and poster tasks intentionally sent no image reference. Earlier validation proved
that a full Logo construction board could dominate composition and reintroduce VI-board layouts.
Packaging sends only a real packaging-structure reference when one exists; VI applications may send
one attention-cropped identity reference. The accepted projects did not have a necessary packaging
structure image, so their final Provider reference count was zero.

## Defects found and fixed during real validation

1. Anti-copy behavior depended on model wording. The Blueprint compiler now always injects the four
   fixed bans: old VI copy, old-poster content swap, old-packaging reskin, and old-space rearrangement.
2. A full Logo construction page was being sent as a Logo reference. Identity thumbnails now use
   attention crop, and spatial/poster tasks no longer send identity images by default.
3. Graphic 12-column composition rules leaked into spatial generation. Spatial Blueprints now use
   only spatial composition and space strategy.
4. A universal 1:1 Anchor canvas caused poster Mockups. Defaults are now spatial 16:9,
   poster 4:5, illustration 3:4, packaging/VI 1:1.
5. One 九州美学 spatial attempt (`f5546d80-0f72-4b83-a796-a5b93668e335`) reached a successful
   Provider response but failed with `IMAGE_DOWNLOAD_FAILED: fetch failed`. The same final pipeline
   was retried and succeeded; the failed run remains preserved for diagnosis.

## Known Provider limitation

Small generated Chinese/English copy is not reliably production-accurate. These outputs are accepted
as visual-upgrade images, not print-ready typography artwork. Exact copy/typesetting requires a later
deterministic layout or editing stage, which is outside this specification.
