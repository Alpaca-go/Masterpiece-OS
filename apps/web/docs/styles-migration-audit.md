# styles.css 退役审计报告

> 路线 A / P3 (架构-1) — 旧命名 token 退役审计

## 背景

`styles.css`（v1，6500+ 行）当前混用两套 token 命名：
- **旧命名**（`--color-*` / `--space-*` / `--radius-*` / `--text-*`）：主用
- **路线 A 新命名**（`--bg-*` / `--accent` / `--sp-*` / `--r-*` / `--fs-*`）：从 P0-1 起作为别名注入

**目标**：完全切换到新命名，删除旧命名定义（6000+ 行的兼容代码随之清理）。

## 现状（2026-08-25 审计）

### Token 定义层（:root）

| 类型 | 旧命名 | 新命名（路线 A） | 状态 |
|------|--------|----------------|------|
| Brand | `--color-accent-*`, `--color-hot-*` | `--accent-*`, `--hot-*` | ✅ 已加别名 |
| Surface | `--color-bg-*`, `--color-surface-*` | `--bg-canvas`, `--bg-surface`, `--bg-elevated` | ✅ 已加别名 |
| Text | `--color-text-*`, `--color-text-on-*` | `--text-primary`, `--text-on-accent` | ✅ 已加别名 |
| Border | `--color-line-*` | `--border*` | ✅ 已加别名 |
| Semantic | `--color-success/warning/error/info-*` | `--success/warning/danger/info-*` | ✅ 已加别名 |
| Spacing | `--space-*` | `--sp-*` | ✅ 已加别名 |
| Radius | `--radius-*` | `--r-*` | ✅ 已加别名 |
| Typography | `--text-xs..6xl` | `--fs-xs..6xl` | ✅ 已加别名 |
| Shadow | `--shadow-*` | `--shadow-*`（同名） | ✅ 共用 |
| Motion | — | `--ease-out`, `--dur-*` | ✅ 新加 |
| Layout | `--sidebar-width`, `--topbar-height`, `--content-max` | `--layout-*` | ✅ 已加别名 |

### 业务样式层（lines 173-6545）

| 指标 | 数值 |
|------|------|
| 业务 class 总数 | 280+ |
| 仍使用旧命名（`--color-*`、`--space-*`、`--radius-*`、`--text-*`）的 class | ~280（100%） |
| 使用新命名（`--accent`、`--bg-*`、`--sp-*` 等）的 class | ~30（仅本轮新增） |
| 业务样式里的硬编码颜色值 | **143 处** |
| 硬编码 spacing/radius/font-size | 35 处 |

## 退役计划（路线图）

### 阶段 1：风格统一化（本次提交已完成）
- [x] 在 `:root` 注入新命名 token 别名（不影响现有 class）
- [x] 新组件（RightPanel、EmptyIllustration 等）全部用新命名
- [x] 主题系统（暗色 + 跟随）用新命名

### 阶段 2：硬编码值清理（下一步）
- [ ] 143 处硬编码颜色 → 替换为对应 token（脚本化批处理）
- [ ] 35 处硬编码 spacing → 替换为 `--space-N` 或 `--sp-N`
- [ ] 硬编码字号 → `--text-N` 或 `--fs-N`
- 工具：写一个 codemod 脚本（regex + token 字典映射）

### 阶段 3：旧命名 class 迁移（中后期）
- [ ] 写一个 codemod 脚本，把 `var(--color-accent)` → `var(--accent)`、`var(--space-4)` → `var(--sp-4)` 等
- [ ] 280+ class 一次性替换
- [ ] typecheck + 视觉回归测试

### 阶段 4：styles.css 退役
- [ ] 只有新命名 + 业务 class 的 `tokens.css` + `globals.css` + 业务样式分文件
- [ ] 旧 `styles.css` 文件删除
- [ ] 在 main.tsx 里切换 import

## 风险

- **视觉回归**：批量替换 token 后，可能出现细微差异（不同 token 实际值略有不同）。需要每个 PR 都跑一次视觉回归测试。
- **私有 style**：有些 class 只在某个组件里用，可能被改完才发现破坏了某个角落。
- **主题切换**：新旧 token 在深色模式下值不一样，必须保证替换后深色主题也正确。

## 建议

**分批迁移**，按目录或业务领域（settings / projects / short-chain / ciworkspace）逐块替换，每个 PR：
1. 只替换一个目录下的 CSS
2. typecheck + build + 视觉验证
3. 单独提交

每个 PR 体量小、风险低、可回滚。预计需要 **8-12 个 PR** 完成。

## 记录

- 2026-08-25: 阶段 1 完成（新命名别名注入）
- 下一阶段开始时更新此文件
