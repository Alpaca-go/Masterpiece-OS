# v1 Baseline Regression Samples

**不复制 v1 已生成图**。理由：
1. 用户项目数据不属于仓库
2. v1 生成的 27 张九州美学图在 `image-generation/` 和 `image-generation-vnext/` 下
3. v1 生成的冯烫烫 / 一剂良方 / 蛙耶图分别在各自项目目录

## 引用位置

| 项目 | project_id_local | 数据根 |
|---|---|---|
| 九州美学 | a7a56ed7-849f-4671-b47a-466394d7298d | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-a7a56ed7\` |
| 冯烫烫 | dca9b7d4-f233-46ff-b4df-44a890f13c4f | `C:\Users\Administrator\Documents\Masterpiece OS Data\projects\视觉项目-20260728-002711-dca9b7d4\` |

## 回归使用规则

- Phase 4 垂直测试时，同场景生成的图必须**与 v1 同项目、同空间的已生成图做 A/B 对比**
- Phase 7 跨项目回归：v1 已生成的 4 个项目（九州美学 / 一剂良方 / 冯烫烫 / 蛙耶）作为"未污染样本"
- **不得**把 v1 已生成图复制进 v1-experimental/ —— 用引用即可

## 关键已知样本（v1 历史）

- 九州美学已生成 27 张，其中 JZMX-SGR-01 / 02 被选为 Golden Reference
- 冯烫烫已生成 10 张
- 一剂良方、蛙耶已生成若干张（具体数字按 v1 当时项目数据）
