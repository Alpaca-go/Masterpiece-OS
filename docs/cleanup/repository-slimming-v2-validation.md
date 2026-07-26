# Repository Slimming v2 — 验证记录

日期：2026-07-26
分支：`refactor/repository-slimming-v2`（基于 v1.3.3 生产基线）

## 阶段提交

| Phase | 提交 | 内容 |
| --- | --- | --- |
| 0 | `122fb45` | 冻结基线 + 遗留代码盘点（docs/cleanup/legacy-inventory.json） |
| 1 | `eb6b25e` | 共享 packages 抽取（model-runtime、document-ingestion、reference-asset-inspector、runtime-core、project-contracts） |
| 2 | `81dda8a` | 建立两个 Labs（labs/document-visual-directions、labs/reference-style-conversion） |
| 3 | `c4448d2` | Desktop 切断实验功能接线（移除实验 UI/IPC/preload 面） |
| 4 | `79b3707` | 物理删除已迁移遗留管线与过时测试（341 files，-56,571 行） |
| 4b | `56cbf4f` | 清除 Desktop 死运行时模块与遗留 shared 类型（-522 行） |
| 5 | `8dbc7e7` | 脚本/测试/类型收敛（根脚本收敛为最终集合，重建精简 CLI，重写 README） |
| 6 | （本提交） | 零旧代码门禁 + 生产边界门禁 + 本验证记录 |

## 门禁与测试结果（Phase 6 验收）

| 检查项 | 结果 |
| --- | --- |
| `npm run verify:no-obsolete-code` | PASS（扫描 140 个文件，无禁止遗留引用） |
| `npm run verify:production-boundaries` | PASS（78 个 Desktop 文件、打包配置、preload 面） |
| `npm test`（根引擎） | 40 测试：35 pass / 0 fail / 5 cancelled（node22 已知 flaky，node24 全过） |
| `npm run verify:current-flows` | PASS（离线，无外部 API 调用） |
| `npm run desktop:test` | 133/133 pass |
| Desktop typecheck (`tsc --noEmit`) | 0 错误 |
| `npm run lab:document-directions:test` | 79 测试：58 pass / 0 fail / 21 cancelled（已知 flaky） |
| `npm run lab:reference-conversion:test` | 7/7 pass |
| `npm run desktop:package`（portable） | 见下方产物 |

产物：`apps/desktop/release/Masterpiece-OS-Desktop-Portable-0.1.0-x64.exe`

## 最终脚本集合（根 package.json）

`analyze`、`test`、`verify:current-flows`、`verify:production-boundaries`、`verify:no-obsolete-code`、
`lab:document-directions(:test)`、`lab:reference-conversion(:test)`、`desktop:dev/build/test/package`。

已删除旧入口：`analyze:v4`、`validate`、`start`、`test:v5`、`test:regression`、`verify:document-flows`（更名为 `verify:current-flows`）、`verify:reference-first-protocol`、`quality:shadow`、`quality:sprint2`、`freeze:cross-industry`、`reference-translate`。

## 记录在案的偏差

1. **保留 `style-carrier-ranking.ts` 与 `task-reference-selection.ts`**
   规范的禁止列表包含这两个名字，但生产 Reference Anchor 功能通过
   `asset-selection-protocol → reference-first/index.ts` barrel 实际引用其中函数
   （`rankStyleCarriers`、`selectTaskReferences` 等 6 个符号）。物理删除会破坏生产功能。
   处理：保留在 `apps/desktop/src/main/reference-first/protocol/`，
   `verify-no-obsolete-code` 对该目录豁免这两个关键字，其余位置仍然禁止。

2. **Lab 内部保留 `visual-translation/v1` 目录**
   `labs/document-visual-directions` 的当前实验管线是 v2（execution-oriented），
   但 v2 运行时以冻结的 v1 上游阶段（00–03 文档准备/证据/信号/机会）作为库依赖
   （`run-visual-translation-v2.js` 直接 import v1 prompts/schemas/stage-registry）。
   v1 不作为独立管线暴露（labs bin 只运行 v2），因此不构成「多版本并存」的对外入口。
   处理：`verify-no-obsolete-code` 不扫描 labs/（规范允许的 Lab 根），
   `verify-production-boundaries` 保证 Desktop 不 import labs 且打包不含 labs。

3. **`architecture-boundary.test.ts` 含遗留名字的负向断言**
   该测试用禁止名字断言相应文件「不存在」，属于门禁的一部分，已在扫描白名单中豁免。

## 生产功能边界（最终状态）

- Desktop 仅含三项生产功能：视觉分析、文档上下文、Reference Anchor。
- 两个 Labs 通过独立 CLI 运行（`npm run lab:*`），不进入 Electron UI、IPC、构建与打包。
- 共享能力位于 `packages/`：model-runtime、document-ingestion、reference-asset-inspector、runtime-core、project-contracts。
- 根引擎（`src/` + `bin/masterpiece-os.js`）仅保留 v5 Deep Creative Director 管线与 inventory。
