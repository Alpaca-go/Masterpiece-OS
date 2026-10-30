# 蛙耶 · 验收记录（2026-10-30）

状态：**条件式通过。** 用户（Kyries）2026-10-30 口头确认：两张图（`dd3445b2`、`94b36a0c`）"都可以通过，除了门口的 IP 形象没有用我做的那个插画以外"。

## 验收范围

| 项 | 结论 |
|---|---|
| 视觉方向与空间构成 | 通过 |
| 品牌色分层（紫/绿/橙） | 通过 |
| 明档 / 炭锅 / 菜单灯箱等信息面 | 通过 |
| **门口 IP 形象（吉祥物）** | **不通过**：不是用户提供的插画形象 |
| 落地完成度、面积层高、排烟 | 未验证（无现场照片） |

## 两张被接受的图

| 项 | 对照组 | 注入组 |
|---|---|---|
| runId | `dd3445b2-2c83-4d80-8d5b-c240075737f0` | `94b36a0c-c8fb-40db-9978-10c33c7b7792` |
| imageId | `a0dac9c3-f2ef-4fa0-8716-5756e8e979b5` | `489cdd65-067f-45d8-8183-4d00934653ec` |
| taskId | 对应编译批次 | `vnext-task-61f4b516-c925-4fdf-99f8-6f56f0f653cc` |
| 生成时间 | 2026-10-28 14:57:54 | 2026-10-28 15:00:28 |
| 尺寸 | 2816×1584 | 2816×1584 |
| SHA-256 | `34e495dccf996a666f81cb79c5b83ad733b719d5a7e337277c2ad41894479cea` | `11373ca24b5c0bb686b813c4e27aa86d84c02fba6ca1adea84adcf2658e765da` |
| 生图 | volcengine / `doubao-seedream-5-0-pro-260628` | 同左 |
| 知识注入 | 无（compiled prompt 无 `Experience Reference` 区块） | 有：4 条经验（暖光/烟罩/生活细节/品牌色局部），`Experience Reference (advisory)` 区块长度 8353 字符 |
| 自动校验 | 既有记录为 `passed`（当次任务） | 同左 |

> 两组都通过，因此**不能证明注入让图更好**；只能说明"注入没有把这个项目弄坏"，这是第二个自有项目上的又一次非损害观察。

## 为什么 IP 形象一定不会对（根因）

不是模型"不听话"，是当前链路没有给它的通道：

1. **标准空间生图禁止参考图**：`task-contract.js` 里 `SPACE_STANDARD_REFERENCE_NOT_ALLOWED`，`generationBasis: standard` 时 `referenceAssetIds` 必须为空。所以吉祥物插画**没有作为图像传给模型**。
2. **Prompt 里只有文字**：编译结果只有"入口用 3D 化的品牌 IP 装置做视觉焦点"这类描述，编译后 Prompt 中 `mascot` 只出现一次，且是**禁止句**——`Do not copy their specific materials, symbols, props, mascots or brand stories.`（知识注入的 guardrail）。
3. **另一条 guardrail 更直接**：`Do not invent props, characters, signage text or brand assets that this project's materials do not contain.` 两条叠加，模型既不能抄、也不该发明，但它必须画一个"IP 装置"，于是只能自己造一个青蛙。

结论：**IP 类项目要正确出形象，必须走"锁定资产"路线**——把吉祥物作为参考图生成（`reference_first` / `art_direction_reference`），或者生图后把 IP 做后期合成（像 Logo 的 `post_composite` 那样）。标准文字模式做不到，这条要写进产品限制。

## 未验证 / 已知缺口

- 没有现场照片，全部空间判断来自 VI 板 + 模型推断。
- 面积、层高、商场/街面、堂食外带比例、时段、预算档、排烟条件：**全部未知**（项目事实未填）。
- 自动校验 `passed` 不等于本次验收；本次验收以用户口头结论为准。
