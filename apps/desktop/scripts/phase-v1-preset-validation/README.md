# Phase v1.0 — Spatial Intent Presets Validation Smoke

## 用途

不接 production UI, 走 `compileSpaceRuntime` + real Provider (Seedream 5.0 Pro), 4 个
Spatial Intent Preset (`brand_driven` / `architecture_driven` / `reference_driven` /
`balanced`) 各生成 1 张 16:9 EXTERIOR 空间效果图, 验证 4 个 preset 的实际效果差异.

## 约束

- **不修改任何 production 代码** (apps/cli / apps/desktop / packages 不动)
- **不接入 production UI** (production 生图 UI 的 SourceBundle preset 是另一套)
- **不修改现有 production preset**
- **直接调**: `compileSpaceRuntime(brand, { preset, spaceTypeOverride })` → 17-18 块 markdown prompt → image gen service → real Provider

## 用法

### 1. 设置环境变量

```powershell
$env:MASTERPIECE_SMOKE_BRAND_KEY         = 'jiuzhou-aesthetics'
$env:MASTERPIECE_SMOKE_PROJECT_ID        = 'a7a56ed7-849f-4671-b47a-466394d7298d'  # 九州美学 desktop project
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID  = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'  # Seedream 5.0 Pro
$env:MASTERPIECE_SMOKE_SPACE_TYPE        = 'exterior'  # override DNA sceneType (default 'reception')
$env:MASTERPIECE_SMOKE_SIZE              = '1024*576'  # 16:9 横版
```

### 2. 准备 reference 图片 (Mode 3 only)

```powershell
$target = 'C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-a7a56ed7\input\assets\JZMX-ARCH-01-reference.png'
if (-not (Test-Path $target)) {
  Copy-Item 'D:\Masterpiece-OS\docs\reference\JZMX-ARCH-01.png' $target
}
```

> **注意**: 必须在 desktop project 的 `input/assets/` 下, image gen service 通过
> `projectRelativePath: input/assets/JZMX-ARCH-01-reference.png` 读取.

### 3. 跑 smoke

```powershell
cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-v1-preset-validation/run-phase-v1-preset-validation.mjs
```

## 输出

### 主输出 (用户可见)

`D:\Masterpiece-OS\docs\reference\`:

| 文件 | 大小 | 用途 |
| --- | --- | --- |
| `jiuzhou_exterior_brand-driven_v1.jpg` | ~700KB | Mode 1 brand_driven 出图 |
| `jiuzhou_exterior_architecture-driven_v1.jpg` | ~700KB | Mode 2 architecture_driven 出图 |
| `jiuzhou_exterior_reference-driven_v1.jpg` | ~700KB | Mode 3 reference_driven 出图 (用 JZMX-ARCH-01.png) |
| `jiuzhou_exterior_balanced_v1.jpg` | ~700KB | Mode 4 balanced 出图 |
| `jiuzhou-spatial-intent-validation-report.md` | ~3KB | 4 preset 整合报告 (status / duration / intent 4 维 / next-step) |

### Validation artifacts (text-level, 在 validation-results/ 目录)

`D:\Masterpiece-OS\space-generator\v1-experimental\validation-results\phase-v1-preset-validation\jiuzhou-aesthetics\<preset>\`:

- `prompt.md` — compileSpaceRuntime 17-18 块 markdown (脱敏)
- `run.json` — run record (脱敏, no API key)
- `report.md` — per-preset human-readable report
- `image.png` — image copy (gitignored per .gitignore)

## 4 Preset 预期

| Preset | 4 维 intent | 预期效果 |
| --- | --- | --- |
| `brand_driven` | brand=dominant / arch=balanced / ref=low / industry=maintain | 品牌气质主导, 弱化建筑细节, 避免变成广告展示空间 |
| `architecture_driven` | brand=balanced / arch=dominant / ref=low / industry=maintain | 建筑结构 / 材质 / 光影主导, 弱化品牌符号 |
| `reference_driven` | brand=balanced / arch=balanced / ref=dominant / industry=maintain | 借鉴 JZMX-ARCH-01.png 的构图/光线/材质, 不复刻 logo |
| `balanced` | brand=balanced / arch=balanced / ref=balanced / industry=maintain | 默认综合模式, 商业可交付 |

## 不调 / 调

- 调真实 Provider: yes (user-authorized, this is a validation smoke)
- 不修改 v1-baseline
- 不污染生产代码
