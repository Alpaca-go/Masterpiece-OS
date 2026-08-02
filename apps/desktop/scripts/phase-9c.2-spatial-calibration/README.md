# Phase 9C.2 — Spatial Intent Evaluation & Weight Calibration Smoke

## 用途

3 品牌 × 4 preset × 1 image = 12 张图, 评估 4 个 Spatial Intent Preset
(`brand_driven` / `architecture_driven` / `reference_driven` / `balanced`)
在真实 Provider (Seedream 5.0 Pro) 下的实际表现, 建立内部 weight 校准基线.

## 测试品牌 (per doc §4)

| brandKey | industry | spaceType | desktop project id |
| --- | --- | --- | --- |
| jiuzhou-aesthetics | 医疗美容 / 皮肤管理 | reception (override) | env `MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS` |
| wa-ye | 餐饮 / 炭烧牛蛙 / 潮流快餐 | reception (DNA default) | env `MASTERPIECE_SMOKE_PROJECT_ID_WA_YE` |
| feng-tang-tang | 餐饮 / 川菜 / 跷脚牛肉 | reception (DNA default) | env `MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG` |

## 约束 (per doc §3 / §5 / §11)

- **不修改任何 production 代码** (apps/cli / apps/desktop / packages 不动)
- **不接入 production UI**
- **不修改现有 production preset**
- **不新增 Spatial Intent Preset**
- **不开用户自由权重滑块**
- **不自动推荐系统**
- **唯一变量**: Spatial Intent Preset (4 个); 固定 model / 比例 / seed / reference / brand analysis / generation task.

## 用法

### 1. 设置环境变量

```powershell
$env:MASTERPIECE_SMOKE_PROJECT_ID_JIUZHOU_AESTHETICS = 'a7a56ed7-849f-4671-b47a-466394d7298d'
$env:MASTERPIECE_SMOKE_PROJECT_ID_WA_YE              = '8d73845c-1477-485a-b6bb-40aed16c06b1'
$env:MASTERPIECE_SMOKE_PROJECT_ID_FENG_TANG_TANG     = '9a17c103-7e36-43b1-aa90-1a4d2c8f31d1'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID              = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'  # Seedream 5.0 Pro
$env:MASTERPIECE_SMOKE_SIZE                          = '1024*576'  # 16:9
```

### 2. 跑

```powershell
cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9c.2-spatial-calibration/run-phase-9c.2-spatial-calibration.mjs
```

## 输出

### 主输出 (用户可见)

`D:\Masterpiece-OS\docs\reference\phase-9c.2-calibration\{brand}\`:

- `{brand}_reception_{preset}_v1.jpg` — 4 张 (每个 preset 1 张)
- 12 张图 (3 brand × 4 preset)

### Calibration dataset (脱敏)

`D:\Masterpiece-OS\space-generator\v1-experimental\tests\spatial-calibration\{brand}\`:

- `outputs/{brand}_reception_{preset}_v1.jpg` — 4 张图副本
- `outputs/run.json` — per-brand run record
- `evaluations/{brand}_reception_{preset}.evaluation.json` — 5 维评分模板 (人工填)
- `{preset}-report.md` — per-preset human-readable
- `report.md` — per-brand integrated Calibration Report

### Schema / Template

- `tests/spatial-calibration/spatial-evaluation.schema.json` — 5 维 1-5 评分 schema
- `tests/spatial-calibration/MANUAL_EVALUATION_TEMPLATE.md` — 人工评分模板

## 5 维评分 (per doc §6)

| 维度 | 范围 | 关注点 (per §7 preset 评价标准) |
| --- | --- | --- |
| brand_translation | 1-5 | brand_driven 重点: 品牌 DNA 是否被转译为空间语言 |
| spatial_quality | 1-5 | architecture_driven 重点: 建筑设计质量与空间高级感 |
| reference_fidelity | 1-5 | reference_driven 重点: 参考图结构/气质/摄影语言继承 |
| industry_correctness | 1-5 | 行业属性不被跨行业污染 (per 9C.0.5) |
| commercial_usability | 1-5 | balanced 重点: 商业可交付性 |

## Weight Calibration (per doc §9)

**内部调整, 不开放用户.**

调整示例: brand 70/architecture 20/reference 10 → brand 55/architecture 35/reference 10.
本 calibration 阶段不实施数值权重系统 (per §3 "不开用户自由权重滑块"),
但允许内部对 preset JSON 的 4-dim intent enum 做微调 (Task 06).

## 4 Preset 边界 (per doc §11 Task 05 / §12 验收)

- ✓ 至少 3 个真实品牌测试完成 (jiuzhou / wa-ye / feng-tang-tang)
- ✓ 每个品牌 4 种 Preset 均生成
- ⏳ 每张图完成 5 维评分 (人工填 evaluation template)
- ⏳ 明确 4 个 Preset 适用边界 (per-brand calibration report)
- ⏳ 完成至少一次内部权重调整 (Task 06)
