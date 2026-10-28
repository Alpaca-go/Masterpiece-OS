# 交接文档：视觉工作流 + 餐厅知识库（2026-10-28）

接手人：Codex
交接人：本轮 AI 会话
决策人：用户（Kyries）——质量验收、预算、真实素材与对外发布均需用户确认。

## 0. 一句话现状

`main` 已同步到 `cf6850a7`，工作区干净，`repo:verify` / `npm test` / 工作流测试全绿。独立视觉工作流已能对「冯烫烫」完成分析→编译→生图→人工验收（v8），并新增了知识注入、风格控制、案例提取器三件工具。知识库目前是**1 个自有验收案例 + 3 个第三方标杆 + 7 条候选规则 + 3 条单案例假设**，还没有跨项目验证，也还没有自动检索。

## 1. 仓库现状

| 项 | 值 |
|---|---|
| 分支 | `main`，与 `origin/main` 同步于 `cf6850a7` |
| 工作区 | 干净 |
| 产品版本 | `5.0.0-rc.1`（`/VERSION`） |
| 仓库体积 | 约 322 MB（node_modules 约 182 MB + 当前 `.codex-smoke` 约 115 MB） |
| 跟踪文件 | 约 2,078 |
| 历史归档 tag | `archive/rks-2026-10-28`（旧 RKS 分支，已删分支但 tag 保留） |
| 历史副本 ref | `refs/legacy/*`（108 个 ref，来自已删除的 E 盘副本） |
| 外部归档 | `E:\Masterpiece-OS-Archive-2026-10\`（约 4.4 GB，**不要删**，用户要抽查） |

### 门禁状态（本轮结束）

- `npm run repo:verify`：PASS
- `npm test`：1701/1701 PASS
- 独立工作流测试：129/129（命令见 §8）
- `web:typecheck`、`web:build`、`web:smoke`：PASS
- `verify:history-naming`：PASS（docs 编号检查 + 知识条目 slug 检查）

## 2. 产品现状（真实运行）

### 已验收

**冯烫烫**（项目 `3b5b03c0-915a-41aa-9c54-4ffaa166ab88`）

- v8 室内图，2816×1584，SHA-256 `321785e0718e0a9bd39739fe5d0968a8a52ff72a9f540e4b0a23415ef82e88ba`
- task `vnext-task-4b27a3cd-8984-4d49-a63f-cdc87e9e12cc`，run `a146d50c-1e5c-4709-9d52-c261d2db536d`
- `in_image` 模式，图内“冯烫烫”文字正确；自动校验 `passed`
- 验收记录：`docs/evidence/visual-workflow/ftt-acceptance-2026-10-28.md`
- 案例卡：`docs/knowledge/restaurant-cases/ftt-feng-tang-tang.md`
- 注意：菜单价格是模型编的示意，不是客户事实。

### 未验收（可直接继续用）

- **潮牛帮·大鼎牛杂** `b2bc6cf8-fad4-4770-a49b-b6fbee59745b`：分析完成，出过多张候选；无验收记录。
- **蛙耶** `b1d70c9d-6d92-485e-9a8f-ac9339ddfc8a`：分析完成，出过候选；无验收记录。

### 失败样本

- **山野咖啡**（虚构）：两次分析均失败。纯文字/排版品牌板被模型解析成“资产决策值”，校验判无效；只导 brief 也在决策修复后失败。结论：**分析链路需要真实照片素材**，纯文字板不可用；不要把它当成产品 bug 直接改闸门，先补真实素材再试。

### 数据与凭据位置

- 工作流数据根：`%APPDATA%\masterpiece-os-desktop\visual-workflow\`
- 项目：`...\data\projects\<uuid>\`
- 凭据：加密存储于 `...\visual-workflow\credentials\`，`master.key` 本机生成；**绝不提交**
- 当前配置：分析 `qwen3.6-plus`（DashScope 北京 MAAS 端点）、生图 `doubao-seedream-5-0-pro-260628`（Volcengine）

## 3. 本轮实现的代码

全部在独立视觉工作流包内，遵守双向隔离。

### 3.1 语义闸门两条窄修复

`packages/visual-workflow/src/generation-runtime/space/semantic/validate-spatial-semantics.js`

- 完整步行动线里经过招牌：不算装饰身份（`isWayfindingRoute`）
- 入口/门头等位置明确的招牌：算可见要求（`isLocatedVisibleSign`），但 `主视觉/满墙/放大` 仍拦截
- 测试：`packages/visual-workflow/tests/restaurant-knowledge/spatial-semantics/ftt-entry-sign-gate.test.ts`

### 3.2 `logoUsageMode: "in_image"`

- `task-contract.js`、`compile.js`、`short-chain-service.js`、`space/compiler.js`、`deliverable-validator.js`、`deliverable-validator-service.js`、`prompt-preflight-gate.js`
- 图内直接渲染品牌名；校验要求 `logoTextStatus=correct`
- 默认仍是 `post_composite`，别的项目不受影响
- 测试：`tests/in-image-brand-text.test.ts`

### 3.3 `knowledgeContext`（经验注入）

- 字段：`task.knowledgeContext: [{id, source, text}]`，最多 7 条、每条 1200 字符
- 编译为独立的 `Experience Reference (advisory)` 区块，固定附带 guardrail：
  - 只作判断参考，不是硬要求；
  - 不复制具体材料/符号/道具/吉祥物/品牌故事；
  - 不发明素材里没有的道具、角色、文字或品牌资产。
- 默认不出现；只有显式传入才生效
- 测试：`tests/knowledge-context.test.ts`

### 3.4 `styleControls`（显式风格约束）

- 8 个轴：`lighting`、`density`、`materials`、`brandColorArea`、`tradition`、`props`、`shot`、`textDensity`，外加 `priceDisplay`
- 默认 `designer_choice`；`priceDisplay` 默认 `none`（策略 A：图内不出现数字价格）
- 编译为 `Style Controls (explicit)` 区块；`minimal` 文字密度和 `priceDisplay: none` 会追加 negatives
- **只有显式传 `styleControls` 才生效**——这是为了不破坏“标准请求 byte-identical”基线测试
- UI：生图页“风格约束（可选，默认跟随分析）”折叠面板，9 个下拉
- 测试：`tests/style-controls.test.ts`

### 3.5 案例提取器

`scripts/extract-case.mjs`（离线、只读、无模型调用）

```bash
node scripts/extract-case.mjs --project <uuid> \
  --acceptance docs/evidence/visual-workflow/<record>.md \
  --out .codex-smoke/case-drafts/<slug>-draft.md \
  --json .codex-smoke/case-drafts/<slug>-draft.json
```

- 自动填：分析提案 + 最近一次成功运行/验收证据 + 证据路径
- 没有 `--acceptance` 时标题是“最近一次成功运行（未验收）”，**不会冒充验收**
- 人工只填 7 行“最终接受/为什么改/证据” + 1 行规则使用

## 4. 知识库资产

```
docs/knowledge/
  knowledge-injection.md       注入规范、guardrail、品牌取舍标准、测试协议
  style-controls.md            8 轴 + 价格策略 + 首轮对照结果
  seed-project-intake.md       第二/第三个种子项目采集清单
  restaurant-cases/
    README.md                  方法与索引
    ftt-feng-tang-tang.md      冯烫烫：分析/覆盖/验收三段 + 单案例假设
    super-yu.md                第三方标杆：超级渝
    majilong.md                第三方标杆：马记隆
    zhao-deyi.md               第三方标杆：赵得意
    candidate-rules.md         7 条跨案例候选规则 + 3 条单案例假设 + 三组对照结果
```

### 三条单案例假设（语义 slug，禁止再用编号）

- `warm-low-light`：社区烟火气小馆，暖黄偏暗优于明亮均匀；模型默认偏亮。
- `hood-in-structure`：明档排烟罩收进木构/造型，不做独立金属体。
- `lived-in-detail`：菜单板、价签、食材筐提升烟火气；但**价格会编**，必须硬约束。

### 对照结果摘要

- 潮牛帮正对照：`warm-low-light` / `hood-in-structure` 成立；副作用是偏传统（厝角头像庙宇）。
- 蛙耶第一次反例：写进指令时出现道具幻觉（摩托车），两版校验失败（霓虹 + 缺锁定标语）。
- 蛙耶干净反例：改用 `knowledgeContext` + guardrail 后无道具幻觉；未变差，品牌紫保留。
- 潮牛帮 `lived-in-detail`：细节增加，但仍编价格；画面重心偏后厨。
- 潮牛帮 `styleControls`：warm/dense/lived-in 生效，两版都无数字价格（策略 A）。
- 潮牛帮 `textDensity: minimal`：菜单墙消失、无数字，但画面变干净偏疏，`dense` 被削弱。

## 5. 硬约束（必须遵守）

1. 先读 `AGENTS.md`、`CURRENT_BASELINE.md`、`BASELINE_LOCK.md`、`docs/repository/REPOSITORY_CONTRACT.md`。
2. **不要自动刷新** `implementation-integrity.json` 来消除失败；每次改 `packages/visual-workflow/src/**` 或归属 UI 文件，必须显式更新对应 digest。
   - 包内路径相对 `packages/visual-workflow/`；
   - `apps/web/src/features/visual-workflow/*` 的路径相对仓库根，更新时不要拼错根。
3. 不要改冻结 Prompt digest、不要改 Golden 期望值来让测试变绿。
4. 不要新增 `V5`/`V6`/`V18`/`vnext` 这类阶段常量；不要改兼容标识（`r8_6_golden`、`phase9b_quality`、`vnext-1.0` 等）。
5. **禁止编号命名**：
   - docs 里不要出现 `S4`/`P3`/`R10`/`M1` 这类目录或文件名；
   - 知识条目不要用“字母 + 数字”编号（例如 H 后直接跟数字），用 kebab-case slug；
   - `npm run verify:history-naming` 会检查路径和 `docs/knowledge` 正文。
6. **不要破坏标准请求 byte-identical**：新增字段必须显式传入才生效（参考 `styleControls` 的做法）。
7. **价格策略 A**：默认图内不出现数字价格；只有用户提供真实菜单时才允许 `real_menu`。
8. 真实 Provider 调用必须用户授权；Key 只在用户目录或环境变量，不写进仓库。
9. 不要动 `E:\Masterpiece-OS-Archive-2026-10\`、`refs/legacy/*`、`archive/rks-2026-10-28` tag，除非用户明确要求。
10. `.codex-smoke/`、`.runtime/`、`projects/` 等 ignored 路径不要重新 tracked；栅格证据不要放回 `packages/`。

## 6. 已知坑

- **单图对照不是证明**：生图随机性大，1 对 1 只能算观察；至少 2–3 个项目，且最好有反例。
- **校验器会不可用**：曾出现 `DELIVERABLE_VALIDATION_UNAVAILABLE`，状态是 `unverified`，不是内容失败。
- **校验设置冲突**：蛙耶第一次对照因为 avoid 里有“霓虹灯”但品牌本身用射线，且没写锁定标语，两版都 failed；测试前先对齐品牌语言与锁定资产。
- **价格/数字**：提示词拦不住编造价格，必须用 `priceDisplay: none` 校验。
- **文字板密度**：`lived-in-detail` 加 `dense` 容易变成菜单墙；`textDensity: minimal` 能压住，但会削弱密度。
- **纯文字品牌板**：分析链路会失败（山野咖啡），需要真实照片。
- **报告与证据**：历史报告已移出主树到 `E:\Masterpiece-OS-Archive-2026-10\visual-workflow-reports\`；`packages/visual-workflow/reports/` 只剩测试夹具，不要塞回大报告/截图。

## 7. 启动排期与当前待办

> 2026-10-28 定下的顺序是「提取器 → 采样 → styleControls」。下面保留原计划，并标注实际状态（截至 2026-10-28 晚）。

### 7.1 原始排期

**第 1 步：案例提取器 MVP（建议立刻开始）**

- 要做什么：离线脚本，输入 packet + 验收记录 + 迭代记录，输出草稿卡（分析 / 覆盖 / 验收 / 证据），人只补“为什么改”。
- 原计划工期：3–5 个工作日。
- 依赖：无；先用冯烫烫、潮牛帮、蛙耶三张卡验证。
- 产出：`scripts/extract-case.mjs` + 使用说明；三张卡重跑一遍。
- 为什么先做：没有它，后面每多一个项目就要手写 1 小时，知识库一定停更。
- **当前状态：已完成（2026-10-28）**。脚本与规范已入库；冯烫烫草稿带验收，潮牛帮/蛙耶草稿明确标“未验收”。尚未把这两张草稿转正（等用户验收）。

**第 2 步：补齐 2 个种子项目（可与第 1 步并行收集）**

- 目标：3 个案例 → 5 个，覆盖不同约束（小面积 / 外带为主、非 IP 商场店等）。
- 原计划工期：素材收集 1–2 周；入库要等提取器。
- 需要用户：2 个项目的素材（不要空间效果图）、基本约束、验收结果；每张卡 15–30 分钟确认。
- **当前状态：等待用户素材**。采集清单见 `docs/knowledge/seed-project-intake.md`；自有验收案例仍为 1。

**第 3 步：`styleControls` 自选 tag**

- 原计划：5–7 个粗轴（光照、密度、材质、品牌色面积、传统度、生活道具、镜头），默认“让设计师决定”；每个 tag 对应 Prompt 约束和校验预期，并写进 task contract。
- 原计划工期：编译字段 + 测试 3–5 天；Web 面板 3–5 天。
- 依赖：生活细节对照已完成（确认要加价格/数字控制）、提取器完成（tag 命中率需要统计）。
- **当前状态：已完成（2026-10-28，比计划提前）**。实际做了 8 个轴（多一个 `textDensity`）+ 价格策略 A（`priceDisplay: none` 默认）+ 生图页面板；129/129 测试、`web:build` / `web:smoke` 通过。
- 尚未：`dense + minimal` 组合验收、tag 命中率统计。

**第 4 步：规则复核（持续）**

- 每月一次：按“采纳 / 否决 / 改判”统计每条 slug 的命中率；没有新证据的假设降级或下架。
- **当前状态：未开始**。已有 6 组对照，但还缺“注入次数 / 采纳率 / 否决率”的统计。

### 7.2 调整后的实际顺序

第 1 步（已完成）→ 第 3 步（已完成）→ 第 2 步（等素材）→ 第 4 步（等统计）→ 检索与验收闭环。

### 7.3 当前待办（按优先级）

#### P0 — 不需要新素材

1. **`dense + minimal` 组合验证**（潮牛帮，约 ¥1.2）
   - 目标：既有密度，又没有菜单墙。
   - 验收：人群/物件密度可读，文字板 ≤2，无数字价格，校验 passed。
2. **规则复核**：把 3 条假设按现有对照标成“支持（带边界）/不确定”，不要升级为规则。
3. **`styleControls` 的 UI 小修**：面板里的“镜头”与表单的“镜头/构图”可能重复，确认是否隐藏其中一个。

#### P1 — 需要用户素材

4. **第二个自有验收项目**（按 `seed-project-intake.md` 收集）
   - 目标：自有验收案例 1 → 2。
   - 完成后用提取器生成草稿，人补 7 行，入库。
5. **第三个自有项目**（目标 3 个），再讨论规则升级。

#### P2 — 产品化

6. **验收闭环**：Web 增加“已验收”状态 + 项目详情页“归档为案例”按钮（host operation 包装提取器）。
7. **检索原型**：输入 brief，返回 3 条先例 + 1 条反例；先只读，不自动注入。
8. **规则统计**：每条 slug 的注入次数、采纳/否决、失效条件。

## 8. 运行手册

```bash
# 必备门禁
npm run repo:verify
npm test
npm run web:typecheck
npm run web:build
npm run web:smoke

# 独立工作流测试（没有 npm script，用显式文件列表）
$files = Get-ChildItem packages/visual-workflow/tests -Recurse -File -Filter *.test.ts
npx tsx --test $files

# 历史/知识命名
node scripts/verify-history-naming.mjs

# 案例提取
node scripts/extract-case.mjs --project <uuid> --out .codex-smoke/case-drafts/x.md --json .codex-smoke/case-drafts/x.json
```

真实生图没有现成 npm script；本轮用临时脚本调用 `createVisualWorkflow` 的 `visual-workflow:compile` / `visual-workflow:generate`。关键点：

```js
const wf = createVisualWorkflow({ root: '%APPDATA%/masterpiece-os-desktop/visual-workflow' });
const compiled = await wf.operations['visual-workflow:compile']({}, { projectId, task: {...} });
await wf.operations['visual-workflow:generate']({}, { projectId, taskId: compiled.taskContract.taskId });
```

必填 task 字段：`deliverableFamily`、`subtype`、`shot`、`aspectRatio`、`count`、`currentInstruction`、`generationBasis: 'standard'`、`referenceAssetIds: []`、`logoUsageMode`。
可选：`knowledgeContext`、`styleControls`。

## 9. 关键文件索引

| 用途 | 路径 |
|---|---|
| 工作流组成根 | `packages/visual-workflow/src/service.js` |
| 任务契约 | `packages/visual-workflow/src/generation-runtime/generation/task-contract.js` |
| Space 编译器 | `packages/visual-workflow/src/generation-runtime/space/compiler.js` |
| 语义闸门 | `.../space/semantic/validate-spatial-semantics.js` |
| 校验器 | `.../generation/deliverable-validator.js`、`.../runtime/image-generation/deliverable-validator-service.js` |
| UI | `apps/web/src/features/visual-workflow/VisualWorkflowWorkspace.tsx`、`api.ts` |
| 提取器 | `scripts/extract-case.mjs` |
| 知识库 | `docs/knowledge/` |
| 验收记录 | `docs/evidence/visual-workflow/` |
| 历史文档索引 | `docs/history/INDEX.md` |

## 10. 交接检查清单

- [ ] `git status` 干净，`main` 与 `origin/main` 同步
- [ ] `npm run repo:verify` PASS
- [ ] 独立工作流测试 129/129
- [ ] `verify:history-naming` PASS
- [ ] 读 `docs/knowledge/knowledge-injection.md` 与 `style-controls.md`
- [ ] 读 `docs/knowledge/restaurant-cases/ftt-feng-tang-tang.md` 的“三段证据”
- [ ] 确认用户对价格策略 A、`in_image` 默认、真实调用授权的口径

## 11. 给接手人的一句提醒

这套知识库不是“自动学习系统”，是**人工策展 + 建议注入 + 硬约束**。它的价值取决于两件事：**有没有新的验收项目**，以及**有没有把“为什么改”记下来**。不要为了让它看起来更智能而放松验收、自动写原因或跳过反例。
