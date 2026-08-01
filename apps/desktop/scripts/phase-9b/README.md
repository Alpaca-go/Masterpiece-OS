# Phase 9B — Spatial Intelligence Pipeline Real-Provider Smoke

> User-authorized 端到端 Provider smoke, 对一个 brand 跑 Mode A (Previous Pipeline) vs Mode B
> (Spatial Intelligence Pipeline), 保存到 `space-generator/v1-experimental/validation-results/phase-9B/{brand}/`.
>
> **Per system rule: 必须 user-authorized. 没拿到 profile ID + 文档 + 用户明确许可之前不能跑.**

## 必填环境变量

| 变量 | 用途 | 示例 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_PROJECT_ID` | desktop 项目 ID (来自 `Documents\Masterpiece OS Data\projects\`) | `a7a56ed7-849f-4671-b47a-466394d7298d` |
| `MASTERPIECE_SMOKE_TEXT_PROFILE_ID` | text generation profile ID (来自 AppData credentials) | `profile-xxx` |
| `MASTERPIECE_SMOKE_IMAGE_PROFILE_ID` | image generation profile ID (来自 AppData credentials) | `profile-yyy` |
| `MASTERPIECE_SMOKE_BRAND_KEY` | `jiuzhou-aesthetics` \| `feng-tang-tang` \| `yi-ji-liang-fang` | `jiuzhou-aesthetics` |
| `MASTERPIECE_SMOKE_DNA_PATH` | dna.json 绝对路径 | `D:\Masterpiece-OS\space-generator\v1-experimental\field-schema\examples\jiuzhou-aesthetics.dna.json` |
| `MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH` | spatial-intent.json 绝对路径 | `D:\Masterpiece-OS\space-generator\v1-experimental\field-schema\examples\jiuzhou-aesthetics.spatial-intent.json` |

## 可选环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `MASTERPIECE_SMOKE_USER_DATA` | `APPDATA/masterpiece-os-desktop` | desktop userData 路径 |
| `MASTERPIECE_SMOKE_SIZE` | `1024*1024` | image generation size |

## 跑法

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID = "a7a56ed7-849f-4671-b47a-466394d7298d"
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID = "profile-xxx"
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = "profile-yyy"
$env:MASTERPIECE_SMOKE_BRAND_KEY = "jiuzhou-aesthetics"
$env:MASTERPIECE_SMOKE_DNA_PATH = "D:\Masterpiece-OS\space-generator\v1-experimental\field-schema\examples\jiuzhou-aesthetics.dna.json"
$env:MASTERPIECE_SMOKE_SPATIAL_INTENT_PATH = "D:\Masterpiece-OS\space-generator\v1-experimental\field-schema\examples\jiuzhou-aesthetics.spatial-intent.json"

cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9b/run-phase-9b-smoke.mjs
```

## 输出

`space-generator/v1-experimental/validation-results/phase-9B/{brand}/`:

```
{brand}/
├── mode-A/
│   ├── run.json        # provider run metadata (redacted, no secret)
│   ├── prompt.md       # Mode A compiled prompt
│   └── image.png       # generated image (Mode A)
├── mode-B/
│   ├── run.json
│   ├── prompt.md       # Mode B compiled prompt (含 spatial_intent + architecture_language 块)
│   └── image.png       # generated image (Mode B)
└── evaluation-report.md  # 跑批结果 + 6-dim 评分模板
```

## 跟 Phase 9B 文档的对应关系

| Phase 9B 文档 | 本目录 |
| --- | --- |
| §5 Provider Test Protocol (Mode A vs Mode B) | `phase-9b-spatial-intelligence-smoke.ts` 跑两轮 image generation |
| §6.1 既有 metrics | run.json 的 status / duration / modelCallCount |
| §6.2 新 metrics (Intent Alignment / Spatial Logic / Reasoning Trace) | evaluation-report.md 留空, 由人工填 |
| §7 Success Criteria | evaluation-report.md 6-dim 评分 |
| §8 Artifact Storage | validation-results/phase-9B/{brand}/ |

## 注意

- **不调真实 Provider** 当没有上面 6 个必填环境变量时, 立即 throw.
- **不修改生产代码** (compileFieldEnrichedPrompt 100% 不变, 跟 Phase 8A/8B.1/8C 一致).
- **不暴露 credential** (run.json / image.png 不含 API key).
- **不污染 v1-baseline** (改动只在 v1-experimental/spatial-intelligence-pipeline/ + apps/desktop/scripts/phase-9b/).

## 跟 5.0.0 cut 的关系

Phase 9B smoke 是 v1.1 Spatial Intelligence layer 的 validation, 不是 5.0.0 cut 的 release gate.
5.0.0 release gate 由 `docs/releases/5.0-repository-consolidation.md §7.3` 三轮独立 smoke 覆盖.
