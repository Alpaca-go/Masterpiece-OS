# Phase 9C — Vertical Test Smoke (JZMX 8 scenes × 16:9 horizontal)

> User-authorized 端到端 image Provider smoke: 用 Phase 9C `compileSpaceRuntime` (16 块 prompt)
> 给 JZMX project 的 8 个 vertical test scene 各生成 1 张 16:9 横板室内空间效果图.
>
> **跳过 text analysis** — project 已分析 (27 image assets ready), 直接复用.
> **Per system rule**: 必须 user-authorized. 没拿到 project ID + image profile ID 之前不能跑.

## 必填环境变量

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_PROJECT_ID` | desktop 项目 ID (来自 `Documents\Masterpiece OS Data\projects\`) | `a7a56ed7-849f-4671-b47a-466394d7298d` |
| `MASTERPIECE_SMOKE_IMAGE_PROFILE_ID` | image generation profile ID (来自 AppData credentials) | `profile-e871b4c5-...` |

## 可选环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_BRAND_KEY` | `jiuzhou-aesthetics` | DNA / spatial intent / spatial reality / architecture preservation 的 brand key |
| `MASTERPIECE_SMOKE_SIZE` | `1024*576` | image size (16:9 horizontal) |
| `MASTERPIECE_SMOKE_USER_DATA` | `APPDATA/masterpiece-os-desktop` | desktop userData 路径 |
| `MASTERPIECE_SMOKE_REPO_ROOT` | `cwd/../..` | 仓库根 (默认 D:\Masterpiece-OS) |
| `MASTERPIECE_SMOKE_SCENE_IDS` | (全 8 个) | 逗号分隔跑子集, e.g. `JZMX-RECEPTION,JZMX-LOBBY` |

## 跑法

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID = "a7a56ed7-849f-4671-b47a-466394d7298d"
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = "profile-e871b4c5-7499-4749-b838-02410ad19cb1"
$env:MASTERPIECE_SMOKE_REPO_ROOT = "D:\Masterpiece-OS"

cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9c-vertical-test/run-phase-9c-vertical-test.mjs
```

## 输出

`space-generator/v1-experimental/validation-results/phase-9C-vertical-test/{brand}/`:

```
{brand}/
├── JZMX-EXTERIOR/
│   ├── run.json     # provider run metadata (redacted, no secret)
│   ├── prompt.md    # 16 块 Phase 9C compiled prompt
│   └── image.png    # 16:9 横板 (gitignored)
├── JZMX-RECEPTION/
│   ├── run.json
│   ├── prompt.md
│   └── image.png
├── ... (8 scenes)
├── vertical-test-summary.json
└── vertical-test-report.md
```

## 8 scene (per scenes.json)

| ID | Type | Notes |
| --- | --- | --- |
| JZMX-EXTERIOR | exterior | 门店外立面 — 不算 interior, 但为了全 8 场景仍跑 |
| JZMX-RECEPTION | reception | 前台接待区, 60 sqm, street_store |
| JZMX-LOBBY | other (lobby) | 品牌形象大厅, 200 sqm, flagship |
| JZMX-PRODUCT-DISPLAY | product_display | 产品陈列区, 30 sqm, 材质克制 |
| JZMX-CONSULTATION | consultation | 咨询区, 20 sqm, privacy.enclosed |
| JZMX-VIP-LOUNGE | vip_lounge | VIP 休息区, 50 sqm, flagship, soft enclosure |
| JZMX-CORRIDOR | corridor | 走廊, 15 sqm, transition, camera.lens=normal |
| JZMX-TREATMENT | treatment | 诊疗室, 25 sqm, medical 感但不医院化 |

## 跟 Phase 9C 文档 / 之前 phase 的对应关系

| 现有 phase | 本 smoke 用法 |
| --- | --- |
| Phase 9A.2 spatial intent | `spatialIntentDna` 注入 compileSpaceRuntime |
| Phase 9A.3 architecture bridge | derive 5-field `architectureLanguage` inside runtime |
| Phase 9B.1 spatial reality | `spatialRealityDna` 注入 compileSpaceRuntime |
| Phase 9B.2 architecture preservation | `architecturePreservation` 注入 compileSpaceRuntime |
| Phase 9C runtime | 整合 4 层 → 16 块 prompt |
| Phase 4 `run.mjs` deriveDna | 复用 override sceneDefinition / functionalDna / compositionDna |

## 注意

- **不调 text Provider** (analysis). 项目已分析, 27 image assets ready, 跳过 `pipeline.start()`.
- **不修改生产代码** (compileFieldEnrichedPrompt / compileRuntimePrompt / Phase 9A-9B 任何 baseline 100% 不变).
- **不暴露 credential** (run.json / image.png 不含 API key).
- **不污染 v1-baseline** (smoke runner 独立在 `apps/desktop/scripts/phase-9c-vertical-test/`, 输出在 `space-generator/v1-experimental/validation-results/phase-9C-vertical-test/`, 都不在 production runtime 路径).
- **EXTERIOR 是 exterior scene, 不是 interior**. 仍跑因为要覆盖 8 个 vertical test 全集; 用户视觉判断时知道这个差别.
- **所有 scene 共享同一张 reference image** (project 现有 image asset). 这是 v0.1 简化, 不做 per-scene reference.

## 跟 5.0.0 cut 的关系

本 smoke 是 v1.1 Spatial Intelligence 整合到 Runtime 之后的第一个 **scene-level 验证**, 不是 5.0.0 cut 的 release gate.
5.0.0 release gate 由 `docs/releases/5.0-repository-consolidation.md §7.3` 三轮独立 smoke 覆盖.
