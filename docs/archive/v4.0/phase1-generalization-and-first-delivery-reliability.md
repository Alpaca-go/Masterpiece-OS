# Phase 1：泛化与首次交付可靠性

## 架构落地

生产链路现在按以下责任边界执行：

```text
VisualDecisionPacket
  -> ProjectSpecificGenerationContract（当前项目应该是什么）
  -> PackagingTranslationV2（如何转译为包装）
  -> PackagingPromptContract（包装成果物必须解决什么）
  -> Seedream Adapter（目标模型表达）
  -> Prompt Preflight Gate（提交前阻断）
```

`evaluation/` 只由离线脚本和测试读取。生产 `src/`、`packages/`、`apps/desktop/src/`
不得导入或读取 Golden、Anti-Case、Hidden Case、Fixture 或 manual-smoke 内容。

## 关键决策

- 公共 Compiler 不再根据行业关键词选择审美模板；行业只保留客观品类、真实尺度和合规边界。
- 公共成果物模板不再固定 10% 强调色比例，色彩比例只来自当前项目的确认决策。
- 包装结构没有证据时返回 `PACKAGING_STRUCTURE_EVIDENCE_MISSING`，正式生成不猜盒型。
- 包装 Prompt 使用独立的 A–N 十四段契约，不复用空间 Prompt。
- Project Contract 缺少品牌角色、升级命题、保留项、气质边界或成功标准时阻断。
- Prompt Preflight 阻断跨媒介语言、其他项目语义、Golden 内容和行业审美模板泄漏。
- Golden 评测失败只产出报告，不写生产 Prompt、不生成补丁、不修改模板。

## 新增模块

- `packages/creative-production-runtime/src/project-generation-contract.js`
- `packages/creative-production-runtime/src/packaging-translation.js`
- `packages/image-generation-runtime/src/prompt-contracts/packaging-contract.js`
- `packages/image-generation-runtime/src/gates/prompt-preflight-gate.js`
- `scripts/verify-golden-production-boundary.mjs`
- `scripts/verify-no-project-specific-production-rules.mjs`
- `scripts/run-golden-evaluation.mjs`
- `scripts/run-hidden-cases.mjs`

核心 Schema 位于 `packages/project-contracts/src/index.ts`：

- `ProjectSpecificGenerationContract`
- `PackagingTranslationV2`
- `PackagingColorBehaviorV2`
- `GoldenCase`
- `FirstPassMetrics`

## 评测范围

离线 Anti-Case 覆盖：

1. 同行业不同气质项目；
2. 医美诊疗室；
3. 科技平台；
4. 教育平台；
5. 空间决策到包装的跨媒介转译。

Hidden Case Runner 只读取首次观察结果，拒绝包含 `prompt` 或
`goldenPromptPath` 的 Case，不执行自动修复，并把 `FirstPassMetrics`
写入 `evaluation/reports/hidden-case-latest.json`。
