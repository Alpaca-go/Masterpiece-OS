# Masterpiece OS Web UI 重做开发文档

> **本文件用途**：给未来的 AI agent（或开发者）一份自包含的「交接包」，
> 描述 Masterpiece OS Web 端（`apps/web`）的现状、目标重做方向、
> 关键约束、目录改造建议与分阶段执行计划。
>
> 收到这份文档后，可以直接按 §6 的阶段顺序继续推进，无需重新摸仓库。

---

## 0. 文档元信息

| 字段 | 值 |
|---|---|
| 仓库 | `D:\Masterpiece-OS` |
| 当前产品版本 | `5.0.0-rc.1`（来源：`/VERSION`） |
| 当前 Web 服务命令 | `npm run web:dev`（同时启动 5173 渲染器 + 4317 RPC 主机） |
| Renderer | http://127.0.0.1:5173/（Vite + React 19，路径 `apps/web`） |
| Node Web Host | http://127.0.0.1:4317/（路径 `apps/web-runtime`，**完全不动**） |
| 关键契约 | `RuntimeApi`（来自 `@masterpiece/runtime-core`） |
| 重做决定日期 | 2026-08-23 |
| 重做路径决策 | **路线 A**：`apps/web` 原地重做，**不拆出仓库** |
| 目标风格 | 设计师友好（深色优先、克制、专业、信息密度可调） |
| 模块去留 | **只保留 Short-Chain 主链路**；其他模块全部退役 |

> ⚠️ 此文档是「UI 重做」专项，不替代仓库顶层规则。请同时阅读
> `CURRENT_BASELINE.md` / `BASELINE_LOCK.md` /
> `docs/repository/REPOSITORY_CONTRACT.md` /
> `docs/repository/AGENT_REPOSITORY_RULES.md` 与根 `AGENTS.md`。

---

## 1. 现状速览

### 1.1 架构

```
浏览器 5173 (apps/web, Vite + React 19, Renderer)
   │   调 web-api.ts → 通过 Vite 代理 /_masterpiece/* → 4317
   ▼
4317 (apps/web-runtime, Node Host)
   │   路由到 Operation Registry
   ▼
@masterpiece/runtime-core (Shared Operation Authority)
   │
   ▼
@masterpiece/* 共享包 + Provider 适配器
```

**关键事实**：
- `apps/web-runtime`（4317）是 **Primary Host**，完全不在重做范围内。
- `apps/web`（5173）是 **Primary UI**，是本次重做对象。
- 前端 ↔ 主机的唯一边界是 `apps/web/src/web-api.ts` 实现的
  `RuntimeApi` contract（`@masterpiece/runtime-core/application-contracts.ts`）。
- Renderer **不能**直接 import Host 实现或 `@masterpiece/*` 包之外的服务代码
  （`REPOSITORY_CONTRACT.md` RC002 / RC008 闸门保护）。

### 1.2 启动方式（重做前后不变）

```bash
# 一次性
node --version          # 要求 >= 20.9（仓库最低要求）
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned   # 仅 Windows 首次需要
npm.cmd install

# 开发
npm run web:dev         # 同时起 4317 主机 + 5173 渲染器
npm run web:typecheck   # UI 侧 TS 检查
npm run web:build       # Vite 产线构建
npm run web:smoke       # 离线 smoke，零业务写入
```

> Windows 下由于 PowerShell 执行策略，**必须**用 `npm.cmd` 调 npm，
> 不要再 `Set-ExecutionPolicy` 改全局（应该用 `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`）。

### 1.3 现有 `apps/web` 文件清单（2026-08-23 时点）

```
src/
├── App.tsx                                    [留：壳]
├── main.tsx                                   [留：入口]
├── global.d.ts                                [留]
├── styles.css                                 [重写 → 拆 tokens.css + globals.css]
├── utils.ts                                   [评估，重做后可能并入 lib/]
├── web-api.ts                                 [留作底层，重写为 sdk/]
├── ciworkspace/                               [退役]
│   ├── anchor-controller.ts
│   ├── anchor-types.ts
│   ├── controller.ts
│   ├── format.ts
│   └── types.ts
├── components/
│   ├── AnalysisModeTabs.tsx                   [退役]
│   ├── AnalysisView.tsx                       [退役]
│   ├── AppErrorBoundary.tsx                   [重写 → components/feedback/]
│   ├── ContextIntegrationPanel.tsx            [退役]
│   ├── CreativeIntelligenceWorkspace.tsx      [退役]
│   ├── DocumentContextWorkspace.tsx           [退役]
│   ├── ImageGenerationWorkspace.tsx           [退役]
│   ├── ModelAssistedDirectionPanel.tsx        [退役]
│   ├── PageShell.tsx                          [退役，被 AppShell 替代]
│   ├── ProjectDetail.tsx                      [退役]
│   ├── ProjectWizard.tsx                      [退役]
│   ├── ProviderBadge.tsx                      [重写，沿用语义]
│   ├── ReferenceAnchorWorkspace.tsx           [退役]
│   ├── ReportView.tsx                         [退役]
│   ├── SettingsPanel.tsx                      [重写 → pages/SettingsPage]
│   ├── ShortChainGenerationWorkspace.tsx      [拆解 → features/short-chain/]
│   ├── StatusBadgeInline.tsx                  [重写]
│   ├── VisualAssetUploader.tsx                [重写/并入 BriefEditor]
│   ├── layout/                                [全部重写]
│   │   ├── AppShell.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── InspectorDrawer.tsx
│   │   ├── Toast.tsx
│   │   └── TopBar.tsx
│   ├── settings/                              [退役，旧 Settings 拆解]
│   │   ├── LocalSection.tsx
│   │   ├── ProfilesSection.tsx
│   │   ├── RegistrySection.tsx
│   │   ├── SettingsContext.tsx
│   │   └── SettingsNav.tsx
│   ├── shortchain/                            [并入 features/short-chain/]
│   │   ├── ShortChainBanners.tsx
│   │   ├── ShortChainHeader.tsx
│   │   ├── ShortChainPreviewPanel.tsx
│   │   └── ShortChainTypes.ts
│   └── ui/                                    [重写为 components/primitives/]
│       ├── Alert.tsx
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── index.ts
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Tabs.tsx
│       └── Tooltip.tsx
├── continuation/ui-state.js                   [退役]
├── features/
│   └── packaging/                             [退役]
│       ├── PackagingWorkspace.module.css
│       ├── PackagingWorkspace.tsx
│       └── service.ts
├── lib/useUrlScreen.ts                        [保留 → 评估后入 lib/]
└── reference-first/state.js                   [退役]
```

**总盘点**（用于重做工作量估算）：

| 类别 | 数量 | 处理 |
|---|---|---|
| 留（壳/入口/基础） | 5 | 改写或合并 |
| 重写（语义复用） | 7 | 进入新结构 |
| 拆解（主链路） | 4 | 并入 `features/short-chain/` |
| 退役 | 28 | 删除 |

---

## 2. 重做目标与非目标

### 2.1 目标（In-Scope）

1. 在 `apps/web` 内建立**完整 UI 设计系统**（token + primitives + layout）。
2. 抽出 `sdk/` 作为前端唯一与主机交互的边界（替换 `web-api.ts` 的角色）。
3. **重做 Short-Chain 主工作台**：BriefEditor + PreviewCanvas + DecisionStream。
4. 新建 **Library**（只读产物库）与 **Settings**（Provider/Profile/Registry）。
5. 路由收敛到 3 个一级页面：`/short-chain`（默认）、`/library`、`/settings`。

### 2.2 非目标（Out-of-Scope）

- **不**拆出 `apps/web` 到独立仓库（会撞 `verify:workspace-boundaries` / `RC002`）。
- **不**改 `apps/web-runtime` 与 `@masterpiece/runtime-core`。
- **不**改 Short-Chain 业务协议（`imageGeneration.startShortChain` 等
  17 个 channel），`verify:current-flows` 失败会阻断发布。
- **不**改 Provider 配置 / Prompt 模板 / 模型注册表（属 Class D/E 改动）。
- **不**删除 `apps/cli`（CLI 是发布管线一部分）。

---

## 3. 设计系统规格

### 3.1 价值观

- **克制**：深色默认，1 主色 + 1 强调色，少装饰
- **可读**：信息密度可调；优先留白
- **专业**：等宽字用于数据/ID/hash；衬线副标题给关键决策文本
- **少装饰**：渐变仅用于品牌区与主 CTA hover，不滥用

### 3.2 设计 Token（CSS 变量，存入 `apps/web/src/styles/tokens.css`）

**颜色（深色优先）**

```css
:root {
  /* 背景层级 */
  --bg-canvas:    #0B0D10;
  --bg-surface:   #13161B;
  --bg-elevated:  #1A1E25;
  --bg-overlay:   rgba(0, 0, 0, 0.6);

  /* 边框 */
  --border-subtle: #1F242C;
  --border-strong: #2C333D;

  /* 文字 */
  --text-primary:   #E8EBEF;   /* 对比度 14.5:1 */
  --text-secondary: #9AA3B2;
  --text-muted:     #5C6675;
  --text-disabled:  #3B424D;

  /* 主色（操作/品牌）—— 暖琥珀，金色暗示"决策" */
  --accent:        #E8B86A;
  --accent-hover:  #F0C689;
  --accent-soft:   rgba(232, 184, 106, 0.12);

  /* 状态 */
  --success: #6FAE7E;
  --warning: #D4A85A;
  --danger:  #D07070;
  --info:    #6E94C9;
}
```

**字体**

```css
:root {
  --font-sans:  "Inter", "PingFang SC", -apple-system, system-ui, sans-serif;
  --font-serif: "Source Serif 4", "Songti SC", serif;
  --font-mono:  "JetBrains Mono", "Cascadia Code", "Consolas", monospace;

  --fs-xs: 0.75rem;  --lh-xs: 1rem;
  --fs-sm: 0.875rem; --lh-sm: 1.25rem;
  --fs-base: 1rem;   --lh-base: 1.6rem;   /* body 行高 1.6 */
  --fs-lg: 1.125rem; --lh-lg: 1.75rem;
  --fs-xl: 1.25rem;  --lh-xl: 1.75rem;
  --fs-2xl: 1.5rem;  --lh-2xl: 2rem;
  --fs-3xl: 1.875rem;--lh-3xl: 2.25rem;
  --fs-4xl: 2.25rem; --lh-4xl: 2.5rem;
  --fs-5xl: 3rem;    --lh-5xl: 3rem;     /* heading 1.25 */

  --fw-regular: 400; --fw-medium: 500; --fw-semibold: 600; --fw-bold: 700;
}
```

**间距**（4px 基准）
```css
--sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
--sp-6: 24px; --sp-8: 32px; --sp-12: 48px; --sp-16: 64px;
--sp-24: 96px; --sp-32: 128px;
```

**圆角**
```css
--r-xs: 2px; --r-sm: 4px; --r-md: 6px; --r-lg: 8px;
--r-xl: 12px; --r-2xl: 16px;
```

**阴影**（深色项目用「边框 + 极淡阴影」双层，不放大黑阴影）
```css
--shadow-sm:  0 1px 0 rgba(255,255,255,0.02), 0 1px 2px rgba(0,0,0,0.4);
--shadow-md:  0 1px 0 rgba(255,255,255,0.02), 0 4px 8px rgba(0,0,0,0.4);
--shadow-glow: 0 0 0 1px rgba(232,184,106,0.4);  /* 主 CTA hover */
```

**动效**
```css
--ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
--dur-fast: 150ms; --dur-base: 200ms; --dur-slow: 250ms;

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; }
}
```

### 3.3 信息架构

```
[Brand: Masterpiece]
  │
  ├── /short-chain   Short-Chain 视觉生成（默认，主工作台）
  ├── /library       历史产物 / 已确认产物
  └── /settings      Provider / Profile / Registry
```

**Short-Chain 工作台三栏布局**

```
┌──────────────────────────────────────────────────────┐
│  TopBar：项目名 · Profile · Status · 用户           │
├──────────┬──────────────────────────────┬───────────┤
│ Brief    │  Preview Canvas              │ Inspector │
│ 编辑器   │  (核心 —— 大图 + 决策卡片)  │ 决策历史  │
│ (左 360) │                              │ (右 360)  │
│          │                              │           │
├──────────┴──────────────────────────────┴───────────┤
│  StatusBar：compile/running/awaiting-confirm/done   │
└──────────────────────────────────────────────────────┘
```

### 3.4 组件清单

**Primitives**（`components/primitives/`）— 跨页面通用
- `Button`（variants: primary | secondary | ghost | danger；sizes: sm | md | lg）
- `Input` / `Textarea` / `Select` / `Switch` / `Slider`
- `Dialog` / `Popover` / `Tooltip`
- `Tabs` / `Accordion`
- `Toast`（全局通知）
- `Badge` / `StatusDot` / `ProgressBar`
- `EmptyState` / `Skeleton`

**Layout**（`components/layout/`）
- `AppShell`（外层，包含 TopBar / StatusBar / Outlet）
- `TopBar`（品牌 + 路由面包屑 + ProviderBadge + UserMenu）
- `StatusBar`（任务状态 + 调用次数 + 时长）
- `ThreeColumnLayout`（Brief / Canvas / Inspector）

**Feedback**（`components/feedback/`）
- `ErrorBoundary`（来自 `AppErrorBoundary` 重写）
- `ConnectionIndicator`（RPC 心跳）

**Feature 组件**（`features/short-chain/`）
- `BriefEditor`：项目/参考/参数输入
- `PreviewCanvas`：大图 + 决策点高亮
- `DecisionStream`：决策历史时间线
- `DirectionPicker`（方向选择）
- `OutputGallery`（已生成产物）

---

## 4. SDK 设计（替换 `web-api.ts`）

### 4.1 目标

UI 组件**不**直接 `fetch` / `EventSource`，只调 SDK 方法。SDK 是前端与主机的唯一耦合点。

### 4.2 目录

```
apps/web/src/sdk/
├── index.ts                  # 导出公共 API
├── client.ts                 # fetch + SSE 统一封装
├── types.ts                  # 视图模型（VM），从 RuntimeApi 再导出 + 包装
├── errors.ts                 # 统一错误模型
├── events.ts                 # EventSource typed channels
└── operations/
    ├── short-chain.ts        # start / compile / confirm / continue / revoke
    └── project-context.ts    # getShortChain / rebuildShortChain / getGenerationReadiness
```

### 4.3 关键 Channel（不要改名，是契约）

来自现有 `web-api.ts::WEB_RPC_CHANNEL_OVERRIDES`：

| Channel | 用途 |
|---|---|
| `image-generation:short-chain-compile` | 编译 Short-Chain 任务 |
| `image-generation:short-chain-options` | 获取可选项 |
| `image-generation:short-chain-start` | 启动 |
| `image-generation:short-chain-start-validated` | 校验后启动 |
| `image-generation:short-chain-session` | 读会话 |
| `image-generation:short-chain-confirm-direction` | 确认方向 |
| `image-generation:short-chain-confirm-generated-output` | 确认产物 |
| `image-generation:short-chain-revoke-generated-output` | 撤销产物 |
| `image-generation:short-chain-confirmed-generated-outputs` | 已确认列表 |
| `image-generation:short-chain-continue-same-type` | 同类型续做 |
| `image-generation:short-chain-save-prompt-asset` | 保存 prompt 资产 |
| `image-generation:short-chain-post-composite-logo` | Logo 后合成 |
| `project-context:get-generation` | 读 generation |
| `project-context:rebuild-generation` | 重建 |
| `project-context:generation-readiness` | 读 readiness |

> 改名会触发 `verify:current-flows` 失败（`RC008`），属 Class D 改动，需 Golden 验证。
> 本次重做**不要**改 channel 名，只搬运位置和加类型。

### 4.4 错误模型

```ts
// sdk/errors.ts
export interface SdkError {
  operationId: string;
  code: string;            // 与主机 OperationRegistry 错误码对齐
  message: string;
  retryable: boolean;
  hint?: string;
}
```

### 4.5 示例接口

```ts
// sdk/operations/short-chain.ts
export interface ShortChainSdk {
  compile(input: CompileShortChainInput): Promise<CompileShortChainResult>;
  start(sessionId: string): Promise<StartResult>;
  getSession(sessionId: string): Promise<ShortChainSession>;
  confirmDirection(sessionId: string, directionId: string): Promise<void>;
  confirmOutput(sessionId: string, outputId: string): Promise<void>;
  revokeOutput(sessionId: string, outputId: string): Promise<void>;
  continueSameType(sessionId: string, outputId: string): Promise<StartResult>;
  subscribeEvents(sessionId: string, cb: (e: ShortChainEvent) => void): () => void;
}
```

---

## 5. 目标目录结构

```
apps/web/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.mjs
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── routes.tsx                          # React Router 7 配置（3 个一级路由）
    ├── styles/
    │   ├── tokens.css                      # §3.2 所有 token
    │   └── globals.css                     # 重置 + 基础排版
    ├── components/
    │   ├── primitives/                     # Button, Input, Dialog, Tooltip, Tabs...
    │   ├── layout/                         # AppShell, TopBar, StatusBar, ThreeColumnLayout
    │   └── feedback/                       # ErrorBoundary, ConnectionIndicator
    ├── features/
    │   └── short-chain/
    │       ├── BriefEditor.tsx
    │       ├── PreviewCanvas.tsx
    │       ├── DecisionStream.tsx
    │       ├── DirectionPicker.tsx
    │       ├── OutputGallery.tsx
    │       ├── hooks/
    │       │   ├── useShortChainSession.ts
    │       │   └── useRpcEvents.ts
    │       └── components/
    ├── pages/
    │   ├── ShortChainPage.tsx
    │   ├── LibraryPage.tsx
    │   └── SettingsPage.tsx
    ├── sdk/                                # §4
    │   ├── index.ts
    │   ├── client.ts
    │   ├── types.ts
    │   ├── errors.ts
    │   ├── events.ts
    │   └── operations/
    └── lib/
        ├── format.ts
        └── url-screen.ts
```

---

## 6. 实施阶段

每阶段后跑：
- `npm run web:typecheck`（必）
- `npm run web:build`（必）
- `npm run web:smoke`（必，离线）
- `npm run verify:workspace-boundaries`（必，闸门）

UI-only 改动按 `REPOSITORY_CONTRACT.md` §"Change classes" 属 **Class A/B**，
不必跑 `repo:check`（那包含真实 Provider 的 golden）。

### P0 — 准备

| 任务 | 产出 |
|---|---|
| 建 `sdk/` 目录，把 `web-api.ts` 改造成 SDK | `sdk/*` 文件齐；UI 全部改调 SDK；`web-api.ts` 改为 re-export SDK 兼容层或删除 |
| 写 `styles/tokens.css` + `styles/globals.css` | `tokens.css` 含 §3.2 全部变量；`main.tsx` 引入 |
| 写 `primitives/`（Button/Input/Dialog/Tabs/Toast/Tooltip/Badge/StatusDot/EmptyState/Skeleton） | 每个组件一个文件，含 props 类型 |
| 写 `layout/`（AppShell/TopBar/StatusBar/ThreeColumnLayout） | 同上 |
| 写 `feedback/`（ErrorBoundary/ConnectionIndicator） | 同上 |
| 路由壳子：`/short-chain`、`/library`、`/settings` 三个空白页 | `routes.tsx` |

**验收**：原有 Short-Chain 行为不变（哪怕 UI 还是旧的）；`web:typecheck` / `web:build` 通过；`web:smoke` 通过。

### P1 — Short-Chain 主工作台

| 任务 | 产出 |
|---|---|
| `features/short-chain/BriefEditor.tsx` | 项目名、参考资产、参数表单 |
| `features/short-chain/PreviewCanvas.tsx` | 大图 + 决策点高亮 + 来源标注 |
| `features/short-chain/DecisionStream.tsx` | 决策历史时间线 |
| `features/short-chain/OutputGallery.tsx` | 已生成产物网格 |
| `features/short-chain/hooks/useShortChainSession.ts` | 拉/订阅 session |
| `features/short-chain/hooks/useRpcEvents.ts` | 订阅 SSE |
| `pages/ShortChainPage.tsx` | 三栏装配 |
| 替换 `App.tsx` 主入口 | 真正用新壳 |

**验收**：在 UI 上跑通一次 Short-Chain 真实 run，状态机正确
（`compiling / running / awaiting-confirm / done / error`）。

### P2 — 轻量页

| 任务 | 产出 |
|---|---|
| `pages/LibraryPage.tsx`（只读列表 + 详情） | 历史 / 已确认产物 |
| `pages/SettingsPage.tsx`（Provider / Profile / Registry） | 设置改动真正写回后端 |
| 导航接入（新 TopBar） | 三个路由可切换 |

**验收**：Settings 改动通过 SDK 写回后端 Profile/Registry，重启后保留。

### P3 — 清理

| 任务 | 产出 |
|---|---|
| 删除 §1.3 中所有"退役"模块 | 0 个 RC 失败 |
| 跑 `npm run verify:workspace-boundaries` | 通过 |
| 跑 `npm run verify:current-flows` | 通过 |
| 跑 `npm run web:smoke` | 通过 |
| 跑 `npm run web:build` | 通过 |

**验收**：仓库里再无 `ProjectWizard`、`AnalysisView` 等已退役模块；
`web:typecheck` / `web:build` / `web:smoke` 全绿。

---

## 7. 守门与禁止

### 7.1 不要做

1. **不**改 17 个 Short-Chain channel 名（`RC008`）。
2. **不**改 `RuntimeApi` 类型（后端契约，Class D）。
3. **不**直接 `import` `@masterpiece/*` 包的 `src/*`（`RC002`）。
4. **不**引入 Tailwind / styled-components 等 CSS 框架到生产代码
   （可能触发 `verify:no-project-specific-production-rules`）。如要引入，
   先在 `docs/ui/decisions/0001-css-system.md` 写决策记录。
5. **不**引入新依赖到根 `package.json`（workspaces 共享），新依赖入 `apps/web/package.json`。
6. **不**在主分支上直接 commit / 改 main；用 `feat/*` / `fix/*` / `chore/*` / `experiment/*`
   短期分支（仓库 branch discipline）。

### 7.2 必须做

1. 每个阶段结束跑 §6 验收命令。
2. 涉及"行为可见"改动（新文案 / 新交互）走 PR 评审；属 Class B。
3. 删任何 `BASELINE_CRITICAL` 路径前查 `docs/baseline/baseline-files-manifest.md`。
4. UI 文案默认中文；金额/ID/hash/版本号用 `var(--font-mono)`。

---

## 8. 给后续 agent 的提示（如何接续）

> 你（未来的 agent）拿到这份文档时，按下面顺序操作：

1. **认环境**：
   - 读根 `AGENTS.md`、本文档（`docs/ui/redesign-development-doc.md`）
   - 确认产品版本：`cat /VERSION`（期望 `5.0.0-rc.1`）
   - 确认 Node：`node --version`（期望 `>= 20.9`）

2. **跑闸门**：
   - `npm run web:typecheck`
   - `npm run web:build`
   - `npm run web:smoke`
   - `npm run verify:workspace-boundaries`
   - 都应绿。若有红，先修闸门再继续。

3. **读 §6 找到当前阶段**，按"任务 / 产出 / 验收"逐项推进。

4. **遇到歧义**：
   - 设计 token 改前先看 §3.2，不要随意发明新颜色。
   - 通道名要改前先查 §4.3，并评估是否触及 Class D。
   - 模块归属要改前先看 §5 目标结构。

5. **遇到冲突**（本文件与仓库顶层规则冲突）：
   - 以仓库顶层 `REPOSITORY_CONTRACT.md` / `AGENT_REPOSITORY_RULES.md` 为准；
   - 在 `docs/ui/decisions/NNNN-<topic>.md` 记录决策，更新本文档。

6. **完成 P3 后**，删除本文档里的"准备"色彩（所有阶段都标"已完成"），
   转为 `docs/ui/redesign-handbook.md`（成品文档）。

---

## 9. 关键文件位置速查

| 想改什么 | 看哪里 |
|---|---|
| 颜色 / 字体 / 间距 | `apps/web/src/styles/tokens.css`（P0 之后） |
| 启动开发服务 | `npm run web:dev`（`apps/web-runtime/scripts/run-web-dev.mjs`） |
| 渲染器入口 | `apps/web/src/main.tsx` → `App.tsx` → `routes.tsx` |
| 主机入口 | `apps/web-runtime/src/main.ts`（**不动**） |
| RPC 协议类型 | `@masterpiece/runtime-core/src/application-contracts.ts`（**不动**） |
| Web ↔ Host 当前耦合 | `apps/web/src/web-api.ts`（将变为 `sdk/`） |
| Short-Chain 业务 channel | `web-api.ts::WEB_RPC_CHANNEL_OVERRIDES`（将迁到 `sdk/operations/short-chain.ts`） |
| 治理规则 | `docs/repository/REPOSITORY_CONTRACT.md` |
| Baseline | `CURRENT_BASELINE.md` / `BASELINE_LOCK.md` |
| 发布前闸门 | 根 `package.json::scripts.repo:verify` / `repo:check` |

---

## 10. 变更记录

| 日期 | 变更 | 备注 |
|---|---|---|
| 2026-08-23 | 初版 | 蓝图沉淀为可交接开发文档；待 P0 启动 |
