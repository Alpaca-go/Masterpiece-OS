# Phase 9C v0.1 Brands Smoke (1 image, 16:9)

> User-authorized 端到端 image Provider smoke: 对 3 个 v0.1 brand (冯烫烫 / 一剂良方 / 蛙耶)
> 各生成 1 张 16:9 横板空间效果图。
>
> - 冯烫烫 / 一剂良方: Phase 9C compileSpaceRuntime 16 块 (spatial_intent + architecture_language +
>   spatial_reality_constraint + architecture_preservation + 11 base)
> - 蛙耶: base v0.1 compileFieldEnrichedPrompt 11 块 (data incomplete, no spatial intent / spatial
>   reality / architecture preservation files)
>
> **必须 user-authorized**. 没拿到 profile ID + 文档 + 用户明确许可之前不能跑.

## 必填环境变量

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_BRAND_KEY` | `'feng-tang-tang'` \| `'yi-ji-liang-fang'` \| `'wa-ye'` | `feng-tang-tang` |
| `MASTERPIECE_SMOKE_PROJECT_ID` | desktop 项目 ID | `dca9b7d4-f233-46ff-b4df-44a890f13c4f` |
| `MASTERPIECE_SMOKE_ASSET_ID` | project 内的 image asset ID (use first image) | `b3e273c2-fc19-4c56-8577-e39510ee616b` |
| `MASTERPIECE_SMOKE_IMAGE_PROFILE_ID` | image generation profile ID (volcengine / Seedream 5.0 Pro) | `profile-e871b4c5-...` |

## 可选环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_USER_DATA` | `APPDATA/masterpiece-os-desktop` | desktop userData 路径 |
| `MASTERPIECE_SMOKE_SIZE` | `1024*576` | image size (16:9 horizontal) |
| `MASTERPIECE_SMOKE_REPO_ROOT` | `cwd/../..` | 仓库根 (默认 D:\Masterpiece-OS) |
| `MASTERPIECE_SMOKE_USE_PHASE_9C` | `true` | 设 `false` 强制 base v0.1 (蛙耶用) |

## 跑法

### Step 1: 准备 desktop project (FTT 用现有的, YJLF / WAYE 创建 temp)

FTT (冯烫烫) 已有 desktop project (`dca9b7d4-f233-46ff-b4df-44a890f13c4f`, 10 image assets, 第一个
asset `b3e273c2-fc19-4c56-8577-e39510ee616b`)。

YJLF (一剂良方) / WAYE (蛙耶) 没有 desktop project, 用 `setup-temp-projects.mjs` 创建:

```powershell
node scripts/phase-9c-v0.1-brands/setup-temp-projects.mjs
```

这会在 `Documents\Masterpiece OS Data\projects\` 下创建:
- `一剂良方-<uuid>\project.json` + `input\assets\<asset-id>.png`
- `蛙耶-<uuid>\project.json` + `input\assets\<asset-id>.png`

参考图从 `D:\Masterpiece-OS\projects\<brand>\<brand>原视觉方案\` 里挑最大的 PNG 复制过来。

### Step 2: 跑 smoke (每个 brand 一次)

```powershell
$env:MASTERPIECE_SMOKE_BRAND_KEY = 'feng-tang-tang'
$env:MASTERPIECE_SMOKE_PROJECT_ID = 'dca9b7d4-f233-46ff-b4df-44a890f13c4f'
$env:MASTERPIECE_SMOKE_ASSET_ID = 'b3e273c2-fc19-4c56-8577-e39510ee616b'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'
$env:MASTERPIECE_SMOKE_USE_PHASE_9C = 'true'
# ...other vars...
$argList = @('D:\Masterpiece-OS\apps\desktop\scripts\phase-9c-v0.1-brands\run-phase-9c-v0.1-brands.mjs')
Start-Process -FilePath 'node' -ArgumentList $argList -RedirectStandardOutput out.log -RedirectStandardError out.err -NoNewWindow
```

注: 全套 env vars 必须在同一 PowerShell call 设置 (跨 call env vars 丢失)。

## 输出

`space-generator/v1-experimental/validation-results/phase-9C-v0.1-brands/{brand}/`:

```
{brand}/
├── prompt.md       # compiled prompt (16 块 for FTT/YJLF, 11 块 for WAYE)
├── run.json        # provider run metadata (redacted, no secret)
├── report.md       # per-brand report
└── image.png       # generated image (16:9, gitignored)
```

## 3 brand 数据状态

| Brand | 4 files (dna + spatial intent + spatial reality + arch preservation) | Mode |
| --- | --- | --- |
| 冯烫烫 (FTT) | ✓ 齐全 | Phase 9C 16 块 |
| 一剂良方 (YJLF) | ✓ 齐全 | Phase 9C 16 块 |
| 蛙耶 (WAYE) | ✗ 只 dna | base v0.1 11 块 (per user request) |

## 跟 5.0.0 cut 的关系

本 smoke 是 v1.1 Phase 9C 的 3-brand v0.1 reference 验证, 不是 5.0.0 cut 的 release gate.
5.0.0 release gate 由 `docs/releases/5.0-repository-consolidation.md §7.3` 三轮独立 smoke 覆盖.

## 注意

- **不调 text Provider** (analysis). 3 brand 都跳过 `pipeline.start()`, 用 v0.1 DNA + spatial intent /
  spatial reality / architecture preservation (FTT/YJLF) 或 base DNA only (WAYE).
- **不修改生产代码** (compileFieldEnrichedPrompt / compileRuntimePrompt / Phase 9A-9C 任何 baseline 100% 不变).
- **不暴露 credential** (run.json / image.png 不含 API key).
- **不污染 v1-baseline** (smoke runner 独立在 `apps/desktop/scripts/phase-9c-v0.1-brands/`, 输出在
  `space-generator/v1-experimental/validation-results/phase-9C-v0.1-brands/`, 都不在 production runtime 路径).
- **temp desktop project** 在 `Documents\Masterpiece OS Data\projects\` 下, 不在 git 仓库, 用完可手工 delete.
- **provider 端 hang**: Seedream 5.0 Pro 在 back-to-back 请求下可能 load-dependent slow path, 跑批请
  间隔 5+ min 或单跑 + cooldown.
