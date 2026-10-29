# 交接文档：视觉工作流 + 知识库 + 参考图集（2026-10-29）

新 session 接手用。上一份 `2026-10-28-knowledge-system-handoff.md` 仍然有效，但本文覆盖 10-29 的新增内容；两份冲突时以本文为准。

决策人：用户（Kyries）。质量验收、预算、真实素材、对外发布均由用户确认。

## 0. 当前状态

| 项 | 值 |
|---|---|
| 分支 | `main`，与 `origin/main` 同步于 `96ea05b3` |
| 工作区 | 干净 |
| 工作流测试 | **133/133**（新增 4 个参考图集测试） |
| `repo:verify` | PASS |
| `web:typecheck` / `web:build` / `web:smoke` | PASS |
| 知识库 | 1 个自有验收案例 + 3 个第三方标杆 + 2 份未验收草稿 + 3 条假设 |

## 1. 10-28 之后新增了什么

### 用户侧可用

1. **`styleControls` 生图面板**（`24deecd0`）
   - 生图页“风格约束（可选）”折叠区，9 个下拉；
   - 8 个轴 + `priceDisplay`，价格默认“不出现数字”；
   - 只有显式传 `styleControls` 才进入 Prompt，旧请求 byte-identical 基线不变。

2. **`textDensity` 轴**（`24deecd0` + `cf6850a7`）
   - `minimal` / `moderate` / `rich`；
   - `minimal` 会追加“不要菜单墙”的 negative，并要求“密度靠人物、物件和灯光，不靠文字”。

3. **参考图集（Reference Atlas）**（`ce71129f` + `96ea05b3`）
   - 视觉工作流页顶部“参考图集”按钮；
   - 新建条目、拖拽上传、备注、导出；
   - 数据在用户目录，不直接写仓库；导出后手动复制入库。

### Codex 侧已完成

4. **dense + minimal 组合对照**（`d31b1d28`）
   - 潮牛帮，同一分析，只改 `textDensity`（moderate vs minimal）；
   - 结论：**部分达到目标**。文字载体 8 → 5，两版都无数字价格；但 minimal 仍有 3 处非品牌文字载体，未达到“≤2/最多一块”，也未证明就餐氛围更好；
   - 因此**不能写成“组合验收通过”**，更不能升级为规则；
   - 证据在 `.codex-smoke/dense-minimal-2026-10-29/`（不提交）。

5. **规则状态复核**（`b8df7f1f`）
   - `warm-low-light`：**支持-带边界**（照度与密度等变量共同变化，无法单独归因）；
   - `hood-in-structure`：**支持-带边界**（可落地性、消防未验证）；
   - `lived-in-detail`：**不确定**（细节增多 ≠ 氛围更好；有编造价格与重心偏后厨）。

6. **生图表单镜头去重**（`a8269967`）
   - 风格面板不再重复“镜头”，只保留表单里的镜头/构图。

## 2. 参考图集怎么工作（新 session 重点）

### 网页入口

「视觉分析与生图」→ 顶部 **参考图集**。

- 左栏：条目列表 + 新建；
- 右栏：备注、拖拽区、缩略图、导出/删除。

### 数据位置

```
%APPDATA%\masterpiece-os-desktop\visual-workflow\reference-atlas\<slug>\
  meta.json
  images\img-<uuid>.png|jpg|webp|gif
exports\<slug>\
  notes.md
  images\
```

默认**不写仓库**。原因是避免拖一张图就把工作区弄脏；入库必须显式“导出 → 复制 → 提交”。

### 操作

| operation | 作用 |
|---|---|
| `visual-workflow:atlas-list` | 列出条目 |
| `visual-workflow:atlas-create` | 新建（slug 必须 kebab-case） |
| `visual-workflow:atlas-update` | 改备注 |
| `visual-workflow:atlas-upload` | base64 图片，最多 12 张/批，单张 ≤12MB |
| `visual-workflow:atlas-image` | 返回 data URL |
| `visual-workflow:atlas-delete` | 删除条目与图片 |
| `visual-workflow:atlas-export` | 写 `notes.md` + 复制图片到 exports |

### 重要：重启 App

新增 operation 注册在宿主进程里，**旧的 App 进程不会热加载**。新 session 第一次验证时：

1. 重启正在用的 App（不是新开一个服务）；
2. 刷新页面；
3. 建一个测试条目，拖 2 张图，导出，确认 `exports` 下有 `notes.md` 和 `images/`。

如果按钮不出现：先确认 `web:build` 产物是新的，再确认宿主已重启。

### 模板

- `docs/knowledge/reference-atlas/README.md`
- `docs/knowledge/reference-atlas/TEMPLATE.md`

## 3. 知识库与规则现状

### 案例

- 冯烫烫：唯一自有验收案例（v8，`in_image`，图内品牌文字正确）。
- 潮牛帮、蛙耶：分析完成、出过图，但**未验收**；提取器草稿在 `.codex-smoke/case-drafts/`，标题是“最近一次成功运行（未验收）”。

### 规则

7 条跨案例候选规则（来自 3 个第三方标杆）+ 3 条单案例假设：

| slug | 状态 |
|---|---|
| `warm-low-light` | 支持-带边界 |
| `hood-in-structure` | 支持-带边界 |
| `lived-in-detail` | 不确定 |

**没有一条升级为跨案例规则。** 原因是自有验收案例只有 1 个。

### 已有对照（不要重复烧钱）

- 潮牛帮：暖光/烟罩正对照；
- 蛙耶：第一次反例（写进指令，道具幻觉）；
- 蛙耶：干净反例（`knowledgeContext` + guardrail）；
- 潮牛帮：`lived-in-detail`；
- 潮牛帮：`styleControls` 首轮；
- 潮牛帮：`textDensity minimal`；
- 潮牛帮：`dense + minimal`（Codex，2026-10-29）。

## 4. 硬约束

1. 先读 `AGENTS.md`、`CURRENT_BASELINE.md`、`BASELINE_LOCK.md`、`docs/repository/REPOSITORY_CONTRACT.md`。
2. 改 `packages/visual-workflow/src/**` 或 `apps/web/src/features/visual-workflow/**`，必须显式更新 `implementation-integrity.json`：
   - 包内文件路径相对 `packages/visual-workflow/`；
   - UI 文件路径相对仓库根；
   - 不得自动刷新 digest 来消除失败。
3. 不改冻结 Prompt/Golden 期望值；不改兼容标识。
4. 禁止编号命名：docs 路径不要 `S4/P3/R10/M1`；知识 ID 用 kebab-case，不要“字母 + 数字”编号。
5. 新字段必须显式传入才进入 Prompt，保护标准请求 byte-identical 基线。
6. 价格策略 A：默认图内不出现数字价格；只有用户提供真实菜单时才 `real_menu`。
7. 参考图集默认写用户目录；导出是显式动作；不得把参考图集当验收案例。
8. 真实 Provider 调用需用户授权；Key 只在用户目录或环境变量。
9. 不动 `E:\Masterpiece-OS-Archive-2026-10\`、`refs/legacy/*`、`archive/rks-2026-10-28`。
10.  `.codex-smoke/`、`.runtime/`、大截图、运行产物不提交。

## 5. 已知坑

- **单图不是证明**：dense+minimal 也是单对单图，只能写观察。
- **价格拦不住**：提示词写“价格必须真实”无效，必须 `priceDisplay: none` + 校验。
- **文字密度会拉扯密度**：`minimal` 压住菜单墙，但画面变干净偏疏；Codex 的实验也没达到“≤2 文字载体”。
- **参考图集不是案例**：没有分析提案、没有否决样本、没有验收；只能产出风格描述。
- **纯文字品牌板会失败**：分析链路需要真实照片（山野咖啡）。
- **校验器可能不可用**：`unverified` ≠ 内容失败。
- **蛙耶第一次反例的教训**：avoid 里有“霓虹灯”但品牌本身用射线，且没写锁定标语，两版都 failed；测试前对齐品牌语言与锁定资产。
- **参考图集图片上限**：12 张/批、12MB/张、png/jpeg/webp/gif。

## 6. 新 session 第一步（建议）

```bash
git switch main
git pull --ff-only
npm run repo:verify
npm test
$files = Get-ChildItem packages/visual-workflow/tests -Recurse -File -Filter *.test.ts
npx tsx --test $files
node scripts/verify-history-naming.mjs
```

然后：

1. 读本文 + 旧 handoff + `docs/knowledge/style-controls.md` 的 §9（Codex 的 dense+minimal）；
2. 重启 App，验证参考图集：建条目 → 拖 2 图 → 写备注 → 导出 → 复制到 `docs/knowledge/reference-atlas/<slug>/` → 提交；
3. 检查 `reference-atlas` 的 `notes.md` 图片名与 `images/` 是否一致；
4. 如果 UI 有问题，先修 UI，不要先加新功能。

## 7. 待办（按优先级）

### P0 — 立即可做

1. **参考图集浏览器验收**：拖拽、缩略图、备注保存、导出路径、删除。
2. **参考图集首个真实条目**：用一套用户认可的方案，按 TEMPLATE 填写并入库。
3. **更新旧 handoff 的过期数字**（129 → 133），或直接在旧文档顶部加“已被 10-29 取代”的指针。

### P1 — 需要用户素材

4. **第二个自有验收项目**：按 `docs/knowledge/seed-project-intake.md`，目标自有案例 1 → 2。
5. **第三个项目**：目标 3 个后再讨论规则升级。

### P2 — 产品化

6. **验收状态 + 一键归档**：Web 增加“已验收”状态，项目详情页“归档为案例”按钮（包装提取器）。
7. **检索原型**：输入 brief，返回 3 条先例 + 1 条反例 + 2 条参考图集描述；先只读，不自动注入。
8. **规则统计**：每条 slug 的注入次数、采纳/否决、失效条件。

## 8. 命令

```bash
# 门禁
npm run repo:verify
npm test
npm run web:typecheck
npm run web:build
npm run web:smoke
$files = Get-ChildItem packages/visual-workflow/tests -Recurse -File -Filter *.test.ts
npx tsx --test $files
node scripts/verify-history-naming.mjs

# 提取器
node scripts/extract-case.mjs --project <uuid> --acceptance <record.md> --out <draft.md> --json <draft.json>
```

真实生图仍用临时脚本调用：

```js
const wf = createVisualWorkflow({ root: '%APPDATA%/masterpiece-os-desktop/visual-workflow' });
const compiled = await wf.operations['visual-workflow:compile']({}, { projectId, task: {...} });
await wf.operations['visual-workflow:generate']({}, { projectId, taskId: compiled.taskContract.taskId });
```

## 9. 文件索引

| 用途 | 路径 |
|---|---|
| 参考图集后端 | `packages/visual-workflow/src/service.js`（`atlas-*`） |
| 参考图集 UI | `apps/web/src/features/visual-workflow/ReferenceAtlasPanel.tsx` |
| 工作流入口 | `apps/web/src/features/visual-workflow/VisualWorkflowWorkspace.tsx` |
| 图集模板 | `docs/knowledge/reference-atlas/README.md`、`TEMPLATE.md` |
| 风格控制 | `docs/knowledge/style-controls.md` |
| 注入规范 | `docs/knowledge/knowledge-injection.md` |
| 案例卡 | `docs/knowledge/restaurant-cases/` |
| 提取器 | `scripts/extract-case.mjs` |
| 旧 handoff | `docs/handoff/2026-10-28-knowledge-system-handoff.md` |

## 10. 给新 session 的提醒

- 不要为了让图“更好看”而放松验收；参考图集只是词汇，不是证据。
- 不要新增编号；不要把参考图集写进案例库。
- 不要一次加很多功能：先让图集在浏览器里跑通，再谈检索。
- 真实调用要用户授权；预算要先问。
