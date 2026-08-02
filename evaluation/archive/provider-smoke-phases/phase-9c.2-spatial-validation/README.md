# Phase 9C.2 v2 — Brand Identity Validation & Spatial Strategy Auto-Selection Smoke

## 用途

对 3 品牌 (WAYE / 九州美学 / 冯烫烫) 用 Phase 9C.2 v2 `selectSpatialStrategy()` 自动选 strategy,
调 Provider (Seedream 5.0 Pro) 跑 1 张 16:9 横板空间效果图.

跟 Phase 9C.2 v1 (4 preset × 1 image = 12 张) 不同:
- 9C.2 v1: 用户从 4 preset 选一个, 跑 1 张
- 9C.2 v2: 系统自动从 4 strategy 选 1 个, 跑 1 张
- 9C.2 v2 不暴露用户选 strategy (per doc §6 + §10)

## 历史

- 9C.2 v1 (`b1cd5dd`): 4 preset × 3 brand × 1 image = 12 张 (用户选)
- 9C.2 v2 (本 smoke): 1 auto-strategy × 3 brand × 1 image = 3 张 (系统选)

## 用法

```bash
# 1. 设置环境变量
$env:MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS = 'a7a56ed7-849f-4671-b47a-466394d7298d'
$env:MASTERPIECE_SMOKE_PROJECT_ID_WA_YE             = '8d73845c-1477-485a-b6bb-40aed16c06b1'
$env:MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG    = '9a17c103-7e36-43b1-aa90-1a4d2c8f31d1'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID             = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'

# 2. 跑 smoke
cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9c.2-spatial-validation/run-phase-9c.2-spatial-validation.mjs
```

## 输出

- `docs/reference/phase-9c.2-spatial-validation/{brand}.jpg` (3 image deliverables, **gitignored**)
- `docs/reference/phase-9c.2-spatial-validation/report.md` (integrated report)
- `validation-results/phase-9c.2-spatial-validation/{brand}/prompt.md` (auto-strategy compiled prompt)
- `validation-results/phase-9c.2-spatial-validation/{brand}/run.json` (confidence + strategy + run record, 脱敏)
- `validation-results/phase-9c.2-spatial-validation/{brand}/report.md` (per-brand human-readable)
- `validation-results/phase-9c.2-spatial-validation/{brand}/image.png` (**gitignored**)

## Auto-selected strategy (per text-level tests)

| Brand | Industry | Strategy | Reason |
|---|---|---|---|
| 九州美学 | medical_aesthetics | reference_driven (with JZMX-ARCH-01) | strong reference + decent brand/arch |
| 蛙耶 | casual_dining | brand_driven | strong brand axis (1.00) > arch (0.86) |
| 冯烫烫 | restaurant | balanced | no dominant axis (brand=0.53, arch=0.54) |

## Doc §9 Acceptance Check

- **WAYE** 必须恢复: 青蛙IP / 紫绿黄体系 / 餐饮属性 / 潮流品牌语言. 禁止 体育零售空间.
- **九州美学** 保持: 建筑高级感 / 东方气质 / 医美属性.
- **冯烫烫** 保持: 餐饮真实性 / 品牌视觉.

## 不调 / 调

- 不调真实 Provider: 无 (本 smoke 是 真实 Provider 调用, user-authorized)
- 不修改 v1-baseline
- 不污染生产代码
- 不接 production UI (per doc §10)
