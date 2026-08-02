# Phase 9C.1 — WAYE (post-correction) Real-Provider Smoke

## 用途

对 蛙耶 (post-9C.0.5 DNA 修正) 跑 9C.1 compileSpaceRuntime 16 块
(15 baseline + 1 space_role_context, sceneType=reception 餐饮入口点单概念),
真实调 Provider 生成 1 张 16:9 横板空间效果图.

## 历史

- 9C v0.1 brands smoke (75628a7) 跑 WAYE 是 base v0.1 (11 块, 因 DNA 不完整).
- 9C.0.5 (f7c97df) 验证 WAYE DNA 严重错位, 但 gate 只阻断不修.
- 9C.1 (0058f1c) text-level 完成.
- **本次 (post-correction)**: 蛙耶 DNA 已修正 (industry=casual_dining / sceneType=reception /
  3 JSON 配套补齐). 9C.0.5 gate 报 pass, 9C.1 跑 16 块, 调 Provider 1 张.

## 用法

```bash
# 1. 设置环境变量
$env:MASTERPIECE_SMOKE_BRAND_KEY = 'wa-ye'
$env:MASTERPIECE_SMOKE_PROJECT_ID = '8d73845c-1477-485a-b6bb-40aed16c06b1'
$env:MASTERPIECE_SMOKE_ASSET_ID = '0ac035c9-74a9-40a7-b640-d0a0b5d5b32b'
$env:MASTERPIECE_SMOKE_IMAGE_PROFILE_ID = 'profile-e871b4c5-7499-4749-b838-02410ad19cb1'

# 2. 跑 smoke
cd D:\Masterpiece-OS\apps\desktop
node scripts/phase-9c.1-waye-smoke/run-phase-9c.1-waye-smoke.mjs
```

## 输出

- `validation-results/phase-9C.1-waye-smoke/wa-ye/prompt.md` (16 块 markdown)
- `validation-results/phase-9C.1-waye-smoke/wa-ye/run.json` (run record, 脱敏)
- `validation-results/phase-9C.1-waye-smoke/wa-ye/report.md` (human-readable)
- `validation-results/phase-9C.1-waye-smoke/wa-ye/image.png` (16:9, **gitignored**)

## 9C.0.5 gate pre-check

跑 smoke 之前, 9C.0.5 brand identity validation gate 应报:
- matchedIndustry: casual_dining
- status: pass
- risk: low
- confidence: >= 0.85
- issues: 0

如果 gate fail, smoke script 会因 DNA 错位导致 image gen 仍然给出乱图.

## 不调 / 调

- 不调真实 Provider: 无 (本 smoke 是 真实 Provider 调用, user-authorized)
- 不修改 v1-baseline
- 不污染生产代码
