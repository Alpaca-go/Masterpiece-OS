# Repository Map — S0 Snapshot

审计基准：`322ae676c546340fd7a9d467bca66ebe3fd023f7`（2026-08-11）。本表同时记录 Git 跟踪目录与工作区实际存在但被忽略的运行目录；后者不计入源码统计。

| Path | Purpose | Runtime Relevance | Versioned | Risk |
|---|---|---|---|---|
| `apps/` | CLI 与 Electron/React 应用；Web 前端和 Web RPC 后端也在 Desktop workspace | WEB / DESKTOP / SHARED | Yes (`v5`, `vnext`, `R*` smoke) | CRITICAL |
| `packages/` | 14 个 `@masterpiece/*` 内部运行包 | SHARED | Yes (`vnext`, schema versions) | CRITICAL |
| `space-generator/` | 冻结基线、实验实现、真实烟雾证据与考古报告 | TEST / DOCS；部分资产被生产编译器读取 | Yes | CRITICAL |
| `schemas/` | 分析、创意生产、图像生成 JSON Schema | SHARED | Yes (`v2`, `v3`, schema `6.0`) | HIGH |
| `tests/` | 根级契约、回归、Golden、历史兼容性测试 | TEST | Yes | HIGH |
| `scripts/` | 发布门禁、评估与版本同步 | BUILD / TEST | Yes (`r8.6`) | HIGH |
| `labs/` | 两个隔离实验 workspace，不进入正式 Desktop UI/IPC/打包 | TEST | Yes (`v1`, `v2`) | MEDIUM |
| `evaluation/` | Golden/anti/hidden cases 与评估报告，生产边界禁止导入 | TEST / DOCS | Yes | HIGH |
| `docs/` | 架构、发布、历史归档、运行稳定化文档 | DOCS | Yes | LOW–MEDIUM |
| `projects/` | 仓库内项目示例/占位资产 | TEST / UNKNOWN | No material version namespace | MEDIUM |
| `history/` | 本地 review 历史；Git 仅跟踪占位 | DOCS / UNKNOWN | No | MEDIUM |
| `assets/` | 工作区实际存在但当前没有 Git 跟踪文件 | UNKNOWN | Unknown | MEDIUM |
| `.packet/` | 本地数据包工作目录，未跟踪 | TEST / LOCAL | No | LOW |
| `.runtime/` | 本地运行产物，gitignored | LOCAL | No | LOW |
| `.codex-smoke/` | 本地烟雾测试产物，gitignored | TEST / LOCAL | No | LOW |
| `.workbuddy/` | 本地工具状态，未进入产品链路 | LOCAL / UNKNOWN | No | LOW |
| `node_modules/` | workspace 安装依赖，gitignored | BUILD | Package versions | LOW |

## Tracked-file distribution

| Area | Tracked files |
|---|---:|
| `space-generator/` | 477 |
| `apps/` | 284 |
| `packages/` | 157 |
| `tests/` | 148 |
| `labs/` | 122 |
| `evaluation/` | 95 |
| `docs/` | 63 before S0 deliverables |
| `schemas/` | 37 |
| `scripts/` | 19 |
| `projects/` | 1 |
| `history/` | 1 |

## Boundary truth

- Web 是 Primary Runtime，但其后端由 `apps/desktop/src/main/*` 托管，不能按目录名把 Desktop 判为可移除。
- `evaluation/` 与 `labs/` 不进入生产运行链；它们仍承担测试和研究职责。
- `space-generator/quality-baselines/current-verification/space-golden` 是发布/回归保护资产，不是普通历史文档。
- 本 S0 没有删除、移动、重命名或清理任何路径。
