# 阶段 0:仓库勘察(只读)报告

> 目标:为"如何合并旧分支、统一版本号"提供数据基础。
> 状态:**已勘察完成,未做任何写操作**(无 commit / push / branch -D / tag -d)。
> 数据采集时间:2026-07-31(代码分支以 330fe4c 为准,origin/main 5f9ac06)

---

## 0.1 仓库快照

| 维度 | 值 |
|------|------|
| 当前分支 | `codex/visual-memory-engine-v1` |
| 当前 HEAD | `330fe4c` 2026-07-31 15:55 +0800 `feat: integrate structured analysis self-healing` |
| origin HEAD | `5f9ac06` 2026-07-23(落后当前 12 commits) |
| 远端 | `Alpaca-go/Masterpiece-OS.git`(默认 `origin/main`) |
| Working tree | 9 modified + 2 untracked(无 staged) |

### 当前未提交改动(共 9 文件 + 2 文档, +436/-13)

| 文件 | 性质 | 行数 |
|------|------|------|
| `apps/desktop/src/main/image-generation/vnext-service.ts` | Bug #4 | +52 |
| `apps/desktop/src/main/project-context-vnext-builder.ts` | Bug #2(2 处) | +10 |
| `apps/desktop/src/main/visual-decision-packet.ts` | Bug #2 | +11 |
| `apps/desktop/src/renderer/src/components/VNextGenerationWorkspace.tsx` | Bug #2(UI) | +30 |
| `apps/desktop/tests/repair-planner.test.ts` | 回归测试 | +49 |
| `apps/desktop/tests/vnext-image-generation-service.test.ts` | 回归测试 | +139 |
| `packages/analysis-runtime/src/field-repair-policy.ts` | Bug #1 | +12 |
| `packages/creative-production-runtime/src/project-generation-contract.js` | Bug #3 | +85 |
| `tests/project-generation-contract.test.js` | 回归测试 | +61 |
| `docs/phase1.5-project-quality-recovery-loop.md` (新) | 文档 | 13.7 KB |
| `docs/phase1.5-contract-decay-audit.md` (新) | 文档 | 16.3 KB |

> 全部改动已通过 `verify:current-flows` / `tsc --noEmit` / `verify:no-obsolete-code` / `verify:production-boundaries`。

---

## 0.2 本地分支(共 6 个,含当前)

| 分支 | HEAD | 日期 | vs origin/main (ahead/behind) | vs 当前 HEAD (ahead/behind) | 关键观察 |
|------|------|------|--------------------------------|----------------------------|---------|
| **`codex/visual-memory-engine-v1`** ★当前 | 330fe4c | 07-31 | **177 / 12** | 0 / 0 | 集成主线,已含所有本地 feature |
| `experiment/pre-overfitting-baseline` | 9b1543e | 07-31 | 166 / 16 | **4 / 4** | 与 HEAD 平行演化,有 4 个独立 commit 未并入 |
| `feature/visual-upgrade-engine-v1` | 8b3c137 | 07-28 | 109 / 12 | 0 / 0 | **已并入当前 HEAD** |
| `feature/image-generation-deliverables` | 5191a49 | 07-28 | 103 / 12 | 0 / 0 | **已并入当前 HEAD** |
| `feature/image-generation-v1` | 49c9c61 | 07-27 | 55 / 12 | 0 / 0 | **已并入当前 HEAD**(与下一个分支 HEAD 相同) |
| `feature/image-generation-multi-source` | 49c9c61 | 07-27 | 55 / 12 | 0 / 0 | **已并入当前 HEAD** |

### 关键发现:本地 feature 分支"全已合并"

5 个本地 feature 分支(除 `experiment/pre-overfitting-baseline` 外)在当前 HEAD 上都"零差异"。这意味着:

- 这些分支可以**完全删除**(无内容丢失)
- 它们相对于 `origin/main` 的 ahead 是因为 HEAD 走得更远,不是它们有独家内容
- 删除时**不要用 `-D` 强推**,用普通 `git branch -d`(已 merge 才能删),安全

### 唯一活跃的实验分支

`experiment/pre-overfitting-baseline`:
- merge-base 与 `origin/main` 相同(`f3a5b14`)
- 与 HEAD 双向偏离 4/4(双向平行演化)
- 名字带"pre-overfitting",判断是性能/质量基线
- **建议保留**,由你判断要不要并入或归档

---

## 0.3 远端分支(共 13 个,含 11 个 feature/branch)

| 远端分支 | HEAD | 日期 | 类型 |
|---------|------|------|------|
| `origin/main` | 5f9ac06 | 07-23 | 主干 |
| `origin/develop` | 5f9ac06 | 07-23 | 等同 main |
| `origin/codex/visual-memory-engine-v1` | 330fe4c | 07-31 | 与本地同名同步 |
| `origin/feature/document-context-extractor` | a8b550c | 07-26 | 远端独有 |
| `origin/feature/image-generation-creative-director` | c9e2955 | 07-27 | 远端独有 |
| `origin/feature/image-generation-deliverables` | 5191a49 | 07-28 | 与本地同名同步 |
| `origin/feature/image-generation-multi-source` | 49c9c61 | 07-27 | 与本地同名同步 |
| `origin/feature/image-generation-v1` | 49c9c61 | 07-27 | 与本地同名同步 |
| `origin/feature/reference-anchor-workflow` | b8bea75 | 07-26 | 远端独有 |
| `origin/feature/reference-asset-selection-protocol` | c12e76f | 07-25 | 远端独有 |
| `origin/feature/reference-led-visual-direction` | cbe19aa | 07-24 | 远端独有 |
| `origin/feature/visual-context-contract` | 4f484b5 | 07-26 | 远端独有 |
| `origin/refactor/repository-slimming-v2` | c863a54 | 07-26 | 远端独有 |

### 关键发现:远端 6 个独有分支未在本地

- 5 个 `feature/reference-*` 都是 reference-anchor 系列,**没有 merge 到当前 HEAD**
- `refactor/repository-slimming-v2` 也是远端独有
- 这些在本地没有对应分支,**无法用 `git branch -d` 清理**(远端分支不在本地分支列表里)
- 如果要清理,需要走 PR 流程:开 PR 决定要不要并入,或者直接远端发 issue 让 owner 删

> 阶段 0 只摸数据,不动远端。下一步决策要你拍板。

---

## 0.4 tag 列表(共 12 个)

| tag | 指向 | 用途猜测 |
|-----|------|---------|
| `v1.0.1` | 2aed79d | 07-14,**唯一正式版本号** |
| `pre-overfitting-baseline-v1` | 21f4fc3 | 07-30,实验基线 |
| `retrieval-first-core-beta-0.5` | 2a55628 | 07-23,Beta 0.5 标记 |
| `archive/brand-dna-analysis-20260723` | 60ab727 | 07-23,归档 |
| `archive/brand-dna-report-v2-20260723` | dcf38a0 | 07-23,归档 |
| `archive/brand-dna-v3-deep-compact-20260723` | 0437b7c | 07-23,归档 |
| `archive/brand-dna-v3-quality-20260723` | 3ac39ae | 07-23,归档 |
| `archive/execution-oriented-directions-v2-20260723` | b261bdb | 07-23,归档 |
| `archive/v5-deep-creative-director-20260723` | 9860f93 | 07-23,归档 |
| `archive/v5-desktop-20260723` | 831fb04 | 07-23,归档 |
| `archive/visual-fact-first-pipeline-20260723` | eea2073 | 07-23,归档 |
| `archive/visual-translation-v1-20260723` | f3e7793 | 07-23,归档 |

### 关键发现:tag 体系混乱但不影响功能

- **真正"可发版"的只有 `v1.0.1`**(7 月 14 日,公开 release)
- 8 个 `archive/*` tag 都是同一天(07-23)打的,看起来是一次"历史快照归档"动作
- 1 个 `pre-overfitting-baseline-v1` 和 1 个 `retrieval-first-core-beta-0.5` 是未发布实验
- tag 是发布快照,**全部保留**(删了找不回)。新版本直接打新 tag 即可

---

## 0.5 版本号源(共 3 处不一致)

| 位置 | 当前值 | 备注 |
|------|-------|------|
| `/VERSION` | `4.0.0` | 单行文件 |
| `/package.json` | `5.0.0-alpha.1` | 根工作区,`name=masterpiece-os` |
| `apps/desktop/package.json` | `0.1.0` | desktop 子包,`name=masterpiece-os-desktop` |
| `README.md` | 标题"Masterpiece-OS" | 内部有版本号引用(具体行号未拉) |
| `apps/desktop/release/Masterpiece-OS-Desktop-Portable-0.1.0-x64.exe` | `0.1.0` | 7/28 打包,文件名绑 0.1.0 |

### 关键发现:三处版本号完全错位

- `VERSION=4.0.0` vs `root=5.0.0-alpha.1` vs `desktop=0.1.0` 三个值
- electron-builder 打出来的 exe 文件名是 `Masterpiece-OS-Desktop-Portable-0.1.0-x64.exe`,**直接绑了 `apps/desktop/package.json` 的 0.1.0**
- 根 `package.json` 是 `5.0.0-alpha.1`,但 `VERSION` 文件却是 `4.0.0` — 谁是 source of truth?
- 阶段 0 不下"统一到 X"的结论,等阶段 1 你定语义

---

## 0.6 release 产物

```
apps/desktop/release/
├── builder-debug.yml              6.1 KB   2026-07-28 12:43
├── builder-effective-config.yaml  551 B    2026-07-27 19:27
└── Masterpiece-OS-Desktop-Portable-0.1.0-x64.exe  112 MB  2026-07-28 12:43
```

- 这就是上次测试用的 exe,版本号绑死在文件名里
- **不要在没重新打包前改 `apps/desktop/package.json` 版本号**,否则 exe 文件名会跟 0.1.0 对不上
- 改版本号前要先确定:是只改源文件(等下次打包),还是先打包再发

---

## 0.7 阶段 0 决策建议清单(只列数据,不下结论)

| 编号 | 决策点 | 阶段 0 给你的输入 | 阶段 1 你要拍板的 |
|------|-------|-----------------|----------------|
| D-1 | 9 modified + 2 untracked 怎么提交? | 文件清单 + 行数 + 已通过 verify | 直接 commit / 出 patch / 再分批 |
| D-2 | 本地 5 个 feature 分支(`-d` 可删)删不删? | 全已 merge 进 HEAD,0 差异 | 删 / 保留 / 归档 |
| D-3 | `experiment/pre-overfitting-baseline` 怎么办? | 4 commit 偏离 HEAD,实验性 | 留 / merge / archive |
| D-4 | 远端 6 个独有分支(`feature/reference-*` + `refactor/*`)怎么办? | 本地无对应分支,需要走远端 | PR 评估 / 远端 issue / 暂不动 |
| D-5 | 8 个 `archive/*` tag + 2 个实验 tag 要清理吗? | 删了找不回,tag 是发布快照 | 全留 / 全删 / 只删实验 tag |
| D-6 | 3 处版本号统一到几? | `VERSION=4.0.0` / `root=5.0.0-alpha.1` / `desktop=0.1.0` | 5.0.0 / 5.0.0-rc.1 / 别的语义版本 |
| D-7 | 版本号改动是否要触发重打包? | exe 文件名绑 0.1.0,改 version 会断 | 重打 / 暂不改 / 标 deprecated |
| D-8 | 12 个 tag 要不要打新 release tag? | 现状 `v1.0.1` 是唯一正式 tag | `v5.0.0-alpha.1` / `v5.0.0-rc.1` / 别的 |

---

## 0.8 阶段 0 → 阶段 1 衔接

阶段 0 只跑勘察、只落数据,本报告就是阶段 0 的产物。

**阶段 1(等你回来)需要你拍板的事**:

1. **9+2 改动**:`git add . && commit`?还是先评审?
2. **5 个本地 feature 分支**:直接 `-d` 删,还是先备份?
3. **版本号三处**:先告诉我目标版本(例如统一到 `5.0.0-alpha.1` 或者你想要 `5.0.0`),我再列出每个文件的精确修改点
4. **远端 / tag**:你说"先跑阶段 0",阶段 0 完了,要不要继续阶段 1(分支清理)还是先 commit 完再说

> 任何写操作我都等你明确指令,默认不动。
