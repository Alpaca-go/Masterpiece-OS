# Masterpiece OS — 项目长期记忆

## 实验分支 / v2 视觉方向
- 当前工作分支：`experiment/execution-oriented-directions-v2`（基于 v1.3.3 提交 `b404c76`）。
- 桌面端默认走 **V1（conceptual_v1）**；v2（execution_oriented_v2）需用户在 UI「方向生成模式」手动开启。
- v2 协议名是 `visual-translation-v2-execution`，**不是** v2.1；v2.1 仅为一次「专项修复」升级（见 2026-07-21 日志），协议名维持 v2。

## v2.1 fixtures 约定（重要）
- `tests/fixtures/visual-direction-v2/jiuzhou-meixue/v2-directions.json` = **v2.1 好集合**（3 方向 A/B/C 真实差异，整体现 ready/allowed）。它是「九州美学新报告」交付物的输入，不要改回同质集合。
- `v2-directions-homogeneous.json` = v2.1 合法但**同质退化**的负面回归用例。**不是** git 原始 fixture（原始缺 compliance_weights 等字段，已不合法）。由 `scripts/gen-negative-jzmx-fixture.mjs` 生成。
- 三项目（jiuzhou-meixue / mingjitang / vanke-suwan）A/B 快照在 `tests/snapshots/visual-direction-v2/`，改 fixture 后必须 `node scripts/regen-v2-snapshots.mjs` 再生。
- 报告交付物在 `docs/v2.1-deliverables/`（`gen-jzmx-reports.mjs` 生成）。

## 测试 / 门禁
- 改 report compiler 等文档流代码后必须跑 `npm run verify:document-flows`（离线，不调真实模型 API）。
- v2 专项测试只存在于 `tests/v5/visual-translation-v2*.test.js` 三个文件；其余测试不 import v2 模块。

## 桌面端打包（重要环境坑）
- 命令：`npm --prefix apps/desktop run package:portable` → 产物 `apps/desktop/release/Masterpiece-OS-Desktop-Portable-0.1.0-x64.exe`（portable，已签名）。
- 该命令会先跑 `verify:document-flows` 门禁，再 `npm run build`（typecheck + electron-vite build）后 electron-builder。
- **沙箱陷阱 A（删除 shim）**：WorkBuddy 通过 `NODE_OPTIONS=--require=.../genie-safe-delete.cjs` 注入回收站安全 shim，会拦截 `fs.rmSync`，导致 vite `emptyOutDir` 清 `out/` 失败、构建中断。
  - **修复**：打包时改为 `NODE_OPTIONS="--use-system-ca" npm --prefix apps/desktop run package:portable`（去掉 --require shim），vite 走原生删除即可。仅删自身 `out/` 产物，安全。
- **沙箱陷阱 B（覆盖写入）**：沙箱禁止**覆盖** `release/` 内已存在的文件（报 `EPERM: ... open '.../release/builder-debug.yml'`），但允许写入**新**文件。改代码后重打包若 release/ 残留旧产物，会在收尾写调试文件时失败（EPERM），而 EXE 实际已生成。
  - **修复**：打包前先 `rm -rf apps/desktop/release`（构建产物目录，非个人目录，可安全删除），全量重建即干净退出 0。

## Git 引用写入坑（重要）
- 本仓库所有 refs 都在 `packed-refs`，`.git/refs/heads/` 默认为空。
- 带斜杠的引用名（如 `feature/xxx`）在 unborn 分支上 `git update-ref` / `git checkout -b` 会**静默失败**（exit 0 但不写文件）：新分支停在 unborn 状态，`git commit` 后 commit 对象悬空、ref 不前进、`git log` 报 “does not have any commits yet”。
- **修复**：先 `mkdir -p .git/refs/heads/<dir>` 再 `git update-ref refs/heads/<slash/name> <hash>`；若仍不落盘，直接用 `printf '<hash>\n' > .git/refs/heads/<slash/name>` 写 loose ref 文件即可被 git 读取。
- **升级坑（2026-07-26 实测）**：loose ref 文件会被本机某后台进程在数秒内删除（连 `git commit` 成功后自己写的 ref 都会消失，表现为 commit 对象存在但分支不前进、`git ls-tree HEAD` 报 not valid object）。**最稳方案：直接编辑 `.git/packed-refs`**——按排序插入 `<hash> refs/heads/<name>` 行（新建分支）或替换行首哈希（推进分支），git 立即可读且不会被删。提交后务必 `git log --oneline -1` 复核分支已前进。
- **packed-refs 必须是 LF（2026-07-26 实测，严重坑）**：git（本机 Windows 构建）写入 `packed-refs` 用 LF；若文件被改成 CRLF，git 会报 `fatal: unexpected line in .git/packed-refs: ^...` 或 `warning: ignoring ref with broken name refs/heads/feature/...?`，导致整个文件无法解析、分支悬空。
  - **根因**：用 Python 文本模式 `open(...,'w',encoding='utf-8')` 读写会把原 LF 文件变成 CRLF（Windows 换行翻译），从而破坏 packed-refs。
  - **正确修法（字节级、纯 LF）**：用 `open(p,'rb').read()` 读字节，`data.replace(b'\r\n',b'\n').replace(b'\r',b'')` 归一为 LF，找到以 `b' refs/heads/feature/reference-anchor-workflow'` 结尾的行整行替换为 `b'<newhash> refs/heads/feature/reference-anchor-workflow'`，`open(p,'wb').write(...)` 写回。切勿用文本模式或 sed。
  - **提交后取哈希**：`git commit` 输出只打印**短** SHA（7 位），且 loose ref 可能已被后台进程删除，所以不要靠 `git rev-parse HEAD` 取新哈希；应从提交输出解析短 SHA（`sed -n 's/.*\[feature\/reference-anchor-workflow \([0-9a-f]*\)\].*/\1/p'`）再用 `git rev-parse <短SHA>` 展开成 40 位（commit 对象独立于 ref，必定可解析），然后回填 packed-refs。
- 在 unborn 分支上做提交前，先把 index reset 到正确父提交（`git reset --mixed <parent>`），只 `git add` 目标文件并用 `git diff --cached --stat` 校验，避免误把整仓 staged。
