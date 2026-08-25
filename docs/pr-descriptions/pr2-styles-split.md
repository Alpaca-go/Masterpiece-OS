## 摘要

将 240KB 单文件 `apps/web/src/styles.css`（6944 行）按职责拆为 3 个文件，main.tsx 按顺序 import。**视觉零变化**（Vite 输出 CSS bundle 字节相同）。

## 改动文件

| 文件 | 变化 | 行数 |
|---|---|---|
| `apps/web/src/styles/tokens.css` | 覆盖：替换为 styles.css line 1-292 的 byte-identical 副本 + ACTIVE banner | 323 行（之前 92 行 skeleton） |
| `apps/web/src/styles/theme-dark.css` | 新建：styles.css line 294-412 的 byte-identical 副本（[data-theme="dark"] + prefers-color-scheme） | 143 行 |
| `apps/web/src/styles.css` | 删除 line 1-412，保留 line 414+ 业务样式 + 顶部 banner | 6530 行（之前 6944 行） |
| `apps/web/src/main.tsx` | 在原 `import './styles.css'` 前加 2 行：tokens.css + theme-dark.css | +2 imports |

## CSS 加载顺序（关键）

```typescript
// apps/web/src/main.tsx
import './styles/tokens.css';        // :root 设计 token (light 默认)
import './styles/theme-dark.css';    // [data-theme="dark"] + prefers-color-scheme
import './styles.css';               // 业务 + 组件样式
```

Vite 按 source 顺序打包 → bundle 顶层结构：

```
:root { --color-*: ...; --text-*: ...; --accent: ...; ... }   /* tokens.css */
[data-theme="dark"] { --color-*: <dark values>; ... }         /* theme-dark.css */
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }
.app-shell { ... }                                              /* styles.css */
... 6530 行业务样式 ...
```

## 视觉等价性证据

- `npm run web:build` 输出 CSS bundle：`221.15 kB / 36.09 kB gzip` —— **拆分前后字节相同**
- `npm test`: **1714/1714 PASS**
- `npm run web:typecheck`: PASS

## 审计修正

之前 commit e573110b 把 `styles/tokens.css` 标为 NOT_WIRED，理由是"和 styles.css 的 `--color-*` 命名空间冲突"。**这个理由错了**——styles.css line 174-291 已经定义了完整的 route-A 别名 (`--text-*`、`--bg-*`、`--accent`、`--fs-*`、`--sp-*`)。本 PR 的做法是**让 tokens.css 成为 styles.css 的内容副本**（不是 P3 目标态）；P3 dark-first 切换真正发生时，归入 `theme-dark.css` 而不是再造一个 `:root`。

`feat/theme-system-and-token-aliases` 分支的 commit 02bf2cc2 已经同步更新了 7 个 skeleton 的 banner 注释（REFERENCE-ONLY 而非 NOT_WIRED），与本 PR 互相引用。

## 风险评估

- **视觉**：0 风险。所有 var(--*) 值、选择器、媒体查询、import 顺序保持等价。
- **bundle 体积**：0 影响（CSS bundle 字节相同）。
- **TypeScript / 测试**：0 影响。
- **P0 baseline**：0 触动。

## 后续清理（非本 PR 范围）

- styles.css 仍 6530 行。可按 BEM prefix 进一步拆 styles/components.css + styles/layout.css + styles/pages.css。**建议单独 PR**。
- 真正的 P3 dark-first 切换：另起 PR 改写 theme-dark.css（不是再造一个 :root）。