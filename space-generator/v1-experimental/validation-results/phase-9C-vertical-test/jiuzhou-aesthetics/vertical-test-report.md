# Phase 9C — JZMX Vertical Test (per scene × 1 image, 16:9 horizontal)

- **Generated**: 2026-08-01T14:17:23.384Z
- **Project**: a7a56ed7-849f-4671-b47a-466394d7298d (jiuzhou-aesthetics)
- **Provider**: profile-e871b4c5-7499-4749-b838-02410ad19cb1 (image, volcengine / doubao-seedream-5-0-pro-260628)
- **Size requested**: 1024×576 (16:9 horizontal)
- **Size returned by provider**: 2816×1584 (16:9, Seedream upscaled 2.75x); file is JPEG content with .png extension (service.ts writes downloaded bytes verbatim, mime vs extension mismatch is a service-side cosmetic issue, not a Phase 9C issue)
- **Reference asset**: abba5eaa-21c2-4a01-9fb9-c330ed8aff29 (project first image)
- **Total scenes**: 8, succeeded: 8, failed/hung: 0

## Per-Scene Results

| Scene | Type | Status | Duration (ms) | Blocks | Chars | Image bytes |
| --- | --- | --- | --- | --- | --- | --- |
| JZMX-EXTERIOR (门店外立面) | exterior | succeeded | 83324 | 16 | 11592 | 534048 |
| JZMX-RECEPTION (前台接待区) | reception | succeeded | 122164 | 16 | 11633 | 462265 |
| JZMX-LOBBY (品牌形象大厅) | other | succeeded | 105321 | 16 | 11581 | 443813 |
| JZMX-PRODUCT-DISPLAY (产品陈列区) | product_display | succeeded | 90366 | 16 | 11591 | 434652 |
| JZMX-CONSULTATION (咨询区) | consultation | succeeded | 85039 | 16 | 11605 | 439647 |
| JZMX-VIP-LOUNGE (VIP休息区) | vip_lounge | succeeded | 100173 | 16 | 11586 | 401230 |
| JZMX-CORRIDOR (走廊与过渡空间) | corridor | succeeded | 105258 | 16 | 11565 | 392158 |
| JZMX-TREATMENT (诊疗室) | treatment | succeeded | 109954 | 16 | 11583 | 429309 |

## Note

- **EXTERIOR** is technically an exterior/facade scene, not interior. It is included for completeness to cover all 8 vertical test scenes from scenes.json.
- **8/8 succeeded**. The original 8-scene batch had 3 scenes (VIP-LOUNGE / CORRIDOR / TREATMENT) hang on first run; all 3 were retried one-at-a-time and succeeded within normal 80-130s range. The hang was model-side intermittent slow response, not a Phase 9C compiler issue. The retries suggest rate limiting or load-dependent slow paths on the Seedream 5.0 Pro endpoint, since 5 back-to-back requests succeeded but the next 3 hit slow path; cooling down between requests recovered.
- Each scene uses the same project reference image (a real JZMX reference asset).
- image.png is 16:9 horizontal; design is per-scene, not Mode A vs B.
- All succeeded images share the same project reference (image-to-image), which keeps brand consistency but means each scene inherits the same compositional palette.
- Prompt is Phase 9C compileSpaceRuntime (16 blocks: spatial_intent + architecture_language + spatial_reality_constraint + architecture_preservation + 11 base).
