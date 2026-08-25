# 路由架构迁移方案

> 路线 A / P3 (架构-2) — 从 `useUrlScreen + screen 状态` 迁移到 `routes.tsx + React Router 7`

## 当前状态（2026-08-25）

### 已完成
- `useUrlScreen` 接了 React Router 7（HashRouter），URL 是真相源
- `routes.tsx` 已定义三条新路由（`/short-chain`、`/library`、`/settings`），但**未启用**
- 路径映射表：`SCREEN_TO_PATH` 和 `pathToScreen` 在 `useUrlScreen.ts`

### 当前架构痛点
1. **App.tsx 是 781 行的巨型组件**：9-screen switch + 46 个 `setScreen` 调用
2. **路径解析集中在 useUrlScreen**：路由散落在 `useUrlScreen + App.tsx + routes.tsx` 三处
3. **ShortChainPage 等子页面有独立 AppShell**：和主 AppShell 冲突（实际上已经分开了）
4. **screen 字符串作为命令式状态**：`screen === 'create' && selected` 这种判定到处都是

## 目标架构

### 最终态
```
React Router 7 (HashRouter)
  └─ routes.tsx 接管所有路由
       ├─ /                       → HomePage
       ├─ /projects/:id           → ProjectPage
       ├─ /projects/:id/analysis   → AnalysisView
       ├─ /projects/:id/report    → ReportView
       ├─ /projects/:id/creative  → ShortChainPage
       ├─ /create                 → CreatePage
       ├─ /settings               → SettingsPage
       ├─ /creative-intelligence  → CIWorkspace
       ├─ /library                → LibraryPage
       ├─ /packaging              → PackagingWorkspace
       └─ /image-generation       → ImageGenerationWorkspace
```

- 删除 `useUrlScreen.tsx`
- 删除 App.tsx 的 screen if-else 链
- 每个 Page 自己负责数据加载（loader pattern 或 useEffect）

## 迁移路径（分批 PR）

### PR-1：基础设施（本次未做，留到下个 sprint）
- [ ] 创建 `<AppRouter />` 组件，挂载 `<Routes>` + 各 Page
- [ ] 拆分 App.tsx：抽出 HomeShell、ProjectShell 等子组件
- [ ] useUrlScreen 保留做 backward-compat（用 deprecation marker）

### PR-2：路由分批接入（每次一个 screen）
- [ ] 拆分 home → HomePage + 自己挂 AppShell
- [ ] 拆分 settings → SettingsPage（已在 routes.tsx）
- [ ] 拆分 create → CreatePage
- [ ] 拆分 creative-session → ShortChainPage
- [ ] 拆分 analysis / report → 各自 Page
- [ ] 拆分 image-generation / packaging → 各自 Page
- [ ] 拆分 creative-intelligence → CIWorkspace
- 每拆一个，删 App.tsx 里对应的 if 分支

### PR-3：清理
- [ ] 删除 useUrlScreen
- [ ] App.tsx 收敛为纯路由壳子（<AppRouter />）
- [ ] 移除所有 setScreen 调用，替换为 `useNavigate()`

## 风险评估

| 风险 | 缓解 |
|------|------|
| 路由参数丢失（`/projects/:id/...`） | 给 Page 自己的 loader 兜底（useParams + 数据 fetch） |
| Breadcrumb 数据流断裂 | 每个 Page 自己渲染面包屑（TopBar 是 AppRouter 提供的壳） |
| navigate 后数据未刷新 | 用 react-router 的 `loader` + `useLoaderData` |
| 深链回流错误 | 加 E2E 测试覆盖所有深链（/projects/:id/*） |

## 工作量估算

- PR-1：2-3 天
- PR-2（每次一个 screen）：7 个 screen × 0.5 天 = 3.5 天
- PR-3：1 天
- 测试 + 回归：2 天
- **总计**：~9 天，~10 个 PR

## 当前 PR（本轮）范围

不做完整迁移——规模太大、风险太高。改为：

1. ✅ **明确现状与目标**（本文件）
2. ✅ **保持 useUrlScreen + App.tsx 现状继续工作**（已验证 typecheck + build 通过）
3. ✅ **新增的 Page（ShortChainPage 等）按目标架构设计**：每个 Page 独立 AppShell + 接受 onBack/onGoHome 回调

下次 sprint 启动 P3 路由迁移专项时，按本计划执行。

## 关联文件

- `src/lib/useUrlScreen.ts` — 当前 hook
- `src/routes.tsx` — 目标路由表
- `src/App.tsx` — 当前 9-screen dispatcher
- `src/main.tsx` — HashRouter 挂载点
