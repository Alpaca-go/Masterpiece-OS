# Spatial Calibration — Manual Evaluation Template (Phase 9C.2)

每个 brand × 4 preset = 12 张图。每张图填一份 evaluation。

## Brand info

- **Brand key**: jiuzhou-aesthetics / wa-ye / feng-tang-tang
- **Industry**:
- **Space type**:
- **Image ref**:
- **Provider / model**: volcengine / Seedream 5.0 Pro / doubao-seedream-5-0-pro-260628
- **Aspect ratio**: 16:9 (1024x576)

## Per-Preset Evaluation

### Preset: brand_driven

**Preset focus** (per §7): 关注 brand_translation 维度。

| 维度 | 评分 (1-5) | 评分依据 |
| --- | --- | --- |
| brand_translation | | 品牌气质 / 色彩 / 材质 / 符号是否进入空间? 是否出现品牌污染(广告墙 / 文字堆叠 / logo 堆叠)? |
| spatial_quality | | 建筑设计是否合格 (不强求主导, 但不能崩)? |
| reference_fidelity | | (无 reference image, 评分 N/A 或按基线) |
| industry_correctness | | 行业属性是否被品牌压过? (例如医美空间被品牌文化覆盖太多) |
| commercial_usability | | 商业落地? 不会过于空泛? |

**Comments**:

### Preset: architecture_driven

**Preset focus** (per §7): 关注 spatial_quality 维度。

| 维度 | 评分 (1-5) | 评分依据 |
| --- | --- | --- |
| brand_translation | | 品牌符号是否仅必要保留? |
| spatial_quality | | 建筑结构 / 材质 / 光影 / 空间高级感是否主导? |
| reference_fidelity | | (无 reference, N/A) |
| industry_correctness | | 行业属性是否被建筑压过? |
| commercial_usability | | 商业落地? |

**Comments**:

### Preset: reference_driven

**Preset focus** (per §7): 关注 reference_fidelity 维度。

| 维度 | 评分 (1-5) | 评分依据 |
| --- | --- | --- |
| brand_translation | | 品牌属性是否仍保持? |
| spatial_quality | | 空间质量是否合格? |
| reference_fidelity | | (无 reference image, 评分为 prompt emphasis 文字强度的体现 — 与未来有 reference 的对照) |
| industry_correctness | | 行业属性? |
| commercial_usability | | 商业落地? |

**Comments**:

### Preset: balanced

**Preset focus** (per §7): 关注 commercial_usability 维度。

| 维度 | 评分 (1-5) | 评分依据 |
| --- | --- | --- |
| brand_translation | | 品牌平衡度? |
| spatial_quality | | 建筑平衡度? |
| reference_fidelity | | (无 reference, N/A) |
| industry_correctness | | 行业平衡度? |
| commercial_usability | | 商业落地? 4 维平衡是否带来最稳定效果? |

**Comments**:

## Brand-level Decision (汇总后填)

- **Recommended preset (本品牌)**:
- **Avoid preset (本品牌)**:
- **4 preset 边界**: (描述 4 个 preset 在本品牌实际表现差异)
- **内部 weight 调整建议** (per §9): 调整前的 brand/architecture/reference 比例 → 调整后比例
  - 调整前:
  - 调整后:
  - 目标:
