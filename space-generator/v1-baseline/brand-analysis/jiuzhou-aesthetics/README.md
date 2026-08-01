# JZMX v1 Baseline Brand Analysis 引用

**v1 baseline 不复制用户项目数据。** 实际数据根在用户本机：

```
C:\Users\Administrator\Documents\Masterpiece OS Data\projects\九州美学-a7a56ed7\
```

## v1 实际输入快照

| 字段 | 值 |
|---|---|
| project_id | `a7a56ed7-849f-4671-b47a-466394d7298d` |
| brand_name | 九州美学 |
| brand_name_confidence | 0.62（**factConfidence.industry = 0**，行业需后续确认） |
| industry_input | "待确认（基于现有素材推断）" |
| output_language | zh-CN |
| analysis_mode | fusion-enhanced |
| provider / model | qwen / qwen3.6-plus |
| api_profile | `profile-397281cc-653f-4822-ae4e-601ca7f8a63b` |
| status | completed |
| asset_count | 27 |
| last_run_at | 2026-07-30T12:48:05.404Z |
| last_duration_ms | 267608 |

## v1 实际分析输出位置

- `project-context/visual-decision-packet.json`
- `project-context/project-visual-context.vnext.json` (v2)
- `output/九州美学-视觉方案升级报告-qwen3.6-plus.md`
- `image-generation-vnext/...`（27 张图）

## 升级约束

- v1 baseline 内的 system-prompt / execution-core-template / report-schema 来自 `apps/cli/prompts/v5/`，**严禁修改源** —— 任何修改都通过 v1-experimental/ 进行
- 用户项目数据中的 packet 实际由 `@masterpiece/analysis-runtime` `completeStructuredAnalysis` 修复过（详见 `runtime/repair-sessions/`）
- v1 的 brand-analysis 是**冻结快照**，不参与 v1-experimental 任何计算
