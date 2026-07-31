# Changelog

## 5.0.0-rc.1 — 2026-07-31

> 仓库清理与版本对齐：合并 v5 引擎 / V6 Creative Production / V18 Creative Director / vnext 短链路 / Phase 1.5 Quality Recovery Loop 的工作，正式发布版本统一为 5.0.0-rc.1；待真实 Provider smoke 通过与分支治理完成后 cut 为 5.0.0。

### 仓库治理（Stage 0–8 汇总）

- 产品版本源统一为 `/VERSION`（`5.0.0-rc.1`），由 `scripts/sync-product-version.mjs` 同步到根 / `apps/desktop` / `apps/cli/src/runtime-trace.js DEFAULT_APP_VERSION`。
- 启用 npm Workspaces；单根 `package-lock.json`，`apps/desktop/package-lock.json` 已删除。
- 14 个内部包统一为 `@masterpiece/*`，`{private:true, version:"0.0.0"}`；175 处深层 `packages/*/src/*` 相对 import 改写为 `@masterpiece/*`。
- `apps/desktop/src/{shared/types.ts,main/reference-asset-inspector.ts}` 修复 `'/index'` → `'/index.ts'` 子路径，`tsc --noEmit` 0 错误。
- 文档与目录归并到 `docs/{product,architecture,development,releases,archive/{v3.3,v4.0}}`；`docs/validation/*` 迁入 `evaluation/reports/`；`examples/` 旧格式 Demo、`knowledge/`、`rules/`、`standards/`、`skills/masterpiece-os/` 全部迁入 `docs/archive/v4.0/`；`prompt-templates/image-generation/` 迁入 `docs/development/prompt-templates/`，5 个 `sourcePath` 字符串同步更新。
- Desktop 正式 UI 只保留 Short-Chain 路径，移除 `vNext / Legacy` 模式切换。
- `.codex-smoke/` 9 个 tracked 文件（44 MB，含 45 MB `app.asar`）解除追踪，数据保留在磁盘供本地 replay。
- 6 个 verify gate 全部 PASS；`npm test` 301 / `npm run cli:test` 38 / `npm run desktop:test` 265 / `npm run desktop:build` PASS。
- 分支治理决策表：`docs/development/repository/reference-branch-disposition.md`。
- 完成报告：`docs/releases/5.0-repository-consolidation.md`。
- 工程现实（给 AI / 开发者）：`AGENTS.md` 已重写为 5.0 视角。

### v5 引擎：一次深度 Creative Director 推理

- 分析层重构为 `VisualDecisionPacket` 单一事实来源（`apps/desktop/src/main/visual-decision-packet.ts` + `packages/project-contracts/src/index.ts`）。
- `视觉方案升级报告.md` 改为从 Packet 确定性编译（`apps/desktop/src/main/visual-decision-report-compiler.ts`），每行带 `[User Confirmed]` / `[Source Fact]` / `[AI Diagnosis]` / `[Creative Proposal]` / `[Unknown]` 五种来源标签。
- 新增 Project-Specific Generation Contract、Media Translation V2、Prompt Contract、Prompt Preflight Gate。
- Provider 抽象：`packages/model-runtime`（qwen / openai-compatible），`packages/image-provider-dashscope`。
- 性能预算 10 分钟，可接受 15 分钟；超过 5 张图片自动生成 Contact Sheet。
- 唯一正式输出仍为 `视觉方案升级报告.md`；`--force-reasoning` 跳过精确推理缓存；API Key 仅从环境变量读取。

### Desktop 桌面端（V6 / V18 / vnext）

- **V6 Creative Production**：Creative Session、Style Profile、Locked Assets、Anchor Candidate、Visual Canon、Reference Pack、Generation Series（队列 / 重试 / 恢复 / 归档）、Revision、Formal Assets、Quick Style Extraction。
- **V18 Creative Director Runtime**：Reading 阶段、Instruction Compiler、Provider Bridge、Resume / Retry、Model Benchmark、Generation Blueprint、Visual Exploration、Designer Selection。
- **vnext 短链路**：`VisualDecisionPacket → ProjectSpecificGenerationContract → MediaTranslation → PromptContract → Preflight → Adapter`，作为默认生图路径。
- **Logo 锁定协议**：默认 `post_composite` 路线，参考图里永不画 logo；上游三处 `'reference'` 默认已切到 `'post_composite'`。
- **缓存 preflight 失败恢复**：`vnext-service.start()` 检测到缓存 `!== 'pass'` 时，从 `task-contract.json` 重建并复用 `taskId` 覆盖同一输出目录，避免泄漏到新目录。
- Electron + React 19 + TypeScript 7 + electron-vite；新增 `MASTERPIECE_WEB_MODE=1` 浏览器开发模式，Web 端通过本地 RPC 复用全部 IPC handler。

### Phase 1.5：项目内质量恢复与公共能力升级

- 6 种失败类型与一一对应的项目层修复器：输入证据不足 / 字段缺失 / 字段冲突 / 媒介转译太浅 / Prompt 编译丢信息 / Prompt 正确但图片执行失败。
- Project-Specific Quality Contract 与 Generation Contract 独立生成、独立评估，两者一致才算 pass。
- 内部并行 2-3 个候选方向，评审后只展示最优 1 个（用户操作负担不变）。
- 公共代码修改门槛：两个以上无关项目同型失败 或 明确工程错误。
- Contract Decay Audit：7 种 drift 模式 + 25 文件白名单 + 4 步执行流程。
- Analysis 自愈：analysis-runtime 引入 `repair-planner` / `deterministic-repair` / `evidence-safe-merge` / `field-repair-policy` / `schema-migrations` / `analysis-completion-orchestrator`。

### 共享包层

- 新增 14 个 `packages/*` 共享运行时（`analysis-runtime` / `creative-production-runtime` / `image-generation-runtime` / `image-generation-contracts` / `image-generation-adapter` / `image-provider-dashscope` / `document-ingestion` / `model-runtime` / `model-registry` / `model-benchmark` / `evaluation-loop-contracts` / `project-contracts` / `reference-asset-inspector` / `runtime-core`），全部 1.0.0 共享发布。
- `project-contracts` 主导跨模块类型单一事实源，含 35+ 状态机 `CreativeWorkflowState`。

### 验证门禁

- 引擎测试 203/203、桌面测试 170/170、`desktop:build`（含 typecheck）、`verify:current-flows`（离线，不调真实模型 API）、`verify:no-obsolete-code`、`verify:production-boundaries`、`verify:no-project-specific-production-rules` 全部通过。
- 一次用户授权的真实 Provider 端到端 smoke 已记录：冯烫烫项目（`qwen3.6-plus` 分析 151 s + `dashscope / wan2.7-image-pro` 生图 9.9 s）。
- **V18 Phase 7 真实 Provider 视觉 A/B 仍待用户授权**——这是发版前最后一个硬阻塞。

### 仓库治理

- 5 个本地 v3 残留分支删除（内容已归档至 `archive/brand-dna-*` 标签）：`v5-desktop`、`feature/brand-dna-report-v2`、`feature/brand-dna-stability-performance`、`feature/token-usage-tracking`，加上 `experiment/execution-oriented-directions-v2`（5 个）。
- 版本号统一：`VERSION`、根 `package.json`、`apps/desktop/package.json` → 5.0.0；`packages/model-registry` 从 2.0.0 对齐到 1.0.0；其余 packages 保持 1.0.0。
- `.gitignore` 显式列出 `.tmp-*.log` / `.tmp-*.err.log` / `.tmp-*.out.log`，并删除根目录历史临时日志。
- 暂未处理（用户已确认 skip）：PR #7（`feature/reference-led-visual-direction` retrieval-first 方向）、9 个已完全并入 HEAD 的本地分支（`main` 除外）、`.codex-smoke/` 中 9 个被跟踪的 45 MB smoke 状态文件。

## 3.3.0 — 2026-07-14

- 将 Analysis 与 Creative Brief 完全分离：研究、证据、推理和完整风险只进入 `01-Analysis.md`。
- 新增纯信息组织层 Creative Brief Compiler，把批准信息压缩为八部分高密度 Brief，不重新推理或修改 Brand DNA。
- 用 `03-Design-Decisions.md` 替代 Knowledge Review，集中保存关键决策、原因、取舍和批准状态。
- Standard / Studio 固定生成四份正式输出；Quick 仅生成 `02-Creative-Brief.md`。
- GPT 专用 Brief 只在内存生成，不创建第五个正式文件。
- 新增七阶段 Performance Profiling；默认输出控制台，`--profile` 写入 `outputs/debug/performance.json`。
- Design Review 改为检查八部分 Brief、信息压缩结果和 Analysis/Brief 分离状态。

## 3.2.0 — 2026-07-14

- 新增独立 Brand DNA Decision 契约，强制执行 Original Intent → Industry Benchmark → Creative Decision → Approved Brand DNA。
- 只有决策链完整且显式批准时，九个 Approved Brand DNA 维度才会进入 Creative Brief。
- 旧 `creativeReasoning.visualDNA` 仅保留为迁移候选，阻止用户视觉方案被静默升级为品牌结论。
- Creative Brief 第五部分由 Visual DNA 改为 Approved Brand DNA；Design Review 同步检查决策链与批准状态。
- 明确 GPT Collaboration：输入为已核验视觉方案与 Creative Brief，GPT 自主完成图片规划和生成。
- 保持四份固定 Markdown，不恢复 PKG、VI、Poster、图片数量、画幅、任务卡或 Prompt 规划。
- Thinking Framework 的视觉问题改为检查决策追溯与 Approved Brand DNA，不保存项目答案。
- 增加三类决策防绕过测试，并迁移三个匿名回归样例到 v3.2。
- 在架构说明中定义真实项目 A/B 验证口径：总耗时、首图质量、满意度、返工和品牌一致性。

## 3.1.0 — 2026-07-14

- 将产品重新定位为 AI Creative Brief Generator：系统理解品牌，专业创意团队负责设计。
- 核心流程调整为 Visuals → Brand Lock → Benchmark → Creative Reasoning → Creative Brief。
- Creative Reasoning 升级为 Brand Identity、Brand Positioning、Design Language、Emotional Direction、Visual DNA、Photography Direction、Design Risks、Must Keep、Can Explore 与 Design Goal 十部分契约。
- `02-Creative-Brief.md` 替代 `02-Chat生图任务包.md`；每次固定生成四份编号报告。
- 删除流水线内部缺图矩阵、图片数量、画幅比例、任务卡与 Chat 生图执行计划。
- Knowledge 重构为 `knowledge/thinking/` 下的五类开放思考问题，不再把项目结论升级为答案或自动规则。
- Design Review 改为 Creative Brief 证据与准备度检查；停止能力评分和成长历史写入。
- 保留旧模式参数兼容映射，但所有入口统一执行 Creative Brief 工作流。
- CLI、模板、Skill、规则、文档和回归测试全部更新到 v3.1。

## 3.0.0 — 2026-07-14

- 新增 Creative Reasoning，在图片规划前输出品牌定位、关键词、气质、视觉 DNA、摄影语言与创意方向。
- 新增 Design Risks，以问题、原因、避免方式替代默认完整 Design Critic 链路。
- Chat 生图任务包重构为“品牌设计意图 + 图片任务”，任务卡默认继承上层约束。
- 新增 `visualInspection` 契约；未完成逐张视觉核验时明确标记待确认，不以文件名、OCR、尺寸或元数据伪造画面事实。
- 默认启用 Fast Mode，只生成项目分析报告和 Chat 生图任务包。
- 新增 `--mode review`、`--mode research`、`--review` 与 `--research`；完整评审仍保持四份既有文件名。
- Fast Mode 跳过 Knowledge、Design Review 与历史写入；所有模式均禁止自动修改正式 Knowledge 或执行 Git 操作。

## 2.0.0 — 2026-07-14

- 新增 Design Review & Growth Engine，以带依据的成长评审替代无依据的主观打分。
- 新增 Brand、Packaging、Visual System、Portfolio 与 Benchmark 专项评审。
- 新增八维能力雷达、七项跨项目趋势、下一阶段建议和 Top 3 训练路线。
- 新增六类 Action Items，所有 Knowledge、Rule、Prompt、Template 修改仍需人工执行。
- 新增 `history/reviews/` 本地 JSON/Markdown 历史记录，真实记录默认不进入 Git。
- 正式输出收敛为四份编号报告；`--debug` 时额外生成结构化 JSON。
- 增加首次项目、第二项目趋势、评分依据、建议完整性及历史记录回归测试。

## 1.2.0 — 2026-07-14

- 新增仓库内 `projects/` 标准工作目录及 `.gitkeep`。
- 新增 `--project` 项目选择、单项目自动选择和多项目防误选。
- 分析启动前自动创建 `input/`、`outputs/` 并移动根目录素材。
- 初始化支持嵌套目录、旧版 `inputs/` 迁移、幂等运行与全量冲突预检。
- 增加路径穿越、符号链接越界、覆盖和部分移动失败保护。
- Git 只跟踪 `projects/.gitkeep`，真实项目、源文件和生成报告保持忽略。

## 1.1.0 — 2026-07-14

- 新增 Knowledge Candidate 数据契约与候选报告。
- 新增 Knowledge Analysis，对候选执行 New、Update、Ignore、Project Only 分类。
- 新增 Packaging、Brand、VI、Poster、Portfolio 知识库健康度分析。
- 新增 P0–P3 优先级和人工审核清单。
- Approved Rule 目录保持只读，支持 JSON 与带 Frontmatter 的 Markdown。
- 默认项目输出目录调整为 `outputs/`，每次运行保证生成三个规范文件。

## 1.0.1 — 2026-07-14

- 将带有真实项目名称的测试素材替换为三个明确匿名的自制 Demo。
- 纳入 GitHub 文件管理规范并扩充项目文件忽略规则。
- 增加仓库政策自动检查，阻止客户源文件与项目交付物误提交。

## 1.0.0 — 2026-07-14

- 初始化 Masterpiece-OS 仓库与目录结构。
- 新增零依赖 `masterpiece-os` CLI。
- 新增 ZIP、PDF、PPTX、PNG/JPEG/GIF/WebP/SVG 素材盘点。
- 新增 Brand Lock、行业/项目类型识别、可选联网对标。
- 新增视觉优化报告、缺图矩阵、13 张图片规划与 Chat 生图任务包。
- 新增三套回归项目及自动测试。
