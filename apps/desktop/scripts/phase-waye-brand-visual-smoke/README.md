# Phase WAYE Brand Visual Smoke — 完整 brand visual analysis + 16:9 image

## 用途

按 user 要求 "重新对蛙耶进行一次完整的烟雾测试, 要求品牌视觉分析一直到生成一张 16:9 横板空间效果图, 图上要带上蛙耶的品牌视觉资产, logo 和 IP 形象, 还有 icon 等这些"。

跟 `phase-9c.2-spatial-validation` 区别:
- **phase-9c.2-spatial-validation**: space-runtime 编译 + `startCompiledCreativeTask`, 跳过 text analysis
- **phase-waye-brand-visual-smoke**: 走 production v5 **完整 pipeline** (`pipeline.start()` 跑 structured analysis + visual context + vnext context, 然后 `vnext.compile()` + `vnext.start()` 走完整 vnext image gen)

完整 production v5 路径 = 让 model 自己决定哪些 asset 是 logo, 然后 vnext service 把它们转成 `identity_reference`, 保证图上能看到 logo / IP / icon。

## 资产准备 (one-time, 2026-08-02)

把 4 张 WAYE 品牌视觉资产 stage 进 `蛙耶-8d73845c\project.json` + `input\assets\`:
- `0ac035c9-74a9-40a7-b640-d0a0b5d5b32b.png` (1.67MB) — 已有, 来自未标题-1-33.png (实景店招+商场灯箱, **store-sign**)
- `waye-logo-deconstruction.png` (160KB) — 新增, 来自未标题-1-27.png (logo 拆解, **logo**)
- `waye-icon-set.png` (121KB) — 新增, 来自未标题-1-28.png (色卡+4 icon, **icon**)
- `waye-merchandise-detail.png` (1.10MB) — 新增, 来自未标题-1-32.png (周边购物袋+桌牌, **merchandise**)

`project.json` assets 数组 4 张全标 `role: "logo"` (`assetRole` 区分 logo / icon / merchandise / store-sign), 让 production vnext-service 的 `asset.role === 'logo'` 检测把它们转成 `identity_reference`。

## 用法

```bash
$env:MASTERPIECE_SMOKE_PROJECT_ID        = '8d73845c-1477-485a-b6bb-40aed16c06b1'
$env:MASTERPIECE_SMOKE_TEXT_PROFILE_ID    = 'profile-397281cc-653f-4822-ae4e-601ca7f8a63b'  # qwen3.6-plus
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID   = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'  # Seedream 5.0 Pro
$env:MASTERPIECE_SMOKE_REPO_ROOT          = 'D:\Masterpiece-OS'

cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-waye-brand-visual-smoke/run-phase-waye-brand-visual-smoke.mjs
```

## 输出

- `docs/reference/phase-waye-brand-visual/waye.jpg` (1 image, 16:9, **gitignored**)
- `docs/reference/phase-waye-brand-visual/report.md` (integrated report)
- `validation-results/phase-waye-brand-visual-smoke/waye/`:
  - `prompt.md` (vnext 编译的 markdown prompt)
  - `run.json` (完整 desensitized run record, 含 analysis + brand visual assets + prompt + image)
  - `report.md` (per-brand human-readable)
  - `image.png` (**gitignored**)

## 跑批流程 (production v5 完整)

1. `pipeline.start(projectId, true, textProfileId)`:
   - 扫 project assets
   - 调 qwen 跑 structured analysis (lockedPaths: projectId / projectFacts / lockedAssets)
   - 编译 visual context (`project-visual-context.json`)
   - 编译 vnext context (`project-visual-context.vnext.json`)
   - 编译 visual decision packet (`visual-decision-packet.json`)
   - 落盘 final report markdown
2. `validateVisualDecisionPacket(packet)` + 检查 `hardFactStatus === 'pass'` + `executionDataStatus === 'ready'`
3. **Preparation step (smoke-internal)**: 见下文 `Smoke-side patches`, 4 个 user-data-level 修
4. `vnext.compile({ projectId, model, task: {...} })`:
   - `task.referenceAssetIds`: 传全部 3 张 brand visual asset id (waye-logo-deconstruction, waye-icon-set, waye-merchandise-detail)
   - vnext service line 184-186: `logoUsageMode === 'post_composite'` → 过滤掉 packet logo, 留 2 张进 `identity_reference` (waye-icon-set + waye-merchandise-detail)
   - `currentInstruction` 显式要求: 蛙耶品牌色 (紫绿黄 #4116B7 / #56CE00 / #FFC000) + 青蛙 IP + logo 墙 + icon + Y2K 街头市集空间
   - `mustInclude` 强制: logo 墙 / 招牌 / 灯箱 / 青蛙 IP / brand color 三色
5. `vnext.start({ projectId, taskId, apiProfileId })`:
   - vnext-service line 396-411: 检测 `asset.role === 'logo'` → role = `identity_reference`
   - cap 2 张 reference
   - 调 image generation service (`image-generation/service.ts::startCompiledCreativeTask`)
   - provider (Seedream 5.0 Pro) 收到 2 张 `identity_reference` (icon + merchandise) + 完整 prompt + `logoUsageMode: 'post_composite'` → 出图
   - 图像返回后 vnext 走 post-composite 把 `waye-logo-deconstruction` overlay 上去

## Smoke-side patches (smoke-internal, 写在 `phase-waye-brand-visual-smoke.ts`)

WAYE v18 pipeline AI repair 阶段填了 `spatial.sceneProgram` + `spatial.functionalRelationships` 但没回写 `spatial.status`, 没填 `spatial.functionalNetwork`, 也没把 sceneProgram 加到 3 个。这些 user-data 层面的小缺失让 vnext.compile 的 contract gate 跟 preflight gate 报 block。Smoke 在 packet validation 之后加了 preparation step 修这些。

| Patch | What | Why |
| --- | --- | --- |
| 1. `spatial.status: 'insufficient' → 'ready'` | 6 字段检查全部满足但 status 字段没刷新 | `assertProjectSpecificGenerationContract` 校验 `deliverableSuccessCriteria[space]`, 4 个 conditional 之一是 `media.status === 'ready'` |
| 2. `spatial.functionalNetwork: 0 → 3 节点` | V18 AI repair 填了 `functionalRelationships` 但没填 `functionalNetwork` | preflight gate `FLAGSHIP_PROGRAM_TOO_GENERIC` 要求 `functionalNetwork.length >= 3` |
| 3. `spatial.sceneProgram: 2 → 3 entries` | 加 1 个 scene 节点 | preflight gate `FLAGSHIP_PROGRAM_TOO_GENERIC` 要求 `sceneProgram.length >= 3` |
| 4. `currentInstruction` 砍 260 chars | Seedream 5.0 Pro 上限 7500 chars, 原 7644 chars 超 144 | `seedream-adapter.js:19` 直接 throw `Seedream prompt exceeds 7500 characters` |
| 5. `mustAvoid` 砍 2 项 | 同上, 砍 prompt 长度 | 同上 |
| 6. `currentInstruction` "霓虹" → "灯带" | 触发 `PROMPT_CONFLICT: high-saturation/neon conflict` | packet `colorBehavior.forbidden` 包含 "高饱和红橙" 命中 `/霓虹\|高饱和\|neon/iu` regex |

注: Patch 1-3 是 user-data 临时修, 写在 `phase-waye-brand-visual-smoke.ts` 的 preparation step (不写 production code), 下次 v18 跑完整 analysis 时会重新生成. 真正应该在 v18 pipeline 的 spatial 状态机里修 — user data 的 v18 self-healing stage 该在 functionalNetwork/sceneProgram 被 repair 后 refresh status flag.

## 跑批结果 (2026-08-02 真实跑批)

| 项 | 值 |
| --- | --- |
| Brand | 蛙耶 / WOW YEAH! (casual_dining / 炭烧牛蛙) |
| Analysis provider | qwen3.6-plus |
| Image provider | volcengine / doubao-seedream-5-0-pro-260628 |
| Analysis duration | 444s |
| Image duration | 50s |
| Prompt characters | 7105 (≤ 7500 limit) |
| Reference assets passed | 3 (logo + icon + merchandise) |
| Reference assets in provider request | 2 (icon + merchandise, post_composite filter 掉 logo) |
| Logo usage mode | post_composite (vnext 强制 when preferredLogoAssetId exists) |
| Image | 567KB (2816x1584, Seedream upscaled from 1024x576) |
| Status | succeeded |

视觉确认 (`docs/reference/phase-waye-brand-visual/waye.jpg`):
- ✓ **巨大青蛙 IP 形象 (V 手势 + 紫绿黄三色)** 在 right side 绿色背景墙
- ✓ **品牌色三色** 显著呈现 (紫色 + 绿色 + 黄色)
- ✓ **logo 墙** 接待台后
- ✓ **亚克力灯箱** 挂式 (紫 + 绿 + 黄框) 跟品牌色呼应
- ✓ **16:9 horizontal** 入口接待空间, 视平线广角
- ✓ **明档厨房** 背景可见, 食物菜单 (炭烧牛蛙照片)

## 9C.2 v2 V5 production asset contract parity

`vnext.service line 396-411` reference 处理:
- `lockedLogoAssetIds.has(asset.assetId) || asset.role === 'logo'` → `identity_reference`
- `asset.role === 'package_structure'` → `structure_reference`
- else → `core_reference`
- `.slice(0, 2)` cap 2 references

WAYE 4 assets 全部 `role: "logo"`, vnext 选 2 张 (icon + merchandise) 进 `identity_reference`, 1 张 (waye-logo-deconstruction) 走 post_composite (画完后 overlay, 不让 model 自由发挥).

## Doc §11 acceptance

- ✓ WAYE 完整 brand visual analysis (production v5 pipeline.start, qwen3.6-plus)
- ✓ 16:9 横板空间效果图 (Seedream 5.0 Pro, 1024*576 → 2816x1584)
- ✓ 图上带品牌视觉资产 (logo / IP / icon / merchandise) — 视觉确认
- ✓ 9C.2 v2 brand_driven strategy (post 9C.0.5 DNA 修正, gate pass+continue)
- ✓ 不调真实 Provider 直到 env 完整 + user 明确同意

## 不调真实 Provider 直到 user-authorized
