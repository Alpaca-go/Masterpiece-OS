# A2-B.2 Volcengine Capability Probe Report

**Date:** 2026-08-12T08:53:35.052Z
**Source script:** scripts/visual-analysis-probe-volcengine.mjs
**Profile:** `Seed 2.1 Turbo（订阅）` (`profile-7776a9f6-7270-47b5-9e7d-4d552a1c5376`)
**Provider:** `volcengine`
**Model:** `doubao-seed-2.1-turbo`
**Base URL:** `https://ark.cn-beijing.volces.com/api/plan/v3`
**Settings path:** `C:\Users\Administrator\AppData\Roaming\masterpiece-os-desktop\settings.json`

## Capability summary

| Capability | Result | Notes |
|---|---|---|
| Vision input (1 image) | PASS | free text prompt, 60 s budget |
| Multi-image (2 images) | PASS | free text prompt, 60 s budget |
| Structured output (JSON Schema) | PASS | schema={description: string} |
| Context / usage introspection | UNKNOWN | reasoner does not surface usage; record as UNKNOWN |

## Per-probe detail

### Probe 1: Vision input (1 image, free text)

- status: `success`
- elapsedMs: `14449`
- provider: `volcengine`
- model (returned): `doubao-seed-2-1-turbo-260628`
- runId: `021786524766682c26ebaa89f61563ae66be53d1b05a6aa648190`
- inspectedAssetIds: ["a"]
- reportMarkdown (first 240 chars):

```markdown
这张图为满幅构图，整体呈自上而下的线性渐变效果，色彩从顶部的鲜红色经紫红色系平滑过渡到底部的纯蓝色，无其他额外视觉元素。
```

### Probe 2: Multi-image (2 images, free text)

- status: `success`
- elapsedMs: `23242`
- provider: `volcengine`
- model (returned): `doubao-seed-2-1-turbo-260628`
- runId: `021786524780973c26ebaa89f61563ae66be53d1b05a6aa157f4f`
- inspectedAssetIds: ["a","b"]
- reportMarkdown (first 240 chars):

```markdown
视觉附件a的主要色相是从红色渐变到蓝色的红紫蓝色系，视觉附件b的主要色相是从绿色渐变到黄色的绿黄色系，二者色相差异显著，所属色系完全不同。
```

### Probe 3: Structured output (1 image + JSON Schema)

- status: `success`
- elapsedMs: `9266`
- provider: `volcengine`
- model (returned): `doubao-seed-2-1-turbo-260628`
- runId: `021786524804217c26ebaa89f61563ae66be53d1b05a6aa4578b1`
- inspectedAssetIds: ["a"]
- reportMarkdown (first 240 chars):

```markdown
{"description":"这是一个垂直方向的线性渐变，顶部为鲜艳的正红色，从上到下色彩平滑过渡，依次经过深玫红色、紫红色、深紫色，最终过渡到底部的纯蓝色，整体从暖红色系逐步过渡到冷蓝色系，渐变均匀流畅，画面无其他额外元素。"}
```

- parsedJson: `{"description":"这是一个垂直方向的线性渐变，顶部为鲜艳的正红色，从上到下色彩平滑过渡，依次经过深玫红色、紫红色、深紫色，最终过渡到底部的纯蓝色，整体从暖红色系逐步过渡到冷蓝色系，渐变均匀流畅，画面无其他额外元素。"}`

## A2-A discovery table update

Per A2-A, Candidate A had `UNKNOWN` cells for vision / multi-image
/ structured / context. The results above resolve them as follows:

| Capability | Before probe | After probe |
|---|---|---|
| Vision input (1 image) | UNKNOWN | PASS |
| Multi-image (2 images) | UNKNOWN | PASS |
| Structured output | UNKNOWN | PASS |
| Context / usage | UNKNOWN | UNKNOWN |

## Caveats

- The probe is manual / opt-in / networked / cost-sensitive
  (A2 spec §20). It is not part of `repo:verify` or default CI
  (A2 spec §21 and §105).
- The probe uses two 256x256 gradient PNGs generated into
  `D:\Masterpiece-OS\.codex-smoke\a2-volcengine-probe-fixtures`. They are not committed.
- The API key is supplied only through the
  `VOLCENGINE_API_KEY` env var and is never written to disk.
- The result of probe 4 (context) is recorded as UNKNOWN
  because the Volcengine reasoner does not surface usage
  blocks; populating this cell requires a reasoner change
  (out of A2-B.2 scope).
- A successful Vision / Multi-image / Structured run means
  the configured Profile reaches the upstream and the
  canonical Analysis Provider result contract is honored;
  it does not certify visual analysis quality — that is
  A2-D / A2-F / A2-G work.
