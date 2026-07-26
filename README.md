# Masterpiece-OS

Masterpiece-OS 是一个 **AI Creative Director Preparation System**。仓库由三部分组成：

```text
1. v5 引擎（根 src/）      一次 Deep Creative Director 推理 → 视觉方案升级报告.md
2. Desktop 客户端（apps/desktop/）   视觉分析、文档上下文、Reference Anchor 三项生产功能
3. 实验 Labs（labs/）      两个独立实验管线，不进入 Desktop UI、IPC、构建与打包
```

## 环境

- Node.js 20 或更高版本
- 根引擎无第三方运行依赖；Desktop 与 Labs 各自维护自己的 `package.json`

## 快速开始（v5 引擎 CLI）

把素材放入项目目录，填写 `masterpiece-os-v5.json`：

```bash
npm run analyze -- <素材目录>
```

配置模板见 `templates/masterpiece-os-v5.json`。宿主可注入单一 `deepCreativeDirectorReasoner`，或从配置读取一份已完成的 `deepCreativeDirectorResult`。

### Reasoner Provider

```powershell
$env:MASTERPIECE_PROVIDER="qwen"
$env:QWEN_API_KEY="你的 API Key"
$env:QWEN_MODEL="控制台实际开放的多模态模型 ID"
$env:QWEN_BASE_URL="你的百炼 OpenAI-compatible base URL"
npm run analyze -- <素材目录> --provider qwen --force-reasoning
```

`--force-reasoning` 会跳过精确推理缓存。未使用该选项且 Prompt 完全一致时，CLI 不会创建 Adapter 或发起模型请求。API Key 只从环境变量读取，不进入项目配置、输出或运行日志。

v5 只声明一份正式输出：

```text
视觉方案升级报告.md
```

性能与会话边界记录保存在 `.runtime/run-report.json`，不属于正式输出。

## v5 Deep Creative Director Prompt

```text
System Prompt
+ Project Input
+ Asset Manifest / Attachments
+ Explicit Constraints
+ Category & Creative Excellence Benchmark
+ GPT Execution Core
+ Fixed Report Schema
→ One Deep Creative Director Call
→ 视觉方案升级报告.md
```

模板位于 `prompts/v5/`。报告使用固定 0–10 章节，资产决策值只允许“保留、升级、替换、删除、新增”。

## v5 性能预算

默认目标为 10 分钟，可接受上限为 15 分钟。超过 5 张图片时，运行时会在 `.runtime/cache/` 生成一张 Contact Sheet，并只附加最多 5 张优先细节图；Logo 素材优先。视觉准备与行业 Benchmark 按素材指纹和行业缓存；完全相同的 Prompt 可以复用上一份完整推理结果。

## Desktop 客户端

```bash
npm run desktop:dev        # 开发
npm run desktop:build      # 构建（含 typecheck）
npm run desktop:test       # 测试
npm run desktop:package    # portable 打包（先跑 verify:current-flows 门禁）
```

Desktop 只包含三项生产功能：视觉分析、文档上下文、Reference Anchor。

## 实验 Labs

```bash
npm run lab:document-directions        # 文档驱动视觉方向实验
npm run lab:document-directions:test
npm run lab:reference-conversion       # 参考风格转换实验
npm run lab:reference-conversion:test
```

Labs 通过独立 CLI 运行，不进入 Electron UI、IPC、构建和打包。

## 开发验证

```bash
npm test                              # 根引擎测试
npm run verify:current-flows          # 文档流离线门禁（不调用真实模型 API）
npm run verify:no-obsolete-code       # 零旧代码门禁
npm run verify:production-boundaries  # Desktop 与 Labs 边界门禁
```

## GPT 协作边界

GPT 的输入是已核验视觉方案与运行时高密度 Brief。GPT 自主完成创意、图片规划和图片生成；Masterpiece 不生成图片数量、比例、任务卡、执行队列或 Prompt。

更多说明见 [使用手册](docs/使用手册.md) 与 [架构说明](docs/架构说明.md)。
