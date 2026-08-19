# CI-W1C.4 Resume.1 — Brief Authority Audit (PART A)

> **Status**: P0 evidence-quality issue identified in v1 G01/G02 briefs.
> **Hard rule violated**: `sourceRef exists` ≠ `source semantically supports the statement`.
> **Audit verdict classes** (only these are allowed):
> - `SUPPORTED_AS_FACT`
> - `SUPPORTED_AS_USER_REQUIREMENT`
> - `SUPPORTED_AS_VISUAL_FACT`
> - `SUPPORTED_AS_CREATIVE_HYPOTHESIS`
> - `UNSUPPORTED_REMOVE`

---

## 0. Source Content Inventory (the actual evidence we have)

For each project, the **real** source files contain the following project-specific
supportable claims. Anything else must be downgraded to `CREATIVE_HYPOTHESIS` or
removed.

### G01 — 九州美学 (projectId `590eadf2-76cb-4042-a034-db93481b06c9`)

From `project.json`:

- `brandName = "九州美学"` (fact)
- `industry = "待确认（基于现有素材推断）"` (placeholder; project.factConfidence.industry = 0)
- `logoLocked = true`
- `lockedFacts = ["原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。",
  "输出语言固定为简体中文。"]`
- `outputLanguage = "zh-CN"`
- `assetCount = 28`; `imageCount = 28`
- `status = "completed"`
- `lastReportFilename = "九州美学-视觉方案升级报告-qwen3.6-plus.md"`
- `apiProfileId = "profile-9eb57f7e-7bc5-4214-b325-a013ff1f8eca"`
- `provider = "dashscope"`, `model = "qwen3.6-plus"`, `analysisProfile = "fusion-enhanced"`
- `lastRunAt = "2026-08-15T13:29:42.022Z"`, `lastDurationMs = 497692`
- `visualContextVNextStatus = "ready"`, `visualContextVNextVersion = 12`,
  `visualContextVNextLastBuiltAt = "2026-08-15T13:29:42.036Z"`

From `project-context/project-visual-context.vnext.json` (`visualDecisionPacket`):

- `projectFacts.industry = "医疗美容"`, `source = visual_asset`,
  `evidenceRefs = [a2697445..., 150e33b3..., 2eed2724...]`,
  `confidence = 0.9`, `status = "confirmed"`
- `projectFacts.brandRole = "高端医疗美容服务提供者"`, `source = visual_asset`,
  `evidenceRefs = [a2697445..., 150e33b3...]`, `confidence = 0.9`,
  `status = "confirmed"`
- `assetInventory.logoAssets` = 2 items:
  - 九州美学主标志 (freq=8, conf=1) — features: 紫色渐变 / 孔雀-凤凰形态 /
    流线型设计 / 羽毛元素; meaning: 优雅 / 蜕变 / 高端美学
  - 九州美学定制字体 (freq=6, conf=1) — features: 笔锋软化 / 现代感 /
    优雅线条; meaning: 精致 / 专业 / 温和
- `assetInventory.colorAssets` = 2 items:
  - 孔雀紫主色 #5837BD (freq=10, conf=1) — 高贵 / 神秘
  - 辅助紫色 #A971E7 (freq=7, conf=0.9) — 柔和 / 渐变
- `assetInventory.typographyAssets` = 1 (九州美学定制字体)
- `assetInventory.graphicMotifs` = 2 (孔雀羽毛 freq=8, 莲花/花朵图形 freq=5)
- `assetInventory.imageryAssets` = 1 (孔雀主题海报 freq=4)
- `assetInventory.layoutPatterns` = 1 (标志组合规范 freq=5)
- `assetInventory.materialCues` = 2 (孔雀羽毛材质参考 freq=3, 混凝土与玻璃材质 freq=4)
- `styleBoundaries.uncertainItems = ["target_audience", "visual_tone", "color_behavior"]`
- `visualIdentity.{tone,colorBehavior,graphicBehavior,materialBehavior,compositionBehavior,lightingBehavior} = []` (all empty)
- `confirmedDecisions` (2 entries) — only the 2 lockedFacts strings

### G02 — 一剂良方 (projectId `a13d6c09-99f7-4ff9-b499-3b9f8a1df31b`)

From `project.json`:

- `brandName = "一剂良方"`
- `industry = "待确认（基于现有素材推断）"` (placeholder; confidence=0)
- Same `logoLocked`, `lockedFacts`, `outputLanguage`
- `assetCount = 35`
- `lastReportFilename = "一剂良方-视觉方案升级报告-qwen3.7-plus-2026-05-26.md"`
- `apiProfileId = "profile-fa854643-4c01-43e7-8e5a-4ec52862c23b"`
- `provider = "dashscope"`, `model = "qwen3.7-plus-2026-05-26"`
- `lastRunAt = "2026-08-15T16:18:16.134Z"`, `lastDurationMs = 452251`
- `visualContextVNextVersion = 2`, `visualContextVNextLastBuiltAt = "2026-08-15T16:18:16.146Z"`
- `briefFiles` (35 PNGs) — note: only G02 has `briefFiles` populated

From `project-context/project-visual-context.vnext.json` (`visualDecisionPacket`):

- `projectFacts.industry = "中医健康管理与诊疗服务"`, `source = visual_asset`,
  `confidence = 0.9`, `status = "confirmed"`
- `projectFacts.brandRole = "提供中医诊疗、慢病管理及养生服务的体验机构"`,
  `source = visual_asset`, `confidence = 0.9`, `status = "confirmed"`
- `assetInventory.logoAssets` = 1 item:
  - 图标与文字标组合 (freq=30, conf=1) — features: 红色圆形线条"良"字变体
    图标 / 黑色粗宋体"一剂良方"文字 / 红色"素问"印章 / 金色拼音
    "yi ji liang fang"; meaning: 传统与现代结合 / 专业良方 / 素问经典传承
- `assetInventory.colorAssets` = 1 (品牌色盘 freq=15, conf=1) — #B59A6B
  木色主色 / #B00000 红色辅助 / #E8E5E0 浅灰背景 / 白黑基础色;
  meaning: 中药柜木质感 / 传统印章红 / 洁净医疗白
- `assetInventory.typographyAssets` = 1 (思源宋体体系 freq=30, conf=1) —
  思源宋体 Light-Heavy / 繁体字形 / 衬线体; meaning: 传统文化底蕴 / 专业严谨
- `assetInventory.graphicMotifs` = 1 (辅助底纹图形 freq=20) — 由 Logo 演化的
  花瓣/圆形交错线条 / 网格状底纹; meaning: 草本植物形态 / 传统窗结构 / 循环融合
- `assetInventory.imageryAssets` = 2 (中药柜摄影 freq=1, 活动物料静物摄影 freq=1)
  — 木质抽屉 / 金属拉手 / 研钵 / 中药材 / 古籍书卷; meaning: 传统中药房 /
  制药过程 / 医学经典 / 专业研发
- `assetInventory.layoutPatterns` = 1 (比例与安全空间规范 freq=2, conf=1) —
  以图标高度 X 为基准单位; meaning: 严谨 / 规范 / 专业度
- `assetInventory.materialCues` = 1 (名片纸张与工艺 freq=1, conf=0.9) — 浅灰
  纸张 / 背面 Logo 凸印 / 哑光质感; meaning: 质感 / 低调奢华 / 触感体验
- `styleBoundaries.uncertainItems = ["target_audience", "visual_tone", "color_behavior"]`
- `visualIdentity` all empty (same as G01)
- `confirmedDecisions` (2 entries) — only the 2 lockedFacts strings

### What is **NOT** in the source

- No user requirement statements (no user input file exists, no chat log).
- No document/text content (no PDF/docx describing the brand beyond the project.json).
- No `description` field beyond a generic fusion-enhanced note.
- `industry` at the **project.json** level is a placeholder string.
- `visualIdentity` is empty in both projects — no system has yet extracted
  semantic visual patterns.
- `styleBoundaries.mustAvoid` is empty.
- No "do not use X" or "禁止 Y" constraint originates in the project sources
  beyond the two lockedFacts.

---

## 1. G01 v1 Brief Audit (`g01-jiuzhou-brief.md`)

| # | Statement (zh) | sourceRef | Real source content | Semantic support | Verdict |
|---|---|---|---|---|---|
| C-1 | 品牌名称是九州美学 | `project.json#brandName` | `"brandName": "九州美学"` | Direct | **SUPPORTED_AS_FACT** |
| C-2 | 行业为待确认（基于现有素材推断） | `project.json#industry` | `"industry": "待确认（基于现有素材推断）"` + `factConfidence.industry=0` | Direct; hedge is structural, not from text | **SUPPORTED_AS_FACT** (with hedge marker; v2 must keep this as FACT, not USER_REQUIREMENT) |
| C-3 | 原始 Logo Locked：不得修改、… | `project.json#lockedFacts[0]` | `"原始 Logo Locked：不得修改、重绘、拆解、替换、仿造或改变内部字形。"` | Direct lock | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| C-4 | 输出语言固定为简体中文 | `project.json#lockedFacts[1]` | `"输出语言固定为简体中文。"` | Direct lock | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| U-1 | 希望整体视觉具有文化美学质感，传达传统与现代并存的品牌气质 | `project.json#projectName="九州美学"` (语义线索) | Only the literal string `"九州美学"` exists. The words "文化 / 美学 / 传统 / 现代" do NOT appear in any source file. | **None** — semantic leap from a brand name to a creative intent is **unsupported** | **UNSUPPORTED_REMOVE** |
| U-2 | 希望品牌触点（产品包装、空间体验、品牌 VI）共享同一套视觉语言 | `project.json#assetCount=28` (多触点素材) | The number 28 is a count; it does not encode any user requirement. | **None** — asset count is not an intent source | **UNSUPPORTED_REMOVE** |
| I-1 | 可以探索以材质感官表达为核心，强调不同触点通过统一材质语言相互识别 | `九州美学 28 张视觉方案素材的设计主题观察` | There is no document/text in the project that records "design theme observation". `visualIdentity.materialBehavior = []`. | **None** — no source content; "设计主题观察" is a fabricated reference | **UNSUPPORTED_REMOVE** |
| I-2 | 鼓励视觉方向保留现有品牌资产的可识别性，不替换已建立的核心元素 | `project.json#logoLocked=true, lockedFacts[0]` | `logoLocked=true` and `lockedFacts[0]` say: do not modify/redraw/replace/forge the original Logo. They do NOT say "preserve brand recognizability across all assets" or "do not replace core elements". The "鼓励" framing is unsupported. | **Partial** — supports the narrow Logo non-modification constraint, but not the broader claim. | **UNSUPPORTED_REMOVE** (the broad "鼓励 保留 / 不替换" framing is unsupported; the narrow Logo constraint is already in C-3 / K-1) |
| V-1 | 项目现有 28 张视觉方案参考图，分布在 generation-references/ 与 assets/ | `project.json#assets[].usage=visual_reference` 计数 | `assets[]` is 28 items. Some paths are under `assets/`, some under `generation-references/`. | Direct count + path mix | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| V-2 | visualContextVNext 已构建（version 12, 2026-08-15），但 visualIdentity 字段全空 | `project-visual-context.vnext.json#visualIdentity` | `version: 12`, `generatedAt: 2026-08-15T13:29:42.036Z`; all 6 sub-arrays of `visualIdentity` are empty | Direct | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| V-3 | styleBoundaries.uncertainItems 包含: target_audience / visual_tone / color_behavior | `project-visual-context.vnext.json#styleBoundaries.uncertainItems` | Direct array `["target_audience", "visual_tone", "color_behavior"]` | Direct | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| K-1 | 禁止删除或重绘原始 Logo | `project.json#lockedFacts[0]` | Direct lock | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| K-2 | 禁止使用英文输出 | `project.json#lockedFacts[1]` | Direct lock | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| K-3 | 禁止向模型注入未在 project.json 中出现的具体业务事实 | CI-W1C.4 §44 no-project-specific-rule guard | Operational rule; valid as a system constraint | Direct (rule source is spec, not project) | **SUPPORTED_AS_FACT** (operational) (v2 must keep) |

### G01 v1 summary

- **Kept (8)**: C-1, C-2, C-3, C-4, V-1, V-2, V-3, K-1, K-2, K-3 → 10 statements
  actually (C-2 has its own hedge; K-3 is operational)
- **Removed (4)**: U-1, U-2, I-1, I-2
- **P0 problems fixed**:
  - Removed the "希望文化美学 / 传统现代并存" leap from projectName.
  - Removed the "希望多触点共享视觉语言" leap from assetCount.
  - Removed the "材质感官 / 设计主题观察" fabricated reference.
  - Removed the "鼓励保留可识别性" leap from logoLocked.

### G01 v1 vs. real source — gaps that v2 must fill

The v1 brief **omitted** real, project-specific, supported facts that are
available in the source files and would be **far stronger** than the
fabricated ones. v2 MUST include these:

1. `visualDecisionPacket.projectFacts.industry = "医疗美容"` (visual_asset,
   confidence=0.9, status=confirmed) — **SUPPORTED_AS_FACT** (with
   visual_asset evidence, not project_record — authority is lower than
   brandName but still supportable)
2. `visualDecisionPacket.projectFacts.brandRole = "高端医疗美容服务提供者"`
   (visual_asset, confidence=0.9, status=confirmed) — **SUPPORTED_AS_FACT**
3. `visualDecisionPacket.lockedAssets` contains:
   - `brand-name-32fa23e11f42` type=brand_name value="九州美学"
   - `4f65f3f8-...` type=logo value="九州美学主标志" (real logo asset
     with visual_features: 紫色渐变/孔雀-凤凰/流线/羽毛)
   - `755bd372-...` type=logo value="九州美学定制字体"
4. `visualDecisionPacket.assetInventory.colorAssets` (孔雀紫 #5837BD freq=10
   + 辅助紫 #A971E7 freq=7) — **SUPPORTED_AS_VISUAL_FACT**
5. `visualDecisionPacket.assetInventory.graphicMotifs` (孔雀羽毛 freq=8 +
   莲花/花朵图形 freq=5) — **SUPPORTED_AS_VISUAL_FACT**
6. `visualDecisionPacket.assetInventory.imageryAssets` (孔雀主题海报 freq=4)
7. `visualDecisionPacket.assetInventory.layoutPatterns` (标志组合规范 freq=5)
8. `visualDecisionPacket.assetInventory.materialCues` (孔雀羽毛材质 freq=3 +
   混凝土与玻璃材质 freq=4)
9. `project.json` `lastReportFilename`, `lastRunAt`, `lastDurationMs`,
   `apiProfileId`, `provider`, `model`, `analysisProfile` — these are
   **project-specific real facts** (not excluded by the
   "brandName/assetCount/Logo lock/language lock" rule).

> These are ≥2 project-specific real supported statements per project, well
> above the PART C floor, without any fabrication.

---

## 2. G02 v1 Brief Audit (`g02-yiji-brief.md`)

| # | Statement (zh) | sourceRef | Real source content | Semantic support | Verdict |
|---|---|---|---|---|---|
| C-1 | 品牌名称是一剂良方 | `project.json#brandName` | `"brandName": "一剂良方"` | Direct | **SUPPORTED_AS_FACT** |
| C-2 | 行业为待确认（基于现有素材推断） | `project.json#industry` | Placeholder; `factConfidence.industry=0` | Direct | **SUPPORTED_AS_FACT** (hedge) |
| C-3 | 原始 Logo Locked | `project.json#lockedFacts[0]` | Direct lock | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| C-4 | 输出语言固定为简体中文 | `project.json#lockedFacts[1]` | Direct lock | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| U-1 | 希望整体视觉强调方剂可读性与信息层级的清晰组织 | `project.json#projectName="一剂良方"` (语义线索: 良方 = 药方, 强调可读性) | `projectName = "一剂良方"`. The source does not contain "方剂可读性", "信息层级", or any user requirement. | **None** — semantic leap from name to user intent | **UNSUPPORTED_REMOVE** |
| U-2 | 希望不同包装形态（方剂盒、瓶贴、标签）能够共享统一信息架构 | `project.json#assetCount=35` (35 张 VI 手册图, 多形态素材) | Number 35 only | **None** — asset count is not an intent source | **UNSUPPORTED_REMOVE** |
| U-3 | 希望空间与门店触点延续产品包装的可信感与地道感 | `project.json#projectName="良方"` (传统中医药语义) | Project name only | **None** | **UNSUPPORTED_REMOVE** |
| I-1 | 可以探索以药材地道感与传统中医文化为锚点的方向，用现代可信的方式表达 | `一剂良方 VI 手册的设计主题观察` | No such document exists in the source. `visualIdentity.tone = []`. | **None** — fabricated reference | **UNSUPPORTED_REMOVE** |
| I-2 | 鼓励在方向探索中关注复杂产品组合的可读性，不依赖单一触点的视觉表达 | `project.json#lockedFacts[1]=简体中文输出` + asset count = 35 | Neither lockedFacts[1] nor asset count encodes "复杂产品组合的可读性" | **None** | **UNSUPPORTED_REMOVE** |
| V-1 | 项目现有 35 张 VI 手册参考图 | `project.json#assets[].usage=visual_reference` 计数 | 35 assets exist; briefFiles is also 35 (so all are "brief" images) | Direct | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| V-2 | visualContextVNext 已构建（version 2, 2026-08-15），但 visualIdentity 全空 | `project-visual-context.vnext.json` | Direct | Direct | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| V-3 | styleBoundaries.uncertainItems 包含: target_audience / visual_tone / color_behavior | `project-visual-context.vnext.json#styleBoundaries.uncertainItems` | Direct | Direct | **SUPPORTED_AS_VISUAL_FACT** (v2 must keep) |
| K-1 | 禁止删除或重绘原始 Logo | `project.json#lockedFacts[0]` | Direct | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| K-2 | 禁止使用英文输出 | `project.json#lockedFacts[1]` | Direct | Direct | **SUPPORTED_AS_USER_REQUIREMENT** (LOCKED_RULE) |
| K-3 | 禁止向模型注入未在 project.json 中出现的具体业务事实 | CI-W1C.4 §44 | Operational | Direct | **SUPPORTED_AS_FACT** (operational) (v2 must keep) |
| K-4 | 禁止使用玄学化、神秘化的视觉表达方向（design-bound, 由 projectName="一剂良方" 推出） | `project.json#projectName="一剂良方"` + VI 手册素材的语义观察 | No source content supports "玄学化 / 神秘化 禁止" — projectName alone does not encode a design constraint. Even the visualDecisionPacket (which IS a real source) does not list this in `mustAvoid` (which is empty). This is the **highest-severity** P0 issue: a non-source constraint upgraded to `AUTHORITATIVE_DOCUMENT_FACT`. | **None** | **UNSUPPORTED_REMOVE** (mustAvoid is empty in the actual `styleBoundaries` — the v1 brief is **factually wrong** about the source) |

### G02 v1 summary

- **Kept (10)**: C-1, C-2, C-3, C-4, V-1, V-2, V-3, K-1, K-2, K-3
- **Removed (6)**: U-1, U-2, U-3, I-1, I-2, K-4
- **P0 problems fixed**:
  - Removed the "方剂可读性 / 信息层级" leap from projectName.
  - Removed the "共享统一信息架构" leap from assetCount.
  - Removed the "可信感 / 地道感" leap from projectName.
  - Removed the "药材地道感 / 中医文化" fabricated reference.
  - Removed the "复杂产品组合可读性" leap.
  - **Critical**: Removed the fabricated "禁止玄学化、神秘化" rule that was
    falsely attributed to `AUTHORITATIVE_DOCUMENT_FACT` while the actual
    source `styleBoundaries.mustAvoid` is `[]` (empty).

### G02 v1 vs. real source — gaps that v2 must fill

The v2 brief MUST include the real, project-specific, supported facts that
v1 omitted:

1. `visualDecisionPacket.projectFacts.industry = "中医健康管理与诊疗服务"`
   (visual_asset, confidence=0.9, status=confirmed) — **SUPPORTED_AS_FACT**
   (with visual_asset authority)
2. `visualDecisionPacket.projectFacts.brandRole =
   "提供中医诊疗、慢病管理及养生服务的体验机构"` — **SUPPORTED_AS_FACT**
3. `visualDecisionPacket.lockedAssets` contains:
   - `brand-name-a29bc2c550f3` type=brand_name value="一剂良方"
   - `2409032d-...` type=logo value="图标与文字标组合" (with
     visual_features: 红色"良"字变体 / 黑色粗宋体 / 红色"素问"印章 /
     金色拼音)
4. `visualDecisionPacket.assetInventory.colorAssets` (品牌色盘 freq=15 —
   #B59A6B 木色主 / #B00000 红色辅助 / #E8E5E0 浅灰 / 白黑基础) —
   **SUPPORTED_AS_VISUAL_FACT**
5. `visualDecisionPacket.assetInventory.typographyAssets` (思源宋体体系
   freq=30) — **SUPPORTED_AS_VISUAL_FACT**
6. `visualDecisionPacket.assetInventory.graphicMotifs` (辅助底纹图形
   freq=20 — 花瓣/圆形交错线条 / 网格底纹)
7. `visualDecisionPacket.assetInventory.imageryAssets` (中药柜摄影 +
   活动物料静物摄影)
8. `visualDecisionPacket.assetInventory.layoutPatterns` (比例与安全空间规范)
9. `visualDecisionPacket.assetInventory.materialCues` (名片纸张与工艺 —
   浅灰纸张 / Logo 凸印 / 哑光)
10. `project.json` `lastReportFilename`, `lastRunAt`, `lastDurationMs`,
    `apiProfileId`, `provider`, `model`, `analysisProfile`,
    `briefFiles` (35 items) — **SUPPORTED_AS_FACT** (project-specific)

> These are ≥2 project-specific real supported statements per project, well
> above the PART C floor, without any fabrication.

---

## 3. Cross-Project Semantic Differentiation (raw source, before any v2)

Even **without** any v1 brief, the raw source already differentiates G01 vs.
G02 in multiple project-specific, supported dimensions. v2 briefs will be
allowed to surface these as `SUPPORTED_AS_FACT` / `SUPPORTED_AS_VISUAL_FACT`,
which is the only way XD01-XD06 will pass **without** the v1 fabrication.

| Dimension | G01 (九州美学) | G02 (一剂良方) | Source |
|---|---|---|---|
| brandName | 九州美学 | 一剂良方 | project.json#brandName |
| industry (visual_asset) | 医疗美容 | 中医健康管理与诊疗服务 | project-visual-context.vnext.json#projectFacts.industry |
| brandRole (visual_asset) | 高端医疗美容服务提供者 | 提供中医诊疗、慢病管理及养生服务的体验机构 | project-visual-context.vnext.json#projectFacts.brandRole |
| Logo visual features | 紫色渐变 / 孔雀-凤凰 / 流线 / 羽毛 | 红色"良"字 / 黑色粗宋体 / 红色"素问"印章 / 金色拼音 | project-visual-context.vnext.json#assetInventory.logoAssets |
| Color palette | #5837BD 孔雀紫 + #A971E7 辅助紫 | #B59A6B 木色 + #B00000 印章红 + #E8E5E0 浅灰 | project-visual-context.vnext.json#assetInventory.colorAssets |
| Typography | 九州美学定制字体 (笔锋软化/现代感) | 思源宋体 (繁体字形/衬线体) | project-visual-context.vnext.json#assetInventory.typographyAssets |
| Graphic motifs | 孔雀羽毛 + 莲花/花朵 | 辅助底纹图形 (花瓣/圆形交错) | project-visual-context.vnext.json#assetInventory.graphicMotifs |
| Imagery | 孔雀主题海报 | 中药柜摄影 + 活动物料静物摄影 | project-visual-context.vnext.json#assetInventory.imageryAssets |
| Material cues | 孔雀羽毛材质 + 混凝土与玻璃 | 名片纸张与工艺 (浅灰/凸印/哑光) | project-visual-context.vnext.json#assetInventory.materialCues |
| assetCount | 28 | 35 | project.json#assetCount |
| lastReportFilename | 九州美学-视觉方案升级报告-qwen3.6-plus.md | 一剂良方-视觉方案升级报告-qwen3.7-plus-2026-05-26.md | project.json#lastReportFilename |
| model | qwen3.6-plus | qwen3.7-plus-2026-05-26 | project.json#model |
| briefFiles | [] (empty) | 35 PNGs | project.json#briefFiles |

**Key conclusion**: the raw source already provides enough semantic
differentiation for XD01-XD06 to pass on real, supported content — **no
fabrication is needed**.

---

## 4. Audit Verdict Summary

| | v1 PASS | v1 REMOVE | v1 → v2 gap to fill (from real source) |
|---|---|---|---|
| G01 | 10 (C-1, C-2, C-3, C-4, V-1, V-2, V-3, K-1, K-2, K-3) | 4 (U-1, U-2, I-1, I-2) | 9 new supported facts from `visualDecisionPacket` + project.json meta |
| G02 | 10 (C-1, C-2, C-3, C-4, V-1, V-2, V-3, K-1, K-2, K-3) | 6 (U-1, U-2, U-3, I-1, I-2, K-4) | 10 new supported facts from `visualDecisionPacket` + project.json meta |

> **All v1 fabricated statements are removed.** All v1 factual statements are
> preserved. v2 will **add** the real, supported facts that v1 omitted.
>
> This means v2 will be **strictly more** evidence-supported than v1, while
> removing every P0 fabrication. No information loss for the model: the
> fabricated claims had no support, so removing them costs nothing.

---

## 5. Authority class mapping (for v2)

For each statement class used in v2:

| Class | Allowed source | Authority tag in v2 |
|---|---|---|
| FACT (project record) | project.json | `AUTHORITATIVE_PROJECT_METADATA` |
| FACT (visual asset) | project-visual-context.vnext.json#projectFacts | `AUTHORITATIVE_VISUAL_FACT` |
| FACT (visual inventory) | project-visual-context.vnext.json#assetInventory.* | `VISUAL_SOURCE_FACT` |
| USER_REQUIREMENT (LOCKED) | project.json#lockedFacts | `LOCKED` |
| CREATIVE_HYPOTHESIS | Derived from projectName only | `CREATIVE_HYPOTHESIS` (low authority) |

> **Critical rule**: a `CREATIVE_HYPOTHESIS` may NEVER be promoted to
> `FACT` or `USER_REQUIREMENT` regardless of framing in the brief. v1
> violated this by promoting CREATIVE_HYPOTHESIS to USER_REQUIREMENT via
> "希望 / 鼓励" framing — v2 will not.
